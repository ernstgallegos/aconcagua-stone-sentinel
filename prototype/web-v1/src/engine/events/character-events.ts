import type { CharacterEvent, GameState, GlobalRunState, Action, Stage } from '../../types/domain.js';

export interface CharacterEventApplyResult {
  event: CharacterEvent;
  state: GameState;
  confidenceDelta: number;
}

export function resolveCharacterEvent(
  global: GlobalRunState,
  state: GameState,
  action: Action,
  stage: Stage,
  events: CharacterEvent[]
): CharacterEventApplyResult | null {
  const charId = global.character?.id;
  if (!charId) return null;
  const pool = events.filter((event) => event.characterId === charId);
  const track = global.characterEventState ?? {};

  for (const event of pool) {
    const snapshot = track[event.id] ?? { uses: 0, lastTurn: -999 };
    if (snapshot.uses >= event.limits.maxPerRun) continue;
    if (global.turn - snapshot.lastTurn < event.limits.cooldownTurns) continue;
    if (event.trigger.actions && !event.trigger.actions.includes(action)) continue;
    if (event.trigger.stages && !event.trigger.stages.includes(stage)) continue;
    if (event.trigger.minTurn && global.turn < event.trigger.minTurn) continue;

    return { event, state, confidenceDelta: event.effects.confidenceDelta ?? 0 };
  }

  return null;
}
