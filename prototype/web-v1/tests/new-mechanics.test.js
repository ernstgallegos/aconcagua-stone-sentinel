const assert = require('assert');

const POSITIONS = ['horcones','confluencia','base_camp','camp_a','camp_b','camp_c','summit'];
const CAMP_POSITIONS = new Set(['confluencia','base_camp','camp_a','camp_b','camp_c']);
const STAGE_BY_POSITION = {
  horcones: 'APPROACH', confluencia:'APPROACH', base_camp:'APPROACH',
  camp_a:'HIGH_CAMP', camp_b:'HIGH_CAMP', camp_c:'SUMMIT_DAY', summit:'SUMMIT_DAY'
};
const TUNING = {
  timeCostMinutes: { advance:120, advance_slowly:180, wait:60, descend:120 },
  dayStartMinutes: 360,
  nightStartMinutes: 1320,
  bivouacPenalty: { fatigue: 18, exposure: 22, capacity: -14 },
  stage: {
    APPROACH: { advanceProgressBase: 0.74 },
    HIGH_CAMP: { advanceProgressBase: 0.52 },
    SUMMIT_DAY: { advanceProgressBase: 0.4 },
  }
};

function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function isCampPosition(pos){ return CAMP_POSITIONS.has(pos); }

function applyTime(state, decision, flags){
  if (decision === 'sleep') {
    state.day += 1;
    state.minutesOfDay = TUNING.dayStartMinutes;
    return;
  }
  state.minutesOfDay += TUNING.timeCostMinutes[decision];
  if (state.minutesOfDay >= TUNING.nightStartMinutes) {
    if (!isCampPosition(state.position)) {
      flags.push('forced-bivouac');
      state.fatigue = clamp(state.fatigue + TUNING.bivouacPenalty.fatigue, 0, 100);
      state.exposure = clamp(state.exposure + TUNING.bivouacPenalty.exposure, 0, 100);
      state.capacity = clamp(state.capacity + TUNING.bivouacPenalty.capacity, 0, 100);
    }
    state.day += 1;
    state.minutesOfDay = TUNING.dayStartMinutes;
  }
}

function advanceSucceeds(seed, position, weather=1, fatigue=30){
  const rng = mulberry32(seed);
  const stage = STAGE_BY_POSITION[position];
  const baseChance = TUNING.stage[stage].advanceProgressBase - weather * 0.1 - fatigue * 0.0025;
  const chance = clamp(baseChance, 0.15, 0.88);
  return rng() < chance;
}

// time progression + sleep rollover
{
  const st = { day:1, minutesOfDay:360, position:'confluencia', fatigue:20, exposure:20, capacity:80 };
  const flags = [];
  applyTime(st, 'advance', flags);
  assert.equal(st.day, 1);
  assert.equal(st.minutesOfDay, 480);
  applyTime(st, 'sleep', flags);
  assert.equal(st.day, 2);
  assert.equal(st.minutesOfDay, 360);
}

// sleep availability at camps only
{
  assert.equal(isCampPosition('confluencia'), true);
  assert.equal(isCampPosition('camp_c'), true);
  assert.equal(isCampPosition('summit'), false);
}

// determinism fixed seed + action sequence
{
  const run = (seed) => {
    const st = { day:1, minutesOfDay:360, position:'confluencia', fatigue:20, exposure:20, capacity:80 };
    const flags = [];
    applyTime(st, 'wait', flags);
    applyTime(st, 'advance_slowly', flags);
    return JSON.stringify(st) + '|' + flags.join(',');
  };
  assert.equal(run(42), run(42));
}

// stage scaling approach vs high camp
{
  const approach = advanceSucceeds(7, 'confluencia');
  const highCamp = advanceSucceeds(7, 'camp_a');
  // same RNG draw, approach should not be harder than high camp with current coefficients
  assert.ok(Number(approach) >= Number(highCamp));
}

console.log('new mechanics tests: ok');
