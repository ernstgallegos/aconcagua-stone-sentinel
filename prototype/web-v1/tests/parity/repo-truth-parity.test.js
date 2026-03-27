import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('repo truth, package version, and UI version are synchronized', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const ui = await readFile('prototype/web-v1/ui/screens.js', 'utf8');
  const release = `v${pkg.version}`;
  assert.ok(repoTruth.includes(release));
  assert.ok(ui.includes(`Prototype · ${release}`));
});

test('repo truth outcome taxonomy matches runtime outcomes data', async () => {
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const outcomes = JSON.parse(await readFile('data/outcomes.json', 'utf8'));
  outcomes.forEach((outcome) => assert.ok(repoTruth.includes(outcome), `missing ${outcome}`));
});
