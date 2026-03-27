import test from 'node:test';
import assert from 'node:assert/strict';
import { applyContextEvent, buildEnvironmentEventPlan } from '../../engine/events-core.js';

test('context events stay bounded and do not assign outcomes or route authority', () => {
  const plan = buildEnvironmentEventPlan(1, 20, [
    {
      id: 'bounded-check',
      label: 'Bounded check',
      trigger: { turns: [3], stages: ['SUMMIT_DAY'] },
      effects: { weatherDelta: 9, visibilityDelta: -7, timePenalty: 200 },
      limits: { maxPerRun: 1 },
      telemetryTag: 'ctx-bounded-check',
    },
  ]);

  const state = { weather_severity: 2, visibility: 2, functional_capacity: 50 };
  const effect = applyContextEvent({ turn: plan[0].turns[0], action: 'advance', stage: 'SUMMIT_DAY', state, environmentEventPlan: plan });

  assert.ok(effect);
  assert.ok(Math.abs(effect.weatherDelta) <= 1);
  assert.ok(Math.abs(effect.visibilityDelta) <= 1);
  assert.ok(effect.timePenalty <= 30);

  assert.equal(effect.outcome, undefined);
  assert.equal(effect.targetPosition, undefined);
  assert.equal(state.functional_capacity, 50, 'context event must not mutate body tolerance authority directly');
});

test('sleep bypasses context events to preserve recovery semantics', () => {
  const state = { weather_severity: 2, visibility: 2 };
  const effect = applyContextEvent({
    turn: 10,
    action: 'sleep',
    stage: 'HIGH_CAMP',
    state,
    environmentEventPlan: [{ id: 'visibility-drop', turns: [10], effects: { weatherDelta: 0, visibilityDelta: -1, timePenalty: 0 } }],
  });

  assert.equal(effect, null);
  assert.equal(state.visibility, 2);
});
