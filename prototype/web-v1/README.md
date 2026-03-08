# Aconcagua: Stone Sentinel (Web v1)

## Controls

**Mouse**
- Click decision buttons in the Decision panel.

**Keyboard**
- `1` Advance
- `2` Advance Slowly
- `3` Wait
- `4` Descend
- `5` Sleep

Keyboard shortcuts only work while the game screen is active.

## Visual direction update (cover concept 1)

- `art/cover/cover-concept-1.png` is now used directly in web-v1 as:
  - Initial image-only loading screen background (first screen).
  - Main title/cover screen background (second screen with title/tagline/BEGIN).
- UI tones were adjusted to better match that image's cold-rock palette while preserving readability and the austere decision-first look.
- The first loading screen renders the cover image in full (`object-fit: contain`) to avoid deformation or cropping across viewport sizes.
