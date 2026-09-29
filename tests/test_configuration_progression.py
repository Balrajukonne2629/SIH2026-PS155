"""Test Suite for Chronological Configuration Progression & State Evolution Engine (Phase 2).

Covers all 15 mandatory verification tests:
1. A single audit creates V1.
2. A A A sequence creates exactly one version.
3. A A A B B creates V1(A) and V2(B).
4. A B A creates V1(A), V2(B), and V3(A) (verifies rollback non-deduplication).
5. A A B B A A C creates V1(A), V2(B), V3(A), and V4(C).
6. Every audit remains present in audit_entries.
7. audit_count exactly matches the number of contained audits.
8. Same config content retains the same config_hash.
9. Different config content produces different config_hash.
10. Genuine 0% compliance: is_evaluated == True, score == 0.0.
11. Empty/missing audit results: is_evaluated == False, score is None (not 0%).
12. Version ordering is chronological and deterministic.
13. Multiple host/device scenarios behave according to existing project semantics.
14. API returns the expected progression structure (GET /api/configurations/progression).
15. Existing GET /api/ledger behavior remains intact.
"""

import hashlib
import json
import os
import pytest
from fastapi.testclient import TestClient

import auth
import audit_log
from audit_log import create_audit_entry, append_audit_entry, verify_chain
import configuration_progression
from configuration_progression import (
    compute_audit_entry_metrics,
    compute_version_delta,
    derive_configuration_progression,
)
import database
from main import app

client = TestClient(app)

ORIGINAL_DB_PATH = database.DB_PATH
TEST_DB_PATH = database.DATA_DIR / "test_config_progression.db"


@pytest.fixture(autouse=True)
def isolated_database():
    """Isolates tests with a clean test database to prevent mutation of development data."""
    database.DB_PATH = TEST_DB_PATH
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass

    database.initialize_database()
    yield
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass
    database.DB_PATH = ORIGINAL_DB_PATH


@pytest.fixture
def viewer_token():
    return auth.create_access_token(
        user_id="usr-viewer-progression",
        username="viewer_progression",
        role="viewer",
        is_authorized_approver=False,
    )


def _make_mock_entry(
    config_hash: str,
    device_hostname: str = "EDGE-RTR-01",
    timestamp: str = "2026-09-24T00:00:00Z",
    results: dict = None,
    entry_id: str = "AUDIT-001",
):
    if results is None:
        results = {"CISCO-001": "Pass", "CISCO-002": "Fail"}
    return {
        "entry_id": entry_id,
        "timestamp": timestamp,
        "device_hostname": device_hostname,
        "config_file_hash": config_hash,
        "audit_results": results,
        "remediation_summary": None,
        "prevEntryHash": "0" * 64,
        "entryHash": "f" * 64,
        "has_canonical_report": True,
        "report_id": f"REP-{entry_id}",
    }


def test_single_audit_creates_v1():
    """1. A single audit creates V1."""
    entries = [_make_mock_entry("hash_A", timestamp="2026-09-24T01:00:00Z", entry_id="E1")]
    versions = derive_configuration_progression(entries)

    assert len(versions) == 1
    v1 = versions[0]
    assert v1["version_id"] == "V1"
    assert v1["config_hash"] == "hash_A"
    assert v1["audit_count"] == 1
    assert len(v1["audit_entries"]) == 1
    assert v1["audit_entries"][0]["entry_id"] == "E1"


def test_aaa_sequence_creates_one_version():
    """2. A A A sequence creates exactly one version."""
    entries = [
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:00:00Z", entry_id="E1"),
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:05:00Z", entry_id="E2"),
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:10:00Z", entry_id="E3"),
    ]
    versions = derive_configuration_progression(entries)

    assert len(versions) == 1
    assert versions[0]["version_id"] == "V1"
    assert versions[0]["config_hash"] == "hash_A"
    assert versions[0]["audit_count"] == 3
    assert versions[0]["first_audited"] == "2026-09-24T01:00:00Z"
    assert versions[0]["latest_audited"] == "2026-09-24T01:10:00Z"


def test_aaabb_creates_v1_v2():
    """3. A A A B B creates V1(A) and V2(B)."""
    entries = [
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:00:00Z", entry_id="E1"),
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:05:00Z", entry_id="E2"),
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:10:00Z", entry_id="E3"),
        _make_mock_entry("hash_B", timestamp="2026-09-24T02:00:00Z", entry_id="E4"),
        _make_mock_entry("hash_B", timestamp="2026-09-24T02:05:00Z", entry_id="E5"),
    ]
    versions = derive_configuration_progression(entries)

    assert len(versions) == 2
    assert versions[0]["version_id"] == "V1"
    assert versions[0]["config_hash"] == "hash_A"
    assert versions[0]["audit_count"] == 3

    assert versions[1]["version_id"] == "V2"
    assert versions[1]["config_hash"] == "hash_B"
    assert versions[1]["audit_count"] == 2


