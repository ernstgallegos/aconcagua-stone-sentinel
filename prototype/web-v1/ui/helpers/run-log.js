// Telemetry ownership: turn-review shape + export contract live here.
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
