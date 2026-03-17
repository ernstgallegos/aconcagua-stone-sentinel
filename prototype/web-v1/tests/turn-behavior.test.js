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

test('resolveTurn enforces summit-return precedence over permit expiry/window and permit ordering over window', async () => {
  const { createTurnEngine } = await loadModule('engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('engine/turn-rules.js');

  const summitFixture = createFixtureEngine(createTurnEngine, {
    deriveTerminalOutcome,
  });
  summitFixture.G.highestPosIdx = 2;
  summitFixture.G.permitDay = 21;
  summitFixture.G.minutesOfDay = 1200;
  const summitState = { position: 'horcones', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const summitTurn = summitFixture.engine.resolveTurn(summitState, 'wait');
  assert.equal(summitTurn.outcome, 'Summit and Safe Return');

  const permitFixture = createFixtureEngine(createTurnEngine, { deriveTerminalOutcome });
  permitFixture.G.highestPosIdx = 1;
  permitFixture.G.permitDay = 21;
  permitFixture.G.minutesOfDay = 1200;
  const permitState = { position: 'camp_colera', functional_capacity: 90, fatigue: 20, exposure: 20, weather_severity: 1, visibility: 2, water: 10, food: 10 };
  const permitTurn = permitFixture.engine.resolveTurn(permitState, 'wait');
  assert.equal(permitTurn.outcome, 'Permit Expired');
});

test('decision-window caps and resource rounding floors are deterministic rule contracts', async () => {
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
  assert.deepEqual(burn, { waterBurn: 0, foodBurn: 0 });
});
