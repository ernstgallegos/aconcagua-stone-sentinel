# API Contract — `api/run.js`

This document is the canonical contract for the `/api/run` endpoint served by the Vercel serverless function in `api/run.js`.

## Purpose

Returns a pre-computed simulation run from the bundled sample run library (`prototype/mra-v0/runs/`). This endpoint supports the in-repo run viewer and any external tooling that needs to read archived MRA-v0 runs without executing a live simulation.

---

## Request

### Method

`GET`

### Query Parameters

| Parameter | Required | Format | Constraints |
|---|---|---|---|
| `scenario` | ✅ | `[a-z0-9-]+` | max 60 characters |
| `seed` | ✅ | `[0-9]+` | max 16 digits |
| `policy` | ✅ | `[a-z0-9-]+` | max 30 characters |

All three parameters must be present. The run file is resolved as:

```
prototype/mra-v0/runs/{scenario}-seed{seed}-{policy}.jsonl
```

### Example

```
GET /api/run?scenario=assisted-route&seed=101&policy=conservative
```

---

## Response

### 200 OK

```json
{
  "run": [
    { "turn": 1, "action": "advance", "outcome": "Strategic Retreat", ... },
    ...
  ],
  "summary": {
    "finalOutcome": "Strategic Retreat",
    "totalTurns": 28,
    ...
  },
  "source": "prototype/mra-v0/runs/assisted-route-seed101-conservative.jsonl"
}
```

- `run`: Array of turn-entry objects (entries with a `"turn"` key in the JSONL file).
- `summary`: The run summary object (from the JSONL entry with `"summary"` key), or `null` if not present in the file.
- `source`: Relative path to the resolved run file.

### 400 Bad Request

```json
{ "error": "scenario, seed, and policy are required" }
```

or

```json
{ "error": "invalid input format" }
```

or

```json
{ "error": "invalid input length: scenario<=60, policy<=30, seed<=16" }
```

### 404 Not Found

```json
{
  "error": "run not found in bundled samples",
  "expected": "assisted-route-seed999-conservative.jsonl"
}
```

### 429 Too Many Requests

```json
{ "error": "rate limit exceeded", "retry_after_ms": 60000 }
```

Rate limit defaults: 30 requests per 60-second window (configurable via environment variables).

### 500 Internal Server Error

```json
{
  "error": "run file is malformed or unreadable",
  "file": "assisted-route-seed101-conservative.jsonl",
  "detail": "..."
}
```

---

## Security Headers

Every response includes:

| Header | Value |
|---|---|
| `Access-Control-Allow-Origin` | Matched origin (from `ALLOWED_ORIGINS` env var) or `"null"` |
| `Vary` | `Origin` |
| `Access-Control-Allow-Methods` | `GET, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` |
| `X-RateLimit-Limit` | Rate limit ceiling |
| `X-RateLimit-Remaining` | Remaining requests in the current window |

---

## CORS Configuration

Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated list). If not set, a hardcoded fallback is used (`https://aconcagua-stone-sentinel.vercel.app`). **Always set `ALLOWED_ORIGINS` in production Vercel project settings.**

---

## Rate Limiting

In-memory per-IP rate limiting.

| Setting | Environment variable | Default |
|---|---|---|
| Window | `API_RATE_LIMIT_WINDOW_MS` | `60000` (60 s) |
| Max requests | `API_RATE_LIMIT_MAX` | `30` |

IP is read from `x-forwarded-for` → `x-real-ip` → `socket.remoteAddress`.

---

## Preflight (OPTIONS)

`OPTIONS` requests return `204 No Content` with all CORS headers applied.

---

## Run File Format (JSONL)

Each line in a run file is a JSON object of one of two shapes:

**Turn entry:**
```json
{ "turn": 1, "action": "advance", "outcome": "Strategic Retreat", ... }
```

**Summary entry:**
```json
{ "summary": { "finalOutcome": "Strategic Retreat", "totalTurns": 28, ... } }
```

The summary entry, if present, is the last non-turn line in the file. All turn entries have a `"turn"` key; the summary entry has a `"summary"` key.

---

## Contract Test

`api/run.test.js` covers: required-parameter validation, input format/length rejection, summary extraction, and the `run`/`source` shape. Run via:

```bash
npm run test:api
```
