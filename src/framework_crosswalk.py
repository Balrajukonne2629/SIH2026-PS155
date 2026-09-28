"""NTRO PS26155 — Vendor-Neutral Framework Crosswalk Evaluator (Phase 3A.5 / Step 3).

Implements generic deterministic crosswalk evaluation mapping authoritative vendor-neutral
compliance frameworks (NIST SP 800-53 rev5 and ISO/IEC 27001:2022 Annex A) to underlying
vendor baseline rules (Cisco IOS-XE and Juniper Junos).

Architectural Invariants & Hard Guarantees:
- Single generic CrosswalkEvaluator parameterized by framework_id.
- Reuses existing rule checks without duplicating evaluation logic.
- Purely deterministic: identical CSM inputs yield identical EvaluationResult outputs.
- Roll-up logic:
    ANY rule fails -> control FAILS
    NO rule fails, ANY rule unknown -> control UNKNOWN
    ALL mapped rules pass -> control PASSES
    NO mapped rules -> control UNKNOWN ("not assessed: no vendor rules mapped to this control")
- Zero AI / LLM calls: No Ollama, AIModelManager, or remote dependencies.
- Zero execution paths: No subprocess, sockets, netmiko, napalm, or paramiko.
- Vendor-neutral: Registered with vendor_scope=None so all vendors can be assessed.
"""

from typing import Any, Dict, List, Optional, Sequence
import pathlib

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

# Baseline rule IDs for Cisco
CISCO_BASELINE_RULE_IDS = [
    "CISCO-SSH-001",
    "CISCO-AAA-001",
    "CISCO-NTP-001",
    "CISCO-LOG-001",
    "CISCO-SNMP-001",
    "CISCO-ACL-001",
    "CISCO-INT-001",
    "CISCO-ROUTING-001",
    "CISCO-STP-001",
    "CISCO-MGMT-001",
]


def detect_vendor(csm: Dict[str, Any]) -> str:
    """Detects vendor type ('cisco' or 'juniper') from normalized CSM device info."""
    dev = csm.get("device", {}) if isinstance(csm, dict) else {}
    plat = str(dev.get("platform", "")).lower()
    vend = str(dev.get("vendor", "")).lower()
    comb = f"{plat} {vend}"
    if "juniper" in comb or "junos" in comb:
        return "juniper"
    return "cisco"


