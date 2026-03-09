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


## Prototype Web v1.1 simulation update

This prototype now uses the **Environmental Pressure Engine** model:

`ENVIRONMENT → Environmental Pressure → Body Response → Player Perception → Player Decision → Outcome`

### Data-driven configuration

Runtime simulation constants are loaded from repository-level `/data`:

- `/data/nodes.json`
- `/data/environmental_pressure_config.json`
- `/data/action_modifiers.json`
- `/data/stage_modifiers.json`

### Player-facing watch panel

The watch shows perception-level signals only:

- Mountain Pressure
- Trend
- Confidence
- Body state and resources

Raw EP/BT numeric internals are not exposed to the player UI.

### Run logging

Each turn stores structured runtime records (`turn`, `location`, `EP`, `BT`, `pressureDelta`, `action`, `outcome`) and can be exported from debrief as `run_log.json`.

For a full technical description, see `/docs/simulation_engine.md`.
