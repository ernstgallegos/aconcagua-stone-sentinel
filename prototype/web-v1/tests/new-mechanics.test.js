const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const uiPath = path.join(__dirname, '..', 'ui', 'screens.js');
const enginePath = path.join(__dirname, '..', 'engine', 'turn-resolution.js');
const statePath = path.join(__dirname, '..', 'state', 'game-state.js');

const indexSource = fs.readFileSync(indexPath, 'utf8');
const uiSource = fs.readFileSync(uiPath, 'utf8');
const engineSource = fs.readFileSync(enginePath, 'utf8');
const stateSource = fs.readFileSync(statePath, 'utf8');

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', file), 'utf8'));
}

test('module shell loads ES modules and keeps compatibility facade', () => {
  assert.match(indexSource, /<script type="module" src="\.\/ui\/screens\.js"><\/script>/);
  assert.match(uiSource, /window\.makeDecision = makeDecision/);
  assert.match(uiSource, /window\.showScreen = showScreen/);
});

test('turn engine moved to engine module and remains authoritative', () => {
  assert.match(engineSource, /function resolveTurn\(state, action\)/);
  assert.match(engineSource, /const BT = calculateBodyTolerance\(state\)/);
  assert.match(engineSource, /const pressureDelta = epResult\.pressureScore - BT/);
  assert.match(engineSource, /const result = evaluateOutcome\(finalPressureDelta, actionMod, state\)/);
  assert.match(engineSource, /updateState\(state, result, resolvedAction\)/);
  assert.match(engineSource, /G\.lateSignalEvents\.push\(lateSignalEvent\)/);
  assert.match(engineSource, /perception\.trendEstimate/);
});

test('canonical outcomes include Rescue and remove legacy Incapacitated', () => {
  const outcomes = json('outcomes.json');
  assert.ok(outcomes.includes('Rescue'));
  assert.ok(!outcomes.includes('Incapacitated'));
  assert.doesNotMatch(engineSource, /Incapacitated/);
  assert.match(engineSource, /outsideCamp \? 'Rescue' : 'Collapse \(Fatigue\)'/);
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
  assert.match(uiSource, /function calculateEnvironmentalPressure\(state\)/);
  assert.match(uiSource, /function calculateBodyTolerance\(state\)/);
  assert.match(uiSource, /function calculatePerception\(\{ state, EP, BT, pressureDelta \}\)/);
  assert.match(engineSource, /const effectiveDelta = actionMod\.pressureDeltaCap/);
  assert.match(engineSource, /pressureFactor = clamp\(\(result\.effectiveDelta \|\| result\.pressureDelta\) \/ 20, 0\.5, 2\.5\)/);
  assert.match(uiSource, /if \(G\.minutesOfDay > 1320 && !isCampPosition\(state\.position\)\)/);
});


test('per-character guardrails enforce minimum readability and capped timing penalties', () => {
  const chars = json('characters.json');
  for (const ch of chars) {
    const g = ch.engine.perceptionGuardrails;
    assert.ok(g, `${ch.id} exposes perception guardrails`);
    assert.ok(g.minHintLevel >= 1, `${ch.id} keeps minimum useful hint level`);
    assert.ok(g.maxTimingActionPenalty <= 0.13, `${ch.id} caps timing action penalties`);
    assert.ok(g.maxTimingConfidencePenalty <= 11, `${ch.id} caps timing confidence penalties`);
    assert.ok(g.maxTimingNoiseIncrease <= 7, `${ch.id} caps timing noise increase`);
  }

  assert.match(uiSource, /function enforcePerceptionGuardrails\(confidenceLevel, noiseLevel\)/);
  assert.match(uiSource, /function applySummitDifficultyRegressionGuard\(\{/);
  assert.match(engineSource, /flags\.push\('summit-difficulty-guard'\)/);
  assert.match(uiSource, /function classifyDifficultyResponsibility\(\)/);
});

test('state module exposes canonical game state object', () => {
  assert.match(stateSource, /export const G = createInitialGameState\(\)/);
  assert.match(stateSource, /permitMaxDays: 20/);
});
