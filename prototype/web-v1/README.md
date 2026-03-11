# Prototype Web v1.3

Canonical active web prototype for Aconcagua: Stone Sentinel.

## Engine contract

All turn resolution flows through:

`resolveTurn(state, action)`

Pipeline:

`Environment → EP → BT → pressureDelta → perception → action modifier → outcome`

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

## Outcomes

Canonical outcome set includes `Rescue` as a real gameplay outcome.

## Logging

`run_log.json` is exported from the engine turn log with EP/BT/delta, progress, physiology, confidence, trend, stage, node, character, and outcome.
