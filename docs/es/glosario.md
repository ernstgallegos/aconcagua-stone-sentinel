# Glosario — Aconcagua: Stone Sentinel

Este glosario define los términos clave utilizados en los documentos de diseño, el código del motor y la documentación técnica de *Aconcagua: Stone Sentinel*. Cada entrada explica el término en el contexto específico de este proyecto.

Las entradas están organizadas temáticamente: primero el modelo de simulación central, luego arquitectura, pruebas y conceptos orientados al jugador.

Versión en inglés: [`docs/en/glossary.md`](../en/glossary.md)

---

## Modelo de simulación central

### Modelo EP/BT (Presión Ambiental / Tolerancia Corporal)

El marco matemático central que rige cada turno del juego.

- **Presión Ambiental (EP, por *Environmental Pressure*)** es una puntuación compuesta que cuantifica cuánta presión ejerce la montaña sobre el escalador en un momento dado. Agrega altitud, carga del terreno, severidad del clima, riesgo de visibilidad, exposición según la hora del día y sesgos por nodo de ruta.
- **Tolerancia Corporal (BT, por *Body Tolerance*)** es una puntuación compuesta que cuantifica cuánto estrés puede absorber el cuerpo del escalador en ese momento. Integra capacidad funcional, aclimatización, hidratación, nutrición, fatiga, exposición y estadísticas propias del personaje.
- **Delta de presión** (`EP − BT`) es la diferencia entre ambas. Un delta positivo significa que el entorno está ganando: las condiciones son más duras de lo que el cuerpo puede tolerar, lo que aumenta el riesgo y el costo fisiológico. Un delta negativo significa que el cuerpo está aguantando bien. Cero representa equilibrio.

Ninguna ruta de UI ni sistema de eventos puede asignar un outcome terminal sin pasar por este modelo. Todas las consecuencias deben emerger de `resolveTurn(state, action)`.

> Ver también: `docs/simulation_engine.md`, `prototype/web-v1/engine/pressure-model.js`

---

### resolveTurn

La única función con autoridad para resolver un turno del juego:

```
resolveTurn(state, action)
```

Procesa el siguiente pipeline en orden estricto:

1. `normalize-action`
2. `consume-time-and-resources`
3. `apply-weather-and-persistence`
4. `compute-pressure-and-perception`
5. `apply-decision-window-effects`
6. `evaluate-outcome`
7. `update-state`
8. `classify-terminal-outcome`
9. `emit-signals-and-narrative`

No existe lógica de outcome paralela. Toda consecuencia de un turno —progreso, costo fisiológico, riesgo y outcomes terminales— emerge exclusivamente de esta función.

> Ver también: `prototype/web-v1/engine/turn-resolution.js`

---

### Modelo de percepción

Una capa de la simulación que traduce los valores crudos de EP/BT/delta en las señales imperfectas que el jugador ve en la interfaz del reloj.

El modelo de percepción produce tres salidas:

- **`confidenceLevel`** — qué tan confiable es la lectura actual.
- **`trendEstimate`** — si las condiciones parecen mejorar, estabilizarse o empeorar.
- **`noiseLevel`** — cuánta distorsión afecta la señal.

El jugador nunca ve EP, BT ni pressureDelta en crudo. Ve únicamente **Presión de Montaña**, **Tendencia** y **Confianza**, filtrados a través del modelo de percepción.

Cada personaje modifica la percepción de manera distinta: algunos tienen sesgos que los hacen sobreestimar o subestimar el peligro; otros tienen latencia que retrasa el inicio de ciertas señales.

> Ver también: `prototype/web-v1/engine/pressure-model.js` (`calculatePerception`)

---

### Confianza variable (`confidenceLevel`)

El indicador de confiabilidad de señal producido por el modelo de percepción. Va de baja a alta e indica qué tan fiable es la lectura ambiental actual del jugador.

La confianza variable es la expresión mecánica del pilar de diseño "la información es siempre parcial". Incluso una lectura de alta confianza no es absoluta. Los factores que reducen la confianza incluyen:

- Delta de presión alto (condiciones extremas degradan la conciencia situacional).
- Fatiga y exposición elevadas (el cuerpo se convierte en un instrumento menos preciso).
- Guardrails de percepción propios del personaje (ej.: la culpa de Francisco distorsiona su interpretación de señales corporales).
- Penalizaciones de etapa avanzada y horario tardío.

La confianza es *variable* porque cambia en cada turno según el estado del sistema — no es un atributo estático del personaje.

