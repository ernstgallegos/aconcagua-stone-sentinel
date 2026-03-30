# Troubleshooting (web-v1)

This guide documents common failure modes for the public `prototype/web-v1` runtime and the fastest repository-grounded checks.

## Startup shows **Model unavailable**

`web-v1` blocks gameplay when required data contracts fail.

### What to verify

1. Run `npm test` and inspect `prototype/web-v1/tests/smoke/model-ready.test.js` failures.
2. Parse all JSON files:
   ```bash
   python3 - <<'PY'
   import json, pathlib
   for p in pathlib.Path('.').rglob('*.json'):
       json.loads(p.read_text(encoding='utf-8'))
   print('all-json-ok')
   PY
   ```
3. Confirm all required files exist:
   - `data/nodes.json`
   - `data/environmental_pressure_config.json`
   - `data/action_modifiers.json`
   - `data/stage_modifiers.json`
   - `data/characters.json`
   - `data/character_events.json`
   - `data/context_events.json`
   - `data/outcomes.json`
   - `data/scenarios.web-v1.json`

## Portraits or cover images fail to load

Critical visual assets are now contract-tested.

### What to verify

1. Run `npm test` and inspect `prototype/web-v1/tests/contracts/assets-contracts.test.js`.
2. Confirm these critical files exist:
   - `art/cover/cover-concept-1.png`
   - `art/characters/random.png`
   - `art/concept-art/curated/concept-curated-4.webp`
3. Confirm each character id in `data/characters.json` has a matching portrait in either:
   - `art/characters/<id>.png` (or `blake-harris.png`), or
   - `art/characters/part-2/<id>.png`.

## Deep-link seed behaves unexpectedly

Deep-links with invalid `seed` values are ignored and replaced by safe scenario/default seeds.

### What to verify

- Use numeric seeds only (`#game&character=francisco&scenario=assisted-route&seed=4242`).
- On localhost dev hosts, invalid seed parameters emit a runtime diagnostic in the console.

## Keyboard appears "stuck" after opening overlays

Help/watch/field-log overlays trap focus while open and restore focus when closed.

### What to verify

- Press `Escape` to close the topmost overlay.
- Run modal tests:
  ```bash
  npm test -- prototype/web-v1/tests/unit/accessibility-modal.test.js
  ```

## Release readiness command set

Run before shipping public-facing changes:

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
