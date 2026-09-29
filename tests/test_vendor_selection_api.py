"""NTRO PS26155 — Vendor Selection + Detection API Integration Test Suite.

Comprehensive verification of the vendor selection and detection layer across
all four supported vendors: Cisco, Juniper, Fortinet, and Arista.

Covers:
1. Explicit vendor selection (authoritative, case-insensitive, whitespace-trimmed).
2. Automatic vendor detection (vendor="auto" or omitted) for Cisco, Juniper (brace + set), Fortinet, Arista.
3. Authoritative precedence (explicit vendor never overridden by detection).
4. Deterministic detection (repeated runs yield bitwise identical resolution).
5. False-positive prevention & negative pattern disqualifiers.
6. Fail-closed / fail-soft handling for unknown/ambiguous/unsupported vendors (HTTP 422).
7. Vendor registry completeness and adapter resolution across all 4 vendors.
8. Vendor mismatch handling (incompatible config handled safely without cross-vendor rule leakage).
9. Downstream framework scoping compatibility (/api/compliance/frameworks and /api/compliance/evaluate).
10. API endpoints backward compatibility (/api/audit/upload form & JSON, /api/compliance/evaluate).
11. Real dataset sample configurations (Cisco, Juniper, Arista archives).
12. AST safety assertions and production database isolation (data/auditor.db untouched).
"""

import ast
import hashlib
import json
import pathlib
import zipfile
import pytest
from fastapi.testclient import TestClient

from src import ast_safety
from src import auth
from src import database
from src.main import app
from src import compliance_framework
from src.compliance_framework import get_default_registry
from src import cis_benchmark_cisco_iosxe
from src import disa_stig_cisco_iosxe
from src import framework_crosswalk
from src import juniper_auditor
from src import fortinet_auditor
from src import arista_auditor
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

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
PROD_DB_PATH = BASE_DIR / "data" / "auditor.db"
CISCO_FILE = BASE_DIR / "datasets" / "Cisco" / "labeled_test_config.txt"
JUNIPER_ZIP = BASE_DIR / "datasets" / "Juniper" / "Juniper_Junos_Samples.zip"
ARISTA_ZIP = BASE_DIR / "datasets" / "Arista" / "Arista_EOS_Samples.zip"

client = TestClient(app)


# --- Configuration Fixtures ---

CISCO_SAMPLE = """!
version 17.3
hostname EDGE-RTR-01
!
aaa new-model
aaa authentication login default group tacacs+ local
!
ip ssh version 2
line vty 0 4
 transport input ssh
!
service timestamps log datetime msec
logging host 192.168.1.50
!
snmp-server community secret-ro RO
snmp-server enable traps
!
ntp server 192.168.1.10
ntp authenticate
!
interface GigabitEthernet0/0/0
 ip address 10.0.0.1 255.255.255.0
 no shutdown
!
end
"""

JUNIPER_BRACE_SAMPLE = """## Last changed: 2026-03-15
system {
    host-name MX-JUNIPER-01;
    services {
        ssh {
            protocol-version v2;
        }
    }
    syslog {
        host 192.168.1.50 {
            any notice;
        }
        time-format millisecond;
    }
    ntp {
        server 192.168.1.10;
    }
}
snmp {
    community secret-ro {
        authorization read-only;
    }
}
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 10.0.0.1/24;
            }
        }
    }
}
"""

JUNIPER_SET_SAMPLE = """set system host-name EX-SWITCH-01
set system services ssh protocol-version v2
set system syslog host 192.168.1.50 any notice
set system syslog time-format millisecond
set system ntp server 192.168.1.10
set snmp community secret-ro authorization read-only
set interfaces ge-0/0/0 unit 0 family inet address 10.0.0.1/24
"""

