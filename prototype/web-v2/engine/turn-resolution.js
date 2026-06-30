/**
 * Turn Resolution Pipeline — the canonical authority for all game outcomes.
 *
 * Pipeline stages:
 * 1. normalize-action
 * 2. consume-time-and-resources
 * 3. apply-weather-and-persistence
 * 4. compute-pressure-and-perception
 * 5. evaluate-outcome
 * 6. update-state
 * 7. classify-terminal-outcome
 * 8. emit-signals-and-narrative
 */

import { calculateEnvironmentalPressure, calculateBodyTolerance, calculatePressureDelta } from './pressure-model.js';
import { calculatePerception } from './perception.js';
import { classifyTerminalOutcome } from './outcomes.js';

/**
 * Resolve a single turn given current state and chosen action.
 * @param {object} state - Full game state
 * @param {string} action - Player's chosen action
 * @param {object} gameData - Loaded game data (nodes, config, actions, stages, events)
 * @returns {object} Turn result with updated state, outcome, and signals
 */
export function resolveTurn(state, action, gameData) {
  const { nodes, epConfig, actionModifiers, stageModifiers, contextEvents, characterEvents, scenario } = gameData;

  const node = nodes[state.positionIndex];
  const stageKey = node.stage || 'APPROACH';
  const stageMod = stageModifiers[stageKey] || stageModifiers.APPROACH;
  const actionMod = actionModifiers[action] || actionModifiers.wait;
  const character = state.character;

  // Stage 1: Normalize action
  const normalizedAction = normalizeAction(action, state, node);

  // Stage 2: Consume time and resources
  const timeConsumed = consumeTime(normalizedAction, actionMod, state);
  const resourceCost = consumeResources(state, stageKey, timeConsumed, character, epConfig);

  // Stage 3: Apply weather and persistence
  const weather = applyWeatherAndPersistence(state, contextEvents, stageMod, gameData);

  // Stage 4: Compute pressure and perception
  const diffMods = scenario.difficultyModifiers || {};
  const ep = calculateEnvironmentalPressure({
    node,
    weather: weather.current,
    timeOfDay: state.timeOfDay + timeConsumed,
    stage: stageMod,
    exposurePersistence: state.body.persistenceTurns,
    config: epConfig,
    scenarioBias: { pressureBias: diffMods.pressureBias || 0 }
  });

  const bt = calculateBodyTolerance({
    body: state.body,
    resources: state.resources,
    character: character.engine,
    scenarioBias: { bodyToleranceBonus: diffMods.bodyToleranceBonus || 0 }
  });

  const pressureDelta = calculatePressureDelta(ep, bt);
  const perception = calculatePerception(state, ep, bt, pressureDelta, character);

  // Stage 5: Evaluate outcome
  const moveResult = evaluateOutcome(normalizedAction, pressureDelta, state, actionMod, stageMod, node);

  // Stage 6: Update state
  const updatedState = updateState(state, {
    action: normalizedAction,
    actionMod,
    stageMod,
    moveResult,
    timeConsumed,
    resourceCost,
    weather: weather.current,
    ep,
    bt,
    pressureDelta,
    node,
    character,
    epConfig
  });

  // Apply character events
  applyCharacterEvent(updatedState, normalizedAction, characterEvents, node);

  // Stage 7: Classify terminal outcome
  const terminalOutcome = classifyTerminalOutcome(updatedState, nodes);

  // Stage 8: Build turn record
  const turnRecord = {
    turn: state.turn,
    day: state.day,
    timeOfDay: updatedState.timeOfDay,
    stage: stageKey,
    node: node.nodeName,
    positionIndex: updatedState.positionIndex,
    action: normalizedAction,
    moveResult: moveResult.type,
    ep,
    bt,
    pressureDelta,
    perception,
    fatigue: updatedState.body.fatigue,
    exposure: updatedState.body.exposure,
    functionalCapacity: updatedState.body.functionalCapacity,
    water: updatedState.resources.water,
    food: updatedState.resources.food,
    weather: weather.current,
    terminalOutcome
  };

  return {
    state: updatedState,
    turnRecord,
    terminalOutcome,
    perception,
    narrative: generateNarrative(normalizedAction, moveResult, node, weather.current, perception)
  };
}

