// prototype/web-3d/src/main.js
//
// Aconcagua: Stone Sentinel — third-person 3D vertical slice.
//
// Flow:   title → setup (climber + scenario) → briefing → walk → debrief
// Rules:  the canonical web-v1 turn engine, driven through ./sim.js.
// Input:  actions are walked, not picked — see ./route.js for the turn mapping.

import * as THREE from 'three';
import { createExpedition, normalizeNodes } from './sim.js';
import { buildRoute, V_SCALE } from './route.js';
import { createTerrain } from './terrain.js';
import { buildWorld } from './world.js';
import { createSky } from './sky.js';
import { buildCharacter, CHARACTER_LOOKS } from './character.js';
import { createAudio } from './audio.js';
import { createPost } from './post.js';
import { clamp, lerp } from './noise.js';
import {
  t, label, initLanguage, setLanguage, getLanguage, localizeCharacter, localizeScenario, DIALOGUE,
} from './i18n.js';
import { isUnlocked, tryUnlock } from './gate.js';
import { PART2_PLATES } from './part2-data.js';
import { formatMinutes, bodyValueClass } from '../../web-v1/ui/helpers/screen-utils.js';
import { findPrimaryCause, findTurningPoint, buildReflectionPrompts } from '../../web-v1/ui/screens/debrief.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const tt = (en, es) => (getLanguage() === 'es' ? es : en);

const DATA_FILES = {
  nodes: 'nodes.json',
  environmentalPressure: 'environmental_pressure_config.json',
  actionModifiers: 'action_modifiers.json',
  stageModifiers: 'stage_modifiers.json',
  characters: 'characters.json',
  characterEvents: 'character_events.json',
  contextEvents: 'context_events.json',
  outcomes: 'outcomes.json',
  scenarios: 'scenarios.web-v1.json',
};
const PORTRAITS = {
  francisco: 'francisco-aguirre', laura: 'laura-kim', erik: 'erik-lundvall',
  daniela: 'daniela-de-rossi', blake: 'blake-harris', irina: 'irina-orlova',
};
const portraitUrl = (id) => new URL(`../../../art/characters/${PORTRAITS[id] || 'random'}.png`, import.meta.url).href;

const artUrl = (rel) => new URL(`../../../art/${rel}`, import.meta.url).href;
// Shared with web-v1: a summit there (or here) opens the Part 2 plates on both.
const SUMMIT_ACHIEVED_KEY = 'aconcagua_summit_achieved_v1';
const hasSummitedBefore = () => { try { return localStorage.getItem(SUMMIT_ACHIEVED_KEY) === '1'; } catch (_) { return false; } };
// Plates that ship without their own illustration borrow a curated scene.
const PLATE_FALLBACK_ART = {
  team_presentation: 'concept-art/curated/ig/17.png',
  after_circle: 'concept-art/curated/ig/5.png',
  guides: 'concept-art/curated/ig/23.png',
  briefing_night: 'concept-art/curated/ig/25.png',
};
const OUTCOME_ART = {
  'Summit and Safe Return': 'concept-art/curated/ig/1.png',
  'High Point Return': 'concept-art/curated/ig/11.png',
  'Strategic Retreat': 'concept-art/curated/ig/21.png',
};
const DEFAULT_OUTCOME_ART = 'concept-art/curated/ig/9.png';
const NIGHT_ART = 'concept-art/curated/ig/7.png';

const SPEED = { steady: 5.6, careful: 3.7 };
const CORRIDOR = 92;
const GOOD_OUTCOMES = new Set(['Summit and Safe Return']);
const NEUTRAL_OUTCOMES = new Set(['High Point Return', 'Strategic Retreat']);
const DOWN_OUTCOMES = new Set(['Rescue', 'Collapse (Fatigue)', 'Collapse (Exposure)', 'Resource Exhaustion', 'Fatality']);

const app = {
  screen: 'title',
  data: null,
  route: null,
  terrain: null,
  world: null,
  sky: null,
  renderer: null,
  scene: null,
  camera: null,
  audio: createAudio(),
  npcs: [],
  pick: { characterId: 'francisco', scenarioId: 'assisted-route', seed: null },
  run: null,
  paused: false,
  touch: false,
  quality: 'high',
  post: null,
  timeScale: 1, // debug/test only: simulation sub-steps per rendered frame
};

// ───────────────────────────────────────────────────────────────────────────
// i18n plumbing
// ───────────────────────────────────────────────────────────────────────────
const NODE_ES = [
  [/^Approach Camp — /, 'Campamento de aproximación — '],
  [/^Base Camp — /, 'Campamento base — '],
  [/^Camp (\d) — /, 'Campo $1 — '],
  [/^Horcones Lagoon$/, 'Laguna de Horcones'],
  [/^Summit$/, 'Cumbre'],
];
function nodeName(node) {
  const base = node.name.replace(/\s*\(\d+m\)/, '');
  if (getLanguage() !== 'es') return base;
  for (const [re, rep] of NODE_ES) if (re.test(base)) return base.replace(re, rep);
  return base;
}
const stageName = (stage) => ({
  APPROACH: tt('Approach', 'Aproximación'),
  HIGH_CAMP: tt('High camps', 'Campamentos altos'),
  SUMMIT_DAY: tt('Summit day', 'Día de cumbre'),
}[stage] || stage);

function buildControls(el) {
  const rows = [
    [['W', 'A', 'S', 'D'], 'controls.move'],
    [[tt('mouse', 'mouse'), t('controls.drag')], 'controls.camera'],
    [['C'], 'controls.pace'],
    [['R'], 'controls.rest'],
    [['E'], 'controls.interact'],
    [['F'], 'controls.auto'],
    [['P'], 'controls.photo'],
    [['L'], 'controls.log'],
    [['Esc'], 'controls.pause'],
    [['M'], 'controls.mute'],
  ];
  el.replaceChildren();
  for (const [keys, key] of rows) {
    const dt = document.createElement('dt');
    keys.forEach((k) => { const kbd = document.createElement('kbd'); kbd.textContent = k; dt.appendChild(kbd); });
    const dd = document.createElement('dd');
    dd.textContent = t(key);
    el.append(dt, dd);
  }
}

function applyI18n() {
  document.documentElement.lang = getLanguage();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('lang-toggle').textContent = getLanguage() === 'es' ? 'EN' : 'ES';
  buildControls($('controls-list'));
  buildControls($('controls-list-pause'));
  if (app.data) renderSetup();
  if (app.run) { app.run.exp.setLanguage(getLanguage()); updateHud(true); }
  if (app.screen === 'debrief' && app.run) renderDebrief();
  if (app.screen === 'part2') renderPlate();
}

// ───────────────────────────────────────────────────────────────────────────
// Screens
// ───────────────────────────────────────────────────────────────────────────
function showScreen(name) {
  app.screen = name;
  for (const id of ['title', 'setup', 'brief', 'debrief', 'part2']) $(`screen-${id}`).classList.toggle('active', id === name);
  const playing = name === 'play';
  $('hud').hidden = !playing;
  document.body.classList.toggle('playing', playing);
  if (!playing) { $('log-panel').hidden = true; $('pause-panel').hidden = true; app.paused = false; }
}

function pickButton({ id, name, meta, img, checked, onPick }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pick';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(checked));
  b.dataset.id = id;
  if (img) {
    const im = document.createElement('img');
    im.src = img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
    b.appendChild(im);
  }
  const wrap = document.createElement('span');
  const n = document.createElement('span');
  n.className = 'name'; n.textContent = name;
  const m = document.createElement('span');
  m.className = 'meta'; m.textContent = meta;
  wrap.append(n, m);
  b.appendChild(wrap);
  b.addEventListener('click', onPick);
  return b;
}

