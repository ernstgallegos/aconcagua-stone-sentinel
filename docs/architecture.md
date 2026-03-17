# Architecture — Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[Unreleased]`](../CHANGELOG.md#unreleased).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (and Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4 in-progress (phased rollout)**, not the legacy v1.3 baseline.

Prototype Web v1.4 (public branch state) is the canonical active prototype in this repository, with completed and in-progress items from the v1.4 phase plan.

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

- `prototype/web-v1/`: **active canonical prototype** (v1.4 public state, phased progress).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: replay/viewer surface only.
