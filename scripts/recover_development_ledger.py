#!/usr/bin/env python3
"""DEVELOPMENT/DATA-RECOVERY UTILITY: Restore Headless Audit Ledger Predecessor Chain.

PURPOSE:
This script is a standalone development recovery tool. It addresses a specific
historical development state where rows 18-76 were pruned from data/auditor.db
in commit e66846c, leaving row 77 (SEQ0060) as a headless block expecting
row 76's hash (946f0b15b3e9fa24a6eecde0a5a88c43e178831b51289b3ebb8df92989b4234d).

SAFETY MEASURES:
- Pre-flight validation: verifies database exists, verifies row 77 is current first row,
  and verifies rows 18-76 are absent.
- Source validation: extracts baseline commit b25c57f, verifies genesis anchor (row 18)
  and terminal hash matching row 77's predecessor.
- Automatic backup: creates a timestamped copy of data/auditor.db before any modification.
- Atomic transaction: inserts rows inside an explicit SQLite transaction.
- Post-recovery cryptographic verification: runs audit_log.verify_chain() to guarantee
  the complete chain from Genesis (0*64) to the latest entry is 100% valid.
- Aborts and rolls back on any discrepancy; does NOT fabricate or mutate any hashes.

DO NOT import or call this script from normal application runtime code.
"""

import datetime
import os
import pathlib
import shutil
import sqlite3
import subprocess
import sys
import tempfile

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.audit_log import compute_entry_hash, GENESIS_PREV_HASH, verify_chain

DB_PATH = BASE_DIR / "data" / "auditor.db"
BASELINE_COMMIT = "b25c57f"
EXPECTED_ROW_77_PREV = "946f0b15b3e9fa24a6eecde0a5a88c43e178831b51289b3ebb8df92989b4234d"


def preflight_check(conn: sqlite3.Connection):
    """Verifies that the target database is in the expected headless state."""
    cur = conn.cursor()
    cur.execute("SELECT id, entry_id, prevEntryHash, entryHash FROM audit_ledger ORDER BY id ASC")
    rows = cur.fetchall()

    if not rows:
        raise RuntimeError("Pre-flight failed: audit_ledger table is completely empty.")

    first_row = rows[0]
    first_id = first_row[0]
    first_prev = first_row[2]

    if first_id == 18 and first_prev == GENESIS_PREV_HASH:
        print("[INFO] Ledger already contains genesis row 18 with valid genesis hash. No recovery needed.")
        return False, rows

    if first_id != 77 or first_prev != EXPECTED_ROW_77_PREV:
        raise RuntimeError(
            f"Pre-flight failed: Unexpected first row in audit_ledger: id={first_id}, "
            f"prevEntryHash={first_prev[:16]}... Expected id=77 with prev={EXPECTED_ROW_77_PREV[:16]}..."
        )

    # Verify rows 18..76 do not exist
    cur.execute("SELECT COUNT(*) FROM audit_ledger WHERE id >= 18 AND id <= 76")
    existing_predecessors = cur.fetchone()[0]
    if existing_predecessors > 0:
        raise RuntimeError(
            f"Pre-flight failed: Found {existing_predecessors} rows between IDs 18 and 76. Aborting to avoid overwrite."
        )

    print(f"[OK] Pre-flight passed: Headless chain detected starting at id=77 (total current rows: {len(rows)}).")
    return True, rows


