// Unit tests for ui/helpers/run-log.js
//
// Covers: buildTurnLogEntry (entry shape, epScore/btScore, defensive copies),
//         summarizeRunLog (all counters, canonical lateSignalActivation support),
//         buildRunLogExport (empty, single, multi-record, immutability).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTurnLogEntry, summarizeRunLog, buildRunLogExport } from '../../ui/helpers/run-log.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeG(overrides = {}) {
  return {
    turn: 3,
    day: 2,
    minutesOfDay: 420, // 07:00
    signals: { trend: 'steady', uncertainty: 'low' },
    decisionTimeSpentMs: 1800,
    decisionWindowExceeded: false,
    decisionWindowEffect: null,
    onboardingLayer: null,
    currentPrimaryAlert: null,
    activeEnvironmentEvent: null,
    lastTurnRecord: { pressure: { EP: 55.2, BT: 42.1 } },
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    position: 'basecamp',
    functional_capacity: 75,
    fatigue: 25,
    exposure: 15,
    weather_severity: 1,
    ...overrides,
  };
}

function makeTurnResult(overrides = {}) {
  return {
    result: { pressureDelta: 8, blocked: false, moved: true, effectiveDelta: 8 },
    flags: [],
    resolvedAction: 'advance',
    lateSignalEvent: null,
    contextEvent: null,
    ...overrides,
  };
}

