# AI-Driven Multi-Vendor Network Security Compliance Auditor
## Product Requirements Document — v6.0
### Consolidated Current Product Plan

**Problem Statement:** NTRO PS 26155  
**Team:** NextGen  
**Product:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Version:** 6.0 — Current Product Plan  
**SIH:** 2026

---

## Document Status

**Version:** 6.0  
**Purpose:** Current consolidated PRD for the implemented foundation and the current product/UX plan.

This document supersedes the previous v5 consolidated PRD as the current product plan. It preserves the core hybrid architecture and adds the implementation decisions made after v5: scalable vendor adapters, Juniper support, hardware-adaptive local AI model selection, trusted-rule governance, multi-framework evaluation, canonical editable audit reporting, report APIs/exports, and role-based product UX.

Implementation status is explicitly distinguished from planned work. Features described as planned are not to be presented as already implemented.

---

# 1. Product Vision

The system is an **offline-first, AI-assisted, deterministic network security compliance auditor**.

It accepts network-device configuration files, detects the vendor, normalizes them into a Common Security Model (CSM), evaluates security controls using deterministic rules, assists with unfamiliar configuration syntax using local AI, provides human-governed trusted mappings, generates display-only remediation, performs static conflict analysis, and produces tamper-evident audit reports.

### Core principle

> **AI interprets. Humans approve. Deterministic rules decide. Nothing is automatically executed on a live device.**

The AI must never:

- determine PASS/FAIL/UNKNOWN;
- directly modify trusted mappings;
- execute remediation;
- bypass deterministic compliance rules.

---

# 2. Problem

Network security auditing has several problems:

- Different vendors use different configuration syntax.
- Static parsers cannot understand every unfamiliar command.
- Manual auditing is slow and error-prone.
- Security teams need evidence behind every compliance result.
- Sensitive configurations cannot be casually sent to cloud AI systems.
- Remediation needs engineering review before deployment.
- Different users require completely different levels of system access and technical detail.

The system addresses these through:

```text
Configuration
      ↓
Unified Ingestion
      ↓
Vendor Detection
      ↓
Vendor Adapter
      ↓
Common Security Model
      ↓
Deterministic Compliance
      ↓
Evidence / Remediation / Reporting
```

with AI operating as an **advisory side-channel**.

---

# 3. Product Goals

## 3.1 Primary Goals

1. Deterministic network security compliance auditing.
2. Multi-vendor architecture.
3. Cisco IOS-XE as the stable reference implementation.
4. Juniper as the second implemented vendor.
5. Extensible architecture for Arista, Fortinet and Palo Alto.
6. Local AI interpretation of unfamiliar configuration syntax.
7. Human approval of AI-generated mappings.
8. Multi-framework compliance evaluation.
9. Hardware-adaptive AI model selection.
10. Trusted Rule Library.
11. Canonical editable audit reporting.
12. PDF/DOCX report export.
13. JWT-based role isolation.
14. Offline/on-premise operation.
15. Tamper-evident audit logging.

## 3.2 Non-Goals

The current product does not claim:

- complete vendor coverage;
- complete framework coverage;
- full network reachability simulation;
- guaranteed remediation safety;
- automatic remediation;
- live SSH configuration retrieval;
- multi-tenant SaaS;
- production-grade multi-reviewer approval.

---

# 4. Vendor Architecture

The architecture is designed for five target vendors:

```text
                    Unified Ingestion
                           │
                    Vendor Detection
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
       Cisco            Juniper        Future Vendors
                                      ┌──────┼──────┐
                                   Arista Fortinet Palo Alto
          │                │
          └────────────────┘
                   ↓
             Vendor Adapter
                   ↓
              Common CSM
                   ↓
        Deterministic Engine
```

## 4.1 Current Vendor Status

| Vendor | Status |
|---|---|
| Cisco IOS-XE | Implemented |
| Juniper | Implemented |
| Arista | Architecture-ready |
| Fortinet | Architecture-ready |
| Palo Alto | Architecture-ready |

Adding a vendor should primarily require a vendor adapter/parser, vendor rules, and tests rather than modification of the central compliance engine.

