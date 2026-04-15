# Propuesta de Integración Geológica para el Prototipo

**Proyecto:** *Aconcagua: Stone Sentinel* — web-v1  
**Fuente:** `docs/es/biblia-geologica-aconcagua.md` (referencia geológica canónica)  
**Fecha:** 2026-04-14  
**Estado:** Propuesta — pendiente de revisión

---

## Resumen ejecutivo

La biblia geológica establece que el Aconcagua no es una cumbre genérica: es el remanente de un estratovolcán compuesto mioceno (CVA, ~15,8–8,9 Ma) incrustado en una faja plegada y corrida, con una superficie cuaternaria activa de surges glaciares, ~400 eventos de remoción en masa y dinámica periglaciar. El prototipo actual trata el terreno como bandas abstractas de dificultad. Esta propuesta identifica seis fases concretas de integración para llevar el sustrato geológico a la experiencia jugable sin alterar la arquitectura EP/BT existente ni requerir nuevos sistemas de motor.

---

## Principio rector

Cada cambio propuesto debe satisfacer tres restricciones:

1. **Basado en datos** — originado en la biblia geológica, no inventado.
2. **Mecánicamente honesto** — integrado a través del sistema EP/BT/terrainLoad/context-event existente.
3. **Narrativamente orgánico** — la geología aparece como señales situadas, no como clases de geología.

---

## Fase 1: Enriquecimiento de Metadatos de Nodos (`data/nodes.json`)

### Qué cambia

Agregar un objeto `geology` a cada nodo en `data/nodes.json` con campos consumibles por el motor y el sistema narrativo:

| Campo | Tipo | Descripción |
|---|---|---|
| `lithology` | string | Tipo de roca dominante en el waypoint (ej. `"quaternary_alluvial"`, `"volcaniclastic_altered"`, `"andesite_breccia"`) |
| `structuralContext` | string | Contexto tectónico/estructural (ej. `"aftb_frontal"`, `"avc_lower_section"`, `"avc_upper_section"`) |
| `hazardProfile` | string[] | Peligros geológicos activos en el nodo (ej. `["rockfall", "debris_flow"]`) |
| `geologicalNote` | string | Contexto geológico en una oración para uso narrativo |

### Perfiles geológicos por nodo

| Nodo | lithology | structuralContext | hazardProfile |
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

### Impacto en sistemas existentes

- **Ninguno inmediato** — el objeto `geology` es metadata aditiva. Los valores existentes de `terrainLoad`, `weatherBias`, `visibilityBias` no se modifican.

### Esfuerzo estimado

Bajo. Cambio exclusivamente de datos.

---

## Fase 2: Eventos de Contexto con Conciencia Geológica (`data/context_events.json`)

### Qué cambia

Agregar 4–6 nuevos eventos de contexto que usen la metadata geológica de los nodos:

#### Eventos propuestos

1. **`rockfall-warning`** — Se activa en nodos con `"rockfall"` en el perfil de peligros. Efectos: weatherDelta +1, timePenalty +15. Narrativa: *"Un crujido agudo sobre tu cabeza. La andesita fragmentada por el hielo se desprende de la cara alterada. La ruta está libre, pero el campo de escombros es fresco."*

2. **`scree-shift`** — Se activa en nodos con litología volcaniclástica alterada. Efectos: weatherDelta +1. Narrativa: *"La pendiente cede bajo tus pies — la brecha volcaniclástica meteorizada se deshace donde la alteración argílica ha reblandecido la roca a arcilla."*

3. **`glacier-rumble`** — Se activa en nodos de aproximación cerca de Horcones. Efectos: visibilityDelta -1, timePenalty +10. Narrativa: *"Un rumor grave desde el fondo del valle. El Horcones Inferior se ajusta — el hielo cubierto de detritos se mueve según su propio calendario."*

4. **`dust-plume`** — Se activa en nodos de alta altitud con volcaniclásticos alterados y exposición al viento. Efectos: visibilityDelta -1. Narrativa: *"El viento levanta polvo volcánico fino de la cara alterada. La pirámide de cumbre desaparece tras una bruma mineral — esta montaña sigue erosionándose."*

5. **`seismic-tremor`** — Evento raro (maxPerRun: 1). Efectos: weatherDelta +1, timePenalty +20. Narrativa: *"El suelo se mueve — breve, sutil, pero real. Los Andes se comprimen a razón de centímetros por año. Hoy sentiste uno."*

6. **`stable-dyke-ridge`** — Se activa en Portezuelo/Travesía donde los diques resistentes forman crestas. Efectos: weatherDelta -1. Narrativa: *"El piso se afirma donde un dique resistente corta el terreno alterado — la espina geológica de la cresta resiste al viento y la erosión."*

### Impacto en sistemas existentes

- Usa la infraestructura de eventos de contexto existente.
- Requiere consumir `geology.hazardProfile` en la lógica de disparo (extensión menor del motor).

### Esfuerzo estimado

Medio. Datos nuevos + extensión menor de lógica de trigger.

---

## Fase 3: Enriquecimiento Narrativo Geológico (`ui/helpers/narrative.js`)

### Qué cambia

Agregar variantes narrativas con clave geológica que el sistema narrativo pueda seleccionar cuando haya metadata geológica disponible. Enriquece los bancos de texto existentes sin reemplazarlos.

#### Enfoque

Extender `pickNarrative` para aceptar contexto geológico opcional y seleccionar variantes específicas cuando estén disponibles. Fallback a narrativas genéricas existentes.

#### Ejemplos de variantes

