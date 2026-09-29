# AI-Driven Multi-Vendor Network Security Compliance Auditor
## Product Requirements Document — v7.0
### Consolidated Current Product Plan

**Problem Statement:** NTRO PS 26155
**Team:** NextGen
**Product:** AI-Driven Multi-Vendor Network Security Compliance Auditor
**Version:** 7.0 — Current Product Plan
**SIH:** 2026
**Date:** 28 September 2026

---

## Document Status

**Version:** 7.0
**Purpose:** Current consolidated PRD. Supersedes v6.0.

v7 keeps the v6 hybrid architecture (deterministic engine, advisory local AI, human approval) and changes the following:

1. Adds a **requirement-by-requirement traceability matrix** against the NTRO PS 26155 problem statement (§4).
2. Adds an explicit **implementation status legend**, so nothing planned is written up as built (§3).
3. Adds **NIST SP 800-53 rev5 and ISO/IEC 27001:2022** as crosswalk-based frameworks (§9).
4. Replaces template-file remediation with a **central remediation registry** (§12).
5. Adds **device identity extraction** (hardware model, serial, OS version, management IP) (§11).
6. Adds **Arista EOS (by reuse of the Cisco parser)**, **Palo Alto PAN-OS**, and **multi-file / guarded ZIP ingestion** as the current build scope (§7, §10).
7. Corrects three v6 overclaim risks found in the 2026-09-24 codebase audit (§29).
8. Adds a **legacy-cleanup workstream**, a **verification gate policy**, and the **final submission deliverables** (§27, §28, §33).
9. Clarifies the "training loop" claim: the system learns **stored deterministic mappings**, not model weights (§8).

---

# 1. Product Vision

The system is an **offline-first, AI-assisted, deterministic network security compliance auditor**.

It accepts network-device configuration files, detects the vendor, normalizes them into a Common Security Model (CSM), evaluates security controls with deterministic rules, assists with unfamiliar configuration syntax using local AI, provides human-governed trusted mappings, generates display-only remediation, performs static conflict analysis, and produces tamper-evident audit reports.

### Core principle

> **AI interprets. Humans approve. Deterministic rules decide. Nothing is automatically executed on a live device.**

The AI must never:

- determine PASS / FAIL / UNKNOWN;
- directly modify trusted mappings;
- execute remediation;
- bypass deterministic compliance rules.

---

# 2. Problem

- Every vendor uses different configuration syntax.
- Static parsers cannot understand every unfamiliar command.
- Manual auditing is slow and error-prone.
- Security teams need evidence behind every compliance result.
- Sensitive configurations cannot be casually sent to cloud AI.
- Remediation needs engineering review before deployment.
- Different users need different levels of access and technical detail.

```text
Configuration
      ↓
Unified Ingestion (single / multi-file / guarded ZIP)
      ↓
Vendor Detection
      ↓
Vendor Adapter
      ↓
Common Security Model (CSM)
      ↓
Deterministic Compliance (baseline rules → frameworks)
      ↓
Evidence / Remediation / Reporting
```

AI runs as an **advisory side-channel** only.

---

# 3. Implementation Status Legend

Every capability in this document carries one of these labels. Nothing marked Planned may be presented as built.

| Label | Meaning |
|---|---|
| **VERIFIED** | Implemented, covered by passing tests, confirmed by an independent check. |
| **CODE-COMPLETE, PENDING GATE** | Code and targeted tests exist. The full-suite, sample-run, PDF and report-integrity checks (§28) have not all been confirmed. |
| **PLANNED (CURRENT SCOPE)** | Approved for the current build. Not written yet. |
| **ROADMAP** | Future work. Not in the current build. |

### Status snapshot (28 Sep 2026)

| Area | Status |
|---|---|
| Cisco IOS-XE parser, baseline (10 rules), CIS (7), DISA-STIG (10) | VERIFIED |
| Juniper Junos parser, baseline (10 rules) | VERIFIED |
| Fail-closed vendor routing | VERIFIED |
| Human-approved AI mapping workflow, Trusted Rule Library | VERIFIED |
| Hardware-adaptive model selection (4 selectable modes) | VERIFIED |
| Canonical editable report, Report API, PDF/DOCX export | VERIFIED |
| JWT / RBAC, three role UIs | VERIFIED |
| Hash-chained ledger (75 entries at last check) | VERIFIED |
| Central remediation registry (20 baseline entries) | CODE-COMPLETE, PENDING GATE |
| Device identity extraction + report display | CODE-COMPLETE, PENDING GATE |
| NIST SP 800-53 rev5 + ISO/IEC 27001:2022 crosswalk | CODE-COMPLETE, PENDING GATE |
| Arista EOS support | PLANNED (CURRENT SCOPE) |
| Multi-file upload; guarded ZIP upload | PLANNED (CURRENT SCOPE) |
| Palo Alto PAN-OS support | PLANNED (CURRENT SCOPE) |
| Category-button shortcuts in AI review screen | PLANNED (CURRENT SCOPE) |
| Fortinet | ROADMAP |
| Live device retrieval, network simulation, background queue | ROADMAP |

