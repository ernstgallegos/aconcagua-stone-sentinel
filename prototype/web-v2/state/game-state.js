/**
 * Game State — centralized state management for the expedition.
 * Provides initial state factory, state reset, and Part 2 persistence.
 */

const PERMIT_MAX_DAYS = 20;
const SUMMIT_ACHIEVED_KEY = 'aconcagua_summit_achieved_v2';

/**
 * Create initial game state for a new expedition.
 * @param {object} character - Selected character data
 * @param {object} scenario - Selected scenario data
 * @returns {object} Initial game state
 */
export function createInitialState(character, scenario) {
  const seeds = scenario.seeds || [42000];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];
  const initial = scenario.initial || {};
  const diffMods = scenario.difficultyModifiers || {};

  return {
    // Meta
    turn: 0,
    day: 1,
    timeOfDay: 360, // 06:00
    seed,
    maxTurns: scenario.max_turns || scenario.maxTurns || 50,

    // Position
    positionIndex: 0,
    highestPositionIndex: 0,
    hasSummited: false,

    // Character
    character,

    // Body state
    body: {
      functionalCapacity: (initial.functional_capacity || 90) + (diffMods.initialCapacityBonus || 0),
      fatigue: initial.fatigue || 10,
      exposure: initial.exposure || 5,
      acclimatization: 5 + (diffMods.acclimatizationBonus || 0) * 0.2,
      persistenceTurns: 0
    },

    // Resources
    resources: {
      water: (initial.water || 24) + (diffMods.initialWaterBonus || 0),
      food: (initial.food || 20) + (diffMods.initialFoodBonus || 0)
    },

    // Weather
    weather: {
      windSpeed: initial.weather_severity || 1,
      visibility: initial.visibility || 3,
      precipitation: 0
    },

    // Permit
    permitDay: 1,
    permitMaxDays: PERMIT_MAX_DAYS + (diffMods.permitDaysBonus || 0),

    // Events tracking
    firedEvents: [],
    firedCharEvents: {},
    charEventCooldowns: {},
    lastEventNarrative: null,
    lastCharEventNarrative: null,

    // Run log
    turnHistory: []
  };
}

/**
 * Check if Part 2 is unlocked (persisted in localStorage).
 */
export function isPartTwoUnlocked() {
  try {
    return localStorage.getItem(SUMMIT_ACHIEVED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist Part 2 unlock.
 */
export function unlockPartTwo() {
  try {
    localStorage.setItem(SUMMIT_ACHIEVED_KEY, 'true');
  } catch {
    // Silent fail if localStorage unavailable
  }
}

/**
 * Get available actions for current state.
 * @param {object} state - Current game state
 * @param {object} node - Current route node
 * @returns {string[]} List of valid action IDs
 */
export function getAvailableActions(state, node) {
  const actions = [];

  // At summit: only descend, wait, sleep
  if (node.routeIndex >= 14) {
    actions.push('wait', 'descend');
    if (node.isCamp) actions.push('sleep');
    return actions;
  }

  // Standard actions
  actions.push('advance', 'advance_slowly', 'wait', 'descend');

  // Sleep only at camps
  if (node.isCamp) {
    actions.push('sleep');
  }

  // Daniela's shoot_photo (special action)
  if (state.character.id === 'daniela') {
    actions.push('shoot_photo');
  }

  // Can't descend below start
  if (state.positionIndex <= 0) {
    const idx = actions.indexOf('descend');
    if (idx >= 0) actions.splice(idx, 1);
  }

  return actions;
}

/**
 * Format time of day from minutes to HH:MM string.
 */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get stage label from node.
 */
export function getStageLabel(node) {
  return node.stage || node.stageHint || 'APPROACH';
}
