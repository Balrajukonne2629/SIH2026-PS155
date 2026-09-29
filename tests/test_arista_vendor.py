"""NTRO PS26155 — Arista EOS Vendor Integration Tests (Phase C).

Comprehensive TDD test suite validating the complete Arista EOS vendor integration:
1. Sample Configuration Discovery & Loading (From datasets/Arista/Arista_EOS_Samples.zip)
2. Canonical Arista Parsing & CSM Normalization (Schema conformance, management IP priority, missing data integrity)
3. Deterministic Baseline Rules (10 ARISTA-* rules evaluated against secure, insecure, partial, and sample configs)
4. Determinism & AST Execution Safety (5 identical hash runs, pure standard library verification)
5. Vendor Adapter & Extensible Registry (Registration, explicit vendor='arista', auto-detection)
6. Negative Cross-Vendor Protection (Rejection of Cisco, Juniper, Fortinet configs; Cisco rejection of Arista)
7. Vendor Isolation (Zero Cisco, Junos, or Fortinet rule leakage)
8. End-to-End API Ingestion (POST /api/audit/upload with explicit and auto vendor)
9. Production Database Protection (Tmp databases only, zero mutations to data/auditor.db)
"""

import copy
import hashlib
import json
import pathlib
import zipfile
import pytest
from fastapi.testclient import TestClient

import src.ast_safety as ast_safety
import src.auth as auth
import src.database as database
import src.arista_auditor as arista_auditor
from src.vendor_adapter import (
    AristaVendorAdapter,
    CiscoVendorAdapter,
    FortinetVendorAdapter,
    JuniperVendorAdapter,
    VendorAdapter,
)
from src.vendor_registry import (
    VendorRegistry,
    get_default_vendor_registry,
    ingest_configuration,
    UndeterminedVendorError,
    UnsupportedVendorError,
)
from src.compliance_framework import (
    ComplianceStatus,
    FrameworkRegistry,
    get_default_registry,
)
from src.main import app

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
ZIP_PATH = BASE_DIR / "datasets" / "Arista" / "Arista_EOS_Samples.zip"


# --- Fixtures ---

@pytest.fixture(scope="session")
def arista_zip_configs():
    """Extracts and returns the 4 real Arista EOS configuration samples from the dataset zip."""
    assert ZIP_PATH.exists(), f"Arista dataset archive missing at {ZIP_PATH}"
    configs = {}
    with zipfile.ZipFile(ZIP_PATH, "r") as z:
        for name in [
            "Arista_EOS_Samples/secure_arista.conf.txt",
            "Arista_EOS_Samples/insecure_arista.conf.txt",
            "Arista_EOS_Samples/partial_arista.conf.txt",
            "Arista_EOS_Samples/sample_arista_eos_configuration.conf.txt",
        ]:
            configs[pathlib.Path(name).name] = z.read(name).decode("utf-8", errors="ignore")
    return configs


@pytest.fixture
def sample_arista_secure(arista_zip_configs):
    return arista_zip_configs["secure_arista.conf.txt"]


@pytest.fixture
def sample_arista_insecure(arista_zip_configs):
    return arista_zip_configs["insecure_arista.conf.txt"]


@pytest.fixture
def sample_arista_partial(arista_zip_configs):
    return arista_zip_configs["partial_arista.conf.txt"]


@pytest.fixture
def sample_arista_sample(arista_zip_configs):
    return arista_zip_configs["sample_arista_eos_configuration.conf.txt"]


@pytest.fixture
def clean_vendor_registry():
    """Returns a fresh VendorRegistry with all four vendors registered."""
    reg = VendorRegistry()
    reg.register(CiscoVendorAdapter())
    reg.register(JuniperVendorAdapter())
    reg.register(FortinetVendorAdapter())
    reg.register(AristaVendorAdapter())
    return reg


# ==============================================================================
# 1. DATASET DISCOVERY & SAMPLE AUDITING
# ==============================================================================

class TestAristaSampleDiscovery:
    """Verifies presence and discovery of real Arista EOS configuration files."""

    def test_zip_archive_exists(self):
        """Asserts that datasets/Arista/Arista_EOS_Samples.zip exists."""
        assert ZIP_PATH.exists()
        assert ZIP_PATH.stat().st_size > 0

    def test_expected_sample_files_in_zip(self, arista_zip_configs):
        """Discovers and validates all 4 expected configuration samples."""
        assert "secure_arista.conf.txt" in arista_zip_configs
        assert "insecure_arista.conf.txt" in arista_zip_configs
        assert "partial_arista.conf.txt" in arista_zip_configs
        assert "sample_arista_eos_configuration.conf.txt" in arista_zip_configs

        for name, text in arista_zip_configs.items():
            assert len(text.strip()) > 0, f"Sample {name} is empty"
            assert "hostname" in text.lower(), f"Sample {name} missing hostname"


