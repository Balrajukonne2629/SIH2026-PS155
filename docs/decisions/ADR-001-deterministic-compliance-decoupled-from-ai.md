# ADR-001: Deterministic Compliance Evaluation Decoupled from AI Decision-Making

## Status
Accepted

## Date
2026-09-24

## Context
The NTRO PS26155 platform evaluates mission-critical network device configurations (Cisco IOS-XE, Juniper Junos, Arista EOS) against sovereign and international cybersecurity compliance benchmarks (CIS Benchmark v2.2.1, DISA-STIG V3R7, and NIST SP 800-53 rev5). 

A critical question arose during architecture design: *Should Generative Large Language Models (LLMs) or neural networks evaluate compliance directly and determine PASS/FAIL verdicts on configuration lines?*

In defense, intelligence, and national security environments:
1. **Mathematical Reproducibility**: Audits must be deterministic. Evaluating the exact same configuration 1,000 times must yield the exact same verdict 1,000 times. LLM probabilistic sampling and model drift violate this requirement.
2. **Zero Hallucination Tolerance**: LLMs can hallucinate compliance standards, misread subtle port numbers, or fabricate non-existent vendor commands.
3. **Legal Non-Repudiation & Auditability**: When an auditor fails a device in a secure enclave, the failure evidence must pinpoint the exact line, expected value, observed value, and benchmark control citation. Probabilistic "explanations" are legally indefensible in formal compliance audits.
4. **Sub-10ms Latency**: Evaluating hundreds of controls per device across enterprise fleets requires millisecond-range execution. Cloud or local LLM inference takes seconds per control.

## Decision
We enforce a strict architectural boundary: **Authoritative compliance evaluation is 100% deterministic and completely decoupled from AI.**

- All compliance checks are implemented as pure, deterministic Python evaluators operating against normalized Common Security Model (CSM) schemas.
- AI (local DistilBERT and local Ollama SLMs) is restricted strictly to an advisory, offline role: assisting human operators with *unmapped syntax interpretation* and *drafting plain-language remediation explanations*.
- AI models are strictly prohibited from emitting authoritative PASS or FAIL verdicts.
- The evaluation statuses are constrained to a strict tri-state enum: `PASS`, `FAIL`, and `UNKNOWN`. If a configuration line cannot be evaluated deterministically, it returns `UNKNOWN` and is never coerced into `FAIL` or guessed by AI.

## Alternatives Considered

### Direct LLM Prompting for Configuration Audits (Rejected)
- *Pros*: Rapid initial prototype, handles novel CLI commands without writing explicit parsers.
- *Cons*: Prone to hallucination, non-deterministic outputs, high token and compute costs, vulnerability to prompt injection via configuration banners/comments, unacceptable for air-gapped defense enclaves.
- *Reason for Rejection*: Fails NTRO sovereign auditability, reproducibility, and security criteria.

### Rule-Engine Only Without AI (Rejected)
- *Pros*: Fully deterministic and lightweight.
- *Cons*: Zero flexibility when encountering proprietary, vendor-specific, or novel configuration commands that aren't yet mapped to the standard parser. Leaves operators with no guidance for unmapped directives.
- *Reason for Rejection*: Unmapped lines would remain black boxes. The dual-path architecture (deterministic core + human-gated AI advisory) solves this without compromising audit integrity.

## Consequences
- **Positive**:
  - Deterministic evaluation executes in under 10ms per device (benchmarked at ~3.2ms).
  - 100% reproducible verdicts with zero hallucinated security advice.
  - Generates verifiable, mathematical evidence records (`observed_value`, `expected_value`, `csm_path`).
  - Strict compliance with air-gapped national security requirements.
- **Negative / Trade-offs**:
  - Requires maintaining explicit rule catalogs and CSM path mappings for every benchmark control.
  - Adding new benchmark controls requires code updates in `cis_benchmark_cisco_iosxe.py`, `disa_stig_cisco_iosxe.py`, etc., rather than simple zero-shot prompting.