**`advance_high`:**
- *"Avanzás entre estratos volcánicos inclinados. La andesita bajo tus pies tiene 10 millones de años — y sigue desmoronándose."*
- *"Cada paso cruza tiempo geológico: brecha de una erupción, toba de otra, todo inclinado por fuerzas que preceden a esta ruta por eones."*

**`wait_low` (para nodos de aproximación):**
- *"Sostenés posición sobre debris glaciar. El fondo del valle es un palimpsesto — morena sobre mega-deslizamiento sobre till más antiguo."*

**`crit_fatigue` (variante de alta altitud):**
- *"Tu cuerpo reporta lo que la roca ya muestra: todo aquí está en estado de colapso lento."*

### Impacto en sistemas existentes

- El banco narrativo ya es extensible (array de strings por clave).
- Sin cambio en la interfaz de `resolveNarrativeText`.

### Esfuerzo estimado

Medio. Autoría de textos + extensión menor del picker narrativo.

---

## Fase 4: Revisión de Calibración de Terrain-Load

### Qué cambia

Revisar y opcionalmente ajustar `terrainLoad` basándose en realidad geológica:

| Nodo | terrainLoad actual | Fundamento geológico | Ajuste sugerido |
|---|---|---|---|
| piedras_conway | 3 | Volcaniclásticos alterados con inestabilidad de acarreo | 3 → **4** |
| canaleta | 3 | Embudo empinado de brecha andesítica, debris fragmentado | 3 → **5** (máximo — crux de la ruta) |
| portezuelo_viento | 3 | Cresta de dique resistente, menos material suelto | 3 → **2** |
| travesia | 3 | Travesía volcaniclástica expuesta, cargada por viento | 3 → **4** |
| summit | 3 | Andesita de cumbre, relativamente consolidada | 3 → **2** |

### Impacto en sistemas existentes

- Impacto directo en cálculo de EP (terrainLoadScale alimenta EP).
- Requiere validación de balance con Monte Carlo.
- Debe preservar bandas de tasa de cumbre existentes (8–20% humano).

### Esfuerzo estimado

Medio-Alto. Cambio de datos + validación de balance.

---

## Fase 5: Señales Visuales Geológicas en la UI del Juego

### Qué cambia

Superficie contexto geológico en la barra de situación, el reloj y el panel narrativo:

1. **Barra de situación:** Indicador de tipo de terreno derivado de `geology.lithology` (ej. "Volcaniclásticos alterados"). Señal diegética consistente con Pilar 2.

2. **Detalle del reloj:** Incluir `geology.geologicalNote` como línea sutil en la vista expandida del reloj.

3. **Panel de vista de montaña:** Considerar tinte o etiquetado del indicador de progreso para reflejar zonas geológicas.

### Esfuerzo estimado

Medio. Trabajo de UI en screens.js/components.css.

---

## Fase 6: Insights Geológicos en el Debrief

### Qué cambia

En el debrief post-corrida, incluir contexto geológico para el punto de inflexión y nodos clave:

1. **Anotación del punto de inflexión:** Si el punto de inflexión ocurrió en un nodo geológicamente notable, incluir línea de contexto.

2. **Resumen geológico de ruta:** Una línea resumiendo el carácter geológico del punto más alto alcanzado.

### Esfuerzo estimado

Bajo-Medio. Extensión de template de debrief + autoría de textos geológicos.

---

## Prioridad de implementación

| Fase | Prioridad | Razón |
|---|---|---|
| 1 — Metadata de nodos | **P0** | Fundamento para todas las demás fases. Sin riesgo. |
| 2 — Eventos de contexto | **P1** | Alto impacto visible. Usa infraestructura existente. |
| 3 — Narrativas | **P1** | Mejora directa de inmersión. Bajo riesgo técnico. |
| 4 — Calibración de terrain | **P2** | Requiere validación de balance. Posterior a Fase 1. |
| 5 — Señales visuales | **P2** | Pulido de UI. Depende de metadata de Fase 1. |
| 6 — Debrief | **P3** | Enriquecimiento post-corrida. Menor prioridad. |

---

## Lo que esta propuesta NO cambia

- **Arquitectura del motor** — EP/BT sin cambios.
- **Resolución de turno** — `resolveTurn()` no se modifica.
- **Objetivos de balance** — Tasa de cumbre 8–20% humano preservada.
- **Mecánicas de personajes** — Sin cambios en stats.
- **Flujo de juego** — Secuencia de pantallas sin cambios.
- **Contratos de test** — Los 347 tests existentes permanecen verdes.

---

## Estrategia de validación

1. Fase 1: Check de parse JSON + test de contrato de datos para nuevo campo `geology`.
2. Fase 2: Test de trigger de evento de contexto con datos geológicos de nodo.
3. Fase 3: Test de picker narrativo con disponibilidad de variante geológica.
4. Fase 4: Corrida de Monte Carlo — comparar win rates antes/después de cambios de terrainLoad.
5. Fase 5: Smoke test — verificar que UI renderiza señales geológicas sin romper layout.
6. Fase 6: Test de debrief — verificar que anotaciones geológicas aparecen para puntos de inflexión relevantes.

---

## Referencias

- `docs/es/biblia-geologica-aconcagua.md` — Referencia geológica completa
- `docs/es/referencia-realidad-aconcagua.md` § 6 — Sección de geología para diseño
- `docs/es/pilares-de-diseno.md` — Subsección de Anclaje geológico
- `docs/es/vision-de-sistemas.md` — Párrafos de Anclaje e Interacción geológica