# ==============================================================================
# 2. CANONICAL PARSER & CSM EXTRACTION
# ==============================================================================

class TestAristaParserAndCSM:
    """Tests Arista EOS parsing and CSM normalization."""

    def test_hostname_extraction(self, sample_arista_secure, sample_arista_insecure, sample_arista_partial, sample_arista_sample):
        """Extracts exact hostnames from all four configurations."""
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["device"]["hostname"] == "ARISTA-SECURE-LAB"

        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert csm_insec["device"]["hostname"] == "ARISTA-INSECURE-LAB"

        csm_part = arista_auditor.parse_arista(sample_arista_partial)
        assert csm_part["device"]["hostname"] == "ARISTA-PARTIAL-LAB"

        csm_samp = arista_auditor.parse_arista(sample_arista_sample)
        assert csm_samp["device"]["hostname"] == "lab-arista-switch"

    def test_vendor_and_platform_extraction(self, sample_arista_secure):
        """Device metadata sets vendor='arista' and platform='EOS'."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        assert csm["device"]["vendor"] == "arista"
        assert csm["device"]["platform"] == "EOS"

    def test_missing_metadata_remains_none(self, sample_arista_secure):
        """Missing hardware and OS metadata are preserved as None without fabrication."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        assert csm["device"]["os_version"] is None
        assert csm["device"]["serial_number"] is None
        assert csm["device"]["model"] is None

    def test_management_ip_priority_order(self, sample_arista_secure, sample_arista_sample):
        """Verifies management IP extraction follows Management1 > description > Loopback > None."""
        # 1. Management1 dedicated interface on secure sample
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["device"]["management_ip"] == "192.0.2.10"

        # 2. Management1 on sample config (has Loopback0 203.0.113.10 as well, Management1 must win)
        csm_samp = arista_auditor.parse_arista(sample_arista_sample)
        assert csm_samp["device"]["management_ip"] == "192.0.2.20"

        # 3. Config with only Loopback0 falls back to loopback
        loopback_only = """
hostname TEST-LOOPBACK-ONLY
interface Loopback0
   ip address 10.254.254.1/32
interface Ethernet1
   ip address 192.168.1.1/24
"""
        csm_loop = arista_auditor.parse_arista(loopback_only)
        assert csm_loop["device"]["management_ip"] == "10.254.254.1"

        # 4. Config with only Ethernet ports has NO management IP (never picks arbitrary Ethernet)
        ethernet_only = """
hostname TEST-ETH-ONLY
interface Ethernet1
   ip address 192.168.1.1/24
"""
        csm_eth = arista_auditor.parse_arista(ethernet_only)
        assert csm_eth["device"]["management_ip"] is None

    def test_ssh_extraction(self, sample_arista_secure, sample_arista_sample, sample_arista_insecure):
        """Extracts SSH configuration accurately."""
        # Secure sample has public-key & keyboard-interactive
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["services"]["ssh_enabled"] is True
        assert csm_sec["services"]["ssh_version"] == 2
        assert "public-key" in csm_sec["services"]["ssh_auth_methods"]

        # Sample config has protocol-version 2
        csm_samp = arista_auditor.parse_arista(sample_arista_sample)
        assert csm_samp["services"]["ssh_enabled"] is True
        assert csm_samp["services"]["ssh_version"] == 2

        # Insecure sample has bare management ssh
        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert csm_insec["services"]["ssh_enabled"] is True
        assert csm_insec["services"]["ssh_version"] is None

    def test_telnet_extraction(self, sample_arista_secure):
        """Telnet remains False by default."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        assert csm["services"]["telnet_enabled"] is False

    def test_aaa_extraction(self, sample_arista_secure, sample_arista_insecure):
        """Extracts AAA authentication and authorization commands and users."""
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["aaa"]["aaa_enabled"] is True
        assert "default local" in str(csm_sec["aaa"]["authentication_login"])
        assert "default local" in str(csm_sec["aaa"]["authorization_exec"])
        assert len(csm_sec["aaa"]["local_users"]) >= 1

        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert csm_insec["aaa"]["authentication_login"] is not None
        assert csm_insec["aaa"]["authorization_exec"] is None

    def test_ntp_extraction(self, sample_arista_secure, sample_arista_sample, sample_arista_insecure):
        """Extracts NTP server list and source interface."""
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["ntp"]["enabled"] is True
        assert "192.0.2.123" in csm_sec["ntp"]["servers"]

        csm_samp = arista_auditor.parse_arista(sample_arista_sample)
        assert csm_samp["ntp"]["enabled"] is True
        assert len(csm_samp["ntp"]["servers"]) == 2
        assert csm_samp["ntp"]["source_interface"] == "Management1"

        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert csm_insec["ntp"]["enabled"] is False
        assert len(csm_insec["ntp"]["servers"]) == 0

    def test_logging_extraction(self, sample_arista_secure, sample_arista_sample, sample_arista_insecure):
        """Extracts local buffer and remote syslog logging parameters."""
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["logging"]["buffered_logging"] is True
        assert csm_sec["logging"]["buffered_severity"] == "informational"

        csm_samp = arista_auditor.parse_arista(sample_arista_sample)
        assert "192.0.2.50" in csm_samp["logging"]["hosts"]
        assert csm_samp["logging"]["trap_severity"] == "informational"

        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert csm_insec["logging"]["buffered_logging"] is False
        assert csm_insec["logging"]["console_severity"] == "debugging"

    def test_snmp_extraction(self, sample_arista_secure, sample_arista_insecure):
        """Extracts SNMP communities and security posture."""
        csm_sec = arista_auditor.parse_arista(sample_arista_secure)
        assert csm_sec["snmp"]["enabled"] is True
        assert any(c["name"] == "PUBLIC-READONLY" for c in csm_sec["snmp"]["communities"])

        csm_insec = arista_auditor.parse_arista(sample_arista_insecure)
        assert any(c["name"] == "public" for c in csm_insec["snmp"]["communities"])

    def test_interface_extraction(self, sample_arista_secure):
        """Extracts interface parameters, spanning tree, and VLANs."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        ifaces = {i["name"]: i for i in csm["interfaces"]}
        assert "Management1" in ifaces
        assert ifaces["Management1"]["vrf"] == "MGMT"
        assert ifaces["Management1"]["is_management"] is True

        assert "Ethernet1" in ifaces
        assert ifaces["Ethernet1"]["switchport_mode"] == "access"
        assert ifaces["Ethernet1"]["access_vlan"] == 10
        assert ifaces["Ethernet1"]["spanning_tree_bpduguard"] is True

        assert "Ethernet2" in ifaces
        assert ifaces["Ethernet2"]["switchport_mode"] == "trunk"
        assert ifaces["Ethernet2"]["allowed_vlans"] == [10, 20, 99]

    def test_raw_evidence_preservation(self, sample_arista_secure):
        """Ensures raw source statements are linked in raw_evidence."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        evidence = csm["raw_evidence"]
        fields = [e["field"] for e in evidence]
        assert "device.hostname" in fields
        assert "device.management_ip" in fields
        assert "aaa.authentication_login" in fields

    def test_unmapped_lines_preserved(self):
        """Unmapped custom commands are safely retained in unmapped_lines."""
        custom_cfg = "hostname ARISTA-CUSTOM\ncustom-unsupported-daemon start\n"
        csm = arista_auditor.parse_arista(custom_cfg)
        assert "custom-unsupported-daemon start" in csm["unmapped_lines"]


# ==============================================================================
# 3. VENDOR ADAPTER & EXTENSIBLE REGISTRY INTEGRATION
# ==============================================================================

class TestAristaAdapterAndRegistry:
    """Verifies AristaVendorAdapter registration and detection."""

    def test_adapter_properties(self):
        """Verifies adapter ID, human name, and platforms."""
        adapter = AristaVendorAdapter()
        assert adapter.vendor_id == "arista"
        assert adapter.vendor_name == "Arista Networks"
        assert "EOS" in adapter.supported_platforms

    def test_adapter_registered_in_default_registry(self):
        """Arista is included in get_default_vendor_registry()."""
        reg = get_default_vendor_registry()
        assert reg.has("arista") is True
        adapter = reg.get("arista")
        assert isinstance(adapter, AristaVendorAdapter)

    def test_explicit_vendor_selection(self, clean_vendor_registry, sample_arista_secure):
        """Explicit vendor='arista' returns AristaVendorAdapter."""
        csm, adapter = ingest_configuration(
            raw_text=sample_arista_secure,
            vendor="arista",
            registry=clean_vendor_registry,
        )
        assert adapter.vendor_id == "arista"
        assert csm["device"]["hostname"] == "ARISTA-SECURE-LAB"

    def test_auto_detection_all_samples(self, clean_vendor_registry, sample_arista_secure, sample_arista_insecure, sample_arista_partial, sample_arista_sample):
        """Auto-detection selects Arista on all 4 actual sample configurations."""
        for cfg, expected_host in [
            (sample_arista_secure, "ARISTA-SECURE-LAB"),
            (sample_arista_insecure, "ARISTA-INSECURE-LAB"),
            (sample_arista_partial, "ARISTA-PARTIAL-LAB"),
            (sample_arista_sample, "lab-arista-switch"),
        ]:
            detected = clean_vendor_registry.detect(cfg)
            assert detected is not None, f"Failed to detect {expected_host}"
            assert detected.vendor_id == "arista"

            csm, adapter = ingest_configuration(raw_text=cfg, registry=clean_vendor_registry)
            assert adapter.vendor_id == "arista"
            assert csm["device"]["hostname"] == expected_host

    def test_cisco_config_rejected_by_arista(self, clean_vendor_registry):
        """Arista detector returns 0.0 on Cisco configuration."""
        cisco_sample = """
