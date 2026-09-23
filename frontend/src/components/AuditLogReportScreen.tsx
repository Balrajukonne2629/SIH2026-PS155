import React, { useState, useEffect } from 'react';
import { getLedger, verifyLedger, verifyReport, exportCanonicalReportBlob } from '../api';
import { ReportWorkflowPanel } from './ReportWorkflowPanel';
import { formatToIST } from '../utils';
import type { UserIdentity, AuditLedgerItem } from '../types';

interface Props {
  currentUser: UserIdentity;
}

export const AuditLogReportScreen: React.FC<Props> = ({ currentUser }) => {
  const canEdit = currentUser.role === 'reviewer' || currentUser.role === 'uploader';

  const [entries, setEntries] = useState<AuditLedgerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache canonical report_id per entry_id
  const [reportIdMap, setReportIdMap] = useState<Record<string, string | null>>({});

  // Global Chain Verification State
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState<{
    valid: boolean;
    message: string;
    broken_entry_index?: number;
    detail?: string;
  } | null>(null);
  const [showChainDetails, setShowChainDetails] = useState(false);

  // --- REPORT WORKSPACE MODAL STATE ---
  const [activeEntry, setActiveEntry] = useState<AuditLedgerItem | null>(null);
  const [workspaceEditMode, setWorkspaceEditMode] = useState(false);
  const [workspaceExportFormat, setWorkspaceExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [isWorkspaceExporting, setIsWorkspaceExporting] = useState(false);
  const [workspaceExportError, setWorkspaceExportError] = useState<string | null>(null);

  // Per-entry PDF Verification State
  const [verifyingPdfMap, setVerifyingPdfMap] = useState<Record<string, boolean>>({});
  const [pdfVerifyResults, setPdfVerifyResults] = useState<Record<string, { valid: boolean; message: string }>>({});

  useEffect(() => {
    loadLedger();
  }, []);

  // Keyboard shortcut: close workspace modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeEntry) {
        handleCloseWorkspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEntry]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (activeEntry) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeEntry]);

  const loadLedger = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLedger();
      setEntries(data || []);
      if (data && data.length > 0) {
        // Cache canonical report_ids directly from ledger response (O(1), zero extra HTTP calls)
        const initialReportMap: Record<string, string | null> = {};
        for (const item of data) {
          initialReportMap[item.entry_id] = item.report_id || null;
        }
        setReportIdMap(initialReportMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWorkspace = (entry: AuditLedgerItem) => {
    setActiveEntry(entry);
    setWorkspaceEditMode(false);
    setWorkspaceExportError(null);
  };

  const handleCloseWorkspace = () => {
    setActiveEntry(null);
    setWorkspaceEditMode(false);
    setWorkspaceExportError(null);
  };

  // Global Ledger Action: GET /api/ledger/verify
  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    setShowChainDetails(false);
    try {
      const res = await verifyLedger();
      setChainResult(res);
    } catch (err: any) {
      if (err.data && typeof err.data.valid === 'boolean') {
        setChainResult(err.data);
      } else {
        setChainResult({ valid: false, message: err.message || 'Verification check error' });
      }
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // Dedicated Report Action: GET /api/report/{entry_id}/verify
  const handleVerifyPdf = async (entryId: string) => {
    setVerifyingPdfMap((prev) => ({ ...prev, [entryId]: true }));
    try {
      const res = await verifyReport(entryId);
      setPdfVerifyResults((prev) => ({
        ...prev,
        [entryId]: { valid: res.valid, message: res.message }
      }));
    } catch (err: any) {
      setPdfVerifyResults((prev) => ({
        ...prev,
        [entryId]: { valid: false, message: err.message }
      }));
    } finally {
      setVerifyingPdfMap((prev) => ({ ...prev, [entryId]: false }));
    }
  };

  // Dedicated Report Action: Authenticated canonical export (PDF or DOCX)
  const handleExportCanonical = async (entryId: string, reportId: string | null) => {
    if (!reportId) {
      setWorkspaceExportError(`Canonical report unavailable for legacy record '${entryId}'.`);
      return;
    }

    setIsWorkspaceExporting(true);
    setWorkspaceExportError(null);
    try {
      const blob = await exportCanonicalReportBlob(reportId, workspaceExportFormat);
      const filename = `audit_report_${reportId}.${workspaceExportFormat}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setWorkspaceExportError(err.message);
    } finally {
      setIsWorkspaceExporting(false);
    }
  };

  const canonicalCount = entries.filter((e) => Boolean(e.has_canonical_report || e.report_id || reportIdMap[e.entry_id])).length;

  return (
    <div className="space-y-5 font-sans">
      {/* Global Header: Control Center & Persistent Integrity Status */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                Cryptographic Audit Ledger &amp; Reports
              </h1>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Module 5 · Non-Repudiation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Append-only SHA-256 hash-chained compliance registry (<code className="font-mono text-slate-300">audit_log.jsonl</code>) &amp; verified reports.
            </p>
          </div>

          {/* Ledger Summary & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 font-mono text-xs bg-slate-950/70 border border-slate-800 rounded px-2.5 py-1.5 text-slate-400">
              <span>Total: <strong className="text-slate-200">{entries.length}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Canonical: <strong className="text-sky-300">{canonicalCount}</strong></span>
            </div>

            <button
              onClick={loadLedger}
              className="px-3 py-1.5 rounded text-xs font-mono bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              title="Reload ledger from server"
            >
              ↻ Reload Ledger
            </button>

            <button
              onClick={handleVerifyChain}
              disabled={isVerifyingChain || entries.length === 0}
              className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors shadow-xs flex items-center gap-2 border cursor-pointer ${
                isVerifyingChain
                  ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
              }`}
            >
              {isVerifyingChain ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                  <span className="font-mono text-xs">Verifying SHA-256 Hashes...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Verify Chain Integrity</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Persistent Integrity Status Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          {!chainResult ? (
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span>Chain integrity status: Unverified in current session</span>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Run &ldquo;Verify Chain Integrity&rdquo; to re-walk SHA-256 parent linkage
              </span>
            </div>
          ) : chainResult.valid ? (
            <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold tracking-wide">
                  Chain integrity verified · {entries.length} entries
                </span>
                <span className="text-emerald-400/80 text-[11px] font-normal hidden md:inline">
                  ({chainResult.message})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                VALIDATED
              </span>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span className="font-bold text-rose-300">
                    Integrity divergence detected · Entry {chainResult.broken_entry_index ? chainResult.broken_entry_index.toString().padStart(2, '0') : '01'}
                  </span>
                  <span className="text-rose-300/80 text-[11px] hidden md:inline">
                    ({chainResult.message})
                  </span>
                </div>
                <button
                  onClick={() => setShowChainDetails(!showChainDetails)}
                  className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 transition-colors cursor-pointer"
                >
                  {showChainDetails ? 'Hide Details ▲' : 'Technical Details ▼'}
                </button>
              </div>
              {showChainDetails && (
                <div className="mt-2.5 pt-2 border-t border-rose-900/40 font-mono text-[11px] text-slate-300 space-y-1 bg-slate-950/80 p-2.5 rounded border border-rose-900/40 animate-reveal">
                  <div><span className="text-slate-500">Status Code:</span> <code className="text-rose-400">HTTP 409 Conflict</code></div>
                  <div><span className="text-slate-500">Broken Entry Index:</span> <code className="text-slate-200">{chainResult.broken_entry_index ?? 1}</code></div>
                  <div><span className="text-slate-500">Cryptographic Linkage:</span> <code className="text-amber-300">prevEntryHash mismatch at entry #{chainResult.broken_entry_index ?? 1}</code></div>
                  <div><span className="text-slate-500">Full Diagnostic:</span> <code className="text-slate-300 break-all select-all">{chainResult.detail || chainResult.message}</code></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Ledger Content */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-700 rounded p-12 text-center font-mono text-xs text-slate-300 space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>Reading cryptographic ledger from backend (<code className="text-sky-300">audit_log.jsonl</code>)...</div>
        </div>
      ) : error ? (
        <div className="bg-rose-950/40 border border-rose-800 rounded p-8 text-center font-mono text-xs space-y-3">
          <div className="text-rose-400 font-bold text-sm">Failed to Load Audit Ledger</div>
          <p className="text-rose-200 max-w-lg mx-auto">{error}</p>
          <button
            onClick={loadLedger}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 cursor-pointer"
          >
            ↻ Retry Ledger Fetch
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700 rounded p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 text-slate-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-slate-200">Audit Ledger Is Currently Empty</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No compliance audits have been finalized yet. To create an entry in the cryptographic ledger, upload a config and complete the review loop.
          </p>
        </div>
      ) : (
        /* Connected-Entry Cryptographic Chain Timeline */
        <div className="relative pl-6 sm:pl-8 space-y-3">
          {/* Continuous Cryptographic Chain Spine */}
          <div className="absolute left-[19px] sm:left-[23px] top-4 bottom-4 w-0.5 bg-slate-700/60 z-0"></div>

          {entries.map((entry, index) => {
            const isGenesis = entry.prevEntryHash === '0000000000000000000000000000000000000000000000000000000000000000';
            const results = entry.audit_results || {};
            const passCount = Object.values(results).filter((v) => v === 'Pass').length;
            const failCount = Object.values(results).filter((v) => v === 'Fail').length;
            const unknownCount = Object.values(results).filter((v) => v === 'Unknown').length;

            const hasCanonical = Boolean(entry.has_canonical_report || entry.report_id || reportIdMap[entry.entry_id]);

            return (
              <div
                key={entry.entry_id}
                className="relative z-10 flex items-stretch gap-3 sm:gap-3.5 animate-reveal"
              >
                {/* Cryptographic Node Sequence Badge (Timeline Node) */}
                <div className="flex flex-col items-center justify-center shrink-0 w-7 sm:w-8">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold shrink-0 ring-4 ring-slate-950 shadow-xs z-10 ${
                      isGenesis
                        ? 'bg-slate-800 text-slate-300 border border-slate-600'
                        : 'bg-sky-950 text-sky-400 border border-sky-600'
                    }`}
                    title={isGenesis ? 'Genesis Block (#01)' : `Node #${(index + 1).toString().padStart(2, '0')}`}
                  >
                    #{(index + 1).toString().padStart(2, '0')}
                  </div>
                </div>

                {/* Audit Information Grid (Card) */}
                <div className="flex-1 min-w-0 bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-lg p-3 sm:p-3.5 transition-all shadow-xs">
                  {/* Primary Row Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                    {/* 1. Audit Identity & Status Classification */}
                    <div className="lg:col-span-4 flex items-center gap-2 min-w-0">
                      <span
                        className="font-mono text-xs sm:text-sm font-bold text-slate-100 truncate select-all cursor-pointer hover:underline"
                        title={`Audit Entry ID: ${entry.entry_id}`}
                      >
                        {entry.entry_id}
                      </span>
                      {isGenesis && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          GENESIS
                        </span>
                      )}
                      {hasCanonical ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 shrink-0">
                          CANONICAL
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          LEGACY
                        </span>
                      )}
                    </div>

                    {/* 2. Device + Timestamp */}
                    <div className="lg:col-span-3 flex flex-col justify-center min-w-0 font-mono text-xs">
                      <div className="text-slate-200 truncate font-medium flex items-center gap-1.5">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider">HOST:</span>
                        <span className="truncate">{entry.device_hostname}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums truncate" title={`UTC: ${entry.timestamp}`}>
                        {formatToIST(entry.timestamp)}
                      </div>
                    </div>

                    {/* 3. Compliance Verdict & Counts */}
                    <div className="lg:col-span-3 flex items-center gap-2 font-mono text-xs tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${
                          failCount > 0
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                            : unknownCount > 0
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        }`}
                      >
                        {failCount > 0 ? 'NON-COMPLIANT' : unknownCount > 0 ? 'ATTENTION' : 'COMPLIANT'}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span className={passCount > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {passCount}P
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className={failCount > 0 ? 'text-rose-400 font-medium' : 'text-slate-500'}>
                          {failCount}F
                        </span>
                        {unknownCount > 0 && (
                          <>
                            <span className="text-slate-600">/</span>
                            <span className="text-amber-400 font-medium">{unknownCount}U</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 4. Primary Action: View Report */}
                    <div className="lg:col-span-2 flex justify-start lg:justify-end">
                      <button
                        onClick={() => handleOpenWorkspace(entry)}
                        className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-sky-600 hover:bg-sky-500 text-white border border-sky-500 transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title={`Open report workspace for ${entry.entry_id}`}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Authentic Cryptographic Chain Linkage Sub-bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">PROVENANCE:</span>
                      <span className="text-slate-500">prev</span>
                      <code
                        className="text-slate-400 select-all cursor-help hover:text-slate-200"
                        title={`Authentic Previous Block Hash: ${entry.prevEntryHash}`}
                      >
                        {entry.prevEntryHash.substring(0, 8)}...{entry.prevEntryHash.substring(56)}
                      </code>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-500">node</span>
                      <code
                        className="text-emerald-400 font-medium select-all cursor-help hover:text-emerald-300"
                        title={`Authentic Entry Hash: ${entry.entryHash}`}
                      >
                        {entry.entryHash.substring(0, 8)}...{entry.entryHash.substring(56)}
                      </code>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500">config</span>
                      <code
                        className="text-sky-300/90 select-all cursor-help hover:text-sky-200"
                        title={`Configuration Hash: ${entry.config_file_hash}`}
                      >
                        {(entry.config_file_hash || '').substring(0, 10)}...
                      </code>
                    </div>

                    <span className="text-[10px] text-slate-500 shrink-0 hidden sm:inline">
                      SHA-256 Hash Chain
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REPORT WORKSPACE (LARGE CENTERED RESPONSIVE MODAL)     */}
      {/* ========================================================= */}
      {activeEntry && (() => {
        const canonicalReportId = activeEntry.report_id || reportIdMap[activeEntry.entry_id];
        const hasCanonical = Boolean(activeEntry.has_canonical_report || activeEntry.report_id || canonicalReportId);
        const results = activeEntry.audit_results || {};
        const passCount = Object.values(results).filter((v) => v === 'Pass').length;
        const failCount = Object.values(results).filter((v) => v === 'Fail').length;
        const unknownCount = Object.values(results).filter((v) => v === 'Unknown').length;
        const total = passCount + failCount + unknownCount;
        const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';

        const pdfVerification = pdfVerifyResults[activeEntry.entry_id];
        const isVerifyingPdf = verifyingPdfMap[activeEntry.entry_id] || false;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={handleCloseWorkspace}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-title"
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-modal-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-700 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="workspace-title" className="text-sm font-bold text-slate-100 font-sans">
                        Audit Compliance Report Workspace
                      </h2>
                      {hasCanonical ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 font-bold">
                          CANONICAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          LEGACY RECORD
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-slate-400 mt-0.5">
                      <span>Audit ID: <code className="text-sky-300 font-bold select-all">{activeEntry.entry_id}</code></span>
                      <span className="text-slate-600">|</span>
                      <span>Device: <strong className="text-slate-200">{activeEntry.device_hostname}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>{formatToIST(activeEntry.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleCloseWorkspace}
                  className="px-3 py-1.5 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Close Workspace (Escape)"
                >
                  <span>✕ Close (Esc)</span>
                </button>
              </div>

              {/* Compliance & Cryptographic Integrity Summary Bar */}
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 text-[11px] uppercase font-bold mr-1">Compliance Summary:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700">
                    {passCount} PASS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-700">
                    {failCount} FAIL
                  </span>
                  {unknownCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-700">
                      {unknownCount} UNKNOWN
                    </span>
                  )}
                  <span className="ml-1 px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800">
                    {passRate}% Pass Rate
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-500">Node SHA-256:</span>
                  <code
                    className="text-emerald-400 font-bold select-all cursor-help"
                    title={`Full Entry Hash: ${activeEntry.entryHash}`}
                  >
                    {activeEntry.entryHash.substring(0, 16)}...
                  </code>
                </div>
              </div>

              {/* ACTION BAR (Dedicated Workspace Action Bar) */}
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Verify PDF Button */}
                  <button
                    onClick={() => handleVerifyPdf(activeEntry.entry_id)}
                    disabled={isVerifyingPdf}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded text-xs font-mono font-semibold border border-slate-700 transition-[transform,background-color] duration-150 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Cryptographically verify PDF certificate against ledger hash"
                  >
                    {isVerifyingPdf ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>Verifying PDF Certificate...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Verify PDF Certificate</span>
                      </>
                    )}
                  </button>

                  {/* Format Selector + Export Button (for canonical records) */}
                  {hasCanonical && canonicalReportId ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={workspaceExportFormat}
                        onChange={(e) => setWorkspaceExportFormat(e.target.value as 'pdf' | 'docx')}
                        className="text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
                        aria-label="Export Format"
                      >
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                      </select>
                      <button
                        onClick={() => handleExportCanonical(activeEntry.entry_id, canonicalReportId)}
                        disabled={isWorkspaceExporting}
                        className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] border flex items-center gap-1.5 shadow-xs cursor-pointer ${
                          isWorkspaceExporting
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
                        }`}
                        title={`Export canonical report as ${workspaceExportFormat.toUpperCase()}`}
                      >
                        {isWorkspaceExporting ? (
                          <>
                            <span className="inline-block w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export {workspaceExportFormat.toUpperCase()}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500 italic">
                      Export unavailable for legacy records
                    </span>
                  )}
                </div>

                {/* Edit Report Toggle Button (for Reviewer / Uploader on Canonical records) */}
                {canEdit && hasCanonical && canonicalReportId && (
                  <button
                    onClick={() => setWorkspaceEditMode((prev) => !prev)}
                    className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold border transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      workspaceEditMode
                        ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        : 'bg-amber-950/70 hover:bg-amber-900 text-amber-300 border-amber-700'
                    }`}
                    title={workspaceEditMode ? 'Exit editor and view formatted report' : 'Open canonical report editor'}
                  >
                    {workspaceEditMode ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View Mode</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Report</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* PDF Verification Feedback Banner */}
              {pdfVerification && (
                <div className="px-5 pt-3 shrink-0">
                  <div
                    className={`p-3 rounded border text-xs font-mono flex items-center justify-between animate-reveal ${
                      pdfVerification.valid
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-700 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {pdfVerification.valid ? '✓' : '✗'}
                      </span>
                      <span>{pdfVerification.message}</span>
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-black/30 border border-current">
                      {pdfVerification.valid ? 'AUTHENTIC' : 'INVALID / TAMPERED'}
                    </span>
                  </div>
                </div>
              )}

              {/* Export Error Banner */}
              {workspaceExportError && (
                <div className="px-5 pt-3 shrink-0">
                  <div className="p-3 rounded border text-xs font-mono bg-rose-950/60 border-rose-700 text-rose-300 flex items-center justify-between">
                    <span>Export failed: {workspaceExportError}</span>
                    <button
                      onClick={() => setWorkspaceExportError(null)}
                      className="text-rose-400 hover:text-rose-200 ml-2 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body / Report Content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 font-sans">
                {hasCanonical && canonicalReportId ? (
                  <ReportWorkflowPanel
                    reportId={canonicalReportId}
                    currentUser={currentUser}
                    isEditing={workspaceEditMode}
                    onToggleEdit={setWorkspaceEditMode}
                    showInternalToolbar={false}
                  />
                ) : (
                  /* Legacy Record Findings Display */
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded text-slate-400 font-mono text-xs space-y-1.5">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
                        Historical Audit Record (Legacy)
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed font-sans">
                        This audit was recorded prior to canonical report generation. Audit verdicts, evaluated rules, and cryptographic hashes are permanently preserved in the append-only SHA-256 ledger.
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="font-bold uppercase text-slate-300">
                          Evaluated Security Controls ({Object.keys(results).length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-96 overflow-y-auto">
                        {Object.entries(results).map(([ruleId, verdict]) => (
                          <div
                            key={ruleId}
                            className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <span className="text-[11px] text-slate-300 font-semibold truncate" title={ruleId}>
                              {ruleId}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                verdict === 'Pass'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : verdict === 'Fail'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700'
                              }`}
                            >
                              {String(verdict).toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
