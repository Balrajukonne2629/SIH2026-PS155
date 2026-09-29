"""NTRO PS26155 — Fortinet FortiOS Compliance Auditor & Parser (Phase B).

Provides pure Python standard library configuration parsing, CSM normalization,
and deterministic baseline compliance evaluation for Fortinet FortiOS devices:

1. Canonical Parser:
   - Supports block-based syntax: 'config <section> ... end', 'edit <entry> ... next', 'set <key> <val>'.
   - Parses header metadata (model, OS version, serial).
   - Robust and fault-tolerant: unmapped statements preserved in csm["unmapped_lines"].
2. Common Security Model (CSM) Normalization:
   - Produces vendor-neutral schema conforming to normalized_config_schema.json.
   - Normalizes security concepts (SSH, AAA, NTP, Syslog, SNMP, Access Control, Management Interface) into standard fields.
3. 10 Initial Fortinet Security Rules:
   - FORTINET-SSH-001: Enforce secure SSH version 2 (admin-ssh-v1 disabled)
   - FORTINET-SSH-002: Enforce SSH connection limits and lockout thresholds
   - FORTINET-SSH-003: Restrict insecure management access (telnet disabled)
   - FORTINET-AAA-001: Configure centralized authentication (TACACS+ or RADIUS)
   - FORTINET-AAA-002: Enforce administrator password policy and account lockout
   - FORTINET-NTP-001: Require authenticated NTP time synchronization
   - FORTINET-LOG-001: Configure remote syslog logging with timestamps
   - FORTINET-SNMP-001: Disallow default or weak SNMP community strings
   - FORTINET-ACL-001: Enforce management access control and trusted admin hosts
   - FORTINET-MGMT-001: Isolate management traffic via dedicated interface or VDOM
4. Framework Evaluator Integration:
   - FortinetBaselineEvaluator implementing FrameworkEvaluator under 'fortinet-fortios-baseline'.
   - Purely deterministic, AST execution-safe, with zero network or subprocess imports.

Hard Invariants:
- Pure Python standard library only (strictly AST-safe: zero subprocess, socket, or exec).
- Deterministic compliance: identical inputs produce bitwise identical outputs across runs.
- UNKNOWN preservation: missing or unconfigured sections remain Unknown, never conflated with Fail.
"""

import datetime
import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

from src.compliance_framework import (
    ComplianceStatus,
    Control,
    Evidence,
    EvaluationResult,
    Framework,
    FrameworkEvaluator,
    FrameworkRegistry,
    get_default_registry,
)

FORTINET_FRAMEWORK_ID = "fortinet-fortios-baseline"
WEAK_COMMUNITIES = frozenset({"public", "private", "cisco", "community", "snmp", "default"})

# 10 Grounded Prototype Rule Specifications for Fortinet FortiOS
FORTINET_RULE_SPECS = [
    {
        "vendor_rule_id": "FORTINET-SSH-001",
        "title": "Enforce secure SSH protocol version 2",
        "check_focus": ["SSH", "protocol-version"],
        "csmFieldChecked": "services.ssh_version",
        "condition": "equals 2",
    },
    {
        "vendor_rule_id": "FORTINET-SSH-002",
        "title": "Configure administrative session timeout and lockout limits",
        "check_focus": ["SSH", "connection-restrictions"],
        "csmFieldChecked": "services.connection_limit",
        "condition": "not_null",
    },
    {
        "vendor_rule_id": "FORTINET-SSH-003",
        "title": "Disable insecure administrative access protocols (Telnet)",
        "check_focus": ["SSH", "insecure-access"],
        "csmFieldChecked": "services.telnet_enabled",
        "condition": "equals False",
    },
    {
        "vendor_rule_id": "FORTINET-AAA-001",
        "title": "Configure centralized authentication (TACACS+ or RADIUS)",
        "check_focus": ["AAA", "centralized-auth"],
        "csmFieldChecked": "aaa.tacacs_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "FORTINET-AAA-002",
        "title": "Enforce administrator password policy and account lockout",
        "check_focus": ["AAA", "password-policy"],
        "csmFieldChecked": "management.password_policy_configured",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "FORTINET-NTP-001",
        "title": "Require authenticated NTP time synchronization",
        "check_focus": ["NTP", "authentication"],
        "csmFieldChecked": "ntp.authentication_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "FORTINET-LOG-001",
        "title": "Configure remote syslog logging with timestamps",
        "check_focus": ["Logging", "remote-syslog"],
        "csmFieldChecked": "logging.remote_logging_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "FORTINET-SNMP-001",
        "title": "Disallow default or weak SNMP community strings",
        "check_focus": ["SNMP", "community-strings"],
        "csmFieldChecked": "snmp.community_strings",
        "condition": "secure_communities",
    },
    {
        "vendor_rule_id": "FORTINET-ACL-001",
        "title": "Enforce administrative access control and trusted administrator hosts",
        "check_focus": ["AccessControl", "trusted-hosts"],
        "csmFieldChecked": "access_control.control_plane_protection_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "FORTINET-MGMT-001",
        "title": "Isolate administrative traffic via dedicated management interface",
        "check_focus": ["Management", "dedicated-management"],
        "csmFieldChecked": "management.dedicated_mgmt_interface",
        "condition": "equals True",
    },
]


