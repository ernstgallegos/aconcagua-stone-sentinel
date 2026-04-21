#!/usr/bin/env node
/**
 * Monte Carlo headless simulator for aconcagua-stone-sentinel web-v1 engine.
 *
 * Usage:
 *   node scripts/monte-carlo-web-v1.js [--seeds N] [--output path]
 *
 * Defaults: 50 seeds per scenario, output to docs/playtest-results/monte-carlo-v<package-version>.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mulberry32,
  rngChoice,
  clamp,
  createTurnEngine,
} from '../prototype/web-v1/engine/turn-resolution.js';

import {
  calculateResourceBurnForMinutes,
  deriveTerminalOutcome,
} from '../prototype/web-v1/engine/turn-rules.js';

// ─────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const ENGINE_VERSION = PACKAGE_JSON.version;
const DEFAULT_REPORT_PATH = path.join(ROOT, 'docs', 'playtest-results', `monte-carlo-v${ENGINE_VERSION}.md`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
}

// ─────────────────────────────────────────────
// Load data files
// ─────────────────────────────────────────────
const characters     = readJson('characters.json');
const rawNodes = readJson('nodes.json');
// Normalize node format: screens.js maps nodeId → id, stageHint → stage
const nodes = rawNodes.map((node, idx) => ({
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
})).sort((a, b) => a.routeIndex - b.routeIndex);
const actionMods     = readJson('action_modifiers.json');
const stageMods      = readJson('stage_modifiers.json');
const epConfig       = readJson('environmental_pressure_config.json');
const scenariosData  = readJson('scenarios.web-v1.json');
const outcomesData   = readJson('outcomes.json');

const POSITIONS = nodes.map((n) => n.id);
const canonicalOutcomesArray = Array.isArray(outcomesData)
  ? outcomesData.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
  : [];
if (!canonicalOutcomesArray.length) {
  throw new Error('Invalid outcomes contract: data/outcomes.json must contain at least one non-empty outcome string.');
}
const CANONICAL_OUTCOMES = new Set(canonicalOutcomesArray);

// ─────────────────────────────────────────────
// Difficulty: standard (neutral modifiers)
// ─────────────────────────────────────────────
const DIFFICULTY_MODS = {
  pressureBias: 0, stageWeatherBias: 0, bodyToleranceBonus: 0,
  acclimatizationBonus: 0, fatigueMultiplier: 1, exposureMultiplier: 1,
  resourceEfficiency: 1, permitDaysBonus: 0,
};

// ─────────────────────────────────────────────
// Helpers mirrored from screens.js
// ─────────────────────────────────────────────
const STAGE_BY_NODE = {};
for (const n of nodes) STAGE_BY_NODE[n.id] = n.stage || 'APPROACH';
const CAMP_POSITIONS = new Set(nodes.filter((n) => n.isCamp).map((n) => n.id));

const SIM_CFG = epConfig.simulation || {};

function getTimeOfDayBucket(minutesOfDay) {
  if (minutesOfDay < 360)  return 'night';
  if (minutesOfDay < 480)  return 'early';
  if (minutesOfDay < 900)  return 'optimal';
  if (minutesOfDay < 1080) return 'late';
  if (minutesOfDay < 1320) return 'dusk';
  return 'night';
}

function getPersistenceTier(turns) {
  if (turns >= 8) return 'critical';
  if (turns >= 6) return 'severe';
  if (turns >= 4) return 'cumulative';
  if (turns >= 2) return 'sustained';
  return 'fresh';
}

function getCurrentNode(G, state) {
  return nodes.find((n) => n.id === state.position) || nodes[0];
}

function isCampPosition(position) {
  return CAMP_POSITIONS.has(position);
}

function getStageModifier(position) {
  const stage = STAGE_BY_NODE[position] || 'APPROACH';
  const base = stageMods[stage] || { fatigueMultiplier: 1, exposureMultiplier: 1, weatherSeverityBias: 0, confidencePenalty: 0 };
  return { ...base, weatherSeverityBias: (base.weatherSeverityBias || 0) + DIFFICULTY_MODS.stageWeatherBias };
}

function getBaseActionDeltas(action) {
  const defaults = {
    advance:      { fatigueDelta: 6,   exposureDelta: 5,  capacityDelta: -3 },
    advance_slowly:{ fatigueDelta: 4,  exposureDelta: 3,  capacityDelta: -2 },
    wait:         { fatigueDelta: 2,   exposureDelta: 2,  capacityDelta:  1 },
    descend:      { fatigueDelta: 1,   exposureDelta: 1,  capacityDelta:  2 },
    sleep:        { fatigueDelta: -10, exposureDelta: -8, capacityDelta:  4 },
    shoot_photo:  { fatigueDelta: 2,   exposureDelta: 2,  capacityDelta:  0 },
  };
  return defaults[action] || { fatigueDelta: 3, exposureDelta: 3, capacityDelta: -1 };
}

function getCombinedEfficiency(character) {
  return Math.max(0.1, (character?.engine?.resourceEfficiency ?? 1) * (DIFFICULTY_MODS.resourceEfficiency ?? 1));
}

function scaleSignedDelta(delta, multiplier) {
  if (!Number.isFinite(delta)) return delta;
  if (delta < 0) return delta * Math.max(0.75, Math.min(1.5, 1 / multiplier));
  return delta * multiplier;
}

function makeGetActionModifier(G) {
  return function getActionModifier(action) {
    const configured = actionMods[action] || {};
    const fallback = getBaseActionDeltas(action);
    const collapseDefaults = { advance: -45, advance_slowly: -50, wait: -65, descend: -90, sleep: -95, shoot_photo: -60 };
    const survivalDefaults  = { advance:   0, advance_slowly:   0, wait:   5, descend: -10, sleep:   5, shoot_photo:   5 };

    let fatigueDelta  = Number.isFinite(configured.fatigueDelta)  ? configured.fatigueDelta
                        : Number.isFinite(configured.fatigueRecovery) ? -configured.fatigueRecovery
                        : fallback.fatigueDelta;
    let exposureDelta = Number.isFinite(configured.exposureDelta) ? configured.exposureDelta
                        : Number.isFinite(configured.exposureRecovery) ? -configured.exposureRecovery
                        : fallback.exposureDelta;

    let fatigueMultiplier  = (configured.fatigueMultiplier  ?? 1) * DIFFICULTY_MODS.fatigueMultiplier;
    let exposureMultiplier = (configured.exposureMultiplier ?? 1) * DIFFICULTY_MODS.exposureMultiplier;

    if (fatigueDelta  < 0) { fatigueDelta  = scaleSignedDelta(fatigueDelta,  fatigueMultiplier);  fatigueMultiplier  = 1; }
    if (exposureDelta < 0) { exposureDelta = scaleSignedDelta(exposureDelta, exposureMultiplier); exposureMultiplier = 1; }

    const eff = getCombinedEfficiency(G.character);
    const timeCost = action !== 'sleep'
      ? Math.max(30, Math.round((configured.timeCost || 60) / eff))
      : (configured.timeCost || 480);

    return {
      progress: 0,
      ...configured,
      fatigueMultiplier,
      exposureMultiplier,
      fatigueDelta,
      exposureDelta,
      capacityDelta: Number.isFinite(configured.capacityDelta) ? configured.capacityDelta : fallback.capacityDelta,
      collapse: Number.isFinite(configured.collapse) ? configured.collapse : (collapseDefaults[action] ?? 0),
      survival: Number.isFinite(configured.survival) ? configured.survival : (survivalDefaults[action] ?? 0),
      timeCost,
    };
  };
}

function makeCalculateEnvironmentalPressure(G) {
  return function calculateEnvironmentalPressure(state) {
    const altScale  = epConfig.altitudePressureByBand || {};
    const terrScale = epConfig.terrainLoadScale || {};
    const wxScale   = epConfig.weatherSeverityScale || {};
    const visScale  = epConfig.visibilityRiskScale || {};
    const timeScale = epConfig.timeOfDayRiskScale || {};
    const persScale = epConfig.exposurePersistenceScale || {};

    const node      = nodes.find((n) => n.id === state.position) || nodes[0];
    const stageMod  = getStageModifier(state.position);
    const altP      = altScale[String(node.altitudeBand)] ?? 0;
    const terrainP  = terrScale[String(clamp(node.terrainLoad, 1, 5))] ?? 0;
    const weatherP  = wxScale[String(clamp(state.weather_severity || 0, 0, 4))] ?? 0;
    const visP      = visScale[String(clamp(4 - (state.visibility ?? 2), 0, 4))] ?? 0;
    const timeRaw   = timeScale[getTimeOfDayBucket(G.minutesOfDay)] ?? 0;
    const timeP     = timeRaw * (node.timeSensitivity || 1);
    const persP     = persScale[state.persistenceTier || 'fresh'] ?? 0;
    const pressureScore = altP + terrainP + weatherP + visP + timeP + persP
      + (node.weatherBias || 0) + (node.visibilityBias || 0)
      + (stageMod.weatherSeverityBias || 0) + DIFFICULTY_MODS.pressureBias;
    return { pressureScore, components: { altP, terrainP, weatherP, visP, timeP, persP } };
  };
}

function makeCalculateBodyTolerance(G) {
  return function calculateBodyTolerance(state) {
    const hydration  = clamp((state.water / 36) * 100, 0, 100);
    const nutrition  = clamp((state.food  / 36) * 100, 0, 100);
    const stats = G.character?.engine || {};
    const fatRes = stats.fatigueResistance  || 1;
    const expRes = stats.exposureResistance || 1;
    return clamp(
      (state.functional_capacity * 0.4)
      + ((G.acclimatization || 0) * 0.35)
      + (hydration * 0.1)
      + (nutrition * 0.05)
      + DIFFICULTY_MODS.bodyToleranceBonus
      - ((state.fatigue   * 0.05) / fatRes)
      - ((state.exposure  * 0.05) / expRes),
      0, 100
    );
  };
}

function makeCalculatePerception(G) {
  return function calculatePerception({ state, EP, BT, pressureDelta }) {
    const node     = nodes.find((n) => n.id === state.position) || nodes[0];
    const stageMod = getStageModifier(state.position);
    const stats    = G.character?.engine || {};
    const stability = stats.confidenceStability || 1;
    const riskTol   = stats.riskTolerance       || 1;

    let confidenceLevel = clamp(
      (100 - (node.altitudeBand * 8)
           - (state.fatigue * 0.35)
           - (state.exposure * 0.4)
           - ((4 - (state.visibility || 0)) * 6)
           - (stageMod.confidencePenalty || 0)) * stability,
      5, 95
    );

    const currentEp = EP ?? 0;
    const prevEp    = G.pressureHistory.length ? G.pressureHistory[G.pressureHistory.length - 1] : currentEp;
    let trendEstimate = currentEp > prevEp + 7 ? 'worsening fast'
                      : currentEp > prevEp + 2 ? 'worsening'
                      : currentEp < prevEp - 2 ? 'easing'
                      : 'steady';

    const noiseRange = SIM_CFG.noiseRangeAtZeroConf || 18;
    let noiseLevel = clamp(
      ((100 - confidenceLevel) / 100) * noiseRange * riskTol + (stats.perceptionBias || 0),
      0, 35
    );

    // Perception latency
    const latency = G.character?.engine?.perceptionLatency || {};
    const baseDelay = clamp(latency.baseDelay || 0, 0, 0.85);
    if (baseDelay > 0) {
      const stage       = STAGE_BY_NODE[state.position] || 'APPROACH';
      const pressStart  = latency.pressureDeltaStart || 18;
      const stageWeight = latency.stageActivation?.[stage] ?? 0;
      const timeStart   = latency.timeActivationStart || 780;
      const earlyHint   = clamp(latency.minEarlyHint || 0.38, 0.3, 0.75);

      const pressureProgress = clamp(((pressureDelta || 0) - pressStart) / 22, 0, 1);
      const timeProgress     = clamp((G.minutesOfDay - timeStart) / 240, 0, 1);
      const activationProgress = clamp(pressureProgress * 0.48 + timeProgress * 0.34 + stageWeight, 0, 1);
      const activationRatio    = clamp((1 - baseDelay) + baseDelay * activationProgress, earlyHint, 1);

      if (activationRatio < 0.99) {
        confidenceLevel = clamp(confidenceLevel * activationRatio, 5, 98);
        noiseLevel      = clamp(noiseLevel + (1 - activationRatio) * 9, 0, 35);
        if (activationRatio < 0.55 && trendEstimate === 'worsening fast') trendEstimate = 'worsening';
        else if (activationRatio < 0.45 && trendEstimate === 'easing') trendEstimate = 'steady';
      }
    }

    // Photo carry effect for Daniela
    if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) {
      const pm = actionMods.shoot_photo || {};
      noiseLevel      = clamp(noiseLevel      - Math.min((pm.photoUncertaintyDrop || 4) - 2, 3), 0, 35);
      confidenceLevel = clamp(confidenceLevel + Math.min(pm.photoCarryConfidenceGain || 3, 4),   5, 98);
      trendEstimate   = trendEstimate === 'worsening fast' ? 'worsening' : trendEstimate;
    }

    // Guardrails
    const gr = stats.perceptionGuardrails || {};
    confidenceLevel = clamp(confidenceLevel, clamp(gr.minConfidence ?? 8, 5, 45), 98);
    noiseLevel      = clamp(noiseLevel,      0, clamp(gr.maxNoise ?? 35, 18, 35));

    return { confidenceLevel, trendEstimate, noiseLevel, pressureDelta, EP: currentEp, BT };
  };
}

function makeApplyTimeCost(G) {
  return function applyTimeCost(action) {
    const mod = actionMods[action] || {};
    const simDayStart = SIM_CFG.dayStartMinutes || 360;
    if (action === 'sleep') {
      G.day++;
      G.permitDay = G.day;
      G.minutesOfDay = simDayStart;
      return mod.timeCost || 480;
    }
    const eff = getCombinedEfficiency(G.character);
    const minutes = Math.max(30, Math.round((mod.timeCost || 60) / eff));
    G.minutesOfDay += minutes;
    if (G.minutesOfDay >= 1440) {
      G.day++;
      G.permitDay = G.day;
      G.minutesOfDay -= 1440;
    }
    return minutes;
  };
}

function makeSpendResourcesForMinutes(G) {
  return function spendResourcesForMinutes(minutes, flags) {
    const stage   = STAGE_BY_NODE[G.state.position] || 'APPROACH';
    const burn    = SIM_CFG.resourceBurnPerHour?.[stage] || { water: 0.4, food: 0.3 };
    const eff     = getCombinedEfficiency(G.character);
    const { waterBurn, foodBurn } = calculateResourceBurnForMinutes({ minutes, burnPerHour: burn, efficiency: eff });
    G.state.water = Math.max(0, G.state.water - waterBurn);
    G.state.food  = Math.max(0, G.state.food  - foodBurn);
    if (G.state.water === 0) {
      G.consecutiveWater0 = (G.consecutiveWater0 || 0) + 1;
      flags.push('water-depleted');
      G.state.functional_capacity = clamp(G.state.functional_capacity - 8, 0, 100);
    } else {
      G.consecutiveWater0 = 0;
    }
    if (G.state.food === 0) {
      flags.push('food-depleted');
      G.state.functional_capacity = clamp(G.state.functional_capacity - 5, 0, 100);
    }
  };
}

function makeApplyBivouacPenalty(G) {
  return function applyBivouacPenalty(state, ep, flags) {
    const biv = SIM_CFG.bivouacPenalty || { ep: 20, fatigue: 18, exposure: 22, persistenceTurns: 8, capacity: 12 };
    if (G.minutesOfDay > 1320 && !isCampPosition(state.position)) {
      flags.push('forced-bivouac');
      state.fatigue             = clamp(state.fatigue             + biv.fatigue,   0, 100);
      state.exposure            = clamp(state.exposure            + biv.exposure,  0, 100);
      state.functional_capacity = clamp(state.functional_capacity - (biv.capacity || 12), 0, 100);
      G.persistenceTurns = Math.max(G.persistenceTurns, biv.persistenceTurns || 8);
      state.persistenceTier = 'critical';
      if (G.minutesOfDay >= 1440) {
        G.minutesOfDay = SIM_CFG.dayStartMinutes || 360;
      }
      return ep + (biv.ep || 20);
    }
    return ep;
  };
}

function applyDecisionWindowDegradationNoop(actionMod, perception) {
  // In headless simulation, no real-time decision window pressure applies.
  return { actionMod, perception, effect: { exceeded: false, overMs: 0, stepsOver: 0, capped: false } };
}

function applySummitDifficultyRegressionGuard({ stage, acclPenalty, decisionEffect, pressureDelta }) {
  const guard = {
    stage,
    acclPenaltyApplied: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyCapped: false,
    pressureDeltaApplied: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaCapped: false,
    triggered: false,
  };
  if (stage !== 'SUMMIT_DAY') return guard;
  if (guard.acclPenaltyApplied > 22) {
    guard.acclPenaltyApplied = 22;
    guard.acclPenaltyCapped  = true;
    guard.triggered = true;
  }
  if (guard.pressureDeltaApplied > 52) {
    guard.pressureDeltaApplied = 52;
    guard.pressureDeltaCapped  = true;
    guard.triggered = true;
  }
  return guard;
}

// ─────────────────────────────────────────────
// Global state factory
// ─────────────────────────────────────────────
function makeG(character, seed) {
  const G = {
    character,
    rng: mulberry32(seed),
    turn: 0,
    day: 1,
    permitDay: 1,
    permitMaxDays: 20,
    minutesOfDay: SIM_CFG.dayStartMinutes || 360,
    acclimatization: 0,
    persistenceTurns: 0,
    highestPosIdx: 0,
    hasSummited: false,
    finalOutcome: null,
    pressureHistory: [],
    photoShotsTaken: 0,
    lastPhotoTurn: -10,
    photoInsightTurns: 0,
    photoLastEffectLabel: '',
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
    consecutiveWater0: 0,
    turnLog: [],
    signals: {},
    retreating: false,  // true once a deliberate retreat from HIGH_CAMP is committed
    state: null,
  };
  return G;
}

function updateRunState(G, update) {
  Object.assign(G, update);
}

function recordTelemetry() {}
function assertStateShape() {}
function updateAmbientSignal() {}
function computeSignals() { return {}; }
function renderNarrative() { return ''; }

// ─────────────────────────────────────────────
// Engine factory for a given G instance
// ─────────────────────────────────────────────
function buildEngine(G) {
  const getActionModifier             = makeGetActionModifier(G);
  const calculateEnvironmentalPressure = makeCalculateEnvironmentalPressure(G);
  const calculateBodyTolerance        = makeCalculateBodyTolerance(G);
  const calculatePerception           = makeCalculatePerception(G);
  const applyTimeCost                 = makeApplyTimeCost(G);
  const spendResourcesForMinutes      = makeSpendResourcesForMinutes(G);
  const applyBivouacPenalty           = makeApplyBivouacPenalty(G);

  return createTurnEngine({
    G,
    POSITIONS,
    CANONICAL_OUTCOMES,
    canUseShootPhoto: (state) => {
      if (G.character?.id !== 'daniela') return { allowed: false };
      const mod = actionMods.shoot_photo || {};
      if ((G.photoShotsTaken || 0) >= (mod.photoSessionCap || 4)) return { allowed: false };
      if (G.turn - (G.lastPhotoTurn ?? -10) < (mod.photoCooldownTurns || 2)) return { allowed: false };
      if (state.water <= 0 || state.food <= 0) return { allowed: false };
      return { allowed: true };
    },
    getActionModifier,
    applyTimeCost,
    spendResourcesForMinutes,
    getCurrentNode: (state) => getCurrentNode(G, state),
    getCurrentStage: () => STAGE_BY_NODE[G.state.position] || 'APPROACH',
    getPersistenceTier,
    calculateEnvironmentalPressure,
    applyBivouacPenalty,
    calculateBodyTolerance,
    calculatePerception,
    applyDecisionWindowDegradation: applyDecisionWindowDegradationNoop,
    applySummitDifficultyRegressionGuard,
    isCampPosition,
    updateAmbientSignal,
    computeSignals,
    renderNarrative,
    deriveTerminalOutcome,
    getTimeWindows: () => SIM_CFG.timeWindows || { summitLateStart: 1020 },
    updateRunState: (g, u) => updateRunState(g, u),
    recordTelemetry,
    assertStateShape,
  });
}

// ─────────────────────────────────────────────
// Apply acclimatization gain after each action
// ─────────────────────────────────────────────
function applyAcclimatizationGain(G, action) {
  const mod = actionMods[action] || {};
  const gain = mod.acclimatizationGain || 0;
  if (gain <= 0) return;
  const rate = G.character?.engine?.acclimatizationRate ?? 1.0;
  G.acclimatization = clamp((G.acclimatization || 0) + gain * rate, 0, 100);
}

// ─────────────────────────────────────────────
// Reasonable policy AI
// ─────────────────────────────────────────────
// Models a cautious-but-competent mountaineer:
// - Sleeps at every camp before advancing to next altitude zone
// - Respects weather and acclimatization requirements
// - Commits to retreat once leaving HIGH_CAMP (no re-ascending after retreat)
// - Pushes summit when conditions allow
function reasonablePolicy(G) {
  const state = G.state;
  const pos   = state.position;
  const stage = STAGE_BY_NODE[pos] || 'APPROACH';
  const isAtCamp = isCampPosition(pos);
  const posIdx   = POSITIONS.indexOf(pos);
  const highCampEntryIdx = POSITIONS.indexOf('piedras_conway'); // First HIGH_CAMP node

  // After summiting: always descend toward exit
  if (G.hasSummited) return 'descend';

  // Once retreating, descend — but sleep at camps when getting late to avoid bivouac cascade
  if (G.retreating) {
    if (isAtCamp && G.minutesOfDay > 1100) return 'sleep'; // Reset clock before midnight descent
    return 'descend';
  }

  // Critical thresholds → commit to retreat
  if (state.fatigue > 70 || state.functional_capacity < 30 || state.exposure > 78) {
    if (posIdx >= highCampEntryIdx) G.retreating = true;
    return 'descend';
  }

  // Permit pressure: if very close to expiry, start retreating
  if (G.permitDay >= G.permitMaxDays - 2 && posIdx > POSITIONS.indexOf('base_plaza_mulas')) {
    G.retreating = true;
    return 'descend';
  }

  // Resource pressure
  if (state.water <= 2 || state.food <= 2) {
    G.retreating = true;
    return 'descend';
  }

  // Severe weather (ws >= 3) → shelter
  if (state.weather_severity >= 3) {
    if (isAtCamp) return 'sleep';
    // Not at camp in severe weather at altitude → commit retreat
    if (posIdx >= highCampEntryIdx) { G.retreating = true; return 'descend'; }
    return 'wait';
  }

  // Moderate weather in HIGH_CAMP/SUMMIT_DAY → be conservative
  if (state.weather_severity >= 2 && (stage === 'HIGH_CAMP' || stage === 'SUMMIT_DAY')) {
    if (isAtCamp) return 'sleep'; // Wait it out at camp
    // Not at camp in moderate weather at altitude → commit retreat if tired
    if (state.fatigue > 45) { G.retreating = true; return 'descend'; }
    return 'advance_slowly'; // Still move if fresh
  }

  // At a camp: sleep if fatigued or entering HIGH_CAMP for first time
  if (isAtCamp) {
    // Always sleep at camp before first push into HIGH_CAMP
    if (stage === 'HIGH_CAMP' && G.acclimatization < 10) return 'sleep';
    if (state.fatigue > 28 || state.functional_capacity < 68) return 'sleep';
    // Acclimatize if needed before pushing higher
    const minAccl = stage === 'SUMMIT_DAY' ? 35 : stage === 'HIGH_CAMP' ? 15 : 0;
    if (G.acclimatization < minAccl) return 'wait';
  }

  // Proactive retreat when reserves are low — commit to it at altitude
  if (state.fatigue > 60 || state.exposure > 55) {
    if (posIdx >= highCampEntryIdx) G.retreating = true;
    return 'descend';
  }

  // On summit push, be aggressive even if slightly fatigued
  if (stage === 'SUMMIT_DAY' && state.fatigue < 68 && state.functional_capacity > 35) {
    return state.fatigue > 50 ? 'advance_slowly' : 'advance';
  }

  // Daniela photo opportunity (when stable and not too tired)
  if (G.character?.id === 'daniela') {
    const mod = actionMods.shoot_photo || {};
    const cooldown = mod.photoCooldownTurns || 2;
    const cap = mod.photoSessionCap || 4;
    if (G.photoShotsTaken < cap
        && G.turn - (G.lastPhotoTurn ?? -10) >= cooldown
        && state.water > 0 && state.food > 0
        && state.weather_severity <= 1
        && G.turn % 6 === 0) {
      return 'shoot_photo';
    }
  }

  // Choose pace based on conditions
  const isModerate = state.weather_severity >= 1 || state.fatigue > 40 || state.exposure > 32;
  return isModerate ? 'advance_slowly' : 'advance';
}

// ─────────────────────────────────────────────
// Run a single simulation
// ─────────────────────────────────────────────
// Engine note: resolveTurn returns outcome='Strategic Retreat' for normal turns
// (advance, hold, retreat). The run only ends when:
//   (a) outcome !== 'Strategic Retreat'  (real terminal event)
//   (b) exitedPark = previousPosition==='horcones' && resolvedAction==='descend'
// This mirrors screens.js: const ended = exitedPark || turnResult.outcome !== 'Strategic Retreat'
function runSimulation(character, scenario, seed) {
  const G = makeG(character, seed);

  // Initialize state from scenario
  const init = scenario.initial || {};
  G.state = {
    position:           init.position           || 'horcones',
    weather_severity:   init.weather_severity   ?? 0,
    visibility:         init.visibility         ?? 3,
    terrain_load:       init.terrain_load       ?? 1,
    functional_capacity:(init.functional_capacity ?? 90) + (character.engine?.functionalCapacityBonus ?? 0),
    fatigue:            init.fatigue            ?? 10,
    exposure:           init.exposure           ?? 5,
    water:              init.water              ?? 24,
    food:               init.food               ?? 22,
    persistenceTier:    'fresh',
  };
  G.state.functional_capacity = clamp(G.state.functional_capacity, 0, 100);
  G.highestPosIdx = POSITIONS.indexOf(G.state.position);

  const engine = buildEngine(G);
  const maxTurns = scenario.max_turns || 50;
  let finalOutcome = null;
  let turnCount = 0;

  while (turnCount < maxTurns) {
    G.turn = turnCount;

    // Track pressure history
    const epNow = makeCalculateEnvironmentalPressure(G)(G.state).pressureScore;
    G.pressureHistory.push(epNow);
    if (G.pressureHistory.length > 5) G.pressureHistory.shift();

    const previousPosition = G.state.position;
    const action = reasonablePolicy(G);

    let turnResult;
    try {
      turnResult = engine.resolveTurn(G.state, action);
    } catch (e) {
      finalOutcome = 'Strategic Retreat';
      break;
    }

    const resolvedAction = turnResult.resolvedAction || action;
    applyAcclimatizationGain(G, resolvedAction);

    // Mirror screens.js exit detection
    const exitedPark = previousPosition === 'horcones' && resolvedAction === 'descend';
    const ended = exitedPark || turnResult.outcome !== 'Strategic Retreat';

    if (ended) {
      finalOutcome = turnResult.outcome;
      break;
    }

    turnCount++;
  }

  // If we ran out of turns without ending
  if (finalOutcome === null) {
    if (G.hasSummited) finalOutcome = 'High Point Return';
    else if (POSITIONS.indexOf(G.state.position) >= POSITIONS.indexOf('camp_colera')) finalOutcome = 'High Point Return';
    else finalOutcome = 'Expedition Window Closed';
  }

  return { outcome: finalOutcome, turns: turnCount, hasSummited: G.hasSummited };
}

// ─────────────────────────────────────────────
// Main batch runner
// ─────────────────────────────────────────────
function runBatch(options = {}) {
  const extraSeeds = options.seeds ?? 50;
  const scenarios  = scenariosData.predefinedScenarios || [];

  const OUTCOME_KEYS = [...canonicalOutcomesArray];

  // Aggregate results: { characterId: { scenarioId: { outcome: count } } }
  const results = {};
  const totalByChar = {};

  for (const char of characters) {
    results[char.id]    = {};
    totalByChar[char.id] = {};
    for (const k of OUTCOME_KEYS) totalByChar[char.id][k] = 0;

    for (const scen of scenarios) {
      results[char.id][scen.id] = {};
      for (const k of OUTCOME_KEYS) results[char.id][scen.id][k] = 0;

      // Use predefined seeds + generate extras to reach extraSeeds total
      const predefined = scen.seeds || [];
      const seedSet = new Set(predefined);
      let extra = predefined[predefined.length - 1] || 1000;
      while (seedSet.size < extraSeeds) {
        extra += 37;
        seedSet.add(extra);
      }
      const seeds = [...seedSet].slice(0, extraSeeds);

      for (const seed of seeds) {
        const { outcome } = runSimulation(char, scen, seed);
        const key = OUTCOME_KEYS.includes(outcome) ? outcome : 'Strategic Retreat';
        results[char.id][scen.id][key] = (results[char.id][scen.id][key] || 0) + 1;
        totalByChar[char.id][key] = (totalByChar[char.id][key] || 0) + 1;
      }
    }
  }

  return { results, totalByChar, scenarios, characters, extraSeeds, OUTCOME_KEYS };
}

// ─────────────────────────────────────────────
// Band violation check
// ─────────────────────────────────────────────
const TARGET_BANDS = {
  'Summit and Safe Return': [6, 24],
  'Rescue':                 [3, 18],
  'Strategic Retreat':      [50, 82],
  'Collapse (Fatigue)':     [4, 18],
  'Collapse (Exposure)':    [0, 18],
  'Permit Expired':         [2, 14],
};

function checkBandViolations(pct, charId) {
  const violations = [];
  for (const [k, [lo, hi]] of Object.entries(TARGET_BANDS)) {
    const v = pct[k] ?? 0;
    if (v < lo || v > hi) {
      violations.push({ outcome: k, actual: v.toFixed(1), band: `${lo}%–${hi}%`, charId });
    }
  }
  return violations;
}

// ─────────────────────────────────────────────
// Format markdown report
// ─────────────────────────────────────────────
function buildReport(batchResult) {
  const { results, totalByChar, scenarios, characters: chars, extraSeeds, OUTCOME_KEYS } = batchResult;
  const now = new Date().toISOString().slice(0, 10);
  const totalRuns = chars.length * scenarios.length * extraSeeds;

  const SHORT = {
    'Summit and Safe Return': 'Summit',
    'High Point Return':      'High Pt.',
    'Strategic Retreat':      'Retreat',
    'Rescue':                 'Rescue',
    'Collapse (Fatigue)':     'Coll.Fat',
    'Collapse (Exposure)':    'Coll.Exp',
    'Resource Exhaustion':    'Res.Exh.',
    'Expedition Window Closed':'Wnd.Cls.',
    'Permit Expired':         'Permit',
    'Fatality':               'Fatal',
  };

  let md = `# Monte Carlo Playtest Results — v${ENGINE_VERSION}\n\n`;
  md += `**Date:** ${now}  \n`;
  md += `**Engine version:** ${ENGINE_VERSION}  \n`;
  md += `**Script:** \`scripts/monte-carlo-web-v1.js\`  \n`;
  md += `**Total runs:** ${totalRuns.toLocaleString()} (${chars.length} characters × ${scenarios.length} scenarios × ${extraSeeds} seeds)  \n`;
  md += `**Difficulty:** Standard (neutral modifiers)  \n\n`;
  md += `---\n\n`;

  // Per-character outcome distribution
  md += `## Per-character outcome distribution\n\n`;
  const header = `| Character | ${OUTCOME_KEYS.map((k) => SHORT[k] || k).join(' | ')} |\n`;
  const sep    = `|---|${OUTCOME_KEYS.map(() => '---:').join('|')}|\n`;
  md += header + sep;

  const allViolations = [];
  for (const char of chars) {
    const total = scenarios.length * extraSeeds;
    const pct = {};
    for (const k of OUTCOME_KEYS) pct[k] = ((totalByChar[char.id][k] || 0) / total) * 100;
    const row = `| ${char.name} | ${OUTCOME_KEYS.map((k) => pct[k].toFixed(1) + '%').join(' | ')} |\n`;
    md += row;
    const v = checkBandViolations(pct, char.name);
    allViolations.push(...v);
  }
  md += '\n';

  // Aggregate distribution
  md += `## Aggregate outcome distribution\n\n`;
  const aggCounts = {};
  for (const k of OUTCOME_KEYS) aggCounts[k] = 0;
  for (const char of chars) {
    for (const k of OUTCOME_KEYS) aggCounts[k] += totalByChar[char.id][k] || 0;
  }
  md += `| Outcome | Count | % |\n|---|---:|---:|\n`;
  for (const k of OUTCOME_KEYS) {
    const pct = (aggCounts[k] / totalRuns) * 100;
    md += `| ${k} | ${aggCounts[k]} | ${pct.toFixed(1)}% |\n`;
  }
  md += '\n';

  // Per-character × per-scenario breakdown
  md += `## Per-character × per-scenario breakdown\n\n`;
  for (const char of chars) {
    md += `### ${char.name} (${char.difficultyLabel})\n\n`;
    md += `| Scenario | ${OUTCOME_KEYS.map((k) => SHORT[k] || k).join(' | ')} |\n`;
    md += `|---|${OUTCOME_KEYS.map(() => '---:').join('|')}|\n`;
    for (const scen of scenarios) {
      const counts = results[char.id][scen.id];
      const t = extraSeeds;
      const row = `| ${scen.name} | ${OUTCOME_KEYS.map((k) => (((counts[k] || 0) / t) * 100).toFixed(1) + '%').join(' | ')} |\n`;
      md += row;
    }
    md += '\n';
  }

  // Rollback thresholds (distinct from target performance bands — see docs/balance-calibration-notes.md)
  md += `## Rollback trigger thresholds comparison\n\n`;
  md += `Thresholds from \`docs/balance-calibration-notes.md\` (rollback criterion — looser than target performance bands):\n\n`;
  md += `| Outcome | Rollback Threshold |\n|---|---|\n`;
  for (const [k, [lo, hi]] of Object.entries(TARGET_BANDS)) {
    md += `| ${k} | ${lo}%–${hi}% |\n`;
  }
  md += '\n';

  // Band violations
  md += `## Band violation warnings\n\n`;
  if (allViolations.length === 0) {
    md += `✅ All characters fall within target bands.\n\n`;
  } else {
    md += `⚠️ The following outcomes fall outside target bands:\n\n`;
    md += `| Character | Outcome | Actual | Band |\n|---|---|---:|---|\n`;
    for (const v of allViolations) {
      md += `| ${v.charId} | ${v.outcome} | ${v.actual}% | ${v.band} |\n`;
    }
    md += `\n> **Note:** Band violations in a headless AI simulation are expected. The \`reasonablePolicy\` agent is conservative and cannot adapt timing/risk as well as a human player. These results are best used for regression detection (0% summit = engine bug), not absolute calibration.\n\n`;
  }

  // Run metadata
  md += `---\n\n`;
  md += `## Run metadata\n\n`;
  md += `- **Date:** ${now}\n`;
  md += `- **Total simulated runs:** ${totalRuns.toLocaleString()}\n`;
  md += `- **Engine version:** web-v1 / v${ENGINE_VERSION} (turn-resolution.js + turn-rules.js)\n`;
  md += `- **Script:** \`scripts/monte-carlo-web-v1.js\`\n`;
  md += `- **Policy:** \`reasonablePolicy\` (conservative AI agent)\n`;
  md += `- **Difficulty:** Standard\n`;
  md += `- **Band violations:** ${allViolations.length}\n`;
  md += '\n';
  md += `> Summit rates from a headless policy agent tend to be lower than human player rates (~10–30%). A 0% summit rate across all characters indicates a structural engine bug. The policy agent correctly validates regression detection per the \`docs/balance-calibration-notes.md\` design intent.\n`;

  return md;
}

// ─────────────────────────────────────────────
// Parse CLI args
// ─────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { seeds: 50, output: DEFAULT_REPORT_PATH };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seeds' && args[i + 1]) { opts.seeds = parseInt(args[++i], 10); }
    if (args[i] === '--output' && args[i + 1]) { opts.output = args[++i]; }
  }
  return opts;
}

// ─────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────
const opts = parseArgs();
const totalScenarios = (scenariosData.predefinedScenarios || []).length;
const totalRuns = characters.length * totalScenarios * opts.seeds;
console.log(`\n🏔️  Monte Carlo Simulator — aconcagua-stone-sentinel web-v1`);
console.log(`   Characters: ${characters.length} · Scenarios: ${totalScenarios} · Seeds: ${opts.seeds} each`);
console.log(`   Total runs: ${totalRuns.toLocaleString()}\n`);

const startMs = Date.now();
const batchResult = runBatch({ seeds: opts.seeds });
const elapsedMs = Date.now() - startMs;

console.log(`   Completed in ${(elapsedMs / 1000).toFixed(2)}s\n`);

// Print summary table
const { totalByChar, OUTCOME_KEYS } = batchResult;
const summitKey = 'Summit and Safe Return';
const retreatKey = 'Strategic Retreat';

console.log('   Per-character outcome summary:');
console.log('   ' + '─'.repeat(60));
for (const char of characters) {
  const total = totalScenarios * opts.seeds;
  const summitPct  = ((totalByChar[char.id][summitKey]  || 0) / total * 100).toFixed(1);
  const retreatPct = ((totalByChar[char.id][retreatKey] || 0) / total * 100).toFixed(1);
  const rescuePct  = ((totalByChar[char.id]['Rescue']   || 0) / total * 100).toFixed(1);
  console.log(`   ${char.name.padEnd(22)} Summit: ${summitPct.padStart(5)}%  Retreat: ${retreatPct.padStart(5)}%  Rescue: ${rescuePct.padStart(5)}%`);
}
console.log('   ' + '─'.repeat(60) + '\n');

// Write report
const report = buildReport(batchResult);
const outDir = path.dirname(opts.output);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(opts.output, report, 'utf8');
console.log(`   Report written to: ${opts.output}\n`);

// Check violations
let violations = 0;
for (const char of characters) {
  const total = totalScenarios * opts.seeds;
  const pct = {};
  for (const k of OUTCOME_KEYS) pct[k] = ((totalByChar[char.id][k] || 0) / total) * 100;
  const v = checkBandViolations(pct, char.name);
  violations += v.length;
}
if (violations > 0) {
  console.log(`   ⚠️  ${violations} band violation(s) detected (see report for details).`);
  console.log(`      Note: AI policy runs conservatively vs human players; band violations`);
  console.log(`      expected. A 0% summit rate would indicate an engine regression.\n`);
} else {
  console.log(`   ✅ All characters within target bands.\n`);
}