function renderSetup() {
  const { characters, scenarios } = app.data;
  const cl = $('character-list');
  cl.replaceChildren();
  characters.forEach((raw) => {
    const c = localizeCharacter(raw);
    cl.appendChild(pickButton({
      id: c.id, name: c.name, meta: `${c.flag || ''} ${c.role}`.trim(), img: portraitUrl(c.id),
      checked: app.pick.characterId === c.id,
      onPick: () => { app.pick.characterId = c.id; renderSetup(); },
    }));
  });
  const sel = localizeCharacter(characters.find((c) => c.id === app.pick.characterId) || characters[0]);
  const detail = $('character-detail');
  detail.replaceChildren();
  const who = document.createElement('div');
  who.className = 'who';
  const im = document.createElement('img');
  im.src = portraitUrl(sel.id); im.alt = sel.name;
  const names = document.createElement('div');
  const b = document.createElement('b'); b.textContent = sel.name;
  const sp = document.createElement('span'); sp.textContent = `${sel.role} · ${t('setup.difficulty')}: ${label(sel.difficultyLabel)}`;
  names.append(b, sp);
  who.append(im, names);
  const bio = document.createElement('p');
  bio.textContent = sel.bio;
  detail.append(who, bio);
  if (getLanguage() === 'en' && Array.isArray(sel.traits)) {
    const ul = document.createElement('ul');
    sel.traits.forEach((trait) => { const li = document.createElement('li'); li.textContent = trait; ul.appendChild(li); });
    detail.appendChild(ul);
  }

  const sl = $('scenario-list');
  sl.replaceChildren();
  scenarios.predefinedScenarios.forEach((raw) => {
    const s = localizeScenario(raw);
    sl.appendChild(pickButton({
      id: s.id, name: `${s.num} · ${s.name}`, meta: `${t('setup.difficulty')}: ${label(s.difficulty)}`,
      checked: app.pick.scenarioId === s.id,
      onPick: () => { app.pick.scenarioId = s.id; renderSetup(); },
    }));
  });
  const sc = localizeScenario(scenarios.predefinedScenarios.find((s) => s.id === app.pick.scenarioId) || scenarios.predefinedScenarios[0]);
  $('scenario-detail').textContent = sc.desc;
}

// ───────────────────────────────────────────────────────────────────────────
// Boot
// ───────────────────────────────────────────────────────────────────────────
function refreshGate() {
  const open = isUnlocked();
  $('gate').hidden = open;
  $('btn-begin').hidden = !open;
  $('btn-title-part2').hidden = !(open && hasSummitedBefore());
}

// ── Part 2: narrative plates ───────────────────────────────────────────────
const plate = { index: 0, from: 'title' };
function openPart2(from) {
  plate.index = 0;
  plate.from = from;
  showScreen('part2');
  renderPlate();
}
function renderPlate() {
  const raw = PART2_PLATES[plate.index];
  const es = getLanguage() === 'es' ? raw.es : {};
  const last = plate.index === PART2_PLATES.length - 1;
  $('plate-count').textContent = `${t('part2.kicker')} · ${plate.index + 1}/${PART2_PLATES.length}`;
  $('plate-kicker').textContent = es.eyebrow ?? raw.eyebrow ?? '';
  const title = es.title ?? raw.title ?? '';
  $('plate-title').textContent = title;
  $('plate-title').hidden = !title;
  const box = $('plate-text');
  box.replaceChildren();
  String(es.body ?? raw.body).split(/\n\n+/).map((p) => p.trim()).filter(Boolean).forEach((text, i) => {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.animationDelay = `${0.25 + i * 0.35}s`;
    box.appendChild(p);
  });
  const art = $('plate-art');
  const rel = raw.art || PLATE_FALLBACK_ART[raw.id];
  art.style.backgroundImage = rel ? `url("${artUrl(rel)}")` : 'none';
  art.setAttribute('aria-label', es.illustrationAlt ?? raw.alt ?? '');
  // Restart the cross-fade.
  const screen = $('screen-part2');
  screen.classList.remove('enter');
  void screen.offsetWidth;
  screen.classList.add('enter');
  screen.scrollTop = 0;
  $('btn-plate-back').hidden = plate.index === 0;
  $('btn-plate-mail').hidden = !last;
  $('btn-plate-ig').hidden = !last;
  $('btn-plate-next').textContent = last ? t('part2.finish') : t('part2.next');
}
function plateStep(delta) {
  const next = plate.index + delta;
  if (next >= PART2_PLATES.length) { showScreen('setup'); return; }
  plate.index = Math.max(0, next);
  renderPlate();
}

async function loadData() {
  const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([key, file]) => {
    const res = await fetch(new URL(`../../../data/${file}`, import.meta.url));
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return [key, await res.json()];
  }));
  return Object.fromEntries(entries);
}

function fatal(message) {
  const el = $('fatal');
  el.textContent = message;
  el.hidden = false;
}

function initThree() {
  const canvas = $('view');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    fatal(t('error.webgl'));
    throw err;
  }
  // Quality: high = AO + bloom + grade + 4K shadows; medium drops AO; low renders direct.
  const asked = params.get('quality') || (params.get('lowfx') === '1' ? 'low' : null);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  app.quality = ['low', 'medium', 'high'].includes(asked) ? asked : (coarse ? 'medium' : 'high');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, app.quality === 'high' ? 2 : app.quality === 'medium' ? 1.5 : 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // `lowfx=1` is the escape hatch for weak devices: it also drops the shadow pass.
  renderer.shadowMap.enabled = params.get('lowfx') !== '1';
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.3, 12000);
  app.renderer = renderer; app.scene = scene; app.camera = camera;
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    app.post?.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  });
}

function setQuality(level) {
  app.quality = level;
  app.post?.dispose();
  app.post = null;
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, level === 'high' ? 2 : level === 'medium' ? 1.5 : 1));
  app.renderer.setSize(window.innerWidth, window.innerHeight, false);
  app.sky.setShadowQuality(level === 'high' ? 4096 : level === 'medium' ? 2048 : 1024);
  if (level !== 'low') {
    try {
      app.post = createPost({ renderer: app.renderer, scene: app.scene, camera: app.camera, quality: level });
    } catch (err) {
      console.warn('post-processing unavailable, rendering direct', err);
      app.post = null;
    }
  }
  document.body.dataset.quality = level;
}

const DEM_TIMEOUT_MS = 6000;

