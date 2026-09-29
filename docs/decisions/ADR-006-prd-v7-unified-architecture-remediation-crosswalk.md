# ADR-006: PRD v7 Unified Architecture — Central Remediation Registry, Multi-Framework Crosswalk, Guarded Ingestion, and Device Identity Extraction

## Status
Accepted

## Date
2026-09-29

## Context
As defined in **NTRO PS26155 PRD v7.0**, the platform requires consolidated architectural alignment across five critical functional areas that were refined during codebase audits:

1. **Remediation Architecture**: Previous versions utilized scattered Jinja2 template files (`templates/remediation/*.j2`), introducing template parsing overhead, duplicate logic across frameworks, and potential AST safety ambiguities.
2. **Framework Scalability**: Extending compliance coverage from vendor-specific CIS Benchmarks and DISA-STIGs to **NIST SP 800-53 rev5** and **ISO/IEC 27001:2022** threatened to trigger an $M \times N$ rule explosion if separate evaluator engines were written for each catalog.
3. **Ingestion & Air-Gap Integrity**: Enterprise auditing requires bulk ingestion (multi-file and compressed archives). However, air-gapped defense enclaves strictly forbid live device execution (e.g. Netmiko/NAPALM/SSH) and demand rigorous defenses against archive-based exploits (zip bombs, directory traversal).
4. **Device Identity Extraction & Certified Integrity**: Formal audit dossiers require physical device metadata (hardware model, serial number, OS version, management IP). However, injecting new fields into existing audit session structures risks invalidating historical SHA-256 hash chains and cryptographic non-repudiation seals.
5. **Precise AI Learning Semantics**: Earlier documentation colloquially referenced a "training loop", creating a false impression that user feedback fine-tuned neural model weights—an unacceptable behavior in air-gapped defense networks where weights must remain certified and frozen.

## Decision

We formally accept and institute the PRD v7 architectural enhancements:

### 1. Central Remediation Registry (Retiring Template Files)
- Deprecate and retire file-based Jinja2 templates.
- Implement a centralized, pure-Python `BASELINE_REMEDIATION_REGISTRY` keyed strictly by **baseline rule ID** (e.g. `CISCO-AAA-001`, `JUNOS-NTP-001`).
- CIS Benchmark and DISA-STIG controls resolve their remediation blocks directly through their mapped baseline rules via `resolve_rule_to_baseline()`.
- Remediation outputs remain 100% **display-only**; no CLI code is ever automatically executed on target hardware.

### 2. Parameterized Crosswalk Evaluator for NIST SP 800-53 & ISO/IEC 27001
- Rather than authoring hundreds of redundant evaluator checks, introduce a generic `CrosswalkEvaluator` driven by authoritative mapping tables (`nist_sp800_53_rev5_map.py` and `iso_iec_27001_2022_map.py`).
- Internal baseline rules evaluate deterministically against the Common Security Model (CSM). The Crosswalk Evaluator projects those baseline verdicts onto the respective framework controls.
- Adopt a strict 4-state roll-up logic:
  - Any mapped rule `FAIL` $\rightarrow$ Framework Control `FAIL`.
  - Else any mapped rule `UNKNOWN` $\rightarrow$ Framework Control `UNKNOWN`.
  - Else all mapped rules `PASS` $\rightarrow$ Framework Control `PASS`.
  - Unmapped framework controls $\rightarrow$ `NOT_ASSESSED` (explicitly excluded from pass/fail calculations and scoring).

### 3. Guarded Ingestion with Strict AST Air-Gap Boundaries
- Ingestion accepts single files, multi-file batches (`POST /api/audit/upload/bulk`), and guarded ZIP archives.
- Guarded ZIP ingestion enforces in-memory processing, strict total uncompressed byte limits (`ZipInfo.file_size` accumulation check), entry count caps, path traversal checks (`..` and leading slash rejection), and symlink rejection.
- Zero network socket or SSH libraries are permitted in `src/`, continuously validated by automated AST safety tests (`ast_safety.py`).

### 4. Certified Device Identity Extraction
- The Common Security Model (CSM) `device` schema defines standardized fields: `hostname`, `vendor`, `platform`, `hardware_model`, `serial_number`, `os_version`, and `management_ip`.
- Parsers extract device metadata using standard-library regular expressions from configuration comment headers or appended `show version` / `show inventory` / `show chassis hardware` command output.
- Missing attributes store `None` in the database schema and display as **"Not In Config"** in UI, PDF, and DOCX exports.
- Device identity attributes are treated as display-time metadata in exported reports, ensuring historical SHA-256 hash chains and ledger entries remain cryptographically intact without schema migration invalidation.

### 5. Deterministic Stored Mappings vs. Model Weights
- Unmapped configuration directives processed through the Human-in-the-Loop (HITL) queue persist approved transformations into `trusted_mappings.json`.
- The system "learns" by executing these approved deterministic rules in future audits.
- **Local AI model weights (DistilBERT, Ollama SLMs) are never retrained or modified at runtime.**

## Alternatives Considered

1. **Jinja2 Template Files per Framework Control (Rejected)**:
   - *Reason for Rejection*: Maintained duplicate CLI syntax snippets across 37+ control IDs. Difficult to statically type and test exhaustively.
2. **Dedicated Native Scanners for NIST SP 800-53 and ISO 27001 (Rejected)**:
   - *Reason for Rejection*: Duplicates identical conditional logic across multiple frameworks, leading to high maintenance overhead and divergence risks.
3. **Asynchronous Background Celery/Redis Processing for Bulk Ingestion (Rejected)**:
   - *Reason for Rejection*: Introduces unnecessary external infrastructure dependencies in air-gapped demo environments. Synchronous processing with per-file error isolation provides immediate, verifiable feedback with sub-second execution.
4. **Online Model Fine-Tuning / LoRA Adapters (Rejected)**:
   - *Reason for Rejection*: Modifying neural weights in an operational defense environment destroys determinism, introduces regression risks, and invalidates formal verification baselines.

## Consequences

### Positive
- **Single Source of Truth**: All CLI remediation is centralized and keyed to vendor baseline rules.
- **Zero Rule Duplication**: NIST and ISO compliance are achieved dynamically through the parameterized crosswalk engine.
- **Mathematical Safety**: Historical audit ledger entries and SHA-256 blocks remain 100% valid and verified.
- **Air-Gap Hardened**: Archive decompression vulnerabilities and unauthorized socket connections are prevented by design.
- **Transparent Provenance**: Zero ambiguity regarding AI behavior; auditors know all learning is transparent, inspectable, and deterministic.

### Trade-offs / Limitations
- NIST and ISO framework evaluations only assess controls that map to active baseline rules; unmapped catalog items are marked `NOT_ASSESSED`.
- Multi-file bulk processing is synchronous; extremely large bulk uploads (>50 configs) must be batched by the client.
