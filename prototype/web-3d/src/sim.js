// prototype/web-3d/src/sim.js
//
// Headless expedition adapter for the 3D prototype.
//
// This module does NOT reimplement mountain rules. It wires the canonical
// web-v1 engine (`prototype/web-v1/engine/*`) to a per-run state object and
// mirrors the dependency helpers that live in `prototype/web-v1/ui/screens.js`
// (which cannot be imported because it owns DOM side effects).
//
// It has no DOM or three.js dependency, so it runs under `node --test`.

import { createTurnEngine, mulberry32, clamp } from '../../web-v1/engine/turn-resolution.js';
import { calculateEnvironmentalPressureScore, calculateBodyToleranceScore } from '../../web-v1/engine/pressure-model.js';
import { calculateResourceBurnForMinutes, deriveTerminalOutcome } from '../../web-v1/engine/turn-rules.js';
import { buildEnvironmentEventPlan, applyContextEvent, applyCharacterEvent, applyClockDelta } from '../../web-v1/engine/events-core.js';
import { createInitialGameState, updateRunState, recordTelemetry, assertStateShape } from '../../web-v1/state/game-state.js';
import { resolveNarrativeText } from '../../web-v1/ui/helpers/narrative.js';
import {
  getTimeOfDayBucket,
  getPersistenceTier,
  capacityLabel,
  fatigueLabel,
  exposureLabel,
  pressureBandLabel,
  pressureDeltaLabel,
  formatMinutes,
} from '../../web-v1/ui/helpers/screen-utils.js';

export const ACTIONS = Object.freeze(['advance', 'advance_slowly', 'wait', 'descend', 'sleep', 'shoot_photo']);

/** The engine uses this label as its "run continues" marker (see ui/game-loop.js). */
export const CONTINUE_MARKER = 'Strategic Retreat';

const NEUTRAL_DIFFICULTY = Object.freeze({
  pressureBias: 0, stageWeatherBias: 0, bodyToleranceBonus: 0, acclimatizationBonus: 0,
  fatigueMultiplier: 1, exposureMultiplier: 1, resourceEfficiency: 1, permitDaysBonus: 0,
  initialCapacityBonus: 0, initialWaterBonus: 0, initialFoodBonus: 0, decisionWindowMsBonus: 0,
});

/** Same normalisation as `normalizeRouteData` / monte-carlo harness: nodeId → id, stageHint → stage. */
export function normalizeNodes(rawNodes) {
  return rawNodes
    .map((node, idx) => ({
      id: node.nodeId || `node_${idx}`,
      name: node.nodeName,
      altitudeMeters: node.altitudeMeters ?? null,
      altitudeBand: node.altitudeBand,
      terrainLoad: node.terrainLoad,
      weatherBias: node.weatherBias,
      visibilityBias: node.visibilityBias,
      timeSensitivity: node.timeSensitivity,
      isCamp: !!node.isCamp,
      stage: node.stageHint || (idx <= 4 ? 'APPROACH' : idx <= 10 ? 'HIGH_CAMP' : 'SUMMIT_DAY'),
      routeIndex: node.routeIndex ?? idx,
    }))
    .sort((a, b) => a.routeIndex - b.routeIndex);
}

/**
 * Create one expedition run.
 *
 * @param {object} opts
 * @param {object} opts.data       - { nodes, environmentalPressure, actionModifiers, stageModifiers,
 *                                     characterEvents, contextEvents, outcomes } (raw JSON payloads)
 * @param {object} opts.character  - entry from data/characters.json
 * @param {object} opts.scenario   - entry from data/scenarios.web-v1.json predefinedScenarios
 * @param {number} opts.seed
 * @param {string} [opts.lang]     - 'en' | 'es' (narrative language)
 */
