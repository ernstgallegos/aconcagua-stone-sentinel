import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnEngine } from '../../engine/turn-resolution.js';

function makeRng(seq = [0.31, 0.67, 0.19, 0.44]) {
  let idx = 0;
  return () => {
    const val = seq[idx % seq.length];
    idx += 1;
    return val;
  };
}

function makeDeps(overrides = {}) {
  const callLog = [];
  const telemetry = {};
  const G = {
    rng: makeRng(),
    highestPosIdx: 1,
    persistenceTurns: 0,
    acclimatization: 45,
    turn: 5,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 700,
    permitDay: 2,
    permitMaxDays: 20,
  };

  const deps = {
    G,
    POSITIONS: ['horcones', 'camp_colera', 'summit'],
    CANONICAL_OUTCOMES: new Set(['Strategic Retreat', 'Collapse (Fatigue)', 'Rescue', 'Fatality', 'Permit Expired', 'Expedition Window Closed', 'Summit and Safe Return', 'High Point Return']),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: (action) => {
      const defaults = {
        advance: { progress: 9, collapse: -18, survival: 0, fatigueDelta: 4, fatigueMultiplier: 1, exposureDelta: 3, exposureMultiplier: 1, capacityDelta: -2, timeCost: 60 },
        wait: { progress: 0, collapse: -22, survival: 0, fatigueDelta: -4, fatigueMultiplier: 1, exposureDelta: -3, exposureMultiplier: 1, capacityDelta: 2, timeCost: 45 },
        descend: { progress: -8, collapse: -14, survival: 0, fatigueDelta: -2, fatigueMultiplier: 1, exposureDelta: -2, exposureMultiplier: 1, capacityDelta: 1, timeCost: 50 },
      };
      return defaults[action] || defaults.wait;
    },
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 2, terrainLoad: 3 }),
    getCurrentStage: () => 'HIGH_CAMP',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 52 }),
    applyBivouacPenalty: (_s, score) => score,
    calculateBodyTolerance: () => 38,
    calculatePerception: ({ pressureDelta }) => ({ confidenceLevel: 65, noiseLevel: 12, trendEstimate: pressureDelta > 10 ? 'worsening' : 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: () => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: 14, pressureDeltaCapped: false }),
    isCampPosition: (position) => position !== 'summit',
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady', uncertainty: 'moderate' }),
    renderNarrative: () => 'ok',
    deriveTerminalOutcome: ({ outcome }) => outcome,
    getTimeWindows: () => ({ summitLateStart: 960 }),
    updateRunState: (state, partial) => Object.assign(state, partial),
    recordTelemetry: (_state, partial) => Object.assign(telemetry, partial),
    assertStateShape: () => true,
    ...overrides,
  };

  const wrapped = {
    ...deps,
    calculateEnvironmentalPressure: (...args) => {
      callLog.push('environment');
      return deps.calculateEnvironmentalPressure(...args);
    },
    calculateBodyTolerance: (...args) => {
      callLog.push('body');
      return deps.calculateBodyTolerance(...args);
    },
    calculatePerception: (...args) => {
      callLog.push('perception');
      return deps.calculatePerception(...args);
    },
  };

  return { deps: wrapped, callLog, telemetry, G };
}

function freshState() {
  return {
    position: 'camp_colera',
    functional_capacity: 80,
    fatigue: 28,
    exposure: 26,
    weather_severity: 2,
    visibility: 2,
    water: 8,
    food: 8,
  };
}

test('acceptance-1: turn outcomes are produced by resolveTurn and telemetry captures pipeline result', () => {
  const { deps, telemetry } = makeDeps();
  const engine = createTurnEngine(deps);
  const turn = engine.resolveTurn(freshState(), 'advance');

  assert.ok(turn.outcome);
  assert.ok(telemetry.lastTurnRecord);
  assert.equal(telemetry.lastTurnRecord.action, turn.resolvedAction);
  assert.equal(telemetry.lastTurnRecord.outcome, turn.outcome);
});

test('acceptance-2: environment calculation is invoked every turn and before body/perception', () => {
  const { deps, callLog } = makeDeps();
  const engine = createTurnEngine(deps);
  engine.resolveTurn(freshState(), 'wait');

  assert.deepEqual(callLog.slice(0, 3), ['environment', 'body', 'perception']);
});

test('acceptance-3: removing environment pressure collapses systemic differentiation', () => {
  const baseline = makeDeps();
  const noEnvironment = makeDeps({ calculateEnvironmentalPressure: () => ({ pressureScore: 0 }) });

  const baseEngine = createTurnEngine(baseline.deps);
  const flatEngine = createTurnEngine(noEnvironment.deps);

  const baseTurn = baseEngine.resolveTurn(freshState(), 'advance');
  const flatTurn = flatEngine.resolveTurn(freshState(), 'advance');

  assert.notEqual(baseTurn.result.pressureDelta, flatTurn.result.pressureDelta);
  assert.notEqual(baseTurn.result.collapseChance, flatTurn.result.collapseChance);
});

test('acceptance-4: perception keeps uncertainty and never exposes exact risk as a player signal', () => {
  const { deps, telemetry } = makeDeps();
  const engine = createTurnEngine(deps);
  engine.resolveTurn(freshState(), 'advance');

  assert.ok(Number.isFinite(telemetry.lastTurnRecord.perceivedSignals.uncertainty));
  assert.ok(telemetry.lastTurnRecord.perceivedSignals.uncertainty > 0);
  assert.equal(typeof telemetry.lastTurnRecord.perceivedSignals.trend, 'string');
  assert.equal(telemetry.lastTurnRecord.perceivedSignals.delta, undefined);
});

test('acceptance-5: WAIT can be the better action under high pressure', () => {
  const { deps } = makeDeps();
  const engine = createTurnEngine(deps);

  const advanceTurn = engine.resolveTurn(freshState(), 'advance');
  const waitTurn = engine.resolveTurn(freshState(), 'wait');

  assert.ok(waitTurn.result.collapseChance < advanceTurn.result.collapseChance);
  assert.ok(waitTurn.result.progressChance <= advanceTurn.result.progressChance);
});

test('acceptance-6: DESCEND can be the better action under high pressure', () => {
  const { deps } = makeDeps();
  const engine = createTurnEngine(deps);
  const advanceState = freshState();
  const descendState = freshState();

  const advanceTurn = engine.resolveTurn(advanceState, 'advance');
  const descendTurn = engine.resolveTurn(descendState, 'descend');

  assert.equal(descendTurn.result.outcome, 'Advance');
  assert.ok(descendState.functional_capacity >= advanceState.functional_capacity);
  assert.ok(descendState.fatigue <= advanceState.fatigue);
  assert.notEqual(descendTurn.result.targetPosition, 'summit');
});