function makeFormatters() {
  return {
    formatMinutes: (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:00`,
    capacityLabel: (v) => `cap-${v}`,
    fatigueLabel: (v) => `fat-${v}`,
    exposureLabel: (v) => `exp-${v}`,
    pressureBandLabel: (v) => `band-${v}`,
    pressureDeltaLabel: (v) => `delta-${v}`,
    calculateBodyTolerance: () => 40,
  };
}

// ─── buildTurnLogEntry: required fields present ───────────────────────────────

test('buildTurnLogEntry: entry contains all required top-level fields', () => {
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: 'You advance steadily.',
    ...makeFormatters(),
  });

  const requiredFields = [
    'turn', 'day', 'time', 'position', 'node', 'stage', 'decision',
    'trend', 'uncertainty',
    'body', 'raw', 'pressure',
    'flags', 'blocked', 'moved',
    'decisionMs', 'decisionWindowExceeded', 'decisionWindowEffect',
    'onboardingLayer', 'primaryAlert',
    'lateSignalActivation', 'warningState', 'contextEvent', 'narrativeText',
  ];
  for (const field of requiredFields) {
    assert.ok(Object.prototype.hasOwnProperty.call(entry, field), `missing field: ${field}`);
  }
});

test('buildTurnLogEntry: body subobject has capacity, fatigue, exposure labels', () => {
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState({ functional_capacity: 75, fatigue: 25, exposure: 15 }),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.body.capacity, 'cap-75');
  assert.equal(entry.body.fatigue, 'fat-25');
  assert.equal(entry.body.exposure, 'exp-15');
});

test('buildTurnLogEntry: raw subobject has numeric values from state', () => {
  const state = makeState({ functional_capacity: 72, fatigue: 30, exposure: 20, weather_severity: 2 });
  const entry = buildTurnLogEntry({
    G: makeG(),
    state,
    stage: 'ACCLIMATIZATION',
    resolvedDecision: 'wait',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.raw.capacity, 72);
  assert.equal(entry.raw.fatigue, 30);
  assert.equal(entry.raw.exposure, 20);
  assert.equal(entry.raw.weatherSeverity, 2);
});

test('buildTurnLogEntry: position and node are both set to state.position', () => {
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState({ position: 'camp1' }),
    stage: 'HIGH_CAMP',
    resolvedDecision: 'sleep',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.position, 'camp1');
  assert.equal(entry.node, 'camp1');
});

test('buildTurnLogEntry: time is formatted from G.minutesOfDay', () => {
  const entry = buildTurnLogEntry({
    G: makeG({ minutesOfDay: 480 }), // 08:00
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.time, '08:00');
});

// ─── buildTurnLogEntry: pressure subobject ────────────────────────────────────

test('buildTurnLogEntry: pressure.epScore reads EP from G.lastTurnRecord', () => {
  const entry = buildTurnLogEntry({
    G: makeG({ lastTurnRecord: { pressure: { EP: 61.5, BT: 38.2 } } }),
    state: makeState(),
    stage: 'SUMMIT_DAY',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.pressure.epScore, 61.5);
});

test('buildTurnLogEntry: pressure.btScore reads BT from G.lastTurnRecord', () => {
  const entry = buildTurnLogEntry({
    G: makeG({ lastTurnRecord: { pressure: { EP: 61.5, BT: 38.2 } } }),
    state: makeState(),
    stage: 'SUMMIT_DAY',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.pressure.btScore, 38.2);
});

test('buildTurnLogEntry: pressure.epScore defaults to 0 when G.lastTurnRecord is null', () => {
  const entry = buildTurnLogEntry({
    G: makeG({ lastTurnRecord: null }),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.pressure.epScore, 0);
  assert.equal(entry.pressure.btScore, 0);
});

test('buildTurnLogEntry: pressure.epScore defaults to 0 when pressure sub-object is absent', () => {
  const entry = buildTurnLogEntry({
    G: makeG({ lastTurnRecord: {} }),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(entry.pressure.epScore, 0);
  assert.equal(entry.pressure.btScore, 0);
});

test('buildTurnLogEntry: pressure.mountainPressure and deltaLabel are present', () => {
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult({ result: { pressureDelta: 12, blocked: false, moved: true } }),
    narrativeText: '',
    ...makeFormatters(),
  });

  // calculateBodyTolerance returns 40, pressureDelta = 12, so score = 52
  assert.equal(entry.pressure.mountainPressure, 'band-52');
  // deltaLabel uses pressureDelta = 12
  assert.equal(entry.pressure.deltaLabel, 'delta-12');
});

test('buildTurnLogEntry: deprecated top-level EP/BT aliases are not emitted', () => {
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult(),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.equal(Object.prototype.hasOwnProperty.call(entry, 'EP'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(entry, 'BT'), false);
  assert.equal(entry.pressure.epScore, 55.2);
  assert.equal(entry.pressure.btScore, 42.1);
});

// ─── buildTurnLogEntry: flags defensive copy ──────────────────────────────────

test('buildTurnLogEntry: flags is a new array, not the same reference as turnResult.flags', () => {
  const originalFlags = ['critical-fatigue'];
  const turnResult = makeTurnResult({ flags: originalFlags });
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState(),
    stage: 'HIGH_CAMP',
    resolvedDecision: 'rest',
    turnResult,
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.notEqual(entry.flags, originalFlags);
  assert.deepEqual(entry.flags, ['critical-fatigue']);
  // Mutating original must not affect entry
  originalFlags.push('extra');
  assert.equal(entry.flags.length, 1);
});

// ─── buildTurnLogEntry: contextEvent priority ─────────────────────────────────

test('buildTurnLogEntry: contextEvent prefers turnResult.contextEvent over G.activeEnvironmentEvent', () => {
  const trCtx = { id: 'storm', label: 'Storm Warning' };
  const gCtx = { id: 'wind', label: 'High Wind' };
  const entry = buildTurnLogEntry({
    G: makeG({ activeEnvironmentEvent: gCtx }),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult({ contextEvent: trCtx }),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.deepEqual(entry.contextEvent, trCtx);
});

test('buildTurnLogEntry: contextEvent falls back to G.activeEnvironmentEvent when turnResult.contextEvent is null', () => {
  const gCtx = { id: 'wind', label: 'High Wind' };
  const entry = buildTurnLogEntry({
    G: makeG({ activeEnvironmentEvent: gCtx }),
    state: makeState(),
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult({ contextEvent: null }),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.deepEqual(entry.contextEvent, gCtx);
});

// ─── buildTurnLogEntry: lateSignalActivation ──────────────────────────────────

test('buildTurnLogEntry: lateSignalActivation is set from turnResult.lateSignalEvent', () => {
  const event = { turn: 3, stage: 'HIGH_CAMP', pressureDelta: 22 };
  const entry = buildTurnLogEntry({
    G: makeG(),
    state: makeState(),
    stage: 'HIGH_CAMP',
    resolvedDecision: 'advance',
    turnResult: makeTurnResult({ lateSignalEvent: event }),
    narrativeText: '',
    ...makeFormatters(),
  });

  assert.deepEqual(entry.lateSignalActivation, event);
});

// ─── summarizeRunLog: counter behavior ───────────────────────────────────────

test('summarizeRunLog: empty records returns zero counts', () => {
  const s = summarizeRunLog([]);
  assert.equal(s.totalTurns, 0);
  assert.equal(s.criticalEventCount, 0);
  assert.equal(s.decisionWindowExceededCount, 0);
  assert.equal(s.lateSignalTriggeredCount, 0);
  assert.equal(s.specialActionUsedCount, 0);
});

test('summarizeRunLog: totalTurns equals number of records', () => {
  const records = [
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
  ];
  assert.equal(summarizeRunLog(records).totalTurns, 3);
});

test('summarizeRunLog: criticalEventCount increments for critical-fatigue flag', () => {
  const records = [
    { flags: ['critical-fatigue'], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
  ];
  assert.equal(summarizeRunLog(records).criticalEventCount, 1);
});

test('summarizeRunLog: criticalEventCount increments for critical-exposure flag', () => {
  const records = [
    { flags: ['critical-exposure'], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: false },
  ];
  assert.equal(summarizeRunLog(records).criticalEventCount, 1);
});

test('summarizeRunLog: criticalEventCount increments for fatality-threshold flag', () => {
  const records = [
    { flags: ['fatality-threshold'], decisionWindowExceeded: false },
  ];
  assert.equal(summarizeRunLog(records).criticalEventCount, 1);
});

test('summarizeRunLog: criticalEventCount counts once per turn even with multiple critical flags', () => {
  const records = [
    { flags: ['critical-fatigue', 'critical-exposure', 'fatality-threshold'], decisionWindowExceeded: false },
  ];
  // One turn with multiple critical flags still counts as one critical event
  assert.equal(summarizeRunLog(records).criticalEventCount, 1);
});

test('summarizeRunLog: decisionWindowExceededCount increments when truthy', () => {
  const records = [
    { flags: [], decisionWindowExceeded: true },
    { flags: [], decisionWindowExceeded: false },
    { flags: [], decisionWindowExceeded: true },
  ];
  assert.equal(summarizeRunLog(records).decisionWindowExceededCount, 2);
});

test('summarizeRunLog: lateSignalTriggeredCount uses lateSignalActivation field (current)', () => {
  const records = [
    { flags: [], decisionWindowExceeded: false, lateSignalActivation: { turn: 2 } },
    { flags: [], decisionWindowExceeded: false, lateSignalActivation: null },
  ];
  assert.equal(summarizeRunLog(records).lateSignalTriggeredCount, 1);
});

test('summarizeRunLog: lateSignalTriggeredCount ignores removed legacy field and counts canonical field only', () => {
  const records = [
    { flags: [], decisionWindowExceeded: false, lateSignalTriggered: true },
    { flags: [], decisionWindowExceeded: false, lateSignalActivation: { turn: 3 } },
    { flags: [], decisionWindowExceeded: false },
  ];
  assert.equal(summarizeRunLog(records).lateSignalTriggeredCount, 1);
});

test('summarizeRunLog: specialActionUsedCount increments when truthy', () => {
  const records = [
    { flags: [], decisionWindowExceeded: false, specialActionUsed: true },
    { flags: [], decisionWindowExceeded: false, specialActionUsed: false },
    { flags: [], decisionWindowExceeded: false, specialActionUsed: true },
  ];
  assert.equal(summarizeRunLog(records).specialActionUsedCount, 2);
});

test('summarizeRunLog: tolerates missing flags field (treats as empty)', () => {
  const records = [
    { decisionWindowExceeded: false },
  ];
  assert.doesNotThrow(() => summarizeRunLog(records));
  assert.equal(summarizeRunLog(records).criticalEventCount, 0);
});

// ─── buildRunLogExport: structural contract ───────────────────────────────────

test('buildRunLogExport: returns empty array for empty input', () => {
  assert.deepEqual(buildRunLogExport([]), []);
});

test('buildRunLogExport: single record receives runSummary', () => {
  const records = [{ turn: 1, flags: ['critical-fatigue'], decisionWindowExceeded: false }];
  const exported = buildRunLogExport(records);
  assert.equal(exported.length, 1);
  assert.ok(exported[0].runSummary, 'single record must have runSummary');
  assert.equal(exported[0].runSummary.totalTurns, 1);
  assert.equal(exported[0].runSummary.criticalEventCount, 1);
});

test('buildRunLogExport: only the final record carries runSummary', () => {
  const records = [
    { turn: 1, flags: [], decisionWindowExceeded: false },
    { turn: 2, flags: [], decisionWindowExceeded: false },
    { turn: 3, flags: [], decisionWindowExceeded: false },
  ];
  const exported = buildRunLogExport(records);
  assert.equal(exported[0].runSummary, undefined);
  assert.equal(exported[1].runSummary, undefined);
  assert.ok(exported[2].runSummary, 'last record must have runSummary');
});

test('buildRunLogExport: non-final records are the original entry objects (not copies)', () => {
  const first = { turn: 1, flags: [], decisionWindowExceeded: false };
  const last = { turn: 2, flags: [], decisionWindowExceeded: false };
  const exported = buildRunLogExport([first, last]);
  // First record is returned as-is (same reference)
  assert.equal(exported[0], first);
});

test('buildRunLogExport: original records array is not mutated', () => {
  const records = [
    { turn: 1, flags: [], decisionWindowExceeded: false },
    { turn: 2, flags: [], decisionWindowExceeded: false },
  ];
  const origLen = records.length;
  buildRunLogExport(records);
  assert.equal(records.length, origLen);
  assert.equal(records[1].runSummary, undefined);
});

test('buildRunLogExport: runSummary on final record has all expected counter keys', () => {
  const records = [{ turn: 1, flags: [], decisionWindowExceeded: false }];
  const exported = buildRunLogExport(records);
  const summary = exported[0].runSummary;
  assert.ok(Object.prototype.hasOwnProperty.call(summary, 'totalTurns'));
  assert.ok(Object.prototype.hasOwnProperty.call(summary, 'criticalEventCount'));
  assert.ok(Object.prototype.hasOwnProperty.call(summary, 'decisionWindowExceededCount'));
  assert.ok(Object.prototype.hasOwnProperty.call(summary, 'lateSignalTriggeredCount'));
  assert.ok(Object.prototype.hasOwnProperty.call(summary, 'specialActionUsedCount'));
});

test('buildRunLogExport: summary counts reflect full run, not only the final turn', () => {
  const records = [
    { turn: 1, flags: ['critical-fatigue'], decisionWindowExceeded: true },
    { turn: 2, flags: [], decisionWindowExceeded: false, lateSignalActivation: { turn: 2 } },
    { turn: 3, flags: [], decisionWindowExceeded: false },
  ];
  const exported = buildRunLogExport(records);
  const summary = exported[2].runSummary;
  assert.equal(summary.totalTurns, 3);
  assert.equal(summary.criticalEventCount, 1);
  assert.equal(summary.decisionWindowExceededCount, 1);
  assert.equal(summary.lateSignalTriggeredCount, 1);
});