hostname RTR-CISCO
boot-start-marker
service timestamps debug datetime msec
aaa new-model
line vty 0 4
"""
        adapter = clean_vendor_registry.get("arista")
        assert adapter.detect_confidence(cisco_sample) == 0.0

    def test_juniper_config_rejected_by_arista(self, clean_vendor_registry):
        """Arista detector returns 0.0 on Juniper configuration."""
        juniper_sample = """
set system host-name JUNOS-RTR
set system services ssh
interfaces {
    ge-0/0/0 { unit 0; }
}
"""
        adapter = clean_vendor_registry.get("arista")
        assert adapter.detect_confidence(juniper_sample) == 0.0

    def test_fortinet_config_rejected_by_arista(self, clean_vendor_registry):
        """Arista detector returns 0.0 on Fortinet configuration."""
        fortinet_sample = """
config system global
    set hostname "FG-01"
    set vdom "root"
end
"""
        adapter = clean_vendor_registry.get("arista")
        assert adapter.detect_confidence(fortinet_sample) == 0.0

    def test_arista_config_rejected_by_cisco(self, clean_vendor_registry, sample_arista_secure):
        """Cisco detector returns 0.0 on Arista configuration (false-positive prevention)."""
        cisco_adapter = clean_vendor_registry.get("cisco")
        assert cisco_adapter.detect_confidence(sample_arista_secure) == 0.0

    def test_unknown_vendor_fails_soft_without_resolving_to_arista(self, clean_vendor_registry):
        """Generic non-network text fails detection cleanly."""
        unknown_text = "Some random prose text that describes a server installation.\nNothing related to switches."
        assert clean_vendor_registry.detect(unknown_text) is None
        with pytest.raises(UndeterminedVendorError):
            ingest_configuration(unknown_text, registry=clean_vendor_registry)


# ==============================================================================
# 4. DETERMINISTIC 10 ARISTA BASELINE RULES TESTS
# ==============================================================================

class TestAristaBaselineRules:
    """Verifies deterministic evaluation of the 10 Arista baseline security rules."""

    def test_all_10_rules_present_in_results(self, sample_arista_secure):
        """Verifies evaluation produces all 10 authoritative ARISTA-* rules."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        expected_ids = {
            "ARISTA-SSH-001",
            "ARISTA-AAA-001",
            "ARISTA-NTP-001",
            "ARISTA-LOG-001",
            "ARISTA-SNMP-001",
            "ARISTA-ACL-001",
            "ARISTA-INT-001",
            "ARISTA-ROUTING-001",
            "ARISTA-STP-001",
            "ARISTA-MGMT-001",
        }
        assert set(evals.keys()) == expected_ids

    def test_secure_sample_verdicts(self, sample_arista_secure):
        """Hardened sample passes 9 controls, with unconfigured dynamic routing as Unknown."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        assert evals["ARISTA-SSH-001"]["status"] == "Pass"
        assert evals["ARISTA-AAA-001"]["status"] == "Pass"
        assert evals["ARISTA-NTP-001"]["status"] == "Pass"
        assert evals["ARISTA-LOG-001"]["status"] == "Pass"
        assert evals["ARISTA-SNMP-001"]["status"] == "Pass"
        assert evals["ARISTA-ACL-001"]["status"] == "Pass"
        assert evals["ARISTA-INT-001"]["status"] == "Pass"
        assert evals["ARISTA-ROUTING-001"]["status"] == "Unknown"
        assert evals["ARISTA-STP-001"]["status"] == "Pass"
        assert evals["ARISTA-MGMT-001"]["status"] == "Pass"

    def test_insecure_sample_verdicts(self, sample_arista_insecure):
        """Intentionally weak sample fails all 9 applicable controls."""
        csm = arista_auditor.parse_arista(sample_arista_insecure)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        assert evals["ARISTA-SSH-001"]["status"] == "Fail"
        assert evals["ARISTA-AAA-001"]["status"] == "Fail"
        assert evals["ARISTA-NTP-001"]["status"] == "Fail"
        assert evals["ARISTA-LOG-001"]["status"] == "Fail"
        assert evals["ARISTA-SNMP-001"]["status"] == "Fail"
        assert evals["ARISTA-ACL-001"]["status"] == "Fail"
        assert evals["ARISTA-INT-001"]["status"] == "Fail"
        assert evals["ARISTA-ROUTING-001"]["status"] == "Unknown"
        assert evals["ARISTA-STP-001"]["status"] == "Fail"
        assert evals["ARISTA-MGMT-001"]["status"] == "Fail"

    def test_partial_sample_verdicts(self, sample_arista_partial):
        """Partially compliant sample has mixed Pass/Fail status."""
        csm = arista_auditor.parse_arista(sample_arista_partial)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        assert evals["ARISTA-NTP-001"]["status"] == "Pass"
        assert evals["ARISTA-LOG-001"]["status"] == "Pass"
        assert evals["ARISTA-SNMP-001"]["status"] == "Pass"
        assert evals["ARISTA-INT-001"]["status"] == "Pass"
        assert evals["ARISTA-SSH-001"]["status"] == "Fail"
        assert evals["ARISTA-AAA-001"]["status"] == "Fail"
        assert evals["ARISTA-ACL-001"]["status"] == "Fail"
        assert evals["ARISTA-STP-001"]["status"] == "Fail"
        assert evals["ARISTA-MGMT-001"]["status"] == "Fail"

    def test_sample_eos_config_verdicts(self, sample_arista_sample):
        """Sample EOS configuration passes routing and SSH, fails SNMP weak and ACL."""
        csm = arista_auditor.parse_arista(sample_arista_sample)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        assert evals["ARISTA-SSH-001"]["status"] == "Pass"
        assert evals["ARISTA-AAA-001"]["status"] == "Pass"
        assert evals["ARISTA-NTP-001"]["status"] == "Pass"
        assert evals["ARISTA-LOG-001"]["status"] == "Pass"
        assert evals["ARISTA-ROUTING-001"]["status"] == "Pass"
        assert evals["ARISTA-SNMP-001"]["status"] == "Fail"
        assert evals["ARISTA-ACL-001"]["status"] == "Fail"
        assert evals["ARISTA-STP-001"]["status"] == "Fail"
        assert evals["ARISTA-MGMT-001"]["status"] == "Fail"

    def test_evaluation_determinism_5_runs(self, sample_arista_secure):
        """5 consecutive evaluation runs yield identical SHA-256 hashes."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        hashes = []
        for _ in range(5):
            evals = arista_auditor.evaluate_arista_baseline(csm)
            serialized = json.dumps(evals, sort_keys=True)
            hashes.append(hashlib.sha256(serialized.encode("utf-8")).hexdigest())
        assert len(set(hashes)) == 1, f"Evaluation non-determinism detected: {hashes}"

    def test_arista_does_not_inherit_cisco_rules(self, sample_arista_secure):
        """Arista evaluation evaluates exclusively ARISTA-* rules; zero Cisco rule leakage."""
        csm = arista_auditor.parse_arista(sample_arista_secure)
        evals = arista_auditor.evaluate_arista_baseline(csm)
        for rid in evals.keys():
            assert rid.startswith("ARISTA-"), f"Non-Arista rule found: {rid}"
            assert not rid.startswith("CISCO-"), f"Cisco rule leaked into Arista: {rid}"
            assert not rid.startswith("JUNOS-"), f"Junos rule leaked into Arista: {rid}"
            assert not rid.startswith("FORTINET-"), f"Fortinet rule leaked into Arista: {rid}"


