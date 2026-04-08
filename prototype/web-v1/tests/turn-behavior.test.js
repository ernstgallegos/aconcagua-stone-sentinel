import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadModule(relPath) {
  const abs = path.join(__dirname, '..', relPath);
  return import(pathToFileURL(abs).href);
}

function rngFrom(values) {
  let idx = 0;
  return () => values[Math.min(idx++, values.length - 1)];
}

function createFixtureEngine(createTurnEngine, extras = {}) {
  const POSITIONS = ['horcones', 'camp_colera', 'summit'];
  const G = {
    rng: rngFrom([0.2, 0.2, 0.2]),
    highestPosIdx: 0,
    persistenceTurns: 0,
    acclimatization: 45,
    turn: 3,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 1000,
    permitDay: 1,
    permitMaxDays: 20,
  };

  const deps = {
    G,
    POSITIONS,
    CANONICAL_OUTCOMES: new Set([
      'Summit and Safe Return',
      'High Point Return',
      'Strategic Retreat',
      'Rescue',
      'Collapse (Fatigue)',
      'Expedition Window Closed',
      'Permit Expired',
      'Fatality',
    ]),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: () => ({
      progress: 5,
      collapse: 0,
      survival: 0,
      fatigueDelta: 4,
      fatigueMultiplier: 1,
      exposureDelta: 3,
      exposureMultiplier: 1,
      capacityDelta: -1,
      timeCost: 60,
    }),
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 2 }),
    getCurrentStage: () => 'SUMMIT_DAY',
    getPersistenceTier: () => 'steady',
    calculateEnvironmentalPressure: () => ({ pressureScore: 56 }),
    applyBivouacPenalty: (_state, score) => score,
    calculateBodyTolerance: () => 42,
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 12, trendEstimate: 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: () => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: 14, pressureDeltaCapped: false }),
    isCampPosition: (position) => position === 'horcones' || position === 'camp_colera',
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady', uncertainty: 'moderate' }),
    renderNarrative: () => 'fixture-narrative',
    deriveTerminalOutcome: ({ outcome }) => outcome,
    getTimeWindows: () => ({ summitLateStart: 960 }),
    updateRunState: (state, partial) => Object.assign(state, partial),
    recordTelemetry: () => {},
    assertStateShape: () => true,
    ...extras,
  };

  return { engine: createTurnEngine(deps), G, POSITIONS };
}

test('evaluateOutcome is deterministic with controlled RNG and pressure caps', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    G: { rng: () => 0.0, highestPosIdx: 0, persistenceTurns: 0, acclimatization: 30, turn: 1, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 600, permitDay: 1, permitMaxDays: 20 },
  });

  const state = { position: 'camp_colera', functional_capacity: 90, fatigue: 20, exposure: 20 };
  const out = engine.evaluateOutcome(40, { progress: 4, collapse: 0, survival: 0, pressureDeltaCap: 10 }, state);

  assert.equal(out.effectiveDelta, 10);
  assert.equal(out.outcome, 'Collapse (Fatigue)');
  assert.equal(out.targetPosition, 'camp_colera');
});

test('updateState applies deterministic deltas and updates highest position', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine, G } = createFixtureEngine(createTurnEngine);
  const state = { position: 'camp_colera', functional_capacity: 80, fatigue: 10, exposure: 10 };

  engine.updateState(state, { targetPosition: 'summit', pressureDelta: 20, effectiveDelta: 10 }, 'advance');

  assert.equal(state.position, 'summit');
  assert.equal(G.highestPosIdx, 2);
  assert.equal(state.fatigue, 12);
  assert.equal(state.exposure, 11.5);
  assert.ok(state.functional_capacity < 80);
});

test('resolveTurn enforces park-exit precedence for summit return and permit ordering over window', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');

  const summitFixture = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
  });
  summitFixture.G.highestPosIdx = 2;
  summitFixture.G.permitDay = 21;
  summitFixture.G.minutesOfDay = 1200;
  const summitState = { position: 'horcones', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const summitTurn = summitFixture.engine.resolveTurn(summitState, 'descend');
  assert.equal(summitTurn.outcome, 'Summit and Safe Return');

  const permitFixture = createFixtureEngine(createTurnEngine, { deriveTerminalOutcome });
  permitFixture.G.highestPosIdx = 1;
  permitFixture.G.permitDay = 21;
  permitFixture.G.minutesOfDay = 1200;
  const permitState = { position: 'camp_colera', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const permitTurn = permitFixture.engine.resolveTurn(permitState, 'wait');
  assert.equal(permitTurn.outcome, 'Permit Expired');
});

