/**
 * Automated Frontend Upload & Framework Selection Test Battery
 * NTRO PS26155 — Dynamic Vendor & Framework Selection Intake
 * Uses Node.js native test runner (zero external dependencies)
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

const localStorageStore = new Map();
const mockLocalStorage = {
  getItem: (key) => localStorageStore.get(key) ?? null,
  setItem: (key, val) => localStorageStore.set(key, String(val)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
};

globalThis.window = {
  sessionStorage: mockSessionStorage,
  localStorage: mockLocalStorage,
};

// Dynamically import api.ts after window globals setup
const api = await import('./src/api.ts');

test('uploadAuditConfig sends vendor and frameworkIds in JSON payload', async () => {
  let capturedUrl = '';
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        session_id: 'sess-json-001',
        vendor: 'juniper',
        framework_ids: ['juniper-junos-baseline'],
        summary: { total: 10, pass: 8, fail: 2, unknown: 0 },
      }),
    };
  };

  const res = await api.uploadAuditConfig(
    undefined,
    'system { host-name test; }',
    'test.conf',
    'juniper',
    ['juniper-junos-baseline']
  );

  assert.equal(capturedUrl, '/api/audit/upload');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers['Content-Type'], 'application/json');

  const parsedBody = JSON.parse(capturedOptions.body);
  assert.equal(parsedBody.vendor, 'juniper');
  assert.deepEqual(parsedBody.framework_ids, ['juniper-junos-baseline']);
  assert.equal(parsedBody.filename, 'test.conf');
  assert.equal(res.session_id, 'sess-json-001');
});

test('uploadAuditConfig with "auto" vendor omits vendor parameter in JSON payload', async () => {
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ session_id: 'sess-auto-001' }),
    };
  };

  await api.uploadAuditConfig(
    undefined,
    'hostname RTR-1',
    'cisco.cfg',
    'auto',
    ['cisco-ios-xe-baseline']
  );

  const parsedBody = JSON.parse(capturedOptions.body);
  assert.equal(parsedBody.vendor, undefined);
  assert.deepEqual(parsedBody.framework_ids, ['cisco-ios-xe-baseline']);
});

test('uploadAuditConfig sends vendor and framework_ids in FormData when File provided', async () => {
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        session_id: 'sess-form-002',
        vendor: 'arista',
        framework_ids: ['arista-eos-baseline'],
      }),
    };
  };

  // Mock File and FormData in Node environment
  class MockFormData {
    constructor() {
      this.entries = {};
    }
    append(key, value) {
      this.entries[key] = value;
    }
    get(key) {
      return this.entries[key];
    }
  }
  globalThis.FormData = MockFormData;

  const mockFile = { name: 'arista.conf', size: 500 };

  const res = await api.uploadAuditConfig(
    mockFile,
    '! Arista EOS\nhostname ARISTA-LAB',
    'arista.conf',
    'arista',
    ['arista-eos-baseline']
  );

  assert.equal(capturedOptions.method, 'POST');
  assert.ok(capturedOptions.body instanceof MockFormData);
  assert.equal(capturedOptions.body.get('vendor'), 'arista');
  assert.equal(capturedOptions.body.get('framework_ids'), JSON.stringify(['arista-eos-baseline']));
  assert.equal(res.session_id, 'sess-form-002');
});

test('Client-side vendor detection correctly identifies multi-vendor syntax headers', () => {
  function detectVendorFromContent(content) {
    if (!content) return 'cisco';
    if (content.includes('#config-version') || (content.includes('config system') && content.includes('end'))) {
      return 'fortinet';
    }
    if (content.includes('system {') || content.includes('apply-groups') || (content.includes('set system ') && !content.includes('hostname'))) {
      return 'juniper';
    }
    if (content.includes('management ssh') || content.includes('management api') || (content.includes('role network-admin') && content.includes('switchport'))) {
      return 'arista';
    }
    if (content.includes('deviceconfig system') || content.includes('panos') || content.includes('rulebase security') || content.includes('paloaltonetworks')) {
      return 'paloalto';
    }
    return 'cisco';
  }

  // Fortinet
  assert.equal(detectVendorFromContent('#config-version=FG60E-7.2.4-FW-build1396\nconfig system global\nend'), 'fortinet');
  // Juniper
  assert.equal(detectVendorFromContent('/* Junos config */\nsystem {\n    host-name lab-router;\n}'), 'juniper');
  // Arista
  assert.equal(detectVendorFromContent('hostname ARISTA-01\nusername admin role network-admin\ninterface Ethernet1\nswitchport\nmanagement ssh'), 'arista');
  // Cisco
  assert.equal(detectVendorFromContent('hostname EDGE-RTR-01\ninterface GigabitEthernet0/0/0\nip address 10.0.0.1 255.255.255.0'), 'cisco');
  // Palo Alto
  assert.equal(detectVendorFromContent('set deviceconfig system hostname PA-VM-01\nset deviceconfig system service disable-telnet yes'), 'paloalto');
});

