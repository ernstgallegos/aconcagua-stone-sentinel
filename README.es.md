# Aconcagua: Stone Sentinel

**Un videojuego indie narrativo–sistémico sobre los límites, el entorno y la decisión de continuar.**

*Aconcagua: Stone Sentinel* es un videojuego indie single-player inspirado en el ascenso real al Cerro Aconcagua. Propone una experiencia lenta, deliberada y basada en sistemas, en la que el jugador no conquista la montaña, sino que aprende a leerla, adaptarse a ella y decidir cuándo avanzar deja de ser la mejor opción.

## Referencias visuales

La documentación ahora incorpora enlaces directos al arte disponible dentro del repositorio para facilitar la alineación entre UI, tono narrativo y construcción de personajes.

### Concepto de portada

![Concepto de portada de Aconcagua: Stone Sentinel](art/cover/cover-concept-1.png)

### Vista rápida del roster de personajes

| Francisco Aguirre | Daniela De Rossi | Erik Lundvall |
|---|---|---|
| ![Retrato de Francisco Aguirre](art/characters/francisco-aguirre.png) | ![Retrato de Daniela De Rossi](art/characters/daniela-de-rossi.png) | ![Retrato de Erik Lundvall](art/characters/erik-lundvall.png) |

### Concept art atmosférico

![Concept art curado de montaña](art/concept-art/curated/concept-curated-1.png)

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

## Preparación pública y gobernanza

Para mantener el repositorio listo para revisión pública, usar esta base de gobernanza antes de abrir PRs orientados a release:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — límites de contribución, comandos de validación y puertas de CI.
- [`SECURITY.md`](./SECURITY.md) — reporte privado de vulnerabilidades y tiempos de respuesta.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — expectativas de convivencia para la comunidad.
- [`docs/es/checklist-preparacion-publica.md`](./docs/es/checklist-preparacion-publica.md) — checklist final pre-release para coherencia de código + documentación.

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

El prototipo web interactivo es la superficie activa de desarrollo. Implementa el engine completo de Environmental Pressure / Body Tolerance, seis personajes diferenciados, presión por permiso, ventana de decisión por tiempo, acción contextual por personaje y puente narrativo de Parte 2 con acceso condicionado por outcome y cambio de idioma en UI (inglés y español).

Jugable en la URL canónica de Vercel. Ejecutar localmente con:

```bash
python3 -m http.server 4173
# Abrir: http://localhost:4173/prototype/web-v1/
```

Ver [`prototype/web-v1/README.md`](./prototype/web-v1/README.md) para instrucciones completas.
Ver [`docs/architecture.md`](./docs/architecture.md) para el flujo del engine y mapa de datos.

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

> Nota: la documentación/planificación v1.4 ya tiene implementación parcial en el prototipo público. Revisar `CHANGELOG.md` (bloque `1.4.5`) y los planes de implementación para el progreso real por fase.

---

## Frontends web y rutas canónicas

Este repositorio incluye una entrada pública canónica y un visor histórico archivado:

- `/` — índice canónico que ahora sirve la landing pública del proyecto con CTA principal a `prototype/web-v1/index.html`
- `/game.html` — corrida rediseñada autocontenida para explorar una UI atmosférica manteniendo un bucle jugable sistémico de 12 turnos.
- `prototype/web-v1/index.html` — **prototype web-v1** interactivo con mecánicas extendidas
- `prototype/mra-v0/viewer/index.html` — visor archivado para reproducir corridas del prototipo Python

Para detalles de ruteo/deploy (preview local, Vercel y CORS), usar la referencia canónica única:
- [`docs/deploy-routing.md`](./docs/deploy-routing.md)

### Corridas bundled incluidas en el visor archivado

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
- Overlay in-game de **Ayuda de presión y tendencia** para interpretar etiquetas de presión y categorías de tendencia sin salir de la partida.
- Modelo de nodos de ruta + modificadores por etapa, con penalización de vivac fuera de campamento después de las 22:00.
- UI de percepción (Mountain Pressure, Trend, Confidence) sin exponer al jugador valores crudos de EP/BT.
- Export de corrida por turnos como `run_log.json` desde debrief.

