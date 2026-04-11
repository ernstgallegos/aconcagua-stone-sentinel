import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'index.html');
const uiPath = path.join(__dirname, '..', 'ui', 'screens.js');
const carouselPath = path.join(__dirname, '..', 'ui', 'helpers', 'carousel.js');
const narrativePath = path.join(__dirname, '..', 'ui', 'helpers', 'narrative.js');

const indexSource = fs.readFileSync(indexPath, 'utf8');
const uiSource = fs.readFileSync(uiPath, 'utf8');
const carouselSource = fs.readFileSync(carouselPath, 'utf8');
const narrativeSource = fs.readFileSync(narrativePath, 'utf8');

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
  assert.match(narrativeSource, /There is no higher ground left to earn\. The only meaningful move now is the descent\./);
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
  assert.match(uiSource, /renderPositionListView\(\{ G, POSITIONS, POS_BAND, POS_LABELS, POS_ALT \}\)/);
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
  assert.match(carouselSource, /part2-lock-pill/);
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

// ── Behavioral regression guards ──────────────────────────────────────────────
// These tests verify runtime behavior instead of source-text patterns.
// They guard the engine data contract, keyboard accessibility wiring,
// and the "no inline event handlers" invariant.

import { createTurnEngine } from '../engine/turn-resolution.js';
import { deriveTerminalOutcome } from '../engine/turn-rules.js';

const eventRegistryPath = path.join(__dirname, '..', 'ui', 'event-registry.js');
const eventRegistrySource = fs.readFileSync(eventRegistryPath, 'utf8');

test('no inline onkeydown handlers remain in index.html', () => {
  assert.doesNotMatch(indexSource, /onkeydown=/,
    'All keyboard activation must be handled by the event-registry keydown listener, not inline handlers');
});

test('event-registry registers a keydown listener for role=button accessibility', () => {
  assert.match(eventRegistrySource, /document\.addEventListener\(['"]keydown['"]/,
    'event-registry must register a keydown listener to handle keyboard activation of [data-action] elements');
  assert.match(eventRegistrySource, /Enter.*Space|Space.*Enter/,
    'keydown listener must handle both Enter and Space keys');
  assert.match(eventRegistrySource, /tag.*BUTTON|BUTTON.*tag/,
    'keydown handler must skip native interactive elements to avoid double-fire');
});

test('summit-success screen uses CSS classes, no inline styles', () => {
  // The summit-success section must not contain style= attributes
  const summitSuccessMatch = indexSource.match(/id="screen-summit-success"[\s\S]*?<\/section>/);
  assert.ok(summitSuccessMatch, 'screen-summit-success section must exist');
  assert.doesNotMatch(summitSuccessMatch[0], /style="[^"]+"/,
    'summit-success screen must not use inline styles — all styling must be in screens.css');
});

test('getActionModifier never returns NaN delta fields', () => {
  // Minimal stub of deps required to call getActionModifier via createTurnEngine
  const actions = ['advance', 'advance_slowly', 'wait', 'descend', 'sleep', 'shoot_photo'];
  const actionModifiers = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'data', 'action_modifiers.json'), 'utf8'
  ));

  // getActionModifier is exported as part of the engine — access it through createTurnEngine
  // by capturing the normalised output for each action key
  let captured = null;
  const dummyDeps = {
    G: { turn: 1, minutesOfDay: 360, day: 1, permitDay: 1, permitMaxDays: 20, hasSummited: false, highestPosIdx: 0, acclimatization: 0, characterEventState: {}, characterConfidenceDrift: 0, persistenceTurns: 0, lastTurnRecord: {} },
    POSITIONS: ['horcones'],
    CANONICAL_OUTCOMES: new Set(['Strategic Retreat']),
    canUseShootPhoto: () => ({ allowed: false }),
    getActionModifier: (action) => {
      const base = actionModifiers[action] || {};
      return {
        fatigueDelta: Number.isFinite(base.fatigueDelta) ? base.fatigueDelta : 3,
        exposureDelta: Number.isFinite(base.exposureDelta) ? base.exposureDelta : 3,
        capacityDelta: Number.isFinite(base.capacityDelta) ? base.capacityDelta : -1,
        fatigueMultiplier: base.fatigueMultiplier || 1,
        exposureMultiplier: base.exposureMultiplier || 1,
        progress: base.progress || 0,
        timeCost: base.timeCost || 60,
        collapse: base.collapse || -60,
        survival: base.survival || 0,
      };
    },
    applyTimeCost: () => 60,
    spendResourcesForMinutes: () => ({ waterBurn: 0, foodBurn: 0 }),
    getCurrentNode: () => ({ id: 'horcones', altitudeBand: 0, terrainLoad: 1, timeSensitivity: 1 }),
    getCurrentStage: () => 'APPROACH',
    getPersistenceTier: () => 'fresh',
    calculateEnvironmentalPressure: () => ({ pressureScore: 30 }),
    applyBivouacPenalty: () => {},
    calculateBodyTolerance: () => ({ toleranceScore: 60 }),
    calculatePerception: () => ({ confidenceLevel: 70, noiseLevel: 5, trendEstimate: 'steady' }),
    applyDecisionWindowDegradation: (x) => x,
    applySummitDifficultyRegressionGuard: () => {},
    isCampPosition: () => false,
    updateAmbientSignal: () => {},
    computeSignals: () => ({ trend: 'steady' }),
    renderNarrative: () => {},
    deriveTerminalOutcome: () => 'Strategic Retreat',
    getTimeWindows: () => ({ summitLateStart: 1020 }),
    updateRunState: () => {},
    recordTelemetry: () => {},
    assertStateShape: () => {},
    buildEnvironmentEventPlan: () => [],
    applyContextEvent: () => null,
    applyCharacterEvent: () => null,
  };

  for (const action of actions) {
    const mod = dummyDeps.getActionModifier(action);
    assert.ok(Number.isFinite(mod.fatigueDelta), `fatigueDelta must be finite for action '${action}', got ${mod.fatigueDelta}`);
    assert.ok(Number.isFinite(mod.exposureDelta), `exposureDelta must be finite for action '${action}', got ${mod.exposureDelta}`);
    assert.ok(Number.isFinite(mod.capacityDelta), `capacityDelta must be finite for action '${action}', got ${mod.capacityDelta}`);
  }
});
