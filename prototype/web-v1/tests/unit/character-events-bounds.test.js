import test from 'node:test';
import assert from 'node:assert/strict';
import { maybeApplyCharacterEvent } from '../../ui/helpers/events.js';

function makeState() {
  return { fatigue: 10, exposure: 10, functional_capacity: 50, weather_severity: 2, water: 3, food: 3 };
}

test('character events respect cooldown and maxPerRun limits', () => {
  const flags = [];
  const G = {
    turn: 8,
    persistenceTurns: 4,
    character: { id: 'daniela' },
    characterEventState: {},
    characterConfidenceDrift: 0,
  };
  const characterEvents = [{
    id: 'daniela-photo-read',
    characterId: 'daniela',
    category: 'observation',
    narrative: 'x',
    trigger: { actions: ['shoot_photo'], maxFunctionalCapacity: 60 },
    effects: { confidenceDelta: 4, exposureDelta: 1 },
    limits: { cooldownTurns: 4, maxPerRun: 1 },
    telemetryTag: 'char-daniela-photo-read',
  }];

  const first = maybeApplyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags, characterEvents });
  assert.ok(first);
  assert.equal(flags.includes('char-daniela-photo-read'), true);

  G.characterEventState = first.eventState;
  G.turn = 9;
  const second = maybeApplyCharacterEvent({ G, state: makeState(), action: 'shoot_photo', stage: 'SUMMIT_DAY', flags: [], characterEvents });
  assert.equal(second, null, 'cooldown and per-run cap should block immediate reactivation');
});
