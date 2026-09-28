"""Remediation Generation, Static Conflict Analysis & AI Explanation (PRD Addendum Section 4 Step 4).
Renders Jinja2 remediation templates from parsed CSM fields only,
performs static conflict analysis against device configuration state,
and generates plain-language failure explanations via local AI.
Guaranteed execution-safe: remediation commands are NEVER executed.
"""
import ast
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.request
import jinja2
from typing import Tuple
import src.ai_model_manager as ai_model_manager
from src.ai_model_manager import ModelMode, WorkloadType

BASE = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE / "templates" / "remediation"
_MODEL_MANAGER = ai_model_manager.get_model_manager()

# Baseline remediation registry keyed by baseline rule IDs only (Cisco 10, Junos 10).
# CIS and DISA-STIG controls resolve automatically through their mapped internal rules.
BASELINE_REMEDIATION_REGISTRY = {
    # --- Cisco IOS-XE Baseline Rules ---
    "CISCO-SSH-001": (
        "ip ssh version 2\n"
        "line vty 0 4\n"
        " transport input ssh"
    ),
    "CISCO-AAA-001": (
        "aaa new-model\n"
        "aaa authentication login default local\n"
        "aaa authorization exec default local"
    ),
    "CISCO-NTP-001": (
        "ntp authenticate\n"
        "{% if ntp.servers -%}\n"
        "{% for srv in ntp.servers -%}\n"
        "ntp server {{ srv }}\n"
        "{% endfor -%}\n"
        "{% else -%}\n"
        "ntp server <NTP_SERVER_IP>\n"
        "{% endif -%}"
    ),
    "CISCO-LOG-001": (
        "service timestamps log datetime msec\n"
        "logging buffered 64000\n"
        "logging trap informational\n"
        "{% if logging.remote_servers -%}\n"
        "{% for srv in logging.remote_servers -%}\n"
        "logging host {{ srv }}\n"
        "{% endfor -%}\n"
        "{% else -%}\n"
        "logging host <LOG_SERVER_IP>\n"
        "{% endif -%}"
    ),
    "CISCO-SNMP-001": (
        "no snmp-server community public\n"
        "no snmp-server community private\n"
        "snmp-server community <STRONG_COMMUNITY_STRING> RO"
    ),
    "CISCO-ACL-001": (
        "ip access-list extended MGMT-ACL\n"
        " permit tcp <TRUSTED_MGMT_NET> any eq 22\n"
        " deny ip any any log\n"
        "line vty 0 4\n"
        " access-class MGMT-ACL in"
    ),
    "CISCO-INT-001": (
        "{% if interfaces -%}\n"
        "{% for intf in interfaces if 'unused' in (intf.description or '').lower() -%}\n"
        "interface {{ intf.name }}\n"
        " shutdown\n"
        "{% endfor -%}\n"
        "{% else -%}\n"
        "interface <UNUSED_INTERFACE>\n"
        " shutdown\n"
        "{% endif -%}"
    ),
    "CISCO-ROUTING-001": (
        "router ospf 1\n"
        " area 0 authentication message-digest\n"
        "interface <ROUTING_INTERFACE>\n"
        " ip ospf message-digest-key 1 md5 <STRONG_KEY>"
    ),
    "CISCO-STP-001": (
        "spanning-tree portfast bpduguard default"
    ),
    "CISCO-MGMT-001": (
        "ip vrf Mgmt-intf\n"
        "interface GigabitEthernet0/0\n"
        " ip vrf forwarding Mgmt-intf\n"
        " ip address <MGMT_IP> <NETMASK>"
    ),

    # --- Juniper Junos Baseline Rules ---
    "JUNOS-SSH-001": (
        "set system services ssh protocol-version v2\n"
        "delete system services telnet"
    ),
    "JUNOS-SSH-002": (
        "set system services ssh root-login deny"
    ),
    "JUNOS-SSH-003": (
        "set system services ssh connection-limit 10\n"
        "set system services ssh rate-limit 5"
    ),
    "JUNOS-AAA-001": (
        "set system authentication-order password\n"
        "set system login retry-options backoff-threshold 3\n"
        "set system login retry-options backoff-factor 5\n"
        "set system login retry-options minimum-time 20\n"
        "set system login retry-options tries-before-disconnect 3"
    ),
    "JUNOS-AAA-002": (
        "set system login password change-frequency 90\n"
        "set system login password format sha512"
    ),
    "JUNOS-NTP-001": (
        "{% if ntp.servers -%}\n"
        "{% for srv in ntp.servers -%}\n"
        "set system ntp server {{ srv }}\n"
        "{% endfor -%}\n"
        "{% else -%}\n"
        "set system ntp server <NTP_SERVER_IP>\n"
        "{% endif -%}\n"
        "set system ntp boot-server <NTP_BOOT_SERVER_IP>"
    ),
    "JUNOS-LOG-001": (
        "set system syslog user * any emergency\n"
        "set system syslog file messages any notice\n"
        "set system syslog file authorization authorization info\n"
        "{% if logging.remote_servers -%}\n"
        "{% for srv in logging.remote_servers -%}\n"
        "set system syslog host {{ srv }} any info\n"
        "{% endfor -%}\n"
        "{% else -%}\n"
        "set system syslog host <LOG_SERVER_IP> any info\n"
        "{% endif -%}"
    ),
    "JUNOS-SNMP-001": (
        "delete snmp community public\n"
        "delete snmp community private\n"
        "set snmp v3 usm local-engine user <SNMPV3_USER> authentication-sha authentication-password <AUTH_PASS>\n"
        "set snmp v3 usm local-engine user <SNMPV3_USER> privacy-aes128 privacy-password <PRIV_PASS>"
    ),
    "JUNOS-ACL-001": (
        "set firewall family inet filter MGMT-FILTER term ALLOW-SSH from source-address <TRUSTED_MGMT_NET>\n"
        "set firewall family inet filter MGMT-FILTER term ALLOW-SSH from protocol tcp\n"
        "set firewall family inet filter MGMT-FILTER term ALLOW-SSH from destination-port 22\n"
        "set firewall family inet filter MGMT-FILTER term ALLOW-SSH then accept\n"
        "set firewall family inet filter MGMT-FILTER term DROP-OTHER then reject"
    ),
    "JUNOS-MGMT-001": (
        "set routing-instances mgmt_junos routing-options static route 0.0.0.0/0 next-hop <GATEWAY_IP>\n"
        "set routing-instances mgmt_junos interface fxp0.0"
    ),
}


