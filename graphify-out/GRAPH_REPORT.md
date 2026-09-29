# Graph Report - PART-2  (2026-09-29)

## Corpus Check
- 98 files · ~151,621 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 6, .example 1, .sha256 1)

## Summary
- 2744 nodes · 5215 edges · 177 communities (116 shown, 61 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 412 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e278109`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- EvaluationResult
- json
- test_paloalto_vendor.py
- auth.py
- compliance_framework.py
- get_default_registry
- test_juniper_vendor.py
- test_vendor_selection_api.py
- test_report_export.py
- test_api_reviewer_identity.py
- FrameworkRegistry
- audit_report.py
- ComplianceStatus
- test_api_rbac_workflow.py
- src/main.py
- test_database.py
- test_configuration_progression.py
- test_phase3d_repair.py
- get_connection
- test_trusted_rule_library.py
- report_exporter.py
- test_vendor_foundation.py
- package.json
- TestDisaStigControlEvaluatorUnit
- get_default_vendor_registry
- create_audit_entry
- TestCisControlEvaluatorUnit
- ReviewerDashboard.tsx
- types.ts
- AristaBaselineEvaluator
- test_api_auth.py
- ai_model_manager.py
- TestAristaParserAndCSM
- test_phase3a_model_selection.py
- run_evaluation
- database.py
- api.ts
- .aggregate
- paloalto_auditor.py
- TestVendorAwareComplianceAPI
- AIModelManager
- Any
- test_api_model_manager.py
- _create_sample_audit_ledger_entry
- TestApiFrameworkSelectionEndpoints
- test_api_rbac.py
- Any
- test_docker_offline_auth.py
- TestAristaAdapterAndRegistry
- TestFortinetParser
- get
- cisco_auditor.py
- VendorRegistry
- create_session_for_uploader
- compilerOptions
- FortinetBaselineEvaluator
- generate_remediation
- test_arista_vendor.py
- PaloAltoVendorAdapter
- assert_no_execution_imports
- AuditLogReportScreen.tsx
- HardwareProfile
- CrosswalkEvaluator
- TestAristaBaselineRules
- App.tsx
- ModelMode
- CiscoCsmFrameworkAdapter
- UserIdentity
- get_authenticated_report
- test_api_ownership.py
- test_fortinet_vendor.py
- _seed_canonical_report
- TestFortinetVendorAdapter
- TestCrosswalkVendorIsolationAndFailSoft
- TestFailureHandlingFallbacks
- BaseModel
- ref_node_assert_strict
- _OOXMLBuilder
- test_api_reports.py
- TestAutoModeSelection
- TestComplianceAuthorityInvariant
- test_frontend_upload_frameworks.mjs
- verify_api_safety_no_execution
- TestDeviceIdentityGap
- TestFortinetRealWorldCSM
- TestFortinetBaselineRules
- TestAstSafetyAndDbProtection
- TestInvalidModelRejection
- compute_entry_hash
- ReportError
- TestOllamaInvocationAndFallbacks
- TestDeterministicOnlyMode
- AuditResultsScreen.tsx
- test_frontend_compliance_frameworks.mjs
- test_frontend_rbac_workflow.mjs
- test_api_compliance.py
- TestComplianceFrameworkDiscovery
- TestAristaFrameworkAndIsolation
- TestFortinetDatasetDiscovery
- TestFortinetFrameworkEvaluator
- TestPaloAltoDatasetDiscovery
- TestPaloAltoParserAndCSM
- test_frontend_model_manager.mjs
- TestComplianceEvaluateOwnershipIsolation
- TestComplianceEvaluatePayloads
- fixture
- ref_node_test
- set_model_mode
- TestModelSelection
- TestAristaSampleDiscovery
- TestAristaAstAndDbSafety
- TestAristaApiIngestion
- TestCisBenchmarkCatalog
- TestReportExportCompliance
- TestDisaStigEvaluationParity
- TestFortinetRealWorldBaselineRules
- TestFortinetRealWorldAdapter
- TestFortinetRealWorldApiIngestion
- TestFortinetApiIngestion
- TestPaloAltoBaselineRules
- TestUserSelectedModel
- TestFastModeSelection
- TestQualityModeSelection
- require_role
- delete_trusted_mapping_endpoint
- test_frontend_auth.mjs
- check_report_ownership
- TestComplianceEvaluateFrameworkFiltering
- TestDisaStigCatalog
- TestComplianceAggregatorStaticSecurityInvariants
- clean_export_dir
- TestComplianceEvaluateDeterminismAndUnknowns
- TestPaloAltoApiIngestion
- test_get_authenticated_session_direct_unit
- src/__init__.py
- tests/__init__.py
- test_override_with_shorthand_qwen_rejected
- test_ollama_offline_status_resilience
- test_model_mode_change_does_not_affect_auth_or_trusted_mappings
- test_precedence_case_a_api_fast_with_env_qwen
- test_precedence_case_b_api_quality_with_env_llama
- test_precedence_case_c_api_override_llama_with_env_qwen
- test_precedence_case_d_api_override_qwen_with_env_llama
- test_precedence_case_e_api_override_invalid_model_rejected
- test_precedence_case_f_environment_bootstrap_no_api_change
- test_precedence_case_g_runtime_api_change_overrides_bootstrap
- test_precedence_case_h_no_runtime_caller_reads_env_vars
- test_client_cannot_override_owner_user_id_in_payload
- test_uploader_can_access_own_session_results
- test_reviewer_can_access_any_uploader_session_results
- test_viewer_can_access_any_uploader_session_results
- test_uploader_can_remediate_own_session
- test_uploader_cannot_remediate_other_uploader_session
- test_reviewer_can_remediate_any_session
- test_reviewer_can_finalize_any_session
- test_authenticated_user_can_retrieve_their_report
- test_user_cannot_access_another_users_report
- test_valid_editable_field_can_be_changed
- test_version_increments
- test_stale_version_returns_409
- test_stale_edit_makes_no_change
- test_system_fields_cannot_be_modified
- test_invalid_field_paths_are_rejected
- test_framework_results_cannot_be_modified
- test_pass_fail_unknown_cannot_be_modified
- test_system_snapshot_cannot_be_modified
- test_pdf_export_endpoint_returns_valid_pdf
- test_docx_export_endpoint_returns_valid_docx
- test_export_does_not_invoke_compliance_evaluators
- test_report_edit_ownership_is_enforced
- test_multiple_edits_preserve_complete_history
- test_existing_audit_ledger_and_hash_chain_unchanged
- test_appropriate_error_responses_do_not_leak_report_existence
- test_viewer_role_is_strictly_read_only_and_cannot_patch
- test_cross_owner_edits_endpoint_blocked

## God Nodes (most connected - your core abstractions)
1. `EvaluationResult` - 64 edges
2. `FrameworkRegistry` - 61 edges
3. `ComplianceStatus` - 59 edges
4. `Evidence` - 59 edges
5. `Control` - 58 edges
6. `AIModelManager` - 45 edges
7. `ingest_configuration()` - 40 edges
8. `Framework` - 39 edges
9. `get_default_registry()` - 35 edges
10. `TestDisaStigControlEvaluatorUnit` - 35 edges

## Surprising Connections (you probably didn't know these)
- `TestHardwareAwareAutoSelection` --uses--> `ModelMode`  [INFERRED]
  tests/test_ai_model_manager.py → src/ai_model_manager.py
- `TestModelSelection` --uses--> `ModelMode`  [INFERRED]
  tests/test_ai_model_manager.py → src/ai_model_manager.py
- `TestOllamaInvocationAndFallbacks` --uses--> `ModelMode`  [INFERRED]
  tests/test_ai_model_manager.py → src/ai_model_manager.py
- `test_precedence_case_e_api_override_invalid_model_rejected()` --uses--> `ModelMode`  [INFERRED]
  tests/test_api_model_manager.py → src/ai_model_manager.py
- `test_precedence_case_f_environment_bootstrap_no_api_change()` --uses--> `ModelMode`  [INFERRED]
  tests/test_api_model_manager.py → src/ai_model_manager.py

## Import Cycles
- None detected.

## Communities (177 total, 61 thin omitted)

### Community 0 - "EvaluationResult"
Cohesion: 0.05
Nodes (49): CisCiscoIosXeEvaluator, Any, Evaluates normalized CSM data against the CIS Cisco IOS-XE Benchmark v2.2.1.…, Evaluates normalized CSM against CIS Cisco IOS-XE controls. Args: csm:…, CIS §2.1.1.2: Set version 2 for 'ip ssh version'., CIS §1.1.1: Enable 'aaa new-model'., CIS §2.3.1.1: Set 'ntp authenticate'., CIS §2.2.4: Set IP address for 'logging host'. (+41 more)

### Community 1 - "json"
Cohesion: 0.04
Nodes (59): fastapi_testclient, hashlib, json, NTRO PS26155 — Root Application Entrypoint Wrapper. Canonical application…, os, pathlib, pytest, sqlite3 (+51 more)

### Community 2 - "test_paloalto_vendor.py"
Cohesion: 0.04
Nodes (42): AristaVendorAdapter, JuniperVendorAdapter, ABC, NTRO PS26155 — Vendor Adapter Contract & Cisco Adapter Implementation. Defines…, Juniper Networks vendor adapter wrapping verified juniper_auditor logic.…, Abstract interface defining vendor-specific configuration parsing and…, Determines confidence that the text represents Juniper Junos configuration.…, Stable, unique identifier for the vendor (e.g. 'cisco', 'juniper'). (+34 more)

### Community 3 - "auth.py"
Cohesion: 0.07
Nodes (54): base64, hmac, secrets, AuthError, base64url_decode(), base64url_encode(), create_access_token(), decode_and_verify_jwt() (+46 more)

### Community 4 - "compliance_framework.py"
Cohesion: 0.07
Nodes (39): dataclasses, datetime, random, re, NTRO PS26155 — Arista EOS Compliance Auditor & Parser (Phase C). Provides pure…, NTRO PS26155 — CIS Benchmark Cisco IOS-XE Deterministic Control Catalog (Phase…, NTRO PS26155 — Multi-Framework Scoring, Aggregation & Evidence Consolidation…, FrameworkEvaluator (+31 more)

### Community 5 - "get_default_registry"
Cohesion: 0.05
Nodes (39): Registers the 'arista-eos-baseline' framework and evaluator into…, register_arista_baseline(), Registers the CIS Cisco IOS-XE Benchmark v2.2.1 framework and evaluator into…, register_cis_cisco_iosxe(), get_default_registry(), Returns the shared process-level FrameworkRegistry instance., Registers the 'cisco-ios-xe-baseline' framework and evaluator into…, register_cisco_baseline() (+31 more)

### Community 6 - "test_juniper_vendor.py"
Cohesion: 0.04
Nodes (52): fixture, NTRO PS26155 — Juniper Junos Vendor Integration Tests (Phase 2). Comprehensive…, Returns a synthetic Junos configuration in flat 'set' format., Fully compliant Junos config where all 10 initial rules PASS., Non-compliant Junos config where all 10 initial rules FAIL., Verify JuniperVendorAdapter registers cleanly in VendorRegistry., Verify process-level default registry contains both Cisco and Juniper., Verify detection accurately identifies hierarchical Junos configs. (+44 more)

### Community 7 - "test_vendor_selection_api.py"
Cohesion: 0.05
Nodes (50): ast, NTRO PS26155 — AST Safety Verification Utility (Phase 3R.3). Provides…, ingest_configuration(), Any, Unified ingestion entry point decoupling callers from vendor-specific parsers.…, NTRO PS26155 — Vendor Selection + Detection API Integration Test Suite.…, Requirement: System supports explicit selection of cisco, juniper, fortinet,…, Requirement: Explicit vendor selection is case-insensitive. (+42 more)

### Community 8 - "test_report_export.py"
Cohesion: 0.08
Nodes (49): pypdf, _build_cisco_multi_framework_report(), _extract_docx_xml(), _extract_pdf_text(), Path, NTRO PS26155 — Canonical Report Export Engine Verification Suite (Phase 3D.4).…, 1. Cisco multi-framework PDF export produces valid, readable PDF., 2. Cisco multi-framework DOCX export produces valid zero-dependency OOXML… (+41 more)

### Community 9 - "test_api_reviewer_identity.py"
Cohesion: 0.06
Nodes (49): authorized_approver_token(), non_approver_reviewer_token(), fixture, NTRO PS26155 Auditor — Reviewer Identity & Approval Accountability Binding…, Scenario 1: Authorized reviewer can approve compliance rules., Scenario 2: Reviewer identity recorded in DB equals authenticated JWT 'sub'., Scenario 3: Client-supplied reviewer_name is ignored; JWT sub is authoritative., Scenario 4: Client-supplied reviewer_id in payload is ignored. (+41 more)

### Community 10 - "FrameworkRegistry"
Cohesion: 0.07
Nodes (23): KeyError, Framework, FrameworkNotFoundError, FrameworkRegistry, Metadata and identity contract representing an authoritative compliance…, Raised when an unregistered framework ID is requested., Explicit, dependency-injectable registry for compliance frameworks and their…, Registers a framework and its optional evaluator. Args: framework: Framework… (+15 more)

### Community 11 - "audit_report.py"
Cohesion: 0.07
Nodes (35): AuditReport, create_or_get_canonical_report(), create_report_from_audit_data(), FrameworkReportItem, get_canonical_report(), get_canonical_report_by_entry_id(), HumanEditableContent, InvalidFieldPathError (+27 more)

### Community 12 - "ComplianceStatus"
Cohesion: 0.07
Nodes (21): MultiFrameworkAggregator, Deterministic aggregation engine for multi-framework compliance evaluation…, Initializes aggregator with an optional registry for framework metadata…, ComplianceStatus, Enum, str, Authoritative, deterministic compliance evaluation verdict. Strictly restricted…, make_res() (+13 more)

### Community 13 - "test_api_rbac_workflow.py"
Cohesion: 0.06
Nodes (44): clean_test_db(), fixture, NTRO PS26155 Auditor — Backend Audit Workflow API & Ownership Hardening Tests…, Helper to seed an audit session directly in SQLite., Unauthenticated requests to /api/audit/sessions must return 401., Verify uploader receives only own sessions, while reviewer and viewer receive…, Verify ?status= filtering returns correct subset and unknown status returns…, Verify sessions are ordered deterministically by created_at DESC, session_id… (+36 more)

### Community 14 - "src/main.py"
Cohesion: 0.07
Nodes (43): fastapi_middleware_cors, fastapi_responses, pydantic, Request, save_session(), ai_approve(), ApproveRequest, audit_upload() (+35 more)

### Community 15 - "test_database.py"
Cohesion: 0.05
Nodes (36): Verify users table creation and exact required columns., Verify owner_user_id exists as a nullable column on audit_sessions and…, Verify that exactly the 3 expected seed accounts are created with exactly one…, Verify that no seed or created user stores plaintext passwords., Verify create_user() and get_user_by_username() / get_user_by_id()., Verify unique constraint and case-insensitive username collision rejection., Verify that role check constraint rejects invalid roles., Verify that repeated calls to initialize_database() are safe, non-destructive,… (+28 more)

### Community 16 - "test_configuration_progression.py"
Cohesion: 0.08
Nodes (40): compute_audit_entry_metrics(), compute_version_delta(), derive_configuration_progression(), Any, Chronological Configuration Progression & State Evolution Engine (Phase 2).…, Derives chronological configuration evolution from audit ledger records. Uses…, Computes control counts, pass rate, and evaluation status for a single audit…, Compares two consecutive configuration versions and produces authentic rule-… (+32 more)

### Community 17 - "test_phase3d_repair.py"
Cohesion: 0.09
Nodes (41): isolated_db(), _make_token(), fixture, NTRO PS26155 — Phase 3D Report Workflow Repair Verification Suite. Covers the…, Scenario 1: reviewer-authenticated user retrieves their canonical report., Scenario 2: reviewer can PATCH an allowlisted editable field., Scenario 3: each valid edit monotonically increments the report version., Scenario 4: edit_metadata.edited_by is derived from the JWT sub claim, never… (+33 more)

### Community 18 - "get_connection"
Cohesion: 0.08
Nodes (40): Row, approve_suggestion(), Path, store_suggestion(), get_last_entry(), Reads the last entry of the sqlite log to retrieve the previous entryHash., create_user(), get_audit_report_by_entry_id() (+32 more)

### Community 19 - "test_trusted_rule_library.py"
Cohesion: 0.06
Nodes (39): approver_token(), non_approver_reviewer_token(), fixture, NTRO PS26155 Auditor — Phase 3B: Trusted Rule Library & Human-Approved AI…, A. AI mapping suggestion creates a pending suggestion but NEVER writes to…, B. Authorized reviewer promotes a suggestion to a trusted rule mapping in…, C. Viewer, uploader, and non-approver reviewer all receive HTTP 403 Forbidden., D. approve_with_correction writes the reviewer-supplied mapping with… (+31 more)

### Community 20 - "report_exporter.py"
Cohesion: 0.09
Nodes (33): html, reportlab_graphics_barcode, reportlab_graphics_shapes, reportlab_lib, reportlab_lib_pagesizes, reportlab_lib_styles, reportlab_platypus, _atomic_export() (+25 more)

### Community 21 - "test_vendor_foundation.py"
Cohesion: 0.06
Nodes (29): MockFutureVendorAdapter, fixture, NTRO PS26155 — Vendor Foundation & Scalable Architecture Tests (Phase 1).…, Test C: Verifies Cisco CSM output remains 100% compatible with existing…, Test D: Verifies existing Cisco audit API upload behavior remains intact., Test D2: Verifies /api/compliance/evaluate route works with raw_config through…, Test E1: Explicit unsupported vendor raises UnsupportedVendorError., Test E2: Explicit unsupported vendor via upload API returns HTTP 422. (+21 more)

### Community 22 - "package.json"
Cohesion: 0.06
Nodes (32): dependencies, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+24 more)

### Community 24 - "get_default_vendor_registry"
Cohesion: 0.07
Nodes (25): CiscoVendorAdapter, Cisco IOS-XE vendor adapter wrapping verified cisco_auditor parsing logic.…, Parses Cisco configuration into CSM via verified cisco_auditor., Determines confidence that the text represents Cisco configuration. Scores…, Evaluates Cisco baseline rules via verified cisco_auditor., get_default_vendor_registry(), Returns the shared process-level VendorRegistry pre-seeded with Cisco, Juniper,…, clean_vendor_registry() (+17 more)

### Community 25 - "create_audit_entry"
Cohesion: 0.13
Nodes (30): append_audit_entry(), create_audit_entry(), Re-walks entire log table, recalculates all hashes, and verifies prevEntryHash…, Builds a new hash-chained audit entry, computing prevEntryHash and entryHash., Appends an audit entry into SQLite. Uses sort_keys=True for JSON columns so…, verify_chain(), _make_dummy_csm(), _make_dummy_evals() (+22 more)

### Community 26 - "TestCisControlEvaluatorUnit"
Cohesion: 0.06
Nodes (5): fixture, Unit tests for each individual CIS control under PASS, FAIL, and UNKNOWN…, Tests parity between CisCiscoIosXeEvaluator and cisco_auditor.py baseline rules., TestCisControlEvaluatorUnit, TestCisEvaluationParity

### Community 27 - "ReviewerDashboard.tsx"
Cohesion: 0.15
Nodes (24): getAuditSessions(), getConfigurationProgression(), getLedger(), getTrustedMappings(), uploadAuditConfig(), AuditsScreen(), AuditsScreenProps, DashboardScreen() (+16 more)

### Community 28 - "types.ts"
Cohesion: 0.09
Nodes (26): getModelStatus(), setModelMode(), AiModelManagerScreen(), AiModelManagerScreenProps, SystemScreen(), SystemScreenProps, AuditLogEntry, AuditStatus (+18 more)

### Community 29 - "AristaBaselineEvaluator"
Cohesion: 0.08
Nodes (17): parametrize, AristaBaselineEvaluator, _cidr_to_netmask(), evaluate_arista_baseline(), evaluate_rules(), _netmask_to_cidr(), parse_arista(), Any (+9 more)

### Community 30 - "test_api_auth.py"
Cohesion: 0.07
Nodes (4): fixture, NTRO PS26155 Auditor — API Authentication Integration Tests Tests for Chunk 3:…, Ensures database is initialized, test users are provisioned, and rate-limiting…, setup_test_users_and_state()

### Community 31 - "ai_model_manager.py"
Cohesion: 0.10
Nodes (23): ctypes, jinja2, src, AI Model Manager Subsystem (PRD Addendum §2, Benchmark Audit Architecture).…, _generate_rationale_ai(), _get_embedding(), get_model(), Local AI Unmapped Line Suggester & Reviewer Approval Workflow (PRD Addendum… (+15 more)

### Community 32 - "TestAristaParserAndCSM"
Cohesion: 0.07
Nodes (15): Tests Arista EOS parsing and CSM normalization., Extracts exact hostnames from all four configurations., Device metadata sets vendor='arista' and platform='EOS'., Missing hardware and OS metadata are preserved as None without fabrication., Verifies management IP extraction follows Management1 > description > Loopback…, Extracts SSH configuration accurately., Telnet remains False by default., Extracts AAA authentication and authorization commands and users. (+7 more)

### Community 33 - "test_phase3a_model_selection.py"
Cohesion: 0.09
Nodes (21): inspect, io, Comprehensive Test Suite for AI Model Manager (Chunk 1 Backend Core). Verifies:…, fixture, Phase 3A: Hardware-Adaptive AI Model Selection — Focused Test Suite. Covers all…, POST /api/model/mode with deterministic_only must succeed for authorized…, After setting deterministic_only, GET /api/model/status must reflect it., RBAC: viewer must not be able to change mode. (+13 more)

### Community 34 - "run_evaluation"
Cohesion: 0.10
Nodes (17): MultiFrameworkAuditResult, Helper orchestrating evaluation of selected frameworks against CSM and…, Verifies framework selection and strict scoping., Selecting exactly one framework evaluates only that framework., Selecting multiple frameworks evaluates only the requested frameworks., Unselected frameworks are not evaluated at all., Duplicate IDs are deduplicated deterministically preserving first occurrence., Unknown framework ID raises KeyError. (+9 more)

### Community 35 - "database.py"
Cohesion: 0.13
Nodes (23): Connection, on_event, initialize_database(), migrate_ledger(), migrate_pending_suggestions(), migrate_schema_add_audit_reports(), migrate_schema_add_ownership(), migrate_schema_add_trusted_library_fields() (+15 more)

### Community 36 - "api.ts"
Cohesion: 0.17
Nodes (20): API_BASE, approveSuggestion(), deleteTrustedMapping(), finalizeAudit(), getPendingSuggestion(), getPendingSuggestions(), getRemediation(), getReportByEntryId() (+12 more)

### Community 37 - ".aggregate"
Cohesion: 0.10
Nodes (17): AggregationError, ConflictingControlEvaluationError, ConsolidatedEvidence, FrameworkSummary, InvalidEvaluationResultError, OverallMetrics, Any, Exception (+9 more)

### Community 38 - "paloalto_auditor.py"
Cohesion: 0.12
Nodes (17): eval_condition(), evaluate_rules(), load_baseline_rules(), PaloAltoBaselineEvaluator, parse_panos(), Any, NTRO PS26155 — Palo Alto PAN-OS Compliance Auditor & Parser. Provides pure…, Resolves a dot-delimited path (e.g. 'csm.services.ssh') in the CSM dict. (+9 more)

### Community 39 - "TestVendorAwareComplianceAPI"
Cohesion: 0.08
Nodes (13): Verifies vendor-scoped framework auto-selection, cross-vendor rejection, and…, When framework_ids is None, a Cisco CSM auto-evaluates only Cisco frameworks., When framework_ids is None, a Juniper CSM does not evaluate any Cisco…, When Juniper baseline is registered, Juniper CSM auto-selects only Juniper…, Client attempting to evaluate cis-cisco-iosxe on Juniper CSM is rejected with…, Client attempting to evaluate disa-stig-cisco-iosxe on Juniper CSM is rejected…, Attempting to evaluate a registered but disabled framework fails with HTTP 422., GET /api/compliance/frameworks without vendor returns all registered frameworks. (+5 more)

### Community 40 - "AIModelManager"
Cohesion: 0.12
Nodes (10): AIModelManager, Coordinates local model selection, invocation, and fail-safe degradation., Seeds initial manager state from environment variables at startup. Preserves…, Enforces loopback-only binding to prevent Server-Side Request Forgery (SSRF)., Resets active mode to AUTO and clears overrides (or re-bootstraps from…, TestSecurityBoundaries, Req 9: Loopback-only, no arbitrary models, no secrets via API response., An unlisted model must never reach urllib.request.urlopen. (+2 more)

### Community 41 - "Any"
Cohesion: 0.13
Nodes (22): post, Updates the workflow_status of an audit session. Validates that new_status is…, update_session_workflow_status(), check_session_ownership(), export_canonical_report_docx(), export_canonical_report_pdf(), finalize_audit(), FinalizeRequest (+14 more)

### Community 43 - "_create_sample_audit_ledger_entry"
Cohesion: 0.10
Nodes (22): _create_sample_audit_ledger_entry(), _create_sample_multi_framework_result(), Invariant A: Exactly ONE canonical report identity per audit record., Invariants B, C, D, E: Multiple frameworks exist inside report; verdicts and…, Invariant F: System-generated fields reject edit operations with…, Invariant N: Arbitrary field paths not in allowlist are rejected fail-closed., Invariants G, H, I, J, K: Human edits succeed, increment version, and record…, Mandatory Adjustment 3: Optimistic concurrency rejects stale edits cleanly. (+14 more)

### Community 44 - "TestApiFrameworkSelectionEndpoints"
Cohesion: 0.09
Nodes (12): Verifies API endpoints accept framework_ids, preserve identity, and stay…, POST /api/compliance/evaluate with single framework evaluates only that…, POST /api/compliance/evaluate with multiple frameworks evaluates all requested., POST /api/compliance/evaluate with duplicate framework_ids deduplicates cleanly., POST /api/compliance/evaluate with unknown framework returns 422., POST /api/compliance/evaluate with Cisco framework on Arista returns 422., POST /api/compliance/evaluate with framework_ids=[] returns 0 frameworks…, Omitting framework_ids auto-selects compatible frameworks for Cisco (CIS +… (+4 more)

### Community 45 - "test_api_rbac.py"
Cohesion: 0.11
Nodes (8): fastapi, fixture, NTRO PS26155 Auditor — Role-Based Access Control (RBAC) API Integration Tests…, reviewer_non_approver_token(), reviewer_token(), setup_db(), uploader_token(), viewer_token()

### Community 46 - "Any"
Cohesion: 0.10
Nodes (11): Any, Parses raw Juniper Junos configuration into the Common Security Model (CSM)., Evaluates Juniper baseline rules via verified juniper_auditor., Parses raw Fortinet FortiOS configuration into the Common Security Model (CSM)., Evaluates Fortinet baseline rules via verified fortinet_auditor., Parses raw Arista EOS configuration into the Common Security Model (CSM)., Evaluates Arista baseline rules via verified arista_auditor., Parses raw Palo Alto PAN-OS configuration into the Common Security Model (CSM). (+3 more)

### Community 47 - "test_docker_offline_auth.py"
Cohesion: 0.19
Nodes (18): shutil, subprocess, _is_docker_available(), _login(), NTRO PS26155 — Chunk 8 Docker Compose Deployment & Offline Authentication…, Check if Docker daemon is running and the test container services are reachable., request_json(), test_auth_login_failures() (+10 more)

### Community 48 - "TestAristaAdapterAndRegistry"
Cohesion: 0.10
Nodes (11): Verifies AristaVendorAdapter registration and detection., Verifies adapter ID, human name, and platforms., Arista is included in get_default_vendor_registry()., Explicit vendor='arista' returns AristaVendorAdapter., Auto-detection selects Arista on all 4 actual sample configurations., Arista detector returns 0.0 on Cisco configuration., Arista detector returns 0.0 on Juniper configuration., Arista detector returns 0.0 on Fortinet configuration. (+3 more)

### Community 49 - "TestFortinetParser"
Cohesion: 0.10
Nodes (11): Verifies parsing of FortiOS configuration into Common Security Model (CSM)., Parsed Fortinet CSM must conform strictly to normalized_config_schema.json., Header line #config-version extracts hardware model and OS version., Extracts SSH version, lockout limits, and telnet state accurately., Extracts NTP sync status, server IP, and authentication., Extracts remote syslog server and logging status., Extracts SNMP community strings and correctly flags weak communities., Extracts dedicated management interface and priority management IP. (+3 more)

### Community 50 - "get"
Cohesion: 0.11
Nodes (19): get, check_entry_ownership(), download_report(), get_suggestion_endpoint(), get_trusted_mapping_endpoint(), list_audit_sessions(), list_suggestions_endpoint(), list_trusted_mappings_endpoint() (+11 more)

### Community 51 - "cisco_auditor.py"
Cohesion: 0.16
Nodes (17): audit_pipeline(), eval_condition(), evaluate_rules(), main(), parse_cisco(), Cisco IOS-XE Compliance Auditor (PRD Addendum Section 4 Steps 1, 2, 3 & 4).…, Resolves a dot-delimited path (e.g. 'csm.services.call_home' or…, Evaluates generic conditions against resolved CSM field value. (+9 more)

### Community 52 - "VendorRegistry"
Cohesion: 0.11
Nodes (10): Returns all registered adapters sorted by vendor_id., Returns sorted list of registered vendor IDs., Unregisters an adapter. Returns True if removed, False if not found., Removes all registered adapters., Evaluates all registered adapters against configuration text. Selects the…, Central registry managing supported vendor adapters. Provides lookup,…, Registers a vendor adapter. Args: adapter: An instance of VendorAdapter.…, Retrieves an adapter by vendor ID. Args: vendor_id: Identifier string (e.g.… (+2 more)

### Community 53 - "create_session_for_uploader"
Cohesion: 0.11
Nodes (19): create_session_for_uploader(), Scenario 1: Audit upload assigns owner_user_id strictly from JWT sub claim., Scenario 3: Client cannot override owner_user_id via query parameters., Scenario 4: Client cannot override owner_user_id via custom headers., Scenario 6: Uploader B accessing Uploader A's session results receives 404., Scenario 7: Anti-enumeration detail is identical between non-existent and…, Scenario 14: Uploader can finalize their own session., Scenario 15: Uploader B cannot finalize Uploader A's session (returns 404). (+11 more)

### Community 54 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 55 - "FortinetBaselineEvaluator"
Cohesion: 0.14
Nodes (14): eval_condition(), evaluate_fortinet_baseline(), evaluate_rules(), FortinetBaselineEvaluator, parse_fortinet(), Any, Resolves a dot-delimited path (e.g. 'csm.services.ssh_version') in the CSM dict., Generic condition evaluator on CSM values. (+6 more)

### Community 56 - "generate_remediation"
Cohesion: 0.15
Nodes (12): generate_remediation(), Resolves rule_id to an active baseline rule id. Returns (resolved_baseline_id,…, Renders remediation for the given rule_id (baseline, CIS, or STIG). Context…, resolve_rule_to_baseline(), Verifies baseline remediation registry and CIS/STIG resolution., Registry must contain exactly 10 Cisco and 10 Junos baseline rules., Every active Cisco baseline rule resolves to non-empty remediation., Every active Junos baseline rule resolves to non-empty remediation. (+4 more)

### Community 57 - "test_arista_vendor.py"
Cohesion: 0.15
Nodes (13): FortinetVendorAdapter, Fortinet vendor adapter wrapping verified fortinet_auditor logic. Implements: -…, Determines confidence that the text represents Fortinet FortiOS configuration.…, arista_zip_configs(), clean_vendor_registry(), fixture, NTRO PS26155 — Arista EOS Vendor Integration Tests (Phase C). Comprehensive TDD…, Extracts and returns the 4 real Arista EOS configuration samples from the… (+5 more)

### Community 58 - "PaloAltoVendorAdapter"
Cohesion: 0.12
Nodes (5): PaloAltoVendorAdapter, Palo Alto Networks PAN-OS vendor adapter wrapping verified paloalto_auditor…, Determines confidence that the text represents Palo Alto PAN-OS configuration., Verifies adapter properties, registration, and deterministic detection., TestPaloAltoAdapterAndRegistry

### Community 59 - "assert_no_execution_imports"
Cohesion: 0.12
Nodes (17): assert_no_execution_imports(), Path, Performs static AST analysis asserting that no forbidden execution or…, AST code analysis asserting that no process execution or device communication…, verify_safety_no_execution(), Asserts that importing a forbidden library raises RuntimeError., Asserts that 'from forbidden import ...' raises RuntimeError., Asserts that a custom forbidden set is respected. (+9 more)

### Community 60 - "AuditLogReportScreen.tsx"
Cohesion: 0.20
Nodes (13): ApiError, exportCanonicalReportBlob(), getCanonicalReport(), notifyUnauthorized(), patchCanonicalReport(), verifyLedger(), verifyReport(), AuditLogReportScreen() (+5 more)

### Community 61 - "HardwareProfile"
Cohesion: 0.16
Nodes (9): HardwareProfile, _MEMORYSTATUSEX, probe_system_hardware(), Any, Probes system memory, CPU cores, and GPU capabilities using stdlib where…, Returns physical hardware capabilities., Checks if local Ollama daemon is reachable and responding on loopback., Returns comprehensive operational status of the AI Model Manager. (+1 more)

### Community 62 - "CrosswalkEvaluator"
Cohesion: 0.13
Nodes (12): create_iso_crosswalk_evaluator(), create_nist_crosswalk_evaluator(), CrosswalkEvaluator, detect_vendor(), Any, Evaluates normalized CSM data against applicable framework controls. Consumes…, Factory creating the NIST SP 800-53 rev5 CrosswalkEvaluator., Factory creating the ISO/IEC 27001:2022 CrosswalkEvaluator. (+4 more)

### Community 63 - "TestAristaBaselineRules"
Cohesion: 0.12
Nodes (9): Verifies deterministic evaluation of the 10 Arista baseline security rules., Verifies evaluation produces all 10 authoritative ARISTA-* rules., Hardened sample passes 9 controls, with unconfigured dynamic routing as Unknown., Intentionally weak sample fails all 9 applicable controls., Partially compliant sample has mixed Pass/Fail status., Sample EOS configuration passes routing and SSH, fails SNMP weak and ACL., 5 consecutive evaluation runs yield identical SHA-256 hashes., Arista evaluation evaluates exclusively ARISTA-* rules; zero Cisco rule leakage. (+1 more)

### Community 64 - "App.tsx"
Cohesion: 0.23
Nodes (12): clearAccessToken(), getAccessToken(), getCurrentUser(), login(), onUnauthorized(), setAccessToken(), App(), LoginScreen() (+4 more)

### Community 65 - "ModelMode"
Cohesion: 0.20
Nodes (10): ModelMode, ModelResponse, Enum, str, Validates an override model name against the strict allowlist. Returns…, Updates the active model selection mode and optional override tag. Enforces…, Determines the appropriate model tag based on operational mode, workload, and…, Enforces bounded timeouts to prevent connection pool starvation and DoS. (+2 more)

### Community 66 - "CiscoCsmFrameworkAdapter"
Cohesion: 0.14
Nodes (7): CiscoCsmFrameworkAdapter, Any, Evaluates normalized CSM data against applicable framework controls. Args: csm:…, Adapts existing Cisco IOS-XE rule evaluation to the FrameworkEvaluator…, TestCiscoCsmAdapterParity, Verify evaluating a Juniper CSM against Cisco framework adapters returns…, test_juniper_csm_against_cisco_framework()

### Community 67 - "UserIdentity"
Cohesion: 0.23
Nodes (12): submitAuditSession(), AuditWorkspace(), AuditWorkspaceProps, TAB_DISPLAY_NAMES, Navbar(), NavbarProps, RemediationDetailScreenProps, ReviewerDashboardProps (+4 more)

### Community 68 - "get_authenticated_report"
Cohesion: 0.16
Nodes (14): get_audit_report(), Retrieves an AuditReport by its report_id, including complete edit provenance…, Records a human edit to an audit report with optimistic concurrency protection.…, record_report_edit(), get_authenticated_report(), get_canonical_report(), get_canonical_report_edits(), patch_canonical_report() (+6 more)

### Community 69 - "test_api_ownership.py"
Cohesion: 0.19
Nodes (13): fixture, NTRO PS26155 Auditor — Resource Ownership & Session Isolation Tests (Chunk 5)…, Scenario 13: Remediation with non-existent session_id returns 404., Scenario 17: Finalize with non-existent session_id returns 404., Scenario 20: Direct unit testing of check_session_ownership helper semantics., reviewer_token(), setup_db(), test_check_session_ownership_direct_unit() (+5 more)

### Community 70 - "test_fortinet_vendor.py"
Cohesion: 0.21
Nodes (11): copy, clean_vendor_registry(), fixture, NTRO PS26155 — Fortinet FortiOS Vendor Integration Tests (Phase B).…, Returns a non-compliant FortiOS configuration failing multiple baseline…, Returns a minimal FortiOS config with only a header and hostname., Returns a fresh VendorRegistry with Cisco, Juniper, and Fortinet registered., Returns a hardened FortiOS configuration with all 10 baseline security controls… (+3 more)

### Community 71 - "_seed_canonical_report"
Cohesion: 0.17
Nodes (12): Seeds a session, ledger entry, and canonical report with explicit ownership., 5. Edit identity is derived strictly from authenticated JWT claim (sub)., 6. Edit history endpoint records the change with full provenance., 17. Exporting a report does not mutate report version or content., 19. Export endpoints do not invoke AI models or suggesters., 20. Uploader B cannot export Uploader A's report (404 anti-enumeration)., _seed_canonical_report(), test_cross_user_export_is_blocked() (+4 more)

### Community 72 - "TestFortinetVendorAdapter"
Cohesion: 0.17
Nodes (7): Verifies FortinetVendorAdapter registration, lookup, and detection., Fortinet adapter must be pre-registered in get_default_vendor_registry()., Explicit vendor='fortinet' bypasses auto-detection and returns Fortinet adapter., Auto-detection without vendor parameter reliably selects Fortinet., Fortinet detector returns 0.0 on Cisco and Junos configs., Non-network or unrecognized configuration raises UndeterminedVendorError., TestFortinetVendorAdapter

### Community 73 - "TestCrosswalkVendorIsolationAndFailSoft"
Cohesion: 0.17
Nodes (7): Verifies that Fortinet, Arista, and unknown vendors never inherit Cisco…, Cisco CSM evaluates NIST and ISO with mapped Cisco baseline rules., Juniper CSM evaluates NIST and ISO with mapped Juniper baseline rules., Fortinet CSM yields NOT_ASSESSED for all controls under crosswalk frameworks., Arista CSM yields NOT_ASSESSED for all controls under crosswalk frameworks., Unknown vendor config yields NOT_ASSESSED for all crosswalk controls., TestCrosswalkVendorIsolationAndFailSoft

### Community 74 - "TestFailureHandlingFallbacks"
Cohesion: 0.24
Nodes (4): patch, Req 8: All failure modes produce deterministic fallback, never PASS/FAIL…, Invalid override must fall back before any network call., TestFailureHandlingFallbacks

### Community 75 - "BaseModel"
Cohesion: 0.20
Nodes (11): BaseModel, ai_suggest(), FrameworkMetadataResponse, FrameworksListResponse, get_me(), list_compliance_frameworks(), Returns list of registered deterministic compliance frameworks with metadata…, Returns the sanitized identity of the authenticated user. Extracts identity… (+3 more)

### Community 76 - "ref_node_assert_strict"
Cohesion: 0.25
Nodes (8): mockSessionStorage, reviewerDashboardContent, sessionStorageStore, mockSessionStorage, sessionStorageStore, ref_node_assert_strict, ref_node_fs, ref_node_path

### Community 77 - "_OOXMLBuilder"
Cohesion: 0.29
Nodes (3): _OOXMLBuilder, Constructs standards-compliant Office Open XML (.docx) packages using Python…, Adds a styled table with borders, header shading, and formatted cells.

### Community 78 - "test_api_reports.py"
Cohesion: 0.25
Nodes (10): clean_test_db(), fixture, NTRO PS26155 — Canonical Report API & Authorization Verification Suite (Phase…, 2. Unauthenticated request without JWT is rejected with HTTP 401., Provides an isolated database for each test to prevent contamination., reviewer_token(), test_unauthenticated_request_is_rejected(), uploader_a_token() (+2 more)

### Community 79 - "TestAutoModeSelection"
Cohesion: 0.29
Nodes (3): Req 1 & 3: Auto mode hardware-aware routing., Auto selection is irrelevant when Ollama is down — generate() always falls back., TestAutoModeSelection

### Community 80 - "TestComplianceAuthorityInvariant"
Cohesion: 0.18
Nodes (5): Req 8 & invariant: No AI failure may become a compliance PASS/FAIL decision. AI…, Fallback text is always the caller-supplied string, never 'PASS' or 'FAIL'., DETERMINISTIC_MODEL must be in the allowlist so it cannot be smuggled as…, The spec-required model set must exactly match the allowlist keys., TestComplianceAuthorityInvariant

### Community 81 - "test_frontend_upload_frameworks.mjs"
Cohesion: 0.22
Nodes (5): localStorageStore, MockFormData, mockLocalStorage, mockSessionStorage, sessionStorageStore

### Community 82 - "verify_api_safety_no_execution"
Cohesion: 0.20
Nodes (8): Path, AST code analysis asserting that no process execution or device communication…, verify_api_safety_no_execution(), Verifies that the API layer maintains clean boundaries and zero execution…, Asserts main.py passes execution-free AST safety checks., Verifies that all Phase 3 compliance modules contain zero process/socket…, TestComplianceSecurityASTInvariants, test_no_external_jwt_dependency_and_ast_safety()

### Community 83 - "TestDeviceIdentityGap"
Cohesion: 0.20
Nodes (6): Verifies metadata extraction, preferred management IP, and Not In Config…, Extracts hardware_model, serial_number, os_version, and preferred Loopback0 IP., When hardware details are absent from config, fields remain None in CSM., Extracts Junos model, serial, version, and preferred fxp0 management IP., When hardware details are absent, fields remain None in CSM., TestDeviceIdentityGap

### Community 84 - "TestFortinetRealWorldCSM"
Cohesion: 0.20
Nodes (6): Verifies parsing and CSM normalization on the 3 real-world Fortinet configs., Validates CSM normalization of the Azure reference template., Validates CSM normalization of the IBM user_data configuration., Validates CSM normalization of the GCP HA reference configuration., Verifies that non-management sections (sdn-connector, router static, system ha)…, TestFortinetRealWorldCSM

### Community 85 - "TestFortinetBaselineRules"
Cohesion: 0.20
Nodes (6): Verifies deterministic evaluation of the 10 Fortinet baseline security rules., Hardened sample config passes all 10 Fortinet baseline rules., Insecure config fails SSH, Telnet, SNMP, and NTP rules., Evaluation produces 100% bitwise identical hashes across 5 consecutive runs., Fortinet compliance evaluation evaluates only FORTINET rules; zero CISCO rules., TestFortinetBaselineRules

### Community 86 - "TestAstSafetyAndDbProtection"
Cohesion: 0.20
Nodes (6): Verifies AST safety and non-interference with production data/auditor.db., Asserts zero execution imports in compliance_aggregator.py., Asserts zero execution imports in compliance_framework.py., Tests _parse_framework_ids against list, json string, comma-separated string,…, Guarantees production database is not modified by test execution., TestAstSafetyAndDbProtection

### Community 87 - "TestInvalidModelRejection"
Cohesion: 0.20
Nodes (3): Req 6: Reject unsupported model names — no arbitrary model execution., Passing an unlisted model string directly to generate() must also fall back., TestInvalidModelRejection

### Community 88 - "compute_entry_hash"
Cohesion: 0.22
Nodes (8): compute_entry_hash(), Computes SHA256 over canonical JSON of all entry fields excluding entryHash and…, generate_pdf_report(), Path, Reads embedded hash from PDF document and validates against audit_log.jsonl., Renders comprehensive PDF report with embedded hash and QR verification code., verify_report_hash(), Pre-change reports without hardware_model verify identically and hardware_model…

### Community 89 - "ReportError"
Cohesion: 0.22
Nodes (9): DuplicateReportError, Exception, Base exception for audit report domain errors., Raised when an edit is submitted with an expected_version that does not match…, Raised when a requested report ID or audit_entry_id does not exist., Raised when attempting to create a second canonical report for an audit record., ReportError, ReportNotFoundError (+1 more)

### Community 92 - "AuditResultsScreen.tsx"
Cohesion: 0.36
Nodes (7): evaluateCompliance(), getAuditResults(), getComplianceFrameworks(), AuditResultsScreen(), AuditResultsScreenProps, FrameworkSummaryItem, MultiFrameworkAuditResult

### Community 93 - "test_frontend_compliance_frameworks.mjs"
Cohesion: 0.25
Nodes (7): localStorageStore, mockLocalStorage, mockSessionStorage, SAMPLE_CISCO_FRAMEWORKS, SAMPLE_EVALUATION_RESULT, SAMPLE_JUNIPER_FRAMEWORKS, sessionStorageStore

### Community 94 - "test_frontend_rbac_workflow.mjs"
Cohesion: 0.25
Nodes (7): apiContent, appContent, auditsScreenContent, navbarContent, reviewerDashboardContent, typesContent, workspaceContent

### Community 95 - "test_api_compliance.py"
Cohesion: 0.39
Nodes (7): fixture, NTRO PS26155 — Multi-Framework Compliance REST API Tests (Phase 3A.5).…, reviewer_token(), setup_environment(), uploader_a_token(), uploader_b_token(), viewer_token()

### Community 97 - "TestAristaFrameworkAndIsolation"
Cohesion: 0.25
Nodes (5): Verifies FrameworkRegistry integration and cross-vendor isolation., Registers arista-eos-baseline in FrameworkRegistry., Evaluating Cisco CSM with Arista evaluator returns UNKNOWN for all rules., Evaluating Fortinet CSM with Arista evaluator returns UNKNOWN for all rules., TestAristaFrameworkAndIsolation

### Community 98 - "TestFortinetDatasetDiscovery"
Cohesion: 0.25
Nodes (5): Verifies files match SHA256SUMS.json inside the archive., Verifies presence, manifest integrity, and structure of the real-world Fortinet…, Asserts that SIH26155_Fortinet_FortiGate_RealWorld_PublicDataset_v1.zip exists., Validates all 3 expected configuration files exist in the zip., TestFortinetDatasetDiscovery

### Community 99 - "TestFortinetFrameworkEvaluator"
Cohesion: 0.25
Nodes (5): Verifies FortinetBaselineEvaluator and cross-vendor isolation., Registers fortinet-fortios-baseline in FrameworkRegistry., Evaluating Cisco CSM with Fortinet evaluator returns UNKNOWN for all rules., Asserts zero execution imports (subprocess, socket, paramiko) in…, TestFortinetFrameworkEvaluator

### Community 100 - "TestPaloAltoDatasetDiscovery"
Cohesion: 0.25
Nodes (5): Verifies presence, manifest integrity, and structure of the real-world PAN-OS…, Asserts that SIH26155_PaloAlto_PANOS_RealWorld_PublicDataset_v1.zip exists., Validates all expected files exist in the zip., Verifies files match SHA256SUMS.json inside the archive., TestPaloAltoDatasetDiscovery

### Community 102 - "test_frontend_model_manager.mjs"
Cohesion: 0.29
Nodes (6): localStorageStore, mockLocalStorage, mockSessionStorage, SAMPLE_STATUS_OFFLINE, SAMPLE_STATUS_ONLINE, sessionStorageStore

### Community 103 - "TestComplianceEvaluateOwnershipIsolation"
Cohesion: 0.33
Nodes (3): create_uploaded_session(), Verifies strict resource ownership enforcement on session-backed evaluations., TestComplianceEvaluateOwnershipIsolation

### Community 105 - "fixture"
Cohesion: 0.29
Nodes (7): fixture, Ensures test isolation by resetting model manager mode between tests., reset_model_manager_state(), reviewer_non_approver_token(), reviewer_token(), uploader_token(), viewer_token()

### Community 106 - "ref_node_test"
Cohesion: 0.33
Nodes (5): localStorageStore, mockLocalStorage, mockSessionStorage, sessionStorageStore, ref_node_test

### Community 107 - "set_model_mode"
Cohesion: 0.33
Nodes (6): get_model_manager(), get_model_status(), ModelModeRequest, Updates the operational model mode (fast, quality, auto, override). Strictly…, Returns operational status of the AI Model Manager, hardware capabilities, and…, set_model_mode()

### Community 109 - "TestAristaSampleDiscovery"
Cohesion: 0.33
Nodes (4): Verifies presence and discovery of real Arista EOS configuration files., Asserts that datasets/Arista/Arista_EOS_Samples.zip exists., Discovers and validates all 4 expected configuration samples., TestAristaSampleDiscovery

### Community 110 - "TestAristaAstAndDbSafety"
Cohesion: 0.33
Nodes (4): Guarantees zero execution imports and database protection., Asserts zero execution imports (subprocess, socket, paramiko) in…, Asserts production database is not modified., TestAristaAstAndDbSafety

### Community 111 - "TestAristaApiIngestion"
Cohesion: 0.33
Nodes (4): Verifies /api/audit/upload end-to-end with Arista configuration., POST /api/audit/upload with vendor='arista' parses and evaluates cleanly., POST /api/audit/upload with vendor='auto' auto-detects Arista., TestAristaApiIngestion

### Community 113 - "TestReportExportCompliance"
Cohesion: 0.33
Nodes (4): Verifies PDF and DOCX export rendering of device identity and Not In Config…, PDF report renders model, serial, and 'Not In Config' when missing., DOCX report renders model, serial, and 'Not In Config' when missing., TestReportExportCompliance

### Community 114 - "TestDisaStigEvaluationParity"
Cohesion: 0.33
Nodes (3): fixture, Tests 1:1 evaluation parity against cisco_auditor.py on labeled_test_config.txt., TestDisaStigEvaluationParity

### Community 115 - "TestFortinetRealWorldBaselineRules"
Cohesion: 0.33
Nodes (4): Verifies evaluation of the 10 baseline rules on real-world configurations., Verifies all 10 baseline rules evaluate to Pass, Fail, or Unknown (never crash)., Verifies identical inputs produce identical hashes across 5 evaluation runs., TestFortinetRealWorldBaselineRules

### Community 116 - "TestFortinetRealWorldAdapter"
Cohesion: 0.33
Nodes (4): Verifies vendor adapter detection and cross-vendor protection with the real-…, Verifies clean_vendor_registry.detect() correctly identifies all 3 real-world…, Verifies Cisco, Juniper, Arista, and Palo Alto adapters reject Fortinet configs., TestFortinetRealWorldAdapter

### Community 117 - "TestFortinetRealWorldApiIngestion"
Cohesion: 0.33
Nodes (4): Verifies end-to-end API upload with real-world Fortinet configurations., POST /api/audit/upload with explicit vendor='fortinet' succeeds., POST /api/audit/upload with vendor='auto' correctly detects Fortinet., TestFortinetRealWorldApiIngestion

### Community 118 - "TestFortinetApiIngestion"
Cohesion: 0.33
Nodes (4): Verifies /api/audit/upload end-to-end with Fortinet configuration., POST /api/audit/upload with vendor='fortinet' successfully parses and evaluates., POST /api/audit/upload with vendor='auto' auto-detects Fortinet., TestFortinetApiIngestion

### Community 123 - "require_role"
Cohesion: 0.40
Nodes (4): anyio, FastAPI dependency factory enforcing Role-Based Access Control (RBAC). Consumes…, require_role(), test_require_role_rejects_unknown_roles()

### Community 124 - "delete_trusted_mapping_endpoint"
Cohesion: 0.40
Nodes (5): delete, delete_trusted_mapping(), Deletes/retires a trusted mapping by vendor_rule_id. Returns True if deleted,…, delete_trusted_mapping_endpoint(), Deletes/retires a trusted rule mapping from the Trusted Rule Library. Strictly…

### Community 125 - "test_frontend_auth.mjs"
Cohesion: 0.40
Nodes (4): localStorageStore, mockLocalStorage, mockSessionStorage, sessionStorageStore

### Community 126 - "check_report_ownership"
Cohesion: 0.40
Nodes (5): get_session(), check_report_ownership(), get_canonical_report_by_entry(), Retrieves the canonical AuditReport for a given audit ledger entry_id. Allows…, Enforces audit report resource isolation and anti-enumeration. Reviewers and…

### Community 129 - "TestComplianceAggregatorStaticSecurityInvariants"
Cohesion: 0.40
Nodes (3): Static AST analysis ensuring compliance_aggregator.py contains zero unsafe…, Verifies that compliance_aggregator.py contains zero vendor branching or…, TestComplianceAggregatorStaticSecurityInvariants

### Community 130 - "clean_export_dir"
Cohesion: 0.40
Nodes (5): clean_export_dir(), clean_test_db(), fixture, Provides a sterile, isolated export directory for each test run., Provides an isolated database for verifying database/ledger non-mutation.

## Knowledge Gaps
- **103 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1330 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ComplianceStatus` connect `ComplianceStatus` to `EvaluationResult`, `test_paloalto_vendor.py`, `compliance_framework.py`, `get_default_registry`, `test_juniper_vendor.py`, `audit_report.py`, `test_vendor_foundation.py`, `TestDisaStigControlEvaluatorUnit`, `TestCisControlEvaluatorUnit`, `AristaBaselineEvaluator`, `paloalto_auditor.py`, `_create_sample_audit_ledger_entry`, `FortinetBaselineEvaluator`, `test_arista_vendor.py`, `CrosswalkEvaluator`, `CiscoCsmFrameworkAdapter`, `test_fortinet_vendor.py`, `TestCrosswalkVendorIsolationAndFailSoft`, `TestAristaFrameworkAndIsolation`, `TestFortinetFrameworkEvaluator`, `TestDisaStigEvaluationParity`, `TestFortinetRealWorldBaselineRules`, `TestPaloAltoBaselineRules`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `FrameworkRegistry` connect `FrameworkRegistry` to `TestAristaFrameworkAndIsolation`, `test_paloalto_vendor.py`, `TestFortinetFrameworkEvaluator`, `compliance_framework.py`, `get_default_registry`, `paloalto_auditor.py`, `test_fortinet_vendor.py`, `run_evaluation`, `test_juniper_vendor.py`, `ComplianceStatus`, `test_arista_vendor.py`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `EvaluationResult` connect `EvaluationResult` to `CiscoCsmFrameworkAdapter`, `compliance_framework.py`, `.aggregate`, `paloalto_auditor.py`, `audit_report.py`, `ComplianceStatus`, `_create_sample_audit_ledger_entry`, `test_vendor_foundation.py`, `FortinetBaselineEvaluator`, `AristaBaselineEvaluator`, `CrosswalkEvaluator`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `EvaluationResult` (e.g. with `AristaBaselineEvaluator` and `CisCiscoIosXeEvaluator`) actually correct?**
  _`EvaluationResult` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `FrameworkRegistry` (e.g. with `register_arista_baseline()` and `register_cis_cisco_iosxe()`) actually correct?**
  _`FrameworkRegistry` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `ComplianceStatus` (e.g. with `AristaBaselineEvaluator` and `CisCiscoIosXeEvaluator`) actually correct?**
  _`ComplianceStatus` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Evidence` (e.g. with `AristaBaselineEvaluator` and `CisCiscoIosXeEvaluator`) actually correct?**
  _`Evidence` has 19 INFERRED edges - model-reasoned connections that need verification._