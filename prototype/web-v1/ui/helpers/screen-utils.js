/**
 * screen-utils.js
 *
 * Pure utility functions extracted from screens.js for testability.
 * These functions have no side-effects and carry no dependency on the DOM
 * or the global G state object, making them safe to import in unit tests.
 *
 * NOTE: Keep this file free of DOM access, G state reads, and module-level
 * side-effects so the characterization test suite can run in Node without
 * a browser environment.
 */

// ── Time formatting ─────────────────────────────────────────────────────────

/**
 * Converts an absolute minute value into a zero-padded HH:MM string.
 * Values outside [0, 1440) are wrapped via modulo so the result always
 * represents a valid time-of-day.
 *
 * @param {number} minutes - Absolute minutes (may be negative or > 1440).
 * @returns {string} e.g. "06:30", "00:00", "23:59"
 */
export function formatMinutes(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Returns a Unicode arrow character representing the direction of change
 * for a numeric delta.  Values of exactly ±1 are treated as "no change".
 *
 * @param {number} delta
 * @returns {'↑'|'↓'|'↔'}
 */
export function formatTrendArrow(delta) {
  if (delta > 1) return '↑';
  if (delta < -1) return '↓';
  return '↔';
}

// ── Perception / confidence ──────────────────────────────────────────────────

/**
 * Maps a numeric confidence score to a three-level label used by the watch
 * display and perception system.
 *
 * @param {number} conf - Confidence value (0–100).
 * @returns {'high'|'med'|'low'}
 */
export function confidenceTier(conf) {
  if (conf >= 70) return 'high';
  if (conf >= 45) return 'med';
  return 'low';
}

// ── Time-of-day bucket ───────────────────────────────────────────────────────

/**
 * Classifies a minute-of-day value into one of six named time windows used
 * by the decision-window and environmental-pressure systems.
 *
 * Bucket boundaries (minutes):
 *   night    [0, 360)
 *   early    [360, 480)
 *   optimal  [480, 900)
 *   late     [900, 1080)
 *   dusk     [1080, 1320)
 *   night    [1320, 1440)
 *
 * @param {number} minutesOfDay - Value in [0, 1440).
 * @returns {'night'|'early'|'optimal'|'late'|'dusk'}
 */
export function getTimeOfDayBucket(minutesOfDay) {
  if (minutesOfDay < 360) return 'night';
  if (minutesOfDay < 480) return 'early';
  if (minutesOfDay < 900) return 'optimal';
  if (minutesOfDay < 1080) return 'late';
  if (minutesOfDay < 1320) return 'dusk';
  return 'night';
}

// ── Persistence tiers ────────────────────────────────────────────────────────

/**
 * Maps a consecutive-pressure-turn count to a descriptive severity label
 * used by the watch band and signal interpretation system.
 *
 * @param {number} turns - Number of consecutive turns under pressure.
 * @returns {'critical'|'severe'|'cumulative'|'sustained'|'fresh'}
 */
export function getPersistenceTier(turns) {
  if (turns >= 8) return 'critical';
  if (turns >= 6) return 'severe';
  if (turns >= 4) return 'cumulative';
  if (turns >= 2) return 'sustained';
  return 'fresh';
}

// ── Outcome classification ───────────────────────────────────────────────────

/**
 * Maps a canonical outcome label to its CSS modifier class used on the
 * debrief screen.  Unknown labels fall back to 'outcome-retreat'.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const OUTCOME_CLASS_MAP = Object.freeze({
  'Summit and Safe Return': 'outcome-success',
  'High Point Return': 'outcome-retreat',
  'Strategic Retreat': 'outcome-retreat',
  'Rescue': 'outcome-collapse',
  'Collapse (Fatigue)': 'outcome-collapse',
  'Collapse (Exposure)': 'outcome-collapse',
  'Resource Exhaustion': 'outcome-collapse',
  'Expedition Window Closed': 'outcome-stabilized',
  'Fatality': 'outcome-collapse',
});

/**
 * Returns the CSS modifier class for a given outcome label.
 *
 * @param {string|null|undefined} finalOutcome
 * @returns {string} CSS class string
 */
export function getOutcomeClass(finalOutcome) {
  return OUTCOME_CLASS_MAP[finalOutcome] || 'outcome-retreat';
}

// ── Body state labels ────────────────────────────────────────────────────────

/**
 * Maps a CSS-modifier class based on a body-state label string.
 * Used by the watch panel to apply color-coding to body metric rows.
 *
 * @param {string} label - One of the values produced by capacityLabel / fatigueLabel / exposureLabel.
 * @returns {'critical'|'degrading'|'stable'}
 */
export function bodyValueClass(label) {
  if (['Critical', 'Exhausted', 'High'].includes(label)) return 'critical';
  if (['Degraded', 'Heavy', 'Moderate'].includes(label)) return 'degrading';
  return 'stable';
}

/**
 * Human-readable label for a functional-capacity value.
 *
 * @param {number} v - Capacity score (0–100).
 * @returns {'Excellent'|'Good'|'Strained'|'Degraded'|'Critical'}
 */
export function capacityLabel(v) {
  if (v >= 85) return 'Excellent';
  if (v >= 65) return 'Good';
  if (v >= 45) return 'Strained';
  if (v >= 25) return 'Degraded';
  return 'Critical';
}

/**
 * Human-readable label for a fatigue value.
 *
 * @param {number} v - Fatigue score (0–100).
 * @returns {'Fresh'|'Tired'|'Heavy'|'Exhausted'|'Critical'}
 */
export function fatigueLabel(v) {
  if (v <= 15) return 'Fresh';
  if (v <= 35) return 'Tired';
  if (v <= 55) return 'Heavy';
  if (v <= 79) return 'Exhausted';
  return 'Critical';
}

/**
 * Human-readable label for an exposure value.
 *
 * @param {number} v - Exposure score (0–100).
 * @returns {'Minimal'|'Low'|'Moderate'|'High'|'Critical'}
 */
export function exposureLabel(v) {
  if (v <= 15) return 'Minimal';
  if (v <= 35) return 'Low';
  if (v <= 54) return 'Moderate';
  if (v <= 74) return 'High';
  return 'Critical';
}

// ── Pressure labels ──────────────────────────────────────────────────────────

/**
 * Maps a pressure delta (EP minus BT) to a human-readable zone label used by
 * the watch display and debrief analytics.
 *
 * @param {number} delta
 * @returns {string}
 */
export function pressureDeltaLabel(delta) {
  if (delta <= -15) return 'Favorable conditions';
  if (delta <= 10) return 'Demanding conditions';
  if (delta <= 30) return 'Overexertion zone';
  return 'Mountain refusal zone';
}

/**
 * Maps a raw EP pressure score to a named severity band used by the watch
 * display and turn log.
 *
 * @param {number} score
 * @returns {string}
 */
export function pressureBandLabel(score) {
  if (score <= 25) return 'Low';
  if (score <= 45) return 'Manageable';
  if (score <= 65) return 'Severe';
  if (score <= 85) return 'Very Severe';
  return 'Extreme';
}

// ── Navigation gate ──────────────────────────────────────────────────────────

/**
 * Resolves the actual navigation target given a requested screen ID,
 * enforcing the Part 2 access gate.
 *
 * Part 2 screens are only reachable when the player has previously summited
 * (stored flag) or the current run ended with 'Summit and Safe Return'.
 * Any other attempt to reach a Part 2 screen is silently redirected to
 * 'debrief'.
 *
 * @param {string} requestedId - The screen ID the caller wants to navigate to.
 * @param {object} opts
 * @param {string|null}  opts.finalOutcome    - Current run final outcome (may be null).
 * @param {boolean}      opts.hasSummited     - Whether a previous run achieved summit.
 * @param {Set<string>}  opts.part2ScreenIds  - Set of all Part 2 screen IDs.
 * @returns {string} The screen ID that should actually be activated.
 */
export function resolveNavigationTarget(requestedId, { finalOutcome, hasSummited, part2ScreenIds }) {
  const canAccessPart2 = finalOutcome === 'Summit and Safe Return' || hasSummited;
  if (part2ScreenIds.has(requestedId) && !canAccessPart2) return 'debrief';
  return requestedId;
}