> Ver también: `data/characters.json` (`engine.confidenceStability`), `prototype/web-v1/engine/pressure-model.js`

---

### Capacidad funcional

Una métrica central del estado corporal que representa la capacidad actual del escalador para funcionar de manera efectiva. No es una barra de vida: no existe un momento en que la capacidad llegue a cero y el escalador "muera". En cambio, la caída de capacidad funcional aumenta el costo fisiológico por acción, degrada la percepción y eleva la probabilidad de outcomes adversos.

La capacidad funcional disminuye con la altitud, la fatiga y la exposición; se recupera parcialmente con acciones de descanso, sueño y aclimatización.

> Ver también: `data/characters.json` (`engine.functionalCapacityBonus`), `prototype/web-v1/engine/turn-resolution.js`

---

### Aclimatización

La adaptación fisiológica gradual del cuerpo a la altitud. En el motor del juego, la aclimatización se acumula cuando el jugador realiza acciones de descanso o sueño a mayor altitud y se degrada cuando asciende demasiado rápido o desciende sin reaclimatizarse.

Una mayor aclimatización reduce el costo de BT de la exposición a la altitud y mejora la calidad de señal del modelo de percepción. Cada personaje tiene un multiplicador `acclimatizationRate` que determina con qué velocidad se adapta.

---

### Modificador de acción

Un objeto definido en `data/action_modifiers.json` que especifica cómo una acción concreta (`advance`, `wait`, `sleep`, `descend`, etc.) afecta al motor de turno. Los campos incluyen delta de fatiga, delta de exposición, delta de capacidad, costo de recursos por minuto y modificadores de probabilidad de progreso.

El motor lee los modificadores de acción en el paso `evaluate-outcome` del pipeline. Los campos faltantes se normalizan a cero en tiempo de ejecución.

> Ver también: `docs/data-contracts-guide.md`

---

### Etapa

Uno de los tres niveles de progresión canónicos que modulan los modificadores de EP/BT y las probabilidades de outcome:

| Etapa | Descripción |
|---|---|
| `APPROACH` | Segmentos de menor altitud, consecuencias amortiguadas, enfoque en aclimatización. |
| `HIGH_CAMP` | Altitud media-alta, recursos comprimidos, costo fisiológico en aumento. |
| `SUMMIT_DAY` | Presión máxima, ventana de tiempo estricta, mayor riesgo de colapso. |

Los modificadores de etapa se cargan desde `data/stage_modifiers.json` y se aplican sobre los cálculos de EP por nodo.

---

### Nodo de ruta

Una ubicación discreta a lo largo de la ruta, cargada desde `data/nodes.json`. Cada nodo tiene un `id`, `stage`, `routeIndex`, altitud, carga de terreno, sesgos de clima/visibilidad, un flag de campamento (`isCamp`) y pesos de sensibilidad horaria.

El motor utiliza el nodo actual para calcular EP y para aplicar reglas como la penalización de vivac (aplicada cuando `time > 22:00` y `node.isCamp === false`).

---

### Outcome terminal

Un estado de fin de partida clasificado por `classify-terminal-outcome` en el pipeline de `resolveTurn`. Los outcomes canónicos están definidos en `data/outcomes.json`:

- Summit and Safe Return (Cumbre y Retorno Seguro)
- High Point Return (Retorno al Punto Alto)
- Strategic Retreat (Retirada Estratégica)
- Rescue (Rescate)
- Collapse (Fatigue) — Colapso por Fatiga
- Collapse (Exposure) — Colapso por Exposición
- Resource Exhaustion (Agotamiento de Recursos)
- Expedition Window Closed (Ventana de Expedición Cerrada)
- Permit Expired (Permiso Vencido)
- Fatality (Fatalidad)

Solo "Summit and Safe Return" desbloquea la Parte 2. Todos los demás outcomes terminan en debrief estándar.

---

### Permiso de parque

Una restricción de simulación que limita la duración de la expedición. Cada run comienza con un período de permiso máximo (hasta 20 días en dificultad estándar). El contador de días de permiso avanza con cada día en el juego. Si el permiso vence antes de que el jugador salga del parque, el outcome terminal es **Permit Expired** (Permiso Vencido).

El permiso se muestra en el panel derecho de la UI del juego como una cuenta regresiva visible, reforzando el tiempo como una restricción real.

---

### Ventana de decisión

Un temporizador suave y sensible a la etapa que degrada la confianza y aumenta el ruido a medida que el jugador tarda más en elegir una acción. La ventana de decisión no falla de forma binaria: no es un timeout absoluto. En cambio, las decisiones demoradas producen una pequeña deriva de confianza y leves aumentos de costo, haciendo que la indecisión prolongada tenga un costo mecánico sin penalizar a los jugadores de forma arbitraria.

