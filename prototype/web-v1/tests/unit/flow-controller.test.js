/**
 * flow-controller.test.js
 *
 * Characterization tests for the navigation/modal/screen-flow logic
 * extracted into ui/flow-controller.js.
 *
 * Behaviors protected here:
 *   - initFlowController registers hooks and returns before DOM calls are needed
 *   - showScreen enforces the Part 2 access gate via resolveNavigationTarget
 *   - showScreen respects the suppressHash option (hash not written on first call)
 *   - showScreen activates the correct DOM element and calls onEnterScreen
 *   - advanceFromTitle blocks navigation when modelReady is false
 *   - advanceFromTitle delegates to showScreen when modelReady is true
 *   - handleDeepLink: no-op when hash is empty
 *   - handleDeepLink: Part 2 force=1 bypass writes localStorage and navigates
 *   - handleDeepLink: debrief screen delegates to bootstrapMockDebrief hook
 *   - handleDeepLink: unrecognised screen navigates directly with suppressHash
 *   - closeAllBottomSheets removes open classes
 *   - isBottomSheetOpen returns false when none are open
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ── Minimal DOM stubs needed before any module import ─────────────────────────

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add:      (...names) => names.forEach(n => set.add(n)),
    remove:   (...names) => names.forEach(n => set.delete(n)),
    contains: (name) => set.has(name),
  };
}

// Provide a safe global document before flow-controller.js is parsed.
global.document = {
  body: { dataset: {}, classList: makeClassList() },
  querySelectorAll: () => [],
  querySelector:    () => null,
  getElementById:   () => null,
  addEventListener: () => {},
};
global.window = {
  matchMedia: () => ({ matches: false }),
  scrollTo:   () => {},
  location:   { hash: '' },
};
global.history = { replaceState(_, __, url) { global._lastHash = url; } };
global.localStorage = (() => {
  const store = {};
  return {
    getItem:    (k) => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
})();

import {
  initFlowController,
  showScreen,
  advanceFromTitle,
  handleDeepLink,
  closeAllBottomSheets,
  isBottomSheetOpen,
} from '../../ui/flow-controller.js';
import { G, updateUIState, updateRunState } from '../../state/game-state.js';

// ── Helper builders ───────────────────────────────────────────────────────────

function makeHooks(overrides = {}) {
  return {
    part2NarrativeIds:            new Set(['mendoza_room', 'future_cta']),
    summitAchievedKey:            'aconcagua_summit_test',
    hasPreviouslySummited:        () => false,
    reportRuntimeIssue:           () => {},
    uiText:                       (en) => en,
    onEnterScreen:                () => {},
    buildGameHelpContent:         () => {},
    bootstrapMockDebrief:         () => {},
    startGame:                    () => {},
    showOnboarding:               () => {},
    deriveDifficultyFromScenario: () => {},
    resolveCharacter:             () => null,
    resolveScenario:              () => null,
    resolveSeed:                  () => 1234,
    ...overrides,
  };
}

/**
 * Build a minimal DOM stub.
 * @param {string[]} screenIds - Screen IDs (without "screen-" prefix).
 * @returns {{ doc, screens }}
 */
function makeDomStub(screenIds = []) {
  const screens = {};
  for (const id of screenIds) {
    screens[id] = { id: 'screen-' + id, classList: makeClassList() };
  }

  const doc = {
    body: { dataset: {}, classList: makeClassList() },
    querySelectorAll(sel) {
      if (sel === '.screen') return Object.values(screens);
      if (sel === '.bottom-sheet') return [];
      return [];
    },
    querySelector(sel) {
      if (sel === '.screen.active') return null; // skip exit animation
      return null;
    },
    getElementById(id) {
      const key = id.startsWith('screen-') ? id.slice('screen-'.length) : null;
      return (key && screens[key]) || null;
    },
    addEventListener() {},
  };

  return { doc, screens };
}

// ── initFlowController ────────────────────────────────────────────────────────

test('initFlowController: accepts a complete hooks object without throwing', () => {
  assert.doesNotThrow(() => initFlowController(makeHooks()));
});

// ── showScreen: Part 2 access gate ───────────────────────────────────────────

