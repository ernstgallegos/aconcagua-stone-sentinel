const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

  assert.deepEqual(webOutcomes, contract.outcomes.webV1Canonical, 'web canonical outcomes match contract');

  const mraOutcomes = extractMraOutcomeLabels(simulatorSource);
  for (const expected of contract.outcomes.mraV0Legacy) {
    assert.ok(mraOutcomes.has(expected), `mra legacy outcome includes ${expected}`);
  }

  const requiredShared = contract.sharedContract.stateMetricsRequired;
  const mraRequired = new Set(schema.properties.initial_state.required);
  const webInitialKeys = extractWebInitialStateKeys(webScenarioConfig);

  for (const metric of requiredShared) {
    assert.ok(mraRequired.has(metric), `mra initial_state schema requires ${metric}`);
    assert.ok(webInitialKeys.has(metric), `web scenario template includes ${metric}`);
  }
});
