# Implementation Plan v1.4 (documentation)

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

---

## Phase 2 — Next sprint

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

---

## Risks and mitigations

- **Risk:** increased UI cognitive load from new states.  
  **Mitigation:** visual hierarchy and contextual copy by phase.
- **Risk:** unfair perceived difficulty in high perceptual-noise characters.  
  **Mitigation:** situational onboarding and post-turn feedback.
- **Risk:** mismatch between narrative framing and systemic outcomes.  
  **Mitigation:** joint editorial review (design + systems) every sprint.