test('park exit still awards summit return when hasSummited is true and highestPosIdx is stale', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');

  const fixture = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
    G: { rng: rngFrom([0.5]), highestPosIdx: 1, hasSummited: true, persistenceTurns: 0, acclimatization: 45, turn: 8, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 900, permitDay: 6, permitMaxDays: 20 },
    getActionModifier: (action) => action === 'descend'
      ? { progress: -20, collapse: -90, survival: -10, fatigueDelta: -1, fatigueMultiplier: 1, exposureDelta: -1, exposureMultiplier: 1, capacityDelta: 2, timeCost: 60 }
      : { progress: 0, collapse: -65, survival: 5, fatigueDelta: 2, fatigueMultiplier: 1, exposureDelta: 2, exposureMultiplier: 1, capacityDelta: 1, timeCost: 60 },
    getCurrentNode: () => ({ altitudeBand: 0 }),
    getCurrentStage: () => 'DESCENT',
  });

  const state = { position: 'horcones', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const turn = fixture.engine.resolveTurn(state, 'descend');

  assert.equal(turn.outcome, 'Summit and Safe Return');
});

test('decision-window caps and fractional resource burn are deterministic rule contracts', async () => {
  const { applyDecisionWindowDegradationRule, calculateResourceBurnForMinutes } = await loadModule('engine/turn-rules.js');

  const degraded = applyDecisionWindowDegradationRule({
    actionMod: { fatigueMultiplier: 1, exposureMultiplier: 1 },
    perception: { confidenceLevel: 60, noiseLevel: 8, trendEstimate: 'steady' },
    windowState: { effectiveElapsed: 90000, profile: { totalWindowMs: 20000 }, overMs: 70000, stepsOver: 20, overRatio: 1.5 },
    guardrails: { maxTimingActionPenalty: 0.1, maxTimingConfidencePenalty: 7, maxTimingNoiseIncrease: 5 },
    stage: 'SUMMIT_DAY',
  });

  assert.equal(degraded.effect.capped, true);
  assert.equal(degraded.effect.actionPenalty, 0.1);
  assert.equal(degraded.effect.confidencePenalty, 7);
  assert.equal(degraded.effect.noiseIncrease, 5);

  const burn = calculateResourceBurnForMinutes({
    minutes: 30,
    burnPerHour: { water: 0.34, food: 0.24 },
    efficiency: 1,
  });
  assert.deepEqual(burn, { waterBurn: 0.17, foodBurn: 0.12 });
});


test('approach wait cannot generate unintended forward movement', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    G: { rng: rngFrom([0.5]), highestPosIdx: 0, persistenceTurns: 0, acclimatization: 45, turn: 1, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 600, permitDay: 1, permitMaxDays: 20 },
    getCurrentNode: () => ({ altitudeBand: 1 }),
  });

  const state = { position: 'horcones', functional_capacity: 95, fatigue: 10, exposure: 10, weather_severity: 0, visibility: 3, water: 10, food: 10 };
  const turn = engine.resolveTurn(state, 'wait');

  assert.equal(turn.result.outcome, 'Hold');
  assert.equal(turn.result.targetPosition, 'horcones');
  assert.equal(state.position, 'horcones');
});

test('returning to horcones after an early retreat does not auto-end until the player exits the park', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');
  const { engine, G } = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
    G: { rng: rngFrom([0.5, 0.5, 0.2]), highestPosIdx: 1, persistenceTurns: 0, acclimatization: 45, turn: 2, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 600, permitDay: 1, permitMaxDays: 20 },
    getActionModifier: (action) => action === 'descend'
      ? { progress: -20, collapse: -90, survival: -10, fatigueDelta: -1, fatigueMultiplier: 1, exposureDelta: -1, exposureMultiplier: 1, capacityDelta: 2, timeCost: 60 }
      : { progress: 0, collapse: -65, survival: 5, fatigueDelta: 2, fatigueMultiplier: 1, exposureDelta: 2, exposureMultiplier: 1, capacityDelta: 1, timeCost: 60 },
    getCurrentNode: () => ({ altitudeBand: 1 }),
    getCurrentStage: () => 'APPROACH',
  });

  const retreatState = { position: 'camp_colera', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const retreatTurn = engine.resolveTurn(retreatState, 'descend');
  assert.equal(retreatState.position, 'horcones');
  assert.equal(retreatTurn.outcome, 'Strategic Retreat');

  const exitTurn = engine.resolveTurn(retreatState, 'descend');
  assert.equal(exitTurn.outcome, 'High Point Return');
});

