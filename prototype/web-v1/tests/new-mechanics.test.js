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



test('title difficulty selector and onboarding tutorial remain visible integration points', () => {
  assert.match(indexSource, /id="carousel-card-difficulty"/);
  assert.match(indexSource, /Full Tutorial \/ FAQ/);
  assert.match(uiSource, /const DIFFICULTY_LEVELS = \[/);
  assert.match(uiSource, /id: 'very-easy'/);
  assert.match(uiSource, /id: 'very-hard'/);
  assert.match(uiSource, /pressureBias: -14/);
  assert.match(uiSource, /pressureBias: 16/);
  assert.match(uiSource, /permitDaysBonus: -2/);
  assert.match(uiSource, /window\.setDifficulty = setDifficulty/);
  assert.match(uiSource, /window\.openTutorialModal = openTutorialModal/);
});


test('difficulty scaling reaches runtime systems instead of stopping at title copy', () => {
  assert.match(uiSource, /function getCombinedResourceEfficiency\(\)/);
  assert.match(uiSource, /characterEfficiency \* difficultyEfficiency/);
  assert.match(uiSource, /modifier\.fatigueDelta < 0/);
  assert.match(uiSource, /modifier\.exposureDelta < 0/);
  assert.match(uiSource, /const baseMs = \(p\.baseMs \?\? base\.baseMs\) \+ difficultyMods\.decisionWindowMsBonus/);
});

test('data loader treats environmental pressure config as required', () => {
  assert.match(uiSource, /REQUIRED_CONFIG_FILES = new Set\(\['nodes', 'environmentalPressure', 'actionModifiers'/);
});


test('descend UX copy documents Horcones exit behavior and Daniela guard wiring remains explicit', () => {
  assert.match(uiSource, /From Horcones, descending again exits the park and ends the expedition\./);
  assert.match(uiSource, /Summit reached\. No more climbing — start the descent\./);
  assert.match(uiSource, /There is no higher ground left to earn\. The only meaningful move now is the descent\./);
  assert.match(uiSource, /Only Daniela can use this action\./);
  assert.match(uiSource, /photoBtn\.style\.display = 'none'/);
  assert.match(uiSource, /'6': 'btn-shoot-photo'/);
});
