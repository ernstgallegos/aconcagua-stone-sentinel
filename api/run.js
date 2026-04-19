import { readFile, access } from "node:fs/promises";
import path from "node:path";

const rateWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
const rateMaxRequests = Number(process.env.API_RATE_LIMIT_MAX || 30);
const requestCounters = new Map();
let cleanupTick = 0;

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const FALLBACK_ORIGINS = [
  "https://aconcagua-stone-sentinel.vercel.app",
  "https://www.aconcagua-stone-sentinel.vercel.app",
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

  const rate = checkRateLimit(getClientIp(req));
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
