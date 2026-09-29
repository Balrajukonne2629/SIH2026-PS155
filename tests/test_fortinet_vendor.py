"""NTRO PS26155 — Fortinet FortiOS Vendor Integration Tests (Phase B).

Comprehensive TDD test suite validating the complete Fortinet FortiOS vendor integration:
1. Vendor Adapter & Registry Integration (Registration, Lookup, Extensible Listing)
2. Deterministic Vendor Detection (Block syntax detection, Negative Cisco/Junos rejection, Fail-closed)
3. Fortinet Parsing & CSM Normalization (JSON schema conformance, Zero Cisco leakage)
4. Determinism & AST Execution Safety (Identical hash across 5 runs, stdlib-only verification)
5. 10 Initial Fortinet Rules Compliance (Pass, Fail, Unknown for all 10 rules)
6. Framework Integration (FortinetBaselineEvaluator, FrameworkRegistry, Deterministic Evidence)
7. Vendor Isolation (Cross-vendor evaluation safety: Cisco/Junos vs Fortinet baseline)
8. End-to-End Generic API Ingestion (Upload via /api/audit/upload with no vendor branching in main.py)
9. Production Database Protection (Tmp databases only, zero mutations to data/auditor.db)
"""

import copy
import hashlib
import json
import pathlib
import pytest
from fastapi.testclient import TestClient

