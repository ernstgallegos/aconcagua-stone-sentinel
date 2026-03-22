// Main application controller for web-v2 — Aconcagua: Stone Sentinel
// Ties engine, characters, scenarios, i18n, and UI together.

import {
  loadEngineData,
  initRun,
  resolveTurn,
  getCurrentNode,
  getAvailableActions,
  getPerceivedState,
  getPositionLabel,
  getPositions,
} from './engine.js';
import { loadCharacters, getCharacterById, selectRandomCharacter } from './characters.js';
import { loadScenarios, getScenarioById, buildRandomScenario } from './scenarios.js';
import { strings, setLanguage, getLang, t } from './i18n.js';
import * as UI from './ui.js';
import { createInitialGameState, updateRunState } from './state.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const SUMMIT_ACHIEVED_KEY = 'aconcagua_v2_summit_achieved';

// ── APP STATE ─────────────────────────────────────────────────────────────────
// Separate from the game run state (G). Holds app-level selection and settings.

const appState = {
  characters: [],
  scenarios: null,
  selectedCharacter: null,
  selectedScenario: null,
  difficulty: 'standard',
  currentScreen: 'hero',
  gameRunning: false,
  lang: 'es',
  theme: 'dark',
  dataLoaded: false,
  dataError: null,
};

// G is the live game run state
const G = createInitialGameState();

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
  _restorePreferences();
  UI.initTheme();
  UI.renderNav(appState.lang);
  UI.showScreen('loading');

  try {
    await loadEngineData();
    [appState.characters, appState.scenarios] = await Promise.all([
      loadCharacters(),
      loadScenarios(),
    ]);
    appState.dataLoaded = true;
  } catch (err) {
    appState.dataError = err.message;
    console.error('[app] Data load failed:', err);
    const errEl = document.getElementById('loading-error');
    if (errEl) errEl.textContent = `Failed to load game data: ${err.message}`;
    UI.showScreen('error');
    return;
  }

  _setupEventListeners();
  _initIntersectionObserver();
  UI.renderHero(appState.lang);
  UI.renderHeroCharPreviews(appState.characters);
  UI.showScreen('hero');
}

function _restorePreferences() {
  try {
    const storedLang = localStorage.getItem('aconcagua_v2_lang');
    if (storedLang === 'en' || storedLang === 'es') {
      appState.lang = storedLang;
      setLanguage(storedLang);
    }
    const storedDiff = localStorage.getItem('aconcagua_v2_difficulty');
    if (storedDiff) appState.difficulty = storedDiff;
  } catch (e) {}
}

