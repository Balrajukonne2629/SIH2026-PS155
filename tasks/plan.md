# Implementation Plan: NTRO PS26155 — Phase C: Arista EOS Implementation

## Overview
Implement Arista EOS as a first-class vendor in NTRO PS26155 using the actual Arista configuration samples in `datasets/Arista/Arista_EOS_Samples.zip`. The implementation delivers pure Python standard library parsing, Common Security Model (CSM) normalization, integration with the 10 existing `ARISTA-*` baseline security rules from `config/Rule_Library/vendor_rule_mapping.json`, an `AristaVendorAdapter`, registry onboarding in `VendorRegistry`, framework evaluator registration under `arista-eos-baseline`, and a test suite in `tests/test_arista_vendor.py`.

## Architecture Decisions
1. **Source Evidence**: Base parser syntax strictly on the 4 real Arista configuration samples in `datasets/Arista/Arista_EOS_Samples.zip`: `secure_arista.conf.txt`, `insecure_arista.conf.txt`, `partial_arista.conf.txt`, `sample_arista_eos_configuration.conf.txt`.
2. **Management IP Resolution**: Priority order:
   - 1st: `interface Management*` (e.g. `Management1`) configured IP.
   - 2nd: Explicit interface with description containing "management".
   - 3rd: `Loopback0` / `Loopback*`.
   - 4th: None / absent. Never pick an arbitrary Ethernet port.
3. **Missing Data Policy**: If a configuration lacks evidence for a field (e.g. NTP, SNMP, OS version), leave it as None / unconfigured / Unknown. Never fabricate values.
4. **Existing Rule Authority**: Implement the 10 authoritative `ARISTA-*` rule definitions in `config/Rule_Library/vendor_rule_mapping.json` (`ARISTA-SSH-001` through `ARISTA-MGMT-001`).
5. **False-Positive Prevention**:
   - `AristaVendorAdapter.detect_confidence`: Scores high on `management ssh`, `interface Management\d+`, `switchport trunk allowed vlan`, `spanning-tree bpduguard enable`. Penalizes Cisco/Junos/Fortinet syntax.
   - `CiscoVendorAdapter._NON_CISCO_PATTERNS`: Add Arista markers (`management ssh`, `interface Management\d+`) to disqualify Arista configurations from falsely matching Cisco.
6. **AST Safety & Database Protection**: Pure standard library only (no `subprocess`, `socket`, `paramiko`, `netmiko`). All tests run with temporary databases (`tmp_path`), zero interaction with `data/auditor.db`.

## Task List
- [ ] Task 1: Create `src/arista_auditor.py` with canonical Arista EOS parser and 10 baseline rules.
- [ ] Task 2: Implement `AristaVendorAdapter` in `src/vendor_adapter.py` and update Cisco negative patterns.
- [ ] Task 3: Register Arista adapter in `src/vendor_registry.py` and register `arista-eos-baseline` in framework registry.
- [ ] Task 4: Create comprehensive TDD test suite in `tests/test_arista_vendor.py`.
- [ ] Task 5: Run validation suite in exact requested order and verify regression safety.
