import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState, recordTelemetry } from '../../state/game-state.js';

test('recordTelemetry accepts lastTurnRecord in telemetry schema', () => {
  const G = createInitialGameState();

  const payload = {
    turn: 4,
    action: 'advance',
    outcome: 'Strategic Retreat',
    environment: { altitudeBand: 2, terrainLoad: 3, weatherSeverity: 2, visibility: 2, persistenceTier: 'fresh' },
    pressure: { EP: 51.3, BT: 39.8, delta: 11.5, effectiveDelta: 11.5 },
    perceivedSignals: { trend: 'worsening', confidence: 66, uncertainty: 12, readability: 'partial reading' },
  };

  assert.doesNotThrow(() => {
    recordTelemetry(G, { lastTurnRecord: payload });
  });

  assert.deepEqual(G.telemetryState.lastTurnRecord, payload);
  assert.deepEqual(G.lastTurnRecord, payload);
});
