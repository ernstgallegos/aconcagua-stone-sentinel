# Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[Unreleased]`](../../CHANGELOG.md#unreleased).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](../../docs/en/implementation-plan-v1.4.md) (Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4 in-progress (phased rollout)** with shipped phase slices and pending items.

> **Public repository scope:**
> - Public prototype code is available in this repository (this `prototype/web-v1` implementation and the frozen `prototype/mra-v0` reference artifact).
> - Production/commercial branch scope remains private.

Canonical active web prototype for Aconcagua: Stone Sentinel.

## Language support

The web prototype now includes a persistent language selector with two options: English and Spanish.


## Engine contract

All turn resolution flows through:

`resolveTurn(state, action)`

Pipeline:

`Environment → EP → BT → pressureDelta → perception → timed degradation → action modifier → outcome`

## Canonical route

The route is node-to-node and loaded from `data/nodes.json` with the current canonical sequence (carried forward from the v1.3 route baseline) including:

- Cambio de Pendiente (5300m)
- El Balcón Amarillo (5800m)
- La Travesía

## Data source of truth

Simulation inputs are loaded from `/data`:

- `nodes.json`
- `environmental_pressure_config.json`
- `action_modifiers.json`
- `stage_modifiers.json`
- `characters.json`
- `outcomes.json`

## Scenario selection

- In `Select Scenario`, players choose the scenario card only; the engine assigns one of that scenario's configured seeds at random at selection time.
- Seed identity remains hidden in the selection UI to keep scenario runs opaque and replay variety high.

## Player-facing watch

Public mountain reading is intentionally imperfect:

- Mountain Pressure
- Trend
- Confidence
- Context Status (risk chips: stable / warning / critical)
- Permit and decision-window pressure stacked under the watch for faster scanning

## Outcomes

Canonical outcome set includes `Rescue` as a real gameplay outcome.

## Logging

`run_log.json` is exported from the engine turn log with EP/BT/delta, progress, physiology, confidence, trend, stage, node, character, and outcome.


## Time pressure and accessibility

- Decision windows are character-specific via `data/characters.json` (`engine.decisionWindow`) and stage-aware (`APPROACH`, `HIGH_CAMP`, `SUMMIT_DAY`).
- Exceeding the window applies gradual soft penalties (confidence/noise and minor action-cost drift), never an instant fail state.
- The watch panel shows countdown/overage and partial-information microcopy, and each run records timing, over-window status, and applied effect in `run_log.json`.
- Critical actions include concise cost/benefit microcopy directly in the decision buttons to reduce onboarding dependency.
- Debrief now surfaces both the turning point and a primary actionable cause aligned with the final outcome.
- A one-use `Focus pause` grants a short contextual grace margin for playtesting accessibility without disabling pressure dynamics.