---

# 4. Traceability to NTRO PS 26155

| PS requirement | Status | How it is met / limit |
|---|---|---|
| Support many vendors, ideally any device | Partial | Cisco and Juniper built. Arista and PAN-OS planned. The adapter architecture is vendor-agnostic. Coverage is **not** claimed for other vendors. |
| Normalize to a vendor-neutral schema | VERIFIED | CSM defined by a JSON Schema. Adapters emit CSM only. |
| Compare against user-selected framework (CIS, NIST, STIG, ISO) | Partial | CIS and STIG per vendor. NIST and ISO via crosswalk over baseline rules. Only **mapped** controls are assessed. |
| Interactive training interface for unrecognized syntax | VERIFIED (form-based) | Reviewer maps unmapped lines to CSM fields. Not a visual block builder. |
| System "learns" without code redeployment | VERIFIED (scoped) | Approved mappings persist in `trusted_mappings` and apply to later audits. **Model weights are not retrained** (§8). |
| AI-based interpretation (pattern recognition / NLP) | VERIFIED | DistilBERT similarity for mapping. Local Ollama LLM for rationale text. Both advisory. |
| Unified ingestion, single or bulk | Partial | Single file built. Multi-file and guarded ZIP planned. |
| Single PDF report per device | VERIFIED | One canonical report per audit, exported to PDF and DOCX. |
| Device identification incl. serial and hardware | CODE-COMPLETE, PENDING GATE | Extracted from config comments or appended `show` output. Missing values shown as "Not In Config". |
| Pass/Fail with risk severity | VERIFIED | Deterministic verdicts with severity. |
| Device-specific step-by-step remediation | CODE-COMPLETE, PENDING GATE | Registry covers all baseline rules. CIS and STIG resolve through them. |
| Modular support for new vendors, standards, OS versions | VERIFIED (architecture) | Adapter plus rules plus tests. Central engine untouched. |
| Data collection via Netmiko / NAPALM | **Intentionally excluded** | See §6. |
| Deliverables: code, README, 2-page architecture doc, 2-minute demo, 5 slides | PLANNED | §33. |

---

# 5. Product Goals

## 5.1 Primary Goals

1. Deterministic network security compliance auditing.
2. Multi-vendor architecture with Cisco IOS-XE as reference and Juniper as second vendor.
3. Arista EOS and Palo Alto PAN-OS as the next two vendors.
4. Local AI interpretation of unfamiliar syntax.
5. Human approval of every AI-generated mapping.
6. Multi-framework evaluation: CIS, DISA-STIG, NIST SP 800-53 rev5, ISO/IEC 27001:2022.
7. Complete display-only remediation for every active baseline rule.
8. Device identification in every report.
9. Trusted Rule Library.
10. Canonical editable audit reporting with PDF/DOCX export.
11. JWT-based role isolation.
12. Offline / on-premise operation.
13. Tamper-evident audit logging.
14. Single, multi-file and guarded ZIP ingestion.

## 5.2 Non-Goals

The current product does not claim:

- complete vendor coverage or complete framework coverage;
- full network reachability simulation;
- guaranteed remediation safety;
- automatic remediation;
- live SSH / API configuration retrieval;
- retraining of AI model weights from reviewer input;
- multi-tenant SaaS;
- production-grade multi-reviewer approval.

---

# 6. Design Decision: Offline, File-Based Ingestion

The problem statement suggests Netmiko or NAPALM for data collection. The wording is illustrative ("e.g."), not mandatory.

The product **deliberately excludes live device access**:

- No sockets, no subprocess execution, no SSH libraries (netmiko, napalm, paramiko).
- Enforced by an automated AST safety test.
- Reason: national-security, air-gapped use. Auditing a device must never risk changing it.

Configurations arrive as uploaded files. Device identity data that a plain `running-config` lacks (serial number, hardware model) is read from `show version` / `show inventory` / `show chassis hardware` text pasted or appended to the same upload.

