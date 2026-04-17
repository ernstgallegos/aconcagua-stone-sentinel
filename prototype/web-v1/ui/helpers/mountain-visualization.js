// ui/helpers/mountain-visualization.js
//
// Minimal SVG-based mountain profile visualization for the gameplay screen.
// Renders a stylized mountain silhouette with the Normal Route and a climber
// marker that moves between positions on each turn.
//
// Public API:
//   initMountainVisualization(container)  — build the SVG once
//   updateClimberPosition(positionIndex, totalPositions, options)  — animate marker

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Route waypoints as (x%, y%) on the SVG viewBox ──
// These approximate the Normal Route profile from Horcones (2950m) to Summit (6962m).
// x: horizontal progress 0–100, y: altitude (0 = top, 100 = bottom in SVG coords).
// 15 nodes matching data/nodes.json routeIndex 0–14.
const ROUTE_POINTS = [
  { x: 4,   y: 88 },   // 0  Horcones 2950m
  { x: 10,  y: 85 },   // 1  Horcones Lagoon 3050m
  { x: 18,  y: 78 },   // 2  Confluencia 3390m
  { x: 27,  y: 68 },   // 3  Cuesta Brava 4000m
  { x: 36,  y: 62 },   // 4  Plaza de Mulas 4350m
  { x: 44,  y: 55 },   // 5  Piedras Conway 4750m
  { x: 52,  y: 48 },   // 6  Camp Canadá 5050m
  { x: 59,  y: 42 },   // 7  Cambio Pendiente 5300m
  { x: 66,  y: 36 },   // 8  Nido de Cóndores 5560m
  { x: 73,  y: 29 },   // 9  Balcón Amarillo 5800m
  { x: 79,  y: 24 },   // 10 Cólera 5970m
  { x: 84,  y: 16 },   // 11 Portezuelo del Viento 6500m
  { x: 89,  y: 12 },   // 12 La Travesía 6630m
  { x: 93,  y: 9  },   // 13 La Canaleta 6700m
  { x: 97,  y: 5  },   // 14 Summit 6962m
];

// Mountain silhouette polygon (background shape).
// Drawn as a closed path that forms the mountain body.
const MOUNTAIN_SILHOUETTE = [
  'M 0 100',
  'L 0 92',
  'L 4 88',
  'L 12 84',
  'L 20 76',
  'L 30 66',
  'L 38 60',
  'L 48 52',
  'L 56 44',
  'L 62 38',
  'L 70 30',
  'L 76 24',
  'L 82 18',
  'L 88 12',
  'L 94 7',
  'L 97 5',
  'L 100 8',
  'L 100 100',
  'Z',
].join(' ');

// Secondary ridge (background depth)
const RIDGE_PATH = [
  'M 0 100',
  'L 0 95',
  'L 8 90',
  'L 25 80',
  'L 40 72',
  'L 55 60',
  'L 65 50',
  'L 75 40',
  'L 85 28',
  'L 95 18',
  'L 100 22',
  'L 100 100',
  'Z',
].join(' ');

// Snow cap area (summit zone)
const SNOW_PATH = [
  'M 82 18',
  'L 88 12',
  'L 94 7',
  'L 97 5',
  'L 100 8',
  'L 100 15',
  'L 95 10',
  'L 88 14',
  'Z',
].join(' ');

