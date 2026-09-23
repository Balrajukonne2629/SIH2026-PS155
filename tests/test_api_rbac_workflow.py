"""
NTRO PS26155 Auditor — Backend Audit Workflow API & Ownership Hardening Tests (Phase 3.2).

Verifies the frozen 3-state workflow: IN_PROGRESS -> SUBMITTED -> FINALIZED:
1. GET /api/audit/sessions:
   - Viewer receives all sessions
   - Uploader receives only own sessions (owner_user_id == current_user['sub'])
   - Reviewer receives all sessions
   - Status filtering works (?status=in_progress, ?status=submitted, ?status=finalized)
   - Invalid/unknown status returns empty list (established REST filter convention)
   - Unauthenticated requests are rejected (401)
2. POST /api/audit/{session_id}/submit:
   - Uploader can submit own in_progress session -> workflow_status=submitted
   - Viewer receives 403 Forbidden
   - Reviewer receives 403 Forbidden (allowed role is uploader only)
   - Uploader cannot submit another uploader's session (404 anti-enumeration)
   - Non-existent session returns 404
   - Finalized session cannot be submitted (400 Bad Request)
   - Already submitted session cannot be re-submitted (400 Bad Request)
3. POST /api/audit/finalize:
   - Uploader can finalize own session
   - Reviewer can finalize another uploader's session
   - Viewer cannot finalize (403 Forbidden)
   - Successful finalization sets audit_sessions.workflow_status='finalized'
   - Audit ledger owner_user_id is persisted from authoritative session owner
   - Cryptographic ledger hash chain verification remains completely valid
4. GET /api/report/{entry_id}/download:
   - Uploader can download own report
   - Cross-owner download by uploader returns 404 (anti-enumeration)
   - Reviewer can download report
   - Viewer can download report
   - Non-existent entry returns 404
5. GET /api/report/{entry_id}/verify:
   - Uploader can verify own report
   - Cross-owner verification by uploader returns 404 (anti-enumeration)
   - Reviewer can verify report
   - Viewer can verify report
   - Non-existent entry returns 404
"""

import datetime
import json
import pathlib
import pytest
from fastapi.testclient import TestClient

import audit_log
import auth
import database
import main
from main import app

client = TestClient(app)

SAMPLE_CONFIG = """
hostname TEST-ROUTER-01
!
interface GigabitEthernet0/0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
line vty 0 4
 transport input ssh
!
end
"""


@pytest.fixture(autouse=True)
def clean_test_db(tmp_path):
    """Provides an isolated database and log file for each test."""
    import src.database as src_db
    test_db = tmp_path / "api_workflow_test.db"
    test_log = tmp_path / "audit_log.jsonl"
    orig_db = database.DB_PATH
    orig_src_db = src_db.DB_PATH
    orig_log = audit_log.DEFAULT_LOG_FILE
    orig_main_log = main.LOG_FILE

    database.DB_PATH = test_db
    src_db.DB_PATH = test_db
    audit_log.DEFAULT_LOG_FILE = test_log
    main.LOG_FILE = test_log
    database.initialize_database()

    yield test_db

    database.DB_PATH = orig_db
    src_db.DB_PATH = orig_src_db
    audit_log.DEFAULT_LOG_FILE = orig_log
    main.LOG_FILE = orig_main_log


@pytest.fixture
def uploader_a_token():
    return auth.create_access_token(
        user_id="usr-uploader-a",
        username="uploader_alice",
        role="uploader",
        is_authorized_approver=False,
    )


@pytest.fixture
def uploader_b_token():
    return auth.create_access_token(
        user_id="usr-uploader-b",
        username="uploader_bob",
        role="uploader",
        is_authorized_approver=False,
    )


@pytest.fixture
def reviewer_token():
    return auth.create_access_token(
        user_id="usr-reviewer-lead",
        username="secops_lead",
        role="reviewer",
        is_authorized_approver=True,
    )


@pytest.fixture
def viewer_token():
    return auth.create_access_token(
        user_id="usr-viewer-01",
        username="auditor_viewer",
        role="viewer",
        is_authorized_approver=False,
    )


