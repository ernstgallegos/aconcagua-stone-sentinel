import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('repo truth, package version, UI version, and versioned docs are synchronized', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const repoTruthEs = await readFile('docs/repo-truth.es.md', 'utf8');
  const ui = await readFile('prototype/web-v1/ui/screens.js', 'utf8');
  const readme = await readFile('README.md', 'utf8');
  const readmeEs = await readFile('README.es.md', 'utf8');
  const simulationEngineDoc = await readFile('docs/simulation_engine.md', 'utf8');
  const landingPage = await readFile('index.html', 'utf8');
  const webV1Readme = await readFile('prototype/web-v1/README.md', 'utf8');
  const release = `v${pkg.version}`;
  assert.ok(repoTruth.includes(release));
  assert.ok(repoTruthEs.includes(release), `docs/repo-truth.es.md did not contain ${release}`);
  assert.ok(ui.includes(`Prototype · ${release}`));
  assert.ok(readme.includes(release));
  assert.ok(readmeEs.includes(release));
  assert.ok(simulationEngineDoc.includes(release));
  assert.ok(landingPage.includes(release), `index.html did not contain ${release}`);
  assert.ok(webV1Readme.includes(release), `prototype/web-v1/README.md did not contain ${release}`);
});

test('repo truth outcome taxonomy matches runtime outcomes data', async () => {
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const outcomes = JSON.parse(await readFile('data/outcomes.json', 'utf8'));
  outcomes.forEach((outcome) => assert.ok(repoTruth.includes(outcome), `missing ${outcome}`));
});


test('repo truth authority and prototype status are mirrored in README and architecture docs', async () => {
  const repoTruth = await readFile('docs/repo-truth.md', 'utf8');
  const readme = await readFile('README.md', 'utf8');
  const architecture = await readFile('docs/architecture.md', 'utf8');

  assert.ok(repoTruth.includes('prototype/web-v1'));
  assert.ok(repoTruth.includes('prototype/mra-v0'));
  assert.ok(repoTruth.includes('resolveTurn(state, action)'));

  assert.ok(readme.includes('prototype/web-v1'));
  assert.ok(readme.includes('prototype/mra-v0'));
  assert.ok(architecture.includes('prototype/web-v1'));
  assert.ok(architecture.includes('prototype/mra-v0'));
});
