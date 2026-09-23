import React, { useState, useEffect } from 'react';
import {
  UserIdentity,
  AuditWorkspaceState,
  AuditWorkspaceTab,
  AuditWorkflowStatus,
  GlobalScreenId
} from '../types';
import { submitAuditSession } from '../api';
import { AuditResultsScreen } from './AuditResultsScreen';
import { AiSuggestionReviewScreen } from './AiSuggestionReviewScreen';
import { RemediationDetailScreen } from './RemediationDetailScreen';
import { AuditLogReportScreen } from './AuditLogReportScreen';

interface AuditWorkspaceProps {
  workspaceState: AuditWorkspaceState;
  onTabChange: (tab: AuditWorkspaceTab) => void;
  onExitWorkspace: (destination?: GlobalScreenId) => void;
  currentUser: UserIdentity;
  cachedResults: any;
  onSelectRemediationRule?: (ruleId: string) => void;
  onSelectUnmappedLine?: (line: string) => void;
  onAuditFinalized?: (data: any) => void;
}

const TAB_DISPLAY_NAMES: Record<AuditWorkspaceTab, string> = {
  overview: 'Overview',
  results: 'Results Matrix',
  evidence: 'Evidence',
  ai_review: 'AI Review',
  remediation: 'Remediation',
  conflicts: 'Conflict Analysis',
  report: 'Report & Ledger',
};

export const AuditWorkspace: React.FC<AuditWorkspaceProps> = ({
  workspaceState,
  onTabChange,
  onExitWorkspace,
  currentUser,
  cachedResults,
  onSelectRemediationRule,
  onSelectUnmappedLine,
  onAuditFinalized,
}) => {
  const { sessionId, activeTab, unmappedLine, ruleId } = workspaceState;

  const [workflowStatus, setWorkflowStatus] = useState<AuditWorkflowStatus>(
    cachedResults?.workflow_status || 'in_progress'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (cachedResults?.workflow_status) {
      setWorkflowStatus(cachedResults.workflow_status);
    }
  }, [cachedResults?.workflow_status]);

  const unmappedCount = cachedResults?.unmapped_lines?.length ?? 0;
  const hostname = cachedResults?.device_hostname || 'Target Device';
  const platform = cachedResults?.platform || 'Multi-Vendor Router/Switch';

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const res = await submitAuditSession(sessionId);
      setWorkflowStatus(res.workflow_status || 'submitted');
      setSubmitSuccess('Audit successfully submitted for review.');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit audit for review');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="space-y-6 font-sans text-slate-100">
      {/* Contextual Workspace Header */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <button
              onClick={() => onExitWorkspace('audits')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-sans text-xs font-medium border border-slate-700 transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Close Audit Workspace and return to Audits Registry"
            >
              <span aria-hidden="true">&larr;</span>
              <span>Exit Workspace</span>
            </button>
            <span className="text-slate-600">/</span>
            <button
              onClick={() => onExitWorkspace('audits')}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer hover:underline"
              title="Return to Audits Registry"
            >
              Audits
            </button>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Audited Target Device"></span>
              <span className="font-mono text-xs font-semibold text-slate-200">{hostname}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 leading-none">
                {platform}
              </span>
            </div>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs font-bold text-sky-400 uppercase">
              {TAB_DISPLAY_NAMES[activeTab] || activeTab.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <div className="text-xs text-slate-400 font-mono">
              Session: <code className="text-sky-300 font-bold">{sessionId}</code>
            </div>
            <span className="text-slate-700">|</span>
            <div className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
              <span>Status:</span>
              {renderStatusBadge(workflowStatus)}
            </div>
            <span className="text-slate-700">|</span>
            <span className="text-xs text-slate-400 font-sans">
              Clearance: <span className="text-emerald-400 uppercase font-mono font-semibold">{currentUser.role}</span>
            </span>

            {/* Uploader Submit Action */}
            {currentUser.role === 'uploader' && workflowStatus === 'in_progress' && (
              <button
                onClick={handleSubmitForReview}
                disabled={isSubmitting}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Submit this audit session for reviewer review and sign-off"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
            {currentUser.role === 'uploader' && workflowStatus === 'submitted' && (
              <span className="text-[11px] font-mono text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/60">
                Awaiting Reviewer Sign-off
              </span>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {submitSuccess && (
          <div className="mt-2.5 p-2 bg-emerald-950/60 border border-emerald-800 rounded text-xs text-emerald-300 flex items-center justify-between">
            <span>{submitSuccess}</span>
            <button onClick={() => setSubmitSuccess(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer font-bold px-1">×</button>
          </div>
        )}
        {submitError && (
          <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-800 rounded text-xs text-rose-300 flex items-center justify-between">
            <span>{submitError}</span>
            <button onClick={() => setSubmitError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer font-bold px-1">×</button>
          </div>
        )}

        {/* Contextual Workspace Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3" role="tablist" aria-label="Audit Workspace Tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Overview
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'results'}
            onClick={() => onTabChange('results')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Results Matrix
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'evidence'}
            onClick={() => onTabChange('evidence')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Evidence
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'ai_review'}
            onClick={() => onTabChange('ai_review')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai_review'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <span>AI Review</span>
            {unmappedCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold leading-none">
                {unmappedCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'remediation'}
            onClick={() => onTabChange('remediation')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'remediation'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Remediation
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'conflicts'}
            onClick={() => onTabChange('conflicts')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'conflicts'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Conflict Analysis
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'report'}
            onClick={() => onTabChange('report')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Report &amp; Ledger
          </button>
        </div>
      </div>

      {/* Workspace Body / Contextual Views */}
      <div>
        {(activeTab === 'overview' || activeTab === 'results' || activeTab === 'evidence') && (
          <AuditResultsScreen
            sessionId={sessionId}
            initialResults={cachedResults}
            viewMode={activeTab}
            onReviewAiSuggestions={(line) => {
              onSelectUnmappedLine?.(line);
              onTabChange('ai_review');
            }}
            onViewRemediation={(remRuleId) => {
              onSelectRemediationRule?.(remRuleId);
              onTabChange('remediation');
            }}
            onNavigateToLedger={() => onTabChange('report')}
          />
        )}

        {activeTab === 'ai_review' && (
          <AiSuggestionReviewScreen
            unmappedLine={unmappedLine || 'service call-home'}
            sessionId={sessionId}
            currentUser={currentUser}
            onApprovalCompleted={() => onTabChange('results')}
            onBackToAudit={() => onTabChange('results')}
          />
        )}

        {(activeTab === 'remediation' || activeTab === 'conflicts') && (
          <RemediationDetailScreen
            ruleId={ruleId || 'CISCO-NTP-001'}
            sessionId={sessionId}
            viewMode={activeTab}
            currentUser={currentUser}
            onBackToAudit={() => onTabChange('results')}
            onAuditFinalized={(data) => {
              setWorkflowStatus('finalized');
              onAuditFinalized?.(data);
              onTabChange('report');
            }}
          />
        )}

        {activeTab === 'report' && (
          <AuditLogReportScreen currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};
export default AuditWorkspace;
