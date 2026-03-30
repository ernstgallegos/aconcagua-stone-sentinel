# Design System — Public Landing (Sunset-aligned)

## 1) Tokens

### Color tokens (aligned with web-v1 sunset)
- `--bg: #251420`
- `--surface: #331b2c`
- `--surface2: #422139`
- `--border: #684056`
- `--stone: #d3a48d`
- `--ochre: #ff9e5e`
- `--ochre-dim: #ca6f3f`
- `--ice: #ffc89a`
- `--ice-dim: #c78461`
- `--white: #ffe3d1`
- `--safety: #8dc47e`
- `--text: #f3d4bf`
- `--muted: #c58f79`
- `--accent: #ff9e5e`

### Layout/shape tokens
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`
- Spacing: `--space-1` … `--space-6`
- Elevation: `--shadow`

## 2) Core components

- Header shell: `.site-header`, `.header-inner`
- Primary nav pills: `.nav a`
- Language switcher: `.lang-switch`, `.lang-btn`
- Hero suite: `.hero`, `.hero-grid`, `.eyebrow`, `.lead`, `.hero-media`
- CTA system: `.btn`, `.btn-primary`, `.btn-secondary`
- Content modules: `.section`, `.cards`, `.card`, `.split`, `.list`, `.timeline`
- Documentation visualization cards: whitepaper, roadmap, README, and official channels as first-class card variants.
- Status indicator: `.status`, `.status-dot`


## Markdown viewer

- `md-viewer.html` provides enriched rendering for key public markdown docs linked from landing cards.
- Official channels include explicit GitHub, Instagram, and email actions.
- Allowed sources are intentionally constrained to canonical public docs (`project-whitepaper`, `public-roadmap`, `repo-truth`, `README`).

## 3) Interaction rules

- Primary hover motion: subtle upward transform.
- Keyboard focus: explicit high-contrast outline.
- Language buttons: toggle state via `aria-pressed`.
- Reduced motion: transition suppression under user preference.

## 4) Bilingual content system

- `data-i18n` for text nodes.
- `data-i18n-attr` for translatable attributes.
- Dictionary-driven EN/ES switch with localStorage persistence.
- Document `lang`, `<title>`, and meta description updated per language.

## 5) Usage guidance

### Do
- Keep EN as default and ES as one-click alternative.
- Preserve section order for narrative clarity.
- Reuse existing token scale for all new blocks.

### Don’t
- Introduce ad-hoc colors outside sunset-aligned system.
- Add decorative animations without UX purpose.
- Fragment translation logic across multiple scripts.
