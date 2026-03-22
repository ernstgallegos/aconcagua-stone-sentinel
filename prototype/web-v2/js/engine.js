// Game engine for web-v2 — faithful port of v1 EP/BT/delta pipeline.
// All functions receive G explicitly; no global state.

import { clamp as _clamp, updateRunState } from './state.js';

// Re-export clamp so callers can import it from engine.js directly
export { _clamp as clamp };

// Local alias used throughout this module
const clamp = _clamp;

// ── RNG ──────────────────────────────────────────────────────────────────────

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngChoice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function rngInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

// ── DATA ─────────────────────────────────────────────────────────────────────

const DATA = {
  nodes: [],
  environmentalPressure: {},
  actionModifiers: {},
  stageModifiers: {},
  characters: [],
  outcomes: [],
  scenariosWebV1: { predefinedScenarios: [], randomScenario: {} },
};

// Route data derived from nodes
let ROUTE_NODES = [];
let POSITIONS = [];
const POS_LABELS = {};
const POS_ALT = {};
let CAMP_POSITIONS = new Set();
const STAGE_BY_POSITION = {};
let CANONICAL_OUTCOMES = new Set();

export async function loadEngineData() {
  const files = [
    ['nodes', '../../data/nodes.json'],
    ['environmentalPressure', '../../data/environmental_pressure_config.json'],
    ['actionModifiers', '../../data/action_modifiers.json'],
    ['stageModifiers', '../../data/stage_modifiers.json'],
    ['characters', '../../data/characters.json'],
    ['outcomes', '../../data/outcomes.json'],
    ['scenariosWebV1', '../../data/scenarios.web-v1.json'],
  ];
  for (const [key, path] of files) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
    DATA[key] = await res.json();
  }
  _rebuildRouteData();
}

