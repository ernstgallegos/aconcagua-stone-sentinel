# Routing and Deploy Reference (Canonical)

This document is the single source of truth for public entry routes, local preview URLs, and Vercel deployment routing.

## English

### Canonical public routes

- `/` → canonical entry point, redirected to `/prototype/web-v1/index.html`.
- `/prototype/web-v1` → normalized to `/prototype/web-v1/index.html`.
- `/prototype/mra-v0/viewer` → archived legacy viewer, normalized to `/prototype/mra-v0/viewer/index.html`.

### Local static preview

From repository root:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/` (canonical entry, redirects immediately to web-v1)
- `http://localhost:4173/prototype/web-v1/` (direct web-v1)
- `http://localhost:4173/prototype/mra-v0/viewer/` (archived MRA v0 viewer)

In local static mode, archived viewer run files are loaded from `prototype/mra-v0/runs/`.

### Vercel deployment

- Root Directory: repository root (`.`).
- Framework preset: `Other`.
- Build command: not required.
- Routing behavior is defined in `vercel.json`.

### API CORS allowlist (`api/run.js`)

Set `ALLOWED_ORIGINS` as comma-separated exact origins when production domains differ from repository defaults.

Example:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

---

## Español

### Rutas públicas canónicas

- `/` → entrada canónica, redirigida a `/prototype/web-v1/index.html`.
- `/prototype/web-v1` → normalizada a `/prototype/web-v1/index.html`.
- `/prototype/mra-v0/viewer` → visor histórico archivado, normalizado a `/prototype/mra-v0/viewer/index.html`.

### Preview estático local

Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Luego abrir:

- `http://localhost:4173/` (entrada canónica, redirige inmediatamente a web-v1)
- `http://localhost:4173/prototype/web-v1/` (acceso directo a web-v1)
- `http://localhost:4173/prototype/mra-v0/viewer/` (visor archivado MRA v0)

En modo estático local, el visor archivado carga corridas desde `prototype/mra-v0/runs/`.

### Deploy en Vercel

- Root Directory: raíz del repositorio (`.`).
- Framework preset: `Other`.
- Build command: no requerido.
- El comportamiento de ruteo está definido en `vercel.json`.

### Allowlist CORS de la API (`api/run.js`)

Configurar `ALLOWED_ORIGINS` como lista separada por comas de orígenes exactos cuando el dominio productivo difiera de los defaults del repo.

Ejemplo:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```
