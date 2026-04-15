# Aconcagua Reality Reference

## 1. Physiology: what altitude does to the body

At 3,000–4,000 m (Confluencia and the approach to Plaza de Mulas), measurable psychomotor decline can appear within the first hours, sleep disruption begins, and both working memory and sustained attention weaken. A documented pattern in this range is initial euphoria followed by irritability: climbers can feel better than they actually are. Design implication: early low-altitude readings can be artificially optimistic, and players should learn this through repeated runs rather than explicit tutorialization.

At 4,350 m (Base Camp / Plaza de Mulas), blood oxygen saturation declines in a way that becomes noticeable, sleep remains fragmented even at rest, and baseline fatigue stays high because adaptation itself consumes energy. Hematocrit adjustment begins but requires days, not hours. Design implication: this is where the player’s baseline should be established, and each turn should carry visible cost from here onward.

At 5,050 m (Camp 1 / Canadá), physiological stress is already substantial and compounds from the base-camp baseline. Design implication: this transition should feel clearly costly even under acceptable weather.

At 5,560 m (Camp 2 / Nido de Cóndores), documented research indicates significant spatial-memory degradation, plus clear impairment in short-term memory and new memory encoding. Physical output can drop by roughly 30–40% compared with sea level. Design implication: this is an inflection threshold where information quality should visibly degrade, because not only weather becomes noisy; the body becomes noisy as well.

At 5,970 m (Camp 3 / Cólera), encoding and short-term memory are severely impacted, risk judgment degrades before total physical collapse, fatigue remains severe even at rest, sleep can become nearly impossible, and muscle catabolism may begin. Design implication: uncertainty about one’s own body state should be near maximum in this zone; high `functional_capacity` should not imply high confidence in self-reading.

Above 6,700 m (La Canaleta and summit zone), atmospheric pressure is roughly 40% of sea-level pressure, thinking slows, verbal fluency may degrade, and the risk of HACE/HAPE is real. Climbers often rely on rest-step pacing: one step, transfer weight to the straight rear leg, breathe, then one more step. Design implication: decision granularity should compress toward single-step negotiation, not broad “advance a turn” abstraction.

Critical hypoxia note: hypoxia does not only reduce physical performance; it also degrades the ability to interpret internal signals accurately. Design implication: Pillar 2 (partial information) should model two independent noise sources: environment and cognition. Clear weather can coexist with misleading self-perception.

## 2. Climate: the phenomena that define Aconcagua

White wind (`viento blanco`) is the mountain’s signature hazardous phenomenon. It is not a conventional snowfall event; it can involve extreme wind speeds (documented over 100 km/h) and windchill that drives effective temperature near −55°C. Its systemic relevance comes from onset speed: calm, clear conditions can shift to lethal conditions within minutes.

Experienced guides report recurrent precursor signals: lenticular cloud development near the summit, abrupt surface wind-direction changes, an increasingly sharp whistling sound, and daytime warming before impact (adiabatic compression effects). Design implication: white wind should not be represented as pure RNG surprise, nor as a trivially telegraphed scripted event; it should remain anticipatable mainly through situated knowledge.

Aconcagua also presents a daily wind pattern: winds commonly intensify in the afternoon. Experienced summit pushes start around 03:00–05:00 to summit before midday and descend before late-day wind escalation. Late high-camp departures are repeatedly cited in serious-incident narratives. Design implication: departure timing should become a first-class variable distinct from generic “bad weather” risk.

Weather windows in season (November–March) often span 2–5 favorable days. Climbers may wait long periods for one, but forecasting remains imperfect. Design implication: “go now under moderate conditions” vs “wait for improvement” vs “wait and miss the window” should remain a non-dominant strategic dilemma generated jointly by Pillars 1 and 2.

## 3. Territory: real milestones on the Normal Route

System criterion: each milestone should carry physical and decision-relevant properties, not only a name tag in a positional list. Expedition start must be modeled at Horcones (Aconcagua Provincial Park entrance), not at base camp.

