/**
 * ui/screens/journal.js
 *
 * Expedition-journal responsibility: localStorage-backed run history.
 *
 * Extracted from screens.js so that journal storage + rendering have a single,
 * testable home.  Responsibilities:
 *
 *   - JOURNAL_KEY constant (canonical storage key)
 *   - migrateJournalKey()     – one-time migration from legacy key
 *   - loadJournal()           – read entries from localStorage
 *   - saveJournalEntry(entry) – prepend + cap at 50 entries
 *   - clearJournal(t, onCleared) – confirm-guarded wipe
 *   - renderJournal({ container, t }) – DOM render of journal entries
 *
 * Storage helpers are imported directly; `t` (i18n) is passed as a parameter
 * so the module stays decoupled from the current-language state in screens.js.
 *
 * NOTE: Keep this file free of G-state reads and module-level side-effects so
 * the data-layer functions (loadJournal, saveJournalEntry) can be unit-tested
 * in Node without a browser environment.
 */

import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../helpers/storage.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const JOURNAL_KEY = 'aconcagua_journal_v1';
const LEGACY_KEY = 'ass_journal_v1';

// ── Private DOM helper ────────────────────────────────────────────────────────

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ── One-time migration ────────────────────────────────────────────────────────

/**
 * Migrates any data written under the legacy storage key to the canonical key.
 * Safe to call multiple times; is a no-op after the first migration.
 */
export function migrateJournalKey() {
  const old = safeGetStorage(LEGACY_KEY);
  if (old && !safeGetStorage(JOURNAL_KEY)) {
    safeSetStorage(JOURNAL_KEY, old);
    safeRemoveStorage(LEGACY_KEY);
  }
}

// ── Data access ───────────────────────────────────────────────────────────────

/**
 * Load all journal entries from localStorage.
 *
 * @returns {Array} Parsed entries, newest first.  Empty array on parse errors
 *   or when no entries have been saved.
 */
export function loadJournal() {
  try {
    return JSON.parse(safeGetStorage(JOURNAL_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

/**
 * Prepend a new journal entry and persist the updated list.
 * The list is capped at 50 entries to keep localStorage usage bounded.
 *
 * @param {{ runNum, scenario, seed, character, outcome, highest, turns, constraint }} entry
 */
export function saveJournalEntry(entry) {
  try {
    let entries = loadJournal();
    entries.unshift(entry);
    if (entries.length > 50) entries = entries.slice(0, 50);
    safeSetStorage(JOURNAL_KEY, JSON.stringify(entries));
  } catch (_) {}
}

// ── UI actions ────────────────────────────────────────────────────────────────

/**
 * Show a confirm dialog; if accepted, wipe journal storage and re-render.
 *
 * @param {function} t - i18n lookup function, e.g. `t('ui.clearJournalConfirm')`.
 * @param {function} onCleared - Callback invoked after the journal is wiped
 *   so callers can re-render the journal list.
 */
export function clearJournal(t, onCleared) {
  if (!confirm(t('ui.clearJournalConfirm'))) return;
  safeRemoveStorage(JOURNAL_KEY);
  if (typeof onCleared === 'function') onCleared();
}

/**
 * Render the full journal entry list into a container element.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.container - Target DOM element (e.g. #journal-entries).
 * @param {function}    opts.t         - i18n lookup function.
 */
export function renderJournal({ container, t }) {
  const entries = loadJournal();
  clearElement(container);

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'journal-empty';
    empty.textContent = t('ui.journalEmpty');
    container.appendChild(empty);
    return;
  }

  entries.forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'journal-entry';

    const header = document.createElement('div');
    header.className = 'journal-entry-header';
    header.textContent = `RUN #${e.runNum || (entries.length - i)} · ${e.scenario} · Seed ${e.seed} · ${e.character}`;

    const detail = document.createElement('div');
    detail.className = 'journal-entry-detail';
    detail.textContent = `Outcome: ${e.outcome} · Highest: ${e.highest} · Turns: ${e.turns} · Constraint: ${e.constraint}`;

    div.appendChild(header);
    div.appendChild(detail);
    container.appendChild(div);
  });
}
