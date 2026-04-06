# Routing and Deploy Reference (Canonical)

This document is the single source of truth for public entry routes, local preview URLs, and Vercel deployment routing.

## English

### Canonical public routes

- `/` → canonical public landing page, with a primary CTA to `/prototype/web-v1/index.html`.
- `/prototype/web-v1` → normalized to `/prototype/web-v1/index.html`.
- `/prototype/mra-v0/viewer` → archived legacy viewer, normalized to `/prototype/mra-v0/viewer/index.html`.

### Local static preview

From repository root:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/` (canonical landing page with a prominent play CTA to web-v1)
- `http://localhost:4173/prototype/web-v1/` (direct web-v1)
- `http://localhost:4173/prototype/mra-v0/viewer/` (archived MRA v0 viewer)

In local static mode, archived viewer run files are loaded from `prototype/mra-v0/runs/`.

### Vercel deployment

- Root Directory: repository root (`.`).
- Framework preset: `Other`.
- Build command: not required.
- Routing behavior is defined in `vercel.json`.


### API rate-limit limitation (current behavior)

`api/run.js` currently uses an in-memory `Map` counter per process instance.

- Single-instance/local preview: limits behave as expected for one process.
- Multi-instance/serverless deployments: counters are not shared across instances, so limits are **best-effort per instance**, not a global quota.

This limitation is intentionally documented as current state for this release hardening pass; no distributed/persistent backend is implemented in this repository scope.

### API CORS allowlist (`api/run.js`)

Set `ALLOWED_ORIGINS` as comma-separated exact origins when production domains differ from repository defaults.

Example:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

---

## Español

### Rutas públicas canónicas

- `/` → landing pública canónica, con CTA principal a `/prototype/web-v1/index.html`.
- `/prototype/web-v1` → normalizada a `/prototype/web-v1/index.html`.
- `/prototype/mra-v0/viewer` → visor histórico archivado, normalizado a `/prototype/mra-v0/viewer/index.html`.

### Preview estático local

Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Luego abrir:

- `http://localhost:4173/` (landing canónica con CTA destacado para jugar web-v1)
- `http://localhost:4173/prototype/web-v1/` (acceso directo a web-v1)
- `http://localhost:4173/prototype/mra-v0/viewer/` (visor archivado MRA v0)

En modo estático local, el visor archivado carga corridas desde `prototype/mra-v0/runs/`.

### Deploy en Vercel

- Root Directory: raíz del repositorio (`.`).
- Framework preset: `Other`.
- Build command: no requerido.
- El comportamiento de ruteo está definido en `vercel.json`.


### Limitación actual de rate limit en API

`api/run.js` usa hoy un contador en memoria (`Map`) por instancia de proceso.

- Instancia única/preview local: el límite funciona como se espera para ese proceso.
- Deploy multi-instancia/serverless: los contadores no se comparten entre instancias, por lo que el límite es **best-effort por instancia**, no una cuota global.

Esta limitación queda documentada explícitamente como estado actual en este pass de estabilización; no se implementa backend distribuido/persistente dentro del alcance de este repositorio.

### Allowlist CORS de la API (`api/run.js`)

Configurar `ALLOWED_ORIGINS` como lista separada por comas de orígenes exactos cuando el dominio productivo difiera de los defaults del repo.

Ejemplo:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```
