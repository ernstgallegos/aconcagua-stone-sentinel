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
//   initMountainVisualization(container, runtimeNodes) — build canvas, start render loop
//   updateClimberPosition(positionIndex, options)      — move climber + camera
//   destroyMountainVisualization()                     — stop loop, clean up

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
    const relX = worldX - this.x + this.sway;
    const relY = worldY - this.y;
    const relZ = worldZ - this.z;
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
// CLIMBER — high-detail animated figure with altitude-aware gear
// ═══════════════════════════════════════════════════════════════

class Climber {
  constructor() {
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
    const walkSpeed = 8 - this.fatigueFactor * 3;
    if (this.isMoving) {
      this.walkCycle += dt * walkSpeed;
    } else {
      this.walkCycle *= 0.92;
    }
    // Heavier breathing at altitude
    this.breathCycle += dt * (1.5 + this.fatigueFactor * 1.0);

    // Drop trail markers
    this.trailTimer += dt;
    if (this.isMoving && this.trailTimer > 0.15) {
      this.trailTimer = 0;
      this.trail.push({ x: this.worldX, y: this.worldY, z: this.worldZ, age: 0 });
      if (this.trail.length > 40) this.trail.shift();
    }
    for (const tp of this.trail) tp.age += dt;
  }

  draw(ctx, camera, canvasW, canvasH, atmosphere) {
    const projected = camera.project(this.worldX, this.worldY, this.worldZ, canvasW, canvasH);
    if (!projected || projected.depth > 600) return;
    const { x, y, scale } = projected;
    const size = Math.max(8, Math.min(scale * 14, 48));

    ctx.save();
    ctx.translate(x, y);

    const breathAmp = 0.8 + this.fatigueFactor * 0.6;
    const breathBob = Math.sin(this.breathCycle) * breathAmp;
    const legSwing = this.isMoving ? Math.sin(this.walkCycle) * 0.4 : 0;
    const armSwing = this.isMoving ? Math.sin(this.walkCycle + Math.PI) * 0.35 : 0;
    const bodyBob = this.isMoving ? Math.abs(Math.sin(this.walkCycle * 2)) * 1.8 : 0;
    const altNorm = ALT_RANGE > 0 ? (lerpRouteAlt(this.worldZ) - ALT_MIN) / ALT_RANGE : 0;

    const h = size;
    const headR = h * 0.13;
    const torsoH = h * 0.34;
    const legH = h * 0.36;

    // Ground shadow — elongated in sun direction
    const shadowAlpha = atmosphere.ambientLight * 0.25;
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(h * 0.03, 0, h * 0.28, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Legs ===
    const legY = -torsoH + breathBob - bodyBob;
    const legColor = altNorm > 0.7 ? '#3a3a4a' : '#4a3828';
    ctx.strokeStyle = legColor;
    ctx.lineWidth = Math.max(1.8, h * 0.065);
    ctx.lineCap = 'round';
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-h * 0.06, legY);
    ctx.lineTo(-h * 0.06 + legSwing * h * 0.22, legY + legH);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(h * 0.06, legY);
    ctx.lineTo(h * 0.06 - legSwing * h * 0.22, legY + legH);
    ctx.stroke();

    // Boots — heavier at altitude (mountaineering boots)
    const bootSize = Math.max(2.5, h * (altNorm > 0.6 ? 0.065 : 0.05));
    ctx.fillStyle = '#1e1510';
    ctx.fillRect(-h * 0.06 + legSwing * h * 0.22 - bootSize / 2, legY + legH - 1, bootSize, bootSize * 0.8);
    ctx.fillRect(h * 0.06 - legSwing * h * 0.22 - bootSize / 2, legY + legH - 1, bootSize, bootSize * 0.8);

    // Gaiter detail at altitude
    if (altNorm > 0.55) {
      ctx.fillStyle = '#c94433';
      const gW = bootSize * 0.7;
      ctx.fillRect(-h * 0.06 + legSwing * h * 0.22 - gW / 2, legY + legH - bootSize, gW, bootSize * 0.5);
      ctx.fillRect(h * 0.06 - legSwing * h * 0.22 - gW / 2, legY + legH - bootSize, gW, bootSize * 0.5);
    }

    // === Torso (jacket with gradient) ===
    const torsoY = -torsoH - headR * 2 + breathBob - bodyBob;
    // Red jacket with subtle gradient for depth
    const jacketGrad = ctx.createLinearGradient(-h * 0.12, torsoY, h * 0.12, torsoY + torsoH);
    jacketGrad.addColorStop(0, '#b83d2e');
    jacketGrad.addColorStop(0.5, '#d44a38');
    jacketGrad.addColorStop(1, '#a03528');
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

    // Jacket zipper line
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = Math.max(0.5, h * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, torsoY + 2);
    ctx.lineTo(0, torsoY + torsoH - 2);
    ctx.stroke();

    // Jacket highlight (sun side)
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, torsoY + torsoH);
    ctx.lineTo(-h * 0.13, torsoY + h * 0.02);
    ctx.lineTo(-h * 0.03, torsoY);
    ctx.lineTo(-h * 0.02, torsoY + torsoH);
    ctx.closePath();
    ctx.fill();

