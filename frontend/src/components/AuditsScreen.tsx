import React, { useState, useEffect } from 'react';
import { getAuditSessions } from '../api';
import { formatToISTParts } from '../utils';
import { UserIdentity, AuditWorkspaceTab, AuditSessionSummary } from '../types';

interface AuditsScreenProps {
  currentUser: UserIdentity;
  onOpenAudit: (sessionId: string, initialTab?: AuditWorkspaceTab) => void;
  onNavigateToUpload?: () => void;
}

export const AuditsScreen: React.FC<AuditsScreenProps> = ({
  currentUser,
  onOpenAudit,
  onNavigateToUpload,
}) => {
  const [sessions, setSessions] = useState<AuditSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'in_progress' | 'submitted' | 'finalized'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  // Close overflow menus on outside click or Escape key
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-audit-row-menu]')) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchAudits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAuditSessions();
      setSessions(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedNotice(`${label} copied to clipboard`);
      setTimeout(() => setCopiedNotice(null), 2000);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const id = (s.session_id || '').toLowerCase();
    const filename = (s.filename || '').toLowerCase();
    const hostname = (s.device_hostname || '').toLowerCase();
    const owner = (s.owner_user_id || '').toLowerCase();
    const vendor = (s.vendor || '').toLowerCase();

    const matchesSearch =
      id.includes(q) ||
      filename.includes(q) ||
      hostname.includes(q) ||
      owner.includes(q) ||
      vendor.includes(q);

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && s.workflow_status !== statusFilter) {
      return false;
    }

    return true;
  });

  const screenTitle =
    currentUser.role === 'uploader'
      ? 'My Audits'
      : currentUser.role === 'reviewer'
      ? 'All Audits'
      : currentUser.role === 'viewer'
      ? 'Audits'
      : 'Audits';

  const screenSubtitle =
    currentUser.role === 'uploader'
      ? 'Audit sessions uploaded and owned by your account.'
      : currentUser.role === 'reviewer'
      ? 'Enterprise audit session registry across all network device evaluations.'
      : 'Compliance audit records and evaluation results.';

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-amber-950/50 text-amber-300 border-amber-800/80">
            In Progress
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-sky-950/60 text-sky-300 border-sky-800">
            Submitted
          </span>
        );
      case 'finalized':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-950/50 text-emerald-300 border-emerald-800/80">
            Finalized
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-800 text-slate-300 border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100 animate-reveal">
      {/* Toast Feedback for Copy Actions */}
      {copiedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-lg bg-slate-900/95 text-slate-100 text-xs font-medium shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              {screenTitle}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {screenSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAudits}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded text-xs font-medium border border-slate-700 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer"
          >
            ↻ Refresh
          </button>
          {onNavigateToUpload && currentUser.role !== 'viewer' && (
            <button
              onClick={onNavigateToUpload}
              className="btn-primary"
            >
              + Upload Config
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900 border border-slate-700 rounded p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by session ID, filename, hostname, or owner..."
            className="w-full input-base"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded px-2.5 py-2 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            aria-label="Filter audits by workflow status"
          >
            <option value="ALL">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="finalized">Finalized</option>
          </select>

          <span className="text-xs text-slate-400 font-mono whitespace-nowrap pl-1">
            Showing <strong className="text-slate-200">{filteredSessions.length}</strong> of {sessions.length}
          </span>
        </div>
      </div>

      {/* Audits Table */}
      <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2"></span>
            Loading audit sessions from server...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400 font-mono">
            Error loading audit sessions: {error}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <h4 className="text-sm font-semibold text-slate-300">No Audits Found</h4>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No audit sessions match your active search or filter criteria.'
                : currentUser.role === 'uploader'
                ? 'No audit sessions found for your account. Upload a network device configuration to begin.'
                : 'No audit sessions exist in the system.'}
            </p>
            {currentUser.role === 'uploader' && onNavigateToUpload && (
              <div className="pt-2">
                <button onClick={onNavigateToUpload} className="btn-primary">
                  Upload Configuration
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-left">
              <thead className="table-header">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Session ID</th>
                  <th className="py-2.5 px-3 font-semibold">Config / Device</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp (IST)</th>
                  <th className="py-2.5 px-3 font-semibold">Owner</th>
                  <th className="py-2.5 px-3 font-semibold">Vendor</th>
                  <th className="py-2.5 px-3 font-semibold">Compliance Score</th>
                  <th className="py-2.5 px-3 font-semibold">Workflow Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans text-xs">
                {filteredSessions.map((session, idx) => {
                  const isMenuOpen = activeMenuId === session.session_id;
                  const { dateStr, timeStr } = formatToISTParts(session.created_at);
                  const score = session.compliance_score ?? 0;

                  return (
                    <tr
                      key={session.session_id || idx}
                      className="hover:bg-slate-800/40 transition-colors duration-150"
                    >
                      {/* Session ID */}
                      <td className="py-2.5 px-3 font-mono font-medium text-sky-400">
                        <span className="text-slate-500 mr-1 select-all">#{idx + 1}</span>
                        <span
                          className="text-xs truncate max-w-[140px] inline-block align-bottom select-all cursor-pointer hover:underline"
                          title={`Click to copy Session ID: ${session.session_id}`}
                          onClick={() => copyToClipboard(session.session_id, 'Session ID')}
                        >
                          {session.session_id}
                        </span>
                      </td>

                      {/* File / Device */}
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-100">
                        <div className="truncate max-w-[160px]" title={session.filename || session.device_hostname || 'unknown'}>
                          <span className="font-semibold text-slate-200">{session.filename || 'config.txt'}</span>
                          {session.device_hostname && (
                            <span className="block text-[11px] font-mono text-slate-400">
                              {session.device_hostname}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Timestamp (IST) */}
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        <div className="leading-tight">
                          <span className="text-slate-200 font-medium">{dateStr}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">{timeStr}</span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                          {session.owner_user_id || 'system'}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-2.5 px-3 font-mono text-xs uppercase text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                          {session.vendor || 'cisco'}
                        </span>
                      </td>

                      {/* Compliance Score */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${
                              score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {score.toFixed(1)}%
                          </span>
                          {session.total_rules !== undefined && session.total_rules > 0 && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({session.passed_rules}P / {session.failed_rules}F / {session.unknown_rules}U)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-2.5 px-3">
                        {renderStatusBadge(session.workflow_status)}
                      </td>

                      {/* Action Cell */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-flex items-center gap-1.5" data-audit-row-menu>
                          <button
                            onClick={() => onOpenAudit(session.session_id, 'overview')}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer whitespace-nowrap shadow-xs"
                            title="Open audit workspace"
                          >
                            Open Audit &rarr;
                          </button>

                          {/* Overflow Menu Button [⋯] */}
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(isMenuOpen ? null : session.session_id)}
                            aria-expanded={isMenuOpen}
                            aria-label={`More actions for audit ${session.session_id}`}
                            className={`p-1 rounded text-xs font-bold transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer border ${
                              isMenuOpen
                                ? 'bg-slate-700 text-slate-100 border-slate-600'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title="More options"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="4" cy="10" r="1.75" />
                              <circle cx="10" cy="10" r="1.75" />
                              <circle cx="16" cy="10" r="1.75" />
                            </svg>
                          </button>

                          {/* Compact Popover Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1 text-left text-xs divide-y divide-slate-700/60 animate-in fade-in zoom-in-95 duration-100">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(session.session_id, 'Session ID');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                                >
                                  <span>Copy Session ID</span>
                                  <span className="font-mono text-[10px] text-slate-400">ID</span>
                                </button>
                                {session.config_file_hash && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      copyToClipboard(session.config_file_hash!, 'Config Hash');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                                  >
                                    <span>Copy Config Hash</span>
                                    <span className="font-mono text-[10px] text-slate-400">SHA</span>
                                  </button>
                                )}
                              </div>
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenAudit(session.session_id, 'results');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-between cursor-pointer"
                                >
                                  <span>Open Results Matrix</span>
                                  <span className="text-[10px] text-sky-500">&rarr;</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenAudit(session.session_id, 'report');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                                >
                                  <span>View Report &amp; Ledger</span>
                                  <span className="text-[10px] text-sky-500">&rarr;</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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

export default AuditsScreen;