/**
 * Normalize and validate the action.
 */
function normalizeAction(action, state, node) {
  // Summit blocks advance
  if (node.routeIndex >= 14 && (action === 'advance' || action === 'advance_slowly')) {
    return 'wait';
  }
  // Sleep only at camps
  if (action === 'sleep' && !node.isCamp) {
    return 'wait';
  }
  // Can't descend below start
  if (action === 'descend' && state.positionIndex <= 0) {
    return 'wait';
  }
  return action;
}

/**
 * Calculate time consumed by action.
 */
function consumeTime(action, actionMod, state) {
  if (action === 'sleep') {
    // Sleep resets to 06:00 next day
    return (1440 - state.timeOfDay) + 360;
  }
  return actionMod.timeCost || 60;
}

/**
 * Calculate and apply resource consumption.
 */
function consumeResources(state, stageKey, timeConsumed, character, config) {
  const burnRates = config.resourceBurn[stageKey] || config.resourceBurn.APPROACH;
  const hours = timeConsumed / 60;
  const efficiency = character.engine.resourceEfficiency || 1.0;

  const waterCost = burnRates.water * hours / efficiency;
  const foodCost = burnRates.food * hours / efficiency;

  return { water: waterCost, food: foodCost };
}

/**
 * Apply weather updates and exposure persistence.
 */
function applyWeatherAndPersistence(state, contextEvents, stageMod, gameData) {
  let weather = { ...state.weather };

  // Apply context events based on turn
  if (contextEvents) {
    for (const event of contextEvents) {
      if (event.trigger && event.trigger.turns && event.trigger.turns.includes(state.turn)) {
        if (!state.firedEvents.includes(event.id)) {
          if (event.effects.weatherDelta) weather.windSpeed = Math.max(0, Math.min(4, weather.windSpeed + event.effects.weatherDelta));
          if (event.effects.visibilityDelta) weather.visibility = Math.max(0, Math.min(4, weather.visibility + event.effects.visibilityDelta));
          state.firedEvents.push(event.id);
          state.lastEventNarrative = event.narrative;
        }
      }
    }
  }

  // Scenario per-turn bias (from scenario.bias)
  const scenarioBias = gameData.scenario.bias || {};
  if (scenarioBias.weather_deterioration) {
    weather.windSpeed = Math.max(0, Math.min(4, weather.windSpeed + scenarioBias.weather_deterioration * 0.1));
  }
  if (scenarioBias.fatigue_growth) {
    // Applied later in body state update (tracked via scenario)
  }

  return { current: weather };
}

/**
 * Evaluate the movement/outcome for this turn.
 */
function evaluateOutcome(action, pressureDelta, state, actionMod, stageMod, node) {
  // Sleep never changes position
  if (action === 'sleep') {
    return { type: 'Hold', positionChange: 0 };
  }

  // Descend always succeeds (gravity override)
  if (action === 'descend') {
    return { type: 'Advance', positionChange: -1 };
  }

  // Wait holds position
  if (action === 'wait' || action === 'shoot_photo') {
    return { type: 'Hold', positionChange: 0 };
  }

  // Advance/advance_slowly: probabilistic outcome based on pressure delta
  const effectiveDelta = pressureDelta;
  const progressBase = actionMod.progress || 20;

  // Collapse check
  const fc = state.body.functionalCapacity;
  const collapseChance = Math.min(96, Math.max(0,
    Math.max(0, effectiveDelta) * 1.2 + (100 - fc) * 0.1 + (actionMod.collapse || 0)
  ));

  const collapseRoll = seededRandom(state.seed + state.turn * 7);
  if (collapseRoll * 100 < collapseChance) {
    return { type: 'Collapse', positionChange: 0, collapseChance };
  }

  // Progress check
  const progressChance = Math.max(5, Math.min(95, 60 + progressBase - effectiveDelta * 0.8));
  const progressRoll = seededRandom(state.seed + state.turn * 13 + 3);

  if (progressRoll * 100 < progressChance) {
    return { type: 'Advance', positionChange: 1 };
  } else {
    return { type: 'Hold', positionChange: 0 };
  }
}