async function boot() {
  initLanguage(params.get('lang'));
  applyI18n();
  app.touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  try {
    app.data = await loadData();
  } catch (err) {
    fatal(`${t('error.data')}\n(${err.message})`);
    return;
  }
  initThree();
  let dem = null;
  try {
    const { DEM_META } = await import('./dem-meta.js');
    // Optional scenery must never hold the start button hostage: give up after a few seconds.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), DEM_TIMEOUT_MS);
    try {
      const res = await fetch(new URL('../assets/aconcagua-dem.bin', import.meta.url), { signal: abort.signal });
      if (res.ok) dem = { meta: DEM_META, data: new Uint16Array(await res.arrayBuffer()) };
    } finally {
      clearTimeout(timer);
    }
  } catch (_) { /* scenery only: the game runs without the backdrop */ }
  const nodes = normalizeNodes(app.data.nodes);
  app.route = buildRoute(nodes);
  app.terrain = createTerrain(app.route);
  app.world = buildWorld({ scene: app.scene, route: app.route, terrain: app.terrain, renderer: app.renderer, dem });
  app.sky = createSky({ scene: app.scene, renderer: app.renderer });
  setQuality(app.quality);
  app.world.npcAnchors.forEach((anchor) => {
    const npc = buildCharacter(anchor.id, { withPole: anchor.id === 'guide' || anchor.id === 'climber' });
    npc.root.position.copy(anchor.position);
    const dir = app.terrain.trailDirection(app.route.nodeS[anchor.nodeIndex], {});
    // Stand beside the trail, facing across it.
    npc.root.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2;
    app.scene.add(npc.root);
    app.npcs.push({ ...anchor, npc, baseYaw: npc.root.rotation.y, lineIndex: 0 });
  });

  if (params.get('char') && app.data.characters.some((c) => c.id === params.get('char'))) app.pick.characterId = params.get('char');
  if (params.get('scenario') && app.data.scenarios.predefinedScenarios.some((s) => s.id === params.get('scenario'))) app.pick.scenarioId = params.get('scenario');
  if (params.get('seed') && Number.isFinite(Number(params.get('seed')))) app.pick.seed = Number(params.get('seed'));

  renderSetup();
  bindUi();
  $('btn-begin').disabled = false;
  $('load-status').hidden = true;
  if (params.get('key')) tryUnlock(params.get('key'));
  refreshGate();
  $('debug').hidden = !DEBUG;
  requestAnimationFrame(frame);
  if (params.get('autostart') === '1' && isUnlocked()) { startRun(); enterPlay(); }
  window.__A3D = debugApi();
}

// ───────────────────────────────────────────────────────────────────────────
// Run lifecycle
// ───────────────────────────────────────────────────────────────────────────
function startRun({ sameSeed = false } = {}) {
  const { characters, scenarios } = app.data;
  const character = characters.find((c) => c.id === app.pick.characterId) || characters[0];
  const scenario = scenarios.predefinedScenarios.find((s) => s.id === app.pick.scenarioId) || scenarios.predefinedScenarios[0];
  let seed = sameSeed && app.run ? app.run.seed : app.pick.seed;
  if (seed == null) {
    const seeds = scenario.seeds || [];
    seed = seeds[Math.floor(Math.random() * seeds.length)] ?? Math.floor(Math.random() * 9000) + 1000;
  }
  app.pick.seed = null;

  if (app.run?.character) app.scene.remove(app.run.character.root);
  const exp = createExpedition({ data: app.data, character, scenario, seed, lang: getLanguage() });
  const hero = buildCharacter(character.id);
  app.scene.add(hero.root);
  app.world.setPlayerTentColor(CHARACTER_LOOKS[character.id]?.jacket || '#e2742c');

  const startS = 2;
  const p = app.terrain.pointAt(startS, 0, {});
  const dir = app.terrain.trailDirection(startS, {});
  const heading = Math.atan2(dir.x, dir.z);
  app.run = {
    exp, seed, character: hero, characterData: character, scenario,
    pos: new THREE.Vector3(p.x, app.terrain.heightAtRoute(startS, 0), p.z),
    s: startS, d: 0, heading, speed: 0, grade: 0,
    pace: 'steady', auto: 0,
    carefulDist: 0, steadyDist: 0,
    busy: null, cooldown: 0, dialog: null,
    lastNodeBanner: 0, summitShown: false, gateConfirmUntil: 0,
    cam: { yaw: heading, pitch: 0.17, dist: 9.5, manualAt: -10 },
    ended: false, edgeToastAt: 0, stepPhase: 0, clock: 0, hudAt: 0, interact: null,
    logCount: 0,
  };
  hero.root.position.copy(app.run.pos);
  hero.root.rotation.y = heading;
  app.npcs.forEach((n) => { n.lineIndex = 0; });
  syncSky(true);
  $('log-entries').replaceChildren();
  $('chips').replaceChildren();
  $('vignette').style.opacity = '0';
  $('fade').classList.remove('on', 'slow', 'art');
  $('fade-text').textContent = '';
  hideToast(); hideBanner();
  updateHud(true);
}

function enterPlay() {
  showScreen('play');
  $('touch').hidden = !app.touch;
  app.audio.start();
  const r = app.run;
  const node = r.exp.nodes[0];
  showBanner(tt('Day 1 · 06:00', 'Día 1 · 06:00'), nodeName(node), `${node.altitudeMeters} m`);
}

function syncSky(snap) {
  const { exp } = app.run;
  const abs = (exp.G.day - 1) * 1440 + exp.G.minutesOfDay;
  const goingBack = abs < app.sky.minutes - 1;
  app.sky.setConditions({ minutesAbsolute: abs, weather: exp.state.weather_severity, visibility: exp.state.visibility }, snap || goingBack);
}

// ───────────────────────────────────────────────────────────────────────────
// Turns
// ───────────────────────────────────────────────────────────────────────────
function resolve(action, { kicker = null, tone = '', snap = false } = {}) {
  const r = app.run;
  if (r.ended) return null;
  const res = r.exp.act(action);
  if (!res) return null;
  syncSky(snap);
  addLog(res.entry);
  if (!res.ended) showToast(kicker, res.narrative, tone);
  if (res.flags.includes('forced-bivouac')) flashChip(t('toast.dark'), 'danger');
  updateHud(true);
  if (res.ended) endRun(res);
  return res;
}

function attemptAdvance() {
  const r = app.run;
  const total = r.carefulDist + r.steadyDist;
  const action = (total > 1 ? r.carefulDist / total >= 0.6 : r.pace === 'careful') ? 'advance_slowly' : 'advance';
  r.carefulDist = 0; r.steadyDist = 0;
  const res = resolve(action, {});
  if (!res || res.ended) return;
  if (res.newIndex > res.previousIndex) {
    showToast(t('toast.through'), res.narrative, 'good');
    r.cooldown = 1.0;
  } else if (res.newIndex === res.previousIndex) {
    showToast(t('toast.hold'), res.narrative, 'bad');
    r.auto = 0;
    r.busy = { type: 'hold', t: 0, dur: 2.6, toS: app.route.cruxS[res.previousIndex] - 4.5 };
    r.cooldown = 2.8;
  } else {
    showToast(t('toast.retreat'), res.narrative, 'bad');
    r.auto = 0;
    relocate(app.route.nodeS[res.newIndex] + 2, `${t('toast.retreat')} ${nodeName(r.exp.nodes[res.newIndex])}`);
  }
}

function descendTurn() {
  const r = app.run;
  r.carefulDist = 0; r.steadyDist = 0;
  const res = resolve('descend', {});
  if (!res || res.ended) return;
  if (res.newIndex < res.previousIndex) {
    showToast(t('toast.descend'), res.narrative, '');
    r.cooldown = 1.0;
  } else {
    // The engine kept the node (should only happen alongside a terminal result).
    r.busy = { type: 'hold', t: 0, dur: 1.5, toS: app.route.cruxS[res.previousIndex - 1] + 4.5, up: true };
    r.cooldown = 2;
  }
}

async function relocate(s, text) {
  const r = app.run;
  r.busy = { type: 'cut', t: 0, dur: 99 };
  const fade = $('fade');
  $('fade-text').textContent = text || '';
  fade.classList.add('on');
  await wait(1000);
  placePlayer(s, 0);
  await wait(900);
  fade.classList.remove('on');
  if (!r.ended) r.busy = null;
  r.cooldown = 1.2;
}