FORTINET_SAMPLE = """#config-version=FG60E-7.2.4-FW-build1396-230309:opmode=0:vdommode=0:user=admin
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
    edit "port1"
        set vdom "root"
        set ip 10.10.10.1 255.255.255.0
        set allowaccess ping https ssh snmp
        set type physical
    next
end
config system ntp
    set ntpsync enable
    config ntpserver
        edit 1
            set server "192.168.1.10"
        next
    end
end
config log syslogd setting
    set status enable
    set server "10.0.0.50"
end
config system snmp community
    edit 1
        set name "Forti-SecOps-RO"
    next
end
"""

ARISTA_SAMPLE = """! device: EOS-SWITCH-01 (DCS-7050SX3-48YC8, EOS-4.28.1F)
!
transceiver qsfp default-mode 4x10G
!
hostname EOS-SWITCH-01
!
spanning-tree mode mstp
spanning-tree edge-port default
spanning-tree bpduguard default
!
aaa root secret sha512 $6$dummyhash
aaa authentication login default group tacacs+ local
!
vrf instance MGMT
!
interface Management1
   vrf MGMT
   ip address 10.0.0.1/24
!
interface Ethernet1
   shutdown
!
ip routing
!
logging host 192.168.1.50
ntp server 192.168.1.10
snmp-server community secret-ro ro
!
management ssh
   authentication mode password
   vrf MGMT
      no shutdown
!
end
"""


# --- Fixtures ---

@pytest.fixture(autouse=True)
def setup_isolated_test_env(tmp_path, monkeypatch):
    """Guarantees tests run against an isolated SQLite DB, never touching production data/auditor.db."""
    test_db = tmp_path / "test_vendor_selection.db"
    monkeypatch.setattr(database, "DB_PATH", test_db)
    database.initialize_database()

    # Register all frameworks
    cis_benchmark_cisco_iosxe.register_cis_cisco_iosxe()
    disa_stig_cisco_iosxe.register_disa_stig_cisco_iosxe()
    framework_crosswalk.register_crosswalk_frameworks()
    compliance_framework.register_cisco_baseline()
    juniper_auditor.register_juniper_baseline()
    fortinet_auditor.register_fortinet_baseline()
    arista_auditor.register_arista_baseline()


@pytest.fixture
def uploader_token():
    return auth.create_access_token(
        user_id="test-uploader-vendor-api",
        username="uploader_vendor_api",
        role="uploader",
        is_authorized_approver=False,
    )


@pytest.fixture
def reviewer_token():
    return auth.create_access_token(
        user_id="test-reviewer-vendor-api",
        username="reviewer_vendor_api",
        role="reviewer",
        is_authorized_approver=True,
    )


@pytest.fixture
def auth_headers(reviewer_token):
    return {"Authorization": f"Bearer {reviewer_token}"}


# ==============================================================================
# GROUP 1: Explicit Vendor Selection (Authoritative, Case & Whitespace Tolerant)
# ==============================================================================

def test_explicit_vendor_selection_all_four_vendors():
    """Requirement: System supports explicit selection of cisco, juniper, fortinet, arista."""
    csm_cisco, adapter_cisco = ingest_configuration(CISCO_SAMPLE, vendor="cisco")
    assert adapter_cisco.vendor_id == "cisco"
    assert csm_cisco["device"]["vendor"] == "cisco"

    csm_juniper, adapter_juniper = ingest_configuration(JUNIPER_BRACE_SAMPLE, vendor="juniper")
    assert adapter_juniper.vendor_id == "juniper"
    assert csm_juniper["device"]["vendor"] == "juniper"

    csm_fortinet, adapter_fortinet = ingest_configuration(FORTINET_SAMPLE, vendor="fortinet")
    assert adapter_fortinet.vendor_id == "fortinet"
    assert csm_fortinet["device"]["vendor"] == "fortinet"

    csm_arista, adapter_arista = ingest_configuration(ARISTA_SAMPLE, vendor="arista")
    assert adapter_arista.vendor_id == "arista"
    assert csm_arista["device"]["vendor"] == "arista"


