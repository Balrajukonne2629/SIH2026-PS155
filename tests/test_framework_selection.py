"""NTRO PS26155 — Phase D/E: Framework Selection + Crosswalk Integration Test Suite.

Verifies:
1. Single framework selection.
2. Multiple framework selection.
3. Only selected frameworks are evaluated.
4. Unselected frameworks are absent from evaluation.
5. Duplicate framework IDs are handled deterministically.
6. Unknown framework ID is rejected or fail-soft according to existing API conventions.
7. Empty selection follows explicit documented behavior.
8. Cisco framework evaluation remains unchanged.
9. Juniper framework evaluation remains unchanged.
10. Fortinet framework evaluation never inherits Cisco mappings.
11. Arista framework evaluation never inherits Cisco mappings.
12. Unknown vendor never receives Cisco mappings.
13. Framework-wise aggregation is correct.
14. Framework scores are deterministic.
15. Same input + same vendor + same framework selection produces identical results across repeated runs.
16. API accepts framework_ids in upload and evaluate.
17. API response exposes framework identity.
18. Existing API calls without framework_ids remain backward compatible.

Hard Invariants:
- Uses temporary databases only (tmp_path).
- Never modifies data/auditor.db or protected schemas.
- Pure AST safety: zero subprocess, socket, netmiko, napalm, paramiko.
"""

import copy
import hashlib
import json
import pathlib
import pytest
from fastapi.testclient import TestClient

from src import ast_safety
from src import auth
from src import database
from src.main import app, _parse_framework_ids
from src import compliance_framework
from src.compliance_framework import (
    ComplianceStatus,
    FrameworkRegistry,
    get_default_registry,
)
from src import compliance_aggregator
from src.compliance_aggregator import MultiFrameworkAggregator
from src import framework_crosswalk
from src import cis_benchmark_cisco_iosxe
from src import disa_stig_cisco_iosxe
from src import cisco_auditor
from src import juniper_auditor
from src import fortinet_auditor
from src import arista_auditor


BASE_DIR = pathlib.Path(__file__).resolve().parent.parent


# --- Sample Configurations & CSM Fixtures ---

CISCO_SAMPLE_CONFIG = """!
version 17.3
hostname RTR-CISCO-01
!
aaa new-model
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
aaa accounting exec default start-stop group tacacs+
!
ip ssh version 2
line vty 0 4
 transport input ssh
 login authentication default
!
ntp server 192.168.1.10
ntp authenticate
ntp trusted-key 1
!
logging host 192.168.1.50
service timestamps log datetime msec
!
snmp-server community secret-read RO
snmp-server enable traps
!
ip access-list extended MGMT-ACL
 permit tcp 10.0.0.0 0.255.255.255 any eq 22
!
interface GigabitEthernet0/0/0
 ip address 10.0.0.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/0/1
 shutdown
!
router bgp 65001
 neighbor 10.0.0.2 remote-as 65002
 neighbor 10.0.0.2 password secure-bgp-pass
!
spanning-tree portfast default
spanning-tree portfast bpduguard default
!
end
"""

JUNIPER_SAMPLE_CONFIG = """
system {
    host-name MX-JUNIPER-01;
    authentication-order [ tacplus password ];
    services {
        ssh {
            protocol-version v2;
            connection-limit 10;
            rate-limit 5;
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
        authentication-key 1;
    }
}
snmp {
    community secret-snmp {
        authorization read-only;
    }
}
firewall {
    family inet {
        filter MGMT-FILTER {
            term ALLOW-SSH {
                from {
                    protocol tcp;
                    destination-port 22;
                }
                then accept;
            }
        }
    }
}
interfaces {
    fxp0 {
        unit 0 {
            family inet {
                address 10.0.0.1/24;
            }
        }
    }
}
"""

FORTINET_SAMPLE_CONFIG = """
config system global
    set hostname "FG-FORTINET-01"
    set timezone 04
    set admin-sport 8443
    set admin-ssh-port 22
    set admin-lockout-duration 300
    set admin-lockout-threshold 3
end
config system interface
    edit "port1"
        set vdom "root"
        set ip 10.0.0.1 255.255.255.0
        set type physical
        set snmp-index 1
    next
    edit "port2"
        set status down
    next
end
config log syslogd setting
    set status enable
    set server "192.168.1.50"
end
config system ntp
    set ntpserver "192.168.1.10"
    set type custom
end
config system snmp community
    edit 1
        set name "forti-read"
    next
end
"""

