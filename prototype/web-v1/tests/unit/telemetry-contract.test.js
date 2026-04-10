/**
 * Telemetry contract tests — ensures the per-turn entry shape produced by
 * buildTurnLogEntry, the summary shape from summarizeRunLog, and the export
 * shape from buildRunLogExport do not drift inadvertently.
 *
 * These tests act as a schema guard: if a field is added, removed, or renamed,
 * the contract test fails and forces an explicit decision about the change.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTurnLogEntry,
  summarizeRunLog,
  buildRunLogExport,
  annotateRunLogOutcome,
} from '../../ui/helpers/run-log.js';

// ──────────────────────────────────────────────────────────
// Canonical per-turn entry field set
// ──────────────────────────────────────────────────────────

const CANONICAL_TURN_ENTRY_KEYS = new Set([
  'turn', 'day', 'time', 'position', 'node', 'stage',
  'decision', 'trend', 'uncertainty',
  'body', 'raw', 'pressure',
  'flags', 'blocked', 'moved',
  'decisionMs', 'decisionWindowExceeded', 'decisionWindowEffect',
  'onboardingLayer', 'primaryAlert', 'lateSignalActivation',
  'warningState', 'contextEvent', 'characterEvent', 'narrativeText',
]);

const CANONICAL_BODY_KEYS = new Set(['capacity', 'fatigue', 'exposure']);
const CANONICAL_RAW_KEYS = new Set(['capacity', 'fatigue', 'exposure', 'weatherSeverity']);
const CANONICAL_PRESSURE_KEYS = new Set(['epScore', 'btScore', 'mountainPressure', 'deltaLabel']);

const CANONICAL_SUMMARY_KEYS = new Set([
  'totalTurns', 'criticalEventCount',
  'decisionWindowExceededCount', 'lateSignalTriggeredCount',
  'specialActionUsedCount',
]);

// ──────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────

function buildFixtureEntry() {
  return buildTurnLogEntry({
    G: {
      turn: 1,
      day: 1,
      minutesOfDay: 480,
      signals: { trend: 'stable', uncertainty: 0.3 },
      lastTurnRecord: { pressure: { EP: 42, BT: 55 } },
      decisionTimeSpentMs: 1200,
      decisionWindowExceeded: false,
      decisionWindowEffect: null,
      onboardingLayer: 'full',
      currentPrimaryAlert: null,
    },
    state: {
      position: 'horcones',
      functional_capacity: 78,
      fatigue: 15,
      exposure: 10,
      weather_severity: 1,
    },
    stage: 'APPROACH',
    resolvedDecision: 'advance',
    turnResult: {
      result: { pressureDelta: 3, blocked: false, moved: true },
      flags: ['weather-window-open'],
      contextEvent: null,
      lateSignalEvent: false,
    },
    narrativeText: 'The terrain allows passage.',
    formatMinutes: (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`,
    capacityLabel: (v) => `${v}`,
    fatigueLabel: (v) => `${v}`,
    exposureLabel: (v) => `${v}`,
    pressureBandLabel: (v) => `band-${v}`,
    pressureDeltaLabel: (v) => `delta-${v}`,
    calculateBodyTolerance: () => 60,
  });
}

// ──────────────────────────────────────────────────────────
// Contract assertions
// ──────────────────────────────────────────────────────────

test('buildTurnLogEntry produces exactly the canonical top-level keys', () => {
  const entry = buildFixtureEntry();
  const actualKeys = new Set(Object.keys(entry));
  for (const key of CANONICAL_TURN_ENTRY_KEYS) {
    assert.ok(actualKeys.has(key), `missing canonical key: ${key}`);
  }
  for (const key of actualKeys) {
    assert.ok(CANONICAL_TURN_ENTRY_KEYS.has(key), `unexpected extra key: ${key}`);
  }
});

test('buildTurnLogEntry.body has canonical sub-keys', () => {
  const entry = buildFixtureEntry();
  const bodyKeys = new Set(Object.keys(entry.body));
  assert.deepStrictEqual(bodyKeys, CANONICAL_BODY_KEYS);
});

test('buildTurnLogEntry.raw has canonical sub-keys', () => {
  const entry = buildFixtureEntry();
  const rawKeys = new Set(Object.keys(entry.raw));
  assert.deepStrictEqual(rawKeys, CANONICAL_RAW_KEYS);
});

test('buildTurnLogEntry.pressure has canonical sub-keys', () => {
  const entry = buildFixtureEntry();
  const pressureKeys = new Set(Object.keys(entry.pressure));
  assert.deepStrictEqual(pressureKeys, CANONICAL_PRESSURE_KEYS);
});

test('pressure.epScore and pressure.btScore are numeric', () => {
  const entry = buildFixtureEntry();
  assert.equal(typeof entry.pressure.epScore, 'number');
  assert.equal(typeof entry.pressure.btScore, 'number');
  assert.equal(entry.pressure.epScore, 42);
  assert.equal(entry.pressure.btScore, 55);
});

test('flags is a fresh array copy', () => {
  const entry = buildFixtureEntry();
  assert.ok(Array.isArray(entry.flags));
  assert.deepStrictEqual(entry.flags, ['weather-window-open']);
});

test('summarizeRunLog produces exactly the canonical summary keys', () => {
  const summary = summarizeRunLog([buildFixtureEntry()]);
  const actualKeys = new Set(Object.keys(summary));
  assert.deepStrictEqual(actualKeys, CANONICAL_SUMMARY_KEYS);
});

test('summarizeRunLog counts are numeric and non-negative', () => {
  const summary = summarizeRunLog([buildFixtureEntry()]);
  for (const key of CANONICAL_SUMMARY_KEYS) {
    assert.equal(typeof summary[key], 'number', `${key} must be a number`);
    assert.ok(summary[key] >= 0, `${key} must be non-negative`);
  }
});

test('buildRunLogExport attaches runSummary only to the last entry', () => {
  const entries = [buildFixtureEntry(), buildFixtureEntry()];
  const exported = buildRunLogExport(entries);
  assert.equal(exported.length, 2);
  assert.equal(exported[0].runSummary, undefined);
  assert.ok(exported[1].runSummary);
  const summaryKeys = new Set(Object.keys(exported[1].runSummary));
  assert.deepStrictEqual(summaryKeys, CANONICAL_SUMMARY_KEYS);
});

test('buildRunLogExport does not mutate original entries', () => {
  const original = buildFixtureEntry();
  const origSnapshot = JSON.stringify(original);
  buildRunLogExport([original]);
  assert.equal(JSON.stringify(original), origSnapshot);
});

test('annotateRunLogOutcome adds outcome immutably across all entries', () => {
  const first = buildFixtureEntry();
  const second = buildFixtureEntry();
  const records = [first, second];
  const annotated = annotateRunLogOutcome(records, 'Strategic Retreat');
  assert.equal(annotated.length, 2);
  assert.equal(annotated[0].outcome, 'Strategic Retreat');
  assert.equal(annotated[1].outcome, 'Strategic Retreat');
  assert.equal(records[0].outcome, undefined);
  assert.equal(records[1].outcome, undefined);
});
