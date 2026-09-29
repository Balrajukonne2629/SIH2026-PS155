"""Unit and Integration Tests for Append-Only Cryptographic Audit Ledger (Phase 1).

Covers all 9 required verification tests:
1. First entry uses GENESIS_PREV_HASH ("0" * 64).
2. Second entry references first entry's entryHash.
3. Multiple entries form a valid sequential chain.
4. Tampering with Entry 1 payload is detected.
5. Tampering with Entry N payload is detected.
6. Deleting an intermediate entry is detected.
7. Reordering entries is detected.
8. Independent verification succeeds on valid ledger (HTTP 200 OK).
9. Invalid historical data is not silently accepted (HTTP 409 Conflict).
"""

import json
import os
import pathlib
import pytest
import sqlite3
from fastapi.testclient import TestClient

import auth
import audit_log
from audit_log import (
    GENESIS_PREV_HASH,
    compute_entry_hash,
    create_audit_entry,
    append_audit_entry,
    verify_chain,
)
import database
from main import app

client = TestClient(app)

ORIGINAL_DB_PATH = database.DB_PATH
TEST_DB_PATH = database.DATA_DIR / "test_audit_chain.db"


def _make_dummy_csm(hostname: str = "router-01"):
    return {"device": {"hostname": hostname, "vendor": "cisco_iosxe"}}


def _make_dummy_evals():
    return {
        "CISCO-001": {"status": "Pass", "framework": "CIS"},
        "CISCO-002": {"status": "Fail", "framework": "STIG"},
    }


@pytest.fixture(autouse=True)
def isolated_database():
    """Points database module to a fresh isolated test database for each test."""
    database.DB_PATH = TEST_DB_PATH
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass

    database.initialize_database()
    yield
    # Cleanup
    if TEST_DB_PATH.exists():
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass
    database.DB_PATH = ORIGINAL_DB_PATH


@pytest.fixture
def viewer_token():
    return auth.create_access_token(
        user_id="usr-viewer-chain",
        username="viewer_chain",
        role="viewer",
        is_authorized_approver=False,
    )


def test_genesis_entry_hash_format():
    """1. Verify that the very first entry uses GENESIS_PREV_HASH ('0' * 64)."""
    csm = _make_dummy_csm("edge-rtr-01")
    evals = _make_dummy_evals()
    entry = create_audit_entry(csm, evals, "hostname edge-rtr-01\n")

    assert entry["prevEntryHash"] == GENESIS_PREV_HASH
    assert len(entry["prevEntryHash"]) == 64
    assert entry["prevEntryHash"] == "0" * 64
    assert "entryHash" in entry
    assert len(entry["entryHash"]) == 64


def test_second_entry_references_first():
    """2. Verify that a second entry references the first entry's entryHash."""
    csm1 = _make_dummy_csm("edge-rtr-01")
    evals1 = _make_dummy_evals()
    entry1 = create_audit_entry(csm1, evals1, "hostname edge-rtr-01\n")
    append_audit_entry(entry1)

    csm2 = _make_dummy_csm("core-sw-01")
    evals2 = _make_dummy_evals()
    entry2 = create_audit_entry(csm2, evals2, "hostname core-sw-01\n")
    append_audit_entry(entry2)

    assert entry2["prevEntryHash"] == entry1["entryHash"]
    assert entry2["entryHash"] != entry1["entryHash"]


