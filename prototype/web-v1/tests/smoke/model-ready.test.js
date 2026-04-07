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

test('data loader classifies missing required file as blocking missing-file failure', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('context_events.json')) {
        return { ok: false, status: 404, async json() { return {}; } };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'missing file');
  assert.match(errors[0].detail, /missing file/i);
  assert.match(errors[0].file, /context_events\.json/);
});

test('data loader classifies malformed JSON as blocking invalid-json failure', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('outcomes.json')) {
        return {
          ok: true,
          status: 200,
          async json() { throw new SyntaxError('Unexpected token } in JSON at position 2'); },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid json');
  assert.match(errors[0].detail, /invalid JSON/i);
  assert.match(errors[0].file, /outcomes\.json/);
});

test('data loader classifies non-404 HTTP failures distinctly', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('action_modifiers.json')) {
        return { ok: false, status: 500, async json() { return {}; } };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'http failure');
  assert.match(errors[0].detail, /status 500/i);
  assert.match(errors[0].file, /action_modifiers\.json/);
});

test('data loader classifies unexpected fetch exceptions as generic load failure', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('nodes.json')) {
        throw new TypeError('Failed to fetch');
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'generic load failure');
  assert.match(errors[0].detail, /failed to fetch/i);
  assert.match(errors[0].file, /nodes\.json/);
});

test('data loader classifies invalid shape as blocking shape failure', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('characters.json')) {
        return { ok: true, status: 200, async json() { return { not: 'an array' }; } };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].file, /characters\.json/);
});

test('shape validator catches malformed second item in characters array', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('characters.json')) {
        return {
          ok: true, status: 200,
          async json() {
            return [{ id: 'francisco' }, { id: 42 }];
          },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].detail, /\$\[1\]\.id/);
});

test('shape validator rejects invalid nationalityCode format when provided', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('characters.json')) {
        return {
          ok: true, status: 200,
          async json() {
            return [{ id: 'francisco', nationalityCode: 'arg' }];
          },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].detail, /nationalityCode/);
});

test('shape validator catches malformed second item in nodes array', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('nodes.json')) {
        return {
          ok: true, status: 200,
          async json() {
            return [{ nodeId: 'horcones' }, { nodeId: null }];
          },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].detail, /\$\[1\]\.nodeId/);
});

test('shape validator catches malformed second item in contextEvents array', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('context_events.json')) {
        return {
          ok: true, status: 200,
          async json() {
            return [
              { id: 'evt_1', label: 'Wind', category: 'context', trigger: {}, effects: {} },
              { id: 'evt_2', label: 'Storm', category: 'context', trigger: {}, effects: null },
            ];
          },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].detail, /\$\[1\]\.effects/);
});

test('shape validator catches malformed third item in characterEvents array', async () => {
  const errors = [];
  const config = await loadDataConfigFiles({
    fetchImpl: async (requestPath) => {
      if (requestPath.includes('character_events.json')) {
        return {
          ok: true, status: 200,
          async json() {
            return [
              { id: 'ce_1', characterId: 'francisco', category: 'observation', trigger: {}, effects: {}, limits: {} },
              { id: 'ce_2', characterId: 'laura', category: 'observation', trigger: {}, effects: {}, limits: {} },
              { id: 'ce_3', characterId: 'irina', category: 'observation', trigger: {}, effects: {}, limits: 'bad' },
            ];
          },
        };
      }
      return fakeFetch(requestPath);
    },
    onError: (payload) => errors.push(payload),
  });

  assert.equal(config, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].category, 'invalid shape');
  assert.match(errors[0].detail, /\$\[2\]\.limits/);
});