Live retrieval stays on the roadmap as a separate, opt-in module.

---

# 7. Vendor Architecture

```text
                    Unified Ingestion
                           │
                    Vendor Detection
                           │
   ┌───────────┬───────────┼───────────┬───────────┐
   ↓           ↓           ↓           ↓           ↓
 Cisco     Juniper      Arista     Palo Alto   Fortinet
 (built)   (built)    (planned)   (planned)   (roadmap)
   └───────────┴───────────┼───────────┴───────────┘
                           ↓
                    Vendor Adapter
                           ↓
                       Common CSM
                           ↓
                 Deterministic Engine
```

## 7.1 Vendor Status

| Vendor | Status |
|---|---|
| Cisco IOS-XE | VERIFIED |
| Juniper Junos | VERIFIED |
| Arista EOS | PLANNED (CURRENT SCOPE) |
| Palo Alto PAN-OS | PLANNED (CURRENT SCOPE) |
| Fortinet FortiOS | ROADMAP |

## 7.2 Adding a Vendor

A new vendor should need only: an adapter or parser, a baseline rule set, remediation entries, crosswalk entries, and tests. No change to the central compliance engine.

## 7.3 Arista EOS (planned)

- **Reuse the Cisco parser** by subclass or shared helper. Do not copy it.
- Override only: vendor and platform, EOS management syntax (`management ssh`, `management telnet`, `management api http-commands`), banners, header comments.
- `AristaVendorAdapter.detect_confidence` must not capture Cisco files. A test asserts a Cisco fixture still detects as Cisco.
- Remediation entries use real EOS CLI, not copied IOS text.

## 7.4 Palo Alto PAN-OS (planned)

- New parser for `set`-style configuration (and bracketed blocks if time allows).
- Covers management profiles, admin authentication, syslog, NTP, SNMP.
- This is the firewall coverage the problem statement asks for.

## 7.5 Vendor Detection Rules

Unsupported or ambiguous detection **fails closed**. The system never guesses a vendor.

---

# 8. AI Subsystem (Advisory Only)

## 8.1 Components

| Component | Role |
|---|---|
| DistilBERT (local, CPU/CUDA) | Similarity scoring of unmapped lines against rule categories. Produces suggested CSM field and confidence. |
| Ollama `llama3.2:1b` | Fast model for rationale and explanation text. |
| Ollama `qwen2.5:7b-instruct-q4_K_M` | Quality model for rationale and explanation text. |
| Deterministic-only mode | No LLM. Template text only. |

DistilBERT does the mapping. The LLMs write explanation text only.

## 8.2 Modes

`AUTO`, `FAST`, `QUALITY`, `DETERMINISTIC ONLY` are selectable in the UI and API. A manual model override is a parameter, not a separate fifth mode.

## 8.3 Fallback

If the runtime is unavailable, times out, refuses, or returns malformed output:

```text
AI failure → deterministic template fallback
```

The failure never affects compliance verdicts. The Ollama refusal rate does not reach a stable zero. This is a documented limitation (OLLAMA-NTP-001), with the fallback as the safety net.

## 8.4 What "Learning" Means

Approved mappings are stored as deterministic rules in `trusted_mappings` and applied to later audits without redeployment.

**The AI model weights are not fine-tuned or retrained.** This must be stated up front in the README, the architecture document and the demo.

## 8.5 Mapping Workflow

```text
Unknown Configuration Line
          ↓
   DistilBERT + Ollama
          ↓
Suggested Mapping + Confidence + Rationale
          ↓
   Authorized Reviewer
     ┌────┼─────┐
     ↓    ↓     ↓
 Approve Correct Reject
     ↓
 Trusted Mapping
     ↓
Future Deterministic Audits
```

## 8.6 Required Provenance (11 fields)

raw configuration line, suggested CSM field, confidence, rationale, model, **model version**, **model checksum**, vendor, reviewer, timestamp, status.

**Known gap:** `model_version` and `model_checksum` are not yet stored in `pending_suggestions`. Closing this is a current-scope task (§30).

## 8.7 Hardware Notes

Observed latency (Intel i5-1235U, 16 GB): deterministic path about 5 ms for a 2,220-line config. AI path: DistilBERT about 15 ms, `llama3.2:1b` 3.5–6.3 s per line, `qwen2.5:7b` 22–23 s per line. These are **measurements on one machine**, not guarantees.

---

# 9. Compliance Architecture

