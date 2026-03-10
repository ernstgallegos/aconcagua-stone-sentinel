const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', file), 'utf8'));
}

test('central turn engine exists and owns logging', () => {
  assert.match(source, /function resolveTurn\(state, action\)/);
  assert.match(source, /const pressureDelta = epResult\.pressureScore - BT/);
  assert.match(source, /function evaluateOutcome\(pressureDelta, actionMod, state\)/);
  assert.match(source, /function updateState\(state, result, action\)/);
  assert.match(source, /G\.runLogRecords\.push\(\{/);
  assert.match(source, /progress:/);
  assert.match(source, /confidence:/);
  assert.match(source, /run_log\.json/);
});

test('legacy progress drivers removed from gameplay', () => {
  assert.doesNotMatch(source, /const ALT_MOD\s*=\s*\{/);
  assert.doesNotMatch(source, /advanceProgressBase/);
  assert.doesNotMatch(source, /slowProgressBase/);
  assert.doesNotMatch(source, /weatherWeights/);
  assert.doesNotMatch(source, /terrainProgressBase/);
});

test('data files include v1.2 simulation keys', () => {
  const nodes = json('nodes.json');
  const ep = json('environmental_pressure_config.json');
  const actions = json('action_modifiers.json');
  const stages = json('stage_modifiers.json');

  assert.equal(nodes.length, 13);
  for (const node of nodes) {
    ['nodeName','altitudeBand','terrainLoad','weatherBias','visibilityBias','timeSensitivity','isCamp'].forEach((k) => {
      assert.ok(Object.hasOwn(node, k), `node has ${k}`);
    });
  }

  assert.ok(ep.simulation, 'simulation block exists');
  assert.ok(ep.simulation.progressBands, 'progress bands in config');
  assert.ok(ep.simulation.bivouacPenalty, 'bivouac penalty in config');
  assert.ok(ep.simulation.resourceBurnPerHour, 'resource burn in config');
  assert.ok(actions.advance && actions.sleep);
  assert.ok(stages.APPROACH && stages.HIGH_CAMP && stages.SUMMIT_DAY);
});

test('perception model contract exists', () => {
  assert.match(source, /function calculatePerception\(state\)/);
  assert.match(source, /confidenceLevel/);
  assert.match(source, /trendEstimate/);
  assert.match(source, /noiseLevel/);
});
