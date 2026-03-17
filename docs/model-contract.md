# Shared Model Contract: `prototype/mra-v0` ↔ `prototype/web-v1`

This document defines the canonical concepts that are shared across both simulation surfaces, and marks intentional divergences.

## Authority matrix

| Concept | Authoritative artifact | Notes |
| --- | --- | --- |
| Active, player-facing outcomes | `data/outcomes.json` | Canonical for active prototype (`web-v1`). |
| Active turn resolution semantics | `prototype/web-v1/engine/turn-resolution.js` | Canonical for gameplay behavior currently in use. |
| Web-v1 scenario catalog (predefined + random-archetype source) | `data/scenarios.web-v1.json` | Canonical scenario authority; UI/runtime must consume this data instead of embedding scenario constants. |
| Web-v1 scenario loading and runtime schema enforcement | `prototype/web-v1/ui/screens.js` (`loadDataConfig()`) | Enforces blocking validation for required config files and scenario-contract shape before enabling `modelReady`. |
| Historical baseline behavior | `prototype/mra-v0/simulator.py` | Frozen reference artifact only; not the active product authority. |
| Historical required scenario state shape | `prototype/mra-v0/scenarios/scenario.schema.json` | Used to preserve MRA reproducibility and regression checks. |
| Cross-surface overlap expectations | `data/contracts/model-contract.json` | Machine-readable contract consumed by CI checks. |

## Canonical overlap (must remain aligned)

## Web-v1 scenario authority boundaries

- `data/scenarios.web-v1.json` is the **single source of truth** for:
  - predefined scenario cards (`predefinedScenarios`),
  - random scenario generation knobs (`randomScenario.seedRange`, `maxTurnsRange`, `initialBase`, `initialRanges`),
  - random-archetype definitions (`randomScenario.archetypes`).
- `prototype/web-v1/ui/screens.js` is **runtime logic only**:
  - loads scenario data via `loadDataConfig()`,
  - validates schema + non-empty constraints,
  - materializes runtime state for card rendering and random scenario instantiation.
- Authority rule: gameplay balancing/content changes for scenarios should modify `data/scenarios.web-v1.json`; UI code should change only for rendering or contract-evolution mechanics.

## 1) Outcome concept

- `web-v1` canonical outcomes are the list in `data/outcomes.json`.
- `mra-v0` keeps historical legacy classes for archived experiment reproducibility.
- Overlap rule: both surfaces must keep explicit outcome taxonomy declarations; they are not required to use the same labels.

## 2) Shared state metrics

The following metrics are the overlap contract required in both surfaces:

- `position`
- `weather_severity`
- `visibility`
- `terrain_load`
- `functional_capacity`
- `fatigue`
- `exposure`
- `water`
- `food`

These keys represent the common decision/body/resource backbone for turn reasoning.

## 3) Turn semantics

Shared decision verbs:

- `advance`
- `wait`
- `descend`

Both surfaces are expected to preserve these semantic intents even when concrete formulas diverge.

## Intentional divergences (explicitly allowed)

1. **Outcome naming granularity**
   - `web-v1`: player-facing outcomes (e.g., `Rescue`, `Permit Expired`, `Fatality`).
   - `mra-v0`: compact legacy classes (e.g., `deteriorated`, `survived-marginal`).

2. **Altitude/stage vocabulary**
   - `mra-v0` uses `low/mid/high` bands.
   - `web-v1` uses route/stage abstractions and richer node-level pressure modeling.

3. **Mechanics scope**
   - `web-v1` includes active systems such as permit-day expiration, decision-window effects, and character-specific modifiers.
   - `mra-v0` intentionally excludes these newer mechanics.

## CI enforcement

A lightweight CI test validates overlap expectations declared in `data/contracts/model-contract.json`:

- web-v1 canonical outcome list vs `data/outcomes.json`.
- mra-v0 legacy outcomes vs `classify_outcome()` returns.
- shared required state metrics present in:
  - mra-v0 scenario schema initial state,
  - web-v1 scenario initial-state template.

This check protects shared conceptual contracts while preserving intentional divergence.
