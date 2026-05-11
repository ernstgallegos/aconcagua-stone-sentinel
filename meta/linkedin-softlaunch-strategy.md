# LinkedIn Soft-Launch Strategy — Aconcagua: Stone Sentinel

**Document type:** Marketing strategy  
**Status:** Ready to execute  
**Created:** May 2026  
**Audience:** Project author (Ernesto Gallegos)  
**Related:** [`meta/reddit-softlaunch-strategy.md`](./reddit-softlaunch-strategy.md)

---

## Strategic context

LinkedIn is not a gamedev discovery channel. The audience here knows you professionally — colleagues, peers, leadership contacts, and professional communities in strategic management, innovation, science & technology policy, and development cooperation. The frame that works is **not** "I made a game"; it is **"I applied a systems-thinking methodology to an extreme-environment decision problem and shipped a working prototype."**

The post should read as evidence of a capability (decision-making under uncertainty, applied systems design, rapid prototyping), not as a hobby announcement. The Aconcagua experience anchors the authenticity; the game architecture anchors the intellectual rigor; the open-source repo anchors the transparency.

---

## Pre-publication checklist

- [ ] Verify that the prototype is accessible and running at **aconcaguastonesentinel.com** before posting.
- [ ] Read the post aloud once — does it sound like your professional voice, or does it sound like marketing copy?
- [ ] Confirm the repo link is public and the README is up to date.
- [ ] Decide whether to include a screenshot or short video clip as media attachment (strongly recommended — posts with visuals see 3–5× more engagement on LinkedIn).
- [ ] Post on a Tuesday, Wednesday, or Thursday morning (08:00–10:00 local time) for peak feed visibility.

---

## Recommended post — Version A (primary, ~700 words)

*This is the main recommended post. It is structured for the LinkedIn professional audience: hook → personal origin → intellectual problem → what was built → evidence of rigor → transparent limitations → call to action.*

---

**En enero de 2026 llegué a la cumbre del Aconcagua por la Ruta 360. Los tres meses siguientes los dediqué a construir un sistema que modela exactamente lo que hace difícil esa montaña — y no es lo que la mayoría piensa.**

Lo más difícil no es el esfuerzo físico. Es la lectura. Leer el tiempo, leer el cuerpo, leer la brecha entre lo que creés que está pasando y lo que realmente está pasando. Y tomar decisiones consecuentes cuando la información es parcial, cuando el sistema te da señales interpretadas y no datos exactos, y cuando no hay forma de revertir lo que ya decidiste.

Eso me pareció un problema de sistemas. Y decidí modelarlo.

**Lo que construí**

*Aconcagua: Stone Sentinel* es un prototipo web de juego narrativo de sistemas construido sobre un motor de Presión Ambiental / Tolerancia Corporal (EP/BT). El jugador elige uno de seis personajes con perfiles de engine distintos — no barras de estadísticas, sino modificadores reales sobre percepción de señales, tasa de aclimatación, postura de riesgo y eficiencia de recursos — y navega una expedición turno a turno donde la montaña genera presión sistémica real, no dificultad scripted.

El sistema tiene 10 resultados terminales. El cúmulo es el más raro. "Retiro estratégico" — dar vuelta antes de que las condiciones se vuelvan críticas — está diseñado explícitamente como un final correcto, no como un fracaso. Eso también fue una decisión de diseño deliberada: quería construir algo que valorara el reconocimiento de límites tanto como el avance.

**Algunas decisiones de arquitectura que me importa documentar:**

- El motor de simulación está completamente desacoplado de la interfaz: `engine/` es JavaScript puro sin dependencias de browser; `ui/` es exclusivamente de cliente. Esto permite correr el engine en headless para validación Monte Carlo.
- Todos los parámetros son data-driven (archivos JSON: personajes, outcomes, modificadores de acción, config de presión). No hay números mágicos en la lógica de juego.
- Suite de 381 tests automatizados cubriendo engine, helpers de UI, contratos de datos y pipelines de simulación.
- Harness Monte Carlo: 1.500 runs headless (6 personajes × 5 escenarios × 50 seeds) para validación estructural. La barra mínima: ningún personaje tiene 0% de tasa de cumbre.

**Sobre el proceso**

Trabajo en gestión estratégica de ciencia, tecnología e innovación para el desarrollo. No vengo de software. Este fue el primer proyecto de desarrollo de software en el que participé. Lo construí con asistencia de IA — programación, documentos, arte conceptual — y lo documenté así explícitamente en el press kit y el README. Prefiero decirlo con claridad que pretender que no fue así.

Lo que me interesa de este proyecto como evidencia de algo no es haberlo terminado. Es lo que implica sobre la metodología: tomar un problema de decisión bajo incertidumbre, abstraerlo en un modelo formal, validarlo contra datos reales, iterar hasta que el sistema produzca el comportamiento esperado, y hacerlo auditable. Eso es lo que hacemos cuando el problema real es complejo y las apuestas son altas — solo que en contextos más convencionales la montaña es otra.

**El prototipo es gratuito, corre en browser, y el repositorio es completamente abierto.**

