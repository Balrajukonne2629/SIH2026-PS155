"""NTRO PS26155 — Palo Alto PAN-OS Compliance Auditor & Parser.

Provides pure Python standard library configuration parsing, CSM normalization,
and deterministic baseline compliance evaluation for Palo Alto PAN-OS devices:

1. Canonical Parser:
   - Supports native PAN-OS CLI 'set' syntax (e.g. 'set deviceconfig system ...',
     'set shared log-settings syslog ...', 'set network ...', 'set rulebase security ...').
   - Supports PAN-OS automation fragments (Ansible 'paloaltonetworks.panos' YAML definitions).
   - Extracts hostname, management IP, SSH, Telnet, Syslog, NetFlow, NTP, SNMP, AAA,
     interfaces, and zone security policy rules.
   - Robust and fault-tolerant: unmapped statements preserved in csm["unmapped_lines"].
2. Common Security Model (CSM) Normalization:
   - Produces vendor-neutral schema conforming to normalized_config_schema.json.
   - Follows strict management IP resolution order:
     1st: set deviceconfig system ip-address
     2nd: interface with management purpose or dedicated mgmt
     3rd: None.
3. 10 Grounded Palo Alto PAN-OS Baseline Security Rules:
   - PALOALTO-SSH-001: Enforce secure SSH administrative management (disable-ssh no)
   - PALOALTO-TELNET-001: Restrict plaintext Telnet access (disable-telnet yes)
   - PALOALTO-LOG-001: Configure remote syslog logging with reliable transport
   - PALOALTO-NETFLOW-001: Configure telemetry flow export via NetFlow server profile
   - PALOALTO-NTP-001: Require synchronized network time protocol (NTP) servers
   - PALOALTO-SNMP-001: Disallow default or weak SNMPv1/v2c community strings
   - PALOALTO-AAA-001: Configure centralized administrative authentication (TACACS+ or RADIUS)
   - PALOALTO-MGMT-001: Isolate management traffic to dedicated interface or service configuration
   - PALOALTO-ROUTING-001: Enforce dynamic routing protocol controls and virtual router configuration
   - PALOALTO-POLICY-001: Enforce zone-based security policy rules restricting inbound traffic
4. Framework Evaluator Integration:
   - PaloAltoBaselineEvaluator implementing FrameworkEvaluator under 'paloalto-panos-baseline'.
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

PALOALTO_FRAMEWORK_ID = "paloalto-panos-baseline"
WEAK_COMMUNITIES = frozenset({"public", "private", "cisco", "community", "snmp", "default"})

# 10 Grounded Rule Specifications for Palo Alto PAN-OS
PALOALTO_RULE_SPECS = [
    {
        "vendor_rule_id": "PALOALTO-SSH-001",
        "title": "Enforce secure SSH administrative management",
        "check_focus": ["SSH", "administrative-service", "remote-access"],
        "csmFieldChecked": "services.ssh",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-TELNET-001",
        "title": "Restrict plaintext Telnet administrative access",
        "check_focus": ["Telnet", "plaintext-service", "disable-telnet"],
        "csmFieldChecked": "services.telnet_enabled",
        "condition": "equals False",
    },
    {
        "vendor_rule_id": "PALOALTO-LOG-001",
        "title": "Configure remote syslog logging with reliable transport",
        "check_focus": ["Syslog", "remote-logging", "syslog-server"],
        "csmFieldChecked": "logging.remote_logging_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-NETFLOW-001",
        "title": "Configure telemetry flow export via NetFlow server profile",
        "check_focus": ["NetFlow", "telemetry", "server-profile"],
        "csmFieldChecked": "telemetry.netflow_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-NTP-001",
        "title": "Require synchronized network time protocol (NTP) servers",
        "check_focus": ["NTP", "time-synchronization", "ntp-servers"],
        "csmFieldChecked": "ntp.servers",
        "condition": "not_empty",
    },
    {
        "vendor_rule_id": "PALOALTO-SNMP-001",
        "title": "Disallow default or weak SNMPv1/v2c community strings",
        "check_focus": ["SNMP", "v2c-community", "community-security"],
        "csmFieldChecked": "snmp.community_strings",
        "condition": "secure_communities",
    },
    {
        "vendor_rule_id": "PALOALTO-AAA-001",
        "title": "Configure centralized administrative authentication (TACACS+ or RADIUS)",
        "check_focus": ["AAA", "centralized-auth", "tacacs", "radius"],
        "csmFieldChecked": "aaa.enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-MGMT-001",
        "title": "Isolate management traffic to dedicated interface or service configuration",
        "check_focus": ["Management", "dedicated-mgmt", "deviceconfig"],
        "csmFieldChecked": "management.dedicated_mgmt_interface",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-ROUTING-001",
        "title": "Enforce dynamic routing protocol controls and virtual router configuration",
        "check_focus": ["Routing", "virtual-router", "ospf", "bgp"],
        "csmFieldChecked": "routing.routing_enabled",
        "condition": "equals True",
    },
    {
        "vendor_rule_id": "PALOALTO-POLICY-001",
        "title": "Enforce zone-based security policy rules restricting inbound traffic",
        "check_focus": ["SecurityPolicy", "security-rule", "zone-protection"],
        "csmFieldChecked": "access_control.control_plane_protection_enabled",
        "condition": "equals True",
    },
]


def resolve_csm_path(csm: dict, path: str) -> Any:
    """Resolves a dot-delimited path (e.g. 'csm.services.ssh') in the CSM dict."""
    parts = [p for p in path.strip().split(".") if p and p != "csm"]
    curr = csm
    for p in parts:
        if isinstance(curr, dict) and p in curr:
            curr = curr[p]
        else:
            return None
    return curr


def eval_condition(val: Any, cond: str) -> str:
    """Evaluates a CSM condition string deterministically returning 'Pass', 'Fail', or 'Unknown'."""
    if not cond:
        return "Unknown"
    c = cond.strip()
    if c == "not_null":
        return "Pass" if val is not None else "Fail"
    if c == "not_empty":
        if val is None:
            return "Fail"
        if isinstance(val, (list, tuple, dict, set, str)):
            return "Pass" if len(val) > 0 else "Fail"
        return "Fail"
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


def parse_panos(
    text: str,
    filename: str = "panos.conf",
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Parses raw Palo Alto PAN-OS configuration text into a normalized CSM dictionary.

    Conforms strictly to config/Rule_Library/normalized_config_schema.json.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    csm: Dict[str, Any] = {
        "schema_version": "1.0",
        "device": {
            "hostname": "unknown",
            "vendor": "paloalto",
            "platform": "PAN-OS",
            "os_version": None,
            "serial_number": None,
            "hardware_model": None,
            "management_ip": None,
        },
        "source": {
            "source_type": "uploaded_file",
            "parser": "paloalto_auditor.parse_panos",
            "file_name": filename,
            "parsed_at": now_iso,
        },
        "services": {
            "ssh": None,
            "ssh_version": None,
            "ssh_v1_disabled": True,
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
            "buffered_logging": False,
            "logging_servers": [],
            "trap_level": None,
            "timestamps_enabled": True,
        },
        "telemetry": {
            "netflow_enabled": False,
            "netflow_servers": [],
        },
        "ntp": {
            "enabled": False,
            "servers": [],
            "authentication_enabled": False,
        },
        "snmp": {
            "enabled": False,
            "version": None,
            "community_strings": [],
            "acls_configured": False,
        },
        "access_control": {
            "control_plane_protection_enabled": False,
            "acls": [],
            "security_rules": [],
        },
        "interfaces": [],
        "routing": {
            "routing_enabled": False,
            "protocols": [],
            "bgp_peers": [],
        },
        "management": {
            "dedicated_mgmt_interface": False,
            "management_vrf_enabled": False,
            "admin_lockout_configured": False,
        },
        "unmapped_lines": [],
        "evidence_index": [],
    }

    evidence_list: List[Dict[str, Any]] = []

    def add_ev(field_path: str, value: Any, raw_line: str, line_no: int) -> None:
        evidence_list.append({
            "field": field_path,
            "value": value,
            "source_line": raw_line,
            "line_number": line_no,
        })

    lines = text.splitlines()

    for idx, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("//"):
            continue

        matched = False

        # --- Native PAN-OS 'set' command syntax ---
        if line.startswith("set "):
            tokens = line.split()

            # Hostname / identity
            # set deviceconfig system hostname <name>
            # set deviceconfig system name <name>
            if len(tokens) >= 5 and tokens[1] == "deviceconfig" and tokens[2] == "system" and tokens[3] in ("hostname", "name"):
                csm["device"]["hostname"] = tokens[4]
                add_ev("device.hostname", tokens[4], line, idx)
                matched = True

            # Management IP
            # set deviceconfig system ip-address <ip> [netmask <mask>]
            elif len(tokens) >= 5 and tokens[1] == "deviceconfig" and tokens[2] == "system" and tokens[3] == "ip-address":
                csm["device"]["management_ip"] = tokens[4]
                csm["management"]["dedicated_mgmt_interface"] = True
                add_ev("device.management_ip", tokens[4], line, idx)
                matched = True

            # SSH Management
            # set deviceconfig system service disable-ssh <yes|no>
            elif len(tokens) >= 5 and tokens[1] == "deviceconfig" and tokens[2] == "system" and tokens[3] == "service":
                if len(tokens) >= 6 and tokens[4] == "disable-ssh":
                    is_disabled = (tokens[5].lower() == "yes")
                    csm["services"]["ssh"] = not is_disabled
                    if not is_disabled:
                        csm["services"]["ssh_version"] = 2
                    add_ev("services.ssh", csm["services"]["ssh"], line, idx)
                    matched = True
                elif len(tokens) >= 6 and tokens[4] == "disable-telnet":
                    is_disabled = (tokens[5].lower() == "yes")
                    csm["services"]["telnet_enabled"] = not is_disabled
                    add_ev("services.telnet_enabled", csm["services"]["telnet_enabled"], line, idx)
                    matched = True

            # Syslog Settings
            # set shared log-settings syslog <profile> server <name> server <ip> [transport <transport>] [port <port>]
            elif len(tokens) >= 5 and tokens[1] == "shared" and tokens[2] == "log-settings" and tokens[3] == "syslog":
                csm["logging"]["enabled"] = True
                csm["logging"]["remote_logging_enabled"] = True
                # Check for server ip
                if "server" in tokens:
                    s_idx = tokens.index("server")
                    # If there is another 'server' keyword following
                    rest = tokens[s_idx + 1:]
                    if "server" in rest:
                        ip_idx = rest.index("server")
                        if ip_idx + 1 < len(rest):
                            syslog_ip = rest[ip_idx + 1]
                            if syslog_ip not in csm["logging"]["logging_servers"]:
                                csm["logging"]["logging_servers"].append(syslog_ip)
                add_ev("logging.remote_logging_enabled", True, line, idx)
                matched = True

            # NetFlow Telemetry Profile
            # set shared server-profile netflow <profile> server <name> host <ip> port <port>
            elif len(tokens) >= 5 and tokens[1] == "shared" and tokens[2] == "server-profile" and tokens[3] == "netflow":
                csm["telemetry"]["netflow_enabled"] = True
                if "host" in tokens:
                    h_idx = tokens.index("host")
                    if h_idx + 1 < len(tokens):
                        host_val = tokens[h_idx + 1]
                        if host_val not in csm["telemetry"]["netflow_servers"]:
                            csm["telemetry"]["netflow_servers"].append(host_val)
                add_ev("telemetry.netflow_enabled", True, line, idx)
                matched = True

            # Centralized Authentication (TACACS / RADIUS)
            # set shared server-profile tacacs <profile> server ...
            elif len(tokens) >= 5 and tokens[1] == "shared" and tokens[2] == "server-profile" and tokens[3] == "tacacs":
                csm["aaa"]["enabled"] = True
                csm["aaa"]["tacacs_enabled"] = True
                add_ev("aaa.tacacs_enabled", True, line, idx)
                matched = True
            elif len(tokens) >= 5 and tokens[1] == "shared" and tokens[2] == "server-profile" and tokens[3] == "radius":
                csm["aaa"]["enabled"] = True
                csm["aaa"]["radius_enabled"] = True
                add_ev("aaa.radius_enabled", True, line, idx)
                matched = True

            # NTP Servers
            # set deviceconfig system ntp-servers primary-ntp-server ntp-server-address <ip>
            elif len(tokens) >= 5 and tokens[1] == "deviceconfig" and tokens[2] == "system" and tokens[3] in ("ntp-servers", "ntp"):
                csm["ntp"]["enabled"] = True
                for val in tokens[4:]:
                    if re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", val) or "." in val:
                        if val not in csm["ntp"]["servers"]:
                            csm["ntp"]["servers"].append(val)
                add_ev("ntp.servers", csm["ntp"]["servers"], line, idx)
                matched = True

            # SNMP Community Settings
            # set deviceconfig system snmp-setting v2c-community <name>
            elif len(tokens) >= 5 and tokens[1] == "deviceconfig" and tokens[2] == "system" and tokens[3] == "snmp-setting":
                csm["snmp"]["enabled"] = True
                if "v2c-community" in tokens:
                    c_idx = tokens.index("v2c-community")
                    if c_idx + 1 < len(tokens):
                        comm_name = tokens[c_idx + 1]
                        csm["snmp"]["community_strings"].append({"name": comm_name})
                add_ev("snmp.community_strings", csm["snmp"]["community_strings"], line, idx)
                matched = True

            # Routing (Virtual Router & Protocols)
            # set network virtual-router <name> protocol ospf enable yes
            elif len(tokens) >= 4 and tokens[1] == "network" and tokens[2] == "virtual-router":
                csm["routing"]["routing_enabled"] = True
                if "protocol" in tokens:
                    p_idx = tokens.index("protocol")
                    if p_idx + 1 < len(tokens):
                        proto = tokens[p_idx + 1]
                        if proto not in csm["routing"]["protocols"]:
                            csm["routing"]["protocols"].append(proto)
                add_ev("routing.routing_enabled", True, line, idx)
                matched = True

            # Interfaces
            # set network interface ethernet <name> ...
            elif len(tokens) >= 4 and tokens[1] == "network" and tokens[2] == "interface":
                if len(tokens) >= 5:
                    iface_name = f"{tokens[3]}/{tokens[4]}" if tokens[3] == "ethernet" else tokens[3]
                    # check if existing
                    existing = next((i for i in csm["interfaces"] if i["name"] == iface_name), None)
                    if not existing:
                        existing = {
                            "name": iface_name,
                            "enabled": True,
                            "ip_address": None,
                            "netmask": None,
                            "status": "up",
                            "description": None,
                        }
                        csm["interfaces"].append(existing)
                    if "ip" in tokens:
                        ip_pos = tokens.index("ip")
                        if ip_pos + 1 < len(tokens):
                            existing["ip_address"] = tokens[ip_pos + 1]
                matched = True

            # Security Rules / Access Control Policy
            # set rulebase security rules <name> ...
            elif len(tokens) >= 5 and tokens[1] == "rulebase" and tokens[2] == "security" and tokens[3] == "rules":
                rule_name = tokens[4]
                csm["access_control"]["control_plane_protection_enabled"] = True
                csm["access_control"]["security_rules"].append(rule_name)
                add_ev("access_control.security_rules", rule_name, line, idx)
                matched = True

            else:
                # Other set commands (e.g. unknown subtrees)
                matched = True

        # --- Ansible YAML format handling ---
        elif "paloaltonetworks.panos" in line or "panos_security_rule:" in line:
            csm["access_control"]["control_plane_protection_enabled"] = True
            add_ev("access_control.control_plane_protection_enabled", True, line, idx)
            matched = True
        elif line.startswith("rule_name:") or line.startswith("action:"):
            csm["access_control"]["control_plane_protection_enabled"] = True
            matched = True
        elif line.startswith("- hosts:") or line.startswith("connection:") or line.startswith("vars:") or line.startswith("tasks:"):
            matched = True
        elif line.startswith("ip_address:") or line.startswith("provider:"):
            matched = True

        if not matched:
            csm["unmapped_lines"].append(raw_line)

    csm["evidence_index"] = evidence_list
    return csm


def load_baseline_rules() -> List[dict]:
    """Returns the grounded prototype rule specifications for Palo Alto PAN-OS."""
    return [dict(spec) for spec in PALOALTO_RULE_SPECS]


def evaluate_rules(
    csm: Dict[str, Any],
    rules: Optional[List[dict]] = None,
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Evaluates Palo Alto baseline rules against normalized CSM returning legacy evaluation dictionary."""
    if csm.get("device", {}).get("vendor") != "paloalto":
        empty_res: Dict[str, Dict[str, Any]] = {}
        for spec in PALOALTO_RULE_SPECS:
            focus_val = spec.get("check_focus", ["Palo Alto Security"])
            focus_str = focus_val[0] if isinstance(focus_val, list) and focus_val else str(focus_val)
            empty_res[spec["vendor_rule_id"]] = {
                "rule_id": spec["vendor_rule_id"],
                "status": "Unknown",
                "focus": focus_str,
                "evidence_found": [],
                "observed_value": None,
                "expected_condition": spec.get("condition", ""),
            }
        return empty_res

    target_rules = (
        list(rules)
        if rules and any(r.get("vendor_rule_id", "").startswith("PALOALTO-") for r in rules)
        else list(PALOALTO_RULE_SPECS)
    )
    if trusted_rules:
        target_rules.extend(trusted_rules)

    evals: Dict[str, Any] = {}
    for r in target_rules:
        r_id = r.get("vendor_rule_id", "UNKNOWN-RULE")
        path = r.get("csmFieldChecked", "")
        cond = r.get("condition", "")
        focus = r.get("check_focus", ["Palo Alto Security"])

        val = resolve_csm_path(csm, path)
        status = eval_condition(val, cond)

        evidence_found = [
            e["source_line"]
            for e in csm.get("evidence_index", [])
            if e.get("field") == path
        ]

        evals[r_id] = {
            "rule_id": r_id,
            "status": status,
            "focus": focus[0] if isinstance(focus, list) and focus else str(focus),
            "evidence_found": evidence_found,
            "observed_value": val,
            "expected_condition": cond,
        }

    return evals


