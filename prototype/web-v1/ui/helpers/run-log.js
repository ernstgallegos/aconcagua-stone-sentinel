/**
 * run-log.js — Telemetry serialization and run-log export contract.
 *
 * ── Ownership ────────────────────────────────────────────────────────────────
 * This module is the single source of truth for:
 *   • Per-turn log entry shape  (buildTurnLogEntry)
 *   • Run summary counter shape (summarizeRunLog)
 *   • Downloadable run_log.json export contract (buildRunLogExport)
 *
 * The engine (engine/turn-resolution.js → resolveTurnWithTrace) produces raw
 * numeric values (EP/BT/delta, flags, blocked/moved booleans).  This module
 * transforms those values into the player-facing/export representation.
 * No terminal outcomes are set or modified here.
 *
 * ── Per-turn entry shape ─────────────────────────────────────────────────────
 * Each entry produced by buildTurnLogEntry includes:
 *   turn, day, time                   — chronological position
 *   position / node                   — route position (same value, both kept)
 *   stage                             — 'APPROACH' | 'HIGH_CAMP' | 'SUMMIT_DAY'
 *   decision                          — action taken this turn
 *   trend / uncertainty               — perceived signal state
 *   body.{capacity,fatigue,exposure}  — labeled body state
 *   raw.{capacity,fatigue,exposure,   — numeric body state for analysis
 *        weatherSeverity}
 *   pressure.{mountainPressure,       — EP band + delta label
 *             deltaLabel}
 *   flags                             — array of event/outcome tags
 *   blocked / moved                   — resolver result booleans
 *   decisionMs                        — time-in-decision telemetry
 *   decisionWindowExceeded            — bool, true when window elapsed
 *   decisionWindowEffect              — effect code applied on window expiry
 *   contextEvent / lateSignalActivation / warningState — event telemetry
 *   narrativeText                     — player-facing turn prose
 *
 * ── Run summary attachment ────────────────────────────────────────────────────
 * buildRunLogExport() attaches a `runSummary` object to ONLY the final record
 * in the exported array.  All other records are returned unchanged.
 * This is intentional: the summary is a terminal aggregate and must not be
 * re-read mid-run.  Consumers should always reference runSummary from the
 * last element of the exported array.
 *
 * ── Alias deprecation policy ─────────────────────────────────────────────────
 * The legacy numeric field names `EP` and `BT` (Environmental Pressure and
 * Body Tolerance scores) were introduced in the original index.html run_log
 * export.  Stable cross-run comparison aliases `epScore` and `btScore` were
 * standardised in v1.4.1.  The legacy names are:
 *
 *   @deprecated since v1.4.5  — use `epScore` / `btScore` instead.
 *   @removedIn   v1.5.0       — consumers still reading `EP` / `BT` from
 *                               run_log.json or lastTurnRecord.pressure must
 *                               migrate before the v1.5.0 release.
 *
 * Canonical location of the raw numeric values: lastTurnRecord.pressure
 * (written by engine/turn-resolution.js → resolveTurnWithTrace).
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
    narrativeText,
  };
}

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
    if (entry.lateSignalTriggered || entry.lateSignalActivation) summary.lateSignalTriggeredCount += 1;
    if (entry.specialActionUsed) summary.specialActionUsedCount += 1;
  });

  return summary;
}

export function buildRunLogExport(runLogRecords) {
  if (!runLogRecords.length) return [];
  const summary = summarizeRunLog(runLogRecords);
  return runLogRecords.map((entry, idx) => {
    if (idx !== runLogRecords.length - 1) return entry;
    return { ...entry, runSummary: summary };
  });
}
