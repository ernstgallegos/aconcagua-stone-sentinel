/**
 * App Controller — main entry point for the game.
 * Manages screen transitions, game loop, and UI updates.
 */

import { loadGameData } from './data-loader.js';
import { createInitialState, getAvailableActions, formatTime, isPartTwoUnlocked, unlockPartTwo } from '../state/game-state.js';
import { resolveTurn } from '../engine/turn-resolution.js';
import { getOutcomeMetadata, unlocksPartTwo } from '../engine/outcomes.js';

let gameData = null;
let gameState = null;
let currentScreen = 'title';

// DOM references
const screens = {};
const dom = {};

/**
 * Initialize the application.
 */
export async function init() {
  cacheDOM();
  try {
    gameData = await loadGameData();
    buildCharacterGrid();
    buildScenarioGrid();
    showScreen('title');
  } catch (err) {
    showFatalError(err.message);
  }
}

/**
 * Cache DOM element references.
 */
function cacheDOM() {
  screens.title = document.getElementById('screen-title');
  screens.setup = document.getElementById('screen-setup');
  screens.game = document.getElementById('screen-game');
  screens.debrief = document.getElementById('screen-debrief');
  screens.part2 = document.getElementById('screen-part2');

  dom.characterGrid = document.getElementById('character-grid');
  dom.scenarioGrid = document.getElementById('scenario-grid');
  dom.startBtn = document.getElementById('btn-start-expedition');

  dom.watchTime = document.getElementById('watch-time');
  dom.watchDay = document.getElementById('watch-day');
  dom.watchPermit = document.getElementById('watch-permit');
  dom.watchAltitude = document.getElementById('watch-altitude');
  dom.watchLocation = document.getElementById('watch-location');
  dom.watchStage = document.getElementById('watch-stage');

  dom.signalPressure = document.getElementById('signal-pressure');
  dom.signalTrend = document.getElementById('signal-trend');
  dom.signalConfidence = document.getElementById('signal-confidence');

  dom.bodyFatigue = document.getElementById('body-fatigue');
  dom.bodyExposure = document.getElementById('body-exposure');
  dom.bodyCapacity = document.getElementById('body-capacity');
  dom.resWater = document.getElementById('res-water');
  dom.resFood = document.getElementById('res-food');

  dom.actionPanel = document.getElementById('action-panel');
  dom.narrativeLog = document.getElementById('narrative-log');
  dom.mountainViz = document.getElementById('mountain-viz');

  dom.debriefOutcome = document.getElementById('debrief-outcome');
  dom.debriefStats = document.getElementById('debrief-stats');
  dom.debriefNarrative = document.getElementById('debrief-narrative');
}

/**
 * Show a specific screen, hide all others.
 */
function showScreen(screenId) {
  for (const [id, el] of Object.entries(screens)) {
    if (el) el.classList.toggle('active', id === screenId);
  }
  currentScreen = screenId;
}

/**
 * Build character selection grid.
 */
function buildCharacterGrid() {
  if (!dom.characterGrid || !gameData.characters) return;
  dom.characterGrid.innerHTML = '';

  for (const char of gameData.characters) {
    const card = document.createElement('button');
    card.className = 'character-card';
    card.dataset.characterId = char.id;
    card.innerHTML = `
      <div class="card-flag">${char.flag || ''}</div>
      <div class="card-name">${char.name}</div>
      <div class="card-role">${char.role}</div>
      <div class="card-difficulty">${char.difficultyLabel || 'Standard'}</div>
    `;
    card.addEventListener('click', () => selectCharacter(char));
    dom.characterGrid.appendChild(card);
  }
}

/**
 * Build scenario selection grid.
 */
function buildScenarioGrid() {
  if (!dom.scenarioGrid || !gameData.scenarios) return;
  dom.scenarioGrid.innerHTML = '';

  const scenarioList = Array.isArray(gameData.scenarios) ? gameData.scenarios : [];

  for (const scenario of scenarioList) {
    const card = document.createElement('button');
    card.className = 'scenario-card';
    card.dataset.scenarioId = scenario.id;
    card.innerHTML = `
      <div class="card-name">${scenario.name || scenario.id}</div>
      <div class="card-difficulty">${scenario.difficulty || 'Medium'}</div>
      <div class="card-desc">${scenario.desc || ''}</div>
    `;
    card.addEventListener('click', () => selectScenario(scenario));
    dom.scenarioGrid.appendChild(card);
  }
}

