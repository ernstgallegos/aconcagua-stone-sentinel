import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTurnEvents, applyClockDelta, buildEnvironmentEventPlan } from '../../ui/helpers/events.js';

test('visibility-focused event mutates visibility and reports effect', () => {
  const G = {
    turn: 10,
    environmentEventPlan: [{ id: 'visibility-drop', icon: '◔', label: 'Visibility drop', turns: [10], weatherDelta: 0, visibilityDelta: -1, timePenalty: 0 }],
  };
  const state = { weather_severity: 2, visibility: 3 };
  const effect = applyTurnEvents({ G, state, action: 'advance', stage: 'HIGH_CAMP' });

  assert.equal(effect?.id, 'visibility-drop');
  assert.equal(state.visibility, 2);
});

test('event time penalty uses clock delta sync helper for day rollover', () => {
  const synced = applyClockDelta({ minutesOfDay: 1435, day: 2, deltaMinutes: 20 });
  assert.equal(synced.minutesOfDay, 15);
  assert.equal(synced.day, 3);
  assert.equal(synced.permitDay, 3);
});


test('environment event plan can be built from data contract archetypes', () => {
  const archetypes = [
    {
      id: 'custom-window',
      category: 'context',
      trigger: { turns: [4], stages: ['SUMMIT_DAY'] },
      effects: { weatherDelta: 1, visibilityDelta: 0, timePenalty: 10 },
      limits: { maxPerRun: 1 },
      telemetryTag: 'ctx-custom-window',
      visibleToPlayer: true,
      hiddenFromPlayer: false,
    },
  ];

  const plan = buildEnvironmentEventPlan(2, 10, archetypes);
  assert.equal(plan[0].id, 'custom-window');
  assert.deepEqual(plan[0].trigger.stages, ['SUMMIT_DAY']);
  assert.equal(plan[0].effects.timePenalty, 10);
  assert.equal(plan[0].turns[0], 6);
});
