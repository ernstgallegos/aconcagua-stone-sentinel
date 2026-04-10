// ui/helpers/run-log.js
//
// Telemetry ownership: per-turn entry shape and run-summary export contract.
//
// Pipeline position
// ─────────────────
// 1. game-loop.js calls buildTurnLogEntry() after each resolveTurn() call.
// 2. The resulting entry is pushed onto G.runLogRecords via updateRunState().
// 3. On run-end, endRun() in screens.js calls buildRunLogExport(G.runLogRecords),
//    which appends a runSummary object to the final record only.
// 4. exportRunLog() / safeSetStorage serialise the array to run_log.json.
//
// ── Alias deprecation policy ─────────────────────────────────────────────────
// The legacy numeric field names `EP` and `BT` existed in the original
// index.html run_log export before this module was extracted (pre-v1.4.5).
// They were not carried forward during extraction; instead, stable cross-run
// comparison aliases were introduced in their place:
//
//   entry.pressure.epScore  — Environmental Pressure score (was `EP`)
//   entry.pressure.btScore  — Body Tolerance score (was `BT`)
//
// Both aliases are present in every entry produced by buildTurnLogEntry()
// from v1.4.6 onward.  The old bare `EP`/`BT` top-level keys are not emitted.
// Consumers reading `EP` or `BT` directly from run_log.json must migrate to
// entry.pressure.epScore / entry.pressure.btScore.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a single per-turn telemetry entry from the current engine state.
 *
 * Called by game-loop.js immediately after resolveTurn() returns.  By that
 * point G.lastTurnRecord.pressure has already been written by the engine so
 * the stable EP/BT aliases are safe to read.
 *
 * @param {object} params
 * @param {object} params.G                   - Global game-state object.
 * @param {object} params.state               - Body/position snapshot at turn start.
 * @param {string} params.stage               - Route stage key (e.g. 'APPROACH').
 * @param {string} params.resolvedDecision     - Action after engine normalisation.
 * @param {object} params.turnResult          - Return value of resolveTurn().
 * @param {string} params.narrativeText       - Rendered narrative sentence for the turn.
 * @param {function} params.formatMinutes     - Minutes → HH:MM string.
 * @param {function} params.capacityLabel     - Capacity value → label string.
 * @param {function} params.fatigueLabel      - Fatigue value → label string.
 * @param {function} params.exposureLabel     - Exposure value → label string.
 * @param {function} params.pressureBandLabel - Pressure score → band label string.
 * @param {function} params.pressureDeltaLabel - Pressure delta → trend label string.
 * @param {function} params.calculateBodyTolerance - (state) → numeric BT score.
 * @returns {object} Telemetry entry conforming to the run_log per-turn contract.
 */
export function buildTurnLogEntry({
  G,
  state,
  stage,
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
}) {
  const pressureDelta = turnResult.result?.pressureDelta ?? 0;
  return {
    turn: G.turn,
    day: G.day,
    time: formatMinutes(G.minutesOfDay),
    position: state.position,
    node: state.position,
    stage,
    decision: resolvedDecision,
    trend: G.signals.trend,
    uncertainty: G.signals.uncertainty,
    body: {
      capacity: capacityLabel(state.functional_capacity),
      fatigue: fatigueLabel(state.fatigue),
      exposure: exposureLabel(state.exposure),
    },
    raw: {
      capacity: state.functional_capacity,
      fatigue: state.fatigue,
      exposure: state.exposure,
      weatherSeverity: state.weather_severity,
    },
    pressure: {
      // Stable cross-run comparison aliases (v1.4.6+).  Source: G.lastTurnRecord.pressure,
      // written by resolveTurn() → recordTelemetry() before this function is called.
      epScore: Number(G.lastTurnRecord?.pressure?.EP ?? 0),
      btScore: Number(G.lastTurnRecord?.pressure?.BT ?? 0),
      mountainPressure: pressureBandLabel(pressureDelta + calculateBodyTolerance(state)),
      deltaLabel: pressureDeltaLabel(pressureDelta),
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
    warningState: G.currentPrimaryAlert,
    contextEvent: turnResult.contextEvent || G.activeEnvironmentEvent,
    characterEvent: turnResult.characterEvent || null,
    narrativeText,
  };
}

/**
 * Compute aggregate summary counters from an array of turn log entries.
 *
 * Used internally by buildRunLogExport() and also exported so callers can
 * generate summaries on partial slices without triggering an export.
 *
 * Counter semantics:
 *   criticalEventCount         — turns where flags include any of
 *                                'critical-fatigue', 'critical-exposure',
 *                                or 'fatality-threshold'.
 *   decisionWindowExceededCount — turns where decisionWindowExceeded is truthy.
 *   lateSignalTriggeredCount   — turns where lateSignalActivation is truthy.
 *   specialActionUsedCount     — turns where specialActionUsed is truthy.
 *
 * @param {object[]} records - Array of turn log entries.
 * @returns {{ totalTurns: number, criticalEventCount: number,
 *             decisionWindowExceededCount: number,
 *             lateSignalTriggeredCount: number,
 *             specialActionUsedCount: number }}
 */
export function summarizeRunLog(records) {
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
    if (entry.lateSignalActivation) summary.lateSignalTriggeredCount += 1;
    if (entry.specialActionUsed) summary.specialActionUsedCount += 1;
  });

  return summary;
}

/**
 * Return a new array with outcome label attached to each run-log entry.
 * Keeps immutability so callers do not mutate existing telemetry arrays.
 *
 * @param {object[]} runLogRecords
 * @param {string} outcomeLabel
 * @returns {object[]}
 */
export function annotateRunLogOutcome(runLogRecords, outcomeLabel) {
  return (runLogRecords || []).map((entry) => ({ ...entry, outcome: outcomeLabel }));
}

/**
 * Produce the final export array from a completed run's turn log.
 *
 * Appends a runSummary object to the last entry only, so downstream consumers
 * can identify the summary by checking for its presence on the final record
 * without scanning the entire array.
 *
 * The original records array and its entries are not mutated.
 *
 * @param {object[]} runLogRecords - Array of turn log entries from G.runLogRecords.
 * @returns {object[]} Export-ready array; empty array if runLogRecords is empty.
 */
export function buildRunLogExport(runLogRecords) {
  if (!runLogRecords.length) return [];
  const summary = summarizeRunLog(runLogRecords);
  return runLogRecords.map((entry, idx) => {
    if (idx !== runLogRecords.length - 1) return entry;
    return { ...entry, runSummary: summary };
  });
}
