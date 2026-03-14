# Aconcagua: Stone Sentinel — Documento de Diseño Consolidado

**Versión:** 1.4  
**Fecha:** Marzo 2026  
**Estado:** Referencia de diseño y planificación (alineación documental)

---

## 1. Visión del proyecto

*Aconcagua: Stone Sentinel* es un videojuego indie single-player que propone una experiencia narrativa y sistémica sobre el ascenso al Cerro Aconcagua.

El jugador no conquista la montaña: aprende a leerla, adaptarse a ella y decidir hasta dónde ir.

La verdadera cumbre no es siempre la cima. Es reconocer los límites —propios y de la montaña— y volver sanos y salvos a casa.

### Pilares de diseño (no negociables)

1. La montaña gobierna.
2. La información siempre es parcial.
3. La progresión surge de aprender haciendo.
4. Regresar a salvo es un outcome legítimo.

---

## 2. Estructura del juego

### 2.1 Prólogo jugable (versión pública actual)

El prólogo es una instancia jugable independiente que funciona como teaser y prototipo público. Las decisiones del prólogo no tienen consecuencias persistentes en el modo historia.

Objetivo del prólogo:
- Permitir experimentar seis perspectivas de personaje.
- Hacer visible que cada personaje interpreta de manera distinta el entorno y el riesgo.

### 2.2 Flujo de pantallas (v1.4)

En v1.4 se elimina la pantalla intermedia de **Expedition Type**. La selección de modo (predefinido/aleatorio) se integra en la selección de escenario.

Flujo objetivo:
1. Home / Intro
2. Selección de personaje
3. Selección de escenario (incluye modo)
4. Simulación
5. Debrief
6. Unlock o repetición

### 2.3 Permiso del parque

Cada expedición utiliza un permiso de ingreso al Parque Provincial Aconcagua con duración máxima de 20 días.

En interfaz de simulación, el permiso debe mostrarse en el panel derecho, bajo el reloj diegético, con:
- nombre del personaje,
- foto/emblema,
- días restantes (countdown desde Day 1).

### 2.4 Condición de victoria y unlock de Parte 2

El único outcome que desbloquea la Parte 2 es:
- **Summit and Safe Return**

Todos los demás outcomes finalizan en debrief estándar con opciones de repetir:
- High Point Return
- Strategic Retreat
- Collapse
- Rescue
- Fatality
- Permit Expired
- Expedition Window Closed

---

## 3. Los seis personajes

Los personajes representan perfiles distintos y verosímiles de montañistas en una expedición comercial grupal por ruta normal.

### 3.1 Francisco Aguirre

- Docente de educación física de Mendoza.
- Motor dramático: duelo no resuelto por la muerte de su amigo Mateo Villalba (Fitz Roy, 2022).
- Distorsión de lectura corporal por culpa sostenida.

Mecánica diferencial:
- Señales físicas de advertencia con menor prominencia visual.
- Exige lectura activa del estado fisiológico.

### 3.2 Laura Kim

Perfil orientado a planificación y disciplina operativa con sensibilidad al costo acumulado.

### 3.3 Erik Lundvall

Perfil con tendencia a sobreestimar estabilidad situacional en ventanas de aparente control.

### 3.4 Daniela De Rossi

Perfil observacional con foco en lectura de contexto y retorno informacional.

### 3.5 Blake Harris

Perfil de empuje competitivo con riesgo de decisiones de avance bajo presión de objetivo.

### 3.6 Irina Orlova

Sus números físicos son los mejores del grupo, pero su ruido perceptual es el más alto.

Nota de diseño clave:
- `perceptionBias: 9`
- `riskTolerance: 1.48`

La experiencia del personaje no reduce la dificultad; la reubica.

---

## 4. Relaciones interpersonales (prólogo)

En el prólogo, las relaciones están en fase inicial (primer contacto o primeras horas).

Se expresan por:
- tono de intercambios,
- señales pasivas,
- microtensiones de confianza y lectura de riesgo.

El desarrollo profundo se reserva para la Parte 2+.

---

## 5. Guías de la expedición

La expedición es organizada por **Stone Sentinel Expeditions** y acompañada por dos guías certificados por EPGAMT (Mendoza).

- **Agustina Villanueva** — Guía principal
- **Alejandro Molina** — Guía asistente

---

## 6. Engine de simulación y balance

### 6.1 Pipeline de resolución de turno (base v1.3)

Función autoritativa:

`resolveTurn(state, action)`

Secuencia:

`Environment → Environmental Pressure (EP) → Acclimatization Deficit Check → Body Tolerance (BT) → Pressure Delta → Perception → Action Modifier → Outcome`

### 6.2 Fuentes de datos

Las configuraciones sistémicas se definen en `/data` (nodos, presión ambiental, modificadores de etapa/acción, personajes y outcomes).

### 6.3 Distribución objetivo de win rate

La calibración de balance debe garantizar diferencias significativas por personaje sin colapsar la legibilidad de decisiones.

---

## 7. Plan de implementación

### Fase 1 — Sprint actual (implementar ahora)

- Reemplazar `data/characters.json` con los 6 personajes nuevos.
- Añadir outcome `Permit Expired`.
- Añadir `G.permitDay` y `G.permitMaxDays = 20`.
- Implementar UI de permiso.
- Reordenar flujo eliminando `screen-mode`.
- Agregar pantalla de éxito especial para `Summit and Safe Return`.
- Agregar selector de Parte 2 (5 personajes bloqueados, Francisco activo).
- Actualizar `title-eyebrow` a `v1.3`.
- Bump a `1.4.0` en `package.json`.
- Actualizar `CHANGELOG` con `[1.4.0]`.

### Fase 2 — Sprint siguiente

- Mecánica fotográfica de Daniela (`shootPhoto()`).
- Ventanas de decisión diferenciales por personaje.
- Indicadores de activación tardía para Erik e Irina.
- Pantallas narrativas de Parte 2 (hotel, presentación, guías, transfer, “Continuará”).
- Mejoras visuales/UX para playtesting externo.

### Fase 3 — Preparación para publicación

- 5–10 playtests internos del flujo completo (Parte 1 + Parte 2).
- Verificar distribución de win rate con 6 personajes.
- Deploy en Vercel con URL limpia.
- Redactar texto de presentación (1 párrafo).

---

## 8. Arquitectura del repositorio (referencia)

Versión del documento: **1.4 — Marzo 2026**.  
Próxima actualización sugerida: al completar Fase 1.
