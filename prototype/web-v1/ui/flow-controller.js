/**
 * flow-controller.js
 *
 * Screen-flow orchestration: showScreen, modal management, bottom-sheet control,
 * and deep-link navigation.  Extracted from screens.js so that navigation
 * and modal-state concerns have a single, testable home.
 *
 * Usage:
 *   1. Call initFlowController(hooks) once, after all render functions are ready.
 *   2. Import and use the exported functions (showScreen, modal helpers, etc.).
 *   3. screens.js remains the orchestrator but delegates all flow/nav logic here.
 *
 * Dependency rule: this module MUST NOT import from screens.js.
 * All screens.js callbacks are injected via initFlowController().
 */

import { openModalWithFocus, closeModalWithFocusReturn } from './helpers/accessibility.js';
import { openTutorialStyleModal, closeTutorialStyleModal, bindBackdropClose } from './helpers/modal-controller.js';
import { syncScreenHash, parseDeepLinkHash } from './helpers/routing.js';
import { resolveNavigationTarget } from './helpers/screen-utils.js';
import { safeSetStorage } from './helpers/storage.js';
import { isKnownDeepLinkScreen, validateSelectionParams, validateDebriefParams } from './helpers/deep-link-validation.js';
import { G, updateUIState, updateRunState } from '../state/game-state.js';
import { setStartupState } from './helpers/startup-ui.js';

// ─────────────────────────────────────────────────────────────────────────────
// Private state
// ─────────────────────────────────────────────────────────────────────────────

/** Injected callbacks supplied by screens.js via initFlowController(). */
let _hooks = null;

/**
 * When true, showScreen() skips writing the URL hash once so that deep-link
 * bootstrapping does not overwrite the incoming hash with a bare #screenId.
 * showScreen() always resets this to false after consuming it.
 */
let _suppressHashSync = false;

/** Duration of the screen-exit CSS animation before activating the new screen. */
const SCREEN_EXIT_DURATION_MS = 150;

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register callbacks from screens.js and attach one-time DOM event listeners.
 *
 * Must be called once, after all render/game functions exist in screens.js,
 * and before any showScreen / handleDeepLink call.
 *
 * @param {object} hooks
 * @param {Set<string>}   hooks.part2NarrativeIds          All Part 2 narrative screen IDs.
 * @param {string}        hooks.summitAchievedKey          localStorage key for summit flag.
 * @param {() => boolean} hooks.hasPreviouslySummited      Returns true if summit was achieved.
 * @param {Function}      hooks.reportRuntimeIssue         (msg, detail?) => void — dev-only logging.
 * @param {Function}      hooks.uiText                     (en, es) => string — i18n helper.
 * @param {Function}      hooks.onEnterScreen              (id) => void — render hook per screen.
 * @param {Function}      hooks.buildGameHelpContent       () => void — fills game-help overlay.
 * @param {Function}      hooks.bootstrapMockDebrief       (params) => void — deep-link debrief.
 * @param {Function}      hooks.startGame                  () => void — starts a new game run.
 * @param {Function}      hooks.showOnboarding             (mode) => void — shows onboarding modal.
 * @param {Function}      hooks.deriveDifficultyFromScenario () => void — syncs difficulty from G.scenario.
 * @param {Function}      hooks.resolveCharacter           (param) => obj|null — from deep-link param.
 * @param {Function}      hooks.resolveScenario            (param) => obj|null — from deep-link param.
 */
