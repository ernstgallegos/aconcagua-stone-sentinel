/**
 * runtime-diagnostics.js
 *
 * Centralized developer-facing diagnostic logging for web-v1 startup and
 * data-loading pipelines.
 *
 * ── Contract ─────────────────────────────────────────────────────────────────
 * • Emits to console only on localhost / debug-flag environments.
 * • Production deploys are SILENT — player-facing error copy lives in
 *   startup-ui.js::renderBlockingError(), NOT here.
 * • Each log entry is tagged with a structured category so tooling and
 *   automated tests can distinguish transport vs. parse vs. contract defects.
 *
 * ── Supported categories ─────────────────────────────────────────────────────
 *   'missing-file'     — required data file absent from deployed bundle (404)
 *   'http-failure'     — required file returned a non-404 HTTP error
 *   'invalid-json'     — file loaded but JSON.parse() threw
 *   'invalid-shape'    — file parsed but failed data-contract shape checks
 *   'post-load-failure'— all files loaded, but cross-file validation failed
 *   'generic'          — any other diagnostic not covered above
 */

const VALID_CATEGORIES = new Set([
  'missing-file',
  'http-failure',
  'invalid-json',
  'invalid-shape',
  'post-load-failure',
  'generic',
]);

function isDebugEnvironment() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') return true;
  if (typeof window.__ACONCAGUA_DEBUG__ !== 'undefined') return !!window.__ACONCAGUA_DEBUG__;
  return false;
}

/**
 * logDiagnostic — emit a structured developer-facing log entry.
 *
 * @param {'missing-file'|'http-failure'|'invalid-json'|'invalid-shape'|'post-load-failure'|'generic'} category
 * @param {string} message   Short summary of what went wrong.
 * @param {unknown} [detail] Optional extra context (file path, error object, etc.).
 */
export function logDiagnostic(category, message, detail) {
  if (!isDebugEnvironment()) return;

  const safeCategory = VALID_CATEGORIES.has(category) ? category : 'generic';
  const prefix = `[aconcagua:${safeCategory}]`;

  if (detail !== undefined) {
    // eslint-disable-next-line no-console
    console.error(prefix, message, detail);
  } else {
    // eslint-disable-next-line no-console
    console.error(prefix, message);
  }
}
