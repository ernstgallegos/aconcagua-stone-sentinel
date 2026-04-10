/**
 * Parity test: runtime JS loader output vs. TypeScript contract expectations.
 *
 * Uses loadDataConfigFiles() + normalizeRouteData() from the canonical JS
 * loader (ui/helpers/data-config.js) against real data files, then verifies
 * that the resulting normalized config satisfies the same shape invariants
 * that the TS-side assertDataConfig() enforces on RouteNode, CharacterEvent,
 * ContextEvent, Character, and Scenario.
 *
 * If this test fails it means the JS loader output has drifted from what the
 * TS contracts declare, and one of the two sources needs to be brought back
 * into alignment.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  loadDataConfigFiles,
  normalizeRouteData,
  validateDataConfigShape,
} from '../../ui/helpers/data-config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pathByName = new Map([
  ['nodes',                    'data/nodes.json'],
  ['environmental_pressure_config', 'data/environmental_pressure_config.json'],
  ['action_modifiers',         'data/action_modifiers.json'],
  ['stage_modifiers',          'data/stage_modifiers.json'],
  ['characters',               'data/characters.json'],
  ['character_events',         'data/character_events.json'],
  ['context_events',           'data/context_events.json'],
  ['outcomes',                 'data/outcomes.json'],
  ['scenarios.web-v1',         'data/scenarios.web-v1.json'],
]);

async function fakeFetch(requestPath) {
  const key = requestPath.split('/').pop().replace('.json', '');
  const filePath = pathByName.get(key);
  const body = await readFile(filePath, 'utf8');
  return { ok: true, status: 200, async json() { return JSON.parse(body); } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('JS loader + normalizeRouteData produces RouteNode shape expected by TS contracts', async () => {
  let blockingError = null;
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: (e) => { blockingError = e; } });
  assert.equal(blockingError, null, 'data load must not produce blocking errors');
  assert.ok(raw, 'loader must return a config object');

  const normalized = normalizeRouteData(raw);
  const validStages = new Set(['APPROACH', 'HIGH_CAMP', 'SUMMIT_DAY']);

  assert.ok(Array.isArray(normalized.routeNodes) && normalized.routeNodes.length > 0,
    'normalizeRouteData must produce a non-empty routeNodes array');

  for (const node of normalized.routeNodes) {
    assert.equal(typeof node.id, 'string', `node.id must be a string (got ${typeof node.id})`);
    assert.ok(node.id.length > 0, 'node.id must be non-empty');
    assert.equal(typeof node.routeIndex, 'number', `node ${node.id}: routeIndex must be a number`);
    assert.ok(validStages.has(node.stage), `node ${node.id}: stage "${node.stage}" must be a valid Stage`);
  }
});

test('normalized config satisfies TS CharacterEvent contract invariants', async () => {
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: () => {} });
  assert.ok(raw);

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

  assert.ok(Array.isArray(raw.characterEvents) && raw.characterEvents.length > 0);

  for (const ev of raw.characterEvents) {
    assert.equal(typeof ev.id, 'string', `character event id must be string`);
    assert.ok(ev.id.length > 0);
    assert.equal(typeof ev.characterId, 'string', `event ${ev.id}: characterId must be string`);
    assert.ok(allowedCategories.has(ev.category), `event ${ev.id}: category "${ev.category}" not in allowed set`);
    assert.equal(typeof ev.telemetryTag, 'string', `event ${ev.id}: telemetryTag must be string`);
    assert.equal(typeof ev.limits?.cooldownTurns, 'number', `event ${ev.id}: limits.cooldownTurns must be number`);
    assert.ok(ev.limits.cooldownTurns >= 0, `event ${ev.id}: cooldownTurns must be >= 0`);
    assert.equal(typeof ev.limits?.maxPerRun, 'number', `event ${ev.id}: limits.maxPerRun must be number`);
    assert.ok(ev.limits.maxPerRun >= 1, `event ${ev.id}: maxPerRun must be >= 1`);
  }
});

test('normalized config satisfies TS ContextEvent contract invariants', async () => {
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: () => {} });
  assert.ok(raw);

  assert.ok(Array.isArray(raw.contextEvents) && raw.contextEvents.length > 0);

  for (const ev of raw.contextEvents) {
    assert.equal(typeof ev.id, 'string', `context event id must be string`);
    assert.ok(ev.id.length > 0);
    assert.equal(typeof ev.label, 'string', `event ${ev.id}: label must be string`);
    assert.equal(ev.category, 'context', `event ${ev.id}: category must be "context"`);
    assert.ok(Array.isArray(ev.trigger?.turns) && ev.trigger.turns.length >= 1,
      `event ${ev.id}: trigger.turns must be a non-empty array`);
    assert.equal(typeof ev.effects, 'object', `event ${ev.id}: effects must be an object`);
    assert.ok(ev.limits?.maxPerRun >= 1, `event ${ev.id}: limits.maxPerRun must be >= 1`);
  }
});

test('normalized config satisfies TS Character contract invariants', async () => {
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: () => {} });
  assert.ok(raw);

  assert.ok(Array.isArray(raw.characters) && raw.characters.length > 0);

  for (const ch of raw.characters) {
    assert.equal(typeof ch.id, 'string', `character id must be string`);
    assert.ok(ch.id.length > 0);
    assert.equal(typeof ch.name, 'string', `character ${ch.id}: name must be string`);
    assert.equal(typeof ch.engine, 'object', `character ${ch.id}: engine must be an object`);
    // Core engine fields (present in all 6 characters in data/characters.json)
    assert.equal(typeof ch.engine.fatigueResistance, 'number',
      `character ${ch.id}: engine.fatigueResistance must be number`);
    assert.equal(typeof ch.engine.exposureResistance, 'number',
      `character ${ch.id}: engine.exposureResistance must be number`);
    assert.equal(typeof ch.engine.confidenceStability, 'number',
      `character ${ch.id}: engine.confidenceStability must be number`);
    assert.equal(typeof ch.engine.riskTolerance, 'number',
      `character ${ch.id}: engine.riskTolerance must be number`);
    assert.equal(typeof ch.engine.functionalCapacityBonus, 'number',
      `character ${ch.id}: engine.functionalCapacityBonus must be number`);
    assert.equal(typeof ch.engine.acclimatizationRate, 'number',
      `character ${ch.id}: engine.acclimatizationRate must be number`);
    assert.equal(typeof ch.engine.resourceEfficiency, 'number',
      `character ${ch.id}: engine.resourceEfficiency must be number`);
    assert.equal(typeof ch.engine.perceptionBias, 'number',
      `character ${ch.id}: engine.perceptionBias must be number`);
    assert.equal(typeof ch.engine.perceptionGuardrails, 'object',
      `character ${ch.id}: engine.perceptionGuardrails must be an object`);
    assert.equal(typeof ch.engine.perceptionLatency, 'object',
      `character ${ch.id}: engine.perceptionLatency must be an object`);
    assert.equal(typeof ch.engine.decisionWindow, 'object',
      `character ${ch.id}: engine.decisionWindow must be an object`);
  }
});

test('validateDataConfigShape accepts each real data file without throwing', async () => {
  const keyMap = [
    ['nodes',                    'data/nodes.json'],
    ['environmentalPressure',    'data/environmental_pressure_config.json'],
    ['actionModifiers',          'data/action_modifiers.json'],
    ['stageModifiers',           'data/stage_modifiers.json'],
    ['characters',               'data/characters.json'],
    ['characterEvents',          'data/character_events.json'],
    ['contextEvents',            'data/context_events.json'],
    ['outcomes',                 'data/outcomes.json'],
    ['scenariosWebV1',           'data/scenarios.web-v1.json'],
  ];

  for (const [key, filePath] of keyMap) {
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    assert.doesNotThrow(
      () => validateDataConfigShape(key, data),
      `validateDataConfigShape must accept real ${filePath}`
    );
  }
});

test('raw nodes in DataConfig carry nodeId/stageHint shape (pre-normalization)', async () => {
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: () => {} });
  assert.ok(raw);

  const validStages = new Set(['APPROACH', 'HIGH_CAMP', 'SUMMIT_DAY']);

  assert.ok(Array.isArray(raw.nodes) && raw.nodes.length > 0,
    'loadDataConfigFiles must populate config.nodes as a non-empty array');

  for (const node of raw.nodes) {
    // Raw nodes must carry nodeId/stageHint (pre-normalization shape).
    // normalizeRouteData() maps these to id/stage in the RouteNode shape.
    assert.equal(typeof node.nodeId, 'string', `raw node.nodeId must be a string (got ${typeof node.nodeId})`);
    assert.ok(node.nodeId.length > 0, 'raw node.nodeId must be non-empty');
    assert.equal(typeof node.routeIndex, 'number', `node ${node.nodeId}: routeIndex must be a number`);
    assert.ok(validStages.has(node.stageHint),
      `node ${node.nodeId}: stageHint "${node.stageHint}" must be a valid Stage`);
    // Sanity: raw nodes must NOT carry a normalized id field
    assert.equal(node.id, undefined,
      `node ${node.nodeId}: raw node must not have an "id" field (call normalizeRouteData first)`);
  }
});

test('routeNode ids produced by normalizeRouteData match JS loader positions array', async () => {
  const raw = await loadDataConfigFiles({ fetchImpl: fakeFetch, onError: () => {} });
  assert.ok(raw);

  const normalized = normalizeRouteData(raw);

  assert.deepEqual(
    normalized.routeNodes.map((n) => n.id),
    normalized.positions,
    'positions must be the ordered list of routeNode ids'
  );
});