class CrosswalkEvaluator(FrameworkEvaluator):
    """Single generic, deterministic crosswalk evaluator for vendor-neutral frameworks."""

    def __init__(
        self,
        framework_id: str,
        controls: Dict[str, Control],
        vendor_rule_mappings: Dict[str, Dict[str, List[str]]],
    ):
        """Initializes the crosswalk evaluator.

        Args:
            framework_id: Unique framework identifier (e.g. 'nist-sp-800-53-rev5').
            controls: Dict mapping control_id to Control instance.
            vendor_rule_mappings: Mapping of vendor ('cisco', 'juniper') -> {control_id: [rule_ids]}.
        """
        self._framework_id = framework_id.strip().lower()
        self._controls = controls
        self._vendor_rule_mappings = vendor_rule_mappings

    @property
    def framework_id(self) -> str:
        return self._framework_id

    def evaluate(
        self,
        csm: Dict[str, Any],
        controls: Optional[Sequence[Control]] = None,
    ) -> List[EvaluationResult]:
        """Evaluates normalized CSM data against applicable framework controls.

        Consumes already-implemented vendor baseline evaluation engines without duplicating logic.
        """
        vendor_key = detect_vendor(csm)

        # Run authoritative baseline evaluation for detected vendor
        if vendor_key == "juniper":
            from src.juniper_auditor import evaluate_juniper_baseline, parse_juniper
            full_csm = parse_juniper("")
            for k, v in (csm or {}).items():
                if isinstance(v, dict) and isinstance(full_csm.get(k), dict):
                    full_csm[k].update(v)
                else:
                    full_csm[k] = v
            baseline_results = evaluate_juniper_baseline(full_csm)
        else:
            from src.cisco_auditor import evaluate_rules, parse_cisco
            full_csm = parse_cisco("")
            for k, v in (csm or {}).items():
                if isinstance(v, dict) and isinstance(full_csm.get(k), dict):
                    full_csm[k].update(v)
                else:
                    full_csm[k] = v
            cisco_rules = [{"vendor_rule_id": rid} for rid in CISCO_BASELINE_RULE_IDS]
            baseline_results = evaluate_rules(full_csm, cisco_rules)

        target_controls = controls if controls is not None else list(self._controls.values())
        # Deterministic sorting by control_id
        sorted_controls = sorted(target_controls, key=lambda c: c.control_id)

        mappings_for_vendor = self._vendor_rule_mappings.get(vendor_key, {})
        results: List[EvaluationResult] = []

        for ctrl in sorted_controls:
            mapped_rules = mappings_for_vendor.get(ctrl.control_id, [])

            if not mapped_rules:
                # Unmapped control requirement: NOT_ASSESSED ("not assessed: no vendor rules mapped to this control")
                res = EvaluationResult(
                    framework_id=self._framework_id,
                    control_id=ctrl.control_id,
                    status=ComplianceStatus.NOT_ASSESSED,
                    evidence=Evidence(
                        observed_value={"vendor": vendor_key, "mapped_rules": []},
                        location="csm",
                        expected_value=f"Mapped {vendor_key} baseline rules for control {ctrl.control_id}",
                        rationale="not assessed: no vendor rules mapped to this control",
                        confidence=1.0,
                    ),
                    reason="not assessed: no vendor rules mapped to this control",
                    observed_value={"vendor": vendor_key, "mapped_rules": []},
                    expected_value=f"Mapped {vendor_key} baseline rules for control {ctrl.control_id}",
                    evaluator_id=f"crosswalk_{self._framework_id}",
                )
                results.append(res)
                continue

            rule_statuses: List[str] = []
            rule_details: Dict[str, str] = {}
            evidence_lines: List[str] = []

            for rid in mapped_rules:
                b_eval = baseline_results.get(rid, {})
                st = b_eval.get("status", "Unknown")
                rule_statuses.append(st)
                rule_details[rid] = st
                if "evidence_found" in b_eval and isinstance(b_eval["evidence_found"], list):
                    evidence_lines.extend(b_eval["evidence_found"])
                elif "evidence" in b_eval and isinstance(b_eval["evidence"], list):
                    evidence_lines.extend(b_eval["evidence"])

            # Roll-up logic:
            # ANY rule fails -> control FAILS
            # NO rule fails, ANY rule unknown -> control UNKNOWN
            # ALL mapped rules pass -> control PASSES
            if any(s == "Fail" for s in rule_statuses):
                status = ComplianceStatus.FAIL
                failed = [rid for rid, s in rule_details.items() if s == "Fail"]
                reason = f"Control fails because mapped rule(s) failed: {', '.join(failed)}"
                rationale = f"Failure rolled up from baseline rules: {rule_details}"
            elif any(s == "Unknown" for s in rule_statuses):
                status = ComplianceStatus.UNKNOWN
                unknowns = [rid for rid, s in rule_details.items() if s == "Unknown"]
                reason = f"Control unknown because mapped rule(s) unknown: {', '.join(unknowns)}"
                rationale = f"Unknown verdict rolled up from baseline rules: {rule_details}"
            else:
                status = ComplianceStatus.PASS
                reason = f"All mapped baseline rules passed: {', '.join(mapped_rules)}"
                rationale = f"Full compliance rolled up from baseline rules: {rule_details}"

            observed = {"vendor": vendor_key, "rule_verdicts": rule_details}
            expected = f"All mapped rules pass for control {ctrl.control_id}"

            res = EvaluationResult(
                framework_id=self._framework_id,
                control_id=ctrl.control_id,
                status=status,
                evidence=Evidence(
                    observed_value=observed,
                    location=f"csm (vendor={vendor_key})",
                    expected_value=expected,
                    rationale=rationale,
                    confidence=1.0,
                    source_lines=tuple(evidence_lines[:20]),
                ),
                reason=reason,
                observed_value=observed,
                expected_value=expected,
                evaluator_id=f"crosswalk_{self._framework_id}",
            )
            results.append(res)

        return results


# --- Framework Definitions ---

NIST_SP_800_53_REV5_FRAMEWORK_ID = "nist-sp-800-53-rev5"
NIST_SP_800_53_REV5_FRAMEWORK = Framework(
    framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
    name="NIST SP 800-53 Revision 5",
    version="rev5",
    description="NIST Security and Privacy Controls for Information Systems and Organizations",
    vendor_scope=None,  # Vendor-neutral / Universal
    control_namespace="NIST",
    enabled=True,
)

