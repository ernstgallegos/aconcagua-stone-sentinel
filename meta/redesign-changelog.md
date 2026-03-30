# Redesign Changelog — Landing Iteration (Color + Bilingual)

## What changed

1. Added a styled markdown viewer (`md-viewer.html`) so key linked docs render in the same branded visual context.
2. Rebuilt landing visual system to align with `web-v1` sunset palette.
3. Switched default language to English for international-first onboarding.
4. Added EN/ES language switcher with persistent preference.
5. Implemented runtime i18n for:
   - navigation,
   - hero,
   - all major sections,
   - CTA labels,
   - footer,
   - document title + meta description + key alt text.
6. Kept premium modular layout and improved consistency between landing and prototype.
7. Added a dedicated community/contact block with direct Instagram follow and email contact CTAs.
8. Added markdown-driven documentation visualization cards (whitepaper + roadmap) plus explicit official channels (GitHub + email).
9. Adjusted hero image treatment to preserve original aspect ratio and prevent illegible crop framing.

## Why

- Improve brand coherence between entry experience and active product.
- Reduce friction for global audiences while preserving full Spanish access.
- Increase professionalism and external presentation readiness.

## Expected impact

- Stronger perceived product integrity.
- Better first-run comprehension across EN/ES audiences.
- More confident handoff from landing to playable prototype.

## Pending debt

- Optional: add automated DOM-level i18n smoke assertions for root landing.
- Optional: mirrored long-form EN/ES landing docs snapshot in `docs/`.
