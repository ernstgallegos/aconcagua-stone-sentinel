# Architecture — Prototype Web v1.3

Prototype Web v1.3 is the canonical active prototype in this repository.

## Canonical engine flow

Every turn is resolved by a single authority:

`resolveTurn(state, action)`

Pipeline:

`Environment → Environmental Pressure (EP) → Body Tolerance (BT) → Pressure Delta → Perception → Action Modifier → Outcome`

No parallel outcome/progression logic should bypass this flow.

## Source of truth

All simulation tuning is loaded from `/data`:

- `data/nodes.json`
- `data/environmental_pressure_config.json`
- `data/action_modifiers.json`
- `data/stage_modifiers.json`
- `data/characters.json`
- `data/outcomes.json`

## Repository prototype status

- `prototype/web-v1/`: **active canonical prototype** (v1.3).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: replay/viewer surface only.
