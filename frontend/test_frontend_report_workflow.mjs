/**
 * Automated Frontend Report Workflow & Export Verification Test Battery
 * NTRO PS26155 — Phase 3D Report Workflow Repair
 * Uses Node.js native test runner
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Setup browser globals before importing api.ts
const sessionStorageStore = new Map();
const mockSessionStorage = {
  getItem: (key) => sessionStorageStore.get(key) ?? null,
  setItem: (key, val) => sessionStorageStore.set(key, String(val)),
  removeItem: (key) => sessionStorageStore.delete(key),
  clear: () => sessionStorageStore.clear(),
};

globalThis.window = {
  sessionStorage: mockSessionStorage,
};

// Import api functions
const api = await import('./src/api.ts');

test.beforeEach(() => {
  sessionStorageStore.clear();
  api.clearAccessToken();
});

test('1. Reviewer login stores bearer token for subsequent calls', async () => {
  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/login') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'valid.reviewer.jwt.token',
          token_type: 'bearer',
          user: {
            user_id: 'usr-reviewer-1',
            username: 'reviewer_lead',
            role: 'reviewer',
            is_authorized_approver: true,
          },
        }),
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  const loginRes = await api.login('reviewer_lead', 'ValidPass123!');
  assert.equal(loginRes.access_token, 'valid.reviewer.jwt.token');
  assert.equal(api.getAccessToken(), 'valid.reviewer.jwt.token');
});

test('2. getReportByEntryId resolves canonical report_id using Bearer token', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  let capturedUrl = '';
  let capturedHeaders = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        report_id: 'RPT-abc12345-AUDIT-001',
        audit_entry_id: 'AUDIT-001',
        version: 1,
      }),
    };
  };

  const rep = await api.getReportByEntryId('AUDIT-001');
  assert.equal(capturedUrl, '/api/reports/by-entry/AUDIT-001');
  assert.equal(capturedHeaders.Authorization, 'Bearer valid.reviewer.jwt.token');
  assert.equal(rep.report_id, 'RPT-abc12345-AUDIT-001');
});

test('3. patchCanonicalReport sends PATCH with Bearer token, field_path, and expected_version', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = null;
  let capturedHeaders = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedMethod = options.method;
    capturedBody = JSON.parse(options.body);
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        report_id: 'RPT-abc12345-AUDIT-001',
        version: 2,
        editable_content: {
          executive_summary: 'Updated by reviewer lead.',
        },
      }),
    };
  };

  const updated = await api.patchCanonicalReport(
    'RPT-abc12345-AUDIT-001',
    'executive_summary',
    'Updated by reviewer lead.',
    1
  );

  assert.equal(capturedUrl, '/api/reports/RPT-abc12345-AUDIT-001');
  assert.equal(capturedMethod, 'PATCH');
  assert.equal(capturedHeaders.Authorization, 'Bearer valid.reviewer.jwt.token');
  assert.equal(capturedBody.field_path, 'executive_summary');
  assert.equal(capturedBody.new_value, 'Updated by reviewer lead.');
  assert.equal(capturedBody.expected_version, 1);
  assert.equal(updated.version, 2);
});

test('4. exportCanonicalReportBlob sends POST to /api/reports/{id}/export/pdf with Bearer token', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedHeaders = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedMethod = options.method;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      blob: async () => new Blob(['%PDF-1.4 simulated pdf'], { type: 'application/pdf' }),
    };
  };

  const blob = await api.exportCanonicalReportBlob('RPT-abc12345-AUDIT-001', 'pdf');
  assert.equal(capturedUrl, '/api/reports/RPT-abc12345-AUDIT-001/export/pdf');
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedHeaders.Authorization, 'Bearer valid.reviewer.jwt.token');
  assert.ok(blob);
});

test('5. exportCanonicalReportBlob sends POST to /api/reports/{id}/export/docx with Bearer token', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedHeaders = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedMethod = options.method;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      blob: async () => new Blob(['PK simulated docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    };
  };

  const blob = await api.exportCanonicalReportBlob('RPT-abc12345-AUDIT-001', 'docx');
  assert.equal(capturedUrl, '/api/reports/RPT-abc12345-AUDIT-001/export/docx');
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedHeaders.Authorization, 'Bearer valid.reviewer.jwt.token');
  assert.ok(blob);
});

test('6. Invariant: Active workflow NEVER invokes legacy GET /api/report/{entry_id}/download', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  const calledUrls = [];

  globalThis.fetch = async (url, options) => {
    calledUrls.push(url);
    if (url.includes('/download')) {
      throw new Error(`VIOLATION: Legacy download endpoint was invoked: ${url}`);
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      blob: async () => new Blob(['data']),
    };
  };

  // Simulate complete workflow
  await api.getReportByEntryId('AUDIT-SEQ-001');
  await api.patchCanonicalReport('RPT-123', 'executive_summary', 'Test edit', 1);
  await api.exportCanonicalReportBlob('RPT-123', 'pdf');
  await api.exportCanonicalReportBlob('RPT-123', 'docx');

  // Verify none of the called URLs were the legacy endpoint
  for (const u of calledUrls) {
    assert.ok(!u.includes('/download'), `Found legacy download in called URLs: ${u}`);
  }
});

test('7. getLedger returns has_canonical_report and report_id without client-side N+1 requests', async () => {
  api.setAccessToken('valid.reviewer.jwt.token');
  const calledUrls = [];

  globalThis.fetch = async (url, options) => {
    calledUrls.push(url);
    if (url === '/api/ledger') {
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            entry_id: 'AUDIT-LEGACY-001',
            device_hostname: 'rtr-old',
            timestamp: '2026-01-01T00:00:00Z',
            has_canonical_report: false,
            report_id: null,
          },
          {
            entry_id: 'AUDIT-CANONICAL-002',
            device_hostname: 'rtr-new',
            timestamp: '2026-09-22T00:00:00Z',
            has_canonical_report: true,
            report_id: 'RPT-CANONICAL-002',
          },
        ],
      };
    }
    throw new Error(`Unexpected N+1 call: ${url}`);
  };

  const ledger = await api.getLedger();
  assert.equal(ledger.length, 2);
  assert.equal(ledger[0].has_canonical_report, false);
  assert.equal(ledger[0].report_id, null);
  assert.equal(ledger[1].has_canonical_report, true);
  assert.equal(ledger[1].report_id, 'RPT-CANONICAL-002');

  // Verify only 1 network request was made (no N+1 loop)
  assert.deepEqual(calledUrls, ['/api/ledger']);
});

test('8. Invariant: Ledger entries render single primary "View Report" action without row-level Edit/Export/Verify buttons', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const screenContent = fs.readFileSync(path.resolve('src/components/AuditLogReportScreen.tsx'), 'utf8');

  // Ledger entry must expose ONE primary button: "View Report"
  assert.ok(screenContent.includes('<span>View Report</span>'), 'Ledger row must render single View Report button');
  assert.ok(screenContent.includes('handleOpenWorkspace(entry)'), 'View Report must invoke handleOpenWorkspace');

  // The primary row summary must NOT contain inline Edit Report or row-level Export
  // Separate row actions must not exist on the entry row
  const rowSummaryBlock = screenContent.split('{/* Primary Row Summary */}')[1]?.split('{/* Authentic Cryptographic Chain Linkage Sub-bar */}')[0];
  assert.ok(rowSummaryBlock, 'Must locate Primary Row Summary block');
  assert.ok(!rowSummaryBlock.includes('handleOpenEdit'), 'Ledger row must not have handleOpenEdit');
  assert.ok(!rowSummaryBlock.includes('Export PDF'), 'Ledger row must not have row-level Export PDF');
  assert.ok(!rowSummaryBlock.includes('Verify PDF Certificate'), 'Ledger row must not have row-level Verify PDF Certificate');
});

