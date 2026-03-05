const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(indexPath, 'utf8');

function mustMatch(regex, message) {
  assert.ok(regex.test(source), message);
}

function functionBody(name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `function ${name} exists`);
  const bodyStart = source.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `function ${name} has body start`);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(bodyStart + 1, i);
      }
    }
  }
  assert.fail(`function ${name} has unbalanced braces`);
}

test('web-v1 mechanics contracts', () => {
  mustMatch(/timeCostMinutes\s*:\s*\{[\s\S]*advance\s*:\s*120,[\s\S]*advance_slowly\s*:\s*180,[\s\S]*wait\s*:\s*60,[\s\S]*descend\s*:\s*120,[\s\S]*\}/, 'time costs include explicit advance_slowly cost');
  mustMatch(/if \(G\.turn > G\.scenario\.max_turns\) \{[\s\S]*Expedition Window Closed — Turns Exhausted/, 'turn limit outcome is explicit');
  mustMatch(/terrain-body-block/, 'terrain/body block flag is present');
  mustMatch(/terrain_block\s*:\s*\[[\s\S]*The body and terrain agree: not this turn\./, 'terrain block narrative pool is present');

  mustMatch(/acclimatization\s*:\s*\{[\s\S]*thresholdForHighCamp\s*:\s*30,[\s\S]*thresholdForSummitDay\s*:\s*55/, 'acclimatization tuning exists');
  mustMatch(/id="body-acclimatization"/, 'watch panel includes acclimatization row');
  mustMatch(/timeWindows\s*:\s*\{[\s\S]*summitOptimalStart/, 'temporal windows tuning exists');
  mustMatch(/makeDecision\('wait'\)/, 'wait action exists');
  mustMatch(/function updateAmbientSignal\(/, 'ambient signal panel update function exists');
  mustMatch(/function renderPositionList\(/, 'position renderer exists');
  mustMatch(/function buildDebriefAnalytics\(/, 'debrief analytics function exists');
  mustMatch(/advance_good\s*:\s*\[[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\]/, 'major narrative pools have expanded density');
  mustMatch(/wait_high\s*:\s*\[[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\n[\s\S]*\]/, 'wait_high narrative pool has at least six lines');

  ['renderWatch', 'addLogEntry', 'buildDebriefAnalytics', 'endRun', 'renderJournal'].forEach((fnName) => {
    const body = functionBody(fnName);
    assert.ok(!/\.innerHTML\s*=/.test(body), `${fnName} avoids innerHTML assignment`);
  });

  assert.ok(!/skill tree/i.test(source), 'does not introduce skill tree system');
  assert.ok(!/\bXP\b/.test(source), 'does not introduce XP system');
  assert.ok(!/level(ing)?\b/i.test(source), 'does not introduce leveling system');
  assert.ok(!/loot\b/i.test(source), 'does not introduce loot system');
});
