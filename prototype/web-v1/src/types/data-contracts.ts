import type {
  Character,
  CharacterEvent,
  CharacterEventCategory,
  ContextEvent,
  RouteNode,
  Scenario,
  Stage,
  TurnOutcome,
} from './domain.js';

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

export interface DecisionWindowProfile {
  baseMs: number;
  minMs: number;
  maxMs: number;
  pressurePenaltyScale: number;
  difficultyBonusMs: number;
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
  contextEvents: ContextEvent[];
  outcomes: TurnOutcome[];
  scenariosWebV1: {
    predefinedScenarios: Scenario[];
    randomScenario: {
      archetypes: Array<{ name: string; tweak: Record<string, number> }>;
      initialRanges?: Record<string, { min: number; max: number }>;
    };
  };
}

function assertNonEmptyArray(value: unknown, key: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${key} must be a non-empty array`);
  }
}

function assertCharacterEvents(events: unknown): asserts events is CharacterEvent[] {
  assertNonEmptyArray(events, 'characterEvents');
  const allowedCategories = new Set<CharacterEventCategory>([
    'onset_context',
    'pressure_interpretation',
    'pacing_hesitation',
    'observation',
    'body_mind_drift',
  ]);

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new Error('characterEvents must contain objects');
    const payload = event as Record<string, unknown>;
    if (typeof payload.id !== 'string' || !payload.id) throw new Error('characterEvents[].id must be string');
    if (typeof payload.characterId !== 'string' || !payload.characterId) {
      throw new Error(`character event ${String(payload.id)} missing characterId`);
    }
    if (!allowedCategories.has(payload.category as CharacterEventCategory)) {
      throw new Error(`character event ${String(payload.id)} has unsupported category`);
    }
    if (typeof payload.telemetryTag !== 'string' || !payload.telemetryTag) {
      throw new Error(`character event ${String(payload.id)} missing telemetryTag`);
    }
    const limits = payload.limits as Record<string, unknown> | undefined;
    if (!limits || typeof limits !== 'object') throw new Error(`character event ${String(payload.id)} missing limits`);
    if (typeof limits.cooldownTurns !== 'number' || limits.cooldownTurns < 0) {
      throw new Error(`character event ${String(payload.id)} cooldownTurns must be >= 0`);
    }
    if (typeof limits.maxPerRun !== 'number' || limits.maxPerRun < 1) {
      throw new Error(`character event ${String(payload.id)} maxPerRun must be >= 1`);
    }
  }
}


function assertContextEvents(events: unknown): asserts events is ContextEvent[] {
  assertNonEmptyArray(events, 'contextEvents');
  for (const event of events) {
    if (!event || typeof event !== 'object') throw new Error('contextEvents must contain objects');
    const payload = event as Record<string, unknown>;
    if (typeof payload.id !== 'string' || !payload.id) throw new Error('contextEvents[].id must be string');
    if ((payload.category ?? 'context') !== 'context') throw new Error(`context event ${String(payload.id)} category must be context`);
    const trigger = payload.trigger as Record<string, unknown> | undefined;
    if (!trigger || !Array.isArray(trigger.turns) || trigger.turns.length === 0) {
      throw new Error(`context event ${String(payload.id)} requires trigger.turns`);
    }
    const effects = payload.effects as Record<string, unknown> | undefined;
    if (!effects || typeof effects !== 'object') throw new Error(`context event ${String(payload.id)} requires effects`);
    const limits = payload.limits as Record<string, unknown> | undefined;
    if (!limits || typeof limits.maxPerRun !== 'number' || limits.maxPerRun < 1) {
      throw new Error(`context event ${String(payload.id)} requires limits.maxPerRun >= 1`);
    }
  }
}

function assertRouteNodes(nodes: unknown): asserts nodes is RouteNode[] {
  assertNonEmptyArray(nodes, 'nodes');
  const validStages = new Set<Stage>(['APPROACH', 'HIGH_CAMP', 'SUMMIT_DAY']);
  for (const node of nodes) {
    const entry = node as Partial<RouteNode>;
    if (!entry.id || typeof entry.id !== 'string') throw new Error('nodes[].id must be string');
    if (typeof entry.routeIndex !== 'number') throw new Error(`node ${entry.id} missing routeIndex`);
    if (!entry.stage || !validStages.has(entry.stage)) throw new Error(`node ${entry.id} has invalid stage`);
  }
}

export function assertDataConfig(config: Partial<DataConfig>): asserts config is DataConfig {
  assertRouteNodes(config.nodes);
  assertNonEmptyArray(config.characters, 'characters');
  assertCharacterEvents(config.characterEvents);
  assertContextEvents(config.contextEvents);
  assertNonEmptyArray(config.outcomes, 'outcomes');
  if (!config.scenariosWebV1?.predefinedScenarios?.length) throw new Error('scenariosWebV1.predefinedScenarios must be non-empty');
  if (!config.environmentalPressure || typeof config.environmentalPressure !== 'object') {
    throw new Error('environmentalPressure must be an object');
  }
}