```text
CSM
 ↓
Baseline Rules (per vendor)
 ↓
Framework Registry
 ↓
Framework Evaluator
 ↓
PASS / FAIL / UNKNOWN   (+ NOT_ASSESSED for unmapped controls)
```

## 9.1 Result States

Valid outcomes: `PASS`, `FAIL`, `UNKNOWN`.
`UNKNOWN` never silently becomes `PASS`. AI has zero authority over these states.

`NOT_ASSESSED` is a **control-level marker** for framework controls that no active rule maps to. It is excluded from pass / fail / unknown counts and from any score. It is never shown as PASS.

## 9.2 Frameworks

| Framework id | Scope | Mechanism | Status |
|---|---|---|---|
| Vendor baselines | Cisco 10, Junos 10 rules | Native rule evaluation | VERIFIED |
| `cis-cisco-iosxe` | 7 controls | Native evaluator | VERIFIED |
| `disa-stig-cisco-iosxe` | 10 controls | Native evaluator | VERIFIED |
| `nist-sp-800-53-rev5` | Mapped controls only | Crosswalk | CODE-COMPLETE, PENDING GATE |
| `iso-iec-27001-2022` | Mapped controls only | Crosswalk | CODE-COMPLETE, PENDING GATE |

Counts of executable controls are stated exactly as above. The PRD does not claim complete CIS, STIG, NIST or ISO catalogues.

## 9.3 Crosswalk Design

```text
                 Internal Baseline Rule
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
        NIST controls  ISO controls  CIS/STIG
              └───────────┼───────────┘
                          ↓
                   Unified Results
```

- One generic `CrosswalkEvaluator`, parameterized by framework id. No duplicated check logic.
- Works for any vendor whose adapter emits CSM, including Arista and PAN-OS once their rules exist.
- A test fails if an active baseline rule has no crosswalk entry.

## 9.4 Roll-up Logic

For each framework control with mapped rules:

1. Any mapped rule `FAIL` → control `FAIL`.
2. Else any mapped rule `UNKNOWN` → control `UNKNOWN`.
3. Else all mapped rules `PASS` → control `PASS`.
4. No mapped rule → `NOT_ASSESSED`.

Framework selection is vendor-aware. An incompatible selection returns an explicit error (HTTP 422), never a silent wrong evaluation.

---

# 10. Ingestion

## 10.1 Single File

Existing `POST /api/audit/upload`. Allow-listed extensions, size limits, files treated as data and never executed.

## 10.2 Multi-File (planned)

`POST /api/audit/upload/bulk` with `files: List[UploadFile]`.

- Reuses the existing ingest function. No duplicated logic.
- **Per-file error isolation:** one bad file does not fail the batch.
- Caps: files per batch, bytes per file, extensions `.txt`, `.cfg`, `.conf`.
- Existing auth and role checks apply.
- Response: `batch_id`, per-file `{session_id, filename, vendor, hostname, score}`, and `errors[]`.
- UI: multi-select and drag-and-drop, progress, summary cards linking to each session.

## 10.3 ZIP (planned, only if all guards are implemented)

- Cap on the **sum of `ZipInfo.file_size`** (not the archive size), so a zip bomb is rejected.
- Cap on entry count.
- Reject absolute paths and `..`.
- Skip symlinks.
- Extension filter.
- In-memory only.

If any guard is missing, ZIP support is dropped and multi-file upload stands as the "bulk" feature.

## 10.4 Processing Model

Bulk processing is **synchronous**. Background queues and SSE progress are roadmap items and are not claimed.

---

# 11. Device Identification

The CSM `device` block carries: `hostname`, `vendor`, `platform`, `hardware_model`, `serial_number`, `os_version`, `management_ip`.

## 11.1 Sources (in order)

1. Header comments in the configuration.
2. Appended `show version` / `show inventory` (Cisco, Arista) or `show chassis hardware` / `show version` (Junos) text in the same upload.

Pure standard-library regex. No guessing.

## 11.2 Management IP Rule

- Cisco: Loopback0, then Mgmt / GigabitEthernet0/0.
- Junos: `fxp0`, `me0`, `em0`.
- Arista: Management1.
- Otherwise `None`. **No "first interface with an IP" fallback.**

## 11.3 Missing Data

- The CSM stores `None`, so the schema stays valid.
- PDF, DOCX and report views render **"Not In Config"**. This is a display-time substitution only.

## 11.4 Certified Report Integrity

New device fields must not change any stored report or any hash input. Requirement: a report stored before this change still exports and verifies unchanged. If new fields would alter a hashed structure, they become display-only at export time and stay out of hashed data. A regression test covers this.

