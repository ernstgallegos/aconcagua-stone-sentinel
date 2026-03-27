# Architecture — Prototype Web v1.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.4.5]`](../CHANGELOG.md#145--2026-03).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](./en/implementation-plan-v1.4.md) (and Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4.5** with phased rollout contracts preserved.

Prototype Web v1.4 (public branch state) is the canonical active prototype in this repository, with completed and in-progress items from the v1.4 phase plan.

Canonical repo status is centralized in [`docs/repo-truth.md`](./repo-truth.md).

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
- `data/character_events.json`
- `data/outcomes.json`

## Repository prototype status

- `prototype/web-v1/`: **active canonical prototype** (v1.4 public state, phased progress).
- `prototype/mra-v0/`: **frozen historical validation artifact**.
- `index.html` at repo root: replay/viewer surface only.


## v1.4.5 additions

- Added a seed-driven environment-event layer that mutates weather/visibility inside the canonical resolver weather stage; no parallel progression authority was added.
- Added debrief/run-review helpers and accessibility helper modules under `prototype/web-v1/ui/helpers/` as low-risk modularization preparation for future TS migration.
