const DEFAULT_CONFIG = Object.freeze({
  nodes: [],
  environmentalPressure: {},
  actionModifiers: {},
  stageModifiers: {},
  characters: [],
  characterEvents: [],
  contextEvents: [],
  outcomes: [],
  scenariosWebV1: { predefinedScenarios: [], randomScenario: {} },
});

const REQUIRED_CONFIG_FILES = new Set(['nodes', 'environmentalPressure', 'actionModifiers', 'stageModifiers', 'characters', 'characterEvents', 'contextEvents', 'outcomes', 'scenariosWebV1']);
const FILE_PATH_BY_KEY = Object.freeze({
  nodes: '../../data/nodes.json',
  environmentalPressure: '../../data/environmental_pressure_config.json',
  actionModifiers: '../../data/action_modifiers.json',
  stageModifiers: '../../data/stage_modifiers.json',
  characters: '../../data/characters.json',
  characterEvents: '../../data/character_events.json',
  contextEvents: '../../data/context_events.json',
  outcomes: '../../data/outcomes.json',
  scenariosWebV1: '../../data/scenarios.web-v1.json',
});

function typeOfValue(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function assertConfigPath(filename, value, expectedType, path) {
  const actualType = typeOfValue(value);
  if (actualType !== expectedType) {
    throw new Error(`${filename}:${path} expected ${expectedType} but got ${actualType}`);
  }
}

export function validateDataConfigShape(filename, data) {
  if (filename === 'characterEvents') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.id, 'string', '$[0].id');
    assertConfigPath(filename, data[0]?.characterId, 'string', '$[0].characterId');
    assertConfigPath(filename, data[0]?.category, 'string', '$[0].category');
    assertConfigPath(filename, data[0]?.trigger, 'object', '$[0].trigger');
    assertConfigPath(filename, data[0]?.effects, 'object', '$[0].effects');
    assertConfigPath(filename, data[0]?.limits, 'object', '$[0].limits');
    return;
  }


  if (filename === 'contextEvents') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.id, 'string', '$[0].id');
    assertConfigPath(filename, data[0]?.label, 'string', '$[0].label');
    assertConfigPath(filename, data[0]?.category, 'string', '$[0].category');
    assertConfigPath(filename, data[0]?.trigger, 'object', '$[0].trigger');
    assertConfigPath(filename, data[0]?.effects, 'object', '$[0].effects');
    return;
  }

  if (filename === 'nodes') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.nodeId, 'string', '$[0].nodeId');
    return;
  }
  if (filename === 'actionModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.advance, 'object', '$.advance');
    return;
  }
  if (filename === 'stageModifiers') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.APPROACH, 'object', '$.APPROACH');
    return;
  }
  if (filename === 'characters') {
    assertConfigPath(filename, data, 'array', '$');
    assertConfigPath(filename, data[0], 'object', '$[0]');
    assertConfigPath(filename, data[0]?.id, 'string', '$[0].id');
    return;
  }
  if (filename === 'outcomes') {
    assertConfigPath(filename, data, 'array', '$');
    return;
  }
  if (filename === 'environmentalPressure') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.simulation, 'object', '$.simulation');
    return;
  }
  if (filename === 'scenariosWebV1') {
    assertConfigPath(filename, data, 'object', '$');
    assertConfigPath(filename, data.predefinedScenarios, 'array', '$.predefinedScenarios');
    assertConfigPath(filename, data.randomScenario, 'object', '$.randomScenario');
  }
}

export function validateLoadedDataConfig(config) {
  const predefined = config.scenariosWebV1?.predefinedScenarios || [];
  if (!predefined.length) throw new Error('scenariosWebV1.predefinedScenarios must include at least one scenario');
  const events = config.characterEvents || [];
  if (!events.length) throw new Error('characterEvents must include at least one event');
  const contextEvents = config.contextEvents || [];
  if (!contextEvents.length) throw new Error('contextEvents must include at least one event');
}

export function createDefaultDataConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export async function loadDataConfigFiles({ fetchImpl = fetch, onError }) {
  const files = Object.entries(FILE_PATH_BY_KEY);
  const LOAD_TIMEOUT_MS = 10000;

  const config = createDefaultDataConfig();
  for (const [key, path] of files) {
    let timeoutId = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      timeoutId = setTimeout(() => controller?.abort(), LOAD_TIMEOUT_MS);
      const response = await fetchImpl(path, { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const kind = response.status === 404 ? 'missing file' : 'http failure';
        throw new Error(`[${kind}] ${path} (status ${response.status})`);
      }
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`[invalid JSON] ${path} (${parseError.message})`);
      }
      validateDataConfigShape(key, data);
      config[key] = data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        onError?.({
          category: 'timeout',
          file: path,
          detail: `Timed out after ${LOAD_TIMEOUT_MS}ms while fetching ${path}`,
          message: `Blocking timeout while loading ${path}`,
        });
        return null;
      }
      if (REQUIRED_CONFIG_FILES.has(key)) {
        const missingFile = /^\[missing file\]/i.test(error.message);
        const httpFailure = /^\[http failure\]/i.test(error.message);
        const invalidJson = /^\[invalid JSON\]/i.test(error.message);
        const shapeFailure = !invalidJson && /\$|expected/i.test(error.message);
        const category = missingFile
          ? 'missing file'
          : httpFailure
            ? 'http failure'
            : shapeFailure
              ? 'invalid shape'
              : invalidJson
                ? 'invalid json'
                : 'load failure';
        onError?.({
          category,
          file: path,
          detail: error.message,
          message: `Blocking data ${category} in ${path}: ${error.message}`,
        });
        return null;
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  try {
    validateLoadedDataConfig(config);
  } catch (error) {
    onError?.({
      category: 'post-load validation failure',
      file: 'runtime model contract',
      detail: error.message,
      message: `Blocking data contract validation failure: ${error.message}`,
    });
    return null;
  }
  return config;
}

export function normalizeRouteData(config) {
  const routeNodes = (config.nodes || []).map((node, idx) => ({
    id: node.nodeId || `node_${idx}`,
    name: node.nodeName,
    altitudeMeters: node.altitudeMeters || null,
    altitudeBand: node.altitudeBand,
    terrainLoad: node.terrainLoad,
    weatherBias: node.weatherBias,
    visibilityBias: node.visibilityBias,
    timeSensitivity: node.timeSensitivity,
    isCamp: !!node.isCamp,
    stage: node.stageHint || (idx <= 4 ? 'APPROACH' : idx <= 10 ? 'HIGH_CAMP' : 'SUMMIT_DAY'),
    routeIndex: node.routeIndex ?? idx,
  })).sort((a, b) => a.routeIndex - b.routeIndex);

  return {
    routeNodes,
    positions: routeNodes.map((n) => n.id),
    labels: routeNodes.reduce((acc, n) => { acc[n.id] = n.name; return acc; }, {}),
    altitudes: routeNodes.reduce((acc, n) => { acc[n.id] = n.altitudeMeters ? `${n.altitudeMeters.toLocaleString('en-US')} m` : '—'; return acc; }, {}),
    bands: routeNodes.reduce((acc, n) => { acc[n.id] = `band_${n.altitudeBand}`; return acc; }, {}),
    campPositions: new Set(routeNodes.filter((n) => n.isCamp).map((n) => n.id)),
    stageByPosition: routeNodes.reduce((acc, n) => { acc[n.id] = n.stage; return acc; }, {}),
  };
}
