/**
 * screens-navigation-seams.test.js
 *
 * Characterization tests for the routing/navigation seams that screens.js
 * depends on.  These tests protect behavior at the boundary between the
 * URL/hash layer (routing.js) and the screen activation logic so that a
 * future extraction of those seams remains verifiably correct.
 *
 * Behaviors protected here:
 *   - syncScreenHash encodes screen IDs into URL hash (showScreen calls this
 *     after every successful activation unless _suppressHashSync is set)
 *   - parseDeepLinkHash correctly surfaces all param types used by screens.js
 *     deep-link bootstrap (game, debrief, part2, force, outcome, seed, etc.)
 *   - The relationship between deep-link params and the screen IDs that
 *     screens.js handles is well-specified
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDeepLinkHash, syncScreenHash } from '../../ui/helpers/routing.js';

// ── syncScreenHash ────────────────────────────────────────────────────────────

test('syncScreenHash: title screen encodes to simple hash', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('title');
  assert.equal(recorded, '#title');
});

test('syncScreenHash: expedition-setup screen preserves hyphen', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('expedition-setup');
  assert.equal(recorded, '#expedition-setup');
});

test('syncScreenHash: part2-character screen preserves hyphen', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('part2-character');
  assert.equal(recorded, '#part2-character');
});

test('syncScreenHash: game screen encodes correctly', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('game');
  assert.equal(recorded, '#game');
});

test('syncScreenHash: debrief screen encodes correctly', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('debrief');
  assert.equal(recorded, '#debrief');
});

test('syncScreenHash: all Part 2 narrative IDs encode to their own hash', () => {
  const narrativeIds = [
    'mendoza_room',
    'team_presentation',
    'after_circle',
    'guides',
    'briefing_night',
    'departure_road',
    'future_cta',
  ];
  for (const id of narrativeIds) {
    let recorded;
    global.history = { replaceState(_, __, url) { recorded = url; } };
    syncScreenHash(id);
    // Each ID must be representable as a URL hash (no encoding issues)
    assert.ok(recorded.startsWith('#'), `Hash must start with # for ${id}`);
    assert.match(recorded, new RegExp(id), `Hash must contain ${id}`);
  }
});

test('syncScreenHash: empty string is a no-op (does not call replaceState)', () => {
  let called = false;
  global.history = { replaceState() { called = true; } };
  syncScreenHash('');
  assert.equal(called, false);
});

test('syncScreenHash: null is a no-op (does not call replaceState)', () => {
  let called = false;
  global.history = { replaceState() { called = true; } };
  syncScreenHash(null);
  assert.equal(called, false);
});

test('syncScreenHash: tolerates history.replaceState throwing (e.g. cross-origin iframe)', () => {
  global.history = {
    replaceState() { throw new Error('SecurityError: cross-origin'); },
  };
  // Must not propagate the error
  assert.doesNotThrow(() => syncScreenHash('title'));
});

// ── parseDeepLinkHash — screens.js-specific deep-link contracts ───────────────

test('parseDeepLinkHash: #game deep link with full params', () => {
  const result = parseDeepLinkHash('#game&character=francisco&scenario=scenario-1&seed=42');
  assert.equal(result.screenId, 'game');
  assert.equal(result.params.character, 'francisco');
  assert.equal(result.params.scenario, 'scenario-1');
  assert.equal(result.params.seed, '42');
});

test('parseDeepLinkHash: #debrief with outcome param used by bootstrapMockDebrief', () => {
  const result = parseDeepLinkHash('#debrief&character=laura&scenario=scenario-2&seed=999&outcome=Summit%20and%20Safe%20Return');
  assert.equal(result.screenId, 'debrief');
  assert.equal(result.params.character, 'laura');
  assert.equal(result.params.outcome, 'Summit and Safe Return');
  assert.equal(result.params.seed, '999');
});

test('parseDeepLinkHash: #part2-character with force=1 bypass flag', () => {
  const result = parseDeepLinkHash('#part2-character&force=1');
  assert.equal(result.screenId, 'part2-character');
  assert.equal(result.params.force, '1');
});

test('parseDeepLinkHash: Part 2 narrative screen ID parses cleanly', () => {
  const result = parseDeepLinkHash('#mendoza_room');
  assert.equal(result.screenId, 'mendoza_room');
  assert.deepEqual(result.params, {});
});

test('parseDeepLinkHash: future_cta (last Part 2 screen) parses cleanly', () => {
  const result = parseDeepLinkHash('#future_cta');
  assert.equal(result.screenId, 'future_cta');
});

test('parseDeepLinkHash: summit-success screen is a valid deep-link target', () => {
  const result = parseDeepLinkHash('#summit-success');
  assert.equal(result.screenId, 'summit-success');
  assert.deepEqual(result.params, {});
});

test('parseDeepLinkHash: journal screen with return origin param', () => {
  const result = parseDeepLinkHash('#journal&origin=debrief');
  assert.equal(result.screenId, 'journal');
  assert.equal(result.params.origin, 'debrief');
});

test('parseDeepLinkHash: onboarding screen deep link', () => {
  const result = parseDeepLinkHash('#onboarding&character=erik&scenario=scenario-3&seed=77');
  assert.equal(result.screenId, 'onboarding');
  assert.equal(result.params.character, 'erik');
  assert.equal(result.params.scenario, 'scenario-3');
});

test('parseDeepLinkHash: preview flag-only param (no value) is parsed as boolean true', () => {
  const result = parseDeepLinkHash('#debrief&character=irina&seed=1&preview');
  assert.equal(result.params.preview, true);
});

test('parseDeepLinkHash: multiple flag params in one hash', () => {
  const result = parseDeepLinkHash('#debrief&force=1&preview&character=blake');
  assert.equal(result.params.force, '1');
  assert.equal(result.params.preview, true);
  assert.equal(result.params.character, 'blake');
});

test('parseDeepLinkHash: empty hash returns null (no navigation)', () => {
  assert.equal(parseDeepLinkHash(''), null);
  assert.equal(parseDeepLinkHash('#'), null);
});

test('parseDeepLinkHash: character IDs used by screens.js are all parseable', () => {
  const charIds = ['francisco', 'laura', 'erik', 'daniela', 'blake', 'irina'];
  for (const charId of charIds) {
    const result = parseDeepLinkHash(`#game&character=${charId}&seed=1`);
    assert.equal(result.params.character, charId, `character ${charId} must parse`);
  }
});

// ── Hash round-trip: syncScreenHash output is parseable by parseDeepLinkHash ──

test('syncScreenHash output is parseable by parseDeepLinkHash for game screen', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('game');
  const parsed = parseDeepLinkHash(recorded);
  assert.equal(parsed.screenId, 'game');
});

test('syncScreenHash output is parseable by parseDeepLinkHash for debrief screen', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('debrief');
  const parsed = parseDeepLinkHash(recorded);
  assert.equal(parsed.screenId, 'debrief');
});

test('syncScreenHash output is parseable by parseDeepLinkHash for expedition-setup screen', () => {
  let recorded;
  global.history = { replaceState(_, __, url) { recorded = url; } };
  syncScreenHash('expedition-setup');
  const parsed = parseDeepLinkHash(recorded);
  assert.equal(parsed.screenId, 'expedition-setup');
});