def seed_session(session_id: str, owner_id: str, status: str = "in_progress", timestamp: str = None) -> dict:
    """Helper to seed an audit session directly in SQLite."""
    now_ts = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()
    session_data = {
        "session_id": session_id,
        "csm": {
            "device": {"hostname": f"host-{session_id}", "platform": "cisco_ios"},
            "interfaces": [{"name": "GigabitEthernet0/0/0"}]
        },
        "evals": {
            "CISCO-TEST-001": {"status": "Pass", "title": "SSH Enabled", "focus": "SSH"},
            "CISCO-TEST-002": {"status": "Fail", "title": "Password Encryption", "focus": "Service password-encryption"}
        },
        "raw_config_text": SAMPLE_CONFIG,
        "filename": f"{session_id}.cfg",
        "config_file_hash": f"hash_{session_id}",
        "created_at": now_ts,
        "owner_user_id": owner_id,
        "workflow_status": status
    }
    database.save_session(session_data)
    return session_data


# ==============================================================================
# 1. SESSION LISTING (GET /api/audit/sessions)
# ==============================================================================

def test_list_sessions_unauthenticated_rejected():
    """Unauthenticated requests to /api/audit/sessions must return 401."""
    resp = client.get("/api/audit/sessions")
    assert resp.status_code == 401


def test_list_sessions_role_isolation(uploader_a_token, uploader_b_token, reviewer_token, viewer_token):
    """Verify uploader receives only own sessions, while reviewer and viewer receive all."""
    seed_session("sess-a-1", "usr-uploader-a", "in_progress", "2026-09-20T10:00:00Z")
    seed_session("sess-a-2", "usr-uploader-a", "submitted", "2026-09-21T10:00:00Z")
    seed_session("sess-b-1", "usr-uploader-b", "in_progress", "2026-09-22T10:00:00Z")

    # 1. Uploader A sees only sess-a-1 and sess-a-2
    resp_a = client.get("/api/audit/sessions", headers={"Authorization": f"Bearer {uploader_a_token}"})
    assert resp_a.status_code == 200
    sessions_a = resp_a.json()
    ids_a = [s["session_id"] for s in sessions_a]
    assert set(ids_a) == {"sess-a-1", "sess-a-2"}
    assert all(s["owner_user_id"] == "usr-uploader-a" for s in sessions_a)

    # 2. Uploader B sees only sess-b-1
    resp_b = client.get("/api/audit/sessions", headers={"Authorization": f"Bearer {uploader_b_token}"})
    assert resp_b.status_code == 200
    sessions_b = resp_b.json()
    assert [s["session_id"] for s in sessions_b] == ["sess-b-1"]

    # 3. Reviewer sees all sessions
    resp_rev = client.get("/api/audit/sessions", headers={"Authorization": f"Bearer {reviewer_token}"})
    assert resp_rev.status_code == 200
    sessions_rev = resp_rev.json()
    ids_rev = [s["session_id"] for s in sessions_rev]
    assert set(ids_rev) == {"sess-a-1", "sess-a-2", "sess-b-1"}

    # 4. Viewer sees all sessions (read-only)
    resp_view = client.get("/api/audit/sessions", headers={"Authorization": f"Bearer {viewer_token}"})
    assert resp_view.status_code == 200
    sessions_view = resp_view.json()
    ids_view = [s["session_id"] for s in sessions_view]
    assert set(ids_view) == {"sess-a-1", "sess-a-2", "sess-b-1"}


