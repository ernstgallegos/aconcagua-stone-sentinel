# Design System (Landing Public Surface)

## 1) Tokens

### Color tokens
- `--bg`, `--bg-soft`: atmospheric background layers.
- `--surface`, `--surface-strong`: panel surfaces.
- `--surface-border`: card/panel border consistency.
- `--text`, `--muted`: primary and secondary text.
- `--accent`, `--accent-strong`: CTA and emphasis.
- `--ok`: positive operational signals.

### Radius tokens
- `--radius-sm`, `--radius-md`, `--radius-lg`.

### Spacing tokens
- `--space-1 ... --space-6` (micro → section spacing).

### Elevation token
- `--shadow-md`: primary panel elevation.

## 2) Layout primitives

- `.page`: central max-width container.
- `.section`: vertical rhythm block.
- `.grid`: responsive card grid (`auto-fit/minmax`).
- `.split`: two-column adaptive section layout.

## 3) Components

### Header / Navigation
- `.site-header`, `.site-header-inner`, `.nav`.
- Sticky lightweight navigation for section anchors.

### Hero block
- `.hero`, `.hero-layout`, `.hero-media`, `.eyebrow`, `h1`, `.hero-lead`.
- Combines proposition, CTA stack, and contextual image.

### Buttons
- `.btn` base.
- `.btn-primary` (main action).
- `.btn-secondary` (supporting actions).

### Cards
- `.card` with heading/body pairing.
- Used across pillars, system, outcomes.

### Informational patterns
- `.kpi` readiness indicator.
- `.timeline` for project-state sequencing.
- `.outcome-list` for concise taxonomy presentation.

## 4) Interaction patterns

- Hover: small Y-translation on CTAs.
- Focus-visible: high-contrast outline.
- Reduced motion support via `prefers-reduced-motion`.

## 5) Usage rules

### Do
- Keep CTA hierarchy explicit (1 primary + limited secondary).
- Preserve section order: vision → system → status → outcomes.
- Reuse tokens/components before introducing ad-hoc values.

### Don’t
- Do not add decorative motion without UX purpose.
- Do not break typographic hierarchy with arbitrary font sizes.
- Do not bypass token system with hardcoded one-off styling unless justified.
