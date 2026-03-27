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

export interface CharacterEngine {
  fatigueResistance: number;
  exposureResistance: number;
  confidenceStability: number;
  riskTolerance: number;
  recoveryEfficiency?: number;
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  difficultyLabel?: string;
  engine: CharacterEngine;
}

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

export interface Scenario {
  id: string;
  name: string;
  max_turns: number;
  seeds: number[];
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
  stages?: Stage[];
  stage?: Stage[];
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

export interface ContextEvent {
  id: string;
  category?: EventCategory;
  icon?: string;
  label: string;
  stage?: Stage;
  trigger?: ContextEventTrigger;
  effects?: ContextEventEffect;
  limits?: ContextEventLimits;
  weatherDelta?: number;
  visibilityDelta?: number;
  timePenalty?: number;
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
