import { readFile, access } from "node:fs/promises";
import path from "node:path";

const rateWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
const rateMaxRequests = Number(process.env.API_RATE_LIMIT_MAX || 30);
const requestCounters = new Map();
let cleanupTick = 0;
const KV_REST_API_URL = process.env.KV_REST_API_URL || "";
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || "";

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const FALLBACK_ORIGINS = [
  "https://aconcaguastonesentinel.com",
  "https://www.aconcaguastonesentinel.com",
];

function getAllowedOrigins() {
  const configured = splitCsv(process.env.ALLOWED_ORIGINS);
  if (configured.length > 0) return configured;

  // In production (Vercel), ALLOWED_ORIGINS should always be set via
  // Vercel Project Settings → Environment Variables. Log a structured
  // warning that is visible in function logs for operational monitoring.
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const level = isVercel ? "error" : "warn";
  console[level](
    JSON.stringify({
      source: "api/run",
      event: "allowed_origins_fallback",
      message: "ALLOWED_ORIGINS env var not set — using hardcoded fallback origins.",
      action: "Set ALLOWED_ORIGINS in Vercel Project Settings for production.",
      isVercel,
    })
  );
  return FALLBACK_ORIGINS;
}

function resolveOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return "null";
  return getAllowedOrigins().includes(origin) ? origin : "null";
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  cleanupTick += 1;
  if (cleanupTick % 25 === 0 || requestCounters.size > 500) {
    for (const [key, value] of requestCounters.entries()) {
      if (value.start + rateWindowMs < now) {
        requestCounters.delete(key);
      }
    }
  }

  const current = requestCounters.get(ip);
  if (!current || now - current.start > rateWindowMs) {
    requestCounters.set(ip, { start: now, count: 1 });
    return { limited: false, remaining: rateMaxRequests - 1 };
  }

  current.count += 1;
  requestCounters.set(ip, current);
  const limited = current.count > rateMaxRequests;
  return { limited, remaining: Math.max(0, rateMaxRequests - current.count) };
}

function hasDistributedRateLimitConfig() {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

async function callKv(pathname) {
  const endpoint = `${KV_REST_API_URL.replace(/\/$/, "")}/${pathname}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`kv-http-${response.status}`);
  }
  const body = await response.json();
  return body?.result;
}

async function checkRateLimitDistributed(ip) {
  const key = `api:run:ratelimit:${ip}`;
  const windowSeconds = Math.max(1, Math.ceil(rateWindowMs / 1000));
  const count = Number(await callKv(`incr/${encodeURIComponent(key)}`));
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("kv-invalid-counter");
  }
  if (count === 1) {
    await callKv(`expire/${encodeURIComponent(key)}/${windowSeconds}`);
  }
  return {
    limited: count > rateMaxRequests,
    remaining: Math.max(0, rateMaxRequests - count),
  };
}

function applySecurityHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Origin", resolveOrigin(req));
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}

function parseJsonl(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export default async (req, res) => {
  applySecurityHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const canUseDistributedRateLimit = hasDistributedRateLimitConfig();
  if (isVercel && !canUseDistributedRateLimit) {
    return res.status(503).json({
      error: "rate limit backend is not configured",
      detail: "Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel environment variables.",
    });
  }

  let rate;
  try {
    const clientIp = getClientIp(req);
    rate = canUseDistributedRateLimit
      ? await checkRateLimitDistributed(clientIp)
      : checkRateLimit(clientIp);
  } catch (error) {
    return res.status(503).json({
      error: "rate limit backend unavailable",
      detail: error.message,
    });
  }
  res.setHeader("X-RateLimit-Limit", String(rateMaxRequests));
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  res.setHeader("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining");
  if (rate.limited) {
    return res.status(429).json({ error: "rate limit exceeded", retry_after_ms: rateWindowMs });
  }

  const { scenario, seed, policy } = req.query;
  if (!scenario || !seed || !policy) {
    return res.status(400).json({ error: "scenario, seed, and policy are required" });
  }

  const safe = /^[a-z0-9-]+$/;
  if (!safe.test(scenario) || !safe.test(policy) || !/^\d+$/.test(String(seed))) {
    return res.status(400).json({ error: "invalid input format" });
  }

  if (String(scenario).length > 60 || String(policy).length > 30 || String(seed).length > 16) {
    return res.status(400).json({ error: "invalid input length: scenario<=60, policy<=30, seed<=16" });
  }

  const runFile = `${scenario}-seed${seed}-${policy}.jsonl`;
  const fullPath = path.join(process.cwd(), "prototype", "mra-v0", "runs", runFile);

  try {
    await access(fullPath);
  } catch {
    return res.status(404).json({
      error: "run not found in bundled samples",
      expected: runFile,
    });
  }

  let lines;
  try {
    const content = await readFile(fullPath, "utf8");
    lines = parseJsonl(content);
  } catch (err) {
    return res.status(500).json({
      error: "run file is malformed or unreadable",
      file: runFile,
      detail: err.message,
    });
  }

  const summaryLine = lines.find((entry) => entry.summary);
  const run = lines.filter((entry) => entry.turn);

  return res.status(200).json({
    run,
    summary: summaryLine ? summaryLine.summary : null,
    source: `prototype/mra-v0/runs/${runFile}`,
  });
};
