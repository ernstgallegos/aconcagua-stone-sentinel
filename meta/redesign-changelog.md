# Redesign Changelog — Landing Iteration (Color + Bilingual)

## What changed

1. Rebuilt landing visual system to align with `web-v1` sunset palette.
2. Switched default language to English for international-first onboarding.
3. Added EN/ES language switcher with persistent preference.
4. Implemented runtime i18n for:
   - navigation,
   - hero,
   - all major sections,
   - CTA labels,
   - footer,
   - document title + meta description + key alt text.
5. Kept premium modular layout and improved consistency between landing and prototype.
6. Added a dedicated community/contact block with direct Instagram follow and email contact CTAs.
7. Added markdown-driven documentation visualization cards (whitepaper + roadmap) plus explicit official channels (GitHub + email).

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
