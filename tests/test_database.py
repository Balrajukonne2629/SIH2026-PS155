import os
import pathlib
import json
import sqlite3
import datetime
import pytest

import database
import audit_log
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def setup_module(module):
    database.DB_PATH = database.DATA_DIR / "test_auditor.db"
    if database.DB_PATH.exists():
        os.remove(database.DB_PATH)
    database.initialize_database()

def teardown_module(module):
    import gc
    gc.collect()
    if database.DB_PATH.exists():
        try:
            os.remove(database.DB_PATH)
        except OSError:
            pass

def test_initialization():
    assert database.DB_PATH.exists()
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cur.fetchall()]
    assert "audit_sessions" in tables
    assert "trusted_mappings" in tables
    assert "pending_suggestions" in tables
    assert "audit_ledger" in tables
    conn.close()

def test_audit_session_persistence():
    session_data = {
        "session_id": "test-session-123",
        "csm": {"device": {"hostname": "r1"}},
        "evals": {"CISCO-001": {"status": "Pass"}},
        "raw_config_text": "hostname r1\n",
        "filename": "test.txt",
        "config_file_hash": "abcdef",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    database.save_session(session_data)
    loaded = database.get_session("test-session-123")
    assert loaded is not None
    assert loaded["csm"]["device"]["hostname"] == "r1"
    assert loaded["config_file_hash"] == "abcdef"

def test_trusted_mapping_persistence():
    import ai_suggester
    
    # store pending
    sug_id = ai_suggester.store_suggestion({
        "raw_line": "test line",
        "suggested_new_rule": {
            "internalTitle": "Test Rule",
            "csmFieldChecked": "csm.test",
            "condition": "not_null"
        }
    })
    
    # approve it
    ai_suggester.approve_suggestion(sug_id, "admin", "approve")
    
    # check db
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM trusted_mappings")
    rows = cur.fetchall()
    assert len(rows) > 0
    
    # Test reject does not change
    sug_id2 = ai_suggester.store_suggestion({
        "raw_line": "test line 2",
        "suggested_new_rule": {
            "internalTitle": "Test Rule 2",
            "csmFieldChecked": "csm.test2",
            "condition": "not_null"
        }
    })
    ai_suggester.approve_suggestion(sug_id2, "admin", "reject")
    cur.execute("SELECT * FROM pending_suggestions WHERE suggestion_id = ?", (sug_id2,))
    assert cur.fetchone()["status"] == "rejected"
    
    cur.execute("SELECT COUNT(*) FROM trusted_mappings")
    assert cur.fetchone()[0] == len(rows)  # Still same size
    
    conn.close()

def test_audit_record_ledger_persistence():
    import audit_log
    entry = audit_log.create_audit_entry(
        {"device": {"hostname": "r2"}},
        {"CISCO-001": {"status": "Fail"}},
        "hostname r2\n"
    )
    audit_log.append_audit_entry(entry)
    
    valid, msg, broken_idx = audit_log.verify_chain()
    assert valid is True, msg

def test_duplicate_finalization_safety():
    import audit_log
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM audit_ledger")
    initial_count = cur.fetchone()[0]
    conn.close()

    entry = audit_log.create_audit_entry(
        {"device": {"hostname": "r3"}},
        {"CISCO-001": {"status": "Pass"}},
        "hostname r3\n"
    )
    # 1. First append succeeds
    h1 = audit_log.append_audit_entry(entry)
    assert h1 == entry["entryHash"]

    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM audit_ledger")
    assert cur.fetchone()[0] == initial_count + 1
    conn.close()

    # 2. Attempt identical finalization (same entry_id)
    with pytest.raises(sqlite3.IntegrityError):
        audit_log.append_audit_entry(entry)
    import gc
    gc.collect()

    # 3. Ledger entry count does not increase
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM audit_ledger")
    assert cur.fetchone()[0] == initial_count + 1
    conn.close()

    # 4. Hash chain remains intact and valid
    valid, msg, _ = audit_log.verify_chain()
    assert valid is True, msg
    gc.collect()

def test_users_table_and_columns():
    """Verify users table creation and exact required columns."""
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    assert cur.fetchone() is not None, "Table 'users' must exist"

    cur.execute("PRAGMA table_info(users)")
    cols = {row[1]: {"type": row[2], "notnull": row[3], "pk": row[5]} for row in cur.fetchall()}
    conn.close()

    required_cols = {
        "user_id", "username", "password_hash", "salt",
        "role", "is_authorized_approver", "is_active", "created_at"
    }
    for col in required_cols:
        assert col in cols, f"Missing required column '{col}' in users table"
    assert cols["user_id"]["pk"] == 1, "user_id must be primary key"
    assert cols["username"]["notnull"] == 1, "username must be NOT NULL"
    assert cols["password_hash"]["notnull"] == 1, "password_hash must be NOT NULL"

def test_owner_user_id_columns_nullable():
    """Verify owner_user_id exists as a nullable column on audit_sessions and audit_ledger."""
    conn = database.get_connection()
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(audit_sessions)")
    session_cols = {row[1]: {"notnull": row[3]} for row in cur.fetchall()}
    assert "owner_user_id" in session_cols, "owner_user_id must exist in audit_sessions"
    assert session_cols["owner_user_id"]["notnull"] == 0, "owner_user_id in audit_sessions must be nullable"

    cur.execute("PRAGMA table_info(audit_ledger)")
    ledger_cols = {row[1]: {"notnull": row[3]} for row in cur.fetchall()}
    assert "owner_user_id" in ledger_cols, "owner_user_id must exist in audit_ledger"
    assert ledger_cols["owner_user_id"]["notnull"] == 0, "owner_user_id in audit_ledger must be nullable"
    conn.close()

def test_seed_users_and_approver_constraint():
    """Verify that exactly the 3 expected seed accounts are created with exactly one authorized approver."""
    users = database.list_users()
    usernames = {u["username"] for u in users}
    assert usernames >= {"secops_reviewer", "netadmin_uploader", "auditor_viewer"}

    reviewer = database.get_user_by_username("secops_reviewer")
    uploader = database.get_user_by_username("netadmin_uploader")
    viewer = database.get_user_by_username("auditor_viewer")

    assert reviewer is not None
    assert reviewer["role"] == "reviewer"
    assert reviewer["is_authorized_approver"] == 1
    assert reviewer["is_active"] == 1

    assert uploader is not None
    assert uploader["role"] == "uploader"
    assert uploader["is_authorized_approver"] == 0
    assert uploader["is_active"] == 1

    assert viewer is not None
    assert viewer["role"] == "viewer"
    assert viewer["is_authorized_approver"] == 0
    assert viewer["is_active"] == 1

    # Exactly one user in the database must have is_authorized_approver = 1
    approvers = [u for u in users if u["is_authorized_approver"] == 1]
    assert len(approvers) == 1, f"Expected exactly 1 authorized approver, found {len(approvers)}"
    assert approvers[0]["username"] == "secops_reviewer"

def test_no_plaintext_passwords_persisted():
    """Verify that no seed or created user stores plaintext passwords."""
    users = database.list_users()
    for u in users:
        pw_hash = u["password_hash"]
        salt = u["salt"]
        # SHA-256 output is 64 hex characters
        assert len(pw_hash) == 64, f"password_hash for {u['username']} must be 64 hex characters"
        # 16-byte salt is 32 hex characters
        assert len(salt) == 32, f"salt for {u['username']} must be 32 hex characters"
        # Must not match common plaintext strings
        assert pw_hash not in ("password", "admin", "secret", "123456", u["username"])
        assert salt != pw_hash

def test_create_user_and_get_user_by_username():
    """Verify create_user() and get_user_by_username() / get_user_by_id()."""
    created = database.create_user(
        username="qa_auditor",
        role="viewer",
        password="ValidTestPassword#2026!"
    )
    assert created["username"] == "qa_auditor"
    assert created["role"] == "viewer"
    assert created["is_authorized_approver"] == 0
    assert len(created["password_hash"]) == 64
    assert created["password_hash"] != "ValidTestPassword#2026!"

    fetched = database.get_user_by_username("qa_auditor")
    assert fetched is not None
    assert fetched["user_id"] == created["user_id"]
    assert fetched["username"] == "qa_auditor"
    assert fetched["password_hash"] == created["password_hash"]

    by_id = database.get_user_by_id(created["user_id"])
    assert by_id is not None
    assert by_id["username"] == "qa_auditor"

def test_duplicate_and_case_insensitive_username_uniqueness():
    """Verify unique constraint and case-insensitive username collision rejection."""
    # 1. Exact duplicate rejected
    with pytest.raises(sqlite3.IntegrityError):
        database.create_user(username="secops_reviewer", role="viewer", password="AnotherPassword123!")

    # 2. Case-insensitive duplicate rejected (COLLATE NOCASE)
    with pytest.raises(sqlite3.IntegrityError):
        database.create_user(username="SECOPS_REVIEWER", role="uploader", password="AnotherPassword123!")

    with pytest.raises(sqlite3.IntegrityError):
        database.create_user(username="NetAdmin_Uploader", role="viewer", password="AnotherPassword123!")

    # 3. get_user_by_username matches case-insensitively
    u = database.get_user_by_username("SECOPS_REVIEWER")
    assert u is not None
    assert u["username"].lower() == "secops_reviewer"

def test_role_constraint():
    """Verify that role check constraint rejects invalid roles."""
    with pytest.raises(ValueError):
        database.create_user(username="invalid_role_user", role="superadmin", password="TestPassword123!")

    with pytest.raises(ValueError):
        database.create_user(username="invalid_role_user2", role="root", password="TestPassword123!")

def test_repeated_initialize_database_idempotent():
    """Verify that repeated calls to initialize_database() are safe, non-destructive, and idempotent."""
    users_before = len(database.list_users())

    # Call initialize_database multiple times
    database.initialize_database()
    database.initialize_database()
    database.initialize_database()

    users_after = len(database.list_users())
    assert users_after == users_before, "Repeated initialize_database() must not duplicate users"

def test_audit_session_and_ledger_owner_preservation():
    """Verify session save/get preserves owner_user_id and ledger hash-chain stays valid."""
    session_data = {
        "session_id": "test-session-owned",
        "csm": {"device": {"hostname": "r4"}},
        "evals": {"CISCO-001": {"status": "Pass"}},
        "raw_config_text": "hostname r4\n",
        "filename": "test_owned.txt",
        "config_file_hash": "1122334455",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "owner_user_id": "user-uuid-12345"
    }
    database.save_session(session_data)
    loaded = database.get_session("test-session-owned")
    assert loaded is not None
    assert loaded["owner_user_id"] == "user-uuid-12345"

    # Hash chain in audit_log remains completely valid
    valid, msg, _ = audit_log.verify_chain()
    assert valid is True, msg

def test_fresh_database_workflow_status_and_indices():
    """Verify fresh database creation includes workflow_status column and required indices."""
    conn = database.get_connection()
    cur = conn.cursor()

    # Column check
    cur.execute("PRAGMA table_info(audit_sessions)")
    cols = {row[1]: {"notnull": row[3], "dflt_value": row[4]} for row in cur.fetchall()}
    assert "workflow_status" in cols, "workflow_status must exist in audit_sessions"
    assert cols["workflow_status"]["notnull"] == 1, "workflow_status must be NOT NULL"
    assert "'in_progress'" in str(cols["workflow_status"]["dflt_value"]), "Default must be 'in_progress'"

    # Indices check
    cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
    indices = [row[0] for row in cur.fetchall()]
    assert "idx_audit_sessions_status" in indices, "idx_audit_sessions_status index must exist"
    assert "idx_audit_sessions_owner" in indices, "idx_audit_sessions_owner index must exist"
    conn.close()

def test_migration_on_legacy_database_without_workflow_status(tmp_path):
    """Verify migration on an existing database without workflow_status succeeds non-destructively."""
    test_db = tmp_path / "legacy_test.db"
    conn = sqlite3.connect(test_db)
    cur = conn.cursor()

    # Create legacy table without workflow_status
    cur.execute('''
        CREATE TABLE audit_sessions (
            session_id TEXT PRIMARY KEY,
            csm TEXT,
            evals TEXT,
            raw_config_text TEXT,
            filename TEXT,
            config_file_hash TEXT,
            created_at TEXT,
            owner_user_id TEXT
        )
    ''')
    cur.execute('''
        INSERT INTO audit_sessions (session_id, csm, evals, raw_config_text, filename, config_file_hash, created_at, owner_user_id)
        VALUES ('leg-1', '{}', '{}', 'config', 'file1.cfg', 'hash1', '2026-09-01T00:00:00Z', 'user-1')
    ''')
    conn.commit()

    # Apply migration
    database.migrate_schema_add_workflow_status(conn)

    # Verify column added and backfilled
    cur.execute("PRAGMA table_info(audit_sessions)")
    cols = [r[1] for r in cur.fetchall()]
    assert "workflow_status" in cols

    cur.execute("SELECT workflow_status FROM audit_sessions WHERE session_id = 'leg-1'")
    assert cur.fetchone()[0] == "in_progress"

    # Verify indices
    cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
    indices = [r[0] for r in cur.fetchall()]
    assert "idx_audit_sessions_status" in indices
    assert "idx_audit_sessions_owner" in indices

    conn.close()

def test_migration_idempotence(tmp_path):
    """Verify repeated migration calls on the same connection are idempotent and produce no errors."""
    test_db = tmp_path / "idempotent_test.db"
    conn = sqlite3.connect(test_db)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE audit_sessions (
            session_id TEXT PRIMARY KEY,
            csm TEXT,
            evals TEXT,
            raw_config_text TEXT,
            filename TEXT,
            config_file_hash TEXT,
            created_at TEXT,
            owner_user_id TEXT
        )
    ''')
    conn.commit()

    # Call migration 3 times
    database.migrate_schema_add_workflow_status(conn)
    database.migrate_schema_add_workflow_status(conn)
    database.migrate_schema_add_workflow_status(conn)

    cur.execute("PRAGMA table_info(audit_sessions)")
    cols = [r[1] for r in cur.fetchall()]
    assert cols.count("workflow_status") == 1

    conn.close()

def test_existing_rows_backfilled_to_in_progress(tmp_path):
    """Verify existing rows with null/empty status get backfilled to 'in_progress'."""
    test_db = tmp_path / "backfill_test.db"
    conn = sqlite3.connect(test_db)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE audit_sessions (
            session_id TEXT PRIMARY KEY,
            csm TEXT,
            evals TEXT,
            raw_config_text TEXT,
            filename TEXT,
            config_file_hash TEXT,
            created_at TEXT,
            owner_user_id TEXT,
            workflow_status TEXT
        )
    ''')
    # Row with NULL workflow_status and empty string
    cur.execute("INSERT INTO audit_sessions (session_id, workflow_status) VALUES ('null-wf', NULL)")
    cur.execute("INSERT INTO audit_sessions (session_id, workflow_status) VALUES ('empty-wf', '')")
    cur.execute("INSERT INTO audit_sessions (session_id, workflow_status) VALUES ('valid-wf', 'submitted')")
    conn.commit()

    database.migrate_schema_add_workflow_status(conn)

    cur.execute("SELECT session_id, workflow_status FROM audit_sessions ORDER BY session_id")
    rows = dict(cur.fetchall())
    assert rows["null-wf"] == "in_progress"
    assert rows["empty-wf"] == "in_progress"
    assert rows["valid-wf"] == "submitted"

    conn.close()

