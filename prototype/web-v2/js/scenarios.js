// Scenario management for web-v2.

import { mulberry32, rngInt } from './engine.js';

export async function loadScenarios() {
  const res = await fetch('../../data/scenarios.web-v1.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load scenarios.web-v1.json: HTTP ${res.status}`);
  const data = await res.json();
  return {
    predefinedScenarios: data.predefinedScenarios || [],
    randomScenario: data.randomScenario || {},
  };
}

export function getScenarioById(scenarios, id) {
  return scenarios.predefinedScenarios.find((s) => s.id === id) || null;
}

export function buildRandomScenario(randomConfig, rng) {
  const seedRange = randomConfig.seedRange || { min: 10000, max: 99999 };
  const maxTurnsRange = randomConfig.maxTurnsRange || { min: 46, max: 54 };
  const initialBase = randomConfig.initialBase || { position: 'horcones', altitude_band: 'approach' };
  const initialRanges = randomConfig.initialRanges || {};
  const terrainRange = initialRanges.terrain_load || { min: 0, max: 2 };
  const functionalCapacityRange = initialRanges.functional_capacity || { min: 74, max: 94 };

  const rseed = rng
    ? rngInt(rng, seedRange.min, seedRange.max)
    : Math.floor(Math.random() * (seedRange.max - seedRange.min + 1)) + seedRange.min;

  const localRng = mulberry32(rseed);
  const archetypes = randomConfig.archetypes || [];
  const arch = archetypes[rngInt(localRng, 0, archetypes.length - 1)];

  return {
    id: 'random-' + rseed,
    num: randomConfig.num || '06',
    name: arch.name,
    desc: `Expedition ${rseed} · ${arch.name}`,
    intro: `Expedition ${rseed}. ${arch.name}. Conditions are never neutral; they become legible through disciplined turns.`,
    max_turns: rngInt(localRng, maxTurnsRange.min, maxTurnsRange.max),
    seeds: [rseed],
    difficulty: arch.tweak.difficulty,
    initial: {
      position: initialBase.position,
      altitude_band: initialBase.altitude_band,
      weather_severity: arch.tweak.weather,
      visibility: arch.tweak.visibility,
      terrain_load: rngInt(localRng, terrainRange.min, terrainRange.max),
      functional_capacity: rngInt(localRng, functionalCapacityRange.min, functionalCapacityRange.max),
      fatigue: arch.tweak.fatigue,
      exposure: arch.tweak.exposure,
      water: arch.tweak.water,
      food: arch.tweak.food,
    },
    bias: arch.tweak.bias,
    _randomSeed: rseed,
    _archetype: arch.name,
    _acclimatizationBonus: arch.tweak._acclimatizationBonus || 0,
    _equinoxTrapTurn: arch.tweak._equinoxTrapTurn || null,
  };
}