function buildRoutePath() {
  return ROUTE_POINTS.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/**
 * Build the mountain profile SVG inside the given container element.
 * Idempotent — will not re-create if already present.
 *
 * @param {HTMLElement} container
 * @returns {{ svg: SVGSVGElement, climber: SVGElement, trailHead: SVGElement } | null}
 */
export function initMountainVisualization(container) {
  if (!container) return null;
  const existing = container.querySelector('.mountain-viz-svg');
  if (existing) return null; // already initialized

  const svg = createSvgElement('svg', {
    class: 'mountain-viz-svg',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    role: 'img',
  });

  // ── Gradient definitions ──
  const defs = createSvgElement('defs');

  // Mountain body gradient
  const grad = createSvgElement('linearGradient', {
    id: 'mtn-grad',
    x1: '0', y1: '0', x2: '0', y2: '1',
  });
  const stop1 = createSvgElement('stop', { offset: '0%', 'stop-color': '#2e4560', 'stop-opacity': '0.6' });
  const stop2 = createSvgElement('stop', { offset: '100%', 'stop-color': '#101b2a', 'stop-opacity': '0.9' });
  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);

  // Ridge gradient
  const ridgeGrad = createSvgElement('linearGradient', {
    id: 'ridge-grad',
    x1: '0', y1: '0', x2: '0', y2: '1',
  });
  const rs1 = createSvgElement('stop', { offset: '0%', 'stop-color': '#1e3348', 'stop-opacity': '0.4' });
  const rs2 = createSvgElement('stop', { offset: '100%', 'stop-color': '#0a1420', 'stop-opacity': '0.7' });
  ridgeGrad.appendChild(rs1);
  ridgeGrad.appendChild(rs2);
  defs.appendChild(ridgeGrad);

  // Climber glow filter
  const filter = createSvgElement('filter', { id: 'climber-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const blur = createSvgElement('feGaussianBlur', { stdDeviation: '0.8', result: 'blur' });
  const merge = createSvgElement('feMerge');
  const mn1 = createSvgElement('feMergeNode', { in: 'blur' });
  const mn2 = createSvgElement('feMergeNode', { in: 'SourceGraphic' });
  merge.appendChild(mn1);
  merge.appendChild(mn2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);

  svg.appendChild(defs);

  // ── Background ridge ──
  const ridge = createSvgElement('path', {
    d: RIDGE_PATH,
    fill: 'url(#ridge-grad)',
    class: 'mtn-ridge',
  });
  svg.appendChild(ridge);

  // ── Mountain silhouette ──
  const mountain = createSvgElement('path', {
    d: MOUNTAIN_SILHOUETTE,
    fill: 'url(#mtn-grad)',
    class: 'mtn-body',
  });
  svg.appendChild(mountain);

  // ── Snow cap ──
  const snow = createSvgElement('path', {
    d: SNOW_PATH,
    fill: '#b0d0e6',
    opacity: '0.15',
    class: 'mtn-snow',
  });
  svg.appendChild(snow);

  // ── Altitude bands (horizontal dashed lines) ──
  const bands = [
    { y: 62, label: '4350m' },  // Base camp
    { y: 36, label: '5560m' },  // Nido
    { y: 5,  label: '6962m' },  // Summit
  ];
  bands.forEach(({ y }) => {
    const line = createSvgElement('line', {
      x1: '0', y1: String(y), x2: '100', y2: String(y),
      stroke: '#2e4560',
      'stroke-width': '0.15',
      'stroke-dasharray': '1 2',
      opacity: '0.4',
      class: 'mtn-band-line',
    });
    svg.appendChild(line);
  });

  // ── Route trail (already walked) ──
  const trailHead = createSvgElement('path', {
    d: buildRoutePath(),
    fill: 'none',
    stroke: '#b9ac9e',
    'stroke-width': '0.4',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity: '0.5',
    class: 'mtn-trail-walked',
  });
  svg.appendChild(trailHead);

  // ── Route trail (full, dim) ──
  const trailFull = createSvgElement('path', {
    d: buildRoutePath(),
    fill: 'none',
    stroke: '#2e4560',
    'stroke-width': '0.3',
    'stroke-dasharray': '0.5 1.5',
    'stroke-linecap': 'round',
    opacity: '0.35',
    class: 'mtn-trail-full',
  });
  svg.appendChild(trailFull);

  // ── Camp markers ──
  const campIndices = [2, 4, 6, 8, 10]; // Confluencia, Plaza de Mulas, Canadá, Nido, Cólera
  campIndices.forEach(idx => {
    const p = ROUTE_POINTS[idx];
    const camp = createSvgElement('rect', {
      x: String(p.x - 0.6),
      y: String(p.y - 0.6),
      width: '1.2',
      height: '1.2',
      fill: '#8da2b6',
      opacity: '0.45',
      rx: '0.2',
      class: 'mtn-camp',
    });
    svg.appendChild(camp);
  });

  // ── Summit marker ──
  const summitPt = ROUTE_POINTS[ROUTE_POINTS.length - 1];
  const summitMarker = createSvgElement('polygon', {
    points: `${summitPt.x},${summitPt.y - 2} ${summitPt.x - 1},${summitPt.y} ${summitPt.x + 1},${summitPt.y}`,
    fill: '#b0d0e6',
    opacity: '0.6',
    class: 'mtn-summit-marker',
  });
  svg.appendChild(summitMarker);

  // ── Climber dot ──
  const startPt = ROUTE_POINTS[0];
  const climber = createSvgElement('circle', {
    cx: String(startPt.x),
    cy: String(startPt.y),
    r: '1.4',
    fill: '#d4a874',
    filter: 'url(#climber-glow)',
    class: 'mtn-climber',
  });
  svg.appendChild(climber);

  // ── Climber pulsing ring ──
  const pulse = createSvgElement('circle', {
    cx: String(startPt.x),
    cy: String(startPt.y),
    r: '2.2',
    fill: 'none',
    stroke: '#d4a874',
    'stroke-width': '0.3',
    opacity: '0.4',
    class: 'mtn-climber-pulse',
  });
  svg.appendChild(pulse);

  container.insertBefore(svg, container.firstChild);
  return { svg, climber, trailHead };
}

/**
 * Update the climber position on the mountain profile.
 *
 * @param {number} positionIndex  — current route index (0–14)
 * @param {number} totalPositions — total route nodes (typically 15)
 * @param {object} [options]
 * @param {number} [options.highestIndex] — highest position reached
 */
export function updateClimberPosition(positionIndex, totalPositions, options = {}) {
  const svg = document.querySelector('.mountain-viz-svg');
  if (!svg) return;

  const idx = Math.max(0, Math.min(positionIndex, ROUTE_POINTS.length - 1));
  const pt = ROUTE_POINTS[idx];

  // Move climber dot
  const climber = svg.querySelector('.mtn-climber');
  if (climber) {
    climber.setAttribute('cx', String(pt.x));
    climber.setAttribute('cy', String(pt.y));
  }

  // Move pulse ring
  const pulse = svg.querySelector('.mtn-climber-pulse');
  if (pulse) {
    pulse.setAttribute('cx', String(pt.x));
    pulse.setAttribute('cy', String(pt.y));
  }

  // Update walked trail (clip to current position)
  const trailWalked = svg.querySelector('.mtn-trail-walked');
  if (trailWalked) {
    const highIdx = options.highestIndex != null
      ? Math.max(0, Math.min(options.highestIndex, ROUTE_POINTS.length - 1))
      : idx;
    const walkedPath = ROUTE_POINTS.slice(0, highIdx + 1)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    trailWalked.setAttribute('d', walkedPath);
  }
}
