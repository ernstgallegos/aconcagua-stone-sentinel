import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOLVE_TURN_PIPELINE } from '../../engine/turn-resolution.js';

test('resolveTurn pipeline remains canonical sole authority ordering', () => {
  assert.deepEqual(RESOLVE_TURN_PIPELINE, [
    'normalize-action',
    'consume-time-and-resources',
    'apply-weather-and-persistence',
    'compute-pressure-and-perception',
    'apply-decision-window-effects',
    'evaluate-outcome',
    'update-state',
    'classify-terminal-outcome',
    'emit-signals-and-narrative',
  ]);
});
