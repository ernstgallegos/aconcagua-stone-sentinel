import { clamp } from '../../engine/turn-resolution.js';

const EVENT_ARCHETYPES = [
  { id: 'calm-opening', icon: '◌', label: 'Calm opening', turns: [1, 2, 3], weatherDelta: -1, visibilityDelta: 0 },
  { id: 'rising-wind', icon: '↟', label: 'Rising wind', turns: [6, 7, 8], weatherDelta: 1, visibilityDelta: -1 },
  { id: 'visibility-drop', icon: '◔', label: 'Visibility drop', turns: [10, 11], weatherDelta: 0, visibilityDelta: -1 },
  { id: 'temporary-clearing', icon: '◍', label: 'Temporary clearing', turns: [12, 13], weatherDelta: -1, visibilityDelta: 1 },
  { id: 'summit-window-tightening', icon: '⌛', label: 'Summit window tightening', turns: [14, 15], weatherDelta: 1, visibilityDelta: 0, timePenalty: 20 },
];

export function applyClockDelta({ minutesOfDay, day, deltaMinutes }) {
  let nextMinutes = minutesOfDay + deltaMinutes;
  let nextDay = day;

  while (nextMinutes >= 1440) {
    nextMinutes -= 1440;
    nextDay += 1;
  }
  while (nextMinutes < 0) {
    nextMinutes += 1440;
    nextDay = Math.max(1, nextDay - 1);
  }

  return { minutesOfDay: nextMinutes, day: nextDay, permitDay: nextDay };
}

export function buildEnvironmentEventPlan(seed, maxTurns = 40) {
  const offset = Number(seed || 0) % 3;
  return EVENT_ARCHETYPES
    .map((event) => ({ ...event, turns: event.turns.map((turn) => clamp(turn + offset, 1, maxTurns)) }))
    .filter((event) => event.turns.some((turn) => turn <= maxTurns));
}

export function applyTurnEvents({ G, state, action, stage }) {
  const plan = Array.isArray(G.environmentEventPlan) ? G.environmentEventPlan : [];
  const active = plan.find((event) => event.turns.includes(G.turn));
  if (!active || action === 'sleep') return null;

  state.weather_severity = clamp(state.weather_severity + active.weatherDelta, 0, 4);
  state.visibility = clamp(state.visibility + active.visibilityDelta, 0, 3);

  const appliedTimePenalty = active.timePenalty && stage === 'SUMMIT_DAY' ? active.timePenalty : 0;

  return {
    id: active.id,
    icon: active.icon,
    label: active.label,
    weatherDelta: active.weatherDelta,
    visibilityDelta: active.visibilityDelta,
    timePenalty: appliedTimePenalty,
  };
}

function eventMatchesTrigger(event, { G, state, action, stage }) {
  const trigger = event.trigger || {};
  if (Array.isArray(trigger.actions) && !trigger.actions.includes(action)) return false;
  if (Array.isArray(trigger.stages) && !trigger.stages.includes(stage)) return false;
  if (trigger.minTurn != null && G.turn < trigger.minTurn) return false;
  if (trigger.minPersistenceTurns != null && G.persistenceTurns < trigger.minPersistenceTurns) return false;
  if (trigger.minWeatherSeverity != null && state.weather_severity < trigger.minWeatherSeverity) return false;
  if (trigger.minFunctionalCapacity != null && state.functional_capacity < trigger.minFunctionalCapacity) return false;
  if (trigger.maxFunctionalCapacity != null && state.functional_capacity > trigger.maxFunctionalCapacity) return false;
  if (trigger.maxWater != null && state.water > trigger.maxWater) return false;
  if (trigger.maxFood != null && state.food > trigger.maxFood) return false;
  return true;
}

export function maybeApplyCharacterEvent({ G, state, action, stage, flags, characterEvents = [] }) {
  const characterId = G.character?.id;
  if (!characterId) return null;
  const available = characterEvents.filter((event) => event.characterId === characterId);
  if (!available.length) return null;

  const eventState = { ...(G.characterEventState || {}) };

  for (const event of available) {
    const snapshot = eventState[event.id] || { uses: 0, lastTurn: -999 };
    const limits = event.limits || { cooldownTurns: 0, maxPerRun: 1 };
    if (snapshot.uses >= (limits.maxPerRun ?? 1)) continue;
    if (G.turn - snapshot.lastTurn < (limits.cooldownTurns ?? 0)) continue;
    if (!eventMatchesTrigger(event, { G, state, action, stage })) continue;

    const effects = event.effects || {};
    state.fatigue = clamp(state.fatigue + (effects.fatigueDelta || 0), 0, 100);
    state.exposure = clamp(state.exposure + (effects.exposureDelta || 0), 0, 100);
    if (effects.confidenceDelta) {
      G.characterConfidenceDrift = clamp((G.characterConfidenceDrift || 0) + effects.confidenceDelta, -12, 12);
    }

    if (event.telemetryTag) flags.push(event.telemetryTag);
    eventState[event.id] = { uses: snapshot.uses + 1, lastTurn: G.turn };

    return {
      id: event.id,
      characterId,
      category: event.category,
      narrative: event.narrative,
      telemetryTag: event.telemetryTag,
      effects,
      eventState,
    };
  }

  return null;
}
