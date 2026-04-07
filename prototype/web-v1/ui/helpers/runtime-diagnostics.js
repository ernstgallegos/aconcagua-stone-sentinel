const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);
const DEBUG_STORAGE_KEY = 'aconcagua_debug_mode';

export const DIAGNOSTIC_CATEGORIES = Object.freeze({
  MISSING_FILE: 'missing file',
  HTTP_FAILURE: 'http failure',
  INVALID_JSON: 'invalid json',
  INVALID_SHAPE: 'invalid shape',
  POST_LOAD_VALIDATION_FAILURE: 'post-load validation failure',
  GENERIC_LOAD_FAILURE: 'generic load failure',
});

function getHostName() {
  try {
    return globalThis?.location?.hostname || '';
  } catch (_) {
    return '';
  }
}

function isDebugModeEnabled() {
  try {
    return String(globalThis?.localStorage?.getItem?.(DEBUG_STORAGE_KEY) || '').toLowerCase() === '1';
  } catch (_) {
    return false;
  }
}

export function shouldEmitRuntimeDiagnostics() {
  const host = getHostName();
  return DEV_HOSTS.has(host) || isDebugModeEnabled();
}

export function classifyLoadDiagnostic(errorMessage = '') {
  if (/^\[missing file\]/i.test(errorMessage)) return DIAGNOSTIC_CATEGORIES.MISSING_FILE;
  if (/^\[http failure\]/i.test(errorMessage)) return DIAGNOSTIC_CATEGORIES.HTTP_FAILURE;
  if (/^\[invalid JSON\]/i.test(errorMessage)) return DIAGNOSTIC_CATEGORIES.INVALID_JSON;
  if (/\$|expected/i.test(errorMessage)) return DIAGNOSTIC_CATEGORIES.INVALID_SHAPE;
  return DIAGNOSTIC_CATEGORIES.GENERIC_LOAD_FAILURE;
}

export function formatRuntimeDiagnosticReport(payload = {}) {
  const category = payload.category || 'unknown';
  const source = payload.file || 'unknown';
  const detail = payload.detail || payload.message || 'No detail';
  const phase = payload.phase ? ` | phase=${payload.phase}` : '';
  return `[runtime-diagnostic] category=${category} | source=${source}${phase}\n${detail}`;
}

export function reportRuntimeDiagnostic(payload, { consoleImpl = console, level = 'error' } = {}) {
  if (!shouldEmitRuntimeDiagnostics()) return;
  const report = formatRuntimeDiagnosticReport(payload);
  const logger = typeof consoleImpl?.[level] === 'function' ? consoleImpl[level] : consoleImpl?.error;
  if (typeof logger === 'function') logger(report);
}
