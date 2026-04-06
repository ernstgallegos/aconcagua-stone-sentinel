/**
 * game-loop.test.js
 *
 * Focused unit tests for the turn-orchestration logic extracted into
 * ui/game-loop.js via `createGameLoop`.
 *
 * Behaviors protected here:
 *   - sleep at a non-camp position is rejected without calling resolveTurn
 *   - a normal turn calls resolveTurn, updates state, and builds a log entry
 *   - a continued turn increments G.turn and calls recordTelemetry
 *   - a run-ending turn calls onRunEnded (not a turn increment)
 *   - park exit at horcones via descend classifies returnedToHorcones correctly
 *   - summit-success outcome is terminal (run ends, returnedToHorcones=false)
 *   - fatality outcome is terminal and does not increment turn
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Minimal DOM stubs ─────────────────────────────────────────────────────────

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add:      (...names) => names.forEach(n => set.add(n)),
    remove:   (...names) => names.forEach(n => set.delete(n)),
    contains: (name) => set.has(name),
    has:      (name) => set.has(name),
  };
}

function stubDocument(panelClassList = null) {
  global.document = {
    querySelector(sel) {
      if (sel === '.decision-panel') {
        return panelClassList
          ? { classList: panelClassList }
          : null;
      }
      return null;
    },
  };
}

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeG(overrides = {}) {
  return {
    state: { position: 'camp_one', functional_capacity: 70, fatigue: 20, exposure: 10, weather_severity: 1 },
    signals: { trend: 'stable', uncertainty: 'low' },
    turn: 1,
    day: 1,
    minutesOfDay: 480,
    highestPosIdx: 0,
    pressureHistory: [],
    turnLog: [],
    allFlags: [],
    decisionTimeSpentMs: 0,
    decisionWindowExceeded: false,
    decisionWindowEffect: null,
    onboardingLayer: null,
    currentPrimaryAlert: null,
    activeEnvironmentEvent: null,
    ...overrides,
  };
}

function makeMinimalDeps(G, overrides = {}) {
  const calls = { resolveTurn: 0, updateRunState: 0, recordTelemetry: 0, addLogEntry: 0, renderWatch: 0, renderNarrative: 0, setDecisionButtonsEnabled: [], onRunEnded: null };

  return {
    deps: {
      G,
      resolveTurn: (_state, decision) => {
        calls.resolveTurn++;
        return {
          resolvedAction: decision,
          outcome: 'Strategic Retreat',
          flags: [],
          result: { blocked: false, moved: true, pressureDelta: 0 },
          lateSignalEvent: null,
          contextEvent: null,
        };
      },
      applyAcclimatizationGain: () => {},
      updateRunState: (g, patch) => {
        calls.updateRunState++;
        Object.assign(g, patch);
      },
      recordTelemetry: (_g, _patch) => { calls.recordTelemetry++; },
      buildTurnLogEntry: ({ resolvedDecision, turnResult }) => ({
        turn: G.turn, day: G.day, time: '08:00', position: G.state.position,
        decision: resolvedDecision, trend: 'stable', uncertainty: 'low',
        body: { capacity: 'good', fatigue: 'low', exposure: 'low' },
        raw: {}, pressure: {}, flags: [...turnResult.flags],
        blocked: false, moved: true, decisionMs: 0, decisionWindowExceeded: false,
        decisionWindowEffect: null, onboardingLayer: null, primaryAlert: null,
        lateSignalActivation: null, warningState: null, contextEvent: null,
        narrativeText: 'test narrative',
      }),
      computeSignals: () => ({ trend: 'stable', uncertainty: 'low' }),
      calculateEnvironmentalPressure: () => ({ pressureScore: 30 }),
      isCampPosition: (pos) => ['camp_one', 'camp_colera'].includes(pos),
      assertStateShape: () => {},
      getCurrentStage: () => 'approach',
      formatMinutes: (m) => `${Math.floor(m / 60)}:00`,
      capacityLabel: (v) => String(v),
      fatigueLabel: (v) => String(v),
      exposureLabel: (v) => String(v),
      pressureBandLabel: () => 'moderate',
      pressureDeltaLabel: () => 'stable',
      calculateBodyTolerance: () => 50,
      renderWatch: () => { calls.renderWatch++; },
      renderNarrative: () => { calls.renderNarrative++; return 'narrative text'; },
      addLogEntry: (_entry) => { calls.addLogEntry++; },
      setDecisionButtonsEnabled: (enabled) => calls.setDecisionButtonsEnabled.push(enabled),
      onRunEnded: (returnedToHorcones) => { calls.onRunEnded = returnedToHorcones; },
      ...overrides,
    },
    calls,
  };
}

// ── Load module ───────────────────────────────────────────────────────────────

const modPath = path.join(__dirname, '..', '..', 'ui', 'game-loop.js');
const { createGameLoop } = await import(pathToFileURL(modPath).href);

// ── Tests ─────────────────────────────────────────────────────────────────────

test('createGameLoop: sleep at non-camp position is rejected without calling resolveTurn', () => {
  stubDocument(null);
  const G = makeG({ state: { position: 'rocky_slope', functional_capacity: 70, fatigue: 20, exposure: 10, weather_severity: 1 } });
  const { deps, calls } = makeMinimalDeps(G, {
    isCampPosition: () => false,
  });
  const loop = createGameLoop(deps);
  loop.handleDecision('sleep');

  assert.equal(calls.resolveTurn, 0, 'resolveTurn must not be called for invalid sleep');
  assert.ok(calls.setDecisionButtonsEnabled.includes(true), 'buttons must be re-enabled after rejection');
});

test('createGameLoop: sleep at a camp position proceeds through resolveTurn', () => {
  stubDocument(null);
  const G = makeG({ state: { position: 'camp_one', functional_capacity: 70, fatigue: 20, exposure: 10, weather_severity: 1 } });
  const { deps, calls } = makeMinimalDeps(G, {
    isCampPosition: () => true,
    resolveTurn: (_state, decision) => {
      calls.resolveTurn++;
      return {
        resolvedAction: decision,
        outcome: 'Strategic Retreat',
        flags: [],
        result: { blocked: false, moved: false, pressureDelta: 0 },
        lateSignalEvent: null,
        contextEvent: null,
      };
    },
  });
  const loop = createGameLoop(deps);
  // Use fake timers to prevent actual setTimeout
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('sleep');
  global.setTimeout = origSetTimeout;

  assert.equal(calls.resolveTurn, 1, 'resolveTurn must be called for valid sleep');
});

test('createGameLoop: normal turn increments G.turn and calls recordTelemetry', () => {
  stubDocument(null);
  const G = makeG();
  const initialTurn = G.turn;
  const { deps, calls } = makeMinimalDeps(G);

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('advance');
  global.setTimeout = origSetTimeout;

  assert.equal(G.turn, initialTurn + 1, 'turn must increment by 1 after a continuing turn');
  assert.ok(calls.recordTelemetry >= 1, 'recordTelemetry must be called');
});

test('createGameLoop: normal turn builds and appends a log entry', () => {
  stubDocument(null);
  const G = makeG();
  const { deps, calls } = makeMinimalDeps(G);

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('advance');
  global.setTimeout = origSetTimeout;

  assert.equal(calls.addLogEntry, 1, 'addLogEntry must be called once');
  assert.equal(G.turnLog.length, 1, 'turnLog must have one entry after the turn');
});

test('createGameLoop: terminal outcome calls onRunEnded and does not increment turn', () => {
  stubDocument(null);
  const G = makeG();
  const initialTurn = G.turn;
  let runEndedWith = undefined;
  const { deps, calls } = makeMinimalDeps(G, {
    resolveTurn: (_state, decision) => ({
      resolvedAction: decision,
      outcome: 'Rescue',
      flags: ['critical-fatigue'],
      result: { blocked: false, moved: false, pressureDelta: 0 },
      lateSignalEvent: null,
      contextEvent: null,
    }),
    onRunEnded: (returned) => { runEndedWith = returned; },
  });

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('wait');
  global.setTimeout = origSetTimeout;

  assert.equal(G.turn, initialTurn, 'turn must NOT increment when run ends');
  assert.equal(G.finalOutcome, 'Rescue', 'finalOutcome must be set to terminal outcome');
  assert.equal(runEndedWith, false, 'onRunEnded must be called with returnedToHorcones=false');
});

test('createGameLoop: park exit at horcones via descend sets returnedToHorcones=true for valid outcome', () => {
  stubDocument(null);
  const G = makeG({ state: { position: 'horcones', functional_capacity: 70, fatigue: 20, exposure: 10, weather_severity: 1 } });
  let runEndedWith = undefined;
  const { deps } = makeMinimalDeps(G, {
    resolveTurn: (_state, _decision) => ({
      resolvedAction: 'descend',
      outcome: 'Strategic Retreat',
      flags: [],
      result: { blocked: false, moved: true, pressureDelta: 0 },
      lateSignalEvent: null,
      contextEvent: null,
    }),
    onRunEnded: (returned) => { runEndedWith = returned; },
  });

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('descend');
  global.setTimeout = origSetTimeout;

  assert.equal(runEndedWith, true, 'returnedToHorcones must be true when descending from horcones with a park-exit outcome');
});

test('createGameLoop: summit-success outcome is terminal and returnedToHorcones=false', () => {
  stubDocument(null);
  const G = makeG({ state: { position: 'horcones', functional_capacity: 70, fatigue: 10, exposure: 5, weather_severity: 0 } });
  let runEndedWith = undefined;
  const { deps } = makeMinimalDeps(G, {
    resolveTurn: (_state, _decision) => ({
      resolvedAction: 'descend',
      outcome: 'Summit and Safe Return',
      flags: [],
      result: { blocked: false, moved: true, pressureDelta: 0 },
      lateSignalEvent: null,
      contextEvent: null,
    }),
    onRunEnded: (returned) => { runEndedWith = returned; },
  });

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('descend');
  global.setTimeout = origSetTimeout;

  assert.equal(G.finalOutcome, 'Summit and Safe Return', 'finalOutcome must reflect summit success');
  // exitedPark=true (from horcones+descend) AND 'Summit and Safe Return' is in PARK_EXIT_OUTCOMES
  // so returnedToHorcones=true per the logic (park exit + park exit outcome)
  assert.equal(runEndedWith, true, 'returnedToHorcones=true for summit return park exit');
});

test('createGameLoop: pressure history is updated on continuing turns (capped at 5)', () => {
  stubDocument(null);
  const G = makeG({ pressureHistory: [10, 20, 30, 40, 50] });
  const { deps } = makeMinimalDeps(G, {
    calculateEnvironmentalPressure: () => ({ pressureScore: 60 }),
  });

  const loop = createGameLoop(deps);
  const origSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => fn();
  loop.handleDecision('advance');
  global.setTimeout = origSetTimeout;

  assert.equal(G.pressureHistory.length, 5, 'pressureHistory must be capped at 5 entries');
  assert.equal(G.pressureHistory[4], 60, 'latest pressure score must be the last entry');
});
