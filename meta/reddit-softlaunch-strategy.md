# Reddit Soft-Launch Strategy — Aconcagua: Stone Sentinel

**Document type:** Marketing strategy  
**Status:** Ready to execute  
**Created:** April 2026  
**Audience:** Project author (Ernesto Gallegos)

---

## General principles before starting

**Before posting in any subreddit**, ensure you have at least 5–10 genuine prior interactions in that community (commenting on other people's posts, answering questions). Reddit penalizes new or low-activity accounts that post links. It's not mandatory, but it significantly increases the probability that the post won't be filtered as spam and that the community receives it well.

**Post spacing:** Do not publish everything on the same day. The suggested plan is 1–2 posts per week, prioritizing by expected impact.

**Honesty about AI use:** The press-kit already documents this clearly. Bring it into posts where relevant — on Reddit, transparency about AI in gamedev is *much more* valued than trying to hide it.

---

## Subreddits and complete post texts

### 🔴 TIER 1 — Highest expected impact

---

### 1. r/Mountaineering

*Audience: ~200k+ subscribers. Technical, experiential community, low tolerance for marketing. Maximum authenticity required.*

**Title:** `I summited Aconcagua via the 360 Route (Polish Traverse) in January 2026. Then I spent 3 months building a game about it. Here's what I learned about translating a mountain into a system.`

**Post body:**

Last January I was on the 360 Route to the summit of Aconcagua. Standing at the base of the Polish Traverse, exhausted and running decisions on very little sleep, I kept thinking: what makes this hard is not the physical act. It's reading. Reading the weather, reading your body, reading the gap between what you think is happening and what's actually happening.

I came back and spent the following 3 months trying to build something that captured that. Not a climbing simulator, not a survival game — something closer to what it actually feels like to be inside a multi-day expedition: partial information, accumulated decisions, and the uncomfortable question of whether this is the day you turn back.

One thing worth saying up front: I work in strategic science, technology and innovation management for development — not in software. I had never been part of a software development project before this one. The entire thing was built with AI assistance, from scratch, by someone learning as they went.

The result is **Aconcagua: Stone Sentinel** — a web-based game built on an Environmental Pressure / Body Tolerance model. You pick one of six expedition characters (each with a distinct engine profile: perception accuracy, acclimatization rate, risk tolerance, resource efficiency), choose a scenario, and play through a turn-based structure where the mountain generates real systemic pressure rather than scripted difficulty.

A few things I tried to get right that I'd love feedback on from people who've actually been there:

- **Retreat as a valid outcome.** "Strategic Retreat" is explicitly designed to feel like a correct read, not a failure state. The game has 10 terminal outcomes; summit is the rarest (10–30% for players who internalize the system). I wanted to push against the idea that retreat = loss.

- **Permit system.** 20-day clock, real expiry pressure. If this was off mechanically I want to know.

- **Altitude timing.** Summit day has a hard cutoff (17:00 at the permit station). Miss it and the window closes. I tried to model the real consequence of late starts without making it feel arbitrary.

- **Weather as a system, not a random punisher.** Conditions compound over turns; you read them through a confidence range, not an exact value. The mountain doesn't tell you what it's doing. You interpret.

It's a free web prototype, fully open source. If you've been on Aconcagua — or on any serious high-altitude route — I'd especially want to hear where the model breaks.

Play it: **aconcaguastonesentinel.com**

Repo (with all simulation data, engine code, and test suite): github.com/ernstgallegos/aconcagua-stone-sentinel

Happy to answer any questions about the design decisions or the real expedition.

---

### 2. r/gamedev

*Audience: ~900k+ subscribers. Devlog/postmortem posts perform very well. The community values honesty about process.*

**Title:** `I spent 3 months building a web prototype about Aconcagua after a real summit expedition. Here's the architecture, what I got wrong, and why I made the AI use public.`

**Post body:**

**The origin:** I summited Aconcagua via the 360 Route in January 2026. During the expedition I couldn't stop thinking about how the whole experience was fundamentally a systems problem — not a heroics problem. How do you translate that into a game?

The answer I arrived at: you build a real model, make the data transparent, and design the game around partial information rather than full visibility.

**What I built:**

*Aconcagua: Stone Sentinel* is a web-based contemplative narrative game (current public prototype: v1.5.2) built on an EP/BT (Environmental Pressure / Body Tolerance) engine. The core loop:

1. Player chooses an action: advance, advance slowly, wait, descend, sleep (or for Daniela: shoot photo).
2. EP is calculated from altitude band + weather severity + terrain load + time of day + cumulative exposure.
3. BT integrates fatigue, exposure accumulation, and functional capacity.
4. A perceived signal is generated through a character-specific confidence/trend layer — the player never sees raw values, only interpreted readings with varying reliability.
5. Outcome classified: progress, hold, retreat, or terminal event.

6 playable characters, each with distinct engine profiles (not just stat bars — actual modifiers on perception accuracy, acclimatization rate, risk posture, resource efficiency). 5 scenarios with different initial conditions and pressure biases. 10 terminal outcomes, of which summit is the rarest.

**Architecture decisions I'm proud of:**

- Engine is fully decoupled from the UI: `engine/` is pure JS with no browser dependencies; `ui/` is browser-only. The engine runs headless for Monte Carlo simulation.
- All parameters are data-driven (JSON files: characters, outcomes, action modifiers, stage modifiers, EP config). No magic numbers in game logic.
- 381 automated tests covering engine, UI helpers, API, contract parity, and simulation pipelines.
- Monte Carlo harness: 1,500 headless runs (6 chars × 5 scenarios × 50 seeds) for structural validation. No character has a 0% summit rate — that's the minimum bar.

**What I got wrong (and iterated on):**

- The `sleep` action was advancing position ~58% of turns due to a `progress=0` case producing a 58% progress chance in evaluateOutcome. Fixed by forcing `outcome='Hold'` when `context.action==='sleep'`. Spent more time finding this than I care to admit.
- A `collapseChance * 2` multiplier under weather spikes was making the summit mathematically unreachable. Reduced to `* 1.2`. At worst case efficiency: 15.4% collapse — meaningful danger without a death lottery.
- Part 2 unlock required localStorage persistence because `G.finalOutcome` resets on `startRun()`. Classic state scope mistake.

**On AI use:**

I work in strategic science, technology and innovation management for development — not in software. I had never been part of a software development project before this one. I used AI for document drafting, programming assistance, and the current concept art. I've published this explicitly in the press kit and in the README — not as a badge, but as an honest account of how someone with no prior dev background and no budget actually built something like this. I'd rather say it clearly than pretend otherwise.

The goal is to replace the AI-generated art with work from real artists as the project grows.

**What I'm looking for now:**

- Playtesters who are willing to try to summit (and fail) and tell me if the game is communicating what it should.
- People who've done high-altitude mountaineering who can tell me where the model breaks.
- Anyone interested in contributing — design, narrative, art, engine.

Play it (free, browser): **aconcaguastonesentinel.com**  
Repo: github.com/ernstgallegos/aconcagua-stone-sentinel

Happy to go deep on any of the technical decisions.

---

### 3. r/indiegaming

*Audience: ~250k+ subscribers. Less technical than r/gamedev, more discovery-oriented.*

**Title:** `I made a free browser game about climbing Aconcagua — based on a real expedition. It's less about summiting and more about knowing when to turn back.`

**Post body:**

Earlier this year I summited Aconcagua (the highest peak in the Western Hemisphere, in Argentina). When I came back, I spent the last 3 months building a game about it. I work in strategic science, technology and innovation management — not in software — and this was my first software development project ever.

Not a power fantasy. Not a survival game where you die constantly. Something closer to what the experience actually feels like: reading signals, managing uncertainty, and making decisions that don't rewind.

**Aconcagua: Stone Sentinel** is a turn-based web game where:
- You choose one of six characters, each with a genuinely distinct engine profile (one reads signals clearly but deteriorates fast at altitude; one has elite endurance but sees conditions as rosier than they are; one is the game's hardest character because the gap between his conviction and his body's state is enormous and compounds under pressure).
- Environmental Pressure and Body Tolerance run as a real model under the hood — not a hidden dice roll, but a system you can learn to read through the signals the game surfaces.
- There are **10 terminal outcomes**, and summit is the rarest. "Strategic Retreat" — deliberately turning back before conditions become critical — is explicitly designed to feel like a win.

The game is free, runs in the browser, and takes about 30 minutes per run.

I'd love for people to try it and tell me: does the difficulty feel fair? Does retreat feel meaningful or does it feel like giving up? Does the partial information model work, or is it just frustrating?

**Play it:** aconcaguastonesentinel.com

(Full repo is open source if anyone wants to look at how the engine works.)

---

### 4. r/WebGames

*Audience: ~60k subscribers. Direct format match. Low barrier to entry because the game is free and runs in the browser.*

**Title:** `[Browser] Aconcagua: Stone Sentinel — a turn-based mountain expedition game where the summit is just one of 10 valid outcomes`

**Post body:**

**Play:** aconcaguastonesentinel.com  
**Time per run:** ~30 minutes  
**Free:** Yes  
**Platform:** Browser (no install)

You're leading an expedition on Aconcagua (the highest peak in the Americas). You choose one of six characters — each with distinct engine-level profiles that change how you perceive the mountain and how your body responds to pressure. You make turn-by-turn decisions: advance, wait, rest, descend.

The game runs on an Environmental Pressure / Body Tolerance model. You never see exact values — only interpreted signals with varying confidence. The mountain doesn't tell you what it's doing. You read it.

There are 10 possible terminal outcomes. Summit is the rarest (typically 10–30% for players who internalize the system). "Strategic Retreat" is explicitly designed to feel correct, not like failure.

Based on a real Aconcagua summit expedition (January 2026). Open source repo linked in the site if you want to look under the hood.

Feedback very welcome — especially on whether the partial information model is readable or frustrating.

---

### 🟠 TIER 2 — High impact, more specific audience

---

### 5. r/Aconcagua

*Small subreddit (~3k subscribers) but perfect audience. People who have been there or plan to go. The most personal and direct post of the series.*

**Title:** `I summited via the 360 Route in January. Then I built a game about the mountain. Would love feedback from people who've actually been there.`

**Post body:**

Went up via the 360 Route / Polish Traverse in January 2026. Made it to the summit. Came back and spent the 3 months after trying to build something that captured what the experience actually teaches — not the heroic version, but the real one.

The core idea I kept returning to: Aconcagua is a reading problem. Not a strength problem, not even primarily a fitness problem. A constant problem of interpreting partial signals under fatigue and deciding whether what you're seeing is real or wishful.

**Aconcagua: Stone Sentinel** is a web game built on that idea. Turn-based, runs in the browser, free. The system models Environmental Pressure and Body Tolerance — weather, altitude band, terrain load, fatigue accumulation, exposure. You never see exact values; you interpret signals through a confidence layer that varies by character.

There are 10 terminal outcomes. Summit is the rarest. Strategic retreat — turning back before conditions become critical — is explicitly designed as a correct and satisfying ending, not a consolation prize.

What I most want from people who've been on the mountain:

- Does the **permit system** feel real? (Up to 20 days, hard expiry)
- Does the **summit day timing** feel right? (17:00 cutoff at Plaza de Mulas equivalent)
- Does the **weather model** feel like what you experienced — or is it too random, too predictable, or wrong in some specific way?
- Does retreat feel like something the game rewards, or does it still feel like losing?

The game is at: **aconcaguastonesentinel.com**

I'm from Argentina, work in strategic science, technology and innovation management for development, and built this solo — with AI assistance — over the last 3 months. It was the first software project I'd ever been part of. I'd genuinely love to talk with anyone who has time in the area or has done a serious route there. Happy to answer questions about the design or about the January expedition.

---

### 6. r/argentina

*Spanish-speaking audience. Angle: pride in an Argentine indie project + personal expedition story.*

**Title:** `Hice cumbre en el Aconcagua en enero por la ruta 360. Después construí un videojuego basado en esa experiencia. Acá cuento cómo fue.`

**Post body (in Spanish):**

En enero de este año llegué a la cumbre del Aconcagua por la Ruta 360 / Polish Traverse. Fue una de las experiencias más intensas que tuve — no por lo épico, sino por lo contrario: por la cantidad de decisiones pequeñas, constantes, que hacen que todo funcione o se desmorone.

Volví y no podía dejar de pensar en cómo eso se podría traducir a un juego. No un juego de acción en la montaña. No un simulador de supervivencia donde morís todo el tiempo. Algo más cercano a lo que realmente es estar en una expedición de alta montaña: información parcial, decisiones acumuladas, y la pregunta incómoda de si hoy es el día que das vuelta.

Construí **Aconcagua: Stone Sentinel** — un juego web gratuito, en inglés y español, con un motor de simulación real (Presión Ambiental / Tolerancia Corporal) basado en altitud, clima, terreno, fatiga y acumulación de exposición. Elegís uno de seis personajes, cada uno con un perfil mecánico distinto que cambia cómo percibís la montaña y cómo responde tu cuerpo. Tomás decisiones por turnos. La montaña no te dice qué está haciendo. Vos la leés.

Hay 10 desenlaces posibles. La cumbre es el más raro. El "Retiro Estratégico" — dar vuelta deliberadamente antes de que las condiciones se pongan críticas — está diseñado explícitamente para sentirse como una decisión correcta, no como perder.

Lo construí solo, con cero presupuesto, desde Argentina, en los últimos 3 meses. Trabajo en gestión estratégica de ciencia, tecnología e innovación para el desarrollo — no en software — y este fue el primer proyecto de desarrollo de software en el que participé en mi vida. Usé IA para documentos, parte del código y el arte conceptual — lo digo abiertamente porque prefiero ser honesto que parecer lo que no soy. El objetivo es que eventualmente tenga arte de artistas reales.

El juego es gratuito y corre en el navegador, sin instalación:  
**aconcaguastonesentinel.com**

El repositorio completo es público y open source:  
github.com/ernstgallegos/aconcagua-stone-sentinel

Me encantaría escuchar feedback de argentinos que hayan subido la montaña, que conozcan la región, o simplemente que quieran probarlo y decirme qué funciona y qué no.

---

### 7. r/truegaming

*Audience: ~500k subscribers. Philosophical design post, not self-promotional. Works well when the discussion is genuine.*

**Title:** `Can "turning back" be the most satisfying ending in a game? I designed a mountaineering game where the summit is just one of 10 valid outcomes, and it changed how I think about win states.`

**Post body:**

This started as a design question I couldn't stop thinking about after a real expedition: what if a game took retreat seriously as an outcome — not a consolation prize, not a failure with less punishment, but a mechanically and narratively designed *correct answer*?

Most games that involve dangerous environments treat retreat as "you didn't make it." The win state is always forward.

High-altitude mountaineering in real life has a completely different logic. The decision to turn back — especially when you're physically capable of going further — is often the most sophisticated read of the situation. It means you understood what the mountain was telling you before it was too late.

I've been building *Aconcagua: Stone Sentinel* around this idea. The game has 10 terminal outcomes. Summit is the rarest (typically 10–30% for players who learn the EP/BT system). "Strategic Retreat" — deliberately retreating before conditions become critical — is the most common non-collapse outcome, and every design decision around it has been about making it feel like a correct read rather than a loss.

The mechanics I tried:
- Partial information: you never see exact pressure values, only interpreted signals. Confidence degrades. Retreat is often the right call when you can't tell what's real.
- No comeback mechanics: decisions accumulate. There's no resource regen that resets the situation.
- Plural terminal outcomes: "Collapse (Fatigue)," "Rescue," "Resource Exhaustion," "Fatality" all exist alongside "Summit and Safe Return." Summit being rare makes the retreat feel proportionally more valuable.

What I'm still not sure about: is the retreat satisfying because the *game tells you* it was correct, or because the *system* made it feel inevitable? I don't think those are the same thing, and I haven't fully solved it.

Curious whether others have played games where not-reaching-the-goal felt genuinely right, not just less-bad.

(The game is playable if anyone wants concrete reference: aconcaguastonesentinel.com — free, browser-based, ~30 min per run)

---

### 🟡 TIER 3 — Broader audience, lower specificity

---

### 8. r/indiegamedev

*Smaller than r/gamedev (~70k subscribers) but more intimate. Similar post to r/gamedev but more conversational.*

**Title:** `Solo dev post-mortem: built a mountaineering web prototype after climbing Aconcagua. Here's the one engine bug that took longest to find and the design decision I'm most unsure about.`

**Post body:**

**The context:** Summited Aconcagua (the highest peak outside Asia) via the 360 Route in January 2026. Spent the last 3 months turning that experience into a game. Now v1.5.2 is publicly playable as a free web prototype. For context: I work in strategic science, technology and innovation management for development — not in software. This was the first software development project I had ever been part of.

**The engine bug that cost me the most time:**

The `sleep` action was advancing position ~58% of turns. Not immediately obvious because sleep *should* hold position. The cause: `evaluateOutcome` processed `sleep` with `progress=0`, which fed into a progressChance calculation that returned 58%. Fixed by adding an explicit `outcome='Hold'` when `context.action === 'sleep'`, same pattern I'd already used for approach waits. Obvious in retrospect. Three days to find.

**The design decision I'm most unsure about:**

Whether retreat being "satisfying" is a player experience I can design for, or one that emerges purely from difficulty. When the system makes retreat feel inevitable (BT about to hit 0, weather spiking, no resources), the retreat feels correct. But I want it to also feel correct when the player *chooses* it proactively — when they could have pushed but didn't. I've tried to reward this through outcome classification and narrative framing, but I'm not sure it fully lands.

**What I'm looking for:**

- Playtesters (30 min per run, free browser game)
- Feedback on whether the partial-information model (you never see exact EP/BT values, only confidence-qualified signals) is learnable or frustrating
- Anyone interested in contributing — especially artists (current art is AI-generated, want to replace it with human work)

Play: **aconcaguastonesentinel.com**  
Repo: github.com/ernstgallegos/aconcagua-stone-sentinel

---

## Suggested sequence and timing

| Week | Subreddit | Priority | Notes |
|------|-----------|----------|-------|
| 1 | r/Mountaineering | 🔴 High | First post. Audience most aligned with the real experience. |
| 1 | r/Aconcagua | 🔴 High | Same day or the next — small community, low spam risk. |
| 2 | r/gamedev | 🔴 High | Technical post. Wait for results from the first two. |
| 2 | r/WebGames | 🟠 Medium | Direct, short, no friction. |
| 3 | r/indiegaming | 🟠 Medium | After having real first comments/feedback to incorporate. |
| 3 | r/truegaming | 🟠 Medium | Philosophical post. Doesn't require success in prior posts. |
| 4 | r/argentina | 🟠 Medium | In Spanish. Different audience, no overlap. |
| 4–5 | r/indiegamedev | 🟡 Lower | Last. Uses the accumulated devlog. |

---

## Additional operational notes

**Reply to every comment.** On Reddit, posts that receive OP responses within the first 2–3 hours rise much faster. Block time on the days you post.

**Don't delete low-performing posts.** A post that didn't take off in r/indiegaming may have been read by someone who shares it later. Leave it live.

**Correct flair.** In r/gamedev, use the "Devlog" or "Postmortem" flair to increase visibility. In r/WebGames, use genre flair if available.

**On self-promotion rules:** r/gamedev allows personal posts as long as they have discussion value (not just "play my game"). Tier 1 posts are written with that logic. r/indiegaming is more permissive. r/truegaming requires the discussion to be genuine, not an excuse to post a link — that post is written to work even if nobody clicks the link.

**Screenshot or GIF as first image:** If Reddit allows attaching an image to the post, including a capture from the game's Canvas2D or of the characters significantly increases engagement. The concept art in `art/concept-art/curated/ig/` is very strong for this purpose.

**Crossposts vs. separate posts:** Make them as separate posts, not crossposts. Each community has a different tone and the posts are written for that. A crosspost reads as spam.