test('9. Invariant: Ledger entries display authentic cryptographic hashes and timeline spine', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const screenContent = fs.readFileSync(path.resolve('src/components/AuditLogReportScreen.tsx'), 'utf8');

  // Cryptographic spine must be rendered
  assert.ok(screenContent.includes('Continuous Cryptographic Chain Spine'), 'Must include continuous cryptographic chain spine');

  // Authentic hashes from backend response must be displayed
  assert.ok(screenContent.includes('entry.prevEntryHash'), 'Must display authentic prevEntryHash');
  assert.ok(screenContent.includes('entry.entryHash'), 'Must display authentic entryHash');
  assert.ok(screenContent.includes('entry.config_file_hash'), 'Must display authentic config_file_hash');

  // Global ledger action for chain verification must remain
  assert.ok(screenContent.includes('Verify Chain Integrity'), 'Must maintain global Verify Chain Integrity');
  assert.ok(screenContent.includes('handleVerifyChain'), 'Must maintain handleVerifyChain');
});

test('10. Invariant: Report Workspace centered modal contains Header, Compliance Summary, Action Bar, and Content Body', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const screenContent = fs.readFileSync(path.resolve('src/components/AuditLogReportScreen.tsx'), 'utf8');

  // Modal structure verification
  assert.ok(screenContent.includes('Audit Compliance Report Workspace'), 'Modal must render Workspace Title');
  assert.ok(screenContent.includes('Compliance Summary:'), 'Modal must render Compliance Summary bar');
  assert.ok(screenContent.includes('ACTION BAR (Dedicated Workspace Action Bar)'), 'Modal must render dedicated Action Bar');

  // Action Bar actions
  assert.ok(screenContent.includes('Verify PDF Certificate'), 'Action Bar must include Verify PDF Certificate');
  assert.ok(screenContent.includes('handleExportCanonical'), 'Action Bar must include export canonical handler');
  assert.ok(screenContent.includes('workspaceExportFormat'), 'Action Bar must support format selection (PDF/DOCX)');
  assert.ok(screenContent.includes('setWorkspaceEditMode'), 'Action Bar must support toggling Edit Report');

  // Escape key handler
  assert.ok(screenContent.includes("e.key === 'Escape'"), 'Must close modal on Escape key');
});

