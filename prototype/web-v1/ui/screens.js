import { G, updateRunState, updateUIState, recordTelemetry, assertStateShape } from '../state/game-state.js';
import { createTurnEngine, mulberry32, rngChoice, rngInt, rngWeighted, clamp } from '../engine/turn-resolution.js';
import { calculateResourceBurnForMinutes, applyDecisionWindowDegradationRule, deriveTerminalOutcome } from '../engine/turn-rules.js';

const DEFAULT_CONFIG = {
  nodes: [],
  environmentalPressure: {},
  actionModifiers: {},
  stageModifiers: {},
  characters: [],
  outcomes: [],
  scenariosWebV1: { predefinedScenarios: [], randomScenario: {} }
};
let DATA_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
let DATA_CONFIG_ERROR = null;

const REQUIRED_CONFIG_FILES = new Set(['nodes', 'actionModifiers', 'stageModifiers', 'characters', 'outcomes', 'scenariosWebV1']);

function typeOfValue(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function assertConfigPath(filename, value, expectedType, path) {
  const actualType = typeOfValue(value);
  if (actualType !== expectedType) {
    throw new Error(`${filename}:${path} expected ${expectedType} but got ${actualType}`);
  }
}

function validateDataConfigShape(filename, data) {
  if (filename === 'nodes') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.nodeId, 'string', '$[0].nodeId');
    assertConfigPath(filename, data[0]?.nodeName, 'string', '$[0].nodeName');
    return;
  }
  if (filename === 'actionModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.advance, 'object', '$.advance');
    assertConfigPath(filename, data.advance?.progress, 'number', '$.advance.progress');
    return;
  }
  if (filename === 'stageModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.APPROACH, 'object', '$.APPROACH');
    assertConfigPath(filename, data.APPROACH?.fatigueMultiplier, 'number', '$.APPROACH.fatigueMultiplier');
    return;
  }
  if (filename === 'characters') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.id, 'string', '$[0].id');
    assertConfigPath(filename, data[0]?.engine, 'object', '$[0].engine');
    return;
  }
  if (filename === 'outcomes') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'string', '$[0]');
    return;
  }
  if (filename === 'environmentalPressure') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.altitudePressureByBand, 'object', '$.altitudePressureByBand');
    assertConfigPath(filename, data.simulation, 'object', '$.simulation');
    return;
  }
  if (filename === 'scenariosWebV1') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.predefinedScenarios, 'array', '$.predefinedScenarios');
    assertConfigPath(filename, data.predefinedScenarios[0], 'object', '$.predefinedScenarios[0]');
    assertConfigPath(filename, data.predefinedScenarios[0]?.id, 'string', '$.predefinedScenarios[0].id');
    assertConfigPath(filename, data.predefinedScenarios[0]?.initial, 'object', '$.predefinedScenarios[0].initial');
    assertConfigPath(filename, data.predefinedScenarios[0]?.bias, 'object', '$.predefinedScenarios[0].bias');
    assertConfigPath(filename, data.randomScenario, 'object', '$.randomScenario');
    assertConfigPath(filename, data.randomScenario.archetypes, 'array', '$.randomScenario.archetypes');
    assertConfigPath(filename, data.randomScenario.archetypes[0], 'object', '$.randomScenario.archetypes[0]');
    assertConfigPath(filename, data.randomScenario.archetypes[0]?.name, 'string', '$.randomScenario.archetypes[0].name');
    assertConfigPath(filename, data.randomScenario.archetypes[0]?.tweak, 'object', '$.randomScenario.archetypes[0].tweak');
    return;
  }
}

function validateLoadedDataConfig() {
  const scenarioConfig = DATA_CONFIG.scenariosWebV1 || {};
  const predefined = scenarioConfig.predefinedScenarios || [];
  if (!predefined.length) {
    throw new Error('scenariosWebV1.$.predefinedScenarios must include at least one scenario');
  }
  for (const [idx, scenario] of predefined.entries()) {
    if (!Array.isArray(scenario.seeds) || !scenario.seeds.length) {
      throw new Error(`scenariosWebV1.$.predefinedScenarios[${idx}].seeds must be a non-empty array`);
    }
  }
  const randomConfig = scenarioConfig.randomScenario || {};
  if (!Array.isArray(randomConfig.archetypes) || !randomConfig.archetypes.length) {
    throw new Error('scenariosWebV1.$.randomScenario.archetypes must be a non-empty array');
  }
}

function setModelLoadError(errorMessage) {
  DATA_CONFIG_ERROR = errorMessage;
  updateUIState(G, { modelReady: false });
  console.error(errorMessage);

  const errorDetails = document.getElementById('blocking-error-details');
  if (errorDetails) errorDetails.textContent = errorMessage;
  showScreen('fatal-error');
}

// ════════════════════════════════════════════════
// VISUAL MODES
// ════════════════════════════════════════════════
const VISUAL_MODE_KEY = 'aconcagua_visual_mode_v1';
const VALID_VISUAL_MODES = new Set(['dark', 'light', 'sunset']);

function setVisualMode(mode) {
  const safeMode = VALID_VISUAL_MODES.has(mode) ? mode : 'dark';
  document.body.setAttribute('data-theme', safeMode);

  const modeSelect = document.getElementById('theme-select');
  if (modeSelect && modeSelect.value !== safeMode) modeSelect.value = safeMode;

  try { localStorage.setItem(VISUAL_MODE_KEY, safeMode); } catch (e) {}
}

function initVisualMode() {
  let storedMode = 'dark';
  try {
    const rawMode = localStorage.getItem(VISUAL_MODE_KEY);
    if (rawMode && VALID_VISUAL_MODES.has(rawMode)) storedMode = rawMode;
  } catch (e) {}
  setVisualMode(storedMode);
}

function leaveSplash() {
  const splash = document.getElementById('screen-splash');
  if (!splash || !splash.classList.contains('active')) return;
  splash.classList.remove('splash-pressed');
  showScreen('title');
}

function initSplashScreen() {
  const splash = document.getElementById('screen-splash');
  if (splash) {
    splash.addEventListener('click', leaveSplash);
    splash.addEventListener('pointerdown', () => splash.classList.add('splash-pressed'));
    splash.addEventListener('pointerup', leaveSplash);
    splash.addEventListener('pointercancel', () => splash.classList.remove('splash-pressed'));
    splash.addEventListener('touchend', leaveSplash, { passive: true });
  }

  document.addEventListener('keydown', (event) => {
    const currentSplash = document.getElementById('screen-splash');
    if (!currentSplash || !currentSplash.classList.contains('active')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      leaveSplash();
    }
  });
}

async function loadDataConfig() {
  const files = [
    ['nodes', '../../data/nodes.json'],
    ['environmentalPressure', '../../data/environmental_pressure_config.json'],
    ['actionModifiers', '../../data/action_modifiers.json'],
    ['stageModifiers', '../../data/stage_modifiers.json'],
    ['characters', '../../data/characters.json'],
    ['outcomes', '../../data/outcomes.json'],
    ['scenariosWebV1', '../../data/scenarios.web-v1.json'],
  ];
  for (const [key, path] of files) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${path}: HTTP ${response.status}`);
      }
      const data = await response.json();
      validateDataConfigShape(key, data);
      DATA_CONFIG[key] = data;
    } catch (error) {
      if (REQUIRED_CONFIG_FILES.has(key)) {
        setModelLoadError(`Blocking data load failure in ${path}: ${error.message}`);
        return;
      }
      console.warn(`Using default config for optional file ${key}`, error);
    }
  }
  try {
    validateLoadedDataConfig();
  } catch (error) {
    setModelLoadError(`Blocking data contract validation failure: ${error.message}`);
    return;
  }
  rebuildRouteData();
  updateUIState(G, { modelReady: true });
}

// ════════════════════════════════════════════════
// STATIC DATA
// ════════════════════════════════════════════════
let ROUTE_NODES = [];
let POSITIONS = [];
let POS_LABELS = {};
let POS_ALT = {};
let POS_BAND = {};
let CAMP_POSITIONS = new Set();
let STAGE_BY_POSITION = {};
let CANONICAL_OUTCOMES = new Set();
let DECISION_TICKER = null;

function rebuildRouteData() {
  ROUTE_NODES = (DATA_CONFIG.nodes || []).map((node, idx) => ({
    id: node.nodeId || `node_${idx}`,
    name: node.nodeName,
    altitudeMeters: node.altitudeMeters || null,
    altitudeBand: node.altitudeBand,
    terrainLoad: node.terrainLoad,
    weatherBias: node.weatherBias,
    visibilityBias: node.visibilityBias,
    timeSensitivity: node.timeSensitivity,
    isCamp: !!node.isCamp,
    stage: node.stageHint || (idx <= 4 ? 'APPROACH' : idx <= 10 ? 'HIGH_CAMP' : 'SUMMIT_DAY'),
    routeIndex: node.routeIndex ?? idx,
  })).sort((a, b) => a.routeIndex - b.routeIndex);
  POSITIONS = ROUTE_NODES.map((n) => n.id);
  POS_LABELS = ROUTE_NODES.reduce((acc, n) => { acc[n.id] = n.name; return acc; }, {});
  POS_ALT = ROUTE_NODES.reduce((acc, n) => {
    acc[n.id] = n.altitudeMeters ? `${n.altitudeMeters.toLocaleString('en-US')} m` : '—';
    return acc;
  }, {});
  POS_BAND = ROUTE_NODES.reduce((acc, n) => { acc[n.id] = `band_${n.altitudeBand}`; return acc; }, {});
  CAMP_POSITIONS = new Set(ROUTE_NODES.filter(n => n.isCamp).map(n => n.id));
  STAGE_BY_POSITION = ROUTE_NODES.reduce((acc, node) => { acc[node.id] = node.stage; return acc; }, {});
  CANONICAL_OUTCOMES = new Set(DATA_CONFIG.outcomes || []);
}


function getConfiguredScenarios() {
  return DATA_CONFIG.scenariosWebV1?.predefinedScenarios || [];
}

function getRandomScenarioConfig() {
  return DATA_CONFIG.scenariosWebV1?.randomScenario || {};
}


// ════════════════════════════════════════════════
// GAME STATE
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
// NAVIGATION — FIX: single consolidated showScreen
// (was defined twice: once at line ~900 and once at line ~1820 as a patch)
// Now handles all responsibilities in one place.
// ════════════════════════════════════════════════
function showScreen(id) {
  const part2Screens = new Set(['part2-character', 'part2-hotel', 'part2-intro', 'part2-guides', 'part2-transfer', 'part2-closure']);
  if (part2Screens.has(id) && G.finalOutcome !== 'Summit and Safe Return') {
    id = 'debrief';
  }

  updateUIState(G, { journalReturnScreen: G.journalReturnScreen || 'debrief' });

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (!target) { console.error('Unknown screen: ' + id); return; }
  target.classList.add('active');
  window.scrollTo(0, 0);

  // FIX: journal back button points to the screen we came from
  if (id === 'part2-character') buildPart2CharacterGrid();

  if (id === 'journal') {
    renderJournal();
    const backBtn = document.getElementById('journal-back-btn');
    if (backBtn) {
      const origin = G.journalReturnScreen || 'debrief';
      const labels = { debrief:'Debrief', title:'Title', game:'Game' };
      backBtn.textContent = labels[origin] || origin;
      backBtn.onclick = () => showScreen(origin);
    }
  }
}

// ════════════════════════════════════════════════
// CHARACTER SELECT
// ════════════════════════════════════════════════
function buildCharacterGrid() {
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  (DATA_CONFIG.characters || []).forEach(c => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.id = 'char-' + c.id;
    // FIX: aria attributes for accessibility
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${c.name} — ${c.role}`);
    card.onclick = () => selectCharacter(c.id);
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter(c.id); } };
    const roleGlyph = (c.role || '').split(/\s+/).map(part => part[0] || '').join('').slice(0,2).toUpperCase();
    card.innerHTML = `
      <div class="char-emblem" aria-hidden="true">${(c.name || '?')[0]}${roleGlyph ? '·' + roleGlyph[0] : ''}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-role">${c.role}</div>
      <div class="char-bio">${c.bio}</div>
      <ul class="char-traits">${c.traits.map(t => `<li>${t}</li>`).join('')}</ul>
      ${c.difficultyLabel ? `<p class="char-difficulty">Conditions: ${c.difficultyLabel}</p>` : ''}
    `;

    grid.appendChild(card);
  });

  const randomCard = document.createElement('div');
  randomCard.className = 'char-card char-card-random';
  randomCard.id = 'char-random';
  randomCard.setAttribute('role', 'radio');
  randomCard.setAttribute('aria-checked', 'false');
  randomCard.setAttribute('tabindex', '0');
  randomCard.setAttribute('aria-label', 'Random character selection');
  randomCard.onclick = () => selectCharacter('random');
  randomCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCharacter('random'); } };
  randomCard.innerHTML = `
    <div class="char-emblem" aria-hidden="true">?</div>
    <div class="char-name">Random Character</div>
    <div class="char-role">Unpredictable roster slot</div>
    <div class="char-bio">Let the mountain choose one of the six expedition profiles for this run.</div>
    <ul class="char-traits"><li>Fast start for replay runs.</li><li>Maintains full rules and balance.</li></ul>
    <p class="char-difficulty">Conditions: Variable by selected profile.</p>
  `;
  grid.appendChild(randomCard);

}
function selectCharacter(id) {
  document.querySelectorAll('.char-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  const card = document.getElementById(id === 'random' ? 'char-random' : 'char-' + id);
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  G.character = id === 'random'
    ? { id: 'random', name: 'Random Character' }
    : (DATA_CONFIG.characters || []).find(c => c.id === id);
  const btn = document.getElementById('btn-char-confirm');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
}
function confirmCharacter() {
  if (!G.character) return;
  if (G.character.id === 'random') {
    const availableCharacters = DATA_CONFIG.characters || [];
    if (!availableCharacters.length) return;
    G.character = rngChoice(() => Math.random(), availableCharacters);
  }
  buildScenarioGrid();
  showScreen('scenario');
}


function buildPart2CharacterGrid() {
  const grid = document.getElementById('part2-char-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const chars = DATA_CONFIG.characters || [];
  chars.forEach(c => {
    const card = document.createElement('div');
    const isActive = c.id === 'francisco';
    card.className = 'char-card' + (isActive ? '' : ' char-locked');
    card.id = 'part2-char-' + c.id;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', isActive ? '0' : '-1');
    card.setAttribute('aria-label', isActive ? `${c.name} — ${c.role}` : `${c.name} — locked`);
    card.setAttribute('aria-disabled', isActive ? 'false' : 'true');

    if (isActive) {
      card.onclick = () => selectPart2Character(c.id);
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPart2Character(c.id); }};
    }

    const roleGlyph = (c.role || '').split(/\s+/).map(p => p[0] || '').join('').slice(0,2).toUpperCase();
    card.innerHTML = `
      <div class="char-emblem" aria-hidden="true">${(c.name || '?')[0]}${roleGlyph ? '·' + roleGlyph[0] : ''}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-role">${c.role}</div>
      ${isActive
        ? `<div class="char-bio">${c.bio}</div><ul class="char-traits">${c.traits.map(t => `<li>${t}</li>`).join('')}</ul>${c.difficultyLabel ? `<p class="char-difficulty">Conditions: ${c.difficultyLabel}</p>` : ''}`
        : `<div class="char-bio char-bio--locked">Available in future expeditions.</div><div class="char-lock-icon" aria-hidden="true">◈</div>`
      }
    `;

    grid.appendChild(card);
  });

}