Cada personaje tiene un objeto de configuración `decisionWindow` en `data/characters.json` con `baseMs`, modificadores por etapa, suelo mínimo y tasa de degradación.

---

### Corrida (*run*)

Una sesión de juego completa, desde el inicio de la expedición hasta un outcome terminal. Cada corrida usa un personaje, un escenario y una semilla aleatoria. La corrida termina cuando `resolveTurn` clasifica un outcome terminal.

Los datos de la corrida se registran turno a turno en `run_log.json` (almacenado en `localStorage`). La pantalla de debrief resume la corrida completada.

---

## Experiencia del jugador

### Feedback cosmético

Efectos de UI o narrativa que comunican cambios de estado al jugador sin modificar los valores subyacentes del motor. Ejemplos: cambios de color en la interfaz del reloj, líneas narrativas atmosféricas en el feed de acciones, o señales sonoras asociadas a cambios climáticos.

El feedback cosmético se distingue intencionalmente de la consecuencia mecánica. Un elemento de feedback cosmético informa la percepción sin alterar EP, BT, fatiga, exposición ni ninguna otra variable del motor. Esta distinción es un principio de diseño central: *las decisiones dejan huella y no se "limpian" con feedback cosmético*.

> Ver también: `meta/project-whitepaper.es.md` §2, pilar de diseño "Consecuencia real".

---

### Información parcial

Un pilar de diseño y restricción jugable: el jugador nunca tiene conocimiento completo, preciso ni en tiempo real del estado del juego. Toda la información está mediada por la interfaz diegética del reloj, filtrada a través del modelo de percepción y sujeta a confianza variable.

Esto no es una limitación de UI — es una garantía mecánica. La simulación retiene activamente EP, BT y delta de presión del jugador. Lo que el jugador ve es siempre una interpretación, nunca el estado real.

---

### Debrief

La pantalla de fin de corrida que se muestra después de cada outcome terminal. Presenta el resultado de la corrida, estadísticas clave, una explicación causal del punto de decisión más importante y la opción de repetir o volver al setup.

El debrief de "Summit and Safe Return" desbloquea el puente de la Parte 2; todos los demás outcomes muestran un debrief estándar.

---

## Arquitectura

### Motor

En este proyecto, "el motor" hace referencia a los módulos de simulación en `prototype/web-v1/engine/`, que implementan colectivamente el modelo EP/BT y el pipeline de `resolveTurn`. Módulos principales:

| Módulo | Responsabilidad |
|---|---|
| `turn-resolution.js` | Orquesta el pipeline completo mediante `RESOLVE_TURN_PIPELINE`. |
| `pressure-model.js` | Calcula EP, BT, delta de presión y salidas de percepción. |
| `turn-rules.js` | Aplica reglas a nivel de acción (penalización de vivac, hold de sueño, etc.). |
| `events-core.js` | Normaliza y aplica eventos de personaje y de contexto. |
| `game-state.js` | Gestiona los slices de estado, los valores por defecto y la seguridad en clonación profunda. |

El motor es independiente de la capa de UI (`prototype/web-v1/ui/`) y de la carga de datos (`prototype/web-v1/ui/helpers/data-config.js`). No accede al DOM y puede ejecutarse sin interfaz gráfica para simulaciones Monte Carlo.

---

### Visualización Canvas2D

La visualización de la montaña renderizada en la pantalla de juego utilizando la API HTML5 Canvas 2D (`CanvasRenderingContext2D`). Implementada en `prototype/web-v1/ui/mountain-visualization.js`.

La visualización Canvas2D renderiza:
- Silueta del terreno y segmentos de ruta.
- Posición del escalador y movimiento animado.
- Efectos atmosféricos (clima, capas de visibilidad).
- Superposiciones de HUD (marcadores de etapa, indicadores de campamento).
- Identidad visual del personaje (retrato, acento de color).

El término "Canvas2D" distingue esta implementación de WebGL u otros enfoques de renderizado. Se elige intencionalmente por su simplicidad y amplia compatibilidad.

---

### web-v1 / Prototipo activo

`prototype/web-v1/` es el prototipo activo y canónico. Es la implementación jugable de cara al público, la autoridad para todo el comportamiento activo del motor y la referencia para toda la documentación vigente.

Build público actual: **v1.5.2**.

---

### mra-v0 / Artefacto histórico congelado

