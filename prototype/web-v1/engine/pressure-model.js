import { clamp } from './turn-resolution.js';

/**
 * Calculates the raw environmental pressure score (EP) for the current game state.
 *
 * EP represents the combined difficulty imposed by altitude, terrain, weather,
 * visibility, time-of-day, and exposure persistence. It is compared against the
 * player's body tolerance (BT) each turn; a high delta (EP − BT) increases the
 * likelihood of collapse and reduces progress.
 *
 * @param {object} params
 * @param {object} params.state - Current game state (weather_severity, visibility, persistenceTier).
 * @param {object} params.node - Current route node (altitudeBand, terrainLoad, timeSensitivity, weatherBias, visibilityBias).
 * @param {object} [params.stageModifier={}] - Active stage modifiers (e.g. weatherSeverityBias).
 * @param {object} [params.difficultyModifiers={}] - Active difficulty modifiers (e.g. pressureBias).
 * @param {string} params.timeOfDayBucket - Time-of-day bucket key (e.g. 'morning', 'dusk', 'night').
 * @param {object} [params.environmentalPressureConfig={}] - EP configuration object from data/environmental_pressure_config.json.
 * @returns {{ pressureScore: number, components: object }} Raw EP score and its named components.
 */
export function calculateEnvironmentalPressureScore({
  state,
  node,
  stageModifier = {},
  difficultyModifiers = {},
  timeOfDayBucket,
  environmentalPressureConfig = {},
}) {
  const epConf = environmentalPressureConfig || {};
  const altitudeScale = epConf.altitudePressureByBand || {};
  const terrainScale = epConf.terrainLoadScale || {};
  const weatherScale = epConf.weatherSeverityScale || {};
  const visibilityScale = epConf.visibilityRiskScale || {};
  const timeScale = epConf.timeOfDayRiskScale || {};
  const persistenceScale = epConf.exposurePersistenceScale || {};

  const altitudePressure = altitudeScale[String(node?.altitudeBand ?? 0)] ?? 0;
  const terrainLoad = terrainScale[String(clamp(node?.terrainLoad ?? 1, 1, 5))] ?? 0;
  const weatherSeverity = weatherScale[String(clamp(state?.weather_severity ?? 0, 0, 4))] ?? 0;
  const visibilityRisk = visibilityScale[String(clamp(4 - (state?.visibility ?? 2), 0, 4))] ?? 0;
  const timeOfDayRiskRaw = timeScale[timeOfDayBucket] ?? 0;
  const timeOfDayRisk = timeOfDayRiskRaw * (node?.timeSensitivity || 1);
  const exposurePersistence = persistenceScale[state?.persistenceTier || 'fresh'] ?? 0;

  const pressureScore = altitudePressure +
    terrainLoad +
    weatherSeverity +
    visibilityRisk +
    timeOfDayRisk +
    exposurePersistence +
    (node?.weatherBias || 0) +
    (node?.visibilityBias || 0) +
    (stageModifier?.weatherSeverityBias || 0) +
    (difficultyModifiers?.pressureBias || 0);

  return {
    pressureScore,
    components: { altitudePressure, terrainLoad, weatherSeverity, visibilityRisk, timeOfDayRisk, exposurePersistence },
  };
}

/**
 * Calculates the body tolerance score (BT) for the current game state.
 *
 * BT represents the player's physical capacity to withstand environmental pressure.
 * It is derived from functional capacity, acclimatization, hydration, nutrition,
 * fatigue, and exposure. A high EP − BT delta accelerates body degradation.
 *
 * @param {object} params
 * @param {object} params.state - Current game state (functional_capacity, fatigue, exposure, water, food).
 * @param {number} [params.acclimatization=0] - Current acclimatization level (0–100).
 * @param {object} [params.characterEngine={}] - Character engine modifiers (fatigueResistance, exposureResistance).
 * @param {object} [params.difficultyModifiers={}] - Active difficulty modifiers (bodyToleranceBonus).
 * @param {number} [params.resourceBase=36] - Reference resource pool size for hydration/nutrition normalisation.
 * @returns {number} BT score (clamped to 0–100).
 */
export function calculateBodyToleranceScore({
  state,
  acclimatization = 0,
  characterEngine = {},
  difficultyModifiers = {},
  resourceBase = 36,
}) {
  const hydrationState = clamp(((state?.water ?? 0) / resourceBase) * 100, 0, 100);
  const nutritionState = clamp(((state?.food ?? 0) / resourceBase) * 100, 0, 100);

  const fatigueResistance = characterEngine.fatigueResistance || 1;
  const exposureResistance = characterEngine.exposureResistance || 1;
  const bt = ((state?.functional_capacity ?? 0) * 0.4) +
    (acclimatization * 0.35) +
    (hydrationState * 0.1) +
    (nutritionState * 0.05) +
    (difficultyModifiers?.bodyToleranceBonus || 0) -
    (((state?.fatigue ?? 0) * 0.05) / fatigueResistance) -
    (((state?.exposure ?? 0) * 0.05) / exposureResistance);

  return clamp(bt, 0, 100);
}
