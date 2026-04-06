import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'index.html');
const uiPath = path.join(__dirname, '..', 'ui', 'screens.js');
const difficultyPath = path.join(__dirname, '..', 'ui', 'helpers', 'difficulty.js');
const part2Path = path.join(__dirname, '..', 'ui', 'screens', 'part2.js');
const gamePath = path.join(__dirname, '..', 'ui', 'screens', 'game.js');

const indexSource = fs.readFileSync(indexPath, 'utf8');
const uiSource = fs.readFileSync(uiPath, 'utf8');
const difficultySource = fs.readFileSync(difficultyPath, 'utf8');
const part2Source = fs.readFileSync(part2Path, 'utf8');
const gameSource = fs.readFileSync(gamePath, 'utf8');

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



test('welcome info modal, difficulty selector, and onboarding tutorial remain visible integration points', () => {
  assert.match(indexSource, /class="title-info-trigger"/);
  assert.match(indexSource, /id="intro-modal"/);
  assert.doesNotMatch(indexSource, /class="title-main"/);
  assert.doesNotMatch(indexSource, /id="carousel-card-difficulty"/);
  assert.match(indexSource, /Full Tutorial \/ FAQ/);
  assert.match(difficultySource, /const DIFFICULTY_LEVELS = \[/);
  assert.match(difficultySource, /id: 'very-easy'/);
  assert.match(difficultySource, /id: 'very-hard'/);
  assert.match(difficultySource, /pressureBias: -14/);
  assert.match(difficultySource, /pressureBias: 16/);
  assert.match(difficultySource, /permitDaysBonus: -2/);
  assert.match(uiSource, /window\.setDifficulty = setDifficulty/);
  assert.match(uiSource, /window\.openIntroModal = openIntroModal/);
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
  // Horcones exit copy lives in the onboarding/I18N block still in screens.js
  assert.match(uiSource, /From Horcones, descending again exits the park and ends the expedition\./);
  // Game-screen decision copy moved to ui/screens/game.js after extraction
  assert.match(gameSource, /Summit reached\. No more climbing — start the descent\./);
  assert.match(gameSource, /There is no higher ground left to earn\. The only meaningful move now is the descent\./);
  assert.match(uiSource, /Only Daniela can use this action\./);
  assert.match(gameSource, /photoBtn\.style\.display = 'none'/);
  assert.match(uiSource, /'6': 'btn-shoot-photo'/);
});

test('watch/status layout keeps desktop grouping, mobile sync, and retired controls out of gameplay', () => {
  assert.match(indexSource, /id="btn-quick-start"[\s\S]*?Quick Start \(Random\)/);
  assert.match(indexSource, /class="watch-status-layout"/);
  assert.match(indexSource, /class="watch-core-column"/);
  assert.match(indexSource, /class="watch-status-column"/);
  assert.match(indexSource, /id="bs-watch-position"/);
  assert.match(indexSource, /id="bs-watch-pressure"/);
  assert.match(indexSource, /id="bs-position-list"/);
  assert.match(indexSource, /id="btn-sleep"[^>]*disabled/);
  assert.doesNotMatch(indexSource, /id="btn-sleep"[^>]*display:none/);
  assert.doesNotMatch(indexSource, /btn-focus-pause/);
  // syncMobileStatusPanels and related mobile-sync content moved to ui/screens/game.js
  assert.match(gameSource, /function syncMobileStatusPanels/);
  assert.match(gameSource, /mobileList\.innerHTML = list\.innerHTML/);
  assert.match(gameSource, /sleepBtn\.disabled = !sleepAvailable/);
  assert.doesNotMatch(uiSource, /requestDecisionPause/);
  assert.doesNotMatch(uiSource, /decisionPauseUsed/);
});

test('Part 2 bridge keeps the full roster visible while gating the public path', () => {
  assert.match(indexSource, /id="part2-carousel-card-character"/);
  assert.match(indexSource, /id="part2-carousel-card-route"/);
  // PART2_ROUTE_OPTIONS is still present in screens.js (dead code) and in part2.js
  assert.match(uiSource, /const PART2_ROUTE_OPTIONS = \[/);
  assert.match(uiSource, /id: 'guided-normal-route'/);
  assert.match(uiSource, /id: 'independent-normal-route'/);
  // Guard logic, lock pill, and Instagram/email CTAs live in part2.js after extraction
  assert.match(part2Source, /id !== 'francisco'/);
  assert.match(part2Source, /id !== 'guided-normal-route'/);
  assert.match(part2Source, /part2-lock-pill/);
  assert.match(uiSource, /window\.confirmPart2Character = confirmPart2Character/);
  assert.match(part2Source, /\{ label: 'Follow on Instagram', action: 'open_instagram', role: 'secondary' \}/);
  assert.match(part2Source, /window\.open\('mailto:aconcaguastonesentinel@gmail.com', '_self'\)/);
  assert.match(part2Source, /window\.open\('https:\/\/www\.instagram\.com\/aconcaguastonesentinel\/', '_blank', 'noopener,noreferrer'\)/);
});


test('in-game help overlay wiring is present for pressure labels and trend categories', () => {
  assert.match(indexSource, /id="game-help-trigger"/);
  assert.match(indexSource, /id="game-help-overlay"/);
  assert.match(uiSource, /function buildGameHelpContent\(\)/);
  assert.match(uiSource, /window\.openGameHelp = openGameHelp/);
  assert.match(uiSource, /window\.closeGameHelp = closeGameHelp/);
});