---

# 12. Remediation Engine

## 12.1 Registry

`BASELINE_REMEDIATION_REGISTRY` in `remediation_engine.py`, keyed by **baseline rule id**:

- 10 Cisco IOS-XE entries, 10 Junos entries, plus Arista and PAN-OS entries as those vendors land.
- Each entry is an ordered list of device-specific CLI lines. Placeholders are filled from the CSM or shown as `<PLACEHOLDER>`.
- CIS and STIG controls resolve through their mapped baseline rules (`resolve_rule_to_baseline`). No separate entries for those 17 control ids.
- Unknown ids raise a clear `KeyError`.
- Jinja template files are retired. A single mechanism remains.

## 12.2 Tests

- Every active baseline rule, and every CIS and STIG control, resolves to non-empty remediation.
- Adding a rule without remediation fails the test.

## 12.3 Display-Only

Remediation is **never executed**. There is zero automatic device execution.

---

# 13. Static Conflict Analysis

The taxonomy has four categories: direct contradiction, shadowing, overlap, redundancy.

**Current implemented scope:** the conflict checker is hardcoded to `CISCO-NTP-001` (two checks). The four categories are a documented taxonomy, not four generic analyzers.

Consequences:

- Conflict claims are scoped to NTP remediation until generic analyzers exist.
- For other failed rules the UI must say **"conflict analysis not available for this rule"**, not "no conflicts".
- "No conflict detected" never means "universally safe".

Building generic analyzers is a stretch goal (§30).

---

# 14. Trusted Rule Library

Human-approved deterministic mappings, with suggestion queue, active review, vendor filter, search, inspection, provenance, approval identity, timestamps, status, and revocation where authorized.

AI suggestions remain untrusted until approved. A mapping conflict never silently overwrites an existing trusted mapping.

## 14.1 Review Screen Shortcuts (planned)

Category buttons (for example "SSH Version", "Syslog Server", "AAA") auto-fill the standard CSM target fields. One-click **Approve & Persist** saves to `trusted_mappings` and re-evaluates the active audit. A regex condition tester is out of scope.

---

# 15. Audit Ledger

Each finalized audit appends a SHA-256 hash-chain entry. Report editing never alters the compliance result or ledger entry. Ledger integrity verification, backup and recovery are supported.

The ledger, `audit_reports`, `audit_report_edits` and `trusted_mappings` are **protected**. No cleanup or feature work may modify their schema or rows.

---

# 16. Canonical Audit Reporting

**One canonical report per audit.** PDF and DOCX are exports of it, not separate sources.

Contents: audit identity, vendor, **device identification (model, serial, OS version, management IP)**, configuration metadata, framework summaries, control results, evidence, remediation, conflict analysis, AI and trusted-mapping provenance, reviewer observations, recommendations, final notes, edit history.

Framework summaries report `NOT_ASSESSED` controls separately from pass / fail / unknown.

## 16.1 Editable Fields

Executive Summary, Auditor Observations, Recommendations, Additional Findings, Final Reviewer Notes, Control Notes, Remediation Commentary.

## 16.2 Immutable Fields

PASS / FAIL / UNKNOWN, control ids, vendor, framework, authoritative evidence, audit identity, system snapshot, ledger and cryptographic data.

Each manual change records editor, timestamp, field, old value, new value, version. The UI marks changed content **Edited manually**.

## 16.3 One Exporter

`report_exporter.py` is the canonical PDF/DOCX exporter. The older `report_generator.py` (QR-code certificate) duplicates it and is a retirement candidate (§27).

---

# 17. Report API

```text
GET   /api/reports/{report_id}
PATCH /api/reports/{report_id}
GET   /api/reports/{report_id}/edits
POST  /api/reports/{report_id}/export/pdf
POST  /api/reports/{report_id}/export/docx
```

JWT identity determines editor identity. Ownership enforced. Cross-owner access does not leak existence. Viewer is read-only. Stale versions return `409`. Immutable fields cannot be modified.

---

# 18. Database

SQLite for the demo. Tables: `audit_sessions`, `audit_ledger`, `audit_reports`, `audit_report_edits`, `users`, `pending_suggestions`, `trusted_mappings`.

Tests must use a temporary database and temporary export directory. **Tests never write to `data/auditor.db`.** A check confirms the real `audit_sessions` row count does not grow across test runs.

PostgreSQL is the production migration target.

---

# 19. Authentication and RBAC

