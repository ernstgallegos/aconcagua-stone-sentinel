# Troubleshooting

Operational troubleshooting for the public prototype (`prototype/web-v1`).

## 1) Title screen does not enable "Begin"

Symptoms:
- "Begin" remains disabled.
- Startup line stays in loading/error.

Checks:
1. Open browser console and inspect startup diagnostics.
2. Confirm required files under `data/` exist and are valid JSON.
3. Run local validators:

```bash
python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('data').glob('*.json'):
    json.loads(p.read_text(encoding='utf-8'))
print('data-json-ok')
PY
npm test
```

## 2) Fatal screen after opening a deep-link

Symptoms:
- URL hash opens `fatal-error` with category `invalid deep-link`.

Cause:
- `character` or `scenario` hash params are invalid for the current build.

Fix:
- Use IDs present in `data/characters.json` and `data/scenarios_web_v1.json`.
- Remove hash params to return to default title/setup flow.

## 3) Character portrait appears late on setup

Mitigation in current build:
- Initial setup card portraits are now eager-loaded and first assets are preloaded.

If issues persist:
- Validate asset paths under `art/characters/*.png`.
- Confirm no CDN/proxy is stripping static image paths.

## 4) Overlay feels "stuck"

Expected controls:
- `Escape` closes intro/tutorial/onboarding/help/watch/field-log overlays.
- Clicking the backdrop closes the same overlay.

If focus appears trapped, refresh and retry with keyboard-only flow; report selector + screen ID if reproducible.

## 5) Local smoke run

```bash
npm run typecheck
npm test
pytest prototype/mra-v0/test_simulator.py -v
```
