# Prototype Web v1.3

Canonical active web prototype for Aconcagua: Stone Sentinel.

## Engine contract

All turn resolution flows through:

`resolveTurn(state, action)`

Pipeline:

`Environment → EP → BT → pressureDelta → perception → timed degradation → action modifier → outcome`

## Canonical route

The route is node-to-node and loaded from `data/nodes.json` with the v1.3 canonical sequence including:

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