Roles: `VIEWER`, `UPLOADER`, `REVIEWER`. Pre-seeded accounts, no self-registration. JWT, password hashing, failed-login protection, ownership isolation, anti-enumeration. Enforced in both backend and UI.

Test accounts (`api_test_*`) must not live in the production database. Where they already exist and appear in ledger records, they are deactivated (`is_active = 0`), not deleted.

---

# 20. Role-Based Product UX

UX follows **Role → Goal → Workflow → Technical Detail**, not backend module → permanent navigation item.

| Role | Surface | Question answered |
|---|---|---|
| Viewer | Read-only compliance dashboard | "What is the current compliance situation?" |
| Uploader | Upload (single / multi-file) and History | "Did my configuration get processed?" |
| Reviewer | Dashboard, Review Queue, Reports, System | Full audit workflow |

## 20.1 Viewer

Totals, PASS / FAIL / UNKNOWN, trends, vendor distribution, framework analytics, recent activity. No AI, remediation, trusted rules, parser details or diagnostics.

## 20.2 Uploader

Upload with vendor auto-detection and validation. History with status (Processing, In Review, Reviewed). Batch results show a summary card per file. No reviewer tooling.

## 20.3 Reviewer

Dashboard (KPIs, upload and compliance analytics, recent audits, compact runtime summary). Review Setup (audit, AI mode, frameworks) with the notice: *"Model selection affects advisory AI functions only. Deterministic compliance remains authoritative."* Audit Workspace tabs: Overview, Results, Evidence, AI Review, Remediation, Conflict Analysis, Report.

Framework picker lists CIS, DISA-STIG, NIST SP 800-53 rev5, ISO/IEC 27001:2022 where compatible with the vendor.

## 20.4 Design Principles

Technically credible, clean, dense where needed, progressive disclosure, role-specific, consistent. Avoid backend-as-navigation, decorative cards, nested panels without purpose, technical diagnostics on non-reviewer screens. Improve the existing application, do not replace it.

## 20.5 UX Roadmap

Chunk 1 role/IA → 2 reviewer dashboard → 3 reviewer workflow → 4 uploader → 5 viewer → 6 visual design system → 7 UX QA. Roles and route guards are built. Remaining work is polish and QA.

---

# 21. Security Requirements

**Configuration:** treated as data, never executed. Allow-listed types. Size limits. Fail-safe parsing. ZIP guards per §10.3.

**AI:** loopback-only inference, model allow-list, no arbitrary subprocess, no compliance authority, no remediation execution, human approval before any mapping becomes trusted.

**Code:** AST safety test forbids sockets, subprocess and SSH libraries anywhere in `src/`.

**Authentication:** JWT, RBAC, hashing, failed-login protection, ownership isolation, anti-enumeration.

---

# 22. Performance

Report separately.

- **Deterministic path** (upload → parse → CSM → compliance): measured and documented.
- **AI path** (unmapped line → suggestion): measured separately on real hardware.
- **Bulk path:** measure per-file and per-batch time once built.

No universal latency guarantee is claimed.

---

# 23. Testing

**Core:** vendor detection and routing (including Arista not capturing Cisco), parsers, CSM, compliance, framework selection, remediation coverage, conflict analysis.
**Crosswalk:** determinism, roll-up rules, `NOT_ASSESSED` handling, every baseline rule has an entry.
**Device identity:** with and without `show` output, "Not In Config" rendering, management IP preference.
**Ingestion:** multi-file success, one bad file isolated, oversize rejected, ZIP traversal / bomb rejected (if ZIP built).
**AI:** model selection, fallback, timeout, malformed output, trusted mapping, mapping conflict.
**Security:** authentication, RBAC, ownership, isolation, immutable fields, JWT identity, AST safety.
**Reporting:** canonical report, editing, optimistic concurrency, edit history, PDF, DOCX, export immutability, **old-report integrity**, ledger integrity.
**UI:** role navigation, role leakage, workflow transitions, model selection, report editing, batch upload.

---

# 24. Acceptance Criteria

The product is functionally complete when:

- Cisco and Juniper auditing work deterministically, and Arista and PAN-OS demonstrate further extensibility.
- Vendor routing fails closed, and Arista never captures Cisco files.
- PASS / FAIL / UNKNOWN remain deterministic.
- AI suggestions require human approval and preserve full 11-field provenance.
- Multi-framework evaluation is vendor-aware and includes NIST and ISO via crosswalk, with `NOT_ASSESSED` reported honestly.
- Every active baseline rule has remediation and a crosswalk entry (enforced by tests).
- Reports show device model, serial, OS version and management IP, or "Not In Config".
- Remediation is display-only.
- Static conflicts are surfaced only within the declared scope.
- The ledger remains hash-chained and verifies.
- One canonical report exists per finalized audit and edits cannot change authoritative results.
- Reports created before v7 still export and verify unchanged.
- Viewer, Uploader and Reviewer see only their own experience.
- Multi-file upload isolates per-file errors.
- The full test suite passes twice in a row with no growth in the real database.
- The core workflow runs offline.

