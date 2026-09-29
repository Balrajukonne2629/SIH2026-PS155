# Tasks: Phase D/E Framework Selection + Crosswalk Integration

- [x] Task 1: Inspect Authoritative Mappings across repo (config/Rule_Library/vendor_rule_mapping.json, framework definitions, crosswalk) and document factual Vendor × Framework matrix.
  - Acceptance: Authoritative sources checked; zero invented mappings; explicit documentation of mapped vs unmapped vs unsupported vs NOT_ASSESSED.
  - Verify: Inspection of config files and source code.
  - Files: `config/Rule_Library/vendor_rule_mapping.json`, `src/framework_crosswalk.py`, `src/compliance_framework.py`.

- [x] Task 2: Wire/verify framework registrations in `src/main.py` and `src/compliance_framework.py`.
  - Acceptance: `cisco-ios-xe-baseline`, `juniper-junos-baseline`, `fortinet-fortios-baseline`, `arista-eos-baseline`, `cis-cisco-iosxe-v2.2.1`, `disa-stig-cisco-iosxe-v3r7`, `nist-sp-800-53-rev5`, and `iso-iec-27001-2022` are registered and accessible.
  - Verify: Test registry existence and vendor compatibility filtering.
  - Files: `src/main.py`, `src/compliance_framework.py`.

- [x] Task 3: Implement strict framework selection scoping in `/api/compliance/evaluate` and `/api/audit/upload` (and/or aggregator).
  - Acceptance: Only selected frameworks evaluated; unselected frameworks NOT evaluated; framework identity retained in response; empty/duplicate/invalid/incompatible handling deterministic and fail-soft; backward-compatible when omitted.
  - Verify: Unit and integration tests.
  - Files: `src/main.py`, `src/compliance_aggregator.py`.

- [x] Task 4: Verify and guarantee crosswalk vendor isolation in `src/framework_crosswalk.py`.
  - Acceptance: Cisco and Juniper have authoritative crosswalks; Fortinet, Arista, and unknown vendors strictly yield NOT_ASSESSED; zero inheritance of Cisco rules/mappings.
  - Verify: Crosswalk evaluator tests with Arista, Fortinet, and unknown CSMs.
  - Files: `src/framework_crosswalk.py`.

- [x] Task 5: Implement comprehensive test suite in `tests/test_framework_selection.py`.
  - Acceptance: Covers all 18 specified test requirements (single, multiple, strict scoping, unselected absence, deduplication, invalid/empty, backward compatibility, vendor isolation, determinism, temporary DBs only).
  - Verify: `pytest tests/test_framework_selection.py -v` (29/29 passed).
  - Files: `tests/test_framework_selection.py`.

- [x] Task 6: Execute validation suite in exact required order.
  - Acceptance: All test suites pass cleanly.
  - Verify:
    1. `python -m pytest tests/test_framework_selection.py -v` (29 passed)
    2. `python -m pytest tests/test_compliance_gaps.py -q` (22 passed)
    3. `python -m pytest tests/test_compliance_framework.py tests/test_multi_framework_aggregation.py -q` (71 passed)
    4. `python -m pytest tests/test_juniper_vendor.py -q` (22 passed)
    5. `python -m pytest tests/test_fortinet_vendor.py -q` (23 passed)
    6. `python -m pytest tests/test_arista_vendor.py -q` (38 passed)

- [ ] Task 7: Produce final report `# PHASE D/E — FRAMEWORK SELECTION REPORT` with sections 1 to 15.
  - Acceptance: Fully detailed, matches requested markdown structure, stops without starting next phase.