// Selection state
let selectedCharacter = null;
let selectedScenario = null;

function selectCharacter(char) {
  selectedCharacter = char;
  document.querySelectorAll('.character-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.characterId === char.id)
  );
  checkReadyToStart();
}

function selectScenario(scenario) {
  selectedScenario = scenario;
  document.querySelectorAll('.scenario-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.scenarioId === scenario.id)
  );
  checkReadyToStart();
}

function checkReadyToStart() {
  if (dom.startBtn) {
    dom.startBtn.disabled = !(selectedCharacter && selectedScenario);
  }
}

/**
 * Start a new expedition.
 */
export function startExpedition() {
  if (!selectedCharacter || !selectedScenario) return;

  gameState = createInitialState(selectedCharacter, selectedScenario);
  showScreen('game');
  updateGameUI();
  renderActions();
}

/**
 * Execute a player action.
 */
export function executeAction(action) {
  if (!gameState || currentScreen !== 'game') return;

  const node = gameData.nodes[gameState.positionIndex];
  const result = resolveTurn(gameState, action, {
    nodes: gameData.nodes,
    epConfig: gameData.epConfig,
    actionModifiers: gameData.actionModifiers,
    stageModifiers: gameData.stageModifiers,
    contextEvents: gameData.contextEvents,
    characterEvents: gameData.characterEvents,
    scenario: selectedScenario
  });

  // Store turn record
  gameState = result.state;
  gameState.turnHistory.push(result.turnRecord);

  // Check for terminal outcome
  if (result.terminalOutcome) {
    endExpedition(result.terminalOutcome);
    return;
  }

  // Update UI
  updateGameUI();
  renderActions();
  appendNarrative(result.narrative);

  // Show event narratives
  if (gameState.lastEventNarrative) {
    appendNarrative(`📡 ${gameState.lastEventNarrative}`);
    gameState.lastEventNarrative = null;
  }
  if (gameState.lastCharEventNarrative) {
    appendNarrative(`🧠 ${gameState.lastCharEventNarrative}`);
    gameState.lastCharEventNarrative = null;
  }
}

/**
 * End the expedition and show debrief.
 */
function endExpedition(outcome) {
  if (unlocksPartTwo(outcome)) {
    unlockPartTwo();
  }

  showScreen('debrief');
  renderDebrief(outcome);
}

/**
 * Update all game UI elements.
 */
function updateGameUI() {
  if (!gameState) return;
  const node = gameData.nodes[gameState.positionIndex];

  // Watch
  if (dom.watchTime) dom.watchTime.textContent = formatTime(gameState.timeOfDay);
  if (dom.watchDay) dom.watchDay.textContent = `Day ${gameState.day}`;
  if (dom.watchPermit) dom.watchPermit.textContent = `Permit: ${gameState.day}/${gameState.permitMaxDays}`;
  if (dom.watchAltitude) dom.watchAltitude.textContent = `${node.altitudeMeters}m`;
  if (dom.watchLocation) dom.watchLocation.textContent = node.nodeName;
  if (dom.watchStage) dom.watchStage.textContent = node.stage;

  // Signals (from last turn or initial)
  const lastTurn = gameState.turnHistory[gameState.turnHistory.length - 1];
  if (lastTurn && lastTurn.perception) {
    if (dom.signalPressure) dom.signalPressure.textContent = lastTurn.perception.pressureLabel;
    if (dom.signalTrend) dom.signalTrend.textContent = lastTurn.perception.trendEstimate;
    if (dom.signalConfidence) dom.signalConfidence.textContent = lastTurn.perception.confidenceLabel;
  } else {
    if (dom.signalPressure) dom.signalPressure.textContent = 'Calm';
    if (dom.signalTrend) dom.signalTrend.textContent = 'stable';
    if (dom.signalConfidence) dom.signalConfidence.textContent = 'Clear';
  }

  // Body
  if (dom.bodyFatigue) dom.bodyFatigue.textContent = Math.round(gameState.body.fatigue);
  if (dom.bodyExposure) dom.bodyExposure.textContent = Math.round(gameState.body.exposure);
  if (dom.bodyCapacity) dom.bodyCapacity.textContent = Math.round(gameState.body.functionalCapacity);
  if (dom.resWater) dom.resWater.textContent = Math.ceil(gameState.resources.water);
  if (dom.resFood) dom.resFood.textContent = Math.ceil(gameState.resources.food);

  // Mountain visualization (simple position indicator)
  updateMountainViz();
}