function placePlayer(s, d) {
  const r = app.run;
  const p = app.terrain.pointAt(s, d, {});
  r.s = s; r.d = d;
  r.pos.set(p.x, app.terrain.heightAtRoute(s, d), p.z);
  r.character.root.position.copy(r.pos);
  const dir = app.terrain.trailDirection(s, {});
  r.heading = Math.atan2(dir.x, dir.z);
  r.cam.yaw = r.heading;
  r.lastNodeBanner = app.route.nearestNode(s).index;
}

function rest() {
  const r = app.run;
  if (r.busy || r.dialog || r.ended) return;
  r.auto = 0;
  const res = resolve('wait', { kicker: t('toast.rest') });
  if (!res || res.ended) return;
  r.busy = { type: 'rest', t: 0, dur: 2.8 };
}

async function sleep() {
  const r = app.run;
  if (r.busy || r.ended) return;
  if (!r.exp.isAtCamp()) { showToast(null, t('prompt.notCamp'), 'bad'); return; }
  r.auto = 0;
  r.busy = { type: 'sleep', t: 0, dur: 99 };
  const fade = $('fade');
  $('fade-text').textContent = t('toast.slept');
  $('fade-art').style.backgroundImage = `url("${artUrl(NIGHT_ART)}")`;
  fade.classList.add('on', 'art');
  await wait(1300);
  const res = resolve('sleep', { kicker: t('toast.slept'), snap: true });
  if (res?.ended) return;
  $('fade-text').textContent = `${t('hud.day')} ${r.exp.G.day} · ${formatMinutes(r.exp.G.minutesOfDay)}`;
  await wait(1700);
  fade.classList.remove('on', 'art');
  r.busy = null;
}

function photo() {
  const r = app.run;
  if (r.busy || r.dialog || r.ended || r.characterData.id !== 'daniela') return;
  if (!r.exp.canPhoto().allowed) { showToast(null, t('toast.photoBlocked'), 'bad'); return; }
  const res = resolve('shoot_photo', { kicker: t('toast.photo') });
  if (!res || res.ended) return;
  const flash = $('flash');
  flash.style.transition = 'none'; flash.style.opacity = '0.85';
  requestAnimationFrame(() => { flash.style.transition = 'opacity 0.7s ease'; flash.style.opacity = '0'; });
  r.busy = { type: 'photo', t: 0, dur: 1.4 };
}

function endRun(res) {
  const r = app.run;
  r.ended = true;
  r.auto = 0;
  const down = DOWN_OUTCOMES.has(res.outcome);
  if (res.outcome === 'Summit and Safe Return') { try { localStorage.setItem(SUMMIT_ACHIEVED_KEY, '1'); } catch (_) { /* ignore */ } }
  r.busy = { type: 'end', t: 0, dur: 99, pose: down ? 'down' : 'walk' };
  const fade = $('fade');
  $('fade-text').textContent = label(res.outcome);
  fade.classList.remove('art');
  fade.classList.toggle('slow', down);
  setTimeout(() => fade.classList.add('on'), down ? 900 : 300);
  setTimeout(() => {
    renderDebrief();
    showScreen('debrief');
    fade.classList.remove('on', 'slow');
  }, down ? 5200 : 2600);
}

function renderDebrief() {
  const r = app.run;
  const { exp } = r;
  const outcome = exp.outcome;
  const h = $('debrief-outcome');
  h.textContent = label(outcome);
  h.className = GOOD_OUTCOMES.has(outcome) ? 'good' : NEUTRAL_OUTCOMES.has(outcome) ? 'neutral' : 'bad';
  $('debrief-art').style.backgroundImage = `url("${artUrl(OUTCOME_ART[outcome] || DEFAULT_OUTCOME_ART)}")`;
  $('btn-part2').hidden = !(outcome === 'Summit and Safe Return' || hasSummitedBefore());
  const highest = exp.nodes[exp.G.highestPosIdx] || exp.nodes[0];
  const stats = [
    [t('debrief.character'), localizeCharacter(r.characterData).name],
    [t('debrief.scenario'), localizeScenario(r.scenario).name],
    [t('debrief.highest'), `${nodeName(highest)} · ${highest.altitudeMeters} m`],
    [t('debrief.summit'), exp.G.hasSummited ? t('debrief.yes') : t('debrief.no')],
    [t('debrief.days'), String(exp.G.day)],
    [t('debrief.turns'), String(exp.G.turnLog.length)],
    [t('debrief.seed'), String(r.seed)],
  ];
  const dl = $('debrief-stats');
  dl.replaceChildren();
  stats.forEach(([k, v]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    div.append(dt, dd);
    dl.appendChild(div);
  });
  const lang = getLanguage();
  const posLabels = Object.fromEntries(exp.nodes.map((n) => [n.id, nodeName(n)]));
  $('debrief-cause').textContent = findPrimaryCause({ finalOutcome: outcome, lang });
  $('debrief-turning').textContent = findTurningPoint({ turnLog: exp.G.turnLog, POS_LABELS: posLabels, lang });
  const ul = $('debrief-reflect');
  ul.replaceChildren();
  buildReflectionPrompts({ turnLog: exp.G.turnLog, characterId: r.characterData.id, lang }).slice(0, 4).forEach((prompt) => {
    const li = document.createElement('li');
    li.textContent = prompt.text;
    ul.appendChild(li);
  });
}

// ───────────────────────────────────────────────────────────────────────────
// HUD helpers
// ───────────────────────────────────────────────────────────────────────────
let toastTimer = 0;
function showToast(kicker, text, tone = '') {
  const el = $('toast');
  const k = $('toast-kicker');
  k.textContent = kicker || '';
  k.className = tone;
  $('toast-text').textContent = text || '';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 6500);
}
function hideToast() { clearTimeout(toastTimer); $('toast').classList.remove('show'); }
let bannerTimer = 0;
function showBanner(kicker, title, sub) {
  $('banner-kicker').textContent = kicker || '';
  $('banner-title').textContent = title || '';
  $('banner-sub').textContent = sub || '';
  const el = $('banner');
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 4200);
}
function hideBanner() { clearTimeout(bannerTimer); $('banner').classList.remove('show'); }

const flashChips = [];
function flashChip(text, cls) {
  flashChips.push({ text, cls, until: performance.now() + 7000 });
}

function addLog(entry) {
  const r = app.run;
  const li = document.createElement('li');
  const head = document.createElement('div');
  head.className = 'head';
  const node = r.exp.nodes.find((n) => n.id === entry.position);
  const move = entry.decision === 'advance' || entry.decision === 'advance_slowly' ? ` (${t(`move.${entry.moveResult}`) || entry.moveResult})` : '';
  head.textContent = `${t('hud.day')} ${entry.day} · ${entry.time} · ${t(`act.${entry.decision}`)}${move} · ${node ? nodeName(node) : entry.position}`;
  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = entry.narrative;
  li.append(head, text);
  $('log-entries').prepend(li);
  r.logCount++;
}

function dots(el, value, max, tone) {
  el.className = `dots ${tone}`;
  if (el.children.length !== max) {
    el.replaceChildren();
    for (let i = 0; i < max; i++) el.appendChild(document.createElement('i'));
  }
  [...el.children].forEach((dot, i) => dot.classList.toggle('on', i < value));
}

function setState(el, text, raw) {
  el.textContent = text;
  el.className = `state-${bodyValueClass(raw)}`;
}

