import type {
  Character,
  CharacterEvent,
  CharacterEventCategory,
  ContextEvent,
  RawRouteNode,
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
  /** Raw route nodes from data/nodes.json (nodeId/stageHint shape).
   *  Pass to normalizeRouteData() to obtain the RouteNode/NormalizedRouteData shape. */
  nodes: RawRouteNode[];
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
      num?: string | number;
      seedRange?: { min: number; max: number };
      maxTurnsRange?: { min: number; max: number };
      initialBase?: Record<string, unknown>;
      initialRanges?: Record<string, { min: number; max: number }>;
      archetypes: Array<{
        name: string;
        difficultyModifiers?: Record<string, number>;
        tweak: Record<string, unknown>;
      }>;
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
    if (typeof payload.label !== 'string' || !payload.label) throw new Error('contextEvents[].label must be string');
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

function assertRouteNodes(nodes: unknown): asserts nodes is RawRouteNode[] {
  assertNonEmptyArray(nodes, 'nodes');
  const validStages = new Set<Stage>(['APPROACH', 'HIGH_CAMP', 'SUMMIT_DAY']);
  for (const node of nodes) {
    // Raw nodes carry nodeId/stageHint; call normalizeRouteData() to obtain
    // the RouteNode shape (id/stage) consumed by the engine and UI.
    const entry = node as Partial<RawRouteNode>;
    if (!entry.nodeId || typeof entry.nodeId !== 'string') {
      throw new Error('nodes[].nodeId must be a non-empty string');
    }
    if (typeof entry.routeIndex !== 'number') {
      throw new Error(`node ${entry.nodeId} missing routeIndex`);
    }
    if (!entry.stageHint || !validStages.has(entry.stageHint)) {
      throw new Error(`node ${entry.nodeId} has invalid stageHint "${String(entry.stageHint)}"`);
    }
  }
}

/**
 * Asserts that config satisfies the full DataConfig contract.
 *
 * Can be called directly on the output of loadDataConfigFiles() because
 * DataConfig.nodes is now typed as RawRouteNode[] (the pre-normalization shape).
 * Pass the config to normalizeRouteData() afterwards to obtain RouteNode[]/
 * NormalizedRouteData for engine and UI consumption.
 */
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
