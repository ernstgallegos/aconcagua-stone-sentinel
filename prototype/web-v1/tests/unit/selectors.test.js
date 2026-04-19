/**
 * Unit tests for data selector helpers in ui/helpers/selectors.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getConfiguredScenarios, getRandomScenarioConfig } from '../../ui/helpers/selectors.js';

// ─── getConfiguredScenarios ──────────────────────────────────────────────────

test('getConfiguredScenarios: returns predefined scenarios from valid config', () => {
  const config = { scenariosWebV1: { predefinedScenarios: [{ id: 'sc1' }, { id: 'sc2' }] } };
  const result = getConfiguredScenarios(config);
  assert.deepEqual(result, [{ id: 'sc1' }, { id: 'sc2' }]);
});

test('getConfiguredScenarios: returns empty array when config is null', () => {
  assert.deepEqual(getConfiguredScenarios(null), []);
});

test('getConfiguredScenarios: returns empty array when config is undefined', () => {
  assert.deepEqual(getConfiguredScenarios(undefined), []);
});

test('getConfiguredScenarios: returns empty array when scenariosWebV1 is missing', () => {
  assert.deepEqual(getConfiguredScenarios({}), []);
});

test('getConfiguredScenarios: returns empty array when predefinedScenarios is missing', () => {
  assert.deepEqual(getConfiguredScenarios({ scenariosWebV1: {} }), []);
});

// ─── getRandomScenarioConfig ────────────────────────────────────────────────

test('getRandomScenarioConfig: returns random scenario config from valid config', () => {
  const config = { scenariosWebV1: { randomScenario: { seed: 42 } } };
  const result = getRandomScenarioConfig(config);
  assert.deepEqual(result, { seed: 42 });
});

test('getRandomScenarioConfig: returns empty object when config is null', () => {
  assert.deepEqual(getRandomScenarioConfig(null), {});
});

test('getRandomScenarioConfig: returns empty object when config is undefined', () => {
  assert.deepEqual(getRandomScenarioConfig(undefined), {});
});

test('getRandomScenarioConfig: returns empty object when scenariosWebV1 is missing', () => {
  assert.deepEqual(getRandomScenarioConfig({}), {});
});

test('getRandomScenarioConfig: returns empty object when randomScenario is missing', () => {
  assert.deepEqual(getRandomScenarioConfig({ scenariosWebV1: {} }), {});
});