function drawProfile() {
  const r = app.run;
  const canvas = $('profile');
  const ctx = canvas.getContext('2d');
  const { route } = app;
  const W = canvas.width;
  const H = canvas.height;
  const padX = 14;
  const padTop = 18;
  const padBot = 14;
  const maxH = route.nodeH[route.last];
  const X = (s) => padX + (clamp(s, 0, route.total) / route.total) * (W - padX * 2);
  const Y = (h) => H - padBot - (h / maxH) * (H - padTop - padBot);
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.moveTo(X(0), H - padBot + 6);
  for (let s = 0; s <= route.total; s += route.total / 120) ctx.lineTo(X(s), Y(route.heightAt(s)));
  ctx.lineTo(X(route.total), H - padBot + 6);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padTop, 0, H);
  grad.addColorStop(0, 'rgba(216,237,250,0.5)');
  grad.addColorStop(0.45, 'rgba(132,112,122,0.5)');
  grad.addColorStop(1, 'rgba(154,107,86,0.45)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,237,250,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let s = 0; s <= route.total; s += route.total / 120) {
    const x = X(s); const y = Y(route.heightAt(s));
    if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  route.nodes.forEach((n, i) => {
    const x = X(route.nodeS[i]);
    const y = Y(route.nodeH[i]);
    const reached = i <= r.exp.G.highestPosIdx;
    ctx.fillStyle = reached ? '#d4a874' : 'rgba(218,228,238,0.7)';
    ctx.beginPath();
    if (n.isCamp) { ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y + 3); ctx.lineTo(x - 6, y + 3); ctx.closePath(); } else ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });
  const px = X(r.s);
  const py = Y(route.heightAt(clamp(r.s, 0, route.total)));
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#e2742c';
  ctx.beginPath(); ctx.arc(px, py - 3, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function updateHud(force = false) {
  const r = app.run;
  if (!r) return;
  const now = performance.now();
  if (!force && now - r.hudAt < 220) return;
  r.hudAt = now;
  const { exp } = r;
  const G = exp.G;
  const st = exp.state;
  const sig = exp.signals();
  const idx = exp.positionIndex;
  const node = exp.nodes[idx];

  $('loc-name').textContent = nodeName(node);
  $('loc-alt').textContent = `${Math.round(app.route.baseAlt + Math.max(0, r.pos.y) / V_SCALE)} m`;
  $('loc-stage').textContent = stageName(node.stage);
  const up = exp.nodes[idx + 1];
  const upDist = up ? Math.max(0, Math.round((app.route.nodeS[idx + 1] - r.s) * 3)) : 0;
  $('loc-next').textContent = up
    ? `${t('hud.next')}: ${nodeName(up)} · ${up.altitudeMeters} m · ~${upDist} m`
    : `${t('hud.below')}: ${nodeName(exp.nodes[idx - 1])}`;

  $('w-time').textContent = formatMinutes(G.minutesOfDay);
  $('w-day').textContent = `${t('hud.day')} ${G.day}`;
  const left = G.permitMaxDays - G.permitDay;
  const permit = $('w-permit');
  permit.textContent = `${t('hud.permit')} ${G.permitDay}/${G.permitMaxDays}`;
  permit.className = left <= 3 ? 'warn' : '';
  const pressure = $('w-pressure');
  pressure.textContent = label(sig.mountainPressure, 'pressure');
  pressure.className = ['Low', 'Manageable'].includes(sig.mountainPressure) ? 'state-stable' : sig.mountainPressure === 'Severe' ? 'state-degrading' : 'state-critical';
  const arrow = { steady: '→', worsening: '↗', 'worsening fast': '⇈', easing: '↘', uncertain: '?' }[sig.trend] || '→';
  const trend = $('w-trend');
  trend.textContent = `${arrow} ${label(sig.trend)}`;
  trend.className = sig.trend === 'easing' ? 'state-stable' : sig.trend === 'steady' ? '' : sig.trend === 'worsening' ? 'state-degrading' : 'state-critical';
  const reading = $('w-reading');
  reading.textContent = `${sig.confidence}%`;
  reading.className = sig.confidence >= 70 ? 'state-stable' : sig.confidence >= 45 ? 'state-degrading' : 'state-critical';
  dots($('w-sky'), sig.wHint, 3, sig.wHint >= 3 ? 'bad' : sig.wHint >= 2 ? 'mid' : '');
  dots($('w-sight'), sig.vHint, 3, sig.vHint <= 1 ? 'bad' : sig.vHint <= 2 ? 'mid' : '');

  const labels = exp.labels();
  setState($('b-capacity'), label(labels.capacity), labels.capacity);
  setState($('b-fatigue'), label(labels.fatigue), labels.fatigue);
  setState($('b-exposure'), label(labels.exposure), labels.exposure);
  $('b-acclim').firstElementChild.style.width = `${Math.round(clamp(G.acclimatization, 0, 100))}%`;
  const water = $('b-water');
  const food = $('b-food');
  water.textContent = String(st.water > 0 ? Math.ceil(st.water) : 0);
  food.textContent = String(st.food > 0 ? Math.ceil(st.food) : 0);
  water.className = st.water < 4 ? 'state-critical' : st.water < 8 ? 'state-degrading' : '';
  food.className = st.food < 4 ? 'state-critical' : st.food < 8 ? 'state-degrading' : '';
  const pace = $('pace-chip');
  pace.textContent = `${t('hud.pace')}: ${t(`hud.pace.${r.pace}`)}`;
  pace.className = `chip ${r.pace}`;
  $('auto-chip').hidden = !r.auto;
  $('auto-chip').textContent = `${t('hud.auto')} ${r.auto > 0 ? '↑' : '↓'}`;

  // Warning chips: what an attentive climber would already be worried about.
  const chips = [];
  const atCamp = exp.isAtCamp();
  const m = G.minutesOfDay;
  if (!atCamp && m >= 1200) chips.push([tt('Night is closing: reach a camp', 'Cae la noche: llegá a un campamento'), 'danger']);
  else if (!atCamp && m >= 1080) chips.push([tt('Dusk', 'Atardece'), 'warn']);
  if (node.stage === 'SUMMIT_DAY' && !G.hasSummited) {
    const cutoff = exp.timeWindows().summitLateStart ?? 1020;
    if (m >= cutoff - 60) chips.push([tt(`Summit cutoff ${formatMinutes(cutoff)}`, `Corte de cumbre ${formatMinutes(cutoff)}`), 'danger']);
    else if (m >= cutoff - 240) chips.push([tt(`Summit cutoff ${formatMinutes(cutoff)}`, `Corte de cumbre ${formatMinutes(cutoff)}`), 'warn']);
  }
  if (st.water < 4 || st.food < 4) chips.push([tt('Supplies nearly gone', 'Provisiones casi agotadas'), 'danger']);
  if (left <= 3) chips.push([tt(`Permit: ${Math.max(0, left)} days left`, `Permiso: quedan ${Math.max(0, left)} días`), left <= 1 ? 'danger' : 'warn']);
  if ([labels.capacity, labels.fatigue, labels.exposure].includes('Critical')) chips.push([tt('Body at its limit', 'El cuerpo al límite'), 'danger']);
  if (G.hasSummited) chips.push([tt('Summit reached · walk out', 'Cumbre hecha · caminá la salida'), '']);
  for (let i = flashChips.length - 1; i >= 0; i--) {
    if (flashChips[i].until < now) flashChips.splice(i, 1); else chips.push([flashChips[i].text, flashChips[i].cls]);
  }
  const box = $('chips');
  const sigKey = chips.map((c) => c.join('|')).join('~');
  if (box.dataset.sig !== sigKey) {
    box.dataset.sig = sigKey;
    box.replaceChildren();
    chips.forEach(([text, cls]) => {
      const el = document.createElement('span');
      el.className = `chip ${cls}`;
      el.textContent = text;
      box.appendChild(el);
    });
  }

  const strain = Math.max((st.fatigue - 55) / 40, (st.exposure - 50) / 40, (55 - st.functional_capacity) / 40);
  if (app.post) { app.post.setStrain(clamp(strain, 0, 1)); $('vignette').style.opacity = '0'; } else $('vignette').style.opacity = String(clamp(strain, 0, 0.95));
  drawProfile();

  if (DEBUG) {
    const rec = G.lastTurnRecord;
    $('debug').textContent = [
      `seed ${r.seed}  turn ${G.turn}  node ${idx} ${node.id}`,
      `s ${r.s.toFixed(1)}  d ${r.d.toFixed(1)}  y ${r.pos.y.toFixed(1)}  v ${r.speed.toFixed(1)}`,
      `cap ${st.functional_capacity.toFixed(0)} fat ${st.fatigue.toFixed(0)} exp ${st.exposure.toFixed(0)} accl ${G.acclimatization.toFixed(0)}`,
      `wx ${st.weather_severity} vis ${st.visibility} pers ${G.persistenceTurns}`,
      rec ? `EP ${rec.pressure.EP} BT ${rec.pressure.BT} Δ ${rec.pressure.delta}` : '',
      `fog ${app.sky.fogFar.toFixed(0)} wind ${app.sky.wind.toFixed(2)} busy ${r.busy?.type || '-'}`,
    ].join('\n');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Interaction
// ───────────────────────────────────────────────────────────────────────────
function findInteraction() {
  const r = app.run;
  if (r.busy || r.ended) return null;
  let best = null;
  let bestDist = Infinity;
  for (const it of app.world.interactables) {
    const dist = Math.hypot(it.position.x - r.pos.x, it.position.z - r.pos.z);
    if (dist > it.radius || dist >= bestDist) continue;
    if (it.type === 'tent' && it.nodeIndex !== r.exp.positionIndex) continue;
    if (it.type === 'gate' && r.exp.positionIndex !== 0) continue;
    best = it; bestDist = dist;
  }
  for (const n of app.npcs) {
    const dist = Math.hypot(n.position.x - r.pos.x, n.position.z - r.pos.z);
    if (dist < 6.5 && dist < bestDist) { best = { type: 'npc', npc: n }; bestDist = dist; }
  }
  return best;
}

function promptFor(it) {
  if (!it) return null;
  if (it.type === 'tent') return app.run.exp.G.minutesOfDay < 840 ? t('prompt.sleepEarly') : t('prompt.sleep');
  if (it.type === 'gate') return performance.now() < app.run.gateConfirmUntil ? t('prompt.leaveConfirm') : t('prompt.leave');
  if (it.type === 'npc') return `${t('prompt.talk')}: ${DIALOGUE[it.npc.id].name[getLanguage()]}`;
  return null;
}

function dialogueContext() {
  const { exp } = app.run;
  const labels = exp.labels();
  return {
    permitDays: exp.G.permitMaxDays,
    capacity: label(labels.capacity).toLowerCase(),
    fatigue: label(labels.fatigue).toLowerCase(),
    exposure: label(labels.exposure).toLowerCase(),
    acclim: exp.G.acclimatization,
    weather: exp.state.weather_severity,
  };
}

function advanceDialog() {
  const r = app.run;
  const dlg = r.dialog;
  if (!dlg) return;
  const lines = DIALOGUE[dlg.id].lines[getLanguage()];
  if (dlg.index >= lines.length) {
    r.dialog = null;
    $('dialog').hidden = true;
    return;
  }
  const line = lines[dlg.index++];
  $('dialog-name').textContent = DIALOGUE[dlg.id].name[getLanguage()];
  $('dialog-text').textContent = typeof line === 'function' ? line(dialogueContext()) : line;
  $('dialog').hidden = false;
}

function interact() {
  const r = app.run;
  if (!r || app.screen !== 'play' || app.paused) return;
  if (r.dialog) { advanceDialog(); return; }
  const it = findInteraction();
  if (!it) return;
  if (it.type === 'tent') sleep();
  else if (it.type === 'npc') { r.auto = 0; r.dialog = { id: it.npc.id, index: 0 }; advanceDialog(); }
  else if (it.type === 'gate') {
    if (performance.now() < r.gateConfirmUntil) { r.gateConfirmUntil = 0; resolve('descend', {}); }
    else r.gateConfirmUntil = performance.now() + 4500;
  }
}

function togglePace() {
  const r = app.run;
  if (!r || app.screen !== 'play') return;
  r.pace = r.pace === 'steady' ? 'careful' : 'steady';
  updateHud(true);
}

function toggleAuto() {
  const r = app.run;
  if (!r || app.screen !== 'play' || r.busy || r.dialog) return;
  if (r.auto) { r.auto = 0; showToast(null, t('toast.autoOff')); } else {
    const dir = app.terrain.trailDirection(r.s, {});
    const facing = Math.sin(r.heading) * dir.x + Math.cos(r.heading) * dir.z;
    r.auto = facing >= 0 ? 1 : -1;
    showToast(null, `${t('toast.autoOn')} ${r.auto > 0 ? '↑' : '↓'}`);
  }
  updateHud(true);
}

function setPaused(on) {
  if (app.screen !== 'play') return;
  app.paused = on;
  $('pause-panel').hidden = !on;
  if (on) $('log-panel').hidden = true;
}
function toggleLog() {
  if (app.screen !== 'play') return;
  const panel = $('log-panel');
  const open = panel.hidden;
  panel.hidden = !open;
  app.paused = open;
  $('pause-panel').hidden = true;
  if (open && !$('log-entries').children.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('log.empty');
    $('log-entries').appendChild(li);
  } else if (open) {
    $('log-entries').querySelector('.empty')?.remove();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Input
// ───────────────────────────────────────────────────────────────────────────
const keys = new Set();
const stick = { x: 0, y: 0, id: null };
const look = { id: null, x: 0, y: 0 };

function bindUi() {
  $('lang-toggle').addEventListener('click', () => { setLanguage(getLanguage() === 'es' ? 'en' : 'es'); applyI18n(); });
  $('btn-begin').addEventListener('click', () => { app.audio.start(); showScreen('setup'); });
  $('gate').addEventListener('submit', (e) => {
    e.preventDefault();
    if (tryUnlock($('gate-word').value)) { $('gate-error').textContent = ''; refreshGate(); $('btn-begin').focus(); } else {
      $('gate-error').textContent = t('gate.wrong');
      $('gate-word').select();
    }
  });
  $('btn-title-part2').addEventListener('click', () => openPart2('title'));
  $('btn-part2').addEventListener('click', () => openPart2('debrief'));
  $('btn-plate-exit').addEventListener('click', () => showScreen(plate.from === 'debrief' && app.run ? 'debrief' : 'title'));
  $('btn-plate-back').addEventListener('click', () => plateStep(-1));
  $('btn-plate-next').addEventListener('click', () => plateStep(1));
  $('btn-setup-back').addEventListener('click', () => { refreshGate(); showScreen('title'); });
  $('btn-setup-start').addEventListener('click', () => { startRun(); showScreen('brief'); });
  $('btn-brief-go').addEventListener('click', enterPlay);
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-restart').addEventListener('click', () => { setPaused(false); showScreen('setup'); });
  $('btn-log-close').addEventListener('click', toggleLog);
  $('btn-again').addEventListener('click', () => { startRun({ sameSeed: true }); enterPlay(); });
  $('btn-new').addEventListener('click', () => showScreen('setup'));
  $('prompt').addEventListener('click', interact);
  $('dialog').addEventListener('click', interact);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (app.screen !== 'play') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    if (k === 'Escape') { if (!$('log-panel').hidden) toggleLog(); else setPaused(!app.paused); return; }
    if (k === 'l') { toggleLog(); return; }
    if (k === 'm') { showToast(null, app.audio.toggleMute() ? t('toast.muted') : t('toast.unmuted')); return; }
    if (app.paused) return;
    keys.add(k);
    if (e.repeat) return;
    if (k === 'e' || k === 'Enter') interact();
    else if (k === 'c' || k === 'Shift') togglePace();
    else if (k === 'r') rest();
    else if (k === 'f') toggleAuto();
    else if (k === 'p') photo();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => keys.clear());

  // Camera: drag anywhere on the view (mouse or the right side on touch).
  const canvas = $('view');
  canvas.addEventListener('pointerdown', (e) => {
    if (app.screen !== 'play' || look.id !== null) return;
    look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== look.id || !app.run) return;
    const cam = app.run.cam;
    const sens = e.pointerType === 'touch' ? 0.0065 : 0.0048;
    cam.yaw -= (e.clientX - look.x) * sens;
    cam.pitch = clamp(cam.pitch + (e.clientY - look.y) * sens * 0.8, -0.25, 1.15);
    cam.manualAt = app.run.clock;
    look.x = e.clientX; look.y = e.clientY;
  });
  const endLook = (e) => { if (e.pointerId === look.id) look.id = null; };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);
  canvas.addEventListener('wheel', (e) => {
    if (app.screen !== 'play' || !app.run) return;
    app.run.cam.dist = clamp(app.run.cam.dist + Math.sign(e.deltaY) * 1.1, 4.5, 22);
  }, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch stick
  const zone = $('stick-zone');
  const base = $('stick-base');
  const knob = $('stick-knob');
  const stickMove = (e) => {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    stick.x = dx; stick.y = -dy;
    knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
  };
  zone.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; zone.setPointerCapture(e.pointerId); stickMove(e); });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) stickMove(e); });
  const stickEnd = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = 0; stick.y = 0; knob.style.transform = ''; };
  zone.addEventListener('pointerup', stickEnd);
  zone.addEventListener('pointercancel', stickEnd);
  $('t-pace').addEventListener('click', togglePace);
  $('t-rest').addEventListener('click', rest);
  $('t-act').addEventListener('click', () => { if (app.run?.characterData.id === 'daniela' && !findInteraction() && !app.run.dialog) photo(); else interact(); });
  $('t-auto').addEventListener('click', toggleAuto);
  $('t-log').addEventListener('click', toggleLog);
  $('t-pause').addEventListener('click', () => setPaused(!app.paused));
}

