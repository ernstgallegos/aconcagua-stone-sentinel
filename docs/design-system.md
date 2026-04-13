# Design System — Public Web Surface (`/`)

## 1) Scope
This document defines the visual/interaction system for the root public site (`index.html`) and the shared tonal extension applied to `prototype/web-v1` shell theming.

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
- Primary serif (brand/editorial): `"Playfair Display", "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif`
- Primary sans (UX/UI): `"Montserrat", "Plus Jakarta Sans", "Inter", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif`
- Reading sans (long-form support): `"Inter", "Montserrat", "Plus Jakarta Sans", "Avenir Next", "Segoe UI", Roboto, system-ui, sans-serif`
- Supporting mono (telemetry/system): `"IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Roboto Mono", monospace`

**Role model (recommended):**
- `--font-brand`: Playfair Display (hero title, section titles, narrative highlights).
- `--font-ui`: Montserrat (navigation, buttons, labels, chips, dense interaction copy).
- `--font-reading`: Inter (long-form explanatory paragraphs; optional, can collapse to `--font-ui`).
- `--font-data`: IBM Plex Mono (stats, watch, telemetry, technical metadata).

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
- **Immersive hero chapter:** full-bleed alpine plate + restrained editorial copy + primary play CTA.
- **Manifest chapter:** concise two-pillar thesis blocks (geology-first + time-pressure framing).
- **Altitude ledger chapter:** four-band vertical progression framing mood/system pressure by elevation.
- **Field Notes chapter:** compact contextual carousel with geography/history anchors.
- **Materials chapter:** direct access to whitepaper, roadmap, and repository truth docs.
- **Closing chapter:** single conversion zone to play prototype and inspect repo truth.

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
- Motion remains micro and atmospheric (no theatrical parallax or cinematic overlays).
- Transition targets: transform/background/border only.
- Avoid autoplay-heavy movement on core reading surfaces; only low-friction note navigation uses step transitions.
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

## 11) Prototype extension notes (`prototype/web-v1`)
- Token refresh keeps the same mountain-first palette family (cold mineral base + restrained amber/ice accents).
- Welcome/setup surfaces use layered overlays instead of flat dark fills to preserve atmospheric continuity.
- Primary actions remain high-contrast and calm; secondary/decision controls reduce visual noise while preserving affordance.

## 12) Visual assets — concept art integration

The repository contains 13 curated concept art scenes in `art/concept-art/curated/ig/` (text-free, odd-numbered `1.png`–`25.png`) and matching promotional cover plates with title overlay in `art/cover/ig/` (even-numbered `2.png`–`26.png`). Full catalog with palette notes and recommended use cases: [`docs/concept-art-catalog.md`](concept-art-catalog.md).

**Scene-role pairings (production guidance):**

| Scene | File | Primary role | Palette alignment |
|---|---|---|---|
| 1 — Dawn approach | `concept-art/curated/ig/1.png` | Landing page hero, title screen, expedition setup | Rose · lavender · `--accent-amber` |
| 3 — Group ascent | `concept-art/curated/ig/5.png` | Onboarding, multiplayer framing, expedition context | Blazing amber · dark umber |
| 4 — High camp at sunset | `concept-art/curated/ig/7.png` | Camp/rest decisions, resource management | Blue-lavender · coral · `--accent-amber` |
| 5 — Whiteout | `concept-art/curated/ig/9.png` | Extreme weather overlay, high EP state | Near-white · rose tint (text-overlay safe) |
| 7 — Golden hour | `concept-art/curated/ig/13.png` | Time-pressure moments, window-closing scenarios | Deep amber · `--accent-amber` (all-warm) |
| 11 — Soft ridge, lavender | `concept-art/curated/ig/21.png` | Debrief/reflection screens, modal backgrounds | Lavender · cream (minimal contrast noise) |
| 13 — Blue hour | `concept-art/curated/ig/25.png` | Critical-state moments, late-game, permit expiry | Cobalt · `--accent-ice` (inverted hierarchy) |

**Usage rule:** prefer `art/concept-art/curated/ig/` (text-free) for all UI, docs, and web surface uses. Reserve `art/cover/ig/` (title overlay) for promotional/social outputs only.
