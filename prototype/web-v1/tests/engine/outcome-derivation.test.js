import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTerminalOutcome } from '../../engine/turn-rules.js';

const POSITIONS = ['horcones', 'camp_colera', 'summit'];

function base(overrides = {}) {
  return {
    outcome: 'Strategic Retreat',
    state: { position: 'camp_colera' },
    G: { hasSummited: false, highestPosIdx: 1, permitDay: 1, permitMaxDays: 20, minutesOfDay: 600 },
    POSITIONS,
    stage: 'HIGH_CAMP',
    timeWindows: { summitLateStart: 960 },
    action: 'advance',
    previousPosition: 'camp_colera',
    exitedPark: false,
    ...overrides,
  };
}

test('derives Summit and Safe Return on explicit park exit after summit', () => {
  const result = deriveTerminalOutcome(base({ action: 'descend', previousPosition: 'horcones', G: { hasSummited: true, highestPosIdx: 2, permitDay: 2, permitMaxDays: 20, minutesOfDay: 700 } }));
  assert.equal(result, 'Summit and Safe Return');
});

test('derives High Point Return on explicit park exit without summit', () => {
  const result = deriveTerminalOutcome(base({ action: 'descend', previousPosition: 'horcones', G: { hasSummited: false, highestPosIdx: 1, permitDay: 2, permitMaxDays: 20, minutesOfDay: 700 } }));
  assert.equal(result, 'High Point Return');
});

test('keeps Strategic Retreat on low high-point park exit', () => {
  const result = deriveTerminalOutcome(base({ action: 'descend', previousPosition: 'horcones', G: { hasSummited: false, highestPosIdx: 0, permitDay: 2, permitMaxDays: 20, minutesOfDay: 700 } }));
  assert.equal(result, 'Strategic Retreat');
});

test('derives Permit Expired before non-terminal retreat', () => {
  const result = deriveTerminalOutcome(base({ G: { hasSummited: false, highestPosIdx: 1, permitDay: 21, permitMaxDays: 20, minutesOfDay: 700 } }));
  assert.equal(result, 'Permit Expired');
});

test('derives Expedition Window Closed when summit clock exceeded and not descending', () => {
  const result = deriveTerminalOutcome(base({ stage: 'SUMMIT_DAY', action: 'advance', G: { hasSummited: false, highestPosIdx: 1, permitDay: 3, permitMaxDays: 20, minutesOfDay: 1000 } }));
  assert.equal(result, 'Expedition Window Closed');
});
