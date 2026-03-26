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
