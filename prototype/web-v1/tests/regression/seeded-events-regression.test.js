import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnvironmentEventPlan } from '../../ui/helpers/events.js';

test('seeded environment event plan stays deterministic', () => {
  const a = buildEnvironmentEventPlan(151, 20);
  const b = buildEnvironmentEventPlan(151, 20);
  assert.deepEqual(a, b);
});
