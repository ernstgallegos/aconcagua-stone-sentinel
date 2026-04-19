import test from "node:test";
import assert from "node:assert/strict";
import handler from "./run.js";

const originalEnv = { ...process.env };

// Minimal req/res mocks for a Vercel-style serverless handler.
function mockReq({ method = "GET", query = {}, headers = {} } = {}) {
  return { method, query, headers };
}

function mockRes() {
  const res = { _status: null, _body: null, headers: {} };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  res.end = () => res;
  return res;
}

test("OPTIONS preflight returns 204", async () => {
  const req = mockReq({ method: "OPTIONS" });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 204);
});

test("OPTIONS preflight includes Access-Control-Max-Age header", async () => {
  const req = mockReq({ method: "OPTIONS" });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.headers["Access-Control-Max-Age"], "86400");
});

test("missing query params returns 400", async () => {
  const req = mockReq({ query: { scenario: "accumulated-fatigue-trap" } });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.error, /required/);
});

test("invalid input format returns 400", async () => {
  const req = mockReq({ query: { scenario: "bad scenario!", seed: "808", policy: "waiter" } });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 400);
  assert.match(res._body.error, /invalid input format/);
});

test("unknown run file returns 404 with expected filename", async () => {
  const req = mockReq({ query: { scenario: "no-such-scenario", seed: "1", policy: "cautious" } });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 404);
  assert.equal(res._body.error, "run not found in bundled samples");
  assert.equal(res._body.expected, "no-such-scenario-seed1-cautious.jsonl");
});

test("valid run returns 200 with run array, summary, and source", async () => {
  const req = mockReq({
    query: { scenario: "accumulated-fatigue-trap", seed: "808", policy: "waiter" },
  });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 200);
  assert.ok(Array.isArray(res._body.run), "run must be an array");
  assert.ok(res._body.run.length > 0, "run must have at least one turn");
  assert.ok("summary" in res._body, "response must include summary field");
  assert.equal(
    res._body.source,
    "prototype/mra-v0/runs/accumulated-fatigue-trap-seed808-waiter.jsonl"
  );
  // Each turn entry must have a turn number
  for (const entry of res._body.run) {
    assert.ok(typeof entry.turn === "number", "each run entry must have a turn number");
  }
});

test("security headers are set on valid request", async () => {
  const req = mockReq({
    query: { scenario: "accumulated-fatigue-trap", seed: "808", policy: "waiter" },
  });
  const res = mockRes();
  await handler(req, res);
  assert.ok(res.headers["X-Content-Type-Options"], "X-Content-Type-Options must be set");
  assert.ok(res.headers["Content-Security-Policy"], "Content-Security-Policy must be set");
  assert.ok(res.headers["X-RateLimit-Limit"], "X-RateLimit-Limit must be set");
  assert.ok(
    res.headers["Access-Control-Expose-Headers"],
    "Access-Control-Expose-Headers must be set so clients can read rate-limit headers"
  );
});

test("returns 503 on Vercel when distributed rate-limit backend is not configured", async () => {
  process.env.VERCEL = "1";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  const req = mockReq({
    query: { scenario: "accumulated-fatigue-trap", seed: "808", policy: "waiter" },
  });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res._status, 503);
  assert.match(res._body.error, /not configured/);
  process.env = { ...originalEnv };
});
