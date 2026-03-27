import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyCharacterEvent } from '../../engine/events-core.js';

function makeState() {
  return {
    fatigue: 40,
    exposure: 35,
    functional_capacity: 55,
    weather_severity: 2,
    water: 4,
    food: 4,
  };
}

function baseRunState(characterId) {
  return {
    turn: 8,
    persistenceTurns: 4,
    character: { id: characterId },
    characterEventState: {},
    characterConfidenceDrift: 0,
  };
}

test('each active character event has a valid activation path and bounded effects', async () => {
  const events = JSON.parse(await readFile('data/character_events.json', 'utf8'));
  const byCharacter = new Map(events.map((event) => [event.characterId, event]));

  const activeCharacters = ['francisco', 'laura', 'irina', 'erik', 'daniela', 'blake'];
  activeCharacters.forEach((id) => assert.ok(byCharacter.has(id), `missing event for ${id}`));

  for (const characterId of activeCharacters) {
    const event = byCharacter.get(characterId);
    const G = baseRunState(characterId);
    const state = makeState();
    const flags = [];

    if (event.trigger?.maxFunctionalCapacity != null) {
      state.functional_capacity = Math.min(state.functional_capacity, event.trigger.maxFunctionalCapacity);
    }
    if (event.trigger?.maxWater != null) {
      state.water = Math.min(state.water, event.trigger.maxWater);
    }
    if (event.trigger?.maxFood != null) {
      state.food = Math.min(state.food, event.trigger.maxFood);
    }
    if (event.trigger?.minWeatherSeverity != null) {
      state.weather_severity = Math.max(state.weather_severity, event.trigger.minWeatherSeverity);
    }
    if (event.trigger?.minPersistenceTurns != null) {
      G.persistenceTurns = Math.max(G.persistenceTurns, event.trigger.minPersistenceTurns);
    }
    if (event.trigger?.minTurn != null) {
      G.turn = Math.max(G.turn, event.trigger.minTurn);
    }

    const stage = event.trigger?.stages?.[0] || 'SUMMIT_DAY';
    const action = event.trigger?.actions?.[0] || 'wait';

    const before = structuredClone(state);
    const applied = applyCharacterEvent({ G, state, action, stage, flags, characterEvents: events });

    assert.ok(applied, `expected activation for ${characterId}`);
    assert.equal(applied.id, event.id);
    assert.ok(flags.includes(event.telemetryTag), `${characterId} missing telemetry tag`);
    assert.equal(typeof applied.eventState[event.id]?.uses, 'number');
    assert.equal(applied.eventState[event.id]?.uses, 1);

    assert.ok(Math.abs(applied.effects.fatigueDelta || 0) <= 3);
    assert.ok(Math.abs(applied.effects.exposureDelta || 0) <= 3);
    assert.ok(Math.abs(applied.effects.confidenceDelta || 0) <= 5);

    assert.equal(state.functional_capacity, before.functional_capacity, 'event should not mutate progression authority');
    assert.equal(state.position, undefined, 'event should not set route position directly');
    assert.equal(applied.outcome, undefined, 'event should never assign terminal outcome');
  }
});

test('character event cooldown and maxPerRun are enforced for Daniela photo event', async () => {
  const events = JSON.parse(await readFile('data/character_events.json', 'utf8'));
  const G = baseRunState('daniela');
  const flags = [];

  const first = applyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags, characterEvents: events });
  assert.ok(first);

  G.characterEventState = first.eventState;
  G.turn += 1;
  const blockedByCooldown = applyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags: [], characterEvents: events });
  assert.equal(blockedByCooldown, null);

  G.turn += 5;
  const second = applyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags: [], characterEvents: events });
  assert.ok(second);

  G.characterEventState = second.eventState;
  G.turn += 5;
  const blockedByCap = applyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags: [], characterEvents: events });
  assert.equal(blockedByCap, null);
});