/**
 * Render available actions as buttons.
 */
function renderActions() {
  if (!dom.actionPanel || !gameState) return;
  const node = gameData.nodes[gameState.positionIndex];
  const actions = getAvailableActions(gameState, node);

  dom.actionPanel.innerHTML = '';

  const actionLabels = {
    advance: '⬆️ Advance',
    advance_slowly: '🐢 Advance Slowly',
    wait: '⏸️ Wait',
    descend: '⬇️ Descend',
    sleep: '😴 Sleep',
    shoot_photo: '📷 Photograph'
  };

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.dataset.action = action;
    btn.textContent = actionLabels[action] || action;
    btn.addEventListener('click', () => executeAction(action));
    dom.actionPanel.appendChild(btn);
  }
}

/**
 * Append narrative text to the log.
 */
function appendNarrative(text) {
  if (!dom.narrativeLog) return;
  const entry = document.createElement('div');
  entry.className = 'narrative-entry';
  entry.textContent = text;
  dom.narrativeLog.prepend(entry);

  // Keep last 20 entries
  while (dom.narrativeLog.children.length > 20) {
    dom.narrativeLog.removeChild(dom.narrativeLog.lastChild);
  }
}

/**
 * Update mountain visualization.
 */
function updateMountainViz() {
  if (!dom.mountainViz || !gameState) return;
  const totalNodes = gameData.nodes.length;
  const progress = gameState.positionIndex / (totalNodes - 1);

  dom.mountainViz.innerHTML = '';
  for (let i = 0; i < totalNodes; i++) {
    const dot = document.createElement('div');
    dot.className = 'route-node';
    if (i === gameState.positionIndex) dot.classList.add('current');
    if (i <= gameState.highestPositionIndex) dot.classList.add('visited');
    dot.title = gameData.nodes[i].nodeName;
    dom.mountainViz.appendChild(dot);
  }
}

/**
 * Render debrief screen.
 */
function renderDebrief(outcome) {
  const meta = getOutcomeMetadata(outcome);

  if (dom.debriefOutcome) {
    dom.debriefOutcome.innerHTML = `
      <div class="outcome-emoji">${meta.emoji}</div>
      <h2 class="outcome-label">${meta.label}</h2>
      <p class="outcome-description">${meta.description}</p>
    `;
  }

  if (dom.debriefStats && gameState) {
    const lastNode = gameData.nodes[gameState.highestPositionIndex];
    dom.debriefStats.innerHTML = `
      <div class="stat-row"><span>Turns</span><span>${gameState.turn}</span></div>
      <div class="stat-row"><span>Days</span><span>${gameState.day}</span></div>
      <div class="stat-row"><span>Highest Point</span><span>${lastNode.nodeName} (${lastNode.altitudeMeters}m)</span></div>
      <div class="stat-row"><span>Character</span><span>${gameState.character.name}</span></div>
    `;
  }

  if (dom.debriefNarrative) {
    if (meta.unlocksPartTwo) {
      dom.debriefNarrative.innerHTML = `
        <div class="part2-unlock">
          <h3>🔓 Part 2 Unlocked</h3>
          <p>The summit was not the end. A new chapter awaits.</p>
          <button class="btn-primary" onclick="window.app.showPart2()">Continue to Part 2 →</button>
        </div>
      `;
    } else {
      dom.debriefNarrative.innerHTML = `
        <button class="btn-primary" onclick="window.app.restart()">Try Again</button>
      `;
    }
  }
}

/**
 * Show Part 2 narrative bridge.
 */
export function showPart2() {
  showScreen('part2');
}

/**
 * Restart the game.
 */
export function restart() {
  selectedCharacter = null;
  selectedScenario = null;
  gameState = null;
  if (dom.narrativeLog) dom.narrativeLog.innerHTML = '';
  showScreen('setup');
  checkReadyToStart();
}

/**
 * Navigate from title to setup.
 */
export function startGame() {
  showScreen('setup');
}

/**
 * Show fatal error.
 */
function showFatalError(message) {
  document.body.innerHTML = `
    <div class="fatal-error">
      <h1>⚠️ Failed to load</h1>
      <p>${message}</p>
      <p>Check that data files are accessible.</p>
    </div>
  `;
}

// Expose to window for inline handlers
window.app = { init, startGame, startExpedition, executeAction, restart, showPart2 };
