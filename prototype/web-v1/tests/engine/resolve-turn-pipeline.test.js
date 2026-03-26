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
