import { clamp } from './turn-resolution.js';

// Engine ownership: this module is the canonical event-effect layer.
// UI may trigger these helpers but cannot bypass their bounded effects.
const CHARACTER_EVENT_BOUNDS = Object.freeze({
  fatigueDelta: { min: -3, max: 3 },
  exposureDelta: { min: -3, max: 3 },
  confidenceDelta: { min: -5, max: 5 },
});

const CONTEXT_EVENT_BOUNDS = Object.freeze({
  weatherDelta: { min: -1, max: 1 },
  visibilityDelta: { min: -1, max: 1 },
  timePenalty: { min: 0, max: 30 },
});

const DEFAULT_CONTEXT_EVENT_ARCHETYPES = [
  { id: 'calm-opening', category: 'context', icon: '◌', label: 'Calm opening', trigger: { turns: [1, 2, 3] }, effects: { weatherDelta: -1, visibilityDelta: 0, timePenalty: 0 }, telemetryTag: 'ctx-calm-opening', visibleToPlayer: true, hiddenFromPlayer: false, limits: { maxPerRun: 1 } },
  { id: 'rising-wind', category: 'context', icon: '↟', label: 'Rising wind', trigger: { turns: [6, 7, 8] }, effects: { weatherDelta: 1, visibilityDelta: -1, timePenalty: 0 }, telemetryTag: 'ctx-rising-wind', visibleToPlayer: true, hiddenFromPlayer: false, limits: { maxPerRun: 1 } },
  { id: 'visibility-drop', category: 'context', icon: '◔', label: 'Visibility drop', trigger: { turns: [10, 11] }, effects: { weatherDelta: 0, visibilityDelta: -1, timePenalty: 0 }, telemetryTag: 'ctx-visibility-drop', visibleToPlayer: true, hiddenFromPlayer: false, limits: { maxPerRun: 1 } },
  { id: 'temporary-clearing', category: 'context', icon: '◍', label: 'Temporary clearing', trigger: { turns: [12, 13] }, effects: { weatherDelta: -1, visibilityDelta: 1, timePenalty: 0 }, telemetryTag: 'ctx-temporary-clearing', visibleToPlayer: true, hiddenFromPlayer: false, limits: { maxPerRun: 1 } },
  { id: 'summit-window-tightening', category: 'context', icon: '⌛', label: 'Summit window tightening', trigger: { turns: [14, 15], stages: ['SUMMIT_DAY'] }, effects: { weatherDelta: 1, visibilityDelta: 0, timePenalty: 20 }, telemetryTag: 'ctx-summit-window-tightening', visibleToPlayer: true, hiddenFromPlayer: false, limits: { maxPerRun: 1 } },
];

function clampBounded(value, bounds) {
  return clamp(Number(value || 0), bounds.min, bounds.max);
}

function sanitizeCharacterEffects(effects = {}) {
  return {
    fatigueDelta: clampBounded(effects.fatigueDelta, CHARACTER_EVENT_BOUNDS.fatigueDelta),
    exposureDelta: clampBounded(effects.exposureDelta, CHARACTER_EVENT_BOUNDS.exposureDelta),
    confidenceDelta: clampBounded(effects.confidenceDelta, CHARACTER_EVENT_BOUNDS.confidenceDelta),
  };
}

function sanitizeContextEffects(effects = {}, fallback = {}) {
  return {
    weatherDelta: clampBounded(effects.weatherDelta ?? fallback.weatherDelta, CONTEXT_EVENT_BOUNDS.weatherDelta),
    visibilityDelta: clampBounded(effects.visibilityDelta ?? fallback.visibilityDelta, CONTEXT_EVENT_BOUNDS.visibilityDelta),
    timePenalty: clampBounded(effects.timePenalty ?? fallback.timePenalty, CONTEXT_EVENT_BOUNDS.timePenalty),
  };
}

