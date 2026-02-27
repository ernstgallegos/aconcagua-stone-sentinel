const assert = require('assert');
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');

function mustMatch(regex, message) {
  assert.ok(regex.test(source), message);
}

// Decision set in the real UI markup
mustMatch(/makeDecision\('advance'\)/, 'advance action is present in UI');
mustMatch(/makeDecision\('advance_slowly'\)/, 'advance_slowly action is present in UI');
mustMatch(/makeDecision\('wait'\)/, 'wait action is present in UI');
mustMatch(/makeDecision\('descend'\)/, 'descend action is present in UI');
mustMatch(/makeDecision\('sleep'\)/, 'sleep action is present in UI');

// TUNING table in implementation (single source)
mustMatch(/timeCostMinutes\s*:\s*\{[\s\S]*advance\s*:\s*120[\s\S]*advance_slowly\s*:\s*180[\s\S]*wait\s*:\s*60[\s\S]*descend\s*:\s*120/, 'time cost tuning values are wired in index implementation');
mustMatch(/dayStartMinutes\s*:\s*360/, 'day starts at 06:00 in implementation');
mustMatch(/nightStartMinutes\s*:\s*1320/, 'night starts at 22:00 in implementation');

// Forced bivouac logic in implementation
mustMatch(/if \(G\.minutesOfDay >= TUNING\.nightStartMinutes\)/, 'night rollover guard exists');
mustMatch(/flags\.push\('forced-bivouac'\)/, 'forced bivouac flag exists');

// First irreversible point and retreat penalty are implemented in runtime loop
mustMatch(/first-irreversible-point/, 'irreversible point flag exists');
mustMatch(/retreatPenaltyAfterIrreversible/, 'retreat penalty tuning exists');

console.log('new mechanics tests (implementation-coupled): ok');
