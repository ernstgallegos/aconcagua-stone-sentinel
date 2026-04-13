# Design System — Public Web Surface (`/`)

## 1) Scope
Defines the visual/interaction system for the root public site (`index.html`) and the shared tonal base used by public documentation surfaces (`md-viewer`).

## 2) Design direction
- Alpine editorial, not SaaS/product-marketing.
- Quiet hierarchy: long breathing space, asymmetry, low visual noise.
- Mountain-first narrative framing: scale → pressure → decision → consequence.

## 3) Token baseline (`src/styles/public-tokens.css`)

### 3.1 Color tokens
- `--bg-0 #090d12`
- `--bg-1 #0e141c`
- `--bg-2 #141d28`
- `--surface-0 #111924cf`
- `--surface-1 #172230dc`
- `--surface-2 #202f41e5`
- `--border-soft #91a8bc3d`
- `--border-strong #c8d8e85e`
- `--text-main #e5edf5`
- `--text-dim #a8b8c8`
- `--text-muted #8597a8`
- `--accent-ice #d9edf8`
- `--accent-mist #b8cadb`
- `--accent-mineral #94aec4`
- `--accent-stone #ccb79e`

### 3.2 Typography tokens
- Editorial serif: `Playfair Display`
- UI/body sans: `Montserrat`
- System/meta mono: `IBM Plex Mono`

### 3.3 Motion policy
- Atmospheric micro-motion only (slow drift, no layout movement).
- Reduced-motion support is mandatory (`prefers-reduced-motion: reduce`).

## 4) Landing architecture (chapter order)
1. **Hero thesis** — alpine premise + primary CTA to playable web-v1.
2. **Altitude ledger** — four-step conceptual stack (geology → atmosphere → physiology → ethics).
3. **Editorial doctrine** — visual language principles.
4. **Canonical route** — landing role vs. gameplay authority boundaries.
5. **Primary materials** — whitepaper, roadmap, README/governance, contact channels.
6. **Closing CTA** — direct transition to playable expedition.

## 5) Component primitives
- Header nav with compact mono chips.
- Hero chapter with asymmetrical copy/image split.
- Timeline-like `altitude-step` rows.
- Doctrine cards (`principle`) and material cards (`material`).
- Pill CTAs (`btn-primary`, `btn-ghost`).
- Shared EN/ES language switch (`.lang-switch`, `.lang-btn`).

## 6) Accessibility
- Skip link and semantic landmarks.
- High-contrast focus states.
- Keyboard-safe nav/CTA order.
- No motion-only communication.
- Language switch updates document title, meta description, and critical alt text.

## 7) Asset guidance
- Prefer text-free curated artwork: `art/concept-art/curated/ig/*.png`.
- Reserve title-overlay covers for social/promotional outputs.
- Keep imagery color-graded toward cold-light/stone tones; avoid high-saturation overlays.
