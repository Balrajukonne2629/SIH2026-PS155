# Project Quality Bar & Non-Negotiable Engineering Constraints

**Project:** NTRO PS26155 — Network Security Compliance Auditor  
**Standard:** Constraint-Driven Development Contract  
**Authority:** Immutable project specification. No agent, automated script, or contributor may lower, bypass, suppress, or silently relax these constraints.

---

## 1. Operational & Data Hygiene Constraints

1. **Strict Data Protection:**
   - **NEVER** run `git checkout`, `git restore`, `git reset`, `git clean`, or `git stash` on any files or paths within `data/`.
   - All `.db` and `.backup*` files in `data/` are strictly ignored by Git and must never be clobbered, tracked, or overwritten by Git operations.

2. **Zero Fabrication Policy:**
   - **NO hand-inserted, synthetic, or artificially forged database rows.**
   - No rows, sessions, or ledger entries may be manufactured to match a target metric or count.
   - If an observed count differs from an expected baseline, report the exact measured actual without modification.

3. **Total Test Isolation (Guard Test):**
   - The test suite must be **incapable** of reading or mutating production `data/auditor.db`.
   - All tests must execute against ephemeral temporary databases (`tmp_path`).
   - A deterministic guard test must verify that `data/auditor.db` file size and modification timestamp (`mtime`) remain 100% unchanged during and after running the test suite.

---

## 2. Test Suite & Verification Rigor

4. **Two-Pass Verification Standard:**
   - The full test suite (`python -m pytest -q`) must pass cleanly **twice in succession** before any milestone, feature phase, or release gate closes.
   - Final summary lines from both runs must be reported verbatim.

5. **Zero Quality Bar Degradation:**
   - **No skipped tests, deleted tests, stripped assertions, or lowered thresholds** to turn test runs green.
   - No suppressions (`@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`) introduced to hide type errors or lints.
   - Any test skip must be pre-approved with documented root-cause rationale.

---

## 3. Core Architectural & Security Invariants

6. **Hard AST Safety Guarantee:**
   - Zero execution imports or capabilities across all parsing, audit, compliance, and aggregation modules.
   - Explicitly prohibited: `subprocess`, `socket`, `netmiko`, `napalm`, `paramiko`, `pexpect`, `telnetlib`.
   - AST safety invariant checks run automatically at application bootstrap.

7. **Strictly Deterministic Compliance Verdicts:**
   - Control verdicts (`PASS`, `FAIL`, `UNKNOWN`, `NOT_ASSESSED`) are derived solely from deterministic rule evaluation against normalized CSM state.
   - **AI NEVER decides compliance status.** LLM/AI model components are strictly confined to advisory failure explanations and suggested remediation syntax for human-in-the-loop review.
   - Given identical configuration input, compliance evaluation output must be 100% reproducible across arbitrary runs.

8. **Schema & Cryptographic Ledger Immutability:**
   - The database schemas for `audit_ledger`, `audit_reports`, `audit_report_edits`, and `trusted_mappings` are strictly protected and shall not be altered without explicit user authorization.
   - The SHA-256 hash chain in `audit_ledger` is continuous and tamper-evident; `verify_chain()` must always pass.
