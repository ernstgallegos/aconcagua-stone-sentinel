# Aconcagua Reality Reference

## 1. Physiology: what altitude does to the body

At 3,000–4,000 m (Confluencia and the approach to Plaza de Mulas), measurable psychomotor decline can appear within the first hours, sleep disruption begins, and both working memory and sustained attention weaken. A documented pattern in this range is initial euphoria followed by irritability: climbers can feel better than they actually are. Design implication: early low-altitude readings can be artificially optimistic, and players should learn this through repeated runs rather than explicit tutorialization.

At 4,300 m (Plaza de Mulas base camp), blood oxygen saturation declines in a way that becomes noticeable, sleep remains fragmented even at rest, and baseline fatigue stays high because adaptation itself consumes energy. Hematocrit adjustment begins but requires days, not hours. Design implication: this is where the player’s baseline should be established, and each turn should carry visible cost from here onward.

At 5,500 m (Nido de Cóndores), documented research indicates significant spatial-memory degradation, plus clear impairment in short-term memory and new memory encoding. Physical output can drop by roughly 30–40% compared with sea level. Design implication: this is an inflection threshold where information quality should visibly degrade, because not only weather becomes noisy; the body becomes noisy as well.

At 6,000 m (Cólera), encoding and short-term memory are severely impacted, risk judgment degrades before total physical collapse, fatigue remains severe even at rest, sleep can become nearly impossible, and muscle catabolism may begin. Design implication: uncertainty about one’s own body state should be near maximum in this zone; high `functional_capacity` should not imply high confidence in self-reading.

Above 6,700 m (La Canaleta and summit zone), atmospheric pressure is roughly 40% of sea-level pressure, thinking slows, verbal fluency may degrade, and the risk of HACE/HAPE is real. Climbers often rely on rest-step pacing: one step, transfer weight to the straight rear leg, breathe, then one more step. Design implication: decision granularity should compress toward single-step negotiation, not broad “advance a turn” abstraction.

Critical hypoxia note: hypoxia does not only reduce physical performance; it also degrades the ability to interpret internal signals accurately. Design implication: Pillar 2 (partial information) should model two independent noise sources: environment and cognition. Clear weather can coexist with misleading self-perception.

## 2. Climate: the phenomena that define Aconcagua

White wind (`viento blanco`) is the mountain’s signature hazardous phenomenon. It is not a conventional snowfall event; it can involve extreme wind speeds (documented over 100 km/h) and windchill that drives effective temperature near −55°C. Its systemic relevance comes from onset speed: calm, clear conditions can shift to lethal conditions within minutes.

Experienced guides report recurrent precursor signals: lenticular cloud development near the summit, abrupt surface wind-direction changes, an increasingly sharp whistling sound, and daytime warming before impact (adiabatic compression effects). Design implication: white wind should not be represented as pure RNG surprise, nor as a trivially telegraphed scripted event; it should remain anticipatable mainly through situated knowledge.

Aconcagua also presents a daily wind pattern: winds commonly intensify in the afternoon. Experienced summit pushes start around 03:00–05:00 to summit before midday and descend before late-day wind escalation. Late high-camp departures are repeatedly cited in serious-incident narratives. Design implication: departure timing should become a first-class variable distinct from generic “bad weather” risk.

Weather windows in season (November–March) often span 2–5 favorable days. Climbers may wait long periods for one, but forecasting remains imperfect. Design implication: “go now under moderate conditions” vs “wait for improvement” vs “wait and miss the window” should remain a non-dominant strategic dilemma generated jointly by Pillars 1 and 2.

## 3. Territory: real milestones on the Normal Route

System criterion: each milestone should carry physical and decision-relevant properties, not only a name tag in a positional list.

Horcones Lagoon (2,950 m): first scale revelation and park registration gate; revelation function, not major strategic function.

Confluencia (3,390 m): first true route bifurcation (Plaza Francia vs Plaza de Mulas); introduces contemplation-vs-progression as a costly choice.

Playa Ancha (3,600–3,800 m): sustained exposure across loose alluvial terrain with limited shelter; waiting has increased cost.

Cuesta Brava (~4,000 m): short but energetically expensive steep segment; teaches abrupt terrain-cost profile shifts.

Plaza de Mulas (4,300–4,365 m): primary logistics hub with medical support; lowest-noise external body assessment point.

El Semáforo (~4,550 m): visual commitment threshold beyond base-camp logistics comfort zone.

Piedras Conway (~4,750 m): non-intrusive historical trace embedded in terrain.

Nido de Cóndores (5,250–5,570 m): psychological scale threshold and beginning of significant cognitive hypoxia effects.

Cólera (5,970–6,000 m): last camp, extreme cold, near-nonrestorative sleep; additional turns trend net-negative.

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
