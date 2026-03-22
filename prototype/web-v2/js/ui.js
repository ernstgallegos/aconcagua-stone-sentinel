// UI rendering module for web-v2.
// All functions perform real DOM manipulation; no framework dependencies.

import { t, strings, getLang } from './i18n.js';
import { getPositionLabel, getPositionAlt, getPositions, getRouteNodes, getCampPositions, clamp } from './engine.js';

// ── HELPERS ───────────────────────────────────────────────────────────────────

const MAX_DIFFICULTY_STARS = 5;

function clearEl(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
}

function $(id) { return document.getElementById(id); }

function formatMinutes(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Extract initials from a name string (up to maxChars characters). */
function getCharacterInitials(name, maxChars = 2) {
  if (!name) return '?';
  return name.split(' ').filter((w) => w).map((w) => w[0].toUpperCase()).join('').slice(0, maxChars);
}

/** Render a star rating as filled/empty stars. */
function renderStars(count, max = MAX_DIFFICULTY_STARS) {
  return '★'.repeat(count) + '☆'.repeat(max - count);
}

// (clamp imported from engine.js above)
function makeBar(value, cls = '') {
  const wrap = document.createElement('div');
  wrap.className = `status-bar${cls ? ' ' + cls : ''}`;
  const fill = document.createElement('div');
  fill.className = 'status-bar-fill';
  fill.style.width = `${clamp(value, 0, 100)}%`;
  wrap.appendChild(fill);
  return wrap;
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

// ── SCREEN MANAGEMENT ─────────────────────────────────────────────────────────

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.remove('active');
    s.setAttribute('aria-hidden', 'true');
  });
  const target = $(`screen-${screenId}`);
  if (!target) { console.error(`[ui] Unknown screen: screen-${screenId}`); return; }
  target.classList.add('active');
  target.removeAttribute('aria-hidden');
  window.scrollTo(0, 0);
}

// ── THEME ─────────────────────────────────────────────────────────────────────

const THEMES = ['dark', 'light', 'sunset'];

export function setTheme(theme) {
  const safe = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', safe);
  try { localStorage.setItem('aconcagua_v2_theme', safe); } catch (e) {}
}

export function cycleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  setTheme(next);
  return next;
}

export function initTheme() {
  let stored = 'dark';
  try { stored = localStorage.getItem('aconcagua_v2_theme') || 'dark'; } catch (e) {}
  setTheme(stored);
}

// ── NAV ───────────────────────────────────────────────────────────────────────

export function renderNav(lang) {
  const navTitle = $('nav-title');
  if (navTitle) navTitle.textContent = strings[lang]?.nav?.title || 'ACONCAGUA';

  const navSub = $('nav-subtitle');
  if (navSub) navSub.textContent = strings[lang]?.nav?.subtitle || 'Stone Sentinel';

  const langBtn = $('nav-lang');
  if (langBtn) langBtn.textContent = strings[lang]?.nav?.langToggle || 'EN';
}

// ── HERO SCREEN ───────────────────────────────────────────────────────────────

export function renderHero(lang) {
  const s = strings[lang]?.hero || {};

  const tagline = $('hero-tagline');
  if (tagline) tagline.textContent = s.tagline || '';

  const cta = $('hero-cta');
  if (cta) cta.textContent = (s.cta || '') + ' ' + (s.ctaArrow || '▸');

  const scrollHint = $('hero-scroll-hint');
  if (scrollHint) scrollHint.textContent = s.scrollHint || '';

  const whatIsThis = $('hero-what-is-this');
  if (whatIsThis) whatIsThis.textContent = s.whatIsThis || '';

  // Pillars
  const pillarsEl = $('hero-pillars');
  if (pillarsEl && s.pillars) {
    clearEl(pillarsEl);
    s.pillars.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'pillar-card reveal';
      card.innerHTML = `<div class="pillar-icon" aria-hidden="true">${p.icon}</div>
        <h3 class="pillar-title">${p.title}</h3>
        <p class="pillar-text">${p.text}</p>`;
      pillarsEl.appendChild(card);
    });
  }

  const charPreview = $('hero-char-preview-label');
  if (charPreview) charPreview.textContent = s.characterPreview || '';

  // Update data-i18n heading for characterPreview
  const charPreviewHeading = $('char-preview-heading');
  if (charPreviewHeading) charPreviewHeading.textContent = s.characterPreview || '';

  // Update data-i18n heading for whatIsThis
  const pillarsHeading = $('pillars-heading');
  if (pillarsHeading) pillarsHeading.textContent = s.whatIsThis || '';

  renderDifficultySelector(lang);
}

