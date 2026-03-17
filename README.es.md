# Aconcagua: Stone Sentinel

**Un videojuego indie narrativo–sistémico sobre los límites, el entorno y la decisión de continuar.**

*Aconcagua: Stone Sentinel* es un videojuego indie single-player inspirado en el ascenso real al Cerro Aconcagua. Propone una experiencia lenta, deliberada y basada en sistemas, en la que el jugador no conquista la montaña, sino que aprende a leerla, adaptarse a ella y decidir cuándo avanzar deja de ser la mejor opción.

**Whitepaper del proyecto**  
Este documento presenta la visión, el enfoque y las decisiones fundacionales de *Aconcagua: Stone Sentinel*.  
Es el mejor punto de entrada para entender qué tipo de juego estamos construyendo y por qué.  
→ [`/meta/project-whitepaper.md`](meta/project-whitepaper.md) (inglés)

### Whitepaper PDF

- Snapshot PDF: [`/meta/exports/project-whitepaper.pdf`](meta/exports/project-whitepaper.pdf)
- Modo de regeneración: **manual** (no se genera automáticamente por CI).
- Fuente canónica: [`/meta/project-whitepaper.md`](meta/project-whitepaper.md).
- Criterio de actualización: cada cambio en el whitepaper markdown debe incluir la regeneración y commit del PDF en el mismo PR/commit para evitar drift.

---

## Pitch en una frase

Un videojuego narrativo y sistémico que recrea el ascenso al Aconcagua mediante mecánicas basadas en el realismo, donde el jugador gestiona cuerpo, clima y entorno para decidir hasta dónde continuar.

---

## Idea central

La montaña es el sistema central y la máxima autoridad.

La geografía, la altitud, el clima y los límites físicos condicionan activamente cada decisión. El progreso no surge de subir de nivel ni de adquirir atributos abstractos, sino de aprender a interpretar señales, gestionar el riesgo y reconocer límites.

La incertidumbre, la información parcial y las consecuencias irreversibles son elementos centrales de la experiencia.

---

## Pilares de diseño

_Aconcagua: Stone Sentinel_ está concebido como una experiencia sistémica.

El clima, el terreno, el equipo y el estado físico y mental del jugador interactúan mediante bucles de retroalimentación que modelan el riesgo, la adaptación y la toma de decisiones.

### 1. La montaña gobierna
La altitud, el terreno y el clima son sistemas activos que condicionan cada acción. El diseño del juego se adapta a la geografía real, no a un diseño de niveles abstracto.

### 2. Información parcial
El jugador accede a datos fisiológicos y ambientales a través de una interfaz diegética y limitada (un dispositivo tipo reloj). La certeza nunca es absoluta.

### 3. Aprender haciendo
No existen niveles ni atributos de personaje. La progresión surge de la observación, la experiencia y la toma de decisiones informadas bajo condiciones cambiantes.

### 4. Contemplación activa
La observación, las pausas y la atención al entorno no son interrupciones, sino mecánicas centrales. El silencio, la escala y el tiempo son elementos significativos del diseño.

---

## Lo que este juego no es

- No es un juego de acción  
- No es un simulador técnico de montañismo  
- No es una fantasía heroica  
- No es un juego de supervivencia centrado en bucles de crafteo  

El realismo se expresa a través de sistemas y mecánicas, no mediante espectacularidad técnica ni simulación excesiva.

---

## Estructura de progresión (alto nivel)

1. **Ruta Normal — Expedición asistida**  
   Introducción a los sistemas con apoyo logístico y consecuencias amortiguadas.

2. **Ascensos menos asistidos**  
   Mayor autonomía, decisiones críticas y consecuencias directas.

3. **Modo Solo — Ruta técnica extrema**  
   Autonomía total, sin asistencia ni garantías. La experiencia definitiva.

---

## Marco legal y ético

 - La geografía real del Cerro Aconcagua y sus rutas principales se representa de forma fiel.
 - No se incluyen personas reales, marcas ni entidades comerciales.
 - Los elementos históricos y culturales se tratan con un enfoque documental y no promocional.
 - No se romantiza el riesgo ni la muerte.
 - El juego no obliga al jugador a alcanzar la cumbre.
 
 Detenerse, regresar o fallar son desenlaces válidos y significativos.
 
 ---
 
 ## Estado del proyecto
 
 Este repositorio documenta los **fundamentos conceptuales y de diseño** del proyecto y contiene dos prototipos en etapas distintas de desarrollo.
 
### Prototipo activo — `prototype/web-v1/`

El prototipo web interactivo es la superficie activa de desarrollo. Implementa el engine completo de Environmental Pressure / Body Tolerance, seis personajes diferenciados, presión por permiso, ventana de decisión por tiempo, acción contextual por personaje y puente narrativo de Parte 2 con acceso condicionado por outcome.

### Artefacto de referencia — `prototype/mra-v0/` (congelado)

El simulador Python validó la hipótesis sistémica inicial y permanece congelado como referencia histórica.

El alcance público del repositorio es explícito:

- El código del prototipo público está disponible en este repositorio (`prototype/web-v1` activo y `prototype/mra-v0` como artefacto histórico congelado).
- El alcance de la rama de producción/comercial permanece privado.
 
 ---
 
 

## Diseño consolidado v1.4 (planificación)

Se incorporó un paquete documental de diseño/planificación v1.4 para alinear visión, estructura de juego, personajes, pipeline sistémico y fases de implementación.