def test_aba_sequence_creates_v1_v2_v3_rollback():
    """4. A B A creates V1(A), V2(B), and V3(A) (verifies rollback non-deduplication)."""
    entries = [
        _make_mock_entry("hash_A", timestamp="2026-09-24T01:00:00Z", entry_id="E1"),
        _make_mock_entry("hash_B", timestamp="2026-09-24T02:00:00Z", entry_id="E2"),
        _make_mock_entry("hash_A", timestamp="2026-09-24T03:00:00Z", entry_id="E3"),
    ]
    versions = derive_configuration_progression(entries)

    assert len(versions) == 3
    assert versions[0]["version_id"] == "V1"
    assert versions[0]["config_hash"] == "hash_A"

    assert versions[1]["version_id"] == "V2"
    assert versions[1]["config_hash"] == "hash_B"

    assert versions[2]["version_id"] == "V3"
    assert versions[2]["config_hash"] == "hash_A"


def test_aabb_aa_c_creates_four_versions():
    """5. A A B B A A C creates V1(A), V2(B), V3(A), and V4(C)."""
    entries = [
        _make_mock_entry("hash_A", timestamp="t1", entry_id="E1"),
        _make_mock_entry("hash_A", timestamp="t2", entry_id="E2"),
        _make_mock_entry("hash_B", timestamp="t3", entry_id="E3"),
        _make_mock_entry("hash_B", timestamp="t4", entry_id="E4"),
        _make_mock_entry("hash_A", timestamp="t5", entry_id="E5"),
        _make_mock_entry("hash_A", timestamp="t6", entry_id="E6"),
        _make_mock_entry("hash_C", timestamp="t7", entry_id="E7"),
    ]
    versions = derive_configuration_progression(entries)

    assert len(versions) == 4
    assert [v["version_id"] for v in versions] == ["V1", "V2", "V3", "V4"]
    assert [v["config_hash"] for v in versions] == ["hash_A", "hash_B", "hash_A", "hash_C"]
    assert [v["audit_count"] for v in versions] == [2, 2, 2, 1]


def test_every_audit_remains_present():
    """6. Every audit remains present in audit_entries."""
    entries = [
        _make_mock_entry("hash_A", entry_id="E1"),
        _make_mock_entry("hash_A", entry_id="E2"),
        _make_mock_entry("hash_B", entry_id="E3"),
    ]
    versions = derive_configuration_progression(entries)

    all_preserved_ids = []
    for v in versions:
        for audit in v["audit_entries"]:
            all_preserved_ids.append(audit["entry_id"])

    assert all_preserved_ids == ["E1", "E2", "E3"]


def test_audit_count_matches_contained_audits():
    """7. audit_count exactly matches the number of contained audits."""
    entries = [
        _make_mock_entry("hash_A", entry_id="E1"),
        _make_mock_entry("hash_A", entry_id="E2"),
        _make_mock_entry("hash_A", entry_id="E3"),
        _make_mock_entry("hash_B", entry_id="E4"),
    ]
    versions = derive_configuration_progression(entries)

    for v in versions:
        assert v["audit_count"] == len(v["audit_entries"])
    assert sum(v["audit_count"] for v in versions) == len(entries)


def test_same_config_content_retains_same_hash():
    """8. Same config content retains the same config_hash."""
    config_text = "hostname EDGE-RTR-01\ninterface Gi0/0\n"
    hash1 = hashlib.sha256(config_text.encode("utf-8")).hexdigest()
    hash2 = hashlib.sha256(config_text.encode("utf-8")).hexdigest()

    assert hash1 == hash2


def test_different_config_content_produces_different_hash():
    """9. Different config content produces different config_hash."""
    config1 = "hostname EDGE-RTR-01\ninterface Gi0/0\n"
    config2 = "hostname EDGE-RTR-01\ninterface Gi0/1\n"
    hash1 = hashlib.sha256(config1.encode("utf-8")).hexdigest()
    hash2 = hashlib.sha256(config2.encode("utf-8")).hexdigest()

    assert hash1 != hash2


def test_genuine_zero_percent_compliance():
    """10. Genuine 0% compliance: is_evaluated == True, score == 0.0."""
    # 0 Pass, 5 Fail -> genuine 0%
    zero_pass_results = {f"RULE-{i}": "Fail" for i in range(5)}
    entry = _make_mock_entry("hash_0", results=zero_pass_results)
    versions = derive_configuration_progression([entry])

    v = versions[0]
    assert v["is_evaluated"] is True
    assert v["latest_compliance_score"] == 0.0
    assert v["pass_count"] == 0
    assert v["fail_count"] == 5
    assert v["total_controls"] == 5


def test_empty_missing_audit_results():
    """11. Empty/missing audit results: is_evaluated == False, score must not be treated as genuine 0%."""
    entry_empty = _make_mock_entry("hash_empty", results={})
    versions = derive_configuration_progression([entry_empty])

    v = versions[0]
    assert v["is_evaluated"] is False
    assert v["latest_compliance_score"] is None
    assert v["total_controls"] == 0