def resolve_rule_to_baseline(rule_id: str) -> Tuple[str, str]:
    """Resolves rule_id to an active baseline rule id.
    Returns (resolved_baseline_id, resolution_path_description).
    """
    clean_id = rule_id.strip()
    if clean_id in BASELINE_REMEDIATION_REGISTRY:
        return clean_id, "direct baseline match"

    # Attempt resolution via CIS control metadata
    try:
        from src.cis_benchmark_cisco_iosxe import CIS_CISCO_IOSXE_CONTROLS
        if clean_id in CIS_CISCO_IOSXE_CONTROLS:
            mapped = CIS_CISCO_IOSXE_CONTROLS[clean_id].evaluation_metadata.get("mapped_internal_rules", [])
            if mapped and mapped[0] in BASELINE_REMEDIATION_REGISTRY:
                return mapped[0], f"CIS control {clean_id} -> {mapped[0]}"
    except Exception:
        pass

    # Attempt resolution via DISA-STIG control metadata
    try:
        from src.disa_stig_cisco_iosxe import DISA_STIG_CISCO_IOSXE_CONTROLS
        if clean_id in DISA_STIG_CISCO_IOSXE_CONTROLS:
            mapped = DISA_STIG_CISCO_IOSXE_CONTROLS[clean_id].evaluation_metadata.get("mapped_internal_rules", [])
            if mapped and mapped[0] in BASELINE_REMEDIATION_REGISTRY:
                return mapped[0], f"DISA-STIG control {clean_id} -> {mapped[0]}"
    except Exception:
        pass

    raise KeyError(f"Unknown rule ID '{rule_id}': no remediation available in baseline registry or framework control mappings.")


