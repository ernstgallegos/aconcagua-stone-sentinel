import { clamp } from '../../engine/turn-resolution.js';

const EVENT_ARCHETYPES = [
  { id: 'calm-opening', icon: '◌', label: 'Calm opening', turns: [1, 2, 3], weatherDelta: -1, visibilityDelta: 0 },
  { id: 'rising-wind', icon: '↟', label: 'Rising wind', turns: [6, 7, 8], weatherDelta: 1, visibilityDelta: -1 },
  { id: 'visibility-drop', icon: '◔', label: 'Visibility drop', turns: [10, 11], weatherDelta: 0, visibilityDelta: -1 },
  { id: 'temporary-clearing', icon: '◍', label: 'Temporary clearing', turns: [12, 13], weatherDelta: -1, visibilityDelta: 1 },
  { id: 'summit-window-tightening', icon: '⌛', label: 'Summit window tightening', turns: [14, 15], weatherDelta: 1, visibilityDelta: 0, timePenalty: 20 },
];

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

  if (active.timePenalty && stage === 'SUMMIT_DAY') {
    G.minutesOfDay += active.timePenalty;
  }

  return {
    id: active.id,
    icon: active.icon,
    label: active.label,
    weatherDelta: active.weatherDelta,
    visibilityDelta: active.visibilityDelta,
    timePenalty: active.timePenalty || 0,
  };
}

export function maybeApplyCharacterEvent({ G, state, action, stage, flags }) {
  const id = G.character?.id;
  if (!id) return null;
  const seen = new Set(G.characterEventHistory || []);
  if (seen.has(id)) return null;

  const trigger = {
    francisco: stage !== 'APPROACH' && action === 'advance' && G.persistenceTurns >= 3,
    laura: action === 'wait' && G.minutesOfDay >= 900,
    irina: action === 'advance' && state.weather_severity >= 2,
    erik: action === 'advance_slowly' && stage === 'SUMMIT_DAY',
    daniela: action === 'shoot_photo' && state.functional_capacity <= 55,
    blake: action === 'advance' && (state.water <= 4 || state.food <= 4),
  };

  if (!trigger[id]) return null;

  const effects = {
    francisco: { narrative: 'Persistence keeps the line moving, but you choose to preserve one margin now.', fatigueDelta: -2, flag: 'char-francisco-limit-read' },
    laura: { narrative: 'Disciplined caution buys clarity; your next move should honor the shrinking clock.', confidenceBoost: 4, flag: 'char-laura-clock-discipline' },
    irina: { narrative: 'Strength is intact, but readings feel noisier than expected in this wind cycle.', confidenceBoost: -5, flag: 'char-irina-noisy-read' },
    erik: { narrative: 'Competence checks ego: one measured step preserves the return corridor.', fatigueDelta: -1, flag: 'char-erik-ego-check' },
    daniela: { narrative: 'Environmental reading is sharp, but body strain requests a narrower tactical line.', confidenceBoost: 4, exposureDelta: 1, flag: 'char-daniela-tradeoff' },
    blake: { narrative: 'Determination is real; preparation debt is now visible and must be managed.', fatigueDelta: 2, flag: 'char-blake-prep-gap' },
  };

  const fx = effects[id];
  if (!fx) return null;
  state.fatigue = clamp(state.fatigue + (fx.fatigueDelta || 0), 0, 100);
  state.exposure = clamp(state.exposure + (fx.exposureDelta || 0), 0, 100);
  if (fx.confidenceBoost) {
    G.characterConfidenceDrift = clamp((G.characterConfidenceDrift || 0) + fx.confidenceBoost, -12, 12);
  }

  if (fx.flag) flags.push(fx.flag);
  return { characterId: id, ...fx };
}
