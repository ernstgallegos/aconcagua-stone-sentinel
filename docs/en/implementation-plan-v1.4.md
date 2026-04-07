# Implementation Plan v1.4 (documentation)

> **Historical document — v1.4 implementation plan.**  
> This document reflects the phased backlog as written for v1.4. Phases 1–3 are complete. For the current live/deferred boundary and module map, see [`docs/repo-truth.md`](../repo-truth.md) and [`CHANGELOG.md`](../../CHANGELOG.md).

This document translates consolidated design v1.4 into planning deliverables for product execution.

## Scope

- Defines phase-based backlog.
- Lists dependencies.
- Establishes definition of done (DoD) per phase.
- Does not replace technical implementation specs.

---

## Phase 1 — Current sprint

### Goal
Align the playable prototype with the minimum systemic and narrative v1.4 structure.

### Prioritized backlog
1. Characters: migrate to six profiles and tune differential readability.
2. Outcomes: add `Permit Expired`.
3. Global state: permit counter (max 20 days).
4. UI: permit module in right panel.
5. Flow: remove `screen-mode` step.
6. Special outcome: exclusive success for `Summit and Safe Return`.
7. Part 2: initial selection screen with narrative gating.
8. Visible versioning: `title-eyebrow` to `v1.3`.
9. Technical versioning: `package.json` to `1.4.0`.
10. Traceability: changelog `1.4.0`.

### Dependencies
- Final per-character engine values.
- Outcome and debrief copy validation.
- QA criteria for full-screen flow.

### DoD
- Full flow runs without orphan screens.
- Part 2 unlock depends only on `Summit and Safe Return`.
- Permit is visible and decrementing during all runs.
- **Note (forward-correction):** The design spec listed `title-eyebrow` update to `"v1.3"` as a Phase 1 task. The implementation correctly shows `"Prototype · v1.4"`, reflecting the actual current version. The spec was written when `v1.4` was the upcoming version; the implementation is intentionally more accurate.

---

## Phase 2 — Completed

### Goal
Add character-specific playable differentiation and expand Part 2 narrative setup.

### Prioritized backlog
1. Daniela photo mechanic.
2. Character-specific decision timers.
3. Late-activation risk indicators for Erik and Irina.
4. Narrative transition sequence to Part 2.
5. Legibility improvements for external playtesting.

### Dependencies
- Phase 1 playtesting findings.
- UX adjustments based on observed friction.

### DoD
- Character differentiation is noticeable in at least three decision moments.
- Part 2 narrative sequence is navigable end-to-end.

### Real progress snapshot
- ✅ Daniela photo mechanic implemented in `prototype/web-v1/index.html` + `data/action_modifiers.json` with cooldown/cap and run-log instrumentation.
- ✅ Character-specific decision timers implemented through `engine.decisionWindow` in `data/characters.json` with gradual penalties (no instant fail).
- ✅ Late-activation perception behavior for Erik/Irina implemented via `engine.perceptionLatency` and resolver hooks in web-v1.
- ✅ Part 2 narrative transition sequence implemented end-to-end (`part2-character` to `future_cta`) with back/continue, debrief return paths, and collaboration CTA exits.
- ✅ Legibility improvements shipped (contextual status stack, risk chips, debrief actionable cause, targeted microcopy).

---

## Phase 3 — Publication preparation

### Goal
Validate systemic stability, public communication, and distribution readiness.

### Prioritized backlog
1. Internal playtests (5–10 full sessions).
2. Win-rate distribution verification by character.
3. Vercel deploy on clean URL.
4. Public presentation paragraph.

### DoD
- Documented evidence of playtesting outcomes.
- Win-rate deviations justified or corrected.
- Reproducible deployable environment.

### Real progress snapshot
- ✅ Monte Carlo playtest harness added (`scripts/monte-carlo-web-v1.js`) — headless simulator running all 6 characters × 5 scenarios × 50 seeds each.
- ✅ Win-rate distribution verification automated with `npm run simulate` — results documented in `docs/playtest-results/monte-carlo-v1.4.5.md`.
- ✅ Vercel deploy configured (`vercel.json` present with redirect to `prototype/web-v1/index.html`).
- 🔲 Public presentation paragraph (pending).

---

## Risks and mitigations

- **Risk:** increased UI cognitive load from new states.  
  **Mitigation:** visual hierarchy and contextual copy by phase.
- **Risk:** unfair perceived difficulty in high perceptual-noise characters.  
  **Mitigation:** situational onboarding and post-turn feedback.
- **Risk:** mismatch between narrative framing and systemic outcomes.  
  **Mitigation:** joint editorial review (design + systems) every sprint.
