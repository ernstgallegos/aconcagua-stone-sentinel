import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunLogExport } from '../ui/helpers/run-log.js';

test('run_log export appends runSummary to final record and preserves structure', () => {
  const records = [
    { turn: 1, action: 'advance', flags: [], decisionWindowExceeded: false },
    { turn: 2, action: 'wait', flags: ['critical-fatigue'], decisionWindowExceeded: true, lateSignalTriggered: true },
  ];

  const exported = buildRunLogExport(records);
  assert.equal(exported.length, 2);
  assert.equal(exported[0].runSummary, undefined);
  assert.equal(exported[1].runSummary.totalTurns, 2);
  assert.equal(exported[1].runSummary.criticalEventCount, 1);
  assert.equal(exported[1].runSummary.decisionWindowExceededCount, 1);
});

import { buildTurnLogEntry, summarizeRunLog } from '../ui/helpers/run-log.js';

// ── buildTurnLogEntry shape tests ─────────────────────────────────────────────

test('buildTurnLogEntry produces expected shape', () => {
  const G = {
    turn: 3, day: 2, minutesOfDay: 360, signals: { trend: 'steady', uncertainty: 'moderate' },
    decisionTimeSpentMs: 1200, decisionWindowExceeded: false, decisionWindowEffect: null,
    onboardingLayer: false, currentPrimaryAlert: null, activeEnvironmentEvent: null,
  };
  const state = {
    position: 'plaza_de_mulas', fatigue: 20, exposure: 15,
    functional_capacity: 80, weather_severity: 2, visibility: 3,
  };
  const turnResult = {
    result: { pressureDelta: 5, blocked: false, moved: true },
    flags: ['normal'],
    lateSignalEvent: null,
    contextEvent: null,
  };

  const entry = buildTurnLogEntry({
    G,
    state,
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult,
    narrativeText: 'Making progress.',
    formatMinutes: (m) => `${Math.floor(m / 60)}h`,
    capacityLabel: (v) => `${v}%`,
    fatigueLabel: (v) => `fat:${v}`,
    exposureLabel: (v) => `exp:${v}`,
    pressureBandLabel: () => 'moderate',
    pressureDeltaLabel: () => '+5',
    calculateBodyTolerance: () => 10,
  });

  assert.equal(entry.turn, 3);
  assert.equal(entry.day, 2);
  assert.equal(entry.stage, 'APPROACH');
  assert.equal(entry.decision, 'advance');
  assert.equal(entry.position, 'plaza_de_mulas');
  assert.equal(entry.node, 'plaza_de_mulas');
  assert.equal(entry.trend, 'steady');
  assert.equal(entry.blocked, false);
  assert.equal(entry.moved, true);
  assert.ok(Array.isArray(entry.flags), 'flags must be an array');
  assert.ok(typeof entry.body === 'object', 'body must be an object');
  assert.ok(typeof entry.raw === 'object', 'raw must be an object');
  assert.equal(entry.raw.fatigue, 20);
  assert.equal(entry.raw.capacity, 80);
  assert.equal(entry.narrativeText, 'Making progress.');
  assert.equal(entry.decisionWindowExceeded, false);
});

// ── summarizeRunLog counter tests ─────────────────────────────────────────────

test('summarizeRunLog counts totalTurns correctly', () => {
  const records = [
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.totalTurns, 3);
});

test('summarizeRunLog counts criticalEventCount from critical-fatigue flag', () => {
  const records = [
    { flags: ['critical-fatigue'], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
    { flags: ['critical-exposure'], decisionWindowExceeded: false },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.criticalEventCount, 2);
});

test('summarizeRunLog counts fatality-threshold flag in criticalEventCount', () => {
  const records = [
    { flags: ['fatality-threshold'], decisionWindowExceeded: false },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.criticalEventCount, 1);
});

test('summarizeRunLog counts decisionWindowExceededCount', () => {
  const records = [
    { flags: [], decisionWindowExceeded: true },
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: true },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.decisionWindowExceededCount, 2);
});

test('summarizeRunLog counts lateSignalTriggeredCount via lateSignalActivation', () => {
  const records = [
    { flags: [], lateSignalActivation: true, decisionWindowExceeded: false },
    { flags: [], lateSignalActivation: false, decisionWindowExceeded: false },
    { flags: [], lateSignalTriggered: true, decisionWindowExceeded: false },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.lateSignalTriggeredCount, 2);
});

test('summarizeRunLog counts specialActionUsedCount', () => {
  const records = [
    { flags: [], specialActionUsed: true, decisionWindowExceeded: false },
    { flags: [], specialActionUsed: false, decisionWindowExceeded: false },
  ];
  const summary = summarizeRunLog(records);
  assert.equal(summary.specialActionUsedCount, 1);
});

test('summarizeRunLog handles empty record array', () => {
  const summary = summarizeRunLog([]);
  assert.equal(summary.totalTurns, 0);
  assert.equal(summary.criticalEventCount, 0);
  assert.equal(summary.decisionWindowExceededCount, 0);
});

// ── buildRunLogExport: summary only on final record ───────────────────────────

test('buildRunLogExport: returns empty array for empty input', () => {
  assert.deepEqual(buildRunLogExport([]), []);
});

test('buildRunLogExport: single-record run still has runSummary on last record', () => {
  const records = [{ turn: 1, flags: [], decisionWindowExceeded: false }];
  const exported = buildRunLogExport(records);
  assert.equal(exported.length, 1);
  assert.ok(exported[0].runSummary, 'single record must have runSummary');
  assert.equal(exported[0].runSummary.totalTurns, 1);
});

test('buildRunLogExport: intermediate records never carry runSummary', () => {
  const records = Array.from({ length: 5 }, (_, i) => ({
    turn: i + 1, flags: [], decisionWindowExceeded: false,
  }));
  const exported = buildRunLogExport(records);
  // Only last element should have runSummary
  exported.slice(0, -1).forEach((rec, idx) => {
    assert.equal(rec.runSummary, undefined, `record ${idx} must not have runSummary`);
  });
  assert.ok(exported[exported.length - 1].runSummary, 'last record must have runSummary');
});
