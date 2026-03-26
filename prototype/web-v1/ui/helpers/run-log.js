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
