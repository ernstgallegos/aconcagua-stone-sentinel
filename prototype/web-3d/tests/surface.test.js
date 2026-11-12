import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stringKeys, DIALOGUE, CHARACTER_ES, SCENARIO_ES } from '../src/i18n.js';
import { ROOT, readText, readJson, loadData } from './helpers.js';

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
  for (const file of ['index.html', 'md-viewer.html', 'README.md', 'README.es.md', 'prototype/web-v1/index.html']) {
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