export function createExpedition({ data, character, scenario, seed, lang = 'en' }) {
  const nodes = normalizeNodes(data.nodes);
  const POSITIONS = nodes.map((n) => n.id);
  const NODE_BY_ID = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const CAMPS = new Set(nodes.filter((n) => n.isCamp).map((n) => n.id));
  const CANONICAL_OUTCOMES = new Set((data.outcomes || []).filter((o) => typeof o === 'string' && o.trim()));
  if (!CANONICAL_OUTCOMES.size) throw new Error('Invalid outcomes contract: data/outcomes.json is empty.');

  const epConfig = data.environmentalPressure || {};
  const sim = epConfig.simulation || {};
  const actionMods = data.actionModifiers || {};
  const stageMods = data.stageModifiers || {};
  const difficulty = { ...NEUTRAL_DIFFICULTY, ...(scenario.difficultyModifiers || {}) };
  const dayStart = sim.dayStartMinutes ?? 360;

  let language = lang;
  // Narrative picks use their own stream so the engine RNG sequence stays a pure
  // function of (seed, actions) — the same contract the Monte Carlo harness relies on.
  const narrativeRng = mulberry32((Number(seed) ^ 0x9e3779b9) >>> 0);
  const uiText = (en, es) => (language === 'es' ? es : en);

  const G = createInitialGameState();
  updateRunState(G, {
    character,
    scenario,
    seed,
    rng: mulberry32(seed),
    turn: 1,
    turnLog: [],
    allFlags: [],
    highestPosIdx: Math.max(0, POSITIONS.indexOf(scenario.initial?.position ?? POSITIONS[0])),
    day: 1,
    permitDay: 1,
    permitMaxDays: clamp(20 + (difficulty.permitDaysBonus ?? 0), 12, 26),
    minutesOfDay: dayStart,
    acclimatization: clamp((scenario._acclimatizationBonus ?? 0) + (difficulty.acclimatizationBonus ?? 0), 0, 100),
    persistenceTurns: 0,
    pressureHistory: [],
    hasSummited: false,
    finalOutcome: CONTINUE_MARKER,
    environmentEventPlan: buildEnvironmentEventPlan(seed, scenario.max_turns ?? 40, data.contextEvents || []),
    difficulty: String(scenario.difficulty || 'standard').toLowerCase(),
  });

  const s = structuredClone(scenario.initial || {});
  s.position = POSITIONS.includes(s.position) ? s.position : POSITIONS[0];
  s.functional_capacity = clamp((s.functional_capacity ?? 90) + (character.engine?.functionalCapacityBonus ?? 0), 0, 100);
  s.functional_capacity = clamp(s.functional_capacity + (difficulty.initialCapacityBonus ?? 0), 0, 100);
  s.water = clamp((s.water ?? 24) + (difficulty.initialWaterBonus ?? 0), 0, 60);
  s.food = clamp((s.food ?? 22) + (difficulty.initialFoodBonus ?? 0), 0, 60);
  s.fatigue = s.fatigue ?? 10;
  s.exposure = s.exposure ?? 5;
  s.weather_severity = s.weather_severity ?? 0;
  s.visibility = s.visibility ?? 3;
  s.terrain_load = s.terrain_load ?? 1;
  s.persistenceTier = 'fresh';
  updateRunState(G, { state: s });

  // ── helpers mirrored from web-v1 ui/screens.js ────────────────────────────
  const getCurrentNode = (state = G.state) => NODE_BY_ID[state.position] ?? nodes[0];
  const getStageForPosition = (position = G.state.position) => NODE_BY_ID[position]?.stage ?? 'APPROACH';
  const getCurrentStage = () => getStageForPosition(G.state.position);
  const isCampPosition = (position = G.state.position) => CAMPS.has(position);
  const getCombinedResourceEfficiency = () =>
    Math.max(0.1, (G.character?.engine?.resourceEfficiency ?? 1) * (difficulty.resourceEfficiency ?? 1));

  function scaleSignedDelta(delta, multiplier = 1) {
    if (!Number.isFinite(delta)) return delta;
    if (delta < 0) return delta * (multiplier > 0 ? clamp(1 / multiplier, 0.75, 1.5) : 1);
    return delta * multiplier;
  }

  // KNOWN DEBT (mirrors web-v1 on purpose): `sleep` has no `timeCost` in the data, so the default of 60
  // below shadows the 480-minute fallback in applyTimeCost and a night burns one hour of resources.
  // Do not fix it here alone. See docs/technical-debt-register.md → "Detail: sleep time cost".
  function getActionModifier(action) {
    const baseByAction = {
      advance: { fatigueDelta: 6, exposureDelta: 5, capacityDelta: -3 },
      advance_slowly: { fatigueDelta: 4, exposureDelta: 3, capacityDelta: -2 },
      wait: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 1 },
      descend: { fatigueDelta: 1, exposureDelta: 1, capacityDelta: 2 },
      sleep: { fatigueDelta: -10, exposureDelta: -8, capacityDelta: 4 },
      shoot_photo: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 0 },
    };
    const configured = actionMods[action] ?? {};
    const fallback = baseByAction[action] ?? { fatigueDelta: 3, exposureDelta: 3, capacityDelta: -1 };
    const fatigueDelta = Number.isFinite(configured.fatigueDelta)
      ? configured.fatigueDelta
      : Number.isFinite(configured.fatigueRecovery) ? -configured.fatigueRecovery : fallback.fatigueDelta;
    const exposureDelta = Number.isFinite(configured.exposureDelta)
      ? configured.exposureDelta
      : Number.isFinite(configured.exposureRecovery) ? -configured.exposureRecovery : fallback.exposureDelta;
    const collapseDefaults = { advance: -45, advance_slowly: -50, wait: -65, descend: -90, sleep: -95, shoot_photo: -60 };
    const survivalDefaults = { advance: 0, advance_slowly: 0, wait: 5, descend: -10, sleep: 5, shoot_photo: 5 };
    const modifier = {
      progress: 0,
      fatigueMultiplier: 1,
      exposureMultiplier: 1,
      timeCost: 60,
      ...configured,
      fatigueDelta,
      exposureDelta,
      capacityDelta: Number.isFinite(configured.capacityDelta) ? configured.capacityDelta : fallback.capacityDelta,
      collapse: Number.isFinite(configured.collapse) ? configured.collapse : (collapseDefaults[action] ?? 0),
      survival: Number.isFinite(configured.survival) ? configured.survival : (survivalDefaults[action] ?? 0),
    };
    modifier.fatigueMultiplier *= difficulty.fatigueMultiplier ?? 1;
    modifier.exposureMultiplier *= difficulty.exposureMultiplier ?? 1;
    if (modifier.fatigueDelta < 0) {
      modifier.fatigueDelta = scaleSignedDelta(modifier.fatigueDelta, modifier.fatigueMultiplier);
      modifier.fatigueMultiplier = 1;
    }
    if (modifier.exposureDelta < 0) {
      modifier.exposureDelta = scaleSignedDelta(modifier.exposureDelta, modifier.exposureMultiplier);
      modifier.exposureMultiplier = 1;
    }
    if (action !== 'sleep') modifier.timeCost = Math.max(30, Math.round(modifier.timeCost / getCombinedResourceEfficiency()));
    return modifier;
  }

  function canUseShootPhoto(state = G.state) {
    if (G.character?.id !== 'daniela') return { allowed: false, reason: 'not-daniela' };
    const mod = getActionModifier('shoot_photo');
    if (G.photoShotsTaken >= (mod.photoSessionCap ?? 4)) return { allowed: false, reason: 'no-film' };
    if (G.turn - G.lastPhotoTurn < (mod.photoCooldownTurns ?? 2)) return { allowed: false, reason: 'cooldown' };
    if (state.water <= 0 || state.food <= 0) return { allowed: false, reason: 'depleted' };
    return { allowed: true, reason: 'available' };
  }

  function getStageModifier(position = G.state.position) {
    const base = stageMods[getStageForPosition(position)]
      ?? { fatigueMultiplier: 1, exposureMultiplier: 1, weatherSeverityBias: 0, confidencePenalty: 0 };
    return { ...base, weatherSeverityBias: (base.weatherSeverityBias ?? 0) + (difficulty.stageWeatherBias ?? 0) };
  }

  const calculateEnvironmentalPressure = (state) => calculateEnvironmentalPressureScore({
    state,
    node: getCurrentNode(state),
    stageModifier: getStageModifier(state.position),
    difficultyModifiers: difficulty,
    timeOfDayBucket: getTimeOfDayBucket(G.minutesOfDay),
    environmentalPressureConfig: epConfig,
  });

  const calculateBodyTolerance = (state) => calculateBodyToleranceScore({
    state,
    acclimatization: G.acclimatization ?? 0,
    characterEngine: G.character?.engine ?? {},
    difficultyModifiers: difficulty,
  });

  function spendResourcesForMinutes(minutes, flags) {
    const burn = sim.resourceBurnPerHour?.[getCurrentStage()] ?? { water: 0.4, food: 0.3 };
    const { waterBurn, foodBurn } = calculateResourceBurnForMinutes({
      minutes, burnPerHour: burn, efficiency: getCombinedResourceEfficiency(),
    });
    G.state.water = Math.max(0, G.state.water - waterBurn);
    G.state.food = Math.max(0, G.state.food - foodBurn);
    if (G.state.water === 0) {
      updateRunState(G, { consecutiveWater0: G.consecutiveWater0 + 1 });
      flags.push('water-depleted');
      G.state.functional_capacity = clamp(G.state.functional_capacity - 8, 0, 100);
    } else {
      updateRunState(G, { consecutiveWater0: 0 });
    }
    if (G.state.food === 0) {
      flags.push('food-depleted');
      G.state.functional_capacity = clamp(G.state.functional_capacity - 5, 0, 100);
    }
  }

  function calculatePerceptionLatency({ pressureDelta }) {
    const latency = G.character?.engine?.perceptionLatency ?? {};
    const baseDelay = clamp(latency.baseDelay ?? 0, 0, 0.85);
    if (baseDelay <= 0) {
      return { active: false, activationRatio: 1, readabilityLabel: 'clear reading', pressureGate: false, stageGate: false, timeGate: false };
    }
    const stage = getCurrentStage();
    const pressureStart = latency.pressureDeltaStart ?? 18;
    const stageWeight = latency.stageActivation?.[stage] ?? 0;
    const timeStart = latency.timeActivationStart ?? 780;
    const earlyHintFloor = clamp(latency.minEarlyHint ?? 0.38, 0.3, 0.75);
    const pressureProgress = clamp((pressureDelta - pressureStart) / 22, 0, 1);
    const timeProgress = clamp((G.minutesOfDay - timeStart) / 240, 0, 1);
    const activationProgress = clamp((pressureProgress * 0.48) + (timeProgress * 0.34) + stageWeight, 0, 1);
    const activationRatio = clamp((1 - baseDelay) + (baseDelay * activationProgress), earlyHintFloor, 1);
    return {
      active: activationRatio < 0.99,
      activationRatio,
      readabilityLabel: activationRatio < 0.42 ? 'uncertain reading' : activationRatio < 0.72 ? 'partial reading' : 'clear reading',
      pressureGate: pressureDelta >= pressureStart,
      stageGate: stageWeight > 0,
      timeGate: G.minutesOfDay >= timeStart,
    };
  }

  function calculatePerception({ state, EP, BT, pressureDelta }) {
    const node = getCurrentNode(state);
    const stageMod = getStageModifier(state.position);
    const stats = G.character?.engine ?? {};
    const stability = stats.confidenceStability ?? 1;
    const riskTol = stats.riskTolerance ?? 1;
    let confidenceLevel = clamp(
      (100 - (node.altitudeBand * 8) - (state.fatigue * 0.35) - (state.exposure * 0.4)
        - ((4 - (state.visibility ?? 0)) * 6) - (stageMod.confidencePenalty ?? 0)) * stability,
      5, 95,
    );
    confidenceLevel = clamp(confidenceLevel + (G.characterConfidenceDrift ?? 0), 5, 98);
    const currentEp = EP ?? calculateEnvironmentalPressure(state).pressureScore;
    const prevEp = G.pressureHistory.length ? G.pressureHistory[G.pressureHistory.length - 1] : currentEp;
    let trendEstimate = currentEp > prevEp + 7 ? 'worsening fast'
      : currentEp > prevEp + 2 ? 'worsening'
        : currentEp < prevEp - 2 ? 'easing' : 'steady';
    let noiseLevel = clamp(((100 - confidenceLevel) / 100) * (sim.noiseRangeAtZeroConf ?? 18) * riskTol + (stats.perceptionBias ?? 0), 0, 35);
    const latency = calculatePerceptionLatency({ pressureDelta: pressureDelta ?? 0 });
    if (latency.active) {
      confidenceLevel = clamp(confidenceLevel * latency.activationRatio, 5, 98);
      noiseLevel = clamp(noiseLevel + ((1 - latency.activationRatio) * 9), 0, 35);
      if (latency.activationRatio < 0.55 && trendEstimate === 'worsening fast') trendEstimate = 'worsening';
      else if (latency.activationRatio < 0.45 && trendEstimate === 'easing') trendEstimate = 'steady';
    }
    if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) {
      const photoMod = getActionModifier('shoot_photo');
      trendEstimate = trendEstimate === 'worsening fast' ? 'worsening' : trendEstimate;
      noiseLevel = clamp(noiseLevel - Math.min((photoMod.photoUncertaintyDrop ?? 4) - 2, 3), 0, 35);
      confidenceLevel = clamp(confidenceLevel + Math.min(photoMod.photoCarryConfidenceGain ?? 3, 4), 5, 98);
    }
    const guardrails = G.character?.engine?.perceptionGuardrails ?? {};
    return {
      confidenceLevel: clamp(confidenceLevel, clamp(guardrails.minConfidence ?? 8, 5, 45), 98),
      trendEstimate,
      noiseLevel: clamp(noiseLevel, 0, clamp(guardrails.maxNoise ?? 35, 18, 35)),
      pressureDelta,
      EP: currentEp,
      BT,
      latency,
      guardrails,
    };
  }

  function clampHint(rawHint) {
    const minHintLevel = clamp(G.character?.engine?.perceptionGuardrails?.minHintLevel ?? 1, 0, 2);
    return Math.max(minHintLevel, clamp(rawHint, 0, 3));
  }

  function computeSignals() {
    const perception = calculatePerception({ state: G.state });
    return {
      trend: perception.trendEstimate,
      uncertainty: perception.noiseLevel,
      confidence: Math.round(perception.confidenceLevel),
      mountainPressure: pressureBandLabel(calculateEnvironmentalPressure(G.state).pressureScore),
      wHint: clampHint(G.state.weather_severity),
      vHint: clampHint(G.state.visibility),
      tHint: clampHint(G.state.terrain_load),
      signalReadability: perception.latency?.readabilityLabel || 'clear reading',
      lateSignalActive: !!perception.latency?.active,
    };
  }

  function applyTimeCost(action) {
    const actionMod = getActionModifier(action);
    if (action === 'sleep') {
      const nextDay = G.day + 1;
      updateRunState(G, { day: nextDay, permitDay: nextDay, minutesOfDay: dayStart });
      return actionMod.timeCost ?? 480;
    }
    const minutes = actionMod.timeCost ?? 60;
    updateRunState(G, applyClockDelta({ minutesOfDay: G.minutesOfDay, day: G.day, deltaMinutes: minutes }));
    return minutes;
  }

  function applyBivouacPenalty(state, ep, flags) {
    const biv = sim.bivouacPenalty ?? { ep: 20, fatigue: 18, exposure: 22, persistenceTurns: 8, capacity: 12 };
    if (G.minutesOfDay > 1320 && !isCampPosition(state.position)) {
      flags.push('forced-bivouac');
      state.fatigue = clamp(state.fatigue + biv.fatigue, 0, 100);
      state.exposure = clamp(state.exposure + biv.exposure, 0, 100);
      state.functional_capacity = clamp(state.functional_capacity - (biv.capacity ?? 12), 0, 100);
      const updates = { persistenceTurns: Math.max(G.persistenceTurns, biv.persistenceTurns ?? 8) };
      if (G.minutesOfDay >= 1440) updates.minutesOfDay = dayStart;
      updateRunState(G, updates);
      state.persistenceTier = 'critical';
      return ep + (biv.ep ?? 20);
    }
    return ep;
  }

  function applySummitDifficultyRegressionGuard({ stage, acclPenalty, decisionEffect, pressureDelta }) {
    const guard = {
      stage,
      acclPenaltyApplied: Number((acclPenalty ?? 0).toFixed(2)),
      acclPenaltyCapped: false,
      pressureDeltaApplied: Number((pressureDelta ?? 0).toFixed(2)),
      pressureDeltaCapped: false,
      triggered: false,
    };
    if (stage !== 'SUMMIT_DAY') return guard;
    if (guard.acclPenaltyApplied > 22) { guard.acclPenaltyApplied = 22; guard.acclPenaltyCapped = true; guard.triggered = true; }
    if (guard.pressureDeltaApplied > 52) { guard.pressureDeltaApplied = 52; guard.pressureDeltaCapped = true; guard.triggered = true; }
    if (decisionEffect?.capped) guard.triggered = true;
    return guard;
  }

  function applyContextEvents({ state, action, stage, flags }) {
    const eventEffect = applyContextEvent({
      turn: G.turn, action, stage, state,
      environmentEventPlan: Array.isArray(G.environmentEventPlan) ? G.environmentEventPlan : [],
    });
    if (eventEffect) {
      updateRunState(G, { activeEnvironmentEvent: eventEffect });
      if (eventEffect.timePenalty) {
        updateRunState(G, applyClockDelta({ minutesOfDay: G.minutesOfDay, day: G.day, deltaMinutes: eventEffect.timePenalty }));
      }
    } else {
      updateRunState(G, { activeEnvironmentEvent: null });
    }
    const charEffect = applyCharacterEvent({ G, state, action, stage, flags, characterEvents: data.characterEvents ?? [] });
    if (charEffect?.characterId) {
      updateRunState(G, {
        characterEventHistory: [...G.characterEventHistory, charEffect.id],
        characterEventState: charEffect.eventState ?? G.characterEventState ?? {},
      });
    }
    return eventEffect;
  }

  const renderNarrative = (decision, _signals, flags = []) => resolveNarrativeText({
    decision, flags, state: G.state, lang: language, rng: narrativeRng, uiText, getCurrentNode,
  });

  // The 3D prototype has no real-time decision countdown: pace and direction are
  // chosen by walking, so the web-v1 decision-window degradation is a no-op here.
  const applyDecisionWindowDegradation = (actionMod, perception) => ({
    actionMod, perception, effect: { exceeded: false, overMs: 0, overSteps: 0, capped: false },
  });

  const engine = createTurnEngine({
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
    updateAmbientSignal: () => {},
    computeSignals,
    renderNarrative,
    deriveTerminalOutcome,
    getTimeWindows: () => sim.timeWindows ?? { summitLateStart: 1020 },
    updateRunState,
    recordTelemetry,
    assertStateShape,
    applyContextEvents,
  });

  updateRunState(G, { signals: computeSignals() });

  let ended = false;

  /**
   * Resolve one turn. Mirrors `createGameLoop().handleDecision` in web-v1.
   * @returns {object|null} turn report, or null if the action is not available.
   */
  function act(action) {
    if (ended) return null;
    if (!ACTIONS.includes(action)) throw new Error(`Unknown action: ${action}`);
    const st = G.state;
    if (action === 'sleep' && !isCampPosition(st.position)) return null;

    assertStateShape(G, 'before resolveTurn', { throwOnError: true });
    const previousPosition = st.position;
    const previousIndex = POSITIONS.indexOf(previousPosition);
    const before = { day: G.day, minutesOfDay: G.minutesOfDay };
    const stageAtStart = getCurrentStage();

    const turnResult = engine.resolveTurn(st, action);
    const resolvedAction = turnResult.resolvedAction || action;

    const gain = getActionModifier(resolvedAction).acclimatizationGain ?? 0;
    if (gain > 0) {
      const rate = G.character?.engine?.acclimatizationRate ?? 1.0;
      updateRunState(G, { acclimatization: clamp((G.acclimatization ?? 0) + gain * rate, 0, 100) });
    }
    updateRunState(G, { signals: computeSignals() });

    const pressureDelta = turnResult.result?.pressureDelta ?? 0;
    const entry = {
      turn: G.turn,
      day: G.day,
      time: formatMinutes(G.minutesOfDay),
      position: st.position,
      previousPosition,
      stage: stageAtStart,
      decision: resolvedAction,
      requested: action,
      moveResult: turnResult.result?.outcome ?? 'Hold',
      trend: G.signals.trend,
      uncertainty: G.signals.uncertainty,
      confidence: G.signals.confidence,
      body: {
        capacity: capacityLabel(st.functional_capacity),
        fatigue: fatigueLabel(st.fatigue),
        exposure: exposureLabel(st.exposure),
      },
      raw: {
        capacity: Math.round(st.functional_capacity),
        fatigue: Math.round(st.fatigue),
        exposure: Math.round(st.exposure),
        water: st.water,
        food: st.food,
      },
      pressureLabel: pressureDeltaLabel(pressureDelta),
      flags: [...turnResult.flags],
      outcome: turnResult.outcome,
      narrative: turnResult.narrative,
      contextEvent: turnResult.contextEvent ? { id: turnResult.contextEvent.id, label: turnResult.contextEvent.label } : null,
    };
    updateRunState(G, {
      turnLog: [...G.turnLog, entry],
      allFlags: [...G.allFlags, ...turnResult.flags],
    });

    const exitedPark = previousPosition === POSITIONS[0] && resolvedAction === 'descend';
    ended = exitedPark || turnResult.outcome !== CONTINUE_MARKER;
    if (ended) {
      updateRunState(G, { finalOutcome: turnResult.outcome });
    } else {
      const currentEP = G.lastTurnRecord?.pressure?.EP ?? calculateEnvironmentalPressure(G.state).pressureScore;
      updateRunState(G, { pressureHistory: [...(G.pressureHistory || []), currentEP].slice(-5) });
      updateRunState(G, { turn: G.turn + 1 });
    }

    const newIndex = POSITIONS.indexOf(st.position);
    return {
      action: resolvedAction,
      requested: action,
      moveResult: entry.moveResult,           // 'Advance' | 'Hold' | 'Retreat' | 'Collapse (Fatigue)'
      moved: newIndex !== previousIndex,
      previousIndex,
      newIndex,
      outcome: turnResult.outcome,
      ended,
      exitedPark,
      flags: entry.flags,
      narrative: entry.narrative,
      contextEvent: entry.contextEvent,
      clock: { before, after: { day: G.day, minutesOfDay: G.minutesOfDay } },
      entry,
    };
  }

  return {
    G,
    nodes,
    POSITIONS,
    act,
    get ended() { return ended; },
    get state() { return G.state; },
    get positionIndex() { return POSITIONS.indexOf(G.state.position); },
    get outcome() { return G.finalOutcome; },
    setLanguage(next) { language = next === 'es' ? 'es' : 'en'; },
    isCamp: (index) => !!nodes[index]?.isCamp,
    isAtCamp: () => isCampPosition(G.state.position),
    stage: getCurrentStage,
    signals: () => G.signals,
    canPhoto: () => canUseShootPhoto(G.state),
    timeWindows: () => sim.timeWindows ?? { summitLateStart: 1020 },
    labels: () => ({
      capacity: capacityLabel(G.state.functional_capacity),
      fatigue: fatigueLabel(G.state.fatigue),
      exposure: exposureLabel(G.state.exposure),
    }),
  };
}