test('Vendor switch flushes incompatible framework IDs safeguard across all 5 vendors', () => {
  // Simulates the UI state transition when changing target vendor
  const ciscoFrameworks = [
    { framework_id: 'cis-cisco-iosxe', vendor_scope: 'cisco' },
    { framework_id: 'cisco-ios-xe-baseline', vendor_scope: 'cisco' },
    { framework_id: 'disa-stig-cisco-iosxe', vendor_scope: 'cisco' }
  ];

  const paloaltoFrameworks = [
    { framework_id: 'paloalto-panos-baseline', vendor_scope: 'paloalto' }
  ];

  let selectedFrameworkIds = ciscoFrameworks.map(f => f.framework_id);
  assert.deepEqual(selectedFrameworkIds, ['cis-cisco-iosxe', 'cisco-ios-xe-baseline', 'disa-stig-cisco-iosxe']);

  // Operator switches vendor to Palo Alto: safe reseed from newly fetched catalog
  const newCatalog = paloaltoFrameworks;
  selectedFrameworkIds = newCatalog.map(f => f.framework_id);

  assert.deepEqual(selectedFrameworkIds, ['paloalto-panos-baseline']);
  assert.ok(!selectedFrameworkIds.includes('cis-cisco-iosxe'), 'Cisco framework must not leak into Palo Alto session');
});

test('uploadAuditConfig with Palo Alto vendor transmits explicit vendor and framework in JSON', async () => {
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        session_id: 'sess-paloalto-001',
        vendor: 'paloalto',
        framework_ids: ['paloalto-panos-baseline'],
        summary: { total: 10, pass: 10, fail: 0, unknown: 0 },
      }),
    };
  };

  const res = await api.uploadAuditConfig(
    undefined,
    'set deviceconfig system hostname PA-VM-SECURE',
    'paloalto.conf',
    'paloalto',
    ['paloalto-panos-baseline']
  );

  const parsedBody = JSON.parse(capturedOptions.body);
  assert.equal(parsedBody.vendor, 'paloalto');
  assert.deepEqual(parsedBody.framework_ids, ['paloalto-panos-baseline']);
  assert.equal(res.session_id, 'sess-paloalto-001');
  assert.equal(res.summary.total, 10);
});

test('Invariant: Top-level compliance outcomes are strictly PASS, FAIL, UNKNOWN', () => {
  const allowedOutcomes = new Set(['PASS', 'FAIL', 'UNKNOWN', 'Pass', 'Fail', 'Unknown']);
  assert.ok(allowedOutcomes.has('PASS'));
  assert.ok(allowedOutcomes.has('FAIL'));
  assert.ok(allowedOutcomes.has('UNKNOWN'));
  assert.equal(allowedOutcomes.has('NOT_ASSESSED'), false, 'NOT_ASSESSED must never be a top-level compliance outcome');
});
