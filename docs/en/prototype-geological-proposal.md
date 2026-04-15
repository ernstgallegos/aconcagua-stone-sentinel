# Prototype Geological Integration Proposal

**Project:** *Aconcagua: Stone Sentinel* — web-v1  
**Source:** `docs/en/geological-bible-aconcagua.md` (canonical geological reference)  
**Date:** 2026-04-14  
**Status:** Proposal — awaiting review

---

## Executive Summary

The geological bible establishes that Aconcagua is not a generic high peak — it is the remnant of a Miocene composite stratovolcano (AVC, ~15.8–8.9 Ma) embedded within a fold-and-thrust belt, with an active Quaternary surface of glacial surges, ~400 mass-wasting events, and periglacial dynamics. The current prototype treats terrain as abstract difficulty bands. This proposal identifies six concrete integration phases to bring the geological substrate into the playable experience without disrupting the existing EP/BT architecture or requiring new engine systems.

---

## Guiding Principle

Every proposed change must satisfy three constraints:

1. **Data-driven** — sourced from the geological bible, not invented.
2. **Mechanically honest** — integrated through existing EP/BT/terrainLoad/context-event systems.
3. **Narratively organic** — geology surfaces through situated signals, not geological lectures.

---

## Phase 1: Node Metadata Enrichment (`data/nodes.json`)

### What changes

Add a `geology` object to each node in `data/nodes.json` with fields the engine and narrative systems can consume:

| Field | Type | Description |
|---|---|---|
| `lithology` | string | Dominant rock type at the waypoint (e.g., `"quaternary_alluvial"`, `"volcaniclastic_altered"`, `"andesite_breccia"`) |
| `structuralContext` | string | Tectonic/structural setting (e.g., `"aftb_frontal"`, `"avc_lower_section"`, `"avc_upper_section"`) |
| `hazardProfile` | string[] | Active geological hazards at the node (e.g., `["rockfall", "debris_flow"]`, `["scree_instability", "cryoclastism"]`) |
| `geologicalNote` | string | One-sentence geological context for narrative use |

### Example node patch (Canaleta)

```json
{
  "nodeId": "canaleta",
  "geology": {
    "lithology": "andesite_breccia",
    "structuralContext": "avc_upper_section",
    "hazardProfile": ["rockfall", "scree_instability", "cryoclastism"],
    "geologicalNote": "Steep funnel of andesitic breccia; late intrusion (~8.9 Ma) cuts altered volcaniclastics. Frost-fractured debris shifts underfoot."
  }
}
```

### Per-node geological profiles

| Node | lithology | structuralContext | hazardProfile |
|---|---|---|---|
| horcones | quaternary_alluvial | aftb_frontal | debris_flow |
| horcones_lagoon | quaternary_glacial | aftb_frontal | mega_landslide_deposit |
| approach_confluencia | quaternary_alluvial | aftb_frontal | debris_flow |
| cuesta_brava | synorogenic_conglomerate | aftb_frontal_thrust | rockfall |
| base_plaza_mulas | quaternary_moraine | avc_base | debris_flow |
| piedras_conway | volcaniclastic_altered | avc_lower_section | scree_instability, cryoclastism |
| camp_canada | volcaniclastic_altered | avc_lower_section | scree_instability, cryoclastism |
| cambio_pendiente | volcaniclastic_tilted | avc_lower_section | scree_instability, rockfall |
| camp_nido_condores | volcaniclastic_altered | avc_transition | scree_instability, cryoclastism |
| balcon_amarillo | volcaniclastic_altered | avc_upper_section | scree_instability, wind_erosion |
| camp_colera | volcaniclastic_altered | avc_upper_section | scree_instability, cryoclastism |
| portezuelo_viento | dyke_ridge | avc_upper_section | rockfall, wind_exposure |
| travesia | volcaniclastic_tilted | avc_upper_section | scree_instability, wind_exposure |
| canaleta | andesite_breccia | avc_upper_section | rockfall, scree_instability, cryoclastism |
| summit | andesite | avc_summit | wind_exposure |

### Impact on existing systems

- **None immediately** — the `geology` object is additive metadata. Existing `terrainLoad`, `weatherBias`, `visibilityBias` values remain unchanged.
- Future phases consume this metadata for narrative, context events, and visual cues.

### Estimated effort

Low. Data-only change. Add object to each of 15 nodes. No engine code changes.

