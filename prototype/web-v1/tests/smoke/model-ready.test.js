import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadDataConfigFiles } from '../../ui/helpers/data-config.js';

const pathByName = new Map([
  ['nodes', 'data/nodes.json'],
  ['environmental_pressure_config', 'data/environmental_pressure_config.json'],
  ['action_modifiers', 'data/action_modifiers.json'],
  ['stage_modifiers', 'data/stage_modifiers.json'],
  ['characters', 'data/characters.json'],
  ['character_events', 'data/character_events.json'],
  ['context_events', 'data/context_events.json'],
  ['outcomes', 'data/outcomes.json'],
  ['scenarios.web-v1', 'data/scenarios.web-v1.json'],
]);

async function fakeFetch(requestPath) {
  const key = requestPath.split('/').pop().replace('.json', '');
  const filePath = pathByName.get(key);
  const body = await readFile(filePath, 'utf8');
  return { ok: true, status: 200, async json() { return JSON.parse(body); } };
}

test('data loader reaches model-ready contract with required files', async () => {
  let blockingError = null;
  const config = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: (msg) => { blockingError = msg; } });
  assert.equal(blockingError, null);
  assert.ok(config);
  assert.ok(Array.isArray(config.characterEvents) && config.characterEvents.length > 0);
  assert.ok(Array.isArray(config.contextEvents) && config.contextEvents.length > 0);
});