# ==============================================================================
# 5. FRAMEWORK REGISTRATION & VENDOR ISOLATION
# ==============================================================================

class TestAristaFrameworkAndIsolation:
    """Verifies FrameworkRegistry integration and cross-vendor isolation."""

    def test_register_arista_baseline(self):
        """Registers arista-eos-baseline in FrameworkRegistry."""
        reg = FrameworkRegistry()
        arista_auditor.register_arista_baseline(reg)
        assert reg.exists("arista-eos-baseline") is True
        fw = reg.get("arista-eos-baseline")
        assert fw.vendor_scope == "Arista EOS"
        evaluator = reg.get_evaluator("arista-eos-baseline")
        assert isinstance(evaluator, arista_auditor.AristaBaselineEvaluator)

    def test_arista_evaluator_rejects_cisco_csm(self):
        """Evaluating Cisco CSM with Arista evaluator returns UNKNOWN for all rules."""
        cisco_csm = {
            "device": {"hostname": "CISCO-01", "vendor": "cisco", "platform": "IOS-XE"},
            "services": {"ssh_version": 2},
        }
        evaluator = arista_auditor.AristaBaselineEvaluator()
        results = evaluator.evaluate(cisco_csm)
        for r in results:
            assert r.status == ComplianceStatus.UNKNOWN
            assert "not Arista" in r.reason

    def test_arista_evaluator_rejects_fortinet_csm(self):
        """Evaluating Fortinet CSM with Arista evaluator returns UNKNOWN for all rules."""
        fortinet_csm = {
            "device": {"hostname": "FG-01", "vendor": "fortinet", "platform": "FortiOS"},
            "services": {"ssh_version": 2},
        }
        evaluator = arista_auditor.AristaBaselineEvaluator()
        results = evaluator.evaluate(fortinet_csm)
        for r in results:
            assert r.status == ComplianceStatus.UNKNOWN
            assert "not Arista" in r.reason