`prototype/mra-v0/` es una simulación Python de una fase anterior del desarrollo. Se conserva como referencia de regresión y reproducibilidad histórica, pero **no** es el producto activo. No se le agregan nuevas funcionalidades.

---

### Deep link (enlace directo)

Una URL con un fragmento hash que navega directamente a una pantalla específica de `prototype/web-v1` sin pasar por el flujo normal. Por ejemplo:

```
prototype/web-v1/index.html#game&character=francisco&scenario=assisted-route&seed=1234
```

Los deep links se usan para testing, para compartir configuraciones de run específicas y para la validación smoke en CI.

> Ver también: `docs/deep-links.web-v1.md`

---

### Telemetría / run_log

Datos estructurados por turno registrados durante cada corrida por `ui/helpers/run-log.js`. Cada entrada captura:
- Índice de turno, personaje, escenario, acción.
- EP, BT, delta de presión, salidas de percepción.
- Cambios en el estado fisiológico (fatiga, exposición, capacidad, recursos).
- Cualquier evento de personaje o de contexto que se haya disparado.
- El outcome resultante y las señales narrativas.

Al finalizar la corrida, `exportRunLog()` escribe el log completo en `localStorage`. La pantalla de debrief puede mostrar un revisor compacto de turnos, y una cadena de texto de firma de corrida resume la partida para compartir.

---

## Testing y calidad

### Tests de contrato / tests de paridad

Tests automatizados que verifican expectativas compartidas entre múltiples componentes o superficies sin sobre-restringir los detalles de implementación.

En este proyecto, los tests de contrato verifican:
- Que los outcomes activos en el motor coincidan con la lista canónica en `data/outcomes.json`.
- Que las métricas de estado compartidas (posición, fatiga, exposición, etc.) estén presentes en los schemas de escenario de `web-v1` y `mra-v0`.
- Que las declaraciones de tipos TypeScript en `src/types/` coincidan con los shapes de datos normalizados en tiempo de ejecución de `data-config.js`.

Los **tests de paridad** son un subconjunto que verifica específicamente que dos representaciones del mismo concepto permanezcan alineadas. Por ejemplo, `tests/parity/loader-ts-contract-parity.test.js` garantiza que la salida del loader en runtime y el contrato TypeScript declaren los mismos invariantes.

Estos tests protegen los contratos conceptuales compartidos mientras permiten intencionalmente divergencia de implementación.

> Ver también: `docs/model-contract.md`, `data/contracts/model-contract.json`

---

### Smoke de flujo (*flow smoke test*)

Un test automatizado de extremo a extremo, liviano, que valida el flujo principal de pantallas de `prototype/web-v1`:

```
title → expedition-setup → onboarding → game → outcome/debrief
```

Los smoke tests no verifican el balance del motor ni el contenido narrativo — verifican que las pantallas se activen, que los controles de gate funcionen (habilitados/deshabilitados) y que las rutas críticas de navegación no generen errores.

Están implementados con Playwright (`prototype/web-v1/tests/playwright/`) y se ejecutan en CI en cada push y pull request.

`npm run smoke:release` extiende esto para también validar los puntos de entrada desplegados contra la URL live de Vercel.

> Ver también: `docs/es/checklist-preparacion-publica.md`

---

### Simulación Monte Carlo

Un ejecutor en lote sin interfaz gráfica (`scripts/monte-carlo-web-v1.js`, invocado mediante `npm run simulate`) que ejecuta una gran cantidad de corridas automatizadas en todos los personajes y escenarios usando una política de IA determinista.

Su propósito principal es la **detección de regresiones**: si algún personaje produce una tasa de cumbre del 0%, hay un bug estructural en el motor. El runner Monte Carlo no se usa para calibración absoluta de balance porque la política automatizada no modela la toma de decisiones humana (timing, estrategia de sueño, interpretación de señales).

Los resultados se escriben en `docs/playtest-results/`.

---

### Guardrails de calibración (*tuning guardrails*)

Tests a nivel de motor en `tests/engine/tuning-guardrails.test.js` que imponen restricciones sobre parámetros críticos para el balance — por ejemplo, que los valores de escala EP permanezcan dentro de rangos viables probados, que los pisos de tasa de consumo fraccional sean distintos de cero, y que al menos una ruta de cumbre determinista permanezca alcanzable. Detectan regresiones de balance que de otro modo solo aparecerían como tasas de cumbre del 0% en las corridas Monte Carlo.

---

*Última actualización: v1.5.2. Para el estado canónico de módulos, ver [`docs/repo-truth.es.md`](../repo-truth.es.md).*
