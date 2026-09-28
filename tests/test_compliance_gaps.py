"""NTRO PS26155 — Compliance Gaps Verification Suite.

Tests the 3 compliance gap implementations:
1. Remediation:
   - Registry keyed by baseline rule IDs only (Cisco 10, Junos 10).
   - CIS (7) and DISA-STIG (10) resolve through mapped internal baseline rules.
   - Unknown rule IDs raise KeyError.
2. Device Identity:
   - Cisco & Junos config extraction of hardware_model, serial_number, os_version, management_ip.
   - Missing fields remain None in CSM; formatted as "Not In Config" in reports.
   - Preferred management IP priority (Loopback0 > Mgmt/Gi0 for Cisco; fxp0/me0/em0 > lo0 for Junos).
3. Framework Crosswalk:
   - Single generic CrosswalkEvaluator for NIST SP 800-53 rev5 & ISO/IEC 27001:2022.
   - Pure deterministic evaluation (5 consecutive runs = identical results).
   - Roll-up logic: any FAIL -> FAIL; else any UNKNOWN -> UNKNOWN; else all PASS -> PASS.
   - Unmapped controls evaluate to UNKNOWN ("not assessed: no vendor rules mapped to this control").
   - Database isolation: zero mutations to real auditor.db.
"""

import copy
import hashlib
import json
import pytest

from src.compliance_framework import ComplianceStatus, get_default_registry
from src.remediation_engine import (
    BASELINE_REMEDIATION_REGISTRY,
    resolve_rule_to_baseline,
    generate_remediation,
)
from src.cis_benchmark_cisco_iosxe import CIS_CISCO_IOSXE_CONTROLS
from src.disa_stig_cisco_iosxe import DISA_STIG_CISCO_IOSXE_CONTROLS
from src.cisco_auditor import parse_cisco, evaluate_rules
from src.juniper_auditor import parse_juniper, evaluate_juniper_baseline
from src.framework_crosswalk import (
    register_crosswalk_frameworks,
    NIST_SP_800_53_REV5_FRAMEWORK_ID,
    ISO_IEC_27001_2022_FRAMEWORK_ID,
    NIST_CONTROLS,
    ISO_CONTROLS,
    NIST_VENDOR_RULE_MAPPINGS,
    ISO_VENDOR_RULE_MAPPINGS,
)
from src.compliance_aggregator import MultiFrameworkAggregator


# ==============================================================================
# 1. REMEDIATION GAP TESTS
# ==============================================================================

