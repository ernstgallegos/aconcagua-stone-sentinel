/**
 * Environmental Pressure (EP) and Body Tolerance (BT) calculation.
 * EP represents the mountain's demand on the body at any given turn.
 * BT represents the body's current capacity to withstand that demand.
 */

/**
 * Calculate Environmental Pressure from current conditions.
 * @param {object} params
 * @param {object} params.node - Current route node
 * @param {object} params.weather - { windSpeed, visibility, precipitation }
 * @param {number} params.timeOfDay - Minutes from midnight
 * @param {object} params.stage - Current stage modifier
 * @param {number} params.exposurePersistence - Accumulated persistence turns
 * @param {object} params.config - Environmental pressure config data
 * @param {object} [params.scenarioBias] - Scenario-level bias adjustments
 * @returns {number} Environmental Pressure value
 */
export function calculateEnvironmentalPressure(params) {
  const { node, weather, timeOfDay, stage, exposurePersistence, config, scenarioBias } = params;

  const altitudePressure = config.altitudePressureByBand[node.altitudeBand] || 0;
  const terrainLoad = config.terrainLoadScale[node.terrainLoad] || 0;
  const weatherSeverity = config.weatherSeverityScale[weather.windSpeed] || 0;
  const visibilityRisk = config.visibilityRiskScale[weather.visibility] || 0;

  const timeBucket = getTimeBucket(timeOfDay);
  const timeRiskValue = getTimeRiskValue(timeBucket, config.timeOfDayRiskScale);
  const timeRisk = timeRiskValue * (node.timeSensitivity || 1);

  const persistencePenalty = getPersistencePenalty(exposurePersistence, config.exposurePersistenceScale);

  const weatherBias = (node.weatherBias || 0) + (stage.weatherSeverityBias || 0);
  const visibilityBias = node.visibilityBias || 0;

  const bivouacPenalty = isBivouac(timeOfDay, node) ? (config.bivouac.ep || 30) : 0;

  let ep = altitudePressure
    + terrainLoad
    + weatherSeverity
    + visibilityRisk
    + timeRisk
    + persistencePenalty
    + weatherBias
    + visibilityBias
    + bivouacPenalty;

  if (scenarioBias && scenarioBias.pressureBias) {
    ep += scenarioBias.pressureBias;
  }

  return Math.max(0, ep);
}

/**
 * Calculate Body Tolerance from current physiological state.
 * @param {object} params
 * @param {object} params.body - { functionalCapacity, fatigue, exposure, acclimatization }
 * @param {object} params.resources - { water, food }
 * @param {object} params.character - Character engine stats
 * @param {object} [params.scenarioBias] - Scenario body tolerance bonus
 * @returns {number} Body Tolerance value
 */
export function calculateBodyTolerance(params) {
  const { body, resources, character, scenarioBias } = params;

  const baseBT = body.functionalCapacity;
  const acclimatizationBonus = body.acclimatization * 0.4;
  const fatiguePenalty = body.fatigue * 0.5;
  const exposurePenalty = body.exposure * 0.3;

  const hydrationFactor = Math.min(1, resources.water / 5) * 8;
  const nutritionFactor = Math.min(1, resources.food / 5) * 6;

  const characterBonus = (character.functionalCapacityBonus || 0);

  let bt = baseBT
    + acclimatizationBonus
    + hydrationFactor
    + nutritionFactor
    + characterBonus
    - fatiguePenalty
    - exposurePenalty;

  if (scenarioBias && scenarioBias.bodyToleranceBonus) {
    bt += scenarioBias.bodyToleranceBonus;
  }

  return Math.max(0, bt);
}

/**
 * Calculate the pressure delta (EP - BT).
 * Positive = environment winning. Negative = body coping.
 */
export function calculatePressureDelta(ep, bt) {
  return ep - bt;
}

/**
 * Get time bucket label from minutes since midnight.
 */
function getTimeBucket(minutes) {
  if (minutes >= 300 && minutes < 630) return 'optimal';  // 5:00-10:30
  if (minutes >= 630 && minutes < 780) return 'late';     // 10:30-13:00
  if (minutes >= 780 && minutes < 1020) return 'late';    // 13:00-17:00
  if (minutes >= 1020 && minutes < 1320) return 'dusk';   // 17:00-22:00
  if (minutes < 300) return 'night';                       // 00:00-05:00
  return 'night';                                          // 22:00+
}

/**
 * Get time risk value from named scale.
 */
function getTimeRiskValue(bucket, scale) {
  return scale[bucket] || 0;
}

/**
 * Get persistence penalty from named scale.
 */
function getPersistencePenalty(turns, scale) {
  if (turns <= 0) return scale.fresh || 0;
  if (turns <= 2) return scale.sustained || 4;
  if (turns <= 4) return scale.cumulative || 9;
  if (turns <= 6) return scale.severe || 16;
  return scale.critical || 24;
}

/**
 * Check if current position counts as forced bivouac.
 */
function isBivouac(timeOfDay, node) {
  return timeOfDay >= 1320 && !node.isCamp;
}
