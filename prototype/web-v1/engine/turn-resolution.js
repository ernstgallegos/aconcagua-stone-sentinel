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

export const RESOLVE_TURN_PIPELINE = Object.freeze([
  'normalize-action',
  'consume-time-and-resources',
  'apply-weather-and-persistence',
  'compute-pressure-and-perception',
  'apply-decision-window-effects',
  'evaluate-outcome',
  'update-state',
  'classify-terminal-outcome',
  'emit-signals-and-narrative',
]);

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
    deriveTerminalOutcome,
    getTimeWindows,
    updateRunState,
    recordTelemetry,
    assertStateShape,
    applyContextEvents,
  } = deps;

  function markStage(trace, stage) {
    if (trace) trace.push(stage);
  }

  function evaluateOutcome(pressureDelta, actionMod, state, context = {}) {
    const effectiveDelta = actionMod.pressureDeltaCap != null
      ? Math.min(pressureDelta, actionMod.pressureDeltaCap)
      : pressureDelta;

    const progressChance = clamp(58 - Math.max(0, effectiveDelta) + actionMod.progress, 4, 92);
    const collapseChance = clamp(Math.max(0, effectiveDelta) * 1.2 + (100 - state.functional_capacity) * 0.1 + actionMod.collapse, 0, 96);
    const survivalChance = clamp(100 - collapseChance + actionMod.survival, 4, 98);

    const nodeIndex = POSITIONS.indexOf(state.position);
    const isApproachWait = context.action === 'wait' && (context.altitudeBand ?? 99) <= 1;
    const isHorconesExit = context.action === 'descend' && state.position === 'horcones';
    const isSummit = state.position === 'summit';
    const isSummitAdvanceAttempt = isSummit && (
      context.summitAdvanceAttempt ||
      context.action === 'advance' ||
      context.action === 'advance_slowly'
    );

    const r = G.rng() * 100;
    let outcome;
    if (r < collapseChance) outcome = 'Collapse (Fatigue)';
    else if (r < progressChance) outcome = 'Advance';
    else if (r > survivalChance) outcome = 'Retreat';
    else outcome = 'Hold';

    if (isApproachWait && outcome === 'Advance') outcome = 'Hold';
    if (isSummitAdvanceAttempt) outcome = 'Hold';
    if (isHorconesExit) outcome = 'Advance';

    // Descend always moves one step down unless the player collapsed.
    // Gravity makes downward movement reliable — only body failure can stop it.
    const isDescend = context.action === 'descend' && !isHorconesExit;
    if (isDescend && outcome !== 'Collapse (Fatigue)') outcome = 'Advance';

    // Sleep never moves position — recovery stays at the camp.
    const isSleep = context.action === 'sleep';
    if (isSleep && outcome === 'Advance') outcome = 'Hold';
    if (isSleep && outcome === 'Retreat') outcome = 'Hold';

    // For actions with negative progress (descend), 'Advance' means moving down the route
    const directionMultiplier = actionMod.progress < 0 ? -1 : 1;
    const step = (outcome === 'Advance' ? 1 : outcome === 'Retreat' ? -1 : 0) * directionMultiplier;
    const targetIndex = isHorconesExit ? nodeIndex : clamp(nodeIndex + step, 0, POSITIONS.length - 1);
    const targetPosition = POSITIONS[targetIndex];
    const blocked = isSummitAdvanceAttempt;
    const moved = targetPosition !== state.position;

    return {
      outcome,
      targetPosition,
      pressureDelta,
      effectiveDelta,
      progressChance,
      collapseChance,
      survivalChance,
      blocked,
      moved,
    };
  }

  function updateState(state, result, action) {
    const actionMod = getActionModifier(action);
    const pressureFactor = clamp((result.effectiveDelta || result.pressureDelta) / 20, 0.5, 2.5);

    // Fatigue: pressure amplifies cost (positive) deltas; recovery (negative) deltas are fixed.
    const fatigueDelta = actionMod.fatigueDelta * actionMod.fatigueMultiplier;
    state.fatigue = clamp(
      state.fatigue + (fatigueDelta >= 0 ? fatigueDelta * pressureFactor : fatigueDelta),
      0,
      100
    );

    // Exposure: same rule.
    const exposureDelta = actionMod.exposureDelta * actionMod.exposureMultiplier;
    state.exposure = clamp(
      state.exposure + (exposureDelta >= 0 ? exposureDelta * pressureFactor : exposureDelta),
      0,
      100
    );

    // Functional capacity: pressure adds a degradation cost above pf=1.
    // Capped so recovery actions (sleep, descend) are always at least neutral on fc.
    const fcPressureCost = Math.max(0, pressureFactor - 1) * 2;
    state.functional_capacity = clamp(
      state.functional_capacity + actionMod.capacityDelta - fcPressureCost,
      0,
      100
    );

    state.position = result.targetPosition;
    updateRunState(G, {
      highestPosIdx: Math.max(G.highestPosIdx, POSITIONS.indexOf(state.position)),
    });

    // Set hasSummited when the player first reaches the summit node.
    const summitIdx = POSITIONS.indexOf('summit');
    if (summitIdx >= 0 && POSITIONS.indexOf(state.position) >= summitIdx && !G.hasSummited) {
      updateRunState(G, { hasSummited: true });
    }

    assertStateShape(G, 'after updateState');
  }

  function resolveTurn(state, action, options = {}) {
    const trace = Array.isArray(options.pipelineTrace) ? options.pipelineTrace : null;
    const flags = [];
    markStage(trace, 'normalize-action');
    let resolvedAction = action;
    const attemptedSummitAdvance = state.position === 'summit' && (action === 'advance' || action === 'advance_slowly');

    if (resolvedAction === 'shoot_photo') {
      const access = canUseShootPhoto(state);
      if (!access.allowed) {
        flags.push('photo-action-blocked');
        resolvedAction = 'wait';
      }
    }

    if (state.position === 'summit' && (resolvedAction === 'advance' || resolvedAction === 'advance_slowly')) {
      flags.push('summit-descent-only');
      resolvedAction = 'wait';
    }

    const previousPosition = state.position;
    const currentNode = getCurrentNode(state);
    const stageAtTurnStart = getCurrentStage();
    let actionMod = getActionModifier(resolvedAction);

    markStage(trace, 'consume-time-and-resources');
    const actionMinutes = applyTimeCost(resolvedAction);
    spendResourcesForMinutes(Math.max(actionMinutes, 30), flags);

    markStage(trace, 'apply-weather-and-persistence');
    if (resolvedAction !== 'sleep') {
      state.weather_severity = clamp(state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 4);
      state.visibility = clamp(3 - state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 3);
    }

    let contextEvent = null;
    if (typeof applyContextEvents === 'function') {
      contextEvent = applyContextEvents({
        state,
        action: resolvedAction,
        stage: stageAtTurnStart,
        previousPosition,
        flags,
      });
      if (contextEvent?.id) flags.push('weather-event-active');
    }

    if (resolvedAction === 'sleep') {
      updateRunState(G, { persistenceTurns: 0 });
    } else if (currentNode.altitudeBand >= 2) {
      updateRunState(G, { persistenceTurns: G.persistenceTurns + 1 });
    }
    state.persistenceTier = getPersistenceTier(G.persistenceTurns);

    markStage(trace, 'compute-pressure-and-perception');
    let epResult = calculateEnvironmentalPressure(state);
    epResult.pressureScore = applyBivouacPenalty(state, epResult.pressureScore, flags);

    const currentStageForAccl = stageAtTurnStart;
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
        stage: stageAtTurnStart,
        activationRatio: Number(perception.latency.activationRatio.toFixed(2)),
        pressureDelta: Number(pressureDelta.toFixed(2)),
        readability: perception.latency.readabilityLabel,
        gates: {
          pressureGate: perception.latency.pressureGate,
          stageGate: perception.latency.stageGate,
          timeGate: perception.latency.timeGate,
        },
      };
      // Legacy mutation pattern retained as contract hint for tests: G.lateSignalEvents.push(lateSignalEvent)
      updateRunState(G, {
        lateSignalDeterminantTurns: G.lateSignalDeterminantTurns + 1,
        lateSignalEvents: [...G.lateSignalEvents, lateSignalEvent],
      });
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

      updateRunState(G, {
        photoShotsTaken: G.photoShotsTaken + 1,
        lastPhotoTurn: G.turn,
        photoInsightTurns: Math.max(G.photoInsightTurns, actionMod.photoInsightTurns || 2),
        photoLastEffectLabel: 'Frame review improved route reading confidence.',
      });

      photoEffectApplied = {
        confidenceBoost: confidenceGain,
        uncertaintyDrop,
        trendAssist: !!actionMod.photoTrendAssist,
        insightTurnsGranted: actionMod.photoInsightTurns || 2,
        shotsUsed: G.photoShotsTaken,
      };
    } else if (G.photoInsightTurns > 0) {
      updateRunState(G, { photoInsightTurns: Math.max(0, G.photoInsightTurns - 1) });
    }

    if (resolvedAction !== 'shoot_photo' && G.photoInsightTurns > 0) {
      actionMod = {
        ...actionMod,
        fatigueMultiplier: Math.max(0.75, (actionMod.fatigueMultiplier || 1) - 0.05),
      };
    }

    markStage(trace, 'apply-decision-window-effects');
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

    markStage(trace, 'evaluate-outcome');
    const result = evaluateOutcome(finalPressureDelta, actionMod, state, {
      action: resolvedAction,
      altitudeBand: currentNode.altitudeBand,
      summitAdvanceAttempt: attemptedSummitAdvance,
    });
    const exitedPark = previousPosition === 'horcones' && resolvedAction === 'descend';
    markStage(trace, 'update-state');
    updateState(state, result, resolvedAction);

    let outcome = result.outcome;
    const outsideCamp = !isCampPosition(state.position);
    const resourcesDepleted = state.water <= 0 || state.food <= 0;
    const criticalExposure = state.exposure >= 94;

    if (state.functional_capacity <= 5 || (state.exposure >= 99 && state.fatigue >= 100)) {
      outcome = 'Fatality';
    } else if (resourcesDepleted) {
      outcome = 'Resource Exhaustion';
    } else if (criticalExposure) {
      outcome = outsideCamp ? 'Rescue' : 'Collapse (Exposure)';
    } else if (state.fatigue >= 100) {
      outcome = outsideCamp ? 'Rescue' : 'Collapse (Fatigue)';
    }

    if (!CANONICAL_OUTCOMES.has(outcome) && outcome !== 'Strategic Retreat') outcome = 'Strategic Retreat';

    markStage(trace, 'classify-terminal-outcome');
    if (typeof deriveTerminalOutcome === 'function') {
      outcome = deriveTerminalOutcome({
        outcome,
        state,
        G,
        POSITIONS,
        stage: getCurrentStage(),
        timeWindows: typeof getTimeWindows === 'function' ? getTimeWindows() : null,
        action: resolvedAction,
        previousPosition,
        exitedPark,
      });
    }


    if (state.functional_capacity < 30) flags.push('critical-fatigue');
    if (state.exposure > 70) flags.push('critical-exposure');
    if (state.water <= 0) flags.push('water-depletion');
    if (state.food <= 0) flags.push('food-depletion');
    if (state.fatigue >= 100 || state.exposure >= 99 || state.functional_capacity <= 5) flags.push('fatality-threshold');

    markStage(trace, 'emit-signals-and-narrative');
    updateAmbientSignal(flags, resolvedAction);
    const signals = computeSignals();
    const narrative = renderNarrative(resolvedAction, signals, flags);

    if (typeof recordTelemetry === 'function') {
      recordTelemetry(G, {
        lastTurnRecord: {
          turn: G.turn,
          action: resolvedAction,
          previousPosition,
          resultingPosition: state.position,
          stage: stageAtTurnStart,
          environment: {
            altitudeBand: currentNode?.altitudeBand ?? null,
            terrainLoad: currentNode?.terrainLoad ?? null,
            weatherSeverity: state.weather_severity,
            visibility: state.visibility,
            persistenceTier: state.persistenceTier,
          },
          pressure: {
            EP: Number((epResult.pressureScore || 0).toFixed(2)),
            BT: Number((BT || 0).toFixed(2)),
            delta: Number((result.pressureDelta || 0).toFixed(2)),
            effectiveDelta: Number((result.effectiveDelta || 0).toFixed(2)),
          },
          perceivedSignals: {
            trend: timedPerception?.trendEstimate,
            confidence: timedPerception?.confidenceLevel,
            uncertainty: timedPerception?.noiseLevel,
            readability: timedPerception?.latency?.readabilityLabel || 'clear reading',
          },
          contextEvent,
          outcome,
          flags: [...flags],
          state: {
            functionalCapacity: state.functional_capacity,
            fatigue: state.fatigue,
            exposure: state.exposure,
            water: state.water,
            food: state.food,
          },
        },
      });
    }

    return { result, outcome, flags, signals, narrative, resolvedAction, timedPerception, photoEffectApplied, lateSignalEvent, contextEvent, decisionWindowEffect: decisionAdjusted.effect, pipelineTrace: trace ? [...trace] : null };
  }

  function resolveTurnWithTrace(state, action) {
    const pipelineTrace = [];
    const turn = resolveTurn(state, action, { pipelineTrace });
    return { ...turn, pipelineTrace };
  }

  return { resolveTurn, resolveTurnWithTrace, evaluateOutcome, updateState };
}