def test_sequential_chain_multi_entry():
    """3. Verify that multiple entries form a valid sequential cryptographic chain."""
    for i in range(5):
        csm = _make_dummy_csm(f"rtr-0{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"hostname rtr-0{i}\ninterface Gi0/{i}\n")
        append_audit_entry(entry)

    is_valid, msg, broken_idx = verify_chain()
    assert is_valid is True
    assert "All 5 log entries verified successfully" in msg
    assert broken_idx == 0


def test_tampering_entry_1_detected():
    """4. Verify that tampering with Entry 1 payload is immediately detected."""
    for i in range(3):
        csm = _make_dummy_csm(f"rtr-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-{i}")
        append_audit_entry(entry)

    # Tamper with row 1's device_hostname directly in SQLite
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM audit_ledger ORDER BY id ASC LIMIT 1")
    first_id = cur.fetchone()[0]
    cur.execute("UPDATE audit_ledger SET device_hostname = 'hacked-router' WHERE id = ?", (first_id,))
    conn.commit()
    conn.close()

    is_valid, msg, broken_idx = verify_chain()
    assert is_valid is False
    assert broken_idx == 1
    assert "Tamper detected at entry 1" in msg
    assert "payload modified" in msg


def test_tampering_entry_n_detected():
    """5. Verify that tampering with Entry N payload is detected."""
    for i in range(4):
        csm = _make_dummy_csm(f"switch-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-switch-{i}")
        append_audit_entry(entry)

    # Tamper with row 3 (third entry) audit_results in SQLite
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM audit_ledger ORDER BY id ASC")
    rows = cur.fetchall()
    target_id = rows[2][0]
    tampered_results = json.dumps({"CISCO-001": "Pass", "CISCO-002": "Pass"}, sort_keys=True)
    cur.execute("UPDATE audit_ledger SET audit_results = ? WHERE id = ?", (tampered_results, target_id))
    conn.commit()
    conn.close()

    is_valid, msg, broken_idx = verify_chain()
    assert is_valid is False
    assert broken_idx == 3
    assert "Tamper detected at entry 3" in msg


def test_deleting_intermediate_entry_detected():
    """6. Verify that deleting an intermediate entry breaks the chain."""
    for i in range(4):
        csm = _make_dummy_csm(f"node-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-node-{i}")
        append_audit_entry(entry)

    # Delete the second entry (index 1)
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM audit_ledger ORDER BY id ASC")
    rows = cur.fetchall()
    deleted_id = rows[1][0]
    cur.execute("DELETE FROM audit_ledger WHERE id = ?", (deleted_id,))
    conn.commit()
    conn.close()

    is_valid, msg, broken_idx = verify_chain()
    assert is_valid is False
    # The remaining entry 2 (originally entry 3) will point to entry 2's hash, which no longer matches entry 1's hash
    assert broken_idx == 2
    assert "prevEntryHash mismatch" in msg


def test_reordering_entries_detected():
    """7. Verify that swapping/reordering rows is detected."""
    for i in range(3):
        csm = _make_dummy_csm(f"device-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-device-{i}")
        append_audit_entry(entry)

    # Swap IDs of row 1 and row 2
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, entry_id FROM audit_ledger ORDER BY id ASC")
    rows = cur.fetchall()
    id1, eid1 = rows[0][0], rows[0][1]
    id2, eid2 = rows[1][0], rows[1][1]

    # Swap entry_ids to simulate reordering
    cur.execute("UPDATE audit_ledger SET entry_id = 'temp' WHERE id = ?", (id1,))
    cur.execute("UPDATE audit_ledger SET entry_id = ? WHERE id = ?", (eid1, id2))
    cur.execute("UPDATE audit_ledger SET entry_id = ? WHERE id = ?", (eid2, id1))
    conn.commit()
    conn.close()

    is_valid, msg, broken_idx = verify_chain()
    assert is_valid is False


def test_independent_verification_endpoint_valid_200(viewer_token):
    """8. Independent verification succeeds on valid ledger (HTTP 200 OK)."""
    for i in range(3):
        csm = _make_dummy_csm(f"rtr-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-{i}")
        append_audit_entry(entry)

    headers = {"Authorization": f"Bearer {viewer_token}"}
    response = client.get("/api/ledger/verify", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert "verified successfully" in data["message"]
    assert data["broken_entry_index"] == 0


def test_independent_verification_endpoint_invalid_409(viewer_token):
    """9. Invalid historical data is not silently accepted (HTTP 409 Conflict)."""
    for i in range(2):
        csm = _make_dummy_csm(f"rtr-{i}")
        evals = _make_dummy_evals()
        entry = create_audit_entry(csm, evals, f"config-{i}")
        append_audit_entry(entry)

    # Corrupt prevEntryHash of entry 2 directly
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM audit_ledger ORDER BY id ASC")
    rows = cur.fetchall()
    cur.execute("UPDATE audit_ledger SET prevEntryHash = 'corrupted_hash' WHERE id = ?", (rows[1][0],))
    conn.commit()
    conn.close()

    headers = {"Authorization": f"Bearer {viewer_token}"}
    response = client.get("/api/ledger/verify", headers=headers)
    assert response.status_code == 409
    data = response.json()
    assert data["valid"] is False
    assert data["broken_entry_index"] == 2
    assert "prevEntryHash mismatch" in data["message"]
