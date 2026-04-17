/**
 * Difficulty configuration — extracted from screens.js
 *
 * Owns: difficulty level definitions, storage key, mutable current-difficulty
 * state, and pure accessor functions.
 */

export const DIFFICULTY_STORAGE_KEY = 'aconcagua_difficulty_v1';
export const DEFAULT_DIFFICULTY_ID = 'standard';

export const DIFFICULTY_LEVELS = [
  {
    id: 'very-easy',
    label: { en: 'Very Easy', es: 'Muy fácil' },
    blurb: { en: 'Extra margin for first ascents and system learning.', es: 'Margen extra para primeras ascensiones y aprendizaje del sistema.' },
    modifiers: { pressureBias: -14, stageWeatherBias: -2, bodyToleranceBonus: 12, acclimatizationBonus: 14, fatigueMultiplier: 0.78, exposureMultiplier: 0.78, resourceEfficiency: 1.25, permitDaysBonus: 4, initialCapacityBonus: 8, initialWaterBonus: 4, initialFoodBonus: 4, decisionWindowMsBonus: 8000 },
  },
  {
    id: 'easy',
    label: { en: 'Easy', es: 'Fácil' },
    blurb: { en: 'Gentler attrition, but retreat timing still matters.', es: 'Desgaste más amable, pero el momento de retirada sigue importando.' },
    modifiers: { pressureBias: -6, stageWeatherBias: -1, bodyToleranceBonus: 5, acclimatizationBonus: 6, fatigueMultiplier: 0.9, exposureMultiplier: 0.9, resourceEfficiency: 1.1, permitDaysBonus: 2, initialCapacityBonus: 3, initialWaterBonus: 2, initialFoodBonus: 2, decisionWindowMsBonus: 3000 },
  },
  {
    id: 'standard',
    label: { en: 'Standard', es: 'Normal' },
    blurb: { en: 'Baseline prototype balance.', es: 'Balance base del prototipo.' },
    modifiers: { pressureBias: 0, stageWeatherBias: 0, bodyToleranceBonus: 0, acclimatizationBonus: 0, fatigueMultiplier: 1, exposureMultiplier: 1, resourceEfficiency: 1, permitDaysBonus: 0, initialCapacityBonus: 0, initialWaterBonus: 0, initialFoodBonus: 0, decisionWindowMsBonus: 0 },
  },
  {
    id: 'hard',
    label: { en: 'Hard', es: 'Difícil' },
    blurb: { en: 'Tighter margins and harsher punishment for late pushes.', es: 'Márgenes más ajustados y castigo mayor para los empujes tardíos.' },
    modifiers: { pressureBias: 8, stageWeatherBias: 1, bodyToleranceBonus: -6, acclimatizationBonus: -6, fatigueMultiplier: 1.12, exposureMultiplier: 1.15, resourceEfficiency: 0.92, permitDaysBonus: -1, initialCapacityBonus: -4, initialWaterBonus: -1, initialFoodBonus: -1, decisionWindowMsBonus: -2000 },
  },
  {
    id: 'very-hard',
    label: { en: 'Very Hard', es: 'Muy difícil' },
    blurb: { en: 'Hostile pressure, weaker recovery, and almost no slack.', es: 'Presión hostil, recuperación más débil y casi sin margen.' },
    modifiers: { pressureBias: 16, stageWeatherBias: 2, bodyToleranceBonus: -12, acclimatizationBonus: -12, fatigueMultiplier: 1.25, exposureMultiplier: 1.3, resourceEfficiency: 0.85, permitDaysBonus: -2, initialCapacityBonus: -8, initialWaterBonus: -2, initialFoodBonus: -2, decisionWindowMsBonus: -5000 },
  },
];

let _currentDifficultyId = DEFAULT_DIFFICULTY_ID;

export function getCurrentDifficultyId() {
  return _currentDifficultyId;
}

export function setCurrentDifficultyId(id) {
  _currentDifficultyId = id;
}

export function getDifficultyConfig(id) {
  const resolvedId = id ?? _currentDifficultyId;
  return DIFFICULTY_LEVELS.find((level) => level.id === resolvedId)
    || DIFFICULTY_LEVELS.find(l => l.id === DEFAULT_DIFFICULTY_ID)
    || DIFFICULTY_LEVELS[0];
}

export function getDifficultyModifiers(id, scenario) {
  if (scenario && scenario.difficultyModifiers) {
    return scenario.difficultyModifiers;
  }
  return getDifficultyConfig(id).modifiers;
}

export function difficultyLabel(id, lang) {
  const cfg = getDifficultyConfig(id);
  return cfg.label[lang] || cfg.label.en;
}

export const SUMMIT_ACHIEVED_KEY = 'aconcagua_summit_achieved_v1';
