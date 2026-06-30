/**
 * Outcome Classification — determines terminal game endings.
 * Terminal outcomes end the expedition and lead to debrief.
 */

/** All canonical terminal outcomes from data/outcomes.json */
export const TERMINAL_OUTCOMES = {
  SUMMIT_SAFE_RETURN: 'Summit and Safe Return',
  HIGH_POINT_RETURN: 'High Point Return',
  STRATEGIC_RETREAT: 'Strategic Retreat',
  RESCUE: 'Rescue',
  COLLAPSE_FATIGUE: 'Collapse (Fatigue)',
  COLLAPSE_EXPOSURE: 'Collapse (Exposure)',
  RESOURCE_EXHAUSTION: 'Resource Exhaustion',
  EXPEDITION_WINDOW_CLOSED: 'Expedition Window Closed',
  PERMIT_EXPIRED: 'Permit Expired',
  FATALITY: 'Fatality'
};

/**
 * Classify whether the current state triggers a terminal outcome.
 * Order matters: check precedence from most specific to general.
 *
 * @param {object} state - Updated game state after turn
 * @param {object[]} nodes - Route nodes array
 * @returns {string|null} Terminal outcome or null (continue)
 */
export function classifyTerminalOutcome(state, nodes) {
  // --- SUCCESS: Summit and Safe Return ---
  // Must have summited AND returned to park exit (positionIndex 0 = Horcones)
  if (state.hasSummited && state.positionIndex <= 0) {
    return TERMINAL_OUTCOMES.SUMMIT_SAFE_RETURN;
  }

  // --- FATALITY: extreme condition ---
  if (state.body.functionalCapacity <= 0 && state.body.fatigue >= 95 && state.body.exposure >= 90) {
    return TERMINAL_OUTCOMES.FATALITY;
  }

  // --- COLLAPSE (Fatigue) ---
  if (state.body.functionalCapacity <= 5 && state.body.fatigue >= 80) {
    return TERMINAL_OUTCOMES.COLLAPSE_FATIGUE;
  }

  // --- COLLAPSE (Exposure) ---
  if (state.body.functionalCapacity <= 5 && state.body.exposure >= 75) {
    return TERMINAL_OUTCOMES.COLLAPSE_EXPOSURE;
  }

  // --- RESCUE: high risk state + some capacity remaining ---
  if (state.body.functionalCapacity <= 15 && state.body.fatigue >= 70) {
    return TERMINAL_OUTCOMES.RESCUE;
  }

  // --- RESOURCE EXHAUSTION ---
  if (state.resources.water <= 0 && state.resources.food <= 0) {
    return TERMINAL_OUTCOMES.RESOURCE_EXHAUSTION;
  }

  // --- PERMIT EXPIRED ---
  if (state.permitDay > (state.permitMaxDays || 20)) {
    return TERMINAL_OUTCOMES.PERMIT_EXPIRED;
  }

  // --- EXPEDITION WINDOW CLOSED (max turns) ---
  if (state.turn >= state.maxTurns) {
    // If at park exit, check for outcomes
    if (state.positionIndex <= 0) {
      if (state.hasSummited) return TERMINAL_OUTCOMES.SUMMIT_SAFE_RETURN;
      if (state.highestPositionIndex >= 8) return TERMINAL_OUTCOMES.HIGH_POINT_RETURN;
      return TERMINAL_OUTCOMES.STRATEGIC_RETREAT;
    }
    return TERMINAL_OUTCOMES.EXPEDITION_WINDOW_CLOSED;
  }

  // --- STRATEGIC RETREAT: arrived back at park exit without summit ---
  if (state.positionIndex <= 0 && state.turn > 1 && !state.hasSummited) {
    if (state.highestPositionIndex >= 8) return TERMINAL_OUTCOMES.HIGH_POINT_RETURN;
    return TERMINAL_OUTCOMES.STRATEGIC_RETREAT;
  }

  // Continue playing
  return null;
}

/**
 * Check if an outcome unlocks Part 2.
 */
export function unlocksPartTwo(outcome) {
  return outcome === TERMINAL_OUTCOMES.SUMMIT_SAFE_RETURN;
}

/**
 * Get outcome metadata for debrief display.
 */
export function getOutcomeMetadata(outcome) {
  const metadata = {
    [TERMINAL_OUTCOMES.SUMMIT_SAFE_RETURN]: {
      emoji: '🏔️',
      label: 'Summit & Safe Return',
      tone: 'triumph',
      description: 'You reached the summit of Aconcagua and returned safely to the park entrance.',
      unlocksPartTwo: true
    },
    [TERMINAL_OUTCOMES.HIGH_POINT_RETURN]: {
      emoji: '⛰️',
      label: 'High Point Return',
      tone: 'bittersweet',
      description: 'You reached a significant altitude and made the wise choice to descend safely.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.STRATEGIC_RETREAT]: {
      emoji: '🧭',
      label: 'Strategic Retreat',
      tone: 'respect',
      description: 'You read the mountain correctly and chose to descend before conditions deteriorated.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.RESCUE]: {
      emoji: '🚁',
      label: 'Rescue',
      tone: 'somber',
      description: 'Emergency extraction was required. Your body reached its absolute limit.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.COLLAPSE_FATIGUE]: {
      emoji: '💔',
      label: 'Collapse — Fatigue',
      tone: 'grave',
      description: 'Accumulated exhaustion overwhelmed your body. The mountain demanded more than you could give.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.COLLAPSE_EXPOSURE]: {
      emoji: '🥶',
      label: 'Collapse — Exposure',
      tone: 'grave',
      description: 'Prolonged exposure to extreme conditions proved too much. The cold won.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.RESOURCE_EXHAUSTION]: {
      emoji: '🫗',
      label: 'Resource Exhaustion',
      tone: 'somber',
      description: 'Water and food depleted. Without essential resources, the body cannot function at altitude.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.EXPEDITION_WINDOW_CLOSED]: {
      emoji: '⏳',
      label: 'Expedition Window Closed',
      tone: 'resigned',
      description: 'The weather window closed. The mountain dictates its own schedule.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.PERMIT_EXPIRED]: {
      emoji: '📋',
      label: 'Permit Expired',
      tone: 'bureaucratic',
      description: 'The 20-day provincial park permit has expired. Rangers require evacuation.',
      unlocksPartTwo: false
    },
    [TERMINAL_OUTCOMES.FATALITY]: {
      emoji: '⚫',
      label: 'Fatality',
      tone: 'tragic',
      description: 'The mountain claimed another life. Some risks cannot be undone.',
      unlocksPartTwo: false
    }
  };

  return metadata[outcome] || { emoji: '❓', label: outcome, tone: 'neutral', description: '', unlocksPartTwo: false };
}
