// State management for web-v2. Mirrors the v1 slice architecture but simplified for ES module use.

export const RUN_STATE_DEFAULTS = Object.freeze({
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

export function createInitialGameState() {
  return JSON.parse(JSON.stringify(RUN_STATE_DEFAULTS));
}

export function updateRunState(G, partial) {
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in RUN_STATE_DEFAULTS)) {
      console.warn(`[updateRunState] Unknown key: ${key}`);
      continue;
    }
    G[key] = value;
  }
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function assertStateShape(G, context) {
  const issues = [];
  for (const key of Object.keys(RUN_STATE_DEFAULTS)) {
    if (!(key in G)) issues.push(`Missing key: ${key}`);
  }
  if (G.state && typeof G.state !== 'object') issues.push('state must be object');
  if (issues.length) {
    console.warn(`[assertStateShape:${context}] ${issues.join('; ')}`);
    return false;
  }
  return true;
}