export function renderDifficultySelector(lang, selectedId = 'standard', onChange = null) {
  const container = $('diff-selector');
  if (!container) return;
  clearEl(container);

  const levels = strings[lang]?.difficulty?.levels || strings.en.difficulty.levels;
  levels.forEach((level) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `diff-dot${level.id === selectedId ? ' active' : ''}`;
    btn.dataset.diffId = level.id;
    btn.title = `${level.label}: ${level.blurb}`;
    btn.setAttribute('aria-pressed', String(level.id === selectedId));
    btn.textContent = '●';

    btn.addEventListener('click', () => {
      container.querySelectorAll('.diff-dot').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      if (onChange) onChange(level.id);
    });

    container.appendChild(btn);
  });

  const label = document.createElement('div');
  label.id = 'diff-label';
  label.className = 'diff-label';
  const selected = levels.find((l) => l.id === selectedId) || levels[2];
  label.textContent = `${selected.label} — ${selected.blurb}`;
  container.appendChild(label);
}

// ── CHARACTER SELECT ──────────────────────────────────────────────────────────

// Render small avatar preview circles on the hero screen
export function renderHeroCharPreviews(characters) {
  const container = $('hero-char-previews');
  if (!container || !characters?.length) return;
  clearEl(container);
  characters.forEach((c) => {
    const initials = (c.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const wrap = document.createElement('div');
    wrap.className = 'char-preview-circle';
    wrap.title = c.name;
    wrap.setAttribute('aria-label', c.name);
    wrap.style.setProperty('--char-accent', c.accent || 'var(--summit)');
    wrap.textContent = getCharacterInitials(c.name, 2);
    container.appendChild(wrap);
  });
}

export function renderCharacterGrid(characters, lang, onSelect) {
  const grid = $('character-grid');
  if (!grid) return;
  clearEl(grid);

  const s = strings[lang]?.character || strings.en.character;

  characters.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.id = `char-card-${c.id}`;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${c.name} — ${c.role}`);

    const initials = getCharacterInitials(c.name, 2);
    const stars = renderStars(c.stars || 3);
    card.innerHTML = `
      <div class="char-avatar" style="--char-accent:${c.accent || 'var(--summit)'}">
        <span class="char-initial">${initials}</span>
      </div>
      <div class="char-info">
        <div class="char-name">${c.name}</div>
        <div class="char-role">${c.role}</div>
        <div class="char-stars" aria-label="Difficulty: ${c.stars} stars">${stars}</div>
        ${c.difficultyLabel ? `<div class="char-difficulty">${s.difficulty}: ${c.difficultyLabel}</div>` : ''}
      </div>
    `;

    const handleSelect = () => {
      grid.querySelectorAll('.char-card').forEach((el) => {
        el.classList.remove('selected');
        el.setAttribute('aria-checked', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');
      if (onSelect) onSelect(c);
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
    });

    grid.appendChild(card);
  });

  // Random card
  const randomCard = document.createElement('div');
  randomCard.className = 'char-card char-card-random';
  randomCard.id = 'char-card-random';
  randomCard.setAttribute('role', 'radio');
  randomCard.setAttribute('aria-checked', 'false');
  randomCard.setAttribute('tabindex', '0');
  randomCard.setAttribute('aria-label', 'Random character');
  randomCard.innerHTML = `
    <div class="char-avatar" style="--char-accent:var(--summit)">
      <span class="char-initial">?</span>
    </div>
    <div class="char-info">
      <div class="char-name">${s.random || '🎲 Random'}</div>
      <div class="char-role">Random selection</div>
      <div class="char-stars">★★★☆☆</div>
    </div>
  `;
  const handleRandom = () => {
    grid.querySelectorAll('.char-card').forEach((el) => {
      el.classList.remove('selected');
      el.setAttribute('aria-checked', 'false');
    });
    randomCard.classList.add('selected');
    randomCard.setAttribute('aria-checked', 'true');
    if (onSelect) onSelect({ id: 'random', name: 'Random' });
  };
  randomCard.addEventListener('click', handleRandom);
  randomCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRandom(); }
  });
  grid.appendChild(randomCard);
}

export function renderCharacterDetail(character, lang, onConfirm) {
  const panel = $('character-detail');
  if (!panel) return;
  const s = strings[lang]?.character || strings.en.character;

  const traits = (character.traits || []).map((tr) => `<li>${tr}</li>`).join('');
  const stars = renderStars(character.stars || 3);

  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar" style="--char-accent:${character.accent || 'var(--summit)'}">
        ${getCharacterInitials(character.name, 1)}
      </div>
      <div>
        <h2 class="detail-name">${character.name}</h2>
        <div class="detail-role">${character.role}</div>
        <div class="detail-stars">${stars}</div>
      </div>
    </div>
    <p class="detail-bio">${character.bio || ''}</p>
    <ul class="detail-traits">${traits}</ul>
    ${character.difficultyLabel ? `<p class="detail-difficulty">${s.difficulty}: ${character.difficultyLabel}</p>` : ''}
    <button id="btn-confirm-character" class="btn-primary">${s.confirm}</button>
    <button id="btn-back-from-detail" class="btn-ghost">${s.back}</button>
  `;

  $('btn-confirm-character')?.addEventListener('click', () => { if (onConfirm) onConfirm(); });
  $('btn-back-from-detail')?.addEventListener('click', () => { panel.innerHTML = ''; });
}

// ── BRIEFING SCREEN ───────────────────────────────────────────────────────────

export function renderBriefing(character, scenario, G, lang) {
  const s = strings[lang]?.briefing || strings.en.briefing;

  const headingEl = $('briefing-heading');
  if (headingEl) headingEl.textContent = s.heading;

  const subtitleEl = $('briefing-subtitle');
  if (subtitleEl) subtitleEl.textContent = s.subtitle;

  // Scenario
  const scenarioEl = $('briefing-scenario');
  if (scenarioEl && scenario) {
    scenarioEl.innerHTML = `
      <div class="briefing-card-label">${s.scenarioTitle}</div>
      <div class="briefing-card-title">${scenario.name}</div>
      <div class="briefing-card-desc">${scenario.desc || ''}</div>
      <div class="briefing-card-meta">Max turns: ${scenario.max_turns} · Seed: ${G.seed || '—'}</div>
    `;
  }

  // Permit
  const permitEl = $('briefing-permit');
  if (permitEl) {
    permitEl.innerHTML = `
      <div class="briefing-card-label">${s.permitTitle}</div>
      <div class="briefing-card-title">${G.permitMaxDays} ${s.permitDays}</div>
      <div class="briefing-card-desc">${character?.name || '—'}</div>
    `;
  }

  // Route mini-map
  renderBriefingRoute(lang);
}

function renderBriefingRoute(lang) {
  const routeEl = $('briefing-route');
  if (!routeEl) return;
  const nodes = getRouteNodes();
  clearEl(routeEl);

  const label = document.createElement('div');
  label.className = 'briefing-card-label';
  label.textContent = strings[lang]?.briefing?.routeTitle || 'Route';
  routeEl.appendChild(label);

  const list = document.createElement('ol');
  list.className = 'route-list';
  nodes.forEach((n) => {
    const li = document.createElement('li');
    li.className = `route-node stage-${n.stage.toLowerCase()}`;
    li.innerHTML = `<span class="route-dot"></span><span class="route-node-name">${n.name}</span><span class="route-node-alt">${n.altitudeMeters ? n.altitudeMeters.toLocaleString('en-US') + ' m' : '—'}</span>`;
    list.appendChild(li);
  });
  routeEl.appendChild(list);
}

// ── GAME TOPBAR ───────────────────────────────────────────────────────────────

export function renderGameTopbar(G, lang) {
  const s = strings[lang]?.game?.topbar || strings.en.game.topbar;
  if (!G.state) return;

  const posEl = $('topbar-position');
  if (posEl) posEl.textContent = getPositionLabel(G.state.position);

  const altEl = $('topbar-altitude');
  if (altEl) altEl.textContent = getPositionAlt(G.state.position);

  const dayEl = $('topbar-day');
  if (dayEl) dayEl.textContent = `${s.day} ${G.day}`;

  const timeEl = $('topbar-time');
  if (timeEl) timeEl.textContent = formatMinutes(G.minutesOfDay);

  const permitEl = $('topbar-permit');
  if (permitEl) {
    const remaining = G.permitMaxDays - G.permitDay + 1;
    permitEl.textContent = `${s.permit} ${remaining}`;
    permitEl.className = `topbar-permit${remaining <= 3 ? ' critical' : remaining <= 7 ? ' warn' : ''}`;
  }

  const turnEl = $('topbar-turn');
  if (turnEl) turnEl.textContent = `T${G.turn}/${G.scenario?.max_turns || '—'}`;
}

// ── ACTION BUTTONS ────────────────────────────────────────────────────────────

export function renderActionButtons(actions, G, lang, onAction) {
  const grid = $('action-grid');
  if (!grid) return;
  clearEl(grid);

  const s = strings[lang]?.game?.actions || strings.en.game.actions;
  const isSummit = G.state?.position === 'summit';

  actions.forEach((actionId) => {
    const info = s[actionId] || { label: actionId, icon: '◆', cost: '' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `action-btn action-${actionId}`;
    btn.dataset.action = actionId;
    btn.disabled = isSummit && (actionId === 'advance' || actionId === 'advance_slowly');
    btn.setAttribute('aria-label', info.label);

    btn.innerHTML = `
      <span class="action-icon" aria-hidden="true">${info.icon}</span>
      <span class="action-label">${info.label}</span>
      <span class="action-cost">${info.cost}</span>
    `;

    btn.addEventListener('click', () => { if (!btn.disabled && onAction) onAction(actionId); });
    grid.appendChild(btn);
  });
}

export function setActionButtonsEnabled(enabled) {
  const grid = $('action-grid');
  if (!grid) return;
  grid.querySelectorAll('.action-btn').forEach((btn) => {
    btn.disabled = !enabled;
    if (enabled) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  });
}

// ── STATUS PANEL ──────────────────────────────────────────────────────────────

export function renderStatusPanel(G, lang) {
  if (!G.state) return;
  const s = G.state;
  const labels = strings[lang]?.game?.status || strings.en.game.status;

  _setMetric('status-fatigue', fatigueLabel(s.fatigue), s.fatigue, labels.fatigue);
  _setMetric('status-exposure', exposureLabel(s.exposure), s.exposure, labels.exposure);
  _setMetric('status-capacity', capacityLabel(s.functional_capacity), s.functional_capacity, labels.functional_capacity);

  const acclEl = $('status-acclimatization');
  if (acclEl) {
    acclEl.innerHTML = `<span class="status-label">${labels.acclimatization}</span><span class="status-value">${Math.round(G.acclimatization)}/100</span>`;
  }

  const waterEl = $('status-water');
  if (waterEl) {
    waterEl.innerHTML = `<span class="status-label">${labels.water}</span><span class="status-value ${s.water <= 0 ? 'depleted' : s.water <= 3 ? 'warn' : ''}">${Math.round(s.water)}</span>`;
  }
  const foodEl = $('status-food');
  if (foodEl) {
    foodEl.innerHTML = `<span class="status-label">${labels.food}</span><span class="status-value ${s.food <= 0 ? 'depleted' : s.food <= 3 ? 'warn' : ''}">${Math.round(s.food)}</span>`;
  }

  // Permit
  const permitEl = $('status-permit');
  const permitLang = strings[lang]?.game?.permit || strings.en.game.permit;
  if (permitEl) {
    const remaining = G.permitMaxDays - G.permitDay + 1;
    permitEl.textContent = `${remaining} ${permitLang}`;
    permitEl.className = `permit-counter${remaining <= 3 ? ' critical' : remaining <= 7 ? ' warn' : ''}`;
  }

  // Route position list
  renderPositionList(G);
}

function _setMetric(id, labelText, value, title) {
  const el = $(id);
  if (!el) return;
  clearEl(el);
  const span = document.createElement('span');
  span.className = 'status-label';
  span.textContent = title ? `${title}: ` : '';
  const val = document.createElement('span');
  val.className = `status-value ${value >= 80 ? 'critical' : value >= 60 ? 'warn' : ''}`;
  val.textContent = labelText;
  el.appendChild(span);
  el.appendChild(val);
  el.appendChild(makeBar(value));
}

function renderPositionList(G) {
  const list = $('position-list');
  if (!list) return;
  clearEl(list);

  const positions = getPositions();
  const curIdx = positions.indexOf(G.state.position);

  [...positions].reverse().forEach((pos) => {
    const idx = positions.indexOf(pos);
    const isCurrent = pos === G.state.position;
    const isReached = idx <= G.highestPosIdx && !isCurrent;
    const isAbove = idx > curIdx;

    const li = document.createElement('li');
    li.className = `pos-item${isCurrent ? ' current' : ''}${isReached ? ' reached' : ''}${isAbove ? ' above' : ''}`;
    if (isCurrent) li.setAttribute('aria-current', 'location');

    li.innerHTML = `<span class="pos-dot"></span>
      <span class="pos-label">${getPositionLabel(pos)}</span>
      <span class="pos-alt">${getPositionAlt(pos)}</span>
      ${idx === G.highestPosIdx && !isCurrent ? '<span class="pos-highest">◆</span>' : ''}`;

    list.appendChild(li);
  });
}

// ── PERCEPTION CARD ───────────────────────────────────────────────────────────

export function renderPerceptionCard(G, lang) {
  const card = $('perception-card');
  if (!card || !G.signals) return;

  const sig = G.signals;
  const trendArrow = sig.trend === 'worsening fast' ? '↑↑' : sig.trend === 'worsening' ? '↑' : sig.trend === 'easing' ? '↓' : '↔';

  card.innerHTML = `
    <div class="perception-trend" data-trend="${sig.trend}">
      <span class="perception-trend-arrow">${trendArrow}</span>
      <span class="perception-trend-label">${sig.mountainPressure} · ${sig.trend}</span>
    </div>
    <div class="perception-meta">
      <span class="perception-conf">Confidence: ${sig.confidence}%</span>
      <span class="perception-noise">Noise: ${Math.round(sig.uncertainty)}</span>
    </div>
  `;
}

// ── EVENT LOG ─────────────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 20;

export function appendLogEntry(text, type = 'info') {
  const log = $('event-log');
  if (!log) return;

  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = text;

  log.prepend(entry);

  // Keep last MAX_LOG_ENTRIES
  const entries = log.querySelectorAll('.log-entry');
  if (entries.length > MAX_LOG_ENTRIES) {
    entries[entries.length - 1].remove();
  }
}

export function clearEventLog() {
  const log = $('event-log');
  if (!log) return;
  clearEl(log);
  const empty = document.createElement('div');
  empty.className = 'log-empty';
  empty.textContent = '—';
  log.appendChild(empty);
}

export function appendTurnLog(G, turnResult, lang) {
  const s = G.state;
  const action = turnResult.resolvedAction;
  const actionLabels = { advance: 'ADVANCED', advance_slowly: 'ADV SLOWLY', wait: 'WAITED', descend: 'DESCENDED', sleep: 'SLEPT', shoot_photo: 'PHOTO' };
  const actionDisplay = actionLabels[action] || action.toUpperCase();
  const flagSummary = turnResult.flags.filter((f) => f.includes('critical') || f.includes('depleted')).join(' · ');

  const metaText = `T${G.turn} · D${G.day} ${formatMinutes(G.minutesOfDay)} · ${getPositionLabel(s.position)} · ${actionDisplay}${flagSummary ? ' · ' + flagSummary : ''}`;

  appendLogEntry(metaText, 'meta');
  if (turnResult.narrative) appendLogEntry(turnResult.narrative, 'narrative');
}

// ── DEBRIEF SCREEN ────────────────────────────────────────────────────────────

export function renderDebrief(G, lang) {
  const s = strings[lang]?.debrief || strings.en.debrief;
  const isSuccess = G.finalOutcome === 'Summit and Safe Return';

  const headingEl = $('debrief-heading');
  if (headingEl) headingEl.textContent = isSuccess ? s.headingSuccess : s.headingFail;

  const outcomeEl = $('debrief-outcome');
  if (outcomeEl) {
    const label = s.outcomes[G.finalOutcome] || G.finalOutcome;
    outcomeEl.textContent = label;
    outcomeEl.className = `debrief-outcome ${_outcomeClass(G.finalOutcome)}`;
  }

  // Stats
  const statsEl = $('debrief-stats');
  if (statsEl) {
    const positions = getPositions();
    const highest = getPositionLabel(positions[G.highestPosIdx] || positions[0]);
    const highestAlt = getPositionAlt(positions[G.highestPosIdx] || positions[0]);
    clearEl(statsEl);
    const rows = [
      [s.stats.days, String(G.day)],
      [s.stats.turns, String(G.turnLog.length)],
      [s.stats.altitude, `${highest} · ${highestAlt}`],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'debrief-stat-row';
      row.innerHTML = `<span class="debrief-stat-label">${label}</span><span class="debrief-stat-value">${value}</span>`;
      statsEl.appendChild(row);
    });
  }

  // Timeline — last 5 log entries
  const timelineEl = $('debrief-timeline');
  if (timelineEl) {
    clearEl(timelineEl);
    const recentTurns = G.turnLog.slice(-5).reverse();
    recentTurns.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      row.textContent = `T${entry.turn} · ${entry.position ? getPositionLabel(entry.position) : '—'} · ${entry.decision || '—'}`;
      timelineEl.appendChild(row);
    });
  }

  const againBtn = $('debrief-again');
  if (againBtn) againBtn.textContent = s.again;

  const shareBtn = $('debrief-share');
  if (shareBtn) shareBtn.textContent = s.share;
}

function _outcomeClass(outcome) {
  const map = {
    'Summit and Safe Return': 'outcome-success',
    'High Point Return': 'outcome-retreat',
    'Strategic Retreat': 'outcome-retreat',
    'Rescue': 'outcome-collapse',
    'Collapse (Fatigue)': 'outcome-collapse',
    'Permit Expired': 'outcome-stabilized',
    'Expedition Window Closed': 'outcome-stabilized',
    'Fatality': 'outcome-collapse',
  };
  return map[outcome] || 'outcome-retreat';
}

// ── LANGUAGE UPDATE ───────────────────────────────────────────────────────────

export function updateAllText(lang) {
  renderNav(lang);

  // Update all elements with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const keys = key.split('.');
    let obj = strings[lang];
    for (const k of keys) { obj = obj?.[k]; }
    if (typeof obj === 'string') el.textContent = obj;
  });

  // Re-render dynamic sections that need it
  renderHero(lang);
}