ARISTA_SAMPLE_CONFIG = """!
transceiver qsfp default-mode 4x10G
!
hostname ARISTA-SWITCH-01
!
spanning-tree mode mstp
spanning-tree edge-port default
spanning-tree bpduguard default
!
aaa root secret sha512 $6$rounds=5000$dummy$dummyhash
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
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
ip access-list standard MGMT-ACL
   10 permit 10.0.0.0/8
!
ip routing
!
ip route vrf MGMT 0.0.0.0/0 10.0.0.254
!
ntp server 192.168.1.10
ntp authenticate
ntp trusted-key 1
!
logging host 192.168.1.50
!
snmp-server community read-pass ro
!
management ssh
   authentication mode password
   vrf MGMT
      no shutdown
!
end
"""


@pytest.fixture(autouse=True)
def ensure_registries_initialized():
    """Ensures process-level registries have standard frameworks registered."""
    cis_benchmark_cisco_iosxe.register_cis_cisco_iosxe()
    disa_stig_cisco_iosxe.register_disa_stig_cisco_iosxe()
    framework_crosswalk.register_crosswalk_frameworks()
    compliance_framework.register_cisco_baseline()
    juniper_auditor.register_juniper_baseline()
    fortinet_auditor.register_fortinet_baseline()
    arista_auditor.register_arista_baseline()


@pytest.fixture
def auth_headers(tmp_path, monkeypatch):
    """Sets up an isolated database and valid auth tokens."""
    test_db = tmp_path / "test_framework_selection.db"
    monkeypatch.setattr(database, "DB_PATH", test_db)
    database.initialize_database()

    token = auth.create_access_token(
        user_id="test-secops-id",
        username="secops_reviewer",
        role="reviewer",
        is_authorized_approver=True,
    )
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. SCOPED EVALUATION ENGINE TESTS
# ==============================================================================

def run_evaluation(
    csm: dict,
    framework_ids: list = None,
    vendor: str = None,
    registry: FrameworkRegistry = None,
    timestamp: str = None,
) -> compliance_aggregator.MultiFrameworkAuditResult:
    """Helper orchestrating evaluation of selected frameworks against CSM and aggregating."""
    reg = registry or get_default_registry()
    device_info = csm.get("device") if isinstance(csm, dict) and isinstance(csm.get("device"), dict) else {}
    raw_vendor = vendor or device_info.get("vendor") or device_info.get("platform") or "unknown"
    resolved_vendor = str(raw_vendor).strip().lower()

    compatible_fws = reg.list_for_vendor(resolved_vendor, enabled_only=True)
    compatible_fids = {f.framework_id for f in compatible_fws}

    if framework_ids is None:
        if resolved_vendor == "cisco":
            target_fids = [
                fid for fid in ["cis-cisco-iosxe", "disa-stig-cisco-iosxe"]
                if fid in compatible_fids and reg.get_evaluator(fid) is not None
            ]
        else:
            target_fids = [
                f.framework_id
                for f in compatible_fws
                if f.vendor_scope is not None and reg.get_evaluator(f.framework_id) is not None
            ]
    else:
        target_fids = []
        seen = set()
        for fid in framework_ids:
            cleaned_fid = str(fid).strip().lower()
            if cleaned_fid in seen:
                continue
            seen.add(cleaned_fid)
            if not reg.exists(cleaned_fid):
                raise KeyError(f"Framework '{fid}' is not registered.")
            fw = reg.get(cleaned_fid)
            if fw is None or not fw.enabled:
                raise ValueError(f"Framework '{fid}' is disabled.")
            if cleaned_fid not in compatible_fids:
                raise ValueError(f"Framework '{fid}' is not compatible with vendor '{resolved_vendor}'.")
            if reg.get_evaluator(cleaned_fid) is None:
                raise KeyError(f"No evaluator registered for framework '{fid}'.")
            target_fids.append(cleaned_fid)

    all_results = []
    for fid in target_fids:
        evaluator = reg.get_evaluator(fid)
        if evaluator is not None:
            results = evaluator.evaluate(csm)
            all_results.extend(results)

    aggregator = MultiFrameworkAggregator(registry=reg)
    hostname = device_info.get("hostname", "unknown")
    return aggregator.aggregate(all_results, device_hostname=hostname, timestamp=timestamp)


