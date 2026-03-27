import type { Character, CharacterEvent, RouteNode, Scenario, TurnOutcome } from './domain.js';

export interface DifficultyModifiers {
  pressureBias: number;
  stageWeatherBias: number;
  bodyToleranceBonus: number;
  acclimatizationBonus: number;
  fatigueMultiplier: number;
  exposureMultiplier: number;
  resourceEfficiency: number;
  permitDaysBonus: number;
  initialCapacityBonus: number;
  initialWaterBonus: number;
  initialFoodBonus: number;
  decisionWindowMsBonus: number;
}

export interface TimeWindows {
  summitLateStart: number;
}

export interface DataConfig {
  nodes: RouteNode[];
  environmentalPressure: Record<string, unknown>;
  actionModifiers: Record<string, Record<string, number>>;
  stageModifiers: Record<string, Record<string, number>>;
  characters: Character[];
  characterEvents: CharacterEvent[];
  outcomes: TurnOutcome[];
  scenariosWebV1: {
    predefinedScenarios: Scenario[];
    randomScenario: {
      archetypes: Array<{ name: string; tweak: Record<string, number> }>;
      initialRanges?: Record<string, { min: number; max: number }>;
    };
  };
}

export function assertDataConfig(config: Partial<DataConfig>): asserts config is DataConfig {
  if (!Array.isArray(config.nodes) || !config.nodes.length) throw new Error('nodes must be a non-empty array');
  if (!Array.isArray(config.characters) || !config.characters.length) throw new Error('characters must be a non-empty array');
  if (!Array.isArray(config.characterEvents) || !config.characterEvents.length) throw new Error('characterEvents must be a non-empty array');
  if (!Array.isArray(config.outcomes) || !config.outcomes.length) throw new Error('outcomes must be a non-empty array');
  if (!config.scenariosWebV1?.predefinedScenarios?.length) throw new Error('scenariosWebV1.predefinedScenarios must be non-empty');
}
