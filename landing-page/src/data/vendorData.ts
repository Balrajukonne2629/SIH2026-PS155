// NTRO PS26155 — Vendor Architecture & Framework Integration Data
// Verified against src/vendor_registry.py and src/compliance_framework.py
// Explicitly distinguishes Verified Production vs. Registered Adapter Architectures

export type VendorMaturity = "Verified Production" | "Registered Adapter" | "Extensibility Architecture";

export interface VendorArchitectureInfo {
  id: string;
  name: string;
  osName: string;
  maturity: VendorMaturity;
  maturityBadgeClass: string;
  parserType: string;
  sampleDataset: string;
  baselineRulesCount: number;
  frameworksSupported: string[];
  capabilities: string[];
  evidenceSummary: string;
}

export const VENDOR_ARCHITECTURES: VendorArchitectureInfo[] = [
  {
    id: "cisco",
    name: "Cisco Systems",
    osName: "Cisco IOS-XE",
    maturity: "Verified Production",
    maturityBadgeClass: "bg-emerald-950/70 text-emerald-300 border-emerald-700/60",
    parserType: "Hierarchical Section Tokenizer & Regex Normalizer (AST-Safe)",
    sampleDataset: "sample-cisco.conf (Running Config with AAA, SSH, NTP, ACL)",
    baselineRulesCount: 10,
    frameworksSupported: [
      "CIS Cisco IOS XE 17.x Benchmark (v2.2.1) — 7 Controls",
      "DISA STIG Cisco IOS XE Router NDM (V3R7) — 10 Controls",
      "Cisco IOS-XE Baseline Standard (v1.0) — 10 Rules",
      "NIST SP 800-53 rev5 Crosswalk — 8 Controls",
      "ISO/IEC 27001:2022 Crosswalk — 7 Controls"
    ],
    capabilities: [
      "Full parsing of global services, interfaces, AAA, logging, NTP, SNMP, ACLs, and routing",
      "Automatic detection of Cisco IOS-XE syntax signatures",
      "Comprehensive remediation template registry with Jinja2 parameterization",
      "Dynamic trusted rule evaluation via generic condition engine"
    ],
    evidenceSummary: "Fully verified across 17-stage CLI loop (test_step5_full_loop.py) and 11-stage API full-loop (test_api_full_loop.py). Passed all 5 determinism runs with bitwise identical hashes."
  },
  {
    id: "juniper",
    name: "Juniper Networks",
    osName: "Juniper Junos",
    maturity: "Verified Production",
    maturityBadgeClass: "bg-emerald-950/70 text-emerald-300 border-emerald-700/60",
    parserType: "Hierarchical Junos { ... } & Flat 'set ...' Dual-Syntax Parser",
    sampleDataset: "sample-juniper.conf (Junos Hierarchy with System, Interfaces, Protocols)",
    baselineRulesCount: 10,
    frameworksSupported: [
      "Juniper Junos Baseline Security Standard (v1.0) — 10 Rules",
      "NIST SP 800-53 rev5 Crosswalk — 8 Controls",
      "ISO/IEC 27001:2022 Crosswalk — 7 Controls"
    ],
    capabilities: [
      "Supports both curly-brace hierarchical configurations and flat 'set' commands",
      "Normalizes SSH limits, centralized AAA order, NTP keys, and firewall filters into CSM",
      "Strict vendor isolation: non-Junos configurations fail soft without cross-vendor pollution",
      "Complete Jinja2 CLI remediation templates for all 10 Junos baseline rules"
    ],
    evidenceSummary: "Verified in test_juniper_vendor.py (35 tests) and offline verification script (VERIFY-OFFLINE.bat). Normalizes real-world Junos configs into canonical CSM schema."
  },
  {
    id: "arista",
    name: "Arista Networks",
    osName: "Arista EOS",
    maturity: "Registered Adapter",
    maturityBadgeClass: "bg-sky-950/70 text-sky-300 border-sky-700/60",
    parserType: "EOS Contextual Parser & Indentation Normalizer",
    sampleDataset: "sample-arista.conf (Arista EOS running-config sample)",
    baselineRulesCount: 10,
    frameworksSupported: [
      "Arista EOS Baseline Security Standard (v1.0) — 10 Rules",
      "Vendor-Neutral CSM Normalization"
    ],
    capabilities: [
      "Registered in VendorRegistry via AristaVendorAdapter",
      "AST-safe parsing of management security, AAA, NTP, and VRF constructs",
      "Grounding against vendor_rule_mapping.json specifications (ARISTA-SSH-001 to ARISTA-MGMT-001)",
      "Reuses Cisco-like EOS syntax patterns while maintaining independent vendor isolation"
    ],
    evidenceSummary: "Registered in src/vendor_registry.py and verified in tests/test_arista_vendor.py. Adapter registered; GUI workflow integration on development roadmap."
  },
  {
    id: "fortinet",
    name: "Fortinet",
    osName: "Fortinet FortiOS",
    maturity: "Registered Adapter",
    maturityBadgeClass: "bg-sky-950/70 text-sky-300 border-sky-700/60",
    parserType: "FortiOS 'config ... end' Block Parser",
    sampleDataset: "Sample FortiOS configuration constructs",
    baselineRulesCount: 10,
    frameworksSupported: [
      "Fortinet FortiOS Baseline Security Standard (v1.0) — 10 Rules",
      "Vendor-Neutral CSM Normalization"
    ],
    capabilities: [
      "Registered in VendorRegistry via FortinetVendorAdapter",
      "Parses FortiOS config-system-global, admin settings, and interface zones into CSM",
      "Evaluates 10 baseline rules (FORTINET-SSH-001 to FORTINET-MGMT-001)",
      "Extensible plug-and-play architecture requires zero core compliance engine modifications"
    ],
    evidenceSummary: "Registered in src/vendor_registry.py and verified in tests/test_fortinet_vendor.py. Demonstrates modular vendor extensibility without engine branching."
  }
];

