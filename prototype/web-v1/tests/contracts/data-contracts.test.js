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

// ── Full-array malformed-element tests (beyond index 0) ───────────────────────

import { validateDataConfigShape } from '../../ui/helpers/data-config.js';

test('validateDataConfigShape: catches malformed characterEvent at index > 0', () => {
  const valid = {
    id: 'ev_0',
    characterId: 'francisco',
    category: 'observation',
    trigger: {},
    effects: {},
    limits: {},
  };
  const malformedAtIndex1 = [
    valid,
    { id: 'ev_1', characterId: 'laura' }, // missing category, trigger, effects, limits
  ];

  assert.throws(
    () => validateDataConfigShape('characterEvents', malformedAtIndex1),
    /\$\[1\]/,
    'should report error at index 1 for missing characterEvent fields'
  );
});

test('validateDataConfigShape: catches malformed contextEvent at index > 0', () => {
  const validContext = {
    id: 'ctx_0',
    label: 'Weather shift',
    category: 'context',
    trigger: {},
    effects: {},
  };
  const malformedAtIndex2 = [
    validContext,
    { id: 'ctx_1', label: 'Fine', category: 'context', trigger: {}, effects: {} },
    { id: 123 }, // id should be string
  ];

  assert.throws(
    () => validateDataConfigShape('contextEvents', malformedAtIndex2),
    /\$\[2\]/,
    'should report error at index 2 for wrong type on contextEvent.id'
  );
});

test('validateDataConfigShape: catches malformed node at index > 0', () => {
  const validNode = { nodeId: 'horcones' };
  const malformedAtIndex1 = [
    validNode,
    { nodeId: 42 }, // nodeId should be string
  ];

  assert.throws(
    () => validateDataConfigShape('nodes', malformedAtIndex1),
    /\$\[1\]/,
    'should report error at index 1 for non-string nodeId'
  );
});

test('validateDataConfigShape: passes when all elements in characterEvents array are valid', () => {
  const events = [
    { id: 'e1', characterId: 'francisco', category: 'observation', trigger: {}, effects: {}, limits: {} },
    { id: 'e2', characterId: 'laura', category: 'onset_context', trigger: {}, effects: {}, limits: {} },
  ];
  assert.doesNotThrow(() => validateDataConfigShape('characterEvents', events));
});

test('validateDataConfigShape: passes when all nodes have string nodeId', () => {
  const nodes = [
    { nodeId: 'horcones' },
    { nodeId: 'confluencia' },
    { nodeId: 'plaza_de_mulas' },
  ];
  assert.doesNotThrow(() => validateDataConfigShape('nodes', nodes));
});