// ───────────────────────────────────────────────────────────────────────────
// Simulation step
// ───────────────────────────────────────────────────────────────────────────
const proj = {};
const tmpDir = {};
function updatePlay(dt) {
  const r = app.run;
  const { route, terrain, sky } = app;
  const { exp } = r;
  const st = exp.state;
  r.clock += dt;
  r.cooldown = Math.max(0, r.cooldown - dt);

  // ── intent ──
  let mx = 0;
  let mz = 0;
  let throttle = 0;
  const free = !r.busy && !r.dialog && !r.ended;
  if (free) {
    const f = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) + stick.y;
    const strafe = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) + stick.x;
    if (Math.abs(f) > 0.12 || Math.abs(strafe) > 0.12) {
      if (r.auto) { r.auto = 0; updateHud(true); }
      const fx = Math.sin(r.cam.yaw);
      const fz = Math.cos(r.cam.yaw);
      mx = fx * f - fz * strafe;
      mz = fz * f + fx * strafe;
      throttle = Math.min(1, Math.hypot(f, strafe));
    } else if (r.auto) {
      const target = terrain.pointAt(clamp(r.s + r.auto * 8, -27, route.total + 3), 0, tmpDir);
      mx = target.x - r.pos.x;
      mz = target.z - r.pos.z;
      throttle = 1;
      if ((r.auto > 0 && r.s > route.total + 1.5) || (r.auto < 0 && r.s < -20)) { r.auto = 0; throttle = 0; updateHud(true); }
    }
  }
  const len = Math.hypot(mx, mz);
  if (len > 0.0001) { mx /= len; mz /= len; }

  // ── speed: pace, slope, body and wind all show up in the legs ──
  let target = 0;
  if (throttle > 0) {
    const ahead = terrain.heightAt(r.pos.x + mx * 1.6, r.pos.z + mz * 1.6, r.s);
    r.grade = (ahead - r.pos.y) / 1.6;
    const slopeFactor = clamp(1 - r.grade * 1.05, 0.5, 1.18);
    const body = lerp(1, 0.6, st.fatigue / 100) * lerp(1, 0.82, (100 - st.functional_capacity) / 100);
    const scree = Math.abs(r.d) > 6 ? 0.84 : 1;
    const windDrag = sky.wind > 0.8 ? 0.9 : 1;
    target = SPEED[r.pace] * throttle * slopeFactor * body * scree * windDrag;
  }
  r.speed = lerp(r.speed, target, Math.min(1, dt * (target > r.speed ? 5 : 8)));

  const prevS = r.s;
  if (r.speed > 0.02 && len > 0.0001) {
    r.pos.x += mx * r.speed * dt;
    r.pos.z += mz * r.speed * dt;
    let dh = Math.atan2(mx, mz) - r.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    r.heading += dh * Math.min(1, dt * 9);
    if (sky.wind > 0.75) {
      r.pos.x += sky.windDir.x * (sky.wind - 0.75) * 1.3 * dt;
      r.pos.z += sky.windDir.z * (sky.wind - 0.75) * 1.3 * dt;
    }
  }

  // ── scripted moments ──
  let pose = 'walk';
  if (r.busy) {
    r.busy.t += dt;
    if (r.busy.type === 'hold') {
      pose = 'struggle';
      const want = r.busy.up ? r.s < r.busy.toS : r.s > r.busy.toS;
      if (want) {
        const dir = terrain.trailDirection(r.s, tmpDir);
        const sign = r.busy.up ? 1 : -1;
        r.pos.x += dir.x * sign * 3.2 * dt;
        r.pos.z += dir.z * sign * 3.2 * dt;
      }
    } else if (r.busy.type === 'rest' || r.busy.type === 'sleep') pose = 'rest';
    else if (r.busy.type === 'end') pose = r.busy.pose;
    if (r.busy.t >= r.busy.dur) r.busy = null;
  }

  // ── where are we on the route? ──
  terrain.project(r.pos.x, r.pos.z, r.s, proj);
  let clampNeeded = false;
  if (Math.abs(proj.d) > CORRIDOR) { proj.d = Math.sign(proj.d) * CORRIDOR; clampNeeded = true; if (r.clock - r.edgeToastAt > 6) { r.edgeToastAt = r.clock; showToast(null, t('toast.edge')); } }
  if (proj.s < -29) { proj.s = -29; clampNeeded = true; }
  if (proj.s > route.total + 6) { proj.s = route.total + 6; clampNeeded = true; }
  if (clampNeeded) { const p = terrain.pointAt(proj.s, proj.d, tmpDir); r.pos.x = p.x; r.pos.z = p.z; }
  r.s = proj.s; r.d = proj.d;
  const ground = terrain.heightRoute(r.s, r.d, r.pos.x, r.pos.z);
  r.pos.y = lerp(r.pos.y, ground, Math.min(1, dt * 16));

  const ds = r.s - prevS;
  if (ds > 0 && free) { if (r.pace === 'careful') r.carefulDist += ds; else r.steadyDist += ds; }

  // ── the mountain answers ──
  if (free && r.cooldown <= 0) {
    const cross = route.crossing(r.s, exp.positionIndex);
    if (cross === 'up') attemptAdvance();
    else if (cross === 'down') descendTurn();
  }

  // ── arrivals ──
  if (!r.ended) {
    const near = route.nearestNode(r.s);
    if (near.distance < 7 && near.index !== r.lastNodeBanner) {
      r.lastNodeBanner = near.index;
      const node = exp.nodes[near.index];
      if (near.index === route.last && exp.G.hasSummited && !r.summitShown) {
        r.summitShown = true;
        r.auto = 0;
        showBanner(`${node.altitudeMeters} m`, t('toast.summit'), t('toast.summitSub'));
      } else if (near.index !== route.last) {
        showBanner(t('banner.arrived'), nodeName(node), `${node.altitudeMeters} m`);
        if (node.isCamp && r.auto) { r.auto = 0; updateHud(true); }
      }
    } else if (near.distance > 26 && r.lastNodeBanner !== -1) {
      r.lastNodeBanner = -1;
    }
  }

  // ── character + camera ──
  const hero = r.character;
  hero.root.position.copy(r.pos);
  hero.root.rotation.y = r.heading;
  hero.animate(dt, { speed: r.speed, fatigue: st.fatigue / 100, wind: sky.wind, slope: r.grade, pose });
  const phase = Math.floor(hero.state.phase / Math.PI);
  if (phase !== r.stepPhase && r.speed > 0.4) { r.stepPhase = phase; app.audio.step(clamp(r.speed / 5, 0.4, 1), app.route.altitudeAt(r.s) > 5000); }

  updateCamera(dt, free && r.speed > 0.5);

  // ── prompt ──
  r.interact = r.dialog ? null : findInteraction();
  const text = promptFor(r.interact);
  const prompt = $('prompt');
  if (text) { $('prompt-text').textContent = text; prompt.hidden = false; } else prompt.hidden = true;

  updateHud();
}

