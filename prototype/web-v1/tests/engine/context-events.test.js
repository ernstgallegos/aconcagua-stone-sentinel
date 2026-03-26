import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTurnEvents, applyClockDelta } from '../../ui/helpers/events.js';

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
