/**
 * Automated Verification: Phase 1 — Role-Aware Application Shell & Navigation
 * NTRO PS26155
 * Verifies role-based visibility, RBAC navigation guards, and Audit Workspace encapsulation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Verify types.ts contains GlobalScreenId, AuditWorkspaceState, AuditWorkspaceTab, SystemTab
test('1. types.ts exports GlobalScreenId and separated AuditWorkspaceState', () => {
  const typesPath = path.resolve('src/types.ts');
  const content = fs.readFileSync(typesPath, 'utf8');

  assert.ok(content.includes('export type GlobalScreenId'), 'Must export GlobalScreenId');
  assert.ok(content.includes("'dashboard'"), 'GlobalScreenId must include dashboard');
  assert.ok(content.includes("'upload'"), 'GlobalScreenId must include upload');
  assert.ok(content.includes("'audits'"), 'GlobalScreenId must include audits');
  assert.ok(content.includes("'review_queue'"), 'GlobalScreenId must include review_queue');
  assert.ok(content.includes("'reports'"), 'GlobalScreenId must include reports');
  assert.ok(content.includes("'system'"), 'GlobalScreenId must include system');

  // Verify AuditWorkspaceState is separated and NOT part of GlobalScreenId
  assert.ok(!content.includes("'audit_workspace' |"), 'GlobalScreenId must NOT include audit_workspace');
  assert.ok(content.includes('export interface AuditWorkspaceState'), 'Must export AuditWorkspaceState');
  assert.ok(content.includes('export type AuditWorkspaceTab'), 'Must export AuditWorkspaceTab');
  assert.ok(content.includes("'overview'"), 'AuditWorkspaceTab must include overview');
  assert.ok(content.includes("'results'"), 'AuditWorkspaceTab must include results');
  assert.ok(content.includes("'evidence'"), 'AuditWorkspaceTab must include evidence');
  assert.ok(content.includes("'ai_review'"), 'AuditWorkspaceTab must include ai_review');
  assert.ok(content.includes("'remediation'"), 'AuditWorkspaceTab must include remediation');
  assert.ok(content.includes("'conflicts'"), 'AuditWorkspaceTab must include conflicts');
  assert.ok(content.includes("'report'"), 'AuditWorkspaceTab must include report');
});

// 2. Verify Navbar.tsx implements role-based navigation tabs
test('2. Navbar.tsx defines role-specific navigation items', () => {
  const navbarPath = path.resolve('src/components/Navbar.tsx');
  const content = fs.readFileSync(navbarPath, 'utf8');

  // Check viewer role definition
  assert.ok(content.includes("case 'viewer':"), 'Must handle viewer role');
  assert.ok(content.includes("{ id: 'dashboard', label: 'Dashboard' }"), 'Must have dashboard tab');
  assert.ok(content.includes("{ id: 'audits', label: 'Audits' }"), 'Viewer must have audits tab');
  assert.ok(content.includes("{ id: 'reports', label: 'Reports' }"), 'Must have reports tab');

  // Check uploader role definition
  assert.ok(content.includes("case 'uploader':"), 'Must handle uploader role');
  assert.ok(content.includes("{ id: 'upload', label: 'Upload Config' }"), 'Uploader must have upload tab');
  assert.ok(content.includes("{ id: 'audits', label: 'My Audits' }"), 'Uploader must have My Audits tab');

  // Check reviewer role definition
  assert.ok(content.includes("case 'reviewer':"), 'Must handle reviewer role');
  assert.ok(content.includes("{ id: 'audits', label: 'All Audits' }"), 'Reviewer must have All Audits tab');
  assert.ok(content.includes("{ id: 'review_queue', label: 'Review Queue'"), 'Reviewer must have review queue tab');
  assert.ok(content.includes("{ id: 'system', label: 'System' }"), 'Reviewer must have system tab');

  // Check removal of hardcoded "Cisco IOS-XE" brand from header
  assert.ok(!content.includes("Cisco IOS-XE\n                </span>"), 'Must not hardcode Cisco IOS-XE in header logo');
});

// 3. Verify App.tsx role-enforcement and workspace separation
test('3. App.tsx guards navigation transitions and separates workspace state', () => {
  const appPath = path.resolve('src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf8');

  // Check global screen and workspace state hooks
  assert.ok(content.includes("useState<GlobalScreenId>('dashboard')"), 'Default screen must be dashboard');
  assert.ok(content.includes('useState<AuditWorkspaceState | null>(null)'), 'AuditWorkspaceState must be separate and default to null');

  // Check RBAC guard in handleNavigate
  assert.ok(content.includes("role === 'viewer'"), 'handleNavigate must guard viewer');
  assert.ok(content.includes("role === 'uploader'"), 'handleNavigate must guard uploader');

  // Check contextual workspace render condition
  assert.ok(content.includes('{auditWorkspace ? ('), 'Must render AuditWorkspace when auditWorkspace is non-null');
  assert.ok(content.includes('<AuditWorkspace'), 'Must render AuditWorkspace component');
});

// 4. Verify AuditWorkspace.tsx implements the 7 contextual tabs
test('4. AuditWorkspace.tsx hosts the 7 contextual workflow tabs', () => {
  const workspacePath = path.resolve('src/components/AuditWorkspace.tsx');
  const content = fs.readFileSync(workspacePath, 'utf8');

  assert.ok(content.includes("activeTab === 'overview'"), 'Must handle overview tab');
  assert.ok(content.includes("activeTab === 'results'"), 'Must handle results tab');
  assert.ok(content.includes("activeTab === 'evidence'"), 'Must handle evidence tab');
  assert.ok(content.includes("activeTab === 'ai_review'"), 'Must handle ai_review tab');
  assert.ok(content.includes("activeTab === 'remediation'"), 'Must handle remediation tab');
  assert.ok(content.includes("activeTab === 'conflicts'"), 'Must handle conflicts tab');
  assert.ok(content.includes("activeTab === 'report'"), 'Must handle report tab');
  assert.ok(content.includes('Exit Workspace'), 'Must have Exit Workspace action');
});

// 5. Verify SystemScreen.tsx is Reviewer-only and groups operational tools
test('5. SystemScreen.tsx is Reviewer-only and groups operational tools', () => {
  const systemPath = path.resolve('src/components/SystemScreen.tsx');
  const content = fs.readFileSync(systemPath, 'utf8');

  assert.ok(content.includes("currentUser.role !== 'reviewer'"), 'Must guard against non-reviewers');
  assert.ok(content.includes('AiModelManagerScreen'), 'Must include AiModelManagerScreen under System');
  assert.ok(content.includes('AiSuggestionReviewScreen'), 'Must include AiSuggestionReviewScreen under System');
  assert.ok(content.includes('AuditLogReportScreen'), 'Must include AuditLogReportScreen under System');
});
