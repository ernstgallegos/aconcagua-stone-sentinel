/**
 * Data Configuration Loader — loads all game data files at startup.
 * Validates shape and normalizes fields as per data contracts.
 */

const DATA_BASE_PATH = '../../data';

/**
 * Load all required game data.
 * @returns {Promise<object>} Loaded and validated game data
 */
export async function loadGameData() {
  const [characters, nodes, outcomes, scenariosRaw, actionModifiers, stageModifiers, epConfigRaw, contextEvents, characterEvents] = await Promise.all([
    loadJSON(`${DATA_BASE_PATH}/characters.json`),
    loadJSON(`${DATA_BASE_PATH}/nodes.json`),
    loadJSON(`${DATA_BASE_PATH}/outcomes.json`),
    loadJSON(`${DATA_BASE_PATH}/scenarios.web-v1.json`),
    loadJSON(`${DATA_BASE_PATH}/action_modifiers.json`),
    loadJSON(`${DATA_BASE_PATH}/stage_modifiers.json`),
    loadJSON(`${DATA_BASE_PATH}/environmental_pressure_config.json`),
    loadJSON(`${DATA_BASE_PATH}/context_events.json`),
    loadJSON(`${DATA_BASE_PATH}/character_events.json`)
  ]);

  // Normalize nodes: nodeId → id, stageHint → stage
  const normalizedNodes = normalizeNodes(nodes);

  // Normalize EP config: flatten simulation sub-object for engine access
  const epConfig = normalizeEpConfig(epConfigRaw);

  // Normalize scenarios
  const scenarios = scenariosRaw.predefinedScenarios || scenariosRaw;

  return {
    characters,
    nodes: normalizedNodes,
    outcomes,
    scenarios,
    actionModifiers, // Already keyed by action name
    stageModifiers,  // Already keyed by stage name
    epConfig,
    contextEvents,
    characterEvents
  };
}

/**
 * Normalize EP config: flatten simulation sub-object.
 */
function normalizeEpConfig(raw) {
  const sim = raw.simulation || {};
  return {
    altitudePressureByBand: raw.altitudePressureByBand,
    terrainLoadScale: raw.terrainLoadScale,
    weatherSeverityScale: raw.weatherSeverityScale,
    visibilityRiskScale: raw.visibilityRiskScale,
    timeOfDayRiskScale: raw.timeOfDayRiskScale,
    exposurePersistenceScale: raw.exposurePersistenceScale,
    resourceBurn: sim.resourceBurnPerHour || {},
    baseCosts: sim.baseCosts || { fatigue: 10, exposure: 8 },
    bivouac: sim.bivouacPenalty || { ep: 30, fatigue: 26, exposure: 28, persistenceTurns: 10 },
    timeWindows: sim.timeWindows || {}
  };
}

/**
 * Normalize nodes array.
 */
function normalizeNodes(nodes) {
  return nodes.map((node, index) => ({
    ...node,
    id: node.nodeId || node.id,
    stage: node.stageHint || node.stage || 'APPROACH',
    routeIndex: node.routeIndex ?? index
  }));
}

/**
 * Fetch and parse a JSON file.
 */
async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON in ${path}: ${e.message}`);
  }
}
