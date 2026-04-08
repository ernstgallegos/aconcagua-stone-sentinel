# Repository Truth — Canonical Runtime and Documentation Contract

_Last updated: April 2026._

## Active prototype
- **Canonical active prototype:** `prototype/web-v1`.
- **Canonical consequential turn authority:** `resolveTurn(state, action)` in `prototype/web-v1/engine/turn-resolution.js`.

## Frozen artifact
- **Frozen compatibility artifact:** `prototype/mra-v0` (no feature evolution; compatibility/test touch only).

## Public canonical version
- **Public canonical version after this sprint:** `v1.4.7`.
- Source-of-version truth: `package.json` + `package-lock.json`, mirrored in UI/docs/changelog.

## Roster truth
- **Part 1 (active):** 6 fully active characters in `data/characters.json` (Francisco, Laura, Irina, Erik, Daniela, Blake).
- **Part 2 (public):** preview bridge only with one playable public path (guided transfer), additional cards intentionally locked.

## Canonical outcomes
Canonical outcomes are defined by `data/outcomes.json` and enforced by the resolver pipeline:
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

## Live vs deferred systems
### Live now
- EP/BT/delta canonical resolver pipeline.
- Seeded scenario system and dynamic weather/context events.
- Bounded character-event subsystem backed by `data/character_events.json`.
- Decision-window pressure and telemetry export (`run_log.json`).

### Deferred
- Full playable Part 2 expedition systems.
- Any non-canonical progression layer (XP/skill trees remain out-of-scope).

## Source-of-truth ownership map
- `data/*.json`: simulation tuning and bounded event contracts (including `data/context_events.json` and `data/character_events.json`). See `docs/data-contracts-guide.md` for field schemas and validation error reference.
- `prototype/web-v1/engine/*`: canonical deterministic turn mechanics.
- `prototype/web-v1/ui/*`: rendering, input wiring, and non-authoritative presentation.
  - `ui/game-loop.js`: turn-resolution orchestration factory (`createGameLoop(deps)`). Owns the full `handleDecision` pipeline with injected rendering callbacks.
  - `ui/flow-controller.js`: screen-flow and modal management (`initFlowController(hooks)`). Owns `showScreen`, all modal open/close pairs, bottom-sheet management, `advanceFromTitle`, `handleDeepLink`, and Escape/backdrop listeners.
  - `ui/screens/debrief.js`: pure debrief analysis functions (`findTurningPoint`, `findPrimaryCause`, `buildReflectionPrompts`).
  - `ui/helpers/screen-utils.js`: pure utility functions (`formatMinutes`, `confidenceTier`, `resolveNavigationTarget`, etc.).
  - `ui/helpers/carousel.js`: carousel card builders, dot renderer, info-panel toggle, character-image path resolution, and navigation index helpers.
  - `ui/helpers/narrative.js`: narrative text banks (EN/ES), `pickNarrative` selector, and `resolveNarrativeText` pure dispatcher.
  - `ui/helpers/storage.js`: consolidated `localStorage` write/remove safety helpers.
  - `ui/event-registry.js`: centralized `data-action` dispatch replacing inline `onclick` handlers.
- `prototype/web-v1/ui/helpers/run-log.js`: run-log serialization/export shape for debrief review and downloadable `run_log.json`.
- `docs/repo-truth.md`: canonical repo status baseline; parity-tested.
- `CHANGELOG.md`: release and unreleased change ledger.

## Canonical turn authority statement
No UI path, helper, or event layer may directly assign terminal outcomes or bypass EP/BT/delta flow. All consequential outcomes must emerge through `resolveTurn(state, action)`.

## Guaranteed by tests
The following claims are explicitly parity/contract tested in `prototype/web-v1/tests/parity/*.test.js` and related integration suites:
- Active prototype remains `prototype/web-v1`.
- Frozen compatibility artifact remains `prototype/mra-v0`.
- Public version stays synchronized across `package.json`, UI labels, and this document.
- Part 1 roster keeps six active characters.
- Canonical outcomes listed here match `data/outcomes.json`.
- Canonical turn authority remains `resolveTurn(state, action)` with enforced resolver pipeline order.
- Live vs deferred boundary remains explicit: Part 1 playable now; Part 2 public bridge is preview/deferred beyond guided transfer.