- ES: [`/docs/es/diseno-consolidado-v1.4.md`](docs/es/diseno-consolidado-v1.4.md)
- EN: [`/docs/en/consolidated-design-v1.4.md`](docs/en/consolidated-design-v1.4.md)
- Plan ES: [`/docs/es/plan-implementacion-v1.4.md`](docs/es/plan-implementacion-v1.4.md)
- Plan EN: [`/docs/en/implementation-plan-v1.4.md`](docs/en/implementation-plan-v1.4.md)

> Nota: la documentación/planificación v1.4 ya tiene implementación parcial en el prototipo público. Revisar `CHANGELOG.md` (`[Unreleased]`) y los planes de implementación para el progreso real por fase.

---

## Frontends web y rutas canónicas

Este repositorio incluye dos superficies web:

- `index.html`, `styles.css`, `app.js` — **root viewer** para reproducir corridas MRA v0 incluidas
- `prototype/web-v1/index.html` — **prototype web-v1** interactivo con mecánicas extendidas
- `api/run.js` — API serverless que sirve corridas desde `prototype/mra-v0/runs/`
- `vercel.json` — configuración de runtime y ruteo para Vercel

En preview local estático: `/` abre el root viewer y `/prototype/web-v1/` abre el prototipo interactivo.

En Vercel: `vercel.json` redirige `/` a `/prototype/web-v1/index.html` (ruta publicada por defecto).

### Vista local

Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Luego abrir:

- `http://localhost:4173/` para el root viewer.
- `http://localhost:4173/prototype/web-v1/` para el prototipo interactivo.

En este modo estático local, la UI lee los JSONL incluidos directamente desde `prototype/mra-v0/runs/` (sin API serverless).

### Publicación en Vercel

- Importar este repositorio en Vercel.
- **Project Settings → Root Directory:** dejarlo en la raíz del repo (`.`), no en `prototype/mra-v0`.
- Framework preset: **Other** (estático + funciones serverless).
- Este vertical slice no requiere build command.
- Publicar. La ruta por defecto publicada es `/` y redirige a `/prototype/web-v1/index.html`.
- `/prototype/web-v1` se normaliza a `/prototype/web-v1/index.html`.

#### Allowlist CORS de la API en producción

La API serverless (`api/run.js`) lee `ALLOWED_ORIGINS` como una lista de orígenes exactos separada por comas.

- Configurarlo en **Vercel → Project Settings → Environment Variables** cuando el dominio productivo difiera de los defaults del repo.
- Ejemplo:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

Si `ALLOWED_ORIGINS` no está configurado, la API usa un allowlist hardcodeado como default de desarrollo.

### Corridas bundled incluidas

- `narrow-weather-window-seed101-cautious`
- `false-stability-terrain-seed505-cautious`
- `accumulated-fatigue-trap-seed808-waiter`
- `late-push-seed222-cautious`
- `weather-window-seed151-cautious`

Para sesiones cualitativas, usar [`prototype/mra-v0/debrief-template.md`](./prototype/mra-v0/debrief-template.md) al cerrar cada corrida.
Guía corta recomendada para observación: [`docs/es/guia-observacion-playtest.md`](./docs/es/guia-observacion-playtest.md).


## Prototype Web v1.4 — Environmental Pressure Engine (estado público actual)

El prototipo web ahora sigue un modelo sistémico dominado por el entorno:

`ENTORNO → Presión Ambiental → Respuesta Corporal → Percepción del Jugador → Decisión del Jugador → Resultado`

Cambios centrales:

- Configuración de simulación externalizada en `/data` (`nodes.json`, `environmental_pressure_config.json`, `action_modifiers.json`, `stage_modifiers.json`).
- Cálculo de **Environmental Pressure** y **Body Tolerance** con interpretación de **Pressure Delta**.
- Modelo de nodos de ruta + modificadores por etapa, con penalización de vivac fuera de campamento después de las 22:00.
- UI de percepción (Mountain Pressure, Trend, Confidence) sin exponer al jugador valores crudos de EP/BT.
- Export de corrida por turnos como `run_log.json` desde debrief.

Ver `/docs/simulation_engine.md` para el detalle técnico.


Flujo visible actual en web-v1:

`splash → title → character → scenario → onboarding → game → (summit-success o debrief)`

Estado de Parte 2 (v1.4):

`part2-character → part2-hotel → part2-intro → part2-guides → part2-transfer → part2-closure`

Parte 2 se mantiene como puente narrativo gateado (todavía no jugable como expedición completa); el unlock es exclusivo de `Summit and Safe Return`.

## Estructura del repositorio
 
 - [`/docs`](./docs) — Documentos conceptuales, pilares de diseño, visión de sistemas (inglés y español) y propuesta de artefacto mínimo reproducible (solo en inglés).
 - [`/art`](./art) — Concept art curado y referencias visuales
 - [`/devlog`](./devlog) — Intención de diseño, decisiones de alcance y reflexiones
 - [`/meta`](./meta) — Roadmap público, whitepaper y notas de visibilidad
 
 ---
 
 ## Política de idioma
 
 - El inglés es el idioma canónico del proyecto.
 - La documentación en español se ofrece como capa paralela y contextual.
 
 Ver [`README.md`](./README.md) para la versión en inglés.
 
 ---
 
 ## Licencia
 
 Este proyecto se distribuye bajo la licencia  
 **Creative Commons Atribución–NoComercial–SinDerivadas 4.0 Internacional (CC BY-NC-ND 4.0).**
 
 Se permite leer, compartir y referenciar el contenido de este repositorio con fines no comerciales.
 
 No está permitido reutilizar, modificar, redistribuir ni comercializar ninguna parte del proyecto —incluyendo su concepto, documentación o arte— sin autorización explícita.
 
 Para más detalles, ver [`LICENSE.md`](./LICENSE.md).