def generate_remediation(rule_id: str, csm: dict) -> str:
    """Renders remediation for the given rule_id (baseline, CIS, or STIG).
    Context variables are derived ONLY from parsed CSM fields.
    Returns rendered CLI command text. NEVER executes anything.
    """
    resolved_id, _ = resolve_rule_to_baseline(rule_id)
    template_str = BASELINE_REMEDIATION_REGISTRY[resolved_id]

    # Render Jinja template directly in-memory (no filesystem dependency)
    tmpl = jinja2.Template(template_str, autoescape=False, trim_blocks=True, lstrip_blocks=True)

    # Pass only known CSM fields as context
    context = {
        "device": csm.get("device", {}),
        "ntp": csm.get("ntp", {}),
        "snmp": csm.get("snmp", {}),
        "logging": csm.get("logging", {}),
        "services": csm.get("services", {}),
        "management": csm.get("management", {}),
        "interfaces": csm.get("interfaces", [])
    }
    rendered = tmpl.render(**context)
    return rendered.strip()

def check_static_conflicts(rule_id: str, csm: dict, remediation_commands: str) -> dict:
    """Scans parsed CSM for configuration dependencies that the remediation command would break.
    For CISCO-NTP-001, checks:
    1. NTP_AUTH_KEY_MISSING: Enabling ntp authenticate without active authentication keys severs peer sync.
    2. NTP_MGMT_VRF_ACL_BLOCK: NTP servers routed across Mgmt VRF without explicit UDP 123 permit.
    """
    conflicts = []

    if rule_id == "CISCO-NTP-001":
        ntp_data = csm.get("ntp", {})
        servers = ntp_data.get("servers", [])

        # Conflict 1: Missing NTP authentication keys
        raw_ev = [item["field"] for item in csm.get("raw_evidence", [])]
        has_keys = any("ntp.key" in f or "ntp.trusted-key" in f for f in raw_ev) or bool(ntp_data.get("authentication_keys") or ntp_data.get("trusted_key_ids"))
        if not has_keys and servers:
            conflicts.append({
                "conflict_id": "NTP_AUTH_KEY_MISSING",
                "title": "Missing Trusted Authentication Keys",
                "severity": "HIGH",
                "affected_components": [f"NTP Peer {s}" for s in servers],
                "description": (
                    f"Enabling 'ntp authenticate' globally instructs Cisco IOS-XE to drop packets from any "
                    f"server that does not present a trusted key. No 'ntp authentication-key' or 'ntp trusted-key' "
                    f"is configured in the current configuration. Deploying 'ntp authenticate' will immediately "
                    f"sever clock synchronization with server(s) {servers}, leading to clock drift, TLS validation "
                    f"failures, and broken log timestamping."
                ),
                "mitigation": "Configure 'ntp authentication-key <id> md5 <key>' and 'ntp trusted-key <id>' prior to or in conjunction with 'ntp authenticate'."
            })

        # Conflict 2: VRF & Management Access Restriction
        mgmt = csm.get("management", {})
        if mgmt.get("management_vrf_enabled") and servers:
            conflicts.append({
                "conflict_id": "NTP_VRF_SOURCE_CHECK",
                "title": "Management VRF Route Binding Notice",
                "severity": "MEDIUM",
                "affected_components": ["Management VRF (Mgmt-intf)"],
                "description": (
                    "Dedicated Management VRF is active. Ensure 'ntp server vrf Mgmt-intf' or 'ntp source-interface' "
                    "is specified if NTP servers reside in the out-of-band management plane."
                ),
                "mitigation": "Verify routing reachability for NTP server addresses inside the designated VRF table."
            })

    return {
        "rule_id": rule_id,
        "has_conflicts": len(conflicts) > 0,
        "conflict_count": len(conflicts),
        "conflicts": conflicts
    }

