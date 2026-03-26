import { createTurnEngine, RESOLVE_TURN_PIPELINE } from '../../engine/turn-resolution.js';

export function createDeterministicTurnHarness({ deps, initialState }) {
  const engine = createTurnEngine(deps);
  const state = structuredClone(initialState);

  function run(action) {
    const result = engine.resolveTurnWithTrace(state, action);
    return {
      state: structuredClone(state),
      result,
      expectedPipeline: [...RESOLVE_TURN_PIPELINE],
    };
  }

  return { run, state, expectedPipeline: [...RESOLVE_TURN_PIPELINE] };
}