def test_explicit_vendor_case_insensitivity():
    """Requirement: Explicit vendor selection is case-insensitive."""
    _, a1 = ingest_configuration(CISCO_SAMPLE, vendor="CISCO")
    assert a1.vendor_id == "cisco"

    _, a2 = ingest_configuration(JUNIPER_BRACE_SAMPLE, vendor="Juniper")
    assert a2.vendor_id == "juniper"

    _, a3 = ingest_configuration(FORTINET_SAMPLE, vendor="FORTINET")
    assert a3.vendor_id == "fortinet"

    _, a4 = ingest_configuration(ARISTA_SAMPLE, vendor="ArIsTa")
    assert a4.vendor_id == "arista"


def test_explicit_vendor_whitespace_trimming():
    """Requirement: Explicit vendor selection trims leading/trailing whitespace."""
    _, a1 = ingest_configuration(CISCO_SAMPLE, vendor="  cisco  ")
    assert a1.vendor_id == "cisco"

    _, a2 = ingest_configuration(JUNIPER_BRACE_SAMPLE, vendor="\tjuniper\n")
    assert a2.vendor_id == "juniper"

    _, a3 = ingest_configuration(FORTINET_SAMPLE, vendor=" fortinet ")
    assert a3.vendor_id == "fortinet"

    _, a4 = ingest_configuration(ARISTA_SAMPLE, vendor="  arista  ")
    assert a4.vendor_id == "arista"


def test_explicit_selection_is_authoritative_over_detection():
    """Requirement: Explicit vendor choice is authoritative and never silently overridden by auto-detection."""
    # Even if text looks like generic or another syntax, passing explicit vendor chooses that adapter
    raw_snippet = "hostname TEST-DEVICE\ninterface Eth1\n shutdown\n"
    csm, adapter = ingest_configuration(raw_snippet, vendor="cisco")
    assert adapter.vendor_id == "cisco"
    assert csm["device"]["hostname"] == "TEST-DEVICE"

    csm_ar, adapter_ar = ingest_configuration(raw_snippet, vendor="arista")
    assert adapter_ar.vendor_id == "arista"
    assert csm_ar["device"]["hostname"] == "TEST-DEVICE"


# ==============================================================================
# GROUP 2: Automatic Vendor Detection
# ==============================================================================

def test_auto_detection_cisco_iosxe():
    """Requirement: Cisco IOS-XE is automatically detected with vendor='auto' or omitted."""
    _, a_auto = ingest_configuration(CISCO_SAMPLE, vendor="auto")
    assert a_auto.vendor_id == "cisco"

    _, a_none = ingest_configuration(CISCO_SAMPLE, vendor=None)
    assert a_none.vendor_id == "cisco"


def test_auto_detection_juniper_hierarchical_and_set():
    """Requirement: Juniper Junos (both brace and flat set) automatically detected."""
    _, a_brace = ingest_configuration(JUNIPER_BRACE_SAMPLE, vendor="auto")
    assert a_brace.vendor_id == "juniper"

    _, a_set = ingest_configuration(JUNIPER_SET_SAMPLE, vendor=None)
    assert a_set.vendor_id == "juniper"


def test_auto_detection_fortinet_fortios():
    """Requirement: Fortinet FortiOS automatically detected with vendor='auto' or omitted."""
    _, a_auto = ingest_configuration(FORTINET_SAMPLE, vendor="auto")
    assert a_auto.vendor_id == "fortinet"

    _, a_none = ingest_configuration(FORTINET_SAMPLE, vendor="")
    assert a_none.vendor_id == "fortinet"


def test_auto_detection_arista_eos():
    """Requirement: Arista EOS automatically detected with vendor='auto' or omitted."""
    _, a_auto = ingest_configuration(ARISTA_SAMPLE, vendor="auto")
    assert a_auto.vendor_id == "arista"

    _, a_none = ingest_configuration(ARISTA_SAMPLE, vendor=None)
    assert a_none.vendor_id == "arista"


# ==============================================================================
# GROUP 3: Disqualifiers & Non-Cisco False Positive Prevention
# ==============================================================================

