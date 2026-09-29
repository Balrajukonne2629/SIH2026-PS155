# Architectural Decision Records (ADRs)

This directory contains the formal Architecture Decision Records for the **NTRO PS26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor**.

## ADR Index

| ADR ID | Title | Status | Date | Decision Summary |
| :--- | :--- | :---: | :---: | :--- |
| [ADR-001](ADR-001-deterministic-compliance-decoupled-from-ai.md) | Deterministic Compliance Evaluation Decoupled from AI Decision-Making | **Accepted** | 2026-09-24 | Core compliance verdicts (PASS/FAIL) are 100% deterministic Python evaluations against CSM; AI is advisory-only for unmapped line interpretation. |
| [ADR-002](ADR-002-common-security-model-vendor-abstraction.md) | Common Security Model (CSM) & Multi-Vendor Abstraction Layer | **Accepted** | 2026-09-24 | Established vendor-neutral CSM schema and plug-and-play `VendorAdapter`/`VendorRegistry` preventing $M \times N$ rule duplication. |
| [ADR-003](ADR-003-human-in-the-loop-ai-unmapped-pipeline.md) | Human-in-the-Loop AI Disambiguation Queue for Unmapped Configuration Directives | **Accepted** | 2026-09-24 | Unmapped lines stage to `pending_suggestions.json` via local AI; strict human reviewer approval is required before promotion to `trusted_mappings.json`. |
| [ADR-004](ADR-004-sha256-hash-chained-audit-ledger.md) | SHA-256 Hash-Chained Cryptographic Audit Ledger for Non-Repudiation | **Accepted** | 2026-09-24 | Pure Python append-only cryptographic ledger storing SHA-256 chained blocks in SQLite for mathematical non-repudiation and tamper detection. |
| [ADR-005](ADR-005-air-gapped-local-execution-and-ast-sandboxing.md) | Air-Gapped Local Model Execution and Static AST Sandboxing | **Accepted** | 2026-09-24 | Strict zero-cloud egress air-gapped architecture with local hardware SLM discovery and AST allow-listing preventing template injection/RCE. |
| [ADR-006](ADR-006-prd-v7-unified-architecture-remediation-crosswalk.md) | PRD v7 Unified Architecture: Central Remediation Registry, Multi-Framework Crosswalk, Guarded Ingestion, and Device Identity Extraction | **Accepted** | 2026-09-29 | Replaced Jinja template files with central baseline remediation registry, introduced generic Crosswalk Evaluator for NIST/ISO, added guarded multi-file/ZIP ingestion, and formalized deterministic stored mappings. |
| [ADR-007](ADR-007-standalone-product-presentation-layer.md) | Standalone Evaluator-Facing Product Landing Page | **Accepted** | 2026-09-29 | Established an isolated, zero-dependency presentation layer in `/landing-page` on port 3001, safeguarding core compliance and audit code integrity. |

## Lifecycle States

- **PROPOSED**: Decision is under review and discussion.
- **ACCEPTED**: Decision has been approved and implemented across the codebase.
- **SUPERSEDED**: Decision was previously accepted but has been replaced by a subsequent ADR.
- **DEPRECATED**: Decision is no longer relevant or active.
