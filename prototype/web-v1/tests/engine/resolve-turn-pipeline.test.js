import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicTurnHarness } from '../harness/turn-harness.js';

function rngFrom(values) {
  let idx = 0;
  return () => values[Math.min(idx++, values.length - 1)];
}

function makeDeps() {
  const G = {
    rng: rngFrom([0.2, 0.2, 0.2]),
    highestPosIdx: 1,
    persistenceTurns: 0,
    acclimatization: 45,
    turn: 3,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 700,
    permitDay: 1,
    permitMaxDays: 20,
  };

  return {
    G,
    POSITIONS: ['horcones', 'camp_colera', 'summit'],
    CANONICAL_OUTCOMES: new Set(['Strategic Retreat', 'Collapse (Fatigue)', 'Rescue', 'Fatality', 'Permit Expired', 'Expedition Window Closed', 'Summit and Safe Return', 'High Point Return']),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: () => ({ progress: 8, collapse: -20, survival: 0, fatigueDelta: 2, fatigueMultiplier: 1, exposureDelta: 2, exposureMultiplier: 1, capacityDelta: -1, timeCost: 60 }),
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 2 }),
    getCurrentStage: () => 'HIGH_CAMP',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 48 }),
    applyBivouacPenalty: (_s, score) => score,
    calculateBodyTolerance: () => 40,
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 10, trendEstimate: 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: () => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: 8, pressureDeltaCapped: false }),
    isCampPosition: (position) => position !== 'summit',
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady', uncertainty: 'moderate' }),
    renderNarrative: () => 'ok',
    deriveTerminalOutcome: ({ outcome }) => outcome,
    getTimeWindows: () => ({ summitLateStart: 960 }),
    updateRunState: (state, partial) => Object.assign(state, partial),
    recordTelemetry: () => {},
    assertStateShape: () => true,
  };
}

test('resolveTurnWithTrace follows the canonical stage pipeline in order', () => {
  const deps = makeDeps();
  const harness = createDeterministicTurnHarness({
    deps,
    initialState: { position: 'camp_colera', functional_capacity: 85, fatigue: 15, exposure: 10, weather_severity: 1, visibility: 2, water: 8, food: 8 },
  });

  const run = harness.run('advance');
  assert.deepEqual(run.result.pipelineTrace, run.expectedPipeline);
  assert.deepEqual(harness.expectedPipeline, run.expectedPipeline);
});

test('zero effectiveDelta uses capped value, not raw pressureDelta (regression: || vs ?? coercion)', () => {
  // When pressureDeltaCap is 0, effectiveDelta is 0.
  // Before the fix, `effectiveDelta || pressureDelta` would bypass the cap
  // and use the raw (higher) pressureDelta for fatigue/exposure amplification.
  // After the fix, `effectiveDelta ?? pressureDelta` correctly uses 0.
  const deps = makeDeps();
  // Return an action modifier with pressureDeltaCap = 0 to force effectiveDelta = 0
  deps.getActionModifier = () => ({
    progress: -20, collapse: -90, survival: -10,
    fatigueDelta: 2, fatigueMultiplier: 0.65,
    exposureDelta: 2, exposureMultiplier: 0.6,
    capacityDelta: -1, timeCost: 60,
    pressureDeltaCap: 0,
    fatigueRecovery: 4, exposureRecovery: 4,
  });
  // Set EP much higher than BT to create large raw pressureDelta
  deps.calculateEnvironmentalPressure = () => ({ pressureScore: 80 });
  deps.calculateBodyTolerance = () => 30;
  // No summit regression capping so raw delta stays high
  deps.applySummitDifficultyRegressionGuard = () => ({
    acclPenaltyApplied: 0, acclPenaltyCapped: false,
    pressureDeltaApplied: 50, pressureDeltaCapped: false,
  });

  const initialFatigue = 20;
  const harness = createDeterministicTurnHarness({
    deps,
    initialState: {
      position: 'camp_colera', functional_capacity: 85,
      fatigue: initialFatigue, exposure: 15,
      weather_severity: 2, visibility: 2, water: 8, food: 8,
    },
  });

  const run = harness.run('descend');
  // With effectiveDelta = 0, pressureFactor = clamp(0/20, 0.5, 2.5) = 0.5
  // Without the fix (|| coercion), pressureFactor would use raw pressureDelta (~50),
  // giving clamp(50/20, 0.5, 2.5) = 2.5 — 5× higher amplification.
  // The result.effectiveDelta should be 0 (capped by pressureDeltaCap).
  assert.equal(run.result.result.effectiveDelta, 0, 'effectiveDelta should be 0 when capped');
  // Fatigue should not have been amplified by the uncapped pressureDelta
  assert.ok(
    run.state.fatigue <= initialFatigue + 10,
    `fatigue should stay low with capped pressure (got ${run.state.fatigue}), not spike from uncapped raw delta`
  );
});