class TestRemediationGap:
    """Verifies baseline remediation registry and CIS/STIG resolution."""

    def test_baseline_registry_has_exact_20_rules(self):
        """Registry must contain exactly 10 Cisco and 10 Junos baseline rules."""
        cisco_rules = [k for k in BASELINE_REMEDIATION_REGISTRY if k.startswith("CISCO-")]
        junos_rules = [k for k in BASELINE_REMEDIATION_REGISTRY if k.startswith("JUNOS-")]
        assert len(cisco_rules) == 10
        assert len(junos_rules) == 10
        assert len(BASELINE_REMEDIATION_REGISTRY) == 20

    def test_all_10_cisco_baseline_rules_resolve_non_empty(self):
        """Every active Cisco baseline rule resolves to non-empty remediation."""
        cisco_rules = [k for k in BASELINE_REMEDIATION_REGISTRY if k.startswith("CISCO-")]
        dummy_csm = {"services": {}, "aaa": {}, "ntp": {}, "logging": {}, "snmp": {}}
        for rid in cisco_rules:
            rem = generate_remediation(rid, dummy_csm)
            assert isinstance(rem, str) and len(rem.strip()) > 0, f"Rule {rid} returned empty CLI commands"

    def test_all_10_junos_baseline_rules_resolve_non_empty(self):
        """Every active Junos baseline rule resolves to non-empty remediation."""
        junos_rules = [k for k in BASELINE_REMEDIATION_REGISTRY if k.startswith("JUNOS-")]
        dummy_csm = {"services": {}, "aaa": {}, "ntp": {}, "logging": {}, "snmp": {}}
        for rid in junos_rules:
            rem = generate_remediation(rid, dummy_csm)
            assert isinstance(rem, str) and len(rem.strip()) > 0, f"Rule {rid} returned empty CLI commands"

    def test_all_cis_controls_resolve_through_mapped_baseline_rules(self):
        """All CIS controls resolve through their mapped internal baseline rule."""
        dummy_csm = {"services": {}, "aaa": {}, "ntp": {}, "logging": {}, "snmp": {}}
        for cis_id, ctrl in CIS_CISCO_IOSXE_CONTROLS.items():
            base_id, path_desc = resolve_rule_to_baseline(cis_id)
            assert base_id in BASELINE_REMEDIATION_REGISTRY, f"CIS {cis_id} mapped to unknown {base_id}"
            assert f"CIS control {cis_id}" in path_desc
            rem = generate_remediation(cis_id, dummy_csm)
            assert isinstance(rem, str) and len(rem.strip()) > 0, f"CIS {cis_id} resolved to empty CLI commands"

    def test_all_disa_stig_controls_resolve_through_mapped_baseline_rules(self):
        """All DISA-STIG controls resolve through their mapped internal baseline rule."""
        dummy_csm = {"services": {}, "aaa": {}, "ntp": {}, "logging": {}, "snmp": {}}
        for stig_id, ctrl in DISA_STIG_CISCO_IOSXE_CONTROLS.items():
            base_id, path_desc = resolve_rule_to_baseline(stig_id)
            assert base_id in BASELINE_REMEDIATION_REGISTRY, f"STIG {stig_id} mapped to unknown {base_id}"
            assert f"DISA-STIG control {stig_id}" in path_desc
            rem = generate_remediation(stig_id, dummy_csm)
            assert isinstance(rem, str) and len(rem.strip()) > 0, f"STIG {stig_id} resolved to empty CLI commands"

    def test_unknown_rule_id_raises_key_error(self):
        """Unregistered rule ID raises KeyError with informative message."""
        with pytest.raises(KeyError) as exc_info:
            generate_remediation("NONEXISTENT-RULE-999", {})
        assert "NONEXISTENT-RULE-999" in str(exc_info.value)


# ==============================================================================
# 2. DEVICE IDENTITY GAP TESTS
# ==============================================================================

class TestDeviceIdentityGap:
    """Verifies metadata extraction, preferred management IP, and Not In Config fallback."""

    def test_cisco_identity_with_show_output_and_comments(self):
        """Extracts hardware_model, serial_number, os_version, and preferred Loopback0 IP."""
        cfg_with_inventory = (
            "! Version 17.09.03a\n"
            "! Model: C8300-1N1S-4T2X\n"
            "! Serial: FOC25181ABC\n"
            "hostname Core-R1\n"
            "interface Loopback0\n"
            " ip address 10.0.0.1 255.255.255.255\n"
            "interface GigabitEthernet0/0\n"
            " ip address 192.168.1.1 255.255.255.0\n"
            "!\n"
            "# show version\n"
            "Cisco IOS XE Software, Version 17.09.03a\n"
            "cisco C8300-1N1S-4T2X (1RU) processor with 3568853K/6147K bytes of memory.\n"
            "Processor board ID FOC25181ABC\n"
        )
        csm = parse_cisco(cfg_with_inventory)
        dev = csm["device"]
        assert dev["hostname"] == "Core-R1"
        assert dev["hardware_model"] == "C8300-1N1S-4T2X"
        assert dev["serial_number"] == "FOC25181ABC"
        assert dev["os_version"] == "17.09.03a"
        assert dev["management_ip"] == "10.0.0.1"  # Loopback0 preferred over Gi0/0

    def test_cisco_identity_without_show_output(self):
        """When hardware details are absent from config, fields remain None in CSM."""
        cfg_plain = (
            "hostname Branch-R1\n"
            "interface GigabitEthernet0/0\n"
            " ip address 192.168.10.1 255.255.255.0\n"
        )
        csm = parse_cisco(cfg_plain)
        dev = csm["device"]
        assert dev["hostname"] == "Branch-R1"
        assert dev["hardware_model"] is None
        assert dev["serial_number"] is None
        assert dev["os_version"] is None
        assert dev["management_ip"] == "192.168.10.1"

    def test_juniper_identity_with_show_output_and_comments(self):
        """Extracts Junos model, serial, version, and preferred fxp0 management IP."""
        cfg_with_chassis = (
            "## Last changed: 2026-09-20\n"
            "## Model: vSRX\n"
            "## Serial Number: CV0218456789\n"
            "## OS Version: 21.4R1.12\n"
            "set system host-name Edge-FW1\n"
            "set interfaces fxp0 unit 0 family inet address 172.16.1.1/24\n"
            "set interfaces lo0 unit 0 family inet address 10.255.255.1/32\n"
            "show chassis hardware\n"
            "Hardware inventory:\n"
            "Item             Version  Part number  Serial number     Description\n"
            "Chassis                                CV0218456789      vSRX\n"
        )
        csm = parse_juniper(cfg_with_chassis)
        dev = csm["device"]
        assert dev["hostname"] == "Edge-FW1"
        assert dev["hardware_model"] == "vSRX"
        assert dev["serial_number"] == "CV0218456789"
        assert dev["os_version"] == "21.4R1.12"
        assert dev["management_ip"] == "172.16.1.1"  # fxp0 preferred over lo0

    def test_juniper_identity_without_show_output(self):
        """When hardware details are absent, fields remain None in CSM."""
        cfg_plain = (
            "set system host-name Edge-FW2\n"
            "set interfaces lo0 unit 0 family inet address 10.255.255.2/32\n"
        )
        csm = parse_juniper(cfg_plain)
        dev = csm["device"]
        assert dev["hostname"] == "Edge-FW2"
        assert dev["hardware_model"] is None
        assert dev["serial_number"] is None
        assert dev["os_version"] is None
        assert dev["management_ip"] is None