export interface FrameworkInfo {
  id: string;
  name: string;
  version: string;
  scope: string;
  controlCount: number;
  description: string;
  verificationMethod: string;
}

export const REGISTERED_FRAMEWORKS: FrameworkInfo[] = [
  {
    id: "cis-cisco-iosxe",
    name: "CIS Cisco IOS XE 17.x Benchmark",
    version: "v2.2.1",
    scope: "Cisco IOS-XE",
    controlCount: 7,
    description: "Prescriptive Center for Internet Security baseline establishing secure configuration posture for enterprise routers and switches.",
    verificationMethod: "Deterministic Python evaluations against normalized CSM services, AAA, logging, and NTP."
  },
  {
    id: "disa-stig-cisco-iosxe",
    name: "DISA STIG Cisco IOS XE Benchmark",
    version: "V3R7",
    scope: "Cisco IOS-XE",
    controlCount: 10,
    description: "Defense Information Systems Agency (DISA) Security Technical Implementation Guide establishing Department of Defense requirements.",
    verificationMethod: "Deterministic evaluation of Vuln IDs (V-215702 to V-215711) with evidence preservation."
  },
  {
    id: "nist-sp-800-53-rev5",
    name: "NIST SP 800-53 Revision 5",
    version: "rev5",
    scope: "Vendor-Neutral Crosswalk",
    controlCount: 8,
    description: "National Institute of Standards and Technology security and privacy controls catalog mapped via DoD Control Correlation Identifiers (CCIs).",
    verificationMethod: "Generic CrosswalkEvaluator roll-up mapping underlying vendor baseline checks to NIST control families."
  },
  {
    id: "iso-iec-27001-2022",
    name: "ISO/IEC 27001:2022 Annex A",
    version: "2022",
    scope: "Vendor-Neutral Crosswalk",
    controlCount: 7,
    description: "International standard for information security management systems mapped to network access, logging, and segregation.",
    verificationMethod: "Generic CrosswalkEvaluator roll-up mapping vendor rules to Annex A security clauses (A.5.15 to A.8.26)."
  },
  {
    id: "cisco-ios-xe-baseline",
    name: "Cisco IOS-XE Baseline Standard",
    version: "1.0",
    scope: "Cisco IOS-XE",
    controlCount: 10,
    description: "Deterministic foundational baseline covering SSHv2, AAA new-model, remote logging, authenticated NTP, and management VRF.",
    verificationMethod: "Direct deterministic evaluator in src/cisco_auditor.py."
  },
  {
    id: "juniper-junos-baseline",
    name: "Juniper Junos Baseline Standard",
    version: "1.0",
    scope: "Juniper Junos",
    controlCount: 10,
    description: "Deterministic baseline covering Junos system services, login classes, authentication order, NTP, and lo0 firewall filters.",
    verificationMethod: "Direct deterministic evaluator in src/juniper_auditor.py."
  },
  {
    id: "arista-eos-baseline",
    name: "Arista EOS Baseline Standard",
    version: "1.0",
    scope: "Arista EOS",
    controlCount: 10,
    description: "Deterministic baseline covering EOS management protocols, local users, logging, and control-plane protection.",
    verificationMethod: "Direct deterministic evaluator in src/arista_auditor.py."
  },
  {
    id: "fortinet-fortios-baseline",
    name: "Fortinet FortiOS Baseline Standard",
    version: "1.0",
    scope: "Fortinet FortiOS",
    controlCount: 10,
    description: "Deterministic baseline covering FortiOS administrative access, encrypted passwords, and logging configurations.",
    verificationMethod: "Direct deterministic evaluator in src/fortinet_auditor.py."
  }
];
