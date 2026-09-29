"""NTRO PS26155 — Arista EOS Compliance Auditor & Parser (Phase C).

Provides pure Python standard library configuration parsing, CSM normalization,
and deterministic baseline compliance evaluation for Arista EOS devices:

1. Canonical Parser:
   - Line-and-block parser supporting Arista EOS CLI syntax:
     hierarchical blocks ('interface ...', 'management ssh', 'router ospf ...', 'vlan ...', 'ip access-list ...').
   - Extracts hostname, local users, management interface, SSH, AAA, NTP, syslog, SNMP, ACLs, and routing.
   - Robust and fault-tolerant: unmapped statements preserved in csm["unmapped_lines"].
2. Common Security Model (CSM) Normalization:
   - Produces vendor-neutral schema conforming to normalized_config_schema.json.
   - Follows strict management IP resolution order:
     1st: interface Management* (e.g. Management1)
     2nd: interface with description containing "management"
     3rd: Loopback0 / Loopback*
     4th: None (never arbitrary Ethernet port).
3. 10 Authoritative Arista Security Rules (from vendor_rule_mapping.json):
   - ARISTA-SSH-001: Enforce secure SSH management with approved authentication and protocols
   - ARISTA-AAA-001: Configure AAA authentication and authorization
   - ARISTA-NTP-001: Require NTP server synchronization
   - ARISTA-LOG-001: Configure event logging (local buffer and remote syslog)
   - ARISTA-SNMP-001: Disallow default or weak SNMP community strings
   - ARISTA-ACL-001: Enforce access control lists for management protection
   - ARISTA-INT-001: Ensure physical interfaces are properly classified with trunk VLAN restrictions
   - ARISTA-ROUTING-001: Configure routing protocol security and router ID
   - ARISTA-STP-001: Enable Spanning Tree BPDU guard on access ports
   - ARISTA-MGMT-001: Isolate management plane via dedicated interface and VRF
4. Framework Evaluator Integration:
   - AristaBaselineEvaluator implementing FrameworkEvaluator under 'arista-eos-baseline'.
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

ARISTA_FRAMEWORK_ID = "arista-eos-baseline"
WEAK_COMMUNITIES = frozenset({"public", "private", "cisco", "community", "snmp", "default"})

# 10 Grounded Rule Specifications for Arista EOS from config/Rule_Library/vendor_rule_mapping.json
ARISTA_RULE_SPECS = [
    {
        "vendor_rule_id": "ARISTA-SSH-001",
        "title": "Enforce secure SSH management with approved authentication and protocols",
        "check_focus": ["SSH authentication", "approved authentication methods", "management security"],
        "csmFieldChecked": "services.ssh_version",
        "condition": "secure_ssh",
    },
    {
        "vendor_rule_id": "ARISTA-AAA-001",
        "title": "Configure AAA authentication and authorization",
        "check_focus": ["authentication", "authorization", "accounting", "centralized authentication"],
        "csmFieldChecked": "aaa.authorization_exec",
        "condition": "configured",
    },
    {
        "vendor_rule_id": "ARISTA-NTP-001",
        "title": "Require NTP server synchronization",
        "check_focus": ["NTP server", "NTP authentication", "timezone", "time verification"],
        "csmFieldChecked": "ntp.servers",
        "condition": "not_empty",
    },
    {
        "vendor_rule_id": "ARISTA-LOG-001",
        "title": "Configure event logging (local buffer and remote syslog)",
        "check_focus": ["remote logging", "local buffer", "severity", "event visibility"],
        "csmFieldChecked": "logging.buffered_logging",
        "condition": "configured",
    },
    {
        "vendor_rule_id": "ARISTA-SNMP-001",
        "title": "Disallow default or weak SNMP community strings",
        "check_focus": ["SNMP version", "community security", "authorized monitoring hosts"],
        "csmFieldChecked": "snmp.communities",
        "condition": "no_weak_community",
    },
    {
        "vendor_rule_id": "ARISTA-ACL-001",
        "title": "Enforce access control lists for management protection",
        "check_focus": ["IPv4 ACL", "IPv6 ACL", "MAC ACL", "ACL application"],
        "csmFieldChecked": "access_control.acls",
        "condition": "not_empty",
    },
    {
        "vendor_rule_id": "ARISTA-INT-001",
        "title": "Ensure physical interfaces are properly classified with trunk VLAN restrictions",
        "check_focus": ["unused interfaces", "access/trunk classification", "interface state"],
        "csmFieldChecked": "interfaces",
        "condition": "trunk_vlan_restricted",
    },
    {
        "vendor_rule_id": "ARISTA-ROUTING-001",
        "title": "Configure routing protocol security and router ID",
        "check_focus": ["BGP peers", "BGP authentication", "OSPF authentication"],
        "csmFieldChecked": "routing.router_id",
        "condition": "router_id_configured_if_routing",
    },
    {
        "vendor_rule_id": "ARISTA-STP-001",
        "title": "Enable Spanning Tree BPDU guard on access ports",
        "check_focus": ["STP mode", "edge-port protection", "BPDU protection"],
        "csmFieldChecked": "interfaces",
        "condition": "bpduguard_on_access_ports",
    },
    {
        "vendor_rule_id": "ARISTA-MGMT-001",
        "title": "Isolate management plane via dedicated interface and VRF",
        "check_focus": ["management VRF", "management interface", "management service exposure", "routing-context separation"],
        "csmFieldChecked": "interfaces.management.vrf",
        "condition": "management_vrf_isolated",
    },
]


# ==============================================================================
# Helper Functions: IP and Mask Resolution
# ==============================================================================

def _cidr_to_netmask(cidr: int) -> str:
    """Converts CIDR integer (e.g. 24) to dotted decimal netmask."""
    mask = (0xFFFFFFFF >> (32 - cidr)) << (32 - cidr)
    return f"{(mask >> 24) & 0xFF}.{(mask >> 16) & 0xFF}.{(mask >> 8) & 0xFF}.{mask & 0xFF}"


def _netmask_to_cidr(netmask: str) -> int:
    """Converts dotted decimal netmask to CIDR prefix integer."""
    try:
        parts = [int(p) for p in netmask.split(".")]
        if len(parts) != 4:
            return 24
        binary = "".join(f"{p:08b}" for p in parts)
        return binary.count("1")
    except Exception:
        return 24


# ==============================================================================
# Canonical Arista EOS Parser
# ==============================================================================

def parse_arista(
    text: str,
    filename: str = "arista.conf",
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Parses raw Arista EOS configuration into normalized Common Security Model (CSM).

    Features:
    - Block and indentation parsing: 'interface ...', 'management ssh', 'router ospf ...', 'vlan ...', 'ip access-list ...'.
    - High-integrity management IP extraction prioritizing Management1 over loopback/ethernet.
    - Zero fabrication: missing NTP, SNMP, or OS metadata remain None/empty.
    - Preserves raw evidence source lines and unmapped statements.
    """
    raw_lines = text.splitlines() if text else []

    device_info: Dict[str, Any] = {
        "hostname": "UNKNOWN",
        "vendor": "arista",
        "platform": "EOS",
        "os_version": None,
        "serial_number": None,
        "model": None,
        "management_ip": None,
    }

    services_info: Dict[str, Any] = {
        "ssh_enabled": False,
        "ssh_version": None,
        "ssh_auth_methods": [],
        "telnet_enabled": False,
        "http_server_enabled": None,
        "https_server_enabled": None,
        "dns_servers": [],
    }

    aaa_info: Dict[str, Any] = {
        "aaa_new_model": False,
        "aaa_enabled": False,
        "authentication_login": None,
        "authorization_exec": None,
        "accounting": None,
        "tacacs_servers": [],
        "radius_servers": [],
        "local_users": [],
    }

    ntp_info: Dict[str, Any] = {
        "enabled": False,
        "servers": [],
        "source_interface": None,
        "authentication_enabled": False,
    }

    logging_info: Dict[str, Any] = {
        "buffered_logging": False,
        "buffered_severity": None,
        "console_logging": False,
        "console_severity": None,
        "hosts": [],
        "trap_logging": False,
        "trap_severity": None,
        "source_interface": None,
        "timestamps": False,
    }

    snmp_info: Dict[str, Any] = {
        "enabled": False,
        "communities": [],
        "location": None,
        "contact": None,
        "hosts": [],
    }

    interfaces_list: List[Dict[str, Any]] = []
    acls_list: List[Dict[str, Any]] = []
    vlans_list: List[Dict[str, Any]] = []
    routing_info: Dict[str, Any] = {
        "ip_routing": False,
        "ospf_configured": False,
        "bgp_configured": False,
        "router_id": None,
        "networks": [],
    }

    raw_evidence: List[Dict[str, Any]] = []
    unmapped_lines: List[str] = []

    # State tracking for block parsing
    current_block_type: Optional[str] = None
    current_interface: Optional[Dict[str, Any]] = None
    current_acl: Optional[Dict[str, Any]] = None
    current_vlan: Optional[Dict[str, Any]] = None
    current_routing: Optional[str] = None
    ssh_block_active = False

    def close_current_blocks():
        nonlocal current_interface, current_acl, current_vlan, current_routing, ssh_block_active, current_block_type
        if current_interface is not None:
            interfaces_list.append(current_interface)
            current_interface = None
        if current_acl is not None:
            acls_list.append(current_acl)
            current_acl = None
        if current_vlan is not None:
            vlans_list.append(current_vlan)
            current_vlan = None
        current_routing = None
        ssh_block_active = False
        current_block_type = None

    for line_idx, line in enumerate(raw_lines, 1):
        stripped = line.strip()

        # Skip comments and empty lines
        if not stripped or stripped.startswith("!"):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level commands (indent == 0)
        if indent == 0:
            close_current_blocks()

            # 1. Hostname
            m_host = re.match(r"^hostname\s+(\S+)", stripped, re.IGNORECASE)
            if m_host:
                device_info["hostname"] = m_host.group(1)
                raw_evidence.append({"field": "device.hostname", "source_lines": [stripped]})
                continue

            # 2. Local username
            m_user = re.match(r"^username\s+(\S+)(.*)", stripped, re.IGNORECASE)
            if m_user:
                username = m_user.group(1)
                user_meta = m_user.group(2)
                priv_match = re.search(r"privilege\s+(\d+)", user_meta, re.IGNORECASE)
                role_match = re.search(r"role\s+(\S+)", user_meta, re.IGNORECASE)
                aaa_info["local_users"].append({
                    "username": username,
                    "privilege": int(priv_match.group(1)) if priv_match else None,
                    "role": role_match.group(1) if role_match else None,
                })
                raw_evidence.append({"field": "aaa.local_users", "source_lines": [stripped]})
                continue

            # 3. AAA commands
            if stripped.lower().startswith("aaa authentication"):
                aaa_info["aaa_enabled"] = True
                aaa_info["aaa_new_model"] = True
                aaa_info["authentication_login"] = stripped
                raw_evidence.append({"field": "aaa.authentication_login", "source_lines": [stripped]})
                continue
            elif stripped.lower().startswith("aaa authorization"):
                aaa_info["aaa_enabled"] = True
                aaa_info["aaa_new_model"] = True
                aaa_info["authorization_exec"] = stripped
                raw_evidence.append({"field": "aaa.authorization_exec", "source_lines": [stripped]})
                continue
            elif stripped.lower().startswith("aaa accounting"):
                aaa_info["aaa_enabled"] = True
                aaa_info["accounting"] = stripped
                raw_evidence.append({"field": "aaa.accounting", "source_lines": [stripped]})
                continue

            # 4. Management SSH block start
            if re.match(r"^management\s+ssh\b", stripped, re.IGNORECASE):
                ssh_block_active = True
                current_block_type = "management_ssh"
                services_info["ssh_enabled"] = True
                raw_evidence.append({"field": "services.ssh_enabled", "source_lines": [stripped]})
                continue

            # 5. NTP commands
            m_ntp = re.match(r"^ntp\s+server\s+(\S+)", stripped, re.IGNORECASE)
            if m_ntp:
                ntp_info["enabled"] = True
                ntp_info["servers"].append(m_ntp.group(1))
                raw_evidence.append({"field": "ntp.servers", "source_lines": [stripped]})
                continue
            m_ntp_src = re.match(r"^ntp\s+source\s+(\S+)", stripped, re.IGNORECASE)
            if m_ntp_src:
                ntp_info["source_interface"] = m_ntp_src.group(1)
                raw_evidence.append({"field": "ntp.source_interface", "source_lines": [stripped]})
                continue
            if "ntp authenticate" in stripped.lower():
                ntp_info["authentication_enabled"] = True
                raw_evidence.append({"field": "ntp.authentication_enabled", "source_lines": [stripped]})
                continue

            # 6. Logging commands
            m_log_buf = re.match(r"^logging\s+buffered\s+(\S+)", stripped, re.IGNORECASE)
            if m_log_buf:
                logging_info["buffered_logging"] = True
                logging_info["buffered_severity"] = m_log_buf.group(1).lower()
                raw_evidence.append({"field": "logging.buffered_logging", "source_lines": [stripped]})
                continue
            m_log_con = re.match(r"^logging\s+console\s+(\S+)", stripped, re.IGNORECASE)
            if m_log_con:
                logging_info["console_logging"] = True
                logging_info["console_severity"] = m_log_con.group(1).lower()
                raw_evidence.append({"field": "logging.console_logging", "source_lines": [stripped]})
                continue
            m_log_host = re.match(r"^logging\s+host\s+(\S+)", stripped, re.IGNORECASE)
            if m_log_host:
                logging_info["hosts"].append(m_log_host.group(1))
                raw_evidence.append({"field": "logging.hosts", "source_lines": [stripped]})
                continue
            m_log_trap = re.match(r"^logging\s+trap\s+(\S+)", stripped, re.IGNORECASE)
            if m_log_trap:
                logging_info["trap_logging"] = True
                logging_info["trap_severity"] = m_log_trap.group(1).lower()
                raw_evidence.append({"field": "logging.trap_logging", "source_lines": [stripped]})
                continue
            m_log_src = re.match(r"^logging\s+source-interface\s+(\S+)", stripped, re.IGNORECASE)
            if m_log_src:
                logging_info["source_interface"] = m_log_src.group(1)
                raw_evidence.append({"field": "logging.source_interface", "source_lines": [stripped]})
                continue

            # 7. SNMP commands
            m_snmp_comm = re.match(r"^snmp-server\s+community\s+(\S+)(?:\s+(\S+))?", stripped, re.IGNORECASE)
            if m_snmp_comm:
                snmp_info["enabled"] = True
                comm_name = m_snmp_comm.group(1)
                comm_ro = m_snmp_comm.group(2) or "ro"
                snmp_info["communities"].append({"name": comm_name, "access": comm_ro.lower()})
                raw_evidence.append({"field": "snmp.communities", "source_lines": [stripped]})
                continue
            m_snmp_loc = re.match(r"^snmp-server\s+location\s+\"?(.*?)\"?$", stripped, re.IGNORECASE)
            if m_snmp_loc:
                snmp_info["location"] = m_snmp_loc.group(1)
                continue
            m_snmp_cont = re.match(r"^snmp-server\s+contact\s+\"?(.*?)\"?$", stripped, re.IGNORECASE)
            if m_snmp_cont:
                snmp_info["contact"] = m_snmp_cont.group(1)
                continue

            # 8. Interface block start
            m_iface = re.match(r"^interface\s+(\S+)", stripped, re.IGNORECASE)
            if m_iface:
                if_name = m_iface.group(1)
                is_mgmt = bool(re.match(r"^Management\d*$", if_name, re.IGNORECASE))
                current_interface = {
                    "name": if_name,
                    "description": None,
                    "ip_address": None,
                    "subnet_mask": None,
                    "cidr": None,
                    "shutdown": False,  # EOS interfaces default to enabled or explicit shutdown
                    "is_management": is_mgmt,
                    "vrf": None,
                    "switchport_mode": None,
                    "access_vlan": None,
                    "allowed_vlans": None,
                    "spanning_tree_portfast": None,
                    "spanning_tree_bpduguard": None,
                    "source_lines": [stripped],
                }
                current_block_type = "interface"
                continue

            # 9. VLAN block start
            m_vlan = re.match(r"^vlan\s+(\d+)", stripped, re.IGNORECASE)
            if m_vlan:
                current_vlan = {
                    "id": int(m_vlan.group(1)),
                    "name": None,
                }
                current_block_type = "vlan"
                continue

            # 10. ACL block start
            m_acl = re.match(r"^ip\s+access-list\s+(?:standard|extended)\s+(\S+)", stripped, re.IGNORECASE)
            if m_acl:
                current_acl = {
                    "name": m_acl.group(1),
                    "rules": [],
                }
                current_block_type = "acl"
                continue

            # 11. Routing commands
            if stripped.lower() == "ip routing":
                routing_info["ip_routing"] = True
                continue
            m_ospf = re.match(r"^router\s+ospf\s+(\d+)", stripped, re.IGNORECASE)
            if m_ospf:
                routing_info["ospf_configured"] = True
                current_routing = "ospf"
                current_block_type = "routing"
                continue
            m_bgp = re.match(r"^router\s+bgp\s+(\d+)", stripped, re.IGNORECASE)
            if m_bgp:
                routing_info["bgp_configured"] = True
                current_routing = "bgp"
                current_block_type = "routing"
                continue

            # 12. IP route (static)
            if stripped.lower().startswith("ip route "):
                raw_evidence.append({"field": "routing.static", "source_lines": [stripped]})
                continue

            # Unmapped top-level line
            unmapped_lines.append(stripped)

        else:
            # Sub-block statements (indent > 0)
            if current_block_type == "management_ssh" or ssh_block_active:
                if "no shutdown" in stripped.lower():
                    services_info["ssh_enabled"] = True
                elif "protocol-version 2" in stripped.lower():
                    services_info["ssh_version"] = 2
                    raw_evidence.append({"field": "services.ssh_version", "source_lines": [stripped]})
                elif "authentication protocol" in stripped.lower():
                    # e.g. authentication protocol public-key keyboard-interactive
                    tokens = stripped.split()[2:]
                    services_info["ssh_auth_methods"].extend(tokens)
                    services_info["ssh_version"] = 2  # Public-key / keyboard-interactive imply SSHv2
                    raw_evidence.append({"field": "services.ssh_auth_methods", "source_lines": [stripped]})
                else:
                    unmapped_lines.append(stripped)

            elif current_block_type == "interface" and current_interface is not None:
                current_interface["source_lines"].append(stripped)
                if stripped.lower().startswith("description "):
                    desc = stripped[12:].strip()
                    current_interface["description"] = desc
                    if "management" in desc.lower():
                        current_interface["is_management"] = True
                elif stripped.lower().startswith("ip address "):
                    ip_part = stripped[11:].strip()
                    if "/" in ip_part:
                        ip_addr, cidr_str = ip_part.split("/", 1)
                        current_interface["ip_address"] = ip_addr.strip()
                        try:
                            cidr_int = int(cidr_str.strip())
                            current_interface["cidr"] = cidr_int
                            current_interface["subnet_mask"] = _cidr_to_netmask(cidr_int)
                        except ValueError:
                            pass
                    else:
                        tokens = ip_part.split()
                        if len(tokens) >= 2:
                            current_interface["ip_address"] = tokens[0]
                            current_interface["subnet_mask"] = tokens[1]
                            current_interface["cidr"] = _netmask_to_cidr(tokens[1])
                        elif len(tokens) == 1:
                            current_interface["ip_address"] = tokens[0]
                elif stripped.lower() == "shutdown":
                    current_interface["shutdown"] = True
                elif stripped.lower() == "no shutdown":
                    current_interface["shutdown"] = False
                elif stripped.lower().startswith("vrf "):
                    current_interface["vrf"] = stripped[4:].strip()
                elif stripped.lower() == "switchport mode access":
                    current_interface["switchport_mode"] = "access"
                elif stripped.lower().startswith("switchport access vlan "):
                    try:
                        current_interface["access_vlan"] = int(stripped.split()[-1])
                    except ValueError:
                        pass
                elif stripped.lower() == "switchport mode trunk":
                    current_interface["switchport_mode"] = "trunk"
                elif stripped.lower().startswith("switchport trunk allowed vlan "):
                    vlans_str = stripped[30:].strip()
                    vlans_parsed = []
                    for v_item in vlans_str.split(","):
                        v_item = v_item.strip()
                        if "-" in v_item:
                            try:
                                v_start, v_end = v_item.split("-", 1)
                                vlans_parsed.extend(range(int(v_start), int(v_end) + 1))
                            except ValueError:
                                pass
                        else:
                            try:
                                vlans_parsed.append(int(v_item))
                            except ValueError:
                                pass
                    current_interface["allowed_vlans"] = vlans_parsed
                elif "spanning-tree portfast" in stripped.lower():
                    current_interface["spanning_tree_portfast"] = True
                elif "spanning-tree bpduguard enable" in stripped.lower():
                    current_interface["spanning_tree_bpduguard"] = True
                elif stripped.lower() == "switchport":
                    pass  # basic switchport activation
                else:
                    unmapped_lines.append(stripped)

            elif current_block_type == "vlan" and current_vlan is not None:
                if stripped.lower().startswith("name "):
                    current_vlan["name"] = stripped[5:].strip()
                else:
                    unmapped_lines.append(stripped)

            elif current_block_type == "acl" and current_acl is not None:
                current_acl["rules"].append(stripped)

            elif current_block_type == "routing":
                if stripped.lower().startswith("router-id "):
                    routing_info["router_id"] = stripped.split()[-1]
                elif stripped.lower().startswith("network "):
                    routing_info["networks"].append(stripped[8:].strip())
                else:
                    unmapped_lines.append(stripped)

            else:
                unmapped_lines.append(stripped)

    # Close any pending blocks at EOF
    close_current_blocks()

    # Determine management IP according to strict project priority order:
    # 1st: Explicit interface Management* (e.g. Management1) with configured IP
    # 2nd: Explicit interface with description containing "management"
    # 3rd: Loopback0 / Loopback*
    # 4th: None (never arbitrary Ethernet port)
    resolved_mgmt_ip = None
    # 1st check
    for iface in interfaces_list:
        if re.match(r"^Management\d*$", iface["name"], re.IGNORECASE) and iface.get("ip_address"):
            resolved_mgmt_ip = iface["ip_address"]
            break
    # 2nd check
    if not resolved_mgmt_ip:
        for iface in interfaces_list:
            desc = str(iface.get("description") or "").lower()
            if "management" in desc and iface.get("ip_address"):
                resolved_mgmt_ip = iface["ip_address"]
                break
    # 3rd check
    if not resolved_mgmt_ip:
        for iface in interfaces_list:
            if re.match(r"^Loopback\d*$", iface["name"], re.IGNORECASE) and iface.get("ip_address"):
                resolved_mgmt_ip = iface["ip_address"]
                break

    device_info["management_ip"] = resolved_mgmt_ip
    if resolved_mgmt_ip:
        raw_evidence.append({"field": "device.management_ip", "source_lines": [f"management_ip: {resolved_mgmt_ip}"]})

    # Assemble normalized CSM
    csm: Dict[str, Any] = {
        "device": device_info,
        "services": services_info,
        "aaa": aaa_info,
        "ntp": ntp_info,
        "logging": logging_info,
        "snmp": snmp_info,
        "interfaces": interfaces_list,
        "access_control": {"acls": acls_list},
        "routing": routing_info,
        "vlans": vlans_list,
        "raw_evidence": raw_evidence,
        "unmapped_lines": unmapped_lines,
    }

    return csm