Note: Aconcagua's terrain is not passive substrate. The mountain is a Miocene stratovolcano (see Section 6), and the rock properties at each waypoint — argillic alteration, volcaniclastic scree, resistant dyke ridges — directly influence the physical conditions described here.

Horcones Lagoon (2,950 m): first scale revelation and park registration gate; revelation function, not major strategic function.

Confluencia (3,390 m): first true route bifurcation (Plaza Francia vs Plaza de Mulas); introduces contemplation-vs-progression as a costly choice.

Playa Ancha (3,600–3,800 m): sustained exposure across loose alluvial terrain with limited shelter; waiting has increased cost.

Cuesta Brava (~4,000 m): short but energetically expensive steep segment; teaches abrupt terrain-cost profile shifts.

Base Camp / Plaza de Mulas (4,350 m): primary logistics hub with medical support; lowest-noise external body assessment point.

El Semáforo (~4,550 m): visual commitment threshold beyond base-camp logistics comfort zone.

Piedras Conway (~4,750 m): non-intrusive historical trace embedded in terrain.

Camp 1 / Canadá (5,050 m): first high-camp transition where baseline adaptation debt becomes operationally visible.

Camp 2 / Nido de Cóndores (5,560 m): psychological scale threshold and beginning of significant cognitive hypoxia effects.

Camp 3 / Cólera (5,970 m): last camp, extreme cold, near-nonrestorative sleep; additional turns trend net-negative.

Refugio Independencia (6,380 m): decision checkpoint before final summit sector.

Portezuelo de los Vientos (~6,500 m): high wind exposure where white-wind risk intensifies.

La Canaleta (6,700–6,962 m): steep loose-rock funnel with maximal per-step cost and reduced planning horizon.

## 4. Specific geography: penitentes

Penitentes are vertical ice/snow blade formations common in the high Andes, typically from ~0.5 m to ~4 m, historically documented by Darwin (1835). They form through differential sublimation under strong solar radiation and dry air.

For climbers, penitente fields drastically increase traversal time and energy cost compared with flat snow over similar distance. They are also hard to evaluate at a distance: segments that look short can take far longer than expected. Design implication: penitente-specific `terrain_load` should be modeled as learnable situated knowledge (Pillar 3), not as arbitrary punishment.

## 5. History and human presence

Inca capacocha context and the Aconcagua child discovery (reported in 1985 above 5,000 m) indicate ritual high-altitude presence centuries before the 1897 “official” ascent narrative. This reframes Aconcagua as a layered human landscape, not an empty peak.

Andean apu worldview treats high mountains as entities requiring respect rather than conquest. This aligns with Pillar 1 (“The Mountain Governs”) at a systemic level, without requiring explicit mystical framing.

Situated human knowledge around Aconcagua includes muleteers, certified guides, park rangers, and base-camp physicians. These actors are not omniscient; they provide partial but often high-value signals. Design implication: source calibration should be learned through experience.

The project’s technical expedition script functions as an “ideal plan” baseline. Real runs become narratives through the measurable gap between planned sequence and lived constraints.

## 6. Geology: the rock beneath the route

### 6.1 Geological identity

Aconcagua is the remnant of a Miocene composite stratovolcano — the Aconcagua Volcanic Complex (AVC, ~15.8–8.9 Ma) — built of andesitic-dacitic breccias, lavas, tuffs, and pyroclastic flows. It is not a simple uplifted sedimentary peak. The volcanic edifice has been tilted and structurally incorporated into the Aconcagua Fold-and-Thrust Belt (AFTB), an east-vergent compressional system that controls the regional architecture of this segment of the Principal Cordillera. The AVC divides into a lower section (~13.7–11.3 Ma) and an upper section (~11.1–9.6 Ma) separated by an angular unconformity recording a mid-Miocene deformation pulse.

### 6.2 Three-layer framework (for design)

The geology relevant to system design operates across three nested layers:

