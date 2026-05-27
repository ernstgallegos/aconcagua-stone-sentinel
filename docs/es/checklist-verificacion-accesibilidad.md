# Checklist de Verificación de Accesibilidad (flujos públicos web-v1)

Use este checklist rápido para cambios en la UI orientados a release.

## Alcance

Verificar como mínimo:
- title
- expedition setup
- onboarding modal
- game
- debrief
- summit-success
- puente part2 (`part2-character` + secuencia narrativa)

## Teclado y foco

- [ ] Cada control interactivo es alcanzable con navegación solo por teclado.
- [ ] El indicador de foco es visible en controles primarios y botones de iconos.
- [ ] `Escape` cierra overlays/modales compartidos consistentemente.
- [ ] El foco regresa al control que lo activó después de cerrar un modal.

## Semántica y etiquetas

- [ ] Los diálogos usan `role="dialog"` + `aria-modal="true"` y tienen un nombre accesible apropiado.
- [ ] Los controles solo con iconos incluyen `aria-label` explícito.
- [ ] Los controles agrupados exponen etiquetas comprensibles (`aria-label`/`aria-labelledby`).
- [ ] El texto de estado/timer que cambia durante el juego usa comportamiento `aria-live` apropiado.

## Claridad para lectores de pantalla

- [ ] Los estados deep-link/startup/fatal exponen texto significativo (sin fallos silenciosos).
- [ ] El resumen de resultado/debrief permanece comprensible sin estilizado visual.
- [ ] El estado de bloqueo de Parte 2 comunica el gateo intencional (no contenido faltante).

## Evidencia de validación sugerida

```bash
npm test
npm run test:contracts
```

Para cambios visibles, incluir un artefacto de captura de pantalla en el reporte final.
