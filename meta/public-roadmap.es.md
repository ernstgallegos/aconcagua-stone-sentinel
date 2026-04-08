# Roadmap público

Este documento presenta la hoja de ruta de alto nivel de *Aconcagua: Stone Sentinel* en español.

No es cronograma cerrado ni promesa de fechas: es un **mapa de etapas** para comunicar qué está consolidado y qué sigue en ejecución.

## Cómo leer este roadmap

- Cada etapa describe un tipo de trabajo.
- El avance se mide por coherencia (no por velocidad).
- Se distingue:
  - **Design lock completo** (decisiones cerradas en docs),
  - **Implementación completa** (comportamiento vivo en el prototipo).

## Matriz resumida (snapshot v1.4.x)

| Etapa | Estado | Design lock | Implementación |
| --- | --- | --- | --- |
| Etapa 1 — Enmarque del proyecto | Completa | Completo | Completa (documental) |
| Etapa 2 — Definición sistémica | Completa | Completo | Completa |
| Etapa 3 — Intención visual y curaduría | Completa | Completo | En progreso (pulido) |
| Etapa 4 — Prototipo núcleo | Completa | Completo | Completa |
| Consolidación v1.4 | Completa | Completo | En progreso por fases |
| Etapa 5 — Prototipado selectivo | Completa | Completo | Completa |
| Etapa 6 — Prototipo integrado | En progreso | Completo | En progreso |
| Etapa 7 — Evaluación y lock de dirección | Planificada | Planificada | Planificada |

## Evidencia objetiva por etapa

### Etapa 1 — Enmarque del proyecto (Completa)

- Marco conceptual y límites consolidados en documentación v1.4.

### Etapa 2 — Definición sistémica (Completa)

- Simulador determinista de referencia en `prototype/mra-v0`.
- Motor activo por turnos en `prototype/web-v1/engine/turn-resolution.js`.

### Etapa 3 — Intención visual y curaduría (Completa / pulido en progreso)

- Dirección editorial y visual establecida.
- Iteraciones de legibilidad y tono continúan en superficies públicas.

### Etapa 4 — Prototipo núcleo (Completa)

- Base reproducible validada por tests en `prototype/mra-v0`.

### Consolidación v1.4 (Completa / implementación por fases)

- Consolidado de diseño en EN/ES y plan por fases en EN/ES.

### Etapa 5 — Prototipado selectivo (Completa)

- Sistema de permisos, diferenciación de personajes, eventos acotados y telemetría en producción pública.

### Etapa 6 — Prototipo integrado (En progreso actual)

- Flujo jugable canónico operativo de punta a punta.
- Integración entre estado, motor y UI en evolución modular.
- Puente narrativo de Parte 2 gateado por condiciones canónicas.

### Etapa 7 — Evaluación y lock de dirección (Planificada)

- Definición posterior al cierre de validaciones públicas y revisión de evidencia.

## Nota final

El roadmap expresa una estrategia deliberada: avanzar con control sistémico, trazabilidad y consistencia entre diseño, código y documentación.

Para detalle operativo fase por fase en español, ver:
`docs/es/plan-implementacion-v1.4.md`.