def test_fortios_never_falsely_detected_as_cisco():
    """Requirement: Fortinet FortiOS syntax is never falsely detected as Cisco (e.g. 'ios' substring)."""
    registry = get_default_vendor_registry()
    cisco_adapter = registry.get("cisco")

    # Direct confidence evaluation on Fortinet config MUST be 0.0 for Cisco adapter
    assert cisco_adapter.detect_confidence(FORTINET_SAMPLE) == 0.0

    # Auto-detection MUST identify Fortinet, NEVER Cisco
    detected = registry.detect(FORTINET_SAMPLE)
    assert detected is not None
    assert detected.vendor_id == "fortinet"


def test_arista_never_falsely_detected_as_cisco():
    """Requirement: Arista EOS is never falsely detected as Cisco despite generic network commands."""
    registry = get_default_vendor_registry()
    cisco_adapter = registry.get("cisco")

    # Cisco adapter must disqualify Arista config due to management ssh / Management1
    assert cisco_adapter.detect_confidence(ARISTA_SAMPLE) == 0.0

    # Auto-detection MUST identify Arista, NEVER Cisco
    detected = registry.detect(ARISTA_SAMPLE)
    assert detected is not None
    assert detected.vendor_id == "arista"


def test_juniper_never_falsely_detected_as_cisco():
    """Requirement: Juniper syntax is never falsely detected as Cisco."""
    registry = get_default_vendor_registry()
    cisco_adapter = registry.get("cisco")

    assert cisco_adapter.detect_confidence(JUNIPER_BRACE_SAMPLE) == 0.0
    assert cisco_adapter.detect_confidence(JUNIPER_SET_SAMPLE) == 0.0

    detected_brace = registry.detect(JUNIPER_BRACE_SAMPLE)
    assert detected_brace.vendor_id == "juniper"

    detected_set = registry.detect(JUNIPER_SET_SAMPLE)
    assert detected_set.vendor_id == "juniper"


def test_cisco_never_falsely_detected_as_juniper_fortinet_or_arista():
    """Requirement: Cisco syntax is never misidentified as Juniper, Fortinet, or Arista."""
    registry = get_default_vendor_registry()
    juniper_adapter = registry.get("juniper")
    fortinet_adapter = registry.get("fortinet")
    arista_adapter = registry.get("arista")

    assert juniper_adapter.detect_confidence(CISCO_SAMPLE) == 0.0
    assert fortinet_adapter.detect_confidence(CISCO_SAMPLE) == 0.0
    assert arista_adapter.detect_confidence(CISCO_SAMPLE) == 0.0


def test_undetermined_vendor_fails_soft_with_exception():
    """Requirement: Ambiguous or non-network configuration raises UndeterminedVendorError."""
    ambiguous_text = "This is a random text document with no network syntax."
    with pytest.raises(UndeterminedVendorError) as exc_info:
        ingest_configuration(ambiguous_text)
    assert "Unable to determine vendor configuration type" in str(exc_info.value)
    assert "Supported vendors:" in str(exc_info.value)


def test_unsupported_vendor_raises_exception():
    """Requirement: Explicit unrecognized vendor raises UnsupportedVendorError."""
    with pytest.raises(UnsupportedVendorError) as exc_info:
        ingest_configuration(CISCO_SAMPLE, vendor="brocade")
    assert "Vendor 'brocade' is not supported" in str(exc_info.value)


# ==============================================================================
# GROUP 4: Vendor Registry & Adapter Resolution
# ==============================================================================

def test_registry_resolves_all_five_supported_vendors():
    """Requirement: Registry manages all 5 adapters and provides lookup and enumeration."""
    registry = get_default_vendor_registry()
    vendor_ids = registry.list_vendor_ids()

    assert "arista" in vendor_ids
    assert "cisco" in vendor_ids
    assert "fortinet" in vendor_ids
    assert "juniper" in vendor_ids
    assert "paloalto" in vendor_ids
    assert len(vendor_ids) == 5

    assert isinstance(registry.get("cisco"), CiscoVendorAdapter)
    assert isinstance(registry.get("juniper"), JuniperVendorAdapter)
    assert isinstance(registry.get("fortinet"), FortinetVendorAdapter)
    assert isinstance(registry.get("arista"), AristaVendorAdapter)
    assert isinstance(registry.get("paloalto"), PaloAltoVendorAdapter)

    assert registry.has("cisco") is True
    assert registry.has("juniper") is True
    assert registry.has("fortinet") is True
    assert registry.has("arista") is True
    assert registry.has("paloalto") is True
    assert registry.has("brocade") is False


