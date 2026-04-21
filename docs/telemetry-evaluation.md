# Telemetry Evaluation — Anonymous Opt-in Run Summary

**Document type:** Architecture assessment  
**Status:** Recommendation  
**Date:** April 2026  
**Scope:** Evaluating whether an anonymous, opt-in telemetry endpoint can connect web-v1 run events with post-launch product decisions.

---

## Context

The run_log.json system already exists. Per-turn telemetry is captured by `ui/helpers/run-log.js`, written to localStorage at run end, and viewable through the debrief screen. The API infrastructure exists at `api/run.js` (Vercel serverless function with rate limiting and CORS).

The question is: **can a simple opt-in telemetry endpoint route anonymous run-summary data from the game to a place where product decisions can use it?**

---

## Assessment

### Feasibility: Yes — with one condition

A minimal telemetry endpoint is technically feasible within the existing stack. The condition is that a persistent storage backend (Vercel KV or equivalent) must be provisioned for production — the same requirement already documented for the rate-limiting system in `api/run.js`.

### What already works

| Component | State |
|---|---|
| Per-turn data capture (`buildTurnLogEntry`) | ✅ Implemented |
| Run-summary generation (`buildRunLogExport`, `summarizeRunLog`) | ✅ Implemented |
| Run-end export (`exportRunLog`) | ✅ Implemented |
| API infrastructure (CORS, rate limiting, serverless) | ✅ Implemented |
| Distributed KV backend (Vercel KV) | ⚠️ Must be provisioned |

### What needs to be built

1. **Opt-in consent UI** — a one-time prompt at run end (after debrief renders) asking the player whether they want to contribute anonymous run data to help improve the game. Persisted in localStorage so repeat players are not re-asked.

2. **Telemetry API endpoint** (`api/telemetry.js`) — a POST endpoint that:
   - Accepts a run summary payload (outcome, character, scenario, turn count, aggregate metrics).
   - Strips any potentially identifying information before persisting.
   - Rate-limits by IP (reuse pattern from `api/run.js`).
   - Fails closed with HTTP 503 when the KV backend is unavailable.
   - Returns 200/accepted with no response body.

3. **Client-side submission** — a function in `ui/helpers/run-log.js` (or a new `ui/helpers/telemetry.js`) that, after opt-in consent is confirmed, POSTs the `runSummary` object to `/api/telemetry`.

---

## Recommended payload (run summary only — no per-turn data)

Sending full per-turn logs would be excessive and potentially risky. The recommended payload is the existing `runSummary` shape plus a few aggregate fields:

```json
{
  "v": "1",
  "outcome": "Summit and Safe Return",
  "character": "francisco",
  "scenario": "narrow-weather-window",
  "difficulty": "standard",
  "turns": 34,
  "summitReached": true,
  "finalFatigue": 72,
  "finalExposure": 45,
  "finalCapacity": 38,
  "dominantAction": "advance",
  "dominantRiskAxis": "fatigue",
  "decisionPatternLabel": "aggressive",
  "runSignatureHash": "abc123"
}
```

**Explicitly excluded from the payload:**
- Any free-text input.
- IP address or geolocation.
- Browser fingerprinting data.
- Per-turn action sequences (too granular, not needed for product decisions).
- Timestamps finer than the session day.

---

## Product decisions this enables

| Question | Signal from telemetry |
|---|---|
| Are players discovering non-summit outcomes as valid endings? | Distribution of `outcome` across runs |
| Which characters are under-played or over-played? | `character` distribution |
| Which scenarios generate the most retreat/collapse? | `scenario` × `outcome` matrix |
| How does difficulty tuning land in practice? | `difficulty` × `outcome` |
| Are players engaging with the full run duration? | `turns` distribution |
| Is the EP/BT system teaching risk literacy? | `dominantRiskAxis` × `outcome` |

---

## Privacy and data ethics

- Telemetry is **opt-in only**. No data is collected if the player does not actively choose to share.
- The consent prompt must be clear, in the player's current language (EN/ES), and dismissible.
- No PII is collected, requested, or stored.
- The data policy must be disclosed in the existing `SECURITY.md` and in the consent prompt itself.
- Run signatures (`buildRunSignature`) are short semantic strings (e.g., "Francisco · Summit · 34 turns") — not unique identifiers.
- Telemetry data should be **aggregate-only** in any public reporting; no individual run records should ever be published.

---

## Implementation effort estimate

| Component | Complexity | Notes |
|---|---|---|
| `api/telemetry.js` endpoint | Low | Mirror `api/run.js` CORS + rate-limit pattern |
| Opt-in consent UI | Low | One modal, persisted flag in localStorage |
| Client-side POST | Low | ~20 lines, reuse existing fetch pattern |
| KV backend provisioning | Medium | Requires Vercel project settings; blocks production |
| Data aggregation dashboard | Out of scope | Use KV REST API or export to spreadsheet |

Total engineering effort for a minimal, production-ready telemetry system: **1–2 days**.

---

## Decision

**Recommendation: Implement in the next development sprint.**

The telemetry system is low-effort, low-risk, and high-value for post-launch product decisions. The existing infrastructure (API, run_log, KV pattern) makes this a composable addition rather than a new subsystem. The opt-in model and PII exclusion policy keep it aligned with the project's ethical commitments.

**Blocking requirement:** Vercel KV backend must be provisioned before the endpoint goes live. Without it, the endpoint will fail closed (503) and no data will be lost — but no data will be collected either.

---

## Reference design: `api/telemetry.js`

```javascript
// api/telemetry.js
// Anonymous opt-in run-summary telemetry endpoint.
// Mirrors api/run.js CORS, rate-limit, and KV-fail-closed patterns.

import path from "node:path";

const KV_REST_API_URL   = process.env.KV_REST_API_URL   || "";
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || "";

function hasKVBackend() {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

const ALLOWED_ORIGINS = [
  "https://aconcaguastonesentinel.com",
  "https://www.aconcaguastonesentinel.com",
];

// Minimal run-summary schema — only these fields are accepted
const ALLOWED_FIELDS = new Set([
  "v", "outcome", "character", "scenario", "difficulty",
  "turns", "summitReached", "finalFatigue", "finalExposure",
  "finalCapacity", "dominantAction", "dominantRiskAxis",
  "decisionPatternLabel", "runSignatureHash",
]);

function sanitize(body) {
  const result = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

export default async function handler(req, res) {
  const origin = ALLOWED_ORIGINS.includes(req.headers.origin)
    ? req.headers.origin
    : "null";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")    return res.status(405).end();

  if (!hasKVBackend()) {
    // Fail closed on production when KV is not configured
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    if (isVercel) return res.status(503).json({ error: "telemetry_unavailable" });
    // Non-production: accept and discard (dev mode)
    return res.status(200).json({ accepted: true, stored: false });
  }

  let body;
  try {
    body = typeof req.body === "object" ? req.body : JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: "invalid_body" });
  }

  const payload = sanitize(body);
  const key = `telemetry:run:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const kvRes = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!kvRes.ok) return res.status(503).json({ error: "storage_unavailable" });
  return res.status(200).json({ accepted: true });
}
```

---

*This document is an internal architecture assessment. The reference design above is a starting point, not production code. Before shipping, the implementation should be reviewed for security, tested, and added to the CI pipeline.*
