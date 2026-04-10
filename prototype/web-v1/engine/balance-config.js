// engine/balance-config.js
//
// Centralized balance constants for the turn-resolution pipeline.
// These values were previously embedded as magic numbers in evaluateOutcome().
//
// Change any value here to tune the engine without editing resolution logic.
// After any change, run `npm test` to verify tuning-guardrails pass.

/** Base probability of forward progress before pressure/action modifiers. */
export const PROGRESS_BASE = 58;

/** Minimum allowed progress chance after clamping. */
export const PROGRESS_MIN = 4;

/** Maximum allowed progress chance after clamping. */
export const PROGRESS_MAX = 92;

/** Multiplier applied to effectiveDelta when computing collapse chance. */
export const COLLAPSE_PRESSURE_SCALER = 1.2;

/** Weight of functional-capacity deficit in the collapse formula. */
export const COLLAPSE_CAPACITY_WEIGHT = 0.1;

/** Maximum allowed collapse chance after clamping. */
export const COLLAPSE_MAX = 96;

/** Minimum survival chance floor. */
export const SURVIVAL_MIN = 4;

/** Maximum survival chance ceiling. */
export const SURVIVAL_MAX = 98;
