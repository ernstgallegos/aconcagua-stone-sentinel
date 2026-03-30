# Redesign Changelog — Public Landing Flagship Refresh

## Scope
- Surface redesigned: repository root `index.html` (canonical public landing route `/`).

## What changed
1. **Information architecture**
   - Expanded from a short hero to a structured narrative: vision, system, status, outcomes, and final CTA.
2. **Visual system**
   - Introduced coherent tokenized styling (color, spacing, radius, elevation).
3. **Componentization (CSS/HTML pattern-level)**
   - Standardized reusable primitives for nav, hero, cards, buttons, grid/split layouts, timeline, and taxonomy lists.
4. **Accessibility and UX polish**
   - Added skip link, focus-visible states, semantic landmarks, and reduced-motion handling.
5. **Content strategy**
   - Incorporated canonical project truths from repository docs into public-facing messaging.

## Why
- Increase perceived professionalism and trust for external audiences.
- Improve first-session comprehension and reduce onboarding friction.
- Align runtime entry experience with project maturity and documentation depth.

## Expected impact
- Stronger first impression and clearer conversion toward prototype play.
- Better comprehension for collaborators, press, and stakeholders.
- Greater consistency between visual presentation and systemic design narrative.

## Remaining debt / next iterations
- Add dedicated EN version of the landing (currently ES-led copy).
- Add visual regression/smoke check specifically for root landing route.
- Consider extracting root landing CSS into dedicated modular stylesheet if root surface expands further.