Unsupported or ambiguous vendor detection must fail closed.

---

# 5. Compliance Architecture

The compliance engine is deterministic.

```text
CSM
 ↓
Framework Registry
 ↓
Framework Evaluator
 ↓
PASS / FAIL / UNKNOWN
```

### Result states

Only:

- `PASS`
- `FAIL`
- `UNKNOWN`

are valid compliance outcomes.

UNKNOWN must never silently become PASS.

AI has **zero authority** over these states.

---

# 6. Multi-Framework Architecture

The system uses a shared internal-rule model rather than duplicating compliance logic.

```text
                 Internal Rule
                      │
             ┌────────┼────────┐
             ↓        ↓        ↓
            CIS     NIST    DISA-STIG
             │        │        │
             └────────┼────────┘
                      ↓
               Unified Results
```

Each deterministic rule can map to multiple framework controls.

Framework selection is vendor-aware.

An incompatible framework selection must return an explicit error rather than silently evaluating the wrong framework.

Current executable framework coverage must be stated according to what is actually implemented and tested; the PRD must not claim complete NIST/CIS/STIG coverage merely because the architecture supports it.

---

# 7. AI Model System

The AI subsystem is advisory only.

### Supported modes

```text
AUTO
FAST
QUALITY
DETERMINISTIC ONLY
MANUAL OVERRIDE
```

### Models

- `llama3.2:1b`
- `qwen2.5:7b-instruct-q4_K_M`
- deterministic-only mode

### Hardware-aware routing

The system can select an appropriate model based on:

- available RAM;
- GPU/VRAM availability;
- workload;
- task type.

Observed benchmark numbers are **hardware-specific measurements**, not universal performance guarantees.

### AI fallback

If the local AI runtime is unavailable, times out, refuses, returns malformed output, or otherwise fails:

```text
AI failure
    ↓
Deterministic fallback
```

The AI failure must never affect deterministic compliance authority.

---

# 8. AI Mapping Workflow

```text
Unknown Configuration Line
          ↓
      Local AI
          ↓
Suggested Mapping
          ↓
Confidence + Explanation
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

Every suggestion records its provenance.

### Required provenance

- raw configuration line;
- suggested CSM field;
- confidence;
- rationale;
- model;
- model version;
- model checksum;
- vendor;
- reviewer;
- timestamp;
- status.

---

# 9. Trusted Rule Library

The Trusted Rule Library contains **human-approved deterministic mappings**.

It provides:

- suggestions queue;
- active review;
- trusted rules;
- vendor filtering;
- search;
- inspection;
- provenance;
- approval identity;
- timestamps;
- status;
- management/revocation where authorized.

AI suggestions remain untrusted until an authorized reviewer approves them.

Mapping conflicts must never silently overwrite an existing trusted mapping.

---

# 10. Remediation Engine

For failed controls, the system can generate vendor-specific remediation.

```text
Failed Control
      ↓
Jinja2 Remediation
      ↓
Static Conflict Analysis
      ↓
Reviewer
```

The remediation is **display-only**.

### Conflict categories

Current static analysis covers:

1. Direct contradiction.
2. Shadowing.
3. Overlap.
4. Redundancy.

The system must not claim that "no conflict detected" means universally safe.

There is:

> **Zero automatic device execution.**

---

# 11. Audit Ledger

Each finalized audit produces an append-only SHA-256 hash-chain entry.

The ledger records the authoritative audit state.

Report editing must never alter the underlying compliance result or ledger entry.

The system supports ledger integrity verification and backup/recovery procedures.

---

# 12. Canonical Audit Reporting

The system has:

> **One canonical report per audit.**

PDF and DOCX are exports of this canonical report.

They are **not separate report sources**.

### Canonical report contains

- audit identity;
- vendor;
- configuration metadata;
- framework metadata;
- framework summaries;
- control results;
- evidence;
- remediation;
- conflict analysis;
- AI provenance;
- trusted-mapping provenance;
- reviewer observations;
- recommendations;
- final reviewer notes;
- edit history.

---

# 13. Editable Reporting

The reviewer can edit only approved human-content fields.

### Editable

- Executive Summary
- Auditor Observations
- Recommendations
- Additional Findings
- Final Reviewer Notes
- Control Notes
- Remediation Commentary

### Immutable

The reviewer cannot change:

- PASS/FAIL/UNKNOWN;
- control IDs;
- vendor;
- framework;
- authoritative evidence;
- audit identity;
- system snapshot;
- ledger information;
- cryptographic information.

Every manual change records:

```text
Editor
Timestamp
Field
Old Value
New Value
Version
```

The UI must visibly mark manually changed content:

> **Edited manually**

---

# 14. Report API

The canonical report exposes:

```text
GET  /api/reports/{report_id}
PATCH /api/reports/{report_id}
GET  /api/reports/{report_id}/edits

