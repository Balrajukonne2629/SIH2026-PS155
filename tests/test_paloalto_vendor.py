"""NTRO PS26155 — Palo Alto PAN-OS Vendor Integration Tests.

Comprehensive TDD test suite validating the complete Palo Alto PAN-OS vendor integration:
1. Sample Configuration Discovery & Loading (From SIH26155_PaloAlto_PANOS_RealWorld_PublicDataset_v1.zip)
2. Canonical PAN-OS Parsing & CSM Normalization (Schema conformance, management IP priority, missing data integrity)
3. Deterministic Baseline Rules (10 PALOALTO-* rules evaluated against secure, insecure, partial, and real dataset configs)
4. Determinism & AST Execution Safety (5 identical hash runs, pure standard library verification)
5. Vendor Adapter & Extensible Registry (Registration, explicit vendor='paloalto', auto-detection)
6. Negative Cross-Vendor Protection (Rejection of Cisco, Juniper, Fortinet, Arista configs; other vendors reject PAN-OS)
7. Vendor Isolation (Zero rule leakage, fail-soft to NOT_ASSESSED for foreign CSMs)
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
import src.paloalto_auditor as paloalto_auditor
from src.vendor_adapter import (
    AristaVendorAdapter,
    CiscoVendorAdapter,
    FortinetVendorAdapter,
    JuniperVendorAdapter,
    PaloAltoVendorAdapter,
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
PANOS_ZIP = BASE_DIR / "SIH26155_PaloAlto_PANOS_RealWorld_PublicDataset_v1.zip"


# --- Fixtures ---

@pytest.fixture(scope="session")
def panos_real_configs():
    """Extracts and returns the real-world PAN-OS configuration samples from the dataset zip."""
    assert PANOS_ZIP.exists(), f"Palo Alto dataset archive missing at {PANOS_ZIP}"
    configs = {}
    with zipfile.ZipFile(PANOS_ZIP, "r") as z:
        for name in [
            "configs/panos_set_cli_examples.txt",
            "configs/panos_fw_rules.yml",
            "configs/panos_cloud_automation_reference.txt",
        ]:
            configs[pathlib.Path(name).name] = z.read(name).decode("utf-8", errors="ignore")
    return configs


@pytest.fixture
def sample_panos_secure():
    """Returns a fully hardened synthetic PAN-OS set configuration satisfying all 10 baseline rules."""
    return """set deviceconfig system hostname PA-VM-SECURE
set deviceconfig system ip-address 192.168.1.10 netmask 255.255.255.0
set deviceconfig system default-gateway 192.168.1.1
set deviceconfig system service disable-ssh no
set deviceconfig system service disable-telnet yes
set shared log-settings syslog SECURE-SYSLOG server server1 transport TCP port 2514 format BSD server 192.168.1.50
set shared server-profile netflow SECURE-FLOW server flow1 host 192.168.1.55 port 2055
set deviceconfig system ntp-servers primary-ntp-server ntp-server-address 192.168.1.100
set deviceconfig system snmp-setting v2c-community SecOps-Str0ng-Key
set shared server-profile tacacs TACACS-SRV server auth1 ip-address 192.168.1.20
set network virtual-router DEFAULT protocol ospf enable yes
set rulebase security rules Allow-Mgmt action allow
"""


@pytest.fixture
def sample_panos_insecure():
    """Returns a non-compliant PAN-OS configuration failing critical security baseline checks."""
    return """set deviceconfig system hostname PA-INSECURE
