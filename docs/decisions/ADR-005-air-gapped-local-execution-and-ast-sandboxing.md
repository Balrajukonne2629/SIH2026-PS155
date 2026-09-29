# ADR-005: Air-Gapped Local Model Execution and Static AST Sandboxing

## Status
Accepted

## Date
2026-09-24

## Context
The NTRO PS26155 platform is deployed within classified defense networks, government command centers, and critical national infrastructure (power, telecommunications, transport). These networks operate under strict **air-gapped isolation** with zero outbound internet egress.

Two major security challenges arise:
1. **Model Execution**: Standard AI compliance tools rely on external APIs (OpenAI, Anthropic, cloud endpoints). Sending defense network device configs (containing private IP topologies, routing keys, VLAN IDs, and password hashes) to external cloud endpoints constitutes a catastrophic national security breach.
2. **Dynamic Code and Template Injection**: The remediation engine compiles Jinja2 CLI configuration templates and evaluates conditions. If malicious templates or unsanitized payloads are injected, they could execute arbitrary shell commands or exfiltrate state (Remote Code Execution / Template Injection attacks).

## Decision
We enforce a dual-shield security architecture: **Local-Only AI Execution** paired with **Static Abstract Syntax Tree (AST) Sandboxing**:

1. **Air-Gapped Local Model Execution (`ai_model_manager.py`)**:
   - The AI subsystem operates strictly on local hardware.
   - It performs automated local hardware discovery (CUDA GPU vs. CPU threads).
   - It connects strictly to local loopback instances (`http://127.0.0.1:11434` for Ollama SLMs like Llama 3 / Mistral) or executes in-process CPU transformers (`distilbert-base-uncased`).
   - If no local model is available or offline compute is constrained, the system gracefully falls back to deterministic rule explanation templates without failing the audit. Cloud egress is physically impossible by design.
2. **Static AST Safety Validator (`ast_safety.py`)**:
   - Before any dynamic script, rule condition, or Jinja2 remediation template is compiled or evaluated, it is passed through a static Python Abstract Syntax Tree (AST) safety inspection.
   - The validator parses the AST and enforces an explicit deny-list / allow-list:
     - Disallows dangerous builtins: `__import__`, `eval`, `exec`, `compile`, `open`, `breakpoint`.
     - Disallows unauthorized module imports: `os`, `sys`, `subprocess`, `socket`, `shutil`, `pty`.
     - Flags access to private dunder attributes: `__globals__`, `__subclasses__`, `__code__`.
   - If an AST node violates safety policy, execution aborts immediately before any bytecode execution occurs, logging a security event in the cryptographic ledger.

## Alternatives Considered

### Cloud AI with Data Masking / Scrubbing (Rejected)
- *Pros*: Easy to consume frontier model capabilities without managing local hardware.
- *Cons*: Data scrubbing regexes fail on edge cases; accidental leakage of topology or crypto keys is unacceptable under national defense secrecy acts. Furthermore, air-gapped networks lack internet connectivity altogether.
- *Reason for Rejection*: Violates sovereign air-gap mandates.

### Runtime Process Containerization Alone (e.g. Docker-only) (Rejected as primary defense)
- *Pros*: Isolates the process.
- *Cons*: Does not prevent container breakout, internal file modification, or denial of service if untrusted templates execute malicious Python inside the container.
- *Reason for Rejection*: Defense-in-depth requires language-level AST inspection prior to execution in addition to containerization.

## Consequences
- **Positive**:
  - Zero possibility of data exfiltration to foreign or cloud servers.
  - Provable immunity against template injection and dynamic code execution exploits.
  - Deterministic fallback ensures the core auditor never crashes even on bare-metal systems with no AI hardware.
- **Negative / Trade-offs**:
  - Local AI models are constrained by available host hardware (CPU/RAM).
  - Remediation templates must strictly adhere to the allow-listed AST grammar.