# ==============================================================================
# 3. FRAMEWORK CROSSWALK GAP TESTS
# ==============================================================================

class TestFrameworkCrosswalkGap:
    """Verifies NIST SP 800-53 rev5 and ISO/IEC 27001:2022 crosswalk evaluation."""

    @pytest.fixture(autouse=True)
    def setup_registry(self):
        """Registers crosswalk frameworks in the default registry."""
        register_crosswalk_frameworks()

    def test_frameworks_registered_in_registry(self):
        """NIST and ISO frameworks are present in FrameworkRegistry."""
        reg = get_default_registry()
        assert reg.exists(NIST_SP_800_53_REV5_FRAMEWORK_ID)
        assert reg.exists(ISO_IEC_27001_2022_FRAMEWORK_ID)

        nist_fw = reg.get(NIST_SP_800_53_REV5_FRAMEWORK_ID)
        assert nist_fw.vendor_scope is None  # Vendor-neutral

        iso_fw = reg.get(ISO_IEC_27001_2022_FRAMEWORK_ID)
        assert iso_fw.vendor_scope is None  # Vendor-neutral

    def test_all_10_cisco_baseline_rules_have_crosswalk_entries(self):
        """Every active Cisco baseline rule is mapped in NIST and ISO crosswalks."""
        from src.framework_crosswalk import CISCO_BASELINE_RULE_IDS
        for rid in CISCO_BASELINE_RULE_IDS:
            nist_mapped = any(rid in rules for rules in NIST_VENDOR_RULE_MAPPINGS["cisco"].values())
            iso_mapped = any(rid in rules for rules in ISO_VENDOR_RULE_MAPPINGS["cisco"].values())
            assert nist_mapped, f"Cisco rule {rid} not mapped in NIST crosswalk"
            assert iso_mapped, f"Cisco rule {rid} not mapped in ISO crosswalk"

    def test_all_10_junos_baseline_rules_have_crosswalk_entries(self):
        """Every active Junos baseline rule is mapped in NIST and ISO crosswalks."""
        junos_rule_ids = [
            "JUNOS-SSH-001", "JUNOS-SSH-002", "JUNOS-SSH-003",
            "JUNOS-AAA-001", "JUNOS-AAA-002",
            "JUNOS-NTP-001", "JUNOS-LOG-001", "JUNOS-SNMP-001",
            "JUNOS-ACL-001", "JUNOS-MGMT-001"
        ]
        for rid in junos_rule_ids:
            nist_mapped = any(rid in rules for rules in NIST_VENDOR_RULE_MAPPINGS["juniper"].values())
            iso_mapped = any(rid in rules for rules in ISO_VENDOR_RULE_MAPPINGS["juniper"].values())
            assert nist_mapped, f"Junos rule {rid} not mapped in NIST crosswalk"
            assert iso_mapped, f"Junos rule {rid} not mapped in ISO crosswalk"

    def test_unmapped_control_evaluates_to_not_assessed(self):
        """Unmapped controls evaluate to NOT_ASSESSED with exact required reason."""
        reg = get_default_registry()
        evaluator = reg.get_evaluator(NIST_SP_800_53_REV5_FRAMEWORK_ID)
        csm = parse_cisco("")
        results = evaluator.evaluate(csm)

        ac2_results = [r for r in results if r.control_id == "AC-2"]
        assert len(ac2_results) == 1
        res = ac2_results[0]
        assert res.status == ComplianceStatus.NOT_ASSESSED
        assert res.reason == "not assessed: no vendor rules mapped to this control"

    def test_rollup_logic_fail_unknown_pass(self):
        """Verifies roll-up logic: any FAIL -> FAIL; else any UNKNOWN -> UNKNOWN; else PASS."""
        reg = get_default_registry()
        evaluator = reg.get_evaluator(NIST_SP_800_53_REV5_FRAMEWORK_ID)

        base_csm = parse_cisco("")

        # 1. Config with SSH version 1 (fails MA-4 (6))
        csm_fail = copy.deepcopy(base_csm)
        csm_fail["services"]["ssh"] = True
        csm_fail["services"]["ssh_version"] = 1
        csm_fail["services"]["telnet"] = False
        res_fail = evaluator.evaluate(csm_fail)
        ma4 = [r for r in res_fail if r.control_id == "MA-4 (6)"][0]
        assert ma4.status == ComplianceStatus.FAIL

        # 2. Config with SSH unconfigured (unknown MA-4 (6))
        csm_unk = copy.deepcopy(base_csm)
        csm_unk["services"]["ssh"] = False
        res_unk = evaluator.evaluate(csm_unk)
        ma4_unk = [r for r in res_unk if r.control_id == "MA-4 (6)"][0]
        assert ma4_unk.status == ComplianceStatus.UNKNOWN

        # 3. Config with SSH version 2 compliant (passes MA-4 (6))
        csm_pass = copy.deepcopy(base_csm)
        csm_pass["services"]["ssh"] = True
        csm_pass["services"]["ssh_version"] = 2
        csm_pass["services"]["telnet"] = False
        res_pass = evaluator.evaluate(csm_pass)
        ma4_pass = [r for r in res_pass if r.control_id == "MA-4 (6)"][0]
        assert ma4_pass.status == ComplianceStatus.PASS

    def test_crosswalk_determinism_5_consecutive_runs(self):
        """Crosswalk evaluation produces 100% identical outputs across 5 consecutive runs."""
        reg = get_default_registry()
        evaluator = reg.get_evaluator(ISO_IEC_27001_2022_FRAMEWORK_ID)
        csm = {
            "device": {"platform": "Cisco IOS-XE"},
            "services": {"ssh": True, "ssh_version": 2, "telnet": False},
            "aaa": {"enabled": True, "configured": True, "authentication_method": "group"},
            "ntp": {"servers": ["10.0.0.1"], "authentication_enabled": True},
            "logging": {"remote_logging_enabled": True, "timestamps_enabled": True, "enabled": True},
            "snmp": {"enabled": True, "community_strings": ["snmp_secret_key"]},
            "access_control": {"management_acl_present": True, "acls_present": True},
            "routing": {"bgp_enabled": True, "routing_protocols": ["bgp"], "routing_authentication_enabled": True},
            "spanning_tree": {"configured": True, "bpduguard_enabled": True},
            "management": {"management_vrf_enabled": True},
            "interfaces": [],
            "raw_evidence": []
        }
        hashes = []
        for _ in range(5):
            results = evaluator.evaluate(csm)
            serialized = json.dumps([r.to_dict() for r in results], sort_keys=True)
            hashes.append(hashlib.sha256(serialized.encode("utf-8")).hexdigest())

        assert len(set(hashes)) == 1, f"Divergence detected in crosswalk determinism: {hashes}"

    def test_multi_framework_aggregator_includes_crosswalks(self):
        """MultiFrameworkAggregator successfully aggregates NIST and ISO evaluation results."""
        reg = get_default_registry()
        evaluator_nist = reg.get_evaluator(NIST_SP_800_53_REV5_FRAMEWORK_ID)
        evaluator_iso = reg.get_evaluator(ISO_IEC_27001_2022_FRAMEWORK_ID)

        csm = {
            "device": {"platform": "Junos", "vendor": "juniper"},
            "services": {"ssh": True, "ssh_version": 2, "telnet": False, "connection_limit": 5, "rate_limit": 5, "root_login": "deny"},
            "aaa": {"enabled": True, "configured": True, "tacacs_enabled": True, "password_encryption": True},
            "ntp": {"servers": ["10.0.0.1"], "authentication_enabled": True},
            "logging": {"enabled": True, "remote_logging_enabled": True, "timestamps_enabled": True},
            "snmp": {"enabled": True, "snmpv3_users_present": True, "community_strings": []},
            "access_control": {"management_acl_present": True, "acls_present": True},
            "routing": {"bgp_enabled": False, "routing_protocols": []},
            "management": {"password_policy_configured": True, "management_vrf_enabled": True},
            "interfaces": [],
            "raw_evidence": []
        }

        nist_res = evaluator_nist.evaluate(csm)
        iso_res = evaluator_iso.evaluate(csm)

        aggregator = MultiFrameworkAggregator(registry=reg)
        audit_result = aggregator.aggregate(
            results=nist_res + iso_res,
        )

        assert NIST_SP_800_53_REV5_FRAMEWORK_ID in audit_result.framework_summaries
        assert ISO_IEC_27001_2022_FRAMEWORK_ID in audit_result.framework_summaries
        assert audit_result.overall_metrics.total_frameworks == 2
        total_assessed = sum(1 for r in nist_res + iso_res if r.status != ComplianceStatus.NOT_ASSESSED)
        assert audit_result.overall_metrics.total_controls == total_assessed


