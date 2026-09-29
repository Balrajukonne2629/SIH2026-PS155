# Legacy, Dead Code & Invariant Audit Report

**Product:** NTRO PS26155 — Network Security Compliance Auditor  
**Date:** September 28, 2026  
**Mode:** Read-Only Audit (Ponytail Lazy Senior Dev Mode)  
**Execution Status:** Zero Files Deleted or Mutated. Audit findings only.

---

## 1. Initial State Baseline Snapshot

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **Total Files (Excl. `.git`)** | **9,596 files** | Includes frontend `node_modules` (6,790 files) & scratch |
| **Total Workspace Size** | **17.48 GB** (16.28 GiB) | Dominated by offline demo zip + unzipped release bundle (16.94 GB) |
| **Primary SQLite Database** | [`data/auditor.db`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/data/auditor.db) | **18,382,848 bytes** (~17.53 MB), last modified 2026-09-26 |
| **Database Tables & Row Counts** | | |
| ├─ `audit_sessions` | **736 rows** | **15.26 MB payload** (720 rows are orphan in-progress test runs) |
| ├─ `audit_ledger` | **75 rows** | **IMMUTABLE:** SHA-256 hash-chain (Genesis $\rightarrow$ SEQ0075) |
| ├─ `audit_reports` | **16 rows** | **PROTECTED:** Certified compliance report entities |
| ├─ `audit_report_edits`| **1 row** | Audit log edit trail |
| ├─ `users` | **7 rows** | 3 seeded roles + 4 test runner artifacts |
| ├─ `pending_suggestions` | **50 rows** | 42 pending, 6 approved, 2 rejected (from 2026-09-16) |
| └─ `trusted_mappings` | **0 rows** | Active dynamic rule table schema (empty, rules evaluated dynamically) |

*Full machine-readable baseline saved to [`docs/baseline_snapshot.json`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/docs/baseline_snapshot.json).*

---

## 2. Protected Invariants (NEVER Removable)

Under the project's cryptographic and compliance invariants, the following elements were audited and confirmed **strictly immutable / non-removable**:
- **Table `audit_ledger` (75 rows)**: Continuous cryptographic SHA-256 hash-chain. Pruning any row breaks `verify_chain()`.
- **Table `audit_reports` (16 rows)**: Official audit reports with certified hashes linking to ledger entries.
- **Table `audit_report_edits` (1 row)**: Manual edit provenance trail for certified reports.
- **Table `trusted_mappings`**: Production schema for verified dynamic rule evaluation.
- **Referenced audit sessions (16 rows in `audit_sessions`)**: Sessions whose `session_id` is foreign-keyed to `audit_reports`.

---

## 3. Comprehensive Legacy, Dead & Unused Inventory