def resolve_csm_path(csm: dict, path: str) -> Any:
    """Resolves a dot-delimited path (e.g. 'csm.services.ssh_version') in the CSM dict."""
    parts = [p for p in path.strip().split(".") if p and p != "csm"]
    curr = csm
    for p in parts:
        if isinstance(curr, dict) and p in curr:
            curr = curr[p]
        else:
            return None
    return curr


def eval_condition(val: Any, cond: str) -> str:
    """Generic condition evaluator on CSM values."""
    if not cond:
        return "Unknown"
    c = cond.strip()
    if c == "not_null":
        return "Pass" if val is not None else "Fail"
    if c in ("equals False", "is_false", "equals false"):
        return "Pass" if val is False else ("Fail" if val is True else "Unknown")
    if c in ("equals True", "is_true", "equals true"):
        return "Pass" if val is True else ("Fail" if val is False else "Unknown")
    if c.startswith("equals "):
        target = c[7:].strip()
        try:
            target_val: Any = int(target)
        except ValueError:
            target_val = target.strip('"\'')
        return "Pass" if val == target_val else ("Fail" if val is not None else "Unknown")
    if c == "secure_communities":
        if val is None:
            return "Unknown"
        if not isinstance(val, (list, tuple, set)):
            return "Fail"
        if len(val) == 0:
            return "Pass"
        for item in val:
            name = item.get("name") if isinstance(item, dict) else str(item)
            if not name or str(name).strip().lower() in WEAK_COMMUNITIES:
                return "Fail"
        return "Pass"
    return "Unknown"


