import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..', '..', '..', '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

async function loadModule(relPath) {
  const abs = path.join(repoRoot, relPath);
  return import(pathToFileURL(abs).href);
}

test('environmental pressure config keeps monotonic altitude pressure and bounded terrain scales', () => {
  const config = readJson('data/environmental_pressure_config.json');
  const altitude = config.altitudePressureByBand;
  const terrainScale = config.terrainLoadScale;

  for (let i = 1; i < altitude.length; i += 1) {
    assert.ok(altitude[i] >= altitude[i - 1], `altitudePressureByBand must be monotonic at index ${i}`);
  }

  const entries = Object.entries(terrainScale || {});
  assert.ok(entries.length >= 5, 'terrainLoadScale should define all route bands');
  for (const [idx, value] of entries) {
    assert.ok(value >= 1 && value <= 30, `terrainLoadScale[${idx}] out of guardrail bounds: ${value}`);
  }
});

test('resource burn floors preserve fractional consumption on half-hour turns', async () => {
  const { calculateResourceBurnForMinutes } = await loadModule('prototype/web-v1/engine/turn-rules.js');
  const burn = calculateResourceBurnForMinutes({
    minutes: 30,
    burnPerHour: { water: 0.34, food: 0.24 },
    efficiency: 1,
  });

  assert.deepEqual(burn, { waterBurn: 0.17, foodBurn: 0.12 });
  assert.ok(burn.waterBurn > 0, 'water burn must stay positive for non-zero half-hour burn rates');
  assert.ok(burn.foodBurn > 0, 'food burn must stay positive for non-zero half-hour burn rates');
});

test('summit-route viability guard: deterministic summit return remains reachable', async () => {
  const { createTurnEngine } = await loadModule('prototype/web-v1/engine/turn-resolution.js');
  const { deriveTerminalOutcome } = await loadModule('prototype/web-v1/engine/turn-rules.js');

  const POSITIONS = ['horcones', 'camp_colera', 'summit'];
  const G = {
    rng: () => 0.2,
    highestPosIdx: 2,
    hasSummited: true,
    persistenceTurns: 0,
    acclimatization: 45,
    turn: 8,
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    photoInsightTurns: 0,
    photoShotsTaken: 0,
    lastPhotoTurn: -99,
    minutesOfDay: 900,
    permitDay: 3,
    permitMaxDays: 20,
  };

  const engine = createTurnEngine({
    G,
    POSITIONS,
    CANONICAL_OUTCOMES: new Set([
      'Summit and Safe Return',
      'High Point Return',
      'Strategic Retreat',
      'Rescue',
      'Collapse (Fatigue)',
      'Collapse (Exposure)',
      'Resource Exhaustion',
      'Expedition Window Closed',
      'Permit Expired',
      'Fatality',
    ]),
    canUseShootPhoto: () => ({ allowed: true }),
    getActionModifier: () => ({ progress: -20, collapse: -90, survival: -10, fatigueDelta: -1, fatigueMultiplier: 1, exposureDelta: -1, exposureMultiplier: 1, capacityDelta: 2, timeCost: 60 }),
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => {},
    getCurrentNode: () => ({ altitudeBand: 0 }),
    getCurrentStage: () => 'DESCENT',
    getPersistenceTier: () => 'steady',
    calculateEnvironmentalPressure: () => ({ pressureScore: 40 }),
    applyBivouacPenalty: (_state, score) => score,
    calculateBodyTolerance: () => 65,
    calculatePerception: () => ({ confidenceLevel: 75, noiseLevel: 8, trendEstimate: 'steady', latency: { active: false } }),
    applyDecisionWindowDegradation: (actionMod, perception) => ({ actionMod, perception, effect: { exceeded: false } }),
    applySummitDifficultyRegressionGuard: () => ({ acclPenaltyApplied: 0, acclPenaltyCapped: false, pressureDeltaApplied: 0, pressureDeltaCapped: false }),
    isCampPosition: (position) => position === 'horcones' || position === 'camp_colera',
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady', uncertainty: 'moderate' }),
    renderNarrative: () => 'deterministic',
    deriveTerminalOutcome,
    getTimeWindows: () => ({ summitLateStart: 960 }),
    updateRunState: (state, partial) => Object.assign(state, partial),
    recordTelemetry: () => {},
    assertStateShape: () => true,
  });

  const state = {
    position: 'horcones',
    functional_capacity: 86,
    fatigue: 22,
    exposure: 18,
    weather_severity: 1,
    visibility: 2,
    terrain_load: 0,
    water: 12,
    food: 12,
  };

  const turn = engine.resolveTurn(state, 'descend');
  assert.equal(turn.outcome, 'Summit and Safe Return');
});
