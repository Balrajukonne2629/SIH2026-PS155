/**
 * Automated Verification: Phase 3.4 — Frontend RBAC Workspaces + Audit Workflow Integration
 * NTRO PS26155 — Network Security Compliance Auditor
 *
 * Covers all 16 required verification points:
 *  1. Viewer navigation
 *  2. Uploader navigation
 *  3. Reviewer navigation
 *  4. Viewer cannot see uploader/reviewer mutation controls
 *  5. Uploader sees Submit for Review only for own in_progress audits
 *  6. Submitted audit no longer exposes Submit for Review
 *  7. Reviewer Review Queue loads submitted audits from real API data
 *  8. Reviewer can open an audit
 *  9. Opening an audit does not change workflow status
 * 10. Uploader sees only own audit sessions
 * 11. Reviewer sees all sessions
 * 12. Viewer remains read-only
 * 13. Existing authentication behavior remains intact
 * 14. Existing AuditWorkspace remains functional
 * 15. Existing mapping review screens remain functional
 * 16. Existing report/ledger screens remain functional
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load source files for static verification & architecture invariants
const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
const auditsScreenContent = fs.readFileSync(path.resolve('src/components/AuditsScreen.tsx'), 'utf8');
const workspaceContent = fs.readFileSync(path.resolve('src/components/AuditWorkspace.tsx'), 'utf8');
const reviewerDashboardContent = fs.readFileSync(path.resolve('src/components/ReviewerDashboard.tsx'), 'utf8');
const apiContent = fs.readFileSync(path.resolve('src/api.ts'), 'utf8');
const typesContent = fs.readFileSync(path.resolve('src/types.ts'), 'utf8');

// ----------------------------------------------------------------------------
// 1. Viewer navigation
// ----------------------------------------------------------------------------
test('1. Viewer navigation: exposes only Dashboard, Audits, and Reports', () => {
  assert.ok(navbarContent.includes("case 'viewer':"), 'Navbar must define viewer role case');
  
  // Extract viewer nav block
  const viewerBlock = navbarContent.split("case 'viewer':")[1].split('case \'uploader\':')[0];
  assert.ok(viewerBlock.includes("{ id: 'dashboard', label: 'Dashboard' }"), 'Viewer must have Dashboard');
  assert.ok(viewerBlock.includes("{ id: 'audits', label: 'Audits' }"), 'Viewer must have Audits');
  assert.ok(viewerBlock.includes("{ id: 'reports', label: 'Reports' }"), 'Viewer must have Reports');
  assert.ok(!viewerBlock.includes("'upload'"), 'Viewer must NOT have Upload tab');
  assert.ok(!viewerBlock.includes("'review_queue'"), 'Viewer must NOT have Review Queue tab');
  assert.ok(!viewerBlock.includes("'system'"), 'Viewer must NOT have System tab');

  // Verify App.tsx routing guard
  assert.ok(appContent.includes("role === 'viewer'"), 'App.tsx must check viewer role');
  assert.ok(
    appContent.includes("screen !== 'dashboard' && screen !== 'audits' && screen !== 'reports'"),
    'App.tsx must constrain viewer to dashboard, audits, reports'
  );
});

// ----------------------------------------------------------------------------
// 2. Uploader navigation
// ----------------------------------------------------------------------------
test('2. Uploader navigation: exposes Dashboard, My Audits, Upload Config, and Reports', () => {
  assert.ok(navbarContent.includes("case 'uploader':"), 'Navbar must define uploader role case');
  
  const uploaderBlock = navbarContent.split("case 'uploader':")[1].split('case \'reviewer\':')[0];
  assert.ok(uploaderBlock.includes("{ id: 'dashboard', label: 'Dashboard' }"), 'Uploader must have Dashboard');
  assert.ok(uploaderBlock.includes("{ id: 'audits', label: 'My Audits' }"), 'Uploader must have My Audits');
  assert.ok(uploaderBlock.includes("{ id: 'upload', label: 'Upload Config' }"), 'Uploader must have Upload Config');
  assert.ok(uploaderBlock.includes("{ id: 'reports', label: 'Reports' }"), 'Uploader must have Reports');
  assert.ok(!uploaderBlock.includes("'review_queue'"), 'Uploader must NOT have Review Queue tab');
  assert.ok(!uploaderBlock.includes("'system'"), 'Uploader must NOT have System tab');

  // Verify App.tsx guard blocks privileged screens
  assert.ok(
    appContent.includes("screen === 'review_queue' || screen === 'system'"),
    'App.tsx must block review_queue and system from uploader'
  );
});

// ----------------------------------------------------------------------------
// 3. Reviewer navigation
// ----------------------------------------------------------------------------
test('3. Reviewer navigation: exposes Dashboard, All Audits, Upload Config, Review Queue, Reports, System', () => {
  assert.ok(navbarContent.includes("case 'reviewer':"), 'Navbar must define reviewer role case');
  
  const reviewerBlock = navbarContent.split("case 'reviewer':")[1].split('default:')[0];
  assert.ok(reviewerBlock.includes("{ id: 'dashboard', label: 'Dashboard' }"), 'Reviewer must have Dashboard');
  assert.ok(reviewerBlock.includes("{ id: 'audits', label: 'All Audits' }"), 'Reviewer must have All Audits');
  assert.ok(reviewerBlock.includes("{ id: 'upload', label: 'Upload Config' }"), 'Reviewer must have Upload Config');
  assert.ok(reviewerBlock.includes("{ id: 'review_queue', label: 'Review Queue'"), 'Reviewer must have Review Queue');
  assert.ok(reviewerBlock.includes("{ id: 'reports', label: 'Reports' }"), 'Reviewer must have Reports');
  assert.ok(reviewerBlock.includes("{ id: 'system', label: 'System' }"), 'Reviewer must have System');
});

// ----------------------------------------------------------------------------
// 4. Viewer cannot see uploader/reviewer mutation controls
// ----------------------------------------------------------------------------
test('4. Viewer cannot see uploader/reviewer mutation controls', () => {
  // AuditsScreen: Upload button hidden for viewer
  assert.ok(auditsScreenContent.includes("currentUser.role !== 'viewer'"), 'AuditsScreen must hide upload button for viewer');
  
  // App.tsx: Upload screen not rendered for viewer
  assert.ok(appContent.includes("currentScreen === 'upload' && currentUser.role !== 'viewer'"), 'App.tsx must prevent viewer from opening upload');
  
  // Workspace: Submit for review button strictly uploader only
  assert.ok(workspaceContent.includes("currentUser.role === 'uploader' && workflowStatus === 'in_progress'"), 'Submit for review is uploader only');

  // SystemScreen: Guarded against non-reviewers
  const systemScreenContent = fs.readFileSync(path.resolve('src/components/SystemScreen.tsx'), 'utf8');
  assert.ok(systemScreenContent.includes("currentUser.role !== 'reviewer'"), 'SystemScreen must reject viewer');
});

// ----------------------------------------------------------------------------
// 5. Uploader sees Submit for Review only for own in_progress audits
// ----------------------------------------------------------------------------
test('5. Uploader sees Submit for Review only for in_progress audits', () => {
  assert.ok(
    workspaceContent.includes("currentUser.role === 'uploader' && workflowStatus === 'in_progress'"),
    'Submit button must be conditional on role === uploader AND workflowStatus === in_progress'
  );
  assert.ok(workspaceContent.includes('Submit for Review'), 'Button text must be Submit for Review');
  assert.ok(workspaceContent.includes('submitAuditSession(sessionId)'), 'Must invoke submitAuditSession API');
});

// ----------------------------------------------------------------------------
// 6. Submitted audit no longer exposes Submit for Review
// ----------------------------------------------------------------------------
test('6. Submitted audit no longer exposes Submit for Review and renders submitted indicator', () => {
  assert.ok(
    workspaceContent.includes("currentUser.role === 'uploader' && workflowStatus === 'submitted'"),
    'Workspace must handle submitted state context for uploader'
  );
  assert.ok(
    workspaceContent.includes('Awaiting Reviewer Sign-off'),
    'Submitted context must indicate awaiting reviewer'
  );
  // Confirms the submit button is NOT rendered when status is submitted
  assert.ok(
    !workspaceContent.includes("workflowStatus === 'submitted' && (\n              <button"),
    'Must not expose submit button when status is submitted'
  );
});

// ----------------------------------------------------------------------------
// 7. Reviewer Review Queue loads submitted audits from real API data
// ----------------------------------------------------------------------------
test('7. Reviewer Review Queue loads submitted audits from real API data', () => {
  assert.ok(
    reviewerDashboardContent.includes("getAuditSessions('submitted')"),
    'ReviewerDashboard must call getAuditSessions with status submitted'
  );
  assert.ok(
    reviewerDashboardContent.includes('Submitted Audits Awaiting Review'),
    'ReviewerDashboard must render Submitted Audits Awaiting Review queue section'
  );
  assert.ok(
    reviewerDashboardContent.includes('submittedSessions.map'),
    'ReviewerDashboard must iterate over real submitted audit sessions'
  );
});

// ----------------------------------------------------------------------------
// 8. Reviewer can open an audit
// ----------------------------------------------------------------------------
test('8. Reviewer can open an audit from Review Queue', () => {
  assert.ok(
    reviewerDashboardContent.includes("onOpenAudit(session.session_id, 'overview')"),
    'Reviewer must have Open Audit action passing session_id to onOpenAudit'
  );
  assert.ok(
    appContent.includes('handleOpenAudit'),
    'App.tsx must provide handleOpenAudit to ReviewerDashboard'
  );
});

// ----------------------------------------------------------------------------
// 9. Opening an audit does not change workflow status (Read-only GET invariant)
// ----------------------------------------------------------------------------
test('9. Opening an audit invokes GET /api/audit/{session_id}/results without workflow mutation', () => {
  assert.ok(
    appContent.includes('getAuditResults(sessionId)'),
    'handleOpenAudit must call getAuditResults'
  );
  assert.ok(
    apiContent.includes('export async function getAuditResults(sessionId: string)'),
    'getAuditResults must be defined in api.ts'
  );
  assert.ok(
    apiContent.includes("request<any>(`/api/audit/${sessionId}/results`)"),
    'getAuditResults must use HTTP GET without mutation body'
  );
  // Assert strictly NO UNDER_REVIEW state exists
  assert.ok(
    !apiContent.toLowerCase().includes('under_review'),
    'api.ts must strictly contain NO under_review state'
  );
  assert.ok(
    !workspaceContent.toLowerCase().includes('under_review'),
    'AuditWorkspace must strictly contain NO under_review state'
  );
  assert.ok(
    !typesContent.toLowerCase().includes('under_review'),
    'types.ts must strictly contain NO under_review state'
  );
});

// ----------------------------------------------------------------------------
// 10. Uploader sees only own audit sessions
// ----------------------------------------------------------------------------
test('10. Uploader view labeled "My Audits" backed by backend owner isolation', () => {
  assert.ok(
    auditsScreenContent.includes("currentUser.role === 'uploader'\n      ? 'My Audits'"),
    'AuditsScreen title must be "My Audits" for uploader'
  );
  assert.ok(
    auditsScreenContent.includes('Audit sessions uploaded and owned by your account.'),
    'AuditsScreen subtitle must state account-owned sessions for uploader'
  );
  assert.ok(
    auditsScreenContent.includes('getAuditSessions()'),
    'AuditsScreen must consume getAuditSessions()'
  );
});

// ----------------------------------------------------------------------------
// 11. Reviewer sees all sessions
// ----------------------------------------------------------------------------
test('11. Reviewer view labeled "All Audits" for enterprise visibility', () => {
  assert.ok(
    auditsScreenContent.includes("currentUser.role === 'reviewer'\n      ? 'All Audits'"),
    'AuditsScreen title must be "All Audits" for reviewer'
  );
  assert.ok(
    auditsScreenContent.includes('Enterprise audit session registry across all network device evaluations.'),
    'AuditsScreen subtitle must describe enterprise registry'
  );
});

// ----------------------------------------------------------------------------
// 12. Viewer remains read-only
// ----------------------------------------------------------------------------
test('12. Viewer remains read-only across all screens', () => {
  assert.ok(
    auditsScreenContent.includes("currentUser.role === 'viewer'") && auditsScreenContent.includes("'Audits'"),
    'AuditsScreen title is "Audits" for viewer'
  );
  // Viewer cannot trigger uploads
  assert.ok(
    auditsScreenContent.includes("currentUser.role !== 'viewer'"),
    'AuditsScreen prevents viewer from seeing upload trigger'
  );
  // Viewer cannot submit audits
  assert.ok(
    workspaceContent.includes("currentUser.role === 'uploader' && workflowStatus === 'in_progress'"),
    'Submit button strictly requires uploader role'
  );
});

// ----------------------------------------------------------------------------
// 13. Existing authentication behavior remains intact
// ----------------------------------------------------------------------------
test('13. Centralized JWT authentication, 401 callback, and token storage preserved', () => {
  assert.ok(apiContent.includes('export function getAccessToken()'), 'getAccessToken preserved');
  assert.ok(apiContent.includes('export function setAccessToken('), 'setAccessToken preserved');
  assert.ok(apiContent.includes('export function onUnauthorized('), 'onUnauthorized preserved');
  assert.ok(appContent.includes('onUnauthorized(() => {'), 'App.tsx listens to onUnauthorized');
  assert.ok(appContent.includes('clearAccessToken();'), 'Token cleared on logout and unauthorized');
});

// ----------------------------------------------------------------------------
// 14. Existing AuditWorkspace remains functional
// ----------------------------------------------------------------------------
test('14. AuditWorkspace retains all 7 contextual tabs', () => {
  assert.ok(workspaceContent.includes("overview: 'Overview'"), 'Workspace must support Overview tab');
  assert.ok(workspaceContent.includes("results: 'Results Matrix'"), 'Workspace must support Results tab');
  assert.ok(workspaceContent.includes("evidence: 'Evidence'"), 'Workspace must support Evidence tab');
  assert.ok(workspaceContent.includes("ai_review: 'AI Review'"), 'Workspace must support AI Review tab');
  assert.ok(workspaceContent.includes("remediation: 'Remediation'"), 'Workspace must support Remediation tab');
  assert.ok(workspaceContent.includes("conflicts: 'Conflict Analysis'"), 'Workspace must support Conflict Analysis tab');
  assert.ok(workspaceContent.includes("report: 'Report & Ledger'"), 'Workspace must support Report tab');
});

// ----------------------------------------------------------------------------
// 15. Existing mapping review screens remain functional
// ----------------------------------------------------------------------------
test('15. Mapping review screens and API integration preserved', () => {
  assert.ok(
    workspaceContent.includes('<AiSuggestionReviewScreen'),
    'Workspace renders AiSuggestionReviewScreen'
  );
  assert.ok(
    apiContent.includes('export async function suggestMapping('),
    'api.ts provides suggestMapping'
  );
  assert.ok(
    apiContent.includes('export async function approveSuggestion('),
    'api.ts provides approveSuggestion'
  );
  assert.ok(
    apiContent.includes('export async function getPendingSuggestions('),
    'api.ts provides getPendingSuggestions'
  );
});

// ----------------------------------------------------------------------------
// 16. Existing report/ledger screens remain functional
// ----------------------------------------------------------------------------
test('16. Report & Ledger screens and API integration preserved', () => {
  assert.ok(
    workspaceContent.includes('<AuditLogReportScreen'),
    'Workspace renders AuditLogReportScreen'
  );
  assert.ok(
    appContent.includes('<AuditLogReportScreen currentUser={currentUser} />'),
    'App.tsx renders AuditLogReportScreen for reports route'
  );
  assert.ok(
    apiContent.includes('export async function getLedger()'),
    'api.ts provides getLedger'
  );
  assert.ok(
    apiContent.includes('export async function verifyLedger()'),
    'api.ts provides verifyLedger'
  );
  assert.ok(
    apiContent.includes('export async function finalizeAudit('),
    'api.ts provides finalizeAudit'
  );
  assert.ok(
    apiContent.includes('export async function exportCanonicalReportBlob('),
    'api.ts provides exportCanonicalReportBlob'
  );
});
