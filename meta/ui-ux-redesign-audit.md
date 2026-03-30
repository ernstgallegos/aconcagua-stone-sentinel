# UI/UX Redesign Audit — Root Public Web Surface

## Current-state diagnosis

1. **Positioning clarity gap**
   - The previous root experience offered limited narrative depth and weak information architecture for first-time visitors.
   - The project's strategic value (systemic simulation + narrative intent + documentary tone) was underrepresented above the fold.

2. **Content density imbalance**
   - Key public-facing truths (active prototype, canonical outcomes, public status, flow) existed in docs but were not sufficiently surfaced in the landing experience.

3. **Design-system immaturity at root layer**
   - Visual language had partial consistency but lacked a documented token/component framework specific to the landing.

4. **Trust and scanability opportunities**
   - Stakeholder-facing signals (what this is, why it matters, what to do next) needed stronger hierarchy and clearer narrative progression.

## Positioning hypothesis

Aconcagua: Stone Sentinel should present as a **serious, design-led indie project** at the intersection of:
- systemic decision gameplay,
- documentary mountain framing,
- public-playtest-ready product discipline.

## Opportunities detected

- Build a premium, editorial + product hybrid landing structure.
- Surface canonical project truths directly in UI (active prototype, route map, outcomes, status).
- Increase perceived quality with coherent visual system tokens and reusable component patterns.
- Improve external onboarding for press, collaborators, and evaluators through clearer CTA choreography.

## Redesign guiding principles

1. **Clarity first, character second**: communicate core proposition in <10 seconds.
2. **System over collage**: enforce reusable layout/component/tokens logic.
3. **Calm premium aesthetics**: controlled contrast, deliberate spacing, restrained motion.
4. **Actionable narrative**: every section answers “what / why / next step”.
5. **Public-readiness by default**: align UI message with docs/repo truth.

## Strategic decisions taken

- Keep current static architecture (no full-stack migration) to minimize delivery risk and preserve deployment simplicity.
- Execute a complete flagship redesign at root `index.html` with:
  - stronger content model,
  - improved semantics/accessibility,
  - documented design-system artifacts.
- Create dedicated redesign documentation set:
  - `meta/design-direction.md`
  - `docs/design-system.md`
  - `meta/redesign-changelog.md`