📌 **Importante:** este proyecto lo desarrollé fuera de mi horario laboral, en tiempo personal, sin interferencia con mis responsabilidades profesionales.

Si trabajás en toma de decisiones bajo incertidumbre, gestión de sistemas complejos, diseño de juegos, o simplemente alguna vez estuviste en una montaña y sabés de qué estoy hablando — me interesa escuchar tu lectura.

🔗 Jugar (gratuito, browser): **aconcaguastonesentinel.com**  
🔗 Repositorio: github.com/ernstgallegos/aconcagua-stone-sentinel

---

*#DecisiónBajoIncertidumbre #SistemasComplejos #InnovaciónAbierta #IndieGame #Aconcagua #DesarrolloPersonal #OpenSource*

---

## Recommended post — Version B (shorter, ~350 words)

*Use this version if you prefer a lighter tone, or as a second post 2–3 weeks after the primary post.*

---

**En enero hice cumbre en el Aconcagua. En los tres meses siguientes construí un modelo de lo que hace difícil esa montaña.**

No es un juego de acción. No es un simulador de supervivencia. Es más parecido a lo que se siente estar adentro de una expedición de alta montaña de verdad: información parcial, decisiones acumuladas, y la pregunta incómoda de si este es el día en que tenés que dar vuelta.

*Aconcagua: Stone Sentinel* corre en browser, es gratuito, tarda ~30 minutos por partida. Tiene 6 personajes jugables con perfiles de engine distintos, 5 escenarios, y 10 resultados terminales — de los cuales la cumbre es el más raro.

El sistema fue construido sobre un motor de Presión Ambiental / Tolerancia Corporal. Todos los parámetros son data-driven. El repo es completamente abierto.

Lo construí solo, con asistencia de IA, sin experiencia previa en desarrollo de software. Eso también forma parte del experimento.

📌 Desarrollado en tiempo personal, fuera de horario laboral.

🔗 **aconcaguastonesentinel.com**

Si te interesa la toma de decisiones bajo incertidumbre, el diseño de sistemas, o simplemente la montaña — me interesa tu opinión.

---

*#Aconcagua #SistemasComplejos #OpenSource #IndieGame #DecisiónBajoIncertidumbre*

---

## Strategic notes

### What to avoid

- **Do not frame it as a hobby project.** The word "hobby" signals low stakes. Use "independent project" or "personal research prototype" instead.
- **Do not lead with game genre.** LinkedIn audiences filter out "I made a game" very fast. Lead with the problem domain (decision under uncertainty, systems modeling).
- **Do not apologize for AI use.** Own it as a methodological transparency decision. The press kit language is already correct; mirror it.
- **Do not post a screenshot with no caption.** If you use media, attach a caption that contextualizes the visual within the intellectual frame of the post.

### Audience segments to target

| Segment | Why they should find it relevant |
|---|---|
| Strategic management / policy / innovation peers | Decision-making under uncertainty is a core professional problem shared across contexts |
| Systems thinkers / complexity practitioners | The EP/BT model and partial information architecture are relevant design precedents |
| Mountaineering community on LinkedIn | Personal credibility anchor; the January 2026 360 Route expedition is genuine |
| Indie game / gamedev professionals | Technical architecture and open-source rigor are differentiated signals |
| AI / no-code development community | Transparent AI-assisted development from a non-technical background is a credible and relevant story |

### Engagement handling

After posting, be prepared to respond to these likely comment types within the first 48 hours:

- **"Impressive, what tools did you use?"** → Name the core stack (vanilla JS engine, GitHub, Vercel, AI assistance for code + docs + art) and link the README architecture section.
- **"Have you thought about commercializing it?"** → The honest answer is that the current focus is public prototype validation; a production path exists but is not the current priority. Refer to the roadmap.
- **"Is this related to your day job?"** → Clear, direct: developed entirely in personal time, no connection to professional responsibilities.
- **"How long did this take?"** → 3 months from post-expedition to v1.5 public prototype. 381 automated tests. 1,500 headless simulation runs. Let the numbers speak.

### Follow-up posts (optional, 2–4 weeks later)

Consider a second post focused on one of these angles:

1. **"What the mountain taught me about decision design"** — a more reflective piece on the 4 design pillars, suitable for strategy/leadership audiences.
2. **"Building your first software project with AI in 2025–2026"** — a process post on what worked and what the limits are, honest about the tradeoffs.
3. **"Retreat as a valid outcome: what game design gets wrong about risk decisions"** — an intellectual provocation aimed at decision-making and risk management audiences.

---

## Canonical project links

| Resource | URL |
|---|---|
| Playable prototype | https://aconcaguastonesentinel.com/ |
| GitHub repository | https://github.com/ernstgallegos/aconcagua-stone-sentinel |
| Press kit (EN) | `meta/press-kit.md` |
| Press kit (ES) | `meta/press-kit.es.md` |
| Public roadmap | `meta/public-roadmap.md` |
| Instagram | [@aconcaguastonesentinel](https://www.instagram.com/aconcaguastonesentinel/) |
| Contact | aconcaguastonesentinel@gmail.com |
