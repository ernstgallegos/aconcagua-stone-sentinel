# Implementation Plan v1.5 (delivery record)

> **This document records what was delivered in v1.5.0.**
> For the current live/deferred boundary and module map, see [`docs/repo-truth.md`](../repo-truth.md) and [`CHANGELOG.md`](../../CHANGELOG.md).

## Scope

v1.5.0 builds on the completed v1.4 phase plan with three primary deliverables:

1. **Professional-grade Canvas2D mountain visualization** — comprehensive visual fidelity upgrade.
2. **Per-character visual identity** — unique climber appearance per character.
3. **Decision-position bug fix** — `wait` and `shoot_photo` no longer cause unintended position changes.

---

## Deliverable 1 — Canvas2D Mountain Visualization

### What was delivered

Complete rewrite of `prototype/web-v1/ui/helpers/mountain-visualization.js` (1480 → 2991 lines) from MVP proof-of-concept to near-production quality rendering:

- **Enhanced climber figure**: character-colored sleeping bag, jacket with 4-stop gradient shading, crampons at high altitude, boot detail, hip belt and compression straps on backpack, rope coil, sleeping mat.
- **Breath vapor system**: visible breath condensation at high altitude/cold conditions.
- **Enhanced headlamp**: strap, housing detail, two-layer beam cone.
- **Enhanced camp markers**: gradient-shaded tents, fabric fold lines, guy ropes, animated fire.
- **Summit flag upgrade**: cairn rock pile, metallic pole, 8-segment waving cloth with gravity droop physics, Sol de Mayo detail.
- **God rays / crepuscular rays**: volumetric light shafts at dawn/dusk.
- **Shooting stars**: rare meteor streaks across night sky.
- **Enhanced post-processing**: multi-stop vignette, film grain, chromatic aberration, cinematic color grading per altitude band, sun bloom, lens flare ghosts, depth-of-field, moon halo, collapse red-flash, fatigue/exposure vignette.
- **Post-decision transition system**: `TransitionManager` class with camera zoom/pull, wind spikes, fog clearing, cloud time-lapse, sleep dim-then-brighten.
- **Smooth weather transitions**: `lerpAtmosphere` interpolation, lightning flash, whiteout overlay.
- **Climber pose system**: action-driven stances, idle micro-animations, fatigue expression.
- **Cinematic altitude HUD**: vertical altitude gauge, info overlay, summit distance arc.
- **Procedural terrain texture**: rock fracture lines, scree dots, snow sastrugi.

### Same public API contract

`initMountainVisualization` / `updateClimberPosition` / `destroyMountainVisualization` — zero new dependencies, pure Canvas2D, respects `prefers-reduced-motion`.

---

## Deliverable 2 — Per-Character Visual Identity

### What was delivered

Each of the 6 playable characters now renders with a unique appearance:

| Character | Jacket | Hat | Build |
|---|---|---|---|
| Francisco Aguirre | Red | Navy beanie | Standard |
| Laura Kim | Teal/cerulean | Cream beanie | Lighter |
| Erik Lundvall | Mustard gold | Charcoal beanie | Tall/broad |
| Daniela De Rossi | Deep violet + camera on pack | Athletic | Athletic |
| Blake Harris | Near-black | Bright red beanie | Stocky |
| Irina Orlova | Burnt orange | Cream beanie | Lean/tall |

`initMountainVisualization` accepts optional third argument `{ characterId }` to configure the climber appearance.

---

## Deliverable 3 — Decision-Position Bug Fix

### What was fixed

Previously, only approach-altitude waits were forced to Hold. At higher altitudes, `wait` and `shoot_photo` could roll Advance or Retreat via RNG, causing unintended position changes.

**Fix:** All `wait` and `shoot_photo` outcomes are forced to Hold at every altitude (except body-failure Collapse). Implemented in `evaluateOutcome()` in `prototype/web-v1/engine/turn-resolution.js`.

---

## Additional changes in v1.5.0

- Version bumped across all public surfaces (`package.json`, landing page, prototype, READMEs, `docs/repo-truth.md`, `docs/simulation_engine.md`).
- Terrain center follows route path instead of hardcoded x=0.
- Route coordinates replaced with realistic Ruta Normal profile.
- Visualization waypoints derived from runtime `normalizeRouteData()` instead of hardcoded 15 nodes.
- Extracted landing page CSS to external `src/styles/landing.css`.
- Condensed `README.md` from 335 to 88 lines.
- Geological bible EN translation created.
- Geological grounding added to design pillars, systems overview, and READMEs.

---

## Definition of Done

- [x] Canvas2D visualization renders at near-production quality on desktop and mobile.
- [x] All 6 characters render with unique visual identity.
- [x] `wait`/`shoot_photo` never cause position changes (except Collapse).
- [x] All 347 JS tests pass.
- [x] All 26 Python tests pass.
- [x] TypeScript typecheck clean.
- [x] Version synchronized across all surfaces.
