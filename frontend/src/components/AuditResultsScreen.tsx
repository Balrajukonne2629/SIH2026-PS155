import React, { useState, useEffect } from 'react';
import { getAuditResults, getComplianceFrameworks, evaluateCompliance } from '../api';
import { FrameworkMetadataItem, MultiFrameworkAuditResult, FrameworkSummaryItem } from '../types';
import { formatToIST } from '../utils';

interface AuditResultsScreenProps {
  sessionId: string;
  initialResults?: any;
  viewMode?: 'overview' | 'results' | 'evidence';
  onReviewAiSuggestions: (unmappedLine: string) => void;
  onViewRemediation: (ruleId: string) => void;
  onNavigateToLedger: () => void;
}

export const AuditResultsScreen: React.FC<AuditResultsScreenProps> = ({
  sessionId,
  initialResults,
  viewMode,
  onReviewAiSuggestions,
  onViewRemediation,
  onNavigateToLedger
}) => {
  const [data, setData] = useState<any>(initialResults || null);
  const [isLoading, setIsLoading] = useState(!initialResults);
  const [error, setError] = useState<string | null>(null);

  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | 'Pass' | 'Fail' | 'Unknown'>('ALL');

  // Multi-Framework State (Phase 3C Chunk 5)
  const [activeTab, setActiveTab] = useState<string>('baseline');
  const [availableFrameworks, setAvailableFrameworks] = useState<FrameworkMetadataItem[]>([]);
  const [multiAuditResult, setMultiAuditResult] = useState<MultiFrameworkAuditResult | null>(null);
  const [isFrameworkLoading, setIsFrameworkLoading] = useState<boolean>(false);
  const [frameworkError, setFrameworkError] = useState<string | null>(null);
  const [frameworkFilter, setFrameworkFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'UNKNOWN'>('ALL');
  const [expandedFrameworkEvidence, setExpandedFrameworkEvidence] = useState<Record<string, boolean>>({});

  const resolveVendor = (auditData: any): string => {
    const direct = auditData?.vendor || auditData?.csm?.device?.vendor;
    if (direct) {
      const v = String(direct).toLowerCase().trim();
      if (['cisco', 'juniper', 'fortinet', 'arista', 'paloalto'].includes(v)) {
        return v;
      }
    }
    const raw = auditData?.csm?.device?.platform || auditData?.platform || '';
    const str = String(raw).toLowerCase().trim();
    if (str.includes('palo') || str.includes('pan-os') || str.includes('panos')) return 'paloalto';
    if (str.includes('arista') || str.includes('eos')) return 'arista';
    if (str.includes('fortinet') || str.includes('fortios')) return 'fortinet';
    if (str.includes('juniper') || str.includes('junos')) return 'juniper';
    if (str.includes('cisco') || str.includes('ios')) return 'cisco';
    return 'cisco';
  };

  const getVendorDisplay = (vendorId: string): { name: string; platform: string; full: string } => {
    switch (vendorId) {
      case 'cisco':
        return { name: 'Cisco Systems', platform: 'IOS / IOS-XE', full: 'Cisco IOS-XE' };
      case 'juniper':
        return { name: 'Juniper Networks', platform: 'Junos', full: 'Juniper Junos' };
      case 'fortinet':
        return { name: 'Fortinet', platform: 'FortiOS', full: 'Fortinet FortiOS' };
      case 'arista':
        return { name: 'Arista Networks', platform: 'EOS', full: 'Arista EOS' };
      case 'paloalto':
        return { name: 'Palo Alto Networks', platform: 'PAN-OS', full: 'Palo Alto PAN-OS' };
      default:
        return { name: vendorId.toUpperCase(), platform: 'Network OS', full: vendorId.toUpperCase() };
    }
  };

  const loadFrameworkEvaluation = async (resolvedVendor: string) => {
    setIsFrameworkLoading(true);
    setFrameworkError(null);
    try {
      const fwCatalog = await getComplianceFrameworks(resolvedVendor);
      const fws = fwCatalog?.frameworks || [];
      setAvailableFrameworks(fws);

      if (fws.length > 0) {
        const evalRes = await evaluateCompliance({ session_id: sessionId });
        setMultiAuditResult(evalRes);
      } else {
        setMultiAuditResult(null);
      }
    } catch (err: any) {
      console.error('Multi-framework evaluation failed:', err);
      setFrameworkError(err?.message || 'Failed to evaluate compliance frameworks.');
    } finally {
      setIsFrameworkLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const loadResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAuditResults(sessionId);
      setData(res);
      const vendor = resolveVendor(res);
      await loadFrameworkEvaluation(vendor);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (ruleId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const toggleFrameworkExpand = (controlId: string) => {
    setExpandedFrameworkEvidence((prev) => ({
      ...prev,
      [controlId]: !prev[controlId]
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded p-12 text-center font-mono text-xs text-slate-300 space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>Loading deterministic audit results from session <code className="text-sky-400 font-bold">{sessionId}</code>...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-950/40 border border-rose-800 rounded p-8 text-center font-mono text-xs space-y-3">
        <div className="text-rose-400 font-bold text-sm">Failed to Load Audit Results</div>
        <p className="text-rose-200 max-w-lg mx-auto">{error || 'Session expired or not found.'}</p>
        <button
          onClick={loadResults}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 cursor-pointer"
        >
          ↻ Retry Session Fetch
        </button>
      </div>
    );
  }

  const hostname = data.device_hostname || 'unknown';
  const platform = data.platform || 'Cisco IOS-XE';
  const timestamp = data.csm?.source?.parsed_at || new Date().toISOString();
  const configFileHash = data.config_file_hash || '';
  const ruleResults = data.rule_results || {};
  const unmappedLines: string[] = data.unmapped_lines || [];

  // Convert rule_results dict into array for table rendering
  const rulesList = Object.entries(ruleResults).map(([ruleId, details]: [string, any]) => ({
    ruleId,
    focus: details.focus || 'Security Control',
    status: details.status || 'Unknown',
    evidenceFound: details.evidence_found || [],
    description: details.description || ''
  }));

  const passCount = rulesList.filter((r) => r.status === 'Pass').length;
  const failCount = rulesList.filter((r) => r.status === 'Fail').length;
  const unknownCount = rulesList.filter((r) => r.status === 'Unknown').length;
  const totalCount = rulesList.length;

  const filteredRules = rulesList.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const resolvedVendor = resolveVendor(data);
  const vendorInfo = getVendorDisplay(resolvedVendor);
  const resolvedVendorDisplay = vendorInfo.full;
  const selectedFramework = availableFrameworks.find((f) => f.framework_id === activeTab);
  const selectedSummary: FrameworkSummaryItem | undefined = multiAuditResult?.framework_summaries?.[activeTab];
  const frameworkResultsList = selectedSummary?.results || [];
  const filteredFrameworkResults = frameworkResultsList.filter((r) => {
    if (frameworkFilter === 'ALL') return true;
    return String(r.status).toUpperCase() === frameworkFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Unified Target Device & Scope Header Bar */}
      <div className="bg-slate-900 border border-slate-700 rounded p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-tight">
              {hostname}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {platform}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-slate-400">
              Vendor Scope: <span className="text-sky-400 font-semibold">{resolvedVendorDisplay}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400 font-mono">
              Session: <code className="text-sky-300 font-semibold">{sessionId}</code>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadResults}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono border border-slate-700 transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <span>↻ Refresh</span>
            </button>
            <button
              onClick={onNavigateToLedger}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs font-mono border border-slate-700 transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Full Ledger &amp; Reports</span>
            </button>
          </div>
        </div>

        {/* Header Metadata & Framework Selector Sub-bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-[11px]">
            <div>
              <span className="text-slate-500 uppercase text-[10px] mr-1.5">Parsed:</span>
              <span className="text-slate-300 font-medium" title={`Canonical UTC: ${timestamp}`}>{formatToIST(timestamp)}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] mr-1.5">SHA-256:</span>
              <span className="text-sky-400 select-all" title={configFileHash}>
                {configFileHash.length > 20
                  ? `${configFileHash.substring(0, 10)}...${configFileHash.substring(configFileHash.length - 8)}`
                  : configFileHash || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] mr-1.5">Logic:</span>
              <span className="text-emerald-400 font-semibold">Modules 2 &amp; 4</span>
            </div>
          </div>

          {/* Inline Framework Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1 shrink-0" role="tablist" aria-label="Compliance Frameworks">
            <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 hidden sm:inline">Framework:</span>
            <button
              role="tab"
              aria-selected={activeTab === 'baseline'}
              onClick={() => setActiveTab('baseline')}
              className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] cursor-pointer ${
                activeTab === 'baseline'
                  ? 'bg-sky-600 text-white shadow-sm border border-sky-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              Baseline Rules
            </button>

            {availableFrameworks.map((fw) => (
              <button
                key={fw.framework_id}
                role="tab"
                aria-selected={activeTab === fw.framework_id}
                onClick={() => setActiveTab(fw.framework_id)}
                title={fw.description}
                className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] cursor-pointer ${
                  activeTab === fw.framework_id
                    ? 'bg-sky-600 text-white shadow-sm border border-sky-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {fw.name || fw.framework_id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- TAB VIEW 1: Legacy Baseline Rules --- */}
      {activeTab === 'baseline' && (
        <div className="space-y-4">
          {/* Posture Metric & Filter Strip (Compact, High-Density) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Controls */}
            <div
              onClick={() => setFilter('ALL')}
              className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                filter === 'ALL'
                  ? 'bg-slate-800 border-sky-500 ring-1 ring-sky-500/80 shadow-sm'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span>Total Controls</span>
                <span className="text-[10px] text-slate-500 font-mono">CIS/DISA/STIG</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">{totalCount}</div>
            </div>

            {/* Pass Count */}
            <div
              onClick={() => setFilter('Pass')}
              className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                filter === 'Pass'
                  ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500/80 shadow-sm'
                  : 'bg-emerald-950/30 border-emerald-900/60 hover:border-emerald-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                <span>Pass Count</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xl font-bold font-mono text-emerald-300">{passCount}</span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {Math.round((passCount / (totalCount || 1)) * 100)}%
                </span>
              </div>
            </div>

            {/* Fail Count */}
            <div
              onClick={() => setFilter('Fail')}
              className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                filter === 'Fail'
                  ? 'bg-rose-950/80 border-rose-500 ring-1 ring-rose-500/80 shadow-sm'
                  : 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 uppercase tracking-wider">
                <span>Fail Count</span>
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xl font-bold font-mono text-rose-300">{failCount}</span>
                <span className="text-[10px] font-mono text-rose-400/90">
                  Needs Remediation
                </span>
              </div>
            </div>

            {/* Unknown Count */}
            <div
              onClick={() => setFilter('Unknown')}
              className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                filter === 'Unknown'
                  ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/80 shadow-sm'
                  : 'bg-amber-950/30 border-amber-900/60 hover:border-amber-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                <span>Unknown Count</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xl font-bold font-mono text-amber-300">{unknownCount}</span>
                <span className="text-[10px] font-mono text-amber-400/90">
                  Missing Direct Evidence
                </span>
              </div>
            </div>
          </div>

          {/* Executive Baseline Summary Card for Overview Mode */}
          {viewMode === 'overview' && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <h3 className="text-xs font-bold text-slate-200">
                    Baseline Posture Overview
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {totalCount} Total Deterministic Controls
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-700">
                  <span className="text-slate-500 block text-[10px] uppercase">Compliance Rate</span>
                  <span className="text-emerald-400 text-base font-bold">{Math.round((passCount / (totalCount || 1)) * 100)}%</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{passCount} Passing Controls</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-700">
                  <span className="text-slate-500 block text-[10px] uppercase">Remediation Workload</span>
                  <span className="text-rose-400 text-base font-bold">{failCount}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Requiring Jinja2 CLI Fixes</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-700">
                  <span className="text-slate-500 block text-[10px] uppercase">Review Queue</span>
                  <span className="text-amber-400 text-base font-bold">{unknownCount}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{unmappedLines.length} Unmapped Telemetry</span>
                </div>
              </div>
            </div>
          )}

          {/* Unmapped Lines Detected Alert Banner (Inline, Compact) */}
          {unmappedLines.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-600/70 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded bg-amber-900/50 border border-amber-700 text-amber-300 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-amber-200">
                      {unmappedLines.length} Unmapped CLI Line{unmappedLines.length > 1 ? 's' : ''} Detected
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900 text-amber-200 border border-amber-700 font-semibold leading-none">
                      PENDING REVIEW
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 font-mono truncate mt-0.5">
                    <code>{unmappedLines[0]}</code>
                    {unmappedLines.length > 1 && <span className="text-amber-400/90 ml-1">+{unmappedLines.length - 1} more</span>}
                    <span className="text-amber-400/60 ml-1.5 hidden md:inline">— AI mapping available</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onReviewAiSuggestions(unmappedLines[0])}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded text-xs font-bold uppercase tracking-wider transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 shrink-0 shadow-sm cursor-pointer"
              >
                Review AI Suggestions &rarr;
              </button>
            </div>
          )}

          {/* Rule Results Table — Hidden in 'overview' mode, visible in 'results', 'evidence', and default modes */}
          {viewMode !== 'overview' && (
            <div className="bg-slate-900 border border-slate-700 rounded">
              {viewMode === 'evidence' && (
                <div className="px-5 py-2.5 bg-sky-950/30 border-b border-slate-700 flex items-center justify-between text-xs font-mono text-sky-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                    <span>EVIDENCE TRACE MODE: Inspecting deterministic AST parsed directives &amp; telemetry lines</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">ALL DIRECTIVES EXPANDED</span>
                </div>
              )}
              <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <h3 className="text-xs font-bold text-slate-200">
                    Evaluated rule matrix ({filteredRules.length} of {rulesList.length})
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">FILTER:</span>
                  {(['ALL', 'Pass', 'Fail', 'Unknown'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 text-xs font-sans font-medium rounded cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/80 ${
                        filter === f
                          ? 'bg-slate-800 text-sky-400 border border-slate-700 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700 text-left">
                  <thead className="bg-slate-950 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Rule ID</th>
                      <th className="py-3 px-4 font-semibold">Control Focus</th>
                      <th className="py-3 px-4 font-semibold">Verdict</th>
                      <th className="py-3 px-4 font-semibold">Evidence Found (CSM Source)</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 font-sans text-xs">
                    {filteredRules.map((rule) => {
                      const isExpanded = viewMode === 'evidence' || expandedEvidence[rule.ruleId] || false;
                      const hasEvidence = rule.evidenceFound && rule.evidenceFound.length > 0;

                    let statusBadge = null;
                    if (rule.status === 'Pass') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                          PASS
                        </span>
                      );
                    } else if (rule.status === 'Fail') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                          FAIL
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                          UNKNOWN
                        </span>
                      );
                    }

                    return (
                      <tr key={rule.ruleId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                          {rule.ruleId}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          <div className="font-medium">{rule.focus}</div>
                          {rule.description && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {rule.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-md">
                          {hasEvidence ? (
                            <div>
                              <div className="bg-slate-950 p-1.5 rounded border border-slate-700 text-slate-300 break-all">
                                {isExpanded ? (
                                  <ul className="space-y-1">
                                    {rule.evidenceFound.map((ev: string, i: number) => (
                                      <li key={i} className="text-slate-300 font-mono">
                                        • {ev}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span>
                                    {rule.evidenceFound[0].length > 45
                                      ? `${rule.evidenceFound[0].substring(0, 45)}...`
                                      : rule.evidenceFound[0]}
                                    {rule.evidenceFound.length > 1 && (
                                      <span className="text-slate-500 ml-1">
                                        (+{rule.evidenceFound.length - 1} more)
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleExpand(rule.ruleId)}
                                className="mt-1 text-[10px] text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
                              >
                                {isExpanded ? '[-] Collapse evidence' : '[+] Expand full evidence'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No matching configuration directive detected</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {rule.status === 'Fail' ? (
                            <button
                              onClick={() => onViewRemediation(rule.ruleId)}
                              className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono font-semibold transition-colors border border-rose-800 flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Remediation &rarr;
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">
                              {rule.status === 'Pass' ? 'Compliant' : 'Inspect Manually'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* --- TAB VIEW 2: Selected Compliance Framework --- */}
      {activeTab !== 'baseline' && (
        <div className="space-y-6">
          {/* Framework Loading State */}
          {isFrameworkLoading && (
            <div className="bg-slate-900 border border-slate-700 rounded p-12 text-center font-mono text-xs text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Evaluating deterministic compliance controls for framework <code className="text-sky-400 font-bold">{activeTab}</code>...</div>
            </div>
          )}

          {/* Framework Error State */}
          {!isFrameworkLoading && frameworkError && (
            <div className="bg-rose-950/40 border border-rose-800 rounded p-8 text-center font-mono text-xs space-y-3">
              <div className="text-rose-400 font-bold text-sm">Framework Evaluation Error</div>
              <p className="text-rose-200 max-w-lg mx-auto">{frameworkError}</p>
              <button
                onClick={() => loadFrameworkEvaluation(resolvedVendor)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 cursor-pointer"
              >
                ↻ Retry Framework Evaluation
              </button>
            </div>
          )}

          {/* No Frameworks Registered State */}
          {!isFrameworkLoading && !frameworkError && availableFrameworks.length === 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded p-12 text-center font-mono text-xs space-y-3">
              <div className="text-amber-400 font-bold text-sm">No Compliance Frameworks Registered</div>
              <p className="text-slate-400 max-w-lg mx-auto">
                No deterministic compliance frameworks are registered for vendor: <code className="text-sky-300 font-bold">{resolvedVendorDisplay}</code>.
              </p>
              <p className="text-slate-500 text-[11px]">
                Please register framework evaluators via FrameworkRegistry for this vendor.
              </p>
            </div>
          )}

          {/* Framework Results Content */}
          {!isFrameworkLoading && !frameworkError && selectedSummary && (
            <div className="space-y-6">
              {/* Selected Framework Overview */}
              <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <h2 className="text-base font-bold text-slate-100 tracking-tight font-mono">
                        {selectedSummary.framework_name || selectedFramework?.name || selectedSummary.framework_id}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-300 border border-slate-700">
                        {selectedSummary.framework_version || selectedFramework?.version || 'v1.0'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Authority Scope: <span className="text-slate-200">{selectedFramework?.vendor_scope || 'Deterministic'}</span>
                      {selectedFramework?.control_namespace && (
                        <span className="ml-3 text-slate-400">Namespace: <span className="text-slate-200">{selectedFramework.control_namespace}</span></span>
                      )}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Pass Rate</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {selectedSummary.pass_rate !== null && selectedSummary.pass_rate !== undefined
                        ? `${selectedSummary.pass_rate.toFixed(2)}%`
                        : 'N/A'}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">Authoritative Backend Metric</span>
                  </div>
                </div>

                {/* Framework Metadata Details */}
                {selectedFramework?.description && (
                  <p className="text-xs text-slate-300 font-mono">
                    {selectedFramework.description}
                  </p>
                )}
              </div>

              {/* Framework Stat Cards (Compact Strip) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Controls */}
                <div
                  onClick={() => setFrameworkFilter('ALL')}
                  className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                    frameworkFilter === 'ALL'
                      ? 'bg-slate-800 border-sky-500 ring-1 ring-sky-500/80 shadow-sm'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <span>Total Controls</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedFramework?.control_namespace || 'Standard'}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                    {selectedSummary.total_controls}
                  </div>
                </div>

                {/* Pass Count */}
                <div
                  onClick={() => setFrameworkFilter('PASS')}
                  className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                    frameworkFilter === 'PASS'
                      ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500/80 shadow-sm'
                      : 'bg-emerald-950/30 border-emerald-900/60 hover:border-emerald-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                    <span>Pass Count</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xl font-bold font-mono text-emerald-300">
                      {selectedSummary.pass_count}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      {selectedSummary.pass_rate !== null && selectedSummary.pass_rate !== undefined
                        ? `${selectedSummary.pass_rate.toFixed(1)}%`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Fail Count */}
                <div
                  onClick={() => setFrameworkFilter('FAIL')}
                  className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                    frameworkFilter === 'FAIL'
                      ? 'bg-rose-950/80 border-rose-500 ring-1 ring-rose-500/80 shadow-sm'
                      : 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 uppercase tracking-wider">
                    <span>Fail Count</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xl font-bold font-mono text-rose-300">
                      {selectedSummary.fail_count}
                    </span>
                    <span className="text-[10px] font-mono text-rose-400/90">
                      Requires Remediation
                    </span>
                  </div>
                </div>

                {/* Unknown Count */}
                <div
                  onClick={() => setFrameworkFilter('UNKNOWN')}
                  className={`p-3 rounded border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                    frameworkFilter === 'UNKNOWN'
                      ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/80 shadow-sm'
                      : 'bg-amber-950/30 border-amber-900/60 hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                    <span>Unknown Count</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xl font-bold font-mono text-amber-300">
                      {selectedSummary.unknown_count}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/90">
                      Missing Direct Evidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Framework Controls Table — Hidden in 'overview' mode, visible in 'results', 'evidence', and default modes */}
              {viewMode !== 'overview' && (
                <div className="bg-slate-900 border border-slate-700 rounded">
                  {viewMode === 'evidence' && (
                    <div className="px-5 py-2.5 bg-sky-950/30 border-b border-slate-700 flex items-center justify-between text-xs font-mono text-sky-300">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                        <span>EVIDENCE TRACE MODE: Inspecting deterministic AST parsed directives &amp; telemetry lines</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">ALL DIRECTIVES EXPANDED</span>
                    </div>
                  )}
                  <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      <h3 className="text-xs font-bold text-slate-200">
                        {selectedSummary.framework_name || selectedSummary.framework_id} control matrix ({filteredFrameworkResults.length} of {frameworkResultsList.length})
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">FILTER:</span>
                      {(['ALL', 'PASS', 'FAIL', 'UNKNOWN'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFrameworkFilter(f)}
                          className={`px-2 py-0.5 text-xs font-sans font-medium rounded cursor-pointer ${
                            frameworkFilter === f
                              ? 'bg-slate-800 text-sky-400 border border-slate-700'
                              : 'text-slate-400 hover:text-slate-100'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-left">
                      <thead className="bg-slate-950 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Control ID</th>
                          <th className="py-3 px-4 font-semibold">Requirement / Reason</th>
                          <th className="py-3 px-4 font-semibold">Verdict</th>
                          <th className="py-3 px-4 font-semibold">Observed Evidence (CSM Source)</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60 font-sans text-xs">
                        {filteredFrameworkResults.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 font-mono text-xs">
                              No controls match filter '{frameworkFilter}'.
                            </td>
                          </tr>
                        ) : (
                          filteredFrameworkResults.map((r) => {
                            const isExpanded = viewMode === 'evidence' || expandedFrameworkEvidence[r.control_id] || false;
                          const hasSourceLines = r.source_lines && r.source_lines.length > 0;
                          const hasObserved = r.observed_value !== undefined && r.observed_value !== null;
                          const statusUpper = String(r.status).toUpperCase();

                          let statusBadge = null;
                          if (statusUpper === 'PASS') {
                            statusBadge = (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                PASS
                              </span>
                            );
                          } else if (statusUpper === 'FAIL') {
                            statusBadge = (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                                FAIL
                              </span>
                            );
                          } else {
                            statusBadge = (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                                UNKNOWN
                              </span>
                            );
                          }

                          return (
                            <tr key={r.control_id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                                {r.control_id}
                              </td>
                              <td className="py-3 px-4 text-slate-200 max-w-xs">
                                <div className="font-medium text-slate-100">{r.location || r.control_id}</div>
                                {r.rationale && (
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {r.rationale}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {statusBadge}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-md">
                                <div className="space-y-1">
                                  {r.location && (
                                    <div className="text-[10px] text-slate-500">
                                      Location: <code className="text-slate-400">{r.location}</code>
                                    </div>
                                  )}
                                  {r.expected_value !== undefined && r.expected_value !== null && (
                                    <div className="text-[10px] text-slate-500">
                                      Expected: <code className="text-emerald-400/90">{String(r.expected_value)}</code>
                                    </div>
                                  )}
                                  {hasObserved ? (
                                    <div className="bg-slate-950 p-1.5 rounded border border-slate-700 text-slate-300 break-all">
                                      {isExpanded && hasSourceLines ? (
                                        <ul className="space-y-1">
                                          {r.source_lines.map((sl: string, idx: number) => (
                                            <li key={idx} className="text-slate-300 font-mono">
                                              • {sl}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <span>
                                          Observed: {typeof r.observed_value === 'object' ? JSON.stringify(r.observed_value) : String(r.observed_value)}
                                          {hasSourceLines && (
                                            <span className="text-slate-500 ml-1">
                                              ({r.source_lines.length} source line{r.source_lines.length > 1 ? 's' : ''})
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 italic">No matching directive detected</span>
                                  )}
                                  {hasSourceLines && (
                                    <button
                                      onClick={() => toggleFrameworkExpand(r.control_id)}
                                      className="text-[10px] text-sky-400 hover:text-sky-300 font-mono cursor-pointer"
                                    >
                                      {isExpanded ? '[-] Collapse evidence' : '[+] Expand full evidence'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {statusUpper === 'FAIL' ? (
                                  <button
                                    onClick={() => onViewRemediation(r.control_id)}
                                    className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono font-semibold transition-colors border border-rose-800 flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Remediation &rarr;
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    {statusUpper === 'PASS' ? 'Compliant' : 'Inspect Manually'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
