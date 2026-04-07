import { classifyDataLoadError, DIAGNOSTIC_CATEGORY } from './runtime-diagnostics.js';

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
    data.forEach((item, i) => {
      assertConfigPath(filename, item, 'object', `$[${i}]`);
      assertConfigPath(filename, item?.id, 'string', `$[${i}].id`);
      assertConfigPath(filename, item?.characterId, 'string', `$[${i}].characterId`);
      assertConfigPath(filename, item?.category, 'string', `$[${i}].category`);
      assertConfigPath(filename, item?.trigger, 'object', `$[${i}].trigger`);
      assertConfigPath(filename, item?.effects, 'object', `$[${i}].effects`);
      assertConfigPath(filename, item?.limits, 'object', `$[${i}].limits`);
    });
    return;
  }

  if (filename === 'contextEvents') {
    assertConfigPath(filename, data, 'array', '$');
    data.forEach((item, i) => {
      assertConfigPath(filename, item, 'object', `$[${i}]`);
      assertConfigPath(filename, item?.id, 'string', `$[${i}].id`);
      assertConfigPath(filename, item?.label, 'string', `$[${i}].label`);
      assertConfigPath(filename, item?.category, 'string', `$[${i}].category`);
      assertConfigPath(filename, item?.trigger, 'object', `$[${i}].trigger`);
      assertConfigPath(filename, item?.effects, 'object', `$[${i}].effects`);
    });
    return;
  }

  if (filename === 'nodes') {
    assertConfigPath(filename, data, 'array', '$');
    data.forEach((item, i) => {
      assertConfigPath(filename, item, 'object', `$[${i}]`);
      assertConfigPath(filename, item?.nodeId, 'string', `$[${i}].nodeId`);
    });
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
    data.forEach((item, i) => {
      assertConfigPath(filename, item, 'object', `$[${i}]`);
      assertConfigPath(filename, item?.id, 'string', `$[${i}].id`);
      if (item?.nationalityCode != null) {
        assertConfigPath(filename, item.nationalityCode, 'string', `$[${i}].nationalityCode`);
        if (!/^[A-Z]{2}$/.test(item.nationalityCode)) {
          throw new Error(`${filename}:$[${i}].nationalityCode expected ISO-3166 alpha-2 uppercase code`);
        }
      }
    });
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

  const config = createDefaultDataConfig();
  for (const [key, path] of files) {
    try {
      const response = await fetchImpl(path, { cache: 'no-store' });
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
      if (REQUIRED_CONFIG_FILES.has(key)) {
        const category = classifyDataLoadError(error);
        onError?.({
          category,
          file: path,
          detail: error.message,
          message: `Blocking data ${category} in ${path}: ${error.message}`,
        });
        return null;
      }
    }
  }

  try {
    validateLoadedDataConfig(config);
  } catch (error) {
    onError?.({
      category: DIAGNOSTIC_CATEGORY.POST_LOAD_VALIDATION_FAILURE,
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
