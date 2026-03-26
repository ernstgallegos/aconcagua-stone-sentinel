import { assertDataConfig, type DataConfig } from '../types/data-contracts.js';

const FILES: Array<[keyof DataConfig, string]> = [
  ['nodes', '../../data/nodes.json'],
  ['environmentalPressure', '../../data/environmental_pressure_config.json'],
  ['actionModifiers', '../../data/action_modifiers.json'],
  ['stageModifiers', '../../data/stage_modifiers.json'],
  ['characters', '../../data/characters.json'],
  ['characterEvents', '../../data/character_events.json'],
  ['outcomes', '../../data/outcomes.json'],
  ['scenariosWebV1', '../../data/scenarios.web-v1.json'],
];

export async function loadDataConfig(fetchImpl: typeof fetch): Promise<DataConfig> {
  const partial: Partial<DataConfig> = {};
  for (const [key, path] of FILES) {
    const response = await fetchImpl(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    partial[key] = await response.json();
  }
  assertDataConfig(partial);
  return partial;
}
