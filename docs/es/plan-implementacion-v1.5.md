# Plan de Implementación v1.5 (registro de entrega)

> **Este documento registra lo entregado en v1.5.0.**
> Para el estado actual de módulos live/deferred, ver [`docs/repo-truth.md`](../repo-truth.md) y [`CHANGELOG.md`](../../CHANGELOG.md).

## Alcance

v1.5.0 construye sobre el plan v1.4 completado con tres entregables principales:

1. **Visualización Canvas2D de calidad profesional** — upgrade de fidelidad visual completa.
2. **Identidad visual por personaje** — apariencia única del escalador por personaje.
3. **Fix del bug de posición en decisiones** — `wait` y `shoot_photo` ya no causan cambios de posición involuntarios.

---

## Entregable 1 — Visualización Canvas2D de montaña

### Lo entregado

Reescritura completa de `prototype/web-v1/ui/helpers/mountain-visualization.js` (1480 → 2991 líneas) de proof-of-concept MVP a calidad near-production:

- **Figura del escalador mejorada**: saco de dormir con colores del personaje, chaqueta con degradado de 4 paradas, crampones en altitud, detalle de botas, cinturón de cadera y correas de compresión, cuerda, colchoneta.
- **Sistema de vapor de aliento**: condensación visible en altitud/frío.
- **Linterna frontal mejorada**: correa, carcasa, cono de haz de dos capas.
- **Marcadores de campamento mejorados**: carpas con degradado, líneas de pliegue, vientos, fuego animado.
- **Bandera de cumbre mejorada**: pirca de piedras, mástil metálico, tela ondeante de 8 segmentos con física de gravedad, detalle del Sol de Mayo.
- **Rayos crepusculares**: haces volumétricos de luz al amanecer/atardecer.
- **Estrellas fugaces**: meteoros raros cruzando el cielo nocturno.
- **Post-procesado mejorado**: viñeta multi-stop, grano de película, aberración cromática, gradación de color cinemática por banda de altitud, bloom solar, fantasmas de lens flare, profundidad de campo, halo lunar, flash rojo de colapso, viñeta de fatiga/exposición.
- **Sistema de transición post-decisión**: clase `TransitionManager` con zoom/pull de cámara, picos de viento, despeje de niebla, time-lapse de nubes.
- **Transiciones suaves de clima**: interpolación `lerpAtmosphere`, flash de relámpago, overlay de whiteout.
- **Sistema de pose del escalador**: posturas por acción, micro-animaciones idle, expresión de fatiga.
- **HUD de altitud cinemático**: indicador vertical de altitud, overlay informativo, arco de distancia a cumbre.
- **Textura procedural de terreno**: líneas de fractura, puntos de escombros, sastrugi de nieve.

### Misma API pública

`initMountainVisualization` / `updateClimberPosition` / `destroyMountainVisualization` — cero dependencias nuevas, Canvas2D puro, respeta `prefers-reduced-motion`.

---

## Entregable 2 — Identidad Visual por Personaje

### Lo entregado

Cada uno de los 6 personajes jugables ahora se renderiza con apariencia única:

| Personaje | Chaqueta | Gorro | Contextura |
|---|---|---|---|
| Francisco Aguirre | Roja | Gorro navy | Estándar |
| Laura Kim | Teal/cerúleo | Gorro crema | Liviana |
| Erik Lundvall | Oro mostaza | Gorro carbón | Alto/ancho |
| Daniela De Rossi | Violeta profundo + cámara en mochila | Atlética | Atlética |
| Blake Harris | Casi negro | Gorro rojo brillante | Fornido |
| Irina Orlova | Naranja quemado | Gorro crema | Esbelta/alta |

---

## Entregable 3 — Fix del Bug de Posición en Decisiones

### Lo corregido

Previamente, solo las esperas en altitud de aproximación forzaban Hold. En altitudes superiores, `wait` y `shoot_photo` podían generar Advance o Retreat vía RNG, causando movimientos involuntarios.

**Fix:** Todos los outcomes de `wait` y `shoot_photo` se fuerzan a Hold en toda altitud (excepto Collapse por fallo corporal). Implementado en `evaluateOutcome()` en `prototype/web-v1/engine/turn-resolution.js`.

---

## Definición de Listo

- [x] Visualización Canvas2D renderiza a calidad near-production en desktop y mobile.
- [x] Los 6 personajes renderiza con identidad visual única.
- [x] `wait`/`shoot_photo` nunca causan cambios de posición (excepto Collapse).
- [x] Los 347 tests JS pasan.
- [x] Los 26 tests Python pasan.
- [x] TypeScript typecheck limpio.
- [x] Versión sincronizada en todas las superficies.
