# Design Direction — Aconcagua: Stone Sentinel (Public Landing)

## Concept

**"Mountain authority, editorial clarity, product-grade trust."**

The landing combines cinematic restraint with systemic rigor: atmospheric but never ornamental, clear but never generic.

## Visual tone

- Premium, sober, and contemporary.
- Dark alpine base with warm mineral highlights.
- Low-noise surfaces, meaningful depth, high legibility.

## UX principles

1. Immediate value proposition clarity.
2. Strong CTA priority: play prototype first.
3. Progressive disclosure from vision → system → status → outcomes.
4. Fast scan paths for newcomers and depth paths for technical audiences.

## Typography system

- Base family: Inter / IBM Plex Sans fallback stack.
- Hierarchy:
  - Hero title: high-impact display scale.
  - Section titles: strong editorial headings.
  - Body copy: compact readable rhythm.
  - Microcopy/navigation: reduced scale, high contrast.

## Spacing system

- Tokenized scale (`--space-1` to `--space-6`) to enforce rhythm.
- Vertical cadence optimized for reading blocks and card groups.
- Distinct section breaks to maintain scanability.

## Color system

- Background: deep blue-black layers.
- Surface: translucent dark panels with warm border accents.
- Accent: ochre/gold for premium wayfinding and primary actions.
- Status: green for readiness/active-state signaling.

## Imagery and illustration usage

- Cover artwork used as contextual hero media.
- Images support storytelling hierarchy and avoid decorative overload.
- Border treatment and radius aligned to card system.

## Motion rules

- Subtle hover elevation and focus transitions.
- No heavy animation loops.
- `prefers-reduced-motion` respected globally.

## Layout rules

- Max container width with responsive modular grid.
- Sticky lightweight header for quick section navigation.
- Hero split layout on desktop, stacked narrative on small screens.

## Responsive rules

- Mobile-first spacing and stacked sections.
- Desktop split only when content density benefits readability.
- Button groups and cards wrap naturally.

## Accessibility criteria

- Semantic landmarks (`header`, `main`, `section`, `nav`, `footer`).
- Skip link for keyboard-first navigation.
- Focus-visible states for controls.
- Contrast-conscious palette and readable body sizes.
- Heading hierarchy structured for assistive technologies.
