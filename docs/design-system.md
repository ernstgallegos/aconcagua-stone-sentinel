# Design System — Public Web Surface (`/`)

## 1) Scope
This document defines the visual/interaction system for the root public site (`index.html`).

## 2) Design tokens

### 2.1 Color tokens
- `--bg-0 #0b0f14`
- `--bg-1 #101723`
- `--bg-2 #172130`
- `--surface-0 #111a27cc`
- `--surface-1 #172335d9`
- `--surface-2 #213348e6`
- `--border-soft #93a8bc3d`
- `--border-strong #d7e6f252`
- `--text-main #e8eff7`
- `--text-dim #adbbc9`
- `--text-muted #8b9aab`
- `--accent-ice #d6eef9`
- `--accent-mineral #9bb9ce`
- `--accent-amber #d9b996`

### 2.2 Typography tokens
- Serif display: `"Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif`
- Sans UI/body: `"Inter", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif`

### 2.3 Radius tokens
- `--radius-xs: 10px`
- `--radius-sm: 14px`
- `--radius-md: 22px`
- `--radius-lg: 30px`

### 2.4 Shadow tokens
- `--shadow-soft: 0 16px 48px #05080d66`
- `--shadow-strong: 0 30px 80px #04070ccc`

### 2.5 Spacing tokens
- `--space-1: 0.35rem`
- `--space-2: 0.65rem`
- `--space-3: 1rem`
- `--space-4: 1.6rem`
- `--space-5: 2.5rem`
- `--space-6: 4rem`
- `--space-7: 6rem`

## 3) Type scale
- Hero H1: `clamp(2.1rem, 6.5vw, 4.8rem)`
- Section H2: `clamp(1.55rem, 3.8vw, 2.7rem)`
- Body: `~1rem`
- Supporting metadata: `0.67rem–0.9rem`

## 4) Containers and layout
- Main shell width: `min(1220px, 92vw)`
- Structural rhythm: large vertical chapters (`--space-7`) between major sections.
- Desktop asymmetry enabled from `910px+` for hero/system/status compositions.

## 5) Section patterns
- **Hero chapter:** conceptual thesis + primary CTA + curated cover image.
- **Manifest chapter:** three conceptual pillars in a denser framed block.
- **System chapter:** flow strip + runtime/audience evidence panels.
- **Intelligence chapter:** compact evidence cards linking to core documents/channels.
- **Status chapter:** concise public readiness strip.
- **Outcome chapter:** canonical outcome list with hierarchy.
- **Final chapter:** high-priority single conversion zone.

## 6) Reusable components
- `btn` (`btn-primary`, `btn-secondary`)
- `panel` (evidence/info module)
- `intel-card` (doc/channel module)
- `outcome` (outcome definition row)
- `status-item` (readiness metric item)

## 7) Component states
- Hover: subtle upward translation on buttons.
- Focus-visible: high-contrast outline (`2px`, ice accent).
- Active language: pill-based `aria-pressed` state.

## 8) Motion principles
- Motion remains micro and atmospheric.
- Transition targets: transform/background/border only.
- No layout-shifting animations.
- `prefers-reduced-motion` disables transitions globally.

## 9) Responsive rules
- Mobile-first linear reading order.
- Desktop enhances density and asymmetry without reordering meaning.
- CTA buttons wrap naturally to avoid overflow.

## 10) Accessibility notes
- Skip link present.
- Semantic landmarks and heading order preserved.
- Strong focus indicators for keyboard navigation.
- Reduced-motion media query applied.
- Language switch reflects state with `aria-pressed`.
- Text/background combinations selected for high contrast in dark mode.