test('showScreen: Part 2 screen redirects to debrief without summit access', () => {
  const entered = [];
  const { doc, screens } = makeDomStub(['debrief', 'expedition-setup']);
  global.document = doc;

  initFlowController(makeHooks({
    hasPreviouslySummited: () => false,
    onEnterScreen: (id) => entered.push(id),
  }));

  updateRunState(G, { finalOutcome: 'Strategic Retreat' });
  showScreen('mendoza_room'); // Part 2, no access

  assert.ok(screens['debrief'].classList.contains('active'), 'debrief must be activated');
  assert.equal(entered[entered.length - 1], 'debrief');
});

test('showScreen: Part 2 screen allowed when hasPreviouslySummited is true', () => {
  const entered = [];
  const { doc, screens } = makeDomStub(['mendoza_room', 'debrief']);
  global.document = doc;

  initFlowController(makeHooks({
    hasPreviouslySummited: () => true,
    onEnterScreen: (id) => entered.push(id),
  }));

  showScreen('mendoza_room');
  assert.ok(screens['mendoza_room'].classList.contains('active'));
  assert.equal(entered[entered.length - 1], 'mendoza_room');
});

test('showScreen: non-Part2 screen passes through unchanged', () => {
  const entered = [];
  const { doc, screens } = makeDomStub(['game', 'debrief']);
  global.document = doc;

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  showScreen('game');

  assert.ok(screens['game'].classList.contains('active'));
  assert.equal(entered[entered.length - 1], 'game');
});

// ── showScreen: hash suppression ─────────────────────────────────────────────

test('showScreen: writes URL hash by default', () => {
  const { doc } = makeDomStub(['expedition-setup', 'debrief']);
  global.document = doc;
  global._lastHash = null;
  global.history = { replaceState(_, __, url) { global._lastHash = url; } };

  initFlowController(makeHooks());
  showScreen('expedition-setup');
  assert.ok(global._lastHash?.includes('expedition-setup'), 'hash must contain screen id');
});

test('showScreen({ suppressHash: true }): does not write URL hash', () => {
  const { doc } = makeDomStub(['expedition-setup', 'debrief']);
  global.document = doc;
  global._lastHash = null;
  global.history = { replaceState(_, __, url) { global._lastHash = url; } };

  initFlowController(makeHooks());
  showScreen('expedition-setup', { suppressHash: true });
  assert.equal(global._lastHash, null, 'hash must not be written when suppressHash is true');
});

test('showScreen: after suppressHash=true, next call writes hash normally', () => {
  const { doc } = makeDomStub(['expedition-setup', 'game', 'debrief']);
  global.document = doc;
  let writeCount = 0;
  global.history = { replaceState(_, __, url) { writeCount++; global._lastHash = url; } };

  initFlowController(makeHooks());
  showScreen('expedition-setup', { suppressHash: true });
  const after1 = writeCount;
  showScreen('game');

  assert.equal(after1, 0, 'must not write hash on suppressed call');
  assert.equal(writeCount, 1, 'must write hash on the following normal call');
  assert.ok(global._lastHash?.includes('game'));
});

// ── showScreen: onEnterScreen hook ────────────────────────────────────────────

test('showScreen: calls onEnterScreen with resolved screen id', () => {
  const entered = [];
  const { doc } = makeDomStub(['expedition-setup', 'debrief']);
  global.document = doc;

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  showScreen('expedition-setup');

  assert.ok(entered.includes('expedition-setup'));
});

// ── advanceFromTitle ──────────────────────────────────────────────────────────

test('advanceFromTitle: navigates to expedition-setup when modelReady is true', () => {
  const entered = [];
  const { doc } = makeDomStub(['expedition-setup', 'title', 'debrief']);
  global.document = doc;
  updateUIState(G, { modelReady: true });

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  advanceFromTitle(null);

  assert.ok(entered.includes('expedition-setup'), `Expected expedition-setup; got ${JSON.stringify(entered)}`);
});

test('advanceFromTitle: does not navigate when modelReady is false', () => {
  const entered = [];
  const { doc } = makeDomStub(['expedition-setup', 'title', 'debrief']);
  global.document = doc;
  updateUIState(G, { modelReady: false });

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  advanceFromTitle(null);

  assert.ok(!entered.includes('expedition-setup'), 'must not navigate when model not ready');
});

// ── handleDeepLink ────────────────────────────────────────────────────────────

