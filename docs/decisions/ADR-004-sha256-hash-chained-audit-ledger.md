# ADR-004: SHA-256 Hash-Chained Cryptographic Audit Ledger for Non-Repudiation

## Status
Accepted

## Date
2026-09-24

## Context
In national defense, intelligence, and regulated enterprise environments, audit compliance reports are subjected to intense scrutiny. Malicious actors, disgruntled operators, or compromised systems might attempt to alter past audit reports, delete failed findings, or forge compliance certificates after an incident occurs.

Standard database logging or plain-text log files are vulnerable to retroactive tampering (e.g., executing `UPDATE audit_results SET status='Pass'` via direct database access). 

The platform requires a tamper-evident, verifiable audit recording system providing mathematical non-repudiation without introducing heavy distributed blockchain infrastructure.

## Decision
We implement a lightweight, append-only, **SHA-256 Cryptographic Hash-Chained Audit Ledger**:

1. **Hash Chaining Structure**:
   - Each audit log entry is stored as a block in the SQLite `audit_ledger` table.
   - Every block contains:
     - `sequence_number` (strictly monotonic integer starting at 1)
     - `timestamp` (UTC ISO 8601 string)
     - `device_hostname` & `device_ip`
     - `config_hash` (SHA-256 hash of the exact uploaded configuration text)
     - `audit_results_summary` (JSON payload of evaluated control verdicts)
     - `remediation_summary` (JSON summary of applied/generated remediations)
     - `previous_hash` (The SHA-256 hash of the immediate predecessor block; the genesis block uses 64 zeros: `0000...0000`)
     - `entry_hash` (SHA-256 hash calculated over the canonical JSON representation of all fields in the current block, including `previous_hash`)
2. **Canonical Serialization**:
   - To guarantee deterministic hashing across diverse CPU architectures and Python runtimes, the payload is serialized with deterministic sorting:
     `json.dumps(payload, sort_keys=True, separators=(',', ':'))`.
3. **Continuous Verification & Tamper Detection**:
   - The engine provides a zero-dependency verification routine (`audit_log.verify_chain()`).
   - The verifier traverses the chain from block 1 to $N$. If any single bit, timestamp, or result in block $K$ has been altered, recomputing the hash produces a mismatch at block $K$, and all subsequent blocks $K+1 \dots N$ fail chain continuity validation.
4. **Certificate QR Verification**:
   - Generated PDF certificates embed a vector QR code containing the `entry_hash` and verification URI, allowing immediate offline verification of physical or digital certificates against the ledger.

## Alternatives Considered

### Distributed Blockchain / Hyperledger (Rejected)
- *Pros*: Multi-party consensus.
- *Cons*: Immense operational complexity, slow transaction throughput, heavy memory and storage footprint, requires internet or external consensus nodes—incompatible with air-gapped field deployments.
- *Reason for Rejection*: Severe violation of Ponytail minimalism and offline-first mandates.

### Standard Database Audit Table without Chaining (Rejected)
- *Pros*: Simple SQL table with timestamps.
- *Cons*: Trivially tampered with via SQL queries; provides zero mathematical proof of integrity or non-repudiation.
- *Reason for Rejection*: Fails NTRO sovereign audit and evidence integrity requirements.

## Consequences
- **Positive**:
  - Provides cryptographic non-repudiation and immediate detection of historical tampering.
  - Zero external dependencies: implemented in pure Python using standard library `hashlib`, `json`, and `sqlite3`.
  - Negligible performance overhead (<0.5ms per ledger commit).
- **Negative / Trade-offs**:
  - Because it is a local hash chain, protecting the database file permissions on the host system remains vital (defense-in-depth).
  - Deleting an erroneous record requires invalidating the chain from that point forward; deletions are deliberately unsupported by design.
