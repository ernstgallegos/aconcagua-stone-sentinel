import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stringKeys, DIALOGUE, CHARACTER_ES, SCENARIO_ES } from '../src/i18n.js';
import { ROOT, readText, readJson, loadData } from './helpers.js';
import crypto from 'node:crypto';
import { sha256, checkWord, normalizeWord, ACCESS_HASH } from '../src/gate.js';
import { PART2_PLATES } from '../src/part2-data.js';
import { readCanonicalPlates } from '../tools/sync-part2.mjs';

test('EN/ES interface copy stays in parity', () => {
  const { en, es } = stringKeys();
  assert.deepEqual([...en].sort(), [...es].sort());
  for (const [id, npc] of Object.entries(DIALOGUE)) {
    assert.equal(npc.lines.en.length, npc.lines.es.length, `dialogue length mismatch for ${id}`);
    assert.ok(npc.name.en && npc.name.es);
  }
  const data = loadData();
  data.characters.forEach((c) => assert.ok(CHARACTER_ES[c.id]?.role && CHARACTER_ES[c.id]?.bio, `missing ES copy for ${c.id}`));
  data.scenarios.predefinedScenarios.forEach((s) => assert.ok(SCENARIO_ES[s.id]?.name && SCENARIO_ES[s.id]?.desc, `missing ES copy for ${s.id}`));
});

test('every data-i18n key in the page exists', () => {
  const html = readText('prototype/web-3d/index.html');
  const { en } = stringKeys();
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20);
  keys.forEach((key) => assert.ok(en.includes(key), `unknown i18n key: ${key}`));
});

test('the 3D prototype reuses the canonical engine instead of copying it', () => {
  const sim = readText('prototype/web-3d/src/sim.js');
  assert.match(sim, /from '\.\.\/\.\.\/web-v1\/engine\/turn-resolution\.js'/);
  assert.match(sim, /from '\.\.\/\.\.\/web-v1\/engine\/pressure-model\.js'/);
  assert.match(sim, /from '\.\.\/\.\.\/web-v1\/engine\/turn-rules\.js'/);
  assert.doesNotMatch(sim, /function resolveTurn|function evaluateOutcome/);
});

test('private build: page is unindexed, routed only by its unlisted link, and not advertised', () => {
  const html = readText('prototype/web-3d/index.html');
  assert.match(html, /<meta name="robots" content="noindex, nofollow/);

  const vercel = readJson('vercel.json');
  const redirect = vercel.redirects.find((r) => r.source === '/3D-prototype');
  assert.ok(redirect, 'missing /3D-prototype redirect');
  assert.equal(redirect.destination, '/prototype/web-3d/index.html');
  assert.equal(redirect.permanent, false);
  const header = (vercel.headers || []).find((h) => h.source.startsWith('/prototype/web-3d'));
  assert.ok(header?.headers.some((h) => h.key === 'X-Robots-Tag' && /noindex/.test(h.value)), 'missing X-Robots-Tag header');

  // Public entry points must not link to the private prototype.
  for (const file of ['index.html', 'md-viewer.html', 'README.md', 'README.es.md', 'prototype/web-v1/index.html', 'docs/deploy-routing.md']) {
    const text = readText(file);
    assert.doesNotMatch(text, /web-3d|3D-prototype/i, `${file} must not reference the private 3D prototype`);
  }
});

test('all local module imports resolve to files in the repository', () => {
  const srcDir = path.join(ROOT, 'prototype/web-3d/src');
  for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
    for (const m of text.matchAll(/from '(\.[^']+)'/g)) {
      assert.ok(fs.existsSync(path.resolve(srcDir, m[1])), `${file} imports missing module ${m[1]}`);
    }
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'prototype/web-3d/vendor/three.module.min.js')));
});

test('access gate: hashing is correct and only the salted hash is stored', () => {
  for (const sample of ['', 'abc', 'montaña', 'x'.repeat(300)]) {
    assert.equal(sha256(sample), crypto.createHash('sha256').update(sample).digest('hex'));
  }
  assert.match(ACCESS_HASH, /^[0-9a-f]{64}$/);
  assert.equal(normalizeWord('  MoNtAñA '), 'montana');
  assert.equal(checkWord(''), false);
  assert.equal(checkWord('aconcagua'), false);
  // The word itself must never be committed in the prototype sources or docs.
  const dir = path.join(ROOT, 'prototype/web-3d');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'vendor' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]));
  const words = walk(dir).filter((f) => /\.(js|mjs|html|css|md)$/.test(f)).flatMap((f) => fs.readFileSync(f, 'utf8').toLowerCase().match(/[a-zñáéíóú]{4,24}/g) || []);
  const leaked = [...new Set(words)].filter((w) => checkWord(w));
  assert.deepEqual(leaked, [], 'the access word appears in plain text');
  const html = readText('prototype/web-3d/index.html');
  assert.match(html, /id="gate"/);
  assert.match(readText('prototype/web-3d/src/main.js'), /isUnlocked\(\)/);
});

test('Part 2 plates are an exact copy of the canonical web-v1 narrative', () => {
  assert.deepEqual(PART2_PLATES, readCanonicalPlates());
  assert.ok(PART2_PLATES.length >= 5);
  PART2_PLATES.forEach((plate) => {
    assert.ok(plate.body.length > 40 && plate.es.body.length > 40, `plate ${plate.id} needs EN and ES copy`);
    if (plate.art) assert.ok(fs.existsSync(path.join(ROOT, 'art', plate.art)), `missing art for ${plate.id}`);
  });
  const main = readText('prototype/web-3d/src/main.js');
  for (const rel of main.match(/'concept-art\/[^']+'/g) || []) {
    assert.ok(fs.existsSync(path.join(ROOT, 'art', rel.slice(1, -1))), `missing art ${rel}`);
  }
});

test('access gate still opens for the session when storage is unavailable', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
  });
  try {
    const gate = await import(`../src/gate.js?storage-blocked=${Date.now()}`);
    assert.equal(gate.isUnlocked(), false);
    assert.equal(gate.tryUnlock('not-the-word'), false);
    assert.equal(gate.isUnlocked(), false);
    // The word is not stored in this prototype; the public landing copy happens to contain it.
    const word = (readText('index.html').toLowerCase().match(/[a-zñáéíóú]{4,24}/g) || []).find((w) => checkWord(w));
    assert.ok(word, 'fixture word not found');
    assert.equal(gate.tryUnlock(word), true);
    assert.equal(gate.isUnlocked(), true);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
});

test('reading screens stay zoomable', () => {
  const html = readText('prototype/web-3d/index.html');
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale/);
});