def test_list_sessions_status_filtering(reviewer_token):
    """Verify ?status= filtering returns correct subset and unknown status returns empty list."""
    seed_session("sess-inp", "usr-uploader-a", "in_progress", "2026-09-20T10:00:00Z")
    seed_session("sess-sub", "usr-uploader-a", "submitted", "2026-09-21T10:00:00Z")
    seed_session("sess-fin", "usr-uploader-b", "finalized", "2026-09-22T10:00:00Z")

    headers = {"Authorization": f"Bearer {reviewer_token}"}

    # Filter in_progress
    resp = client.get("/api/audit/sessions?status=in_progress", headers=headers)
    assert resp.status_code == 200
    assert [s["session_id"] for s in resp.json()] == ["sess-inp"]

    # Filter submitted
    resp = client.get("/api/audit/sessions?status=submitted", headers=headers)
    assert resp.status_code == 200
    assert [s["session_id"] for s in resp.json()] == ["sess-sub"]

    # Filter finalized
    resp = client.get("/api/audit/sessions?status=finalized", headers=headers)
    assert resp.status_code == 200
    assert [s["session_id"] for s in resp.json()] == ["sess-fin"]

    # Unknown / non-existent status returns empty list
    resp = client.get("/api/audit/sessions?status=nonexistent_status", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_sessions_deterministic_order(reviewer_token):
    """Verify sessions are ordered deterministically by created_at DESC, session_id DESC."""
    seed_session("sess-1", "usr-uploader-a", "in_progress", "2026-09-20T10:00:00Z")
    seed_session("sess-3", "usr-uploader-a", "in_progress", "2026-09-22T10:00:00Z")
    seed_session("sess-2", "usr-uploader-a", "in_progress", "2026-09-21T10:00:00Z")

    resp = client.get("/api/audit/sessions", headers={"Authorization": f"Bearer {reviewer_token}"})
    assert resp.status_code == 200
    ids = [s["session_id"] for s in resp.json()]
    assert ids == ["sess-3", "sess-2", "sess-1"]


# ==============================================================================
# 2. SUBMISSION (POST /api/audit/{session_id}/submit)
# ==============================================================================

def test_submit_session_success(uploader_a_token):
    """Uploader can submit own in_progress session, which transitions to 'submitted'."""
    seed_session("sess-submit-1", "usr-uploader-a", "in_progress")

    resp = client.post(
        "/api/audit/sess-submit-1/submit",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == "sess-submit-1"
    assert data["workflow_status"] == "submitted"

    # Verify persisted in database
    saved = database.get_session("sess-submit-1")
    assert saved["workflow_status"] == "submitted"


def test_submit_session_viewer_and_reviewer_forbidden(viewer_token, reviewer_token):
    """Viewer and Reviewer calling /submit receive 403 Forbidden."""
    seed_session("sess-submit-rbac", "usr-uploader-a", "in_progress")

    # Viewer
    resp_v = client.post(
        "/api/audit/sess-submit-rbac/submit",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_v.status_code == 403

    # Reviewer
    resp_r = client.post(
        "/api/audit/sess-submit-rbac/submit",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_r.status_code == 403


def test_submit_cross_owner_anti_enumeration(uploader_a_token, uploader_b_token):
    """Uploader B attempting to submit Uploader A's session receives 404 (anti-enumeration)."""
    seed_session("sess-owned-by-a", "usr-uploader-a", "in_progress")

    resp = client.post(
        "/api/audit/sess-owned-by-a/submit",
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

    # Verify session was NOT mutated
    session = database.get_session("sess-owned-by-a")
    assert session["workflow_status"] == "in_progress"


def test_submit_nonexistent_session_returns_404(uploader_a_token):
    """Submitting a non-existent session returns 404."""
    resp = client.post(
        "/api/audit/nonexistent-session-id/submit",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp.status_code == 404


def test_submit_invalid_transitions_rejected(uploader_a_token):
    """Cannot submit a session that is already submitted or finalized."""
    # 1. Already submitted
    seed_session("sess-already-sub", "usr-uploader-a", "submitted")
    resp_sub = client.post(
        "/api/audit/sess-already-sub/submit",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_sub.status_code in (400, 409)

    # 2. Finalized
    seed_session("sess-already-fin", "usr-uploader-a", "finalized")
    resp_fin = client.post(
        "/api/audit/sess-already-fin/submit",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_fin.status_code in (400, 409)


# ==============================================================================
# 3. FINALIZATION (POST /api/audit/finalize)
# ==============================================================================

def test_finalization_uploader_and_reviewer_authorization(uploader_a_token, uploader_b_token, reviewer_token, viewer_token):
    """Verify finalization permissions: uploader own only, reviewer any, viewer denied."""
    seed_session("sess-fin-a", "usr-uploader-a", "submitted")
    seed_session("sess-fin-b", "usr-uploader-b", "submitted")

    # 1. Viewer cannot finalize
    resp_v = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-fin-a", "remediation_summary": {"rule_1": "fix"}},
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_v.status_code == 403

    # 2. Uploader B cannot finalize Uploader A's session (404 anti-enumeration)
    resp_b_cross = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-fin-a", "remediation_summary": {"rule_1": "fix"}},
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_b_cross.status_code == 404

    # 3. Uploader A can finalize own session
    resp_a = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-fin-a", "remediation_summary": {"rule_1": "fix"}},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert "entry_id" in data_a

    # Check workflow_status is finalized
    session_a = database.get_session("sess-fin-a")
    assert session_a["workflow_status"] == "finalized"

    # Check ledger entry owner_user_id is populated
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT owner_user_id FROM audit_ledger WHERE entry_id = ?", (data_a["entry_id"],))
    ledger_row = cur.fetchone()
    assert ledger_row is not None
    assert ledger_row[0] == "usr-uploader-a"
    conn.close()

    # 4. Reviewer can finalize Uploader B's session
    resp_rev = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-fin-b", "remediation_summary": {"rule_2": "fix"}},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_rev.status_code == 200
    data_b = resp_rev.json()

    # Workflow status is finalized
    session_b = database.get_session("sess-fin-b")
    assert session_b["workflow_status"] == "finalized"

    # Crucial: ledger owner is authoritative session owner (usr-uploader-b), NOT reviewer
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT owner_user_id FROM audit_ledger WHERE entry_id = ?", (data_b["entry_id"],))
    ledger_row_b = cur.fetchone()
    assert ledger_row_b is not None
    assert ledger_row_b[0] == "usr-uploader-b"
    conn.close()

    # 5. Ledger hash chain verification still succeeds
    valid, msg, broken_idx = audit_log.verify_chain(main.LOG_FILE)
    assert valid is True, f"Hash chain verification failed: {msg}"


# ==============================================================================
# 4. REPORT OWNERSHIP (GET /api/report/{entry_id}/download & verify)
# ==============================================================================

def test_report_download_and_verify_ownership(uploader_a_token, uploader_b_token, reviewer_token, viewer_token):
    """Verify uploader access is restricted to own reports (404 for cross-owner), while reviewer and viewer can access."""
    # Seed and finalize session for Uploader A
    seed_session("sess-rep-a", "usr-uploader-a", "in_progress")
    resp_fin = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-rep-a", "remediation_summary": {"test": "ok"}},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_fin.status_code == 200
    entry_id_a = resp_fin.json()["entry_id"]

    # --- DOWNLOAD TESTS ---
    # 1. Uploader A can download own report
    resp_dl_a = client.get(
        f"/api/report/{entry_id_a}/download",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_dl_a.status_code == 200
    assert resp_dl_a.headers["content-type"] == "application/pdf"

    # 2. Uploader B cannot download Uploader A's report (404 anti-enumeration)
    resp_dl_b = client.get(
        f"/api/report/{entry_id_a}/download",
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_dl_b.status_code == 404

    # 3. Reviewer can download
    resp_dl_rev = client.get(
        f"/api/report/{entry_id_a}/download",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_dl_rev.status_code == 200

    # 4. Viewer can download
    resp_dl_view = client.get(
        f"/api/report/{entry_id_a}/download",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_dl_view.status_code == 200

    # --- VERIFY TESTS ---
    # 1. Uploader A can verify own report
    resp_ver_a = client.get(
        f"/api/report/{entry_id_a}/verify",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_ver_a.status_code == 200
    assert "valid" in resp_ver_a.json()

    # 2. Uploader B cannot verify Uploader A's report (404 anti-enumeration)
    resp_ver_b = client.get(
        f"/api/report/{entry_id_a}/verify",
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_ver_b.status_code == 404

    # 3. Reviewer can verify
    resp_ver_rev = client.get(
        f"/api/report/{entry_id_a}/verify",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_ver_rev.status_code == 200
    assert "valid" in resp_ver_rev.json()

    # 4. Viewer can verify
    resp_ver_view = client.get(
        f"/api/report/{entry_id_a}/verify",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_ver_view.status_code == 200
    assert "valid" in resp_ver_view.json()

    # 5. Non-existent entry returns 404 for all
    assert client.get("/api/report/nonexistent-entry-id/download", headers={"Authorization": f"Bearer {reviewer_token}"}).status_code == 404
    assert client.get("/api/report/nonexistent-entry-id/verify", headers={"Authorization": f"Bearer {reviewer_token}"}).status_code == 404