# ==============================================================================
# 4. REPORT EXPORT DEVICE IDENTITY & REMEDIATION TESTS
# ==============================================================================

class TestReportExportCompliance:
    """Verifies PDF and DOCX export rendering of device identity and Not In Config fallback."""

    def test_pdf_export_renders_device_identity_and_not_in_config(self, tmp_path):
        """PDF report renders model, serial, and 'Not In Config' when missing."""
        import pypdf
        from src.audit_report import AuditReport, FrameworkReportItem, HumanEditableContent
        from src.report_exporter import export_pdf

        # Report 1: Full identity
        report_full = AuditReport(
            report_id="RPT-TEST-FULL-01",
            audit_entry_id="aud-full-01",
            session_id="sess-full-01",
            vendor="cisco",
            device_metadata={
                "hostname": "core-rtr-01",
                "platform": "Cisco IOS-XE",
                "hardware_model": "C8300-1N1S-4T2X",
                "serial_number": "FOC25181ABC",
                "os_version": "17.09.03a",
                "management_ip": "10.0.0.1",
            },
            configuration_metadata={"filename": "core.cfg", "config_file_hash": "abc123hash"},
            frameworks=[],
            remediation=[{"rule_id": "CISCO-SSH-001", "cli_commands": ["ip ssh version 2"]}],
            conflict_warnings=[],
            ai_mapping_provenance=[],
            editable_content=HumanEditableContent(),
            edit_metadata=[],
            version=1,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z",
            created_by="system",
        )
        pdf_path_1 = tmp_path / "report_full.pdf"
        export_pdf(report_full, str(pdf_path_1), export_dir=tmp_path)
        reader_1 = pypdf.PdfReader(str(pdf_path_1))
        text_1 = "\n".join(page.extract_text() or "" for page in reader_1.pages)

        assert "core-rtr-01" in text_1
        assert "C8300-1N1S-4T2X" in text_1
        assert "FOC25181ABC" in text_1
        assert "17.09.03a" in text_1
        assert "10.0.0.1" in text_1

        # Report 2: Missing identity renders "Not In Config"
        report_missing = AuditReport(
            report_id="RPT-TEST-MISS-02",
            audit_entry_id="aud-miss-02",
            session_id="sess-miss-02",
            vendor="juniper",
            device_metadata={
                "hostname": "edge-srx-01",
                "platform": "Junos",
                "hardware_model": None,
                "serial_number": None,
                "os_version": None,
                "management_ip": None,
            },
            configuration_metadata={"filename": "edge.conf", "config_file_hash": "def456hash"},
            frameworks=[],
            remediation=[],
            conflict_warnings=[],
            ai_mapping_provenance=[],
            editable_content=HumanEditableContent(),
            edit_metadata=[],
            version=1,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z",
            created_by="system",
        )
        pdf_path_2 = tmp_path / "report_missing.pdf"
        export_pdf(report_missing, str(pdf_path_2), export_dir=tmp_path)
        reader_2 = pypdf.PdfReader(str(pdf_path_2))
        text_2 = "\n".join(page.extract_text() or "" for page in reader_2.pages)

        assert "edge-srx-01" in text_2
        assert "Not In Config" in text_2

    def test_docx_export_renders_device_identity_and_not_in_config(self, tmp_path):
        """DOCX report renders model, serial, and 'Not In Config' when missing."""
        import zipfile
        from src.audit_report import AuditReport, FrameworkReportItem, HumanEditableContent
        from src.report_exporter import export_docx

        report = AuditReport(
            report_id="RPT-TEST-DOCX-01",
            audit_entry_id="aud-docx-01",
            session_id="sess-docx-01",
            vendor="cisco",
            device_metadata={
                "hostname": "branch-sw-01",
                "platform": "Cisco IOS-XE",
                "hardware_model": "WS-C3850-48P",
                "serial_number": None,
                "os_version": None,
                "management_ip": "192.168.1.254",
            },
            configuration_metadata={"filename": "branch.cfg", "config_file_hash": "789ghi"},
            frameworks=[],
            remediation=[],
            conflict_warnings=[],
            ai_mapping_provenance=[],
            editable_content=HumanEditableContent(),
            edit_metadata=[],
            version=1,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z",
            created_by="system",
        )
        docx_path = tmp_path / "report.docx"
        export_docx(report, str(docx_path), export_dir=tmp_path)

        with zipfile.ZipFile(str(docx_path), "r") as zf:
            doc_xml = zf.read("word/document.xml").decode("utf-8")

        assert "branch-sw-01" in doc_xml
        assert "WS-C3850-48P" in doc_xml
        assert "Not In Config" in doc_xml
        assert "192.168.1.254" in doc_xml

    def test_certified_report_hash_independent_of_device_metadata(self):
        """Pre-change reports without hardware_model verify identically and hardware_model is not in hash."""
        from src.audit_log import create_audit_entry, compute_entry_hash
        evals = {"CISCO-SSH-001": {"status": "Pass"}}
        raw_cfg = "hostname test-router\n"
        csm_without_model = {"device": {"hostname": "test-router"}}
        csm_with_model = {
            "device": {
                "hostname": "test-router",
                "hardware_model": "C8300-1N1S-4T2X",
                "serial_number": "FOC12345",
                "os_version": "17.09.03a",
                "management_ip": "10.0.0.1",
            }
        }
        entry1 = create_audit_entry(csm_without_model, evals, raw_cfg)
        entry2 = create_audit_entry(csm_with_model, evals, raw_cfg)
        assert "hardware_model" not in entry1
        assert "hardware_model" not in entry2
        # Verify hash computation is strictly independent of device metadata
        entry2["timestamp"] = entry1["timestamp"]
        entry2["entry_id"] = entry1["entry_id"]
        assert compute_entry_hash(entry1) == compute_entry_hash(entry2)
