import { normalizeRouteData } from './data-config.js';

export let ROUTE_NODES = [];
export let POSITIONS = [];
export let POS_LABELS = {};
export let POS_ALT = {};
export let POS_BAND = {};
export let CAMP_POSITIONS = new Set();
export let STAGE_BY_POSITION = {};
export let CANONICAL_OUTCOMES = new Set();

export function rebuildRouteData(dataConfig) {
  const normalized = normalizeRouteData(dataConfig);
  ROUTE_NODES = normalized.routeNodes;
  POSITIONS.length = 0;
  POSITIONS.push(...normalized.positions);
  POS_LABELS = normalized.labels;
  POS_ALT = normalized.altitudes;
  POS_BAND = normalized.bands;
  CAMP_POSITIONS = normalized.campPositions;
  STAGE_BY_POSITION = normalized.stageByPosition;
  CANONICAL_OUTCOMES.clear();
  (dataConfig.outcomes || []).forEach((o) => CANONICAL_OUTCOMES.add(o));
}

export function getCurrentStage(position, stageByPos) {
  return (stageByPos || STAGE_BY_POSITION)[position] || 'APPROACH';
}

export function isCampPosition(position, campPos) {
  return (campPos || CAMP_POSITIONS).has(position);
}

export function getCurrentNode(state) {
  return ROUTE_NODES.find((n) => n.id === state.position) || ROUTE_NODES[0];
}
