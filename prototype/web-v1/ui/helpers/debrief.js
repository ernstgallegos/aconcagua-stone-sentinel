/**
 * @typedef {'body'|'weather'|'time'|'resources'|'cognition'} DominantRiskAxis
 */

export function computeDecisionPattern(turnLog = []) {
  const total = Math.max(1, turnLog.length);
  const aggressive = turnLog.filter((entry) => ['advance', 'advance_slowly'].includes(entry.decision)).length / total;
  const waits = turnLog.filter((entry) => entry.decision === 'wait').length / total;
  const descents = turnLog.filter((entry) => entry.decision === 'descend').length / total;

  if (descents >= 0.34) return 'Defensive pacing with descent priority.';
  if (aggressive >= 0.58) return 'Aggressive push pattern under constrained margin.';
  if (waits >= 0.33) return 'Conservative rhythm with observation-heavy turns.';
  return 'Mixed pacing with adaptive turn selection.';
}

export function computeDominantRiskAxis({ turnLog = [], finalOutcome = '', allFlags = [] } = {}) {
  const counts = { body: 0, weather: 0, time: 0, resources: 0, cognition: 0 };
  const bump = (axis, amount = 1) => { counts[axis] += amount; };

  turnLog.forEach((entry) => {
    const flags = entry.flags || [];
    if (flags.some((f) => f.includes('critical') || f.includes('collapse') || f.includes('fatality'))) bump('body', 2);
    if (flags.some((f) => ['weather-window-closed', 'white-wind-hit', 'weather-event-active'].includes(f))) bump('weather', 2);
    if (entry.decisionWindowExceeded || flags.includes('decision-window-exceeded')) bump('time', 1.5);
    if (flags.some((f) => f.includes('water') || f.includes('food') || f.includes('resource'))) bump('resources', 2);
    if (flags.some((f) => f.includes('late-signal') || f.includes('low-confidence') || f.includes('uncertain'))) bump('cognition', 1.5);
  });

  allFlags.forEach((flag) => {
    if (flag.includes('late-signal')) bump('cognition', 1);
    if (flag.includes('permit')) bump('time', 1);
  });

  if (finalOutcome.includes('Exposure')) bump('weather', 2);
  if (finalOutcome.includes('Fatigue') || finalOutcome === 'Fatality') bump('body', 2);
  if (finalOutcome === 'Resource Exhaustion') bump('resources', 2);
  if (finalOutcome.includes('Window') || finalOutcome.includes('Permit')) bump('time', 2);

  return /** @type {DominantRiskAxis} */ (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

export function buildRunSignature({ characterName, scenarioName, seed, turns, highestNode, finalOutcome, dominantRiskAxis }) {
  return [
    `Character: ${characterName || '—'}`,
    `Scenario: ${scenarioName || '—'}`,
    `Seed: ${seed ?? '—'}`,
    `Turns: ${turns ?? 0}`,
    `Highest node: ${highestNode || '—'}`,
    `Final outcome: ${finalOutcome || '—'}`,
    `Dominant risk axis: ${dominantRiskAxis || '—'}`,
  ].join('\n');
}
