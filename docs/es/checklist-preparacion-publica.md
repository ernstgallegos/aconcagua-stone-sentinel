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
pytest prototype/mra-v0/test_simulator.py -v
python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('.').rglob('*.json'):
    json.loads(p.read_text(encoding='utf-8'))
print('all-json-ok')
PY
```

- [ ] Todas las puertas pasan localmente.
- [ ] Cualquier check omitido incluye razón explícita en notas del PR.
- [ ] El PR/reporte final incluye los comandos exactos ejecutados para cada puerta validada.

## 3) Documentación y gobernanza

- [ ] `CHANGELOG.md` actualizado (formato Keep a Changelog).
- [ ] `CONTRIBUTING.md` sigue reflejando comandos/CI vigentes.
- [ ] Los enlaces a `SECURITY.md` y `CODE_OF_CONDUCT.md` desde README están vigentes.

## 4) Verificación de front-end

- [ ] Para cambios visibles de UI, incluir screenshot actualizado.
- [ ] El smoke flow mantiene title → setup → onboarding → game → outcomes.

## 5) Higiene de release

- [ ] Sin contradicciones entre README, docs de arquitectura y changelog.
- [ ] Sin referencias obsoletas a mecánicas/features removidos.
- [ ] Actualizaciones de deuda técnica reflejadas en `docs/technical-debt-register.md` y changelog cuando corresponda.