test('11. Invariant: ReportWorkflowPanel supports structured preview, allowlisted fields, and in-place editing', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const panelContent = fs.readFileSync(path.resolve('src/components/ReportWorkflowPanel.tsx'), 'utf8');

  // Structured preview sections
  assert.ok(panelContent.includes('Executive Summary'), 'Panel must include Executive Summary');
  assert.ok(panelContent.includes('Auditor Observations'), 'Panel must include Auditor Observations');
  assert.ok(panelContent.includes('Recommendations'), 'Panel must include Recommendations');
  assert.ok(panelContent.includes('Additional Findings'), 'Panel must include Additional Findings');
  assert.ok(panelContent.includes('Final Reviewer Notes'), 'Panel must include Final Reviewer Notes');
  assert.ok(panelContent.includes('Evaluated Framework Profiles'), 'Panel must include Frameworks overview');
  assert.ok(panelContent.includes('Cryptographic Edit Log'), 'Panel must include immutable edit audit trail');

  // Concurrency & In-place update
  assert.ok(panelContent.includes('patchCanonicalReport'), 'Panel must use patchCanonicalReport');
  assert.ok(panelContent.includes('report.version'), 'Panel must track and display report.version');
  assert.ok(panelContent.includes('409'), 'Panel must handle 409 concurrency conflict');

  // Workflow safety: No UNDER_REVIEW state
  assert.ok(!panelContent.includes('UNDER_REVIEW'), 'Panel must NOT introduce UNDER_REVIEW state');
});

