/**
 * journal.test.js
 *
 * Unit tests for the journal data-access layer in ui/screens/journal.js.
 *
 * Behaviors protected here:
 *   - loadJournal returns an empty array when storage is empty
 *   - loadJournal returns an empty array when stored JSON is malformed
 *   - saveJournalEntry prepends entries (newest first)
 *   - saveJournalEntry caps the list at 50 entries
 *   - migrateJournalKey copies data from the legacy key and removes it
 *   - migrateJournalKey is a no-op when canonical key already exists
 *   - JOURNAL_KEY matches the canonical storage key used by the rest of the app
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Minimal localStorage stub ─────────────────────────────────────────────────

function makeLocalStorage(initialData = {}) {
  const store = { ...initialData };
  return {
    getItem: (k) => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
}

// ── Load module ───────────────────────────────────────────────────────────────

const modPath = path.join(__dirname, '..', '..', 'ui', 'screens', 'journal.js');
const {
  JOURNAL_KEY,
  loadJournal,
  saveJournalEntry,
  migrateJournalKey,
} = await import(pathToFileURL(modPath).href);

// ── Tests ─────────────────────────────────────────────────────────────────────

test('JOURNAL_KEY is the canonical storage key', () => {
  assert.equal(JOURNAL_KEY, 'aconcagua_journal_v1');
});

test('loadJournal: returns empty array when storage is empty', () => {
  global.localStorage = makeLocalStorage();
  const entries = loadJournal();
  assert.deepEqual(entries, []);
});

test('loadJournal: returns empty array when stored value is malformed JSON', () => {
  global.localStorage = makeLocalStorage({ [JOURNAL_KEY]: 'not-json' });
  const entries = loadJournal();
  assert.deepEqual(entries, []);
});

test('loadJournal: returns parsed entries when valid JSON is stored', () => {
  const sample = [{ runNum: 1, outcome: 'Strategic Retreat' }];
  global.localStorage = makeLocalStorage({ [JOURNAL_KEY]: JSON.stringify(sample) });
  const entries = loadJournal();
  assert.deepEqual(entries, sample);
});

test('saveJournalEntry: prepends new entry (newest first)', () => {
  global.localStorage = makeLocalStorage();
  saveJournalEntry({ runNum: 1, outcome: 'A' });
  saveJournalEntry({ runNum: 2, outcome: 'B' });
  const entries = loadJournal();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].runNum, 2, 'most recent entry must be first');
  assert.equal(entries[1].runNum, 1);
});

test('saveJournalEntry: caps list at 50 entries', () => {
  global.localStorage = makeLocalStorage();
  // Save 55 entries
  for (let i = 1; i <= 55; i++) {
    saveJournalEntry({ runNum: i, outcome: 'Strategic Retreat' });
  }
  const entries = loadJournal();
  assert.equal(entries.length, 50, 'journal must be capped at 50 entries');
  // Most recent entry (run 55) must still be present
  assert.equal(entries[0].runNum, 55, 'most recent entry is preserved after cap');
});

test('saveJournalEntry: tolerates a storage failure silently', () => {
  // Simulate a storage that always throws on setItem
  global.localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => {},
  };
  // Should not throw
  assert.doesNotThrow(() => saveJournalEntry({ runNum: 1, outcome: 'test' }));
});

test('migrateJournalKey: copies data from legacy key and removes it', () => {
  const legacyData = JSON.stringify([{ runNum: 1 }]);
  global.localStorage = makeLocalStorage({ 'ass_journal_v1': legacyData });
  migrateJournalKey();
  assert.equal(
    global.localStorage._store[JOURNAL_KEY],
    legacyData,
    'canonical key must contain migrated data'
  );
  assert.equal(
    global.localStorage._store['ass_journal_v1'],
    undefined,
    'legacy key must be removed after migration'
  );
});

test('migrateJournalKey: no-op when canonical key already has data', () => {
  const canonical = JSON.stringify([{ runNum: 99 }]);
  const legacy = JSON.stringify([{ runNum: 1 }]);
  global.localStorage = makeLocalStorage({
    [JOURNAL_KEY]: canonical,
    'ass_journal_v1': legacy,
  });
  migrateJournalKey();
  // Canonical key must not be overwritten
  assert.equal(global.localStorage._store[JOURNAL_KEY], canonical);
});

test('migrateJournalKey: no-op when neither key has data', () => {
  global.localStorage = makeLocalStorage();
  assert.doesNotThrow(() => migrateJournalKey());
  assert.equal(global.localStorage._store[JOURNAL_KEY], undefined);
});
