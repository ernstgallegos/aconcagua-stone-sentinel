import {
  applyClockDelta,
  buildEnvironmentEventPlan,
  applyContextEvent,
  eventMatchesTrigger,
  applyCharacterEvent,
} from '../../engine/events-core.js';

// UI ownership note: this file intentionally stays as thin wiring.
// Canonical event mutation/bounds live in engine/events-core.js.
export { applyClockDelta, buildEnvironmentEventPlan, eventMatchesTrigger };

export function applyTurnEvents({ G, state, action, stage }) {
  return applyContextEvent({
    turn: G.turn,
    action,
    stage,
    state,
    environmentEventPlan: Array.isArray(G.environmentEventPlan) ? G.environmentEventPlan : [],
  });
}

export function maybeApplyCharacterEvent({ G, state, action, stage, flags, characterEvents = [] }) {
  return applyCharacterEvent({ G, state, action, stage, flags, characterEvents });
}
