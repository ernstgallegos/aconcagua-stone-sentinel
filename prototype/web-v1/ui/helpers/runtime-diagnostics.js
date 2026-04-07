const DEBUG_MODE_KEY = 'aconcagua_debug_mode';
const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

export const DIAGNOSTIC_CATEGORY = Object.freeze({
  MISSING_FILE: 'missing file',
  HTTP_FAILURE: 'http failure',
  INVALID_JSON: 'invalid json',
  INVALID_SHAPE: 'invalid shape',
  POST_LOAD_VALIDATION_FAILURE: 'post-load validation failure',
  GENERIC_LOAD_FAILURE: 'generic load failure',
});

function readMessage(error) {
  return String(error?.message || error || '').trim();
}

export function classifyDataLoadError(error) {
  const message = readMessage(error);
  if (/^\[missing file\]/i.test(message)) return DIAGNOSTIC_CATEGORY.MISSING_FILE;
  if (/^\[http failure\]/i.test(message)) return DIAGNOSTIC_CATEGORY.HTTP_FAILURE;
  if (/^\[invalid JSON\]/i.test(message)) return DIAGNOSTIC_CATEGORY.INVALID_JSON;
  if (/\$|expected/i.test(message)) return DIAGNOSTIC_CATEGORY.INVALID_SHAPE;
  return DIAGNOSTIC_CATEGORY.GENERIC_LOAD_FAILURE;
}

export function formatRuntimeDiagnosticReport(payload, context = 'startup') {
  const category = payload?.category || 'unknown';
  const source = payload?.file || 'unknown';
  const detail = payload?.detail || payload?.message || 'No details provided.';
  return [
    `[web-v1][${context}] category=${category}`,
    `source=${source}`,
    `detail=${detail}`,
  ].join(' | ');
}

export function shouldLogRuntimeDiagnostics() {
  try {
    const host = globalThis?.location?.hostname || '';
    if (DEV_HOSTS.has(host)) return true;
    const debugFlag = String(globalThis?.localStorage?.getItem?.(DEBUG_MODE_KEY) || '').toLowerCase();
    return debugFlag === '1';
  } catch (_) {
    return false;
  }
}

export function reportRuntimeDiagnostic(payload, { context = 'startup', level = 'error' } = {}) {
  if (!shouldLogRuntimeDiagnostics()) return;
  const line = formatRuntimeDiagnosticReport(payload, context);
  const writer = level === 'warn' ? console.warn : console.error;
  writer(line);
}
