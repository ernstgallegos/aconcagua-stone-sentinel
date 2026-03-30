# Design Direction — Public Web Redesign

## Concept
**"Mountain-first editorial signal"**: the site behaves like a curated public dossier with contemplative pace, not a startup landing.

## Visual principles
1. Atmosphere over decoration.
2. Hierarchy by scale + whitespace, not effect overload.
3. Limited accents for intentional emphasis.
4. Surfaces feel geological/meteorological (layered depth, low-noise texture).

## UX principles
1. Progressive revelation: concept first, architecture second, evidence third, CTA last.
2. Scannable for first-time visitors; rich enough for evaluators.
3. Every section answers a distinct question (what / how / proof / now what).
4. Public landing and playable prototype should share the same tonal family (editorial calm + systemic clarity).

## Typography decisions
- Primary headline family: high-authority serif (`Iowan Old Style` fallback stack).
- Body/UI family: neutral sans (`Inter` + system fallbacks).
- Strong contrast in scale, restrained weights, moderate line lengths.

## Chromatic system
- Base: deep cold neutrals (`--bg-*`, `--surface-*`).
- Main text: frosted light neutral.
- Accent set: ice/mineral/amber; used sparingly for interactive and semantic emphasis.
- No saturated gaming neons; no SaaS gradients.

## Spacing rules
- Vertical rhythm favors broad pauses between conceptual chapters.
- Dense modules (cards/panels) stay inside controlled spacing bands.
- CTA spacing remains compact to preserve focus.

## Composition rules
- Asymmetric hero (copy-dominant + curated artwork).
- Alternation between full-width thematic blocks and structured grids.
- Distinct visual mass for high-priority sections (vision/system/final CTA).

## Image usage
- Use only project-authentic art.
- Preserve aspect ratio and avoid aggressive crop.
- Images support atmosphere and credibility; never become decorative noise.

## Motion rules
- Micro-motion only (hover and focus transitions).
- No parallax, no aggressive transforms.
- Full reduced-motion respect via media query.

## Responsive logic
- Mobile-first stacking with preserved semantic order.
- Desktop introduces asymmetry and multi-column structures without changing content hierarchy.
- CTA readability and touch targets retained at all breakpoints.

## Accessibility criteria
- Semantic landmarks (`header`, `main`, `section`, `footer`).
- Ordered heading structure.
- Keyboard-visible focus states.
- Contrast-safe text/surface combinations.
- Language toggle with `aria-pressed` state.
- Skip link and reduced-motion support.

## Things to avoid
- Template-style hero patterns.
- Over-cardification.
- Generic game-marketing epic tone.
- Technology-first copy detached from mountain/system identity.