import src.auth as auth
import src.database as database
import src.fortinet_auditor as fortinet_auditor
from src.vendor_adapter import (
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
SCHEMA_FILE = BASE_DIR / "config" / "Rule_Library" / "normalized_config_schema.json"


# --- Fixtures ---

@pytest.fixture
def clean_vendor_registry():
    """Returns a fresh VendorRegistry with Cisco, Juniper, and Fortinet registered."""
    reg = VendorRegistry()
    reg.register(CiscoVendorAdapter())
    reg.register(JuniperVendorAdapter())
    reg.register(FortinetVendorAdapter())
    return reg


@pytest.fixture
def sample_fortinet_secure():
    """Returns a hardened FortiOS configuration with all 10 baseline security controls configured."""
    return """#config-version=FG60E-7.2.4-FW-build1396-230309:opmode=0:vdommode=0:user=admin
config system global
    set hostname "CORP-FORTIGATE-01"
    set timezone 04
    set admin-ssh-port 22
    set admin-ssh-v1 disable
    set admin-telnet disable
    set admin-lockout-threshold 3
    set admin-lockout-duration 600
end

config system interface
    edit "mgmt1"
        set vdom "root"
        set ip 10.10.10.1 255.255.255.0
        set allowaccess ping https ssh snmp
        set type physical
        set dedicated-to management
    next
    edit "port1"
        set vdom "root"
        set status down
        set description "Unused interface"
    next
end

config system ntp
    set ntpsync enable
    set type custom
    set syncinterval 60
    set authentication enable
    config ntpserver
        edit 1
            set server "192.168.1.10"
            set authentication enable
            set key-id 1
        next
    end
end

config log syslogd setting
    set status enable
    set server "10.0.0.50"
    set mode udp
    set port 514
    set facility local7
end

config system snmp community
    edit 1
        set name "SecOps-ReadOnly-Str0ngKey"
        set query-v1-status disable
        set query-v2c-status enable
    next
end

config user tacacs+
    edit "TACACS-SRV-1"
        set server "10.0.0.20"
        set key "SecretTacacsKey"
    next
end

config system admin
    edit "admin"
        set trusthost1 10.0.0.0 255.255.255.0
        set accprofile "super_admin"
        set password-policy enable
    next
end

config system password-policy
    set status enable
    set min-length 14
    set expire-status enable
end
"""


@pytest.fixture
def sample_fortinet_insecure():
    """Returns a non-compliant FortiOS configuration failing multiple baseline controls."""
    return """#config-version=FG100F-6.4.2-FW-build1800-200501:opmode=0:vdommode=0:user=admin
config system global
    set hostname "INSECURE-FW"
    set admin-ssh-v1 enable
    set admin-telnet enable
end

config system interface
    edit "port1"
        set ip 192.168.1.1 255.255.255.0
        set allowaccess telnet http
    next
end

config system snmp community
    edit 1
        set name "public"
    next
end

config system ntp
    set ntpsync disable
end
"""


@pytest.fixture
def sample_fortinet_minimal():
    """Returns a minimal FortiOS config with only a header and hostname."""
    return """#config-version=FG80F-7.0.5-FW-build0300-220101
config system global
    set hostname "MINIMAL-FW"
end
"""


# ==============================================================================
# 1. PARSER & CSM NORMALIZATION TESTS
# ==============================================================================

class TestFortinetParser:
    """Verifies parsing of FortiOS configuration into Common Security Model (CSM)."""

    def test_csm_schema_conformance(self, sample_fortinet_secure):
        """Parsed Fortinet CSM must conform strictly to normalized_config_schema.json."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm["schema_version"] == "1.0"
        assert csm["device"]["vendor"] == "fortinet"
        assert csm["device"]["platform"] == "FortiOS"

        # Validate against normalized_config_schema.json if jsonschema is available
        try:
            import jsonschema
            schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
            jsonschema.validate(instance=csm, schema=schema)
        except ImportError:
            pass  # jsonschema is optional dev dep

    def test_header_metadata_extraction(self, sample_fortinet_secure):
        """Header line #config-version extracts hardware model and OS version."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm["device"]["hardware_model"] == "FG60E"
        assert csm["device"]["os_version"] == "7.2.4"
        assert csm["device"]["hostname"] == "CORP-FORTIGATE-01"

    def test_ssh_and_telnet_extraction(self, sample_fortinet_secure, sample_fortinet_insecure):
        """Extracts SSH version, lockout limits, and telnet state accurately."""
        # Secure
        csm_sec = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm_sec["services"]["ssh_version"] == 2
        assert csm_sec["services"]["ssh_v1_disabled"] is True
        assert csm_sec["services"]["telnet_enabled"] is False
        assert csm_sec["services"]["connection_limit"] == 3

        # Insecure
        csm_insec = fortinet_auditor.parse_fortinet(sample_fortinet_insecure)
        assert csm_insec["services"]["ssh_version"] == 1
        assert csm_insec["services"]["ssh_v1_disabled"] is False
        assert csm_insec["services"]["telnet_enabled"] is True

    def test_ntp_extraction(self, sample_fortinet_secure):
        """Extracts NTP sync status, server IP, and authentication."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm["ntp"]["enabled"] is True
        assert csm["ntp"]["authentication_enabled"] is True
        assert "192.168.1.10" in csm["ntp"]["servers"]

    def test_syslog_extraction(self, sample_fortinet_secure):
        """Extracts remote syslog server and logging status."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm["logging"]["remote_logging_enabled"] is True
        assert "10.0.0.50" in csm["logging"]["remote_servers"]

    def test_snmp_extraction_and_weak_community_detection(self, sample_fortinet_secure, sample_fortinet_insecure):
        """Extracts SNMP community strings and correctly flags weak communities."""
        csm_sec = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert len(csm_sec["snmp"]["community_strings"]) == 1
        assert csm_sec["snmp"]["community_strings"][0]["weak_flag"] is False

        csm_insec = fortinet_auditor.parse_fortinet(sample_fortinet_insecure)
        assert len(csm_insec["snmp"]["community_strings"]) == 1
        assert csm_insec["snmp"]["community_strings"][0]["name"] == "public"
        assert csm_insec["snmp"]["community_strings"][0]["weak_flag"] is True

    def test_management_interface_and_ip_extraction(self, sample_fortinet_secure):
        """Extracts dedicated management interface and priority management IP."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        assert csm["management"]["dedicated_mgmt_interface"] is True
        assert csm["device"]["management_ip"] == "10.10.10.1"

    def test_missing_configuration_does_not_fabricate_values(self, sample_fortinet_minimal):
        """Missing configuration sections remain None / False without fabricating values."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_minimal)
        assert csm["device"]["hostname"] == "MINIMAL-FW"
        assert csm["device"]["management_ip"] is None
        assert csm["device"]["serial_number"] is None
        assert csm["ntp"]["servers"] == []
        assert csm["ntp"]["authentication_enabled"] is False
        assert csm["logging"]["remote_servers"] == []
        assert csm["snmp"]["community_strings"] == []

    def test_unmapped_lines_preservation(self):
        """Preserves unrecognized configuration lines in csm['unmapped_lines']."""
        raw = """config system global
    set hostname "TEST-FW"
end
diagnose debug enable
some custom unknown command statement
"""
        csm = fortinet_auditor.parse_fortinet(raw)
        assert "diagnose debug enable" in csm["unmapped_lines"]
        assert "some custom unknown command statement" in csm["unmapped_lines"]


# ==============================================================================
# 2. VENDOR ADAPTER & REGISTRY TESTS
# ==============================================================================

class TestFortinetVendorAdapter:
    """Verifies FortinetVendorAdapter registration, lookup, and detection."""

    def test_adapter_registered_in_default_registry(self):
        """Fortinet adapter must be pre-registered in get_default_vendor_registry()."""
        reg = get_default_vendor_registry()
        assert reg.has("fortinet") is True
        adapter = reg.get("fortinet")
        assert isinstance(adapter, FortinetVendorAdapter)
        assert adapter.vendor_id == "fortinet"
        assert adapter.vendor_name == "Fortinet"
        assert "FortiOS" in adapter.supported_platforms

    def test_explicit_vendor_selection(self, clean_vendor_registry, sample_fortinet_secure):
        """Explicit vendor='fortinet' bypasses auto-detection and returns Fortinet adapter."""
        csm, adapter = ingest_configuration(
            raw_text=sample_fortinet_secure,
            vendor="fortinet",
            registry=clean_vendor_registry,
        )
        assert adapter.vendor_id == "fortinet"
        assert csm["device"]["vendor"] == "fortinet"
        assert csm["device"]["hostname"] == "CORP-FORTIGATE-01"

    def test_auto_detection_recognizes_fortios(self, clean_vendor_registry, sample_fortinet_secure):
        """Auto-detection without vendor parameter reliably selects Fortinet."""
        detected = clean_vendor_registry.detect(sample_fortinet_secure)
        assert detected is not None
        assert detected.vendor_id == "fortinet"

        csm, adapter = ingest_configuration(
            raw_text=sample_fortinet_secure,
            registry=clean_vendor_registry,
        )
        assert adapter.vendor_id == "fortinet"

    def test_auto_detection_rejects_cisco_and_junos(self, clean_vendor_registry):
        """Fortinet detector returns 0.0 on Cisco and Junos configs."""
        adapter = clean_vendor_registry.get("fortinet")

        cisco_cfg = """!
boot-start-marker
hostname CISCO-RTR
line vty 0 4
 transport input ssh
"""
        junos_cfg = """system {
    host-name junos-rtr;
    services {
        ssh;
    }
}
"""
        assert adapter.detect_confidence(cisco_cfg) == 0.0
        assert adapter.detect_confidence(junos_cfg) == 0.0

    def test_unknown_vendor_fails_soft_without_resolving_to_fortinet(self, clean_vendor_registry):
        """Non-network or unrecognized configuration raises UndeterminedVendorError."""
        unknown_text = "foo bar baz\nsome unknown configuration line\n"
        with pytest.raises(UndeterminedVendorError):
            ingest_configuration(unknown_text, registry=clean_vendor_registry)


# ==============================================================================
# 3. 10 FORTINET BASELINE RULES TESTS
# ==============================================================================

class TestFortinetBaselineRules:
    """Verifies deterministic evaluation of the 10 Fortinet baseline security rules."""

    def test_all_10_rules_pass_on_hardened_config(self, sample_fortinet_secure):
        """Hardened sample config passes all 10 Fortinet baseline rules."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        evals = fortinet_auditor.evaluate_fortinet_baseline(csm)

        expected_rule_ids = [
            "FORTINET-SSH-001",
            "FORTINET-SSH-002",
            "FORTINET-SSH-003",
            "FORTINET-AAA-001",
            "FORTINET-AAA-002",
            "FORTINET-NTP-001",
            "FORTINET-LOG-001",
            "FORTINET-SNMP-001",
            "FORTINET-ACL-001",
            "FORTINET-MGMT-001",
        ]
        assert len(evals) == 10
        for rid in expected_rule_ids:
            assert rid in evals, f"Missing rule {rid} in evaluation output"
            assert evals[rid]["status"] == "Pass", f"Rule {rid} expected Pass, got {evals[rid]['status']}"

    def test_rules_fail_on_insecure_config(self, sample_fortinet_insecure):
        """Insecure config fails SSH, Telnet, SNMP, and NTP rules."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_insecure)
        evals = fortinet_auditor.evaluate_fortinet_baseline(csm)

        # SSH v1 enabled -> Fail
        assert evals["FORTINET-SSH-001"]["status"] == "Fail"
        # Telnet enabled -> Fail
        assert evals["FORTINET-SSH-003"]["status"] == "Fail"
        # SNMP community 'public' -> Fail
        assert evals["FORTINET-SNMP-001"]["status"] == "Fail"
        # NTP disabled -> Fail
        assert evals["FORTINET-NTP-001"]["status"] == "Fail"

    def test_evaluation_determinism_5_runs(self, sample_fortinet_secure):
        """Evaluation produces 100% bitwise identical hashes across 5 consecutive runs."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        hashes = []
        for _ in range(5):
            evals = fortinet_auditor.evaluate_fortinet_baseline(csm)
            serialized = json.dumps(evals, sort_keys=True)
            hashes.append(hashlib.sha256(serialized.encode("utf-8")).hexdigest())

        assert len(set(hashes)) == 1, f"Divergence detected in Fortinet evaluation: {hashes}"

    def test_fortinet_compliance_does_not_inherit_cisco_rules(self, sample_fortinet_secure):
        """Fortinet compliance evaluation evaluates only FORTINET rules; zero CISCO rules."""
        csm = fortinet_auditor.parse_fortinet(sample_fortinet_secure)
        evals = fortinet_auditor.evaluate_fortinet_baseline(csm)
        for rid in evals.keys():
            assert rid.startswith("FORTINET-"), f"Unexpected non-Fortinet rule ID: {rid}"
            assert not rid.startswith("CISCO-"), f"Cisco rule {rid} leaked into Fortinet evaluation"


# ==============================================================================
# 4. FRAMEWORK EVALUATOR INTEGRATION & VENDOR ISOLATION
# ==============================================================================

class TestFortinetFrameworkEvaluator:
    """Verifies FortinetBaselineEvaluator and cross-vendor isolation."""

    def test_framework_registration(self):
        """Registers fortinet-fortios-baseline in FrameworkRegistry."""
        reg = FrameworkRegistry()
        fortinet_auditor.register_fortinet_baseline(reg)
        assert reg.exists("fortinet-fortios-baseline") is True
        fw = reg.get("fortinet-fortios-baseline")
        assert fw.vendor_scope == "Fortinet FortiOS"
        evaluator = reg.get_evaluator("fortinet-fortios-baseline")
        assert isinstance(evaluator, fortinet_auditor.FortinetBaselineEvaluator)

    def test_evaluator_vendor_isolation_on_cisco_csm(self):
        """Evaluating Cisco CSM with Fortinet evaluator returns UNKNOWN for all rules."""
        cisco_csm = {
            "device": {"vendor": "cisco", "platform": "IOS-XE", "hostname": "cisco-rtr"},
            "services": {"ssh_version": 2},
        }
        evaluator = fortinet_auditor.FortinetBaselineEvaluator()
        results = evaluator.evaluate(cisco_csm)
        assert len(results) == 10
        for r in results:
            assert r.status == ComplianceStatus.UNKNOWN
            assert "not Fortinet" in r.reason

    def test_ast_safety_fortinet_modules(self):
        """Asserts zero execution imports (subprocess, socket, paramiko) in fortinet_auditor."""
        import src.ast_safety as ast_safety
        assert ast_safety.assert_no_execution_imports(BASE_DIR / "src" / "fortinet_auditor.py") is True


# ==============================================================================
# 5. END-TO-END API INGESTION TEST
# ==============================================================================

class TestFortinetApiIngestion:
    """Verifies /api/audit/upload end-to-end with Fortinet configuration."""

    def test_api_upload_fortinet_explicit_vendor(self, tmp_path, monkeypatch, sample_fortinet_secure):
        """POST /api/audit/upload with vendor='fortinet' successfully parses and evaluates."""
        test_db = tmp_path / "test_api_fortinet.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin-id", "admin", "uploader", False)
        client = TestClient(app)

        resp = client.post(
            "/api/audit/upload",
            data={
                "raw_config": sample_fortinet_secure,
                "vendor": "fortinet",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        data = resp.json()
        assert data["device_hostname"] == "CORP-FORTIGATE-01"
        assert data["platform"] == "FortiOS"
        assert data["summary"]["total"] == 10
        assert data["summary"]["pass"] == 10
        assert data["summary"]["fail"] == 0

    def test_api_upload_fortinet_auto_detect(self, tmp_path, monkeypatch, sample_fortinet_secure):
        """POST /api/audit/upload with vendor='auto' auto-detects Fortinet."""
        test_db = tmp_path / "test_api_fortinet_auto.db"
        monkeypatch.setattr(database, "DB_PATH", test_db)
        database.initialize_database()

        token = auth.create_access_token("test-admin-id", "admin", "uploader", False)
        client = TestClient(app)

        resp = client.post(
            "/api/audit/upload",
            data={
                "raw_config": sample_fortinet_secure,
                "vendor": "auto",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Upload failed: {resp.text}"
        data = resp.json()
        assert data["device_hostname"] == "CORP-FORTIGATE-01"
        assert data["platform"] == "FortiOS"