export function initFlowController(hooks) {
  _hooks = hooks;
  _attachBackdropCloseBindings();
  _attachEscapeListener();
  _attachOverlayBackdrops();
  _attachBottomSheetBackdrop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Close all transient overlays before switching screens. */
function dismissTransientUi() {
  closeIntroModal();
  closeTutorialModal();
  closeOnboardingModal();
  closeGameHelp();
  closeWatchDetail();
  closeFieldLog();
  closeAllBottomSheets();
}

function _attachBackdropCloseBindings() {
  bindBackdropClose({ modalId: 'intro-modal',      close: closeIntroModal });
  bindBackdropClose({ modalId: 'tutorial-modal',   close: closeTutorialModal });
  bindBackdropClose({ modalId: 'onboarding-modal', close: closeOnboardingModal });
}

function _attachEscapeListener() {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const openTutorial  = document.getElementById('tutorial-modal')?.classList.contains('visible');
    const openOnboarding = document.getElementById('onboarding-modal')?.classList.contains('visible');
    const openIntro     = document.getElementById('intro-modal')?.classList.contains('visible');
    const helpOpen      = document.getElementById('game-help-overlay')?.classList.contains('open');
    const watchOpen     = document.getElementById('watch-detail-overlay')?.classList.contains('open');
    const fieldOpen     = document.getElementById('field-log-overlay')?.classList.contains('open');

    if (openTutorial)   closeTutorialModal();
    else if (openOnboarding) closeOnboardingModal();
    else if (openIntro) closeIntroModal();
    else if (helpOpen)  closeGameHelp();
    else if (watchOpen) closeWatchDetail();
    else if (fieldOpen) closeFieldLog();
    else if (isBottomSheetOpen()) closeAllBottomSheets();
  });
}

function _attachOverlayBackdrops() {
  [
    ['game-help-overlay',   closeGameHelp],
    ['watch-detail-overlay', closeWatchDetail],
    ['field-log-overlay',   closeFieldLog],
  ].forEach(([overlayId, close]) => {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
  });
}

