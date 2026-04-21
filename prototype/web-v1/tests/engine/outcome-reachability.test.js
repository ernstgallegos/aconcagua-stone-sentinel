import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnEngine } from '../../engine/turn-resolution.js';

function fixedRng(value = 0.5) {
  return () => value;
}

function makeDeps(overrides = {}) {
  const G = {
    rng: fixedRng(0.6),
    highestPosIdx: 0,
    persistenceTurns: 0,
    acclimatization: 45,
    turn: 1,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 600,
    permitDay: 1,
    permitMaxDays: 20,
    hasSummited: false,
  };

  return {
    G,
    POSITIONS: ['horcones', 'camp_colera', 'summit'],
    CANONICAL_OUTCOMES: new Set([
      'Strategic Retreat',
      'Rescue',
      'Collapse (Fatigue)',
      'Collapse (Exposure)',
      'Resource Exhaustion',
      'Permit Expired',
      'Expedition Window Closed',
      'High Point Return',
      'Summit and Safe Return',
      'Fatality',
    ]),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: () => ({
      progress: 0,
      collapse: -90,
      survival: 0,
      fatigueDelta: 0,
      fatigueMultiplier: 1,
      exposureDelta: 0,
      exposureMultiplier: 1,
      capacityDelta: 0,
      timeCost: 60,
    }),
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 2 }),
    getCurrentStage: () => 'HIGH_CAMP',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 35 }),
    applyBivouacPenalty: (_state, score) => score,
    calculateBodyTolerance: () => 55,
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 8, trendEstimate: 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: () => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: -20, pressureDeltaCapped: false }),
    isCampPosition: (position) => position === 'camp_colera' || position === 'horcones',
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady', uncertainty: 'moderate' }),
    renderNarrative: () => 'ok',
    deriveTerminalOutcome: ({ outcome }) => outcome,
    getTimeWindows: () => ({ summitLateStart: 960 }),
    updateRunState: (state, partial) => Object.assign(state, partial),
    recordTelemetry: () => {},
    assertStateShape: () => true,
    ...overrides,
  };
}

function baseState(overrides = {}) {
  return {
    position: 'camp_colera',
    functional_capacity: 72,
    fatigue: 30,
    exposure: 30,
    weather_severity: 1,
    visibility: 2,
    water: 10,
    food: 10,
    persistenceTier: 'fresh',
    ...overrides,
  };
}

test('emits Resource Exhaustion when resources are depleted', () => {
  const engine = createTurnEngine(makeDeps());
  const turn = engine.resolveTurn(baseState({ water: 0 }), 'wait');
  assert.equal(turn.outcome, 'Resource Exhaustion');
});

test('emits Collapse (Exposure) at camp under critical exposure', () => {
  const engine = createTurnEngine(makeDeps());
  // Threshold is 78: test just above the boundary
  const turn = engine.resolveTurn(baseState({ exposure: 79 }), 'wait');
  assert.equal(turn.outcome, 'Collapse (Exposure)');
});

test('emits Rescue outside camp under critical exposure', () => {
  const engine = createTurnEngine(makeDeps());
  // Threshold is 78: test just above the boundary outside camp
  const turn = engine.resolveTurn(baseState({ position: 'summit', exposure: 79 }), 'wait');
  assert.equal(turn.outcome, 'Rescue');
});