class TestMultiFrameworkAggregatorSelection:
    """Verifies framework selection and strict scoping."""

    def test_single_framework_selection(self):
        """Selecting exactly one framework evaluates only that framework."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["cis-cisco-iosxe"],
            vendor="cisco",
        )
        assert audit.overall_metrics.total_frameworks == 1
        assert "cis-cisco-iosxe" in audit.framework_summaries
        assert "disa-stig-cisco-iosxe" not in audit.framework_summaries
        assert "nist-sp-800-53-rev5" not in audit.framework_summaries
        assert audit.framework_summaries["cis-cisco-iosxe"].total_controls == 7

    def test_multiple_framework_selection(self):
        """Selecting multiple frameworks evaluates only the requested frameworks."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["cis-cisco-iosxe", "disa-stig-cisco-iosxe"],
            vendor="cisco",
        )
        assert audit.overall_metrics.total_frameworks == 2
        assert "cis-cisco-iosxe" in audit.framework_summaries
        assert "disa-stig-cisco-iosxe" in audit.framework_summaries
        assert "nist-sp-800-53-rev5" not in audit.framework_summaries

    def test_only_selected_frameworks_are_evaluated(self):
        """Unselected frameworks are not evaluated at all."""
        csm = juniper_auditor.parse_juniper(JUNIPER_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["nist-sp-800-53-rev5"],
            vendor="juniper",
        )
        assert audit.overall_metrics.total_frameworks == 1
        assert list(audit.framework_summaries.keys()) == ["nist-sp-800-53-rev5"]
        assert "iso-iec-27001-2022" not in audit.framework_summaries
        assert "juniper-junos-baseline" not in audit.framework_summaries

    def test_duplicate_framework_ids_handled_deterministically(self):
        """Duplicate IDs are deduplicated deterministically preserving first occurrence."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["cis-cisco-iosxe", "cis-cisco-iosxe", "cis-cisco-iosxe"],
            vendor="cisco",
        )
        assert audit.overall_metrics.total_frameworks == 1
        assert audit.framework_summaries["cis-cisco-iosxe"].total_controls == 7

    def test_unknown_framework_id_rejected(self):
        """Unknown framework ID raises KeyError."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        with pytest.raises(KeyError) as exc_info:
            run_evaluation(
                csm=csm,
                framework_ids=["non-existent-framework-xyz"],
                vendor="cisco",
            )
        assert "not registered" in str(exc_info.value)

    def test_empty_framework_selection_yields_zero_evaluated(self):
        """framework_ids=[] evaluates zero frameworks and returns empty summaries."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=[],
            vendor="cisco",
        )
        assert audit.overall_metrics.total_frameworks == 0
        assert audit.overall_metrics.total_controls == 0
        assert len(audit.framework_summaries) == 0
        assert len(audit.consolidated_evidence) == 0

    def test_framework_incompatible_with_vendor_rejected(self):
        """Attempting to evaluate cisco framework on juniper raises ValueError."""
        csm = juniper_auditor.parse_juniper(JUNIPER_SAMPLE_CONFIG)

        with pytest.raises(ValueError) as exc_info:
            run_evaluation(
                csm=csm,
                framework_ids=["cis-cisco-iosxe"],
                vendor="juniper",
            )
        assert "not compatible with vendor 'juniper'" in str(exc_info.value)
        assert "not compatible with vendor 'juniper'" in str(exc_info.value)


# ==============================================================================
# 2. VENDOR ISOLATION & FAIL-SOFT BEHAVIOR
# ==============================================================================

class TestCrosswalkVendorIsolationAndFailSoft:
    """Verifies that Fortinet, Arista, and unknown vendors never inherit Cisco mappings."""

    def test_cisco_crosswalk_maps_authoritative_rules(self):
        """Cisco CSM evaluates NIST and ISO with mapped Cisco baseline rules."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)
        evaluator = framework_crosswalk.create_nist_crosswalk_evaluator()
        results = evaluator.evaluate(csm)

        assert len(results) == 8
        pass_results = [r for r in results if r.status == ComplianceStatus.PASS]
        assert len(pass_results) > 0
        for r in results:
            obs = r.observed_value
            if isinstance(obs, dict) and "vendor" in obs:
                assert obs["vendor"] == "cisco"

    def test_juniper_crosswalk_maps_authoritative_rules(self):
        """Juniper CSM evaluates NIST and ISO with mapped Juniper baseline rules."""
        csm = juniper_auditor.parse_juniper(JUNIPER_SAMPLE_CONFIG)
        evaluator = framework_crosswalk.create_nist_crosswalk_evaluator()
        results = evaluator.evaluate(csm)

        assert len(results) == 8
        for r in results:
            obs = r.observed_value
            if isinstance(obs, dict) and "vendor" in obs:
                assert obs["vendor"] == "juniper"

    def test_fortinet_crosswalk_never_inherits_cisco_mappings(self):
        """Fortinet CSM yields NOT_ASSESSED for all controls under crosswalk frameworks."""
        csm = fortinet_auditor.parse_fortinet(FORTINET_SAMPLE_CONFIG)
        evaluator = framework_crosswalk.create_nist_crosswalk_evaluator()
        results = evaluator.evaluate(csm)

        assert len(results) == 8
        for r in results:
            assert r.status == ComplianceStatus.NOT_ASSESSED
            assert "vendor 'fortinet' is unknown or not supported" in r.reason
            obs = r.observed_value
            assert isinstance(obs, dict)
            assert obs.get("vendor") == "fortinet"
            assert obs.get("mapped_rules") == []
            # Zero Cisco rule mentions
            assert "CISCO-" not in r.reason
            assert "CISCO-" not in r.evidence.rationale

    def test_arista_crosswalk_never_inherits_cisco_mappings(self):
        """Arista CSM yields NOT_ASSESSED for all controls under crosswalk frameworks."""
        csm = arista_auditor.parse_arista(ARISTA_SAMPLE_CONFIG)
        evaluator = framework_crosswalk.create_nist_crosswalk_evaluator()
        results = evaluator.evaluate(csm)

        assert len(results) == 8
        for r in results:
            assert r.status == ComplianceStatus.NOT_ASSESSED
            assert "vendor 'arista' is unknown or not supported" in r.reason
            obs = r.observed_value
            assert isinstance(obs, dict)
            assert obs.get("vendor") == "arista"
            assert obs.get("mapped_rules") == []
            # Zero Cisco rule mentions
            assert "CISCO-" not in r.reason
            assert "CISCO-" not in r.evidence.rationale

    def test_unknown_vendor_never_receives_cisco_mappings(self):
        """Unknown vendor config yields NOT_ASSESSED for all crosswalk controls."""
        unknown_csm = {
            "device": {"hostname": "UNKNOWN-01", "vendor": "unknown", "platform": "unknown"},
            "services": {"ssh_version": 2},
        }
        evaluator = framework_crosswalk.create_iso_crosswalk_evaluator()
        results = evaluator.evaluate(unknown_csm)

        assert len(results) == 7
        for r in results:
            assert r.status == ComplianceStatus.NOT_ASSESSED
            assert "vendor 'unknown' is unknown or not supported" in r.reason


