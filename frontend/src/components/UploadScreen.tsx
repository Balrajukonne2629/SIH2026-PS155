import React, { useState, useEffect, useRef } from 'react';
import { uploadAuditConfig, getLedger, getComplianceFrameworks } from '../api';
import { formatToIST } from '../utils';
import { UserIdentity, FrameworkMetadataItem } from '../types';

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

const VENDOR_OPTIONS = [
  { id: 'auto', label: 'Auto Detect', badge: 'Deterministic' },
  { id: 'cisco', label: 'Cisco IOS-XE', badge: 'Cisco' },
  { id: 'juniper', label: 'Juniper Junos', badge: 'Juniper' },
  { id: 'fortinet', label: 'Fortinet FortiOS', badge: 'Fortinet' },
  { id: 'arista', label: 'Arista EOS', badge: 'Arista' },
] as const;

type VendorId = typeof VENDOR_OPTIONS[number]['id'];

function detectVendorFromContent(content: string): string {
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
  return 'cisco';
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onAuditStarted,
  onNavigateToLedger,
  currentUser
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('labeled_test_config.txt');
  const [fileContent, setFileContent] = useState<string>(SAMPLE_CISCO);
  const [fileObject, setFileObject] = useState<File | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number>(SAMPLE_CISCO.length);

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
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
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

  const handleLoadSample = (vendor: 'cisco' | 'juniper' | 'fortinet' | 'arista') => {
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
    <div className="space-y-8 font-sans">
      {/* Screen Title Bar */}
      <div className="border-b border-slate-700 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Configuration Ingestion &amp; Compliance Intake
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload multi-vendor device configurations (.cfg, .txt, .conf) with deterministic vendor detection and multi-framework compliance scoping.
          </p>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="bg-rose-950/60 border border-rose-700 rounded p-4 flex items-start space-x-3 text-xs text-rose-200">
          <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <strong className="block font-mono uppercase font-bold text-rose-300">Upload &amp; Parsing Error:</strong>
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

      {/* Main Ingestion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Controls & Staging */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. Target Vendor Selector */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Target Device Vendor
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedVendor === 'auto' ? (
                  <span className="text-sky-300 bg-sky-950/50 border border-sky-800 px-2 py-0.5 rounded">
                    Auto-Detected: <strong className="uppercase">{detectedVendor}</strong>
                  </span>
                ) : (
                  <span className="text-emerald-300 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded">
                    Explicit: <strong className="uppercase">{selectedVendor}</strong>
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VENDOR_OPTIONS.map((opt) => {
                const isActive = selectedVendor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedVendor(opt.id)}
                    className={`px-3 py-2 rounded text-xs font-medium text-left transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 border-sky-400 text-white shadow-sm font-semibold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-slate-100 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isActive && <span className="text-[10px]">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
              <span>
                {selectedVendor === 'auto'
                  ? '⚡ Auto-sniffing inspects config tokens; explicit vendor selection bypasses detection.'
                  : `🎯 Explicit selection locks parsing to ${selectedVendor.toUpperCase()} CSM and isolated baseline rules.`}
              </span>
            </div>
          </div>

          {/* 2. Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded p-6 text-center transition-all ${
              dragActive
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,.txt,.conf,.log"
              onChange={handleBrowseChange}
              className="hidden"
            />

            <div className="mx-auto w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <h3 className="text-sm font-semibold text-slate-200">
              Select or Drag &amp; Drop Network Configuration File
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, and Arista EOS raw configs (.txt, .cfg, .conf)
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
              >
                Browse Local File
              </button>
            </div>

            {/* Canonical Sample Presets */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 mb-2">
                Quick-load canonical reference configs:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSample('cisco')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/50 cursor-pointer"
                >
                  Cisco (EDGE-RTR-01)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('juniper')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/50 cursor-pointer"
                >
                  Juniper (lab-junos-router)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('fortinet')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/50 cursor-pointer"
                >
                  Fortinet (CORP-FORTIGATE-01)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('arista')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono border border-slate-700 hover:border-sky-500/50 cursor-pointer"
                >
                  Arista (ARISTA-SECURE-LAB)
                </button>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-500 font-mono">
              Processed offline in backend memory sandbox • Zero live device connections made
            </div>
          </div>

          {/* 3. Interactive Framework Selection Grid */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Target Compliance Frameworks
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select regulatory frameworks to evaluate against this {effectiveVendor.toUpperCase()} device.
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
              <div className="py-6 text-center text-xs text-slate-400 font-mono">
                <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                Discovering compatible frameworks for {effectiveVendor.toUpperCase()}...
              </div>
            ) : frameworksError ? (
              <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded font-mono">
                Framework discovery warning: {frameworksError}
              </div>
            ) : availableFrameworks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                No frameworks registered for vendor '{effectiveVendor}'. Audit will evaluate core vendor baseline rules.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableFrameworks.map((fw) => {
                  const isChecked = selectedFrameworkIds.includes(fw.framework_id);
                  return (
                    <div
                      key={fw.framework_id}
                      onClick={() => handleToggleFramework(fw.framework_id)}
                      className={`p-3 rounded border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-sky-950/30 border-sky-600/70 shadow-sm'
                          : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
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
              <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded p-2 font-mono">
                ⚠️ Notice: Zero frameworks selected. Ingestion will verify vendor baseline rules without regulatory crosswalk scoring.
              </div>
            )}
          </div>

          {/* 4. Active Staging & Audit Execution Card */}
          {selectedFileName && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="text-xs font-semibold text-slate-300">
                    Staged Configuration Payload
                  </span>
                </div>
                <span className="badge-pass text-[11px]">
                  READY FOR AUDIT
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">File Name</span>
                  <span className="text-slate-200 font-bold truncate block">{selectedFileName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Size</span>
                  <span className="text-slate-200">{fileSize} bytes</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Line Count</span>
                  <span className="text-slate-200">{lineCount} lines</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Target Vendor</span>
                  <span className="text-sky-300 uppercase font-bold">
                    {selectedVendor === 'auto' ? `Auto (${detectedVendor})` : selectedVendor}
                  </span>
                </div>
              </div>

              {/* Frameworks Summary Pill Row */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[10px] font-mono uppercase mb-1">
                  Active Framework Scope ({selectedFrameworkIds.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFrameworkIds.length === 0 ? (
                    <span className="text-[11px] font-mono text-slate-400">None (Baseline rules only)</span>
                  ) : (
                    selectedFrameworkIds.map((id) => (
                      <span
                        key={id}
                        className="text-[10px] font-mono bg-sky-950/60 border border-sky-800/80 text-sky-300 px-2 py-0.5 rounded"
                      >
                        {id}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Action Button */}
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
                  className={`px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-[transform,background-color,border-color] duration-150 ease-out shadow-sm flex items-center gap-2 border cursor-pointer ${
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
          )}
        </div>

        {/* Right Column: Ingestion Protocol & Validation Policy */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-4">
            <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-sm"></span>
              CSM Audit Protocol Verification
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="border-l-2 border-emerald-500 pl-2.5 py-0.5">
                <div className="text-slate-200 font-medium">Deterministic Multi-Vendor Engine</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Full CSM normalization for Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, and Arista EOS. Zero cross-vendor rule leakage.
                </div>
              </div>

              <div className="border-l-2 border-sky-500 pl-2.5 py-0.5">
                <div className="text-slate-200 font-medium">Dynamic Framework Scoping</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Scoped evaluation against CIS benchmarks, DISA STIG, vendor baselines, and crosswalk frameworks (NIST SP 800-53, ISO 27001).
                </div>
              </div>

              <div className="border-l-2 border-amber-500 pl-2.5 py-0.5">
                <div className="text-slate-200 font-medium">Isolated AI Suggestion Sandbox</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Unrecognized CLI lines route to the local AI suggester. Suggestions require explicit human approval before mapping into trusted rules.
                </div>
              </div>

              <div className="border-l-2 border-indigo-500 pl-2.5 py-0.5">
                <div className="text-slate-200 font-medium">Cryptographic Hash Chaining</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Every audit produces a linked hash entry in <code className="font-mono text-slate-300">audit_log.jsonl</code>, providing tamper-evident non-repudiation.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>PARSER RUNTIME</span>
                <span className="text-emerald-400">OFFLINE / LOCAL</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>SUPPORTED VENDORS</span>
                <span className="text-slate-300">4 Active Adapters</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>ESTIMATED DURATION</span>
                <span className="text-slate-300">&lt; 150 ms (Deterministic)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Audits Table Section (Fetched live from GET /api/ledger) */}
      <div className="bg-slate-900 border border-slate-700 rounded">
        <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <h3 className="text-xs font-bold text-slate-200">
              Recent Audits Log (Ledger Source of Truth)
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
          /* UX Copy Empty State Pattern */
          <div className="p-10 text-center space-y-2">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-300">No Prior Audits in Ledger</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The cryptographic ledger (<code className="font-mono text-slate-300">audit_log.jsonl</code>) has no entries yet because no compliance scans have been finalized.
            </p>
            <p className="text-xs text-sky-400 font-mono pt-1">
              Upload a Cisco IOS-XE configuration file above or click "Load Canonical Test Config" to execute your first audit.
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
                {ledgerEntries.map((entry, idx) => {
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

                  const statusColor =
                    overallStatus === 'COMPLIANT'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : overallStatus === 'NON-COMPLIANT'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800';

                  return (
                    <tr key={entry.entry_id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">
                        #{idx + 1} <span className="text-slate-300 text-[11px] font-normal">{entry.entry_id}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                        {entry.device_hostname || 'unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        <span title={`Canonical UTC: ${entry.timestamp}`}>{formatToIST(entry.timestamp)}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <span title={entry.config_file_hash}>
                          {(entry.config_file_hash || '').substring(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="text-emerald-400 font-semibold" title="Pass">
                            {passCount}P
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="text-rose-400 font-semibold" title="Fail">
                            {failCount}F
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="text-amber-400 font-semibold" title="Unknown">
                            {unknownCount}U
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusColor}`}>
                          {overallStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={onNavigateToLedger}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-mono transition-colors border border-slate-700 cursor-pointer"
                        >
                          View in Ledger &rarr;
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
