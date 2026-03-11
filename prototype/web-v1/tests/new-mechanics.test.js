const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', file), 'utf8'));
}

test('central turn engine is authoritative', () => {
  assert.match(source, /function resolveTurn\(state, action\)/);
  assert.match(source, /const BT = calculateBodyTolerance\(state\)/);
  assert.match(source, /const pressureDelta = epResult\.pressureScore - BT/);
  assert.match(source, /const result = evaluateOutcome\(pressureDelta, actionMod, state\)/);
  assert.match(source, /updateState\(state, result, action\)/);
  assert.match(source, /G\.runLogRecords\.push\(\{/);
  assert.match(source, /trendEstimate:/);
});

test('canonical outcomes include Rescue and remove legacy Incapacitated', () => {
  const outcomes = json('outcomes.json');
  assert.ok(outcomes.includes('Rescue'));
  assert.ok(!outcomes.includes('Incapacitated'));
  assert.doesNotMatch(source, /Incapacitated/);
  assert.match(source, /outsideCamp \? 'Rescue' : 'Collapse \(Fatigue\)'/);
});

test('canonical node route is v1.3 with 15 nodes', () => {
  const nodes = json('nodes.json');
  assert.equal(nodes.length, 15);
  assert.equal(nodes[7].nodeName, 'Cambio de Pendiente (5300m)');
  assert.equal(nodes[9].nodeName, 'El Balcón Amarillo (5800m)');
  assert.equal(nodes[12].nodeName, 'La Travesía');
  for (const node of nodes) {
    ['nodeName', 'altitudeBand', 'terrainLoad', 'weatherBias', 'visibilityBias', 'timeSensitivity', 'isCamp'].forEach((k) => {
      assert.ok(Object.hasOwn(node, k), `node has ${k}`);
    });
  }
});

test('data files include source-of-truth simulation keys', () => {
  const ep = json('environmental_pressure_config.json');
  const actions = json('action_modifiers.json');
  const stages = json('stage_modifiers.json');
  const chars = json('characters.json');

  assert.ok(ep.simulation.progressBands, 'progress bands in config');
  assert.ok(ep.simulation.bivouacPenalty, 'bivouac penalty in config');
  assert.ok(actions.advance && actions.wait && actions.sleep && actions.descend);
  assert.ok(stages.APPROACH && stages.HIGH_CAMP && stages.SUMMIT_DAY);
  assert.ok(chars.length >= 3, 'character roster loaded from data');
  assert.ok(chars[0].engine.fatigueResistance);
});

test('perception and body tolerance pipeline is explicit', () => {
  assert.match(source, /function calculateEnvironmentalPressure\(state\)/);
  assert.match(source, /function calculateBodyTolerance\(state\)/);
  assert.match(source, /function calculatePerception\(\{ state, EP, BT, pressureDelta \}\)/);
  assert.match(source, /pressureFactor = clamp\(pressureDelta \/ 20, 0\.5, 2\.5\)/);
  assert.match(source, /if \(G\.minutesOfDay > 1320 && !isCampPosition\(state\.position\)\)/);
});
