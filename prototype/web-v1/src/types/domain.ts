export type Stage = 'APPROACH' | 'HIGH_CAMP' | 'SUMMIT_DAY';

export type Action = 'advance' | 'advance_slowly' | 'wait' | 'descend' | 'sleep' | 'shoot_photo';

export type ContextualAction = Extract<Action, 'shoot_photo'>;

export type TrendEstimate = 'improving' | 'steady' | 'worsening' | 'uncertain';

export type EventCategory = 'context' | 'character' | 'observation' | 'perception_distortion';

export type CharacterEventCategory =
  | 'onset_context'
  | 'pressure_interpretation'
  | 'pacing_hesitation'
  | 'observation'
  | 'body_mind_drift';

export type TurnOutcome =
  | 'Strategic Retreat'
  | 'Rescue'
  | 'Collapse (Fatigue)'
  | 'Collapse (Exposure)'
  | 'Resource Exhaustion'
  | 'Expedition Window Closed'
  | 'Permit Expired'
  | 'Fatality'
  | 'High Point Return'
  | 'Summit and Safe Return'
  | 'Advance'
  | 'Retreat'
  | 'Hold';

// ---------------------------------------------------------------------------
// Character engine sub-types — mirrors data/characters.json engine objects
// ---------------------------------------------------------------------------

export interface PerceptionGuardrails {
  minConfidence: number;
  maxNoise: number;
  minHintLevel: number;
  maxTimingActionPenalty: number;
  maxTimingConfidencePenalty: number;
  maxTimingNoiseIncrease: number;
}

export interface PerceptionLatency {
  baseDelay: number;
  pressureDeltaStart: number;
  stageActivation: Record<Stage, number>;
  timeActivationStart: number;
  minEarlyHint: number;
}

export interface CharacterDecisionWindow {
  baseMs: number;
  stageModifiersMs: Record<Stage, number>;
  minFloorMs: number;
  degradeEveryMs: number;
}

/** Mirrors the `engine` object inside each entry in data/characters.json. */
export interface CharacterEngine {
  fatigueResistance: number;
  exposureResistance: number;
  confidenceStability: number;
  riskTolerance: number;
  functionalCapacityBonus: number;
  acclimatizationRate: number;
  resourceEfficiency: number;
  perceptionBias: number;
  perceptionGuardrails: PerceptionGuardrails;
  perceptionLatency: PerceptionLatency;
  decisionWindow: CharacterDecisionWindow;
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  flag?: string;
  bio?: string;
  traits?: unknown;
  difficultyLabel?: string;
  engine: CharacterEngine;
}

// ---------------------------------------------------------------------------
// Route nodes — two shapes exist: raw (from JSON) and normalized (post-transform)
// ---------------------------------------------------------------------------

/**
 * Raw shape of an entry in data/nodes.json, before normalizeRouteData() runs.
 * Authoritative source: data/nodes.json + normalizeRouteData() in
 * ui/helpers/data-config.js.
 */
export interface RawRouteNode {
  nodeId: string;
  nodeName: string;
  altitudeMeters: number;
  altitudeBand: number;
  terrainLoad: number;
  weatherBias: number;
  visibilityBias: number;
  timeSensitivity: number;
  isCamp: boolean;
  /** Canonical stage assignment stored in JSON; normalizeRouteData maps this to RouteNode.stage. */
  stageHint: Stage;
  routeIndex: number;
}

/**
 * Post-normalization shape of a route node, as produced by normalizeRouteData()
 * in ui/helpers/data-config.js.  This is what the engine and UI consume at runtime.
 */
export interface RouteNode {
  id: string;
  name: string;
  altitudeBand: number;
  altitudeMeters?: number | null;
  terrainLoad?: number;
  weatherBias?: number;
  visibilityBias?: number;
  timeSensitivity?: number;
  isCamp?: boolean;
  stage: Stage;
  routeIndex: number;
}

/**
 * Return type of normalizeRouteData() in ui/helpers/data-config.js.
 * This is the structure the runtime binds to POSITIONS, ROUTE_NODES, etc.
 */