set deviceconfig system service disable-ssh yes
set deviceconfig system service disable-telnet no
set deviceconfig system snmp-setting v2c-community public
"""


@pytest.fixture
def clean_vendor_registry():
    """Returns a fresh VendorRegistry with all five adapters registered."""
    reg = VendorRegistry()
    reg.register(CiscoVendorAdapter())
    reg.register(JuniperVendorAdapter())
    reg.register(FortinetVendorAdapter())
    reg.register(AristaVendorAdapter())
    reg.register(PaloAltoVendorAdapter())
    return reg


# ==============================================================================
# 1. DATASET DISCOVERY & INTEGRITY
# ==============================================================================

class TestPaloAltoDatasetDiscovery:
    """Verifies presence, manifest integrity, and structure of the real-world PAN-OS dataset."""

    def test_zip_archive_exists(self):
        """Asserts that SIH26155_PaloAlto_PANOS_RealWorld_PublicDataset_v1.zip exists."""
        assert PANOS_ZIP.exists()
        assert PANOS_ZIP.stat().st_size > 0

    def test_expected_files_in_zip(self, panos_real_configs):
        """Validates all expected files exist in the zip."""
        assert "panos_set_cli_examples.txt" in panos_real_configs
        assert "panos_fw_rules.yml" in panos_real_configs
        assert "panos_cloud_automation_reference.txt" in panos_real_configs

    def test_manifest_checksums(self):
        """Verifies files match SHA256SUMS.json inside the archive."""
        with zipfile.ZipFile(PANOS_ZIP, "r") as z:
            manifest_data = json.loads(z.read("SHA256SUMS.json").decode("utf-8"))
            for rel_path, expected_hash in manifest_data.items():
                content = z.read(rel_path)
                actual_hash = hashlib.sha256(content).hexdigest()
                assert actual_hash == expected_hash, f"Hash mismatch for {rel_path}"


# ==============================================================================
# 2. CANONICAL PAN-OS PARSING & CSM NORMALIZATION
# ==============================================================================

class TestPaloAltoParserAndCSM:
    """Verifies parsing of PAN-OS set CLI and automation YAML into normalized CSM."""

    def test_hostname_extraction(self, sample_panos_secure):
        csm = paloalto_auditor.parse_panos(sample_panos_secure)
        assert csm["device"]["hostname"] == "PA-VM-SECURE"
        assert csm["device"]["vendor"] == "paloalto"
        assert csm["device"]["platform"] == "PAN-OS"

    def test_management_ip_extraction(self, sample_panos_secure):
        csm = paloalto_auditor.parse_panos(sample_panos_secure)
        assert csm["device"]["management_ip"] == "192.168.1.10"
        assert csm["management"]["dedicated_mgmt_interface"] is True

    def test_ssh_and_telnet_extraction(self, sample_panos_secure, sample_panos_insecure):
        csm_sec = paloalto_auditor.parse_panos(sample_panos_secure)
        assert csm_sec["services"]["ssh"] is True
        assert csm_sec["services"]["telnet_enabled"] is False

        csm_insec = paloalto_auditor.parse_panos(sample_panos_insecure)
        assert csm_insec["services"]["ssh"] is False
        assert csm_insec["services"]["telnet_enabled"] is True

    def test_syslog_and_netflow_extraction(self, panos_real_configs):
        raw = panos_real_configs["panos_set_cli_examples.txt"]
        csm = paloalto_auditor.parse_panos(raw)

        assert csm["logging"]["remote_logging_enabled"] is True
        assert "192.168.1.2" in csm["logging"]["logging_servers"]
        assert csm["telemetry"]["netflow_enabled"] is True
        assert "192.168.1.21" in csm["telemetry"]["netflow_servers"]
        assert csm["routing"]["routing_enabled"] is True
        assert "ospf" in csm["routing"]["protocols"]

    def test_ansible_yaml_rule_extraction(self, panos_real_configs):
        raw = panos_real_configs["panos_fw_rules.yml"]
        csm = paloalto_auditor.parse_panos(raw)
        assert csm["access_control"]["control_plane_protection_enabled"] is True

    def test_missing_metadata_remains_none(self):
        csm = paloalto_auditor.parse_panos("set shared server-profile netflow test\n")
        assert csm["device"]["hostname"] == "unknown"
        assert csm["device"]["management_ip"] is None
        assert csm["services"]["ssh"] is None
        assert csm["services"]["telnet_enabled"] is None


# ==============================================================================
# 3. DETERMINISTIC BASELINE RULES (10 PALOALTO-* RULES)
# ==============================================================================

class TestPaloAltoBaselineRules:
    """Verifies compliance verdicts across secure, insecure, and real-world configurations."""

    def test_all_10_rules_evaluated(self, sample_panos_secure):
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        csm = paloalto_auditor.parse_panos(sample_panos_secure)
        results = evaluator.evaluate(csm)
        assert len(results) == 10
        for r in results:
            assert r.status == ComplianceStatus.PASS

    def test_insecure_verdicts(self, sample_panos_insecure):
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        csm = paloalto_auditor.parse_panos(sample_panos_insecure)
        results = evaluator.evaluate(csm)

        res_map = {r.control_id: r.status for r in results}
        assert res_map["PALOALTO-SSH-001"] == ComplianceStatus.FAIL
        assert res_map["PALOALTO-TELNET-001"] == ComplianceStatus.FAIL
        assert res_map["PALOALTO-SNMP-001"] == ComplianceStatus.FAIL  # "public" community fails

    def test_real_world_set_cli_verdicts(self, panos_real_configs):
        raw = panos_real_configs["panos_set_cli_examples.txt"]
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        csm = paloalto_auditor.parse_panos(raw)
        results = evaluator.evaluate(csm)

        res_map = {r.control_id: r.status for r in results}
        assert res_map["PALOALTO-LOG-001"] == ComplianceStatus.PASS
        assert res_map["PALOALTO-NETFLOW-001"] == ComplianceStatus.PASS
        assert res_map["PALOALTO-ROUTING-001"] == ComplianceStatus.PASS

    def test_evaluation_determinism_5_runs(self, sample_panos_secure):
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        csm = paloalto_auditor.parse_panos(sample_panos_secure)

        hashes = []
        for _ in range(5):
            results = evaluator.evaluate(csm)
            serial = json.dumps([{k: v for k, v in r.to_dict().items() if k != "timestamp"} for r in results], sort_keys=True)
            hashes.append(hashlib.sha256(serial.encode("utf-8")).hexdigest())

        assert len(set(hashes)) == 1, "Non-deterministic evaluation detected across 5 runs"


# ==============================================================================
# 4. AST SAFETY & STANDARD LIBRARY VERIFICATION
# ==============================================================================

class TestPaloAltoAstSafety:
    """Verifies that src/paloalto_auditor.py contains zero process or network execution calls."""

    def test_ast_safety_paloalto_auditor(self):
        target = BASE_DIR / "src" / "paloalto_auditor.py"
        assert ast_safety.assert_no_execution_imports(target) is True


# ==============================================================================
# 5. VENDOR ADAPTER & EXTENSIBLE REGISTRY
# ==============================================================================

class TestPaloAltoAdapterAndRegistry:
    """Verifies adapter properties, registration, and deterministic detection."""

    def test_adapter_properties(self):
        adapter = PaloAltoVendorAdapter()
        assert adapter.vendor_id == "paloalto"
        assert adapter.vendor_name == "Palo Alto Networks"
        assert "PAN-OS" in adapter.supported_platforms

    def test_adapter_registered_in_default_registry(self):
        reg = get_default_vendor_registry()
        assert "paloalto" in reg.list_vendor_ids()
        adapter = reg.get("paloalto")
        assert isinstance(adapter, PaloAltoVendorAdapter)

    def test_explicit_vendor_selection(self, clean_vendor_registry, sample_panos_secure):
        csm, adapter = ingest_configuration(
            raw_text=sample_panos_secure,
            vendor="paloalto",
            registry=clean_vendor_registry,
        )
        assert adapter.vendor_id == "paloalto"
        assert csm["device"]["hostname"] == "PA-VM-SECURE"

    def test_auto_detection_on_real_samples(self, clean_vendor_registry, panos_real_configs):
        for name in ["panos_set_cli_examples.txt", "panos_fw_rules.yml"]:
            raw = panos_real_configs[name]
            detected = clean_vendor_registry.detect(raw)
            assert detected is not None, f"Failed to detect {name}"
            assert detected.vendor_id == "paloalto"

    def test_cisco_config_rejected_by_paloalto(self, clean_vendor_registry):
        cisco_cfg = "hostname RTR-1\nservice timestamps log\naaa new-model\n"
        assert clean_vendor_registry.get("paloalto").detect_confidence(cisco_cfg) == 0.0

    def test_juniper_config_rejected_by_paloalto(self, clean_vendor_registry):
        juniper_cfg = "system {\n    host-name junos-1;\n}\n"
        assert clean_vendor_registry.get("paloalto").detect_confidence(juniper_cfg) == 0.0

    def test_fortinet_config_rejected_by_paloalto(self, clean_vendor_registry):
        forti_cfg = "#config-version=FG60E\nconfig system global\n    set hostname FGT-1\nend\n"
        assert clean_vendor_registry.get("paloalto").detect_confidence(forti_cfg) == 0.0

    def test_arista_config_rejected_by_paloalto(self, clean_vendor_registry):
        arista_cfg = "hostname EOS-1\nmanagement ssh\n"
        assert clean_vendor_registry.get("paloalto").detect_confidence(arista_cfg) == 0.0

    def test_panos_config_rejected_by_other_vendors(self, clean_vendor_registry, panos_real_configs):
        raw = panos_real_configs["panos_set_cli_examples.txt"]
        assert clean_vendor_registry.get("cisco").detect_confidence(raw) == 0.0
        assert clean_vendor_registry.get("juniper").detect_confidence(raw) == 0.0
        assert clean_vendor_registry.get("fortinet").detect_confidence(raw) == 0.0
        assert clean_vendor_registry.get("arista").detect_confidence(raw) == 0.0


# ==============================================================================
# 6. VENDOR ISOLATION (NON-PALOALTO CSM REJECTION)
# ==============================================================================

class TestPaloAltoVendorIsolation:
    """Verifies that PaloAltoBaselineEvaluator rejects non-Palo Alto CSMs."""

    def test_evaluator_rejects_cisco_csm(self):
        cisco_csm = {"device": {"vendor": "cisco", "platform": "IOS-XE"}}
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        results = evaluator.evaluate(cisco_csm)
        for r in results:
            assert r.status == ComplianceStatus.NOT_ASSESSED
            assert "Vendor isolation" in r.reason

    def test_evaluator_rejects_fortinet_csm(self):
        forti_csm = {"device": {"vendor": "fortinet", "platform": "FortiOS"}}
        evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
        results = evaluator.evaluate(forti_csm)
        for r in results:
            assert r.status == ComplianceStatus.NOT_ASSESSED


# ==============================================================================
# 7. END-TO-END API INGESTION
# ==============================================================================

class TestPaloAltoApiIngestion:
    """Verifies /api/audit/upload end-to-end with Palo Alto configurations."""

    def test_api_upload_paloalto_explicit(self, tmp_path, monkeypatch, sample_panos_secure):
        test_db = tmp_path / "test_api_pa_explicit.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin", "admin", "uploader", False)
        client = TestClient(app)

        resp = client.post(
            "/api/audit/upload",
            data={"raw_config": sample_panos_secure, "vendor": "paloalto"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["vendor"] == "paloalto"
        assert data["device_hostname"] == "PA-VM-SECURE"
        assert data["platform"] == "PAN-OS"
        assert data["summary"]["total"] == 10
        assert data["summary"]["pass"] == 10

    def test_api_upload_paloalto_auto_detect(self, tmp_path, monkeypatch, panos_real_configs):
        test_db = tmp_path / "test_api_pa_auto.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin", "admin", "uploader", False)
        client = TestClient(app)

        raw = panos_real_configs["panos_set_cli_examples.txt"]
        resp = client.post(
            "/api/audit/upload",
            data={"raw_config": raw, "vendor": "auto"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["vendor"] == "paloalto"
        assert data["summary"]["total"] == 10


# ==============================================================================
# 8. PRODUCTION DATABASE IMMUTABILITY
# ==============================================================================

class TestPaloAltoProductionDbImmutability:
    """Verifies production database data/auditor.db is never touched by Palo Alto testing."""

    def test_production_db_remains_untouched(self, sample_panos_secure):
        prod_db = pathlib.Path("data/auditor.db")
        if prod_db.exists():
            stat_before = prod_db.stat()
            csm = paloalto_auditor.parse_panos(sample_panos_secure)
            evaluator = paloalto_auditor.PaloAltoBaselineEvaluator()
            _ = evaluator.evaluate(csm)
            stat_after = prod_db.stat()
            assert stat_before.st_mtime == stat_after.st_mtime
            assert stat_before.st_size == stat_after.st_size