Ver `/docs/simulation_engine.md` para el detalle técnico.


Flujo visible actual en web-v1:

`cover de bienvenida (+ modal informativo opcional) → expedition setup → onboarding (tutorial/FAQ o comenzar) → game → (summit-success o debrief)`

La pantalla inicial ahora es deliberadamente minimalista: mantiene la cover como foco principal, deja el avance en un CTA único y mueve versión/contexto/créditos a un modal opcional para quien quiera leer más antes de empezar.

La pantalla `expedition setup` presenta dos carruseles: personaje y escenario. Cada escenario incluye sus propios modificadores de dificultad, por lo que el escenario seleccionado determina la presión ambiental, la recuperación, la economía de recursos, el margen de permiso y las ventanas de decisión — incluyendo los perfiles temporales de cada personaje y las acciones de recuperación.

La pantalla de onboarding ahora incluye un acceso a un tutorial/FAQ completo antes del CTA principal `Iniciar expedición`, con explicación del bucle de partida, sistemas ocultos, referencia de acciones, comportamiento de la dificultad y preguntas frecuentes de reglas.

La selección de personaje ahora incluye una opción `Random Character` que elige automáticamente uno de los seis perfiles disponibles al confirmar la expedición.

Estado de Parte 2 (v1.4):

`part2-character → mendoza_room → team_presentation → after_circle → guides → briefing_night → departure_road → future_cta`

Parte 2 se mantiene como puente narrativo gateado (todavía no jugable como expedición completa); el unlock es exclusivo de `Summit and Safe Return`.

### Deep-link URLs

Cada pantalla del prototipo es accesible directamente mediante una URL basada en hash. Después de cargar los datos, `handleDeepLink()` lee `window.location.hash` y navega en consecuencia. La navegación normal dentro de la app mantiene el hash sincronizado, por lo que cualquier pantalla es compartible.

Formato: `https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#<screenId>[&param=valor…]`

Ejemplos:

```
#title
#expedition-setup
#game&character=francisco&scenario=assisted-route&seed=1234
#onboarding&character=laura&scenario=narrow-weather-window
#debrief&outcome=Collapse%20(Fatigue)
#summit-success
#part2-character&force=1
```

Tabla completa con todas las pantallas activas, referencia de parámetros, IDs de personajes/escenarios/outcomes y links listos para copiar: [`docs/deep-links.web-v1.md`](./docs/deep-links.web-v1.md).

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

---

## Contacto

Para consultas profesionales, conversaciones curatoriales o propuestas de colaboración:

**Ernesto Gallegos**  
Creador del proyecto  
aconcaguastonesentinel@gmail.com

---

*Aconcagua: Stone Sentinel explora la idea de que avanzar no siempre significa progresar, y que reconocer los límites —externos e internos— puede ser una forma de éxito.*


## Estado canónico del prototipo (v1.4.5 estado público)

> **Estado canónico (anclado al código):**
> - El estado de implementación se rastrea en `CHANGELOG.md` bajo [`[1.4.5]`](./CHANGELOG.md#145--2026-03).
> - El progreso por fase se rastrea en [`docs/es/plan-implementacion-v1.4.md`](./docs/es/plan-implementacion-v1.4.md) (versión en inglés: `docs/en/implementation-plan-v1.4.md`).
> - La versión pública actual es **v1.4.5 (despliegue público por fases)**.

El prototipo activo canónico es **`prototype/web-v1` (v1.4.5 estado público)**.

- `prototype/web-v1/`: prototipo sistémico activo, ruta nodo a nodo, engine EP/BT/delta, y mecánicas v1.4.5 en despliegue público.
  - Los contratos de arranque son estrictos: los archivos de modelo requeridos deben cargar y validar antes de jugar; los fallos bloqueantes muestran archivo/categoría de diagnóstico.
- `prototype/mra-v0/`: MRA histórico congelado para validación temprana de hipótesis.
- Visor raíz del repositorio: capa de reproducción/visualización de corridas bundleadas.

Ver `docs/architecture.md` y `docs/simulation_engine.md` para contratos técnicos, y `docs/repo-truth.md` para la verdad canónica del repositorio.
