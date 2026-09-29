import React, { useState, useEffect, useRef } from 'react';
import { uploadAuditConfig, getLedger, getComplianceFrameworks } from '../api';
import { formatToIST } from '../utils';
import { UserIdentity, FrameworkMetadataItem, AuditLedgerItem } from '../types';

interface UploadScreenProps {
  onAuditStarted: (sessionId: string, initialResults: any) => void;
  onNavigateToLedger: () => void;
  currentUser?: UserIdentity | null;
}

const SAMPLE_CISCO = `! Labeled Reference Configuration - Cisco IOS-XE
hostname EDGE-RTR-01
vrf definition Mgmt-intf
 description Dedicated Management Network
 address-family ipv4
 exit-address-family
aaa new-model
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
aaa accounting exec default start-stop group tacacs+
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
service timestamps log datetime msec
logging buffered 64000
logging trap informational
logging host 10.10.10.50
ntp server 192.168.100.1
no ntp authenticate
snmp-server community public RO
ip access-list standard MGMT-ACCESS
 permit 10.10.0.0 0.0.255.255
 deny any
interface GigabitEthernet0/0/0
 description WAN-Uplink
 ip address 192.0.2.1 255.255.255.252
 no shutdown
interface GigabitEthernet0/0/1
 description Unused-Interface-1
 shutdown
interface GigabitEthernet0
 description Out-of-Band Management
 vrf forwarding Mgmt-intf
 ip address 10.255.255.1 255.255.255.0
 no shutdown
router bgp 65000
 neighbor 192.0.2.2 remote-as 65000
 neighbor 192.0.2.2 password 7 BGPSecretAuthKey123!
ip http access-class MGMT-ACCESS
line vty 0 4
 access-class MGMT-ACCESS in
 transport input ssh
 login authentication default
service call-home
end`;

const SAMPLE_JUNIPER = `/* Synthetic Junos configuration for lab testing */
system {
    host-name lab-junos-router;
    services {
        ssh {
            protocol-version v2;
        }
    }
    login {
        user netadmin {
            uid 2000;
            class super-user;
            authentication {
                encrypted-password "$6$REDACTED_HASH_VALUE";
            }
        }
    }
    ntp {
        server 192.0.2.10;
        server 192.0.2.11;
    }
    syslog {
        host 192.0.2.50 {
            any info;
        }
        time-format millisecond;
    }
}
interfaces {
    ge-0/0/0 {
        description "Uplink to core switch";
        unit 0 {
            family inet {
                address 192.0.2.1/30;
            }
        }
    }
    ge-0/0/1 {
        description "Internal LAN";
        disable;
    }
}
snmp {
    community SecOps-RO {
        authorization read-only;
        clients {
            192.0.2.0/24;
        }
    }
}`;

const SAMPLE_FORTINET = `#config-version=FG60E-7.2.4-FW-build1396-230309:opmode=0:vdommode=0:user=admin
config system global
    set hostname "CORP-FORTIGATE-01"
    set timezone 04
    set admin-ssh-port 22
    set admin-ssh-v1 disable
    set admin-telnet disable
    set admin-lockout-threshold 3
    set admin-lockout-duration 600
end
config system interface
    edit "mgmt1"
        set vdom "root"
        set ip 10.10.10.1 255.255.255.0
        set allowaccess ping https ssh snmp
        set type physical
        set dedicated-to management
    next
    edit "port1"
        set vdom "root"
        set status down
        set description "Unused interface"
    next
end
config system ntp
    set ntpsync enable
    set type custom
    set syncinterval 60
    set authentication enable
    config ntpserver
        edit 1
            set server "192.168.1.10"
            set authentication enable
            set key-id 1
        next
    end
end
config log syslogd setting
    set status enable
    set server "10.0.0.50"
    set mode udp
    set port 514
    set facility local7
end
config system snmp community
    edit 1
        set name "SecOps-ReadOnly-Str0ngKey"
        set query-v1-status disable
        set query-v2c-status enable
    next
end
config user tacacs+
    edit "TACACS-SRV-1"
        set server "10.0.0.20"
        set key "SecretTacacsKey"
    next
end
config system admin
    edit "admin"
        set trusthost1 10.0.0.0 255.255.255.0
        set accprofile "super_admin"
        set password-policy enable
    next
end
config system password-policy
    set status enable
    set min-length 14
    set expire-status enable
end`;