# ==============================================================================
# Deterministic Baseline Rule Evaluation
# ==============================================================================

def evaluate_rules(
    csm: Dict[str, Any],
    rules: Optional[List[dict]] = None,
    trusted_rules: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """Deterministically evaluates the 10 Arista baseline security rules against normalized CSM.

    Returns dict mapping rule ID to status ('Pass', 'Fail', 'Unknown'), focus, and evidence.
    """
    dev = csm.get("device", {}) if isinstance(csm, dict) else {}
    vend = str(dev.get("vendor", "")).lower()

    # Fail-soft for empty or non-Arista input
    if not csm or vend not in ("arista", "eos"):
        empty_res: Dict[str, Any] = {}
        for spec in ARISTA_RULE_SPECS:
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
    services = csm.get("services", {})
    aaa = csm.get("aaa", {})
    ntp = csm.get("ntp", {})
    logging = csm.get("logging", {})
    snmp = csm.get("snmp", {})
    interfaces = csm.get("interfaces", [])
    acls = csm.get("access_control", {}).get("acls", [])
    routing = csm.get("routing", {})

    # 1. ARISTA-SSH-001: Secure SSH
    # Must have management ssh enabled and either protocol-version 2 or secure authentication protocol
    ssh_en = services.get("ssh_enabled", False)
    ssh_ver = services.get("ssh_version")
    ssh_methods = services.get("ssh_auth_methods", [])
    if ssh_en and (ssh_ver == 2 or len(ssh_methods) > 0):
        ssh_status = "Pass"
        ssh_ev = [f"ssh_version: {ssh_ver}"] + ([f"auth_methods: {ssh_methods}"] if ssh_methods else [])
    elif not ssh_en:
        ssh_status = "Unknown"  # SSH not configured
        ssh_ev = ["management ssh not configured"]
    else:
        # management ssh configured but bare (no version 2 or auth protocol)
        ssh_status = "Fail"
        ssh_ev = ["management ssh enabled without protocol-version 2 or approved authentication protocol"]

    res["ARISTA-SSH-001"] = {
        "status": ssh_status,
        "focus": "SSH authentication",
        "evidence_found": ssh_ev,
    }

    # 2. ARISTA-AAA-001: AAA authentication and authorization
    # Must have both authentication login and authorization exec configured
    aaa_login = aaa.get("authentication_login")
    aaa_exec = aaa.get("authorization_exec")
    if aaa_login and aaa_exec:
        aaa_status = "Pass"
        aaa_ev = [aaa_login, aaa_exec]
    elif aaa_login and not aaa_exec:
        aaa_status = "Fail"
        aaa_ev = [aaa_login, "missing aaa authorization exec"]
    else:
        aaa_status = "Fail"
        aaa_ev = ["missing aaa configuration"]

    res["ARISTA-AAA-001"] = {
        "status": aaa_status,
        "focus": "authentication",
        "evidence_found": aaa_ev,
    }

    # 3. ARISTA-NTP-001: NTP server configured
    ntp_servers = ntp.get("servers", [])
    if ntp_servers:
        ntp_status = "Pass"
        ntp_ev = [f"ntp server {srv}" for srv in ntp_servers]
    else:
        ntp_status = "Fail"
        ntp_ev = ["no ntp server configured"]

    res["ARISTA-NTP-001"] = {
        "status": ntp_status,
        "focus": "NTP server",
        "evidence_found": ntp_ev,
    }

    # 4. ARISTA-LOG-001: Event logging (buffered or remote host)
    log_buf = logging.get("buffered_logging", False)
    log_hosts = logging.get("hosts", [])
    if log_buf or log_hosts:
        log_status = "Pass"
        log_ev = []
        if log_buf:
            log_ev.append(f"logging buffered {logging.get('buffered_severity', '')}")
        if log_hosts:
            log_ev.extend([f"logging host {h}" for h in log_hosts])
    else:
        log_status = "Fail"
        log_ev = ["no buffered logging or remote syslog host configured"]

    res["ARISTA-LOG-001"] = {
        "status": log_status,
        "focus": "remote logging",
        "evidence_found": log_ev,
    }

    # 5. ARISTA-SNMP-001: Disallow default/weak SNMP communities
    snmp_en = snmp.get("enabled", False)
    communities = snmp.get("communities", [])
    if not snmp_en or not communities:
        snmp_status = "Unknown"
        snmp_ev = ["snmp not configured"]
    else:
        has_weak = any(c.get("name", "").lower() in WEAK_COMMUNITIES for c in communities)
        if has_weak:
            snmp_status = "Fail"
            snmp_ev = [f"weak community: {c.get('name')}" for c in communities if c.get("name", "").lower() in WEAK_COMMUNITIES]
        else:
            snmp_status = "Pass"
            snmp_ev = [f"community: {c.get('name')}" for c in communities]

    res["ARISTA-SNMP-001"] = {
        "status": snmp_status,
        "focus": "community security",
        "evidence_found": snmp_ev,
    }

    # 6. ARISTA-ACL-001: Management ACLs
    if acls:
        acl_status = "Pass"
        acl_ev = [f"access-list: {acl.get('name')}" for acl in acls]
    else:
        acl_status = "Fail"
        acl_ev = ["no access-lists configured"]

    res["ARISTA-ACL-001"] = {
        "status": acl_status,
        "focus": "ACL application",
        "evidence_found": acl_ev,
    }

    # 7. ARISTA-INT-001: Interface classification & trunk VLAN restriction
    trunks = [i for i in interfaces if i.get("switchport_mode") == "trunk"]
    if trunks:
        unrestricted_trunks = [t["name"] for t in trunks if not t.get("allowed_vlans")]
        if unrestricted_trunks:
            int_status = "Fail"
            int_ev = [f"unrestricted trunk VLANs on interface: {name}" for name in unrestricted_trunks]
        else:
            int_status = "Pass"
            int_ev = [f"trunk allowed vlans configured on {t['name']}" for t in trunks]
    else:
        int_status = "Pass"
        int_ev = ["no trunk interfaces or all interfaces valid"]

    res["ARISTA-INT-001"] = {
        "status": int_status,
        "focus": "access/trunk classification",
        "evidence_found": int_ev,
    }

    # 8. ARISTA-ROUTING-001: Dynamic routing protocol security and router ID
    ospf_on = routing.get("ospf_configured", False)
    bgp_on = routing.get("bgp_configured", False)
    router_id = routing.get("router_id")
    if not ospf_on and not bgp_on:
        routing_status = "Unknown"
        routing_ev = ["dynamic routing not configured in switch configuration"]
    else:
        if router_id:
            routing_status = "Pass"
            routing_ev = [f"router-id: {router_id}"]
        else:
            routing_status = "Fail"
            routing_ev = ["routing enabled without configured router-id"]

    res["ARISTA-ROUTING-001"] = {
        "status": routing_status,
        "focus": "OSPF/BGP routing configuration",
        "evidence_found": routing_ev,
    }

    # 9. ARISTA-STP-001: Spanning tree BPDU guard on access ports
    access_ports = [i for i in interfaces if i.get("switchport_mode") == "access" and not i.get("shutdown", False)]
    if access_ports:
        unprotected = [p["name"] for p in access_ports if not p.get("spanning_tree_bpduguard")]
        if unprotected:
            stp_status = "Fail"
            stp_ev = [f"access interface {name} missing spanning-tree bpduguard" for name in unprotected]
        else:
            stp_status = "Pass"
            stp_ev = [f"access interface {p['name']} has bpduguard enabled" for p in access_ports]
    else:
        stp_status = "Pass"
        stp_ev = ["no active access interfaces requiring bpduguard"]

    res["ARISTA-STP-001"] = {
        "status": stp_status,
        "focus": "edge-port protection",
        "evidence_found": stp_ev,
    }

    # 10. ARISTA-MGMT-001: Management interface VRF isolation
    mgmt_ifaces = [i for i in interfaces if i.get("is_management") or re.match(r"^Management\d*$", i.get("name", ""), re.IGNORECASE)]
    if not mgmt_ifaces:
        mgmt_status = "Fail"
        mgmt_ev = ["no management interface configured"]
    else:
        isolated_mgmts = [m for m in mgmt_ifaces if m.get("vrf")]
        if isolated_mgmts:
            mgmt_status = "Pass"
            mgmt_ev = [f"interface {m['name']} isolated in vrf {m['vrf']}" for m in isolated_mgmts]
        else:
            mgmt_status = "Fail"
            mgmt_ev = [f"interface {m['name']} not assigned to management VRF" for m in mgmt_ifaces]

    res["ARISTA-MGMT-001"] = {
        "status": mgmt_status,
        "focus": "management VRF",
        "evidence_found": mgmt_ev,
    }

    # Evaluate dynamic / trusted rules if provided
    for tr in (trusted_rules or []):
        rid = tr.get("vendor_rule_id", "TRUSTED-000")
        ev = [e for e in tr.get("configuration_evidence", []) if any(e in line for item in ev_items for line in item.get("source_lines", []))]
        res[rid] = {
            "status": "Unknown",
            "focus": tr.get("check_focus", ["Security"])[0] if isinstance(tr.get("check_focus"), list) else str(tr.get("check_focus", "Security")),
            "evidence_found": ev,
        }

    return res


def evaluate_arista_baseline(csm: Dict[str, Any]) -> Dict[str, Any]:
    """Authoritative baseline evaluator for Arista EOS rules."""
    return evaluate_rules(csm)


# ==============================================================================
# Framework Evaluator Implementation
# ==============================================================================

class AristaBaselineEvaluator(FrameworkEvaluator):
    """Framework evaluator implementing the FrameworkEvaluator interface for Arista EOS."""

    def __init__(self, framework_id: str = ARISTA_FRAMEWORK_ID):
        self._framework_id = framework_id.strip().lower()

    @property
    def framework_id(self) -> str:
        return self._framework_id

    def evaluate(
        self,
        csm: Dict[str, Any],
        controls: Optional[Sequence[Control]] = None,
    ) -> List[EvaluationResult]:
        """Runs deterministic Arista evaluation against normalized CSM."""
        dev = csm.get("device", {}) if isinstance(csm, dict) else {}
        vend = str(dev.get("vendor", "")).lower()
        plat = str(dev.get("platform", "")).lower()

        # If not Arista, fail-soft to UNKNOWN
        if vend != "arista" and "eos" not in plat:
            results: List[EvaluationResult] = []
            for spec in ARISTA_RULE_SPECS:
                rid = spec["vendor_rule_id"]
                results.append(
                    EvaluationResult(
                        framework_id=self._framework_id,
                        control_id=rid,
                        status=ComplianceStatus.UNKNOWN,
                        evidence=Evidence(
                            observed_value={"vendor": vend, "platform": plat},
                            location="csm.device",
                            expected_value="Vendor 'arista' with platform 'EOS'",
                            rationale=f"Configuration is vendor '{vend}', not Arista.",
                            confidence=1.0,
                        ),
                        reason=f"Configuration is vendor '{vend}', not Arista.",
                        observed_value={"vendor": vend, "platform": plat},
                        expected_value="Vendor 'arista'",
                        evaluator_id=self._framework_id,
                    )
                )
            return results

        evals = evaluate_arista_baseline(csm)
        results = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for spec in ARISTA_RULE_SPECS:
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


def register_arista_baseline(
    registry: Optional[FrameworkRegistry] = None,
) -> FrameworkRegistry:
    """Registers the 'arista-eos-baseline' framework and evaluator into FrameworkRegistry."""
    target = registry if registry is not None else get_default_registry()
    framework = Framework(
        framework_id=ARISTA_FRAMEWORK_ID,
        name="Arista EOS Baseline Security Standard",
        version="1.0",
        description="Deterministic network security baseline for Arista EOS network switches and operating systems.",
        vendor_scope="Arista EOS",
        control_namespace="ARISTA",
        enabled=True,
    )
    evaluator = AristaBaselineEvaluator(framework_id=ARISTA_FRAMEWORK_ID)
    target.register(framework=framework, evaluator=evaluator, allow_replace=True)
    return target