def test_session_persistence_preserves_workflow_status():
    """Verify new sessions persist specified workflow_status and default to 'in_progress'."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Default to in_progress if omitted
    database.save_session({
        "session_id": "wf-sess-default",
        "csm": {"device": {"hostname": "sw-default"}},
        "evals": {"RULE-1": {"status": "Pass"}},
        "raw_config_text": "hostname sw-default\n",
        "filename": "sw-default.cfg",
        "config_file_hash": "hash_default",
        "created_at": now,
        "owner_user_id": "user-default"
    })
    s_default = database.get_session("wf-sess-default")
    assert s_default is not None
    assert s_default["workflow_status"] == "in_progress"

    # 2. Explicit submitted status
    database.save_session({
        "session_id": "wf-sess-submitted",
        "csm": {"device": {"hostname": "sw-sub"}},
        "evals": {"RULE-1": {"status": "Pass"}},
        "raw_config_text": "hostname sw-sub\n",
        "filename": "sw-sub.cfg",
        "config_file_hash": "hash_sub",
        "created_at": now,
        "owner_user_id": "user-sub",
        "workflow_status": "submitted"
    })
    s_sub = database.get_session("wf-sess-submitted")
    assert s_sub is not None
    assert s_sub["workflow_status"] == "submitted"

    # 3. Explicit finalized status
    database.save_session({
        "session_id": "wf-sess-finalized",
        "csm": {"device": {"hostname": "sw-fin"}},
        "evals": {"RULE-1": {"status": "Pass"}},
        "raw_config_text": "hostname sw-fin\n",
        "filename": "sw-fin.cfg",
        "config_file_hash": "hash_fin",
        "created_at": now,
        "owner_user_id": "user-fin",
        "workflow_status": "finalized"
    })
    s_fin = database.get_session("wf-sess-finalized")
    assert s_fin is not None
    assert s_fin["workflow_status"] == "finalized"

def test_list_sessions_deterministic_order():
    """Verify list_sessions() orders by created_at DESC, session_id DESC."""
    database.save_session({
        "session_id": "order-sess-1",
        "csm": {"device": {"hostname": "host-1", "platform": "cisco_ios"}},
        "evals": {"R1": {"status": "Pass"}},
        "raw_config_text": "config1",
        "filename": "f1.cfg",
        "config_file_hash": "h1",
        "created_at": "2026-09-20T10:00:00Z",
        "owner_user_id": "u-order"
    })
    database.save_session({
        "session_id": "order-sess-2",
        "csm": {"device": {"hostname": "host-2", "platform": "cisco_ios"}},
        "evals": {"R1": {"status": "Pass"}},
        "raw_config_text": "config2",
        "filename": "f2.cfg",
        "config_file_hash": "h2",
        "created_at": "2026-09-22T10:00:00Z",
        "owner_user_id": "u-order"
    })
    database.save_session({
        "session_id": "order-sess-3",
        "csm": {"device": {"hostname": "host-3", "platform": "cisco_ios"}},
        "evals": {"R1": {"status": "Pass"}},
        "raw_config_text": "config3",
        "filename": "f3.cfg",
        "config_file_hash": "h3",
        "created_at": "2026-09-21T10:00:00Z",
        "owner_user_id": "u-order"
    })

    sessions = database.list_sessions(owner_user_id="u-order")
    ids = [s["session_id"] for s in sessions]
    assert ids == ["order-sess-2", "order-sess-3", "order-sess-1"], f"Expected created_at DESC, got {ids}"

    # Verify summary fields
    top = sessions[0]
    assert top["session_id"] == "order-sess-2"
    assert top["device_hostname"] == "host-2"
    assert top["workflow_status"] == "in_progress"
    assert top["total_rules"] == 1
    assert top["passed_rules"] == 1
    assert top["compliance_score"] == 100.0

def test_list_sessions_owner_filtering():
    """Verify list_sessions(owner_user_id=...) filters sessions by owner."""
    user_a = "user-filter-a"
    user_b = "user-filter-b"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    database.save_session({
        "session_id": "sess-user-a1",
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "a1.cfg",
        "config_file_hash": "ha1",
        "created_at": now,
        "owner_user_id": user_a
    })
    database.save_session({
        "session_id": "sess-user-b1",
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "b1.cfg",
        "config_file_hash": "hb1",
        "created_at": now,
        "owner_user_id": user_b
    })

    list_a = database.list_sessions(owner_user_id=user_a)
    assert all(s["owner_user_id"] == user_a for s in list_a)
    assert any(s["session_id"] == "sess-user-a1" for s in list_a)
    assert not any(s["session_id"] == "sess-user-b1" for s in list_a)

    list_nonexistent = database.list_sessions(owner_user_id="non-existent-user-uuid")
    assert len(list_nonexistent) == 0

def test_list_sessions_status_filtering():
    """Verify list_sessions(status=...) filters sessions by workflow_status (case-insensitively)."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    uid = "user-status-filter"

    database.save_session({
        "session_id": "status-sess-inp",
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "s1.cfg",
        "config_file_hash": "h1",
        "created_at": now,
        "owner_user_id": uid,
        "workflow_status": "in_progress"
    })
    database.save_session({
        "session_id": "status-sess-sub",
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "s2.cfg",
        "config_file_hash": "h2",
        "created_at": now,
        "owner_user_id": uid,
        "workflow_status": "submitted"
    })
    database.save_session({
        "session_id": "status-sess-fin",
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "s3.cfg",
        "config_file_hash": "h3",
        "created_at": now,
        "owner_user_id": uid,
        "workflow_status": "finalized"
    })

    # Filter in_progress
    res_inp = database.list_sessions(owner_user_id=uid, status="in_progress")
    assert [s["session_id"] for s in res_inp] == ["status-sess-inp"]

    # Filter submitted (case-insensitive)
    res_sub = database.list_sessions(owner_user_id=uid, status="SUBMITTED")
    assert [s["session_id"] for s in res_sub] == ["status-sess-sub"]

    # Filter finalized
    res_fin = database.list_sessions(owner_user_id=uid, status="finalized")
    assert [s["session_id"] for s in res_fin] == ["status-sess-fin"]

def test_update_session_workflow_status_transitions_and_validation():
    """Verify update_session_workflow_status() validates transitions and rejects invalid statuses."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    sid = "trans-session-1"

    database.save_session({
        "session_id": sid,
        "csm": {},
        "evals": {},
        "raw_config_text": "",
        "filename": "trans.cfg",
        "config_file_hash": "htrans",
        "created_at": now,
        "workflow_status": "in_progress"
    })

    # Transition 1: in_progress -> submitted
    assert database.update_session_workflow_status(sid, "submitted") is True
    s = database.get_session(sid)
    assert s["workflow_status"] == "submitted"

    # Transition 2: submitted -> finalized
    assert database.update_session_workflow_status(sid, "finalized") is True
    s = database.get_session(sid)
    assert s["workflow_status"] == "finalized"

    # Non-existent session returns False
    assert database.update_session_workflow_status("does-not-exist-sid", "submitted") is False

    # Invalid status raises ValueError
    with pytest.raises(ValueError):
        database.update_session_workflow_status(sid, "invalid_status")

    with pytest.raises(ValueError):
        database.update_session_workflow_status(sid, "reviewing")

    with pytest.raises(ValueError):
        database.update_session_workflow_status(sid, "")


