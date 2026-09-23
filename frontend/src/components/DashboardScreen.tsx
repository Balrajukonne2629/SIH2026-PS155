import React, { useState, useEffect } from 'react';
import { getLedger } from '../api';
import { formatToIST } from '../utils';
import { UserIdentity, GlobalScreenId, AuditWorkspaceTab } from '../types';
import { ReviewerDashboard } from './ReviewerDashboard';

interface DashboardScreenProps {
  currentUser: UserIdentity;
  onNavigate: (screen: GlobalScreenId) => void;
  onOpenAudit: (sessionId: string, initialTab?: AuditWorkspaceTab) => void;
  unmappedCount?: number;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  currentUser,
  onNavigate,
  onOpenAudit,
  unmappedCount = 0,
}) => {
  const role = currentUser.role;
  const isReviewer = role === 'reviewer';
  const isUploader = role === 'uploader';
  const isViewer = role === 'viewer';

  // Delegate to ReviewerDashboard when role is reviewer
  if (isReviewer) {
    return (
      <ReviewerDashboard
        currentUser={currentUser}
        onNavigate={onNavigate}
        onOpenAudit={onOpenAudit}
      />
    );
  }

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getLedger()
      .then((entries) => {
        if (isMounted) setLedgerEntries(entries || []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Header Greeting & Posture Banner */}
      <div className="bg-slate-900 border border-slate-700 rounded p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h1 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
                {isViewer && 'Compliance Assurance Portal'}
                {isUploader && 'Network Operations & Ingestion Console'}
                {isReviewer && 'Security Reviewer & Approver Console'}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Operator: <span className="text-sky-400 font-mono font-semibold">{currentUser.username}</span> • NTRO Deterministic Compliance Platform
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isViewer && (
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-700">
                Read-Only Clearance
              </span>
            )}
            {(isUploader || isReviewer) && (
              <button
                onClick={() => onNavigate('upload')}
                className="btn-primary"
              >
                + New Configuration Audit
              </button>
            )}
          </div>
        </div>

        {/* Role Notice & Quick Guidance */}
        <div className="pt-3 text-xs text-slate-400">
          {isViewer && (
            <p>
              You have read-only access to historical compliance audits, cryptographic certificates, and published reports. Select any audit below to inspect its results or open official reports.
            </p>
          )}
          {isUploader && (
            <p>
              Upload network configurations for deterministic CSM parsing and baseline rule verification. View your past audits, review failed controls, and generate compliance reports.
            </p>
          )}
          {isReviewer && (
            <p>
              Full operational clearance active. Review unmapped CLI lines, manage trusted rule mappings, inspect pre-deployment conflict analysis, and oversee model runtime telemetry.
            </p>
          )}
        </div>
      </div>

      {/* Reviewer Pending Callout */}
      {isReviewer && unmappedCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 border border-amber-700 font-mono font-bold">
              ACTION REQUIRED
            </span>
            <span className="text-amber-200 font-semibold">
              {unmappedCount} unmapped syntax item{unmappedCount > 1 ? 's' : ''} awaiting human verification in Review Queue.
            </span>
          </div>
          <button
            onClick={() => onNavigate('review_queue')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mono text-xs rounded uppercase tracking-wider cursor-pointer"
          >
            Open Review Queue &rarr;
          </button>
        </div>
      )}

      {/* Role Navigation Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(isUploader || isReviewer) && (
          <div
            onClick={() => onNavigate('upload')}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded p-4 cursor-pointer transition-all hover:bg-slate-800/40 space-y-2"
          >
            <div className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider">
              01 • Ingestion & Upload
            </div>
            <p className="text-xs text-slate-400">
              Upload raw configuration dumps (.cfg, .txt) for instant deterministic verification.
            </p>
            <div className="text-[11px] font-mono text-sky-300 pt-1">
              Start Ingestion &rarr;
            </div>
          </div>
        )}

        {(isUploader || isReviewer) && (
          <div
            onClick={() => onNavigate('audits')}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded p-4 cursor-pointer transition-all hover:bg-slate-800/40 space-y-2"
          >
            <div className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider">
              {isUploader ? '02 • My Audits' : '02 • Audits Registry'}
            </div>
            <p className="text-xs text-slate-400">
              Inspect device sessions, rule evaluation matrices, and evidence traces.
            </p>
            <div className="text-[11px] font-mono text-sky-300 pt-1">
              View Audits ({ledgerEntries.length}) &rarr;
            </div>
          </div>
        )}

        {isReviewer && (
          <div
            onClick={() => onNavigate('review_queue')}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded p-4 cursor-pointer transition-all hover:bg-slate-800/40 space-y-2"
          >
            <div className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Review Queue</span>
              {unmappedCount > 0 && (
                <span className="badge-unknown text-[10px]">
                  {unmappedCount}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Evaluate and promote AI semantic syntax proposals into trusted deterministic rules.
            </p>
            <div className="text-[11px] font-mono text-amber-300 pt-1">
              Open Queue &rarr;
            </div>
          </div>
        )}

        <div
          onClick={() => onNavigate('reports')}
          className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded p-4 cursor-pointer transition-all hover:bg-slate-800/40 space-y-2"
        >
          <div className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
            Reports &amp; Verification
          </div>
          <p className="text-xs text-slate-400">
            Export official PDF/DOCX compliance reports with embedded cryptographic SHA-256 signatures.
          </p>
          <div className="text-[11px] font-mono text-emerald-300 pt-1">
            Browse Reports &rarr;
          </div>
        </div>

        {isReviewer && (
          <div
            onClick={() => onNavigate('system')}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded p-4 cursor-pointer transition-all hover:bg-slate-800/40 space-y-2"
          >
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              System Operations
            </div>
            <p className="text-xs text-slate-400">
              Monitor local Ollama inference, hardware vitals, trusted rules repository, and ledger integrity.
            </p>
            <div className="text-xs font-medium text-sky-400 pt-1">
              Manage System &rarr;
            </div>
          </div>
        )}
      </div>

      {/* Recent Audits Table Section */}
      <div className="bg-slate-900 border border-slate-700 rounded">
        <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <h3 className="text-xs font-semibold text-slate-200">
              Recent Audits in Ledger ({ledgerEntries.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
          >
            View Full Ledger & Reports &rarr;
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2"></span>
            Loading recorded audits...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-300 font-mono">
            Failed to load audit records: {error}
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <h4 className="text-sm font-semibold text-slate-300">No Audits Recorded</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No configuration audits have been recorded in the ledger yet.
            </p>
            {(isUploader || isReviewer) && (
              <button
                onClick={() => onNavigate('upload')}
                className="btn-primary mt-2"
              >
                Upload First Configuration
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-left">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Entry / Device</th>
                  <th className="py-2.5 px-4 font-semibold">Timestamp (IST)</th>
                  <th className="py-2.5 px-4 font-semibold">Results Breakdown</th>
                  <th className="py-2.5 px-4 font-semibold">Compliance Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans text-xs">
                {ledgerEntries.slice(0, 5).map((entry, idx) => {
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

                  const badgeClass =
                    overallStatus === 'COMPLIANT'
                      ? 'badge-pass'
                      : overallStatus === 'NON-COMPLIANT'
                      ? 'badge-fail'
                      : 'badge-unknown';

                  const sessionId = entry.session_id || entry.entry_id;

                  return (
                    <tr key={entry.entry_id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-100">
                          {entry.device_hostname || 'unknown'}
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                          {entry.entry_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {formatToIST(entry.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-emerald-400 font-semibold">{passCount}P</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-rose-400 font-semibold">{failCount}F</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-amber-400 font-semibold">{unknownCount}U</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={badgeClass}>
                          {overallStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => onOpenAudit(sessionId, 'overview')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
                        >
                          Open Workspace &rarr;
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
export default DashboardScreen;
