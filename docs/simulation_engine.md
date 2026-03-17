# Simulation Engine — Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[Unreleased]`](../CHANGELOG.md#unreleased).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4 in-progress (phased rollout)** with legacy v1.3 contracts preserved where still applicable.


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


## v1.4 implementation status notes

- The park permit countdown (`permitDay` / `permitMaxDays = 20`) is implemented as active expedition-time pressure in the public prototype.
- `Permit Expired` is implemented as an explicit non-success outcome and checked in the outcome-resolution path.
- `Summit and Safe Return` remains the only implemented Part 2 unlock gate in the current public flow.

See `docs/en/consolidated-design-v1.4.md` and `docs/es/diseno-consolidado-v1.4.md` for scope and rollout phases.