export interface NormalizedRouteData {
  routeNodes: RouteNode[];
  /** Ordered list of node IDs; index == position in the route. */
  positions: string[];
  labels: Record<string, string>;
  altitudes: Record<string, string>;
  bands: Record<string, string>;
  campPositions: Set<string>;
  stageByPosition: Record<string, Stage>;
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export interface ScenarioInitialState {
  position: string;
  altitude_band: string;
  weather_severity: number;
  visibility: number;
  terrain_load: number;
  functional_capacity: number;
  fatigue: number;
  exposure: number;
  water: number;
  food: number;
}

export interface Scenario {
  id: string;
  /** Zero-padded display number, e.g. "01". */
  num?: string;
  name: string;
  desc?: string;
  intro?: string;
  max_turns: number;
  seeds: number[];
  difficulty?: string;
  difficultyModifiers?: Record<string, number>;
  initial?: ScenarioInitialState;
  bias?: Record<string, number>;
}

export interface PressureResult {
  pressureScore: number;
  components?: Record<string, number>;
}

export interface BodyToleranceResult {
  toleranceScore: number;
  components?: Record<string, number>;
}

export interface PerceptionResult {
  confidenceLevel: number;
  noiseLevel: number;
  trendEstimate: TrendEstimate;
}

export interface CharacterEventTrigger {
  actions?: Action[];
  /** Stage membership constraint. Data uses `stages` (plural); `stage` (singular) is not used. */
  stages?: Stage[];
  minTurn?: number;
  minPersistenceTurns?: number;
  minWeatherSeverity?: number;
  minFunctionalCapacity?: number;
  maxFunctionalCapacity?: number;
  maxWater?: number;
  maxFood?: number;
}

export interface CharacterEventEffect {
  fatigueDelta?: number;
  exposureDelta?: number;
  confidenceDelta?: number;
  pressureHintDelta?: number;
}

export interface CharacterEventLimits {
  oncePerRun?: boolean;
  cooldownTurns: number;
  maxPerRun: number;
}

export interface ContextEventTrigger {
  turns: number[];
  stages?: Stage[];
}

export interface ContextEventEffect {
  weatherDelta?: number;
  visibilityDelta?: number;
  timePenalty?: number;
}

export interface ContextEventLimits {
  maxPerRun: number;
}

/**
 * An event driven by turn/stage triggers that modifies environment signals.
 * All runtime instances in data/context_events.json carry trigger, effects,
 * and limits as required fields; optionality below reflects only rare
 * programmatic construction paths.
 */
export interface ContextEvent {
  id: string;
  /** Always "context" in data/context_events.json. */
  category: EventCategory;
  icon?: string;
  label: string;
  stage?: Stage;
  /** Required in data/context_events.json; validated by assertContextEvents(). */
  trigger: ContextEventTrigger;
  /** Required in data/context_events.json; validated by assertContextEvents(). */
  effects: ContextEventEffect;
  /** Required in data/context_events.json; validated by assertContextEvents(). */
  limits: ContextEventLimits;
  telemetryTag?: string;
  visibleToPlayer?: boolean;
  hiddenFromPlayer?: boolean;
  narrative?: string;
  notes?: string;
}

export type EventLimits = CharacterEventLimits;

export interface CharacterEvent {
  id: string;
  category: CharacterEventCategory;
  characterId: string;
  scenarioId?: string;
  stage?: Stage;
  trigger: CharacterEventTrigger;
  conditions?: Record<string, unknown>;
  effects: CharacterEventEffect;
  limits: CharacterEventLimits;
  telemetryTag: string;
  visibleToPlayer?: boolean;
  hiddenFromPlayer?: boolean;
  narrative?: string;
  notes?: string;
}

export interface TurnEvaluation {
  outcome: TurnOutcome;
  targetPosition: string;
  pressureDelta: number;
  effectiveDelta: number;
  progressChance: number;
  collapseChance: number;
  survivalChance: number;
  blocked: boolean;
  moved: boolean;
}

export interface RunLogRecord {
  turn: number;
  day: number;
  time: string;
  decision: Action;
  outcome: TurnOutcome;
  flags: string[];
  contextEvent?: ContextEvent | null;
  characterEvent?: Pick<CharacterEvent, 'id' | 'characterId' | 'category' | 'telemetryTag'> | null;
  turnSummary?: string;
}

export interface GlobalRunState {
  turn: number;
  day: number;
  minutesOfDay: number;
  permitDay: number;
  permitMaxDays: number;
  hasSummited: boolean;
  character: Character | null;
  scenario: Scenario | null;
  characterEventHistory: string[];
  characterEventState?: Record<string, { uses: number; lastTurn: number }>;
}

export interface GameState {
  position: string;
  fatigue: number;
  exposure: number;
  functional_capacity: number;
  water: number;
  food: number;
  weather_severity: number;
  visibility: number;
}
