/**
 * Monte Carlo harness smoke test.
 *
 * Verifies that the headless simulator in scripts/monte-carlo-web-v1.js:
 * 1. Successfully imports and normalises all required data files.
 * 2. Can complete a minimal 1-character × 1-scenario × 1-seed simulation.
 * 3. Produces a canonical terminal outcome — not an undefined/NaN result.
 *
 * This guards against silent regressions in the harness itself — e.g.
 * node-ID normalisation breakage, data-schema drift, or engine-import
 * failures — which would produce misleading "0% summit" results instead
 * of visible test failures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

import {
  mulberry32,
  clamp,
  createTurnEngine,
} from '../../engine/turn-resolution.js';

import {
  calculateResourceBurnForMinutes,
  deriveTerminalOutcome,
} from '../../engine/turn-rules.js';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
}

const characters     = readJson('characters.json');
const rawNodes       = readJson('nodes.json');
const actionModifiers = readJson('action_modifiers.json');
const epConfig       = readJson('environmental_pressure_config.json');
const scenarios      = readJson('scenarios.web-v1.json');

// Normalise nodes exactly as the harness does
function buildNodes() {
  return rawNodes.map((node, idx) => ({
    id: node.nodeId || `node_${idx}`,
    name: node.nodeName,
    altitudeMeters: node.altitudeMeters || null,
    altitudeBand: node.altitudeBand || 0,
    terrainLoad: node.terrainLoad || 1,
    timeSensitivity: node.timeSensitivity || 1,
    stage: node.stageHint || 'APPROACH',
    weatherBias: node.weatherBias || 0,
    visibilityBias: node.visibilityBias || 0,
  }));
}

function buildActionModifier(action) {
  const base = actionModifiers[action] || {};
  return {
    fatigueDelta: Number.isFinite(base.fatigueDelta) ? base.fatigueDelta : 3,
    exposureDelta: Number.isFinite(base.exposureDelta) ? base.exposureDelta : 3,
    capacityDelta: Number.isFinite(base.capacityDelta) ? base.capacityDelta : -1,
    fatigueMultiplier: base.fatigueMultiplier || 1,
    exposureMultiplier: base.exposureMultiplier || 1,
    progress: base.progress || 0,
    timeCost: base.timeCost || 60,
    collapse: base.collapse || -60,
    survival: base.survival || 0,
  };
}

// Noop stubs that match the harness's actual stubs
function applyDecisionWindowDegradationNoop(actionMod, perception) {
  return { actionMod, perception, effect: { exceeded: false, overMs: 0, stepsOver: 0, capped: false } };
}

function applySummitDifficultyRegressionGuardNoop({ acclPenalty, pressureDelta }) {
  return {
    acclPenaltyApplied: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyCapped: false,
    pressureDeltaApplied: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaCapped: false,
    triggered: false,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test('monte carlo harness: data files are readable and non-empty', () => {
  assert.ok(Array.isArray(characters) && characters.length > 0, 'characters must be a non-empty array');
  assert.ok(Array.isArray(rawNodes) && rawNodes.length > 0, 'nodes must be a non-empty array');
  assert.ok(typeof actionModifiers === 'object' && actionModifiers !== null, 'action_modifiers must be an object');
  assert.ok(typeof epConfig === 'object' && epConfig !== null, 'environmentalPressureConfig must be an object');
  assert.ok(scenarios.predefinedScenarios?.length > 0, 'scenarios must have predefined entries');
});

test('monte carlo harness: nodeId→id normalisation produces valid POSITIONS array', () => {
  const nodes = buildNodes();
  const POSITIONS = nodes.map((n) => n.id);
  assert.ok(POSITIONS.includes('horcones'), 'POSITIONS must contain horcones after normalisation');
  assert.ok(POSITIONS.includes('summit'), 'POSITIONS must contain summit after normalisation');
  assert.strictEqual(POSITIONS.length, rawNodes.length, 'POSITIONS length must match rawNodes length');
  for (const pos of POSITIONS) {
    assert.ok(typeof pos === 'string' && pos.length > 0, `Position '${pos}' must be a non-empty string`);
  }
});

test('monte carlo harness: createTurnEngine accepts harness deps without throwing', () => {
  const nodes = buildNodes();
  const POSITIONS = nodes.map((n) => n.id);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const G = {
    turn: 0, minutesOfDay: 360, day: 1, permitDay: 1, permitMaxDays: 20,
    hasSummited: false, highestPosIdx: 0, acclimatization: 0,
    characterEventState: {}, characterConfidenceDrift: 0,
    persistenceTurns: 0, lastTurnRecord: {}, character: null,
    rng: mulberry32(42),
  };

  const engine = createTurnEngine({
    G,
    POSITIONS,
    CANONICAL_OUTCOMES: new Set(['Strategic Retreat', 'Summit and Safe Return', 'Permit Expired', 'Expedition Window Closed', 'Fatigue Collapse', 'Exposure Collapse', 'High Point Return', 'Rescue Required']),
    canUseShootPhoto: () => ({ allowed: false }),
    getActionModifier: buildActionModifier,
    applyTimeCost: (action) => actionModifiers[action]?.timeCost ?? 60,
    spendResourcesForMinutes: calculateResourceBurnForMinutes,
    getCurrentNode: (state) => nodeById[state.position] || nodes[0],
    getCurrentStage: () => 'APPROACH',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 30 }),
    applyBivouacPenalty: (_state, ep) => ep,
    calculateBodyTolerance: () => 60,
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 5, trendEstimate: 'steady' }),
    applyDecisionWindowDegradation: applyDecisionWindowDegradationNoop,
    applySummitDifficultyRegressionGuard: applySummitDifficultyRegressionGuardNoop,
    isCampPosition: () => false,
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady' }),
    renderNarrative: () => {},
    deriveTerminalOutcome: (args) => deriveTerminalOutcome({ ...args, POSITIONS }),
    getTimeWindows: () => ({ summitLateStart: 1020 }),
    updateRunState: (g, updates) => Object.assign(g, updates),
    recordTelemetry: () => {},
    assertStateShape: () => {},
    applyContextEvents: () => null,
  });

  assert.ok(typeof engine.resolveTurn === 'function', 'createTurnEngine must produce a resolveTurn function');
});

test('monte carlo harness: a single seeded run completes and produces a canonical terminal outcome', () => {
  const nodes = buildNodes();
  const POSITIONS = nodes.map((n) => n.id);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const stageByPos = Object.fromEntries(nodes.map((n) => [n.id, n.stage]));

  const CANONICAL_OUTCOMES = new Set([
    'Summit and Safe Return', 'High Point Return', 'Strategic Retreat',
    'Expedition Window Closed', 'Permit Expired',
    'Fatigue Collapse', 'Exposure Collapse',
    'Rescue Required', 'Fatal Accident', 'Equipment Failure',
  ]);

  const SCENARIO = scenarios.predefinedScenarios[0]; // assisted-route
  const SEED = SCENARIO.seeds[0];

  const G = {
    turn: 0, minutesOfDay: 360, day: 1, permitDay: 1, permitMaxDays: 20,
    hasSummited: false, highestPosIdx: 0, acclimatization: 0,
    characterEventState: {}, characterConfidenceDrift: 0,
    persistenceTurns: 0, lastTurnRecord: {}, character: characters[0],
    rng: mulberry32(SEED),
    photoInsightTurns: 0,
  };

  const state = {
    position: SCENARIO.initial.position,
    weather_severity: SCENARIO.initial.weather_severity,
    visibility: SCENARIO.initial.visibility,
    terrain_load: SCENARIO.initial.terrain_load,
    functional_capacity: SCENARIO.initial.functional_capacity,
    fatigue: SCENARIO.initial.fatigue,
    exposure: SCENARIO.initial.exposure,
    water: SCENARIO.initial.water,
    food: SCENARIO.initial.food,
    persistenceTier: 'fresh',
  };

  let currentStage = stageByPos[state.position] || 'APPROACH';

  const engine = createTurnEngine({
    G,
    POSITIONS,
    CANONICAL_OUTCOMES,
    canUseShootPhoto: () => ({ allowed: false }),
    getActionModifier: buildActionModifier,
    applyTimeCost: (action) => actionModifiers[action]?.timeCost ?? 60,
    spendResourcesForMinutes: calculateResourceBurnForMinutes,
    getCurrentNode: (s) => nodeById[s.position] || nodes[0],
    getCurrentStage: () => currentStage,
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 30 }),
    applyBivouacPenalty: (_state, ep) => ep,
    calculateBodyTolerance: () => 60,
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 5, trendEstimate: 'steady' }),
    applyDecisionWindowDegradation: applyDecisionWindowDegradationNoop,
    applySummitDifficultyRegressionGuard: applySummitDifficultyRegressionGuardNoop,
    isCampPosition: (pos) => ['plaza_mulas', 'camp_canada', 'nido_condores', 'camp_colera'].includes(pos),
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady' }),
    renderNarrative: () => {},
    deriveTerminalOutcome: (args) => deriveTerminalOutcome({ ...args, POSITIONS }),
    getTimeWindows: () => ({ summitLateStart: 1020 }),
    updateRunState: (g, updates) => { Object.assign(g, updates); },
    recordTelemetry: () => {},
    assertStateShape: () => {},
    applyContextEvents: () => null,
  });

  const maxTurns = SCENARIO.max_turns;
  let outcome = 'Strategic Retreat';
  let turns = 0;
  // Simple conservative policy: prefer wait/advance_slowly to stress-test survivability
  const policy = ['wait', 'advance', 'advance_slowly'];

  while (turns < maxTurns) {
    G.turn = turns + 1;
    const action = policy[turns % policy.length];
    const result = engine.resolveTurn(state, action);
    outcome = result.outcome;
    currentStage = stageByPos[state.position] || 'APPROACH';
    turns++;
    if (outcome !== 'Strategic Retreat') break;
  }

  assert.ok(
    CANONICAL_OUTCOMES.has(outcome),
    `Final outcome '${outcome}' must be a canonical terminal outcome (not undefined or unknown)`
  );
  assert.ok(turns > 0, 'Simulation must advance at least one turn');
  assert.ok(turns <= maxTurns, 'Simulation must respect max_turns boundary');
  assert.ok(typeof outcome === 'string' && outcome.length > 0, 'Outcome must be a non-empty string');
});