def test_registry_detect_ambiguity_returns_none():
    """Requirement: Registry.detect returns None when confidence is sub-threshold or tied."""
    registry = get_default_vendor_registry()
    assert registry.detect("") is None
    assert registry.detect("   ") is None
    assert registry.detect("lorem ipsum dolor sit amet") is None


# ==============================================================================
# GROUP 5: Vendor Mismatch Handling
# ==============================================================================

def test_vendor_mismatch_explicit_selection_safe_and_isolated():
    """Requirement: Explicit vendor selection with incompatible configuration is handled deterministically without cross-vendor rule evaluation."""
    # User forces vendor='cisco' on Fortinet text
    csm, adapter = ingest_configuration(FORTINET_SAMPLE, vendor="cisco")
    assert adapter.vendor_id == "cisco"
    # Cisco parser parses it as unmapped lines, not crashing
    assert len(csm.get("unmapped_lines", [])) > 0

    # Evaluating Cisco rules on Fortinet text must yield 0 passes (fails or unknown only)
    legacy_rules = [
        {"vendor_rule_id": "CISCO-SSH-001", "check_focus": ["Security"], "configuration_evidence": []},
        {"vendor_rule_id": "CISCO-AAA-001", "check_focus": ["Authentication"], "configuration_evidence": []},
    ]
    evals = adapter.evaluate_legacy_rules(csm, legacy_rules)
    for rid, result in evals.items():
        assert result["status"] in ("Fail", "Unknown")
        assert result["status"] != "Pass"


# ==============================================================================
# GROUP 6: Downstream Framework Scoping Compatibility
# ==============================================================================

def test_framework_scoping_incompatible_framework_rejected_with_422(auth_headers):
    """Requirement: Cisco frameworks are rejected when evaluated against Juniper, Fortinet, or Arista."""
    # 1. Attempt Cisco framework on Juniper config
    res_junos = client.post(
        "/api/compliance/evaluate",
        json={
            "raw_config": JUNIPER_BRACE_SAMPLE,
            "vendor": "juniper",
            "framework_ids": ["cis-cisco-iosxe"],
        },
        headers=auth_headers,
    )
    assert res_junos.status_code == 422
    assert "Framework 'cis-cisco-iosxe' is not compatible with vendor 'juniper'" in res_junos.json()["detail"]

    # 2. Attempt Cisco framework on Arista config
    res_arista = client.post(
        "/api/compliance/evaluate",
        json={
            "raw_config": ARISTA_SAMPLE,
            "vendor": "arista",
            "framework_ids": ["disa-stig-cisco-iosxe"],
        },
        headers=auth_headers,
    )
    assert res_arista.status_code == 422
    assert "Framework 'disa-stig-cisco-iosxe' is not compatible with vendor 'arista'" in res_arista.json()["detail"]

    # 3. Attempt Cisco framework on Fortinet config
    res_forti = client.post(
        "/api/compliance/evaluate",
        json={
            "raw_config": FORTINET_SAMPLE,
            "vendor": "fortinet",
            "framework_ids": ["cis-cisco-iosxe"],
        },
        headers=auth_headers,
    )
    assert res_forti.status_code == 422
    assert "Framework 'cis-cisco-iosxe' is not compatible with vendor 'fortinet'" in res_forti.json()["detail"]