const SAMPLE_ARISTA = `!
! Arista EOS - Secure Reference Configuration
!
hostname ARISTA-SECURE-LAB
!
username auditadmin privilege 15 role network-admin secret 0 CHANGE_ME_LAB_SECRET
!
aaa authentication login default local
aaa authorization exec default local
!
management ssh
   authentication protocol public-key keyboard-interactive
!
ntp server 192.0.2.123
!
logging buffered informational
logging console warnings
!
snmp-server community PUBLIC-READONLY ro
!
interface Management1
   description Dedicated management interface
   vrf MGMT
   ip address 192.0.2.10/24
   no shutdown
!
interface Ethernet1
   description User access port
   switchport mode access
   switchport access vlan 10
   no shutdown
!
interface Ethernet2
   description Infrastructure uplink
   shutdown
!
ip access-list standard MGMT-ACCESS
   permit 192.0.2.0/24
!
end`;

const SAMPLE_PALOALTO = `set deviceconfig system hostname PA-VM-SECURE
set deviceconfig system ip-address 192.168.1.10 netmask 255.255.255.0 default-gateway 192.168.1.1
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system ntp-servers primary-ntp-server ntp-server-address 192.0.2.10
set shared log-settings syslog Syslog-Server server 10.0.0.50
set shared server-profile netflow NetFlow-Profile server 10.0.0.60
set network virtual-router default protocol bgp enable yes
set rulebase security rules Allow-Mgmt action allow`;

export const VENDOR_OPTIONS = [
  { id: 'auto', label: 'Auto Detect', badge: 'Deterministic' },
  { id: 'cisco', label: 'Cisco IOS-XE', badge: 'Cisco' },
  { id: 'juniper', label: 'Juniper Junos', badge: 'Juniper' },
  { id: 'fortinet', label: 'Fortinet FortiOS', badge: 'Fortinet' },
  { id: 'arista', label: 'Arista EOS', badge: 'Arista' },
  { id: 'paloalto', label: 'Palo Alto PAN-OS', badge: 'Palo Alto' },
] as const;

export type VendorId = typeof VENDOR_OPTIONS[number]['id'];

interface VendorCardInfo {
  id: VendorId;
  name: string;
  platform: string;
  badge: string;
  badgeType: 'auto' | 'supported';
  description: string;
  syntaxClues: string;
}

const VENDOR_CARDS: VendorCardInfo[] = [
  {
    id: 'auto',
    name: 'Auto Detect',
    platform: 'Syntactic Heuristic',
    badge: 'Deterministic',
    badgeType: 'auto',
    description: 'Infers target platform from syntax tokens, block structure, and header clues.',
    syntaxClues: 'Header sniff / CLI grammar match',
  },
  {
    id: 'cisco',
    name: 'Cisco Systems',
    platform: 'IOS / IOS-XE',
    badge: 'Active Adapter',
    badgeType: 'supported',
    description: 'Modular enterprise CLI, VRF isolation, AAA models, and management access-lists.',
    syntaxClues: 'hostname, vrf definition, aaa new-model',
  },
  {
    id: 'juniper',
    name: 'Juniper Networks',
    platform: 'Junos',
    badge: 'Active Adapter',
    badgeType: 'supported',
    description: 'Hierarchical brace & set syntax, firewall filters, and secure routing engines.',
    syntaxClues: 'system { ... } or set system ...',
  },
  {
    id: 'fortinet',
    name: 'Fortinet',
    platform: 'FortiOS',
    badge: 'Active Adapter',
    badgeType: 'supported',
    description: 'FortiGate NGFW, VDOM segmentation, admin lockout, custom NTP & syslog.',
    syntaxClues: 'config system global ... end',
  },
  {
    id: 'arista',
    name: 'Arista Networks',
    platform: 'EOS',
    badge: 'Active Adapter',
    badgeType: 'supported',
    description: 'Extensible Operating System, management SSH, switchport mode & STP guards.',
    syntaxClues: 'management ssh, switchport, role network-admin',
  },
  {
    id: 'paloalto',
    name: 'Palo Alto Networks',
    platform: 'PAN-OS',
    badge: 'Active Adapter',
    badgeType: 'supported',
    description: 'PAN-OS NGFW, deviceconfig CLI, security rulebase policies, server profiles.',
    syntaxClues: 'set deviceconfig system, set rulebase security',
  },
];

