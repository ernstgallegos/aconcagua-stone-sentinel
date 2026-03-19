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


## Rollback criterion for tuning passes

Trigger rollback (full revert or targeted rollback of last tuning batch) when any character falls outside target bands in **two consecutive** calibration runs using the canonical battery:

- Summit and Safe Return < 6% or > 24%
- Rescue < 3% or > 18%
- Strategic Retreat < 50% or > 82%
- Collapse < 4% or > 18%
- Permit Expired < 2% or > 14%

Rollback procedure:

1. Freeze release candidate and archive run logs for the failing pass.
2. Revert the last tuning commit touching pressure/action/character balance knobs.
3. Re-run the full canonical battery and confirm all characters return to acceptable bands.
4. Resume tuning with isolated single-axis adjustments (global pressure first, then character perception/risk, then raw capacity as last resort).

## Recalibration pass — structural EP fix (post-simulation audit)

### Problem identified
Monte Carlo simulation of 36,000 runs (400 reps × 3 seeds × 5 scenarios × 6 characters)
confirmed 0% summit rate across all combinations. Root cause: `altitudePressureByBand`
and `terrainLoadScale` values were inherited from a pre-calibration spec without adjustment
when action/stage multipliers were reduced. This left EP floor at band 3–4 nodes (159–215)
permanently above the maximum achievable BT (90), making the upper mountain mathematically
impassable regardless of player decisions.

### Fix applied
Reduced `altitudePressureByBand` and `terrainLoadScale` by approximately 50–70% at higher
bands. Reduced `timeOfDayRiskScale` late/dusk/night values by ~50%. Halved
`exposurePersistenceScale` values to reduce compounding effect. Reduced `timeSensitivity`
and `terrainLoad` for the four summit-day nodes in `data/nodes.json` (Portezuelo, Travesía,
Canaleta, Summit) from 4→1 and 5→3 respectively.

### Expected EP at key nodes (post-fix, ideal conditions: ws=0, vis=3, early start)
- Horcones: ~38 · Cuesta Brava: ~57 · Plaza Mulas: ~20 (slept)
- Camp Canadá: ~32 (slept) · Nido Cóndores: ~47 (slept) · Cólera: ~48 (slept)
- Portezuelo: ~49 · La Travesía: ~66 · La Canaleta: ~66 · Summit: ~54

### Design intent preserved
Summit remains gated by: correct acclimatization protocol (BT ≥ 48 at summit push),
favorable weather (ws ≤ 1), correct timing (early departure from Cólera), and sufficient
resources. Blake Harris (Very Demanding) reaches summit borderline (delta ~12 = LIMITED)
only under perfect conditions. Laura Kim and Francisco Aguirre reach it at MODERATE delta
under good conditions. A storm (ws=3) at summit makes delta ~140 regardless of body state.

## Resource and timing calibration pass

### Bugs fixed
Two bugs prevented summit completion regardless of player decisions:

1. `Math.max(1, ...)` resource floor in `spendResourcesForMinutes`: every action
   cost a minimum of 1 water unit. Full expedition = ~45 actions → 45 minimum water,
   exceeding all scenario starting pools. Fixed to `Math.max(0, ...)`.

2. `summitLateStart: 750` (12:30pm) aborted the summit push at La Canaleta (arrival
   ~14:15 from 6am Cólera departure). Fixed to 960 (4:00pm).

### Calibrated resource burn rates
`resourceBurnPerHour` values chosen so that a full round trip (Horcones → Summit →
Horcones, 4 sleeps, 28 advance/descend actions) costs 25 water units — within the
22–26 starting pool of all scenarios. Rates preserve per-stage pressure:
SUMMIT_DAY burn is 2.4× the APPROACH rate, keeping resource management active at altitude.

### Expected summit rate post-fix
~28–32% with the `reasonablePolicy` AI agent across all scenarios and characters.
Distribution by character reflects the designed difficulty gradient:
Laura and Francisco as most viable, Blake as least viable.



## Post-fix regression validation — 2026-03-19

### Structural regression checks completed

Validated through `prototype/web-v1/tests/turn-behavior.test.js` and direct repository test runs:

- Summit arrival no longer terminates the run; the turn remains `Strategic Retreat` until park exit logic resolves the final outcome.
- `descend` now deterministically moves one node downward unless collapse fires.
- Sleep recovery now applies the full configured recovery amount at low pressure, and summit-pressure sleep remains net-positive for `functional_capacity`.
- `deriveTerminalOutcome()` now exempts `descend` from summit-window closure while still blocking late ascent attempts.
- Horcones exit behavior remains explicit: `descend` from `horcones` without prior ascent resolves as `Strategic Retreat`, while post-summit exit resolves as `Summit and Safe Return`.

### Current balance evidence

- JSON integrity checks passed for all runtime data files.
- Node regression suite passed with the new summit/descent/pathing assertions.
- Frozen `prototype/mra-v0` simulator regression suite passed unchanged.

### Aggregate sweep status

A dedicated batch simulator for `web-v1` is still not checked into the repository. This pass therefore validated the structural blockers and balance-sensitive regression points first, but did **not** yet produce a new 300+ run aggregate outcome table from an in-repo `web-v1` Monte Carlo harness. The next balance pass should add or expose that harness so target-band verification becomes reproducible in CI rather than inferred from manual/browser playtesting.
