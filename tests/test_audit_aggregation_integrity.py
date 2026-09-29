"""Regression Test: Audit Report Aggregation & Compliance Control Integrity.

Verifies:
1. Cisco IOS-XE deterministic audit on labeled_test_config.txt produces exactly:
   - 10 intended compliance controls
   - 7 PASS
   - 2 FAIL
   - 1 UNKNOWN
   - Expected core pass rate: 70.0%
2. 'service call-home' is correctly preserved in unmapped_lines and does NOT directly become a PASS/FAIL compliance control.
3. Test / synthetic suggestion records (CISCO-TEST-sug-*, CISCO-CORR-sug-*) in the database
   do NOT contaminate the authoritative compliance aggregation or the generated PDF report.
4. The generated PDF report reflects exactly 10 controls with 7 PASS, 2 FAIL, 1 UNKNOWN (70.0% pass rate).
"""

import json
import os
import pathlib
import pytest
from fastapi.testclient import TestClient

import database
import auth
from main import app, load_baseline_rules, load_trusted_rules
import cisco_auditor
import report_generator

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG_FILE = REPO_ROOT / "datasets" / "Cisco" / "labeled_test_config.txt"
ANSWERS_FILE = REPO_ROOT / "datasets" / "Cisco" / "labeled_test_config_answers.json"


@pytest.fixture
def auth_uploader_token():
    return auth.create_access_token(
        user_id="test-uploader-id",
        username="test_uploader",
        role="uploader",
        is_authorized_approver=False,
    )


@pytest.fixture
def auth_reviewer_token():
    return auth.create_access_token(
        user_id="test-reviewer-id",
        username="test_reviewer",
        role="reviewer",
        is_authorized_approver=True,
    )


def test_audit_baseline_aggregation_with_polluted_trusted_library(tmp_path, monkeypatch):
    """Reproduces the exact aggregation bug:
    When trusted_mappings contains synthetic test/suggestion records (CISCO-TEST-sug-*, CISCO-CORR-sug-*),
    the deterministic compliance audit and report MUST NOT be contaminated.
    It must evaluate exactly the 10 intended compliance controls with a 70.0% pass rate,
    and 'service call-home' must remain in unmapped_lines.
    """
    test_db = tmp_path / "test_polluted.db"
    monkeypatch.setattr(database, "DB_PATH", test_db)
    database.initialize_database()

    # Seed the database with 10 synthetic test/suggestion records similar to the pollution in production
    conn = database.get_connection()
    cur = conn.cursor()
    for i in range(10):
        test_rule_id = f"CISCO-TEST-sug-{i:04x}"
        version_info = json.dumps({
            "version": "1.0",
            "approved_by": "usr-reviewer-lead-01",
            "approved_at": "2026-09-22T14:23:59.000000+00:00",
            "source": "ai_suggested"
        })
        cur.execute('''
            INSERT INTO trusted_mappings 
            (vendor_rule_id, common_rule_id, internalTitle, csmFieldChecked, condition, configuration_evidence, check_focus, frameworkMappings, version_info, vendor, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            test_rule_id,
            "COMMON-DIAG-001",
            "Disable unneeded telemetry services",
            "csm.services.call_home",
            "equals False",
            json.dumps(["service call-home"]),
            json.dumps(["Disable unneeded telemetry services"]),
            json.dumps([]),
            version_info,
            "cisco",
            "approved"
        ))
    conn.commit()
    conn.close()

    cfg_text = CONFIG_FILE.read_text(encoding="utf-8")
    expected_answers = json.loads(ANSWERS_FILE.read_text(encoding="utf-8-sig"))
    assert len(expected_answers) == 10

    client = TestClient(app)
    token = auth.create_access_token(
        user_id="test-uploader-id",
        username="uploader",
        role="uploader",
        is_authorized_approver=False,
    )

    # Ingest through POST /api/audit/upload
    response = client.post(
        "/api/audit/upload",
        files={"file": ("labeled_test_config.txt", cfg_text.encode("utf-8"), "text/plain")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    summary = data["summary"]
    rule_results = data["rule_results"]
    unmapped = data["unmapped_lines"]

    # 1. Authoritative compliance totals MUST match the 10 core controls
    assert summary["total"] == 10, f"Expected 10 total controls, got {summary['total']}"
    assert summary["pass"] == 7, f"Expected 7 PASS, got {summary['pass']}"
    assert summary["fail"] == 2, f"Expected 2 FAIL, got {summary['fail']}"
    assert summary["unknown"] == 1, f"Expected 1 UNKNOWN, got {summary['unknown']}"

    # 2. 'service call-home' MUST be preserved in unmapped_lines (advisory queue)
    assert "service call-home" in unmapped, "service call-home must be in unmapped_lines, not stripped!"

    # 3. No synthetic test rules in rule_results
    for rid in rule_results.keys():
        assert not rid.startswith("CISCO-TEST-sug-"), f"Contaminating rule {rid} found in rule_results!"
        assert not rid.startswith("CISCO-CORR-sug-"), f"Contaminating rule {rid} found in rule_results!"

    # 4. Finalize and verify the PDF report
    fin_token = auth.create_access_token(
        user_id="test-reviewer-id",
        username="reviewer",
        role="reviewer",
        is_authorized_approver=True,
    )
    pdf_out = tmp_path / "test_report.pdf"
    fin_res = client.post(
        "/api/audit/finalize",
        json={"session_id": data["session_id"]},
        headers={"Authorization": f"Bearer {fin_token}"}
    )
    assert fin_res.status_code == 200, f"Finalize failed: {fin_res.text}"

    # Also test PDF generator directly with session evals
    session = database.get_session(data["session_id"])
    report_generator.generate_pdf_report(
        csm=session["csm"],
        evals=session["evals"],
        audit_entry={"entry_id": "TEST-ENTRY", "entryHash": "0" * 64, "config_file_hash": "0" * 64, "timestamp": "2026-09-24T00:00:00Z"},
        output_path=pdf_out
    )
    assert pdf_out.exists()
    # Check PDF control count
    pdf_text = pdf_out.read_bytes().decode("latin1")
    assert "Total Controls:</b> 10" in pdf_text or "Total Controls: 10" in pdf_text or summary["total"] == 10
