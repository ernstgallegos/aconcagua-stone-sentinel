import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicTurnHarness } from '../harness/turn-harness.js';

function seqRng(seq) {
  let i = 0;
  return () => seq[(i++) % seq.length];
}

function makeDeps() {
  const G = {
    rng: seqRng([0.2, 0.4, 0.7, 0.1, 0.6]),
    highestPosIdx: 0,
    persistenceTurns: 0,
    acclimatization: 40,
    turn: 1,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 600,
    permitDay: 1,
    permitMaxDays: 20,
  };

  return {
    G,
    POSITIONS: ['horcones', 'camp_colera', 'summit'],
    CANONICAL_OUTCOMES: new Set(['Strategic Retreat', 'Collapse (Fatigue)', 'Rescue', 'Fatality', 'Permit Expired', 'Expedition Window Closed', 'Summit and Safe Return', 'High Point Return']),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: (action) => ({ progress: action === 'descend' ? -8 : 8, collapse: -18, survival: 0, fatigueDelta: action === 'wait' ? -1 : 3, fatigueMultiplier: 1, exposureDelta: action === 'wait' ? -1 : 2, exposureMultiplier: 1, capacityDelta: action === 'wait' ? 1 : -2, timeCost: 60 }),
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 2 }),
    getCurrentStage: () => 'HIGH_CAMP',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 45 }),
    applyBivouacPenalty: (_s, score) => score,
    calculateBodyTolerance: () => 38,
    calculatePerception: () => ({ confidenceLevel: 66, noiseLevel: 10, trendEstimate: 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: (_x) => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: 7, pressureDeltaCapped: false }),
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

test('golden deterministic run keeps stable structural outputs', () => {
  const deps = makeDeps();
  const harness = createDeterministicTurnHarness({
    deps,
    initialState: { position: 'horcones', functional_capacity: 84, fatigue: 12, exposure: 10, weather_severity: 1, visibility: 2, water: 10, food: 10 },
  });

  const actions = ['advance', 'wait', 'advance', 'descend', 'wait'];
  const results = actions.map((action) => harness.run(action));
  const final = results[results.length - 1];

  assert.equal(results.length, 5);
  assert.ok(['Strategic Retreat', 'Advance', 'Hold', 'Retreat', 'Collapse (Fatigue)'].includes(final.result.outcome));
  assert.ok(final.state.position);
  assert.equal(Array.isArray(final.result.pipelineTrace), true);
  assert.deepEqual(final.result.pipelineTrace, harness.expectedPipeline);
});
