import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..', '..', '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function extractMraOutcomeLabels(simulatorSource) {
  const blockMatch = simulatorSource.match(/def classify_outcome\([\s\S]*?\n\n\ndef run_simulation/m);
  assert.ok(blockMatch, 'classify_outcome block found in mra simulator');
  const labels = new Set();
  for (const match of blockMatch[0].matchAll(/return\s+"([^"]+)"\s*,/g)) {
    labels.add(match[1]);
  }
  return labels;
}

function extractWebInitialStateKeys(webScenarioConfig) {
  const firstScenario = webScenarioConfig.predefinedScenarios?.[0];
  assert.ok(firstScenario?.initial, 'web-v1 first predefined scenario includes initial state');
  return new Set(Object.keys(firstScenario.initial));
}

test('model contract aligns outcomes and shared state overlap across both surfaces', () => {
  const contract = readJson('data/contracts/model-contract.json');
  const webOutcomes = readJson('data/outcomes.json');
  const simulatorSource = readText('prototype/mra-v0/simulator.py');
  const webScenarioConfig = readJson('data/scenarios.web-v1.json');
  const schema = readJson('prototype/mra-v0/scenarios/scenario.schema.json');
  const contextEvents = readJson('data/context_events.json');

  assert.deepEqual(webOutcomes, contract.outcomes.webV1Canonical, 'web canonical outcomes match contract');
  assert.equal(typeof contract.authoritativeArtifacts.contextEvents, 'string');
  assert.ok(contract.authoritativeArtifacts.contextEvents.includes('data/context_events.json'));
  const mraOutcomes = extractMraOutcomeLabels(simulatorSource);
  for (const expected of contract.outcomes.mraV0Legacy) {
    assert.ok(mraOutcomes.has(expected), `mra legacy outcome includes ${expected}`);
  }

  assert.ok(Array.isArray(contextEvents) && contextEvents.length > 0, 'context events contract is present');

  const requiredShared = contract.sharedContract.stateMetricsRequired;
  const mraRequired = new Set(schema.properties.initial_state.required);
  const webInitialKeys = extractWebInitialStateKeys(webScenarioConfig);

  for (const metric of requiredShared) {
    assert.ok(mraRequired.has(metric), `mra initial_state schema requires ${metric}`);
    assert.ok(webInitialKeys.has(metric), `web scenario template includes ${metric}`);
  }
});