| id | type | path or table+key | size/rowcount | last modified | referenced by (grep proof) | risk | recommend | reason |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **F-01** | file | [`main.py`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/main.py) | 694 B (26 lines) | 2026-09-22 | [`Dockerfile:29`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/Dockerfile#L29) uses `src.main:app`. Root `main.py` is only referenced in [`README.md:77`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/README.md#L77) as a shortcut wrapper. | Low | archive | Redundant wrapper delegating via `__getattr__` and `sys.path.insert`. Canonical entrypoint is `src.main:app`. |
| **F-02** | file | [`data/auditor.db.backup.20260924_003815`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/data/auditor.db.backup.20260924_003815) | 16.66 MB | 2026-09-24 | Zero grep hits across entire workspace. Created by [`scripts/recover_development_ledger.py:15`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/scripts/recover_development_ledger.py#L15) during historical recovery. | Low | delete | Stale pre-recovery DB snapshot. The ledger was verified and running cleanly since commit `b25c57f`. |
| **F-03** | file | [`data/exports/*`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/data/exports) | 557 files (1.90 MB) | 2026-09-25 | Generated dynamically by test runs ([`test_report_export.py`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/tests/test_report_export.py), [`test_api_reports.py`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/tests/test_api_reports.py)). Zero static code imports. | Low | delete | Ephemeral test artifacts accumulating in data directory. Should be excluded via `.gitignore` with `.gitkeep`. |
| **F-04** | file | [`scratch/chrome_user_data/*`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/scratch/chrome_user_data) | 950 files (71.93 MB) | 2026-09-24 | Zero code references. Generated by automated Chrome / DevTools MCP browser testing sessions. | Low | delete | Transient browser cache, cookies, crashpad, and local storage data generated during UI testing. |
| **F-05** | file | [`__pycache__/*`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/__pycache__) (root) | 49 `.pyc` files (2.08 MB) | 2026-09-22 | Zero source `.py` files exist at root for these bytecode files. Source code was relocated to `src/` and `tests/`. | Low | delete | Stale compiled bytecode from old root-level scripts that no longer exist at the root level. |
| **F-06** | file | [`tools/test_ollama_integration.py`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/tools/test_ollama_integration.py) & `tools/__pycache__` | 73.9 KB (2 files) | 2026-09-20 | Excluded from pytest runs by [`pytest.ini:2`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/pytest.ini#L2) (`testpaths = tests`). Referenced only in [`README.md:45`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/README.md#L45). | Low | keep | Standalone developer benchmark utility for manual Ollama hardware profiling; not part of automated CI. |
| **F-07** | file | [`scripts/recover_development_ledger.py`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/scripts/recover_development_ledger.py) | 8.2 KB (205 lines) | 2026-09-24 | Explicitly warns at line 21: `"DO NOT import or call this script from normal application runtime code"`. | Low | archive | Historical repair script for headless ledger recovery; its target fix has already been applied. |
| **F-08** | file | [`data/pending_suggestions.json`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/data/pending_suggestions.json) | 23.1 KB | 2026-09-16 | [`src/database.py:292`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/database.py#L292) reads it ONLY if SQLite `pending_suggestions` table is empty (`count == 0`). | Low | archive | Legacy Phase 1 bootstrap JSON file. SQLite is now the single source of truth. |
| **F-09** | file | [`data/trusted_mappings.json`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/data/trusted_mappings.json) | 2 B (`{}`) | 2026-09-25 | [`src/cisco_auditor.py:12`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/cisco_auditor.py#L12) declares `TRUSTED_FILE` constant but never reads it. [`test_ai_model_manager.py:249`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/tests/test_ai_model_manager.py#L249) asserts model manager does not write to it. | Low | keep | Contains empty JSON `{}`; maintained as an assertion guard in security boundary tests. |
| **F-10** | file | [`NTRO-PS26155-OFFLINE-DEMO-v1.0.zip`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/NTRO-PS26155-OFFLINE-DEMO-v1.0.zip) & `.sha256` | 8.47 GB | 2026-09-24 | Zero code references. Unzipped folder [`NTRO-PS26155-OFFLINE-DEMO/`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/NTRO-PS26155-OFFLINE-DEMO) already exists alongside it with identical content. | Med | archive | Giant pre-built demo zip duplicating the adjacent unzipped demo folder; consumes ~8.5 GB of repo space. |
| **F-11** | file | [`docs/NTRO_PS26155_PRD_v4_Addendum.md`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/docs/NTRO_PS26155_PRD_v4_Addendum.md) & [`docs/NTRO_PS26155_PRD_v5_Consolidated.md`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/docs/NTRO_PS26155_PRD_v5_Consolidated.md) | 31.7 KB (2 files) | 2026-09-16 | Superseded by [`docs/NTRO_PS26155_PRD_v6_Current_Plan.md`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/docs/NTRO_PS26155_PRD_v6_Current_Plan.md). | Low | archive | Historical development specifications kept for reference. |
| **D-01** | db | `audit_sessions` (unreferenced rows) | **720 rows** (~14.63 MB) | 2026-09-26 | `SELECT count(*) FROM audit_sessions WHERE session_id NOT IN (SELECT session_id FROM audit_reports)` $\rightarrow$ **720 rows**. Zero ledger references. | Low | delete | Ephemeral in-progress audit sessions created during test suite runs. Pruning will shrink database by ~80%. |
| **D-02** | db | `pending_suggestions` (`status='rejected'`) | **2 rows** | 2026-09-23 | Rows rejected by reviewer (`SecOps_Lead_Reviewer` & `afa405cb-...`). `status = 'rejected'`. | Low | delete | Explicitly rejected AI unmapped line suggestions; no downstream value. |
| **D-03** | db | `pending_suggestions` (stale `status='pending'`) | **42 rows** | 2026-09-16 | Created during initial prototype runs on 2026-09-16; never reviewed or converted to rules. | Low | archive | Stale unreviewed suggestion records older than 12 days. |
| **D-04** | db | `users` (`api_test_*` accounts) | **4 rows** | 2026-09-17 | `api_test_reviewer`, `api_test_uploader`, `api_test_viewer`, `api_test_inactive`. Never referenced as creator of any saved `audit_reports`. | Low | delete | Test fixture artifacts inserted into production database during initial test runs. |
| **C-01** | config | [`config/Rule_Library/normalized_config_schema.json:44`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/config/Rule_Library/normalized_config_schema.json#L44) | 1 enum value (`"arista"`) | 2026-09-20 | `Select-String "AristaVendorAdapter" src/` $\rightarrow$ 0 results. No adapter implemented in code. | Low | keep | Speculative schema enum for Phase 2 Arista support. Safe to retain or delete. |
| **C-02** | config | [`config/Rule_Library/common_rule_schema.json:9-12`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/config/Rule_Library/common_rule_schema.json#L9-L12) | 4 values (`"NIST"`, `"ISO-27001"`, `"Arista"`, `"EOS"`) | 2026-09-19 | Evaluators do not exist in `src/compliance_framework.py`. | Low | keep | Design specification target constants. |
| **C-03** | config | `LOG_FILE` (`data/audit_log.jsonl`) constant | 3 code locations | 2026-09-22 | [`src/audit_log.py:14`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/audit_log.py#L14), [`src/database.py:17`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/database.py#L17), [`src/main.py:64`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/main.py#L64). `Test-Path "data/audit_log.jsonl"` returns `False`. | Low | delete | Dead file path constant retained as a backward-compatibility alias for a file that does not exist. |
| **C-04** | config | [`requirements.txt:8-9`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/requirements.txt#L8-L9) (`torch`, `transformers`) | 2 dependencies (~1.5 GB installed) | 2026-09-18 | Used only by [`src/ai_suggester.py:14-15`](file:///c:/Users/konne%20balraju/OneDrive%20-%20Chaitanya%20Bharathi%20Institute%20of%20Technology/HACKATHONS/PART-2/src/ai_suggester.py#L14-L15) for DistilBERT unmapped line embeddings. | Med | keep | Over-engineered dependency footprint for unmapped line similarity, but actively wired to `ai_suggester.py`. |

---

## 4. Potential Net Reclaim Impact

If approved for cleanup:
- **Disk Space Reclaimed:**
  - `NTRO-PS26155-OFFLINE-DEMO-v1.0.zip`: **-8.47 GB**
  - `data/auditor.db.backup.20260924_003815`: **-16.66 MB**
  - `scratch/chrome_user_data/`: **-71.93 MB**
  - `data/exports/*` test artifacts: **-1.90 MB**
  - Root `__pycache__/*`: **-2.08 MB**
  - SQLite `audit_sessions` pruning (720 orphan rows): **-14.63 MB**
  - **Total Potential Space Recovery:** **~8.58 GB**
- **Database Hygiene:**
  - `audit_sessions`: reduced from 736 to 16 certified rows.
  - `pending_suggestions`: purged 44 stale/rejected entries.
  - `users`: purged 4 test accounts.

---

## 5. Items with Uncertainty (User Decision Required)

1. **`NTRO-PS26155-OFFLINE-DEMO-v1.0.zip` (8.47 GB)**:  
   *Uncertainty:* Is this file the authoritative offline competition release bundle intended to stay in the repository root for distribution, or is it a build artifact that should be archived to external storage or `.gitignore`?
2. **`tools/test_ollama_integration.py`**:  
   *Uncertainty:* It is excluded from pytest (`pytest.ini`), but documented in `README.md`. Should it be promoted to `tests/` with proper pytest marks or kept in `tools/` as a manual diagnostic script?
3. **`data/pending_suggestions.json` (23.1 KB)**:  
   *Uncertainty:* The SQLite database already contains these entries, but `src/database.py:292` still has fallback bootstrap code to re-import it if the table is wiped. Safe to archive if the SQLite DB is persistent.
4. **`torch` & `transformers` dependencies in `requirements.txt`**:  
   *Uncertainty:* PyTorch is used solely for DistilBERT CPU embeddings in `ai_suggester.py`. Replacing this with `difflib` or local Ollama embeddings would save ~1.5 GB of installed package weight and eliminate 10s of import latency during tests, but requires updating `ai_suggester.py`.
