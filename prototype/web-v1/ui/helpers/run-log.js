// Telemetry ownership: turn-review shape + export contract live here.
//
// ── Alias deprecation policy ─────────────────────────────────────────────────
// The legacy numeric field names `EP` and `BT` (Environmental Pressure and
// Body Tolerance scores) were introduced in the original index.html run_log
// export.  Stable cross-run comparison aliases `epScore` and `btScore` were
// standardised in v1.4.1.  The legacy names are:
//
//   @deprecated since v1.4.5  — use `epScore` / `btScore` instead.
//   @removedIn   v1.5.0       — consumers still reading `EP` / `BT` from
//                               run_log.json or lastTurnRecord.pressure must
//                               migrate before the v1.5.0 release.
//
// Canonical location of the raw numeric values: lastTurnRecord.pressure
// (written by engine/turn-resolution.js → resolveTurnWithTrace).
// ─────────────────────────────────────────────────────────────────────────────
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