---

# 25. Known Limitations (Accepted)

- **INT-001:** unused-interface detection depends on the word "unused" in the description.
- **ROUTING-001:** BGP-only scope. OSPF and EIGRP not covered.
- **SNMP-001:** flags any community string. Does not separate weak from restricted.
- **OLLAMA-NTP-001:** LLM refusal rate is not stable at zero. Fallback is the safety net.
- **Conflict checker:** NTP-only (§13).
- **Crosswalk coverage:** NIST and ISO assess mapped controls only.
- **Serial number:** absent from plain `running-config`. Needs appended `show` output.
- **Framework counts:** CIS 7, STIG 10, baselines 10 each. Not the full catalogues.
- **Learning:** stored rules, not retrained weights.

---

# 26. Roadmap (After Current Scope)

1. Fortinet support.
2. Generic conflict analyzers for all four categories.
3. Background processing queue and near-real-time progress (SSE).
4. Full network reachability simulation / digital twin.
5. Live retrieval as a separate opt-in module.
6. Production-grade multi-reviewer approval.
7. Expanded framework catalogues.
8. NCIIPC integration, only when authoritative material is available.
9. Multi-tenant deployment.
10. Offline installer media.
11. Additional vendors (HPE Aruba, Huawei, MikroTik, SONiC / Cumulus and others).

Bulk ingestion moved from the roadmap into current scope (§10).

---

# 27. Legacy Cleanup Workstream

Run on its **own branch**, separate from feature work. The audit is read-only first; deletion follows only after review.

## 27.1 Audit Findings Kept as Decisions

| Item | Decision |
|---|---|
| Test artifacts (`data/exports/*`, `scratch/chrome_user_data/`, root `__pycache__/`) | Delete via directory mode, one summary log line each |
| 720 orphan test rows in `audit_sessions` | Delete using a `NOT EXISTS` query against `audit_reports`, after confirming no ledger reference |
| Rejected and stale `pending_suggestions` | Archive, then delete |
| `api_test_*` users | Deactivate, do not delete, if ledger references them |
| Root `main.py` wrapper | Archive, update README |
| `recover_development_ledger.py` | Archive |
| Pre-recovery database backup | **Keep** until submission (ledger evidence) |
| Demo ZIP (about 8.5 GB) | Move to external storage by hand |
| `tools/`, `config/Rule_Library/*`, DistilBERT dependencies | Keep |
| `report_generator.py` duplicate exporter | Retire after confirming no live imports |

## 27.2 Rules

- Never touch `audit_ledger`, `audit_reports`, `audit_report_edits`, `trusted_mappings`, or the sessions those reports reference.
- Every removal is written to a hash-chained `legacy_audit_log.jsonl`.
- Ledger verification must pass after cleanup, else restore from backup.
- Root cause fix: tests use a temporary database and export directory.

---

# 28. Verification Gate Policy

Agent narration is not evidence. A work package is closed only when raw output shows:

1. Full `pytest` run **twice**, final pass / fail line pasted.
2. Real database `audit_sessions` count unchanged before and after.
3. `verify_chain()` passes.
4. Registered framework ids printed and confirmed in `GET /api/compliance/frameworks`.
5. Each sample config run through every applicable framework, twice, with identical output.
6. Generated PDF text shows the device fields and at least one remediation command.
7. Old-report integrity test passes.
8. `git diff --stat` reviewed. Every test-only change is explained.
9. Work committed in logical commits.

Current status: the remediation, identity and crosswalk package is at "code-complete, pending gate". Known open items from review are `NOT_ASSESSED` handling for unmapped controls, removal of the "first available" management-IP fallback, and the certified-report integrity check.

---

# 29. Overclaim Corrections (from 2026-09-24 audit)

| Risk | Required fix |
|---|---|
| Architecture slide lists Arista EOS as supported | Mark "Architecture-Ready" until the Arista adapter passes its tests, then update |
| Conflict checker covers one rule but is described as four categories | Scope wording to NTP-only; show "not available" for other rules |
| Five AI modes named, four exposed | Describe four selectable modes plus a model parameter override |
| Suggestion provenance lists 11 fields, stores 9 | Add `model_version` and `model_checksum` |
| DistilBERT missing from the model list | Name it as the mapping component |
| NIST appeared only as tags inside CIS/STIG | Now a crosswalk framework; state mapped-control coverage only |