- **Deep layer (tectonic):** The AFTB, with its Mesozoic extensional inheritance, controls valley architecture, escarpment fronts, and the overall “bone structure” of the landscape. Major thrust faults (Penitentes, Los Horcones) define the corridor the Normal Route follows.
- **Middle layer (Miocene volcanic):** The AVC constitutes the mountain body itself. Tilted strata define terrain surfaces and slope angles. Argillic alteration zones weaken volcaniclastic rock into unstable scree. Resistant dykes and intact andesitic intrusions form ridgelines and structural spurs that climbers traverse as route features.
- **Surface layer (active Quaternary):** Glaciers, mass wasting (~400 inventoried events, ~89% active), and periglacial processes — cryoclastism, rock glaciers, thermokarst — are the dynamic agents generating hazards, narrative set pieces, and continuous landscape variation between seasons and even between days.

### 6.3 Route-relevant geology

**Horcones–Confluencia (2,950–3,390 m):** Quaternary alluvial and glacial deposits dominate. The Horcones and Almacenes formations, long interpreted as glacial moraines, have been reinterpreted as mega-landslide deposits — evidence of catastrophic mass wasting that shaped the valley floor. The terrain is loose, broad, and deceptively gentle.

**Plaza de Mulas approach (3,400–4,350 m):** The route crosses Penitentes thrust structures, exposing synorogenic conglomerates dated ~15–12 Ma. These outcrops mark the transition from valley-floor deposits to deformed Andean basement. Rock type shifts visibly from rounded alluvial material to angular, tectonically fractured clasts.

**High camps, Canadá–Cólera (5,050–5,970 m):** Tilted volcaniclastic strata of the AVC dominate. Argillic alteration — clay-mineral replacement of original volcanic rock by hydrothermal fluids — weakens breccias into crumbling, unstable scree. Slope angles follow bedding-plane dips. Terrain difficulty here is a direct product of rock chemistry, not abstraction.

**La Canaleta–Summit (6,700–6,962 m):** The steep loose-rock funnel of La Canaleta is carved into andesitic breccia. The summit rock is andesite dated ~9.6 Ma. Near La Canaleta, a late andesitic intrusion dated ~8.9 Ma represents the youngest magmatic activity of the AVC. The per-step cost and rockfall hazard in this sector derive from the mechanical properties of altered volcanic rock under freeze-thaw cycling.

### 6.4 Active hazards from geological processes

- **Mass wasting:** ~400 events inventoried within Aconcagua Provincial Park, ~89% classified as active. Types range from debris flows and rock avalanches to slow creep on altered volcaniclastic slopes.
- **Glacier surges:** Horcones Inferior glacier surged in 1985 and again in 2003–2006, advancing hundreds of meters and modifying the lower valley. Debris-covered glaciers and thermokarst dynamics produce ongoing surface instability.
- **Seismic activity:** The 2019 Punta de Vacas swarm (Mw ~2.7–3.9) demonstrated that shallow crustal seismicity can trigger rockfall and alter route conditions without warning.
- **Cryoclastism:** Freeze-thaw cycling on argillically altered volcaniclastic rock drives continuous rockfall, particularly in the high camps and La Canaleta sector. This is not seasonal decoration; it is the primary agent of terrain change above 5,000 m.

### 6.5 Design implications

Geology connects directly to Pillar 1 (“The Mountain Governs”) and the Environmental Pressure (EP) system. Terrain difficulty, route surface conditions, rockfall probability, and scree instability emerge from real geological substrate — argillic alteration, bedding-plane dip, cryoclastic fragmentation — not from abstract game parameters. The three-layer framework (Section 6.2) provides the structural rationale for why certain waypoints carry higher `terrain_load`, why weather interacts differently with rock at different altitudes, and why mass-wasting hazards cluster where they do.

For canonical geological detail, radiometric dates, and structural cross-sections, see `docs/en/geological-bible-aconcagua.md`.
