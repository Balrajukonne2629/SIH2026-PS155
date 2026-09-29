# NTRO PS26155 — System Screenshots & Operational Walkthrough

This document indexes and catalogs all operational screenshots for the **NTRO PS26155 AI-Driven Multi-Vendor Network Security Compliance Auditor**. The screenshots capture end-to-end user journeys across both primary operator roles: **Network Administrator (Uploader)** and **Security Reviewer & Approver (Reviewer / System Admin)**.

---

## Table of Contents

- [Overview & Quick Index](#overview--quick-index)
- [Part 1: Network Administrator / Uploader Workflow (`screenshots/uploader`)](#part-1-network-administrator--uploader-workflow)
  - [1.1 Operator Authentication & Role Portal](#11-operator-authentication--role-portal)
  - [1.2 Network Operations & Ingestion Console Dashboard](#12-network-operations--ingestion-console-dashboard)
  - [1.3 My Audits Management Table](#13-my-audits-management-table)
  - [1.4 Intake Step 1: Configuration Source & Quick Presets](#14-intake-step-1-configuration-source--quick-presets)
  - [1.5 Intake Step 2: Multi-Vendor Syntactic Heuristics](#15-intake-step-2-multi-vendor-syntactic-heuristics)
  - [1.6 Compliance Framework Scoping & Staged Execution](#16-compliance-framework-scoping--staged-execution)
  - [1.7 Staged Audit Summary & Ingestion Ledger View](#17-staged-audit-summary--ingestion-ledger-view)
  - [1.8 Cryptographic Audit Ledger & Reports Registry](#18-cryptographic-audit-ledger--reports-registry)
  - [1.9 Cryptographic Ledger Verification (Integrity Validated)](#19-cryptographic-ledger-verification-integrity-validated)
  - [1.10 Audit Compliance Report Workspace (Evaluated Controls Matrix)](#110-audit-compliance-report-workspace-evaluated-controls-matrix)
- [Part 2: Security Reviewer & Approver Console (`screenshots/revieiwer`)](#part-2-security-reviewer--approver-console)
  - [2.1 Executive Compliance Posture Dashboard](#21-executive-compliance-posture-dashboard)
  - [2.2 Submitted Audits Queue & Configuration Compliance Progression](#22-submitted-audits-queue--configuration-compliance-progression)
  - [2.3 Subsystem Health, Air-Gap Containment & Regulatory Alignment](#23-subsystem-health-air-gap-containment--regulatory-alignment)
  - [2.4 Certified Tamper-Evident Compliance Reports Registry](#24-certified-tamper-evident-compliance-reports-registry)
  - [2.5 Enterprise Multi-Session Audit Registry (All Audits)](#25-enterprise-multi-session-audit-registry-all-audits)
  - [2.6 Reviewer Operational Triage & Action Items](#26-reviewer-operational-triage--action-items)
  - [2.7 Cryptographic Audit Ledger (Canonical Record Chain)](#27-cryptographic-audit-ledger-canonical-record-chain)
  - [2.8 System Controls: AI Model Manager & Hardware Runtime](#28-system-controls-ai-model-manager--hardware-runtime)
  - [2.9 Runtime Operational Mode Switcher (AUTO / FAST / QUALITY)](#29-runtime-operational-mode-switcher-auto--fast--quality)
  - [2.10 Workload Routing & Latency Guardrail Matrix (§4.2)](#210-workload-routing--latency-guardrail-matrix-42)
  - [2.11 Canonical Report Workspace & Multi-Format Export](#211-canonical-report-workspace--multi-format-export)
  - [2.12 Cryptographic PDF Signature Verification (`AUTHENTIC`)](#212-cryptographic-pdf-signature-verification-authentic)
  - [2.13 Canonical Report Editor with Immutable Deterministic Guardrails](#213-canonical-report-editor-with-immutable-deterministic-guardrails)

---

## Overview & Quick Index

| # | Filename | Subsystem / Screen | User Role | Key Highlight |
|---|----------|--------------------|-----------|---------------|
| **U01** | `screenshots/uploader/Screenshot 2026-09-30 013321.png` | Operator Authentication | Public / All | Role presets with PBKDF2 credentials |
| **U02** | `screenshots/uploader/Screenshot 2026-09-30 013335.png` | Ingestion Console Dashboard | `netadmin_uploader` | 3-step action cards & ledger preview |
| **U03** | `screenshots/uploader/Screenshot 2026-09-30 013346.png` | My Audits Tab | `netadmin_uploader` | Session ownership and status filtering |
| **U04** | `screenshots/uploader/Screenshot 2026-09-30 013354.png` | Ingestion Intake Step 1 | `netadmin_uploader` | 5 vendor presets & drag-and-drop intake |
| **U05** | `screenshots/uploader/Screenshot 2026-09-30 013404.png` | Vendor Isolation Step 2 | `netadmin_uploader` | Syntactic heuristic AST auto-detection |
| **U06** | `screenshots/uploader/Screenshot 2026-09-30 013416.png` | Framework Scoping & Summary | `netadmin_uploader` | CIS Benchmark & DISA STIG mapping |
| **U07** | `screenshots/uploader/Screenshot 2026-09-30 013427.png` | Cryptographic Ledger Source | `netadmin_uploader` | SHA-256 config hashes in intake ledger |
| **U08** | `screenshots/uploader/Screenshot 2026-09-30 013434.png` | Audit Ledger & Reports | `netadmin_uploader` | Monotonic hash chain & Genesis block |
| **U09** | `screenshots/uploader/Screenshot 2026-09-30 013444.png` | Ledger Verification Complete | `netadmin_uploader` | Cryptographic validation: intact hash chain |
| **U10** | `screenshots/uploader/Screenshot 2026-09-30 013452.png` | Report Workspace | `netadmin_uploader` | 10 evaluated security controls matrix |
| **R01** | `screenshots/revieiwer/Screenshot 2026-09-30 014503.png` | Executive Posture Dashboard | `secops_reviewer` | Pass rate (46.9%) & triage counts |
| **R02** | `screenshots/revieiwer/Screenshot 2026-09-30 014516.png` | Progression & AI Syntax Queue | `secops_reviewer` | V1-V3 progression curve & AI mapping queue |
| **R03** | `screenshots/revieiwer/Screenshot 2026-09-30 014532.png` | Subsystem Integrity & Health | `secops_reviewer` | 0 KB air-gap egress & runtime checks |
| **R04** | `screenshots/revieiwer/Screenshot 2026-09-30 014539.png` | Sealed Compliance Reports | `secops_reviewer` | Tamper-evident sealed report registry |
| **R05** | `screenshots/revieiwer/Screenshot 2026-09-30 014545.png` | All Audits Registry | `secops_reviewer` | Full multi-session enterprise table (9 runs) |
| **R06** | `screenshots/revieiwer/Screenshot 2026-09-30 014556.png` | Reviewer Triage Queue | `secops_reviewer` | 46 actionable triage items overview |
| **R07** | `screenshots/revieiwer/Screenshot 2026-09-30 014604.png` | Canonical Audit Ledger | `secops_reviewer` | 3 canonical records verified in ledger |
| **R08** | `screenshots/revieiwer/Screenshot 2026-09-30 014610.png` | AI Model Manager Telemetry | `secops_reviewer` | Local Ollama daemon & memory headroom |
| **R09** | `screenshots/revieiwer/Screenshot 2026-09-30 014618.png` | Runtime Mode Switcher | `secops_reviewer` | AUTO / FAST (1.3B) / QUALITY (7.6B) modes |
| **R10** | `screenshots/revieiwer/Screenshot 2026-09-30 014625.png` | Workload Latency Guardrails | `secops_reviewer` | §4.2 SLA bounded latency matrix |
| **R11** | `screenshots/revieiwer/Screenshot 2026-09-30 014642.png` | Canonical Report Workspace | `secops_reviewer` | Multi-section report & export actions |
| **R12** | `screenshots/revieiwer/Screenshot 2026-09-30 014701.png` | PDF Verification & Export | `secops_reviewer` | Embedded PDF hash verification (`AUTHENTIC`) |
| **R13** | `screenshots/revieiwer/Screenshot 2026-09-30 014707.png` | Canonical Report Editor | `secops_reviewer` | Human commentary with immutable verdicts |

---

## Part 1: Network Administrator / Uploader Workflow

The `netadmin_uploader` persona manages device configuration uploads, automated syntactic vendor classification, framework execution, and personal session tracking.

### 1.1 Operator Authentication & Role Portal
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013321.png`
- **Security Clearance:** Level-3 Restricted Access • Air-Gapped Compliant
- **Description:** Central entrypoint providing PBKDF2-secured authentication with role presets for rapid access across `secops_reviewer` (Reviewer + Approver), `netadmin_uploader` (Uploader), and `auditor_viewer` (Viewer Read-Only).

![Operator Authentication & Role Portal](screenshots/uploader/Screenshot%202026-09-30%20013321.png)

---

### 1.2 Network Operations & Ingestion Console Dashboard
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013335.png`
- **Security Clearance:** Role: `netadmin_uploader` (UPLOADER)
- **Description:** Landing dashboard for the network administrator providing high-level operational modules: Ingestion & Upload (01), My Audits (02), and Reports & Verification (03), alongside a chronological summary of recent audit executions in the cryptographic ledger.

![Network Operations & Ingestion Console Dashboard](screenshots/uploader/Screenshot%202026-09-30%20013335.png)

---

### 1.3 My Audits Management Table
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013346.png`
- **Security Clearance:** Role: `netadmin_uploader`
- **Description:** Filterable table displaying audits uploaded by and assigned to the active user account. Tracks audit session IDs, associated device hostnames (`BRANCH-RTR-01`), timestamps, vendor platform, deterministic compliance scores, and workflow lifecycle status (`Submitted`).

![My Audits Management Table](screenshots/uploader/Screenshot%202026-09-30%20013346.png)

---

### 1.4 Intake Step 1: Configuration Source & Quick Presets
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013354.png`
- **Security Clearance:** Role: `netadmin_uploader` • Offline Sandbox Active
- **Description:** Step 1 of the configuration intake pipeline. Features 1-click canonical reference configuration presets for 5 major vendors (Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, Arista EOS, Palo Alto PAN-OS), drag-and-drop intake, raw file inspector, and staged payload metrics.

![Intake Step 1: Configuration Source](screenshots/uploader/Screenshot%202026-09-30%20013354.png)

---

### 1.5 Intake Step 2: Multi-Vendor Syntactic Heuristics
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013404.png`
- **Security Clearance:** Role: `netadmin_uploader` • Pure AST Sandbox
- **Description:** Multi-vendor isolation boundary selection. Demonstrates deterministic grammar matching and syntactic header sniffing that automatically infers device platform (e.g. `CISCO`) while preventing cross-vendor grammar leakage.

![Intake Step 2: Multi-Vendor Syntactic Heuristics](screenshots/uploader/Screenshot%202026-09-30%20013404.png)

---

### 1.6 Compliance Framework Scoping & Staged Execution
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013416.png`
- **Security Clearance:** Role: `netadmin_uploader` • Sandbox Ready
- **Description:** Specification of target regulatory compliance frameworks for evaluation against the Common Security Model (CSM). Shows selection of CIS Cisco IOS XE 17.x, Cisco Baseline Security Standard, and DISA STIG Cisco IOS XE with total control counts and staged execution trigger.

![Compliance Framework Scoping & Staged Execution](screenshots/uploader/Screenshot%202026-09-30%20013416.png)

---

### 1.7 Staged Audit Summary & Ingestion Ledger View
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013427.png`
- **Security Clearance:** Role: `netadmin_uploader`
- **Description:** Combined intake summary showing the staged payload parameters (`labeled_cisco_config.txt`, 1255 bytes, 45 lines) above the real-time Recent Audits Log backed by the cryptographic ledger source of truth.

![Staged Audit Summary & Ingestion Ledger View](screenshots/uploader/Screenshot%202026-09-30%20013427.png)

---

### 1.8 Cryptographic Audit Ledger & Reports Registry
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013434.png`
- **Security Clearance:** Module 5 · Non-Repudiation • Append-Only Registry
- **Description:** Cryptographic ledger displaying sequential compliance audit blocks starting with Genesis (`#01`). Details full cryptographic provenance chains: previous hash (`prev`), node hash, and raw configuration SHA-256 fingerprint.

![Cryptographic Audit Ledger & Reports Registry](screenshots/uploader/Screenshot%202026-09-30%20013434.png)

---

### 1.9 Cryptographic Ledger Verification (Integrity Validated)
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013444.png`
- **Security Clearance:** Module 5 · Non-Repudiation • `VALIDATED`
- **Description:** Result of executing "Verify Chain Integrity". The engine sequentially recalculates SHA-256 parent linkages across all ledger entries in `audit_log.jsonl`, confirming 100% mathematical integrity with zero tampering detected.

![Cryptographic Ledger Verification Complete](screenshots/uploader/Screenshot%202026-09-30%20013444.png)

---

### 1.10 Audit Compliance Report Workspace (Evaluated Controls Matrix)
- **Path:** `screenshots/uploader/Screenshot 2026-09-30 013452.png`
- **Security Clearance:** Role: `netadmin_uploader` • Legacy Record Inspection
- **Description:** Detailed modal view of an audited device (`EDGE-RTR-01`). Summarizes the compliance verdict (7 PASS, 2 FAIL, 1 UNKNOWN — 70.0% Pass Rate) and displays individual evaluation outcomes across core baseline rules (`CISCO-AAA-001`, `CISCO-NTP-001`, `CISCO-SNMP-001`, etc.).

![Audit Compliance Report Workspace](screenshots/uploader/Screenshot%202026-09-30%20013452.png)

---

## Part 2: Security Reviewer & Approver Console

The `secops_reviewer` persona holds Authorized Approver privileges (§19). This role manages human-in-the-loop AI syntax mappings, reviews non-compliant findings, inspects local hardware telemetry, and signs off on canonical reports.

### 2.1 Executive Compliance Posture Dashboard
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014503.png`
- **Security Clearance:** Role: `secops_reviewer` (Authorized Approver §19) • Authority: Deterministic Rule Engine
- **Description:** Top-level executive dashboard presenting the organization's cumulative compliance posture (46.9% pass rate across 32 checks, 15 compliant, 8 violations, 9 unresolved evidence) and action triage cards (failed rules, missing blocks, 29 pending AI proposals).

![Executive Compliance Posture Dashboard](screenshots/revieiwer/Screenshot%202026-09-30%20014503.png)

---

### 2.2 Submitted Audits Queue & Configuration Compliance Progression
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014516.png`
- **Security Clearance:** Role: `secops_reviewer` • AI Mode: AUTO
- **Description:** Reviewer workflow triage section. Displays audits submitted by uploaders awaiting approval, an interactive Configuration Compliance Progression line graph tracking device posture improvements across versions (V1 to V3: 63.64%), and pending AI syntax proposals (§3B).

![Submitted Audits Queue & Compliance Progression](screenshots/revieiwer/Screenshot%202026-09-30%20014516.png)

---

### 2.3 Subsystem Health, Air-Gap Containment & Regulatory Alignment
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014532.png`
- **Security Clearance:** Subsystem Integrity & Runtime Health
- **Description:** Live operational telemetry verifying:
  - **Backend API Engine:** Online (HTTP 200 Fast-Fail)
  - **Local AI Daemon:** Online (`127.0.0.1:11434`)
  - **Air-Gap Egress Containment:** Strict `0 KB (Strict Localhost)`
  - **Regulatory Alignment:** CIS Benchmark, DISA-STIG, and NIST SP 800-53 Rev 5 cross-mapping.

![Subsystem Health & Regulatory Alignment](screenshots/revieiwer/Screenshot%202026-09-30%20014532.png)

---

### 2.4 Certified Tamper-Evident Compliance Reports Registry
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014539.png`
- **Security Clearance:** Certified Tamper-Evident Compliance Reports
- **Description:** Registry of cryptographically sealed compliance reports generated by the engine. Each entry features an immutable reference ID, device hostname, certification timestamp, and a `Cryptographically Sealed` assurance badge.

![Certified Tamper-Evident Compliance Reports Registry](screenshots/revieiwer/Screenshot%202026-09-30%20014539.png)

---

### 2.5 Enterprise Multi-Session Audit Registry (All Audits)
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014545.png`
- **Security Clearance:** Role: `secops_reviewer` • Full Enterprise Visibility
- **Description:** Master audit registry displaying all 9 audit executions across devices (`EDGE-RTR-01`, `BRANCH-RTR-01`, `RTR-1`), uploaders, vendors, pass/fail metrics, and multi-stage workflow statuses (`Finalized`, `Submitted`, `In Progress`).

![Enterprise Multi-Session Audit Registry](screenshots/revieiwer/Screenshot%202026-09-30%20014545.png)

---

### 2.6 Reviewer Operational Triage & Action Items
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014556.png`
- **Security Clearance:** Role: `secops_reviewer` (Approver)
- **Description:** Reviewer action center highlighting 46 total actionable items: active non-compliant violations requiring remediation planning, unmapped syntax proposals awaiting human approval, and pending audit reviews.

![Reviewer Operational Triage](screenshots/revieiwer/Screenshot%202026-09-30%20014556.png)

---

### 2.7 Cryptographic Audit Ledger (Canonical Record Chain)
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014604.png`
- **Security Clearance:** Module 5 · Non-Repudiation • 3 Canonical Records
- **Description:** Reviewer view of the SHA-256 append-only ledger where all 3 recorded entries have attained `CANONICAL` status. Confirms permanent non-repudiation, tamper-evidence, and complete lineage tracking.

![Cryptographic Audit Ledger Canonical Records](screenshots/revieiwer/Screenshot%202026-09-30%20014604.png)

---

### 2.8 System Controls: AI Model Manager & Hardware Runtime
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014610.png`
- **Security Clearance:** SOC Subsystem 06 • Administrative Console
- **Description:** Hardware-aware local LLM management console. Validates loopback binding (`http://127.0.0.1:11434`), strict 0 KB egress air-gap enforcement, host RAM allocation (3.0 GB available / 15.7 GB total), CPU execution acceleration, and active model `llama3.2:1b`.

![AI Model Manager & Hardware Runtime](screenshots/revieiwer/Screenshot%202026-09-30%20014610.png)

---

### 2.9 Runtime Operational Mode Switcher (AUTO / FAST / QUALITY)
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014618.png`
- **Security Clearance:** Governance Gate: Authorized Approver Active
- **Description:** Dynamic mode switcher enabling approvers to select between operational tiers:
  - **AUTO (Adaptive):** Workload-aware routing between 1.3B and 7B models.
  - **FAST (1.3B):** Pins inference to `llama3.2:1b` (~1.5GB RAM, ~6s response) for resource-constrained edge appliances.
  - **QUALITY (7.6B):** Routes to `qwen2.5:7b-instruct` (>8GB RAM) for complex remediation conflict reasoning.
  - **MANUAL OVERRIDE:** Air-gapped cryptographic allowlist pinning.

![Runtime Operational Mode Switcher](screenshots/revieiwer/Screenshot%202026-09-30%20014618.png)

---

### 2.10 Workload Routing & Latency Guardrail Matrix (§4.2)
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014625.png`
- **Security Clearance:** Architecture Spec §4.2 • Host Hardware Diagnostics
- **Description:** Enforces bounded SLAs and authority levels across subsystems:
  - **Unmapped Line Mapping:** `llama3.2:1b` (1.3B), 60s bounded timeout, ~6.2s latency, Advisory Only (Human Gate).
  - **Remediation Conflict Reasoning:** `qwen2.5:7b-instruct` (7.6B), 180s bounded timeout, ~42.3s latency, Explanation Only.
  - **Deterministic Engine:** Zero-AI AST, immediate (<10ms) latency, 100% Authoritative.
  - **Hardware Probe:** CPU AVX2 quantization, <2ms IPC loopback, 0 KB network egress.

![Workload Routing & Latency Guardrail Matrix](screenshots/revieiwer/Screenshot%202026-09-30%20014625.png)

---

### 2.11 Canonical Report Workspace & Multi-Format Export
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014642.png`
- **Security Clearance:** Role: `secops_reviewer` • Canonical Report View
- **Description:** Full canonical report modal for device `EDGE-RTR-01`. Provides multi-format export buttons (PDF, DOCX), digital certificate verification, and structured report sections including Executive Summary, Auditor Observations, and Recommendations.

![Canonical Report Workspace](screenshots/revieiwer/Screenshot%202026-09-30%20014642.png)

---

### 2.12 Cryptographic PDF Signature Verification (`AUTHENTIC`)
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014701.png`
- **Security Clearance:** Module 5 · Non-Repudiation • `AUTHENTIC` Badge
- **Description:** Demonstrates cryptographic verification of an exported PDF certificate. The verification engine confirms that the embedded document hash (`06bde9c4dd8a257...`) mathematically matches the immutable audit ledger sequence entry.

![Cryptographic PDF Signature Verification](screenshots/revieiwer/Screenshot%202026-09-30%20014701.png)

---

### 2.13 Canonical Report Editor with Immutable Deterministic Guardrails
- **Path:** `screenshots/revieiwer/Screenshot 2026-09-30 014707.png`
- **Security Clearance:** Authorized Approver (§19) • Immutable Guardrail Active
- **Description:** Interactive commentary editor for canonical reports. Allows reviewers to add context-specific notes and findings while enforcing the fundamental architectural security constraint: *deterministic compliance engine verdicts (PASS / FAIL / UNKNOWN), raw CLI configurations, cryptographic hashes, and framework scopes are mathematically immutable and protected against manual modification*.

![Canonical Report Editor with Immutable Guardrails](screenshots/revieiwer/Screenshot%202026-09-30%20014707.png)

---

## Architectural Mapping Matrix

| Architectural Module | Primary Capabilities | Relevant Screenshots |
|----------------------|----------------------|----------------------|
| **Module 1: Ingestion & Parsing** | Syntactic header sniffing, AST generation, vendor isolation | U04, U05, U06, U07 |
| **Module 2: Deterministic Compliance** | CIS Benchmark, DISA STIG, NIST SP 800-53 evaluation | U06, U10, R03 |
| **Module 3: AI Assistance & Suggestion** | Hardware-aware routing, DistilBERT/LLM line mapping, human approval gate | R01, R02, R06, R08, R09, R10 |
| **Module 4: Remediation Engine** | Jinja2 CLI template generation, conflict analysis | R02, R10, R13 |
| **Module 5: Tamper-Evident Ledger** | SHA-256 hash chaining, cryptographic verification, non-repudiation | U07, U08, U09, R04, R07, R12 |
| **Module 6: Canonical Reporting** | PDF/DOCX dual generation, QR verification, immutable verdicts | U10, R04, R11, R12, R13 |
| **RBAC & Governance** | Multi-role clearance, §19 approver gate, air-gap zero egress | U01, U02, U03, R01, R03, R05, R08, R09 |
