import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeepLinkHash } from '../../ui/helpers/routing.js';

test('parseDeepLinkHash returns null for empty hash', () => {
  assert.equal(parseDeepLinkHash(''), null);
  assert.equal(parseDeepLinkHash('#'), null);
});

test('parseDeepLinkHash extracts screen and params', () => {
  const parsed = parseDeepLinkHash('#game&character=francisco&scenario=scenario-1&seed=1234');
  assert.equal(parsed.screenId, 'game');
  assert.equal(parsed.params.character, 'francisco');
  assert.equal(parsed.params.scenario, 'scenario-1');
  assert.equal(parsed.params.seed, '1234');
});

test('parseDeepLinkHash supports flag params and decoding', () => {
  const parsed = parseDeepLinkHash('#part2-character&force=1&note=Summit%20return&preview');
  assert.equal(parsed.screenId, 'part2-character');
  assert.equal(parsed.params.force, '1');
  assert.equal(parsed.params.note, 'Summit return');
  assert.equal(parsed.params.preview, true);
});
