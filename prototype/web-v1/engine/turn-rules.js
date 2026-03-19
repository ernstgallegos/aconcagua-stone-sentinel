import { clamp } from './turn-resolution.js';

export function calculateResourceBurnForMinutes({ minutes, burnPerHour, efficiency = 1 }) {
  const hours = minutes / 60;
  const safeEfficiency = Math.max(efficiency || 1, 0.1);
  return {
    waterBurn: Math.max(0, Math.round((burnPerHour?.water || 0) * hours / safeEfficiency)),
    foodBurn: Math.max(0, Math.round((burnPerHour?.food || 0) * hours / safeEfficiency)),
  };
}

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

export function deriveTerminalOutcome({ outcome, state, G, POSITIONS, stage, timeWindows, action, previousPosition, exitedPark = false }) {
  const summitIdx = POSITIONS.indexOf('summit');
  const summited = summitIdx >= 0 && G.highestPosIdx >= summitIdx;
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