ISO_IEC_27001_2022_FRAMEWORK_ID = "iso-iec-27001-2022"
ISO_IEC_27001_2022_FRAMEWORK = Framework(
    framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
    name="ISO/IEC 27001:2022 Annex A",
    version="2022",
    description="Information security, cybersecurity and privacy protection — Information security management systems",
    vendor_scope=None,  # Vendor-neutral / Universal
    control_namespace="ISO",
    enabled=True,
)


# --- Control Catalogs & Mappings ---

NIST_CONTROLS: Dict[str, Control] = {
    "MA-4 (6)": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="MA-4 (6)",
        title="Nonlocal Maintenance | Inspection of Tools",
        description="Verify and control nonlocal remote maintenance and administrative access.",
        severity="high",
        expected_state="Secure remote management with SSH version 2 and connection limits",
    ),
    "CM-6 (1)": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="CM-6 (1)",
        title="Configuration Settings | Automated Verification",
        description="Mandate and verify mandatory security configuration baseline settings and password policies.",
        severity="medium",
        expected_state="Centralized AAA authentication or strict password complexity enforced",
    ),
    "IA-3 (1)": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="IA-3 (1)",
        title="Device Identification and Authentication | Cryptographic Bidirectional Authentication",
        description="Authenticate network devices and management services cryptographically.",
        severity="high",
        expected_state="Cryptographically authenticated NTP and secure SNMP monitoring",
    ),
    "AU-4 (1)": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="AU-4 (1)",
        title="Audit Storage Capacity | Transfer to Alternate Storage",
        description="Offload audit logs and timestamps reliably to external syslog repositories.",
        severity="medium",
        expected_state="Remote syslog server configured with millisecond timestamps enabled",
    ),
    "AC-4": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="AC-4",
        title="Information Flow Enforcement",
        description="Control information flows using access control lists, unused interface shutdown, and VRF segmentation.",
        severity="high",
        expected_state="Management ACL configured and unassigned interfaces administratively shutdown",
    ),
    "IA-7": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="IA-7",
        title="Cryptographic Module Authentication",
        description="Enforce authentication and integrity protections across routing protocols and control plane.",
        severity="medium",
        expected_state="BGP/OSPF peer authentication or secure control-plane credentials configured",
    ),
    "SC-5 a": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="SC-5 a",
        title="Denial of Service Protection",
        description="Protect network infrastructure against denial of service via Layer 2 loop/BPDU guards and filters.",
        severity="medium",
        expected_state="Spanning-Tree BPDU Guard or control plane filter protection active",
    ),
    "AC-2": Control(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        control_id="AC-2",
        title="Account Management",
        description="Manage information system accounts and role assignments.",
        severity="medium",
        expected_state="Automated account lifecycle management",
    ),
}

NIST_VENDOR_RULE_MAPPINGS: Dict[str, Dict[str, List[str]]] = {
    "cisco": {
        "MA-4 (6)": ["CISCO-SSH-001"],
        "CM-6 (1)": ["CISCO-AAA-001"],
        "IA-3 (1)": ["CISCO-NTP-001", "CISCO-SNMP-001"],
        "AU-4 (1)": ["CISCO-LOG-001"],
        "AC-4": ["CISCO-ACL-001", "CISCO-INT-001", "CISCO-MGMT-001"],
        "IA-7": ["CISCO-ROUTING-001"],
        "SC-5 a": ["CISCO-STP-001"],
        # AC-2 intentionally unmapped
    },
    "juniper": {
        "MA-4 (6)": ["JUNOS-SSH-001", "JUNOS-SSH-002", "JUNOS-SSH-003"],
        "CM-6 (1)": ["JUNOS-AAA-002"],
        "IA-3 (1)": ["JUNOS-AAA-001", "JUNOS-SNMP-001"],
        "AU-4 (1)": ["JUNOS-LOG-001", "JUNOS-NTP-001"],
        "AC-4": ["JUNOS-ACL-001", "JUNOS-MGMT-001"],
        "IA-7": ["JUNOS-SSH-001"],
        "SC-5 a": ["JUNOS-ACL-001"],
        # AC-2 intentionally unmapped
    },
}


