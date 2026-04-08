# Checklist de Preparación Pública (Repositorio)

Este checklist es la pasada final antes de considerar un sprint como público y listo para revisión externa.

## 1) Verdad de producto/runtime

- [ ] `docs/repo-truth.md`, `package.json` y las etiquetas de versión visibles en UI están alineadas.
- [ ] `data/outcomes.json` sigue alineado con resolver y simuladores.
- [ ] `README.md` / `README.es.md` describen el flujo y estado actualmente observables.

## 2) Puertas de calidad de ingeniería

Ejecutar y registrar:

```bash
npm run typecheck
npm test
npm run test:contracts
pytest prototype/mra-v0/test_simulator.py -v
npm run validate:json
npm run smoke:release
```

> **Prerrequisitos:**
> - `pytest` requiere Python 3 con los paquetes de `requirements-dev.txt` (`pip install -r requirements-dev.txt`). Valida exclusivamente el simulador congelado `mra-v0`; un fallo aquí no bloquea releases de web-v1, pero debe documentarse.
> - `npm run smoke:release` requiere conexión de red activa y una URL desplegada. No puede ejecutarse solo en local. Usar una URL de preview de Vercel o la URL canónica de producción. Omitir con justificación explícita si el deploy aún no está disponible.

- [ ] Todas las puertas pasan localmente.
- [ ] `npm run smoke:release` pasó contra la URL canónica desplegada (o contra una URL candidata de release explicitada).
- [ ] Cualquier check omitido incluye razón explícita en notas del PR.
- [ ] El PR/reporte final incluye los comandos exactos ejecutados para cada puerta validada.

## 3) Documentación y gobernanza

- [ ] `CHANGELOG.md` actualizado (formato Keep a Changelog).
- [ ] `CONTRIBUTING.md` sigue reflejando comandos/CI vigentes.
- [ ] Los enlaces a `SECURITY.md` y `CODE_OF_CONDUCT.md` desde README están vigentes.
- [ ] `docs/data-contracts-guide.md` refleja cualquier cambio de esquema en `characters.json`, `character_events.json`, `context_events.json` o `nodes.json`.
- [ ] La tabla de IDs de pantalla en `docs/deep-links-summary.md` coincide con todas las entradas `<section id="screen-…">` de `prototype/web-v1/index.html`.

## 4) Verificación de front-end

- [ ] Para cambios visibles de UI, incluir screenshot actualizado.
- [ ] El smoke flow mantiene title → setup → onboarding → game → outcomes.

## 5) Higiene de release

- [ ] Sin contradicciones entre README, docs de arquitectura y changelog.
- [ ] Sin referencias obsoletas a mecánicas/features removidos.
- [ ] Actualizaciones de deuda técnica reflejadas en `docs/technical-debt-register.md` y changelog cuando corresponda.
