import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'data/nodes.json',
  'data/environmental_pressure_config.json',
  'data/action_modifiers.json',
  'data/stage_modifiers.json',
  'data/characters.json',
  'data/character_events.json',
  'data/context_events.json',
  'data/outcomes.json',
  'data/scenarios.web-v1.json',
];

test('runtime data files parse as JSON', async () => {
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    assert.doesNotThrow(() => JSON.parse(raw), `${file} should parse`);
  }
});

test('character event contract includes all six active characters', async () => {
  const events = JSON.parse(await readFile('data/character_events.json', 'utf8'));
  const charIds = new Set(events.map((entry) => entry.characterId));
  ['francisco', 'laura', 'irina', 'erik', 'daniela', 'blake'].forEach((id) => {
    assert.equal(charIds.has(id), true, `${id} requires at least one event`);
  });

  const allowedCategories = new Set([
    'onset_context',
    'pressure_interpretation',
    'pacing_hesitation',
    'observation',
    'body_mind_drift',
    'emotional_override',
    'diagnostic_overcaution',
    'pattern_lock',
    'ego_override',
    'physiological_limit',
    'psychological_override',
  ]);

  events.forEach((event) => {
    assert.ok(event.limits?.maxPerRun >= 1);
    assert.ok(event.limits?.cooldownTurns >= 0);
    assert.equal(typeof event.telemetryTag, 'string');
    assert.equal(typeof event.visibleToPlayer, 'boolean');
    assert.equal(typeof event.hiddenFromPlayer, 'boolean');
    assert.equal(typeof event.conditions?.mountainAuthority, 'string');
    assert.equal(allowedCategories.has(event.category), true);
  });
});


test('context event contract is bounded and mountain-first', async () => {
  const events = JSON.parse(await readFile('data/context_events.json', 'utf8'));
  assert.ok(events.length >= 4, 'requires multiple context archetypes');
  events.forEach((event) => {
    assert.equal(event.category, 'context');
    assert.equal(typeof event.label, 'string');
    assert.ok(Array.isArray(event.trigger?.turns) && event.trigger.turns.length >= 1);
    assert.equal(typeof event.effects?.weatherDelta, 'number');
    assert.equal(typeof event.effects?.visibilityDelta, 'number');
    assert.ok((event.effects?.timePenalty ?? 0) >= 0);
    assert.ok((event.limits?.maxPerRun ?? 0) >= 1);
    assert.equal(typeof event.telemetryTag, 'string');
  });
});

test('scenario _designIntent fields have expected shape and are not consumed by engine', async () => {
  const scenariosData = JSON.parse(await readFile('data/scenarios.web-v1.json', 'utf8'));
  const allScenarios = scenariosData.predefinedScenarios || [];

  const allowedDesignIntentKeys = new Set([
    'weather_deterioration', 'terrain_growth', 'fatigue_growth',
    'window_turns', 'post_window_deterioration',
  ]);

  for (const scenario of allScenarios) {
    if (!scenario._designIntent) continue;
    const keys = Object.keys(scenario._designIntent);
    for (const key of keys) {
      assert.ok(allowedDesignIntentKeys.has(key),
        `scenario ${scenario.id}: unexpected _designIntent key "${key}"`);
    }
  }

  // Verify archetypes too
  const archetypes = scenariosData.randomScenario?.archetypes || [];
  for (const arch of archetypes) {
    const intent = arch.tweak?._designIntent;
    if (!intent) continue;
    for (const key of Object.keys(intent)) {
      assert.ok(allowedDesignIntentKeys.has(key),
        `archetype ${arch.name}: unexpected _designIntent key "${key}"`);
    }
  }
});

test('scenarios 02–04 have distinct difficultyModifiers', async () => {
  const scenariosData = JSON.parse(await readFile('data/scenarios.web-v1.json', 'utf8'));
  const scenarios = scenariosData.predefinedScenarios;
  const s02 = scenarios.find(s => s.id === 'narrow-weather-window');
  const s03 = scenarios.find(s => s.id === 'false-stability-terrain');
  const s04 = scenarios.find(s => s.id === 'accumulated-fatigue-trap');

  assert.ok(s02 && s03 && s04, 'all three scenarios must exist');

  const stringify = (obj) => JSON.stringify(obj);
  assert.notEqual(stringify(s02.difficultyModifiers), stringify(s03.difficultyModifiers),
    'scenario 02 and 03 should have different difficultyModifiers');
  assert.notEqual(stringify(s03.difficultyModifiers), stringify(s04.difficultyModifiers),
    'scenario 03 and 04 should have different difficultyModifiers');
  assert.notEqual(stringify(s02.difficultyModifiers), stringify(s04.difficultyModifiers),
    'scenario 02 and 04 should have different difficultyModifiers');
});