# ==============================================================================
# 6. AST SAFETY & DATABASE PROTECTION
# ==============================================================================

class TestAristaAstAndDbSafety:
    """Guarantees zero execution imports and database protection."""

    def test_ast_safety_arista_module(self):
        """Asserts zero execution imports (subprocess, socket, paramiko) in arista_auditor.py."""
        assert ast_safety.assert_no_execution_imports(BASE_DIR / "src" / "arista_auditor.py") is True

    def test_production_db_remains_untouched(self):
        """Asserts production database is not modified."""
        prod_db = BASE_DIR / "data" / "auditor.db"
        if prod_db.exists():
            stat_before = prod_db.stat()
            # Run parser and evaluator
            csm = arista_auditor.parse_arista("hostname TEST-ARISTA\n")
            _ = arista_auditor.evaluate_arista_baseline(csm)
            stat_after = prod_db.stat()
            assert stat_before.st_mtime == stat_after.st_mtime
            assert stat_before.st_size == stat_after.st_size


# ==============================================================================
# 7. END-TO-END API INGESTION
# ==============================================================================

class TestAristaApiIngestion:
    """Verifies /api/audit/upload end-to-end with Arista configuration."""

    def test_api_upload_arista_explicit_vendor(self, tmp_path, monkeypatch, sample_arista_secure):
        """POST /api/audit/upload with vendor='arista' parses and evaluates cleanly."""
        test_db = tmp_path / "test_api_arista.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin-id", "admin", "uploader", False)
        client = TestClient(app)

        resp = client.post(
            "/api/audit/upload",
            data={
                "raw_config": sample_arista_secure,
                "vendor": "arista",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        data = resp.json()
        assert data["device_hostname"] == "ARISTA-SECURE-LAB"
        assert data["platform"] == "EOS"
        assert data["summary"]["total"] == 10
        assert data["summary"]["pass"] == 9
        assert data["summary"]["fail"] == 0
        assert data["summary"]["unknown"] == 1

    def test_api_upload_arista_auto_detect(self, tmp_path, monkeypatch, sample_arista_secure):
        """POST /api/audit/upload with vendor='auto' auto-detects Arista."""
        test_db = tmp_path / "test_api_arista_auto.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin-id", "admin", "uploader", False)
        client = TestClient(app)

        resp = client.post(
            "/api/audit/upload",
            data={
                "raw_config": sample_arista_secure,
                "vendor": "auto",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        data = resp.json()
        assert data["device_hostname"] == "ARISTA-SECURE-LAB"
        assert data["platform"] == "EOS"
