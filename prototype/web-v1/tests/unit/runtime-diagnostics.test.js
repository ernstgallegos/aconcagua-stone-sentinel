import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIAGNOSTIC_CATEGORIES,
  classifyLoadDiagnostic,
  formatRuntimeDiagnosticReport,
  shouldEmitRuntimeDiagnostics,
} from '../../ui/helpers/runtime-diagnostics.js';

test('classifyLoadDiagnostic maps known startup load signatures', () => {
  assert.equal(classifyLoadDiagnostic('[missing file] ../../data/nodes.json (status 404)'), DIAGNOSTIC_CATEGORIES.MISSING_FILE);
  assert.equal(classifyLoadDiagnostic('[http failure] ../../data/nodes.json (status 500)'), DIAGNOSTIC_CATEGORIES.HTTP_FAILURE);
  assert.equal(classifyLoadDiagnostic('[invalid JSON] ../../data/nodes.json (Unexpected token)'), DIAGNOSTIC_CATEGORIES.INVALID_JSON);
  assert.equal(classifyLoadDiagnostic('characters:$[0].id expected string but got number'), DIAGNOSTIC_CATEGORIES.INVALID_SHAPE);
  assert.equal(classifyLoadDiagnostic('TypeError: Failed to fetch'), DIAGNOSTIC_CATEGORIES.GENERIC_LOAD_FAILURE);
});

test('formatRuntimeDiagnosticReport emits stable developer-facing format', () => {
  const report = formatRuntimeDiagnosticReport({
    category: DIAGNOSTIC_CATEGORIES.INVALID_SHAPE,
    file: '../../data/characters.json',
    phase: 'config-load',
    detail: 'characters:$[0].id expected string but got number',
  });
  assert.match(report, /^\[runtime-diagnostic\] category=invalid shape \| source=\.\.\/\.\.\/data\/characters\.json \| phase=config-load/m);
  assert.match(report, /characters:\$\[0\]\.id expected string but got number/);
});

test('shouldEmitRuntimeDiagnostics gates output to localhost or explicit debug mode', () => {
  global.location = { hostname: 'example.com' };
  global.localStorage = { getItem: () => null };
  assert.equal(shouldEmitRuntimeDiagnostics(), false);

  global.location = { hostname: 'localhost' };
  assert.equal(shouldEmitRuntimeDiagnostics(), true);

  global.location = { hostname: 'example.com' };
  global.localStorage = { getItem: () => '1' };
  assert.equal(shouldEmitRuntimeDiagnostics(), true);
});
