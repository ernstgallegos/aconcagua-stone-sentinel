# Public Roadmap

This document presents a **high-level roadmap** for *Aconcagua: Stone Sentinel*.

It is not a schedule, a timeline, or a delivery plan.  
It is a **map of stages**, intended to make visible what has already been accomplished and what kind of work lies ahead.

Progress in this project is not measured by speed, but by **clarity, coherence, and alignment**.

---

## How to Read This Roadmap

- Each stage represents a **type of work**, not a duration.
- Stages are sequential in logic, but may partially overlap.
- Completion does not mean “finished forever”, but **stable enough to build upon**.
- This roadmap distinguishes **design lock complete** (documented decisions) from **implementation complete** (working behavior in shipped prototype).

---

## Compact Status Matrix (v1.4 snapshot)

| Stage | Status | Design lock | Implementation | Evidence snapshot |
| --- | --- | --- | --- | --- |
| Stage 1 — Grounding the Project | Done | Done | Done (documentation stage) | Core framing published in consolidated design and plan docs. |
| Stage 2 — Systemic Definition | Done | Done | Done (system contracts implemented in both prototypes) | `prototype/mra-v0/simulator.py` + `prototype/web-v1/engine/turn-resolution.js` preserve turn/system loop semantics. |
| Stage 3 — Visual Intent and Curation | Done | Done | In progress | Visual intent documented; iterative readability refinements continue in web-v1 UI copy/layout. |
| Stage 4 — Core Experience Prototype | Done | Done | Done | MRA v0 deterministic simulation + scenario validation/tests are stable and retained as reference baseline. |
| Design Consolidation v1.4 | Done | Done | In progress by phase | Locked in `docs/en/consolidated-design-v1.4.md` + phased delivery in `docs/en/implementation-plan-v1.4.md`. |
| Stage 5 — Selective System Prototyping | Done | Done | Done | Permit, timers, contextual actions, perception latency, and telemetry are implemented in web-v1. |
| Stage 6 — Integrated Prototype | In progress (current) | Done | In progress | Canonical flow is playable end-to-end with cross-system interaction and Part 2 bridge gating. |
| Stage 7 — Evaluation and Direction Lock | Planned | Planned | Planned | Pending publication-readiness checks and directional decision. |

Progress references: [`docs/en/implementation-plan-v1.4.md` Phase status and Real progress snapshot](../docs/en/implementation-plan-v1.4.md#phase-2--in-progress-current-sprint-follow-up).

---

## Stage 1 — Grounding the Project  
**Status: Done**

> Establishing intent, scope, and conceptual boundaries.

### Objective repository evidence
- **Design lock complete:** project intent and boundaries are codified in `docs/en/consolidated-design-v1.4.md` and phase planning in `docs/en/implementation-plan-v1.4.md`.
- **Implementation complete:** this is a documentation-stage foundation; no additional executable artifact is required beyond scope-aligned docs.

---

## Stage 2 — Systemic Definition  
**Status: Done**

> Translating experience into systems.

### Objective repository evidence
- **Design lock complete:** system model is documented in `docs/simulation_engine.md` and consolidated v1.4 design references.
- **Implementation complete:**
  - Reference deterministic simulator exists in `prototype/mra-v0/simulator.py` with automated checks in `prototype/mra-v0/test_simulator.py`.
  - Active web engine implements turn-state progression in `prototype/web-v1/engine/turn-resolution.js` and shared rule helpers in `prototype/web-v1/engine/turn-rules.js`.

---

## Stage 3 — Visual Intent and Curation  
**Status: Done (design) / In progress (implementation polish)**

> Establishing tone and scale through restraint.

### Objective repository evidence
- **Design lock complete:** visual and narrative positioning is consolidated in v1.4 docs and public-facing readmes.
- **Implementation in progress:** ongoing legibility and readability refinements are delivered in `prototype/web-v1/index.html` and tracked through web-v1 test coverage (`prototype/web-v1/tests/new-mechanics.test.js`).

---

## Stage 4 — Prototyping the Core Experience  
**Status: Done**

> Testing decisions before full integration.

### Objective repository evidence
- **Design lock complete:** low-fidelity hypothesis and scenario intent are documented in mra-v0 docs and v1.4 planning.
- **Implementation complete:** `prototype/mra-v0/` provides deterministic scenario simulation, schema validation, and reproducible test support (`prototype/mra-v0/validate_all_scenarios.py`, `prototype/mra-v0/test_simulator.py`).

---

## Design Consolidation v1.4 — Documentation and Planning Lock  
**Status: Done (design lock) / In progress (phase implementation)**

> Consolidating narrative/systemic targets before and during implementation rollout.

### Objective repository evidence
- **Design lock complete:**
  - `docs/en/consolidated-design-v1.4.md` and `docs/es/diseno-consolidado-v1.4.md`.
  - `docs/en/implementation-plan-v1.4.md` and `docs/es/plan-implementacion-v1.4.md`.
- **Implementation in progress:** phase execution is actively tracked in the implementation plan, including explicit completed items in the Phase 2 real-progress snapshot.

---

## Stage 5 — Selective System Prototyping  
**Status: Done**

> Moving from abstract systems to concrete interactions.

### Objective repository evidence
- **Design lock complete:** phase goals are defined in `docs/en/implementation-plan-v1.4.md` (Phase 1/2 backlog).
- **Implementation complete:** selective subsystems are already live in `prototype/web-v1`, including:
  - Permit system + permit-expiry outcome (`data/outcomes.json`, `prototype/web-v1/index.html`).
  - Character differentiation and timers (`data/characters.json`).
  - Contextual/special actions and balancing knobs (`data/action_modifiers.json`, `prototype/web-v1/index.html`).
  - Telemetry and smoke/behavioral tests (`prototype/web-v1/tests/turn-behavior.test.js`, `prototype/web-v1/tests/test_smoke_flow.py`).

---

## Stage 6 — Integrated Prototype  
**Status: In progress (current stage)**

> Combining systems into a single playable structure.

### Objective repository evidence
- **Design lock complete:** integration targets are explicit in v1.4 consolidated design and implementation-plan DoD statements.
- **Implementation in progress (already substantially integrated):**
  - Canonical playable flow is wired and validated (`splash → title → character → scenario → onboarding → game → summit-success/debrief`) in `prototype/web-v1/ui/screens.js` and smoke coverage in `prototype/web-v1/tests/test_smoke_flow.py`.
  - Engine-state/UI integration is modularized across `prototype/web-v1/state/game-state.js`, `prototype/web-v1/engine/turn-resolution.js`, and `prototype/web-v1/ui/screens.js`.
  - Part 2 narrative bridge gating is implemented in `prototype/web-v1/index.html` and documented as in-progress production scope in `docs/en/implementation-plan-v1.4.md`.

This stage is no longer “planned only”: it is the **current active integration stage**.

---

## Stage 7 — Evaluation and Direction Lock  
**Status: Planned**

> Deciding what this project will become.

### Objective repository evidence
- **Design lock planned:** evaluation criteria are partially outlined in `docs/en/implementation-plan-v1.4.md` Phase 3 (playtests, win-rate distribution, deploy readiness).
- **Implementation planned:** pending completion of publication-preparation checks and directional decision after evidence review.

---

## Final Note

This roadmap reflects a deliberate approach to development.

Significant progress is already visible as running behavior in `prototype/web-v1`, while documentation remains the source of truth for design lock and future direction.  
The foundation is now strong enough to support integration, evaluation, and release-readiness decisions without losing coherence.

*Aconcagua: Stone Sentinel* is not built to race forward, but to **advance with awareness**.
