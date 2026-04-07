/**
 * screen-utils.test.js
 *
 * Characterization tests for the pure utility functions in
 * prototype/web-v1/ui/helpers/screen-utils.js.
 *
 * These tests protect the following behaviors during future extraction of
 * screens.js into sub-modules:
 *   - Time formatting used by the watch display and turn log
 *   - Trend-arrow rendering used by body-state display
 *   - Confidence tier classification used by perception system
 *   - Time-of-day bucket logic used by decision-window and pressure model
 *   - Persistence tier logic used by signal system and turn engine
 *   - Outcome CSS class mapping used by the debrief screen
 *   - Part 2 navigation gate used by showScreen()
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatMinutes,
  formatTrendArrow,
  confidenceTier,
  getTimeOfDayBucket,
  getPersistenceTier,
  OUTCOME_CLASS_MAP,
  getOutcomeClass,
  resolveNavigationTarget,
  bodyValueClass,
  capacityLabel,
  fatigueLabel,
  exposureLabel,
  pressureDeltaLabel,
  pressureBandLabel,
} from '../../ui/helpers/screen-utils.js';

// ── formatMinutes ────────────────────────────────────────────────────────────

test('formatMinutes: 0 minutes is midnight 00:00', () => {
  assert.equal(formatMinutes(0), '00:00');
});

test('formatMinutes: default day-start (360 minutes = 06:00)', () => {
  assert.equal(formatMinutes(360), '06:00');
});

test('formatMinutes: mid-day value', () => {
  assert.equal(formatMinutes(750), '12:30');
});

test('formatMinutes: 1439 is one minute before midnight', () => {
  assert.equal(formatMinutes(1439), '23:59');
});

test('formatMinutes: exactly 1440 wraps back to 00:00', () => {
  assert.equal(formatMinutes(1440), '00:00');
});

test('formatMinutes: values greater than 1440 wrap correctly', () => {
  // 1440 + 90 = 01:30
  assert.equal(formatMinutes(1530), '01:30');
});

test('formatMinutes: negative values wrap to prior day', () => {
  // -30 → 23:30
  assert.equal(formatMinutes(-30), '23:30');
});

test('formatMinutes: HH and MM are both zero-padded', () => {
  // 65 minutes → 01:05
  assert.equal(formatMinutes(65), '01:05');
});

// ── formatTrendArrow ─────────────────────────────────────────────────────────

test('formatTrendArrow: large positive delta returns up arrow', () => {
  assert.equal(formatTrendArrow(10), '↑');
  assert.equal(formatTrendArrow(2), '↑');
});

test('formatTrendArrow: delta of exactly 1 returns flat arrow', () => {
  assert.equal(formatTrendArrow(1), '↔');
});

test('formatTrendArrow: delta of 0 returns flat arrow', () => {
  assert.equal(formatTrendArrow(0), '↔');
});

test('formatTrendArrow: delta of exactly -1 returns flat arrow', () => {
  assert.equal(formatTrendArrow(-1), '↔');
});

test('formatTrendArrow: large negative delta returns down arrow', () => {
  assert.equal(formatTrendArrow(-2), '↓');
  assert.equal(formatTrendArrow(-15), '↓');
});

// ── confidenceTier ───────────────────────────────────────────────────────────

test('confidenceTier: 70 is the lower bound of high', () => {
  assert.equal(confidenceTier(70), 'high');
  assert.equal(confidenceTier(100), 'high');
  assert.equal(confidenceTier(71), 'high');
});

test('confidenceTier: 69 falls into med tier', () => {
  assert.equal(confidenceTier(69), 'med');
});

test('confidenceTier: 45 is the lower bound of med', () => {
  assert.equal(confidenceTier(45), 'med');
  assert.equal(confidenceTier(46), 'med');
});

test('confidenceTier: 44 falls into low tier', () => {
  assert.equal(confidenceTier(44), 'low');
  assert.equal(confidenceTier(0), 'low');
  assert.equal(confidenceTier(1), 'low');
});

// ── getTimeOfDayBucket ───────────────────────────────────────────────────────

test('getTimeOfDayBucket: 0–359 is night (pre-dawn)', () => {
  assert.equal(getTimeOfDayBucket(0), 'night');
  assert.equal(getTimeOfDayBucket(359), 'night');
});

test('getTimeOfDayBucket: 360–479 is early', () => {
  assert.equal(getTimeOfDayBucket(360), 'early');
  assert.equal(getTimeOfDayBucket(479), 'early');
});

test('getTimeOfDayBucket: 480–899 is optimal', () => {
  assert.equal(getTimeOfDayBucket(480), 'optimal');
  assert.equal(getTimeOfDayBucket(899), 'optimal');
});

test('getTimeOfDayBucket: 900–1079 is late', () => {
  assert.equal(getTimeOfDayBucket(900), 'late');
  assert.equal(getTimeOfDayBucket(1079), 'late');
});

test('getTimeOfDayBucket: 1080–1319 is dusk', () => {
  assert.equal(getTimeOfDayBucket(1080), 'dusk');
  assert.equal(getTimeOfDayBucket(1319), 'dusk');
});

test('getTimeOfDayBucket: 1320–1439 is night (post-dusk)', () => {
  assert.equal(getTimeOfDayBucket(1320), 'night');
  assert.equal(getTimeOfDayBucket(1439), 'night');
});

// ── getPersistenceTier ───────────────────────────────────────────────────────

test('getPersistenceTier: 0–1 turns is fresh', () => {
  assert.equal(getPersistenceTier(0), 'fresh');
  assert.equal(getPersistenceTier(1), 'fresh');
});

test('getPersistenceTier: 2–3 turns is sustained', () => {
  assert.equal(getPersistenceTier(2), 'sustained');
  assert.equal(getPersistenceTier(3), 'sustained');
});

test('getPersistenceTier: 4–5 turns is cumulative', () => {
  assert.equal(getPersistenceTier(4), 'cumulative');
  assert.equal(getPersistenceTier(5), 'cumulative');
});

test('getPersistenceTier: 6–7 turns is severe', () => {
  assert.equal(getPersistenceTier(6), 'severe');
  assert.equal(getPersistenceTier(7), 'severe');
});

test('getPersistenceTier: 8+ turns is critical', () => {
  assert.equal(getPersistenceTier(8), 'critical');
  assert.equal(getPersistenceTier(20), 'critical');
});

// ── OUTCOME_CLASS_MAP & getOutcomeClass ──────────────────────────────────────

test('OUTCOME_CLASS_MAP covers all canonical outcomes', () => {
  const expected = [
    'Summit and Safe Return',
    'High Point Return',
    'Strategic Retreat',
    'Rescue',
    'Collapse (Fatigue)',
    'Collapse (Exposure)',
    'Resource Exhaustion',
    'Expedition Window Closed',
    'Fatality',
  ];
  for (const outcome of expected) {
    assert.ok(outcome in OUTCOME_CLASS_MAP, `Missing outcome: ${outcome}`);
  }
});

test('getOutcomeClass: Summit and Safe Return → outcome-success', () => {
  assert.equal(getOutcomeClass('Summit and Safe Return'), 'outcome-success');
});

test('getOutcomeClass: retreat outcomes → outcome-retreat', () => {
  assert.equal(getOutcomeClass('High Point Return'), 'outcome-retreat');
  assert.equal(getOutcomeClass('Strategic Retreat'), 'outcome-retreat');
});

test('getOutcomeClass: collapse outcomes → outcome-collapse', () => {
  assert.equal(getOutcomeClass('Rescue'), 'outcome-collapse');
  assert.equal(getOutcomeClass('Collapse (Fatigue)'), 'outcome-collapse');
  assert.equal(getOutcomeClass('Collapse (Exposure)'), 'outcome-collapse');
  assert.equal(getOutcomeClass('Resource Exhaustion'), 'outcome-collapse');
  assert.equal(getOutcomeClass('Fatality'), 'outcome-collapse');
});

test('getOutcomeClass: Expedition Window Closed → outcome-stabilized', () => {
  assert.equal(getOutcomeClass('Expedition Window Closed'), 'outcome-stabilized');
});

test('getOutcomeClass: unknown outcome falls back to outcome-retreat', () => {
  assert.equal(getOutcomeClass('Unknown State'), 'outcome-retreat');
  assert.equal(getOutcomeClass(null), 'outcome-retreat');
  assert.equal(getOutcomeClass(undefined), 'outcome-retreat');
  assert.equal(getOutcomeClass(''), 'outcome-retreat');
});

test('OUTCOME_CLASS_MAP is frozen (immutable)', () => {
  assert.throws(() => {
    'use strict';
    OUTCOME_CLASS_MAP['New Outcome'] = 'outcome-test';
  }, TypeError);
});

// ── resolveNavigationTarget (Part 2 access gate) ─────────────────────────────

const SAMPLE_PART2_IDS = new Set(['part2-character', 'mendoza_room', 'team_presentation', 'future_cta']);

test('resolveNavigationTarget: Part 2 screen redirects to debrief without summit access', () => {
  const result = resolveNavigationTarget('mendoza_room', {
    finalOutcome: 'Strategic Retreat',
    hasSummited: false,
    part2ScreenIds: SAMPLE_PART2_IDS,
  });
  assert.equal(result, 'debrief');
});

test('resolveNavigationTarget: Part 2 screen redirects to debrief when finalOutcome is null', () => {
  const result = resolveNavigationTarget('part2-character', {
    finalOutcome: null,
    hasSummited: false,
    part2ScreenIds: SAMPLE_PART2_IDS,
  });
  assert.equal(result, 'debrief');
});

test('resolveNavigationTarget: Part 2 screen allowed when finalOutcome is Summit and Safe Return', () => {
  const result = resolveNavigationTarget('mendoza_room', {
    finalOutcome: 'Summit and Safe Return',
    hasSummited: false,
    part2ScreenIds: SAMPLE_PART2_IDS,
  });
  assert.equal(result, 'mendoza_room');
});

test('resolveNavigationTarget: Part 2 screen allowed when hasSummited is true regardless of finalOutcome', () => {
  const result = resolveNavigationTarget('part2-character', {
    finalOutcome: 'Strategic Retreat',
    hasSummited: true,
    part2ScreenIds: SAMPLE_PART2_IDS,
  });
  assert.equal(result, 'part2-character');
});

test('resolveNavigationTarget: non-Part2 screens always pass through unchanged', () => {
  const opts = { finalOutcome: null, hasSummited: false, part2ScreenIds: SAMPLE_PART2_IDS };
  assert.equal(resolveNavigationTarget('game', opts), 'game');
  assert.equal(resolveNavigationTarget('debrief', opts), 'debrief');
  assert.equal(resolveNavigationTarget('title', opts), 'title');
  assert.equal(resolveNavigationTarget('expedition-setup', opts), 'expedition-setup');
  assert.equal(resolveNavigationTarget('journal', opts), 'journal');
});

test('resolveNavigationTarget: all sample Part 2 IDs are blocked without access', () => {
  const opts = { finalOutcome: 'High Point Return', hasSummited: false, part2ScreenIds: SAMPLE_PART2_IDS };
  for (const id of SAMPLE_PART2_IDS) {
    assert.equal(resolveNavigationTarget(id, opts), 'debrief', `Expected ${id} to redirect`);
  }
});

test('resolveNavigationTarget: Summit and Safe Return unlocks all Part 2 IDs', () => {
  const opts = { finalOutcome: 'Summit and Safe Return', hasSummited: false, part2ScreenIds: SAMPLE_PART2_IDS };
  for (const id of SAMPLE_PART2_IDS) {
    assert.equal(resolveNavigationTarget(id, opts), id, `Expected ${id} to be accessible`);
  }
});

// ── bodyValueClass ───────────────────────────────────────────────────────────

test('bodyValueClass: Critical/Exhausted/High labels map to critical', () => {
  assert.equal(bodyValueClass('Critical'), 'critical');
  assert.equal(bodyValueClass('Exhausted'), 'critical');
  assert.equal(bodyValueClass('High'), 'critical');
});

test('bodyValueClass: Degraded/Heavy/Moderate labels map to degrading', () => {
  assert.equal(bodyValueClass('Degraded'), 'degrading');
  assert.equal(bodyValueClass('Heavy'), 'degrading');
  assert.equal(bodyValueClass('Moderate'), 'degrading');
});

test('bodyValueClass: other labels map to stable', () => {
  assert.equal(bodyValueClass('Excellent'), 'stable');
  assert.equal(bodyValueClass('Good'), 'stable');
  assert.equal(bodyValueClass('Fresh'), 'stable');
  assert.equal(bodyValueClass('Minimal'), 'stable');
});

// ── capacityLabel ────────────────────────────────────────────────────────────

test('capacityLabel: 85–100 is Excellent', () => {
  assert.equal(capacityLabel(100), 'Excellent');
  assert.equal(capacityLabel(85), 'Excellent');
  assert.equal(capacityLabel(86), 'Excellent');
});

test('capacityLabel: 65–84 is Good', () => {
  assert.equal(capacityLabel(84), 'Good');
  assert.equal(capacityLabel(65), 'Good');
  assert.equal(capacityLabel(70), 'Good');
});

test('capacityLabel: 45–64 is Strained', () => {
  assert.equal(capacityLabel(64), 'Strained');
  assert.equal(capacityLabel(45), 'Strained');
});

test('capacityLabel: 25–44 is Degraded', () => {
  assert.equal(capacityLabel(44), 'Degraded');
  assert.equal(capacityLabel(25), 'Degraded');
});

test('capacityLabel: below 25 is Critical', () => {
  assert.equal(capacityLabel(24), 'Critical');
  assert.equal(capacityLabel(0), 'Critical');
});

// ── fatigueLabel ─────────────────────────────────────────────────────────────

test('fatigueLabel: 0–15 is Fresh', () => {
  assert.equal(fatigueLabel(0), 'Fresh');
  assert.equal(fatigueLabel(15), 'Fresh');
});

test('fatigueLabel: 16–35 is Tired', () => {
  assert.equal(fatigueLabel(16), 'Tired');
  assert.equal(fatigueLabel(35), 'Tired');
});

test('fatigueLabel: 36–55 is Heavy', () => {
  assert.equal(fatigueLabel(36), 'Heavy');
  assert.equal(fatigueLabel(55), 'Heavy');
});

test('fatigueLabel: 56–79 is Exhausted', () => {
  assert.equal(fatigueLabel(56), 'Exhausted');
  assert.equal(fatigueLabel(79), 'Exhausted');
});

test('fatigueLabel: 80–100 is Critical', () => {
  assert.equal(fatigueLabel(80), 'Critical');
  assert.equal(fatigueLabel(100), 'Critical');
});

// ── exposureLabel ─────────────────────────────────────────────────────────────

test('exposureLabel: 0–15 is Minimal', () => {
  assert.equal(exposureLabel(0), 'Minimal');
  assert.equal(exposureLabel(15), 'Minimal');
});

test('exposureLabel: 16–35 is Low', () => {
  assert.equal(exposureLabel(16), 'Low');
  assert.equal(exposureLabel(35), 'Low');
});

test('exposureLabel: 36–54 is Moderate', () => {
  assert.equal(exposureLabel(36), 'Moderate');
  assert.equal(exposureLabel(54), 'Moderate');
});

test('exposureLabel: 55–74 is High', () => {
  assert.equal(exposureLabel(55), 'High');
  assert.equal(exposureLabel(74), 'High');
});

test('exposureLabel: 75–100 is Critical', () => {
  assert.equal(exposureLabel(75), 'Critical');
  assert.equal(exposureLabel(100), 'Critical');
});

// ── pressureDeltaLabel ────────────────────────────────────────────────────────

test('pressureDeltaLabel: delta ≤ -15 is Favorable conditions', () => {
  assert.equal(pressureDeltaLabel(-15), 'Favorable conditions');
  assert.equal(pressureDeltaLabel(-30), 'Favorable conditions');
});

test('pressureDeltaLabel: -14 to 10 is Demanding conditions', () => {
  assert.equal(pressureDeltaLabel(-14), 'Demanding conditions');
  assert.equal(pressureDeltaLabel(0), 'Demanding conditions');
  assert.equal(pressureDeltaLabel(10), 'Demanding conditions');
});

test('pressureDeltaLabel: 11 to 30 is Overexertion zone', () => {
  assert.equal(pressureDeltaLabel(11), 'Overexertion zone');
  assert.equal(pressureDeltaLabel(30), 'Overexertion zone');
});

test('pressureDeltaLabel: above 30 is Mountain refusal zone', () => {
  assert.equal(pressureDeltaLabel(31), 'Mountain refusal zone');
  assert.equal(pressureDeltaLabel(100), 'Mountain refusal zone');
});

// ── pressureBandLabel ─────────────────────────────────────────────────────────

test('pressureBandLabel: 0–25 is Low', () => {
  assert.equal(pressureBandLabel(0), 'Low');
  assert.equal(pressureBandLabel(25), 'Low');
});

test('pressureBandLabel: 26–45 is Manageable', () => {
  assert.equal(pressureBandLabel(26), 'Manageable');
  assert.equal(pressureBandLabel(45), 'Manageable');
});

test('pressureBandLabel: 46–65 is Severe', () => {
  assert.equal(pressureBandLabel(46), 'Severe');
  assert.equal(pressureBandLabel(65), 'Severe');
});

test('pressureBandLabel: 66–85 is Very Severe', () => {
  assert.equal(pressureBandLabel(66), 'Very Severe');
  assert.equal(pressureBandLabel(85), 'Very Severe');
});

test('pressureBandLabel: above 85 is Extreme', () => {
  assert.equal(pressureBandLabel(86), 'Extreme');
  assert.equal(pressureBandLabel(100), 'Extreme');
});