test('handleDeepLink: no-op when window.location.hash is empty', () => {
  const entered = [];
  const { doc } = makeDomStub(['title', 'debrief']);
  global.document = doc;
  global.window.location.hash = '';

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  handleDeepLink();

  assert.equal(entered.length, 0, 'no screen should be entered for empty hash');
});

test('handleDeepLink: debrief deep link delegates to bootstrapMockDebrief hook', () => {
  let called = false;
  let receivedParams = null;
  const { doc } = makeDomStub(['title', 'debrief']);
  global.document = doc;
  global.window.location.hash = '#debrief&character=francisco&seed=42';

  initFlowController(makeHooks({
    bootstrapMockDebrief: (params) => { called = true; receivedParams = params; },
  }));
  handleDeepLink();

  assert.equal(called, true, 'bootstrapMockDebrief must be called');
  assert.equal(receivedParams?.character, 'francisco');
  assert.equal(receivedParams?.seed, '42');
});

test('handleDeepLink: Part2 force=1 sets localStorage and navigates to Part 2 screen', () => {
  const entered = [];
  const { doc } = makeDomStub(['mendoza_room', 'debrief']);
  global.document = doc;
  global.window.location.hash = '#mendoza_room&force=1';
  global._lastHash = null;
  global.history = { replaceState(_, __, url) { global._lastHash = url; } };

  const store = {};
  global.localStorage = {
    getItem:    (k) => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };

  initFlowController(makeHooks({
    part2NarrativeIds: new Set(['mendoza_room', 'future_cta']),
    summitAchievedKey: 'aconcagua_summit_test',
    onEnterScreen: (id) => entered.push(id),
  }));
  handleDeepLink();

  assert.equal(store['aconcagua_summit_test'], '1', 'localStorage must record summit achievement');
  assert.ok(entered.includes('mendoza_room'), `Expected mendoza_room; got ${JSON.stringify(entered)}`);
  assert.equal(global._lastHash, null, 'hash must be suppressed on Part2 force navigate');
});

test('handleDeepLink: unrecognised screen navigates without writing hash', () => {
  const entered = [];
  const { doc } = makeDomStub(['summit-success', 'debrief']);
  global.document = doc;
  global.window.location.hash = '#summit-success';
  global._lastHash = null;
  global.history = { replaceState(_, __, url) { global._lastHash = url; } };

  initFlowController(makeHooks({ onEnterScreen: (id) => entered.push(id) }));
  handleDeepLink();

  assert.ok(entered.includes('summit-success'), `Expected summit-success; got ${JSON.stringify(entered)}`);
  assert.equal(global._lastHash, null, 'hash must be suppressed on direct deep-link navigate');
});

// ── Bottom-sheet helpers ──────────────────────────────────────────────────────

test('isBottomSheetOpen: returns false when no open bottom-sheet exists', () => {
  global.document = {
    querySelectorAll(sel) {
      if (sel === '.bottom-sheet') return [];
      return [];
    },
    querySelector: () => null,
    getElementById: () => null,
    addEventListener: () => {},
    body: { classList: makeClassList(), dataset: {} },
  };

  initFlowController(makeHooks());
  assert.equal(isBottomSheetOpen(), false);
});

test('closeAllBottomSheets: removes open class from all bottom-sheet elements', () => {
  const sheet1 = { classList: makeClassList(['open', 'bottom-sheet']) };
  const sheet2 = { classList: makeClassList(['bottom-sheet']) };
  const backdrop = { classList: makeClassList(['visible']) };

  global.document = {
    querySelectorAll(sel) {
      if (sel === '.bottom-sheet') return [sheet1, sheet2];
      if (sel === '.screen') return [];
      return [];
    },
    querySelector: () => null,
    getElementById(id) {
      if (id === 'bottom-sheet-backdrop') return backdrop;
      return null;
    },
    addEventListener: () => {},
    body: { classList: makeClassList(['modal-open']), dataset: {} },
  };

  initFlowController(makeHooks());
  closeAllBottomSheets();

  assert.equal(sheet1.classList.contains('open'), false, 'open must be removed from sheet1');
  assert.equal(backdrop.classList.contains('visible'), false, 'visible must be removed from backdrop');
  assert.equal(global.document.body.classList.contains('modal-open'), false);
});