test('descending from horcones without prior ascent exits the park as a strategic retreat', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
    G: { rng: rngFrom([0.5]), highestPosIdx: 0, persistenceTurns: 0, acclimatization: 45, turn: 1, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 600, permitDay: 1, permitMaxDays: 20 },
    getActionModifier: (action) => action === 'descend'
      ? { progress: -20, collapse: -90, survival: -10, fatigueDelta: -1, fatigueMultiplier: 1, exposureDelta: -1, exposureMultiplier: 1, capacityDelta: 2, timeCost: 60 }
      : { progress: 0, collapse: -65, survival: 5, fatigueDelta: 2, fatigueMultiplier: 1, exposureDelta: 2, exposureMultiplier: 1, capacityDelta: 1, timeCost: 60 },
    getCurrentNode: () => ({ altitudeBand: 0 }),
    getCurrentStage: () => 'APPROACH',
  });

  const state = { position: 'horcones', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const turn = engine.resolveTurn(state, 'descend');

  assert.equal(turn.outcome, 'Strategic Retreat');
  assert.equal(turn.result.targetPosition, 'horcones');
});


test('summit arrival keeps the run alive and marks hasSummited before park exit', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');
  const { engine, G } = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
    getActionModifier: () => ({ progress: 20, collapse: -45, survival: 0, fatigueDelta: 6, fatigueMultiplier: 1, exposureDelta: 5, exposureMultiplier: 1, capacityDelta: -3, timeCost: 110 }),
    getCurrentNode: () => ({ altitudeBand: 4 }),
    getCurrentStage: () => 'SUMMIT_DAY',
    calculateEnvironmentalPressure: () => ({ pressureScore: 50 }),
    calculateBodyTolerance: () => 48,
  });
  G.rng = rngFrom([0.2]);
  G.highestPosIdx = 1;
  G.turn = 4;
  G.minutesOfDay = 900;
  G.hasSummited = false;

  const state = { position: 'camp_colera', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 0, visibility: 3, water: 10, food: 10 };
  const turn = engine.resolveTurn(state, 'advance');

  assert.equal(turn.result.targetPosition, 'summit');
  assert.equal(turn.outcome, 'Strategic Retreat');
  assert.equal(G.hasSummited, true);
  assert.equal(state.position, 'summit');
});

test('summit blocks further ascent attempts and marks them as blocked hold turns', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');
  const { engine, G } = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
    G: { rng: rngFrom([0.2]), highestPosIdx: 2, persistenceTurns: 0, acclimatization: 45, turn: 5, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 900, permitDay: 1, permitMaxDays: 20, hasSummited: true },
    getCurrentNode: () => ({ altitudeBand: 4 }),
    getCurrentStage: () => 'SUMMIT_DAY',
    getActionModifier: () => ({ progress: 0, collapse: -100, survival: 0, fatigueDelta: 0, fatigueMultiplier: 1, exposureDelta: 0, exposureMultiplier: 1, capacityDelta: 0, timeCost: 60 }),
    calculateEnvironmentalPressure: () => ({ pressureScore: 35 }),
    calculateBodyTolerance: () => 60,
  });

  const state = { position: 'summit', functional_capacity: 85, fatigue: 30, exposure: 25, weather_severity: 0, visibility: 3, water: 10, food: 10 };
  const turn = engine.resolveTurn(state, 'advance');

  assert.equal(turn.resolvedAction, 'wait');
  assert.equal(turn.result.outcome, 'Hold');
  assert.equal(turn.result.targetPosition, 'summit');
  assert.equal(turn.result.blocked, true);
  assert.equal(turn.result.moved, false);
  assert.ok(turn.flags.includes('summit-descent-only'));
  assert.equal(state.position, 'summit');
});

test('descend always moves one step down unless collapse fires', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    G: { rng: rngFrom([0.95]), highestPosIdx: 2, persistenceTurns: 0, acclimatization: 45, turn: 5, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 900, permitDay: 1, permitMaxDays: 20 },
    getActionModifier: () => ({ progress: -20, collapse: -90, survival: -10, fatigueDelta: -4, fatigueMultiplier: 1, exposureDelta: -4, exposureMultiplier: 1, capacityDelta: 2, timeCost: 60, pressureDeltaCap: 30 }),
    getCurrentNode: () => ({ altitudeBand: 4 }),
    getCurrentStage: () => 'SUMMIT_DAY',
    calculateEnvironmentalPressure: () => ({ pressureScore: 70 }),
    calculateBodyTolerance: () => 55,
  });

  const state = { position: 'summit', functional_capacity: 80, fatigue: 40, exposure: 30, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const turn = engine.resolveTurn(state, 'descend');

  assert.equal(turn.result.outcome, 'Advance');
  assert.equal(turn.result.targetPosition, 'camp_colera');
  assert.equal(state.position, 'camp_colera');
});