---

## Phase 2: Geology-Aware Context Events (`data/context_events.json`)

### What changes

Add 4–6 new context events that use node geology metadata to trigger geologically grounded environmental events:

#### Proposed events

1. **`rockfall-warning`** — Triggers on nodes with `hazardProfile` including `"rockfall"` at mid-to-high altitude. Effects: weatherDelta +1, timePenalty +15. Narrative: *"A sharp crack overhead. Frost-fractured andesite releases from the altered face above. The route is passable, but the debris field is fresh."*

2. **`scree-shift`** — Triggers on nodes with `lithology` containing `"volcaniclastic_altered"`. Effects: terrainDelta +1 (or weatherDelta +1 as proxy). Narrative: *"The slope shifts underfoot — weathered volcaniclastic breccia gives way in patches where argillic alteration has softened the rock to clay."*

3. **`glacier-rumble`** — Triggers on approach nodes near Horcones (routeIndex 0–2). Effects: visibilityDelta -1, timePenalty +10. Narrative: *"A low rumble echoes from the valley floor. Horcones Inferior adjusts — debris-covered ice moves on its own schedule."*

4. **`dust-plume`** — Triggers on high-altitude nodes with `"wind_exposure"` + altered volcaniclastics. Effects: visibilityDelta -1. Narrative: *"Wind lifts fine volcanic dust from the altered face. The summit pyramid disappears behind a mineral haze — this mountain is still eroding."*

5. **`seismic-tremor`** — Rare event (maxPerRun: 1). Triggers anywhere. Effects: weatherDelta +1, timePenalty +20. Narrative: *"The ground shifts — brief, subtle, but real. The Andes compress at rates measured in centimetres per year. Today, you felt one."*

6. **`stable-dyke-ridge`** — Triggers on Portezuelo/Travesía where resistant dykes form ridges. Effects: weatherDelta -1 (brief respite from loose terrain). Narrative: *"The footing firms where a resistant dyke cuts through altered ground — the geological spine of the ridge holds against wind and erosion."*

### Impact on existing systems

- Uses the existing context-event infrastructure (trigger, effects, limits, telemetryTag).
- No engine changes required — context events already modify weather/visibility/time.
- Requires consuming `geology.hazardProfile` in event trigger logic (small engine addition).

### Estimated effort

Medium. New data + minor trigger logic extension.

---

## Phase 3: Geological Narrative Enrichment (`ui/helpers/narrative.js`)

### What changes

Add geology-keyed narrative variants that the narrative system can select when geological metadata is available. This enriches the existing text banks without replacing them.

#### Approach

Extend the `pickNarrative` function to accept optional geological context and select from geology-specific variants when available. Fallback to existing generic narratives.

#### Example narrative keys and variants

**`advance_high` (existing key) — geological variant:**
- *"You push higher through tilted volcanic strata. The andesite underfoot is 10 million years old — and still crumbling."*
- *"Each step crosses geological time: breccia from one eruption, tuff from another, all tilted by forces that predate this route by aeons."*
- *"The altered zone yields loose footing. Where argillization has eaten the breccia, the scree runs like sand."*

**`wait_low` (existing key) — geological variant for approach nodes:**
- *"You hold position on glacial debris. The valley floor is a palimpsest — moraine over mega-landslide over older till."*
- *"Waiting on the alluvial plain. The route crosses evidence of catastrophic events that shaped this valley thousands of years ago."*

**`crit_fatigue` — geological variant for high altitude:**
- *"Your body reports what the rock already shows: everything here is in a state of slow collapse."*
- *"Fatigue compounds on unstable ground — the altered volcaniclastics underfoot demand more energy per step."*

### Impact on existing systems

- The narrative bank is already extensible (array of strings per key).
- Geological variants would be appended to existing arrays or selected via an optional second-tier key.
- No change to `resolveNarrativeText` interface — rng still selects from the available pool.

### Estimated effort

Medium. Text authoring + minor narrative picker extension.

---

## Phase 4: Geological Terrain-Load Calibration Review

### What changes

Review and optionally adjust `terrainLoad` values in `data/nodes.json` based on geological reality:

| Node | Current terrainLoad | Geological rationale | Suggested adjustment |
|---|---|---|---|
| piedras_conway | 3 | Altered volcaniclastics with scree instability | 3 → **4** (altered surface increases effort) |
| canaleta | 3 | Steep andesitic breccia funnel, frost-fractured debris | 3 → **5** (maximum — this is the crux) |
| portezuelo_viento | 3 | Resistant dyke ridge, less loose material | 3 → **2** (firmer footing on dyke rock) |
| travesia | 3 | Exposed volcaniclastic traverse, wind-loaded | 3 → **4** (unstable surface + wind exposure) |
| summit | 3 | Summit andesite, relatively consolidated | 3 → **2** (solid rock at top) |

### Impact on existing systems

- Direct impact on EP calculation (terrainLoadScale feeds into EP).
- Requires balance validation through Monte Carlo harness.
- Must preserve existing win-rate bands (8–20% human target).

### Estimated effort

Medium-High. Data change + balance validation required.

---

## Phase 5: Geological Visual Cues in Game UI

### What changes

Surface geological context in the game screen's situation bar, watch, and narrative panel:

1. **Situation bar:** Add terrain-type indicator derived from `geology.lithology` (e.g., "Altered volcaniclastics" or "Andesite breccia"). This is a diegetic signal consistent with Pillar 2 — the climber can see/feel the rock type.

2. **Watch detail overlay:** Include `geology.geologicalNote` as a subtle line in the expanded watch view, providing route-context awareness.

3. **Mountain-view panel:** Consider tinting or labeling the progress indicator to reflect geological zones (Approach/alluvial → Base/moraine → High/volcaniclastic → Summit/andesite).

### Impact on existing systems

- UI-only changes — reads from node metadata.
- Consistent with diegetic information principle (Pillar 2).
- No engine or balance changes.

### Estimated effort

Medium. UI work in screens.js/components.css + data consumption.

---

## Phase 6: Debrief Geological Insights

### What changes

In the post-run debrief screen, include geological context for the turning point and key nodes encountered:

1. **Turning point annotation:** If the turning point occurred at a geologically notable node, include a geological context line (e.g., "Your turning point was at Cambio de Pendiente — where tilted volcaniclastic strata increase scree instability and every step costs more than expected").

2. **Route geology summary:** A single line in the debrief summarizing the geological character of the highest point reached (e.g., "You reached the AVC upper section — andesitic strata dating to ~10 Ma").

### Impact on existing systems

- Extends `buildReflectionPrompts` in `ui/screens/debrief.js` with optional geological context.
- Data-driven from node `geology` metadata.
- Pure additive — existing debrief content unchanged.

### Estimated effort

Low-Medium. Debrief template extension + geological text authoring.

---

## Implementation Priority

| Phase | Priority | Reason |
|---|---|---|
| 1 — Node metadata | **P0** | Foundation for all other phases. No risk. |
| 2 — Context events | **P1** | High player-facing impact. Uses existing infrastructure. |
| 3 — Narratives | **P1** | Direct immersion improvement. Low technical risk. |
| 4 — Terrain calibration | **P2** | Requires balance validation. Should follow Phase 1. |
| 5 — Visual cues | **P2** | UI polish. Depends on Phase 1 metadata. |
| 6 — Debrief | **P3** | Post-run enrichment. Lower priority than in-game feel. |

---

## What This Proposal Does Not Change

- **Engine architecture** — EP/BT system remains unchanged.
- **Turn resolution** — `resolveTurn()` is not modified.
- **Balance targets** — 8–20% human summit rate preserved.
- **Character mechanics** — No character stat changes.
- **Game flow** — Screen sequence unchanged.
- **Test contracts** — Existing 347 tests remain green.

---

## Validation Strategy

1. Phase 1: JSON parse check + data-contract test for new `geology` field.
2. Phase 2: Context-event trigger test with geological node data.
3. Phase 3: Narrative picker test with geological variant availability.
4. Phase 4: Monte Carlo harness run — compare win rates before/after terrainLoad changes.
5. Phase 5: Smoke test — verify UI renders geological cues without breaking layout.
6. Phase 6: Debrief test — verify geological annotations appear for relevant turning points.

---

## References

- `docs/en/geological-bible-aconcagua.md` — Full geological reference
- `docs/en/aconcagua-reality-reference.md` § 6 — Geology design section
- `docs/en/design-pillars.md` — Geological Grounding subsection
- `docs/en/systems-overview.md` — Geological Grounding and Interaction paragraphs
