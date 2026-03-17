export function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngChoice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function rngInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
export function rngWeighted(rng, choices, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total, cum = 0;
  for (let i = 0; i < choices.length; i++) { cum += weights[i]; if (r < cum) return choices[i]; }
  return choices[choices.length - 1];
}
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function createTurnEngine(deps) {
  const {
    G,
    POSITIONS,
    CANONICAL_OUTCOMES,
    canUseShootPhoto,
    getActionModifier,
    applyTimeCost,
    spendResourcesForMinutes,
    getCurrentNode,
    getCurrentStage,
    getPersistenceTier,
    calculateEnvironmentalPressure,
    applyBivouacPenalty,
    calculateBodyTolerance,
    calculatePerception,
    applyDecisionWindowDegradation,
    applySummitDifficultyRegressionGuard,
    isCampPosition,
    updateAmbientSignal,
    computeSignals,
    renderNarrative,
  } = deps;

  function evaluateOutcome(pressureDelta, actionMod, state) {
    const effectiveDelta = actionMod.pressureDeltaCap != null
      ? Math.min(pressureDelta, actionMod.pressureDeltaCap)
      : pressureDelta;

    const progressChance = clamp(58 - Math.max(0, effectiveDelta) + actionMod.progress, 4, 92);
    const collapseChance = clamp(Math.max(0, effectiveDelta) * 2 + (100 - state.functional_capacity) * 0.1 + actionMod.collapse, 0, 96);
    const survivalChance = clamp(100 - collapseChance + actionMod.survival, 4, 98);

    const r = G.rng() * 100;
    let outcome;
    if (r < collapseChance) outcome = 'Collapse (Fatigue)';
    else if (r < progressChance) outcome = 'Advance';
    else if (r > survivalChance) outcome = 'Retreat';
    else outcome = 'Hold';

    const nodeIndex = POSITIONS.indexOf(state.position);
    const step = outcome === 'Advance' ? 1 : outcome === 'Retreat' ? -1 : 0;
    const targetIndex = clamp(nodeIndex + step, 0, POSITIONS.length - 1);

    if (targetIndex === POSITIONS.length - 1 && actionMod.progress > 0) outcome = 'High Point Return';

    return {
      outcome,
      targetPosition: POSITIONS[targetIndex],
      pressureDelta,
      effectiveDelta,
      progressChance,
      collapseChance,
      survivalChance,
    };
  }

  function updateState(state, result, action) {
    const actionMod = getActionModifier(action);
    const pressureFactor = clamp((result.effectiveDelta || result.pressureDelta) / 20, 0.5, 2.5);

    state.fatigue = clamp(
      state.fatigue + (actionMod.fatigueDelta * actionMod.fatigueMultiplier * pressureFactor),
      0,
      100
    );
    state.exposure = clamp(
      state.exposure + (actionMod.exposureDelta * actionMod.exposureMultiplier * pressureFactor),
      0,
      100
    );
    state.functional_capacity = clamp(
      state.functional_capacity + actionMod.capacityDelta - (result.effectiveDelta || result.pressureDelta) * 0.18,
      0,
      100
    );

    state.position = result.targetPosition;
    G.highestPosIdx = Math.max(G.highestPosIdx, POSITIONS.indexOf(state.position));
  }

  function resolveTurn(state, action) {
    const flags = [];
    let resolvedAction = action;

    if (resolvedAction === 'shoot_photo') {
      const access = canUseShootPhoto(state);
      if (!access.allowed) {
        flags.push('photo-action-blocked');
        resolvedAction = 'wait';
      }
    }

    let actionMod = getActionModifier(resolvedAction);

    const actionMinutes = applyTimeCost(resolvedAction);
    spendResourcesForMinutes(Math.max(actionMinutes, 30), flags);

    if (resolvedAction !== 'sleep') {
      state.weather_severity = clamp(state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 4);
      state.visibility = clamp(3 - state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 3);
    }

    if (resolvedAction === 'sleep') {
      G.persistenceTurns = 0;
    } else if (getCurrentNode(state).altitudeBand >= 2) {
      G.persistenceTurns += 1;
    }
    state.persistenceTier = getPersistenceTier(G.persistenceTurns);

    let epResult = calculateEnvironmentalPressure(state);
    epResult.pressureScore = applyBivouacPenalty(state, epResult.pressureScore, flags);

    const currentStageForAccl = getCurrentStage();
    const acclNow = G.acclimatization || 0;
    let acclPenaltyApplied = 0;
    if (currentStageForAccl === 'HIGH_CAMP' && acclNow < 20) {
      acclPenaltyApplied = (20 - acclNow) * 0.6;
      epResult.pressureScore += acclPenaltyApplied;
      if (acclNow < 10) flags.push('acclimatization-deficit');
    } else if (currentStageForAccl === 'SUMMIT_DAY' && acclNow < 40) {
      acclPenaltyApplied = (40 - acclNow) * 0.8;
      epResult.pressureScore += acclPenaltyApplied;
      if (acclNow < 20) flags.push('acclimatization-deficit');
    }

    const BT = calculateBodyTolerance(state);
    const pressureDelta = epResult.pressureScore - BT;
    const perception = calculatePerception({ state, EP: epResult.pressureScore, BT, pressureDelta });

    let lateSignalEvent = null;
    if (perception.latency?.active && perception.latency.activationRatio >= 0.75 && pressureDelta >= 18) {
      lateSignalEvent = {
        turn: G.turn,
        stage: getCurrentStage(),
        activationRatio: Number(perception.latency.activationRatio.toFixed(2)),
        pressureDelta: Number(pressureDelta.toFixed(2)),
        readability: perception.latency.readabilityLabel,
        gates: {
          pressureGate: perception.latency.pressureGate,
          stageGate: perception.latency.stageGate,
          timeGate: perception.latency.timeGate,
        },
      };
      G.lateSignalDeterminantTurns += 1;
      G.lateSignalEvents.push(lateSignalEvent);
      flags.push('late-signal-lock-in');
    }

    let photoEffectApplied = null;
    if (resolvedAction === 'shoot_photo') {
      const confidenceGain = Math.min(actionMod.photoConfidenceGain || 6, 8);
      const uncertaintyDrop = Math.min(actionMod.photoUncertaintyDrop || 4, 6);
      if (actionMod.photoTrendAssist) {
        const trendMap = { 'worsening fast': 'worsening', worsening: 'worsening', easing: 'easing', steady: 'steady' };
        perception.trendEstimate = trendMap[perception.trendEstimate] || perception.trendEstimate;
      }
      perception.confidenceLevel = clamp(perception.confidenceLevel + confidenceGain, 5, 98);
      perception.noiseLevel = clamp(perception.noiseLevel - uncertaintyDrop, 0, 35);

      G.photoShotsTaken += 1;
      G.lastPhotoTurn = G.turn;
      G.photoInsightTurns = Math.max(G.photoInsightTurns, actionMod.photoInsightTurns || 2);
      G.photoLastEffectLabel = 'Frame review improved route reading confidence.';

      photoEffectApplied = {
        confidenceBoost: confidenceGain,
        uncertaintyDrop,
        trendAssist: !!actionMod.photoTrendAssist,
        insightTurnsGranted: actionMod.photoInsightTurns || 2,
        shotsUsed: G.photoShotsTaken,
      };
    } else if (G.photoInsightTurns > 0) {
      G.photoInsightTurns = Math.max(0, G.photoInsightTurns - 1);
    }

    if (resolvedAction !== 'shoot_photo' && G.photoInsightTurns > 0) {
      actionMod = {
        ...actionMod,
        fatigueMultiplier: Math.max(0.75, (actionMod.fatigueMultiplier || 1) - 0.05),
      };
    }

    const decisionAdjusted = applyDecisionWindowDegradation(actionMod, perception);
    actionMod = decisionAdjusted.actionMod;
    const timedPerception = decisionAdjusted.perception;
    if (decisionAdjusted.effect.exceeded) flags.push('decision-window-exceeded');

    const summitRegression = applySummitDifficultyRegressionGuard({
      stage: currentStageForAccl,
      acclPenalty: acclPenaltyApplied,
      decisionEffect: decisionAdjusted.effect,
      pressureDelta,
    });
    if (summitRegression.acclPenaltyCapped) {
      epResult.pressureScore -= Math.max(0, acclPenaltyApplied - summitRegression.acclPenaltyApplied);
      acclPenaltyApplied = summitRegression.acclPenaltyApplied;
    }
    let finalPressureDelta = pressureDelta;
    if (summitRegression.pressureDeltaCapped) {
      finalPressureDelta = summitRegression.pressureDeltaApplied;
      flags.push('summit-difficulty-guard');
    }

    const result = evaluateOutcome(finalPressureDelta, actionMod, state);
    updateState(state, result, resolvedAction);

    let outcome = result.outcome;
    const outsideCamp = !isCampPosition(state.position);
    if (state.functional_capacity <= 5 || state.exposure >= 99) outcome = 'Fatality';
    else if (state.fatigue >= 100) outcome = outsideCamp ? 'Rescue' : 'Collapse (Fatigue)';
    else if (state.position === 'horcones' && G.highestPosIdx >= POSITIONS.indexOf('camp_colera')) outcome = 'High Point Return';

    if (!CANONICAL_OUTCOMES.has(outcome) && outcome !== 'Strategic Retreat') outcome = 'Strategic Retreat';

    if (state.functional_capacity < 30) flags.push('critical-fatigue');
    if (state.exposure > 70) flags.push('critical-exposure');
    if (state.water <= 0) flags.push('water-depletion');
    if (state.food <= 0) flags.push('food-depletion');
    if (state.fatigue >= 100 || state.exposure >= 99 || state.functional_capacity <= 5) flags.push('fatality-threshold');

    updateAmbientSignal(flags, resolvedAction);
    const signals = computeSignals();
    const narrative = renderNarrative(resolvedAction, signals, flags);

    return { result, outcome, flags, signals, narrative, resolvedAction, timedPerception, photoEffectApplied, lateSignalEvent, decisionWindowEffect: decisionAdjusted.effect };
  }

  return { resolveTurn, evaluateOutcome, updateState };
}
