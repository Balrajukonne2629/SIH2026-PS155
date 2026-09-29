# ADR-002: Common Security Model (CSM) & Multi-Vendor Abstraction Layer

## Status
Accepted

## Date
2026-09-24

## Context
Network infrastructures across defense and enterprise networks are heterogeneous, combining equipment from Cisco (IOS-XE), Juniper (Junos), Arista (EOS), Fortinet, and others. Each vendor uses distinct syntax styles:
- Cisco: Flat imperative CLI blocks (`interface GigabitEthernet1`, indentation-based hierarchical sub-modes).
- Juniper: Nested hierarchical curly-brace syntax (`system { services { ssh; } }`) or set-format commands.
- Arista: EOS declarative and EOS-CLI syntax.

If compliance evaluation rules were written directly against raw vendor CLI text, supporting $M$ vendors across $N$ regulatory frameworks (CIS, STIG, NIST) would create an $M \times N$ combinatorial explosion of duplicated, vendor-coupled rule checks. A change in a vendor syntax would break multiple framework evaluators.

## Decision
We implement a two-stage vendor decoupling pipeline based on a canonical **Common Security Model (CSM)**:

1. **Vendor Detection & Adapter Registration**:
   - Configurations enter through a unified ingestion point (`ingest_configuration`).
   - A `VendorRegistry` dynamically identifies the target operating system (heuristic syntax profiling + explicit user override) and dispatches to the corresponding `VendorAdapter` (`CiscoVendorAdapter`, `JuniperVendorAdapter`).
2. **Normalization into Canonical CSM**:
   - The vendor adapter parses raw vendor CLI and extracts normalized entities into a structured, validated JSON dictionary conforming to `normalized_config_schema.json`.
   - CSM standardizes key security sections: `interfaces`, `services` (SSH, Telnet, HTTP), `aaa` (authentication, authorization, accounting), `logging` (syslog, buffer, trap levels), `ntp` (servers, authentication), `routing` (BGP, OSPF, filters), `snmp` (community strings, v3 users), and `banners`.
3. **Vendor-Neutral Compliance Evaluation**:
   - Downstream compliance evaluators (`cis_benchmark_cisco_iosxe.py`, `disa_stig_cisco_iosxe.py`, `compliance_aggregator.py`) query only normalized CSM fields using dot-path notation (`resolve_csm_path(csm, "services.ssh.version")`).
   - Evaluators have zero direct dependencies on raw CLI strings or vendor parser internals.

## Alternatives Considered

### Direct Regex/AST Rules Per Vendor (Rejected)
- *Pros*: Faster to prototype for a single vendor (Cisco only).
- *Cons*: Total code duplication when adding Juniper or Arista. Every new compliance framework rule has to be rewritten for every single vendor syntax. High maintenance burden.
- *Reason for Rejection*: Violates scalability requirements and clean architecture principles.

### Generic OpenConfig / YANG Model for All Ingestion (Rejected)
- *Pros*: Industry-standard data model.
- *Cons*: Overly complex, heavyweight schemas requiring massive YANG toolchains and runtime overhead; insufficient coverage for legacy or unmanaged CLI security directives.
- *Reason for Rejection*: Heavy dependency footprint violating Ponytail minimalism and zero-external-dependency constraints.

## Consequences
- **Positive**:
  - Adding a new vendor requires only writing a single `VendorAdapter` normalizing to CSM; all existing CIS, STIG, and NIST evaluators immediately work without modification.
  - Test suites can mock CSM objects directly without needing full raw device configuration dumps.
  - Unmapped vendor directives are cleanly identified during normalization and partitioned into `unmapped_lines`.
- **Negative / Trade-offs**:
  - Requires maintaining the CSM schema contract (`normalized_config_schema.json`) as new device capabilities are introduced.
  - Normalization introduces a parsing step before evaluation, though parsing remains well under 5ms for standard enterprise configs.