function _rebuildRouteData() {
  ROUTE_NODES = (DATA.nodes || [])
    .map((node, idx) => ({
      id: node.nodeId || `node_${idx}`,
      name: node.nodeName,
      altitudeMeters: node.altitudeMeters || null,
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

  POSITIONS.length = 0;
  POSITIONS.push(...ROUTE_NODES.map((n) => n.id));

  for (const n of ROUTE_NODES) {
    POS_LABELS[n.id] = n.name;
    POS_ALT[n.id] = n.altitudeMeters ? `${n.altitudeMeters.toLocaleString('en-US')} m` : '—';
    STAGE_BY_POSITION[n.id] = n.stage;
  }

  CAMP_POSITIONS = new Set(ROUTE_NODES.filter((n) => n.isCamp).map((n) => n.id));
  CANONICAL_OUTCOMES.clear();
  (DATA.outcomes || []).forEach((o) => CANONICAL_OUTCOMES.add(o));
}

// ── ACCESSORS ────────────────────────────────────────────────────────────────

export function getPositionLabel(posId) { return POS_LABELS[posId] || posId; }
export function getPositionAlt(posId) { return POS_ALT[posId] || '—'; }
export function getPositions() { return POSITIONS; }
export function getRouteNodes() { return ROUTE_NODES; }
export function getCampPositions() { return CAMP_POSITIONS; }
export function getScenarioData() { return DATA.scenariosWebV1; }

export function getCurrentNode(G) {
  return ROUTE_NODES.find((n) => n.id === G.state.position) || ROUTE_NODES[0];
}

export function getCurrentStage(G) {
  const pos = G.state?.position;
  if (pos && STAGE_BY_POSITION[pos]) return STAGE_BY_POSITION[pos];
  const node = ROUTE_NODES.find((n) => n.id === pos) || ROUTE_NODES[0];
  return node?.stage || 'APPROACH';
}

function isCampPosition(pos) {
  return CAMP_POSITIONS.has(pos);
}

// ── DIFFICULTY ───────────────────────────────────────────────────────────────

const DIFFICULTY_LEVELS = [
  { id: 'very-easy', modifiers: { pressureBias: -14, stageWeatherBias: -2, bodyToleranceBonus: 12, acclimatizationBonus: 14, fatigueMultiplier: 0.78, exposureMultiplier: 0.78, resourceEfficiency: 1.25, permitDaysBonus: 4, initialCapacityBonus: 8, initialWaterBonus: 4, initialFoodBonus: 4 } },
  { id: 'easy', modifiers: { pressureBias: -6, stageWeatherBias: -1, bodyToleranceBonus: 5, acclimatizationBonus: 6, fatigueMultiplier: 0.9, exposureMultiplier: 0.9, resourceEfficiency: 1.1, permitDaysBonus: 2, initialCapacityBonus: 3, initialWaterBonus: 2, initialFoodBonus: 2 } },
  { id: 'standard', modifiers: { pressureBias: 0, stageWeatherBias: 0, bodyToleranceBonus: 0, acclimatizationBonus: 0, fatigueMultiplier: 1, exposureMultiplier: 1, resourceEfficiency: 1, permitDaysBonus: 0, initialCapacityBonus: 0, initialWaterBonus: 0, initialFoodBonus: 0 } },
  { id: 'hard', modifiers: { pressureBias: 8, stageWeatherBias: 1, bodyToleranceBonus: -6, acclimatizationBonus: -6, fatigueMultiplier: 1.12, exposureMultiplier: 1.15, resourceEfficiency: 0.92, permitDaysBonus: -1, initialCapacityBonus: -4, initialWaterBonus: -1, initialFoodBonus: -1 } },
  { id: 'very-hard', modifiers: { pressureBias: 16, stageWeatherBias: 2, bodyToleranceBonus: -12, acclimatizationBonus: -12, fatigueMultiplier: 1.25, exposureMultiplier: 1.3, resourceEfficiency: 0.85, permitDaysBonus: -2, initialCapacityBonus: -8, initialWaterBonus: -2, initialFoodBonus: -2 } },
];

function getDifficultyModifiers(id = 'standard') {
  return (DIFFICULTY_LEVELS.find((l) => l.id === id) || DIFFICULTY_LEVELS[2]).modifiers;
}

// ── PERSISTENCE TIER ─────────────────────────────────────────────────────────

function getPersistenceTier(turns) {
  if (turns >= 8) return 'critical';
  if (turns >= 6) return 'severe';
  if (turns >= 4) return 'cumulative';
  if (turns >= 2) return 'sustained';
  return 'fresh';
}

// ── SIM CONFIG ───────────────────────────────────────────────────────────────

function getSimConfig() {
  return DATA.environmentalPressure?.simulation || {};
}

function getTimeOfDayBucket(minutesOfDay) {
  if (minutesOfDay < 360) return 'night';
  if (minutesOfDay < 480) return 'early';
  if (minutesOfDay < 900) return 'optimal';
  if (minutesOfDay < 1080) return 'late';
  if (minutesOfDay < 1320) return 'dusk';
  return 'night';
}

// ── ACTION MODIFIER ──────────────────────────────────────────────────────────

function getCombinedResourceEfficiency(G) {
  const charEff = G.character?.engine?.resourceEfficiency ?? 1.0;
  const diffEff = getDifficultyModifiers(G.difficulty).resourceEfficiency ?? 1.0;
  return Math.max(0.1, charEff * diffEff);
}

function getDifficultyRecoveryMultiplier(multiplier = 1) {
  return multiplier > 0 ? clamp(1 / multiplier, 0.75, 1.5) : 1;
}

function scaleSignedDelta(delta, multiplier = 1) {
  if (!Number.isFinite(delta)) return delta;
  if (delta < 0) return delta * getDifficultyRecoveryMultiplier(multiplier);
  return delta * multiplier;
}

export function getActionModifier(G, action) {
  const baseByAction = {
    advance: { fatigueDelta: 6, exposureDelta: 5, capacityDelta: -3 },
    advance_slowly: { fatigueDelta: 4, exposureDelta: 3, capacityDelta: -2 },
    wait: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 1 },
    descend: { fatigueDelta: 1, exposureDelta: 1, capacityDelta: 2 },
    sleep: { fatigueDelta: -10, exposureDelta: -8, capacityDelta: 4 },
    shoot_photo: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 0 },
  };
  const configured = DATA.actionModifiers[action] || {};
  const fallback = baseByAction[action] || { fatigueDelta: 3, exposureDelta: 3, capacityDelta: -1 };

  const fatigueDelta = Number.isFinite(configured.fatigueDelta)
    ? configured.fatigueDelta
    : Number.isFinite(configured.fatigueRecovery)
      ? -configured.fatigueRecovery
      : fallback.fatigueDelta;

  const exposureDelta = Number.isFinite(configured.exposureDelta)
    ? configured.exposureDelta
    : Number.isFinite(configured.exposureRecovery)
      ? -configured.exposureRecovery
      : fallback.exposureDelta;

  const collapseDefaults = { advance: -45, advance_slowly: -50, wait: -65, descend: -90, sleep: -95, shoot_photo: -60 };
  const survivalDefaults = { advance: 0, advance_slowly: 0, wait: 5, descend: -10, sleep: 5, shoot_photo: 5 };
  const diffMods = getDifficultyModifiers(G.difficulty);

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

  modifier.fatigueMultiplier *= diffMods.fatigueMultiplier;
  modifier.exposureMultiplier *= diffMods.exposureMultiplier;

  if (modifier.fatigueDelta < 0) {
    modifier.fatigueDelta = scaleSignedDelta(modifier.fatigueDelta, modifier.fatigueMultiplier);
    modifier.fatigueMultiplier = 1;
  }
  if (modifier.exposureDelta < 0) {
    modifier.exposureDelta = scaleSignedDelta(modifier.exposureDelta, modifier.exposureMultiplier);
    modifier.exposureMultiplier = 1;
  }
  if (action !== 'sleep') {
    modifier.timeCost = Math.max(30, Math.round(modifier.timeCost / getCombinedResourceEfficiency(G)));
  }
  return modifier;
}

function getStageModifier(G) {
  const stage = getCurrentStage(G);
  const base = DATA.stageModifiers[stage] || { fatigueMultiplier: 1, exposureMultiplier: 1, weatherSeverityBias: 0, confidencePenalty: 0 };
  const diffMods = getDifficultyModifiers(G.difficulty);
  return { ...base, weatherSeverityBias: (base.weatherSeverityBias || 0) + (diffMods.stageWeatherBias || 0) };
}

// ── EP / BT ───────────────────────────────────────────────────────────────────

export function calculateEP(G) {
  const epConf = DATA.environmentalPressure || {};
  const altScale = epConf.altitudePressureByBand || {};
  const terrainScale = epConf.terrainLoadScale || {};
  const weatherScale = epConf.weatherSeverityScale || {};
  const visScale = epConf.visibilityRiskScale || {};
  const timeScale = epConf.timeOfDayRiskScale || {};
  const persistScale = epConf.exposurePersistenceScale || {};

  const node = getCurrentNode(G);
  const stageMod = getStageModifier(G);
  const state = G.state;
  const diffMods = getDifficultyModifiers(G.difficulty);

  const altitudePressure = altScale[String(node.altitudeBand)] ?? 0;
  const terrainLoad = terrainScale[String(clamp(node.terrainLoad, 1, 5))] ?? 0;
  const weatherSeverity = weatherScale[String(clamp(state.weather_severity || 0, 0, 4))] ?? 0;
  const visibilityRisk = visScale[String(clamp(4 - (state.visibility ?? 2), 0, 4))] ?? 0;
  const timeOfDayRisk = (timeScale[getTimeOfDayBucket(G.minutesOfDay)] ?? 0) * (node.timeSensitivity || 1);
  const exposurePersistence = persistScale[state.persistenceTier || 'fresh'] ?? 0;

  const pressureScore =
    altitudePressure + terrainLoad + weatherSeverity + visibilityRisk +
    timeOfDayRisk + exposurePersistence +
    (node.weatherBias || 0) + (node.visibilityBias || 0) +
    (stageMod.weatherSeverityBias || 0) + (diffMods.pressureBias || 0);

  return { pressureScore, components: { altitudePressure, terrainLoad, weatherSeverity, visibilityRisk, timeOfDayRisk, exposurePersistence } };
}

export function calculateBT(G) {
  const state = G.state;
  const stats = G.character?.engine || {};
  const fatigueResistance = stats.fatigueResistance || 1;
  const exposureResistance = stats.exposureResistance || 1;
  const diffMods = getDifficultyModifiers(G.difficulty);
  const hydrationState = clamp((state.water / 36) * 100, 0, 100);
  const nutritionState = clamp((state.food / 36) * 100, 0, 100);

  const bt =
    (state.functional_capacity * 0.4) +
    ((G.acclimatization || 0) * 0.35) +
    (hydrationState * 0.1) +
    (nutritionState * 0.05) +
    (diffMods.bodyToleranceBonus || 0) -
    ((state.fatigue * 0.05) / fatigueResistance) -
    ((state.exposure * 0.05) / exposureResistance);

  return clamp(bt, 0, 100);
}

// ── RESOURCE BURN ─────────────────────────────────────────────────────────────

function spendResourcesForMinutes(G, minutes, flags) {
  const stage = getCurrentStage(G);
  const burn = getSimConfig().resourceBurnPerHour?.[stage] || { water: 0.4, food: 0.3 };
  const eff = getCombinedResourceEfficiency(G);
  const hours = minutes / 60;
  const safeEff = Math.max(eff, 0.1);
  const waterBurn = Math.max(0, Math.round((burn.water || 0) * hours / safeEff));
  const foodBurn = Math.max(0, Math.round((burn.food || 0) * hours / safeEff));

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

// ── TIME COST ────────────────────────────────────────────────────────────────

function applyTimeCost(G, action) {
  const mod = getActionModifier(G, action);
  const sim = getSimConfig();
  if (action === 'sleep') {
    G.day += 1;
    G.permitDay = G.day;
    G.minutesOfDay = sim.dayStartMinutes || 360;
    return mod.timeCost || 480;
  }
  const minutes = mod.timeCost || 60;
  G.minutesOfDay += minutes;
  if (G.minutesOfDay >= 1440) {
    G.day += 1;
    G.permitDay = G.day;
    G.minutesOfDay -= 1440;
  }
  return minutes;
}

// ── BIVOUAC PENALTY ──────────────────────────────────────────────────────────

function applyBivouacPenalty(G, ep, flags) {
  const sim = getSimConfig();
  const biv = sim.bivouacPenalty || { ep: 20, fatigue: 18, exposure: 22, persistenceTurns: 8, capacity: 12 };
  if (G.minutesOfDay > 1320 && !isCampPosition(G.state.position)) {
    flags.push('forced-bivouac');
    G.state.fatigue = clamp(G.state.fatigue + biv.fatigue, 0, 100);
    G.state.exposure = clamp(G.state.exposure + biv.exposure, 0, 100);
    G.state.functional_capacity = clamp(G.state.functional_capacity - (biv.capacity || 12), 0, 100);
    G.persistenceTurns = Math.max(G.persistenceTurns, biv.persistenceTurns || 8);
    G.state.persistenceTier = 'critical';
    if (G.minutesOfDay >= 1440) {
      G.minutesOfDay = getSimConfig().dayStartMinutes || 360;
    }
    return ep + (biv.ep || 20);
  }
  return ep;
}

// ── PERCEPTION ───────────────────────────────────────────────────────────────

function calculatePerception(G, { EP, BT, pressureDelta }) {
  const state = G.state;
  const node = getCurrentNode(G);
  const stageMod = getStageModifier(G);
  const stats = G.character?.engine || {};
  const stability = stats.confidenceStability || 1;
  const riskTol = stats.riskTolerance || 1;

  let confidenceLevel = clamp(
    (100 - (node.altitudeBand * 8) - (state.fatigue * 0.35) - (state.exposure * 0.4) -
     ((4 - (state.visibility || 0)) * 6) - (stageMod.confidencePenalty || 0)) * stability,
    5, 95
  );

  const currentEp = EP ?? calculateEP(G).pressureScore;
  const prevEp = G.pressureHistory.length ? G.pressureHistory[G.pressureHistory.length - 1] : currentEp;
  let trendEstimate = currentEp > prevEp + 7 ? 'worsening fast'
    : currentEp > prevEp + 2 ? 'worsening'
    : currentEp < prevEp - 2 ? 'easing'
    : 'steady';

  let noiseLevel = clamp(
    ((100 - confidenceLevel) / 100) * (getSimConfig().noiseRangeAtZeroConf || 18) * riskTol +
    (stats.perceptionBias || 0),
    0, 35
  );

  // Perception latency from character engine
  const latency = G.character?.engine?.perceptionLatency;
  if (latency) {
    const baseDelay = clamp(latency.baseDelay || 0, 0, 0.85);
    if (baseDelay > 0) {
      const stage = getCurrentStage(G);
      const pressureStart = latency.pressureDeltaStart || 18;
      const stageWeight = latency.stageActivation?.[stage] ?? 0;
      const timeStart = latency.timeActivationStart || 780;
      const earlyHintFloor = clamp(latency.minEarlyHint || 0.38, 0.3, 0.75);
      const pressureProgress = clamp((pressureDelta - pressureStart) / 22, 0, 1);
      const timeProgress = clamp((G.minutesOfDay - timeStart) / 240, 0, 1);
      const activationProgress = clamp((pressureProgress * 0.48) + (timeProgress * 0.34) + stageWeight, 0, 1);
      const activationRatio = clamp((1 - baseDelay) + (baseDelay * activationProgress), earlyHintFloor, 1);

      if (activationRatio < 0.99) {
        confidenceLevel = clamp(confidenceLevel * activationRatio, 5, 98);
        noiseLevel = clamp(noiseLevel + ((1 - activationRatio) * 9), 0, 35);
        if (activationRatio < 0.55 && trendEstimate === 'worsening fast') trendEstimate = 'worsening';
        else if (activationRatio < 0.45 && trendEstimate === 'easing') trendEstimate = 'steady';
      }
    }
  }

  // Daniela photo carry effect
  if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) {
    const photoMod = getActionModifier(G, 'shoot_photo');
    const carryConf = Math.min(photoMod.photoCarryConfidenceGain || 3, 4);
    const carryDrop = Math.min((photoMod.photoUncertaintyDrop || 4) - 2, 3);
    trendEstimate = trendEstimate === 'worsening fast' ? 'worsening' : trendEstimate;
    noiseLevel = clamp(noiseLevel - carryDrop, 0, 35);
    confidenceLevel = clamp(confidenceLevel + carryConf, 5, 98);
  }

  // Character guardrails
  const guardrails = G.character?.engine?.perceptionGuardrails || {};
  const minConf = clamp(guardrails.minConfidence ?? 8, 5, 45);
  const maxNoise = clamp(guardrails.maxNoise ?? 35, 18, 35);
  confidenceLevel = clamp(confidenceLevel, minConf, 98);
  noiseLevel = clamp(noiseLevel, 0, maxNoise);

  return { confidenceLevel, trendEstimate, noiseLevel, pressureDelta, EP: currentEp, BT };
}

export function getPerceivedState(G) {
  const ep = calculateEP(G).pressureScore;
  const bt = calculateBT(G);
  const pressureDelta = ep - bt;
  const perception = calculatePerception(G, { EP: ep, BT: bt, pressureDelta });

  let hint = 'Conditions are manageable. Read trend before committing.';
  if (pressureDelta > 30) hint = 'Mountain pressure far exceeds tolerance. Immediate risk.';
  else if (pressureDelta > 15) hint = 'Overexertion territory. Each step costs more than expected.';
  else if (pressureDelta > 5) hint = 'Demanding conditions. Pace carefully.';
  else if (pressureDelta < -10) hint = 'Favorable window. Progress is efficient right now.';

  return {
    trendEstimate: perception.trendEstimate,
    confidenceLevel: Math.round(perception.confidenceLevel),
    noiseLevel: Math.round(perception.noiseLevel),
    hint,
    pressureDelta,
    ep,
    bt,
  };
}

function pressureBandLabel(score) {
  if (score <= 25) return 'Low';
  if (score <= 45) return 'Manageable';
  if (score <= 65) return 'Severe';
  if (score <= 85) return 'Very Severe';
  return 'Extreme';
}

function computeSignals(G) {
  const ep = calculateEP(G);
  const bt = calculateBT(G);
  const pd = ep.pressureScore - bt;
  const perception = calculatePerception(G, { EP: ep.pressureScore, BT: bt, pressureDelta: pd });
  const state = G.state;

  const clampHint = (v) => {
    const gl = G.character?.engine?.perceptionGuardrails || {};
    const min = clamp(gl.minHintLevel ?? 1, 0, 2);
    return Math.max(min, clamp(v, 0, 3));
  };

  return {
    trend: perception.trendEstimate,
    uncertainty: perception.noiseLevel,
    confidence: Math.round(perception.confidenceLevel),
    mountainPressure: pressureBandLabel(ep.pressureScore),
    wHint: clampHint(state.weather_severity),
    vHint: clampHint(state.visibility),
    tHint: clampHint(getCurrentNode(G).terrainLoad),
  };
}

// ── AVAILABLE ACTIONS ─────────────────────────────────────────────────────────

export function getAvailableActions(G) {
  const actions = ['advance', 'advance_slowly', 'wait', 'descend'];
  if (isCampPosition(G.state.position)) actions.push('sleep');
  if (G.character?.id === 'daniela') {
    const mod = getActionModifier(G, 'shoot_photo');
    const maxShots = mod.photoSessionCap || 4;
    const cooldown = mod.photoCooldownTurns || 2;
    if (G.photoShotsTaken < maxShots && (G.turn - G.lastPhotoTurn) >= cooldown) {
      actions.push('shoot_photo');
    }
  }
  return actions;
}

// ── SUMMIT REGRESSION GUARD ───────────────────────────────────────────────────

function applySummitRegressionGuard(stage, acclPenalty, pressureDelta) {
  const guard = {
    acclPenaltyApplied: acclPenalty,
    acclPenaltyCapped: false,
    pressureDeltaApplied: pressureDelta,
    pressureDeltaCapped: false,
  };
  if (stage !== 'SUMMIT_DAY') return guard;

  const acclCap = 22;
  if (guard.acclPenaltyApplied > acclCap) {
    guard.acclPenaltyApplied = acclCap;
    guard.acclPenaltyCapped = true;
  }
  const deltaCap = 52;
  if (guard.pressureDeltaApplied > deltaCap) {
    guard.pressureDeltaApplied = deltaCap;
    guard.pressureDeltaCapped = true;
  }
  return guard;
}

// ── TERMINAL OUTCOME ──────────────────────────────────────────────────────────

function deriveTerminalOutcome({ outcome, G, stage, action, previousPosition, exitedPark }) {
  const summitIdx = POSITIONS.indexOf('summit');
  const summited = Boolean(G.hasSummited) || (summitIdx >= 0 && G.highestPosIdx >= summitIdx);
  const explicitParkExit = exitedPark || (previousPosition === 'horcones' && action === 'descend');

  if (explicitParkExit) {
    if (summited) return 'Summit and Safe Return';
    if (G.highestPosIdx >= POSITIONS.indexOf('camp_colera')) return 'High Point Return';
    return 'Strategic Retreat';
  }

  if (G.permitDay > G.permitMaxDays) return 'Permit Expired';

  const tw = getSimConfig().timeWindows || {};
  const summitLateStart = tw.summitLateStart;
  if (action !== 'descend' && stage === 'SUMMIT_DAY' && summitLateStart != null && G.minutesOfDay >= summitLateStart) {
    return 'Expedition Window Closed';
  }

  return outcome;
}

// ── EVALUATE OUTCOME ──────────────────────────────────────────────────────────

function evaluateOutcome(G, pressureDelta, actionMod, state, context = {}) {
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
    context.summitAdvanceAttempt || context.action === 'advance' || context.action === 'advance_slowly'
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

  const isDescend = context.action === 'descend' && !isHorconesExit;
  if (isDescend && outcome !== 'Collapse (Fatigue)') outcome = 'Advance';

  const isSleep = context.action === 'sleep';
  if (isSleep && outcome === 'Advance') outcome = 'Hold';
  if (isSleep && outcome === 'Retreat') outcome = 'Hold';

  const directionMultiplier = actionMod.progress < 0 ? -1 : 1;
  const step = (outcome === 'Advance' ? 1 : outcome === 'Retreat' ? -1 : 0) * directionMultiplier;
  const targetIndex = isHorconesExit ? nodeIndex : clamp(nodeIndex + step, 0, POSITIONS.length - 1);
  const targetPosition = POSITIONS[targetIndex];
  const blocked = isSummitAdvanceAttempt;
  const moved = targetPosition !== state.position;

  return { outcome, targetPosition, pressureDelta, effectiveDelta, progressChance, collapseChance, survivalChance, blocked, moved };
}

// ── UPDATE STATE ──────────────────────────────────────────────────────────────

function updateStateAfterTurn(G, result, action) {
  const actionMod = getActionModifier(G, action);
  const pressureFactor = clamp((result.effectiveDelta || result.pressureDelta) / 20, 0.5, 2.5);

  const fatigueDelta = actionMod.fatigueDelta * actionMod.fatigueMultiplier;
  G.state.fatigue = clamp(
    G.state.fatigue + (fatigueDelta >= 0 ? fatigueDelta * pressureFactor : fatigueDelta),
    0, 100
  );

  const exposureDelta = actionMod.exposureDelta * actionMod.exposureMultiplier;
  G.state.exposure = clamp(
    G.state.exposure + (exposureDelta >= 0 ? exposureDelta * pressureFactor : exposureDelta),
    0, 100
  );

  const fcPressureCost = Math.max(0, pressureFactor - 1) * 2;
  G.state.functional_capacity = clamp(
    G.state.functional_capacity + actionMod.capacityDelta - fcPressureCost,
    0, 100
  );

  G.state.position = result.targetPosition;
  updateRunState(G, { highestPosIdx: Math.max(G.highestPosIdx, POSITIONS.indexOf(G.state.position)) });

  const summitIdx = POSITIONS.indexOf('summit');
  if (summitIdx >= 0 && POSITIONS.indexOf(G.state.position) >= summitIdx && !G.hasSummited) {
    updateRunState(G, { hasSummited: true });
  }
}

// ── NARRATIVES ─────────────────────────────────────────────────────────────────

const NARRATIVES = {
  advance_good: [
    'The slope opens in a narrow margin. You move inside it, without pretending control.',
    'Progress is measured in disciplined breaths, not in ambition.',
    'The terrain allows passage for now. You accept the terms and keep moving.',
    'Every step asks for balance first, speed second.',
    'The route holds. The body answers. For this turn, that is enough.',
  ],
  advance_severe: [
    'The wind has intent now. You lean into it and spend more than planned.',
    'Forward remains possible, but expensive in ways the watch cannot fully count.',
    'Progress continues under protest from terrain, weather, and breath alike.',
    'Each meter feels borrowed from a later turn.',
  ],
  advance_slowly: [
    'Half pace preserves structure. The mountain notices haste before you do.',
    'Slow movement is still movement; today, that distinction matters.',
    'Cadence replaces force. You trade distance for tomorrow.',
    'Deliberate steps hold the line between effort and error.',
  ],
  wait_low: [
    'Waiting here is strategy, not inertia.',
    'Stillness buys clarity if you can tolerate the clock.',
    'The mountain keeps moving while you do not.',
  ],
  wait_high: [
    'At this altitude, waiting is not rest but managed decay.',
    'The tent blocks wind, not consequence.',
    'You spend less than moving, but never zero.',
    'Holding ground here is already an action.',
  ],
  descend: [
    'Descent is not surrender; it is a complete sentence in mountain logic.',
    'Downward movement preserves options that summits can erase.',
    'You turn before the system turns you.',
    'Retreat converts uncertainty into survival.',
  ],
  slept: [
    'Night at camp recovers structure, never certainty.',
    'Sleep reduces noise, not objective risk.',
    'Morning starts with less debt, not with none.',
    'A camp night is maintenance, not reset.',
  ],
  shoot_photo: [
    'Daniela frames the ridge and catches a shift before it hardens into risk.',
    'A quick shot locks in texture, wind trace, and line quality for the next push.',
    'The lens turns scattered cues into a readable pattern.',
    'She spends minutes now to avoid a blind move later.',
  ],
  crit_exposure: [
    'Exposure is now an active threat to cognition and movement.',
    'Heat loss outruns correction.',
    'This is beyond discomfort.',
  ],
  crit_fatigue: [
    'The body issues a direct warning.',
    'Effort and output have separated.',
    'You can still act, but not reliably.',
  ],
  water_gone: [
    'Water has reached zero; all remaining turns become expensive.',
    'Hydration debt starts collecting immediately.',
  ],
  food_gone: [
    'Food is exhausted. The body shifts to deficit management.',
    'Energy planning is now damage planning.',
  ],
  bivouac: [
    'Open bivouac exacts payment in exposure and capacity.',
    'Unplanned night outside camp accelerates systemic decay.',
  ],
};

const NARRATIVES_ES = {
  advance_good: [
    'La ladera abre un margen estrecho. Te mueves dentro de él, sin fingir control.',
    'El progreso se mide en respiraciones disciplinadas, no en ambición.',
    'El terreno permite el paso por ahora. Aceptas sus términos y sigues.',
  ],
  advance_severe: [
    'El viento ya tiene intención. Te inclinas y gastas más de lo planeado.',
    'Seguir es posible, pero caro en formas que el reloj no cuenta del todo.',
  ],
  advance_slowly: [
    'Medio ritmo preserva estructura. La montaña detecta la prisa antes que tú.',
    'Moverse lento sigue siendo moverse; hoy esa diferencia importa.',
  ],
  wait_low: ['Esperar aquí es estrategia, no inercia.', 'La quietud compra claridad si toleras el reloj.'],
  wait_high: ['A esta altitud, esperar no es descanso sino desgaste gestionado.', 'La carpa frena viento, no consecuencias.'],
  descend: ['Descender no es rendirse; es una oración completa en lógica de montaña.', 'Bajar preserva opciones que una cumbre puede borrar.'],
  slept: ['La noche en campamento recupera estructura, nunca certeza.', 'Dormir reduce ruido, no riesgo objetivo.'],
  shoot_photo: ['Daniela encuadra la cresta y detecta un cambio antes de que se vuelva riesgo.', 'La lente convierte señales dispersas en un patrón legible.'],
  crit_exposure: ['La exposición es ya una amenaza activa para la cognición y el movimiento.'],
  crit_fatigue: ['El cuerpo emite una advertencia directa.', 'El esfuerzo y el rendimiento se han separado.'],
  water_gone: ['El agua llegó a cero; todos los turnos restantes se encarecen.'],
  food_gone: ['La comida se agotó. El cuerpo entra en gestión de déficit.'],
  bivouac: ['Un vivac a cielo abierto cobra en exposición y capacidad.'],
};

function pickNarrative(G, key) {
  const lang = G._lang || 'en';
  const arr = (lang === 'es' ? (NARRATIVES_ES[key] || NARRATIVES[key]) : NARRATIVES[key]);
  if (!arr) return '';
  const rng = G.rng || Math.random;
  return arr[Math.floor(rng() * arr.length)];
}

function buildNarrative(G, action, flags) {
  const s = G.state;
  if (flags.includes('summit-descent-only')) return 'There is no higher ground left. The only meaningful move now is descent.';
  if (flags.includes('critical-exposure')) return pickNarrative(G, 'crit_exposure');
  if (flags.includes('critical-fatigue')) return pickNarrative(G, 'crit_fatigue');
  if (flags.includes('water-depleted')) return pickNarrative(G, 'water_gone');
  if (flags.includes('food-depleted')) return pickNarrative(G, 'food_gone');
  if (flags.includes('forced-bivouac')) return pickNarrative(G, 'bivouac');

  if (action === 'advance_slowly') return pickNarrative(G, 'advance_slowly');
  if (action === 'advance') {
    return s.weather_severity >= 2 ? pickNarrative(G, 'advance_severe') : pickNarrative(G, 'advance_good');
  }
  if (action === 'wait') {
    return getCurrentNode(G).altitudeBand >= 2 ? pickNarrative(G, 'wait_high') : pickNarrative(G, 'wait_low');
  }
  if (action === 'descend') return pickNarrative(G, 'descend');
  if (action === 'sleep') return pickNarrative(G, 'slept');
  if (action === 'shoot_photo') return pickNarrative(G, 'shoot_photo');

  if (s.fatigue >= 65) return pickNarrative(G, 'crit_fatigue');
  if (s.exposure >= 60) return pickNarrative(G, 'crit_exposure');
  return pickNarrative(G, 'advance_good');
}

// ── INIT RUN ──────────────────────────────────────────────────────────────────

export function initRun(G, characterId, scenarioId, difficultyId = 'standard', seed = null) {
  const character = (DATA.characters || []).find((c) => c.id === characterId);
  if (!character) throw new Error(`Unknown character: ${characterId}`);

  const scenarios = DATA.scenariosWebV1?.predefinedScenarios || [];
  const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[0];
  if (!scenario) throw new Error('No scenario found');

  const effectiveSeed = seed ?? (scenario.seeds?.[0] ?? Math.floor(Math.random() * 99999));
  const diffMods = getDifficultyModifiers(difficultyId);

  updateRunState(G, {
    character,
    scenario,
    difficulty: difficultyId,
    seed: effectiveSeed,
    rng: mulberry32(effectiveSeed),
    turn: 1,
    turnLog: [],
    allFlags: [],
    highestPosIdx: POSITIONS.indexOf(scenario.initial.position),
    consecutiveWater0: 0,
    whiteWindRisk: 0,
    day: 1,
    permitDay: 1,
    permitMaxDays: clamp(20 + (diffMods.permitDaysBonus || 0), 12, 26),
    minutesOfDay: getSimConfig().dayStartMinutes || 360,
    irreversibleTriggered: false,
    irreversibleTurn: null,
    runNumber: (G.runNumber || 0) + 1,
    acclimatization: clamp(
      (scenario._acclimatizationBonus || 0) + (diffMods.acclimatizationBonus || 0),
      0, 100
    ),
    consecutiveAdvances: 0,
    persistenceTurns: 0,
    pressureHistory: [],
    hasSummited: false,
    finalOutcome: 'Strategic Retreat',
    photoShotsTaken: 0,
    photoInsightTurns: 0,
    lastPhotoTurn: -99,
    photoLastEffectLabel: '',
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
  });

  const s = JSON.parse(JSON.stringify(scenario.initial));
  const eng = character.engine || {};
  if (eng.functionalCapacityBonus) s.functional_capacity = clamp(s.functional_capacity + eng.functionalCapacityBonus, 0, 100);
  s.functional_capacity = clamp((s.functional_capacity || 0) + (diffMods.initialCapacityBonus || 0), 0, 100);
  s.water = clamp((s.water || 0) + (diffMods.initialWaterBonus || 0), 0, 60);
  s.food = clamp((s.food || 0) + (diffMods.initialFoodBonus || 0), 0, 60);
  s.persistenceTier = 'fresh';

  G.state = s;
  G.signals = computeSignals(G);
}

// ── RESOLVE TURN ──────────────────────────────────────────────────────────────

export function resolveTurn(G, action) {
  const flags = [];
  let resolvedAction = action;
  const state = G.state;
  const attemptedSummitAdvance = state.position === 'summit' && (action === 'advance' || action === 'advance_slowly');

  // Validate shoot_photo
  if (resolvedAction === 'shoot_photo') {
    const mod = getActionModifier(G, 'shoot_photo');
    const maxShots = mod.photoSessionCap || 4;
    const cooldown = mod.photoCooldownTurns || 2;
    if (G.character?.id !== 'daniela' || G.photoShotsTaken >= maxShots || (G.turn - G.lastPhotoTurn) < cooldown) {
      flags.push('photo-action-blocked');
      resolvedAction = 'wait';
    }
  }

  // Block summit advance
  if (state.position === 'summit' && (resolvedAction === 'advance' || resolvedAction === 'advance_slowly')) {
    flags.push('summit-descent-only');
    resolvedAction = 'wait';
  }

  const previousPosition = state.position;
  const currentNode = getCurrentNode(G);
  let actionMod = getActionModifier(G, resolvedAction);

  // Time + resources
  const actionMinutes = applyTimeCost(G, resolvedAction);
  spendResourcesForMinutes(G, Math.max(actionMinutes, 30), flags);

  // Weather update (not for sleep)
  if (resolvedAction !== 'sleep') {
    state.weather_severity = clamp(state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 4);
    state.visibility = clamp(3 - state.weather_severity + rngChoice(G.rng, [-1, 0, 1]), 0, 3);
  }

  // Persistence tier
  if (resolvedAction === 'sleep') {
    updateRunState(G, { persistenceTurns: 0 });
  } else if (currentNode.altitudeBand >= 2) {
    updateRunState(G, { persistenceTurns: G.persistenceTurns + 1 });
  }
  state.persistenceTier = getPersistenceTier(G.persistenceTurns);

  // EP calculation
  let epResult = calculateEP(G);
  epResult.pressureScore = applyBivouacPenalty(G, epResult.pressureScore, flags);

  // Acclimatization penalty
  const stage = getCurrentStage(G);
  const acclNow = G.acclimatization || 0;
  let acclPenalty = 0;
  if (stage === 'HIGH_CAMP' && acclNow < 20) {
    acclPenalty = (20 - acclNow) * 0.6;
    epResult.pressureScore += acclPenalty;
    if (acclNow < 10) flags.push('acclimatization-deficit');
  } else if (stage === 'SUMMIT_DAY' && acclNow < 40) {
    acclPenalty = (40 - acclNow) * 0.8;
    epResult.pressureScore += acclPenalty;
    if (acclNow < 20) flags.push('acclimatization-deficit');
  }

  // BT + delta
  const BT = calculateBT(G);
  const pressureDelta = epResult.pressureScore - BT;

  // Perception + late signal detection
  const perception = calculatePerception(G, { EP: epResult.pressureScore, BT, pressureDelta });

  if (perception.confidenceLevel && pressureDelta >= 18) {
    updateRunState(G, { lateSignalDeterminantTurns: G.lateSignalDeterminantTurns + 1 });
    flags.push('late-signal-lock-in');
  }

  // Photo effect
  if (resolvedAction === 'shoot_photo') {
    const photoMod = getActionModifier(G, 'shoot_photo');
    updateRunState(G, {
      photoShotsTaken: G.photoShotsTaken + 1,
      lastPhotoTurn: G.turn,
      photoInsightTurns: Math.max(G.photoInsightTurns, photoMod.photoInsightTurns || 2),
      photoLastEffectLabel: 'Frame review improved route reading confidence.',
    });
  } else if (G.photoInsightTurns > 0) {
    updateRunState(G, { photoInsightTurns: Math.max(0, G.photoInsightTurns - 1) });
  }

  // Summit regression guard
  const guard = applySummitRegressionGuard(stage, acclPenalty, pressureDelta);
  let finalPressureDelta = guard.pressureDeltaApplied;
  if (guard.pressureDeltaCapped) flags.push('summit-difficulty-guard');

  // Evaluate outcome
  const result = evaluateOutcome(G, finalPressureDelta, actionMod, state, {
    action: resolvedAction,
    altitudeBand: currentNode.altitudeBand,
    summitAdvanceAttempt: attemptedSummitAdvance,
  });

  const exitedPark = previousPosition === 'horcones' && resolvedAction === 'descend';
  updateStateAfterTurn(G, result, resolvedAction);

  // Check fatality/rescue
  let outcome = result.outcome;
  const outsideCamp = !isCampPosition(state.position);
  if (state.functional_capacity <= 5 || state.exposure >= 99) outcome = 'Fatality';
  else if (state.fatigue >= 100) outcome = outsideCamp ? 'Rescue' : 'Collapse (Fatigue)';

  if (!CANONICAL_OUTCOMES.has(outcome) && outcome !== 'Strategic Retreat') outcome = 'Strategic Retreat';

  outcome = deriveTerminalOutcome({
    outcome,
    G,
    stage,
    action: resolvedAction,
    previousPosition,
    exitedPark,
  });

  // Flags
  if (state.functional_capacity < 30) flags.push('critical-fatigue');
  if (state.exposure > 70) flags.push('critical-exposure');
  if (state.water <= 0) flags.push('water-depletion');
  if (state.food <= 0) flags.push('food-depletion');
  if (state.fatigue >= 100 || state.exposure >= 99 || state.functional_capacity <= 5) flags.push('fatality-threshold');

  // Acclimatization gain
  const acclMod = getActionModifier(G, resolvedAction);
  const acclGain = acclMod.acclimatizationGain || 0;
  if (acclGain > 0) {
    const rate = G.character?.engine?.acclimatizationRate ?? 1.0;
    updateRunState(G, { acclimatization: clamp(G.acclimatization + acclGain * rate, 0, 100) });
  }

  // Update pressure history + turn counter (for non-terminal turns)
  const currentEP = calculateEP(G).pressureScore;
  updateRunState(G, {
    pressureHistory: [...(G.pressureHistory || []), currentEP].slice(-5),
    signals: computeSignals(G),
  });

  const narrative = buildNarrative(G, resolvedAction, flags);

  return { result, outcome, flags, narrative, resolvedAction };
}
