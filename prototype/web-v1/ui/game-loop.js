// ui/game-loop.js
//
// Turn-resolution orchestration layer.
// Extracted from screens.js so that turn-processing logic lives in one
// testable module, independent of the DOM-rendering helpers.
//
// Interface
// ---------
//   const gameLoop = createGameLoop(deps);
//   gameLoop.handleDecision(decision);  // called by makeDecision in screens.js
//
// Deps that are pure engine / state:
//   G, resolveTurn, applyAcclimatizationGain, updateRunState, recordTelemetry,
//   buildTurnLogEntry, computeSignals, calculateEnvironmentalPressure,
//   isCampPosition, assertStateShape, getCurrentStage, calculateBodyTolerance
//
// Label/format helpers are imported directly from screen-utils.js:
//   formatMinutes, capacityLabel, fatigueLabel, exposureLabel,
//   pressureBandLabel, pressureDeltaLabel
//
// Deps that are rendering callbacks (kept in screens.js, injected here):
//   renderWatch, renderNarrative, addLogEntry, setDecisionButtonsEnabled,
//   onRunEnded(returnedToHorcones)

import {
  formatMinutes,
  capacityLabel,
  fatigueLabel,
  exposureLabel,
  pressureBandLabel,
  pressureDeltaLabel,
} from './helpers/screen-utils.js';

const PARK_EXIT_OUTCOMES = new Set([
  'Summit and Safe Return',
  'High Point Return',
  'Strategic Retreat',
]);

/**
 * Factory that wires the turn-processing loop together.
 *
 * @param {object} deps - All dependencies (engine + rendering callbacks).
 * @returns {{ handleDecision: (decision: string) => void }}
 */
export function createGameLoop({
  G,
  resolveTurn,
  applyAcclimatizationGain,
  updateRunState,
  recordTelemetry,
  buildTurnLogEntry,
  computeSignals,
  calculateEnvironmentalPressure,
  isCampPosition,
  assertStateShape,
  getCurrentStage,
  calculateBodyTolerance,
  // rendering callbacks
  renderWatch,
  renderNarrative,
  addLogEntry,
  setDecisionButtonsEnabled,
  onRunEnded,
}) {
  /**
   * Process a single player decision through the full turn pipeline.
   * Mutates G via updateRunState/recordTelemetry; calls rendering callbacks.
   *
   * @param {string} decision - Player action ('advance'|'descend'|'sleep'|…)
   */
  function handleDecision(decision) {
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
    const previousPosition = s.position;
    const turnResult = resolveTurn(s, decision);
    const resolvedDecision = turnResult.resolvedAction || decision;
    applyAcclimatizationGain(resolvedDecision);
    updateRunState(G, { signals: computeSignals() });
    renderWatch();
    const narrativeText = renderNarrative(resolvedDecision, G.signals, turnResult.flags);

    const logEntry = buildTurnLogEntry({
      G,
      state: s,
      stage: getCurrentStage(),
      resolvedDecision,
      turnResult,
      narrativeText,
      formatMinutes,
      capacityLabel,
      fatigueLabel,
      exposureLabel,
      pressureBandLabel,
      pressureDeltaLabel,
      calculateBodyTolerance,
    });
    updateRunState(G, {
      turnLog: [...G.turnLog, logEntry],
      allFlags: [...G.allFlags, ...turnResult.flags],
    });
    addLogEntry(logEntry);

    const exitedPark = previousPosition === 'horcones' && resolvedDecision === 'descend';
    const returnedToHorcones = exitedPark && PARK_EXIT_OUTCOMES.has(turnResult.outcome);
    const ended = exitedPark || turnResult.outcome !== 'Strategic Retreat';

    if (ended) {
      updateRunState(G, { finalOutcome: turnResult.outcome });
      if (decisionPanel) decisionPanel.classList.remove('processing');
      setTimeout(() => onRunEnded(returnedToHorcones), 800);
      return;
    }

    const currentEP = calculateEnvironmentalPressure(G.state).pressureScore;
    const updatedHistory = [...(G.pressureHistory || []), currentEP].slice(-5);
    updateRunState(G, { pressureHistory: updatedHistory });
    updateRunState(G, { turn: G.turn + 1 });
    recordTelemetry(G, { turnDecisionStartedAt: Date.now() });
    setTimeout(() => {
      renderWatch();
      renderNarrative(null, G.signals);
      setDecisionButtonsEnabled(true);
      if (decisionPanel) decisionPanel.classList.remove('processing');
    }, 400);
  }

  return { handleDecision };
}
