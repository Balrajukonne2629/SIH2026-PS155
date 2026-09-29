// NTRO PS26155 — Canonical Documentation Hub Links & Resource Catalog
// Direct mappings to authoritative project specifications and artifacts

export interface DocumentationResource {
  id: string;
  category: "Architecture" | "Decisions" | "Specifications" | "Codebase" | "Evaluation";
  title: string;
  subtitle: string;
  format: "HTML / Interactive" | "Markdown" | "Vector SVG" | "JSON / Schema" | "Binary / Script";
  status: "Authoritative" | "Accepted Decision" | "Interactive Viewer" | "Distribution";
  path: string;
  targetBlank?: boolean;
  description: string;
  primaryActionLabel: string;
  primaryActionUrl: string;
}

export const DOCUMENTATION_RESOURCES: DocumentationResource[] = [
  // --- ARCHITECTURE ---
  {
    id: "v7-interactive-arch",
    category: "Architecture",
    title: "Master System Architecture (Interactive)",
    subtitle: "Standalone Archify SVG Visualizer with 3 Switchable Views",
    format: "HTML / Interactive",
    status: "Interactive Viewer",
    path: "docs/v7_system_architecture.html",
    targetBlank: true,
    description: "Features 3 interactive views: Deterministic Pipeline, Human-in-the-Loop AI Advisory Loop, and Audit Integrity. Supports Dark/Light themes, trace motion, and SVG export.",
    primaryActionLabel: "Launch Interactive Architecture",
    primaryActionUrl: "./interactive/v7_system_architecture.html"
  },
  {
    id: "arch-2pager",
    category: "Architecture",
    title: "2-Page Visual Architecture Brief",
    subtitle: "Executive Architecture Summary for Jury Review",
    format: "Markdown",
    status: "Authoritative",
    path: "docs/ARCHITECTURE_2PAGER.md",
    description: "Executive summary detailing the three foundational pillars, sub-millisecond evaluation latency, AST safety invariants, and the 7-layer pipeline specification.",
    primaryActionLabel: "View 2-Pager Specification",
    primaryActionUrl: "../docs/ARCHITECTURE_2PAGER.md"
  },
  {
    id: "arch-16-9-svg",
    category: "Architecture",
    title: "16:9 Presentation Vector Blueprint",
    subtitle: "High-DPI Widescreen System Flowchart",
    format: "Vector SVG",
    status: "Authoritative",
    path: "docs/ARCHITECTURE_DIAGRAM_16_9.svg",
    targetBlank: true,
    description: "Scalable vector diagram detailing every internal boundary from unified ingestion through CSM normalization, framework evaluation, and SHA-256 ledger chaining.",
    primaryActionLabel: "Open 16:9 Vector SVG",
    primaryActionUrl: "./diagrams/ARCHITECTURE_DIAGRAM_16_9.svg"
  },
  {
    id: "arch-9-16-svg",
    category: "Architecture",
    title: "9:16 Vertical Mobile Architecture Diagram",
    subtitle: "Vertical Layout for Mobile Devices & Display Terminals",
    format: "Vector SVG",
    status: "Authoritative",
    path: "docs/short_architecture_diagram_9_16.svg",
    targetBlank: true,
    description: "Optimized vertical representation of the compliance pipeline tailored for mobile viewports, tablet reading, and vertical displays.",
    primaryActionLabel: "Open 9:16 Vector SVG",
    primaryActionUrl: "./diagrams/short_architecture_diagram_9_16.svg"
  },

  // --- DECISIONS (ADRs) ---
  {
    id: "adr-001",
    category: "Decisions",
    title: "ADR-001: Deterministic Engine Decoupling",
    subtitle: "Zero Generative AI Hallucination in Auditing",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-001-deterministic-compliance-decoupled-from-ai.md",
    description: "Mandates that compliance verdicts are strictly 100% deterministic Python rule evaluations on normalized CSM state; LLMs are confined strictly to advisory suggestions.",
    primaryActionLabel: "Read ADR-001",
    primaryActionUrl: "../docs/decisions/ADR-001-deterministic-compliance-decoupled-from-ai.md"
  },
  {
    id: "adr-002",
    category: "Decisions",
    title: "ADR-002: Common Security Model (CSM)",
    subtitle: "Multi-Vendor Abstraction Layer",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-002-common-security-model-vendor-abstraction.md",
    description: "Establishes the vendor-neutral JSON schema and plug-and-play VendorAdapter/VendorRegistry interfaces, preventing M x N rule explosion.",
    primaryActionLabel: "Read ADR-002",
    primaryActionUrl: "../docs/decisions/ADR-002-common-security-model-vendor-abstraction.md"
  },
  {
    id: "adr-003",
    category: "Decisions",
    title: "ADR-003: HITL AI Disambiguation Queue",
    subtitle: "Human Review Gate for Unmapped Directives",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-003-human-in-the-loop-ai-unmapped-pipeline.md",
    description: "Unmapped CLI lines stage to pending_suggestions.json via local SLM; authorized human reviewer approval is strictly required before promotion to trusted_mappings.json.",
    primaryActionLabel: "Read ADR-003",
    primaryActionUrl: "../docs/decisions/ADR-003-human-in-the-loop-ai-unmapped-pipeline.md"
  },
  {
    id: "adr-004",
    category: "Decisions",
    title: "ADR-004: SHA-256 Cryptographic Audit Ledger",
    subtitle: "Monotonically Chained Non-Repudiation Engine",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-004-sha256-hash-chained-audit-ledger.md",
    description: "Establishes a pure Python append-only cryptographic ledger storing SHA-256 chained blocks in SQLite, enabling instant bit-level tamper detection.",
    primaryActionLabel: "Read ADR-004",
    primaryActionUrl: "../docs/decisions/ADR-004-sha256-hash-chained-audit-ledger.md"
  },
  {
    id: "adr-005",
    category: "Decisions",
    title: "ADR-005: Air-Gapped AST Sandboxing",
    subtitle: "Strict Zero-Cloud Egress Invariant",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-005-air-gapped-local-execution-and-ast-sandboxing.md",
    description: "Prohibits all remote network calls, subprocesses, and dynamic exec across compliance evaluators. Validates modules via static AST analysis at startup.",
    primaryActionLabel: "Read ADR-005",
    primaryActionUrl: "../docs/decisions/ADR-005-air-gapped-local-execution-and-ast-sandboxing.md"
  },
  {
    id: "adr-006",
    category: "Decisions",
    title: "ADR-006: PRD v7 Unified Architecture",
    subtitle: "Remediation Registry & Crosswalk Evaluator",
    format: "Markdown",
    status: "Accepted Decision",
    path: "docs/decisions/ADR-006-prd-v7-unified-architecture-remediation-crosswalk.md",
    description: "Unifies remediation under a centralized Jinja template registry, formalizes NIST/ISO crosswalk evaluation, and introduces device identity extraction.",
    primaryActionLabel: "Read ADR-006",
    primaryActionUrl: "../docs/decisions/ADR-006-prd-v7-unified-architecture-remediation-crosswalk.md"
  },

  // --- SPECIFICATIONS ---
  {
    id: "prd-v7",
    category: "Specifications",
    title: "NTRO PS26155 Master PRD (v7.0)",
    subtitle: "Authoritative Engineering Product Requirements",
    format: "Markdown",
    status: "Authoritative",
    path: "docs/NTRO_PS26155_PRD_v7_Current_Plan.md",
    description: "Comprehensive product specifications detailing the Common Security Model, framework mappings, RBAC capabilities, and verification criteria.",
    primaryActionLabel: "View Master PRD v7",
    primaryActionUrl: "../docs/NTRO_PS26155_PRD_v7_Current_Plan.md"
  },
  {
    id: "mentor-review",
    category: "Specifications",
    title: "Comprehensive Mentor Review Document",
    subtitle: "Jury Presentation & Architectural Synthesis",
    format: "Markdown",
    status: "Authoritative",
    path: "docs/MENTOR_REVIEW_DOCUMENT.md",
    description: "Detailed operational review document explaining why deterministic compliance is mandatory for critical infrastructure, referencing all 5 initial ADRs.",
    primaryActionLabel: "Read Mentor Review Dossier",
    primaryActionUrl: "../docs/MENTOR_REVIEW_DOCUMENT.md"
  },

  // --- CODEBASE & EVIDENCE ---
  {
    id: "graphify-explorer",
    category: "Codebase",
    title: "Codebase Knowledge Graph Explorer",
    subtitle: "Interactive Force-Directed 6,364-Node Graph",
    format: "HTML / Interactive",
    status: "Interactive Viewer",
    path: "graphify-out/graph.html",
    targetBlank: true,
    description: "Visualizes the complete dependency topology across 283 repository files, mathematically proving zero cyclic imports and strict AST boundary isolation.",
    primaryActionLabel: "Explore Knowledge Graph",
    primaryActionUrl: "./interactive/graph.html"
  },
  {
    id: "constraints",
    category: "Codebase",
    title: "Project Quality Bar & Non-Negotiable Constraints",
    subtitle: "Constraint-Driven Development Contract",
    format: "Markdown",
    status: "Authoritative",
    path: "CONSTRAINTS.md",
    description: "Immutable contract prohibiting data tampering, synthetic test fabrication, lowered thresholds, and unauthorized database schema modifications.",
    primaryActionLabel: "Inspect Quality Constraints",
    primaryActionUrl: "../CONSTRAINTS.md"
  },

  // --- EVALUATION ---
  {
    id: "offline-demo-readme",
    category: "Evaluation",
    title: "Offline Demo Walkthrough & Runbook",
    subtitle: "Air-Gapped Evaluator Setup Guide",
    format: "Markdown",
    status: "Authoritative",
    path: "NTRO-PS26155-OFFLINE-DEMO/README.md",
    description: "Step-by-step instructions for unzipping the 8.47 GB offline demo package, running START.bat, testing RBAC credentials, and validating offline compliance.",
    primaryActionLabel: "Read Offline Demo Runbook",
    primaryActionUrl: "../NTRO-PS26155-OFFLINE-DEMO/README.md"
  },
  {
    id: "sha256-checksum",
    category: "Evaluation",
    title: "Cryptographic SHA-256 Checksum",
    subtitle: "Cryptographic Verification for 8.47 GB Archive",
    format: "Binary / Script",
    status: "Distribution",
    path: "NTRO-PS26155-OFFLINE-DEMO-v1.0.sha256",
    description: "Official hash file confirming bit-for-bit integrity of the offline evaluation package: 34eef192b0c13bbd8fffe968ce1204d557f932eecf130e527a296eebeaa28a5d.",
    primaryActionLabel: "View SHA-256 Hash",
    primaryActionUrl: "./NTRO-PS26155-OFFLINE-DEMO-v1.0.sha256"
  }
];
