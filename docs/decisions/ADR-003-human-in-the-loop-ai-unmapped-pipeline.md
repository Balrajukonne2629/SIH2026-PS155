# ADR-003: Human-in-the-Loop AI Disambiguation Queue for Unmapped Configuration Directives

## Status
Accepted

## Date
2026-09-24

## Context
When parsing enterprise network device configurations, parsing engines frequently encounter lines that do not match existing parser rules or CSM schemas. These "unmapped lines" occur due to:
- Proprietary vendor extensions (e.g. `service call-home`, proprietary telemetry).
- Emerging syntax in newer network OS versions.
- Customized site-specific administrative macros.

Simply ignoring unmapped lines creates a dangerous security blind spot (unmapped directives might disable critical security controls). However, allowing AI to automatically convert unmapped lines into live compliance rules risks introducing untested, erroneous, or hallucinated rules into production scanners.

## Decision
We establish a staged, **Human-in-the-Loop (HITL) AI Disambiguation Workflow**:

```
Unmapped CLI Line (from Parser)
              │
              ▼
Local AI Model Manager (DistilBERT / Local SLM)
              │
              ▼ Semantic Interpretation & Draft Rule Generation
Stage into `pending_suggestions.json` (Queue State: PENDING)
              │
              ▼
Human Security Reviewer / Auditor Portal (Web UI / API)
       ┌──────┴──────────────────────────┐
       ▼                                 ▼
   [APPROVE / EDIT]                  [REJECT]
       │                                 │
       ▼                                 ▼
Append to `trusted_mappings.json`   Discard / Mark Blocked
(With Version & Audit Metadata)     (Logged in Audit Ledger)
       │
       ▼
Promoted to Active Dynamic Rules in Scanner Engine
```

Key Rules & Invariants:
1. **Isolated Staging Area**: AI generates candidate rule mappings (target CSM field, condition, severity, framework tag) and writes them exclusively to `data/pending_suggestions.json`.
2. **Zero Auto-Promotion**: Under no circumstances can AI auto-approve its own suggestions or directly write into `trusted_mappings.json`.
3. **Reviewer Provenance**: Approving or editing a suggestion requires an authenticated reviewer session (recorded with `reviewer_id`, timestamp, version block, and rationale).
4. **Audit Immutability**: All approval and rejection events are hashed and recorded in the cryptographic audit ledger.

## Alternatives Considered

### Fully Automated AI Self-Healing Rule Base (Rejected)
- *Pros*: Zero human intervention required.
- *Cons*: Catastrophic safety risk. An LLM could misinterpret `no service call-home` as a benign logging directive rather than an external telemetry exfiltration vector, bypassing compliance gates.
- *Reason for Rejection*: Fails defense and government compliance standards requiring deterministic, human-vetted rules.

### Purely Manual Review Without AI Assistance (Rejected)
- *Pros*: Completely human-driven.
- *Cons*: High operator fatigue. Reviewers must manually research RFCs, vendor manuals, and CIS benchmarks for dozens of unmapped lines, creating audit bottlenecks.
- *Reason for Rejection*: AI acts as a 10x force multiplier when restricted to drafting suggestions for human review.

## Consequences
- **Positive**:
  - Provides a safe, progressive path to expand rule coverage without risking scanner corruption.
  - Minimizes operator workload while preserving human accountability.
  - Creates a transparent, versioned dataset of institutional security decisions.
- **Negative / Trade-offs**:
  - Requires a dedicated human reviewer UI and API endpoints (`/api/suggestions/pending`, `/api/suggestions/review`).
  - Unmapped lines remain in `UNKNOWN` status until a human reviewer completes the review cycle.