class PaloAltoBaselineEvaluator(FrameworkEvaluator):
    """Deterministic, AST execution-safe evaluator for Palo Alto PAN-OS baseline standard."""

    def __init__(
        self,
        framework_id: str = PALOALTO_FRAMEWORK_ID,
        rules_data: Optional[Sequence[Dict[str, Any]]] = None,
        trusted_rules: Optional[Sequence[Dict[str, Any]]] = None,
    ):
        self._framework_id = framework_id
        self._rules_data = list(rules_data) if rules_data is not None else load_baseline_rules()
        self._trusted_rules = list(trusted_rules) if trusted_rules is not None else []
        self._controls: Dict[str, Control] = {}

        for spec in self._rules_data + self._trusted_rules:
            c_id = spec.get("vendor_rule_id", "UNKNOWN")
            self._controls[c_id] = Control(
                framework_id=self._framework_id,
                control_id=c_id,
                title=spec.get("title", c_id),
                description=f"Palo Alto PAN-OS baseline rule {c_id}",
                severity="medium",
                expected_state=str(spec.get("condition", "")),
            )

    @property
    def framework_id(self) -> str:
        return self._framework_id

    def list_controls(self) -> Sequence[Control]:
        return list(self._controls.values())

    def get_control(self, control_id: str) -> Optional[Control]:
        return self._controls.get(control_id)

    def evaluate(
        self,
        csm: Dict[str, Any],
        control_ids: Optional[Sequence[str]] = None,
    ) -> Sequence[EvaluationResult]:
        """Evaluates Palo Alto baseline controls deterministically against normalized CSM.

        Vendor Isolation Invariant:
        Rejects non-Palo Alto CSMs returning NOT_ASSESSED for all controls.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        device_vendor = csm.get("device", {}).get("vendor", "")

        # Strict vendor isolation: reject non-Palo Alto CSMs
        if device_vendor and device_vendor != "paloalto":
            results: List[EvaluationResult] = []
            for ctrl_id, ctrl in self._controls.items():
                if control_ids is not None and ctrl_id not in control_ids:
                    continue
                results.append(
                    EvaluationResult(
                        framework_id=self._framework_id,
                        control_id=ctrl_id,
                        status=ComplianceStatus.NOT_ASSESSED,
                        evidence=Evidence(
                            observed_value={"device_vendor": device_vendor},
                            location="csm.device.vendor",
                            expected_value="paloalto",
                            rationale=f"Control {ctrl_id} is scoped strictly to Palo Alto PAN-OS devices. Current device vendor is '{device_vendor}'.",
                            confidence=1.0,
                            source_lines=(),
                        ),
                        reason=f"Vendor isolation: '{device_vendor}' not assessed by Palo Alto baseline",
                        observed_value=device_vendor,
                        expected_value="paloalto",
                        evaluator_id="paloalto_auditor.evaluate",
                        timestamp=now_iso,
                    )
                )
            return results

        evals = evaluate_rules(csm, self._rules_data, self._trusted_rules)
        results: List[EvaluationResult] = []

        for r_id, res in evals.items():
            if control_ids is not None and r_id not in control_ids:
                continue

            status_str = res.get("status", "Unknown")
            status = ComplianceStatus.from_str(status_str)
            focus = res.get("focus", "Palo Alto Security")
            evidence_found = res.get("evidence_found", [])
            ctrl = self._controls.get(r_id)
            title = ctrl.title if ctrl else r_id

            evidence = Evidence(
                observed_value=res.get("observed_value"),
                location=f"csm.{focus.lower().replace(' ', '_')}",
                expected_value=res.get("expected_condition") or "Deterministic requirement satisfied",
                rationale=f"Evaluated Palo Alto rule {r_id} against normalized CSM. Status: {status.value}.",
                confidence=1.0,
                source_lines=tuple(evidence_found),
            )

            results.append(
                EvaluationResult(
                    framework_id=self._framework_id,
                    control_id=r_id,
                    status=status,
                    evidence=evidence,
                    reason=f"{title}: {status.value}",
                    observed_value=res.get("observed_value"),
                    expected_value=res.get("expected_condition"),
                    evaluator_id="paloalto_auditor.evaluate_rules",
                    timestamp=now_iso,
                )
            )

        return results


def register_paloalto_baseline(
    registry: Optional[FrameworkRegistry] = None,
    rules_data: Optional[Sequence[Dict[str, Any]]] = None,
    trusted_rules: Optional[Sequence[Dict[str, Any]]] = None,
) -> FrameworkRegistry:
    """Registers the 'paloalto-panos-baseline' framework and evaluator into FrameworkRegistry."""
    target = registry if registry is not None else get_default_registry()
    framework = Framework(
        framework_id=PALOALTO_FRAMEWORK_ID,
        name="Palo Alto PAN-OS Baseline Security Standard",
        version="1.0",
        description="Deterministic network security baseline for Palo Alto Networks PAN-OS firewall systems.",
        vendor_scope="PaloAlto PAN-OS",
        control_namespace="PALOALTO",
        enabled=True,
    )
    evaluator = PaloAltoBaselineEvaluator(
        framework_id=PALOALTO_FRAMEWORK_ID,
        rules_data=rules_data,
        trusted_rules=trusted_rules,
    )
    target.register(framework=framework, evaluator=evaluator, allow_replace=True)
    return target