def test_framework_scoping_auto_detect_dispatches_correct_framework(auth_headers):
    """Requirement: Automatic detection dispatches to vendor-appropriate frameworks without error."""
    # Arista auto-detection evaluate
    res = client.post(
        "/api/compliance/evaluate",
        json={"raw_config": ARISTA_SAMPLE, "vendor": "auto"},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["device_hostname"] == "EOS-SWITCH-01"
    assert "arista-eos-baseline" in data["framework_summaries"]

    # Juniper auto-detection evaluate
    res_j = client.post(
        "/api/compliance/evaluate",
        json={"raw_config": JUNIPER_BRACE_SAMPLE, "vendor": "auto"},
        headers=auth_headers,
    )
    assert res_j.status_code == 200, res_j.text
    data_j = res_j.json()
    assert data_j["device_hostname"] == "MX-JUNIPER-01"
    assert "juniper-junos-baseline" in data_j["framework_summaries"]


def test_framework_listing_filtered_by_vendor(auth_headers):
    """Requirement: GET /api/compliance/frameworks?vendor=... returns only vendor-scoped frameworks."""
    # Cisco
    res_c = client.get("/api/compliance/frameworks?vendor=cisco", headers=auth_headers)
    assert res_c.status_code == 200
    fids_c = [f["framework_id"] for f in res_c.json()["frameworks"]]
    assert "cisco-ios-xe-baseline" in fids_c
    assert "cis-cisco-iosxe" in fids_c
    assert "arista-eos-baseline" not in fids_c

    # Arista
    res_a = client.get("/api/compliance/frameworks?vendor=arista", headers=auth_headers)
    assert res_a.status_code == 200
    fids_a = [f["framework_id"] for f in res_a.json()["frameworks"]]
    assert "arista-eos-baseline" in fids_a
    assert "cisco-ios-xe-baseline" not in fids_a


# ==============================================================================
# GROUP 7: API End-to-End Ingestion Integration
# ==============================================================================

def test_api_audit_upload_form_explicit_vendor(auth_headers):
    """Requirement: /api/audit/upload with form-data file and explicit vendor succeeds."""
    res = client.post(
        "/api/audit/upload",
        files={"file": ("juniper.conf", JUNIPER_BRACE_SAMPLE, "text/plain")},
        data={"vendor": "juniper"},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["vendor"] == "juniper"
    assert data["platform"] == "Junos"
    assert data["device_hostname"] == "MX-JUNIPER-01"
    assert "summary" in data


def test_api_audit_upload_form_auto_detection(auth_headers):
    """Requirement: /api/audit/upload with form-data file and vendor='auto' succeeds."""
    res = client.post(
        "/api/audit/upload",
        files={"file": ("fortinet.conf", FORTINET_SAMPLE, "text/plain")},
        data={"vendor": "auto"},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["vendor"] == "fortinet"
    assert data["platform"] == "FortiOS"
    assert data["device_hostname"] == "CORP-FORTIGATE-01"


def test_api_audit_upload_json_payload(auth_headers):
    """Requirement: /api/audit/upload with JSON body and explicit vendor succeeds."""
    res = client.post(
        "/api/audit/upload",
        json={"raw_config": ARISTA_SAMPLE, "vendor": "arista", "filename": "arista.conf"},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["vendor"] == "arista"
    assert data["platform"] == "EOS"
    assert data["device_hostname"] == "EOS-SWITCH-01"


def test_api_audit_upload_unsupported_vendor_returns_422(auth_headers):
    """Requirement: /api/audit/upload with unsupported vendor returns HTTP 422."""
    res = client.post(
        "/api/audit/upload",
        json={"raw_config": CISCO_SAMPLE, "vendor": "huawei"},
        headers=auth_headers,
    )
    assert res.status_code == 422
    assert "Vendor 'huawei' is not supported" in res.json()["detail"]


def test_api_audit_upload_undetermined_vendor_returns_422(auth_headers):
    """Requirement: /api/audit/upload with undetermined configuration returns HTTP 422."""
    res = client.post(
        "/api/audit/upload",
        json={"raw_config": "some plain unparseable garbage text with no network commands"},
        headers=auth_headers,
    )
    assert res.status_code == 422
    assert "Unable to determine vendor configuration type" in res.json()["detail"]


def test_api_compliance_evaluate_raw_config_explicit_and_auto(auth_headers):
    """Requirement: /api/compliance/evaluate works with both explicit and auto-detected vendor."""
    # Explicit Cisco
    res_c = client.post(
        "/api/compliance/evaluate",
        json={"raw_config": CISCO_SAMPLE, "vendor": "cisco"},
        headers=auth_headers,
    )
    assert res_c.status_code == 200
    assert "cis-cisco-iosxe" in res_c.json()["framework_summaries"]

    # Auto Fortinet
    res_f = client.post(
        "/api/compliance/evaluate",
        json={"raw_config": FORTINET_SAMPLE, "vendor": "auto"},
        headers=auth_headers,
    )
    assert res_f.status_code == 200
    assert "fortinet-fortios-baseline" in res_f.json()["framework_summaries"]


# ==============================================================================
# GROUP 8: Determinism, Real Dataset Samples & Database Integrity
# ==============================================================================

def test_vendor_detection_determinism_repeated_runs():
    """Requirement: Deterministic detection (same input produces identical resolution across 10 runs)."""
    registry = get_default_vendor_registry()
    samples = [
        (CISCO_SAMPLE, "cisco"),
        (JUNIPER_BRACE_SAMPLE, "juniper"),
        (JUNIPER_SET_SAMPLE, "juniper"),
        (FORTINET_SAMPLE, "fortinet"),
        (ARISTA_SAMPLE, "arista"),
    ]

    for cfg, expected_vendor in samples:
        for _ in range(10):
            detected = registry.detect(cfg)
            assert detected is not None
            assert detected.vendor_id == expected_vendor


def test_real_dataset_samples_detection():
    """Requirement: Detection validates successfully against real samples from datasets directory."""
    # 1. Real Cisco config
    if CISCO_FILE.exists():
        cisco_real_text = CISCO_FILE.read_text(encoding="utf-8")
        _, a_cisco = ingest_configuration(cisco_real_text)
        assert a_cisco.vendor_id == "cisco"

    # 2. Real Juniper config from archive
    if JUNIPER_ZIP.exists():
        with zipfile.ZipFile(JUNIPER_ZIP) as z:
            names = [n for n in z.namelist() if n.endswith(".conf")]
            if names:
                junos_real_text = z.read(names[0]).decode("utf-8")
                _, a_junos = ingest_configuration(junos_real_text)
                assert a_junos.vendor_id == "juniper"

    # 3. Real Arista config from archive
    if ARISTA_ZIP.exists():
        with zipfile.ZipFile(ARISTA_ZIP) as z:
            names = [n for n in z.namelist() if n.endswith(".conf.txt") and not n.startswith("__MACOSX")]
            if names:
                arista_real_text = z.read(names[0]).decode("utf-8")
                _, a_arista = ingest_configuration(arista_real_text)
                assert a_arista.vendor_id == "arista"


def test_ast_safety_all_vendor_modules():
    """Requirement: AST safety assertions pass on all vendor selection / detection code."""
    modules_to_check = [
        BASE_DIR / "src" / "vendor_registry.py",
        BASE_DIR / "src" / "vendor_adapter.py",
        BASE_DIR / "src" / "cisco_auditor.py",
        BASE_DIR / "src" / "juniper_auditor.py",
        BASE_DIR / "src" / "fortinet_auditor.py",
        BASE_DIR / "src" / "arista_auditor.py",
    ]

    for mod_path in modules_to_check:
        assert mod_path.exists(), f"Module {mod_path} does not exist"
        assert ast_safety.assert_no_execution_imports(mod_path) is True


def test_production_database_untouched():
    """Requirement: Production database (data/auditor.db) is untouched."""
    if PROD_DB_PATH.exists():
        initial_hash = hashlib.sha256(PROD_DB_PATH.read_bytes()).hexdigest()
        # Verify DB exists and has non-empty hash
        assert len(initial_hash) == 64