---

# 30. Build Plan

| Order | Package | Status |
|---|---|---|
| 1 | Remediation registry, device identity, NIST/ISO crosswalk | CODE-COMPLETE, PENDING GATE (verify and fix pass in progress) |
| 2 | Arista by reuse of the Cisco parser, plus multi-file upload (guarded ZIP if all guards land) | PLANNED |
| 3 | PAN-OS parser, remediation and crosswalk entries | PLANNED |
| 4 | Category buttons in the AI suggestion review screen | PLANNED |
| 5 | Provenance fields (`model_version`, `model_checksum`) | PLANNED |
| 6 | Legacy cleanup branch | PLANNED (before submission) |
| 7 | Deliverables: README, architecture document, demo, slides | PLANNED |

Drop order if time runs short: PAN-OS goes first, then ZIP, then generic conflict analyzers. Steps 1, 2 and 7 are protected. If PAN-OS is dropped, the architecture stays ready and the slides say so.

---

# 31. What the Product Must Not Claim

- That AI makes compliance decisions.
- That AI output is automatically trusted.
- That AI models are retrained by reviewer input.
- That remediation is guaranteed safe.
- That the system simulates the complete network.
- That all target vendors are implemented.
- That Arista or PAN-OS are supported before their adapters exist and pass tests.
- That any framework catalogue is fully covered, including NIST and ISO.
- That "not assessed" controls passed.
- That conflict analysis covers all four categories generically.
- That NCIIPC controls are implemented.
- That AI latency is universally fixed.
- That streaming, queue-based or live-retrieval processing exists.

---

# 32. Product Success Definition

A reviewer can take a configuration from upload through deterministic compliance evaluation, AI-assisted interpretation where needed, human approval, remediation review, and canonical reporting without violating the security boundaries.

A viewer understands compliance without navigating technical internals. An uploader submits one or many configurations without seeing reviewer tooling. Every authoritative security decision stays deterministic and auditable.

---

# 33. Submission Deliverables (PS Requirements)

| Deliverable | Content notes |
|---|---|
| Source code link | Clean branch, cleanup workstream merged, no test artifacts committed |
| README with setup | Docker and local setup, offline demo steps, default roles, test command |
| Architecture document (max 2 pages) | Pipeline, CSM, crosswalk, AI side-channel, offline decision (§6), "learning means stored rules" (§8.4) |
| Demo video (max 2 minutes) | Upload multiple vendors → auto-detect → multi-framework results → AI suggestion → approve → re-audit → PDF with device identity and remediation |
| Technical presentation (max 5 slides) | Problem, architecture, deterministic-plus-AI trust model, live results, limits and roadmap |

Every claim in these files follows §31.

---

# 34. Final Architecture Summary

```text
                         NTRO AUDITOR
                              │
             ┌────────────────┼────────────────┐
          VIEWER           UPLOADER         REVIEWER
             │                │                │
         Dashboard      Upload / History    Dashboard
                        (single, multi)         │
                                          Review Queue
                                                │
                                          Review Setup
                                        ┌───────┴───────┐
                                      Model         Framework
                                        └───────┬───────┘
                                                ↓
                                         Audit Workspace
                                                │
                       Results · AI Review · Remediation · Conflicts
                                                ↓
                                        Canonical Report
                                     (device identity included)
                                                ↓
                                          Audit Ledger
                                              SHA-256
```

### Core security pipeline

```text
Configuration (file / multi-file / guarded ZIP)
      ↓
Vendor Detection (fail closed)
      ↓
Vendor Adapter → CSM (+ device identity)
      ↓
Baseline Rules → Framework Registry (CIS · STIG · NIST · ISO)
      ↓
PASS / FAIL / UNKNOWN  (+ NOT_ASSESSED)
      ↓
Evidence → Remediation (registry) → Canonical Report → Ledger
```

### AI side channel

```text
Unmapped Configuration
        ↓
DistilBERT + Ollama (advisory)
        ↓
Suggestion → Authorized Human → Trusted Mapping
        ↓
Future Deterministic Processing
```

## Final Product Rule

> **The system can use AI to understand unfamiliar configurations, but only deterministic rules decide compliance, only authorized humans decide what AI mappings become trusted, and no component automatically changes a live network device.**
