# Prototype Web v1.4.4 (public state)

> **Canonical status (source-anchored):**
> - Live implementation status is tracked in `CHANGELOG.md` under [`[1.4.4]`](../../CHANGELOG.md#144--2026-03).
> - Phase progress snapshot is tracked in [`docs/en/implementation-plan-v1.4.md`](../../docs/en/implementation-plan-v1.4.md) (Spanish mirror: `docs/es/plan-implementacion-v1.4.md`).
> - Current public build is **v1.4.4 (public phased rollout)** with shipped phase slices and stabilized release documentation.

> **Public repository scope:**
> - Public prototype code is available in this repository (this `prototype/web-v1` implementation and the frozen `prototype/mra-v0` reference artifact).
> - Production/commercial branch scope remains private.

Canonical active web prototype for Aconcagua: Stone Sentinel.

Repository-wide truth baseline: [`docs/repo-truth.md`](../../docs/repo-truth.md).

## Language support

The web prototype now includes a persistent language selector with two options: English and Spanish.


## Engine contract

All turn resolution flows through:

`resolveTurn(state, action)`

Pipeline (ordering contract):

`normalize action → consume time/resources → weather+persistence update → EP/BT/perception → decision-window degradation → outcome evaluation → state update → terminal classification → signals+narrative`

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
- `character_events.json`
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

## Difficulty and onboarding additions

- The welcome screen is now cover-first and minimal; descriptive copy, version/status, and credits are tucked into an optional info modal, while difficulty selection lives in expedition setup.
- Difficulty is not cosmetic: it modifies pressure, stage bias, body tolerance, starting resources, permit days, recovery strength, combined resource economy, and the decision timer profile.
- Character decision-window profiles still apply, but title difficulty now adds or removes time on top of those profiles instead of being ignored whenever a character provides custom timing values.
- The onboarding screen now exposes a full tutorial/FAQ modal before the final begin CTA so the player can review rules without leaving the run setup flow.


## In-game help overlay

A runtime help overlay is available from the game screen (`Pressure & Trend Help`) and explains pressure labels plus trend categories without leaving the run.

## Engine unit-test harness

- Deterministic turn harness: `prototype/web-v1/tests/harness/turn-harness.js`
- Engine formula tests: `prototype/web-v1/tests/engine/*.test.js`
- Run all web-v1 tests: `npm test`

## Sprint upgrades (v1.4.4)

- Added deterministic golden regression coverage and outcome-derivation tests for canonical terminal outcomes, permit/window behavior, and run-log export shape.
- Added lightweight dynamic environment events (calm opening, rising wind, visibility drop, temporary clearing, summit-window tightening), all seed-driven through the existing resolver pipeline.
- Added one lightweight character-specific event per protagonist with modest systemic effects and narrative cues, without bypassing `resolveTurn(state, action)`.
- Upgraded debrief with structured sections, run signature text, and a local turn-by-turn review panel plus one-click signature copy.
- Expanded help overlay content with confidence semantics, retreat framing, and “How to read this game” guidance while preserving partial-information constraints.
- Accessibility improvements include stronger focus-visible styles, keyboard-safe modal focus return behavior, and reduced-motion support hardening.