function _attachBottomSheetBackdrop() {
  document.addEventListener('DOMContentLoaded', () => {
    const backdrop = document.getElementById('bottom-sheet-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeAllBottomSheets);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// showScreen — core navigation function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activate a screen by its ID, enforcing the Part 2 access gate, dismissing
 * transient UI, running per-screen render hooks, and syncing the URL hash.
 *
 * @param {string} id - Target screen ID (without the "screen-" prefix).
 * @param {object} [opts]
 * @param {boolean} [opts.suppressHash=false] - When true, skips hash sync once
 *   (equivalent to setting _suppressHashSync before the call, but explicit).
 */
export function showScreen(id, { suppressHash = false } = {}) {
  const currentScreen = document.querySelector('.screen.active')?.id?.replace('screen-', '');
  if (_hooks.shouldConfirmLeaveRun?.({ fromScreen: currentScreen, toScreen: id })) {
    const shouldContinue = _hooks.confirmLeaveRun?.({ fromScreen: currentScreen, toScreen: id });
    if (!shouldContinue) return;
  }

  const part2Screens = new Set(['part2-character', ..._hooks.part2NarrativeIds]);
  id = resolveNavigationTarget(id, {
    finalOutcome: G.finalOutcome,
    hasSummited: _hooks.hasPreviouslySummited(),
    part2ScreenIds: part2Screens,
  });

  updateUIState(G, { journalReturnScreen: G.journalReturnScreen || 'debrief' });
  dismissTransientUi();

  // Hide fixed utility controls during gameplay; restore on other screens.
  const titleControls = document.querySelector('.title-top-controls');
  if (titleControls) {
    titleControls.style.display = id === 'game' ? 'none' : '';
  }

  /* Decision 14: screen exit animation before switching */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentActive = document.querySelector('.screen.active');

  const activateTarget = () => {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'exiting');
    });
    const target = document.getElementById('screen-' + id);
    if (!target) { _hooks.reportRuntimeIssue('Unknown screen id', id); return; }
    target.classList.add('active');
    window.scrollTo(0, 0);

    // Delegate per-screen rendering to screens.js via the onEnterScreen hook.
    _hooks.onEnterScreen(id);

    // Journal back-button wiring is a navigation concern (links back to a prior screen).
    if (id === 'journal') {
      const backBtn = document.getElementById('journal-back-btn');
      if (backBtn) {
        const origin = G.journalReturnScreen || 'debrief';
        const labels = {
          debrief: _hooks.uiText('Debrief', 'Debrief'),
          title:   _hooks.uiText('Title', 'Título'),
          game:    _hooks.uiText('Game', 'Juego'),
        };
        backBtn.textContent = labels[origin] || origin;
        backBtn.onclick = () => showScreen(origin);
      }
    }

    // Sync URL hash so the current screen is shareable.
    // Suppressed during deep-link bootstrap to avoid overwriting the incoming URL.
    const doSuppressHash = suppressHash || _suppressHashSync;
    _suppressHashSync = false; // always consume
    if (!doSuppressHash) {
      syncScreenHash(id);
    }
  };

  if (reduceMotion || !currentActive || currentActive.id === 'screen-' + id) {
    activateTarget();
  } else {
    /* Apply exit animation */
    currentActive.classList.add('exiting');
    setTimeout(activateTarget, SCREEN_EXIT_DURATION_MS);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Title navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance from the title screen to expedition setup.
 * Closes the intro modal if open and validates that data is loaded.
 *
 * @param {Event} [event]
 */
export function advanceFromTitle(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!G.modelReady) {
    setStartupState('error', _hooks.uiText(
      'Model is still loading or blocked.',
      'El modelo todavía está cargando o está bloqueado.'
    ));
    return;
  }
  closeIntroModal();
  showScreen('expedition-setup');
}

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial-style modals (intro + tutorial + onboarding)
// ─────────────────────────────────────────────────────────────────────────────

export function openIntroModal() {
  openTutorialStyleModal({ modalId: 'intro-modal', triggerId: 'title-info-trigger' });
}

export function closeIntroModal() {
  closeTutorialStyleModal({ modalId: 'intro-modal', fallbackTriggerId: 'title-info-trigger' });
}

export function openTutorialModal() {
  openTutorialStyleModal({ modalId: 'tutorial-modal', triggerId: 'onboarding-tutorial-btn' });
}

export function closeTutorialModal() {
  closeTutorialStyleModal({ modalId: 'tutorial-modal', fallbackTriggerId: 'onboarding-tutorial-btn' });
}

export function closeOnboardingModal() {
  closeTutorialStyleModal({ modalId: 'onboarding-modal', fallbackTriggerId: 'btn-begin-expedition' });
}

export function abandonOnboarding() {
  closeOnboardingModal();
  showScreen('expedition-setup');
}

// ─────────────────────────────────────────────────────────────────────────────
// Game overlay modals (help, watch detail, field log)
// ─────────────────────────────────────────────────────────────────────────────

export function openGameHelp() {
  _hooks.buildGameHelpContent();
  const overlay = document.getElementById('game-help-overlay');
  const dialog  = overlay?.querySelector('.game-help-dialog');
  const trigger = document.getElementById('game-help-trigger');
  openModalWithFocus({ overlay, dialog, trigger });
}

export function closeGameHelp() {
  const overlay = document.getElementById('game-help-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: 'game-help-trigger' });
}

/* Watch detail overlay — opened by tapping the watch band */
export function openWatchDetail() {
  const overlay = document.getElementById('watch-detail-overlay');
  const dialog  = overlay?.querySelector('.watch-detail-dialog');
  const trigger = document.getElementById('watch-band');
  openModalWithFocus({ overlay, dialog, trigger });
}

export function closeWatchDetail() {
  const overlay = document.getElementById('watch-detail-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: 'watch-band' });
}

/* Field log overlay — opened via "View field log" link in mountain-main */
export function openFieldLog() {
  const overlay = document.getElementById('field-log-overlay');
  const dialog  = overlay?.querySelector('.field-log-dialog');
  const trigger = document.querySelector('.field-log-trigger');
  openModalWithFocus({ overlay, dialog, trigger });
}

export function closeFieldLog() {
  const overlay = document.getElementById('field-log-overlay');
  closeModalWithFocusReturn({ overlay, fallbackTriggerId: null });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom-sheet management (mobile game screen)
// ─────────────────────────────────────────────────────────────────────────────

export function closeAllBottomSheets() {
  document.querySelectorAll('.bottom-sheet').forEach((sheet) => sheet.classList.remove('open'));
  document.getElementById('bottom-sheet-backdrop')?.classList.remove('visible');
  document.body.classList.remove('modal-open');
}

export function isBottomSheetOpen() {
  return !!document.querySelector('.bottom-sheet.open');
}

export function openBottomSheet(sheetId) {
  const sheet    = document.getElementById(sheetId);
  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (sheet) {
    closeAllBottomSheets();
    sheet.classList.add('open');
  }
  if (backdrop) backdrop.classList.add('visible');
  if (isBottomSheetOpen()) document.body.classList.add('modal-open');
}

export function closeBottomSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  if (sheet) sheet.classList.remove('open');
  if (!isBottomSheetOpen()) closeAllBottomSheets();
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep-link navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle hash-based deep links after data config is loaded.
 * Called once in the loadDataConfig().then() chain.
 * Reads window.location.hash and navigates / bootstraps state accordingly.
 */
export function handleDeepLink() {
  const parsed = parseDeepLinkHash();
  if (!parsed) return;

  const { screenId, params } = parsed;
  if (!isKnownDeepLinkScreen(screenId, [..._hooks.part2NarrativeIds])) {
    _hooks.reportRuntimeIssue('Ignoring unknown deep-link screen', screenId);
    showScreen('title', { suppressHash: true });
    return;
  }

  // Part 2 screens — bypass gating when &force=1 is present
  const PART2_SCREEN_IDS = new Set(['part2-character', ..._hooks.part2NarrativeIds]);
  if (PART2_SCREEN_IDS.has(screenId) && params.force === '1') {
    safeSetStorage(_hooks.summitAchievedKey, '1');
    updateRunState(G, { finalOutcome: 'Summit and Safe Return' });
    showScreen(screenId, { suppressHash: true });
    return;
  }

  if (screenId === 'game') {
    const validated = validateSelectionParams({
      params,
      resolveCharacter: _hooks.resolveCharacter,
      resolveScenario: _hooks.resolveScenario,
    });
    if (!validated.ok) {
      _hooks.reportRuntimeIssue(`Invalid game deep-link params: ${validated.reason}`, JSON.stringify(params));
      showScreen('expedition-setup', { suppressHash: true });
      return;
    }
    updateRunState(G, {
      character: validated.character,
      scenario: validated.scenario,
      seed: validated.seed,
    });
    _hooks.deriveDifficultyFromScenario();
    // startGame() calls showScreen('game') internally — suppress hash overwrite
    _suppressHashSync = true;
    _hooks.startGame();
    return;
  }

  if (screenId === 'onboarding') {
    const validated = validateSelectionParams({
      params,
      resolveCharacter: _hooks.resolveCharacter,
      resolveScenario: _hooks.resolveScenario,
    });
    if (!validated.ok) {
      _hooks.reportRuntimeIssue(`Invalid onboarding deep-link params: ${validated.reason}`, JSON.stringify(params));
      showScreen('expedition-setup', { suppressHash: true });
      return;
    }
    updateRunState(G, {
      character: validated.character,
      scenario: validated.scenario,
      seed: validated.seed,
    });
    _hooks.deriveDifficultyFromScenario();
    _suppressHashSync = true;
    _hooks.showOnboarding('predefined');
    return;
  }

  if (screenId === 'debrief') {
    const validated = validateDebriefParams({
      params,
      resolveCharacter: _hooks.resolveCharacter,
      resolveScenario: _hooks.resolveScenario,
      validOutcomes: _hooks.getCanonicalOutcomes(),
    });
    if (!validated.ok) {
      _hooks.reportRuntimeIssue(`Invalid debrief deep-link params: ${validated.reason}`, JSON.stringify(params));
      showScreen('expedition-setup', { suppressHash: true });
      return;
    }
    _hooks.bootstrapMockDebrief(params);
    return;
  }

  // All other screens: navigate directly
  showScreen(screenId, { suppressHash: true });
}