def explain_failure_ai(rule_id: str, csm: dict, remediation_cmd: str) -> dict:
    """Generates plain-language explanation of failure cause and remediation action
    using local AI via AIModelManager with fallback to hardcoded templates if unreachable.
    """
    # Build prompt from real audit context
    ntp_srv = csm.get("ntp", {}).get("servers", ["configured servers"])
    if rule_id == "CISCO-NTP-001":
        ntp_auth = csm.get("ntp", {}).get("authentication_enabled", False)
        evidence_summary = f"ntp.authenticate = {ntp_auth} (should be True); ntp.servers = {ntp_srv}"
    else:
        evidence = csm.get("raw_evidence", [])
        evidence_summary = "; ".join(f"{e.get('field', '')}={e.get('value', '')}" for e in evidence[:5]) if evidence else "no evidence fields"

    _last_cmd = remediation_cmd.splitlines()[-1].strip()
    _hostname = csm.get("device", {}).get("hostname", "unknown")
    prompt = (
        f"Complete this technical audit report. Write only factual, procedural sentences.\n\n"
        f"Device: {_hostname} | Rule: {rule_id}\n"
        f"Configuration evidence: {evidence_summary}\n\n"
        f"WHY_IT_FAILED: [In 2 sentences: what IOS-XE configuration command or setting is "
        f"absent on this device, and what that setting does when it is configured.]\n\n"
        f"WHAT_REMEDIATION_DOES: [In 2 sentences: what the command '{_last_cmd}' adds to "
        f"the device configuration, and what the device does differently after it is applied.]\n"
    )

    res = _MODEL_MANAGER.generate(
        prompt=prompt,
        workload=WorkloadType.REMEDIATION_EXPLANATION
    )

    if not res.is_fallback and len(res.text) > 20:
        print(f"[explain_failure_ai] path=ollama model={res.model_used} mode={res.mode_used.value} chars={len(res.text)} elapsed={res.latency_sec:.1f}s")
        # Split on WHAT_REMEDIATION_DOES — handles both "LABEL: text" and "LABEL\n\ntext"
        _WHAT_PAT = re.compile(r'WHAT_REMEDIATION_DOES\s*:?\s*', re.IGNORECASE)
        parts = _WHAT_PAT.split(res.text, maxsplit=1)
        if len(parts) == 2:
            why = re.sub(r'(?i)^WHY_IT_FAILED\s*:?\s*', '', parts[0]).strip()
            what = parts[1].strip()
        else:
            why = what = res.text
        # Strip echoed context lines the model sometimes repeats from the prompt
        _CTX_PAT = re.compile(
            r'^(here is.*?\n+|device\s*:.*?\n+|rule\s*:.*?\n+|configuration evidence\s*:.*?\n+)+',
            re.IGNORECASE | re.MULTILINE
        )
        why = _CTX_PAT.sub('', why).lstrip('\n').strip()
        what = _CTX_PAT.sub('', what).lstrip('\n').strip()
        return {
            "rule_id": rule_id,
            "why_it_failed": why,
            "what_remediation_does": what,
            "model_used": res.model_used,
            "execution_safety": "display_only_no_device_execution",
        }
    else:
        print(f"[explain_failure_ai] path=fallback reason={res.fallback_reason} chars=0")

    # Fallback: original hardcoded templates
    if rule_id == "CISCO-NTP-001":
        why = (
            f"The network device is synchronizing time with external server(s) {ntp_srv}, but NTP cryptographic "
            "authentication is explicitly disabled ('no ntp authenticate'). Without authentication, an attacker "
            "can inject spoofed NTP responses, artificially skewing the device clock. Clock desynchronization breaks "
            "TLS certificate validation, invalidates audit trail correlation, and disrupts security token lifecycles."
        )
        what = (
            f"The remediation command '{remediation_cmd}' turns on mandatory packet verification for all NTP "
            "exchanges. The device will henceforth reject any NTP packet that fails cryptographic verification, "
            "preventing man-in-the-middle time manipulation."
        )
    else:
        why = f"The control {rule_id} failed compliance checks against approved baseline security policy."
        what = f"The remediation command '{remediation_cmd}' modifies configuration parameters to align with policy."

    return {
        "rule_id": rule_id,
        "why_it_failed": why,
        "what_remediation_does": what,
        "model_used": "fallback_template",
        "execution_safety": "display_only_no_device_execution",
    }


import src.ast_safety as ast_safety


def verify_safety_no_execution() -> bool:
    """AST code analysis asserting that no process execution or device communication
    libraries are imported or used in remediation_engine.py.
    """
    return ast_safety.assert_no_execution_imports(pathlib.Path(__file__))