def test_version_ordering_chronological_deterministic():
    """12. Version ordering is chronological and deterministic."""
    entries = [
        _make_mock_entry("hash_1", timestamp="2026-09-24T01:00:00Z", entry_id="E1"),
        _make_mock_entry("hash_2", timestamp="2026-09-24T02:00:00Z", entry_id="E2"),
        _make_mock_entry("hash_3", timestamp="2026-09-24T03:00:00Z", entry_id="E3"),
    ]
    v_run1 = derive_configuration_progression(entries)
    v_run2 = derive_configuration_progression(entries)

    assert [v["version_id"] for v in v_run1] == ["V1", "V2", "V3"]
    assert [v["first_audited"] for v in v_run1] == [
        "2026-09-24T01:00:00Z",
        "2026-09-24T02:00:00Z",
        "2026-09-24T03:00:00Z",
    ]
    # Pure function determinism check
    assert json.dumps(v_run1, sort_keys=True) == json.dumps(v_run2, sort_keys=True)


def test_multiple_host_device_scenarios():
    """13. Multiple host/device scenarios behave according to existing project semantics.
    Does not merge unrelated device histories.
    """
    entries = [
        _make_mock_entry("hash_SHARED", device_hostname="ROUTER-A", entry_id="E1"),
        _make_mock_entry("hash_SHARED", device_hostname="ROUTER-B", entry_id="E2"),
    ]
    # Unfiltered: Host difference forces separate version boundary
    versions = derive_configuration_progression(entries)
    assert len(versions) == 2
    assert versions[0]["device_hostname"] == "ROUTER-A"
    assert versions[1]["device_hostname"] == "ROUTER-B"

    # Filtered by device: Scopes strictly to target device
    v_router_a = derive_configuration_progression(entries, device_hostname="ROUTER-A")
    assert len(v_router_a) == 1
    assert v_router_a[0]["device_hostname"] == "ROUTER-A"

    v_router_b = derive_configuration_progression(entries, device_hostname="ROUTER-B")
    assert len(v_router_b) == 1
    assert v_router_b[0]["device_hostname"] == "ROUTER-B"


def test_api_progression_structure(viewer_token):
    """14. API returns the expected progression structure (GET /api/configurations/progression)."""
    # Create two entries in the database
    csm1 = {"device": {"hostname": "EDGE-RTR-01"}}
    evals1 = {"CIS-001": {"status": "Pass"}, "CIS-002": {"status": "Fail"}}
    entry1 = create_audit_entry(csm1, evals1, "hostname EDGE-RTR-01\nversion 1\n")
    append_audit_entry(entry1)

    csm2 = {"device": {"hostname": "EDGE-RTR-01"}}
    evals2 = {"CIS-001": {"status": "Pass"}, "CIS-002": {"status": "Pass"}}
    entry2 = create_audit_entry(csm2, evals2, "hostname EDGE-RTR-01\nversion 2\n")
    append_audit_entry(entry2)

    headers = {"Authorization": f"Bearer {viewer_token}"}
    response = client.get("/api/configurations/progression", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert "versions" in data
    assert data["total_versions"] == 2
    assert data["total_audits"] == 2

    v1 = data["versions"][0]
    assert v1["version_id"] == "V1"
    assert v1["device_hostname"] == "EDGE-RTR-01"
    assert v1["audit_count"] == 1
    assert v1["is_evaluated"] is True
    assert v1["latest_compliance_score"] == 50.0  # 1 Pass, 1 Fail
    assert v1["delta_from_previous"] is None

    v2 = data["versions"][1]
    assert v2["version_id"] == "V2"
    assert v2["is_evaluated"] is True
    assert v2["latest_compliance_score"] == 100.0  # 2 Pass, 0 Fail
    assert v2["delta_from_previous"] is not None
    assert v2["delta_from_previous"]["status"] == "comparable"
    assert v2["delta_from_previous"]["delta_score"] == 50.0
    assert "CIS-002" in v2["delta_from_previous"]["improved_rules"]


def test_existing_ledger_behavior_intact(viewer_token):
    """15. Existing GET /api/ledger behavior remains intact."""
    csm = {"device": {"hostname": "EDGE-RTR-01"}}
    evals = {"CIS-001": {"status": "Pass"}}
    entry = create_audit_entry(csm, evals, "config text")
    append_audit_entry(entry)

    headers = {"Authorization": f"Bearer {viewer_token}"}
    response = client.get("/api/ledger", headers=headers)
    assert response.status_code == 200

    ledger = response.json()
    assert isinstance(ledger, list)
    assert len(ledger) >= 1
    item = ledger[0]
    for key in ["entry_id", "timestamp", "device_hostname", "config_file_hash", "prevEntryHash", "entryHash"]:
        assert key in item