POST /api/reports/{report_id}/export/pdf
POST /api/reports/{report_id}/export/docx
```

### Security

- JWT identity determines editor identity.
- Client cannot spoof another editor.
- Ownership is enforced.
- Cross-owner access must not leak report existence.
- Viewer is read-only.
- Stale report versions return `409`.
- Immutable fields cannot be modified.

---

# 15. Database

Current demo persistence uses SQLite.

Persisted domains include:

- audit sessions;
- trusted mappings;
- pending AI suggestions;
- reports;
- report edits;
- authentication/role information;
- ownership information.

The architecture can migrate to PostgreSQL for production.

---

# 16. Authentication and RBAC

Three application roles exist:

```text
VIEWER
UPLOADER
REVIEWER
```

### Viewer

Read-only compliance information.

### Uploader

- upload configuration;
- view upload history;
- track processing/review status;
- access permitted own records.

### Reviewer

Full operational workflow:

- dashboard;
- audit queue;
- model selection;
- framework selection;
- audit results;
- AI review;
- trusted mappings;
- remediation;
- reports;
- report editing;
- exports;
- relevant system diagnostics.

---

# 17. Role-Based Product UX

The product will **not expose all system modules to every user**.

The UI is based on:

> **Role → Goal → Workflow → Technical Detail**

rather than:

> **Backend module → permanent navigation item**

---

# 18. Viewer Experience

The viewer gets essentially one product surface:

## Viewer Dashboard

It should show:

- total audits;
- PASS;
- FAIL;
- UNKNOWN;
- compliance trends;
- vendor distribution;
- framework analytics;
- recent activity.

The viewer does **not** need:

- AI model selection;
- AI mapping;
- remediation;
- hardware diagnostics;
- parser details;
- trusted rules;
- technical conflict analysis.

### Viewer question

> **"What is the current compliance situation?"**

---

# 19. Uploader Experience

The uploader gets:

```text
Upload
History
```

### Upload

- select configuration;
- auto-detect vendor;
- validation;
- upload;
- processing status.

### History

Example:

| Configuration | Vendor | Uploaded | Status |
|---|---|---|---|
| router01.cfg | Cisco | 12:42 | Reviewed |
| router02.cfg | Juniper | 12:35 | In Review |
| router03.cfg | Cisco | 11:58 | Processing |

The uploader should not be exposed to reviewer-only technical tools.

---

# 20. Reviewer Experience

The reviewer is the main technical user.

### Primary navigation

```text
Reviewer Dashboard
Review Queue
Reports
System
```

Technical functions appear contextually.

---

# 21. Reviewer Dashboard

The reviewer dashboard should contain:

### Audit KPIs

- Total Audits
- Pending Review
- In Review
- Completed
- Attention Required

### Upload Analytics

- today;
- this week;
- this month;
- vendor distribution.

### Compliance Analytics

- PASS;
- FAIL;
- UNKNOWN;
- framework metrics;
- trend.

### Recent Audits

Show:

```text
Audit ID
Vendor
Upload Time
Status
Action
```

### Runtime Summary

Compact information:

```text
AI Runtime: Local
Model: llama3.2:1b
Mode: Auto
Memory: 4.1 / 15.7 GB
Fallback: Active
```

Detailed diagnostics should remain secondary.

---

# 22. Review Setup

Before reviewing an audit:

```text
Select Audit
      ↓