function updateCamera(dt, following) {
  const r = app.run;
  const cam = r.cam;
  const { camera, terrain } = app;
  if (following && r.clock - cam.manualAt > 1.4 && look.id === null) {
    let dy = r.heading - cam.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    // Do not swing behind the climber when they walk straight toward the camera.
    if (Math.abs(dy) < 2.4) cam.yaw += dy * Math.min(1, dt * 1.3);
  }
  const cp = Math.cos(cam.pitch);
  const tx = r.pos.x;
  const ty = r.pos.y + 1.75;
  const tz = r.pos.z;
  let cx = tx - Math.sin(cam.yaw) * cp * cam.dist;
  let cy = ty + Math.sin(cam.pitch) * cam.dist;
  let cz = tz - Math.cos(cam.yaw) * cp * cam.dist;
  const floor = terrain.heightAt(cx, cz, r.s) + 0.9;
  if (cy < floor) cy = floor;
  camera.position.set(cx, cy, cz);
  camera.lookAt(tx, ty + 0.95, tz);
}

// Idle orbit behind the briefing card.
function updateBrief(dt) {
  const r = app.run;
  if (!r) return;
  r.clock += dt;
  r.cam.yaw += dt * 0.05;
  r.character.animate(dt, { speed: 0, fatigue: 0 });
  updateCamera(dt, false);
}