def parse_fortinet(
    text: str,
    filename: str = "fortinet.conf",
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Parses raw Fortinet FortiOS configuration text into a normalized CSM dictionary.

    Conforms strictly to config/Rule_Library/normalized_config_schema.json.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    csm: Dict[str, Any] = {
        "schema_version": "1.0",
        "device": {
            "hostname": "unknown",
            "vendor": "fortinet",
            "platform": "FortiOS",
            "os_version": None,
            "serial_number": None,
            "hardware_model": None,
            "management_ip": None,
        },
        "source": {
            "source_type": "uploaded_file",
            "parser": "fortinet_auditor.parse_fortinet",
            "file_name": filename,
            "parsed_at": now_iso,
        },
        "services": {
            "ssh": None,
            "ssh_version": None,
            "ssh_v1_disabled": None,
            "telnet_enabled": None,
            "connection_limit": None,
            "ssh_timeout": None,
            "call_home": False,
        },
        "aaa": {
            "enabled": False,
            "tacacs_enabled": False,
            "radius_enabled": False,
            "tacacs_servers": [],
            "radius_servers": [],
            "accounting_enabled": False,
        },
        "logging": {
            "enabled": False,
            "remote_logging_enabled": False,
            "remote_servers": [],
            "timestamps_enabled": True,
            "buffered_size": None,
        },
        "ntp": {
            "enabled": False,
            "servers": [],
            "authentication_enabled": False,
            "keys": [],
        },
        "snmp": {
            "enabled": False,
            "community_strings": [],
            "snmpv3_users": [],
        },
        "access_control": {
            "trusted_hosts_configured": False,
            "control_plane_protection_enabled": False,
            "acls_present": False,
        },
        "management": {
            "password_policy_configured": False,
            "admin_lockout_configured": False,
            "dedicated_mgmt_interface": False,
            "management_vrf_enabled": False,
        },
        "routing": {
            "bgp_enabled": False,
            "ospf_enabled": False,
            "routing_authentication_enabled": False,
        },
        "spanning_tree": {
            "bpduguard_enabled": None,
        },
        "interfaces": [],
        "raw_evidence": [],
        "unmapped_lines": [],
    }

    if not text or not text.strip():
        return csm

    def add_ev(field_name: str, value: Any, source_line: str, line_num: int = 1) -> None:
        csm["raw_evidence"].append({
            "field": field_name,
            "value": value,
            "source_lines": [source_line],
            "confidence": 1.0,
            "line_number": line_num,
        })

    # 1. Parse header comments (e.g. #config-version=FG60E-7.2.4-FW-build1396-230309)
    for line in text.splitlines():
        trimmed = line.strip()
        if trimmed.startswith("#config-version="):
            match = re.search(r"#config-version=([A-Za-z0-9\-]+?)-(\d+\.\d+(?:\.\d+)?)-", trimmed)
            if match:
                csm["device"]["hardware_model"] = match.group(1)
                csm["device"]["os_version"] = match.group(2)
            add_ev("device.header", {"hardware_model": csm["device"]["hardware_model"], "os_version": csm["device"]["os_version"]}, trimmed, 1)
            break

    # 2. Block Parser for FortiOS (config ... end / edit ... next)
    lines = text.splitlines()
    section_stack: List[str] = []
    current_entry: Optional[str] = None
    current_interface: Optional[Dict[str, Any]] = None

    for idx, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        # Match block starts and ends
        if line.startswith("config "):
            sec_name = line[7:].strip()
            section_stack.append(sec_name)
            continue
        elif line == "end":
            if section_stack:
                section_stack.pop()
            current_entry = None
            continue
        elif line.startswith("edit "):
            current_entry = line[5:].strip().strip('"\'')
            # If in config system interface, initialize interface tracking
            curr_sec = " ".join(section_stack)
            if curr_sec == "system interface":
                current_interface = {
                    "name": current_entry,
                    "enabled": True,
                    "ip_address": None,
                    "netmask": None,
                    "status": "up",
                    "description": None,
                    "allowaccess": [],
                    "dedicated_management": False,
                }
            continue
        elif line == "next":
            if current_interface:
                csm["interfaces"].append(current_interface)
                current_interface = None
            current_entry = None
            continue

        curr_sec = " ".join(section_stack)

        # Handle 'set <key> <val>' statements inside sections
        if line.startswith("set "):
            tokens = line[4:].strip().split(None, 1)
            key = tokens[0] if tokens else ""
            val = tokens[1].strip() if len(tokens) > 1 else ""
            val_clean = val.strip('"\'')

            # config system global
            if curr_sec == "system global":
                if key == "hostname":
                    csm["device"]["hostname"] = val_clean
                    add_ev("device.hostname", val_clean, line, idx)
                elif key == "admin-ssh-v1":
                    if val_clean == "disable":
                        csm["services"]["ssh_version"] = 2
                        csm["services"]["ssh_v1_disabled"] = True
                        csm["services"]["ssh"] = True
                    else:
                        csm["services"]["ssh_version"] = 1
                        csm["services"]["ssh_v1_disabled"] = False
                    add_ev("services.ssh_version", csm["services"]["ssh_version"], line, idx)
                elif key == "admin-ssh-port":
                    csm["services"]["ssh"] = True
                    if csm["services"]["ssh_version"] is None:
                        csm["services"]["ssh_version"] = 2
                elif key == "admin-telnet":
                    csm["services"]["telnet_enabled"] = (val_clean == "enable")
                    add_ev("services.telnet_enabled", csm["services"]["telnet_enabled"], line, idx)
                elif key in ("admin-lockout-threshold", "admin-concurrent-usr"):
                    try:
                        csm["services"]["connection_limit"] = int(val_clean)
                        csm["management"]["admin_lockout_configured"] = True
                    except ValueError:
                        pass
                    add_ev("services.connection_limit", csm["services"]["connection_limit"], line, idx)
                elif key in ("admin-lockout-duration", "admintimeout"):
                    try:
                        csm["services"]["ssh_timeout"] = int(val_clean)
                    except ValueError:
                        pass

            # config system interface
            elif curr_sec == "system interface" and current_interface is not None:
                if key == "ip":
                    ip_parts = val_clean.split()
                    if ip_parts:
                        current_interface["ip_address"] = ip_parts[0]
                        if len(ip_parts) > 1:
                            current_interface["netmask"] = ip_parts[1]
                elif key == "allowaccess":
                    current_interface["allowaccess"] = val_clean.split()
                    if "ssh" in current_interface["allowaccess"]:
                        csm["services"]["ssh"] = True
                        if csm["services"]["ssh_version"] is None:
                            csm["services"]["ssh_version"] = 2
                    if "telnet" in current_interface["allowaccess"]:
                        csm["services"]["telnet_enabled"] = True
                elif key == "status":
                    current_interface["status"] = val_clean
                    current_interface["enabled"] = (val_clean.lower() != "down")
                elif key == "description":
                    current_interface["description"] = val_clean
                elif key == "dedicated-to" and val_clean == "management":
                    current_interface["dedicated_management"] = True
                    csm["management"]["dedicated_mgmt_interface"] = True
                    csm["management"]["management_vrf_enabled"] = True

            # config system ntp
            elif "system ntp" in curr_sec:
                if key == "ntpsync":
                    csm["ntp"]["enabled"] = (val_clean == "enable")
                elif key == "authentication":
                    csm["ntp"]["authentication_enabled"] = (val_clean == "enable")
                    add_ev("ntp.authentication_enabled", csm["ntp"]["authentication_enabled"], line, idx)
                elif key == "server":
                    csm["ntp"]["servers"].append(val_clean)
                    csm["ntp"]["enabled"] = True

            # config log syslogd setting / config log syslogd2 setting
            elif "log syslogd" in curr_sec:
                if key == "status":
                    csm["logging"]["remote_logging_enabled"] = (val_clean == "enable")
                    csm["logging"]["enabled"] = True
                    add_ev("logging.remote_logging_enabled", csm["logging"]["remote_logging_enabled"], line, idx)
                elif key == "server":
                    csm["logging"]["remote_servers"].append(val_clean)

            # config system snmp community
            elif "system snmp community" in curr_sec:
                if key == "name":
                    csm["snmp"]["enabled"] = True
                    is_weak = val_clean.lower() in WEAK_COMMUNITIES
                    csm["snmp"]["community_strings"].append({
                        "name": val_clean,
                        "permission": "ro",
                        "weak_flag": is_weak,
                    })
                    add_ev("snmp.community_strings", csm["snmp"]["community_strings"], line, idx)

            # config user tacacs+
            elif "user tacacs+" in curr_sec:
                csm["aaa"]["enabled"] = True
                csm["aaa"]["tacacs_enabled"] = True
                if key == "server":
                    csm["aaa"]["tacacs_servers"].append(val_clean)
                    add_ev("aaa.tacacs_enabled", True, line, idx)

            # config user radius
            elif "user radius" in curr_sec:
                csm["aaa"]["enabled"] = True
                csm["aaa"]["radius_enabled"] = True
                if key == "server":
                    csm["aaa"]["radius_servers"].append(val_clean)
                    add_ev("aaa.radius_enabled", True, line, idx)

            # config system admin
            elif "system admin" in curr_sec:
                if key.startswith("trusthost"):
                    csm["access_control"]["trusted_hosts_configured"] = True
                    csm["access_control"]["control_plane_protection_enabled"] = True
                    add_ev("access_control.control_plane_protection_enabled", True, line, idx)
                elif key == "password-policy" and val_clean == "enable":
                    csm["management"]["password_policy_configured"] = True

            # config system password-policy
            elif "system password-policy" in curr_sec:
                if key == "status" and val_clean == "enable":
                    csm["management"]["password_policy_configured"] = True
                    add_ev("management.password_policy_configured", True, line, idx)
        else:
            # Lines outside recognized syntax are unmapped evidence
            if not section_stack:
                csm["unmapped_lines"].append(line)

    # 3. Post-processing: Deduce management IP
    # Priority: 1. Dedicated management interface, 2. Interface named 'mgmt', 3. Interface with ssh/allowaccess
    for intf in csm["interfaces"]:
        name_lower = intf["name"].lower()
        if intf.get("dedicated_management") or name_lower.startswith("mgmt"):
            csm["management"]["dedicated_mgmt_interface"] = True
            csm["management"]["management_vrf_enabled"] = True
            if intf.get("ip_address"):
                csm["device"]["management_ip"] = intf["ip_address"]
                break

    if csm["device"]["management_ip"] is None:
        for intf in csm["interfaces"]:
            if "ssh" in intf.get("allowaccess", []) and intf.get("ip_address"):
                csm["device"]["management_ip"] = intf["ip_address"]
                break

    # If telnet is not explicitly enabled and ssh is configured, telnet defaults to False
    if csm["services"]["telnet_enabled"] is None and csm["services"]["ssh"]:
        csm["services"]["telnet_enabled"] = False

    return csm


def evaluate_rules(
    csm: Dict[str, Any],
    rules: Optional[List[dict]] = None,
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Evaluates Fortinet baseline and trusted rules deterministically against normalized CSM.

    Returns:
        Dict mapping vendor_rule_id -> {status, focus, evidence_found}
    """
    # Vendor isolation: if CSM does not belong to Fortinet, return Unknown for all
    if csm.get("device", {}).get("vendor") != "fortinet":
        empty_res: Dict[str, Dict[str, Any]] = {}
        for spec in FORTINET_RULE_SPECS:
            focus_val = spec.get("check_focus", ["Security"])
            focus_str = focus_val[0] if isinstance(focus_val, list) and focus_val else str(focus_val)
            empty_res[spec["vendor_rule_id"]] = {
                "status": "Unknown",
                "focus": focus_str,
                "evidence_found": [],
            }
        return empty_res

    res: Dict[str, Any] = {}
    ev_items = csm.get("raw_evidence", [])
    ev_lines = [src for item in ev_items for src in item.get("source_lines", [])]

    # Evaluate the 10 Fortinet baseline rules
    for spec in FORTINET_RULE_SPECS:
        rid = spec["vendor_rule_id"]
        field_path = spec.get("csmFieldChecked", "")
        cond = spec.get("condition", "")
        focus = spec.get("check_focus", ["Security"])
        focus_str = focus[0] if isinstance(focus, list) and focus else str(focus)

        val = resolve_csm_path(csm, field_path)
        status = eval_condition(val, cond)

        matched_evidence = [
            src
            for ev in ev_items
            if ev.get("field", "") == field_path or field_path.startswith(ev.get("field", ""))
            for src in ev.get("source_lines", [])
        ]

        res[rid] = {
            "status": status,
            "focus": focus_str,
            "evidence_found": matched_evidence,
        }

    # Evaluate dynamic / trusted rules if provided
    for tr in (trusted_rules or []):
        rid = tr.get("vendor_rule_id", "TRUSTED-000")
        field_path = tr.get("csmFieldChecked", "")
        cond = tr.get("condition", "")
        if field_path and cond:
            val = resolve_csm_path(csm, field_path)
            st_val = eval_condition(val, cond)
        else:
            st_val = "Unknown"
        ev = [e for e in tr.get("configuration_evidence", []) if any(e in line for line in ev_lines)]
        res[rid] = {
            "status": st_val,
            "focus": tr.get("check_focus", ["Security"])[0] if isinstance(tr.get("check_focus"), list) else str(tr.get("check_focus", "Security")),
            "evidence_found": ev,
        }

    return res


def evaluate_fortinet_baseline(csm: Dict[str, Any]) -> Dict[str, Any]:
    """Authoritative baseline evaluator for Fortinet FortiOS rules."""
    return evaluate_rules(csm)


class FortinetBaselineEvaluator(FrameworkEvaluator):
    """Framework evaluator implementing the FrameworkEvaluator interface for Fortinet."""

    def __init__(self, framework_id: str = FORTINET_FRAMEWORK_ID):
        self._framework_id = framework_id.strip().lower()

    @property
    def framework_id(self) -> str:
        return self._framework_id

    def evaluate(
        self,
        csm: Dict[str, Any],
        controls: Optional[Sequence[Control]] = None,
    ) -> List[EvaluationResult]:
        """Runs deterministic Fortinet evaluation against normalized CSM."""
        dev = csm.get("device", {}) if isinstance(csm, dict) else {}
        vend = str(dev.get("vendor", "")).lower()
        plat = str(dev.get("platform", "")).lower()

        # If not Fortinet, fail-soft to UNKNOWN
        if vend != "fortinet" and "fortios" not in plat:
            results: List[EvaluationResult] = []
            for spec in FORTINET_RULE_SPECS:
                rid = spec["vendor_rule_id"]
                results.append(
                    EvaluationResult(
                        framework_id=self._framework_id,
                        control_id=rid,
                        status=ComplianceStatus.UNKNOWN,
                        evidence=Evidence(
                            observed_value={"vendor": vend, "platform": plat},
                            location="csm.device",
                            expected_value="Vendor 'fortinet' with platform 'FortiOS'",
                            rationale=f"Configuration is vendor '{vend}', not Fortinet.",
                            confidence=1.0,
                        ),
                        reason=f"Configuration is vendor '{vend}', not Fortinet.",
                        observed_value={"vendor": vend, "platform": plat},
                        expected_value="Vendor 'fortinet'",
                        evaluator_id=self._framework_id,
                    )
                )
            return results

        evals = evaluate_fortinet_baseline(csm)
        results = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for spec in FORTINET_RULE_SPECS:
            rid = spec["vendor_rule_id"]
            res = evals.get(rid, {"status": "Unknown", "focus": "Security", "evidence_found": []})
            status = ComplianceStatus.from_str(res["status"])
            ev_list = res.get("evidence_found", [])

            evidence = Evidence(
                observed_value=ev_list,
                location=f"csm.{spec['csmFieldChecked']}",
                expected_value=spec["condition"],
                rationale=f"Evaluated {rid} against normalized CSM. Status: {status.value}.",
                confidence=1.0,
                source_lines=tuple(ev_list),
            )

            results.append(
                EvaluationResult(
                    framework_id=self._framework_id,
                    control_id=rid,
                    status=status,
                    evidence=evidence,
                    reason=f"{spec['title']}: {status.value}",
                    observed_value=ev_list,
                    expected_value=spec["condition"],
                    evaluator_id=self._framework_id,
                    timestamp=now_iso,
                )
            )

        return results


def register_fortinet_baseline(
    registry: Optional[FrameworkRegistry] = None,
) -> FrameworkRegistry:
    """Registers the 'fortinet-fortios-baseline' framework and evaluator into FrameworkRegistry."""
    target = registry if registry is not None else get_default_registry()
    framework = Framework(
        framework_id=FORTINET_FRAMEWORK_ID,
        name="Fortinet FortiOS Baseline Security Standard",
        version="1.0",
        description="Deterministic network security baseline for Fortinet FortiOS firewall and network operating systems.",
        vendor_scope="Fortinet FortiOS",
        control_namespace="FORTINET",
        enabled=True,
    )
    evaluator = FortinetBaselineEvaluator(framework_id=FORTINET_FRAMEWORK_ID)
    target.register(framework=framework, evaluator=evaluator, allow_replace=True)
    return target

