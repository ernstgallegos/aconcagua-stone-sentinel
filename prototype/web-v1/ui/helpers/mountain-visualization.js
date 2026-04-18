// ui/helpers/mountain-visualization.js
//
// Canvas2D high-fidelity pseudo-3D mountain visualization for the gameplay screen.
// Renders a perspective terrain view with multi-layer ridgelines, atmospheric
// depth (volumetric fog layers, cloud bands), directional sun lighting with
// specular snow highlights, an animated climber figure with altitude-aware
// movement and equipment, camp markers with warm glow, and enriched sky
// (cloud layers, star field with Milky Way, moon, sun corona).
//
// The route waypoints are derived from normalizeRouteData() runtime data —
// the visualization always matches the live route state regardless of node count.
//
// Zero external dependencies — pure Canvas2D.
//
// Public API (same contract as previous version):
//   initMountainVisualization(container, runtimeNodes, options) — build canvas, start render loop
//   updateClimberPosition(positionIndex, options)               — move climber + camera
//   destroyMountainVisualization()                              — stop loop, clean up

// ═══════════════════════════════════════════════════════════════
// ROUTE DATA — derived at init from runtime route nodes
// ═══════════════════════════════════════════════════════════════

const LATERAL_PROFILE = [
  { t: 0.00, x:   0 },
  { t: 0.05, x:  25 },
  { t: 0.20, x:  65 },
  { t: 0.35, x:  40 },
  { t: 0.50, x:  10 },
  { t: 0.59, x: -15 },
  { t: 0.65, x: -25 },
  { t: 0.70, x: -10 },
  { t: 0.75, x:   5 },
  { t: 0.79, x:  15 },
  { t: 0.82, x:   5 },
  { t: 0.87, x: -15 },
  { t: 0.91, x: -45 },
  { t: 0.95, x: -25 },
  { t: 1.00, x:   0 },
];

const Z_TOTAL = 1500;
const Z_APPROACH_SPLIT = 750;
const ALT_APPROACH_SPLIT = 4350;

function altToZ(altMeters, altMin, altMax) {
  if (altMeters <= ALT_APPROACH_SPLIT) {
    const span = ALT_APPROACH_SPLIT - altMin;
    return span <= 0 ? 0 : ((altMeters - altMin) / span) * Z_APPROACH_SPLIT;
  }
  const span = altMax - ALT_APPROACH_SPLIT;
  return span <= 0 ? Z_APPROACH_SPLIT
    : Z_APPROACH_SPLIT + ((altMeters - ALT_APPROACH_SPLIT) / span) * (Z_TOTAL - Z_APPROACH_SPLIT);
}

function lerpLateral(t) {
  for (let i = 0; i < LATERAL_PROFILE.length - 1; i++) {
    if (t >= LATERAL_PROFILE[i].t && t <= LATERAL_PROFILE[i + 1].t) {
      const dt = LATERAL_PROFILE[i + 1].t - LATERAL_PROFILE[i].t;
      const frac = dt === 0 ? 0 : (t - LATERAL_PROFILE[i].t) / dt;
      return LATERAL_PROFILE[i].x + (LATERAL_PROFILE[i + 1].x - LATERAL_PROFILE[i].x) * frac;
    }
  }
  return t <= 0 ? LATERAL_PROFILE[0].x : LATERAL_PROFILE[LATERAL_PROFILE.length - 1].x;
}

function computeVizWaypoints(runtimeNodes) {
  if (!runtimeNodes || runtimeNodes.length === 0) return [];
  const n = runtimeNodes.length;
  let altMin = Infinity;
  let altMax = -Infinity;
  for (const node of runtimeNodes) {
    const a = node.altitudeMeters || 0;
    if (a < altMin) altMin = a;
    if (a > altMax) altMax = a;
  }
  return runtimeNodes.map((node, idx) => ({
    id:   node.id,
    alt:  node.altitudeMeters || altMin,
    camp: !!node.isCamp,
    z:    altToZ(node.altitudeMeters || altMin, altMin, altMax),
    x:    lerpLateral(n > 1 ? idx / (n - 1) : 0),
  }));
}

let ROUTE_NODES = [];
let ALT_MIN = 2950;
let ALT_MAX = 6962;
let ALT_RANGE = ALT_MAX - ALT_MIN;

function altToY(alt) {
  return ALT_RANGE > 0 ? ((alt - ALT_MIN) / ALT_RANGE) * 180 : 0;
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function clampIdx(idx) {
  return Math.max(0, Math.min(idx, ROUTE_NODES.length - 1));
}

function lerpVal(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(t, 1));
}

function lerpColor(c1, c2, t) {
  return {
    r: Math.round(lerpVal(c1.r, c2.r, t)),
    g: Math.round(lerpVal(c1.g, c2.g, t)),
    b: Math.round(lerpVal(c1.b, c2.b, t)),
  };
}

function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
function rgbaStr(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min((x - edge0) / (edge1 - edge0), 1));
  return t * t * (3 - 2 * t);
}

// Interpolate a route property at a given z position
function lerpRouteField(z, field) {
  for (let i = 0; i < ROUTE_NODES.length - 1; i++) {
    if (z >= ROUTE_NODES[i].z && z <= ROUTE_NODES[i + 1].z) {
      const dz = ROUTE_NODES[i + 1].z - ROUTE_NODES[i].z;
      const t = dz === 0 ? 0 : (z - ROUTE_NODES[i].z) / dz;
      return ROUTE_NODES[i][field] + (ROUTE_NODES[i + 1][field] - ROUTE_NODES[i][field]) * t;
    }
  }
  return z < ROUTE_NODES[0].z ? ROUTE_NODES[0][field] : ROUTE_NODES[ROUTE_NODES.length - 1][field];
}
function lerpRouteX(z) { return lerpRouteField(z, 'x'); }
function lerpRouteAlt(z) { return lerpRouteField(z, 'alt'); }

// ═══════════════════════════════════════════════════════════════
// TERRAIN GENERATION — multi-layer ridgelines with sub-detail
// ═══════════════════════════════════════════════════════════════

function generateTerrainStrips(numStrips) {
  const rng = seededRng(42);
  const rng2 = seededRng(99);
  const maxZ = ROUTE_NODES[ROUTE_NODES.length - 1].z + 200;
  const strips = [];

  for (let i = 0; i <= numStrips; i++) {
    const z = (i / numStrips) * maxZ;
    const baseAlt = lerpRouteField(z, 'alt');
    const routeX = lerpRouteField(z, 'x');
    const altNorm = (baseAlt - ALT_MIN) / ALT_RANGE;
    const ridgeScale = 1.0 - altNorm * 0.55;

    // Main ridges
    const leftAlt = baseAlt + (220 + rng() * 350 - 100) * ridgeScale;
    const rightAlt = baseAlt + (180 + rng() * 380 - 120) * ridgeScale;

    // Sub-ridges for terrain detail (secondary peaks at 40% width)
    const subLeftAlt = baseAlt + (100 + rng2() * 180) * ridgeScale;
    const subRightAlt = baseAlt + (80 + rng2() * 200) * ridgeScale;

    // Rock detail noise
    const rockNoise = rng() * 30 - 15;

    strips.push({
      z, baseAlt, leftAlt, rightAlt, routeX, altNorm,
      subLeftAlt, subRightAlt, rockNoise,
      // Snow line: more snow patches at higher altitude
      snowCover: altNorm > 0.65 ? Math.min(1, (altNorm - 0.65) / 0.25 + rng() * 0.3) : 0,
    });
  }
  return strips;
}

// ═══════════════════════════════════════════════════════════════
// DISTANT BACKDROP — mountain silhouettes behind the main terrain
// ═══════════════════════════════════════════════════════════════

function generateBackdropRidges(rng) {
  const ridges = [];
  for (let layer = 0; layer < 4; layer++) {
    const points = [];
    const numPoints = 18 + layer * 4;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const baseH = 0.25 + layer * 0.08;
      const variation = (rng() - 0.3) * (0.15 + layer * 0.04);
      // Broad mountain shapes via low-frequency sine modulation
      const broad = Math.sin(t * Math.PI * (2 + layer)) * 0.08;
      points.push({ t, h: baseH + variation + broad });
    }
    ridges.push({ layer, points, depth: 0.5 + layer * 0.15 });
  }
  return ridges;
}

