# Simulation Engine — Prototype Web v1.3

## Core authority

The only authoritative turn resolver is:

`resolveTurn(state, action)`

All turn consequences (progress, physiology, risk, and final outcomes) emerge from this function.

## Environmental Pressure

`calculateEnvironmentalPressure(state)` computes:

`EP = baseAltitudePressure + terrainLoad + weatherSeverity + visibilityRisk + (timeOfDayRisk * node.timeSensitivity) + exposurePersistence + node.weatherBias + node.visibilityBias + stage.weatherSeverityBias + bivouacPenalty`

## Body Tolerance

`calculateBodyTolerance(state)` integrates:

- functional_capacity
- acclimatization
- hydration (water)
- nutrition (food)
- fatigue
- exposure
- character stats

## Pressure Delta

`pressureDelta = EP - BT`

Pressure delta governs node-to-node progress, physiological cost, and outcome risk.

## Perception model

`calculatePerception({ state, EP, BT, pressureDelta })` produces:

- `confidenceLevel`
- `trendEstimate`
- `noiseLevel`

UI displays only:

- Mountain Pressure
- Trend
- Confidence

Raw `EP`, `BT`, and `pressureDelta` are not shown in player-facing watch signals.

## Stage system

Canonical stages:

- `APPROACH`
- `HIGH_CAMP`
- `SUMMIT_DAY`

Modifiers from `data/stage_modifiers.json` apply to EP, fatigue, exposure, and confidence.

## Bivouac rule

If `time > 22:00` and `node.isCamp === false`, bivouac penalties are applied in engine resolution.

## Canonical outcomes

- Summit and Safe Return
- High Point Return
- Strategic Retreat
- Rescue
- Collapse (Fatigue)
- Collapse (Exposure)
- Resource Exhaustion
- Expedition Window Closed
- Fatality

`Rescue` is a real system outcome and is logged.

## Run log contract

`run_log.json` logs per turn from the engine with at least:

- turn, day, time
- stage, node, location
- character
- EP, BT, pressureDelta
- action, progress
- fatigue, exposure
- confidence, trendEstimate
- outcome