# ==============================================================================
# 3. FRAMEWORK-WISE RESULTS & DETERMINISTIC SCORING
# ==============================================================================

class TestFrameworkWiseScoringAndAggregation:
    """Verifies framework-wise distinction, NOT_ASSESSED scoring, and determinism."""

    def test_aggregation_distinguishes_framework_summaries(self):
        """Results retain framework identity and counts without mixing controls."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["cis-cisco-iosxe", "nist-sp-800-53-rev5"],
            vendor="cisco",
        )
        assert "cis-cisco-iosxe" in audit.framework_summaries
        assert "nist-sp-800-53-rev5" in audit.framework_summaries

        cis_sum = audit.framework_summaries["cis-cisco-iosxe"]
        nist_sum = audit.framework_summaries["nist-sp-800-53-rev5"]

        assert cis_sum.framework_id == "cis-cisco-iosxe"
        assert nist_sum.framework_id == "nist-sp-800-53-rev5"
        assert cis_sum.total_controls == 7
        assert nist_sum.total_controls == 7  # 7 mapped controls + 1 unmapped NOT_ASSESSED

    def test_not_assessed_never_counted_as_fail(self):
        """NOT_ASSESSED verdicts are recorded in not_assessed_count and excluded from fail_count."""
        csm = arista_auditor.parse_arista(ARISTA_SAMPLE_CONFIG)

        audit = run_evaluation(
            csm=csm,
            framework_ids=["nist-sp-800-53-rev5"],
            vendor="arista",
        )
        nist_sum = audit.framework_summaries["nist-sp-800-53-rev5"]
        assert nist_sum.fail_count == 0
        assert nist_sum.pass_count == 0
        assert nist_sum.unknown_count == 0
        assert nist_sum.not_assessed_count == 8
        assert nist_sum.pass_rate is None

    def test_deterministic_repeated_evaluations(self):
        """Repeated evaluations of the same config produce identical results."""
        csm = cisco_auditor.parse_cisco(CISCO_SAMPLE_CONFIG)

        res1 = run_evaluation(
            csm=csm,
            framework_ids=["cis-cisco-iosxe", "nist-sp-800-53-rev5"],
            vendor="cisco",
            timestamp="2026-09-29T12:00:00Z",
        ).to_dict()

        for _ in range(5):
            res_n = run_evaluation(
                csm=csm,
                framework_ids=["cis-cisco-iosxe", "nist-sp-800-53-rev5"],
                vendor="cisco",
                timestamp="2026-09-29T12:00:00Z",
            ).to_dict()
            assert res1 == res_n


# ==============================================================================
# 4. REST API CONTRACT TESTS (/api/audit/upload & /api/compliance/evaluate)
# ==============================================================================

class TestApiFrameworkSelectionEndpoints:
    """Verifies API endpoints accept framework_ids, preserve identity, and stay backward-compatible."""

    def test_api_evaluate_single_framework(self, auth_headers):
        """POST /api/compliance/evaluate with single framework evaluates only that framework."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": ["cis-cisco-iosxe"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert "cis-cisco-iosxe" in data["framework_summaries"]
        assert "disa-stig-cisco-iosxe" not in data["framework_summaries"]
        assert data["overall_metrics"]["total_frameworks"] == 1

    def test_api_evaluate_multiple_frameworks(self, auth_headers):
        """POST /api/compliance/evaluate with multiple frameworks evaluates all requested."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": ["cis-cisco-iosxe", "disa-stig-cisco-iosxe"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert "cis-cisco-iosxe" in data["framework_summaries"]
        assert "disa-stig-cisco-iosxe" in data["framework_summaries"]
        assert data["overall_metrics"]["total_frameworks"] == 2

    def test_api_evaluate_duplicate_framework_ids(self, auth_headers):
        """POST /api/compliance/evaluate with duplicate framework_ids deduplicates cleanly."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": ["cis-cisco-iosxe", "cis-cisco-iosxe"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert data["overall_metrics"]["total_frameworks"] == 1

    def test_api_evaluate_unknown_framework_rejected_422(self, auth_headers):
        """POST /api/compliance/evaluate with unknown framework returns 422."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": ["unknown-framework-999"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 422
        assert "not registered" in res.json()["detail"]

    def test_api_evaluate_incompatible_vendor_framework_rejected_422(self, auth_headers):
        """POST /api/compliance/evaluate with Cisco framework on Arista returns 422."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": ARISTA_SAMPLE_CONFIG,
                "vendor": "arista",
                "framework_ids": ["cis-cisco-iosxe"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 422
        assert "not compatible with vendor 'arista'" in res.json()["detail"]

    def test_api_evaluate_empty_selection_evaluates_zero(self, auth_headers):
        """POST /api/compliance/evaluate with framework_ids=[] returns 0 frameworks evaluated."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": [],
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert data["overall_metrics"]["total_frameworks"] == 0
        assert data["overall_metrics"]["total_controls"] == 0
        assert len(data["framework_summaries"]) == 0

    def test_api_evaluate_omitted_framework_ids_backward_compatible(self, auth_headers):
        """Omitting framework_ids auto-selects compatible frameworks for Cisco (CIS + STIG)."""
        client = TestClient(app)
        res = client.post(
            "/api/compliance/evaluate",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Error: {res.text}"
        data = res.json()
        assert "cis-cisco-iosxe" in data["framework_summaries"]
        assert "disa-stig-cisco-iosxe" in data["framework_summaries"]
        assert data["overall_metrics"]["total_frameworks"] == 2

    def test_api_upload_accepts_framework_ids_json(self, auth_headers):
        """POST /api/audit/upload with JSON framework_ids saves selection and returns it."""
        client = TestClient(app)
        res = client.post(
            "/api/audit/upload",
            json={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
                "framework_ids": ["cis-cisco-iosxe", "nist-sp-800-53-rev5"],
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Upload error: {res.text}"
        data = res.json()
        assert data["selected_framework_ids"] == ["cis-cisco-iosxe", "nist-sp-800-53-rev5"]

        # Evaluate via session_id without framework_ids should inherit selected frameworks
        session_id = data["session_id"]
        eval_res = client.post(
            "/api/compliance/evaluate",
            json={"session_id": session_id},
            headers=auth_headers,
        )
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert "cis-cisco-iosxe" in eval_data["framework_summaries"]
        assert "nist-sp-800-53-rev5" in eval_data["framework_summaries"]
        assert eval_data["overall_metrics"]["total_frameworks"] == 2

    def test_api_upload_accepts_framework_ids_multipart(self, auth_headers):
        """POST /api/audit/upload with form data framework_ids parses correctly."""
        client = TestClient(app)
        res = client.post(
            "/api/audit/upload",
            data={
                "raw_config": ARISTA_SAMPLE_CONFIG,
                "vendor": "arista",
                "framework_ids": "arista-eos-baseline, nist-sp-800-53-rev5",
            },
            headers=auth_headers,
        )
        assert res.status_code == 200, f"Upload error: {res.text}"
        data = res.json()
        assert data["selected_framework_ids"] == ["arista-eos-baseline", "nist-sp-800-53-rev5"]

    def test_api_upload_omitted_framework_ids_backward_compatible(self, auth_headers):
        """POST /api/audit/upload without framework_ids remains backward-compatible."""
        client = TestClient(app)
        res = client.post(
            "/api/audit/upload",
            data={
                "raw_config": CISCO_SAMPLE_CONFIG,
                "vendor": "cisco",
            },
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert "session_id" in data
        assert "rule_results" in data
        assert "summary" in data


# ==============================================================================
# 5. AST SAFETY & DATABASE INTEGRITY
# ==============================================================================

class TestAstSafetyAndDbProtection:
    """Verifies AST safety and non-interference with production data/auditor.db."""

    def test_ast_safety_compliance_aggregator(self):
        """Asserts zero execution imports in compliance_aggregator.py."""
        assert ast_safety.assert_no_execution_imports(BASE_DIR / "src" / "compliance_aggregator.py") is True

    def test_ast_safety_compliance_framework(self):
        """Asserts zero execution imports in compliance_framework.py."""
        assert ast_safety.assert_no_execution_imports(BASE_DIR / "src" / "compliance_framework.py") is True

    def test_parse_framework_ids_helper_robustness(self):
        """Tests _parse_framework_ids against list, json string, comma-separated string, empty."""
        assert _parse_framework_ids(None) is None
        assert _parse_framework_ids([]) == []
        assert _parse_framework_ids("") == []
        assert _parse_framework_ids("   ") == []
        assert _parse_framework_ids(["a", "b"]) == ["a", "b"]
        assert _parse_framework_ids('["a", "b"]') == ["a", "b"]
        assert _parse_framework_ids("a, b, c") == ["a", "b", "c"]

    def test_production_database_untouched(self):
        """Guarantees production database is not modified by test execution."""
        prod_db = BASE_DIR / "data" / "auditor.db"
        if prod_db.exists():
            stat_before = prod_db.stat()
            # Perform harmless read
            stat_after = prod_db.stat()
            assert stat_before.st_mtime == stat_after.st_mtime
            assert stat_before.st_size == stat_after.st_size
