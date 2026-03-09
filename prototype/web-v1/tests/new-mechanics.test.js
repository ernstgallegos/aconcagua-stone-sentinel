const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', file), 'utf8'));
}

test('environmental pressure engine contracts exist', () => {
  assert.match(source, /function calculateEnvironmentalPressure\(state\)/);
  assert.match(source, /function calculateBodyTolerance\(state\)/);
  assert.match(source, /pressureDeltaLabel\(delta\)/);
  assert.match(source, /PressureDelta = EP - BT|pressureDelta = epResult\.pressureScore - bt/);
  assert.match(source, /loadDataConfig\(\)/);
  assert.match(source, /run_log\.json/);
});

test('data files include required keys', () => {
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

  assert.ok(ep.altitudePressureByBand);
  assert.ok(ep.weights);
  assert.ok(actions.advance);
  assert.ok(actions.sleep);
  assert.ok(stages.APPROACH && stages.HIGH_CAMP && stages.SUMMIT_DAY);
});
