# Simulation Engine — Prototype Web v1.2

Prototype Web v1.2 makes the **Environmental Pressure Engine** the single authoritative simulation system.

## Unified turn pipeline

Every turn is resolved only by:

`resolveTurn(state, action)`

Pipeline:

`Environment → Environmental Pressure (EP) → Body Tolerance (BT) → Pressure Delta → Action Modifier → Outcome`

## Environmental Pressure (EP)

`calculateEnvironmentalPressure(state)` now integrates route node and stage effects:

`EP = baseAltitudePressure + terrainLoad + weatherSeverity + visibilityRisk + (timeOfDayRisk * node.timeSensitivity) + exposurePersistence + node.weatherBias + node.visibilityBias + stage.weatherSeverityBias`

Node parameters come from `/data/nodes.json`:

- `altitudeBand`
- `terrainLoad`
- `weatherBias`
- `visibilityBias`
- `timeSensitivity`
- `isCamp`

## Body Tolerance (BT)

`calculateBodyTolerance(state)` represents physiological resistance:

- `functional_capacity`: base physical ability
- `fatigue`: accumulated effort exhaustion
- `exposure`: physiological damage from environment
- `acclimatization`: progressive adaptation to altitude

## Pressure Delta interpretation

`pressureDelta = EP - BT`

- `<= -15`: full progress
- `-14..10`: moderate progress
- `11..30`: limited progress
- `> 30`: blocked / retreat pressure

Progress is also modified by `/data/action_modifiers.json` (`actionModifier.progress`).

## Stage modifiers

Loaded from `/data/stage_modifiers.json`:

- `APPROACH`
- `HIGH_CAMP`
- `SUMMIT_DAY`

Applied in engine:

- `EP += stage.weatherSeverityBias`
- `fatigue *= stage.fatigueMultiplier`
- `exposure *= stage.exposureMultiplier`
- `confidence -= stage.confidencePenalty`

## Bivouac integration

Inside `resolveTurn`, when `time > 22:00` outside camp (`node.isCamp === false`):

- EP penalty
- severe fatigue increase
- severe exposure increase
- critical persistence escalation

## Perception model

`calculatePerception(state)` returns:

- `confidenceLevel`
- `trendEstimate`
- `noiseLevel`

Inputs: altitude band, fatigue, exposure, visibility.

Player-facing interface exposes only:

- Mountain Pressure
- Trend
- Confidence

## Logging (`run_log.json`)

Each turn is logged from `resolveTurn` with:

- `turn`
- `location`
- `EP`
- `BT`
- `pressureDelta`
- `action`
- `progress`
- `fatigue`
- `exposure`
- `confidence`
- `outcome`

## Canonical data sources

Simulation constants are loaded from `/data`:

- `/data/environmental_pressure_config.json`
- `/data/action_modifiers.json`
- `/data/stage_modifiers.json`
- `/data/nodes.json`