ISO_CONTROLS: Dict[str, Control] = {
    "A.5.15": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.5.15",
        title="Access Control",
        description="Rules to control physical and logical access to information and other associated assets.",
        severity="high",
        expected_state="Enforce centralized AAA authentication and management access control lists",
    ),
    "A.8.15": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.15",
        title="Logging",
        description="Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.",
        severity="medium",
        expected_state="Remote syslog transmission and millisecond logging timestamps active",
    ),
    "A.8.17": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.17",
        title="Clock Synchronization",
        description="The clocks of information processing systems shall be synchronized to approved time sources.",
        severity="medium",
        expected_state="Authenticated NTP synchronization with approved time servers",
    ),
    "A.8.20": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.20",
        title="Network Security",
        description="Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.",
        severity="high",
        expected_state="Secure encrypted transport (SSHv2), SNMP access hardening, routing authentication",
    ),
    "A.8.22": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.22",
        title="Segregation of Networks",
        description="Groups of information services, users and information systems shall be segregated on networks.",
        severity="high",
        expected_state="Management VRF isolation and unused interface shutdown",
    ),
    "A.8.24": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.24",
        title="Use of Cryptography",
        description="Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.",
        severity="high",
        expected_state="SSH version 2 cryptography and authenticated NTP key usage",
    ),
    "A.8.26": Control(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        control_id="A.8.26",
        title="Application Security Requirements",
        description="Information security requirements shall be identified, specified and approved when developing or acquiring applications.",
        severity="medium",
        expected_state="Application level security verification",
    ),
}

ISO_VENDOR_RULE_MAPPINGS: Dict[str, Dict[str, List[str]]] = {
    "cisco": {
        "A.5.15": ["CISCO-AAA-001", "CISCO-ACL-001"],
        "A.8.15": ["CISCO-LOG-001"],
        "A.8.17": ["CISCO-NTP-001"],
        "A.8.20": ["CISCO-SSH-001", "CISCO-SNMP-001", "CISCO-ROUTING-001", "CISCO-STP-001"],
        "A.8.22": ["CISCO-MGMT-001", "CISCO-INT-001"],
        "A.8.24": ["CISCO-SSH-001", "CISCO-NTP-001"],
        # A.8.26 intentionally unmapped
    },
    "juniper": {
        "A.5.15": ["JUNOS-AAA-001", "JUNOS-AAA-002", "JUNOS-ACL-001"],
        "A.8.15": ["JUNOS-LOG-001"],
        "A.8.17": ["JUNOS-NTP-001"],
        "A.8.20": ["JUNOS-SSH-001", "JUNOS-SSH-002", "JUNOS-SSH-003", "JUNOS-SNMP-001"],
        "A.8.22": ["JUNOS-MGMT-001"],
        "A.8.24": ["JUNOS-SSH-001", "JUNOS-NTP-001"],
        # A.8.26 intentionally unmapped
    },
}


def create_nist_crosswalk_evaluator() -> CrosswalkEvaluator:
    """Factory creating the NIST SP 800-53 rev5 CrosswalkEvaluator."""
    return CrosswalkEvaluator(
        framework_id=NIST_SP_800_53_REV5_FRAMEWORK_ID,
        controls=NIST_CONTROLS,
        vendor_rule_mappings=NIST_VENDOR_RULE_MAPPINGS,
    )


def create_iso_crosswalk_evaluator() -> CrosswalkEvaluator:
    """Factory creating the ISO/IEC 27001:2022 CrosswalkEvaluator."""
    return CrosswalkEvaluator(
        framework_id=ISO_IEC_27001_2022_FRAMEWORK_ID,
        controls=ISO_CONTROLS,
        vendor_rule_mappings=ISO_VENDOR_RULE_MAPPINGS,
    )


def register_crosswalk_frameworks(registry: Optional[FrameworkRegistry] = None) -> FrameworkRegistry:
    """Registers NIST SP 800-53 rev5 and ISO/IEC 27001:2022 in FrameworkRegistry."""
    target = registry if registry is not None else get_default_registry()
    target.register(
        NIST_SP_800_53_REV5_FRAMEWORK,
        create_nist_crosswalk_evaluator(),
        allow_replace=True,
    )
    target.register(
        ISO_IEC_27001_2022_FRAMEWORK,
        create_iso_crosswalk_evaluator(),
        allow_replace=True,
    )
    return target