/**
 * Update state after turn resolution.
 */
function updateState(state, ctx) {
  const { action, actionMod, stageMod, moveResult, timeConsumed, resourceCost, weather, ep, bt, pressureDelta, node, character, epConfig } = ctx;

  const newState = JSON.parse(JSON.stringify(state));
  newState.turn += 1;

  // Time update
  if (action === 'sleep') {
    newState.timeOfDay = 360; // 06:00
    newState.day += 1;
    newState.body.persistenceTurns = 0;
  } else {
    newState.timeOfDay += timeConsumed;
    if (newState.timeOfDay >= 1440) {
      newState.timeOfDay -= 1440;
      newState.day += 1;
    }
    newState.body.persistenceTurns += 1;
  }

  // Position update
  newState.positionIndex = Math.max(0, Math.min(14, state.positionIndex + moveResult.positionChange));

  // Track summit
  if (newState.positionIndex >= 14) {
    newState.hasSummited = true;
  }
  if (newState.positionIndex > newState.highestPositionIndex) {
    newState.highestPositionIndex = newState.positionIndex;
  }

  // Resource consumption
  newState.resources.water = Math.max(0, state.resources.water - resourceCost.water);
  newState.resources.food = Math.max(0, state.resources.food - resourceCost.food);

  // Body state updates
  const fatigueMult = (actionMod.fatigueMultiplier || 1.0) * (stageMod.fatigueMultiplier || 1.0);
  const exposureMult = (actionMod.exposureMultiplier || 1.0) * (stageMod.exposureMultiplier || 1.0);
  const baseFatigueCost = epConfig.baseCosts ? epConfig.baseCosts.fatigue : 10;
  const baseExposureCost = epConfig.baseCosts ? epConfig.baseCosts.exposure : 8;

  if (action === 'sleep') {
    // Sleep provides recovery
    const fatigueRecovery = actionMod.fatigueRecovery || 22;
    const exposureRecovery = actionMod.exposureRecovery || 14;
    newState.body.fatigue = Math.max(0, state.body.fatigue - fatigueRecovery);
    newState.body.exposure = Math.max(0, state.body.exposure - exposureRecovery);
    newState.body.acclimatization = Math.min(100,
      state.body.acclimatization + (character.engine.acclimatizationRate || 1.0) * 4
    );
  } else if (action === 'descend') {
    // Descend provides some recovery
    const fatRecov = actionMod.fatigueRecovery || 4;
    const expRecov = actionMod.exposureRecovery || 4;
    newState.body.fatigue = Math.max(0, state.body.fatigue - fatRecov);
    newState.body.exposure = Math.max(0, state.body.exposure - expRecov);
  } else if (action === 'wait') {
    // Wait: low cost, some acclimatization
    newState.body.fatigue = Math.max(0, state.body.fatigue + baseFatigueCost * 0.55 * fatigueMult - 2);
    newState.body.exposure = Math.max(0, state.body.exposure + baseExposureCost * 0.85 * exposureMult - 1);
    newState.body.acclimatization = Math.min(100,
      state.body.acclimatization + (character.engine.acclimatizationRate || 1.0) * (actionMod.acclimatizationGain || 6) * 0.3
    );
  } else {
    // Advance / advance_slowly / shoot_photo: standard cost
    newState.body.fatigue = Math.max(0, state.body.fatigue + baseFatigueCost * fatigueMult);
    newState.body.exposure = Math.max(0, state.body.exposure + baseExposureCost * exposureMult);
    // Slow acclimatization from movement
    newState.body.acclimatization = Math.min(100,
      state.body.acclimatization + (character.engine.acclimatizationRate || 1.0) * 0.5
    );
  }

  // Bivouac penalty
  if (newState.timeOfDay >= 1320 && !node.isCamp && action !== 'sleep') {
    const biv = epConfig.bivouac || {};
    newState.body.fatigue += biv.fatigue || 26;
    newState.body.exposure += biv.exposure || 28;
    newState.body.persistenceTurns += biv.persistenceTurns || 10;
  }

  // Functional capacity derived from fatigue and exposure
  const fatigueRes = character.engine.fatigueResistance || 1.0;
  const exposureRes = character.engine.exposureResistance || 1.0;
  newState.body.functionalCapacity = Math.max(0, Math.min(100,
    100 + (character.engine.functionalCapacityBonus || 0)
    - (newState.body.fatigue / fatigueRes) * 0.6
    - (newState.body.exposure / exposureRes) * 0.4
  ));

  // Collapse consequence
  if (moveResult.type === 'Collapse') {
    newState.body.fatigue += 15;
    newState.body.exposure += 10;
    newState.body.functionalCapacity = Math.max(0, newState.body.functionalCapacity - 20);
  }

  // Update weather in state
  newState.weather = { ...weather };

  // Permit tracking
  newState.permitDay = newState.day;

  return newState;
}

