import { clamp } from './turn-resolution.js';

/**
 * Calculates the resource burn for a given number of action minutes.
 *
 * Resource consumption is fractional to avoid integer-rounding artifacts
 * in long expeditions. Callers should track fractional carry-over or
 * present rounded values to the player.
 *
 * @param {object} params
 * @param {number} params.minutes - Duration of the action in minutes.
 * @param {{ water: number, food: number }} params.burnPerHour - Hourly consumption rates for each resource.
 * @param {number} [params.efficiency=1] - Resource efficiency multiplier (>1 = consumes less, clamped to min 0.1).
 * @returns {{ waterBurn: number, foodBurn: number }} Fractional resource burn amounts (never negative).
 */
export function calculateResourceBurnForMinutes({ minutes, burnPerHour, efficiency = 1 }) {
  const hours = minutes / 60;
  const safeEfficiency = Math.max(efficiency || 1, 0.1);
  const waterRaw = (burnPerHour?.water || 0) * hours / safeEfficiency;
  const foodRaw = (burnPerHour?.food || 0) * hours / safeEfficiency;
  return {
    waterBurn: Math.max(0, Number(waterRaw.toFixed(2))),
    foodBurn: Math.max(0, Number(foodRaw.toFixed(2))),
  };
}

/**
 * Applies decision-window degradation penalties to action modifiers and perception.
 *
 * When a player takes too long to decide (overMs > 0), fatigue and exposure
 * multipliers increase, and confidence/noise levels degrade. All penalties are
 * capped by guardrail thresholds to prevent runaway effects during stressful turns.
 *
 * @param {object} params
 * @param {object} params.actionMod - Current action modifier to adjust.
 * @param {object} params.perception - Current perception state to adjust.
 * @param {object} params.windowState - Decision-window timing state (effectiveElapsed, overMs, stepsOver, overRatio).
 * @param {object} params.guardrails - Per-character guardrails (maxTimingActionPenalty, maxTimingConfidencePenalty, maxTimingNoiseIncrease).
 * @param {string} params.stage - Current expedition stage (for telemetry context).
 * @returns {{ actionMod: object, perception: object, effect: object }} Adjusted modifiers and a structured effect record.
 */
export function applyDecisionWindowDegradationRule({ actionMod, perception, windowState, guardrails, stage }) {
  const actionPenaltyCap = clamp(guardrails?.maxTimingActionPenalty ?? 0.16, 0.06, 0.2);
  const confidencePenaltyCap = clamp(guardrails?.maxTimingConfidencePenalty ?? 12, 4, 16);
  const noiseIncreaseCap = clamp(guardrails?.maxTimingNoiseIncrease ?? 8, 2, 10);

  const effect = {
    elapsedMs: windowState.effectiveElapsed,
    windowMs: windowState.profile.totalWindowMs,
    exceeded: windowState.overMs > 0,
    overMs: windowState.overMs,
    overSteps: windowState.stepsOver,
    stage,
    actionPenalty: 0,
    confidencePenalty: 0,
    noiseIncrease: 0,
    capped: false,
  };

  if (windowState.overMs <= 0) {
    return { actionMod, perception, effect };
  }

  const stepCap = Math.min(4, windowState.stepsOver + 1);
  const actionPenaltyRaw = stepCap * 0.04;
  const confidencePenaltyRaw = stepCap * 3;
  const noiseIncreaseRaw = stepCap * 2;

  const actionPenalty = Math.min(actionPenaltyRaw, actionPenaltyCap);
  const confidencePenalty = Math.min(confidencePenaltyRaw, confidencePenaltyCap);
  const noiseIncrease = Math.min(noiseIncreaseRaw, noiseIncreaseCap);

  const adjustedActionMod = {
    ...actionMod,
    fatigueMultiplier: (actionMod.fatigueMultiplier || 1) + actionPenalty,
    exposureMultiplier: (actionMod.exposureMultiplier || 1) + Math.max(0.02, actionPenalty * 0.7),
  };
  const adjustedPerception = {
    ...perception,
    confidenceLevel: clamp(perception.confidenceLevel - confidencePenalty, 5, 98),
    noiseLevel: clamp(perception.noiseLevel + noiseIncrease, 0, 40),
  };

  if (windowState.overRatio >= 0.8 && adjustedPerception.trendEstimate === 'steady') {
    adjustedPerception.trendEstimate = 'uncertain';
  }

  effect.actionPenalty = Number(actionPenalty.toFixed(3));
  effect.confidencePenalty = confidencePenalty;
  effect.noiseIncrease = noiseIncrease;
  effect.capped = actionPenalty !== actionPenaltyRaw || confidencePenalty !== confidencePenaltyRaw || noiseIncrease !== noiseIncreaseRaw;

  return { actionMod: adjustedActionMod, perception: adjustedPerception, effect };
}

/**
 * Derives the terminal outcome for a turn based on current game state.
 *
 * Outcome precedence (highest to lowest):
 * 1. Park exit (descend from horcones) → Summit and Safe Return / High Point Return / Strategic Retreat
 * 2. Permit expired → Permit Expired
 * 3. Late summit-day start → Expedition Window Closed
 * 4. Turn outcome (from evaluateOutcome pipeline) → pass-through
 *
 * This function is pure: it reads state but never mutates it.
 *
 * @param {object} params
 * @param {string} params.outcome - Raw outcome from the turn pipeline (e.g. 'Strategic Retreat').
 * @param {object} params.state - Current game state.
 * @param {object} params.G - Run-level global state (hasSummited, highestPosIdx, permitDay, permitMaxDays, minutesOfDay).
 * @param {string[]} params.POSITIONS - Ordered position array from route data.
 * @param {string} params.stage - Current expedition stage.
 * @param {object} params.timeWindows - Time-window config (summitLateStart).
 * @param {string} params.action - Action taken this turn.
 * @param {string} params.previousPosition - Position at the start of this turn.
 * @param {boolean} [params.exitedPark=false] - Whether an explicit park-exit flag was raised.
 * @returns {string} Terminal outcome string.
 */
export function deriveTerminalOutcome({ outcome, state, G, POSITIONS, stage, timeWindows, action, previousPosition, exitedPark = false }) {
  const summitIdx = POSITIONS.indexOf('summit');
  const summited = Boolean(G.hasSummited) || (summitIdx >= 0 && G.highestPosIdx >= summitIdx);
  const explicitParkExit = exitedPark || (previousPosition === 'horcones' && action === 'descend');

  if (explicitParkExit) {
    if (summited) return 'Summit and Safe Return';
    if (G.highestPosIdx >= POSITIONS.indexOf('camp_colera')) return 'High Point Return';
    return 'Strategic Retreat';
  }

  if (G.permitDay > G.permitMaxDays) return 'Permit Expired';

  const summitLateStart = timeWindows?.summitLateStart;
  if (action !== 'descend' && stage === 'SUMMIT_DAY' && summitLateStart != null && G.minutesOfDay >= summitLateStart) {
    return 'Expedition Window Closed';
  }

  return outcome;
}