let lastT = performance.now();
let slowFrames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  const rawDt = (now - lastT) / 1000;
  lastT = now;
  const r = app.run;
  const live = app.screen === 'play' || app.screen === 'brief';
  if (!live || !r) return;
  if (app.screen === 'play' && !app.paused) { for (let i = 0; i < app.timeScale; i++) updatePlay(dt); }
  else if (app.screen === 'brief') updateBrief(dt);

  const band = r.exp.nodes[r.exp.positionIndex].altitudeBand;
  app.sky.update(app.paused ? 0 : dt, app.camera, r.pos, band);
  app.audio.update(app.sky.wind, app.sky.gust);
  app.world.update(now / 1000, app.sky);
  app.world.massif.update(r.s, app.sky.clearness, app.sky.horizonColor);
  for (const n of app.npcs) {
    const dist = Math.hypot(n.position.x - r.pos.x, n.position.z - r.pos.z);
    if (dist > 160) continue;
    if (dist < 9) {
      const want = Math.atan2(r.pos.x - n.position.x, r.pos.z - n.position.z);
      let dy = want - n.npc.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.npc.root.rotation.y += dy * Math.min(1, dt * 3);
    }
    n.npc.animate(dt, { speed: 0, fatigue: 0.1, wind: app.sky.wind * 0.5 });
  }
  if (app.post) app.post.render(dt); else app.renderer.render(app.scene, app.camera);

  // Adaptive quality: step down one level if the device cannot keep up.
  if (rawDt > 0.05) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
  if (slowFrames > 120 && app.quality !== 'low' && !params.get('quality')) {
    setQuality(app.quality === 'high' ? 'medium' : 'low');
    slowFrames = 0;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Debug / test hooks (also used by the Playwright smoke test)
// ───────────────────────────────────────────────────────────────────────────
function debugApi() {
  return {
    app,
    get run() { return app.run; },
    start(opts = {}) {
      if (opts.characterId) app.pick.characterId = opts.characterId;
      if (opts.scenarioId) app.pick.scenarioId = opts.scenarioId;
      if (opts.seed != null) app.pick.seed = opts.seed;
      startRun();
      enterPlay();
    },
    teleport(s, d = 0) { placePlayer(s, d); },
    openPart2,
    setTimeScale(n) { app.timeScale = Math.max(1, Math.min(40, Math.round(n))); },
    setClock(minutes, weather = null, visibility = null) {
      const { exp } = app.run;
      exp.G.minutesOfDay = minutes;
      if (weather != null) exp.state.weather_severity = weather;
      if (visibility != null) exp.state.visibility = visibility;
      syncSky(true);
      updateHud(true);
    },
    look(yaw, pitch = 0.26, dist = 9.5) { Object.assign(app.run.cam, { yaw: app.run.heading + yaw, pitch, dist, manualAt: app.run.clock + 1e6 }); },
    act: { rest, sleep, interact, togglePace, toggleAuto, photo },
    snapshot() {
      const r = app.run;
      if (!r) return null;
      return {
        screen: app.screen, s: r.s, d: r.d, y: r.pos.y, node: r.exp.positionIndex, nodeId: r.exp.state.position,
        turn: r.exp.G.turn, day: r.exp.G.day, minutes: r.exp.G.minutesOfDay, ended: r.exp.ended, outcome: r.exp.outcome,
        summited: r.exp.G.hasSummited, busy: r.busy?.type || null, auto: r.auto, pace: r.pace, log: r.exp.G.turnLog.length,
        state: { ...r.exp.state },
      };
    },
  };
}

boot().catch((err) => {
  console.error(err);
  if ($('fatal').hidden) fatal(String(err?.message || err));
});
