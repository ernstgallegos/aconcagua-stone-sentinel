# Simulation Engine — Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.4.5]`](../CHANGELOG.md#145--2026-03).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4.5**.
> - Legacy v1.3 compatibility that is intentionally still active is limited to additive run-log aliases and test fixtures in `prototype/mra-v0`; canonical web-v1 authority and outcome taxonomy are v1.4.5 contracts.


## Core authority

The only authoritative turn resolver is:

`resolveTurn(state, action)`

All turn consequences (progress, physiology, risk, and final outcomes) emerge from this function.

Canonical live/frozen/version/roster status is centralized in [`docs/repo-truth.md`](./repo-truth.md).

Canonical resolver order is enforced by `RESOLVE_TURN_PIPELINE` in `prototype/web-v1/engine/turn-resolution.js`:

1. normalize-action
2. consume-time-and-resources
3. apply-weather-and-persistence
4. compute-pressure-and-perception
5. apply-decision-window-effects
6. evaluate-outcome
7. update-state
8. classify-terminal-outcome
9. emit-signals-and-narrative

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
- Permit Expired
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

`resolveTurn()` now also records `lastTurnRecord` telemetry with the full systemic chain:

- environment snapshot (`altitudeBand`, `terrainLoad`, `weatherSeverity`, `visibility`, `persistenceTier`)
- pressure tuple (`EP`, `BT`, `delta`, `effectiveDelta`)
- perceived signals (`trend`, `confidence`, `uncertainty`, `readability`)
- action, flags, resulting body/resources, and resolved outcome

This keeps each turn reproducible without exposing raw certainty to player-facing UI.

## Systemic acceptance suite

`prototype/web-v1/tests/engine/systemic-acceptance.test.js` verifies the non-negotiable architecture:

- outcomes come from `resolveTurn()` (no bypass)
- environment is evaluated every turn and precedes body/perception
- flattening environment pressure degrades system meaning
- perceived signals preserve uncertainty
- `WAIT` is conditionally optimal in high-pressure contexts
- `DESCEND` is conditionally optimal in high-pressure contexts


## v1.4 implementation status notes

- The park permit countdown (`permitDay` / `permitMaxDays = 20`) is implemented as active expedition-time pressure in the public prototype.
- `Permit Expired` is implemented as an explicit non-success outcome and checked in the outcome-resolution path.
- `Summit and Safe Return` remains the only implemented Part 2 unlock gate in the current public flow.

See `docs/en/consolidated-design-v1.4.md` and `docs/es/diseno-consolidado-v1.4.md` for scope and rollout phases.



## Legacy v1.3 compatibility (precise scope)

Legacy references are intentionally narrow and documented:

- `prototype/mra-v0` remains frozen to preserve historical simulator reproducibility and archived outcome-class fixtures.
- `web-v1` keeps additive run-log aliases only for backward reader compatibility; canonical fields are the structured `lastTurnRecord` + run-log export contract in `ui/helpers/run-log.js`.
- No legacy contract is allowed to override `resolveTurn(state, action)` authority, current `data/outcomes.json`, or live Part 1 roster rules.

## Engine mechanics post-v1.3

### Sleep position rule
`sleep` never changes the player's position. `evaluateOutcome` forces `outcome = 'Hold'` 
for sleep actions even if the probabilistic outcome would have been `'Advance'`.

### Gravity override (descend)
`descend` always moves one node down. Non-collapse descent turns override `'Retreat'` 
and `'Hold'` to `'Advance'` via `isDescend` flag in `evaluateOutcome`.

### Summit block
At summit node, `advance` and `advance_slowly` are blocked. The only valid next 
actions are `descend`, `wait`, and `sleep`.

### hasSummited
Set to `true` the first turn the player arrives at `summit` (nodeIndex ≥ 14). Used for 
`deriveTerminalOutcome` to resolve `Summit and Safe Return` at park exit.

### Time-of-day pressure amplification
`timeOfDayRisk = timeOfDayRiskScale[bucket] × node.timeSensitivity`  
`timeSensitivity`: 1 at approach, 2 at HIGH_CAMP band 1-2, 3 at HIGH_CAMP band 3.  
Night (22:00–06:00) + ts=3 = +120 EP. Intentional design: don't be at high camp at night.

### collapseChance formula
`collapseChance = clamp(max(0, eff) × 1.2 + (100 - fc) × 0.1 + actionMod.collapse, 0, 96)`  
At extreme pressure (eff=52): advance → 15.4% collapse. Severe weather is dangerous, not instantly lethal.


## v1.4.5 event layer

A lightweight, reproducible environment-event layer now runs during `apply-weather-and-persistence` in `resolveTurn()`.

- Archetypes: calm opening, rising wind, visibility drop, temporary clearing, summit-window tightening.
- Integration path: event effects mutate weather/visibility/time, then EP/BT/perception continue unchanged through the canonical chain.
- Telemetry: per-turn `lastTurnRecord.contextEvent` plus run log `contextEvent` fields where active.

Character-specific micro-events also run in the same stage with modest bounded effects (small fatigue/exposure/confidence drift), preserving mountain-first systemic authority.

## Startup contract diagnostics (v1.4.5 stabilization)

`prototype/web-v1/ui/helpers/data-config.js` treats required startup files as blocking dependencies and emits typed diagnostics consumed by the fatal screen renderer:

- missing file (`404`)
- HTTP failure (`non-404 non-ok response`)
- invalid JSON
- invalid shape
- post-load validation failure (cross-file contract checks)

This keeps startup failures explicit for players/testers while leaving resolver authority unchanged in `resolveTurn(state, action)`.