    // === Backpack with detail ===
    ctx.fillStyle = '#5a3820';
    const bpW = h * 0.16;
    const bpH = torsoH * 0.75;
    const bpX = -bpW / 2 + h * 0.015;
    ctx.beginPath();
    ctx.moveTo(bpX, torsoY + 2);
    ctx.lineTo(bpX + bpW, torsoY + 2);
    ctx.lineTo(bpX + bpW - 1, torsoY + bpH);
    ctx.lineTo(bpX + 1, torsoY + bpH);
    ctx.closePath();
    ctx.fill();
    // Backpack straps
    ctx.strokeStyle = '#4a2e18';
    ctx.lineWidth = Math.max(0.7, h * 0.02);
    ctx.beginPath();
    ctx.moveTo(bpX + 2, torsoY + 3);
    ctx.lineTo(-h * 0.08, torsoY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bpX + bpW - 2, torsoY + 3);
    ctx.lineTo(h * 0.08, torsoY);
    ctx.stroke();
    // Sleeping mat roll on pack
    ctx.fillStyle = '#6b7a55';
    ctx.beginPath();
    ctx.ellipse(bpX + bpW / 2, torsoY + bpH + 1, bpW * 0.4, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Arms ===
    ctx.strokeStyle = '#c94433';
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
      ctx.fillStyle = '#222';
      const gloveR = Math.max(1.5, h * 0.03);
      ctx.beginPath();
      ctx.arc(-h * 0.19 + armSwing * h * 0.15, torsoY + torsoH * 0.72, gloveR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(h * 0.19 - armSwing * h * 0.15, torsoY + torsoH * 0.72, gloveR, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Trekking pole / Ice axe ===
    const poleHandX = h * 0.19 - armSwing * h * 0.15;
    const poleHandY = torsoY + torsoH * 0.72;
    if (altNorm > 0.75) {
      // Ice axe at extreme altitude
      ctx.strokeStyle = '#9a9a9a';
      ctx.lineWidth = Math.max(1, h * 0.025);
      ctx.beginPath();
      ctx.moveTo(poleHandX, poleHandY);
      ctx.lineTo(poleHandX + h * 0.04, poleHandY + legH * 0.7);
      ctx.stroke();
      // Axe head
      ctx.strokeStyle = '#778';
      ctx.lineWidth = Math.max(1.2, h * 0.03);
      ctx.beginPath();
      ctx.moveTo(poleHandX - h * 0.04, poleHandY - h * 0.01);
      ctx.lineTo(poleHandX + h * 0.04, poleHandY + h * 0.01);
      ctx.stroke();
    } else {
      // Trekking pole
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
    const headY = torsoY - headR * 0.8 + breathBob - bodyBob;
    // Neck
    ctx.fillStyle = '#c99a6a';
    ctx.fillRect(-h * 0.025, torsoY - h * 0.02, h * 0.05, headR * 0.6);
    // Face
    ctx.fillStyle = '#d4a874';
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
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, headY, headR * 1.08, 0, Math.PI * 2);
      ctx.fill();
      // Eye slit
      ctx.fillStyle = '#d4a874';
      ctx.fillRect(-headR * 0.5, headY - headR * 0.15, headR, headR * 0.3);
    } else {
      // Beanie
      ctx.fillStyle = '#2a4060';
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.2, headR * 1.08, Math.PI, Math.PI * 2);
      ctx.fill();
      // Beanie fold line
      ctx.strokeStyle = '#1e3050';
      ctx.lineWidth = Math.max(0.5, h * 0.012);
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.05, headR * 1.02, Math.PI + 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();

      // Sunglasses
      if (altNorm > 0.3 && atmosphere.ambientLight > 0.4) {
        ctx.fillStyle = '#1a1a1a';
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
      // Lamp on forehead
      ctx.fillStyle = '#ff0';
      const lampR = Math.max(1, headR * 0.2);
      ctx.beginPath();
      ctx.arc(0, headY - headR * 0.7, lampR, 0, Math.PI * 2);
      ctx.fill();
      // Light beam cone
      const beamGrad = ctx.createRadialGradient(0, headY - headR, 0, 0, headY - headR, h * 1.2);
      beamGrad.addColorStop(0, 'rgba(255,240,180,0.12)');
      beamGrad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-h * 0.05, headY - headR);
      ctx.lineTo(-h * 0.3, headY + h * 0.5);
      ctx.lineTo(h * 0.3, headY + h * 0.5);
      ctx.lineTo(h * 0.05, headY - headR);
      ctx.closePath();
      ctx.fill();
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
    const sunAngle = atmosphere.hour ? ((atmosphere.hour - 6) / 12) : 0.5;
    const sunDir = Math.cos(sunAngle * Math.PI) * 0.15;
    const shadowShade = 0.62 + 0.18 * (1 - fogAmount) - sunDir;
    const lightShade = Math.min(0.72 + 0.28 * (1 - fogAmount) + sunDir, 1.05);

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
    ctx.translate(projected.x, projected.y);
    ctx.globalAlpha = alpha;

    // Tent body — more detailed shape
    ctx.fillStyle = '#d4a874';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.9, size * 0.15);
    ctx.lineTo(-size * 0.7, size * 0.15);
    ctx.lineTo(0, -size * 0.3);
    ctx.lineTo(size * 0.7, size * 0.15);
    ctx.lineTo(size * 0.9, size * 0.15);
    ctx.closePath();
    ctx.fill();

    // Tent shadow side
    ctx.fillStyle = '#9a7a5a';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.9, size * 0.15);
    ctx.lineTo(-size * 0.7, size * 0.15);
    ctx.lineTo(0, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Tent door
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(-size * 0.2, size * 0.15);
    ctx.lineTo(size * 0.2, size * 0.15);
    ctx.closePath();
    ctx.fill();

    // Warm campfire glow (at night or dusk)
    if (atmosphere.ambientLight < 0.7) {
      const glowIntensity = (0.7 - atmosphere.ambientLight) / 0.45;
      const flicker = 0.8 + Math.sin(time * 5 + node.z) * 0.2;
      const glowR = size * 2.5 * flicker;
      const glowGrad = ctx.createRadialGradient(size * 0.3, size * 0.1, 0, size * 0.3, size * 0.1, glowR);
      glowGrad.addColorStop(0, `rgba(255,180,60,${0.25 * glowIntensity * flicker})`);
      glowGrad.addColorStop(0.5, `rgba(255,120,30,${0.1 * glowIntensity})`);
      glowGrad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(-glowR, -glowR + size * 0.1, glowR * 2, glowR * 2);

      // Tiny fire
      ctx.fillStyle = `rgba(255,160,40,${0.6 * glowIntensity * flicker})`;
      ctx.beginPath();
      ctx.arc(size * 0.3, size * 0.1, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smoke wisps (subtle always)
    if (fogAmount < 0.6) {
      const smokeAlpha = 0.08 * (1 - fogAmount);
      for (let s = 0; s < 3; s++) {
        const sTime = time * 0.8 + s * 1.5 + node.z * 0.1;
        const sy = -size * 1.2 - Math.abs(Math.sin(sTime)) * size * 1.5 - s * size * 0.5;
        const sx = size * 0.3 + Math.sin(sTime * 1.3) * size * 0.4;
        const sr = size * (0.1 + s * 0.08);
        ctx.fillStyle = `rgba(180,180,190,${smokeAlpha * (1 - s * 0.25)})`;
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

  // Pole
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = Math.max(1.2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.lineTo(0, -size * 1.6);
  ctx.stroke();

  // Pole tip
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.arc(0, -size * 1.6, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Argentine flag — waving cloth simulation
  const segments = 6;
  const flagW = size * 0.7;
  const flagH = size * 0.5;
  for (let seg = 0; seg < segments; seg++) {
    const t0 = seg / segments;
    const t1 = (seg + 1) / segments;
    const wave0 = Math.sin(time * 3.5 + t0 * 4) * 2 * t0;
    const wave1 = Math.sin(time * 3.5 + t1 * 4) * 2 * t1;
    const x0 = t0 * flagW + wave0;
    const x1 = t1 * flagW + wave1;
    const topY = -size * 1.55;

    // Light blue stripe
    ctx.fillStyle = '#75AADB';
    ctx.beginPath();
    ctx.moveTo(x0, topY);
    ctx.lineTo(x1, topY);
    ctx.lineTo(x1, topY + flagH * 0.33);
    ctx.lineTo(x0, topY + flagH * 0.33);
    ctx.closePath();
    ctx.fill();

    // White stripe
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x0, topY + flagH * 0.33);
    ctx.lineTo(x1, topY + flagH * 0.33);
    ctx.lineTo(x1, topY + flagH * 0.67);
    ctx.lineTo(x0, topY + flagH * 0.67);
    ctx.closePath();
    ctx.fill();

    // Light blue stripe
    ctx.fillStyle = '#75AADB';
    ctx.beginPath();
    ctx.moveTo(x0, topY + flagH * 0.67);
    ctx.lineTo(x1, topY + flagH * 0.67);
    ctx.lineTo(x1, topY + flagH);
    ctx.lineTo(x0, topY + flagH);
    ctx.closePath();
    ctx.fill();
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
  }

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
// ALTITUDE HUD — refined
// ═══════════════════════════════════════════════════════════════

function drawAltitudeHUD(ctx, canvasW, canvasH, positionIndex, atmosphere) {
  const node = ROUTE_NODES[clampIdx(positionIndex)];
  const alpha = 0.5 * atmosphere.ambientLight + 0.15;
  ctx.save();
  const fontSize = Math.max(9, canvasW * 0.02);
  ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`;

  // Subtle backdrop for readability
  const textW = ctx.measureText(`${node.alt}m`).width;
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.25})`;
  ctx.fillRect(4, canvasH - fontSize - 10, textW + 10, fontSize + 6);

  ctx.fillStyle = `rgba(210,218,228,${alpha})`;
  ctx.textAlign = 'left';
  ctx.fillText(`${node.alt}m`, 9, canvasH - 8);
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
 */
export function initMountainVisualization(container, runtimeNodes) {
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
  const climber = new Climber();
  const terrainStrips = generateTerrainStrips(160); // More strips for detail
  const backdropRng = seededRng(333);
  const backdrop = generateBackdropRidges(backdropRng);

  const rng = seededRng(777);
  const particles = [];

  const state = {
    canvas, ctx, camera, climber, terrainStrips, backdrop, particles, rng,
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

    climber.update(dt);
    camera.followClimber(climber.worldX, climber.worldY, climber.worldZ);
    camera.update(dt, state.time);

    const posIdx = clampIdx(state.positionIndex);
    const altNorm = (ROUTE_NODES[posIdx].alt - ALT_MIN) / ALT_RANGE;
    const atmosphere = getAtmosphere(state.minutesOfDay, state.weatherSeverity, state.visibility, altNorm);

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
    drawSky(ctx, canvasW, canvasH, atmosphere, state.time);
    drawBackdrop(ctx, canvasW, canvasH, backdrop, atmosphere);
    drawTerrain(ctx, camera, terrainStrips, canvasW, canvasH, atmosphere, state.time);
    drawFootprints(ctx, camera, canvasW, canvasH, climber.trail, atmosphere);
    drawCampMarkers(ctx, camera, canvasW, canvasH, atmosphere, state.time);
    drawSummitFlag(ctx, camera, canvasW, canvasH, state.time);
    if (!state.reducedMotion) drawParticles(ctx, particles, atmosphere);
    climber.draw(ctx, camera, canvasW, canvasH, atmosphere);
    drawFogOverlay(ctx, canvasW, canvasH, atmosphere);
    drawAltitudeHUD(ctx, canvasW, canvasH, state.positionIndex, atmosphere);
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
