export type Stage = 'APPROACH' | 'HIGH_CAMP' | 'SUMMIT_DAY';

export type Action = 'advance' | 'advance_slowly' | 'wait' | 'descend' | 'sleep' | 'shoot_photo';

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

export interface PerceptionResult {
  confidenceLevel: number;
  noiseLevel: number;
  trendEstimate: 'improving' | 'steady' | 'worsening' | 'uncertain';
}

export interface CharacterEvent {
  id: string;
  characterId: string;
  category: 'onset_context' | 'pressure_interpretation' | 'pacing_hesitation' | 'observation' | 'body_mind_drift';
  trigger: {
    actions?: Action[];
    stage?: Stage[];
    minTurn?: number;
    minFunctionalCapacity?: number;
    maxFunctionalCapacity?: number;
  };
  effects: {
    fatigueDelta?: number;
    exposureDelta?: number;
    confidenceDelta?: number;
    pressureHintDelta?: number;
  };
  limits: {
    cooldownTurns: number;
    maxPerRun: number;
  };
  telemetryTag: string;
}

export interface ContextEvent {
  id: string;
  icon?: string;
  label: string;
  weatherDelta?: number;
  visibilityDelta?: number;
  timePenalty?: number;
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