def extract_baseline_predecessors():
    """Extracts authentic rows 18-76 from baseline commit b25c57f without modifying repo."""
    print(f"[1/4] Extracting authentic predecessor rows from commit {BASELINE_COMMIT}...")
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = pathlib.Path(tmp.name)

    try:
        res = subprocess.run(
            ["git", "show", f"{BASELINE_COMMIT}:data/auditor.db"],
            stdout=open(tmp_path, "wb"),
            stderr=subprocess.PIPE,
            check=False
        )
        if res.returncode != 0:
            raise RuntimeError(
                f"Failed to extract {BASELINE_COMMIT}:data/auditor.db: {res.stderr.decode('utf-8', errors='replace')}"
            )

        if tmp_path.stat().st_size == 0:
            raise RuntimeError(f"Extracted database from {BASELINE_COMMIT} is 0 bytes.")

        b_conn = sqlite3.connect(tmp_path)
        b_cur = b_conn.cursor()
        b_cur.execute(
            "SELECT id, entry_id, timestamp, device_hostname, config_file_hash, "
            "audit_results, remediation_summary, prevEntryHash, entryHash, owner_user_id "
            "FROM audit_ledger WHERE id >= 18 AND id <= 76 ORDER BY id ASC"
        )
        predecessor_rows = b_cur.fetchall()
        b_conn.close()

        if len(predecessor_rows) != 59:
            raise RuntimeError(f"Expected 59 predecessor rows (IDs 18-76), but found {len(predecessor_rows)}.")

        # Validate authentic genesis and terminal hashes
        genesis_row = predecessor_rows[0]
        terminal_row = predecessor_rows[-1]

        if genesis_row[0] != 18 or genesis_row[7] != GENESIS_PREV_HASH:
            raise RuntimeError(f"Extracted row 18 is not authentic genesis: prev={genesis_row[7][:16]}...")

        if terminal_row[0] != 76 or terminal_row[8] != EXPECTED_ROW_77_PREV:
            raise RuntimeError(f"Extracted row 76 entryHash does not match row 77 expectation: {terminal_row[8][:16]}...")

        print(f"[OK] Extracted {len(predecessor_rows)} authentic predecessor rows (ID 18 to 76).")
        return predecessor_rows
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def create_backup():
    """Creates a timestamped backup of data/auditor.db."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DB_PATH.parent / f"auditor.db.backup.{timestamp}"
    shutil.copy2(DB_PATH, backup_path)
    print(f"[2/4] Created database backup at: {backup_path}")
    return backup_path


def apply_recovery(conn: sqlite3.Connection, predecessor_rows: list):
    """Inserts predecessor rows atomically inside a transaction."""
    print("[3/4] Inserting predecessor rows into audit_ledger inside transaction...")
    cur = conn.cursor()
    cur.execute("BEGIN IMMEDIATE TRANSACTION")
    try:
        cur.executemany(
            "INSERT INTO audit_ledger "
            "(id, entry_id, timestamp, device_hostname, config_file_hash, "
            "audit_results, remediation_summary, prevEntryHash, entryHash, owner_user_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            predecessor_rows
        )
        conn.commit()
        print(f"[OK] Successfully committed {len(predecessor_rows)} rows.")
    except Exception as e:
        conn.rollback()
        raise RuntimeError(f"Recovery transaction rolled back due to error: {e}") from e


def verify_restored_ledger():
    """Runs independent cryptographic verification on the restored ledger."""
    print("[4/4] Running cryptographic verification on restored ledger...")
    is_valid, message, broken_idx = verify_chain()
    if not is_valid:
        raise RuntimeError(f"Cryptographic verification FAILED after recovery: {message} (entry #{broken_idx})")
    print(f"[SUCCESS] {message}")


def main():
    print("=" * 70)
    print("DEVELOPMENT LEDGER PREDECESSOR RECOVERY UTILITY")
    print("=" * 70)

    if not DB_PATH.exists():
        print(f"[ERROR] Database file not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        needs_recovery, current_rows = preflight_check(conn)
        if not needs_recovery:
            print("Ledger is already complete. Verifying chain...")
            verify_restored_ledger()
            return

        predecessor_rows = extract_baseline_predecessors()
        backup_path = create_backup()

        apply_recovery(conn, predecessor_rows)
        verify_restored_ledger()

        print("=" * 70)
        print("RECOVERY COMPLETE SUMMARY:")
        print(f"  - Database: {DB_PATH}")
        print(f"  - Backup Created: {backup_path}")
        print(f"  - Predecessor Rows Restored: {len(predecessor_rows)} (IDs 18 to 76)")
        print(f"  - Previous Headless Rows Preserved: {len(current_rows)} (IDs 77 to 89)")
        print(f"  - Total Intact Ledger Entries: {len(predecessor_rows) + len(current_rows)}")
        print("  - Chain Status: 100% VALID CRYPTOGRAPHIC HASH CHAIN FROM GENESIS")
        print("=" * 70)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
