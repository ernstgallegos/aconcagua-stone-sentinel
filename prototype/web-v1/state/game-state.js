const RUN_STATE_DEFAULTS = Object.freeze({
  character: null,
  scenario: null,
  difficulty: 'standard',
  seed: null,
  rng: null,
  state: null,
  turn: 1,
  turnLog: [],
  highestPosIdx: 0,
  allFlags: [],
  signals: null,
  consecutiveWater0: 0,
  consecutiveCollapses: 0,
  runNumber: 0,
  whiteWindRisk: 0,
  day: 1,
  minutesOfDay: 360,
  irreversibleTriggered: false,
  irreversibleTurn: null,
  acclimatization: 0,
  consecutiveAdvances: 0,
  persistenceTurns: 0,
  pressureHistory: [],
  hasSummited: false,
  finalOutcome: 'Strategic Retreat',
  permitDay: 1,
  permitMaxDays: 20,
  photoShotsTaken: 0,
  photoInsightTurns: 0,
  lastPhotoTurn: -99,
  photoLastEffectLabel: '',
  lateSignalDeterminantTurns: 0,
  lateSignalEvents: [],
});

const UI_STATE_DEFAULTS = Object.freeze({
  tutorialSeen: {},
  journalReturnScreen: 'debrief',
  onboardingLayer: 'essentials',
  currentPrimaryAlert: { label: 'stable', level: 'stable', type: 'stable' },
  modelReady: false,
});

const TELEMETRY_STATE_DEFAULTS = Object.freeze({
  runLogRecords: [],
  turnDecisionStartedAt: 0,
  decisionTimeSpentMs: 0,
  decisionWindowExceeded: false,
  decisionWindowEffect: null,
  decisionWindowProfile: null,
});

const SLICE_DEFS = {
  runState: RUN_STATE_DEFAULTS,
  uiState: UI_STATE_DEFAULTS,
  telemetryState: TELEMETRY_STATE_DEFAULTS,
};

const KEY_TO_SLICE = Object.freeze(
  Object.entries(SLICE_DEFS).reduce((acc, [sliceName, defaults]) => {
    Object.keys(defaults).forEach((key) => {
      acc[key] = sliceName;
    });
    return acc;
  }, {})
);

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSlices() {
  return {
    runState: cloneValue(RUN_STATE_DEFAULTS),
    uiState: cloneValue(UI_STATE_DEFAULTS),
    telemetryState: cloneValue(TELEMETRY_STATE_DEFAULTS),
  };
}

function ensureAllowedKeys(partial, defaults, sliceName) {
  Object.keys(partial).forEach((key) => {
    if (!(key in defaults)) {
      throw new Error(`Unknown ${sliceName} key: ${key}`);
    }
  });
}

function applySliceUpdate(targetSlice, defaults, partial, sliceName) {
  ensureAllowedKeys(partial, defaults, sliceName);
  Object.entries(partial).forEach(([key, value]) => {
    targetSlice[key] = value == null && defaults[key] !== null ? cloneValue(defaults[key]) : value;
  });
}

function registerLegacyFacade(state) {
  Object.entries(KEY_TO_SLICE).forEach(([key, sliceName]) => {
    if (Object.prototype.hasOwnProperty.call(state, key)) return;
    Object.defineProperty(state, key, {
      enumerable: true,
      configurable: false,
      get() {
        return state[sliceName][key];
      },
      set(value) {
        state[sliceName][key] = value;
      },
    });
  });
}

export function createInitialGameState() {
  const state = createSlices();
  registerLegacyFacade(state);
  return state;
}

export function updateRunState(state, partial) {
  applySliceUpdate(state.runState, RUN_STATE_DEFAULTS, partial, 'runState');
}

export function updateUIState(state, partial) {
  applySliceUpdate(state.uiState, UI_STATE_DEFAULTS, partial, 'uiState');
}

export function recordTelemetry(state, partial) {
  applySliceUpdate(state.telemetryState, TELEMETRY_STATE_DEFAULTS, partial, 'telemetryState');
}

export function assertStateShape(state, context, options = {}) {
  const { throwOnError = false } = options;
  const issues = [];

  Object.entries(SLICE_DEFS).forEach(([sliceName, defaults]) => {
    const slice = state[sliceName];
    if (!slice || typeof slice !== 'object') {
      issues.push(`Missing slice: ${sliceName}`);
      return;
    }

    Object.keys(defaults).forEach((key) => {
      if (!(key in slice)) issues.push(`Missing ${sliceName}.${key}`);
    });

    Object.keys(slice).forEach((key) => {
      if (!(key in defaults)) issues.push(`Unexpected ${sliceName}.${key}`);
    });
  });

  if (issues.length) {
    const message = `[state-assert:${context}] ${issues.join('; ')}`;
    if (throwOnError) throw new Error(message);
    console.warn(message);
    return false;
  }
  return true;
}

export const G = createInitialGameState();