Review Setup
      ↓
Select Model
      ↓
Select Frameworks
      ↓
Start Review
```

Example:

```text
REVIEW SETUP

Configuration:
EDGE-RTR-01

Vendor:
Cisco IOS-XE

AI MODE

○ Auto / Adaptive
○ Fast
○ Quality
○ Deterministic Only

FRAMEWORKS

☑ CIS
☑ DISA-STIG

              START REVIEW →
```

The screen must clearly state:

> Model selection affects advisory AI functions only. Deterministic compliance remains authoritative.

---

# 23. Reviewer Audit Workspace

Once the reviewer opens an audit:

```text
Audit
├── Overview
├── Results
├── Evidence
├── AI Review
├── Remediation
├── Conflict Analysis
└── Report
```

These should be contextual sections/tabs inside the audit rather than permanent global navigation.

---

# 24. UX Design Principles

The UI should be:

- technically credible;
- clean;
- information-dense where required;
- simple for non-technical roles;
- progressive in disclosure;
- role-specific;
- consistent;
- visually hierarchical.

Avoid:

- exposing backend architecture as navigation;
- unnecessary cards;
- excessive decorative effects;
- nested panels without purpose;
- technical diagnostics on viewer/uploader screens;
- showing reviewer controls to users who cannot use them.

The redesign should improve the existing application rather than replace it with an unrelated greenfield mockup.

---

# 25. UX Implementation Roadmap

### Chunk 1 — Role and Information Architecture

Define:

- navigation;
- permissions;
- screens;
- workflow boundaries.

### Chunk 2 — Reviewer Dashboard

Build:

- analytics;
- review queue;
- audit activity;
- runtime summary.

### Chunk 3 — Reviewer Workflow

Integrate:

- model selection;
- framework selection;
- audit results;
- AI review;
- remediation;
- reporting.

### Chunk 4 — Uploader

Build:

- upload;
- history;
- status.

### Chunk 5 — Viewer

Build:

- compliance dashboard;
- analytics;
- trends.

### Chunk 6 — Visual Design System

Apply a consistent design system to the existing product.

### Chunk 7 — UX QA

Review:

- hierarchy;
- spacing;
- density;
- navigation;
- role leakage;
- consistency;
- accessibility.

---

# 26. Security Requirements

### Configuration security

- Configuration files are treated as data.
- Uploaded files are never executed.
- File types are allow-listed.
- Size limits are enforced.
- Parsing failures fail safely.

### AI security

- Loopback-only inference.
- Model allow-list.
- No arbitrary subprocess execution.
- No AI compliance authority.
- No AI remediation execution.
- Human approval before trusted mapping.

### Authentication

- JWT.
- RBAC.
- Password hashing.
- Failed-login protection.
- Ownership isolation.
- Anti-enumeration.

---

# 27. Performance Requirements

Performance must be separated into:

### Deterministic path

Measure:

```text
Upload
→ Parse
→ CSM
→ Compliance
```

### AI path

Measure separately:

```text
Unmapped line
→ AI
→ Suggestion
```

AI performance must be reported from actual hardware tests.

No universal latency guarantee should be claimed.

---

# 28. Testing

Testing must cover:

### Core

- vendor detection;
- vendor routing;
- parser;
- CSM;
- compliance;
- framework selection;
- remediation;
- conflict analysis.

### AI

- model selection;
- fallback;
- timeout;
- malformed output;
- trusted mapping;
- mapping conflict.

### Security

- authentication;
- RBAC;
- ownership;
- cross-user isolation;
- immutable fields;
- JWT identity.

### Reporting

- canonical report;
- editing;
- optimistic concurrency;
- edit history;
- PDF;
- DOCX;
- export immutability;
- ledger integrity.

### UI

- viewer navigation;
- uploader navigation;
- reviewer navigation;
- role leakage;
- workflow transitions;
- model selection;
- report editing.

---

# 29. Acceptance Criteria

The current product is considered functionally complete when:

- Cisco auditing works deterministically.
- Juniper demonstrates second-vendor extensibility.
- Vendor routing fails closed.
- PASS/FAIL/UNKNOWN remain deterministic.
- AI suggestions require human approval.
- Trusted mappings preserve provenance.
- Model selection supports adaptive/fast/quality/deterministic modes.
- Multi-framework evaluation is vendor-aware.
- Remediation is display-only.
- Static conflicts are surfaced within the declared scope.
- Audit entries remain hash chained.
- One canonical report exists per finalized audit.
- Report edits cannot modify authoritative compliance results.
- PDF/DOCX exports derive from the canonical report.
- Viewer sees viewer experience only.
- Uploader sees upload/history experience only.
- Reviewer gets the complete technical workflow.
- RBAC is enforced both in backend and UI.
- The core workflow operates offline.

---

# 30. Roadmap

After the current product:

1. Arista support.
2. Fortinet support.
3. Palo Alto support.
4. Bulk ingestion.
5. Background processing queue.
6. Near-real-time progress/SSE.
7. Full network reachability simulation/digital twin.
8. Live SSH retrieval.
9. Production-grade multi-reviewer approval.
10. Expanded compliance frameworks.
11. NCIIPC integration when authoritative material becomes available.
12. Multi-tenant deployment.
13. Offline installer media.

---

# 31. What the Product Must Not Claim

The product must not claim:

- that AI makes compliance decisions;
- that AI output is automatically trusted;
- that remediation is guaranteed safe;
- that the system simulates the complete network;
- that all target vendors are already implemented;
- that all compliance frameworks are fully covered;
- that NCIIPC controls are implemented unless authoritative material and executable mappings are actually incorporated;
- that AI latency is universally fixed;
- that the current prototype already provides full streaming/queue-based processing unless those components are implemented.

---

# 32. Product Success Definition

The product succeeds when a reviewer can take a configuration from upload through deterministic compliance evaluation, AI-assisted interpretation where needed, human approval, remediation review, and canonical reporting without violating the security boundaries.

At the same time:

- a viewer can understand compliance without navigating technical internals;
- an uploader can submit configurations without being exposed to reviewer tooling;
- a reviewer can operate the complete audit workflow without being overwhelmed by system internals;
- every authoritative security decision remains deterministic and auditable.

---

# 33. Final Architecture Summary

```text
                         NTRO AUDITOR
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          VIEWER           UPLOADER         REVIEWER
             │                │                │
         Dashboard       Upload/History    Dashboard
                                               │
                                         Review Queue
                                               │
                                         Review Setup
                                        ┌──────┴──────┐
                                        │             │
                                      Model        Framework
                                        │             │
                                        └──────┬──────┘
                                               ↓
                                         Audit Workspace
                                               │
                            ┌──────────────────┼──────────────────┐
                            │                  │                  │
                         Results            AI Review         Remediation
                            │                  │                  │
                            └──────────────────┼──────────────────┘
                                               ↓
                                        Canonical Report
                                               │
                                    ┌──────────┼──────────┐
                                    │          │          │
                                  Notes      History    Export
                                               │
                                               ↓
                                          Audit Ledger
                                               │
                                            SHA-256
```

### Core security pipeline

```text
Configuration
      ↓
Unified Ingestion
      ↓
Vendor Detection
      ↓
Vendor Adapter
      ↓
CSM
      ↓
Framework Registry
      ↓
Deterministic Compliance Engine
      ↓
PASS / FAIL / UNKNOWN
      ↓
Evidence
      ↓
Remediation
      ↓
Canonical Report
      ↓
Audit Ledger
```

### AI side channel

```text
Unmapped Configuration
        ↓
Local AI
        ↓
Suggestion
        ↓
Authorized Human
        ↓
Trusted Mapping
        ↓
Future Deterministic Processing
```

## Final Product Rule

> **The system can use AI to understand unfamiliar configurations, but only deterministic rules decide compliance, only authorized humans decide what AI mappings become trusted, and no component automatically changes a live network device.**
