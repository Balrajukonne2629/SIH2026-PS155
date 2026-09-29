// NTRO PS26155 — The 7-Layer Decoupled Compliance Pipeline
// Derived from SYSTEM_ARCHITECTURE.md and MENTOR_REVIEW_DOCUMENT.md

export interface PipelineStep {
  stepNumber: number;
  id: string;
  name: string;
  category: "Ingestion" | "Normalization" | "Compliance" | "Governance" | "Remediation" | "Ledger" | "Export";
  summary: string;
  technicalDetails: string[];
  securityInvariant: string;
  input: string;
  output: string;
  adrReference?: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    stepNumber: 1,
    id: "ingestion",
    name: "Unified Ingestion & Vendor Detection",
    category: "Ingestion",
    summary: "Accepts raw configuration files (single, batch, or ZIP), statically guards against code injection, and detects the target vendor architecture.",
    technicalDetails: [
      "AST safety sandbox verifies zero subprocess, socket, or network execution imports",
      "Fail-closed vendor detection inspects structural syntax signatures",
      "Resolves vendor adapter (Cisco, Juniper, Arista, Fortinet) without hardcoded branching"
    ],
    securityInvariant: "Zero arbitrary execution imports allowed (ast_safety.py enforced)",
    input: "Raw config text (.cfg / .conf / .txt / .zip)",
    output: "Validated configuration stream & matched VendorAdapter instance",
    adrReference: "ADR-002 & ADR-005"
  },
  {
    stepNumber: 2,
    id: "normalization",
    name: "Vendor Parser & CSM Normalization",
    category: "Normalization",
    summary: "Transforms vendor-specific CLI trees and hierarchical blocks into the vendor-neutral Common Security Model (CSM v7 JSON Schema).",
    technicalDetails: [
      "Hierarchical parser normalizes interfaces, global services, AAA, logging, NTP, and ACLs",
      "Device identity extractor parses serial, model, hardware, and OS version metadata",
      "Isolates unmapped or unrecognized vendor syntax into csm['unmapped_lines'] without failing the parse"
    ],
    securityInvariant: "Separation of unmapped syntax ensures zero lossy coercion of unfamiliar lines",
    input: "Vendor-specific CLI syntax",
    output: "Normalized Common Security Model (CSM JSON) + Unmapped Lines queue",
    adrReference: "ADR-002"
  },
  {
    stepNumber: 3,
    id: "compliance",
    name: "Deterministic Compliance Engine",
    category: "Compliance",
    summary: "Evaluates normalized CSM fields against authoritative benchmarks (CIS, DISA-STIG, NIST SP 800-53, ISO 27001) using pure Python logic.",
    technicalDetails: [
      "FrameworkRegistry dispatches CSM to CIS Benchmark (v2.2.1) & DISA-STIG (V3R7) evaluators",
      "Evaluates deterministic boolean, integer, and list conditions (sub-millisecond latency)",
      "Strict verdict boundaries: PASS, FAIL, or UNKNOWN (UNKNOWN never defaults to FAIL or PASS)",
      "MultiFrameworkAggregator consolidates multi-framework findings with zero duplicate audit fatigue"
    ],
    securityInvariant: "AI NEVER decides compliance status. 100% deterministic reproducibility across runs",
    input: "Normalized CSM dictionary & active rule sets",
    output: "Authoritative EvaluationResult stream with structured evidence (PASS / FAIL / UNKNOWN)",
    adrReference: "ADR-001"
  },
  {
    stepNumber: 4,
    id: "governance",
    name: "Advisory Local AI & Human Review Gate",
    category: "Governance",
    summary: "Routes unmapped configuration directives to local air-gapped models for semantic interpretation, requiring human reviewer sign-off before persistence.",
    technicalDetails: [
      "DistilBERT embedding matches unmapped CLI lines to nearest CSM candidate fields",
      "Local SLM (Llama 3.2 1B via Ollama loopback) drafts plain-language rationales and confidence scores",
      "Staged in data/pending_suggestions.json for inspection by authorized Security Reviewer",
      "Approved or corrected mappings are promoted to data/trusted_mappings.json for future audits"
    ],
    securityInvariant: "Zero autonomous database writes by AI; human reviewer cryptographic identity bound to approved rules",
    input: "Unmapped syntax lines (e.g., service call-home)",
    output: "Reviewer-approved trusted mapping promoted to active rule catalog",
    adrReference: "ADR-003"
  },
  {
    stepNumber: 5,
    id: "remediation",
    name: "Safe Remediation & Static Conflict Analysis",
    category: "Remediation",
    summary: "Generates parameterized CLI fix templates for non-compliant controls while statically checking for conflicting directives.",
    technicalDetails: [
      "Jinja2 CLI template registry compiles vendor-specific fix commands for failed controls",
      "Static conflict detection checks for mutual command contradictions, redundant statements, and shadowing",
      "Display-only preview policy: Zero live device execution over SSH/Telnet"
    ],
    securityInvariant: "Display-only CLI preview guarantee: System never touches a live device automatically",
    input: "Failed controls & normalized CSM state",
    output: "Conflict-checked, parameterized CLI remediation scripts with copy/export actions",
    adrReference: "ADR-006"
  },
  {
    stepNumber: 6,
    id: "ledger",
    name: "Cryptographic SHA-256 Audit Ledger",
    category: "Ledger",
    summary: "Commits immutable audit blocks into a monotonically chained SHA-256 ledger in SQLite, guaranteeing mathematical non-repudiation.",
    technicalDetails: [
      "Block hash H(n) = SHA256(H(n-1) || AuditID || Timestamp || PayloadHash)",
      "Append-only ledger engine in audit_log.py with sequential cryptographic validation",
      "/api/audit-log/verify performs bit-level tamper detection across all historical blocks"
    ],
    securityInvariant: "Continuous hash chain prevents silent database manipulation or deleted audit records",
    input: "Finalized audit outcome, operator identity, and timestamp",
    output: "Monotonically chained cryptographic ledger block with verifiable SHA-256 digest",
    adrReference: "ADR-004"
  },
  {
    stepNumber: 7,
    id: "export",
    name: "Canonical Reporting & Sovereign Deliverables",
    category: "Export",
    summary: "Generates canonical multi-framework audit reports, tamper-evident PDF certificates with vector verification QR codes, and DOCX dossiers.",
    technicalDetails: [
      "Single canonical JSON domain model represents audit truth across all export formats",
      "Auditable human commentary fields (Executive Summary, Auditor Notes) track editor JWT and timestamp",
      "Vector QR code embeds audit ID, SHA-256 block hash, and cryptographic verification link"
    ],
    securityInvariant: "Immutable audit facts (verdicts, evidence, hashes) cannot be altered by human edits",
    input: "Canonical AuditReport domain object",
    output: "Verifiable PDF compliance certificates & DOCX evaluation dossiers",
    adrReference: "ADR-006"
  }
];