/**
 * Apply character-specific events.
 */
function applyCharacterEvent(state, action, characterEvents, node) {
  if (!characterEvents) return;
  const charEvents = characterEvents.filter(e => e.characterId === state.character.id);

  for (const event of charEvents) {
    if (state.firedCharEvents && state.firedCharEvents[event.id] >= (event.limits.maxPerRun || 3)) continue;
    if (state.charEventCooldowns && state.charEventCooldowns[event.id] > 0) continue;

    // Check trigger conditions
    const trigger = event.trigger;
    if (trigger.actions && !trigger.actions.includes(action)) continue;
    if (trigger.stages && !trigger.stages.includes(node.stage)) continue;
    if (trigger.minTurn && state.turn < trigger.minTurn) continue;
    if (trigger.minPersistenceTurns && state.body.persistenceTurns < trigger.minPersistenceTurns) continue;

    // Check conditions
    if (event.conditions) {
      if (event.conditions.minWeather && state.weather.windSpeed < event.conditions.minWeather) continue;
      if (event.conditions.maxFC && state.body.functionalCapacity > event.conditions.maxFC) continue;
      if (event.conditions.maxWater && state.resources.water > event.conditions.maxWater) continue;
    }

    // Apply effects
    if (event.effects.fatigueDelta) state.body.fatigue = Math.max(0, state.body.fatigue + event.effects.fatigueDelta);
    if (event.effects.exposureDelta) state.body.exposure = Math.max(0, state.body.exposure + event.effects.exposureDelta);
    if (event.effects.confidenceDelta) state.perception = (state.perception || 50) + event.effects.confidenceDelta;

    // Track firing
    if (!state.firedCharEvents) state.firedCharEvents = {};
    state.firedCharEvents[event.id] = (state.firedCharEvents[event.id] || 0) + 1;
    if (!state.charEventCooldowns) state.charEventCooldowns = {};
    state.charEventCooldowns[event.id] = event.limits.cooldownTurns || 3;

    state.lastCharEventNarrative = event.narrative;
    break; // One event per turn
  }

  // Decrement cooldowns
  if (state.charEventCooldowns) {
    for (const key of Object.keys(state.charEventCooldowns)) {
      if (state.charEventCooldowns[key] > 0) state.charEventCooldowns[key]--;
    }
  }
}

/**
 * Generate narrative text for the turn.
 */
function generateNarrative(action, moveResult, node, weather, perception) {
  const lines = [];

  if (moveResult.type === 'Advance' && action !== 'descend') {
    lines.push(`You push forward from ${node.nodeName}. Progress.`);
  } else if (moveResult.type === 'Hold') {
    if (action === 'sleep') lines.push(`You rest at ${node.nodeName}. The body recovers.`);
    else if (action === 'wait') lines.push(`You hold position at ${node.nodeName}, reading the mountain.`);
    else lines.push(`The mountain resists. You remain at ${node.nodeName}.`);
  } else if (action === 'descend') {
    lines.push(`You descend from ${node.nodeName}. Each step down is relief.`);
  } else if (moveResult.type === 'Collapse') {
    lines.push(`Your body falters at ${node.nodeName}. Something is wrong.`);
  }

  if (weather.windSpeed >= 3) lines.push('The wind howls against exposed rock.');
  if (perception.confidenceLevel < 30) lines.push('Signals are unclear. Trust your judgment.');

  return lines.join(' ');
}

/**
 * Simple seeded PRNG (mulberry32).
 */
function seededRandom(seed) {
  let t = (seed | 0) + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
