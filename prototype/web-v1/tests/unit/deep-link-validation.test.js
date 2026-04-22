import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSeedParam,
  validateSelectionParams,
  validateDebriefParams,
  isKnownDeepLinkScreen,
} from '../../ui/helpers/deep-link-validation.js';

test('parseSeedParam validates numeric membership when seeds are defined', () => {
  assert.equal(parseSeedParam('42', [1, 42, 99]), 42);
  assert.equal(parseSeedParam('7', [1, 42, 99]), null);
  assert.equal(parseSeedParam('-1', [1, 42, 99]), null);
});

test('validateSelectionParams returns ok false for unknown character or scenario', () => {
  const result = validateSelectionParams({
    params: { character: 'missing', scenario: 's1', seed: '1' },
    resolveCharacter: () => null,
    resolveScenario: () => ({ id: 's1', seeds: [1] }),
  });
  assert.equal(result.ok, false);
});

test('validateSelectionParams resolves valid payload', () => {
  const character = { id: 'francisco' };
  const scenario = { id: 'scenario-1', seeds: [101, 202] };
  const result = validateSelectionParams({
    params: { character: 'francisco', scenario: 'scenario-1', seed: '101' },
    resolveCharacter: () => character,
    resolveScenario: () => scenario,
  });
  assert.equal(result.ok, true);
  assert.equal(result.character, character);
  assert.equal(result.scenario, scenario);
  assert.equal(result.seed, 101);
});

test('validateDebriefParams rejects unknown outcome', () => {
  const result = validateDebriefParams({
    params: { character: 'francisco', scenario: 's1', seed: '1', outcome: 'Not real' },
    resolveCharacter: () => ({ id: 'francisco' }),
    resolveScenario: () => ({ id: 's1', seeds: [1] }),
    validOutcomes: new Set(['Strategic Retreat']),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid outcome');
});

test('isKnownDeepLinkScreen validates known public screen IDs', () => {
  assert.equal(isKnownDeepLinkScreen('game'), true);
  assert.equal(isKnownDeepLinkScreen('mendoza_room', ['mendoza_room']), true);
  assert.equal(isKnownDeepLinkScreen('nonexistent'), false);
});
