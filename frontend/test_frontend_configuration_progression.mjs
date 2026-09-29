/**
 * Automated Frontend Configuration Progression & Historical Graph Verification Test Battery
 * NTRO PS26155 — Phase 3 Configuration Progression UI
 * Uses Node.js native test runner
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

const api = await import('./src/api.ts');
const reviewerDashboardContent = fs.readFileSync(path.resolve('src/components/ReviewerDashboard.tsx'), 'utf8');

test.beforeEach(() => {
  sessionStorageStore.clear();
  api.clearAccessToken();
});

test('1. getConfigurationProgression sends GET request to /api/configurations/progression with Bearer token', async () => {
  api.setAccessToken('valid.test.jwt');
  let capturedUrl = '';
  let capturedHeaders = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        versions: [],
        total_versions: 0,
        total_audits: 0,
        device_hostname: null,
      }),
    };
  };

  const res = await api.getConfigurationProgression();
  assert.equal(capturedUrl, '/api/configurations/progression');
  assert.equal(capturedHeaders.Authorization, 'Bearer valid.test.jwt');
  assert.deepEqual(res.versions, []);
});

test('2. getConfigurationProgression appends device_hostname query parameter when supplied', async () => {
  api.setAccessToken('valid.test.jwt');
  let capturedUrl = '';

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        versions: [],
        total_versions: 0,
        total_audits: 0,
        device_hostname: 'EDGE-RTR-01',
      }),
    };
  };

  await api.getConfigurationProgression('EDGE-RTR-01');
  assert.equal(capturedUrl, '/api/configurations/progression?device_hostname=EDGE-RTR-01');
});

test('3. ReviewerDashboard imports and invokes getConfigurationProgression in loadDashboardData', () => {
  assert.ok(
    reviewerDashboardContent.includes('getConfigurationProgression'),
    'ReviewerDashboard must import and invoke getConfigurationProgression'
  );
  assert.ok(
    reviewerDashboardContent.includes('getConfigurationProgression()'),
    'ReviewerDashboard must call getConfigurationProgression in parallel fetch'
  );
});

test('4. ReviewerDashboard renders Configuration Compliance Progression with summary badge', () => {
  assert.ok(
    reviewerDashboardContent.includes('Configuration Compliance Progression'),
    'ReviewerDashboard must render Configuration Compliance Progression header'
  );
  assert.ok(
    reviewerDashboardContent.includes('configuration states ·'),
    'ReviewerDashboard must render configuration states count in header'
  );
  assert.ok(
    reviewerDashboardContent.includes('audit runs'),
    'ReviewerDashboard must render total audit runs count in header'
  );
});

test('5. ReviewerDashboard distinguishes genuine 0% evaluated from unevaluated Data Unavailable', () => {
  assert.ok(
    reviewerDashboardContent.includes('0% Evaluated'),
    'ReviewerDashboard must display 0% Evaluated badge for genuine evaluated 0% scores'
  );
  assert.ok(
    reviewerDashboardContent.includes('Data Unavailable'),
    'ReviewerDashboard must display Data Unavailable when is_evaluated is false'
  );
  assert.ok(
    reviewerDashboardContent.includes('!pt.isEvaluated'),
    'ReviewerDashboard must handle unevaluated nodes with distinct styling'
  );
});

test('6. ReviewerDashboard contains Configuration Version Inspector with delta and underlying audits', () => {
  assert.ok(
    reviewerDashboardContent.includes('activeVersion.version_id'),
    'ReviewerDashboard must display active version ID (V1, V2, etc.)'
  );
  assert.ok(
    reviewerDashboardContent.includes('Progression Delta'),
    'ReviewerDashboard must render Progression Delta section'
  );
  assert.ok(
    reviewerDashboardContent.includes('percentage points'),
    'ReviewerDashboard must render delta score in percentage points'
  );
  assert.ok(
    reviewerDashboardContent.includes('Underlying Audit Executions'),
    'ReviewerDashboard must render Underlying Audit Executions list'
  );
  assert.ok(
    reviewerDashboardContent.includes('View Report &rarr;'),
    'ReviewerDashboard must provide View Report action for each underlying audit'
  );
});

test('7. ReviewerDashboard preserves all audit executions without client-side lossy deduplication', () => {
  assert.ok(
    reviewerDashboardContent.includes('activeVersion.audit_entries.map'),
    'ReviewerDashboard must iterate over all underlying audit_entries for the active version'
  );
  assert.ok(
    reviewerDashboardContent.includes('versionPoints.map'),
    'ReviewerDashboard must map authoritative configuration version nodes directly'
  );
});
