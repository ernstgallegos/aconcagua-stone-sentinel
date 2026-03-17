import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'index.html');
const uiPath = path.join(__dirname, '..', 'ui', 'screens.js');

const indexSource = fs.readFileSync(indexPath, 'utf8');
const uiSource = fs.readFileSync(uiPath, 'utf8');

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', file), 'utf8'));
}

test('critical integration hooks remain wired (module shell + global facade)', () => {
  assert.match(indexSource, /<script type="module" src="\.\/ui\/screens\.js"><\/script>/);
  assert.match(uiSource, /window\.makeDecision = makeDecision/);
  assert.match(uiSource, /window\.showScreen = showScreen/);
});

test('canonical outcomes/data contracts are still present', () => {
  const outcomes = json('outcomes.json');
  const chars = json('characters.json');

  assert.ok(outcomes.includes('Summit and Safe Return'));
  assert.ok(outcomes.includes('Permit Expired'));
  assert.ok(outcomes.includes('Expedition Window Closed'));
  assert.ok(chars.length >= 3);
  assert.ok(chars.every((c) => c.difficultyLabel));
});
