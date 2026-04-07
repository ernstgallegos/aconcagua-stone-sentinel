import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyDataLoadError,
  formatRuntimeDiagnosticReport,
  shouldLogRuntimeDiagnostics,
} from '../../ui/helpers/runtime-diagnostics.js';

test('classifyDataLoadError maps known categories and generic fallback', () => {
  assert.equal(classifyDataLoadError(new Error('[missing file] ../../data/nodes.json')), 'missing file');
  assert.equal(classifyDataLoadError(new Error('[http failure] ../../data/nodes.json (status 500)')), 'http failure');
  assert.equal(classifyDataLoadError(new Error('[invalid JSON] ../../data/nodes.json (Unexpected token)')), 'invalid json');
  assert.equal(classifyDataLoadError(new Error('characters:$[1].id expected string but got number')), 'invalid shape');
  assert.equal(classifyDataLoadError(new Error('socket timeout')), 'generic load failure');
});

test('formatRuntimeDiagnosticReport uses stable developer-facing structure', () => {
  const line = formatRuntimeDiagnosticReport({
    category: 'invalid json',
    file: '../../data/outcomes.json',
    detail: 'Unexpected token ]',
  });
  assert.match(line, /^\[web-v1\]\[startup\] category=invalid json \| source=\.\.\/\.\.\/data\/outcomes\.json \| detail=Unexpected token \]/);
});

test('shouldLogRuntimeDiagnostics is true on localhost and debug flag', () => {
  global.location = { hostname: 'localhost' };
  global.localStorage = { getItem() { return null; } };
  assert.equal(shouldLogRuntimeDiagnostics(), true);

  global.location = { hostname: 'example.com' };
  global.localStorage = { getItem() { return '1'; } };
  assert.equal(shouldLogRuntimeDiagnostics(), true);

  global.localStorage = { getItem() { return null; } };
  assert.equal(shouldLogRuntimeDiagnostics(), false);
});
