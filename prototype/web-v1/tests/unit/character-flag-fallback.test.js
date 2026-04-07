/**
 * character-flag-fallback.test.js
 *
 * Tests for the nationality badge / flag-emoji rendering logic in screens.js.
 *
 * getNationalityBadge() is not exported from screens.js because screens.js
 * contains both UI rendering and engine logic.  We test the logic inline here
 * using the same algorithm extracted into a pure helper function, matching
 * the implementation at prototype/web-v1/ui/screens.js::getNationalityBadge.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ── Pure reimplementation of the logic under test ─────────────────────────────
// Mirrors screens.js::deriveIsoFromFlag + getNationalityBadge exactly.
// If the production implementation changes, update this mirror too.

function deriveIsoFromFlag(flag) {
  if (typeof flag !== 'string' || !flag.trim()) return '';
  const points = Array.from(flag).map((ch) => ch.codePointAt(0));
  if (points.length !== 2) return '';
  const base = 0x1F1E6;
  const letters = points.map((cp) => {
    const idx = cp - base;
    if (idx < 0 || idx > 25) return '';
    return String.fromCharCode(65 + idx);
  });
  if (letters.some((letter) => !letter)) return '';
  return letters.join('');
}

function getNationalityBadge(character) {
  const isoFromData = String(character?.nationalityCode || '').trim().toUpperCase();
  const isoFromFlag = deriveIsoFromFlag(character?.flag);
  const isoCode = isoFromData || isoFromFlag || 'NA';
  const emoji = typeof character?.flag === 'string' ? character.flag.trim() : '';
  const emojiHtml = emoji ? ` <span class="char-flag" aria-hidden="true">${emoji}</span>` : '';
  return `${emojiHtml} <span class="char-iso">(${isoCode})</span>`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('getNationalityBadge: uses nationalityCode when both flag and code are present', () => {
  const character = { id: 'francisco', nationalityCode: 'AR', flag: '🇦🇷' };
  const badge = getNationalityBadge(character);
  assert.ok(badge.includes('(AR)'), `Expected (AR) in: ${badge}`);
  assert.ok(badge.includes('🇦🇷'), `Expected flag emoji in: ${badge}`);
});

test('getNationalityBadge: derives ISO from flag emoji when nationalityCode is absent', () => {
  const character = { id: 'irina', flag: '🇷🇺' };
  const badge = getNationalityBadge(character);
  // deriveIsoFromFlag('🇷🇺') should yield 'RU'
  assert.ok(badge.includes('(RU)'), `Expected (RU) derived from flag; got: ${badge}`);
});

test('getNationalityBadge: falls back to NA when neither nationalityCode nor valid flag is present', () => {
  const character = { id: 'unknown' };
  const badge = getNationalityBadge(character);
  assert.ok(badge.includes('(NA)'), `Expected (NA) fallback; got: ${badge}`);
});

test('getNationalityBadge: falls back to NA when flag is empty string', () => {
  const character = { id: 'unknown', flag: '' };
  const badge = getNationalityBadge(character);
  assert.ok(badge.includes('(NA)'), `Expected (NA) for empty flag; got: ${badge}`);
});

test('getNationalityBadge: falls back to NA when flag is not a valid regional indicator pair', () => {
  // A single regional-indicator codepoint is not a valid 2-char flag.
  const character = { id: 'x', flag: '🇦' };
  const badge = getNationalityBadge(character);
  assert.ok(badge.includes('(NA)'), `Expected (NA) for single-indicator flag; got: ${badge}`);
});

test('getNationalityBadge: does not include flag span when flag field is missing', () => {
  const character = { id: 'noflag', nationalityCode: 'DE' };
  const badge = getNationalityBadge(character);
  assert.ok(!badge.includes('char-flag'), `Expected no flag span; got: ${badge}`);
  assert.ok(badge.includes('(DE)'), `Expected ISO code; got: ${badge}`);
});

test('getNationalityBadge: handles null/undefined character gracefully (returns NA)', () => {
  assert.ok(getNationalityBadge(null).includes('(NA)'));
  assert.ok(getNationalityBadge(undefined).includes('(NA)'));
  assert.ok(getNationalityBadge({}).includes('(NA)'));
});

test('deriveIsoFromFlag: returns empty string for non-string input', () => {
  assert.equal(deriveIsoFromFlag(null), '');
  assert.equal(deriveIsoFromFlag(42), '');
  assert.equal(deriveIsoFromFlag(undefined), '');
});

test('deriveIsoFromFlag: returns empty string for whitespace-only string', () => {
  assert.equal(deriveIsoFromFlag('   '), '');
});

test('deriveIsoFromFlag: returns empty string for three-codepoint sequence', () => {
  // 🇦🇷🇺 (3 regional indicators) should fail the length === 2 check.
  const threeIndicators = '\u{1F1E6}\u{1F1F7}\u{1F1FA}';
  assert.equal(deriveIsoFromFlag(threeIndicators), '');
});

test('getNationalityBadge: nationalityCode takes precedence over flag-derived ISO', () => {
  // Manually mismatched: flag is 🇷🇺 but code says 'CH'
  const character = { id: 'mismatch', nationalityCode: 'CH', flag: '🇷🇺' };
  const badge = getNationalityBadge(character);
  // nationalityCode wins
  assert.ok(badge.includes('(CH)'), `Expected nationalityCode to win; got: ${badge}`);
});
