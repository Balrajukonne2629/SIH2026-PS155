# NTRO PS26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor

An offline, air-gapped, multi-vendor network security compliance auditing engine featuring deterministic rule evaluation (CIS Benchmarks, DISA STIG, NIST SP 800-53), human-in-the-loop AI assistance, cryptographic SHA-256 audit chaining, non-repudiation verification, and canonical multi-framework reporting.

> 🌐 **Live Evaluator Presentation Portal:** [https://balrajukonne2629.github.io/SIH2026-PS155/](https://balrajukonne2629.github.io/SIH2026-PS155/)  
> 📸 **Operational UI Screenshots & Walkthrough:** [screenshots.md](screenshots.md)

---

## Canonical Repository Structure

```
.
├── src/                        # Canonical backend application source code
│   ├── __init__.py
│   ├── ai_model_manager.py     # Local LLM hardware detection and routing
│   ├── ai_suggester.py         # DistilBERT unmapped configuration interpreter
│   ├── ast_safety.py           # AST import & execution safety validator
│   ├── audit_log.py            # Tamper-evident SHA-256 hash-chained audit ledger
│   ├── audit_report.py         # Canonical domain model for multi-framework reports
│   ├── auth.py                 # JWT authentication & PBKDF2 credential management
│   ├── cis_benchmark_cisco_iosxe.py # CIS Cisco IOS-XE Benchmark Evaluator
│   ├── cisco_auditor.py        # Cisco IOS-XE parser and deterministic engine
│   ├── compliance_aggregator.py # Multi-framework aggregation and deduplication
│   ├── compliance_framework.py # Abstract framework definitions and registry
│   ├── database.py             # SQLite persistence, migrations, and transactions
│   ├── disa_stig_cisco_iosxe.py# DISA STIG Cisco IOS-XE Evaluator
│   ├── juniper_auditor.py      # Juniper Junos hierarchical parser & evaluator
│   ├── main.py                 # FastAPI REST API endpoints and application
│   ├── remediation_engine.py   # Jinja2 CLI remediation templates & conflict check
│   ├── report_exporter.py      # PDF and DOCX export generation engine
│   ├── report_generator.py     # Legacy PDF certificate generator with QR codes
│   ├── vendor_adapter.py       # Vendor adapter interface (Cisco, Juniper)
│   └── vendor_registry.py      # Dynamic plug-and-play vendor registry
├── landing-page/               # Standalone Evaluator-Facing Product Landing Page (Port 3001)
│   ├── src/                    # Landing page presentation components and data
│   ├── public/                 # Static assets, diagrams, interactive iframe blueprints
│   ├── package.json            # Scripts: dev, build, preview
│   └── vite.config.ts
├── frontend/                   # Canonical operational frontend console (Port 3000)
│   ├── src/                    # Screens, components, contexts, and API client
│   ├── tests/                  # Frontend unit and contract test suites
│   ├── package.json            # Scripts: dev, build, preview, test
│   └── vite.config.ts
├── tests/                      # Automated test suites (34 test files, 700+ backend tests)
│   ├── conftest.py             # Pytest session setup and module identity bridge
│   ├── test_api_compliance.py  # REST API compliance endpoints verification
│   ├── test_api_full_loop.py   # 11-stage API full-loop parity test
│   ├── test_step5_full_loop.py # 17-stage PRD Step 5 deterministic loop verification
│   ├── test_ast_safety.py      # Static AST import security analysis
│   └── ...                     # Vendor, auth, RBAC, lifecycle, export suites
├── tools/                      # Standalone operational tools and benchmarks
│   └── test_ollama_integration.py # Standalone local LLM offline benchmark tool
├── config/                     # Configuration schemas and rule mappings
│   └── Rule_Library/           # Normalized schemas and vendor rule mappings
├── data/                       # Local SQLite DB, exports, and persistent states
│   ├── auditor.db              # SQLite compliance database
│   ├── pending_suggestions.json# Staged AI mapping suggestions queue
│   ├── trusted_mappings.json   # Approved human-in-the-loop rule mappings
│   └── exports/                # Exported report documents (PDF / DOCX)
├── datasets/                   # Sample device configuration datasets
│   ├── Arista/                 # Arista EOS configurations
│   ├── Cisco/                  # Cisco IOS-XE configurations
│   └── Juniper/                # Juniper Junos configurations
├── docs/                       # Project specifications and architectural records
│   ├── SYSTEM_ARCHITECTURE.md  # Comprehensive system architecture & deck guide
│   ├── decisions/              # Architecture Decision Records (ADR-001 to ADR-007)
│   ├── NTRO_PS26155_PRD_v4_Addendum.md # Authoritative PRD Addendum
│   ├── MULTI_FRAMEWORK_COMPLIANCE_ARCHITECTURE.md
│   └── ...
├── references/                 # Upstream compliance standards and research
├── reports/                    # Historical verification and audit milestone reports
├── artifacts/                  # Visual checks and architectural diagrams
├── templates/                  # Jinja2 remediation templates
├── main.py                     # Root entrypoint wrapper (`uvicorn main:app`)
├── pytest.ini                  # Pytest configuration
├── Dockerfile                  # Container definition for backend
├── docker-compose.yml          # Full-stack composition (backend, frontend, ollama)
└── requirements.txt            # Python dependencies
```

---

## Quickstart & Evaluation Workflow

### 1. Evaluator Presentation Landing Page (Port 3001)

- **Live Evaluator URL:** [https://balrajukonne2629.github.io/SIH2026-PS155/](https://balrajukonne2629.github.io/SIH2026-PS155/)
- **Local Dev URL:** `http://localhost:3001`

**Main Purpose & Use of the Landing Page:**
- **Zero-Install Evaluator Access:** Evaluators and jury members can immediately inspect the system architecture, empirical benchmarks, and product demonstrations directly in any modern browser without configuring local Python, Ollama, or Node environments.
- **Interactive 4-Tier System Architecture & Visual Pipeline:** Pan, zoom, and drill down into the 7-stage deterministic auditing pipeline, vendor isolation boundaries, and AST safety models.
- **Empirical Benchmarks & Cryptographic Tamper Simulator:** Review verified hardware-aware latency metrics (<60s SLAs, 100% deterministic AST rules) and test cryptographic SHA-256 hash-chain integrity verification in real-time.
- **Multi-Vendor & Multi-Framework Catalogs:** Explore supported vendor grammars (Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, Arista EOS, Palo Alto PAN-OS) and compliance standards (CIS Benchmarks, DISA STIG, NIST SP 800-53 Rev 5).
- **Air-Gapped Offline Demo Download & Documentation:** Direct access to download the self-contained offline deployment package (`NTRO-PS26155-OFFLINE-DEMO-v1.0.zip`), video walkthroughs, and technical documentation.

To run the landing page locally:
```bash
cd landing-page
npm install
npm run dev
# Running on http://localhost:3001
```

### 2. Operational Backend Service (Port 8000)
Run the zero-telemetry FastAPI compliance engine:
```bash
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
# API Swagger Docs available at http://localhost:8000/docs
```

### 3. Operational Frontend Auditor Console (Port 3000)
Launch the primary operator console for multi-vendor audits and human-in-the-loop reviews:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

### 4. Running Automated Tests (780+ Total Tests)
Run the complete backend test suite (700+ tests verifying AST safety, cryptographic hash-chaining, RBAC, and multi-framework evaluation):
```bash
pytest
```

Run specific core verification loops:
```bash
# PRD Step 5 17-Stage CLI Full-Loop & Tamper Test
python tests/test_step5_full_loop.py

# FastAPI 11-Stage Full-Loop Parity & AST Safety Verification
python tests/test_api_full_loop.py

# Operational Frontend Test Suite (96 tests passing in 686ms)
cd frontend && npm test

# Landing Page Production Build & Verification
cd landing-page && npm run build
```
