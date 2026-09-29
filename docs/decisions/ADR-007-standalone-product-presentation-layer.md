# ADR-007: Standalone Evaluator-Facing Product Landing Page

## Status
**Accepted**

## Date
2026-09-29

## Context
As the NTRO PS26155 project ("AI-Driven Multi-Vendor Network Security Compliance Auditor") progressed towards evaluation at the Smart India Hackathon (SIH) 2026, an evaluator-facing presentation and documentation portal was required. Evaluators and jury members require immediate access to:
1. High-level executive briefing and architectural narrative.
2. Verified empirical benchmarks (sub-millisecond evaluation latency, 780+ passing test suites, 8 frameworks, 69 controls).
3. Interactive system architecture diagrams (PRD v7.0 master diagram with responsive dark/light theme switching).
4. Direct verification tools, including live SHA-256 tamper simulation, hash validation commands, and air-gapped demo credentials.
5. Structured access to technical documentation (ADRs, PRDs, specifications) and operational application launchers.

However, embedding marketing, landing, or high-level presentation logic directly into the operational application (`/src` backend or `/frontend` operator console) introduces significant risks:
- Risk of bloating the operational air-gapped container image.
- Risk of architectural coupling between presentation marketing content and strict compliance auditing engines.
- Risk of accidentally modifying operational contracts, state machines, or RBAC controls.

## Decision
We establish a **Standalone Product Presentation Layer** in a completely isolated directory (`/landing-page`).

Key principles of this decision:
1. **Complete Architectural Isolation**:
   - The landing page is built as an independent Vite + React + TypeScript + Tailwind application.
   - It maintains its own `package.json`, `tsconfig.json`, and static assets.
   - It runs on dedicated port **3001** (or static file preview), avoiding any collision with the operational frontend (Port 3000) or FastAPI backend (Port 8000).

2. **Zero Modification to Core Compliance Code**:
   - No files in `/src`, `/frontend`, or `/tests` were modified or coupled to the presentation app.
   - The operational database (`data/auditor.db`) and persistent state files remain 100% untouched.

3. **Strict Zero-Fabrication Quantitative Policy**:
   - All numbers displayed on the landing page (780+ tests, ~0.33ms latency, 69 controls, 4 vendors, 6,364 graph nodes, 8.47 GB package size, exact SHA-256 hash) are derived directly from live repository evidence and benchmark logs.
   - Vendor maturity is explicitly segmented: Production-ready parsers (Cisco, Juniper) vs registered architectural adapters (Arista, Fortinet).

4. **Self-Contained Evaluation Artifacts**:
   - High-fidelity interactive diagrams (`v7_system_architecture.html`, `graph.html`) and responsive vector diagrams (16:9 widescreen and 9:16 mobile) are packaged within `landing-page/public/` for standalone viewing.

## Consequences

### Positive
- **Integrity Protection**: The operational compliance auditor codebase remains completely clean, sovereign, and focused on deterministic compliance evaluation.
- **Evaluator Usability**: Evaluators can run and explore the landing page independently without launching Docker containers or initializing SQLite databases.
- **Port Clarity**: Clear separation of responsibilities across ports (3001 Presentation, 3000 Auditor Console, 8000 REST API).
- **Fast Production Builds**: The landing page compiles cleanly to static HTML/JS/CSS (`dist/`) in seconds with zero runtime dependencies.

### Negative / Trade-offs
- Slight duplication of static diagram assets (`docs/` vector SVGs copied into `landing-page/public/diagrams/`).
- Requires maintaining quantitative sync if new tests or rules are added in future iterations.
