# Deep-link URLs — `prototype/web-v1`

> 🇪🇸 [Versión en español más abajo](#deep-links-urls--prototypeweb-v1-es)

---

## Overview

The web prototype is a single `index.html` file. Screens are shown and hidden by `showScreen()`, which adds the CSS class `active` to the target `<section id="screen-…">` element.

Hash-based deep links let you open any screen directly without clicking through the normal flow. After the data config finishes loading, `handleDeepLink()` reads `window.location.hash` and navigates accordingly.

**Canonical base URL:**

```
https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html
```

---

## URL format

```
#<screenId>[&param=value[&param=value…]]
```

- The first segment before `&` is always the **screen ID** (matches the value passed to `showScreen()`).
- All subsequent `&key=value` pairs are optional parameters.
- Values must be percent-encoded when they contain spaces or special characters (e.g. `Collapse%20(Fatigue)`).
- Normal in-app navigation (button clicks) updates the URL hash automatically, so the current screen is always shareable.

### Supported parameters

| Parameter | Applies to | Description |
|-----------|-----------|-------------|
| `character` | `game`, `onboarding`, `debrief` | Character ID (see [Character IDs](#character-ids)) |
| `scenario` | `game`, `onboarding`, `debrief` | Scenario ID (see [Scenario IDs](#scenario-ids)) |
| `seed` | `game`, `onboarding`, `debrief` | Integer seed for reproducible runs |
| `outcome` | `debrief` | Outcome label for mock debrief (see [Outcome values](#outcome-values)) |
| `force` | Part 2 screens | Set to `1` to bypass the summit-achieved gate |

---

## Complete screen list and deep-link URLs

> **Maintenance note:** if a screen `id` changes or new screens are added/removed in
> `prototype/web-v1/index.html`, this table must be updated.
>
> Verification: search for `<section id="screen-` in `prototype/web-v1/index.html`
> and confirm each screen ID has a row below.

| Screen ID | Purpose | Deep-link URL |
|-----------|---------|---------------|
| `title` | Welcome / cover screen | [`#title`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#title) |
| `expedition-setup` | Character + scenario selection carousels | [`#expedition-setup`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#expedition-setup) |
| `onboarding` | Pre-run briefing (requires character + scenario) | [`#onboarding&character=francisco&scenario=assisted-route&seed=1234`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#onboarding&character=francisco&scenario=assisted-route&seed=1234) |
| `game` | Main gameplay loop | [`#game&character=francisco&scenario=assisted-route&seed=1234`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#game&character=francisco&scenario=assisted-route&seed=1234) |
| `journal` | Expedition journal (cross-run log) | [`#journal`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#journal) |
| `debrief` | Post-run debrief (mock state, option A) | [`#debrief&outcome=Strategic%20Retreat`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#debrief&outcome=Strategic%20Retreat) |
| `summit-success` | Narrative bridge after summit + safe return | [`#summit-success`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#summit-success) |
| `part2-character` | Part 2 character + route selection (gated) | [`#part2-character&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-character&force=1) |
| `part2-hotel` | Part 2 narrative — Mendoza | [`#part2-hotel&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-hotel&force=1) |
| `part2-shared-space` | Part 2 narrative — shared space | [`#part2-shared-space&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-shared-space&force=1) |
| `part2-corridor` | Part 2 narrative — corridor transition | [`#part2-corridor&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-corridor&force=1) |
| `part2-intro` | Part 2 narrative — the group | [`#part2-intro&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-intro&force=1) |
| `part2-first-impressions` | Part 2 narrative — first impressions | [`#part2-first-impressions&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-first-impressions&force=1) |
| `part2-fragments` | Part 2 narrative — fragments | [`#part2-fragments&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-fragments&force=1) |
| `part2-out-of-place` | Part 2 narrative — out of place | [`#part2-out-of-place&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-out-of-place&force=1) |
| `part2-guides` | Part 2 narrative — who leads | [`#part2-guides&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-guides&force=1) |
| `part2-briefing` | Part 2 narrative — briefing | [`#part2-briefing&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-briefing&force=1) |
| `part2-after-words` | Part 2 narrative — after the words | [`#part2-after-words&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-after-words&force=1) |
| `part2-night` | Part 2 narrative — before sleep | [`#part2-night&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-night&force=1) |
| `part2-departure` | Part 2 narrative — departure | [`#part2-departure&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-departure&force=1) |
| `part2-leaving-city` | Part 2 narrative — leaving the city | [`#part2-leaving-city&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-leaving-city&force=1) |
| `part2-transfer` | Part 2 narrative — road to Horcones | [`#part2-transfer&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-transfer&force=1) |
| `part2-closure` | Part 2 narrative — story closure | [`#part2-closure&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-closure&force=1) |
| `fatal-error` | Blocking data-load error screen | [`#fatal-error`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#fatal-error) |

---

## Screen-specific examples

### `#game` — start gameplay immediately

Defaults (no params): random character, first predefined scenario, random seed.

```
#game
#game&character=laura&scenario=narrow-weather-window&seed=9876
#game&character=daniela&scenario=false-stability-terrain
```

### `#onboarding` — pre-run briefing

```
#onboarding&character=erik&scenario=accumulated-fatigue-trap&seed=5555
```

### `#debrief` — post-run analysis (mock data)

All outcome values are listed in [Outcome values](#outcome-values).

```
#debrief&outcome=Strategic%20Retreat
#debrief&outcome=Collapse%20(Fatigue)&character=blake&scenario=weather-window
#debrief&outcome=Summit%20and%20Safe%20Return
#debrief&outcome=Permit%20Expired
```

### Part 2 screens — bypass the summit-achieved gate

Part 2 screens normally require a "Summit and Safe Return" outcome. Add `&force=1` to bypass this gate during evaluation.

> **Note:** `&force=1` writes a `localStorage` flag (`aconcagua_summit_achieved_v1`). Clear site data to reset the gate.

```
#part2-character&force=1
#part2-hotel&force=1
#part2-shared-space&force=1
#part2-corridor&force=1
#part2-intro&force=1
#part2-first-impressions&force=1
#part2-fragments&force=1
#part2-out-of-place&force=1
#part2-guides&force=1
#part2-briefing&force=1
#part2-after-words&force=1
#part2-night&force=1
#part2-departure&force=1
#part2-leaving-city&force=1
#part2-transfer&force=1
#part2-closure&force=1
```

---

## Reference data

### Character IDs

| ID | Name |
|----|------|
| `francisco` | Francisco |
| `laura` | Laura |
| `erik` | Erik |
| `daniela` | Daniela |
| `blake` | Blake |
| `irina` | Irina |

### Scenario IDs

| ID | Name |
|----|------|
| `assisted-route` | Assisted Route |
| `narrow-weather-window` | Narrow Weather Window |
| `false-stability-terrain` | False Stability Terrain |
| `accumulated-fatigue-trap` | Accumulated Fatigue Trap |
| `weather-window` | Weather Window |

### Outcome values

These are the exact strings from `data/outcomes.json`. URL-encode spaces and parentheses:

| Outcome label | URL-encoded value |
|---------------|-------------------|
| `Summit and Safe Return` | `Summit%20and%20Safe%20Return` |
| `High Point Return` | `High%20Point%20Return` |
| `Strategic Retreat` | `Strategic%20Retreat` |
| `Rescue` | `Rescue` |
| `Collapse (Fatigue)` | `Collapse%20(Fatigue)` |
| `Collapse (Exposure)` | `Collapse%20(Exposure)` |
| `Resource Exhaustion` | `Resource%20Exhaustion` |
| `Expedition Window Closed` | `Expedition%20Window%20Closed` |
| `Permit Expired` | `Permit%20Expired` |
| `Fatality` | `Fatality` |

---

---

# Deep-links URLs — `prototype/web-v1` (ES)

## Resumen

El prototipo web es un único archivo `index.html`. Las pantallas se muestran y ocultan mediante `showScreen()`, que agrega la clase CSS `active` al elemento `<section id="screen-…">` correspondiente.

Los deep links basados en hash permiten abrir cualquier pantalla directamente sin pasar por el flujo normal. Después de que la configuración de datos termina de cargarse, `handleDeepLink()` lee `window.location.hash` y navega en consecuencia.

**URL base canónica:**

```
https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html
```

---

## Formato de URL

```
#<screenId>[&param=valor[&param=valor…]]
```

- El primer segmento antes del `&` es siempre el **ID de pantalla** (el mismo que se pasa a `showScreen()`).
- Todos los pares `&clave=valor` siguientes son opcionales.
- Los valores deben codificarse como porcentaje cuando contienen espacios o caracteres especiales (p. ej. `Collapse%20(Fatigue)`).
- La navegación normal dentro de la app (clics en botones) actualiza el hash de URL automáticamente, por lo que la pantalla actual siempre es compartible.

### Parámetros soportados

| Parámetro | Aplica a | Descripción |
|-----------|---------|-------------|
| `character` | `game`, `onboarding`, `debrief` | ID del personaje (ver [IDs de personajes](#ids-de-personajes)) |
| `scenario` | `game`, `onboarding`, `debrief` | ID del escenario (ver [IDs de escenarios](#ids-de-escenarios)) |
| `seed` | `game`, `onboarding`, `debrief` | Semilla entera para runs reproducibles |
| `outcome` | `debrief` | Etiqueta de resultado para el debrief simulado (ver [Valores de outcome](#valores-de-outcome)) |
| `force` | Pantallas de Parte 2 | Poner `1` para saltear el control de cumbre alcanzada |

---

## Lista completa de pantallas y URLs de deep link

> **Nota de mantenimiento:** si el `id` de una pantalla cambia, o se agregan/eliminan pantallas en
> `prototype/web-v1/index.html`, esta tabla debe actualizarse.
>
> Verificación: buscar `<section id="screen-` en `prototype/web-v1/index.html`
> y confirmar que cada ID de pantalla tiene una fila en la tabla.

| ID de pantalla | Propósito | URL de deep link |
|----------------|-----------|-----------------|
| `title` | Pantalla de bienvenida / portada | [`#title`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#title) |
| `expedition-setup` | Carruseles de selección de personaje + escenario | [`#expedition-setup`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#expedition-setup) |
| `onboarding` | Briefing previo a la run (requiere personaje + escenario) | [`#onboarding&character=francisco&scenario=assisted-route&seed=1234`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#onboarding&character=francisco&scenario=assisted-route&seed=1234) |
| `game` | Bucle principal de juego | [`#game&character=francisco&scenario=assisted-route&seed=1234`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#game&character=francisco&scenario=assisted-route&seed=1234) |
| `journal` | Diario de expedición (log entre runs) | [`#journal`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#journal) |
| `debrief` | Análisis post-run (estado simulado) | [`#debrief&outcome=Strategic%20Retreat`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#debrief&outcome=Strategic%20Retreat) |
| `summit-success` | Puente narrativo tras cumbre + retorno seguro | [`#summit-success`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#summit-success) |
| `part2-character` | Selección de personaje/ruta Parte 2 (con gate) | [`#part2-character&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-character&force=1) |
| `part2-hotel` | Narrativa Parte 2 — Mendoza | [`#part2-hotel&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-hotel&force=1) |
| `part2-shared-space` | Narrativa Parte 2 — espacio compartido | [`#part2-shared-space&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-shared-space&force=1) |
| `part2-corridor` | Narrativa Parte 2 — transición en pasillo | [`#part2-corridor&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-corridor&force=1) |
| `part2-intro` | Narrativa Parte 2 — el grupo | [`#part2-intro&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-intro&force=1) |
| `part2-first-impressions` | Narrativa Parte 2 — primeras impresiones | [`#part2-first-impressions&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-first-impressions&force=1) |
| `part2-fragments` | Narrativa Parte 2 — fragmentos | [`#part2-fragments&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-fragments&force=1) |
| `part2-out-of-place` | Narrativa Parte 2 — fuera de lugar | [`#part2-out-of-place&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-out-of-place&force=1) |
| `part2-guides` | Narrativa Parte 2 — quién lidera | [`#part2-guides&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-guides&force=1) |
| `part2-briefing` | Narrativa Parte 2 — briefing | [`#part2-briefing&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-briefing&force=1) |
| `part2-after-words` | Narrativa Parte 2 — después de las palabras | [`#part2-after-words&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-after-words&force=1) |
| `part2-night` | Narrativa Parte 2 — antes de dormir | [`#part2-night&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-night&force=1) |
| `part2-departure` | Narrativa Parte 2 — salida | [`#part2-departure&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-departure&force=1) |
| `part2-leaving-city` | Narrativa Parte 2 — dejando la ciudad | [`#part2-leaving-city&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-leaving-city&force=1) |
| `part2-transfer` | Narrativa Parte 2 — ruta a Horcones | [`#part2-transfer&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-transfer&force=1) |
| `part2-closure` | Narrativa Parte 2 — cierre de la historia | [`#part2-closure&force=1`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#part2-closure&force=1) |
| `fatal-error` | Pantalla de error bloqueante de carga de datos | [`#fatal-error`](https://aconcagua-stone-sentinel.vercel.app/prototype/web-v1/index.html#fatal-error) |

---

## Ejemplos por pantalla

### `#game` — iniciar juego inmediatamente

Sin parámetros: personaje aleatorio, primer escenario predefinido, semilla aleatoria.

```
#game
#game&character=laura&scenario=narrow-weather-window&seed=9876
#game&character=daniela&scenario=false-stability-terrain
```

### `#onboarding` — briefing previo a la run

```
#onboarding&character=erik&scenario=accumulated-fatigue-trap&seed=5555
```

### `#debrief` — análisis post-run (datos simulados)

Todos los valores de outcome están listados en [Valores de outcome](#valores-de-outcome).

```
#debrief&outcome=Strategic%20Retreat
#debrief&outcome=Collapse%20(Fatigue)&character=blake&scenario=weather-window
#debrief&outcome=Summit%20and%20Safe%20Return
#debrief&outcome=Permit%20Expired
```

### Pantallas de Parte 2 — saltear el control de cumbre

Las pantallas de Parte 2 normalmente requieren un resultado "Summit and Safe Return". Agregar `&force=1` saltea este control durante la evaluación.

> **Nota:** `&force=1` escribe un flag en `localStorage` (`aconcagua_summit_achieved_v1`). Para resetear el control, borrar los datos del sitio.

```
#part2-character&force=1
#part2-hotel&force=1
#part2-shared-space&force=1
#part2-corridor&force=1
#part2-intro&force=1
#part2-first-impressions&force=1
#part2-fragments&force=1
#part2-out-of-place&force=1
#part2-guides&force=1
#part2-briefing&force=1
#part2-after-words&force=1
#part2-night&force=1
#part2-departure&force=1
#part2-leaving-city&force=1
#part2-transfer&force=1
#part2-closure&force=1
```

---

## Datos de referencia

### IDs de personajes

| ID | Nombre |
|----|--------|
| `francisco` | Francisco |
| `laura` | Laura |
| `erik` | Erik |
| `daniela` | Daniela |
| `blake` | Blake |
| `irina` | Irina |

### IDs de escenarios

| ID | Nombre |
|----|--------|
| `assisted-route` | Assisted Route |
| `narrow-weather-window` | Narrow Weather Window |
| `false-stability-terrain` | False Stability Terrain |
| `accumulated-fatigue-trap` | Accumulated Fatigue Trap |
| `weather-window` | Weather Window |

### Valores de outcome

Estas son las cadenas exactas de `data/outcomes.json`. Codificar como porcentaje los espacios y paréntesis:

| Etiqueta de outcome | Valor URL-encoded |
|---------------------|------------------|
| `Summit and Safe Return` | `Summit%20and%20Safe%20Return` |
| `High Point Return` | `High%20Point%20Return` |
| `Strategic Retreat` | `Strategic%20Retreat` |
| `Rescue` | `Rescue` |
| `Collapse (Fatigue)` | `Collapse%20(Fatigue)` |
| `Collapse (Exposure)` | `Collapse%20(Exposure)` |
| `Resource Exhaustion` | `Resource%20Exhaustion` |
| `Expedition Window Closed` | `Expedition%20Window%20Closed` |
| `Permit Expired` | `Permit%20Expired` |
| `Fatality` | `Fatality` |
