import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..', '..', '..', '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('model-contract intentional divergences remain explicitly documented', () => {
  const contract = readJson('data/contracts/model-contract.json');
  assert.ok(Array.isArray(contract.intentionalDivergences));
  assert.ok(contract.intentionalDivergences.length >= 3);
  for (const divergence of contract.intentionalDivergences) {
    assert.equal(divergence.status, 'intentional');
    assert.equal(typeof divergence.concept, 'string');
    assert.equal(typeof divergence.difference, 'string');
  }
});

test('ownership matrix explicitly assigns active/frozen responsibilities for both prototypes', () => {
  const matrix = readText('docs/prototype-ownership-matrix.md');
  assert.match(matrix, /prototype\/web-v1/);
  assert.match(matrix, /prototype\/mra-v0/);
  assert.match(matrix, /active canonical gameplay authority/i);
  assert.match(matrix, /frozen compatibility artifact/i);
  assert.match(matrix, /required contract gate/i);
});

test('shared state metrics remain contract-overlapped between web-v1 and mra-v0', () => {
  const contract = readJson('data/contracts/model-contract.json');
  const scenarios = readJson('data/scenarios.web-v1.json');
  const schema = readJson('prototype/mra-v0/scenarios/scenario.schema.json');

  const webInitial = scenarios.predefinedScenarios?.[0]?.initial || {};
  const webKeys = new Set(Object.keys(webInitial));
  const mraRequired = new Set(schema.properties?.initial_state?.required || []);

  for (const metric of contract.sharedContract.stateMetricsRequired || []) {
    assert.ok(webKeys.has(metric), `web-v1 initial state includes ${metric}`);
    assert.ok(mraRequired.has(metric), `mra-v0 schema requires ${metric}`);
  }
});
