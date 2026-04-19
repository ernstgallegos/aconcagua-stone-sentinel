# Verdad del Repositorio — Contrato canónico de runtime y documentación

_Última actualización: abril de 2026._

## Prototipo activo
- **Prototipo activo canónico:** `prototype/web-v1`.
- **Autoridad canónica de consecuencias por turno:** `resolveTurn(state, action)` en `prototype/web-v1/engine/turn-resolution.js`.

## Artefacto congelado
- **Artefacto de compatibilidad congelado:** `prototype/mra-v0` (sin evolución de features; solo mantenimiento de compatibilidad/tests).

## Versión pública canónica
- **Versión pública canónica tras este sprint:** `v1.5.1`.
- Fuente de verdad de versión: `package.json` + `package-lock.json`, espejada en UI/docs/changelog.

## Verdad del roster
- **Parte 1 (activa):** 6 personajes completamente activos en `data/characters.json` (Francisco, Laura, Irina, Erik, Daniela, Blake).
- **Parte 2 (pública):** solo puente de preview con un camino público jugable (transferencia guiada); cartas adicionales bloqueadas de forma intencional.

## Outcomes canónicos
Los outcomes canónicos se definen en `data/outcomes.json` y se aplican en el pipeline del resolvedor:
- Summit and Safe Return
- High Point Return
- Strategic Retreat
- Rescue
- Collapse (Fatigue)
- Collapse (Exposure)
- Resource Exhaustion
- Expedition Window Closed
- Permit Expired
- Fatality

## Sistemas activos vs diferidos
### Activos hoy
- Pipeline canónico EP/BT/delta del resolvedor.
- Sistema de escenarios con seed y eventos dinámicos de clima/contexto.
- Subsistema acotado de eventos de personaje respaldado por `data/character_events.json`.
- Presión por ventana de decisión y export de telemetría (`run_log.json`).

### Diferidos
- Sistemas completos de expedición jugable de Parte 2.
- Cualquier capa de progresión no canónica (XP/árboles de habilidad fuera de alcance).

## Mapa de ownership de fuentes de verdad
- `data/*.json`: calibración de simulación y contratos de eventos acotados (incluye `data/context_events.json` y `data/character_events.json`). Ver `docs/data-contracts-guide.md` para esquemas y errores de validación.
- `prototype/web-v1/engine/*`: mecánicas canónicas deterministas por turno.
- `prototype/web-v1/ui/*`: render, wiring de input y presentación no autoritativa.
  - `ui/game-loop.js`: orquestación de resolución por turno (`createGameLoop(deps)`) mediante `handleDecision`.
  - `ui/flow-controller.js`: flujo de pantallas y modales (`initFlowController(hooks)`).
  - `ui/screens/debrief.js`: funciones puras de análisis de debrief.
  - `ui/helpers/screen-utils.js`: utilidades puras de UI/estado.
  - `ui/helpers/carousel.js`: builders de cards/carrusel y helpers de navegación.
  - `ui/helpers/narrative.js`: bancos narrativos EN/ES y selección/dispatch puros.
  - `ui/helpers/storage.js`: helpers seguros de escritura/borrado en `localStorage`.
  - `ui/event-registry.js`: dispatch centralizado `data-action` en lugar de `onclick` inline.
- `prototype/web-v1/ui/helpers/run-log.js`: contrato de serialización/export para `run_log.json`.
- `docs/repo-truth.md`: baseline canónico de estado del repo (con parity tests).
- `CHANGELOG.md`: ledger de cambios release/unreleased.

## Declaración canónica de autoridad por turno
Ninguna ruta de UI, helper o capa de eventos puede asignar outcomes terminales directamente ni saltear el flujo EP/BT/delta. Todos los outcomes de consecuencia deben emerger de `resolveTurn(state, action)`.

## Garantizado por tests
Las siguientes afirmaciones se validan explícitamente con parity/contract tests en `prototype/web-v1/tests/parity/*.test.js` y suites relacionadas:
- El prototipo activo sigue siendo `prototype/web-v1`.
- El artefacto congelado de compatibilidad sigue siendo `prototype/mra-v0`.
- La versión pública se mantiene sincronizada entre `package.json`, etiquetas UI y este documento.
- El roster de Parte 1 mantiene seis personajes activos.
- Los outcomes canónicos listados aquí coinciden con `data/outcomes.json`.
- La autoridad canónica de turno sigue siendo `resolveTurn(state, action)` con orden de pipeline forzado.
- El límite entre activo y diferido sigue explícito: Parte 1 jugable hoy; Parte 2 pública como puente preview/diferido.
