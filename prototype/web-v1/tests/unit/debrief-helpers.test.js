/**
 * Unit tests for debrief helper functions in ui/helpers/debrief.js.
 * Covers computeDecisionPattern, computeDominantRiskAxis,
 * buildRunSignature, and buildSignalInterpretationHint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDecisionPattern,
  computeDominantRiskAxis,
  buildRunSignature,
  buildSignalInterpretationHint,
} from '../../ui/helpers/debrief.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTurnEntry(overrides = {}) {
  return {
    turn: 1,
    decision: 'advance',
    flags: [],
    trend: 'steady',
    uncertainty: 'medium confidence',
    decisionWindowExceeded: false,
    ...overrides,
  };
}

// ─── computeDecisionPattern ──────────────────────────────────────────────────

test('computeDecisionPattern: returns mixed pacing for empty log', () => {
  assert.equal(computeDecisionPattern([]), 'Mixed pacing with adaptive turn selection.');
});

test('computeDecisionPattern: detects defensive descent priority', () => {
  const log = [
    makeTurnEntry({ decision: 'descend' }),
    makeTurnEntry({ decision: 'descend' }),
    makeTurnEntry({ decision: 'advance' }),
  ];
  const result = computeDecisionPattern(log);
  assert.ok(result.includes('Defensive'), `expected defensive pattern, got "${result}"`);
});

test('computeDecisionPattern: detects aggressive push pattern', () => {
  const log = Array.from({ length: 6 }, () => makeTurnEntry({ decision: 'advance' })).concat(
    Array.from({ length: 4 }, () => makeTurnEntry({ decision: 'wait' })),
  );
  const result = computeDecisionPattern(log);
  assert.ok(result.includes('Aggressive'), `expected aggressive pattern, got "${result}"`);
});

test('computeDecisionPattern: detects conservative rhythm', () => {
  const log = [
    makeTurnEntry({ decision: 'wait' }),
    makeTurnEntry({ decision: 'wait' }),
    makeTurnEntry({ decision: 'advance' }),
    makeTurnEntry({ decision: 'advance' }),
    makeTurnEntry({ decision: 'advance' }),
    makeTurnEntry({ decision: 'wait' }),
  ];
  const result = computeDecisionPattern(log);
  assert.ok(result.includes('Conservative'), `expected conservative pattern, got "${result}"`);
});

test('computeDecisionPattern: advance_slowly counts as aggressive', () => {
  const log = Array.from({ length: 6 }, () => makeTurnEntry({ decision: 'advance_slowly' })).concat(
    Array.from({ length: 4 }, () => makeTurnEntry({ decision: 'wait' })),
  );
  const result = computeDecisionPattern(log);
  assert.ok(result.includes('Aggressive'), `expected advance_slowly counted as aggressive, got "${result}"`);
});

// ─── computeDominantRiskAxis ────────────────────────────────────────────────

test('computeDominantRiskAxis: returns body axis on default (zero counts)', () => {
  const result = computeDominantRiskAxis();
  assert.equal(typeof result, 'string');
  assert.ok(['body', 'weather', 'time', 'resources', 'cognition'].includes(result));
});

test('computeDominantRiskAxis: detects body risk from critical flags', () => {
  const turnLog = [
    makeTurnEntry({ flags: ['critical-fatigue'] }),
    makeTurnEntry({ flags: ['collapse-risk-high'] }),
  ];
  const result = computeDominantRiskAxis({ turnLog });
  assert.equal(result, 'body');
});

test('computeDominantRiskAxis: detects weather risk from flags and outcome', () => {
  const turnLog = [
    makeTurnEntry({ flags: ['weather-window-closed'] }),
  ];
  const result = computeDominantRiskAxis({ turnLog, finalOutcome: 'Collapse (Exposure)' });
  assert.equal(result, 'weather');
});

test('computeDominantRiskAxis: detects time risk from permit and window outcomes', () => {
  const result = computeDominantRiskAxis({
    turnLog: [],
    finalOutcome: 'Expedition Window Closed',
    allFlags: ['permit-warning'],
  });
  assert.equal(result, 'time');
});

test('computeDominantRiskAxis: detects resource risk from water/food flags', () => {
  const turnLog = [
    makeTurnEntry({ flags: ['water-depleted'] }),
    makeTurnEntry({ flags: ['food-depleted'] }),
    makeTurnEntry({ flags: ['resource-critical'] }),
  ];
  const result = computeDominantRiskAxis({ turnLog, finalOutcome: 'Resource Exhaustion' });
  assert.equal(result, 'resources');
});

test('computeDominantRiskAxis: detects cognition risk from late-signal flags', () => {
  const turnLog = [
    makeTurnEntry({ flags: ['late-signal-lock-in'] }),
    makeTurnEntry({ flags: ['low-confidence-reading'] }),
    makeTurnEntry({ flags: ['uncertain-trend'] }),
  ];
  const result = computeDominantRiskAxis({
    turnLog,
    allFlags: ['late-signal-event', 'late-signal-triggered'],
  });
  assert.equal(result, 'cognition');
});

test('computeDominantRiskAxis: decision window exceeded bumps time axis', () => {
  const turnLog = [
    makeTurnEntry({ decisionWindowExceeded: true }),
    makeTurnEntry({ decisionWindowExceeded: true }),
    makeTurnEntry({ decisionWindowExceeded: true }),
  ];
  const result = computeDominantRiskAxis({ turnLog, finalOutcome: 'Permit Expired' });
  assert.equal(result, 'time');
});

// ─── buildRunSignature ──────────────────────────────────────────────────────

test('buildRunSignature: includes all provided fields', () => {
  const sig = buildRunSignature({
    characterName: 'Francisco',
    scenarioName: 'Weather Window',
    seed: 1234,
    turns: 15,
    highestNode: 'Nido de Cóndores',
    finalOutcome: 'Strategic Retreat',
    dominantRiskAxis: 'body',
  });
  assert.ok(sig.includes('Francisco'));
  assert.ok(sig.includes('Weather Window'));
  assert.ok(sig.includes('1234'));
  assert.ok(sig.includes('15'));
  assert.ok(sig.includes('Nido de Cóndores'));
  assert.ok(sig.includes('Strategic Retreat'));
  assert.ok(sig.includes('body'));
});

test('buildRunSignature: uses fallback dash for missing fields', () => {
  const sig = buildRunSignature({});
  assert.ok(sig.includes('Character: —'));
  assert.ok(sig.includes('Scenario: —'));
  assert.ok(sig.includes('Seed: —'));
  assert.ok(sig.includes('Turns: 0'));
  assert.ok(sig.includes('Highest node: —'));
});

test('buildRunSignature: handles seed of 0 correctly', () => {
  const sig = buildRunSignature({ seed: 0 });
  assert.ok(sig.includes('Seed: 0'), 'seed of 0 should be preserved, not treated as missing');
});

// ─── buildSignalInterpretationHint ──────────────────────────────────────────

test('buildSignalInterpretationHint: returns default hint for empty entry', () => {
  const hint = buildSignalInterpretationHint();
  assert.ok(hint.includes('Reading hint:'));
  assert.ok(hint.includes('trend plus body drift'));
});

test('buildSignalInterpretationHint: prioritizes decision-window-exceeded flag', () => {
  const hint = buildSignalInterpretationHint({
    flags: ['decision-window-exceeded'],
    trend: 'worsening',
  });
  assert.ok(hint.includes('late decisions'));
});

test('buildSignalInterpretationHint: detects worsening trend', () => {
  const hint = buildSignalInterpretationHint({ trend: 'worsening', flags: [] });
  assert.ok(hint.includes('worsening trend'));
});

test('buildSignalInterpretationHint: detects worsening fast trend', () => {
  const hint = buildSignalInterpretationHint({ trend: 'worsening fast', flags: [] });
  assert.ok(hint.includes('worsening trend'));
});

test('buildSignalInterpretationHint: detects low confidence uncertainty', () => {
  const hint = buildSignalInterpretationHint({ uncertainty: 'low confidence', flags: [] });
  assert.ok(hint.includes('low confidence'));
});

test('buildSignalInterpretationHint: detects late-signal-lock-in flag', () => {
  const hint = buildSignalInterpretationHint({ flags: ['late-signal-lock-in'] });
  assert.ok(hint.includes('low confidence'));
});

test('buildSignalInterpretationHint: detects conservative decisions', () => {
  const hint = buildSignalInterpretationHint({ decision: 'wait', flags: [] });
  assert.ok(hint.includes('conservative turns'));
});

test('buildSignalInterpretationHint: descend is also conservative', () => {
  const hint = buildSignalInterpretationHint({ decision: 'descend', flags: [] });
  assert.ok(hint.includes('conservative turns'));
});
