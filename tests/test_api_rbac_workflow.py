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
    valid, msg, broken_idx = audit_log.verify_chain()
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


# ==============================================================================
# 5. AUDIT WORKFLOW END-TO-END INTEGRATION TEST (Phase 3.3)
# ==============================================================================

def test_full_audit_workflow_e2e(uploader_a_token, uploader_b_token, reviewer_token, viewer_token):
    """End-to-end multi-role audit lifecycle test:
    Uploader: upload -> in_progress -> inspect (non-mutating) -> submit -> submitted -> inspect -> cross-owner checks
    Reviewer: list -> submitted appears -> inspect (read-only, no UNDER_REVIEW) -> finalize -> ledger owner is uploader -> hash-chain verified
    Viewer: list -> inspect -> download/verify reports -> denied all mutation (upload/submit/finalize/approve)
    """
    # 1. UPLOADER STAGE
    # Upload valid Cisco configuration
    resp_up = client.post(
        "/api/audit/upload",
        json={"raw_config": SAMPLE_CONFIG, "filename": "core_switch.cfg"},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_up.status_code == 200, resp_up.json()
    sess_id = resp_up.json()["session_id"]

    # Verify session created with workflow_status='in_progress' and owner_user_id='usr-uploader-a'
    saved_session = database.get_session(sess_id)
    assert saved_session is not None
    assert saved_session["workflow_status"] == "in_progress"
    assert saved_session["owner_user_id"] == "usr-uploader-a"

    # Retrieve session results
    resp_res = client.get(
        f"/api/audit/{sess_id}/results",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["workflow_status"] == "in_progress"

    # Confirm GET results does NOT mutate workflow_status
    assert database.get_session(sess_id)["workflow_status"] == "in_progress"

    # Submit session for reviewer attention
    resp_sub = client.post(
        f"/api/audit/{sess_id}/submit",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_sub.status_code == 200
    assert resp_sub.json()["workflow_status"] == "submitted"

    # Confirm status in database is now 'submitted'
    assert database.get_session(sess_id)["workflow_status"] == "submitted"

    # Confirm uploader can still inspect the submitted session
    resp_res_sub = client.get(
        f"/api/audit/{sess_id}/results",
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_res_sub.status_code == 200
    assert resp_res_sub.json()["workflow_status"] == "submitted"

    # Confirm Uploader B cannot submit Uploader A's session (404)
    resp_b_submit = client.post(
        f"/api/audit/{sess_id}/submit",
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_b_submit.status_code == 404

    # Confirm Uploader B cannot inspect Uploader A's session (404)
    resp_b_inspect = client.get(
        f"/api/audit/{sess_id}/results",
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_b_inspect.status_code == 404

    # 2. REVIEWER STAGE
    # Reviewer lists sessions
    resp_rev_list = client.get(
        "/api/audit/sessions",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_rev_list.status_code == 200
    matching = [s for s in resp_rev_list.json() if s["session_id"] == sess_id]
    assert len(matching) == 1
    assert matching[0]["workflow_status"] == "submitted"

    # Reviewer inspects submitted audit
    resp_rev_res = client.get(
        f"/api/audit/{sess_id}/results",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_rev_res.status_code == 200
    assert resp_rev_res.json()["workflow_status"] == "submitted"

    # Confirm inspection is strictly read-only (no UNDER_REVIEW)
    assert database.get_session(sess_id)["workflow_status"] == "submitted"

    # Reviewer finalizes the uploader's submitted audit
    resp_fin = client.post(
        "/api/audit/finalize",
        json={"session_id": sess_id, "remediation_summary": {"SSH": "compliant"}},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_fin.status_code == 200
    fin_data = resp_fin.json()
    entry_id = fin_data["entry_id"]

    # Confirm session status becomes 'finalized'
    assert database.get_session(sess_id)["workflow_status"] == "finalized"

    # Confirm ledger entry owner_user_id is the original uploader
    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT owner_user_id FROM audit_ledger WHERE entry_id = ?", (entry_id,))
    ledger_row = cur.fetchone()
    assert ledger_row is not None
    assert ledger_row[0] == "usr-uploader-a", "Ledger owner must be original uploader, not reviewer"
    conn.close()

    # Confirm hash-chain verification still succeeds
    valid, msg, _ = audit_log.verify_chain()
    assert valid is True, f"Hash chain verification failed: {msg}"

    # Confirm report download succeeds
    resp_dl = client.get(
        f"/api/report/{entry_id}/download",
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_dl.status_code == 200

    # 3. VIEWER STAGE
    # Viewer lists sessions
    resp_view_list = client.get(
        "/api/audit/sessions",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_view_list.status_code == 200
    assert any(s["session_id"] == sess_id for s in resp_view_list.json())

    # Viewer inspects results
    resp_view_res = client.get(
        f"/api/audit/{sess_id}/results",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert resp_view_res.status_code == 200
    assert resp_view_res.json()["workflow_status"] == "finalized"

    # Viewer accesses permitted reports
    assert client.get(f"/api/report/{entry_id}/download", headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 200
    assert client.get(f"/api/report/{entry_id}/verify", headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 200

    # Confirm viewer CANNOT mutate workflow
    # Cannot upload
    assert client.post("/api/audit/upload", json={"raw_config": SAMPLE_CONFIG}, headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 403
    # Cannot submit
    assert client.post(f"/api/audit/{sess_id}/submit", headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 403
    # Cannot finalize
    assert client.post("/api/audit/finalize", json={"session_id": sess_id}, headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 403
    # Cannot approve AI suggestion
    assert client.post("/api/ai/approve", json={"suggestion_id": "dummy", "decision": "approve"}, headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 403


# ==============================================================================
# 6. MAPPING REVIEW INDEPENDENCE FROM AUDIT WORKFLOW
# ==============================================================================

def test_mapping_review_separated_from_audit_workflow(uploader_a_token, reviewer_token):
    """Verify that mapping suggestions and approvals/rejections do not alter audit workflow_status."""
    # Seed an in_progress session and a submitted session
    seed_session("sess-map-inp", "usr-uploader-a", "in_progress")
    seed_session("sess-map-sub", "usr-uploader-a", "submitted")

    # 1. AI Suggestion does not change workflow_status
    resp_sug = client.post(
        "/api/ai/suggest",
        json={"unmapped_line": "service password-encryption", "vendor": "cisco"},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert resp_sug.status_code == 200
    sug_id = resp_sug.json()["suggestion_id"]

    # Verify sessions remain untouched
    assert database.get_session("sess-map-inp")["workflow_status"] == "in_progress"
    assert database.get_session("sess-map-sub")["workflow_status"] == "submitted"

    # 2. Non-approver reviewer cannot approve mapping
    non_approver_token = auth.create_access_token(
        user_id="usr-reviewer-no-app",
        username="secops_junior",
        role="reviewer",
        is_authorized_approver=False,
    )
    resp_no_app = client.post(
        "/api/ai/approve",
        json={"suggestion_id": sug_id, "decision": "approve", "session_id": "sess-map-sub"},
        headers={"Authorization": f"Bearer {non_approver_token}"}
    )
    assert resp_no_app.status_code == 403

    # 3. Authorized reviewer approves mapping with session_id
    resp_app = client.post(
        "/api/ai/approve",
        json={"suggestion_id": sug_id, "decision": "approve", "session_id": "sess-map-sub"},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_app.status_code == 200

    # CRUCIAL INVARIANT: session workflow_status is STILL 'submitted', not finalized!
    assert database.get_session("sess-map-sub")["workflow_status"] == "submitted"

    # 4. Another suggestion rejected does not alter session status
    resp_sug2 = client.post(
        "/api/ai/suggest",
        json={"unmapped_line": "ntp server 10.0.0.1", "vendor": "cisco"},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    sug_id2 = resp_sug2.json()["suggestion_id"]

    resp_rej = client.post(
        "/api/ai/approve",
        json={"suggestion_id": sug_id2, "decision": "reject", "session_id": "sess-map-sub"},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert resp_rej.status_code == 200
    assert database.get_session("sess-map-sub")["workflow_status"] == "submitted"


# ==============================================================================
# 7. HORIZONTAL PRIVILEGE BOUNDARIES (Strict 404 Anti-Enumeration)
# ==============================================================================

def test_horizontal_privilege_boundaries_strict_404(uploader_a_token, uploader_b_token, reviewer_token):
    """Verify all 5 cross-owner actions by uploaders return indistinguishable 404 Not Found."""
    seed_session("sess-a-priv", "usr-uploader-a", "in_progress")
    seed_session("sess-b-priv", "usr-uploader-b", "in_progress")

    # Finalize B's session to generate a report
    resp_fin_b = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-b-priv", "remediation_summary": {}},
        headers={"Authorization": f"Bearer {uploader_b_token}"}
    )
    assert resp_fin_b.status_code == 200
    entry_id_b = resp_fin_b.json()["entry_id"]

    headers_a = {"Authorization": f"Bearer {uploader_a_token}"}

    # 1. Uploader A cannot inspect B's session results
    r1 = client.get("/api/audit/sess-b-priv/results", headers=headers_a)
    assert r1.status_code == 404
    assert "not found" in r1.json()["detail"].lower()

    # 2. Uploader A cannot submit B's session
    r2 = client.post("/api/audit/sess-b-priv/submit", headers=headers_a)
    assert r2.status_code == 404
    assert "not found" in r2.json()["detail"].lower()

    # 3. Uploader A cannot finalize B's session
    r3 = client.post("/api/audit/finalize", json={"session_id": "sess-b-priv"}, headers=headers_a)
    assert r3.status_code == 404
    assert "not found" in r3.json()["detail"].lower()

    # 4. Uploader A cannot download B's report
    r4 = client.get(f"/api/report/{entry_id_b}/download", headers=headers_a)
    assert r4.status_code == 404
    assert "not found" in r4.json()["detail"].lower()

    # 5. Uploader A cannot verify B's report
    r5 = client.get(f"/api/report/{entry_id_b}/verify", headers=headers_a)
    assert r5.status_code == 404
    assert "not found" in r5.json()["detail"].lower()

    # Compare 404 message against non-existent session
    r_nonexist = client.get("/api/audit/does-not-exist/results", headers=headers_a)
    assert r1.json()["detail"] == "Session 'sess-b-priv' not found."
    assert r_nonexist.json()["detail"] == "Session 'does-not-exist' not found."


# ==============================================================================
# 8. CLIENT-SUPPLIED IDENTITY OVERRIDE RESISTANCE
# ==============================================================================

def test_client_supplied_identity_ignored(uploader_a_token):
    """Verify that client-supplied identity in body, query, or headers cannot override JWT identity."""
    spoof_headers = {
        "Authorization": f"Bearer {uploader_a_token}",
        "X-User-ID": "usr-uploader-b",
        "X-Owner-ID": "usr-uploader-b",
        "X-Forwarded-User": "usr-uploader-b"
    }

    # 1. Upload with spoofing attempts
    resp_up = client.post(
        "/api/audit/upload?owner_user_id=usr-uploader-b",
        json={
            "raw_config": SAMPLE_CONFIG,
            "filename": "spoof_test.cfg",
            "owner_user_id": "usr-uploader-b",
            "created_by": "usr-uploader-b"
        },
        headers=spoof_headers
    )
    assert resp_up.status_code == 200
    sess_id = resp_up.json()["session_id"]

    # Verify database stored actual authenticated identity
    session = database.get_session(sess_id)
    assert session["owner_user_id"] == "usr-uploader-a", "Server MUST ignore client-supplied owner overrides"

    # 2. Finalize with spoofing attempts
    resp_fin = client.post(
        "/api/audit/finalize?owner_user_id=usr-uploader-b",
        json={
            "session_id": sess_id,
            "remediation_summary": {},
            "owner_user_id": "usr-uploader-b"
        },
        headers=spoof_headers
    )
    assert resp_fin.status_code == 200
    entry_id = resp_fin.json()["entry_id"]

    conn = database.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT owner_user_id FROM audit_ledger WHERE entry_id = ?", (entry_id,))
    ledger_owner = cur.fetchone()[0]
    conn.close()

    assert ledger_owner == "usr-uploader-a", "Ledger owner MUST derive from server session owner"


# ==============================================================================
# 9. READ-ONLY GET INVARIANTS (No UNDER_REVIEW state)
# ==============================================================================

def test_read_only_get_invariants_no_under_review(uploader_a_token, reviewer_token, viewer_token):
    """Verify that all GET endpoints are strictly side-effect free and no UNDER_REVIEW state exists."""
    seed_session("sess-no-mutate", "usr-uploader-a", "submitted")

    # Initial assertion
    assert database.get_session("sess-no-mutate")["workflow_status"] == "submitted"

    # Multiple GET calls from different roles
    tokens = [uploader_a_token, reviewer_token, viewer_token]
    for tok in tokens:
        headers = {"Authorization": f"Bearer {tok}"}

        # GET /api/audit/sessions
        r_list = client.get("/api/audit/sessions", headers=headers)
        assert r_list.status_code == 200

        # GET /api/audit/sessions?status=submitted
        r_list_sub = client.get("/api/audit/sessions?status=submitted", headers=headers)
        assert r_list_sub.status_code == 200

        # GET /api/audit/{id}/results
        r_res = client.get("/api/audit/sess-no-mutate/results", headers=headers)
        assert r_res.status_code == 200
        assert r_res.json()["workflow_status"] == "submitted"

        # GET /api/ledger
        r_led = client.get("/api/ledger", headers=headers)
        assert r_led.status_code == 200

    # Status must STILL be 'submitted'
    final_session = database.get_session("sess-no-mutate")
    assert final_session["workflow_status"] == "submitted"
    assert "under_review" not in final_session["workflow_status"].lower()


# ==============================================================================
# 10. FINALIZATION COMPATIBILITY (Path A vs Path B)
# ==============================================================================

def test_finalization_compatibility_both_paths(uploader_a_token, reviewer_token):
    """Verify that both Path A (in_progress -> submitted -> finalized) and
    Path B (in_progress -> finalized directly) remain completely supported.
    """
    # PATH A: in_progress -> submitted -> finalized
    seed_session("sess-path-a", "usr-uploader-a", "in_progress")
    # Submit
    r_sub = client.post("/api/audit/sess-path-a/submit", headers={"Authorization": f"Bearer {uploader_a_token}"})
    assert r_sub.status_code == 200
    assert database.get_session("sess-path-a")["workflow_status"] == "submitted"
    # Finalize by reviewer
    r_fin_a = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-path-a", "remediation_summary": {}},
        headers={"Authorization": f"Bearer {reviewer_token}"}
    )
    assert r_fin_a.status_code == 200
    assert database.get_session("sess-path-a")["workflow_status"] == "finalized"

    # PATH B: in_progress -> finalized directly (compatibility path)
    seed_session("sess-path-b", "usr-uploader-a", "in_progress")
    # Direct finalize by uploader
    r_fin_b = client.post(
        "/api/audit/finalize",
        json={"session_id": "sess-path-b", "remediation_summary": {}},
        headers={"Authorization": f"Bearer {uploader_a_token}"}
    )
    assert r_fin_b.status_code == 200
    assert database.get_session("sess-path-b")["workflow_status"] == "finalized"

    # Both paths have valid hash chain
    valid, msg, _ = audit_log.verify_chain()
    assert valid is True, f"Hash chain verification failed: {msg}"
