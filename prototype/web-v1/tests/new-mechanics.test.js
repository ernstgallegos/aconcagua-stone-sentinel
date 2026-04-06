import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'index.html');
const uiPath = path.join(__dirname, '..', 'ui', 'screens.js');
const titleUiPath = path.join(__dirname, '..', 'ui', 'screens', 'title.js');
const gameUiPath = path.join(__dirname, '..', 'ui', 'screens', 'game.js');
const debriefUiPath = path.join(__dirname, '..', 'ui', 'screens', 'debrief.js');
const part2UiPath = path.join(__dirname, '..', 'ui', 'screens', 'part2.js');

const indexSource = fs.readFileSync(indexPath, 'utf8');
const uiSource = [
  fs.readFileSync(uiPath, 'utf8'),
  fs.readFileSync(titleUiPath, 'utf8'),
  fs.readFileSync(gameUiPath, 'utf8'),
  fs.readFileSync(debriefUiPath, 'utf8'),
  fs.readFileSync(part2UiPath, 'utf8'),
].join('\n');

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
  assert.match(uiSource, /const DIFFICULTY_LEVELS = \[/);
  assert.match(uiSource, /id: 'very-easy'/);
  assert.match(uiSource, /id: 'very-hard'/);
  assert.match(uiSource, /pressureBias: -14/);
  assert.match(uiSource, /pressureBias: 16/);
  assert.match(uiSource, /permitDaysBonus: -2/);
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
  assert.match(uiSource, /From Horcones, descending again exits the park and ends the expedition\./);
  assert.match(uiSource, /Summit reached\. No more climbing — start the descent\./);
  assert.match(uiSource, /There is no higher ground left to earn\. The only meaningful move now is the descent\./);
  assert.match(uiSource, /Only Daniela can use this action\./);
  assert.match(uiSource, /photoBtn\.style\.display = 'none'/);
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
  assert.match(uiSource, /function syncMobileStatusPanels/);
  assert.match(uiSource, /mobileList\.innerHTML = list\.innerHTML/);
  assert.match(uiSource, /sleepBtn\.disabled = !sleepAvailable/);
  assert.doesNotMatch(uiSource, /requestDecisionPause/);
  assert.doesNotMatch(uiSource, /decisionPauseUsed/);
});

test('Part 2 bridge keeps the full roster visible while gating the public path', () => {
  assert.match(indexSource, /id="part2-carousel-card-character"/);
  assert.match(indexSource, /id="part2-carousel-card-route"/);
  assert.match(uiSource, /const PART2_ROUTE_OPTIONS = \[/);
  assert.match(uiSource, /id: 'guided-normal-route'/);
  assert.match(uiSource, /id: 'independent-normal-route'/);
  assert.match(uiSource, /id !== 'francisco'/);
  assert.match(uiSource, /id !== 'guided-normal-route'/);
  assert.match(uiSource, /part2-lock-pill/);
  assert.match(uiSource, /window\.confirmPart2Character = confirmPart2Character/);
  assert.match(uiSource, /\{ label: 'Follow on Instagram', action: 'open_instagram', role: 'secondary' \}/);
  assert.match(uiSource, /window\.open\('mailto:aconcaguastonesentinel@gmail.com', '_self'\)/);
  assert.match(uiSource, /window\.open\('https:\/\/www\.instagram\.com\/aconcaguastonesentinel\/', '_blank', 'noopener,noreferrer'\)/);
});


test('in-game help overlay wiring is present for pressure labels and trend categories', () => {
  assert.match(indexSource, /id="game-help-trigger"/);
  assert.match(indexSource, /id="game-help-overlay"/);
  assert.match(uiSource, /function buildGameHelpContent\(\)/);
  assert.match(uiSource, /window\.openGameHelp = openGameHelp/);
  assert.match(uiSource, /window\.closeGameHelp = closeGameHelp/);
});