test('updateState applies full fixed recovery at low pressure and keeps sleep fc non-negative at high pressure', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    getActionModifier: (action) => action === 'sleep'
      ? { progress: 0, collapse: -95, survival: 5, fatigueDelta: -22, fatigueMultiplier: 1, exposureDelta: -14, exposureMultiplier: 1, capacityDelta: 4, timeCost: 480 }
      : { progress: 0, collapse: 0, survival: 0, fatigueDelta: 0, fatigueMultiplier: 1, exposureDelta: 0, exposureMultiplier: 1, capacityDelta: 0, timeCost: 60 },
  });

  const lowPressureState = { position: 'camp_colera', functional_capacity: 70, fatigue: 40, exposure: 30 };
  engine.updateState(lowPressureState, { targetPosition: 'camp_colera', pressureDelta: 10, effectiveDelta: 10 }, 'sleep');
  assert.equal(lowPressureState.fatigue, 18);
  assert.equal(lowPressureState.exposure, 16);
  assert.equal(lowPressureState.functional_capacity, 74);

  const highPressureState = { position: 'camp_colera', functional_capacity: 70, fatigue: 40, exposure: 30 };
  engine.updateState(highPressureState, { targetPosition: 'camp_colera', pressureDelta: 50, effectiveDelta: 50 }, 'sleep');
  assert.equal(highPressureState.fatigue, 18);
  assert.equal(highPressureState.exposure, 16);
  assert.equal(highPressureState.functional_capacity, 71);
});

test('deriveTerminalOutcome exempts descend from summit window checks but blocks late ascent attempts', async () => {
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');
  const POSITIONS = ['horcones', 'camp_colera', 'summit'];
  const base = {
    outcome: 'Strategic Retreat',
    state: { position: 'camp_colera' },
    G: { highestPosIdx: 1, permitDay: 1, permitMaxDays: 20, minutesOfDay: 1300 },
    POSITIONS,
    stage: 'SUMMIT_DAY',
    timeWindows: { summitLateStart: 1020 },
    previousPosition: 'camp_colera',
    exitedPark: false,
  };

  assert.equal(deriveTerminalOutcome({ ...base, action: 'descend' }), 'Strategic Retreat');
  assert.equal(deriveTerminalOutcome({ ...base, action: 'advance' }), 'Expedition Window Closed');
});


test('sleep never advances or retreats the player position', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { engine } = createFixtureEngine(createTurnEngine, {
    G: { rng: rngFrom([0.2, 0.97, 0.5]), highestPosIdx: 1, persistenceTurns: 0, acclimatization: 45, turn: 6, lateSignalDeterminantTurns: 0, lateSignalEvents: [], photoInsightTurns: 0, photoShotsTaken: 0, lastPhotoTurn: -99, minutesOfDay: 900, permitDay: 1, permitMaxDays: 20 },
    getActionModifier: () => ({ progress: 0, collapse: -95, survival: 5, fatigueDelta: -22, fatigueMultiplier: 1, exposureDelta: -14, exposureMultiplier: 1, capacityDelta: 4, timeCost: 480 }),
    getCurrentNode: () => ({ altitudeBand: 2 }),
    getCurrentStage: () => 'HIGH_CAMP',
    calculateEnvironmentalPressure: () => ({ pressureScore: 30 }),
    calculateBodyTolerance: () => 55,
  });

  const lowRollState = { position: 'camp_colera', functional_capacity: 70, fatigue: 40, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const lowRollTurn = engine.resolveTurn(lowRollState, 'sleep');
  assert.equal(lowRollTurn.result.outcome, 'Hold');
  assert.equal(lowRollTurn.result.targetPosition, 'camp_colera');
  assert.equal(lowRollState.position, 'camp_colera');

  const highRollState = { position: 'camp_colera', functional_capacity: 70, fatigue: 40, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const highRollTurn = engine.resolveTurn(highRollState, 'sleep');
  assert.equal(highRollTurn.result.outcome, 'Hold');
  assert.equal(highRollTurn.result.targetPosition, 'camp_colera');
  assert.equal(highRollState.position, 'camp_colera');
});
