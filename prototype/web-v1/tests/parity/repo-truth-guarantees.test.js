import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('repo-truth guaranteed-by-tests section mirrors enforced canonical claims', async () => {
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');

  assert.ok(repoTruth.includes('## Guaranteed by tests'));
  assert.ok(repoTruth.includes('prototype/web-v1'));
  assert.ok(repoTruth.includes('prototype/mra-v0'));
  assert.ok(repoTruth.includes('resolveTurn(state, action)'));
  assert.ok(repoTruth.includes('Live vs deferred systems'));
});

test('active roster and canonical outcomes are parity-checkable from runtime data', async () => {
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const characters = JSON.parse(await readFile('data/characters.json', 'utf8'));
  const outcomes = JSON.parse(await readFile('data/outcomes.json', 'utf8'));

  const activePart1 = characters.filter((c) => !c.part || c.part === 1);
  assert.equal(activePart1.length, 6);

  activePart1.forEach((character) => {
    const canonicalLabel = character.name.split(' ')[0];
    assert.ok(repoTruth.includes(canonicalLabel), `repo truth missing character ${character.name}`);
  });

  outcomes.forEach((outcome) => {
    assert.ok(repoTruth.includes(outcome), `repo truth missing outcome ${outcome}`);
  });
});
