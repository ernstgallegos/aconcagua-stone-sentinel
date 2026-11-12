import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..', '..');
export const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const readJson = (rel) => JSON.parse(readText(rel));

export function loadData() {
  return {
    nodes: readJson('data/nodes.json'),
    environmentalPressure: readJson('data/environmental_pressure_config.json'),
    actionModifiers: readJson('data/action_modifiers.json'),
    stageModifiers: readJson('data/stage_modifiers.json'),
    characters: readJson('data/characters.json'),
    characterEvents: readJson('data/character_events.json'),
    contextEvents: readJson('data/context_events.json'),
    outcomes: readJson('data/outcomes.json'),
    scenarios: readJson('data/scenarios.web-v1.json'),
  };
}