function _savePreferences() {
  try {
    localStorage.setItem('aconcagua_v2_lang', appState.lang);
    localStorage.setItem('aconcagua_v2_difficulty', appState.difficulty);
  } catch (e) {}
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function navigateTo(screen) {
  appState.currentScreen = screen;
  UI.showScreen(screen);
}

// ── LANGUAGE TOGGLE ───────────────────────────────────────────────────────────

function toggleLanguage() {
  const next = appState.lang === 'es' ? 'en' : 'es';
  appState.lang = next;
  setLanguage(next);
  _savePreferences();

  // Update nav toggle text
  const langBtn = document.getElementById('nav-lang');
  if (langBtn) langBtn.textContent = strings[next]?.nav?.langToggle || (next === 'es' ? 'EN' : 'ES');

  UI.updateAllText(next);

  // Re-render whichever screen is active
  _rerenderCurrentScreen();
}

function _rerenderCurrentScreen() {
  const screen = appState.currentScreen;
  const lang = appState.lang;

  if (screen === 'hero') {
    UI.renderHero(lang);
  } else if (screen === 'character') {
    UI.renderCharacterGrid(appState.characters, lang, _onCharacterSelected);
    _updateCharConfirmState();
  } else if (screen === 'briefing') {
    if (appState.selectedCharacter && appState.selectedScenario) {
      UI.renderBriefing(appState.selectedCharacter, appState.selectedScenario, G, lang);
    }
  } else if (screen === 'game' && appState.gameRunning) {
    _renderGameUI();
  } else if (screen === 'summit-success') {
    UI.renderSummitSuccess(G, lang);
  } else if (screen === 'part2-select') {
    UI.renderPart2Select(appState.characters, lang, null);
  } else if (screen === 'debrief') {
    UI.renderDebrief(G, lang);
  }
}

// ── CHARACTER SELECTION ───────────────────────────────────────────────────────

function _onCharacterSelected(character) {
  appState.selectedCharacter = character;
  UI.renderCharacterDetail(character, appState.lang, _onCharacterConfirmed);
  _updateCharConfirmState();
}

function _updateCharConfirmState() {
  const confirmBtn = document.getElementById('btn-confirm-from-grid');
  if (confirmBtn) confirmBtn.disabled = !appState.selectedCharacter;
}

function _onCharacterConfirmed() {
  if (!appState.selectedCharacter) return;

  // Resolve random
  if (appState.selectedCharacter.id === 'random') {
    appState.selectedCharacter = selectRandomCharacter(appState.characters);
    if (!appState.selectedCharacter) return;
  }

  // Pick default scenario + seed
  const scenarios = appState.scenarios?.predefinedScenarios || [];
  if (!appState.selectedScenario && scenarios.length) {
    appState.selectedScenario = scenarios[0];
  }
  if (appState.selectedScenario) {
    const seeds = appState.selectedScenario.seeds || [];
    G.seed = seeds[Math.floor(Math.random() * seeds.length)] || 1;
  }

  _navigateToBriefing();
}

function _navigateToBriefing() {
  if (!appState.selectedCharacter || !appState.selectedScenario) return;

  // Prepare G with difficulty + permitDays so briefing can show it
  const diffId = appState.difficulty;
  const diffLevels = [
    { id: 'very-easy', mod: 4 }, { id: 'easy', mod: 2 }, { id: 'standard', mod: 0 },
    { id: 'hard', mod: -1 }, { id: 'very-hard', mod: -2 },
  ];
  const dm = diffLevels.find((d) => d.id === diffId) || diffLevels[2];
  updateRunState(G, {
    permitMaxDays: Math.max(12, Math.min(26, 20 + dm.mod)),
    character: appState.selectedCharacter,
    scenario: appState.selectedScenario,
    difficulty: diffId,
  });

  UI.renderBriefing(appState.selectedCharacter, appState.selectedScenario, G, appState.lang);
  navigateTo('briefing');
}

// ── SCENARIO SELECTION IN BRIEFING ───────────────────────────────────────────

function _buildScenarioSelector() {
  const container = document.getElementById('briefing-scenario-select');
  if (!container || !appState.scenarios) return;
  container.innerHTML = '';

  const scenarios = appState.scenarios.predefinedScenarios || [];
  const lang = appState.lang;

  scenarios.forEach((sc) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scenario-pick-btn${appState.selectedScenario?.id === sc.id ? ' active' : ''}`;
    btn.textContent = `${sc.num} · ${sc.name}`;
    btn.addEventListener('click', () => {
      appState.selectedScenario = sc;
      const seeds = sc.seeds || [];
      G.seed = seeds[Math.floor(Math.random() * seeds.length)] || 1;
      updateRunState(G, { scenario: sc, seed: G.seed });
      UI.renderBriefing(appState.selectedCharacter, sc, G, lang);
      _buildScenarioSelector();
    });
    container.appendChild(btn);
  });

  // Random scenario button
  const rndBtn = document.createElement('button');
  rndBtn.type = 'button';
  rndBtn.className = 'scenario-pick-btn scenario-pick-random';
  rndBtn.textContent = strings[lang]?.briefing?.scenarioSelect || '🎲 Random';
  rndBtn.addEventListener('click', () => {
    const rndConfig = appState.scenarios.randomScenario;
    const sc = buildRandomScenario(rndConfig, null);
    appState.selectedScenario = sc;
    G.seed = sc._randomSeed;
    updateRunState(G, { scenario: sc, seed: G.seed });
    UI.renderBriefing(appState.selectedCharacter, sc, G, lang);
    _buildScenarioSelector();
  });
  container.appendChild(rndBtn);
}

// ── GAME START ────────────────────────────────────────────────────────────────

function startGame() {
  if (!appState.selectedCharacter || !appState.selectedScenario) {
    console.error('[app] Cannot start: missing character or scenario');
    return;
  }

  const sc = appState.selectedScenario;
  const seeds = sc.seeds || [];
  const seed = seeds[Math.floor(Math.random() * seeds.length)] || 1;

  try {
    initRun(G, appState.selectedCharacter.id, sc.id, appState.difficulty, seed);
  } catch (err) {
    console.error('[app] initRun failed:', err);
    return;
  }

  // Pass current lang to engine for narrative selection
  G._lang = appState.lang;

  appState.gameRunning = true;
  UI.clearEventLog();
  _renderGameUI();
  navigateTo('game');
}

function _renderGameUI() {
  const lang = appState.lang;
  const actions = getAvailableActions(G);

  UI.renderGameTopbar(G, lang);
  UI.renderActionButtons(actions, G, lang, handleAction);
  UI.renderStatusPanel(G, lang);
  UI.renderPerceptionCard(G, lang);
  UI.renderPermitCounter(G, lang);
}

// ── ACTION HANDLING ───────────────────────────────────────────────────────────

function handleAction(action) {
  if (!appState.gameRunning || !G.state) return;

  UI.setActionButtonsEnabled(false);

  // Guard: sleep only at camp
  if (action === 'sleep') {
    const node = getCurrentNode(G);
    if (!node.isCamp) {
      UI.setActionButtonsEnabled(true);
      return;
    }
  }

  G._lang = appState.lang;
  const turnResult = resolveTurn(G, action);
  const lang = appState.lang;

  // Record turn in run log
  G.turnLog.push({
    turn: G.turn,
    day: G.day,
    position: G.state?.position,
    decision: turnResult.resolvedAction,
    outcome: turnResult.outcome,
    flags: [...(turnResult.flags || [])],
  });

  UI.appendTurnLog(G, turnResult, lang);
  UI.renderGameTopbar(G, lang);
  UI.renderStatusPanel(G, lang);
  UI.renderPerceptionCard(G, lang);
  UI.renderPermitCounter(G, lang);

  const isTerminal = turnResult.outcome !== 'Strategic Retreat';

  if (isTerminal) {
    updateRunState(G, { finalOutcome: turnResult.outcome });
    // Persist summit achieved
    if (turnResult.outcome === 'Summit and Safe Return') {
      try { localStorage.setItem(SUMMIT_ACHIEVED_KEY, '1'); } catch (e) {}
    }
    appState.gameRunning = false;
    setTimeout(() => {
      if (turnResult.outcome === 'Summit and Safe Return') {
        UI.renderSummitSuccess(G, lang);
        navigateTo('summit-success');
      } else {
        UI.renderDebrief(G, lang);
        navigateTo('debrief');
      }
    }, 900);
    return;
  }

  // Update pressure history + turn
  updateRunState(G, { turn: G.turn + 1 });

  setTimeout(() => {
    _renderGameUI();
    UI.setActionButtonsEnabled(true);
  }, 350);
}

// ── DEBRIEF ACTIONS ───────────────────────────────────────────────────────────

function hasPreviouslySummited() {
  try { return !!localStorage.getItem(SUMMIT_ACHIEVED_KEY); } catch (e) { return false; }
}

function onNewExpedition() {
  appState.selectedCharacter = null;
  appState.selectedScenario = null;
  appState.gameRunning = false;
  UI.renderCharacterGrid(appState.characters, appState.lang, _onCharacterSelected);
  navigateTo('character');
}

function onShareResult() {
  const lang = appState.lang;
  const s = strings[lang]?.debrief || strings.en.debrief;
  const text = typeof s.shareText === 'function'
    ? s.shareText(G.finalOutcome, G.character?.name || '—', G.turnLog.length)
    : `Aconcagua: Stone Sentinel — ${G.finalOutcome}`;

  if (navigator.share) {
    navigator.share({ title: 'Aconcagua: Stone Sentinel', text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('debrief-share');
      if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = s.share; }, 2000); }
    });
  }
}

function onExportLog() {
  const payload = {
    version: '1.4.1',
    character: G.character?.id || null,
    characterName: G.character?.name || null,
    scenario: G.scenario?.id || null,
    scenarioName: G.scenario?.name || null,
    difficulty: G.difficulty || null,
    seed: G.seed || null,
    finalOutcome: G.finalOutcome,
    totalTurns: G.turnLog.length,
    totalDays: G.day,
    highestPosIdx: G.highestPosIdx,
    turnLog: G.turnLog,
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aconcagua-run-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  } catch (e) {
    console.warn('[app] Export log failed:', e);
  }
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────

function _setupEventListeners() {
  // Delegated click handling
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action-nav], button[id], .action-btn');
    if (!target) return;

    const id = target.id;
    const navAction = target.dataset.actionNav;

    if (navAction) {
      _handleNavAction(navAction, target);
      return;
    }

    switch (id) {
      case 'nav-lang':
        toggleLanguage();
        break;
      case 'nav-theme':
        appState.theme = UI.cycleTheme();
        break;
      case 'hero-cta':
        UI.renderCharacterGrid(appState.characters, appState.lang, _onCharacterSelected);
        navigateTo('character');
        break;
      case 'btn-confirm-from-grid':
        _onCharacterConfirmed();
        break;
      case 'btn-back-character':
        navigateTo('hero');
        break;
      case 'btn-back-briefing':
        navigateTo('character');
        break;
      case 'btn-start-game':
        startGame();
        break;
      case 'debrief-again':
        onNewExpedition();
        break;
      case 'debrief-share':
        onShareResult();
        break;
      case 'debrief-export-log':
        onExportLog();
        break;
      // Summit success screen buttons
      case 'summit-continue-part2':
        UI.renderPart2Select(appState.characters, appState.lang, null);
        navigateTo('part2-select');
        break;
      case 'summit-new-expedition':
        onNewExpedition();
        break;
      case 'summit-view-debrief':
        UI.renderDebrief(G, appState.lang);
        navigateTo('debrief');
        break;
      // Part 2 select screen buttons
      case 'btn-back-part2':
        navigateTo('hero');
        break;
      case 'btn-part2-continue': {
        UI.showPart2ComingSoon();
        break;
      }
      case 'btn-part2-coming-soon-back':
        navigateTo('hero');
        break;
    }
  });

  // Difficulty selector on hero screen
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.diff-dot');
    if (!btn) return;
    appState.difficulty = btn.dataset.diffId || 'standard';
    _savePreferences();
    UI.renderDifficultySelector(appState.lang, appState.difficulty, (id) => {
      appState.difficulty = id;
      _savePreferences();
    });
  });

  // Briefing scenario select (lazy: build on briefing nav)
}

function _handleNavAction(action, target) {
  switch (action) {
    case 'go-character':
      UI.renderCharacterGrid(appState.characters, appState.lang, _onCharacterSelected);
      navigateTo('character');
      break;
    case 'go-briefing':
      if (appState.selectedCharacter) _navigateToBriefing();
      break;
    case 'go-game':
      startGame();
      break;
    case 'go-hero':
      navigateTo('hero');
      break;
  }
}

// ── INTERSECTION OBSERVER (reveal animations) ─────────────────────────────────

function _initIntersectionObserver() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ── PUBLIC API (window.app for inline HTML handlers) ─────────────────────────

window.app = {
  navigateTo,
  handleAction,
  toggleLanguage,
  startGame,
  onNewExpedition,
  onShareResult,
  onExportLog,
  hasPreviouslySummited,
  selectCharacter: _onCharacterSelected,
  confirmCharacter: _onCharacterConfirmed,
};

// ── BOOT ──────────────────────────────────────────────────────────────────────

init();
