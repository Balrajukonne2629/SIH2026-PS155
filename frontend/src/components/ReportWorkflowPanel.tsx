/**
 * NTRO PS26155 — Report Workflow Panel (Phase 4.0 Enhanced)
 *
 * Attaches to a canonical AuditReport (identified by report_id from the finalize response).
 * Provides:
 *  - Canonical Report Preview: Complete structured inspection of executive summary, observations,
 *    recommendations, additional findings, reviewer notes, evaluated frameworks, and edit history.
 *  - Edit Report: Inline form for allowlisted editable fields, shows [Edited manually] badge.
 *  - Export Report: PDF or DOCX download using authenticated fetch (Bearer token forwarded).
 *
 * Authorization is enforced by the backend; the UI reflects permitted capabilities.
 * Viewer can view/export but not edit. Uploader/reviewer can also edit.
 */

import React, { useState, useEffect } from 'react';
import { patchCanonicalReport, exportCanonicalReportBlob, getCanonicalReport, ApiError } from '../api';
import { formatToIST } from '../utils';
import type { UserIdentity } from '../types';

// The editable fields the backend allows — kept in sync with audit_report.ALLOWED_TOP_LEVEL_EDITABLE_FIELDS
export const EDITABLE_FIELDS = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'auditor_observations', label: 'Auditor Observations' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'additional_findings', label: 'Additional Findings' },
  { key: 'final_reviewer_notes', label: 'Final Reviewer Notes' },
] as const;

export type EditableFieldKey = typeof EDITABLE_FIELDS[number]['key'];

interface Props {
  reportId: string;
  currentUser: UserIdentity;
  initialEditMode?: boolean;
  isEditing?: boolean;
  onToggleEdit?: (editing: boolean) => void;
  showInternalToolbar?: boolean;
  onReportLoaded?: (report: any) => void;
}