function normalizeContextArchetype(event) {
  const trigger = event?.trigger || {};
  const normalizedEffects = sanitizeContextEffects(event?.effects || {}, event || {});
  return {
    id: event.id,
    category: event.category || 'context',
    icon: event.icon || '◌',
    label: event.label || event.id,
    trigger: {
      turns: Array.isArray(trigger.turns) ? trigger.turns : Array.isArray(event.turns) ? event.turns : [],
      stages: Array.isArray(trigger.stages) ? trigger.stages : [],
    },
    effects: normalizedEffects,
    telemetryTag: event.telemetryTag,
    visibleToPlayer: event.visibleToPlayer ?? true,
    hiddenFromPlayer: event.hiddenFromPlayer ?? false,
    limits: event.limits || { maxPerRun: 1 },
    narrative: event.narrative || '',
    notes: event.notes || '',
  };
}

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

export function buildEnvironmentEventPlan(seed, maxTurns = 40, contextEvents = DEFAULT_CONTEXT_EVENT_ARCHETYPES) {
  const offset = Number(seed || 0) % 3;
  const archetypes = Array.isArray(contextEvents) && contextEvents.length ? contextEvents : DEFAULT_CONTEXT_EVENT_ARCHETYPES;
  return archetypes
    .map(normalizeContextArchetype)
    .map((event) => ({
      ...event,
      turns: event.trigger.turns.map((turn) => clamp(turn + offset, 1, maxTurns)),
    }))
    .filter((event) => event.turns.some((turn) => turn <= maxTurns));
}

export function applyContextEvent({ turn, action, stage, state, environmentEventPlan = [] }) {
  const active = environmentEventPlan.find((event) => event.turns.includes(turn));
  if (!active || action === 'sleep') return null;
  if (active.trigger?.stages?.length && !active.trigger.stages.includes(stage)) return null;

  const effect = sanitizeContextEffects(active.effects || {}, active);
  state.weather_severity = clamp(state.weather_severity + effect.weatherDelta, 0, 4);
  state.visibility = clamp(state.visibility + effect.visibilityDelta, 0, 3);
  const appliedTimePenalty = effect.timePenalty && stage === 'SUMMIT_DAY' ? effect.timePenalty : 0;

  return {
    ...active,
    weatherDelta: effect.weatherDelta,
    visibilityDelta: effect.visibilityDelta,
    timePenalty: appliedTimePenalty,
  };
}

export function eventMatchesTrigger(event, { G, state, action, stage }) {
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

export function applyCharacterEvent({ G, state, action, stage, flags, characterEvents = [] }) {
  const characterId = G.character?.id;
  if (!characterId) return null;

  const available = characterEvents.filter((event) => event.characterId === characterId);
  if (!available.length) return null;

  const eventState = { ...(G.characterEventState || {}) };
  for (const event of available) {
    const snapshot = eventState[event.id] || { uses: 0, lastTurn: -999 };
    const limits = event.limits || { cooldownTurns: 0, maxPerRun: 1 };
    const maxPerRun = Math.max(1, Number(limits.maxPerRun ?? 1));
    const cooldownTurns = Math.max(0, Number(limits.cooldownTurns ?? 0));

    if (snapshot.uses >= maxPerRun) continue;
    if (G.turn - snapshot.lastTurn < cooldownTurns) continue;
    if (!eventMatchesTrigger(event, { G, state, action, stage })) continue;

    const effects = sanitizeCharacterEffects(event.effects || {});
    state.fatigue = clamp(state.fatigue + effects.fatigueDelta, 0, 100);
    state.exposure = clamp(state.exposure + effects.exposureDelta, 0, 100);
    if (effects.confidenceDelta) {
      G.characterConfidenceDrift = clamp((G.characterConfidenceDrift || 0) + effects.confidenceDelta, -12, 12);
    }

    if (event.telemetryTag) flags.push(event.telemetryTag);
    eventState[event.id] = { uses: snapshot.uses + 1, lastTurn: G.turn };

    return {
      ...event,
      eventState,
      effects,
    };
  }

  return null;
}
