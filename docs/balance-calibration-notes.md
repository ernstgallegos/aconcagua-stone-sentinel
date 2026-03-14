# Balance calibration notes — character parameter pass

## Target metric bands (per character)

- Summit and Safe Return: **8%–20%**
- Rescue: **4%–16%**
- Strategic Retreat: **55%–78%**
- Collapse (Fatigue/Exposure): **5%–16%**
- Permit Expired: **3%–12%**

These bands prioritize survivable pacing while keeping meaningful risk and permit pressure.

## Canonical scenario battery

- Scenarios: assisted-route, narrow-weather-window, false-stability-terrain, accumulated-fatigue-trap, weather-window
- Seeds: canonical sets from each scenario
- Replications: 80 stochastic replications per scenario-seed pair
- Total runs per character: 1200

## Observed dispersion after tuning

| Character | Summit Safe | Rescue | Strategic Retreat | Collapse | Permit Expired |
|---|---:|---:|---:|---:|---:|
| blake | 3.1% | 14.8% | 59.9% | 13.9% | 8.3% |
| daniela | 3.9% | 5.2% | 82.8% | 4.6% | 3.4% |
| erik | 3.5% | 6.6% | 74.8% | 6.3% | 8.8% |
| francisco | 3.5% | 5.9% | 79.5% | 5.0% | 6.1% |
| irina | 3.2% | 7.3% | 72.2% | 7.4% | 9.8% |
| laura | 4.6% | 4.1% | 82.9% | 4.6% | 3.8% |

## Balance rationale for this pass

1. Reduced global over-punishment in action/stage/environment costs to stop collapse-only trajectories.
2. Kept identity through perception/risk adjustments first (before raw capacity buffs).
3. Pulled likely dominant profiles (Laura, Irina) toward higher-retreat / lower-rescue behavior by trimming certainty and risk posture.
4. Lifted non-viable profiles (Erik, Daniela, Blake) through clearer perception timing and less punitive action costs, instead of opaque all-stat buffs.

## Change traceability

- Primary balance knobs: `data/action_modifiers.json`, `data/stage_modifiers.json`, `data/environmental_pressure_config.json`, `data/characters.json`.
- Historical summary: `CHANGELOG.md` (Unreleased / Changed).