export const ReportWorkflowPanel: React.FC<Props> = ({
  reportId,
  currentUser,
  initialEditMode = false,
  isEditing,
  onToggleEdit,
  showInternalToolbar = true,
  onReportLoaded,
}) => {
  const canEdit = currentUser.role === 'reviewer' || currentUser.role === 'uploader';

  // --- Edit & Report state ---
  const [internalEditMode, setInternalEditMode] = useState(initialEditMode);
  const activeEditMode = isEditing !== undefined ? isEditing : internalEditMode;

  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedField, setSelectedField] = useState<EditableFieldKey>('executive_summary');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // --- Export state (for internal toolbar) ---
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync internal state if initialEditMode changes
  useEffect(() => {
    if (initialEditMode) {
      setInternalEditMode(true);
    }
  }, [initialEditMode]);

  // Load canonical report whenever reportId changes
  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoadingReport(true);
    setEditError(null);
    try {
      const data = await getCanonicalReport(reportId);
      setReport(data);
      if (onReportLoaded) {
        onReportLoaded(data);
      }
      // Pre-populate the selected field's current value
      setEditValue(data?.editable_content?.[selectedField] ?? '');
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const setEditingState = (editing: boolean) => {
    setInternalEditMode(editing);
    if (onToggleEdit) {
      onToggleEdit(editing);
    }
    setEditError(null);
    setEditSuccess(null);
  };

  const handleOpenEdit = async () => {
    setEditingState(true);
    if (!report) {
      await loadReport();
    } else {
      setEditValue(report?.editable_content?.[selectedField] ?? '');
    }
  };

  const handleCancelEdit = () => {
    setEditingState(false);
    setEditValue(report?.editable_content?.[selectedField] ?? '');
  };

  const handleFieldChange = (field: EditableFieldKey) => {
    setSelectedField(field);
    setEditValue(report?.editable_content?.[field] ?? '');
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const updated = await patchCanonicalReport(
        reportId,
        selectedField,
        editValue,
        report.version
      );
      setReport(updated);
      setEditValue(updated?.editable_content?.[selectedField] ?? '');
      setEditSuccess(`Saved. Report version is now v${updated.version}.`);
      if (onReportLoaded) {
        onReportLoaded(updated);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        // Stale version: reload and inform user
        setEditError('Another edit was made concurrently. Reloaded latest version — please review and retry.');
        await loadReport();
      } else {
        setEditError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportCanonicalReportBlob(reportId, exportFormat);
      const ext = exportFormat;
      const filename = `audit_report_${reportId}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  // Determine which fields have been manually edited
  const editedFields = new Set<string>(
    (report?.edit_metadata ?? []).map((e: any) => e.field_path)
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Optional Standalone Header Toolbar */}
      {showInternalToolbar && (
        <div className="border border-slate-700 rounded bg-slate-950">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-700">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-400 mr-2">
              Canonical Report
            </span>
            <code className="text-[10px] font-mono text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 select-all">
              {reportId}
            </code>

            {/* Edit Report button — only for reviewer/uploader */}
            {canEdit && (
              <button
                onClick={activeEditMode ? handleCancelEdit : handleOpenEdit}
                className={`ml-auto px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] cursor-pointer ${
                  activeEditMode
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border-slate-700'
                }`}
              >
                {activeEditMode ? '✕ Close Editor' : '✎ Edit Report'}
              </button>
            )}

            {/* Export controls */}
            <div className="flex items-center gap-1.5">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'docx')}
                className="text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1.5 cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                aria-label="Export Format"
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
              </select>
              <button
                onClick={handleExport}
                disabled={exporting}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  exporting
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'
                }`}
              >
                {exporting ? (
                  <><span className="inline-block w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" /> Exporting…</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg> Export {exportFormat.toUpperCase()}</>
                )}
              </button>
            </div>
          </div>

          {exportError && (
            <div className="px-4 py-2 bg-rose-950/50 border-b border-rose-800 text-rose-300 text-xs font-mono">
              Export failed: {exportError}
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loadingReport && !report && (
        <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded flex items-center justify-center gap-2.5">
          <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Fetching canonical audit report ({reportId})...</span>
        </div>
      )}

      {/* Error Indicator if report failed to load */}
      {editError && !report && (
        <div className="p-4 bg-rose-950/50 border border-rose-700 rounded text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>Failed to load report: {editError}</span>
          <button
            onClick={loadReport}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* --- MODE A: EDIT MODE --- */}
      {report && activeEditMode && (
        <div className="p-4 space-y-4 bg-slate-950 border border-slate-700 rounded">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <h3 className="font-mono text-xs font-bold text-amber-300 uppercase">
                Canonical Report Editor
              </h3>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Current Version: <strong className="text-slate-200">v{report.version}</strong>
            </div>
          </div>

          {/* Field selector */}
          <div>
            <span className="block text-[11px] font-mono text-slate-400 mb-2">
              Select Section to Edit:
            </span>
            <div className="flex flex-wrap gap-2">
              {EDITABLE_FIELDS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleFieldChange(key)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
                    selectedField === key
                      ? 'bg-amber-900/60 border-amber-600 text-amber-200 font-bold shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                  {editedFields.has(key) && (
                    <span className="ml-1.5 text-amber-400 text-[10px] font-normal">[Edited]</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* System-generated fields notice */}
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-400 flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Deterministic compliance engine verdicts (PASS / FAIL / UNKNOWN), raw CLI configurations, cryptographic hashes, and framework scopes are mathematically immutable and protected against manual modification.
            </span>
          </div>

          {/* Editable textarea */}
          <div>
            <label className="block text-[11px] font-mono text-slate-300 font-semibold mb-1.5">
              {EDITABLE_FIELDS.find(f => f.key === selectedField)?.label}
              {editedFields.has(selectedField) && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700 text-[10px] font-normal">
                  [Edited manually]
                </span>
              )}
            </label>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={6}
              className="w-full input-base font-mono resize-y text-xs leading-relaxed"
              placeholder={`Enter updated commentary for ${EDITABLE_FIELDS.find(f => f.key === selectedField)?.label}…`}
            />
          </div>

          {/* Success / error feedback */}
          {editSuccess && (
            <div className="px-3.5 py-2.5 bg-emerald-950/60 border border-emerald-700 rounded text-emerald-300 text-xs font-mono flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{editSuccess}</span>
            </div>
          )}
          {editError && (
            <div className="px-3.5 py-2.5 bg-rose-950/60 border border-rose-700 rounded text-rose-300 text-xs font-mono flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{editError}</span>
            </div>
          )}

          {/* Save / Cancel buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded text-xs font-mono font-bold border transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] shadow-xs cursor-pointer ${
                  saving
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                }`}
              >
                {saving ? 'Saving…' : '↳ Save Edit'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-3.5 py-2 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Identity recorded from authenticated JWT.
            </span>
          </div>
        </div>
      )}

      {/* --- MODE B: VIEW MODE (PREVIEW) --- */}
      {report && !activeEditMode && (
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="px-2 py-1 rounded bg-sky-950 text-sky-400 font-mono text-xs font-bold border border-sky-800">
                v{report.version}
              </div>
              <div>
                <div className="text-slate-200 font-semibold text-xs flex items-center gap-2">
                  <span>Canonical Compliance Audit Report</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-slate-400 uppercase text-[11px]">
                    Vendor: {report.vendor || 'Cisco'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Created by: <span className="text-slate-300">{report.created_by || 'system'}</span>
                  {report.updated_at && (
                    <>
                      <span className="mx-1.5 text-slate-600">|</span>
                      <span>Last Updated: <span className="text-slate-300">{formatToIST(report.updated_at)}</span></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {report.edit_metadata && report.edit_metadata.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
                {report.edit_metadata.length} Manual Edit{report.edit_metadata.length > 1 ? 's' : ''} Recorded
              </span>
            )}
          </div>

          {/* Section 1: Executive Summary */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-mono text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                Executive Summary
              </h4>
              {editedFields.has('executive_summary') && (
                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700 text-[10px] font-mono">
                  [Edited manually]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {report.editable_content?.executive_summary || (
                <span className="italic text-slate-500">No executive summary recorded.</span>
              )}
            </p>
          </div>

          {/* Section 2: Auditor Observations */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-mono text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                Auditor Observations
              </h4>
              {editedFields.has('auditor_observations') && (
                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700 text-[10px] font-mono">
                  [Edited manually]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {report.editable_content?.auditor_observations || (
                <span className="italic text-slate-500">No auditor observations recorded.</span>
              )}
            </p>
          </div>

          {/* Section 3: Recommendations */}
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-mono text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                Recommendations
              </h4>
              {editedFields.has('recommendations') && (
                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700 text-[10px] font-mono">
                  [Edited manually]
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {report.editable_content?.recommendations || (
                <span className="italic text-slate-500">No recommendations recorded.</span>
              )}
            </p>
          </div>

          {/* Two-column layout for Additional Findings & Reviewer Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-mono text-xs font-bold uppercase text-slate-300">
                  Additional Findings
                </h4>
                {editedFields.has('additional_findings') && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700 text-[10px] font-mono">
                    [Edited manually]
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {report.editable_content?.additional_findings || (
                  <span className="italic text-slate-500">No additional findings recorded.</span>
                )}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-mono text-xs font-bold uppercase text-slate-300">
                  Final Reviewer Notes
                </h4>
                {editedFields.has('final_reviewer_notes') && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700 text-[10px] font-mono">
                    [Edited manually]
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {report.editable_content?.final_reviewer_notes || (
                  <span className="italic text-slate-500">No final reviewer notes recorded.</span>
                )}
              </p>
            </div>
          </div>

          {/* Evaluated Compliance Frameworks Summary */}
          {report.frameworks && report.frameworks.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-mono text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Evaluated Framework Profiles
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {report.frameworks.length} Active Benchmark{report.frameworks.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {report.frameworks.map((fw: any) => (
                  <div
                    key={fw.framework_id}
                    className="p-3 bg-slate-950/80 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-slate-200">
                        {fw.framework_name || fw.framework_id}
                        {fw.framework_version && (
                          <span className="ml-2 text-[10px] text-slate-400 font-normal">
                            v{fw.framework_version}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Scope: {fw.vendor_scope || report.vendor || 'Cisco'} | Total Rules: {fw.total_controls}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700">
                        {fw.passed} PASS
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-700">
                        {fw.failed} FAIL
                      </span>
                      {fw.unknown > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-700">
                          {fw.unknown} UNKNOWN
                        </span>
                      )}
                      {typeof fw.pass_rate === 'number' && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800">
                          {fw.pass_rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit History Audit Trail */}
          {report.edit_metadata && report.edit_metadata.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-2 font-mono text-xs">
              <h4 className="font-bold uppercase text-slate-400 text-[11px] flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cryptographic Edit Log (Immutable Audit Trail)
              </h4>
              <div className="space-y-1.5 pt-1">
                {report.edit_metadata.map((edit: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-amber-300 font-semibold">{edit.field_path}</span>
                      <span className="text-slate-500"> edited by </span>
                      <span className="text-slate-200">{edit.edited_by}</span>
                    </div>
                    <div className="text-slate-400">
                      <span>v{edit.version_before} → v{edit.version_after}</span>
                      <span className="mx-2 text-slate-600">•</span>
                      <span>{formatToIST(edit.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