function drawBackdrop(ctx, canvasW, canvasH, backdrop, atmosphere) {
  const { ambientLight, fogColor } = atmosphere;
  for (let r = backdrop.length - 1; r >= 0; r--) {
    const ridge = backdrop[r];
    const depthFade = 0.3 + ridge.depth * 0.5;
    const base = lerpColor(
      { r: 60, g: 70, b: 90 },
      fogColor,
      depthFade * atmosphere.fogDensity
    );
    const col = lerpColor(base, fogColor, ridge.depth * 0.4);
    const alpha = (0.3 + 0.4 * (1 - ridge.depth)) * ambientLight;

    ctx.fillStyle = rgbaStr(col, alpha);
    ctx.beginPath();
    ctx.moveTo(0, canvasH);
    for (const p of ridge.points) {
      ctx.lineTo(p.t * canvasW, canvasH * (1 - p.h));
    }
    ctx.lineTo(canvasW, canvasH);
    ctx.closePath();
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════
// CAMERA — perspective projection with gentle sway
// ═══════════════════════════════════════════════════════════════

class Camera {
  constructor() {
    this.x = 0; this.y = 80; this.z = -120;
    this.targetX = 0; this.targetY = 80; this.targetZ = -120;
    this.fov = 280;
    this.tilt = 0.35;
    this.sway = 0;
    this.zoomOffset = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }
  update(dt, time) {
    const speed = Math.min(dt * 2.2, 1);
    this.x += (this.targetX - this.x) * speed;
    this.y += (this.targetY - this.y) * speed;
    this.z += (this.targetZ - this.z) * speed;
    // Gentle breathing sway for life-like camera feel
    this.sway = Math.sin(time * 0.4) * 0.3 + Math.sin(time * 0.7) * 0.15;
  }
  project(worldX, worldY, worldZ, canvasW, canvasH) {
    const relX = worldX - this.x + this.sway + this.shakeX;
    const relY = worldY - this.y + this.shakeY;
    const relZ = worldZ - this.z + this.zoomOffset;
    if (relZ <= 1) return null;
    const scale = this.fov / relZ;
    return {
      x: canvasW / 2 + relX * scale,
      y: canvasH * this.tilt + (-relY + relZ * 0.15) * scale,
      scale,
      depth: relZ,
    };
  }
  followClimber(cx, cy, cz) {
    this.targetX = cx;
    this.targetY = cy + 60;
    this.targetZ = cz - 140;
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSITION MANAGER — post-decision visual effects
// ═══════════════════════════════════════════════════════════════

class TransitionEffect {
  constructor(type, duration, intensity = 1) {
    this.type = type;
    this.duration = duration;
    this.elapsed = 0;
    this.intensity = intensity;
    this.active = true;
  }
  progress() { return Math.min(this.elapsed / this.duration, 1); }
  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) this.active = false;
  }
}

class TransitionManager {
  constructor() {
    this.effects = [];
    this.vignetteAlpha = 0;
    this.vignetteColor = { r: 0, g: 0, b: 0 };
    this.dimLevel = 0;
    this.redFlashAlpha = 0;
    this.cloudSpeedMult = 1;
  }

  triggerAction(action) {
    this.effects = this.effects.filter(e => e.type !== 'action');
    switch (action) {
      case 'advance':
        this.effects.push(new TransitionEffect('zoom-push', 2.0, 1.0));
        this.effects.push(new TransitionEffect('wind-spike', 2.0, 1.0));
        break;
      case 'advance_slowly':
        this.effects.push(new TransitionEffect('zoom-push', 2.0, 0.4));
        break;
      case 'descend':
        this.effects.push(new TransitionEffect('zoom-pull', 2.0, 1.0));
        this.effects.push(new TransitionEffect('fog-clear', 2.0, 1.0));
        break;
      case 'wait':
        this.effects.push(new TransitionEffect('cloud-timelapse', 2.0, 1.0));
        break;
      case 'sleep':
        this.effects.push(new TransitionEffect('sleep-dim', 3.0, 1.0));
        break;
    }
  }

  triggerFlags(flags) {
    if (!flags || !Array.isArray(flags)) return;
    for (const flag of flags) {
      if (flag === 'white-wind-hit') {
        this.effects.push(new TransitionEffect('shake', 1.5, 2.5));
      } else if (flag === 'collapse') {
        this.effects.push(new TransitionEffect('shake', 1.5, 5.0));
        this.effects.push(new TransitionEffect('red-flash', 1.5, 1.0));
      }
    }
  }

  setBodyState(fatigue, exposure) {
    const targetFatigueVignette = fatigue > 70 ? (fatigue - 70) / 30 * 0.25 : 0;
    const targetExposureVignette = exposure > 70 ? (exposure - 70) / 30 * 0.2 : 0;
    this.vignetteAlpha = Math.max(targetFatigueVignette, targetExposureVignette);
    this.vignetteColor = exposure > 70 && exposure >= fatigue
      ? { r: 40, g: 80, b: 160 }
      : { r: 0, g: 0, b: 0 };
  }

  update(dt, camera, reducedMotion) {
    if (reducedMotion) {
      camera.zoomOffset = 0;
      camera.shakeX = 0;
      camera.shakeY = 0;
      this.dimLevel = 0;
      this.redFlashAlpha = 0;
      this.cloudSpeedMult = 1;
      this.effects.length = 0;
      return;
    }

    camera.zoomOffset = 0;
    camera.shakeX = 0;
    camera.shakeY = 0;
    this.dimLevel = 0;
    this.redFlashAlpha = 0;
    this.cloudSpeedMult = 1;

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.update(dt);
      const p = e.progress();
      const ease = 1 - p;

      switch (e.type) {
        case 'zoom-push':
          camera.zoomOffset = -15 * e.intensity * ease;
          break;
        case 'zoom-pull':
          camera.zoomOffset = 20 * e.intensity * ease;
          break;
        case 'wind-spike':
          break;
        case 'fog-clear':
          break;
        case 'cloud-timelapse':
          this.cloudSpeedMult = 1 + 4 * ease;
          break;
        case 'sleep-dim': {
          const mid = 0.5;
          this.dimLevel = p < mid
            ? smoothstep(0, mid, p) * 0.6
            : (1 - smoothstep(mid, 1, p)) * 0.6;
          break;
        }
        case 'shake': {
          const decay = ease * ease;
          camera.shakeX = (Math.random() - 0.5) * e.intensity * decay;
          camera.shakeY = (Math.random() - 0.5) * e.intensity * decay;
          break;
        }
        case 'red-flash':
          this.redFlashAlpha = 0.25 * ease;
          break;
      }

      if (!e.active) this.effects.splice(i, 1);
    }
  }

  isWindSpiking() {
    return this.effects.some(e => e.type === 'wind-spike' && e.active);
  }
  isFogClearing() {
    return this.effects.some(e => e.type === 'fog-clear' && e.active);
  }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES — enhanced snow, wind streaks, dust motes
// ═══════════════════════════════════════════════════════════════

const PARTICLE_SNOW_COUNT = 70;
const PARTICLE_WIND_COUNT = 25;
const PARTICLE_DUST_COUNT = 20;

class Particle {
  constructor(canvasW, canvasH, type, rng) {
    this.type = type;
    this.reset(canvasW, canvasH, rng, true);
  }
  reset(canvasW, canvasH, rng, initial = false) {
    this.x = rng() * canvasW;
    this.y = initial ? rng() * canvasH : -5;
    this.size = this.type === 'snow' ? (0.8 + rng() * 2.5) : (1 + rng() * 2);
    this.speed = 0.2 + rng() * 1.0;
    this.opacity = 0.1 + rng() * 0.45;
    this.drift = (rng() - 0.5) * 0.8;
    this.life = 0;
    this.maxLife = 250 + rng() * 500;
    this.phase = rng() * Math.PI * 2;
    // Wind streaks are elongated
    this.length = this.type === 'wind' ? (8 + rng() * 20) : 0;
  }
  update(canvasW, canvasH, windStrength, rng) {
    this.life++;
    if (this.type === 'snow') {
      this.y += this.speed;
      this.x += this.drift + windStrength * 0.5 + Math.sin(this.life * 0.015 + this.phase) * 0.4;
    } else if (this.type === 'wind') {
      this.x += this.speed * 3 + windStrength * 1.5;
      this.y += Math.sin(this.life * 0.04 + this.phase) * 0.2;
    } else {
      this.x += this.drift + windStrength * 0.3;
      this.y += this.speed * 0.2;
      this.x += Math.sin(this.life * 0.03 + this.phase) * 0.15;
    }
    if (this.y > canvasH + 10 || this.x > canvasW + 10 || this.x < -10 || this.life > this.maxLife) {
      this.reset(canvasW, canvasH, rng);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER VISUAL PROFILES — per-character appearance & identity
// ═══════════════════════════════════════════════════════════════

const CHARACTER_PROFILES = {
  // Francisco Aguirre — Argentine teacher/runner, standard build
  francisco: {
    jacketPrimary: '#b83d2e',    // Red (Argentine outdoor)
    jacketHighlight: '#d44a38',
    jacketShadow: '#a03528',
    jacketDetail: 'rgba(0,0,0,0.15)',
    hatColor: '#1e3b5e',         // Navy blue beanie
    balaclavaColor: '#1a1a2a',
    skinTone: '#c89868',         // Warm olive
    skinHighlight: '#d4a874',
    glovesColor: '#222',
    legColor: '#3a3530',
    legColorAlt: '#3a3a4a',
    bootColor: '#1e1510',
    gaiterColor: '#c94433',
    packColor: '#5a3820',
    packStrap: '#4a2e18',
    matColor: '#6b7a55',
    armColor: '#c94433',
    sunglassColor: '#1a1a1a',
    headlampColor: '#ff0',
    buildScale: 1.0,             // Normal proportions
    shoulderWidth: 1.0,
    flagHint: null,              // Native country, no extra indicator needed
  },
  // Laura Kim — Korean physician, slimmer build, meticulous gear
  laura: {
    jacketPrimary: '#2e6a8b',    // Teal/cerulean blue
    jacketHighlight: '#3a8ab0',
    jacketShadow: '#1e5570',
    jacketDetail: 'rgba(255,255,255,0.08)',
    hatColor: '#eee8e0',         // Off-white / cream beanie
    balaclavaColor: '#d0ccc4',
    skinTone: '#e0c8a0',         // Light warm
    skinHighlight: '#ecd6b2',
    glovesColor: '#2a3a50',
    legColor: '#2e2e36',
    legColorAlt: '#323242',
    bootColor: '#1e1510',
    gaiterColor: '#2e6a8b',
    packColor: '#3e5444',        // Olive green pack
    packStrap: '#2e4034',
    matColor: '#5a6a80',
    armColor: '#2e7a9b',
    sunglassColor: '#2a1a1a',
    headlampColor: '#ffe',
    buildScale: 0.9,             // Slightly smaller frame
    shoulderWidth: 0.88,
    flagHint: null,
  },
  // Erik Lundvall — Norwegian offshore engineer, tall/broad build
  erik: {
    jacketPrimary: '#d4a030',    // Mustard yellow / expedition gold
    jacketHighlight: '#e4b840',
    jacketShadow: '#b08828',
    jacketDetail: 'rgba(0,0,0,0.12)',
    hatColor: '#2a2a2e',         // Charcoal grey beanie
    balaclavaColor: '#222228',
    skinTone: '#e8c8a8',         // Fair Nordic
    skinHighlight: '#f0d4b8',
    glovesColor: '#333',
    legColor: '#2a2a30',
    legColorAlt: '#32323a',
    bootColor: '#1e1510',
    gaiterColor: '#d4a030',
    packColor: '#4a4a52',        // Dark grey pack
    packStrap: '#3a3a42',
    matColor: '#5a5a62',
    armColor: '#d4a838',
    sunglassColor: '#1a1a1a',
    headlampColor: '#ff0',
    buildScale: 1.12,            // Tall, broad
    shoulderWidth: 1.15,
    flagHint: null,
  },
  // Daniela De Rossi — Italian photographer, athletic build, camera gear visible
  daniela: {
    jacketPrimary: '#6b3a78',    // Deep violet / plum
    jacketHighlight: '#8a4e96',
    jacketShadow: '#552a62',
    jacketDetail: 'rgba(255,255,255,0.06)',
    hatColor: '#4a2a52',         // Purple-tinted beanie
    balaclavaColor: '#322038',
    skinTone: '#d4a878',         // Warm Mediterranean
    skinHighlight: '#e0b88a',
    glovesColor: '#2a2028',
    legColor: '#302830',
    legColorAlt: '#38303a',
    bootColor: '#1e1510',
    gaiterColor: '#6b3a78',
    packColor: '#2e2e3a',        // Dark slate pack
    packStrap: '#1e1e2a',
    matColor: '#4a5060',
    armColor: '#7b4a88',
    sunglassColor: '#2a1a2a',
    headlampColor: '#ffe8d0',
    buildScale: 0.94,            // Athletic, slightly smaller
    shoulderWidth: 0.92,
    flagHint: 'camera',          // Camera visible on pack
  },
  // Blake Harris — American executive, stocky build
  blake: {
    jacketPrimary: '#2a2a2e',    // Near-black technical jacket
    jacketHighlight: '#3a3a42',
    jacketShadow: '#1a1a1e',
    jacketDetail: 'rgba(255,255,255,0.05)',
    hatColor: '#cc2200',         // Bright red beanie (striking contrast)
    balaclavaColor: '#aa1a00',
    skinTone: '#d4a070',         // Warm tan
    skinHighlight: '#e0b080',
    glovesColor: '#1a1a1e',
    legColor: '#22222a',
    legColorAlt: '#2a2a32',
    bootColor: '#1e1510',
    gaiterColor: '#444',
    packColor: '#3a3a3e',        // Matching dark pack
    packStrap: '#2a2a2e',
    matColor: '#5a5a5e',
    armColor: '#333338',
    sunglassColor: '#0a0a0a',
    headlampColor: '#ff0',
    buildScale: 1.06,            // Stocky
    shoulderWidth: 1.1,
    flagHint: null,
  },
  // Irina Orlova — Russian former pro climber, lean/tall alpine build
  irina: {
    jacketPrimary: '#cc4422',    // Burnt orange-red
    jacketHighlight: '#e05530',
    jacketShadow: '#aa3318',
    jacketDetail: 'rgba(0,0,0,0.1)',
    hatColor: '#f0e8d0',         // Cream/pale gold beanie
    balaclavaColor: '#e0d8c0',
    skinTone: '#eedcc8',         // Very fair
    skinHighlight: '#f8e8d8',
    glovesColor: '#2a2a30',
    legColor: '#2e2830',
    legColorAlt: '#36303a',
    bootColor: '#1e1510',
    gaiterColor: '#cc4422',
    packColor: '#4e3a30',        // Warm brown pack
    packStrap: '#3e2a20',
    matColor: '#6a6a5a',
    armColor: '#d44a28',
    sunglassColor: '#1a1a1a',
    headlampColor: '#ffe',
    buildScale: 1.04,            // Lean but tall
    shoulderWidth: 0.95,
    flagHint: null,
  },
};

// Default fallback profile (generic climber, matches original red jacket)
const DEFAULT_PROFILE = CHARACTER_PROFILES.francisco;

function getCharacterProfile(characterId) {
  return CHARACTER_PROFILES[characterId] || DEFAULT_PROFILE;
}

// ═══════════════════════════════════════════════════════════════
// CLIMBER — high-detail animated figure with altitude-aware gear
// ═══════════════════════════════════════════════════════════════

class Climber {
  constructor(characterId) {
    this.worldX = ROUTE_NODES[0].x;
    this.worldY = altToY(ROUTE_NODES[0].alt);
    this.worldZ = ROUTE_NODES[0].z;
    this.targetZ = this.worldZ;
    this.walkCycle = 0;
    this.isMoving = false;
    this.facingDir = 1;
    this.breathCycle = 0;
    this.fatigueFactor = 0; // 0→1, increases with altitude
    // Trail of recent positions for footprint rendering
    this.trail = [];
    this.trailTimer = 0;
    // Pose system
    this.currentAction = 'wait';
    this.fatigueLevel = 0; // 0-100 from game state
    // Idle micro-animation timers
    this._idleTime = 0;
    this._headTiltPhase = 0;
    this._fidgetPhase = 0;
    // Character visual profile
    this.characterId = characterId || null;
    this.profile = getCharacterProfile(characterId);
  }
  setTarget(nodeIdx) {
    const idx = clampIdx(nodeIdx);
    const node = ROUTE_NODES[idx];
    if (node.z > this.targetZ + 1) this.facingDir = 1;
    else if (node.z < this.targetZ - 1) this.facingDir = -1;
    this.targetZ = node.z;
    this.isMoving = true;
  }
  update(dt) {
    const altNorm = ALT_RANGE > 0 ? (lerpRouteAlt(this.worldZ) - ALT_MIN) / ALT_RANGE : 0;
    // Movement slows at altitude (fatigue simulation)
    this.fatigueFactor = smoothstep(0.4, 0.9, altNorm);
    const moveSpeed = Math.min(dt * (2.0 - this.fatigueFactor * 0.8), 1);

    const prevZ = this.worldZ;
    this.worldZ += (this.targetZ - this.worldZ) * moveSpeed;
    this.worldX = lerpRouteX(this.worldZ);
    this.worldY = altToY(lerpRouteAlt(this.worldZ));
    const dist = Math.abs(this.worldZ - prevZ);
    this.isMoving = dist > 0.08;

    // Walk cycle slows with fatigue
    const fatigueNorm = this.fatigueLevel / 100;
    const walkSpeed = 8 - this.fatigueFactor * 3 - fatigueNorm * 1.5;
    if (this.isMoving) {
      this.walkCycle += dt * walkSpeed;
    } else {
      this.walkCycle *= 0.92;
    }
    // Heavier breathing at altitude
    this.breathCycle += dt * (1.5 + this.fatigueFactor * 1.0);

    // Idle micro-animations
    if (!this.isMoving) {
      this._idleTime += dt;
    } else {
      this._idleTime = 0;
    }
    this._headTiltPhase += dt;
    this._fidgetPhase += dt;

    // Drop trail markers
    this.trailTimer += dt;
    if (this.isMoving && this.trailTimer > 0.15) {
      this.trailTimer = 0;
      this.trail.push({ x: this.worldX, y: this.worldY, z: this.worldZ, age: 0 });
      if (this.trail.length > 40) this.trail.shift();
    }
    for (const tp of this.trail) tp.age += dt;
  }

  _drawSleepingBag(ctx, h, atmosphere) {
    const p = this.profile;
    const bagW = h * 0.55;
    const bagH = h * 0.18;

    // Ground pad shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, bagH * 0.3, bagW * 1.1, bagH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sleeping bag body — character-colored outer shell with gradient
    const bagGrad = ctx.createLinearGradient(-bagW, -bagH, bagW, bagH);
    bagGrad.addColorStop(0, p.jacketShadow);
    bagGrad.addColorStop(0.5, p.jacketPrimary);
    bagGrad.addColorStop(1, p.jacketShadow);
    ctx.fillStyle = bagGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bagW, bagH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bag lining visible at opening
    ctx.fillStyle = '#556680';
    ctx.beginPath();
    ctx.ellipse(-bagW * 0.65, 0, bagH * 0.8, bagH * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pillow / hood bump — character hat-colored
    ctx.fillStyle = p.hatColor;
    ctx.beginPath();
    ctx.ellipse(-bagW * 0.7, 0, bagH * 0.9, bagH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face peeking out (small skin-colored oval)
    ctx.fillStyle = p.skinHighlight;
    ctx.beginPath();
    ctx.ellipse(-bagW * 0.62, 0, bagH * 0.35, bagH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bag seam with subtle stitching
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = Math.max(0.5, h * 0.01);
    ctx.beginPath();
    ctx.moveTo(-bagW * 0.3, -bagH * 0.6);
    ctx.quadraticCurveTo(bagW * 0.2, -bagH * 0.15, bagW * 0.85, 0);
    ctx.stroke();
    // Second quilted seam
    ctx.beginPath();
    ctx.moveTo(-bagW * 0.2, bagH * 0.55);
    ctx.quadraticCurveTo(bagW * 0.3, bagH * 0.1, bagW * 0.8, bagH * 0.05);
    ctx.stroke();

    // Zipper line
    ctx.strokeStyle = 'rgba(180,180,200,0.25)';
    ctx.lineWidth = Math.max(0.4, h * 0.008);
    ctx.beginPath();
    ctx.moveTo(-bagW * 0.45, -bagH * 0.15);
    ctx.lineTo(bagW * 0.2, -bagH * 0.3);
    ctx.stroke();

    // Breath vapor in cold (night / high altitude)
    if (atmosphere.isNight || atmosphere.hour < 7) {
      const breathAlpha = 0.15 + Math.sin(this.breathCycle * 0.5) * 0.06;
      ctx.fillStyle = `rgba(200,210,230,${breathAlpha})`;
      const bx = -bagW * 0.85;
      const by = -bagH * 0.1;
      ctx.beginPath();
      ctx.ellipse(bx, by, h * 0.06, h * 0.035, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx - h * 0.04, by - h * 0.03, h * 0.04, h * 0.025, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw(ctx, camera, canvasW, canvasH, atmosphere) {
    const projected = camera.project(this.worldX, this.worldY, this.worldZ, canvasW, canvasH);
    if (!projected || projected.depth > 600) return;
    const { x, y, scale } = projected;
    const p = this.profile;
    const size = Math.max(8, Math.min(scale * 14 * p.buildScale, 48));

    ctx.save();
    ctx.translate(x, y);

    const h = size;

    // Sleep pose: draw sleeping bag and return early
    if (this.currentAction === 'sleep') {
      this._drawSleepingBag(ctx, h, atmosphere);
      ctx.restore();
      return;
    }

    // Pose-based body tilt
    const fatigueNorm = this.fatigueLevel / 100;
    let poseTilt = 0;
    if (this.currentAction === 'advance') poseTilt = 0.14; // ~8° forward
    else if (this.currentAction === 'advance_slowly') poseTilt = 0.08;
    else if (this.currentAction === 'descend') poseTilt = -0.12; // backward lean
    // Fatigue adds progressive forward hunch
    poseTilt += fatigueNorm * 0.1;

    // Idle micro-animations
    let headTiltOffset = 0;
    let armFidgetOffset = 0;
    if (!this.isMoving && this.currentAction !== 'sleep') {
      // Head tilt looking up at summit every 5s for 1s
      const headCycle = this._headTiltPhase % 5.0;
      if (headCycle < 1.0) headTiltOffset = Math.sin(headCycle * Math.PI) * 0.08;
      // Pack strap fidget every 8s
      const fidgetCycle = this._fidgetPhase % 8.0;
      if (fidgetCycle < 0.6) armFidgetOffset = Math.sin(fidgetCycle / 0.6 * Math.PI) * 0.12;
    }

    // Fatigue walk irregularity
    const limpOffset = fatigueNorm > 0.5 ? Math.sin(this.walkCycle * 0.7) * fatigueNorm * 0.15 : 0;

    if (poseTilt !== 0) ctx.rotate(poseTilt);

    const breathAmp = 0.8 + this.fatigueFactor * 0.6;
    const breathBob = Math.sin(this.breathCycle) * breathAmp;
    const legSwing = this.isMoving ? Math.sin(this.walkCycle + limpOffset) * 0.4 : 0;
    const armRange = Math.max(0.1, 0.35 - fatigueNorm * 0.2);
    const armSwing = this.isMoving
      ? Math.sin(this.walkCycle + Math.PI) * armRange + armFidgetOffset
      : armFidgetOffset;
    const asymmetry = fatigueNorm > 0.3 ? Math.sin(this.walkCycle * 1.3) * fatigueNorm * 0.4 : 0;
    const bodyBob = this.isMoving ? (Math.abs(Math.sin(this.walkCycle * 2)) * 1.8 + asymmetry) : 0;
    const altNorm = ALT_RANGE > 0 ? (lerpRouteAlt(this.worldZ) - ALT_MIN) / ALT_RANGE : 0;

    const headR = h * 0.13;
    const torsoH = h * 0.34;
    const legH = h * 0.36;
    // Wider stance when descending, scaled by character build
    const stanceBase = this.currentAction === 'descend' ? 0.09 : 0.06;
    const stanceWidth = stanceBase * p.shoulderWidth;

    // Ground shadow — elongated in sun direction
    const shadowAlpha = atmosphere.ambientLight * 0.25;
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(h * 0.03, 0, h * 0.28, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Legs ===
    const legY = -torsoH + breathBob - bodyBob;
    const legColor = altNorm > 0.7 ? p.legColorAlt : p.legColor;
    ctx.strokeStyle = legColor;
    ctx.lineWidth = Math.max(1.8, h * 0.065);
    ctx.lineCap = 'round';
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-h * stanceWidth, legY);
    ctx.lineTo(-h * stanceWidth + legSwing * h * 0.22, legY + legH);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(h * stanceWidth, legY);
    ctx.lineTo(h * stanceWidth - legSwing * h * 0.22, legY + legH);
    ctx.stroke();

    // Boots — heavier at altitude (mountaineering boots with detail)
    const bootSize = Math.max(2.5, h * (altNorm > 0.6 ? 0.065 : 0.05));
    ctx.fillStyle = p.bootColor;
    // Left boot
    ctx.beginPath();
    ctx.moveTo(-h * stanceWidth + legSwing * h * 0.22 - bootSize / 2, legY + legH - 1);
    ctx.lineTo(-h * stanceWidth + legSwing * h * 0.22 + bootSize / 2, legY + legH - 1);
    ctx.lineTo(-h * stanceWidth + legSwing * h * 0.22 + bootSize * 0.6, legY + legH + bootSize * 0.6);
    ctx.lineTo(-h * stanceWidth + legSwing * h * 0.22 - bootSize * 0.4, legY + legH + bootSize * 0.6);
    ctx.closePath();
    ctx.fill();
    // Right boot
    ctx.beginPath();
    ctx.moveTo(h * stanceWidth - legSwing * h * 0.22 - bootSize / 2, legY + legH - 1);
    ctx.lineTo(h * stanceWidth - legSwing * h * 0.22 + bootSize / 2, legY + legH - 1);
    ctx.lineTo(h * stanceWidth - legSwing * h * 0.22 + bootSize * 0.6, legY + legH + bootSize * 0.6);
    ctx.lineTo(h * stanceWidth - legSwing * h * 0.22 - bootSize * 0.4, legY + legH + bootSize * 0.6);
    ctx.closePath();
    ctx.fill();
    // Boot lace/tongue detail
    ctx.strokeStyle = 'rgba(120,100,80,0.3)';
    ctx.lineWidth = Math.max(0.3, h * 0.005);
    const lbx = -h * stanceWidth + legSwing * h * 0.22;
    const rbx = h * stanceWidth - legSwing * h * 0.22;
    ctx.beginPath();
    ctx.moveTo(lbx, legY + legH);
    ctx.lineTo(lbx, legY + legH + bootSize * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rbx, legY + legH);
    ctx.lineTo(rbx, legY + legH + bootSize * 0.3);
    ctx.stroke();

    // Crampons at very high altitude
    if (altNorm > 0.75) {
      ctx.strokeStyle = '#aab';
      ctx.lineWidth = Math.max(0.5, h * 0.008);
      const crampY = legY + legH + bootSize * 0.55;
      // Left crampon points
      for (let cp = -1; cp <= 1; cp++) {
        ctx.beginPath();
        ctx.moveTo(lbx + cp * bootSize * 0.25, crampY);
        ctx.lineTo(lbx + cp * bootSize * 0.25, crampY + bootSize * 0.2);
        ctx.stroke();
      }
      // Right crampon points
      for (let cp = -1; cp <= 1; cp++) {
        ctx.beginPath();
        ctx.moveTo(rbx + cp * bootSize * 0.25, crampY);
        ctx.lineTo(rbx + cp * bootSize * 0.25, crampY + bootSize * 0.2);
        ctx.stroke();
      }
    }

    // Gaiter detail at altitude
    if (altNorm > 0.55) {
      ctx.fillStyle = p.gaiterColor;
      const gW = bootSize * 0.7;
      ctx.fillRect(-h * stanceWidth + legSwing * h * 0.22 - gW / 2, legY + legH - bootSize, gW, bootSize * 0.5);
      ctx.fillRect(h * stanceWidth - legSwing * h * 0.22 - gW / 2, legY + legH - bootSize, gW, bootSize * 0.5);
    }

    // === Torso (jacket with multi-layer gradient shading) ===
    const torsoY = -torsoH - headR * 2 + breathBob - bodyBob;
    // Character-specific jacket — 3-stop gradient for dimensional depth
    const jacketGrad = ctx.createLinearGradient(-h * 0.14, torsoY, h * 0.14, torsoY + torsoH);
    jacketGrad.addColorStop(0, p.jacketShadow);
    jacketGrad.addColorStop(0.35, p.jacketHighlight);
    jacketGrad.addColorStop(0.65, p.jacketPrimary);
    jacketGrad.addColorStop(1, p.jacketShadow);
    ctx.fillStyle = jacketGrad;
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, torsoY + torsoH);
    ctx.lineTo(-h * 0.13, torsoY + h * 0.02);
    ctx.quadraticCurveTo(-h * 0.12, torsoY, -h * 0.06, torsoY);
    ctx.lineTo(h * 0.06, torsoY);
    ctx.quadraticCurveTo(h * 0.12, torsoY, h * 0.13, torsoY + h * 0.02);
    ctx.lineTo(h * 0.1, torsoY + torsoH);
    ctx.closePath();
    ctx.fill();

    // Shoulder seams — subtle lines for jacket panel construction
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = Math.max(0.3, h * 0.006);
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, torsoY + h * 0.01);
    ctx.quadraticCurveTo(-h * 0.08, torsoY + h * 0.06, -h * 0.06, torsoY + torsoH * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h * 0.1, torsoY + h * 0.01);
    ctx.quadraticCurveTo(h * 0.08, torsoY + h * 0.06, h * 0.06, torsoY + torsoH * 0.3);
    ctx.stroke();

    // Jacket zipper line with tab
    ctx.strokeStyle = p.jacketDetail;
    ctx.lineWidth = Math.max(0.5, h * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, torsoY + 2);
    ctx.lineTo(0, torsoY + torsoH - 2);
    ctx.stroke();
    // Zipper pull tab
    ctx.fillStyle = 'rgba(180,180,190,0.4)';
    ctx.fillRect(-h * 0.01, torsoY + torsoH * 0.25, h * 0.02, h * 0.025);

    // Jacket highlight (sun side) — fresnel-style rim light
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, torsoY + torsoH);
    ctx.lineTo(-h * 0.13, torsoY + h * 0.02);
    ctx.lineTo(-h * 0.03, torsoY);
    ctx.lineTo(-h * 0.02, torsoY + torsoH);
    ctx.closePath();
    ctx.fill();

    // Hood on back or collar detail
    if (atmosphere.windStrength > 2 || atmosphere.hasSnow) {
      // Hood up — rounded bump behind head
      ctx.fillStyle = p.jacketShadow;
      ctx.beginPath();
      ctx.arc(0, torsoY - headR * 0.2, headR * 1.2, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.fill();
    } else {
      // Collar at neckline
      ctx.fillStyle = p.jacketHighlight;
      ctx.fillRect(-h * 0.05, torsoY - 1, h * 0.1, h * 0.025);
    }

    // Chest pocket detail (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(0.3, h * 0.005);
    ctx.strokeRect(h * 0.02, torsoY + torsoH * 0.15, h * 0.04, h * 0.04);

    // === Backpack with frame structure and detail ===
    const bpW = h * 0.16;
    const bpH = torsoH * 0.75;
    const bpX = -bpW / 2 + h * 0.015;
    // Pack body with gradient
    const packGrad = ctx.createLinearGradient(bpX, torsoY, bpX + bpW, torsoY + bpH);
    packGrad.addColorStop(0, p.packStrap);
    packGrad.addColorStop(0.5, p.packColor);
    packGrad.addColorStop(1, p.packStrap);
    ctx.fillStyle = packGrad;
    ctx.beginPath();
    ctx.moveTo(bpX, torsoY + 2);
    ctx.lineTo(bpX + bpW, torsoY + 2);
    ctx.lineTo(bpX + bpW - 1, torsoY + bpH);
    ctx.lineTo(bpX + 1, torsoY + bpH);
    ctx.closePath();
    ctx.fill();
    // Pack lid flap (top closure)
    ctx.fillStyle = p.packStrap;
    ctx.beginPath();
    ctx.moveTo(bpX - 1, torsoY + 1);
    ctx.lineTo(bpX + bpW + 1, torsoY + 1);
    ctx.lineTo(bpX + bpW, torsoY + bpH * 0.12);
    ctx.lineTo(bpX, torsoY + bpH * 0.12);
    ctx.closePath();
    ctx.fill();
    // Backpack straps
    ctx.strokeStyle = p.packStrap;
    ctx.lineWidth = Math.max(0.7, h * 0.02);
    ctx.beginPath();
    ctx.moveTo(bpX + 2, torsoY + 3);
    ctx.lineTo(-h * 0.08, torsoY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bpX + bpW - 2, torsoY + 3);
    ctx.lineTo(h * 0.08, torsoY);
    ctx.stroke();
    // Sternum strap
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = Math.max(0.4, h * 0.008);
    ctx.beginPath();
    ctx.moveTo(-h * 0.07, torsoY + torsoH * 0.25);
    ctx.lineTo(h * 0.07, torsoY + torsoH * 0.25);
    ctx.stroke();
    // Hip belt
    ctx.strokeStyle = p.packStrap;
    ctx.lineWidth = Math.max(0.6, h * 0.015);
    ctx.beginPath();
    ctx.moveTo(bpX, torsoY + bpH - 2);
    ctx.lineTo(-h * 0.12, torsoY + bpH + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bpX + bpW, torsoY + bpH - 2);
    ctx.lineTo(h * 0.12, torsoY + bpH + 2);
    ctx.stroke();
    // Pack compression straps (side)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = Math.max(0.3, h * 0.005);
    ctx.beginPath();
    ctx.moveTo(bpX + bpW, torsoY + bpH * 0.3);
    ctx.lineTo(bpX + bpW + 1, torsoY + bpH * 0.7);
    ctx.stroke();
    // Sleeping mat roll on pack
    ctx.fillStyle = p.matColor;
    ctx.beginPath();
    ctx.ellipse(bpX + bpW / 2, torsoY + bpH + 1, bpW * 0.4, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mat roll texture (spiral end)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.arc(bpX + bpW / 2 + bpW * 0.3, torsoY + bpH + 1, h * 0.015, 0, Math.PI * 2);
    ctx.stroke();

    // Rope coil on pack (visible at high altitude)
    if (altNorm > 0.6) {
      ctx.strokeStyle = '#d4c090';
      ctx.lineWidth = Math.max(0.6, h * 0.012);
      const ropeX = bpX - h * 0.02;
      const ropeY = torsoY + bpH * 0.3;
      for (let rc = 0; rc < 3; rc++) {
        ctx.beginPath();
        ctx.arc(ropeX, ropeY + rc * h * 0.02, h * 0.035, 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
    }

    // Daniela: camera body visible on pack strap
    if (p.flagHint === 'camera') {
      const camX = bpX + bpW + h * 0.02;
      const camY = torsoY + bpH * 0.3;
      const camW = h * 0.06;
      const camH = h * 0.04;
      ctx.fillStyle = '#222';
      ctx.fillRect(camX, camY, camW, camH);
      // Lens circle
      ctx.fillStyle = '#4488aa';
      ctx.beginPath();
      ctx.arc(camX + camW * 0.65, camY + camH * 0.5, camH * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Lens glint
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(camX + camW * 0.7, camY + camH * 0.35, camH * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Arms ===
    ctx.strokeStyle = p.armColor;
    ctx.lineWidth = Math.max(1.4, h * 0.055);
    ctx.lineCap = 'round';
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-h * 0.13, torsoY + h * 0.04);
    ctx.lineTo(-h * 0.19 + armSwing * h * 0.15, torsoY + torsoH * 0.72);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(h * 0.13, torsoY + h * 0.04);
    ctx.lineTo(h * 0.19 - armSwing * h * 0.15, torsoY + torsoH * 0.72);
    ctx.stroke();

    // Gloves at high altitude
    if (altNorm > 0.5) {
      ctx.fillStyle = p.glovesColor;
      const gloveR = Math.max(1.5, h * 0.03);
      ctx.beginPath();
      ctx.arc(-h * 0.19 + armSwing * h * 0.15, torsoY + torsoH * 0.72, gloveR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(h * 0.19 - armSwing * h * 0.15, torsoY + torsoH * 0.72, gloveR, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Trekking pole / Ice axe (pose-aware) ===
    const poleHandX = h * 0.19 - armSwing * h * 0.15;
    const poleHandY = torsoY + torsoH * 0.72;
    if (altNorm > 0.75) {
      // Ice axe at extreme altitude
      ctx.strokeStyle = '#9a9a9a';
      ctx.lineWidth = Math.max(1, h * 0.025);
      ctx.beginPath();
      ctx.moveTo(poleHandX, poleHandY);
      const axeExtend = this.currentAction === 'advance' ? 0.9 : 0.7;
      ctx.lineTo(poleHandX + h * 0.04, poleHandY + legH * axeExtend);
      ctx.stroke();
      // Axe head
      ctx.strokeStyle = '#778';
      ctx.lineWidth = Math.max(1.2, h * 0.03);
      ctx.beginPath();
      ctx.moveTo(poleHandX - h * 0.04, poleHandY - h * 0.01);
      ctx.lineTo(poleHandX + h * 0.04, poleHandY + h * 0.01);
      ctx.stroke();
    } else if (this.currentAction === 'wait') {
      // Pole resting at side
      ctx.strokeStyle = '#999';
      ctx.lineWidth = Math.max(0.8, h * 0.02);
      ctx.beginPath();
      ctx.moveTo(poleHandX + h * 0.02, poleHandY);
      ctx.lineTo(poleHandX + h * 0.02, poleHandY + legH * 0.95);
      ctx.stroke();
    } else if (this.currentAction === 'descend') {
      // Pole behind as brake
      ctx.strokeStyle = '#999';
      ctx.lineWidth = Math.max(0.8, h * 0.02);
      ctx.beginPath();
      ctx.moveTo(poleHandX, poleHandY);
      ctx.lineTo(poleHandX - h * 0.08, poleHandY + legH * 0.9);
      ctx.stroke();
      const basketY = poleHandY + legH * 0.8;
      const basketX = poleHandX - h * 0.07;
      ctx.strokeStyle = '#777';
      ctx.lineWidth = Math.max(0.5, h * 0.012);
      ctx.beginPath();
      ctx.arc(basketX, basketY, h * 0.025, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Trekking pole — forward (advance / advance_slowly)
      ctx.strokeStyle = '#999';
      ctx.lineWidth = Math.max(0.8, h * 0.02);
      ctx.beginPath();
      ctx.moveTo(poleHandX, poleHandY);
      ctx.lineTo(poleHandX + h * 0.06, poleHandY + legH * 0.95);
      ctx.stroke();
      // Pole basket
      ctx.strokeStyle = '#777';
      ctx.lineWidth = Math.max(0.5, h * 0.012);
      const basketY = poleHandY + legH * 0.85;
      const basketX = poleHandX + h * 0.055;
      ctx.beginPath();
      ctx.arc(basketX, basketY, h * 0.025, 0, Math.PI * 2);
      ctx.stroke();
    }

    // === Head ===
    const headY = torsoY - headR * 0.8 + breathBob - bodyBob - headTiltOffset * h;
    // Neck
    ctx.fillStyle = p.skinTone;
    ctx.fillRect(-h * 0.025, torsoY - h * 0.02, h * 0.05, headR * 0.6);
    // Face
    ctx.fillStyle = p.skinHighlight;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    // Sunburn tint at altitude
    if (altNorm > 0.4) {
      ctx.fillStyle = `rgba(200,100,80,${(altNorm - 0.4) * 0.15})`;
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Hat / Balaclava ===
    if (altNorm > 0.7) {
      // Full balaclava at high altitude
      ctx.fillStyle = p.balaclavaColor;
      ctx.beginPath();
      ctx.arc(0, headY, headR * 1.08, 0, Math.PI * 2);
      ctx.fill();
      // Eye slit
      ctx.fillStyle = p.skinHighlight;
      ctx.fillRect(-headR * 0.5, headY - headR * 0.15, headR, headR * 0.3);
    } else {
      // Beanie — character-colored
      ctx.fillStyle = p.hatColor;
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.2, headR * 1.08, Math.PI, Math.PI * 2);
      ctx.fill();
      // Beanie fold line
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = Math.max(0.5, h * 0.012);
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.05, headR * 1.02, Math.PI + 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();

      // Sunglasses
      if (altNorm > 0.3 && atmosphere.ambientLight > 0.4) {
        ctx.fillStyle = p.sunglassColor;
        ctx.fillRect(-headR * 0.55, headY - headR * 0.2, headR * 0.45, headR * 0.28);
        ctx.fillRect(headR * 0.1, headY - headR * 0.2, headR * 0.45, headR * 0.28);
        // Bridge
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(0.4, h * 0.008);
        ctx.beginPath();
        ctx.moveTo(-headR * 0.1, headY - headR * 0.08);
        ctx.lineTo(headR * 0.1, headY - headR * 0.08);
        ctx.stroke();
      }
    }

    // === Headlamp at night ===
    if (atmosphere.isNight || atmosphere.hour < 6 || atmosphere.hour > 19) {
      // Headlamp strap across forehead
      ctx.strokeStyle = 'rgba(60,60,60,0.4)';
      ctx.lineWidth = Math.max(0.5, h * 0.01);
      ctx.beginPath();
      ctx.arc(0, headY, headR * 1.05, Math.PI * 0.85, Math.PI * 0.15, true);
      ctx.stroke();
      // Lamp on forehead
      ctx.fillStyle = p.headlampColor;
      const lampR = Math.max(1, headR * 0.22);
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.72, lampR, 0, Math.PI * 2);
      ctx.fill();
      // Lamp housing
      ctx.fillStyle = '#444';
      ctx.fillRect(-lampR * 1.3, headY - headR * 0.72 - lampR * 0.5, lampR * 2.6, lampR * 0.4);
      // Light beam cone — wider with two intensity layers
      const beamGrad = ctx.createRadialGradient(0, headY - headR, 0, 0, headY - headR, h * 1.5);
      beamGrad.addColorStop(0, 'rgba(255,240,180,0.14)');
      beamGrad.addColorStop(0.3, 'rgba(255,235,170,0.06)');
      beamGrad.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-h * 0.04, headY - headR);
      ctx.lineTo(-h * 0.35, headY + h * 0.6);
      ctx.lineTo(h * 0.35, headY + h * 0.6);
      ctx.lineTo(h * 0.04, headY - headR);
      ctx.closePath();
      ctx.fill();
    }

    // === Breath vapor (visible in cold) ===
    if (altNorm > 0.45 || atmosphere.isNight || atmosphere.hour < 7) {
      const breathPhase = Math.sin(this.breathCycle * 0.8);
      const breathAlpha = (0.08 + breathPhase * 0.05) * Math.min(1, altNorm + 0.3);
      if (breathAlpha > 0.03) {
        ctx.fillStyle = `rgba(210,220,240,${breathAlpha})`;
        const bx = this.facingDir * h * 0.12;
        const by = headY + headR * 0.1;
        const bSize = h * 0.04 + breathPhase * h * 0.015;
        ctx.beginPath();
        ctx.ellipse(bx, by, bSize * 1.3, bSize * 0.7, this.facingDir * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Secondary smaller puff
        ctx.fillStyle = `rgba(210,220,240,${breathAlpha * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(bx + this.facingDir * h * 0.04, by - h * 0.02, bSize * 0.7, bSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
// TERRAIN RENDERER — multi-layer with snow patches and detail
// ═══════════════════════════════════════════════════════════════

// Smooth altitude-based color gradient (5 biome stops)
function getTerrainColor(altNorm) {
  const stops = [
    { t: 0.00, r:  85, g:  95, b:  70 },  // Valley floor — muted green
    { t: 0.25, r: 110, g: 105, b:  80 },  // Low slopes — olive
    { t: 0.50, r: 135, g: 125, b: 105 },  // Mid mountain — brown/tan
    { t: 0.70, r: 155, g: 160, b: 170 },  // High scree — blue-grey
    { t: 0.85, r: 200, g: 210, b: 220 },  // Snow zone — near white
    { t: 1.00, r: 230, g: 238, b: 248 },  // Summit — bright snow
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (altNorm <= stops[i + 1].t) {
      const t = (altNorm - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return {
        r: Math.round(lerpVal(stops[i].r, stops[i + 1].r, t)),
        g: Math.round(lerpVal(stops[i].g, stops[i + 1].g, t)),
        b: Math.round(lerpVal(stops[i].b, stops[i + 1].b, t)),
      };
    }
  }
  return { r: 230, g: 238, b: 248 };
}

function drawTerrain(ctx, camera, strips, canvasW, canvasH, atmosphere, time) {
  const visibleStrips = [];
  for (let i = 0; i < strips.length; i++) {
    const strip = strips[i];
    const baseY = altToY(strip.baseAlt);
    const leftY = altToY(strip.leftAlt);
    const rightY = altToY(strip.rightAlt);
    const subLY = altToY(strip.subLeftAlt);
    const subRY = altToY(strip.subRightAlt);
    const rx = strip.routeX;
    const center = camera.project(rx, baseY, strip.z, canvasW, canvasH);
    const left = camera.project(rx - 320, leftY, strip.z, canvasW, canvasH);
    const right = camera.project(rx + 320, rightY, strip.z, canvasW, canvasH);
    const subLeft = camera.project(rx - 140, subLY, strip.z, canvasW, canvasH);
    const subRight = camera.project(rx + 140, subRY, strip.z, canvasW, canvasH);
    if (!center || !left || !right) continue;
    if (center.y < -canvasH || center.y > canvasH * 2) continue;
    visibleStrips.push({
      strip, center, left, right, subLeft, subRight,
      altNorm: strip.altNorm, depth: center.depth,
    });
  }
  visibleStrips.sort((a, b) => b.depth - a.depth);

  for (let i = 0; i < visibleStrips.length - 1; i++) {
    const curr = visibleStrips[i];
    const next = visibleStrips[i + 1];
    const col = getTerrainColor(curr.altNorm);
    const fogAmount = Math.min(curr.depth / 500, 1) * atmosphere.fogDensity;
    const { r: fogR, g: fogG, b: fogB } = atmosphere.fogColor;
    const r = Math.round(col.r * (1 - fogAmount) + fogR * fogAmount);
    const g = Math.round(col.g * (1 - fogAmount) + fogG * fogAmount);
    const b = Math.round(col.b * (1 - fogAmount) + fogB * fogAmount);

    // Directional lighting: left face darker (shadow), right face lit
    // Distance-dependent contrast reduction (atmospheric scattering)
    const sunAngle = atmosphere.hour ? ((atmosphere.hour - 6) / 12) : 0.5;
    const sunDir = Math.cos(sunAngle * Math.PI) * 0.15;
    const contrastFade = (1 - fogAmount); // contrast diminishes with distance
    const shadowShade = 0.62 + 0.18 * contrastFade - sunDir * contrastFade;
    const lightShade = Math.min(0.72 + 0.28 * contrastFade + sunDir * contrastFade, 1.05);

    // === Left face (shadow side) ===
    ctx.fillStyle = `rgb(${Math.round(r * shadowShade)},${Math.round(g * shadowShade)},${Math.round(b * shadowShade)})`;
    ctx.beginPath();
    ctx.moveTo(curr.left.x, curr.left.y);
    if (curr.subLeft) {
      ctx.lineTo(curr.subLeft.x, curr.subLeft.y);
    }
    ctx.lineTo(curr.center.x, curr.center.y);
    ctx.lineTo(next.center.x, next.center.y);
    if (next.subLeft) {
      ctx.lineTo(next.subLeft.x, next.subLeft.y);
    }
    ctx.lineTo(next.left.x, next.left.y);
    ctx.closePath();
    ctx.fill();

    // === Right face (lit side) ===
    ctx.fillStyle = `rgb(${Math.round(Math.min(255, r * lightShade))},${Math.round(Math.min(255, g * lightShade))},${Math.round(Math.min(255, b * lightShade))})`;
    ctx.beginPath();
    ctx.moveTo(curr.center.x, curr.center.y);
    if (curr.subRight) {
      ctx.lineTo(curr.subRight.x, curr.subRight.y);
    }
    ctx.lineTo(curr.right.x, curr.right.y);
    ctx.lineTo(next.right.x, next.right.y);
    if (next.subRight) {
      ctx.lineTo(next.subRight.x, next.subRight.y);
    }
    ctx.lineTo(next.center.x, next.center.y);
    ctx.closePath();
    ctx.fill();

    // === Snow patches ===
    if (curr.strip.snowCover > 0.1 && fogAmount < 0.7) {
      const snowAlpha = curr.strip.snowCover * (1 - fogAmount) * 0.35;
      // Specular highlight on snow (sun-facing side)
      const specular = Math.max(0, Math.cos((sunAngle - 0.5) * Math.PI)) * 0.15;
      ctx.fillStyle = `rgba(${220 + Math.round(specular * 35)},${230 + Math.round(specular * 25)},245,${snowAlpha + specular})`;
      // Snow on right face (sun-facing)
      ctx.beginPath();
      ctx.moveTo(curr.center.x, curr.center.y - 1);
      ctx.lineTo(lerpVal(curr.center.x, curr.right.x, 0.6), lerpVal(curr.center.y, curr.right.y, 0.4));
      ctx.lineTo(lerpVal(next.center.x, next.right.x, 0.6), lerpVal(next.center.y, next.right.y, 0.4));
      ctx.lineTo(next.center.x, next.center.y - 1);
      ctx.closePath();
      ctx.fill();
    }

    // === Ambient occlusion at valley floor ===
    if (curr.altNorm < 0.3 && fogAmount < 0.6) {
      const aoAlpha = (0.3 - curr.altNorm) * 0.12 * (1 - fogAmount);
      ctx.fillStyle = `rgba(0,0,0,${aoAlpha})`;
      ctx.beginPath();
      ctx.moveTo(curr.center.x - 8, curr.center.y + 2);
      ctx.lineTo(curr.center.x + 8, curr.center.y + 2);
      ctx.lineTo(next.center.x + 8, next.center.y + 2);
      ctx.lineTo(next.center.x - 8, next.center.y + 2);
      ctx.closePath();
      ctx.fill();
    }

    // === Procedural terrain texture ===
    if (fogAmount < 0.5) {
      const texAlpha = (1 - fogAmount) * 0.15;
      const texRng = seededRng(Math.round(curr.strip.z * 100 + i));
      const midX = (curr.center.x + next.center.x) * 0.5;
      const midY = (curr.center.y + next.center.y) * 0.5;

      // Inter-strip shadow line at base of each strip (depth illusion)
      ctx.strokeStyle = `rgba(0,0,0,${texAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curr.left ? curr.left.x : midX - 30, next.center.y + 1);
      ctx.lineTo(curr.right ? curr.right.x : midX + 30, next.center.y + 1);
      ctx.stroke();

      // Ridge-top highlight line (subtle edge light on ridgeline crest)
      if (contrastFade > 0.3) {
        ctx.strokeStyle = `rgba(255,255,255,${texAlpha * 0.2 * contrastFade})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(curr.center.x, curr.center.y - 1);
        ctx.lineTo(curr.right ? lerpVal(curr.center.x, curr.right.x, 0.4) : midX + 15, curr.center.y - 1);
        ctx.stroke();
      }

      // Rock fracture lines (altNorm 0.25–0.80, wider range for more detail)
      if (curr.altNorm >= 0.25 && curr.altNorm <= 0.80) {
        ctx.strokeStyle = `rgba(60,55,50,${texAlpha})`;
        ctx.lineWidth = 0.5;
        const nFractures = 2 + Math.floor(texRng() * 2);
        for (let f = 0; f < nFractures; f++) {
          const fx = lerpVal(curr.center.x, curr.right ? curr.right.x : midX + 20, texRng() * 0.6 + 0.1);
          const fy = lerpVal(curr.center.y, next.center.y, texRng());
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          // Branching fracture for more realism
          const fx2 = fx + (texRng() - 0.5) * 10;
          const fy2 = fy + 3 + texRng() * 5;
          ctx.lineTo(fx2, fy2);
          ctx.stroke();
          // Occasional secondary branch
          if (texRng() > 0.6) {
            ctx.beginPath();
            ctx.moveTo(fx2, fy2);
            ctx.lineTo(fx2 + (texRng() - 0.5) * 6, fy2 + 2 + texRng() * 3);
            ctx.stroke();
          }
        }
      }

      // Scree/talud dots (altNorm 0.30–0.70, wider range, more dots)
      if (curr.altNorm >= 0.30 && curr.altNorm <= 0.70) {
        const nDots = 4 + Math.floor(texRng() * 4);
        for (let d = 0; d < nDots; d++) {
          const dx = lerpVal(curr.center.x - 10, curr.right ? curr.right.x : midX + 10, texRng());
          const dy = lerpVal(curr.center.y, next.center.y, texRng());
          const dr = 0.5 + texRng() * 1.5;
          // Vary scree color between warm and cool greys
          const scrLum = 70 + Math.floor(texRng() * 30);
          ctx.fillStyle = `rgba(${scrLum},${scrLum - 5},${scrLum - 10},${texAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(dx, dy, dr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow sastrugi texture (snow-covered areas)
      if (curr.strip.snowCover > 0.2) {
        ctx.strokeStyle = `rgba(240,245,255,${texAlpha * curr.strip.snowCover})`;
        ctx.lineWidth = 0.6;
        const nCurves = 2 + Math.floor(texRng() * 2);
        for (let s = 0; s < nCurves; s++) {
          const sx = lerpVal(curr.center.x, curr.right ? curr.right.x : midX + 15, 0.15 + texRng() * 0.5);
          const sy = lerpVal(curr.center.y, next.center.y, texRng());
          ctx.beginPath();
          ctx.moveTo(sx - 5, sy);
          ctx.quadraticCurveTo(sx, sy - 2 - texRng() * 2.5, sx + 5 + texRng() * 4, sy + texRng() * 2);
          ctx.stroke();
        }
        // Wind-sculpted snow ripples (additional sastrugi detail)
        if (curr.strip.snowCover > 0.5) {
          ctx.strokeStyle = `rgba(220,230,250,${texAlpha * 0.3})`;
          ctx.lineWidth = 0.4;
          for (let w = 0; w < 2; w++) {
            const wx = lerpVal(curr.center.x - 5, curr.right ? curr.right.x : midX + 10, texRng());
            const wy = lerpVal(curr.center.y, next.center.y, texRng());
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.bezierCurveTo(wx + 3, wy - 1, wx + 7, wy + 1, wx + 10, wy - 0.5);
            ctx.stroke();
          }
        }
      }
    }

    // === Route trail ===
    if (i < visibleStrips.length - 2) {
      const rp = camera.project(lerpRouteX(curr.strip.z), altToY(curr.strip.baseAlt) + 0.5, curr.strip.z, canvasW, canvasH);
      const rpN = camera.project(lerpRouteX(next.strip.z), altToY(next.strip.baseAlt) + 0.5, next.strip.z, canvasW, canvasH);
      if (rp && rpN) {
        // Trail becomes narrower and less visible at altitude (less worn path)
        const trailWidth = Math.max(0.4, (1.8 - curr.altNorm * 0.8) * (1 - fogAmount));
        const trailAlpha = (0.35 - curr.altNorm * 0.1) * (1 - fogAmount);
        ctx.strokeStyle = `rgba(175,162,148,${Math.max(0.05, trailAlpha)})`;
        ctx.lineWidth = trailWidth;
        ctx.beginPath();
        ctx.moveTo(rp.x, rp.y);
        ctx.lineTo(rpN.x, rpN.y);
        ctx.stroke();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CAMP MARKERS — tents with warm glow and smoke
// ═══════════════════════════════════════════════════════════════

function drawCampMarkers(ctx, camera, canvasW, canvasH, atmosphere, time) {
  ROUTE_NODES.forEach(node => {
    if (!node.camp) return;
    const projected = camera.project(node.x + 18, altToY(node.alt) + 3, node.z, canvasW, canvasH);
    if (!projected || projected.depth > 500) return;
    const fogAmount = Math.min(projected.depth / 500, 1) * atmosphere.fogDensity;
    const alpha = Math.max(0.12, 0.75 * (1 - fogAmount));
    const size = Math.max(3, Math.min(projected.scale * 7, 16));

    ctx.save();
    const windShake = atmosphere.windStrength > 2
      ? Math.sin(time * 7 + node.z * 0.5) * (atmosphere.windStrength - 2) * 1.2
      : 0;
    ctx.translate(projected.x + windShake, projected.y);
    ctx.globalAlpha = alpha;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.2, size * 1.2, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Main tent with fabric texture ---
    // Lit face (right/sun-facing)
    const tentGradR = ctx.createLinearGradient(0, -size, size * 0.9, size * 0.15);
    tentGradR.addColorStop(0, '#e0c08a');
    tentGradR.addColorStop(0.5, '#d4a874');
    tentGradR.addColorStop(1, '#c89a68');
    ctx.fillStyle = tentGradR;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.9, size * 0.15);
    ctx.lineTo(size * 0.7, size * 0.15);
    ctx.lineTo(0, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Shadow face (left)
    const tentGradL = ctx.createLinearGradient(0, -size, -size * 0.9, size * 0.15);
    tentGradL.addColorStop(0, '#b89060');
    tentGradL.addColorStop(1, '#8a6a48');
    ctx.fillStyle = tentGradL;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.9, size * 0.15);
    ctx.lineTo(-size * 0.7, size * 0.15);
    ctx.lineTo(0, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Ridge pole seam
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = Math.max(0.4, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, -size * 0.3);
    ctx.stroke();

    // Fabric fold lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(0.3, size * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(size * 0.5, size * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(-size * 0.5, size * 0.05);
    ctx.stroke();

    // Door opening
    const doorGrad = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.15);
    doorGrad.addColorStop(0, '#5a3620');
    doorGrad.addColorStop(1, '#3a2210');
    ctx.fillStyle = doorGrad;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(-size * 0.2, size * 0.15);
    ctx.lineTo(size * 0.2, size * 0.15);
    ctx.closePath();
    ctx.fill();

    // Guy ropes (tent tensioning lines)
    ctx.strokeStyle = 'rgba(150,140,120,0.25)';
    ctx.lineWidth = Math.max(0.3, size * 0.015);
    // Left guy rope
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.15);
    ctx.lineTo(-size * 1.3, size * 0.2);
    ctx.stroke();
    // Right guy rope
    ctx.beginPath();
    ctx.moveTo(size * 0.5, -size * 0.15);
    ctx.lineTo(size * 1.3, size * 0.2);
    ctx.stroke();
    // Stake pegs (small dots at rope ends)
    ctx.fillStyle = 'rgba(120,110,100,0.3)';
    ctx.beginPath();
    ctx.arc(-size * 1.3, size * 0.2, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 1.3, size * 0.2, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Second smaller tent at base camps (higher altitude = bigger camp)
    if (node.alt > 4000 && size > 5) {
      ctx.save();
      ctx.translate(size * 1.8, size * 0.05);
      ctx.scale(0.65, 0.65);
      // Mini tent (simpler)
      ctx.fillStyle = '#b0c8d0';
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(-size * 0.8, size * 0.15);
      ctx.lineTo(size * 0.8, size * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8aabb8';
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(-size * 0.8, size * 0.15);
      ctx.lineTo(0, -size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Warm campfire glow (at night or dusk)
    if (atmosphere.ambientLight < 0.7) {
      const glowIntensity = (0.7 - atmosphere.ambientLight) / 0.45;
      const flicker = 0.8 + Math.sin(time * 5 + node.z) * 0.2;
      const glowR = size * 3.0 * flicker;
      const glowGrad = ctx.createRadialGradient(size * 0.3, size * 0.1, 0, size * 0.3, size * 0.1, glowR);
      glowGrad.addColorStop(0, `rgba(255,180,60,${0.3 * glowIntensity * flicker})`);
      glowGrad.addColorStop(0.3, `rgba(255,140,40,${0.15 * glowIntensity})`);
      glowGrad.addColorStop(0.6, `rgba(255,100,20,${0.05 * glowIntensity})`);
      glowGrad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(-glowR, -glowR + size * 0.1, glowR * 2, glowR * 2);

      // Fire flames
      const fBaseX = size * 0.3;
      const fBaseY = size * 0.1;
      for (let f = 0; f < 3; f++) {
        const fOff = Math.sin(time * 8 + f * 2.1) * size * 0.05;
        const fH = size * (0.15 + Math.sin(time * 6 + f * 1.7) * 0.06);
        const fGrad = ctx.createLinearGradient(fBaseX + fOff, fBaseY, fBaseX + fOff, fBaseY - fH);
        fGrad.addColorStop(0, `rgba(255,200,50,${0.7 * glowIntensity * flicker})`);
        fGrad.addColorStop(0.5, `rgba(255,120,20,${0.5 * glowIntensity})`);
        fGrad.addColorStop(1, `rgba(255,60,10,0)`);
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(fBaseX + fOff - size * 0.04, fBaseY);
        ctx.quadraticCurveTo(fBaseX + fOff, fBaseY - fH, fBaseX + fOff + size * 0.04, fBaseY);
        ctx.fill();
      }
      // Embers
      ctx.fillStyle = `rgba(255,180,80,${0.3 * glowIntensity})`;
      ctx.beginPath();
      ctx.arc(fBaseX, fBaseY, size * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Ground light pool
      ctx.fillStyle = `rgba(255,160,40,${0.04 * glowIntensity})`;
      ctx.beginPath();
      ctx.ellipse(fBaseX, fBaseY + size * 0.1, size * 1.5, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smoke wisps (subtle always)
    if (fogAmount < 0.6) {
      const smokeAlpha = 0.08 * (1 - fogAmount);
      for (let s = 0; s < 4; s++) {
        const sTime = time * 0.8 + s * 1.3 + node.z * 0.1;
        const sy = -size * 1.2 - Math.abs(Math.sin(sTime)) * size * 1.5 - s * size * 0.5;
        const sx = size * 0.3 + Math.sin(sTime * 1.3) * size * 0.4;
        const sr = size * (0.1 + s * 0.09);
        ctx.fillStyle = `rgba(180,180,190,${smokeAlpha * (1 - s * 0.2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  });
}

// ═══════════════════════════════════════════════════════════════
// SUMMIT FLAG — waving cloth with pole
// ═══════════════════════════════════════════════════════════════

function drawSummitFlag(ctx, camera, canvasW, canvasH, time) {
  const summit = ROUTE_NODES[ROUTE_NODES.length - 1];
  const projected = camera.project(summit.x, altToY(summit.alt) + 8, summit.z, canvasW, canvasH);
  if (!projected || projected.depth > 600) return;
  const size = Math.max(4, Math.min(projected.scale * 9, 22));

  ctx.save();
  ctx.translate(projected.x, projected.y);

  // Pole base cairn (rock pile)
  ctx.fillStyle = '#8a8078';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.35, size * 0.3, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a7068';
  ctx.beginPath();
  ctx.ellipse(-size * 0.08, size * 0.28, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pole with metallic gradient
  const poleGrad = ctx.createLinearGradient(-1, size * 0.3, 1, -size * 1.7);
  poleGrad.addColorStop(0, '#888');
  poleGrad.addColorStop(0.3, '#ccc');
  poleGrad.addColorStop(0.6, '#aaa');
  poleGrad.addColorStop(1, '#ddd');
  ctx.strokeStyle = poleGrad;
  ctx.lineWidth = Math.max(1.2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.lineTo(0, -size * 1.7);
  ctx.stroke();

  // Pole tip ornament
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath();
  ctx.arc(0, -size * 1.72, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Argentine flag — higher-fidelity waving cloth simulation
  const segments = 8;
  const flagW = size * 0.8;
  const flagH = size * 0.55;
  const topY = -size * 1.65;

  for (let seg = 0; seg < segments; seg++) {
    const t0 = seg / segments;
    const t1 = (seg + 1) / segments;
    const wave0 = Math.sin(time * 3.5 + t0 * 5) * 2.5 * t0;
    const wave1 = Math.sin(time * 3.5 + t1 * 5) * 2.5 * t1;
    const droop0 = t0 * t0 * flagH * 0.08; // Gravity droop
    const droop1 = t1 * t1 * flagH * 0.08;
    const x0 = t0 * flagW + wave0;
    const x1 = t1 * flagW + wave1;

    // Light blue stripe (top)
    ctx.fillStyle = '#75AADB';
    ctx.beginPath();
    ctx.moveTo(x0, topY + droop0);
    ctx.lineTo(x1, topY + droop1);
    ctx.lineTo(x1, topY + flagH * 0.33 + droop1);
    ctx.lineTo(x0, topY + flagH * 0.33 + droop0);
    ctx.closePath();
    ctx.fill();

    // White stripe (center)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x0, topY + flagH * 0.33 + droop0);
    ctx.lineTo(x1, topY + flagH * 0.33 + droop1);
    ctx.lineTo(x1, topY + flagH * 0.67 + droop1);
    ctx.lineTo(x0, topY + flagH * 0.67 + droop0);
    ctx.closePath();
    ctx.fill();

    // Light blue stripe (bottom)
    ctx.fillStyle = '#75AADB';
    ctx.beginPath();
    ctx.moveTo(x0, topY + flagH * 0.67 + droop0);
    ctx.lineTo(x1, topY + flagH * 0.67 + droop1);
    ctx.lineTo(x1, topY + flagH + droop1);
    ctx.lineTo(x0, topY + flagH + droop0);
    ctx.closePath();
    ctx.fill();
  }

  // Sol de Mayo (golden sun in white band center)
  const solX = flagW * 0.3 + Math.sin(time * 3.5 + 1.5) * 1.5;
  const solY = topY + flagH * 0.5 + (0.3 * 0.3 * flagH * 0.08);
  const solR = flagH * 0.1;
  // Sun disc
  ctx.fillStyle = '#F6B40E';
  ctx.beginPath();
  ctx.arc(solX, solY, solR, 0, Math.PI * 2);
  ctx.fill();
  // Sun rays (simplified)
  ctx.strokeStyle = '#F6B40E';
  ctx.lineWidth = Math.max(0.3, size * 0.015);
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(solX + Math.cos(angle) * solR * 1.2, solY + Math.sin(angle) * solR * 1.2);
    ctx.lineTo(solX + Math.cos(angle) * solR * 2.0, solY + Math.sin(angle) * solR * 2.0);
    ctx.stroke();
  }

  // Flag shadow/fold depth
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = Math.max(0.3, size * 0.01);
  for (let seg = 1; seg < segments; seg++) {
    const t = seg / segments;
    const wv = Math.sin(time * 3.5 + t * 5) * 2.5 * t;
    const dp = t * t * flagH * 0.08;
    const sx = t * flagW + wv;
    ctx.beginPath();
    ctx.moveTo(sx, topY + dp);
    ctx.lineTo(sx, topY + flagH + dp);
    ctx.stroke();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// FOOTPRINT TRAIL
// ═══════════════════════════════════════════════════════════════

function drawFootprints(ctx, camera, canvasW, canvasH, trail, atmosphere) {
  for (const tp of trail) {
    if (tp.age > 6) continue;
    const p = camera.project(tp.x, tp.y + 0.3, tp.z, canvasW, canvasH);
    if (!p || p.depth > 400) continue;
    const fogAmount = Math.min(p.depth / 400, 1) * atmosphere.fogDensity;
    const alpha = Math.max(0, 0.15 * (1 - tp.age / 6) * (1 - fogAmount));
    if (alpha < 0.01) continue;
    const r = Math.max(0.8, p.scale * 1.2);
    ctx.fillStyle = `rgba(80,70,60,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(p.x - r * 0.5, p.y, r * 0.4, r * 0.15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.5, p.y, r * 0.4, r * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════
// ATMOSPHERE — enhanced with cloud layers & altitude effects
// ═══════════════════════════════════════════════════════════════

function getAtmosphere(minutesOfDay, weatherSeverity, visibility, altitudeNorm) {
  const hour = (minutesOfDay || 360) / 60;
  const isNight = hour < 5.5 || hour > 20;
  const isDawn = hour >= 5.5 && hour < 7;
  const isDusk = hour >= 18 && hour < 20;

  let skyTop, skyMid, skyBottom, fogColor, ambientLight;
  if (isNight) {
    skyTop = { r: 3, g: 5, b: 15 };
    skyMid = { r: 8, g: 12, b: 28 };
    skyBottom = { r: 15, g: 20, b: 38 };
    fogColor = { r: 8, g: 12, b: 22 };
    ambientLight = 0.22;
  } else if (isDawn) {
    const t = (hour - 5.5) / 1.5;
    skyTop = { r: lerpVal(10, 45, t), g: lerpVal(12, 65, t), b: lerpVal(35, 120, t) };
    skyMid = { r: lerpVal(30, 160, t), g: lerpVal(18, 110, t), b: lerpVal(45, 85, t) };
    skyBottom = { r: lerpVal(50, 220, t), g: lerpVal(30, 160, t), b: lerpVal(55, 100, t) };
    fogColor = { r: lerpVal(18, 170, t), g: lerpVal(15, 130, t), b: lerpVal(30, 105, t) };
    ambientLight = lerpVal(0.28, 0.85, t);
  } else if (isDusk) {
    const t = (hour - 18) / 2;
    skyTop = { r: lerpVal(50, 15, t), g: lerpVal(65, 12, t), b: lerpVal(120, 35, t) };
    skyMid = { r: lerpVal(180, 50, t), g: lerpVal(100, 30, t), b: lerpVal(70, 45, t) };
    skyBottom = { r: lerpVal(220, 90, t), g: lerpVal(150, 45, t), b: lerpVal(100, 55, t) };
    fogColor = { r: lerpVal(150, 25, t), g: lerpVal(110, 20, t), b: lerpVal(85, 35, t) };
    ambientLight = lerpVal(0.85, 0.28, t);
  } else {
    const midT = smoothstep(7, 12, hour) * (1 - smoothstep(15, 18, hour));
    skyTop = { r: lerpVal(45, 35, midT), g: lerpVal(65, 65, midT), b: lerpVal(120, 148, midT) };
    skyMid = { r: lerpVal(100, 120, midT), g: lerpVal(130, 155, midT), b: lerpVal(170, 200, midT) };
    skyBottom = { r: lerpVal(140, 160, midT), g: lerpVal(170, 185, midT), b: lerpVal(210, 225, midT) };
    fogColor = { r: 155, g: 175, b: 205 };
    ambientLight = 1.0;
  }

  const weather = Math.max(0, Math.min(weatherSeverity || 0, 4));
  const vis = Math.max(0, Math.min(visibility || 3, 4));
  const fogDensity = 0.25 + (weather / 4) * 0.45 + ((4 - vis) / 4) * 0.22;

  // Altitude thins atmosphere: deeper blue sky, less haze
  const altFactor = altitudeNorm * 0.18;
  skyTop.r = Math.max(0, skyTop.r - altFactor * 35);
  skyTop.g = Math.max(0, skyTop.g - altFactor * 25);
  skyTop.b = Math.min(255, skyTop.b + altFactor * 12);

  const hasSnow = altitudeNorm > 0.5 || weather >= 3;
  const hasDust = altitudeNorm < 0.45 && weather >= 1;
  const windStrength = weather * 0.6 + (altitudeNorm > 0.55 ? 1.8 : 0);

  // Cloud density from weather
  const cloudDensity = Math.min(1, weather * 0.25 + (altitudeNorm > 0.6 ? 0.15 : 0));

  return {
    skyTop, skyMid, skyBottom, fogColor, fogDensity,
    ambientLight, isNight, isDawn, isDusk,
    hasSnow, hasDust, windStrength, hour,
    cloudDensity,
  };
}

// ═══════════════════════════════════════════════════════════════
// SKY RENDERER — stars, Milky Way, moon, sun, clouds
// ═══════════════════════════════════════════════════════════════

function drawSky(ctx, canvasW, canvasH, atmosphere, time) {
  const { skyTop, skyMid, skyBottom, isNight, hour } = atmosphere;

  // Multi-stop sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
  grad.addColorStop(0, rgbStr(skyTop));
  grad.addColorStop(0.35, rgbStr(skyMid));
  grad.addColorStop(0.65, rgbStr(skyBottom));
  grad.addColorStop(1, rgbStr(lerpColor(skyBottom, { r: 0, g: 0, b: 0 }, 0.35)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // === Stars & Milky Way ===
  if (isNight || hour < 6.5 || hour > 19) {
    const starAlpha = isNight ? 0.75 : smoothstep(6.5, 5.5, hour) + smoothstep(19, 20, hour);
    const rng = seededRng(123);

    // Milky Way band — faint diagonal wash
    if (starAlpha > 0.3) {
      const mwGrad = ctx.createLinearGradient(canvasW * 0.2, 0, canvasW * 0.8, canvasH * 0.45);
      mwGrad.addColorStop(0, `rgba(180,190,210,0)`);
      mwGrad.addColorStop(0.3, `rgba(180,190,210,${0.04 * starAlpha})`);
      mwGrad.addColorStop(0.5, `rgba(190,200,220,${0.06 * starAlpha})`);
      mwGrad.addColorStop(0.7, `rgba(180,190,210,${0.04 * starAlpha})`);
      mwGrad.addColorStop(1, `rgba(180,190,210,0)`);
      ctx.fillStyle = mwGrad;
      ctx.save();
      ctx.translate(canvasW * 0.5, canvasH * 0.2);
      ctx.rotate(-0.3);
      ctx.fillRect(-canvasW * 0.6, -canvasH * 0.06, canvasW * 1.2, canvasH * 0.12);
      ctx.restore();
    }

    // Star field — layered sizes for depth
    for (let i = 0; i < 80; i++) {
      const sx = rng() * canvasW;
      const sy = rng() * canvasH * 0.55;
      const magnitude = rng();
      const sr = magnitude < 0.7 ? (0.2 + rng() * 0.6) : (0.8 + rng() * 1.2);
      const twinkle = 0.4 + Math.sin(time * (1.5 + rng() * 2) + i * 0.7) * 0.6;
      // Star color temperature variation
      const temp = rng();
      const sr2 = temp < 0.3 ? 200 : temp < 0.7 ? 210 : 240;
      const sg = temp < 0.3 ? 210 : temp < 0.7 ? 220 : 230;
      const sb = temp < 0.3 ? 240 : temp < 0.7 ? 230 : 210;
      ctx.fillStyle = `rgba(${sr2},${sg},${sb},${starAlpha * twinkle * (0.3 + magnitude * 0.7)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      // Bright stars get a subtle cross-spike
      if (sr > 1.0 && twinkle > 0.7) {
        const spike = sr * 2;
        ctx.strokeStyle = `rgba(${sr2},${sg},${sb},${starAlpha * 0.15})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx - spike, sy);
        ctx.lineTo(sx + spike, sy);
        ctx.moveTo(sx, sy - spike);
        ctx.lineTo(sx, sy + spike);
        ctx.stroke();
      }
    }

    // === Moon ===
    if (starAlpha > 0.2) {
      const moonX = canvasW * 0.82;
      const moonY = canvasH * 0.12;
      const moonR = Math.max(6, canvasW * 0.02);

      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4);
      moonGlow.addColorStop(0, `rgba(200,210,230,${0.12 * starAlpha})`);
      moonGlow.addColorStop(0.5, `rgba(180,195,220,${0.05 * starAlpha})`);
      moonGlow.addColorStop(1, 'rgba(180,195,220,0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);

      // Moon disc
      ctx.fillStyle = `rgba(220,225,235,${0.85 * starAlpha})`;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Moon crescent shadow (phase)
      ctx.fillStyle = `rgba(15,20,35,${0.6 * starAlpha})`;
      ctx.beginPath();
      ctx.arc(moonX + moonR * 0.3, moonY - moonR * 0.1, moonR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Subtle mare (dark patches)
      ctx.fillStyle = `rgba(160,165,180,${0.3 * starAlpha})`;
      ctx.beginPath();
      ctx.arc(moonX - moonR * 0.2, moonY + moonR * 0.1, moonR * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Sun with corona ===
  if (!isNight) {
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunX = canvasW * 0.2 + Math.cos(sunAngle) * canvasW * 0.35;
    const sunY = canvasH * 0.35 - Math.sin(sunAngle) * canvasH * 0.32;

    // Large corona glow
    const coronaR = Math.max(30, canvasW * 0.06);
    const corona = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, coronaR);
    corona.addColorStop(0, 'rgba(255,248,230,0.5)');
    corona.addColorStop(0.15, 'rgba(255,240,200,0.3)');
    corona.addColorStop(0.4, 'rgba(255,220,160,0.1)');
    corona.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = corona;
    ctx.fillRect(sunX - coronaR, sunY - coronaR, coronaR * 2, coronaR * 2);

    // Sun disc
    ctx.fillStyle = 'rgba(255,250,235,0.85)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.max(4, canvasW * 0.012), 0, Math.PI * 2);
    ctx.fill();

    // === Alpenglow at dawn/dusk ===
    if (atmosphere.isDawn || atmosphere.isDusk) {
      const glowT = atmosphere.isDawn
        ? smoothstep(5.5, 6.5, hour)
        : (1 - smoothstep(18, 19.5, hour));
      const glowGrad = ctx.createLinearGradient(0, canvasH * 0.3, 0, canvasH * 0.7);
      glowGrad.addColorStop(0, `rgba(255,150,80,${0.08 * glowT})`);
      glowGrad.addColorStop(0.5, `rgba(255,120,60,${0.05 * glowT})`);
      glowGrad.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, canvasH * 0.3, canvasW, canvasH * 0.4);
    }

    // === God rays / crepuscular rays ===
    if (atmosphere.isDawn || atmosphere.isDusk || (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      const rayT = atmosphere.isDawn
        ? smoothstep(5.5, 7, hour) * (1 - smoothstep(7, 9, hour))
        : smoothstep(16, 18, hour) * (1 - smoothstep(18, 20, hour));
      if (rayT > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const rayRng = seededRng(789);
        const numRays = 5;
        for (let r = 0; r < numRays; r++) {
          const rayAngle = (rayRng() - 0.5) * 0.6 + sunAngle;
          const rayLen = canvasH * (0.4 + rayRng() * 0.3);
          const rayWidth = canvasW * (0.02 + rayRng() * 0.03);
          const rayAlpha = rayT * (0.03 + rayRng() * 0.03);
          ctx.fillStyle = `rgba(255,240,200,${rayAlpha})`;
          ctx.beginPath();
          ctx.moveTo(sunX - rayWidth, sunY);
          ctx.lineTo(sunX + rayWidth, sunY);
          ctx.lineTo(sunX + Math.cos(rayAngle + 0.5) * rayLen, sunY + rayLen);
          ctx.lineTo(sunX + Math.cos(rayAngle - 0.5) * rayLen, sunY + rayLen);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // === Shooting stars (night only, rare) ===
  if (isNight) {
    const shootRng = seededRng(Math.floor(time * 8));
    if (shootRng() < 0.015) { // ~1.5% per frame-group
      const sx = shootRng() * canvasW * 0.8 + canvasW * 0.1;
      const sy = shootRng() * canvasH * 0.3;
      const sAngle = 0.5 + shootRng() * 0.8;
      const sLen = 15 + shootRng() * 25;
      const sGrad = ctx.createLinearGradient(sx, sy, sx + Math.cos(sAngle) * sLen, sy + Math.sin(sAngle) * sLen);
      sGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
      sGrad.addColorStop(0.5, 'rgba(200,210,240,0.3)');
      sGrad.addColorStop(1, 'rgba(180,200,240,0)');
      ctx.strokeStyle = sGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(sAngle) * sLen, sy + Math.sin(sAngle) * sLen);
      ctx.stroke();
    }
  }

  // === Atmospheric gradient band at horizon ===
  const horizonY = canvasH * 0.62;
  const bandH = canvasH * 0.06;
  const bandGrad = ctx.createLinearGradient(0, horizonY - bandH, 0, horizonY + bandH);
  bandGrad.addColorStop(0, 'rgba(0,0,0,0)');
  if (isNight) {
    bandGrad.addColorStop(0.5, 'rgba(30,40,70,0.08)');
  } else if (atmosphere.isDawn || atmosphere.isDusk) {
    bandGrad.addColorStop(0.5, 'rgba(180,120,80,0.06)');
  } else {
    bandGrad.addColorStop(0.5, 'rgba(160,180,210,0.05)');
  }
  bandGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, horizonY - bandH, canvasW, bandH * 2);

  // === Cloud layers ===
  if (atmosphere.cloudDensity > 0.05) {
    drawClouds(ctx, canvasW, canvasH, atmosphere, time);
  }
}

// ═══════════════════════════════════════════════════════════════
// CLOUD LAYERS
// ═══════════════════════════════════════════════════════════════

function drawClouds(ctx, canvasW, canvasH, atmosphere, time) {
  const rng = seededRng(456);
  const density = atmosphere.cloudDensity;
  const numClouds = Math.floor(4 + density * 8);

  for (let i = 0; i < numClouds; i++) {
    const baseX = rng() * canvasW;
    const baseY = canvasH * (0.15 + rng() * 0.35);
    const cloudW = 40 + rng() * 80;
    const cloudH = 8 + rng() * 16;
    const drift = Math.sin(time * 0.15 + i * 2) * 15 + time * (2 + rng() * 3);
    const x = (baseX + drift) % (canvasW + cloudW * 2) - cloudW;

    const alpha = (0.08 + density * 0.15) * atmosphere.ambientLight;

    // Lit/shadow based on sun position
    const col = atmosphere.ambientLight > 0.5
      ? `rgba(220,225,235,${alpha})`
      : `rgba(140,150,170,${alpha * 0.7})`;

    ctx.fillStyle = col;
    // Multi-ellipse cloud shape
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p++) {
      const px = x + (p / puffs) * cloudW - cloudW * 0.1;
      const py = baseY + (rng() - 0.5) * cloudH * 0.5;
      const pr = cloudH * (0.5 + rng() * 0.6);
      ctx.beginPath();
      ctx.ellipse(px, py, pr * 1.8, pr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES RENDERING — enhanced
// ═══════════════════════════════════════════════════════════════

function drawParticles(ctx, particles, atmosphere) {
  particles.forEach(p => {
    if (p.type === 'snow') {
      const alpha = p.opacity * atmosphere.ambientLight;
      ctx.fillStyle = `rgba(225,232,242,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'wind') {
      // Wind streaks — elongated lines
      const alpha = p.opacity * 0.25;
      ctx.strokeStyle = `rgba(190,200,215,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.length, p.y + Math.sin(p.life * 0.04) * 2);
      ctx.stroke();
    } else {
      // Dust motes — slightly warm-tinted
      const alpha = p.opacity * 0.25;
      ctx.fillStyle = `rgba(170,150,125,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// VOLUMETRIC FOG OVERLAY — depth-based atmospheric haze
// ═══════════════════════════════════════════════════════════════

function drawFogOverlay(ctx, canvasW, canvasH, atmosphere) {
  if (atmosphere.fogDensity < 0.15) return;
  const { fogColor, fogDensity } = atmosphere;
  // Lower-screen fog bank
  const fogGrad = ctx.createLinearGradient(0, canvasH * 0.4, 0, canvasH);
  fogGrad.addColorStop(0, `rgba(${fogColor.r},${fogColor.g},${fogColor.b},0)`);
  fogGrad.addColorStop(0.5, `rgba(${fogColor.r},${fogColor.g},${fogColor.b},${fogDensity * 0.08})`);
  fogGrad.addColorStop(1, `rgba(${fogColor.r},${fogColor.g},${fogColor.b},${fogDensity * 0.18})`);
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, canvasH * 0.4, canvasW, canvasH * 0.6);
}

// ═══════════════════════════════════════════════════════════════
// CINEMATIC ALTITUDE HUD
// ═══════════════════════════════════════════════════════════════

function drawAltitudeHUD(ctx, canvasW, canvasH, positionIndex, atmosphere, state) {
  const node = ROUTE_NODES[clampIdx(positionIndex)];
  const alpha = 0.5 * atmosphere.ambientLight + 0.15;
  ctx.save();
  const fontSize = Math.max(9, canvasW * 0.02);
  const smFont = Math.max(7, canvasW * 0.015);
  const altNorm = (node.alt - ALT_MIN) / ALT_RANGE;

  // === Altitude gauge (left edge, 70% canvas height) ===
  const gaugeX = 10;
  const gaugeTop = canvasH * 0.12;
  const gaugeH = canvasH * 0.70;
  const gaugeW = 4;

  // Track background
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.2})`;
  ctx.fillRect(gaugeX, gaugeTop, gaugeW, gaugeH);

  // Color zones: green bottom 30%, amber 30-70%, red top 30%
  const greenH = gaugeH * 0.3;
  const amberH = gaugeH * 0.4;
  const redH = gaugeH * 0.3;
  ctx.fillStyle = `rgba(80,180,80,${alpha * 0.35})`;
  ctx.fillRect(gaugeX, gaugeTop + gaugeH - greenH, gaugeW, greenH);
  ctx.fillStyle = `rgba(210,170,60,${alpha * 0.35})`;
  ctx.fillRect(gaugeX, gaugeTop + redH, gaugeW, amberH);
  ctx.fillStyle = `rgba(200,60,60,${alpha * 0.35})`;
  ctx.fillRect(gaugeX, gaugeTop, gaugeW, redH);

  // Camp tick marks
  for (const rn of ROUTE_NODES) {
    if (!rn.camp) continue;
    const campNorm = (rn.alt - ALT_MIN) / ALT_RANGE;
    const cy = gaugeTop + gaugeH * (1 - campNorm);
    ctx.fillStyle = `rgba(210,180,140,${alpha * 0.6})`;
    ctx.fillRect(gaugeX + gaugeW, cy - 1, 6, 2);
  }

  // Position dot (smoothly animated via altNorm)
  const posY = gaugeTop + gaugeH * (1 - altNorm);
  ctx.fillStyle = `rgba(255,100,60,${alpha})`;
  ctx.beginPath();
  ctx.arc(gaugeX + gaugeW / 2, posY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Highest reached triangle
  if (state && state.highestIndex != null) {
    const hNode = ROUTE_NODES[clampIdx(state.highestIndex)];
    const hNorm = (hNode.alt - ALT_MIN) / ALT_RANGE;
    const hY = gaugeTop + gaugeH * (1 - hNorm);
    ctx.fillStyle = `rgba(255,220,100,${alpha * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(gaugeX + gaugeW + 8, hY);
    ctx.lineTo(gaugeX + gaugeW + 14, hY - 3);
    ctx.lineTo(gaugeX + gaugeW + 14, hY + 3);
    ctx.closePath();
    ctx.fill();
  }

  // === Info overlay (bottom-left) ===
  const infoX = 9;
  let infoY = canvasH - 8;

  // Background panel
  const panelH = fontSize * 3.8;
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.25})`;
  ctx.fillRect(4, canvasH - panelH - 4, canvasW * 0.22, panelH);

  ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = `rgba(210,218,228,${alpha})`;
  ctx.textAlign = 'left';
  ctx.fillText(`${node.alt}m`, infoX, infoY);
  infoY -= fontSize * 1.25;

  // Time of day (HH:MM)
  if (state && state.minutesOfDay != null) {
    const totalMin = Math.round(state.minutesOfDay);
    const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    ctx.font = `400 ${smFont}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = `rgba(190,200,215,${alpha * 0.85})`;
    ctx.fillText(`${hh}:${mm}`, infoX, infoY);
    infoY -= smFont * 1.3;
  }

  // Weather severity dots (1-4 filled circles)
  if (state && state.weatherSeverity != null) {
    const ws = Math.round(Math.max(0, Math.min(state.weatherSeverity, 4)));
    for (let d = 0; d < 4; d++) {
      const dx = infoX + d * (smFont * 0.7);
      ctx.fillStyle = d < ws
        ? `rgba(230,180,80,${alpha})`
        : `rgba(120,125,130,${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(dx + smFont * 0.25, infoY - smFont * 0.35, smFont * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    infoY -= smFont * 1.1;
  }

  // Trend arrow
  if (state && state._prevAltNorm != null) {
    const diff = altNorm - state._prevAltNorm;
    if (Math.abs(diff) > 0.005) {
      ctx.font = `700 ${smFont}px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = diff > 0 ? `rgba(100,200,120,${alpha})` : `rgba(200,120,100,${alpha})`;
      ctx.fillText(diff > 0 ? '▲' : '▼', infoX, infoY);
    }
  }

  // === Summit distance arc (top of canvas) ===
  const progressFraction = ROUTE_NODES.length > 1 ? positionIndex / (ROUTE_NODES.length - 1) : 0;
  const arcCX = canvasW * 0.5;
  const arcCY = 6;
  const arcR = canvasW * 0.3;
  // Background arc
  ctx.strokeStyle = `rgba(120,130,140,${alpha * 0.15})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(arcCX, arcCY, arcR, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();
  // Progress arc
  if (progressFraction > 0) {
    ctx.strokeStyle = `rgba(255,180,80,${alpha * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const startAngle = 0.1 * Math.PI;
    const endAngle = startAngle + progressFraction * 0.8 * Math.PI;
    ctx.arc(arcCX, arcCY, arcR, startAngle, endAngle, false);
    ctx.stroke();
  }

  // Store altitude norm for trend arrow next frame
  if (state) state._prevAltNorm = altNorm;

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// POST-PROCESSING PASSES
// ═══════════════════════════════════════════════════════════════

function drawPostProcessing(ctx, canvasW, canvasH, atmosphere, time, transitionMgr, state) {
  // a) Enhanced vignette — multi-stop radial with subtle warm edge
  const vigRadius = Math.max(canvasW, canvasH) * 0.75;
  const vigGrad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, vigRadius * 0.35, canvasW / 2, canvasH / 2, vigRadius);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.7, 'rgba(0,0,0,0.02)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.09)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // a2) Warm edge tint (subtle photographic lens character)
  const warmVig = ctx.createRadialGradient(canvasW / 2, canvasH / 2, vigRadius * 0.5, canvasW / 2, canvasH / 2, vigRadius);
  warmVig.addColorStop(0, 'rgba(0,0,0,0)');
  warmVig.addColorStop(1, 'rgba(40,20,10,0.03)');
  ctx.fillStyle = warmVig;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // b) Film grain (organic, varied density and luminance)
  const grainSeed = Math.floor(time * 60);
  const grainRng = seededRng(grainSeed);
  const grainStep = Math.max(8, Math.floor(canvasW / 50));
  for (let gy = 0; gy < canvasH; gy += grainStep) {
    for (let gx = 0; gx < canvasW; gx += grainStep) {
      const rv = grainRng();
      if (rv > 0.45) {
        const grainLum = 70 + Math.floor(grainRng() * 110);
        const grainAlpha = 0.015 + grainRng() * 0.018;
        ctx.fillStyle = `rgba(${grainLum},${grainLum},${grainLum},${grainAlpha})`;
        ctx.fillRect(gx, gy, grainStep, grainStep);
      }
    }
  }

  // b2) Chromatic aberration — subtle radial color fringe (lens simulation)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const caMargin = Math.max(20, canvasW * 0.08);
  const caAlpha = 0.012;
  // Radial: red shift outer-left/bottom, blue shift outer-right/top
  const caGradL = ctx.createLinearGradient(0, 0, caMargin * 1.5, 0);
  caGradL.addColorStop(0, `rgba(180,30,0,${caAlpha})`);
  caGradL.addColorStop(1, 'rgba(180,30,0,0)');
  ctx.fillStyle = caGradL;
  ctx.fillRect(0, 0, caMargin * 1.5, canvasH);

  const caGradR = ctx.createLinearGradient(canvasW, 0, canvasW - caMargin * 1.5, 0);
  caGradR.addColorStop(0, `rgba(0,30,200,${caAlpha})`);
  caGradR.addColorStop(1, 'rgba(0,30,200,0)');
  ctx.fillStyle = caGradR;
  ctx.fillRect(canvasW - caMargin * 1.5, 0, caMargin * 1.5, canvasH);

  const caGradT = ctx.createLinearGradient(0, 0, 0, caMargin * 0.8);
  caGradT.addColorStop(0, `rgba(0,80,180,${caAlpha * 0.5})`);
  caGradT.addColorStop(1, 'rgba(0,80,180,0)');
  ctx.fillStyle = caGradT;
  ctx.fillRect(0, 0, canvasW, caMargin * 0.8);

  const caGradB = ctx.createLinearGradient(0, canvasH, 0, canvasH - caMargin * 0.8);
  caGradB.addColorStop(0, `rgba(180,60,0,${caAlpha * 0.5})`);
  caGradB.addColorStop(1, 'rgba(180,60,0,0)');
  ctx.fillStyle = caGradB;
  ctx.fillRect(0, canvasH - caMargin * 0.8, canvasW, caMargin * 0.8);
  ctx.restore();

  // c) Color grading by altitude/hour — cinematic LUT-style per-band
  const altNorm = state ? (ROUTE_NODES[clampIdx(state.positionIndex)].alt - ALT_MIN) / ALT_RANGE : 0;
  // Golden hour warm tint (enhanced)
  if (atmosphere.isDawn || atmosphere.isDusk) {
    const ghIntensity = atmosphere.isDawn
      ? smoothstep(5.5, 6.5, atmosphere.hour)
      : (1 - smoothstep(18, 20, atmosphere.hour));
    ctx.fillStyle = `rgba(255,170,90,${0.04 + ghIntensity * 0.03})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Warm shadows
    ctx.fillStyle = `rgba(120,50,20,${0.02 * ghIntensity})`;
    ctx.fillRect(0, canvasH * 0.5, canvasW, canvasH * 0.5);
  }
  // Night cool shift — blue-teal for mountain night feel
  if (atmosphere.isNight) {
    ctx.fillStyle = 'rgba(30,50,110,0.06)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Subtle teal in shadows
    ctx.fillStyle = 'rgba(20,60,80,0.03)';
    ctx.fillRect(0, canvasH * 0.4, canvasW, canvasH * 0.6);
  }
  // High-altitude desaturation and slight purple shift (oxygen deprivation)
  if (altNorm > 0.7) {
    const desatAlpha = (altNorm - 0.7) * 0.14;
    ctx.fillStyle = `rgba(175,180,200,${desatAlpha})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Cold purple tint at extreme altitude
    if (altNorm > 0.85) {
      ctx.fillStyle = `rgba(100,80,140,${(altNorm - 0.85) * 0.08})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }
  // Mid-day harsh light with slight contrast boost
  if (!atmosphere.isNight && !atmosphere.isDawn && !atmosphere.isDusk && atmosphere.hour >= 10 && atmosphere.hour <= 14) {
    ctx.fillStyle = 'rgba(255,252,235,0.025)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Slight shadow deepening at midday
    ctx.fillStyle = 'rgba(0,0,20,0.012)';
    ctx.fillRect(0, canvasH * 0.55, canvasW, canvasH * 0.45);
  }
  // Approach-altitude warmth (valley golden-green)
  if (altNorm < 0.3) {
    ctx.fillStyle = `rgba(200,180,100,${(0.3 - altNorm) * 0.02})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // d) Bloom on sun/moon (enhanced multi-radius)
  if (!atmosphere.isNight) {
    const sunAngle = ((atmosphere.hour - 6) / 12) * Math.PI;
    const sunX = canvasW * 0.2 + Math.cos(sunAngle) * canvasW * 0.35;
    const sunY = canvasH * 0.35 - Math.sin(sunAngle) * canvasH * 0.32;
    // Outer bloom
    const bloomR = Math.max(60, canvasW * 0.12);
    const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, bloomR);
    bloom.addColorStop(0, 'rgba(255,250,220,0.07)');
    bloom.addColorStop(0.2, 'rgba(255,245,200,0.04)');
    bloom.addColorStop(0.5, 'rgba(255,235,180,0.02)');
    bloom.addColorStop(1, 'rgba(255,225,160,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(sunX - bloomR, sunY - bloomR, bloomR * 2, bloomR * 2);
    // Inner bright bloom
    const innerR = bloomR * 0.3;
    const innerBloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, innerR);
    innerBloom.addColorStop(0, 'rgba(255,252,240,0.08)');
    innerBloom.addColorStop(1, 'rgba(255,248,230,0)');
    ctx.fillStyle = innerBloom;
    ctx.fillRect(sunX - innerR, sunY - innerR, innerR * 2, innerR * 2);

    // e) Lens flare when sun is high and bright
    if (atmosphere.hour >= 8 && atmosphere.hour <= 16) {
      const flareIntensity = Math.sin(((atmosphere.hour - 8) / 8) * Math.PI) * 0.3;
      if (flareIntensity > 0.05) {
        // Line from sun through center to opposite edge
        const cx = canvasW / 2;
        const cy = canvasH / 2;
        const dx = cx - sunX;
        const dy = cy - sunY;
        // 3-4 ghost flares along the line
        const ghostPositions = [0.3, 0.55, 0.7, 0.9];
        const ghostColors = [
          [255, 200, 100],
          [100, 180, 255],
          [255, 150, 200],
          [150, 255, 200],
        ];
        for (let g = 0; g < ghostPositions.length; g++) {
          const gx = sunX + dx * ghostPositions[g] * 2;
          const gy = sunY + dy * ghostPositions[g] * 2;
          const gr = Math.max(3, canvasW * (0.008 + g * 0.004));
          const [fr, fg, fb] = ghostColors[g];
          const fAlpha = flareIntensity * (0.04 - g * 0.008);
          if (fAlpha > 0.005) {
            const flareGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
            flareGrad.addColorStop(0, `rgba(${fr},${fg},${fb},${fAlpha})`);
            flareGrad.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
            ctx.fillStyle = flareGrad;
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  } else {
    // Moonlight bloom during night — enhanced with glow ring
    const moonX = canvasW * 0.7;
    const moonY = canvasH * 0.18;
    const moonBloomR = Math.max(50, canvasW * 0.1);
    const moonBloom = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonBloomR);
    moonBloom.addColorStop(0, 'rgba(180,200,240,0.05)');
    moonBloom.addColorStop(0.3, 'rgba(160,185,225,0.03)');
    moonBloom.addColorStop(0.6, 'rgba(140,170,210,0.01)');
    moonBloom.addColorStop(1, 'rgba(130,160,200,0)');
    ctx.fillStyle = moonBloom;
    ctx.fillRect(moonX - moonBloomR, moonY - moonBloomR, moonBloomR * 2, moonBloomR * 2);
    // Moon halo ring
    ctx.strokeStyle = 'rgba(180,200,230,0.02)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonBloomR * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // f) Depth-of-field approximation — soft blur on edges via gradient bands
  const dofMargin = canvasH * 0.08;
  // Top foreground blur band
  const dofTop = ctx.createLinearGradient(0, 0, 0, dofMargin);
  dofTop.addColorStop(0, 'rgba(0,0,0,0.04)');
  dofTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dofTop;
  ctx.fillRect(0, 0, canvasW, dofMargin);
  // Bottom foreground blur band
  const dofBot = ctx.createLinearGradient(0, canvasH - dofMargin, 0, canvasH);
  dofBot.addColorStop(0, 'rgba(0,0,0,0)');
  dofBot.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = dofBot;
  ctx.fillRect(0, canvasH - dofMargin, canvasW, dofMargin);

  // Transition-driven overlays
  if (transitionMgr) {
    // Sleep dimming with starfield overlay
    if (transitionMgr.dimLevel > 0) {
      ctx.fillStyle = `rgba(0,0,10,${transitionMgr.dimLevel})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    // Red edge flash (collapse) — pulsing ring
    if (transitionMgr.redFlashAlpha > 0) {
      const rfGrad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, vigRadius * 0.4, canvasW / 2, canvasH / 2, vigRadius);
      rfGrad.addColorStop(0, 'rgba(200,30,30,0)');
      rfGrad.addColorStop(0.7, `rgba(200,30,30,${transitionMgr.redFlashAlpha * 0.5})`);
      rfGrad.addColorStop(1, `rgba(180,20,20,${transitionMgr.redFlashAlpha})`);
      ctx.fillStyle = rfGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    // Fatigue/exposure vignette — multi-ring with color-coded severity
    if (transitionMgr.vignetteAlpha > 0) {
      const { r: vr, g: vg, b: vb } = transitionMgr.vignetteColor;
      const vGrad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, vigRadius * 0.3, canvasW / 2, canvasH / 2, vigRadius);
      vGrad.addColorStop(0, `rgba(${vr},${vg},${vb},0)`);
      vGrad.addColorStop(0.6, `rgba(${vr},${vg},${vb},${transitionMgr.vignetteAlpha * 0.3})`);
      vGrad.addColorStop(1, `rgba(${vr},${vg},${vb},${transitionMgr.vignetteAlpha})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// VISUAL SOUND CUES
// ═══════════════════════════════════════════════════════════════

function drawVisualSoundCues(ctx, canvasW, canvasH, atmosphere, time, camera, climber) {
  // Wind intensity streaks (full-width horizontal white streaks)
  if (atmosphere.windStrength > 1.5) {
    const numStreaks = Math.floor((atmosphere.windStrength - 1.5) * 4);
    const streakRng = seededRng(Math.floor(time * 30));
    ctx.strokeStyle = `rgba(220,225,240,${0.06 + (atmosphere.windStrength - 1.5) * 0.03})`;
    ctx.lineWidth = 0.5;
    for (let s = 0; s < numStreaks; s++) {
      const sy = streakRng() * canvasH;
      const sx = streakRng() * canvasW * 0.3;
      const sw = canvasW * (0.3 + streakRng() * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sw, sy + (streakRng() - 0.5) * 4);
      ctx.stroke();
    }
  }

  // Pressure pulse ring around climber
  if (atmosphere.weatherSeverity > 0) {
    const proj = camera.project(climber.worldX, climber.worldY, climber.worldZ, canvasW, canvasH);
    if (proj && proj.depth < 500) {
      const pulseSpeed = 1.5 + atmosphere.weatherSeverity * 1.0;
      const pulsePhase = (time * pulseSpeed) % 1;
      const pulseR = 8 + pulsePhase * 18;
      const pulseAlpha = (1 - pulsePhase) * 0.08 * atmosphere.weatherSeverity;
      ctx.strokeStyle = `rgba(200,210,230,${pulseAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, pulseR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SMOOTH WEATHER TRANSITION
// ═══════════════════════════════════════════════════════════════

function lerpAtmosphere(current, target, t) {
  if (!current) return target;
  const out = {};
  const colorKeys = ['skyTop', 'skyMid', 'skyBottom', 'fogColor'];
  for (const key of colorKeys) {
    out[key] = lerpColor(current[key], target[key], t);
  }
  const numKeys = ['fogDensity', 'ambientLight', 'windStrength', 'cloudDensity', 'hour'];
  for (const key of numKeys) {
    out[key] = lerpVal(current[key] ?? 0, target[key] ?? 0, t);
  }
  out.isNight = target.isNight;
  out.isDawn = target.isDawn;
  out.isDusk = target.isDusk;
  out.hasSnow = target.hasSnow;
  out.hasDust = target.hasDust;
  out.weatherSeverity = target.weatherSeverity ?? 0;
  out.visibility = target.visibility ?? 3;
  return out;
}

function drawLightningFlash(ctx, canvasW, canvasH, weatherSeverity, time) {
  if (weatherSeverity < 3) return;
  // ~5% chance per frame — use time + a scrambled counter for non-repeating sequences
  const flashRng = seededRng(Math.floor(time * 600) ^ 0xA5A5);
  if (flashRng() > 0.05) return;
  const flashAlpha = 0.15 + flashRng() * 0.2;
  ctx.fillStyle = `rgba(240,245,255,${flashAlpha})`;
  ctx.fillRect(0, 0, canvasW, canvasH * 0.55);
}

function drawWhiteoutOverlay(ctx, canvasW, canvasH, visibility, climberProj) {
  if (visibility > 1) return;
  ctx.save();
  const whiteAlpha = 0.3 + (1 - visibility) * 0.25;
  ctx.fillStyle = `rgba(220,225,240,${whiteAlpha})`;
  ctx.fillRect(0, 0, canvasW, canvasH);
  // Cut out a silhouette around the climber
  if (climberProj) {
    const clearR = 20 + visibility * 15;
    const clearGrad = ctx.createRadialGradient(
      climberProj.x, climberProj.y, clearR * 0.3,
      climberProj.x, climberProj.y, clearR
    );
    clearGrad.addColorStop(0, `rgba(220,225,240,${whiteAlpha})`);
    clearGrad.addColorStop(1, 'rgba(220,225,240,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = clearGrad;
    ctx.beginPath();
    ctx.arc(climberProj.x, climberProj.y, clearR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

let _state = null;

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

/**
 * Build the 3D mountain view canvas inside the given container.
 * Removes any previous visualization before creating a new one.
 *
 * @param {HTMLElement} container
 * @param {Array} [runtimeNodes] — normalized route nodes from normalizeRouteData(),
 *   each having { id, altitudeMeters, isCamp }. When provided the visualization
 *   waypoints are derived from this data so the climber/terrain always match the
 *   live route state regardless of node count. Falls back to the last computed
 *   ROUTE_NODES if omitted (e.g. re-init without a fresh data load).
 * @param {Object} [options] — optional configuration
 * @param {string} [options.characterId] — ID of the selected character for
 *   per-character visual styling (jacket color, build, skin tone, etc.)
 */
export function initMountainVisualization(container, runtimeNodes, options = {}) {
  if (!container) return;

  // Rebuild ROUTE_NODES from runtime data when provided
  if (runtimeNodes && runtimeNodes.length > 0) {
    ROUTE_NODES = computeVizWaypoints(runtimeNodes);
    ALT_MIN  = Math.min(...ROUTE_NODES.map(n => n.alt));
    ALT_MAX  = Math.max(...ROUTE_NODES.map(n => n.alt));
    ALT_RANGE = ALT_MAX - ALT_MIN || 1;
  }

  if (ROUTE_NODES.length === 0) {
    if (typeof console !== 'undefined') {
      console.warn('[mountain-visualization] initMountainVisualization called with no route nodes — visualization skipped.');
    }
    return;
  }

  destroyMountainVisualization();
  const existing = container.querySelector('.mountain-viz-canvas');
  if (existing) existing.remove();
  const legacySvg = container.querySelector('.mountain-viz-svg');
  if (legacySvg) legacySvg.remove();

  const canvas = document.createElement('canvas');
  canvas.className = 'mountain-viz-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.insertBefore(canvas, container.firstChild);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const camera = new Camera();
  const climber = new Climber(options.characterId);
  const transitionMgr = new TransitionManager();
  const terrainStrips = generateTerrainStrips(160); // More strips for detail
  const backdropRng = seededRng(333);
  const backdrop = generateBackdropRidges(backdropRng);

  const rng = seededRng(777);
  const particles = [];

  const state = {
    canvas, ctx, camera, climber, transitionMgr, terrainStrips, backdrop, particles, rng,
    positionIndex: 0,
    highestIndex: 0,
    minutesOfDay: 360,
    weatherSeverity: 0,
    visibility: 3,
    animationId: null,
    lastTime: performance.now(),
    time: 0,
    reducedMotion: prefersReducedMotion(),
    destroyed: false,
    _resizeObserver: null,
    // Smooth weather transition state
    _currentAtmosphere: null,
    _targetAtmosphere: null,
    // Climber body state for transition effects
    currentAction: 'wait',
    fatigueLevel: 0,
    exposureLevel: 0,
    // Altitude tracking for trend arrow
    _prevAltNorm: null,
  };
  _state = state;

  camera.followClimber(climber.worldX, climber.worldY, climber.worldZ);
  camera.x = camera.targetX;
  camera.y = camera.targetY;
  camera.z = camera.targetZ;

  function resize() {
    if (state.destroyed) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  // Particles — more for richer atmosphere
  for (let i = 0; i < PARTICLE_SNOW_COUNT; i++) particles.push(new Particle(canvas.width, canvas.height, 'snow', rng));
  for (let i = 0; i < PARTICLE_WIND_COUNT; i++) particles.push(new Particle(canvas.width, canvas.height, 'wind', rng));
  for (let i = 0; i < PARTICLE_DUST_COUNT; i++) particles.push(new Particle(canvas.width, canvas.height, 'dust', rng));
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  state._resizeObserver = resizeObserver;

  function frame(now) {
    if (state.destroyed) return;
    state.animationId = requestAnimationFrame(frame);

    const rawDt = (now - state.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1);
    state.lastTime = now;
    state.time += dt;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const canvasW = rect.width;
    const canvasH = rect.height;

    // Update transition manager
    transitionMgr.update(dt, camera, state.reducedMotion);

    climber.update(dt);
    camera.followClimber(climber.worldX, climber.worldY, climber.worldZ);
    camera.update(dt, state.time);

    const posIdx = clampIdx(state.positionIndex);
    const altNorm = (ROUTE_NODES[posIdx].alt - ALT_MIN) / ALT_RANGE;

    // Smooth weather: compute target, then lerp toward it
    const targetAtmo = getAtmosphere(state.minutesOfDay, state.weatherSeverity, state.visibility, altNorm);
    // Inject extra data needed downstream
    targetAtmo.weatherSeverity = state.weatherSeverity;
    targetAtmo.visibility = state.visibility;
    state._targetAtmosphere = targetAtmo;
    const weatherLerpSpeed = state.reducedMotion ? 1 : Math.min(dt * 2.5, 1);
    state._currentAtmosphere = lerpAtmosphere(state._currentAtmosphere, state._targetAtmosphere, weatherLerpSpeed);
    const atmosphere = state._currentAtmosphere;

    // Wind spike from transition
    if (transitionMgr.isWindSpiking()) {
      atmosphere.windStrength = Math.min(4, atmosphere.windStrength + 1.5);
    }
    // Fog-clear from descend transition
    if (transitionMgr.isFogClearing()) {
      atmosphere.fogDensity = Math.max(0.1, atmosphere.fogDensity * 0.7);
    }
    // Cloud timelapse speed multiplier applied to cloud drawing time
    const effectiveTime = state.time;
    const cloudTime = state.time * transitionMgr.cloudSpeedMult;

    if (!state.reducedMotion) {
      particles.forEach(p => {
        const shouldShow =
          (p.type === 'snow' && atmosphere.hasSnow) ||
          (p.type === 'dust' && atmosphere.hasDust) ||
          (p.type === 'wind');
        if (shouldShow) {
          p.update(canvasW, canvasH, atmosphere.windStrength, rng);
        } else {
          p.reset(canvasW, canvasH, rng, true);
        }
      });
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Render pipeline (back → front)
    drawSky(ctx, canvasW, canvasH, atmosphere, cloudTime);
    drawBackdrop(ctx, canvasW, canvasH, backdrop, atmosphere);
    drawTerrain(ctx, camera, terrainStrips, canvasW, canvasH, atmosphere, effectiveTime);
    drawFootprints(ctx, camera, canvasW, canvasH, climber.trail, atmosphere);
    drawCampMarkers(ctx, camera, canvasW, canvasH, atmosphere, effectiveTime);
    drawSummitFlag(ctx, camera, canvasW, canvasH, effectiveTime);
    if (!state.reducedMotion) drawParticles(ctx, particles, atmosphere);
    climber.draw(ctx, camera, canvasW, canvasH, atmosphere);
    drawFogOverlay(ctx, canvasW, canvasH, atmosphere);

    // Weather effects: lightning flash and whiteout
    if (!state.reducedMotion) {
      drawLightningFlash(ctx, canvasW, canvasH, state.weatherSeverity, effectiveTime);
      const climberProj = camera.project(climber.worldX, climber.worldY, climber.worldZ, canvasW, canvasH);
      drawWhiteoutOverlay(ctx, canvasW, canvasH, state.visibility, climberProj);
    }

    drawAltitudeHUD(ctx, canvasW, canvasH, state.positionIndex, atmosphere, state);

    // Post-processing passes (after HUD, before frame ends)
    if (!state.reducedMotion) {
      drawPostProcessing(ctx, canvasW, canvasH, atmosphere, effectiveTime, transitionMgr, state);
      drawVisualSoundCues(ctx, canvasW, canvasH, atmosphere, effectiveTime, camera, climber);
    }
  }

  state.animationId = requestAnimationFrame(frame);
}

/**
 * Update the climber position on the mountain.
 *
 * @param {number} positionIndex — index into the runtime POSITIONS array (0 … n-1)
 * @param {object} [options]
 * @param {number} [options.highestIndex] — highest position reached
 * @param {number} [options.minutesOfDay] — current time of day (0–1440)
 * @param {number} [options.weatherSeverity] — weather severity (0–4)
 * @param {number} [options.visibility] — visibility level (0–4)
 * @param {string} [options.action] — current action ('advance'|'advance_slowly'|'descend'|'wait'|'sleep')
 * @param {string[]} [options.flags] — event flags ('white-wind-hit'|'collapse')
 * @param {number} [options.fatigue] — fatigue level (0–100)
 * @param {number} [options.exposure] — exposure level (0–100)
 */
export function updateClimberPosition(positionIndex, options = {}) {
  if (!_state) return;
  const idx = clampIdx(positionIndex);
  _state.positionIndex = idx;
  _state.climber.setTarget(idx);
  if (options.highestIndex != null) _state.highestIndex = options.highestIndex;
  if (options.minutesOfDay != null) _state.minutesOfDay = options.minutesOfDay;
  if (options.weatherSeverity != null) _state.weatherSeverity = options.weatherSeverity;
  if (options.visibility != null) _state.visibility = options.visibility;

  // Post-decision transition triggers
  if (options.action != null) {
    _state.currentAction = options.action;
    _state.climber.currentAction = options.action;
    _state.transitionMgr.triggerAction(options.action);
  }
  if (options.flags) {
    _state.transitionMgr.triggerFlags(options.flags);
  }
  if (options.fatigue != null) {
    _state.fatigueLevel = options.fatigue;
    _state.climber.fatigueLevel = options.fatigue;
  }
  if (options.exposure != null) {
    _state.exposureLevel = options.exposure;
  }
  // Update body state vignettes
  _state.transitionMgr.setBodyState(
    _state.fatigueLevel,
    _state.exposureLevel
  );

  _state.reducedMotion = prefersReducedMotion();
}

/**
 * Tear down the visualization and release resources.
 */
export function destroyMountainVisualization() {
  if (!_state) return;
  _state.destroyed = true;
  if (_state.animationId) cancelAnimationFrame(_state.animationId);
  if (_state._resizeObserver) _state._resizeObserver.disconnect();
  _state = null;
}
