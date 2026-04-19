import { clamp } from './turn-resolution.js';

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
  const timeOfDayRisk = timeOfDayRiskRaw * (node?.timeSensitivity ?? 1);
  const exposurePersistence = persistenceScale[state?.persistenceTier ?? 'fresh'] ?? 0;

  const pressureScore = altitudePressure +
    terrainLoad +
    weatherSeverity +
    visibilityRisk +
    timeOfDayRisk +
    exposurePersistence +
    (node?.weatherBias ?? 0) +
    (node?.visibilityBias ?? 0) +
    (stageModifier?.weatherSeverityBias ?? 0) +
    (difficultyModifiers?.pressureBias ?? 0);

  return {
    pressureScore,
    components: { altitudePressure, terrainLoad, weatherSeverity, visibilityRisk, timeOfDayRisk, exposurePersistence },
  };
}

export function calculateBodyToleranceScore({
  state,
  acclimatization = 0,
  characterEngine = {},
  difficultyModifiers = {},
  resourceBase = 36,
}) {
  const hydrationState = clamp(((state?.water ?? 0) / resourceBase) * 100, 0, 100);
  const nutritionState = clamp(((state?.food ?? 0) / resourceBase) * 100, 0, 100);

  const fatigueResistance = Math.max(characterEngine.fatigueResistance ?? 1, 0.1);
  const exposureResistance = Math.max(characterEngine.exposureResistance ?? 1, 0.1);
  const bt = ((state?.functional_capacity ?? 0) * 0.4) +
    (acclimatization * 0.35) +
    (hydrationState * 0.1) +
    (nutritionState * 0.05) +
    (difficultyModifiers?.bodyToleranceBonus ?? 0) -
    (((state?.fatigue ?? 0) * 0.05) / fatigueResistance) -
    (((state?.exposure ?? 0) * 0.05) / exposureResistance);

  return clamp(bt, 0, 100);
}