const AUDIT_STAGES = [
  { step: 1, label: 'Configuration Payload Received', detail: 'Payload buffered; SHA-256 digest computed' },
  { step: 2, label: 'Target Vendor Boundary Isolated', detail: 'Authoritative selection applied or heuristic confirmed' },
  { step: 3, label: 'AST Parsed & Normalized to CSM', detail: 'Device attributes, interfaces, services & ACLs extracted' },
  { step: 4, label: 'Vendor Baseline Rules Evaluated', detail: '10 core security controls evaluated deterministically' },
  { step: 5, label: 'Regulatory Frameworks Scoped', detail: 'CIS, DISA STIG, NIST, and ISO compliance calculated' },
  { step: 6, label: 'Evidence Traces & Directives Indexed', detail: 'Source lines, rationales & expected states bound' },
  { step: 7, label: 'Cryptographic Ledger Finalized', detail: 'Non-repudiation entry hashed into audit_log.jsonl' },
];

export function detectVendorFromContent(content: string): 'cisco' | 'juniper' | 'fortinet' | 'arista' | 'paloalto' {
  if (!content) return 'cisco';
  if (content.includes('#config-version') || (content.includes('config system') && content.includes('end'))) {
    return 'fortinet';
  }
  if (content.includes('system {') || content.includes('apply-groups') || (content.includes('set system ') && !content.includes('hostname'))) {
    return 'juniper';
  }
  if (content.includes('management ssh') || content.includes('management api') || (content.includes('role network-admin') && content.includes('switchport'))) {
    return 'arista';
  }
  if (content.includes('deviceconfig system') || content.includes('panos') || content.includes('rulebase security') || content.includes('paloaltonetworks')) {
    return 'paloalto';
  }
  return 'cisco';
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onAuditStarted,
  onNavigateToLedger,
  currentUser,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('labeled_cisco_config.txt');
  const [fileContent, setFileContent] = useState<string>(SAMPLE_CISCO);
  const [fileObject, setFileObject] = useState<File | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number>(SAMPLE_CISCO.length);
  const [showRawEditor, setShowRawEditor] = useState(false);

  // Vendor & Framework Selection
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('auto');
  const [availableFrameworks, setAvailableFrameworks] = useState<FrameworkMetadataItem[]>([]);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);
  const [isLoadingFrameworks, setIsLoadingFrameworks] = useState(false);
  const [frameworksError, setFrameworksError] = useState<string | null>(null);

  // Async States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Recent Audits from Real Ledger (GET /api/ledger)
  const [ledgerEntries, setLedgerEntries] = useState<AuditLedgerItem[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived effective vendor
  const detectedVendor = detectVendorFromContent(fileContent);
  const effectiveVendor = selectedVendor === 'auto' ? detectedVendor : selectedVendor;

  // Fetch real recent audits on mount
  useEffect(() => {
    fetchRecentAudits();
  }, []);

  // Fetch available frameworks whenever effective vendor changes
  useEffect(() => {
    let cancelled = false;
    const fetchFrameworks = async () => {
      setIsLoadingFrameworks(true);
      setFrameworksError(null);
      try {
        const resp = await getComplianceFrameworks(effectiveVendor);
        if (!cancelled) {
          const list = resp?.frameworks || [];
          setAvailableFrameworks(list);
          // Pre-select all compatible frameworks for this vendor (flushes cross-vendor IDs)
          setSelectedFrameworkIds(list.map((f) => f.framework_id));
        }
      } catch (err: any) {
        if (!cancelled) {
          setFrameworksError(err?.message || 'Failed to load frameworks');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFrameworks(false);
        }
      }
    };

    fetchFrameworks();
    return () => {
      cancelled = true;
    };
  }, [effectiveVendor]);

  const fetchRecentAudits = async () => {
    setIsLoadingLedger(true);
    setLedgerError(null);
    try {
      const entries = await getLedger();
      setLedgerEntries(entries || []);
    } catch (err: any) {
      setLedgerError(err.message);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFileName(file.name);
    setFileSize(file.size);
    setFileObject(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleLoadSample = (vendor: 'cisco' | 'juniper' | 'fortinet' | 'arista' | 'paloalto') => {
    setUploadError(null);
    setFileObject(undefined);
    if (vendor === 'cisco') {
      setSelectedFileName('labeled_cisco_config.txt');
      setFileContent(SAMPLE_CISCO);
      setFileSize(SAMPLE_CISCO.length);
      setSelectedVendor('cisco');
    } else if (vendor === 'juniper') {
      setSelectedFileName('sample_juniper_junos.conf');
      setFileContent(SAMPLE_JUNIPER);
      setFileSize(SAMPLE_JUNIPER.length);
      setSelectedVendor('juniper');
    } else if (vendor === 'fortinet') {
      setSelectedFileName('sample_fortinet_fortios.conf');
      setFileContent(SAMPLE_FORTINET);
      setFileSize(SAMPLE_FORTINET.length);
      setSelectedVendor('fortinet');
    } else if (vendor === 'arista') {
      setSelectedFileName('sample_arista_eos.conf');
      setFileContent(SAMPLE_ARISTA);
      setFileSize(SAMPLE_ARISTA.length);
      setSelectedVendor('arista');
    } else if (vendor === 'paloalto') {
      setSelectedFileName('sample_paloalto_panos.conf');
      setFileContent(SAMPLE_PALOALTO);
      setFileSize(SAMPLE_PALOALTO.length);
      setSelectedVendor('paloalto');
    }
  };

  const handleToggleFramework = (fId: string) => {
    setSelectedFrameworkIds((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  const handleSelectAllFrameworks = () => {
    setSelectedFrameworkIds(availableFrameworks.map((f) => f.framework_id));
  };

  const handleDeselectAllFrameworks = () => {
    setSelectedFrameworkIds([]);
  };

  // Real Upload Execution: POST /api/audit/upload
  const handleExecuteAudit = async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadAuditConfig(
        fileObject,
        fileContent,
        selectedFileName,
        selectedVendor,
        selectedFrameworkIds
      );
      onAuditStarted(result.session_id, result);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const lineCount = fileContent.split('\n').length;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto">
      {/* ── Screen Title Bar ── */}
      <div className="border-b border-slate-700/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Configuration Ingestion &amp; Compliance Intake
            </h1>
            <span className="badge-pass text-[10px]">
              5 VENDORS ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic AST parsing, multi-vendor isolation, and regulatory compliance scoping across Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, Arista EOS, and Palo Alto PAN-OS.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            Offline Sandbox Active
          </span>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {uploadError && (
        <div className="bg-rose-950/60 border border-rose-700 rounded p-4 flex items-start space-x-3 text-xs text-rose-200 animate-reveal">
          <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <strong className="block font-mono uppercase font-bold text-rose-300">Ingestion &amp; Parsing Exception:</strong>
            <p className="mt-0.5">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white font-mono text-xs cursor-pointer"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ── SECTION 1: CONFIGURATION SOURCE ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              1. Configuration Source
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Provide network device configuration via drag-and-drop, local file browser, or 1-click canonical presets.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Staged:</span>
            <strong className="text-slate-200 truncate max-w-[180px]">{selectedFileName}</strong>
            <span className="text-slate-600">|</span>
            <span>{fileSize} B</span>
            <span className="text-slate-600">|</span>
            <span>{lineCount} L</span>
          </div>
        </div>

        {/* Canonical Quick-load Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Quick-Load Canonical Reference Configurations (5 Supported Vendors):
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handleLoadSample('cisco')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/60 transition-all flex flex-col items-start cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-sky-300">Cisco</span>
                <span className="text-[10px] text-slate-500">IOS-XE</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">EDGE-RTR-01</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample('juniper')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/60 transition-all flex flex-col items-start cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-sky-300">Juniper</span>
                <span className="text-[10px] text-slate-500">Junos</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">lab-junos-router</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample('fortinet')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/60 transition-all flex flex-col items-start cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-sky-300">Fortinet</span>
                <span className="text-[10px] text-slate-500">FortiOS</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">CORP-FORTIGATE-01</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample('arista')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/60 transition-all flex flex-col items-start cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-sky-300">Arista</span>
                <span className="text-[10px] text-slate-500">EOS</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">ARISTA-SECURE-LAB</span>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample('paloalto')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/60 transition-all flex flex-col items-start cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-slate-200 group-hover:text-sky-300">Palo Alto</span>
                <span className="text-[10px] text-slate-500">PAN-OS</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">PA-VM-SECURE</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            dragActive
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".cfg,.txt,.conf,.log"
            onChange={handleBrowseChange}
            className="hidden"
          />

          <div className="mx-auto w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-2">
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <h3 className="text-xs font-semibold text-slate-200">
            Drag &amp; drop configuration file here, or select from local storage
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Supports Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, Arista EOS, and Palo Alto PAN-OS raw configs (.txt, .cfg, .conf)
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Browse Local File
            </button>
            <button
              type="button"
              onClick={() => setShowRawEditor(!showRawEditor)}
              className="btn-secondary"
            >
              {showRawEditor ? 'Hide Raw Editor' : 'Inspect / Edit Raw Config'}
            </button>
          </div>
        </div>

        {/* Expandable Raw Configuration Editor */}
        {showRawEditor && (
          <div className="space-y-2 pt-2 border-t border-slate-800 animate-reveal">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-2">
                <span>Raw Configuration Buffer:</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 border border-sky-800 text-sky-300">
                  Detected: {detectedVendor.toUpperCase()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFileContent('');
                  setFileSize(0);
                  setSelectedFileName('custom_manual_input.txt');
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Clear Buffer
              </button>
            </div>
            <textarea
              value={fileContent}
              onChange={(e) => {
                const text = e.target.value;
                setFileContent(text);
                setFileSize(text.length);
              }}
              rows={10}
              placeholder="Paste raw configuration dump here..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-y leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* ── SECTION 2: ANALYSIS CONFIGURATION ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-6 shadow-sm">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            2. Analysis Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select the target vendor isolation boundary and specify regulatory compliance frameworks for evaluation.
          </p>
        </div>

        {/* Sub-section 2A: Target Vendor Selection Tiles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Target Device Vendor (5 First-Class Supported Platforms)
            </span>
            <span className="text-[11px] font-mono">
              {selectedVendor === 'auto' ? (
                <span className="text-sky-300 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded">
                  Heuristic Active: <strong className="uppercase">{detectedVendor}</strong>
                </span>
              ) : (
                <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  Authoritative: <strong className="uppercase">{selectedVendor}</strong>
                </span>
              )}
            </span>
          </div>

          {/* 6 Selectable Polished Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VENDOR_CARDS.map((card) => {
              const isSelected = selectedVendor === card.id;
              const isInferred = selectedVendor === 'auto' && card.id === detectedVendor;

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedVendor(card.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none text-left relative ${
                    isSelected
                      ? 'bg-sky-950/30 border-sky-500 shadow-md ring-1 ring-sky-500/80'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100">{card.name}</span>
                        {isSelected && (
                          <span className="text-sky-400 text-xs font-bold font-mono">✓</span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-sky-400 block mt-0.5">
                        {card.platform}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${
                          card.badgeType === 'auto'
                            ? 'bg-sky-950 text-sky-300 border-sky-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {card.badge}
                      </span>
                      {isInferred && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Inferred
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="truncate">Grammar: {card.syntaxClues}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Guidance Banner */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
            <div>
              {selectedVendor === 'auto' ? (
                <span>
                  ⚡ <strong className="text-sky-300">Auto-Detect Mode:</strong> Analyzes configuration headers dynamically. Current inferred target is <strong className="text-emerald-400 uppercase">{detectedVendor}</strong>.
                </span>
              ) : (
                <span>
                  🎯 <strong className="text-emerald-300">Authoritative Override:</strong> Locked strictly to <strong className="text-sky-300 uppercase">{selectedVendor}</strong>. Heuristic detection is bypassed.
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 hidden md:inline">
              Pure AST Sandbox • Zero Cross-Vendor Leakage
            </span>
          </div>
        </div>

        {/* Sub-section 2B: Regulatory Compliance Frameworks */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Target Compliance Frameworks ({effectiveVendor.toUpperCase()} Scope)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluated against the normalized Common Security Model (CSM) through vendor-scoped evaluators.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {selectedFrameworkIds.length} of {availableFrameworks.length} selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllFrameworks}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={handleDeselectAllFrameworks}
                className="text-[11px] text-slate-400 hover:text-slate-300 font-mono underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {isLoadingFrameworks ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono bg-slate-950 rounded border border-slate-800">
              <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2"></span>
              Discovering compatible compliance standards for {effectiveVendor.toUpperCase()}...
            </div>
          ) : frameworksError ? (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded font-mono">
              Framework discovery warning: {frameworksError}
            </div>
          ) : availableFrameworks.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-mono bg-slate-950 rounded border border-slate-800">
              No regulatory frameworks registered for vendor '{effectiveVendor}'. Audit will evaluate 10 core vendor baseline rules.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableFrameworks.map((fw) => {
                const isChecked = selectedFrameworkIds.includes(fw.framework_id);
                return (
                  <div
                    key={fw.framework_id}
                    onClick={() => handleToggleFramework(fw.framework_id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-sky-950/30 border-sky-600/70 shadow-sm'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {fw.name}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                            {fw.control_count} controls
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                            {fw.framework_id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {fw.vendor_scope}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {fw.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedFrameworkIds.length === 0 && availableFrameworks.length > 0 && (
            <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded p-2.5 font-mono">
              ⚠️ Notice: Zero frameworks selected. Ingestion will verify vendor baseline rules without regulatory crosswalk scoring.
            </div>
          )}
        </div>

        {/* Sub-section 2C: Staged Payload & Audit Execution */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Staged Audit Execution Summary
              </span>
              <span className="badge-pass text-[10px]">
                SANDBOX READY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Payload File</span>
                <span className="text-slate-200 font-bold truncate block">{selectedFileName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">File Metrics</span>
                <span className="text-slate-200">{fileSize} B • {lineCount} L</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Target Vendor</span>
                <span className="text-sky-300 uppercase font-bold">
                  {selectedVendor === 'auto' ? `Auto (${detectedVendor})` : selectedVendor}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Regulatory Scope</span>
                <span className="text-emerald-400 font-bold">
                  {selectedFrameworkIds.length} Framework{selectedFrameworkIds.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Synchronous Pipeline Execution Overlay */}
            {isUploading && (
              <div className="pt-3 border-t border-slate-800 space-y-2 animate-reveal">
                <div className="flex items-center justify-between text-xs font-mono text-sky-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                    <span>Synchronous Ingestion Pipeline In Progress</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Deterministic Evaluation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  {AUDIT_STAGES.map((s) => (
                    <div key={s.step} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="w-4 h-4 rounded-full bg-sky-900 border border-sky-700 text-sky-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {s.step}
                      </span>
                      <div className="truncate">
                        <span className="text-slate-200 font-medium">{s.label}</span>
                        <span className="block text-[10px] text-slate-500 truncate">{s.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
              {currentUser?.role === 'viewer' && (
                <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800">
                  Viewer Role: Read-only access. Ingestion disabled.
                </span>
              )}
              <button
                type="button"
                disabled={isUploading || currentUser?.role === 'viewer'}
                onClick={handleExecuteAudit}
                className={`px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 border cursor-pointer ${
                  isUploading || currentUser?.role === 'viewer'
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 active:scale-[0.98]'
                }`}
              >
                {isUploading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Executing Deterministic Audit...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Execute Deterministic Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: AUDIT REPOSITORY & LEDGER TIMELINE (GET /api/ledger) ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Recent Audits Log (Cryptographic Ledger Source of Truth)
            </h3>
          </div>
          <button
            onClick={fetchRecentAudits}
            className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <span>↻ Refresh Ledger</span>
          </button>
        </div>

        {isLoadingLedger ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2"></span>
            Loading recorded audits from backend ledger...
          </div>
        ) : ledgerError ? (
          <div className="p-6 text-center text-xs text-rose-300 font-mono">
            Failed to load ledger records: {ledgerError}
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-300">No Prior Audits in Ledger</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The cryptographic ledger (<code className="font-mono text-slate-300">audit_log.jsonl</code>) has no entries recorded yet.
            </p>
            <p className="text-xs text-sky-400 font-mono pt-1">
              Select one of the canonical reference configurations above and click "Execute Deterministic Audit".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-left">
              <thead className="bg-slate-950 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Entry ID / Sequence</th>
                  <th className="py-2.5 px-4 font-semibold">Device Hostname</th>
                  <th className="py-2.5 px-4 font-semibold">Timestamp (IST)</th>
                  <th className="py-2.5 px-4 font-semibold">Config SHA-256</th>
                  <th className="py-2.5 px-4 font-semibold">Audit Breakdown</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans text-xs">
                {ledgerEntries.map((entry) => {
                  const results = entry.audit_results || {};
                  const passCount = Object.values(results).filter((v) => v === 'Pass').length;
                  const failCount = Object.values(results).filter((v) => v === 'Fail').length;
                  const unknownCount = Object.values(results).filter((v) => v === 'Unknown').length;

                  const overallStatus =
                    failCount > 0
                      ? 'NON-COMPLIANT'
                      : unknownCount > 0
                      ? 'NEEDS-REVIEW'
                      : 'COMPLIANT';

                  return (
                    <tr key={entry.entry_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                        {entry.entry_id}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-sky-400">
                        {entry.device_hostname}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        {formatToIST(entry.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        <span title={entry.config_file_hash} className="select-all">
                          {entry.config_file_hash
                            ? `${entry.config_file_hash.substring(0, 8)}...${entry.config_file_hash.substring(
                                entry.config_file_hash.length - 6
                              )}`
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400 font-bold">{passCount}P</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-rose-400 font-bold">{failCount}F</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-amber-400 font-bold">{unknownCount}U</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            overallStatus === 'COMPLIANT'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : overallStatus === 'NON-COMPLIANT'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {overallStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={onNavigateToLedger}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs font-mono border border-slate-700 hover:border-sky-500/50 transition-colors cursor-pointer"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
