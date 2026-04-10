/**
 * Unit tests for debrief analysis functions extracted to ui/screens/debrief.js.
 * Covers findTurningPoint, findPrimaryCause, and buildReflectionPrompts.
 * All functions are pure (no DOM, no global reads).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findTurningPoint,
  findPrimaryCause,
  buildReflectionPrompts,
} from '../../ui/screens/debrief.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const POS_LABELS = {
  horcones: 'Horcones',
  confluencia: 'Confluencia',
  base_camp: 'Base Camp',
  nido: 'Nido de Cóndores',
  summit: 'Summit',
};

function makeTurnEntry(overrides = {}) {
  return {
    turn: 1,
    decision: 'advance',
    position: 'confluencia',
    flags: [],
    trend: 'steady',
    raw: { capacity: 80, fatigue: 20, exposure: 15 },
    ...overrides,
  };
}

// ─── findTurningPoint ─────────────────────────────────────────────────────────

test('findTurningPoint: identifies first-irreversible-point flag in English', () => {
  const turnLog = [
    makeTurnEntry({ turn: 3, position: 'nido', flags: ['first-irreversible-point'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('Turn 3'), `expected "Turn 3" in "${result}"`);
  assert.ok(result.includes('Nido de Cóndores'), `expected position label in "${result}"`);
  assert.ok(result.includes('First Irreversible Point'), `expected EN copy in "${result}"`);
});

test('findTurningPoint: identifies first-irreversible-point flag in Spanish', () => {
  const turnLog = [
    makeTurnEntry({ turn: 3, position: 'nido', flags: ['first-irreversible-point'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'es' });
  assert.ok(result.includes('Turno 3'), `expected "Turno 3" in "${result}"`);
  assert.ok(result.includes('Primer Punto Irreversible'), `expected ES copy in "${result}"`);
});

test('findTurningPoint: falls through to first critical flag when no irreversible-point', () => {
  const turnLog = [
    makeTurnEntry({ turn: 5, flags: ['critical-fatigue'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('Turn 5'), `expected "Turn 5" in "${result}"`);
  assert.ok(result.includes('critical-fatigue'), `expected flag name in "${result}"`);
});

test('findTurningPoint: falls through to weather-window-closed flag', () => {
  const turnLog = [
    makeTurnEntry({ turn: 8, flags: ['weather-window-closed'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('Turn 8'), `expected "Turn 8" in "${result}"`);
  assert.ok(result.includes('weather window closed'), `expected weather copy in "${result}"`);
});

test('findTurningPoint: falls through to water-depleted flag', () => {
  const turnLog = [
    makeTurnEntry({ turn: 10, flags: ['water-depleted'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('Turn 10'), `expected "Turn 10" in "${result}"`);
  assert.ok(result.includes('water depleted'), `expected water copy in "${result}"`);
});

test('findTurningPoint: returns cumulative fallback when no significant flag found', () => {
  const turnLog = [
    makeTurnEntry({ flags: [] }),
    makeTurnEntry({ turn: 2, flags: [] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('cumulative micro-decisions'), `expected fallback copy in "${result}"`);
});

test('findTurningPoint: returns fallback for empty turn log', () => {
  const result = findTurningPoint({ turnLog: [], POS_LABELS, lang: 'en' });
  assert.ok(result.includes('cumulative micro-decisions'), `expected fallback copy in "${result}"`);
});

test('findTurningPoint: prioritizes irreversible-point over later critical flag', () => {
  const turnLog = [
    makeTurnEntry({ turn: 2, flags: ['first-irreversible-point'] }),
    makeTurnEntry({ turn: 4, flags: ['critical-exposure'] }),
  ];
  const result = findTurningPoint({ turnLog, POS_LABELS, lang: 'en' });
  assert.ok(result.includes('First Irreversible Point'), 'should prioritize irreversible-point');
  assert.ok(!result.includes('critical-exposure'), 'should not mention critical-exposure');
});

// ─── findPrimaryCause ─────────────────────────────────────────────────────────

test('findPrimaryCause: returns specific EN copy for all canonical outcomes', () => {
  const outcomes = [
    'Rescue', 'Collapse (Fatigue)', 'Collapse (Exposure)', 'Resource Exhaustion',
    'Permit Expired', 'Expedition Window Closed', 'Strategic Retreat',
    'High Point Return', 'Summit and Safe Return', 'Fatality',
  ];
  const fallbackFragment = 'Cumulative micro-decisions';
  for (const finalOutcome of outcomes) {
    const result = findPrimaryCause({ finalOutcome, lang: 'en' });
    assert.equal(typeof result, 'string', `outcome "${finalOutcome}" should return a string`);
    assert.ok(result.length > 20, `outcome "${finalOutcome}" result is too short: "${result}"`);
    assert.ok(!result.includes(fallbackFragment), `outcome "${finalOutcome}" should return specific copy, not the fallback`);
  }
});

test('findPrimaryCause: returns ES copy when lang is es', () => {
  const result = findPrimaryCause({ finalOutcome: 'Rescue', lang: 'es' });
  assert.ok(result.includes('Los umbrales'), `expected ES copy in "${result}"`);
});

test('findPrimaryCause: returns generic fallback for unknown outcome', () => {
  const result = findPrimaryCause({ finalOutcome: 'Unknown Outcome', lang: 'en' });
  assert.ok(result.includes('Cumulative micro-decisions'), `expected fallback copy in "${result}"`);
});

test('findPrimaryCause: returns generic fallback for null outcome', () => {
  const result = findPrimaryCause({ finalOutcome: null, lang: 'en' });
  assert.ok(result.includes('Cumulative micro-decisions'), `expected fallback copy in "${result}"`);
});

// ─── buildReflectionPrompts ───────────────────────────────────────────────────

test('buildReflectionPrompts: returns array with at least 3 items (3 static)', () => {
  const result = buildReflectionPrompts({ turnLog: [], characterId: 'francisco', lang: 'en' });
  assert.ok(Array.isArray(result), 'should return an array');
  assert.ok(result.length >= 3, `expected at least 3 items, got ${result.length}`);
});

test('buildReflectionPrompts: first 3 items are static prompts', () => {
  const result = buildReflectionPrompts({ turnLog: [], characterId: 'francisco', lang: 'en' });
  const statics = result.filter(p => !p.dynamic);
  assert.equal(statics.length, 3, 'should have exactly 3 static prompts');
});

test('buildReflectionPrompts: dynamic prompt added when 3+ worsening advances', () => {
  const turnLog = [
    makeTurnEntry({ decision: 'advance', trend: 'worsening' }),
    makeTurnEntry({ turn: 2, decision: 'advance', trend: 'worsening' }),
    makeTurnEntry({ turn: 3, decision: 'advance_slowly', trend: 'worsening' }),
  ];
  const result = buildReflectionPrompts({ turnLog, characterId: 'francisco', lang: 'en' });
  const dynamic = result.filter(p => p.dynamic);
  const hasWorsening = dynamic.some(p => p.text.includes('worsening'));
  assert.ok(hasWorsening, 'should include worsening-advance prompt');
});

test('buildReflectionPrompts: dynamic prompt added when 4+ wait decisions', () => {
  const turnLog = Array.from({ length: 4 }, (_, i) =>
    makeTurnEntry({ turn: i + 1, decision: 'wait' }),
  );
  const result = buildReflectionPrompts({ turnLog, characterId: 'erik', lang: 'en' });
  const dynamic = result.filter(p => p.dynamic);
  const hasWait = dynamic.some(p => p.text.includes('waited'));
  assert.ok(hasWait, 'should include wait-count prompt');
});

test('buildReflectionPrompts: character-specific prompt included for known characters', () => {
  const knownIds = ['francisco', 'laura', 'erik', 'daniela', 'blake', 'irina'];
  for (const characterId of knownIds) {
    const result = buildReflectionPrompts({ turnLog: [], characterId, lang: 'en' });
    const dynamic = result.filter(p => p.dynamic);
    assert.ok(dynamic.length >= 1, `character "${characterId}" should produce at least 1 dynamic prompt`);
  }
});

test('buildReflectionPrompts: generic character prompt for unknown character id', () => {
  const result = buildReflectionPrompts({ turnLog: [], characterId: 'unknown-character', lang: 'en' });
  const dynamic = result.filter(p => p.dynamic);
  const hasGeneric = dynamic.some(p => p.text.includes('mountain'));
  assert.ok(hasGeneric, 'should include generic mountain prompt for unknown character');
});

test('buildReflectionPrompts: returns ES static text when lang is es', () => {
  const result = buildReflectionPrompts({ turnLog: [], characterId: 'francisco', lang: 'es' });
  const statics = result.filter(p => !p.dynamic);
  assert.ok(statics[0].text.includes('señal'), `expected Spanish text in "${statics[0].text}"`);
});

test('buildReflectionPrompts: dynamic pool capped at 2 items', () => {
  // Build a log that triggers ALL dynamic conditions simultaneously
  const turnLog = [
    ...Array.from({ length: 3 }, (_, i) => makeTurnEntry({ turn: i + 1, decision: 'advance', trend: 'worsening' })),
    ...Array.from({ length: 4 }, (_, i) => makeTurnEntry({ turn: i + 4, decision: 'wait' })),
    makeTurnEntry({ turn: 8, decision: 'descend' }),           // early descent (< 14)
    makeTurnEntry({ turn: 2, flags: ['water-depleted'] }),      // early resource
    makeTurnEntry({ turn: 9, flags: ['critical-fatigue'] }),    // incap flag
  ];
  const result = buildReflectionPrompts({ turnLog, characterId: 'laura', lang: 'en' });
  const dynamic = result.filter(p => p.dynamic);
  assert.ok(dynamic.length <= 2, `expected max 2 dynamic prompts, got ${dynamic.length}`);
});

// ─── classifyDifficultyResponsibility ────────────────────────────────────────

import { classifyDifficultyResponsibility } from '../../ui/screens/debrief.js';

test('classifyDifficultyResponsibility: returns mixed for empty turn log', () => {
  const result = classifyDifficultyResponsibility({ turnLog: [] });
  assert.equal(result.label, 'Mixed pressure and choice');
  assert.ok(result.detail.includes('No single dominant source'));
});

test('classifyDifficultyResponsibility: systemic pressure dominates when >= 45% flags', () => {
  const turnLog = Array.from({ length: 10 }, (_, i) => makeTurnEntry({
    turn: i + 1,
    flags: i < 5 ? ['weather-window-closed'] : [],
  }));
  const result = classifyDifficultyResponsibility({ turnLog });
  assert.equal(result.label, 'Systemic pressure dominated');
  assert.ok(result.detail.includes('50%'));
});

test('classifyDifficultyResponsibility: decision pattern when >= 30% high-risk choices', () => {
  const turnLog = Array.from({ length: 10 }, (_, i) => makeTurnEntry({
    turn: i + 1,
    decision: i < 4 ? 'advance' : 'wait',
    trend: i < 4 ? 'worsening' : 'steady',
    flags: [],
  }));
  const result = classifyDifficultyResponsibility({ turnLog });
  assert.equal(result.label, 'Decision pattern shaped outcome');
  assert.ok(result.detail.includes('40%'));
});

test('classifyDifficultyResponsibility: systemic wins over decision when both high but systemic > decision', () => {
  const turnLog = Array.from({ length: 10 }, (_, i) => makeTurnEntry({
    turn: i + 1,
    decision: i < 3 ? 'advance' : 'wait',
    trend: i < 3 ? 'worsening' : 'steady',
    flags: i < 6 ? ['forced-bivouac'] : [],
  }));
  const result = classifyDifficultyResponsibility({ turnLog });
  assert.equal(result.label, 'Systemic pressure dominated');
});

test('classifyDifficultyResponsibility: mixed when neither threshold reached', () => {
  const turnLog = Array.from({ length: 10 }, (_, i) => makeTurnEntry({
    turn: i + 1,
    decision: 'wait',
    flags: i < 2 ? ['acclimatization-deficit'] : [],
  }));
  const result = classifyDifficultyResponsibility({ turnLog });
  assert.equal(result.label, 'Mixed pressure and choice');
});
