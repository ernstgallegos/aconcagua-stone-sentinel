/**
 * Balance calibration parity tests.
 *
 * Verifies that the numeric values documented in docs/balance-calibration-notes.md
 * match the actual runtime data in data/characters.json. This prevents silent
 * documentation drift after any balance pass that touches character parameters.
 *
 * Exit criterion for this guard: if a balance pass intentionally changes a character
 * parameter, both data/characters.json AND docs/balance-calibration-notes.md must
 * be updated in the same commit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const characters = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'characters.json'), 'utf8')
);
const calibrationNotes = fs.readFileSync(
  path.join(ROOT, 'docs', 'balance-calibration-notes.md'), 'utf8'
);

// Build a lookup map from the live characters data
const charByName = {};
for (const c of characters) {
  charByName[c.name] = c;
}

// Expected values extracted from docs/balance-calibration-notes.md
// The table format is: | Character | riskTolerance | perceptionBias | acclimatizationRate | difficultyLabel |
const DOCUMENTED_PARAMS = [
  { name: 'Francisco Aguirre', riskTolerance: 1.15, perceptionBias: 3,  acclimatizationRate: 0.90 },
  { name: 'Laura Kim',         riskTolerance: 0.80, perceptionBias: -4, acclimatizationRate: 1.12 },
  { name: 'Erik Lundvall',     riskTolerance: 1.42, perceptionBias: 7,  acclimatizationRate: 1.28 },
  { name: 'Daniela De Rossi',  riskTolerance: 1.05, perceptionBias: -5, acclimatizationRate: 0.72 },
  { name: 'Blake Harris',      riskTolerance: 1.35, perceptionBias: 8,  acclimatizationRate: 0.75 },
  { name: 'Irina Orlova',      riskTolerance: 1.48, perceptionBias: 9,  acclimatizationRate: 1.42 },
];

test('balance-calibration-notes.md character table matches data/characters.json', () => {
  for (const doc of DOCUMENTED_PARAMS) {
    const live = charByName[doc.name];
    assert.ok(live, `Character '${doc.name}' documented in calibration notes not found in data/characters.json`);

    const engine = live.engine || {};
    assert.strictEqual(
      engine.riskTolerance, doc.riskTolerance,
      `${doc.name} riskTolerance: docs says ${doc.riskTolerance}, data has ${engine.riskTolerance}`
    );
    assert.strictEqual(
      engine.perceptionBias, doc.perceptionBias,
      `${doc.name} perceptionBias: docs says ${doc.perceptionBias}, data has ${engine.perceptionBias}`
    );
    assert.strictEqual(
      engine.acclimatizationRate, doc.acclimatizationRate,
      `${doc.name} acclimatizationRate: docs says ${doc.acclimatizationRate}, data has ${engine.acclimatizationRate}`
    );
  }
});

test('balance-calibration-notes.md documents all six characters', () => {
  assert.ok(
    calibrationNotes.includes('Francisco Aguirre'),
    'balance-calibration-notes.md must document Francisco Aguirre'
  );
  assert.ok(
    calibrationNotes.includes('Laura Kim'),
    'balance-calibration-notes.md must document Laura Kim'
  );
  assert.ok(
    calibrationNotes.includes('Erik Lundvall'),
    'balance-calibration-notes.md must document Erik Lundvall'
  );
  assert.ok(
    calibrationNotes.includes('Daniela De Rossi'),
    'balance-calibration-notes.md must document Daniela De Rossi'
  );
  assert.ok(
    calibrationNotes.includes('Blake Harris'),
    'balance-calibration-notes.md must document Blake Harris'
  );
  assert.ok(
    calibrationNotes.includes('Irina Orlova'),
    'balance-calibration-notes.md must document Irina Orlova'
  );
});

test('balance-calibration-notes.md declares target win-rate bands', () => {
  // The notes must always include the target band definitions
  assert.ok(
    calibrationNotes.includes('Summit and Safe Return'),
    'calibration notes must declare Summit and Safe Return target band'
  );
  assert.ok(
    calibrationNotes.includes('Strategic Retreat'),
    'calibration notes must declare Strategic Retreat target band'
  );
  assert.ok(
    calibrationNotes.includes('Rollback criterion'),
    'calibration notes must include a rollback criterion section'
  );
});
