# Plan de Implementación v1.4 (documentación)

Este documento traduce el diseño consolidado v1.4 en entregables de planificación para ejecución de producto.

## Alcance

- Define backlog por fases.
- Enumera dependencias.
- Establece definición de terminado (DoD) por fase.
- No reemplaza especificaciones de implementación técnica.

---

## Fase 1 — Sprint actual

### Objetivo
Alinear el prototipo jugable con la estructura sistémica y narrativa mínima de v1.4.

### Backlog priorizado
1. Personajes: migración a seis perfiles y ajuste de lectura diferencial.
2. Outcomes: inclusión de `Permit Expired`.
3. Estado global: contador de permiso (máximo 20 días).
4. UI: módulo de permiso en panel derecho.
5. Flujo: eliminación de pantalla `screen-mode`.
6. Outcome especial: éxito exclusivo para `Summit and Safe Return`.
7. Parte 2: pantalla de selección inicial con gating narrativo.
8. Versionado visible: `title-eyebrow` a `v1.3`.
9. Versionado técnico: `package.json` a `1.4.0`.
10. Trazabilidad: changelog `1.4.0`.

### Dependencias
- Definición final de los valores de engine por personaje.
- Validación de copy para outcomes y debrief.
- Criterios de QA para flujo completo de pantallas.

### DoD
- Flujo completo ejecutable sin pantallas huérfanas.
- Unlock de Parte 2 condicionado únicamente a `Summit and Safe Return`.
- Permiso visible y decremental en toda corrida.

---

## Fase 2 — Sprint siguiente

### Objetivo
Agregar diferenciación jugable por personaje y ampliar preparación narrativa de Parte 2.

### Backlog priorizado
1. Mecánica fotográfica de Daniela.
2. Tiempos de decisión diferenciales por personaje.
3. Indicadores de riesgo de activación tardía para Erik e Irina.
4. Secuencia narrativa de transición a Parte 2.
5. Mejoras de legibilidad para playtesting externo.

### Dependencias
- Resultados del playtesting de Fase 1.
- Ajustes de UX basados en fricción observada.

### DoD
- Diferenciación de personaje perceptible en al menos tres momentos de decisión.
- Secuencia narrativa de Parte 2 navegable de punta a punta.

---

## Fase 3 — Preparación de publicación

### Objetivo
Validar estabilidad sistémica, comunicación pública y readiness de distribución.

### Backlog priorizado
1. Playtests internos (5–10 sesiones completas).
2. Verificación de distribución de win rate por personaje.
3. Deploy Vercel en URL limpia.
4. Texto público de presentación.

### DoD
- Evidencia documentada de resultados de playtesting.
- Desviaciones de win rate justificadas o corregidas.
- Entorno desplegable reproducible.

---

## Riesgos y mitigaciones

- **Riesgo:** aumento de complejidad cognitiva en UI por nuevos estados.  
  **Mitigación:** jerarquía visual y copy contextual por fase.
- **Riesgo:** dificultad percibida injusta en personajes de alto ruido perceptual.  
  **Mitigación:** tutorialización situacional y feedback post-turno.
- **Riesgo:** incoherencia entre narrativa y outcomes sistémicos.  
  **Mitigación:** revisión editorial conjunta diseño + sistemas en cada sprint.
