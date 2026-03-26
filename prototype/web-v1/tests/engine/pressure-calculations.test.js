import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEnvironmentalPressureScore, calculateBodyToleranceScore } from '../../engine/pressure-model.js';

const environmentalPressureConfig = {
  altitudePressureByBand: { '0': 4, '1': 8, '2': 18, '3': 30 },
  terrainLoadScale: { '1': 1, '2': 2, '3': 4, '4': 7, '5': 10 },
  weatherSeverityScale: { '0': 0, '1': 2, '2': 6, '3': 12, '4': 18 },
  visibilityRiskScale: { '0': 0, '1': 2, '2': 5, '3': 9, '4': 14 },
  timeOfDayRiskScale: { pre_dawn: 3, morning: 1, afternoon: 4, evening: 8, night: 10 },
  exposurePersistenceScale: { fresh: 0, loaded: 3, overloaded: 7 },
};

test('EP calculation composes all configured components deterministically', () => {
  const res = calculateEnvironmentalPressureScore({
    state: { weather_severity: 3, visibility: 1, persistenceTier: 'loaded' },
    node: { altitudeBand: 2, terrainLoad: 4, timeSensitivity: 1.5, weatherBias: 2, visibilityBias: 1 },
    stageModifier: { weatherSeverityBias: 3 },
    difficultyModifiers: { pressureBias: -2 },
    timeOfDayBucket: 'evening',
    environmentalPressureConfig,
  });

  assert.deepEqual(res.components, {
    altitudePressure: 18,
    terrainLoad: 7,
    weatherSeverity: 12,
    visibilityRisk: 9,
    timeOfDayRisk: 12,
    exposurePersistence: 3,
  });
  assert.equal(res.pressureScore, 53 + 12);
});

test('EP calculation is null-safe and falls back to zeroes for malformed partial payloads', () => {
  const res = calculateEnvironmentalPressureScore({
    state: {},
    node: {},
    stageModifier: null,
    difficultyModifiers: null,
    timeOfDayBucket: 'unknown',
    environmentalPressureConfig: {},
  });
  assert.equal(res.pressureScore, 0);
});

test('BT calculation reflects body stats, acclimatization, resistance, and difficulty bonus', () => {
  const bt = calculateBodyToleranceScore({
    state: { functional_capacity: 82, fatigue: 28, exposure: 16, water: 18, food: 24 },
    acclimatization: 30,
    characterEngine: { fatigueResistance: 1.2, exposureResistance: 0.9 },
    difficultyModifiers: { bodyToleranceBonus: 5 },
  });

  assert.equal(Number(bt.toFixed(2)), 54.58);
});

