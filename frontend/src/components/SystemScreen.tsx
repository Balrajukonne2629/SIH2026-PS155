import React, { useState } from 'react';
import { UserIdentity, SystemTab } from '../types';
import { AiModelManagerScreen } from './AiModelManagerScreen';
import { AiSuggestionReviewScreen } from './AiSuggestionReviewScreen';
import { AuditLogReportScreen } from './AuditLogReportScreen';

interface SystemScreenProps {
  currentUser: UserIdentity;
}

export const SystemScreen: React.FC<SystemScreenProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<SystemTab>('runtime');

  // Reviewer-only gate
  if (currentUser.role !== 'reviewer') {
    return (
      <div className="bg-rose-950/40 border border-rose-800 rounded p-10 text-center font-mono text-xs text-rose-300 space-y-3">
        <div className="text-rose-400 font-semibold text-sm">ACCESS RESTRICTED</div>
        <p>System operational controls are restricted exclusively to Authorized Reviewers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Top System Header */}
      <div className="bg-slate-900 border border-slate-700 rounded p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                System Operations &amp; Platform Controls
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Reviewer administrative area: Local AI inference runtime, trusted rule repository, and ledger cryptographic verification.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium self-start sm:self-auto uppercase">
            Administrative Console
          </span>
        </div>

        {/* System Subtabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'runtime'}
            onClick={() => setActiveTab('runtime')}
            className={`px-4 py-2 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'runtime'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            AI Runtime &amp; Hardware Telemetry
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'trusted_rules'}
            onClick={() => setActiveTab('trusted_rules')}
            className={`px-4 py-2 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'trusted_rules'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Trusted Rules Repository
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'integrity'}
            onClick={() => setActiveTab('integrity')}
            className={`px-4 py-2 rounded text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer ${
              activeTab === 'integrity'
                ? 'bg-sky-600 text-white border border-sky-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            Ledger Integrity Verification
          </button>
        </div>
      </div>

      {/* Selected Tab Subsystem View */}
      <div>
        {activeTab === 'runtime' && (
          <AiModelManagerScreen currentUser={currentUser} />
        )}

        {activeTab === 'trusted_rules' && (
          <AiSuggestionReviewScreen
            unmappedLine="service call-home"
            currentUser={currentUser}
            onApprovalCompleted={() => {}}
            onBackToAudit={() => setActiveTab('runtime')}
          />
        )}

        {activeTab === 'integrity' && (
          <AuditLogReportScreen currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};
export default SystemScreen;
