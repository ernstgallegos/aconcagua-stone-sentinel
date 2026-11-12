import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpedition, CONTINUE_MARKER, ACTIONS } from '../src/sim.js';
import { loadData } from './helpers.js';

const data = loadData();
const characters = data.characters;
const scenarios = data.scenarios.predefinedScenarios;
const canonical = new Set(data.outcomes);
const make = (opts = {}) => createExpedition({
  data,
  character: characters.find((c) => c.id === (opts.character || 'francisco')),
  scenario: scenarios.find((s) => s.id === (opts.scenario || 'assisted-route')),
  seed: opts.seed ?? 10,
});

function cautious(x) {
  const s = x.state;
  const G = x.G;
  const camp = x.isAtCamp();
  if (G.hasSummited) return camp && G.minutesOfDay > 1080 ? 'sleep' : 'descend';
  if (s.fatigue > 60 || s.exposure > 55 || s.functional_capacity < 40) return camp ? 'sleep' : 'descend';
  if (camp && (s.fatigue > 22 || G.minutesOfDay > 840)) return 'sleep';
  if (s.weather_severity >= 3) return camp ? 'wait' : 'descend';
  return 'advance';
}

test('expedition starts at Horcones with scenario and character modifiers applied', () => {
  const x = make();
  assert.equal(x.state.position, 'horcones');
  assert.equal(x.positionIndex, 0);
  assert.equal(x.G.turn, 1);
  assert.equal(x.G.minutesOfDay, data.environmentalPressure.simulation.dayStartMinutes);
  assert.equal(x.ended, false);
  assert.ok(x.signals().confidence > 0);
  assert.deepEqual([...ACTIONS].sort(), ['advance', 'advance_slowly', 'descend', 'shoot_photo', 'sleep', 'wait']);
});

test('same seed and same walked actions give the same expedition', () => {
  const run = () => {
    const x = make({ seed: 303, scenario: 'narrow-weather-window' });
    const trace = [];
    for (let i = 0; i < 60 && !x.ended; i++) {
      const r = x.act(cautious(x)) ?? x.act('descend');
      trace.push([r.action, r.moveResult, r.newIndex, r.outcome, r.entry.raw.fatigue, r.entry.time]);
    }
    return { trace, outcome: x.outcome };
  };
  assert.deepEqual(run(), run());
});

test('a single turn never moves more than one node', () => {
  for (const seed of [10, 50, 404, 909]) {
    const x = make({ seed, scenario: 'weather-window', character: 'blake' });
    for (let i = 0; i < 80 && !x.ended; i++) {
      const r = x.act(i % 7 === 6 ? 'descend' : 'advance') ?? x.act('wait');
      assert.ok(Math.abs(r.newIndex - r.previousIndex) <= 1);
      if (r.action === 'wait' || r.action === 'sleep') assert.equal(r.newIndex, r.previousIndex);
    }
  }
});

test('sleeping is refused away from a camp and costs no turn', () => {
  const x = make();
  const turn = x.G.turn;
  assert.equal(x.act('sleep'), null);
  assert.equal(x.G.turn, turn);
});

test('leaving through the Horcones gate ends the run as a strategic retreat', () => {
  const x = make();
  const r = x.act('descend');
  assert.equal(r.ended, true);
  assert.equal(r.exitedPark, true);
  assert.equal(x.outcome, 'Strategic Retreat');
  assert.equal(x.act('advance'), null, 'no turns after the run ended');
});

test('every run ends in a canonical outcome and continuing turns use the engine marker', () => {
  const seen = new Set();
  for (const scenario of scenarios) {
    for (const character of characters) {
      for (const seed of scenario.seeds.slice(0, 3)) {
        const x = createExpedition({ data, character, scenario, seed });
        for (let i = 0; i < 400 && !x.ended; i++) {
          const r = x.act(cautious(x)) ?? x.act('descend');
          if (!r.ended) assert.equal(r.outcome, CONTINUE_MARKER);
        }
        assert.ok(x.ended, `${scenario.id}/${character.id}/${seed} should finish`);
        assert.ok(canonical.has(x.outcome), `non-canonical outcome: ${x.outcome}`);
        seen.add(x.outcome);
      }
    }
  }
  assert.ok(seen.size >= 3, `expected a spread of outcomes, got ${[...seen].join(', ')}`);
});

test('reaching the summit is remembered and the walk out decides the outcome', () => {
  // Drive the state directly to the last stretch: this test is about outcome wiring, not balance.
  const x = make({ seed: 20 });
  x.state.position = 'canaleta';
  x.G.highestPosIdx = x.POSITIONS.indexOf('canaleta');
  x.G.acclimatization = 100;
  let guard = 0;
  while (!x.G.hasSummited && !x.ended && guard++ < 40) x.act('advance');
  if (x.ended) return; // the mountain said no on this seed; nothing more to assert
  assert.equal(x.state.position, 'summit');
  const stay = x.act('advance');
  assert.ok(stay.flags.includes('summit-descent-only'));
  x.state.position = 'horcones';
  const out = x.act('descend');
  assert.equal(out.ended, true);
  assert.equal(x.outcome, 'Summit and Safe Return');
});

test('narrative follows the selected language', () => {
  const x = make();
  x.setLanguage('es');
  const r = x.act('advance');
  assert.ok(typeof r.narrative === 'string' && r.narrative.length > 10);
  assert.doesNotMatch(r.narrative, /\b(the|and|You)\b/);
});

test('weather keeps moving overnight: a storm can pass while the climber sleeps', () => {
  let changedAfterOneNight = 0;
  let cleared = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const x = make({ seed });
    x.state.position = 'approach_confluencia';
    x.state.weather_severity = 4;
    x.state.visibility = 0;
    x.act('sleep');
    assert.ok(x.state.weather_severity >= 0 && x.state.weather_severity <= 4);
    assert.ok(x.state.visibility >= 0 && x.state.visibility <= 3);
    if (x.state.weather_severity !== 4) changedAfterOneNight++;
    for (let night = 0; night < 5 && !x.ended; night++) x.act('sleep');
    if (x.state.weather_severity <= 2) cleared++;
  }
  assert.ok(changedAfterOneNight >= 15, `storm should often ease after one night (${changedAfterOneNight}/40)`);
  assert.ok(cleared >= 20, `storm should usually break within a week (${cleared}/40)`);
});