function selectPart2Character(id) {
  document.querySelectorAll('#part2-char-grid .char-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  const card = document.getElementById('part2-char-' + id);
  if (card && id === 'francisco') {
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    const btn = document.getElementById('btn-part2-confirm');
    if (btn) { btn.disabled = false; btn.removeAttribute('aria-disabled'); }
  }
}

function confirmPart2Character() {
  if (G.finalOutcome !== 'Summit and Safe Return') {
    showScreen('debrief');
    return;
  }
  showScreen('part2-hotel');
}

// ════════════════════════════════════════════════
// MODE SELECT
// ════════════════════════════════════════════════
function selectMode(mode) {
  if (mode === 'random') {
    G.scenario = buildRandomScenario();
    G.seed = G.scenario._randomSeed;
    showOnboarding(mode);
  } else {
    buildScenarioGrid();
    showScreen('scenario');
  }
}

// ════════════════════════════════════════════════
// SCENARIO SELECT
// ════════════════════════════════════════════════
let selectedScenarioId = null;
let selectedSeed = null;

function buildScenarioGrid() {
  const grid = document.getElementById('scenario-grid');
  grid.innerHTML = '';
  getConfiguredScenarios().forEach((sc) => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.id = 'sc-' + sc.id;
    // FIX: aria role for scenario cards
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Scenario ${sc.num}: ${sc.name} — ${sc.difficulty}`);
    const difficultyTier = /hard/i.test(sc.difficulty) ? 3 : ((/medium|moderate/i.test(sc.difficulty) ? 2 : 1));
    const difficultyPips = [0,1,2].map(i => `<span class="diff-pip${i < difficultyTier ? ' active' : ''}"></span>`).join('');
    card.innerHTML = `
      <div class="scenario-num">SCENARIO ${sc.num} · ${sc.difficulty}</div>
      <div class="scenario-name">${sc.name}</div>
      <div class="scenario-desc">${sc.desc}</div>
      <div class="scenario-difficulty">Difficulty <span class="diff-pips" aria-hidden="true">${difficultyPips}</span></div>
    `;
    card.onclick = () => selectScenario(sc.id);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScenario(sc.id); }
    };

    grid.appendChild(card);
  });

  // Random mode card
  const randomCard = document.createElement('div');
  randomCard.className = 'scenario-card';
  randomCard.setAttribute('role', 'button');
  randomCard.setAttribute('tabindex', '0');
  randomCard.setAttribute('aria-label', 'Random Scenario');
  randomCard.innerHTML = `
    <div class="scenario-num">SCENARIO · RANDOM</div>
    <div class="scenario-name">Random Conditions</div>
    <div class="scenario-desc">Procedurally generated conditions. Expedition ID assigned at departure.</div>
  `;
  randomCard.onclick = () => selectMode('random');
  randomCard.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMode('random'); }};
  grid.appendChild(randomCard);
}
function selectScenario(id) {
  document.querySelectorAll('.scenario-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  const card = document.getElementById('sc-' + id);
  if (card) {
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
  }
  const scenario = getConfiguredScenarios().find((sc) => sc.id === id);
  selectedScenarioId = id;
  selectedSeed = scenario?.seeds?.[Math.floor(Math.random() * scenario.seeds.length)] || null;
  const btn = document.getElementById('btn-scenario-confirm');
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
}
function confirmScenario() {
  if (!selectedScenarioId) return;
  G.scenario = getConfiguredScenarios().find(s => s.id === selectedScenarioId);
  G.seed = selectedSeed;
  showOnboarding('predefined');
}

// ════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════
function showOnboarding(mode) {
  document.getElementById('onboard-intro').textContent = G.scenario.intro || '';
  document.getElementById('onboard-char-line').textContent =
    `Expedition: ${G.character.name} · ${G.character.role}`;
  const backBtn = document.getElementById('onboard-back-btn');
  backBtn.onclick = () => showScreen('scenario');
  showScreen('onboarding');
}

// ════════════════════════════════════════════════
// RANDOM SCENARIO BUILDER
// ════════════════════════════════════════════════
function buildRandomScenario() {
  const randomConfig = getRandomScenarioConfig();
  const seedRange = randomConfig.seedRange || { min: 10000, max: 99999 };
  const maxTurnsRange = randomConfig.maxTurnsRange || { min: 46, max: 54 };
  const initialBase = randomConfig.initialBase || { position: 'horcones', altitude_band: 'approach' };
  const initialRanges = randomConfig.initialRanges || {};
  const terrainRange = initialRanges.terrain_load || { min: 0, max: 2 };
  const functionalCapacityRange = initialRanges.functional_capacity || { min: 74, max: 94 };
  const rseed = Math.floor(Math.random() * (seedRange.max - seedRange.min + 1)) + seedRange.min;
  const rng = mulberry32(rseed);
  const archetypes = randomConfig.archetypes || [];
  const arch = archetypes[rngInt(rng, 0, archetypes.length - 1)];
  return {
    id: 'random-' + rseed,
    num: randomConfig.num || '06',
    name: arch.name,
    desc: `Expedition ${rseed} · ${arch.name}`,
    intro: `Expedition ${rseed}. ${arch.name}. Conditions are never neutral; they only become legible through disciplined turns.`,
    max_turns: rngInt(rng, maxTurnsRange.min, maxTurnsRange.max),
    seeds: [rseed],
    difficulty: arch.tweak.difficulty,
    initial: {
      position: initialBase.position, altitude_band: initialBase.altitude_band, weather_severity: arch.tweak.weather,
      visibility: arch.tweak.visibility, terrain_load: rngInt(rng, terrainRange.min, terrainRange.max), functional_capacity: rngInt(rng, functionalCapacityRange.min, functionalCapacityRange.max),
      fatigue: arch.tweak.fatigue, exposure: arch.tweak.exposure, water: arch.tweak.water, food: arch.tweak.food,
    },
    bias: arch.tweak.bias,
    _randomSeed: rseed,
    _archetype: arch.name,
    _acclimatizationBonus: arch.tweak._acclimatizationBonus || 0,
    _equinoxTrapTurn: arch.tweak._equinoxTrapTurn || null,
  };
}

// ════════════════════════════════════════════════
// GAME INIT
// ════════════════════════════════════════════════
function startGame() {
  if (!G.modelReady) {
    const fallback = DATA_CONFIG_ERROR || 'Blocking data error: model did not initialize correctly.';
    setModelLoadError(fallback);
    return;
  }

  const sc = G.scenario;
  const ch = G.character;
  const mods = ch.engine || {};

  updateRunState(G, {
    rng: mulberry32(G.seed),
    turn: 1,
    turnLog: [],
    allFlags: [],
    highestPosIdx: POSITIONS.indexOf(sc.initial.position),
    consecutiveWater0: 0,
    whiteWindRisk: 0,
    day: 1,
    permitDay: 1,
    permitMaxDays: 20,
    minutesOfDay: getSimConfig().dayStartMinutes || TUNING.dayStartMinutes,
    irreversibleTriggered: false,
    irreversibleTurn: null,
    runNumber: (G.runNumber || 0) + 1,
    acclimatization: 0,
    consecutiveAdvances: 0,
    persistenceTurns: 0,
    pressureHistory: [],
    hasSummited: false,
    finalOutcome: 'Strategic Retreat',
    photoShotsTaken: 0,
    photoInsightTurns: 0,
    lastPhotoTurn: -99,
    photoLastEffectLabel: '',
    lateSignalDeterminantTurns: 0,
    lateSignalEvents: [],
  });
  updateUIState(G, {
    tutorialSeen: {},
    onboardingLayer: 'essentials',
    currentPrimaryAlert: { label: 'stable', level: 'stable', type: 'stable' },
  });
  recordTelemetry(G, {
    runLogRecords: [],
    turnDecisionStartedAt: Date.now(),
    decisionTimeSpentMs: 0,
    decisionWindowExceeded: false,
    decisionWindowEffect: null,
    decisionWindowProfile: null,
    decisionPauseUsed: false,
    decisionPauseTurnsLeft: 0,
  });

  // deep copy initial state + apply character mods
  const s = JSON.parse(JSON.stringify(sc.initial));
  if (mods.functionalCapacityBonus) s.functional_capacity = clamp(s.functional_capacity + mods.functionalCapacityBonus, 0, 100);

  if (sc._acclimatizationBonus) updateRunState(G, { acclimatization: clamp(sc._acclimatizationBonus, 0, 100) });
  s.persistenceTier = 'fresh';
  updateRunState(G, { state: s });

  // clear resource warning
  clearElement(document.getElementById('resource-warning-box'));

  renderPositionList();
  const logEntries = document.getElementById('log-entries');
  clearElement(logEntries);
  const emptyLog = document.createElement('div');
  emptyLog.className = 'log-empty';
  emptyLog.textContent = 'No entries yet.';
  logEntries.appendChild(emptyLog);

  updateRunState(G, { signals: computeSignals() });
  renderWatch();
  updateAmbientSignal([], null);
  maybeShowTutorial('first-turn');
  renderNarrative(null, G.signals);
  setDecisionButtonsEnabled(true);

  showScreen('game');
  if (DECISION_TICKER) clearInterval(DECISION_TICKER);
  DECISION_TICKER = setInterval(() => {
    const gameScreen = document.getElementById('screen-game');
    if (!gameScreen || !gameScreen.classList.contains('active')) return;
    renderWatch();
  }, 500);
}

// ════════════════════════════════════════════════
// SIGNALS / NOISE
// ════════════════════════════════════════════════

function formatMinutes(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
function formatTrendArrow(delta) {
  if (delta > 1) return '↑';
  if (delta < -1) return '↓';
  return '↔';
}
function confidenceTier(conf) {
  if (conf >= 70) return 'high';
  if (conf >= 45) return 'med';
  return 'low';
}
function metricDisplay(value, confidence) {
  const spread = Math.round((100 - confidence) / 100 * (getSimConfig().noiseRangeAtZeroConf || 18));
  const lo = clamp(value - spread, 0, 100);
  const hi = clamp(value + spread, 0, 100);
  return `${Math.round(lo)}–${Math.round(hi)} · ${confidenceTier(confidence)} conf`;
}
function getCurrentStage() {
  return getStageForPosition(G.state.position);
}

function getTimeOfDayBucket(minutesOfDay) {
  if (minutesOfDay < 360) return 'night';
  if (minutesOfDay < 480) return 'early';
  if (minutesOfDay < 900) return 'optimal';
  if (minutesOfDay < 1080) return 'late';
  if (minutesOfDay < 1320) return 'dusk';
  return 'night';
}

function getPersistenceTier(turns) {
  if (turns >= 8) return 'critical';
  if (turns >= 6) return 'severe';
  if (turns >= 4) return 'cumulative';
  if (turns >= 2) return 'sustained';
  return 'fresh';
}

function getSimConfig() {
  return DATA_CONFIG.environmentalPressure?.simulation || {};
}

function getCurrentNode(state = G.state) {
  return ROUTE_NODES.find((n) => n.id === state.position) || ROUTE_NODES[0];
}

function getStageForPosition(position = G.state.position) {
  if (position && STAGE_BY_POSITION[position]) return STAGE_BY_POSITION[position];
  const fallbackNode = ROUTE_NODES.find((n) => n.id === position) || ROUTE_NODES[0];
  return fallbackNode?.stage || 'APPROACH';
}

function isCampPosition(position = G.state.position) {
  return CAMP_POSITIONS.has(position);
}

function getActionModifier(action) {
  const baseByAction = {
    advance: { fatigueDelta: 6, exposureDelta: 5, capacityDelta: -3 },
    advance_slowly: { fatigueDelta: 4, exposureDelta: 3, capacityDelta: -2 },
    wait: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 1 },
    descend: { fatigueDelta: 1, exposureDelta: 1, capacityDelta: 2 },
    sleep: { fatigueDelta: -10, exposureDelta: -8, capacityDelta: 4 },
    shoot_photo: { fatigueDelta: 2, exposureDelta: 2, capacityDelta: 0 },
  };
  const configured = DATA_CONFIG.actionModifiers[action] || {};
  const fallback = baseByAction[action] || { fatigueDelta: 3, exposureDelta: 3, capacityDelta: -1 };

  const fatigueDelta = Number.isFinite(configured.fatigueDelta)
    ? configured.fatigueDelta
    : Number.isFinite(configured.fatigueRecovery)
      ? -configured.fatigueRecovery
      : fallback.fatigueDelta;
  const exposureDelta = Number.isFinite(configured.exposureDelta)
    ? configured.exposureDelta
    : Number.isFinite(configured.exposureRecovery)
      ? -configured.exposureRecovery
      : fallback.exposureDelta;

  return {
    progress: 0,
    fatigueMultiplier: 1,
    exposureMultiplier: 1,
    timeCost: 60,
    ...configured,
    fatigueDelta,
    exposureDelta,
    capacityDelta: Number.isFinite(configured.capacityDelta) ? configured.capacityDelta : fallback.capacityDelta,
  };
}

function canUseShootPhoto(state = G.state) {
  if (G.character?.id !== 'daniela') return { allowed: false, reason: 'Only Daniela can use this action.' };
  const mod = getActionModifier('shoot_photo');
  const maxShots = mod.photoSessionCap || 4;
  const cooldownTurns = mod.photoCooldownTurns || 2;
  if (G.photoShotsTaken >= maxShots) return { allowed: false, reason: 'No film stock left for this ascent.' };
  if (G.turn - G.lastPhotoTurn < cooldownTurns) return { allowed: false, reason: 'You need time to process the last frame.' };
  if (state.water <= 0 || state.food <= 0) return { allowed: false, reason: 'You cannot spare focus while resources are depleted.' };
  return { allowed: true, reason: 'Available' };
}

function getStageModifier(position = G.state.position) {
  const stage = getStageForPosition(position);
  return DATA_CONFIG.stageModifiers[stage] || { fatigueMultiplier: 1, exposureMultiplier: 1, weatherSeverityBias: 0, confidencePenalty: 0 };
}

function calculateEnvironmentalPressure(state) {
  const epConf = DATA_CONFIG.environmentalPressure;
  const node = getCurrentNode(state);
  const stageMod = getStageModifier(state.position);
  const altitudePressure = epConf.altitudePressureByBand[String(node.altitudeBand)] ?? 0;
  const terrainLoad = epConf.terrainLoadScale[String(clamp(node.terrainLoad, 1, 5))] ?? 0;
  const weatherSeverity = epConf.weatherSeverityScale[String(clamp(state.weather_severity || 0, 0, 4))] ?? 0;
  const visibilityRisk = epConf.visibilityRiskScale[String(clamp(4 - (state.visibility ?? 2), 0, 4))] ?? 0;
  const timeOfDayRiskRaw = epConf.timeOfDayRiskScale[getTimeOfDayBucket(G.minutesOfDay)] ?? 0;
  const timeOfDayRisk = timeOfDayRiskRaw * (node.timeSensitivity || 1);
  const exposurePersistence = epConf.exposurePersistenceScale[state.persistenceTier || 'fresh'] ?? 0;
  const pressureScore = altitudePressure + terrainLoad + weatherSeverity + visibilityRisk + timeOfDayRisk + exposurePersistence + (node.weatherBias || 0) + (node.visibilityBias || 0) + (stageMod.weatherSeverityBias || 0);
  return { pressureScore, components: { altitudePressure, terrainLoad, weatherSeverity, visibilityRisk, timeOfDayRisk, exposurePersistence } };
}

function calculateBodyTolerance(state) {
  const hydrationState = clamp((state.water / 36) * 100, 0, 100);
  const nutritionState = clamp((state.food / 36) * 100, 0, 100);
  const stats = G.character?.engine || {};
  const fatigueResistance = stats.fatigueResistance || 1;
  const exposureResistance = stats.exposureResistance || 1;
  const bt = (state.functional_capacity * 0.4) +
    ((G.acclimatization || 0) * 0.35) +
    (hydrationState * 0.1) +
    (nutritionState * 0.05) -
    ((state.fatigue * 0.05) / fatigueResistance) -
    ((state.exposure * 0.05) / exposureResistance);
  return clamp(bt, 0, 100);
}

function pressureDeltaLabel(delta) {
  if (delta <= -15) return 'Favorable conditions';
  if (delta <= 10) return 'Demanding conditions';
  if (delta <= 30) return 'Overexertion zone';
  return 'Mountain refusal zone';
}

function pressureBandLabel(score) {
  if (score <= 25) return 'Low';
  if (score <= 45) return 'Manageable';
  if (score <= 65) return 'Severe';
  if (score <= 85) return 'Very Severe';
  return 'Extreme';
}

function spendResourcesForMinutes(minutes, flags) {
  const stage = getCurrentStage();
  const burn = getSimConfig().resourceBurnPerHour?.[stage] || { water: 0.4, food: 0.3 };
  const eff = G.character?.engine?.resourceEfficiency ?? 1.0;
  const { waterBurn, foodBurn } = calculateResourceBurnForMinutes({
    minutes,
    burnPerHour: burn,
    efficiency: eff,
  });
  G.state.water = Math.max(0, G.state.water - waterBurn);
  G.state.food = Math.max(0, G.state.food - foodBurn);
  if (G.state.water === 0) {
    G.consecutiveWater0++;
    flags.push('water-depleted');
    G.state.functional_capacity = clamp(G.state.functional_capacity - 8, 0, 100);
  } else {
    G.consecutiveWater0 = 0;
  }
  if (G.state.food === 0) {
    flags.push('food-depleted');
    G.state.functional_capacity = clamp(G.state.functional_capacity - 5, 0, 100);
  }
}

function getLatencyReadabilityLabel(activationRatio) {
  if (activationRatio < 0.42) return 'uncertain reading';
  if (activationRatio < 0.72) return 'partial reading';
  return 'clear reading';
}

function calculatePerceptionLatency({ pressureDelta }) {
  const latency = G.character?.engine?.perceptionLatency || {};
  const baseDelay = clamp(latency.baseDelay || 0, 0, 0.85);
  if (baseDelay <= 0) {
    return {
      active: false,
      activationRatio: 1,
      readabilityLabel: 'clear reading',
      pressureGate: false,
      stageGate: false,
      timeGate: false,
    };
  }

  const stage = getCurrentStage();
  const pressureStart = latency.pressureDeltaStart || 18;
  const stageWeight = latency.stageActivation?.[stage] ?? 0;
  const timeStart = latency.timeActivationStart || 780;
  const earlyHintFloor = clamp(latency.minEarlyHint || 0.38, 0.3, 0.75);

  const pressureGate = pressureDelta >= pressureStart;
  const stageGate = stageWeight > 0;
  const timeGate = G.minutesOfDay >= timeStart;

  const pressureProgress = clamp((pressureDelta - pressureStart) / 22, 0, 1);
  const timeProgress = clamp((G.minutesOfDay - timeStart) / 240, 0, 1);
  const activationProgress = clamp((pressureProgress * 0.48) + (timeProgress * 0.34) + stageWeight, 0, 1);
  const activationRatio = clamp((1 - baseDelay) + (baseDelay * activationProgress), earlyHintFloor, 1);

  return {
    active: activationRatio < 0.99,
    activationRatio,
    readabilityLabel: getLatencyReadabilityLabel(activationRatio),
    pressureGate,
    stageGate,
    timeGate,
  };
}

function getPerceptionGuardrails() {
  return G.character?.engine?.perceptionGuardrails || {};
}

function enforcePerceptionGuardrails(confidenceLevel, noiseLevel) {
  const guardrails = getPerceptionGuardrails();
  const minConfidence = clamp(guardrails.minConfidence ?? 8, 5, 45);
  const maxNoise = clamp(guardrails.maxNoise ?? 35, 18, 35);
  return {
    confidenceLevel: clamp(confidenceLevel, minConfidence, 98),
    noiseLevel: clamp(noiseLevel, 0, maxNoise),
    guardrails,
  };
}

function clampSignalHintsForReadability(rawHint) {
  const guardrails = getPerceptionGuardrails();
  const minHintLevel = clamp(guardrails.minHintLevel ?? 1, 0, 2);
  return Math.max(minHintLevel, clamp(rawHint, 0, 3));
}

function calculatePerception({ state, EP, BT, pressureDelta }) {
  const node = getCurrentNode(state);
  const stageMod = getStageModifier(state.position);
  const stats = G.character?.engine || {};
  const stability = stats.confidenceStability || 1;
  const riskTol = stats.riskTolerance || 1;
  let confidenceLevel = clamp(
    (100 - (node.altitudeBand * 8) - (state.fatigue * 0.35) - (state.exposure * 0.4) - ((4 - (state.visibility || 0)) * 6) - (stageMod.confidencePenalty || 0)) * stability,
    5,
    95
  );
  const currentEp = EP ?? calculateEnvironmentalPressure(state).pressureScore;
  const prevEp = G.pressureHistory.length ? G.pressureHistory[G.pressureHistory.length - 1] : currentEp;
  let trendEstimate = currentEp > prevEp + 7 ? 'worsening fast' : (currentEp > prevEp + 2 ? 'worsening' : (currentEp < prevEp - 2 ? 'easing' : 'steady'));
  let noiseLevel = clamp(((100 - confidenceLevel) / 100) * (getSimConfig().noiseRangeAtZeroConf || 18) * riskTol + (stats.perceptionBias || 0), 0, 35);
  const latency = calculatePerceptionLatency({ pressureDelta: pressureDelta ?? 0 });

  if (latency.active) {
    confidenceLevel = clamp(confidenceLevel * latency.activationRatio, 5, 98);
    noiseLevel = clamp(noiseLevel + ((1 - latency.activationRatio) * 9), 0, 35);
    if (latency.activationRatio < 0.55 && trendEstimate === 'worsening fast') trendEstimate = 'worsening';
    else if (latency.activationRatio < 0.45 && trendEstimate === 'easing') trendEstimate = 'steady';
  }

  if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) {
    const photoMod = getActionModifier('shoot_photo');
    const carryConfidence = Math.min(photoMod.photoCarryConfidenceGain || 3, 4);
    const carryUncertaintyDrop = Math.min((photoMod.photoUncertaintyDrop || 4) - 2, 3);
    trendEstimate = trendEstimate === 'worsening fast' ? 'worsening' : trendEstimate;
    noiseLevel = clamp(noiseLevel - carryUncertaintyDrop, 0, 35);
    confidenceLevel = clamp(confidenceLevel + carryConfidence, 5, 98);
  }

  const guarded = enforcePerceptionGuardrails(confidenceLevel, noiseLevel);
  return {
    confidenceLevel: guarded.confidenceLevel,
    trendEstimate,
    noiseLevel: guarded.noiseLevel,
    pressureDelta,
    EP: currentEp,
    BT,
    latency,
    guardrails: guarded.guardrails,
  };
}

function computeSignals() {
  const perception = calculatePerception({ state: G.state });
  return {
    trend: perception.trendEstimate,
    uncertainty: perception.noiseLevel,
    confidence: Math.round(perception.confidenceLevel),
    mountainPressure: pressureBandLabel(calculateEnvironmentalPressure(G.state).pressureScore),
    wHint: clampSignalHintsForReadability(G.state.weather_severity),
    vHint: clampSignalHintsForReadability(G.state.visibility),
    tHint: clampSignalHintsForReadability(G.state.terrain_load),
    signalReadability: perception.latency?.readabilityLabel || 'clear reading',
    lateSignalActive: !!perception.latency?.active,
  };
}

// ════════════════════════════════════════════════
// RENDER WATCH PANEL
// ════════════════════════════════════════════════
function makeDots(val, max=3) {
  const dotClass = val >= 3 ? 'filled-high' : val >= 2 ? 'filled-mid' : 'filled-low';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < max+1; i++) {
    const dot = document.createElement('div');
    dot.className = i < val ? `dot ${dotClass}` : 'dot';
    frag.appendChild(dot);
  }
  return frag;
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function bodyValueClass(label) {
  if (['Critical','Exhausted','High'].includes(label)) return 'critical';
  if (['Degraded','Heavy','Moderate'].includes(label)) return 'degrading';
  return 'stable';
}

function capacityLabel(v) {
  if (v >= 85) return 'Excellent';
  if (v >= 65) return 'Good';
  if (v >= 45) return 'Strained';
  if (v >= 25) return 'Degraded';
  return 'Critical';
}
function fatigueLabel(v) {
  if (v <= 15) return 'Fresh';
  if (v <= 35) return 'Tired';
  if (v <= 55) return 'Heavy';
  if (v <= 79) return 'Exhausted';
  return 'Critical';
}
function exposureLabel(v) {
  if (v <= 15) return 'Minimal';
  if (v <= 35) return 'Low';
  if (v <= 54) return 'Moderate';
  if (v <= 74) return 'High';
  return 'Critical';
}

function updateTurnProgress(currentTurn, maxTurns) {
  const fill = document.getElementById('turn-progress-fill');
  if (!fill) return;
  const safeMax = Math.max(maxTurns || 1, 1);
  const pct = clamp((currentTurn / safeMax) * 100, 0, 100);
  const remaining = safeMax - currentTurn;
  fill.style.width = `${pct}%`;
  fill.classList.remove('warn', 'critical');
  if (remaining < 4) fill.classList.add('critical');
  else if (remaining < 8) fill.classList.add('warn');
}

function setMetricValue(el, text, normalizedValue) {
  if (!el) return;
  el.innerHTML = '';
  const val = document.createElement('span');
  val.className = 'metric-text';
  val.textContent = text;
  const bar = document.createElement('span');
  bar.className = 'metric-bar';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'metric-bar-fill';
  fill.style.width = `${Math.round(clamp(normalizedValue, 0, 100))}%`;
  bar.appendChild(fill);
  el.appendChild(val);
  el.appendChild(bar);
}


function updatePermitWidget() {
  const nameEl = document.getElementById('permit-name');
  const daysEl = document.getElementById('permit-days');
  if (!nameEl || !daysEl) return;
  const name = G.character?.name || '—';
  const remaining = G.permitMaxDays - G.permitDay + 1;
  nameEl.textContent = name;
  daysEl.textContent = remaining > 0 ? `${remaining} day${remaining !== 1 ? 's' : ''} remaining` : 'PERMIT EXPIRED';
  daysEl.className = 'permit-days';
  if (remaining <= 3) daysEl.classList.add('permit-critical');
  else if (remaining <= 7) daysEl.classList.add('permit-warn');
}

function getOnboardingLayer(activeRisks = []) {
  const hasCritical = activeRisks.some((r) => r.level === 'critical');
  if (G.turn >= 5 || hasCritical) return 'contextual';
  return 'essentials';
}

function getRiskProfile(state) {
  const permitRemaining = G.permitMaxDays - G.permitDay + 1;
  const tw = getSimConfig().timeWindows || { summitLateStart: 780 };
  const isLate = G.minutesOfDay >= tw.summitLateStart;
  const waterCritical = state.water === 0;
  const foodCritical = state.food === 0;
  const risks = [];

  const addRisk = (type, label, level, priority) => risks.push({ type, label, level, priority });

  if (state.functional_capacity <= 25 || state.fatigue >= 80 || state.exposure >= 75) addRisk('body', 'body critical', 'critical', 100);
  else if (state.functional_capacity <= 40 || state.fatigue >= 60 || state.exposure >= 55) addRisk('body', 'body warning', 'warning', 65);

  if (waterCritical || foodCritical) addRisk('resource', 'resource critical', 'critical', 95);
  else if (state.water <= 3 || state.food <= 3) addRisk('resource', 'resource warning', 'warning', 60);

  if (permitRemaining <= 3) addRisk('permit', 'permit critical', 'critical', 85);
  else if (permitRemaining <= 7) addRisk('permit', 'permit warning', 'warning', 55);

  const timeCritical = G.turn >= Math.max((G.scenario?.max_turns || 1) - 3, 1);
  const timeWarning = G.turn >= Math.max((G.scenario?.max_turns || 1) - 6, 1);
  if (timeCritical || isLate) addRisk('window', 'window critical', 'critical', 90);
  else if (timeWarning) addRisk('window', 'window warning', 'warning', 58);

  const sorted = [...risks].sort((a, b) => b.priority - a.priority);
  const primary = sorted[0] || { type: 'stable', label: 'stable', level: 'stable', priority: 0 };
  const secondary = sorted.slice(1, 3); // anti-fatigue cap: max 2 secondary alerts

  const layer = getOnboardingLayer(sorted);
  let main = 'System stable: push only if trend and confidence align.';
  let sub = 'No critical threshold is active this turn.';
  let coach = 'Focus now: choose pace each turn and preserve return margin.';

  if (primary.level === 'critical') {
    main = `Primary alert: ${primary.label}. Stabilize first, then reassess movement.`;
    sub = 'Only one top alert is shown to reduce overload; secondary chips stay capped.';
  } else if (primary.level === 'warning') {
    main = `Primary alert: ${primary.label}. Advance only with disciplined pacing.`;
    sub = 'Treat this as early signal, not guaranteed failure.';
  }

  if (layer === 'contextual') {
    coach = 'Context unlocked: link trend + confidence + resource burn before each move.';
    if (primary.type === 'window') coach = 'Context unlocked: timing pressure is now dominant. Late gains can erase return margin.';
    if (primary.type === 'body') coach = 'Context unlocked: body drift is dominant. A slower action now may save two turns later.';
  }

  return { primary, chips: secondary, main, sub, layer, coach, allRisks: sorted };
}

function renderContextWidget(state) {
  const profile = getRiskProfile(state);
  const chipsEl = document.getElementById('context-indicators');
  const mainEl = document.getElementById('context-main');
  const subEl = document.getElementById('context-sub');
  const primaryEl = document.getElementById('primary-alert');
  const coachTitleEl = document.getElementById('coach-title');
  const coachBodyEl = document.getElementById('coach-body');
  if (!chipsEl || !mainEl || !subEl || !primaryEl || !coachTitleEl || !coachBodyEl) return;

  clearElement(chipsEl);
  if (!profile.chips.length) {
    const chip = document.createElement('span');
    chip.className = 'risk-chip';
    chip.textContent = 'no secondary alerts';
    chipsEl.appendChild(chip);
  } else {
    profile.chips.forEach(({ label, level }) => {
      const chip = document.createElement('span');
      chip.className = `risk-chip ${level}`;
      chip.textContent = label;
      chipsEl.appendChild(chip);
    });
  }

  primaryEl.className = `primary-alert${profile.primary.level !== 'stable' ? ' ' + profile.primary.level : ''}`;
  primaryEl.textContent = `Primary alert: ${profile.primary.label}`;
  mainEl.textContent = profile.main;
  subEl.textContent = profile.sub;
  coachTitleEl.textContent = `Onboarding layer · ${profile.layer}`;
  coachBodyEl.textContent = profile.coach;

  G.onboardingLayer = profile.layer;
  G.currentPrimaryAlert = profile.primary;
}

function renderWatch() {
  const s = G.state;
  const sig = G.signals;
  const sc = G.scenario;

  document.getElementById('watch-turn').textContent =
    `TURN ${G.turn} / ${sc.max_turns}`;
  updateTurnProgress(G.turn, sc.max_turns);
  const tm = G.minutesOfDay;
  const tw = getSimConfig().timeWindows || { summitOptimalStart: 300, summitOptimalEnd: 660, summitLateStart: 780 };
  const isOptimal = tm >= tw.summitOptimalStart && tm <= tw.summitOptimalEnd;
  const isLate = tm >= tw.summitLateStart;
  const suffix = isOptimal ? ' ◈ optimal' : (isLate ? ' ⚠ late' : '');
  const watchTime = document.getElementById('watch-time');
  watchTime.textContent = `Day ${G.day} · ${formatMinutes(tm)}${suffix}`;
  watchTime.className = 'watch-position ' + (isOptimal ? 'time-optimal' : (isLate ? 'time-late' : ''));
  document.getElementById('watch-position').textContent =
    `${POS_LABELS[s.position]} · ${POS_ALT[s.position]}`;

  const weatherDots = document.getElementById('dots-weather');
  const visibilityDots = document.getElementById('dots-visibility');
  const terrainDots = document.getElementById('dots-terrain');
  clearElement(weatherDots);
  clearElement(visibilityDots);
  clearElement(terrainDots);
  weatherDots.appendChild(makeDots(Math.ceil((sig.wHint + sig.tHint) / 2)));
  visibilityDots.appendChild(makeDots(sig.vHint));
  terrainDots.appendChild(makeDots(Math.ceil(sig.confidence / 25)));

  const trendEl = document.getElementById('watch-trend');
  trendEl.textContent = `${sig.mountainPressure} · ${sig.trend}`;
  trendEl.className = 'watch-trend';

  const uncertaintyInline = document.getElementById('watch-uncertainty-inline');
  uncertaintyInline.textContent = `${sig.signalReadability} · trend ${sig.trend} · stage ${getCurrentStage()}${sig.lateSignalActive ? ' · delayed lock-in' : ''}`;
  uncertaintyInline.className = `signal-readability ${sig.lateSignalActive ? 'latency-active' : ''}`;

  const pressureCopy = getDecisionPressureCopy();
  const countdownEl = document.getElementById('decision-window-countdown');
  const statusEl = document.getElementById('decision-window-status');
  if (countdownEl) countdownEl.textContent = pressureCopy.countdown;
  if (statusEl) {
    statusEl.textContent = pressureCopy.text;
    statusEl.className = `time-pressure-status${pressureCopy.cls ? ' ' + pressureCopy.cls : ''}`;
  }
  const pauseStatus = document.getElementById('focus-pause-status');
  if (pauseStatus && !G.decisionPauseUsed) pauseStatus.textContent = 'Short pause available for overload moments.';

  const capLbl = capacityLabel(s.functional_capacity);
  const fatLbl = fatigueLabel(s.fatigue);
  const expLbl = exposureLabel(s.exposure);

  const last = G.turnLog.length ? G.turnLog[G.turnLog.length-1] : null;
  const capArrow = last ? formatTrendArrow(s.functional_capacity - last.raw.capacity) : '↔';
  const fatArrow = last ? formatTrendArrow(last.raw.fatigue - s.fatigue) : '↔';
  const expArrow = last ? formatTrendArrow(last.raw.exposure - s.exposure) : '↔';

  const capEl = document.getElementById('body-capacity');
  const fatEl = document.getElementById('body-fatigue');
  const expEl = document.getElementById('body-exposure');
  const acclEl = document.getElementById('body-acclimatization');
  setMetricValue(capEl, `${capLbl} ${capArrow} · ${metricDisplay(s.functional_capacity, sig.confidence)}`, s.functional_capacity);
  setMetricValue(fatEl, `${fatLbl} ${fatArrow} · ${metricDisplay(s.fatigue, sig.confidence)}`, s.fatigue);
  setMetricValue(expEl, `${expLbl} ${expArrow} · ${metricDisplay(s.exposure, sig.confidence)}`, s.exposure);
  capEl.className = 'body-value metric ' + bodyValueClass(capLbl);
  fatEl.className = 'body-value metric ' + bodyValueClass(fatLbl);
  expEl.className = 'body-value metric ' + bodyValueClass(expLbl);
  const accl = Math.round(G.acclimatization);
  const acclState = accl >= 55 ? 'stable' : (accl >= 30 ? 'degrading' : 'critical');
  acclEl.textContent = `${accl}/100`;
  acclEl.className = 'body-value ' + acclState;

  const stageBurn = getSimConfig().resourceBurnPerHour?.[getCurrentStage()] || { water: 0.4, food: 0.3 };
  const waterTurns = stageBurn.water > 0 ? Math.floor(s.water / Math.max(stageBurn.water * 2, 1)) : s.water;
  const foodTurns = stageBurn.food > 0 ? Math.floor(s.food / Math.max(stageBurn.food * 2, 1)) : s.food;
  const resClass = (n) => n <= 3 ? 'depleted' : (n <= 6 ? 'warning' : '');
  const resEl = document.getElementById('watch-resources');
  clearElement(resEl);
  const buildResourceItem = (label, amount, turns) => {
    const outer = document.createElement('span');
    const cls = amount === 0 ? 'depleted' : resClass(turns);
    outer.className = cls ? `resource-item ${cls}` : 'resource-item';
    outer.append(document.createTextNode(`${label} `));
    const value = document.createElement('span');
    value.textContent = `${amount} · ${turns}t`;
    outer.appendChild(value);
    return outer;
  };
  resEl.appendChild(buildResourceItem('Water', s.water, waterTurns));
  resEl.appendChild(buildResourceItem('Food', s.food, foodTurns));

  const warnBox = document.getElementById('resource-warning-box');
  const warns = [];
  if (s.water === 0) warns.push('WATER DEPLETED');
  if (s.food === 0) warns.push('FOOD DEPLETED');
  clearElement(warnBox);
  if (warns.length) {
    warns.forEach((w) => {
      const warning = document.createElement('div');
      warning.className = 'resource-warning';
      warning.textContent = `⚠ ${w}`;
      warnBox.appendChild(warning);
    });
  }



  renderContextWidget(s);

  const sleepBtn = document.getElementById('btn-sleep');
  if (isCampPosition(s.position)) {
    sleepBtn.style.display = 'inline-block';
    sleepBtn.disabled = false;
    sleepBtn.title = 'Sleep through the night at this camp';
  } else {
    sleepBtn.style.display = 'none';
    sleepBtn.title = 'Sleep is only possible at camps';
  }

  const photoBtn = document.getElementById('btn-shoot-photo');
  const photoAccess = canUseShootPhoto(s);
  if (G.character?.id === 'daniela') {
    photoBtn.style.display = 'inline-block';
    photoBtn.disabled = !photoAccess.allowed;
    photoBtn.title = photoAccess.reason;
  } else {
    photoBtn.style.display = 'none';
  }

  renderPositionList();
  updatePermitWidget();
}


// ════════════════════════════════════════════════
// POSITION LIST
// ════════════════════════════════════════════════
function renderPositionList() {
  const s = G.state;
  const curIdx = POSITIONS.indexOf(s.position);
  const list = document.getElementById('position-list');
  list.innerHTML = '';
  // render reversed so summit sector is at top
  [...POSITIONS].reverse().forEach(pos => {
    const idx = POSITIONS.indexOf(pos);
    const bandRaw = POS_BAND[pos];
    const bandClass = ['approach','base','upper_base'].includes(bandRaw) ? 'low' : (bandRaw === 'high' ? 'mid' : 'high');
    const isCurrent = pos === s.position;
    const isReached = idx <= G.highestPosIdx && !isCurrent;
    const isAbove = idx > curIdx;
    const li = document.createElement('li');
    li.className = `pos-item band-${bandClass}${isCurrent?' current':''}${isReached&&!isCurrent?' reached':''}${isAbove?' above':''}`;
    // FIX: aria-current for screen readers
    if (isCurrent) li.setAttribute('aria-current', 'location');
    li.innerHTML = `
      <div class="pos-dot"></div>
      <span class="pos-label">${POS_LABELS[pos]} · ${POS_ALT[pos]}${idx===G.highestPosIdx&&!isCurrent?' <span class="pos-highest-mark">◆</span>':''}</span>
    `;
    list.appendChild(li);
  });
}

// ════════════════════════════════════════════════
// NARRATIVE
// ════════════════════════════════════════════════
const NARRATIVES = {
  advance_good: [
    'The slope opens in a narrow margin. You move inside it, without pretending control.',
    'Progress is measured in disciplined breaths, not in ambition.',
    'The terrain allows passage for now. You accept the terms and keep moving.',
    'Every step asks for balance first, speed second.',
    'The route holds. The body answers. For this turn, that is enough.',
    'Gain comes quietly: no triumph, only continuity.'
  ],
  advance_severe: [
    'The wind has intent now. You lean into it and spend more than planned.',
    'Forward remains possible, but expensive in ways the watch cannot fully count.',
    'Progress continues under protest from terrain, weather, and breath alike.',
    'Each meter feels borrowed from a later turn.',
    'You move because stopping here costs differently, not less.',
    'This is advancement without momentum.'
  ],
  advance_slowly: [
    'Half pace preserves structure. The mountain notices haste before you do.',
    'Slow movement is still movement; today, that distinction matters.',
    'Cadence replaces force. You trade distance for tomorrow.',
    'Deliberate steps hold the line between effort and error.',
    'Measured rhythm protects more than pride ever could.',
    'You advance by refusing to rush.'
  ],
  first_high: ['Above six thousand meters, the rules tighten without announcement.','The air thins; consequences do not.','From here, mistakes mature quickly.','High camp begins where excuses end.','Altitude removes noise and leaves only cost.','The route continues, but margins narrow sharply.'],
  wait_low: ['Waiting here is strategy, not inertia.','Stillness buys clarity if you can tolerate the clock.','The mountain keeps moving while you do not.','You hold position and audit the system.','A paused body can still lose ground to weather.','Patience is useful only when paired with attention.'],
  wait_high: ['At this altitude, waiting is not rest but managed decay.','The tent blocks wind, not consequence.','You spend less than moving, but never zero.','Holding ground here is already an action.','The body works continuously just to remain viable.','Silence in high camp is operational, not peaceful.'],
  descend: ['Descent is not surrender; it is a complete sentence in mountain logic.','Downward movement preserves options that summits can erase.','You turn before the system turns you.','Retreat converts uncertainty into survival.','The route back is the only guaranteed route.','Judgment arrives as a direction, not a speech.'],
  pre_collapse_fatigue: ['Reaction time stretches. Intent arrives late to the body.','Fatigue starts editing your decisions.','Simple actions now require negotiation.','Your pace decouples from your plan.','The watch reports numbers; your legs report delay.','This is fatigue with authority.'],
  pre_collapse_exposure: ['Cold is no longer peripheral; it is architectural.','You feel heat leaving faster than you can replace it.','Dexterity narrows. Small tasks become loud.','Exposure now shapes judgment as much as weather does.','The shell holds, but only partially.','Cold has moved from sensation to system.'],
  crit_exposure: ['Exposure is now an active threat to cognition and movement.','The mountain is charging compound interest on time.','Heat loss outruns correction.','Operational capacity is shrinking in real time.','This is beyond discomfort.','You are now in emergency thermodynamics.'],
  crit_fatigue: ['The body issues a direct warning.','Effort and output have separated.','You can still act, but not reliably.','Fatigue is now a strategic actor.','Delay enters every movement chain.','The system is near functional break.'],
  water_gone: ['Water has reached zero; all remaining turns become expensive.', 'Hydration debt starts collecting immediately.', 'Without water, every choice becomes shorter-term.', 'The body begins rationing performance.', 'This is a hard boundary, not a soft warning.', 'From here, degradation accelerates.'],
  food_gone: ['Food is exhausted. The body shifts to deficit management.', 'Energy planning is now damage planning.', 'The margin between action and collapse narrows further.', 'No intake means no recovery reserve.', 'You can continue, but the bill is immediate.', 'Operational endurance contracts sharply.'],
  slept: ['Night at camp recovers structure, never certainty.', 'Sleep reduces noise, not objective risk.', 'Morning starts with less debt, not with none.', 'The body stabilizes where altitude permits it.', 'Recovery is local and conditional.', 'A camp night is maintenance, not reset.'],
  shoot_photo: ['Daniela frames the ridge and catches a shift before it hardens into risk.', 'A quick shot locks in texture, wind trace, and line quality for the next push.', 'The lens turns scattered cues into a readable pattern.', 'She spends minutes now to avoid a blind move later.', 'The frame records what panic usually blurs.', 'A single photo buys a cleaner read of terrain mood.'],
  bivouac: ['Open bivouac exacts payment in exposure and capacity.', 'Unplanned night outside camp accelerates systemic decay.', 'The clock rolls over; the debt does not.', 'Forced bivouac turns one mistake into several.', 'Shelter without camp still costs heavily.', 'Night outside support is punitive by design.'],
  irreversible: ['First irreversible point crossed. Retreat remains valid, never cheap.', 'Above this line, every reversal carries compound cost.', 'The route changed from expedition to commitment.', 'You can still descend, but not neutrally.', 'The mountain has marked this threshold.', 'From here, price and altitude move together.'],
  window_open: ['A clean window appears. Timing and readiness must coincide.', 'Conditions loosen briefly; indecision has a cost.', 'The system is permissive for a short interval.', 'This is not safety, only opportunity.', 'The route offers less resistance now.', 'A window is useful only if recognized in time.'],
  window_close: ['The window closes and penalties return with interest.', 'What was feasible one turn ago now degrades.', 'Late movement enters a different weather regime.', 'The route has tightened again.', 'Opportunity has elapsed, not paused.', 'The mountain resumes its baseline severity.'],
  euphoria: ['Signals seem generous; overconfidence is now plausible.', 'Favorable readings can still hide delayed penalties.', 'Clarity may be real or simply temporary.', 'Good turns can distort risk memory.', 'Do not confuse momentum with permission.', 'The body feels strong; the system remains indifferent.'],
  dehydration: ['Dehydration now affects both output and interpretation.', 'Signals become harder to read under hydration debt.', 'Decision quality starts slipping with fluid loss.', 'You are not only weaker; you are noisier.', 'Hydration deficit destabilizes discipline.', 'The body asks for water before it asks for ambition.'],
  terrain_block: [
    'The body and terrain agree: not this turn. Force the step and pay more than you can afford.',
    'The slope refuses. So does the body. Wisdom is accepting both answers at once.',
    'Three meters of gain — technically possible. Physiologically reckless. The difference matters here.'
  ],
  white_wind_sign: ['Lenticular signs accumulate; the air has changed intent.','Wind tone sharpens before visibility collapses.','Precursors are present if you are still reading them.','The mountain is announcing a harder phase.','Pressure and movement disagree.','This signal is warning, not narrative flavor.'],
  white_wind_hit: ['White wind impact: orientation degrades in seconds.','Visibility collapses and route confidence drops sharply.','The system shifts from progress logic to damage control.','Direction remains, legibility does not.','Movement now carries amplified uncertainty.','This is the mountain reducing options in real time.'],
  observation_weather:['Cloud texture clarifies the next phase of weather.','Wind direction is legible from drifting crystals.','The sky gives a short forecast if you stand still.','Observation lowers uncertainty for one turn.','You confirm trend before committing movement.','A quiet read often beats a noisy push.'],
  poor_acclimatization:['Altitude penalty rises; acclimatization is below threshold.','The body has not adapted enough for this stage.','You are climbing faster than adaptation allows.','High camp without adaptation multiplies fatigue.','Summit day punishes low acclimatization severely.','This is a mismatch between ambition and physiology.']
};

function pickNarrative(key) {
  const arr = NARRATIVES[key];
  if (!arr) return '';
  const rng = G.rng || Math.random;
  return arr[Math.floor(rng() * arr.length)];
}

// FIX: renderNarrative now RETURNS the text string so it can be captured
// directly by addLogEntry, avoiding the fragile DOM-read pattern
function renderNarrative(decision, signals, flags=[]) {
  const s = G.state;
  let text = '';

  // flag-triggered lines (highest priority)
  if (flags.includes('weather-window-open')) text = pickNarrative('window_open');
  else if (flags.includes('weather-window-closed')) text = pickNarrative('window_close');
  else if (flags.includes('critical-exposure')) text = pickNarrative('crit_exposure');
  else if (flags.includes('critical-fatigue')) text = pickNarrative('crit_fatigue');
  else if (flags.includes('water-depleted')) text = pickNarrative('water_gone');
  else if (flags.includes('food-depleted')) text = pickNarrative('food_gone');
  else if (flags.includes('forced-bivouac')) text = pickNarrative('bivouac');
  else if (flags.includes('first-irreversible-point')) text = pickNarrative('irreversible');
  else if (flags.includes('dehydration-compounding')) text = pickNarrative('dehydration');
  else if (flags.includes('terrain-body-block')) text = pickNarrative('terrain_block');
  else if (flags.includes('white-wind-hit')) text = pickNarrative('white_wind_hit');
  else if (flags.includes('white-wind-precursor')) text = pickNarrative('white_wind_sign');
  else if (flags.includes('high-altitude-entered')) text = pickNarrative('first_high');
  else if (decision === 'advance' || decision === 'advance_slowly') {
    if (decision === 'advance_slowly') text = pickNarrative('advance_slowly');
    else if (s.weather_severity >= 2) text = pickNarrative('advance_severe');
    else text = pickNarrative('advance_good');
  } else if (decision === 'wait') {
    text = ['high','extreme','death_zone'].includes(s.altitude_band) ? pickNarrative('wait_high') : pickNarrative('wait_low');
  } else if (decision === 'descend') {
    text = pickNarrative('descend');
  } else if (decision === 'sleep') {
    text = pickNarrative('slept');
  } else if (decision === 'shoot_photo') {
    text = pickNarrative('shoot_photo');
  } else {
    // pre-turn state narrative
    if (s.fatigue >= 65 && s.fatigue < 80) text = pickNarrative('pre_collapse_fatigue');
    else if (s.exposure >= 60 && s.exposure < 75) text = pickNarrative('pre_collapse_exposure');
    else text = pickNarrative('advance_good');
  }

  document.getElementById('narrative-text').textContent = text;
  updateAmbientSignal(flags || [], decision);

  // passive character signals
  const passiveEl = document.getElementById('narrative-passive');
  let passive = '';
  if (G.character.id === 'valentina' && decision === null) {
    if (s.terrain_load >= 2) passive = 'The ground is changing character. This section will cost more.';
  }
  if (G.character.id === 'diego' && G.turnLog.length >= 2) {
    const last2 = G.turnLog.slice(-2);
    if (last2.every(l => (l.decision === 'advance' || l.decision === 'advance_slowly')) && signals.trend === 'worsening') {
      passive = 'The body says yes. The mountain hasn\'t answered yet.';
    }
  }
  if (G.character?.id === 'daniela' && G.photoInsightTurns > 0 && decision === null) {
    passive = 'Recent frames sharpen route reading for a short window.';
  }
  if (passive) {
    passiveEl.textContent = passive;
    passiveEl.style.display = 'block';
  } else {
    passiveEl.style.display = 'none';
  }

  // FIX: return text so callers can use it without re-reading the DOM
  return text;
}



function updateAmbientSignal(flags, decision) {
  const box = document.getElementById('ambient-signal');
  if (!box) return;
  let line = '';
  if (flags.includes('white-wind-sign') || flags.includes('white-wind-hit')) line = 'Spindrift rises in narrow veils across the ridge line.';
  else if (G.character?.id === 'daniela' && G.photoInsightTurns > 0) line = 'Daniela\'s last frame clarifies wind and terrain rhythm for a brief window.';
  else if (G.signals && G.signals.trend === 'worsening') line = 'The mountain tone hardens: less margin, same distance.';
  else if (G.signals && G.signals.trend === 'improving') line = 'The air eases slightly, without promise.';
  if (!line) { box.style.display = 'none'; return; }
  box.textContent = line;
  box.style.display = 'block';
}

function maybeShowTutorial(trigger) {
  if (G.tutorialSeen[trigger]) return;
  const toast = document.getElementById('tutorial-toast');
  if (!toast) return;
  const map = {
    'first-turn': 'Uncertainty is a reading quality, not a weather quality. Low confidence means wider interpretation ranges.',
    'weather-deterioration': 'Weather deterioration compounds exposure and navigation burden before collapse flags appear.',
    'fatigue-50': 'Fatigue above 50 reduces interpretation reliability and narrows safe decision space.',
  };
  if (!map[trigger]) return;
  G.tutorialSeen[trigger] = true;
  toast.textContent = map[trigger];
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}


function buildDebriefAnalytics() {
  const el = document.getElementById('debrief-analytics');
  const total = Math.max(1, G.turnLog.length);
  const count = (d) => G.turnLog.filter((t) => t.decision === d).length;
  const dist = ['advance','advance_slowly','wait','sleep','descend','shoot_photo'].map((d) => `${d}:${Math.round((count(d) / total) * 100)}%`).join(' · ');
  const sorted = [...G.turnLog].sort((a, b) => (b.raw.capacity - b.raw.fatigue - b.raw.exposure) - (a.raw.capacity - a.raw.fatigue - a.raw.exposure));
  const best = sorted[0] || { turn:1, position:G.state.position, raw:{capacity:G.state.functional_capacity,fatigue:G.state.fatigue,exposure:G.state.exposure} };
  const worst = sorted[sorted.length - 1] || best;
  const spark = (G.turnLog.length ? G.turnLog : [{raw:{capacity:G.state.functional_capacity}}]).map((t) => '▁▂▃▄▅▆▇█'[Math.min(7, Math.max(0, Math.floor((t.raw.capacity || 0) / 13)))]).join('');
  clearElement(el);

  const grid = document.createElement('div');
  grid.className = 'analytics-grid';

  const addCard = (title, content, extraClass = '') => {
    const card = document.createElement('div');
    card.className = 'analytics-card';
    const titleEl = document.createElement('div');
    titleEl.className = 'analytics-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);
    if (extraClass) {
      const contentEl = document.createElement('div');
      contentEl.className = extraClass;
      contentEl.textContent = content;
      card.appendChild(contentEl);
    } else {
      card.append(document.createTextNode(content));
    }
    grid.appendChild(card);
  };

  addCard('Decision distribution', dist);
  addCard('Best state', `T${best.turn} · ${POS_LABELS[best.position]} · C${best.raw.capacity}/F${best.raw.fatigue}/E${best.raw.exposure}`);
  addCard('Worst state', `T${worst.turn} · ${POS_LABELS[worst.position]} · C${worst.raw.capacity}/F${worst.raw.fatigue}/E${worst.raw.exposure}`);
  addCard('Functional capacity sparkline', spark, 'sparkline');

  el.appendChild(grid);
}

function getDecisionWindowProfile(character = G.character, stage = getCurrentStage()) {
  const base = { baseMs: 28000, stageModifiersMs: { APPROACH: 4000, HIGH_CAMP: 0, SUMMIT_DAY: -4000 }, minFloorMs: 9000, gracePauseMs: 4500, degradeEveryMs: 5000 };
  const p = character?.engine?.decisionWindow || {};
  const stageMods = { ...base.stageModifiersMs, ...(p.stageModifiersMs || {}) };
  const total = (p.baseMs ?? base.baseMs) + (stageMods[stage] ?? 0);
  return {
    baseMs: p.baseMs ?? base.baseMs,
    stageModifiersMs: stageMods,
    minFloorMs: p.minFloorMs ?? base.minFloorMs,
    gracePauseMs: p.gracePauseMs ?? base.gracePauseMs,
    degradeEveryMs: p.degradeEveryMs ?? base.degradeEveryMs,
    totalWindowMs: Math.max(p.minFloorMs ?? base.minFloorMs, total),
  };
}

function computeDecisionWindowState() {
  const profile = getDecisionWindowProfile();
  const elapsed = Math.max(0, Date.now() - (G.turnDecisionStartedAt || Date.now()));
  const effectiveElapsed = Math.max(0, elapsed - (G.decisionPauseTurnsLeft || 0));
  const overMs = Math.max(0, effectiveElapsed - profile.totalWindowMs);
  const stepsOver = Math.floor(overMs / Math.max(profile.degradeEveryMs, 1000));
  const overRatio = overMs > 0 ? clamp(overMs / Math.max(profile.totalWindowMs, 1), 0, 2) : 0;
  return { profile, elapsed, effectiveElapsed, overMs, stepsOver, overRatio };
}

function getDecisionPressureCopy(winState = computeDecisionWindowState()) {
  if (winState.overMs <= 0) {
    const remaining = Math.max(0, Math.ceil((winState.profile.totalWindowMs - winState.effectiveElapsed) / 1000));
    const tone = remaining <= 6 ? 'warn' : '';
    return { countdown: `${remaining}s`, cls: tone, text: remaining <= 6 ? 'Signals are fading. Keep one clean anchor.' : 'Partial information: hold trend over impulse.' };
  }
  if (winState.overRatio < 0.5) return { countdown: `+${Math.ceil(winState.overMs/1000)}s`, cls: 'warn', text: 'Time debt rising: confidence softens, not certainty.' };
  return { countdown: `+${Math.ceil(winState.overMs/1000)}s`, cls: 'critical', text: 'Late decision: noise increases; action remains possible.' };
}

function applyDecisionWindowDegradation(actionMod, perception) {
  const winState = computeDecisionWindowState();
  const guardrails = perception?.guardrails || getPerceptionGuardrails();
  const degraded = applyDecisionWindowDegradationRule({
    actionMod,
    perception,
    windowState: winState,
    guardrails,
    stage: getCurrentStage(),
  });

  recordTelemetry(G, {
    decisionTimeSpentMs: winState.effectiveElapsed,
    decisionWindowExceeded: degraded.effect.exceeded,
    decisionWindowEffect: degraded.effect,
    decisionWindowProfile: winState.profile,
  });
  return degraded;
}

function requestDecisionPause() {
  const status = document.getElementById('focus-pause-status');
  if (!status) return;
  if (G.decisionPauseUsed) {
    status.textContent = 'Focus pause already used in this run.';
    return;
  }
  const profile = getDecisionWindowProfile();
  recordTelemetry(G, {
    decisionPauseTurnsLeft: Math.max(G.decisionPauseTurnsLeft || 0, profile.gracePauseMs),
    decisionPauseUsed: true,
  });
  status.textContent = `Pause granted (+${Math.ceil(profile.gracePauseMs/1000)}s). Keep reading trend, not certainty.`;
  renderWatch();
}

// ════════════════════════════════════════════════
// DECISION HANDLING
// ════════════════════════════════════════════════
function setDecisionButtonsEnabled(enabled) {
  ['btn-advance','btn-advance-slow','btn-wait','btn-descend','btn-sleep','btn-shoot-photo','btn-focus-pause'].forEach(id => {
    const btn = document.getElementById(id);
    btn.disabled = !enabled;
    if (enabled) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  });
}

function applyTimeCost(action) {
  const actionMod = getActionModifier(action);
  const sim = getSimConfig();
  if (action === 'sleep') {
    G.day += 1;
    G.permitDay = G.day;
    G.minutesOfDay = sim.dayStartMinutes || TUNING.dayStartMinutes;
    return actionMod.timeCost || 480;
  }
  const minutes = actionMod.timeCost || 60;
  G.minutesOfDay += minutes;
  return minutes;
}

function applyBivouacPenalty(state, ep, flags) {
  const sim = getSimConfig();
  const biv = sim.bivouacPenalty || { ep: 20, fatigue: 18, exposure: 22, persistenceTurns: 8, capacity: 12 };
  if (G.minutesOfDay > 1320 && !isCampPosition(state.position)) {
    flags.push('forced-bivouac');
    state.fatigue = clamp(state.fatigue + biv.fatigue, 0, 100);
    state.exposure = clamp(state.exposure + biv.exposure, 0, 100);
    state.functional_capacity = clamp(state.functional_capacity - (biv.capacity || 12), 0, 100);
    G.persistenceTurns = Math.max(G.persistenceTurns, biv.persistenceTurns || 8);
    state.persistenceTier = 'critical';
    if (G.minutesOfDay >= 1440) {
      G.day += 1;
      G.permitDay = G.day;
      G.minutesOfDay = getSimConfig().dayStartMinutes || TUNING.dayStartMinutes;
    }
    return ep + (biv.ep || 20);
  }
  return ep;
}



function applySummitDifficultyRegressionGuard({ stage, acclPenalty, decisionEffect, pressureDelta }) {
  const guard = {
    stage,
    acclPenaltyRaw: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyApplied: Number((acclPenalty || 0).toFixed(2)),
    acclPenaltyCapped: false,
    pressureDeltaRaw: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaApplied: Number((pressureDelta || 0).toFixed(2)),
    pressureDeltaCapped: false,
    triggered: false,
  };
  if (stage !== 'SUMMIT_DAY') return guard;

  const acclPenaltyCap = 22;
  if (guard.acclPenaltyApplied > acclPenaltyCap) {
    guard.acclPenaltyApplied = acclPenaltyCap;
    guard.acclPenaltyCapped = true;
    guard.triggered = true;
  }

  const deltaCap = 52;
  if (guard.pressureDeltaApplied > deltaCap) {
    guard.pressureDeltaApplied = deltaCap;
    guard.pressureDeltaCapped = true;
    guard.triggered = true;
  }

  if (decisionEffect?.capped) guard.triggered = true;
  return guard;
}

function classifyDifficultyResponsibility() {
  const total = Math.max(1, G.turnLog.length);
  const systemicFlags = ['late-signal-lock-in', 'forced-bivouac', 'weather-window-closed', 'decision-window-exceeded', 'acclimatization-deficit'];
  const systemicTurns = G.turnLog.filter((t) => t.flags.some((f) => systemicFlags.includes(f))).length;
  const highRiskAdvances = G.turnLog.filter((t) => (t.decision === 'advance' || t.decision === 'advance_slowly') && (t.trend === 'worsening' || t.trend === 'worsening fast')).length;
  const decisionErrors = G.turnLog.filter((t) => t.flags.includes('critical-fatigue') || t.flags.includes('critical-exposure')).length + highRiskAdvances;
  const systemicShare = systemicTurns / total;
  const decisionShare = decisionErrors / total;
  if (systemicShare >= 0.45 && systemicShare > decisionShare) return { label: 'Systemic pressure dominated', detail: `~${Math.round(systemicShare * 100)}% of turns carried systemic pressure flags.` };
  if (decisionShare >= 0.3) return { label: 'Decision pattern dominated', detail: `~${Math.round(decisionShare * 100)}% of turns showed high-risk choice patterns.` };
  return { label: 'Mixed responsibility', detail: 'Pressure and choices interacted without a single dominant source.' };
}


const { resolveTurn, evaluateOutcome, updateState } = createTurnEngine({
  G,
  POSITIONS,
  CANONICAL_OUTCOMES,
  canUseShootPhoto,
  getActionModifier,
  applyTimeCost,
  spendResourcesForMinutes,
  getCurrentNode,
  getCurrentStage,
  getPersistenceTier,
  calculateEnvironmentalPressure,
  applyBivouacPenalty,
  calculateBodyTolerance,
  calculatePerception,
  applyDecisionWindowDegradation,
  applySummitDifficultyRegressionGuard,
  isCampPosition,
  updateAmbientSignal,
  computeSignals,
  renderNarrative,
  deriveTerminalOutcome,
  getTimeWindows: () => getSimConfig().timeWindows || { summitLateStart: 780 },
  updateRunState,
  recordTelemetry,
  assertStateShape,
});

function makeDecision(decision) {
  setDecisionButtonsEnabled(false);
  const decisionPanel = document.querySelector('.decision-panel');
  if (decisionPanel) decisionPanel.classList.add('processing');
  const s = G.state;

  if (decision === 'sleep' && !isCampPosition(s.position)) {
    if (decisionPanel) decisionPanel.classList.remove('processing');
    setDecisionButtonsEnabled(true);
    return;
  }

  assertStateShape(G, 'before resolveTurn', { throwOnError: true });
  const turnResult = resolveTurn(s, decision);
  const resolvedDecision = turnResult.resolvedAction || decision;
  updateRunState(G, { signals: computeSignals() });
  renderWatch();
  const narrativeText = renderNarrative(resolvedDecision, G.signals, turnResult.flags);

  const logEntry = {
    turn: G.turn,
    day: G.day,
    time: formatMinutes(G.minutesOfDay),
    position: s.position,
    decision: resolvedDecision,
    trend: G.signals.trend,
    uncertainty: G.signals.uncertainty,
    body: { capacity: capacityLabel(s.functional_capacity), fatigue: fatigueLabel(s.fatigue), exposure: exposureLabel(s.exposure) },
    raw: { capacity: s.functional_capacity, fatigue: s.fatigue, exposure: s.exposure, weatherSeverity: s.weather_severity },
    pressure: {
      mountainPressure: pressureBandLabel(turnResult.result?.pressureDelta + calculateBodyTolerance(s)),
      deltaLabel: pressureDeltaLabel(turnResult.result?.pressureDelta),
    },
    flags: [...turnResult.flags],
    blocked: turnResult.result.blocked,
    moved: turnResult.result.moved,
    decisionMs: G.decisionTimeSpentMs,
    decisionWindowExceeded: G.decisionWindowExceeded,
    decisionWindowEffect: G.decisionWindowEffect,
    onboardingLayer: G.onboardingLayer,
    primaryAlert: G.currentPrimaryAlert,
    lateSignalActivation: turnResult.lateSignalEvent,
    narrativeText,
  };
  updateRunState(G, {
    turnLog: [...G.turnLog, logEntry],
    allFlags: [...G.allFlags, ...turnResult.flags],
  });
  addLogEntry(logEntry);

  const returnedToHorcones = s.position === 'horcones' && G.highestPosIdx > 0;
  const ended = returnedToHorcones || turnResult.outcome !== 'Strategic Retreat';

  if (ended) {
    if (decisionPanel) decisionPanel.classList.remove('processing');
    setTimeout(() => endRun(returnedToHorcones), 800);
    return;
  }

  updateRunState(G, { turn: G.turn + 1 });
  recordTelemetry(G, { turnDecisionStartedAt: Date.now(), decisionPauseTurnsLeft: 0 });
  setTimeout(() => {
    renderWatch();
    renderNarrative(null, G.signals);
    setDecisionButtonsEnabled(true);
    if (decisionPanel) decisionPanel.classList.remove('processing');
  }, 400);
}

// ════════════════════════════════════════════════
// LOG ENTRY
// FIX: uses logEntry.narrativeText directly (no DOM read)
// ════════════════════════════════════════════════
function addLogEntry(entry) {
  const container = document.getElementById('log-entries');
  const empty = container.querySelector('.log-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = 'log-entry';

  const decisionDisplay = { advance:'ADVANCED', advance_slowly:'ADV. SLOWLY', wait:'WAITED', descend:'DESCENDED', sleep:'SLEPT', shoot_photo:'PHOTO TAKEN' }[entry.decision];
  const blockedNote = entry.blocked ? ' · blocked' : (!entry.moved && (entry.decision==='advance'||entry.decision==='advance_slowly') ? ' · no progress' : '');

  const meta = document.createElement('div');
  meta.className = 'log-entry-meta';
  meta.append(document.createTextNode(`T${entry.turn} · D${entry.day} ${entry.time} · ${POS_LABELS[entry.position]} · `));
  const decisionTag = document.createElement('span');
  decisionTag.className = 'decision-tag';
  decisionTag.textContent = decisionDisplay;
  meta.appendChild(decisionTag);
  const pressureTime = entry.decisionWindowExceeded ? ` · +${Math.ceil(Math.max((entry.decisionWindowEffect?.overMs || 0)/1000,1))}s late` : ` · ${Math.max(1, Math.round((entry.decisionMs || 0)/1000))}s`;
  meta.append(document.createTextNode(`${blockedNote} | ${entry.trend} · ${entry.uncertainty}${pressureTime} | ${entry.body.capacity} · ${entry.body.fatigue} · ${entry.body.exposure}`));

  const narrative = document.createElement('div');
  narrative.className = 'log-entry-narrative';
  narrative.textContent = entry.narrativeText || '—';

  div.appendChild(meta);
  div.appendChild(narrative);

  entry.flags.forEach((f) => {
    const flag = document.createElement('div');
    flag.className = f.includes('critical') || f.includes('collapse') ? 'log-flag' : 'log-flag flag-warn';
    flag.textContent = f.toUpperCase();
    div.appendChild(flag);
  });
  container.prepend(div);

  // keep only last 5
  const entries = container.querySelectorAll('.log-entry');
  if (entries.length > 5) entries[entries.length-1].remove();
}

// ════════════════════════════════════════════════
// END RUN / CLASSIFY
// ════════════════════════════════════════════════
function classifyOutcome() {
  const map = {
    'Summit and Safe Return': 'outcome-success',
    'High Point Return': 'outcome-retreat',
    'Strategic Retreat': 'outcome-retreat',
    'Rescue': 'outcome-collapse',
    'Collapse (Fatigue)': 'outcome-collapse',
    'Collapse (Exposure)': 'outcome-collapse',
    'Resource Exhaustion': 'outcome-collapse',
    'Expedition Window Closed': 'outcome-stabilized',
    'Fatality': 'outcome-collapse',
  };
  return { label: G.finalOutcome || 'Strategic Retreat', cls: map[G.finalOutcome] || 'outcome-retreat' };
}

function findTurningPoint() {
  const irreversible = G.turnLog.find(e => e.flags.includes('first-irreversible-point'));
  if (irreversible) return `Turn ${irreversible.turn}: First Irreversible Point reached at ${POS_LABELS[irreversible.position]}. Retreat costs increased from this point.`;

  const firstCritical = G.turnLog.find(e => e.flags.some(f => f.includes('critical')));
  if (firstCritical) return `Turn ${firstCritical.turn}: first critical flag (${firstCritical.flags.find(f => f.includes('critical'))}).`;

  const firstWindowClose = G.turnLog.find(e => e.flags.includes('weather-window-closed'));
  if (firstWindowClose) return `Turn ${firstWindowClose.turn}: weather window closed; conditions degraded after.`;

  const firstWater0 = G.turnLog.find(e => e.flags.includes('water-depleted'));
  if (firstWater0) return `Turn ${firstWater0.turn}: water depleted; collapse risk accelerated.`;

  return 'No single event dominated; the outcome emerged from cumulative micro-decisions.';
}

function findPrimaryCause() {
  const reasonByOutcome = {
    'Rescue': 'Main cause: body thresholds crossed outside camp. Actionable next run: call descent one turn earlier once trend worsens with low confidence.',
    'Collapse (Fatigue)': 'Main cause: fatigue debt compounded faster than recovery windows. Actionable next run: rotate advance/slow/wait before entering high-camp segment.',
    'Collapse (Exposure)': 'Main cause: exposure accumulated during adverse pressure turns. Actionable next run: avoid chaining aggressive pushes while trend is worsening.',
    'Resource Exhaustion': 'Main cause: water/food burn outpaced route progress. Actionable next run: protect resources early and treat warning chips as mandatory replanning moments.',
    'Permit Expired': 'Main cause: permit clock overran before safe completion. Actionable next run: tighten tempo on low-risk windows and descend earlier when delays stack.',
    'Expedition Window Closed': 'Main cause: summit window closed before execution aligned. Actionable next run: convert waiting turns into controlled movement during optimal time blocks.',
    'Strategic Retreat': 'Main cause: chosen retreat to preserve return safety. Actionable next run: compare retreat trigger turn against body/resource warning onset to calibrate risk timing.',
    'High Point Return': 'Main cause: progress peak reached but return margin remained the priority. Actionable next run: reserve more body capacity before the final push segment.',
    'Summit and Safe Return': 'Main cause: pressure management stayed ahead of cumulative debt. Actionable next run: replicate pacing pattern around warning transitions.',
    'Fatality': 'Main cause: critical limits were exceeded beyond recoverable range. Actionable next run: treat first critical flag as immediate descend trigger.',
  };
  return reasonByOutcome[G.finalOutcome] || 'Main cause: cumulative micro-decisions under uncertainty. Actionable next run: review first warning turn and adjust tempo one step earlier.';
}


function buildReflectionPrompts() {
  const log = G.turnLog;
  const staticPrompts = [
    { text:'Which signal influenced your choices most?', dynamic:false },
    { text:'Did waiting feel like strategy or surrender?', dynamic:false },
    { text:'Did the outcome feel earned, or imposed by the system?', dynamic:false },
  ];
  const dynamicPool = [];

  const worseningAdvances = log.filter(e => (e.decision==='advance'||e.decision==='advance_slowly') && e.trend==='worsening').length;
  if (worseningAdvances >= 3) dynamicPool.push('The trend said worsening on multiple turns you chose to advance. What were you reading instead?');
  const waitCount = log.filter(e => e.decision==='wait').length;
  if (waitCount >= 4) dynamicPool.push('You waited more than you moved. Was that reading the system — or avoiding it?');
  const earlyResource = log.find(e => e.turn < 10 && (e.flags.includes('water-depleted')||e.flags.includes('food-depleted')));
  if (earlyResource) dynamicPool.push('Resources ran out earlier than expected. When did the math stop being in your favor?');
  const earlyDescent = log.find(e => e.decision==='descend' && e.turn < 14);
  if (earlyDescent) dynamicPool.push('You called it early. What signal made that feel like the right moment?');
  const incap = log.find(e => e.flags.includes('critical-fatigue')||e.flags.includes('critical-exposure'));
  if (incap) dynamicPool.push('The body gave signals before it stopped. At what point did they become hard to ignore?');

  // character-specific
  const charPrompts = {
    francisco: 'Endurance kept you moving. Which signals almost got buried under that stamina?',
    laura: 'Your readings were precise. Did caution help timing, or close a useful window?',
    erik: 'Experience sharpened execution. When did confidence start filtering risk signals out?',
    daniela: 'You read the environment early. How often did your body force a different decision?',
    blake: 'Determination was real. Which turns revealed the gap between intent and preparation?',
    irina: 'Your baseline was strong. Where did old pattern recognition conflict with present conditions?',
  };
  dynamicPool.push(charPrompts[G.character.id] || 'What did the mountain show that your assumptions almost ignored?');

  // pick 2
  const picked = dynamicPool.slice(0, 2).map(t => ({ text:t, dynamic:true }));
  return [...staticPrompts, ...picked];
}

function endRun(returnedToHorcones) {
  if (DECISION_TICKER) { clearInterval(DECISION_TICKER); DECISION_TICKER = null; }
  const outcome = classifyOutcome();
  const sc = G.scenario;
  const s = G.state;

  // random mode adaptive fairness
  updateRunState(G, {
    consecutiveCollapses: outcome.cls === 'outcome-collapse' ? G.consecutiveCollapses + 1 : 0,
  });

  // save to journal
  recordTelemetry(G, { runLogRecords: G.runLogRecords.map((entry) => ({ ...entry, outcome: outcome.label })) });
  const runLogExport = buildRunLogExport();
  try { localStorage.setItem('run_log.json', JSON.stringify(runLogExport, null, 2)); } catch (e) {}
  saveJournalEntry({
    runNum: G.runNumber,
    scenario: sc.name,
    seed: G.seed,
    character: G.character.name,
    outcome: outcome.label,
    highest: POS_LABELS[POSITIONS[G.highestPosIdx]],
    turns: G.turnLog.length,
    constraint: G.allFlags.length ? G.allFlags[G.allFlags.length-1] : 'timebox',
  });

  // build debrief
  const outEl = document.getElementById('debrief-outcome-val');
  outEl.textContent = outcome.label;
  outEl.className = 'debrief-outcome-value ' + outcome.cls;

  document.querySelectorAll('.debrief-late-msg').forEach((el) => el.remove());
  const retreatMsg = document.getElementById('debrief-retreat-msg');
  if (returnedToHorcones) {
    retreatMsg.textContent = 'The expedition ends at Horcones. The true summit is the safe return.';
    retreatMsg.style.display = 'block';
  } else if (outcome.label === 'Expedition Window Closed') {
    retreatMsg.textContent = 'The expedition window closed. Every mountain has a clock you cannot stop.';
    retreatMsg.style.display = 'block';
  } else { retreatMsg.style.display = 'none'; }

  if (G.lateSignalDeterminantTurns > 0) {
    const lateMsg = document.createElement('div');
    lateMsg.className = 'debrief-retreat-msg debrief-late-msg';
    lateMsg.style.display = 'block';
    lateMsg.textContent = G.lateSignalDeterminantTurns === 1
      ? 'Late signal activation shaped a key turn. The decisive warning became clear only near the edge.'
      : `Late signal activation shaped ${G.lateSignalDeterminantTurns} turns. Clarity arrived progressively under pressure.`;
    retreatMsg.parentNode.insertBefore(lateMsg, retreatMsg.nextSibling);
  }

  const debriefStats = document.getElementById('debrief-stats');
  clearElement(debriefStats);
  const statsRows = [
    ['Character', G.character.name],
    ['Highest position', POS_LABELS[POSITIONS[G.highestPosIdx]]],
    ['Turns', String(G.turnLog.length)],
    ['Scenario', `${sc.name} · ${G.seed}`],
  ];
  statsRows.forEach(([label, value]) => {
    const item = document.createElement('div');
    const labelEl = document.createElement('div');
    labelEl.className = 'debrief-stat-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.className = 'debrief-stat-val';
    valueEl.textContent = value;
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    debriefStats.appendChild(item);
  });

  document.getElementById('debrief-turning-point').textContent = findTurningPoint();
  const responsibility = classifyDifficultyResponsibility();
  document.getElementById('debrief-cause').textContent = `${findPrimaryCause()} ${responsibility.label}: ${responsibility.detail}`;

  // log table
  const table = document.getElementById('debrief-log-table');
  clearElement(table);
  const headerRow = document.createElement('tr');
  ['T','Day/Time','Position','Decision','Trend','Unc.','Capacity','Fatigue','Exposure','Flags'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  G.turnLog.forEach(e => {
    const tr = document.createElement('tr');
    const decLabel = { advance:'Advance', advance_slowly:'Adv. Slowly', wait:'Wait', descend:'Descend', sleep:'Sleep' }[e.decision];
    const cells = [
      { value: String(e.turn) },
      { value: `D${e.day || 1} ${e.time || '06:00'}` },
      { value: POS_LABELS[e.position] },
      { value: decLabel, className: 'td-decision' },
      { value: e.trend },
      { value: e.uncertainty },
      { value: e.body.capacity },
      { value: e.body.fatigue },
      { value: e.body.exposure },
      { value: e.flags.join(', '), className: 'td-flag' },
    ];
    cells.forEach(({ value, className }) => {
      const td = document.createElement('td');
      if (className) td.className = className;
      td.textContent = value;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  buildDebriefAnalytics();

  // reflections
  const reflections = buildReflectionPrompts();
  const ul = document.getElementById('reflection-list');
  clearElement(ul);
  reflections.forEach(r => {
    const li = document.createElement('li');
    li.className = r.dynamic ? 'dynamic' : '';
    li.textContent = r.text;
    ul.appendChild(li);
  });

  // debrief actions
  // FIX: journal button records that we came from debrief
  const debriefActions = document.getElementById('debrief-actions');
  clearElement(debriefActions);
  [
    { label: 'Same scenario + seed', cls: 'btn-primary', onClick: replaySameSeed },
    { label: 'Same scenario + new seed', cls: 'btn-ghost', onClick: replayNewSeed },
    { label: 'Change character', cls: 'btn-ghost', onClick: () => showScreen('character') },
    { label: 'Same character, new scenario', cls: 'btn-ghost', onClick: goChooseScenario },
    { label: 'Export run_log.json', cls: 'btn-ghost', onClick: exportRunLog },
    { label: 'View Expedition Journal', cls: 'btn-ghost', onClick: () => openJournalFrom('debrief') },
  ].forEach(({ label, cls, onClick }) => {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = label;
    btn.onclick = onClick;
    debriefActions.appendChild(btn);
  });

  if (G.finalOutcome === 'Summit and Safe Return') {
    showScreen('summit-success');
  } else {
    showScreen('debrief');
  }
}

function exportRunLog() {
  const blob = new Blob([JSON.stringify(buildRunLogExport(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'run_log.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function summarizeRunLog(records) {
  const summary = {
    totalTurns: records.length,
    criticalEventCount: 0,
    decisionWindowExceededCount: 0,
    lateSignalTriggeredCount: 0,
    specialActionUsedCount: 0,
  };

  records.forEach((entry) => {
    const hasCriticalFlag = (entry.flags || []).some((flag) =>
      ['critical-fatigue', 'critical-exposure', 'fatality-threshold'].includes(flag)
    );
    if (hasCriticalFlag) summary.criticalEventCount += 1;
    if (entry.decisionWindowExceeded) summary.decisionWindowExceededCount += 1;
    if (entry.lateSignalTriggered || entry.lateSignalActivation) summary.lateSignalTriggeredCount += 1;
    if (entry.specialActionUsed) summary.specialActionUsedCount += 1;
  });

  return summary;
}

function buildRunLogExport() {
  if (!G.runLogRecords.length) return [];

  const summary = summarizeRunLog(G.runLogRecords);
  return G.runLogRecords.map((entry, idx) => {
    if (idx !== G.runLogRecords.length - 1) return entry;
    return {
      ...entry,
      runSummary: summary,
    };
  });
}

// FIX: journal navigation helper — records the origin screen
function openJournalFrom(origin) {
  updateUIState(G, { journalReturnScreen: origin });
  showScreen('journal');
}

function replaySameSeed() {
  updateRunState(G, { turn: 1, turnLog: [], allFlags: [] });
  startGame();
}
function replayNewSeed() {
  const sc = G.scenario;
  updateRunState(G, { seed: sc.seeds ? sc.seeds[Math.floor(Math.random()*sc.seeds.length)] : Math.floor(Math.random()*9000)+1000 });
  startGame();
}
function goChooseScenario() {
  selectedScenarioId = null; selectedSeed = null;
  buildScenarioGrid();
  showScreen('scenario');
}

// ════════════════════════════════════════════════
// JOURNAL
// Uses localStorage; key renamed to avoid ambiguity.
// FIX: key renamed from 'ass_journal_v1' to 'aconcagua_journal_v1'
// ════════════════════════════════════════════════
const JOURNAL_KEY = 'aconcagua_journal_v1';

// FIX: migrate any existing data from old key
(function migrateJournalKey() {
  try {
    const old = localStorage.getItem('ass_journal_v1');
    if (old && !localStorage.getItem(JOURNAL_KEY)) {
      localStorage.setItem(JOURNAL_KEY, old);
      localStorage.removeItem('ass_journal_v1');
    }
  } catch(e) {}
})();

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); } catch(e) { return []; }
}
function saveJournalEntry(entry) {
  try {
    let entries = loadJournal();
    entries.unshift(entry);
    if (entries.length > 50) entries = entries.slice(0, 50);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  } catch(e) {}
}
function clearJournal() {
  if (!confirm('Clear all expedition records?')) return;
  localStorage.removeItem(JOURNAL_KEY);
  renderJournal();
}
function renderJournal() {
  const entries = loadJournal();
  const container = document.getElementById('journal-entries');
  clearElement(container);
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'journal-empty';
    empty.textContent = 'No expeditions recorded. The first run will appear here.';
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

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

document.addEventListener('keydown', (event) => {
  if (event.repeat || isTypingTarget(event.target)) return;
  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen || !gameScreen.classList.contains('active')) return;

  const map = {
    '1': 'btn-advance',
    '2': 'btn-advance-slow',
    '3': 'btn-wait',
    '4': 'btn-descend',
    '5': 'btn-sleep',
    '6': 'btn-shoot-photo',
    '0': 'btn-focus-pause',
  };
  const buttonId = map[event.key];
  if (!buttonId) return;

  const button = document.getElementById(buttonId);
  if (!button || button.disabled || button.style.display === 'none') return;
  event.preventDefault();
  button.click();
});

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
initVisualMode();
initSplashScreen();

loadDataConfig().finally(() => {
  buildCharacterGrid();
});

window.showScreen = showScreen;
window.makeDecision = makeDecision;
window.openJournalFrom = openJournalFrom;
window.replaySameSeed = replaySameSeed;
window.replayNewSeed = replayNewSeed;
window.goChooseScenario = goChooseScenario;
window.startGame = startGame;
window.confirmScenario = confirmScenario;
window.confirmCharacter = confirmCharacter;
window.confirmPart2Character = confirmPart2Character;
window.requestDecisionPause = requestDecisionPause;
window.clearJournal = clearJournal;

export { showScreen, makeDecision, renderWatch, buildCharacterGrid, resolveTurn, evaluateOutcome, updateState };
