// ui/helpers/mountain-visualization.js
//
// Canvas2D pseudo-3D third-person mountain visualization for the gameplay screen.
// Renders a perspective terrain view with a climber figure walking along the
// Normal Route from Horcones (2950m) to Summit (6962m).
//
// Inspired by the visual language of third-person expedition games (Death Stranding,
// etc.) — this is an MVP proof-of-concept: procedural terrain with perspective
// projection, a walking climber silhouette, atmospheric fog/particles, and
// day-cycle lighting. Zero external dependencies — pure Canvas2D.
//
// Public API (same contract as previous SVG version):
//   initMountainVisualization(container)  — build canvas, start render loop
//   updateClimberPosition(positionIndex, options) — move climber + camera
//   destroyMountainVisualization()        — stop loop, clean up

// ═══════════════════════════════════════════════════════════════
// ROUTE DATA — 15 waypoints matching data/nodes.json routeIndex 0–14
// Each has world-space x/z (horizontal progress / depth) and altitude y.
// ═══════════════════════════════════════════════════════════════
// Coordinates modelled on the real Ruta Normal profile:
// - Long gentle approach through the Horcones valley (~22km, 1400m gain)
// - Steeper upper mountain from Plaza de Mulas (~10km, 2600m gain)
// - La Travesía traverse visible as lateral movement near summit
// - x = lateral offset (winding path), z = depth along route
const ROUTE_NODES = [
  { id: 'horcones',              alt: 2950, camp: false, x: 0,    z: 0    },
  { id: 'horcones_lagoon',       alt: 3050, camp: false, x: 25,   z: 85   },
  { id: 'approach_confluencia',  alt: 3390, camp: true,  x: 65,   z: 300  },
  { id: 'cuesta_brava',          alt: 4000, camp: false, x: 40,   z: 520  },
  { id: 'base_plaza_mulas',      alt: 4350, camp: true,  x: 10,   z: 750  },
  { id: 'piedras_conway',        alt: 4750, camp: false, x: -15,  z: 880  },
  { id: 'camp_canada',           alt: 5050, camp: true,  x: -25,  z: 970  },
  { id: 'cambio_pendiente',      alt: 5300, camp: false, x: -10,  z: 1050 },
  { id: 'camp_nido_condores',    alt: 5560, camp: true,  x: 5,    z: 1120 },
  { id: 'balcon_amarillo',       alt: 5800, camp: false, x: 15,   z: 1180 },
  { id: 'camp_colera',           alt: 5970, camp: true,  x: 5,    z: 1230 },
  { id: 'portezuelo_viento',     alt: 6500, camp: false, x: -15,  z: 1310 },
  { id: 'travesia',              alt: 6630, camp: false, x: -45,  z: 1370 },
  { id: 'canaleta',              alt: 6700, camp: false, x: -25,  z: 1420 },
  { id: 'summit',                alt: 6962, camp: false, x: 0,    z: 1500 },
];

const ALT_MIN = 2950;
const ALT_MAX = 6962;
const ALT_RANGE = ALT_MAX - ALT_MIN;

function altToY(alt) {
  return ((alt - ALT_MIN) / ALT_RANGE) * 180;
}

// ═══════════════════════════════════════════════════════════════
// TERRAIN — procedural ridgelines from route data
// ═══════════════════════════════════════════════════════════════

function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function generateTerrainStrips(numStrips) {
  const rng = seededRng(42);
  const maxZ = ROUTE_NODES[ROUTE_NODES.length - 1].z + 200;
  const strips = [];

  for (let i = 0; i <= numStrips; i++) {
    const z = (i / numStrips) * maxZ;
    let prevNode = ROUTE_NODES[0];
    let nextNode = ROUTE_NODES[ROUTE_NODES.length - 1];
    for (let n = 0; n < ROUTE_NODES.length - 1; n++) {
      if (z >= ROUTE_NODES[n].z && z <= ROUTE_NODES[n + 1].z) {
        prevNode = ROUTE_NODES[n];
        nextNode = ROUTE_NODES[n + 1];
        break;
      }
    }
    const t = nextNode.z === prevNode.z ? 0 : (z - prevNode.z) / (nextNode.z - prevNode.z);
    const baseAlt = prevNode.alt + (nextNode.alt - prevNode.alt) * t;
    const routeX = prevNode.x + (nextNode.x - prevNode.x) * t;
    // Ridge heights shrink at altitude (wide valley → narrow summit ridge)
    const altNorm = (baseAlt - ALT_MIN) / ALT_RANGE;
    const ridgeScale = 1.0 - altNorm * 0.6;
    const variation = rng() * 400 - 200;
    const leftAlt = baseAlt + (200 + variation + rng() * 300) * ridgeScale;
    const rightAlt = baseAlt + (150 + rng() * 400 - 100) * ridgeScale;
    strips.push({ z, baseAlt, leftAlt, rightAlt, routeX });
  }
  return strips;
}

// ═══════════════════════════════════════════════════════════════
// CAMERA — perspective projection
// ═══════════════════════════════════════════════════════════════

class Camera {
  constructor() {
    this.x = 0;
    this.y = 80;
    this.z = -120;
    this.targetX = 0;
    this.targetY = 80;
    this.targetZ = -120;
    this.fov = 280;
    this.tilt = 0.35;
  }
  update(dt) {
    const speed = Math.min(dt * 2.5, 1);
    this.x += (this.targetX - this.x) * speed;
    this.y += (this.targetY - this.y) * speed;
    this.z += (this.targetZ - this.z) * speed;
  }
  project(worldX, worldY, worldZ, canvasW, canvasH) {
    const relX = worldX - this.x;
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
// PARTICLES — wind, snow, dust
// ═══════════════════════════════════════════════════════════════

class Particle {
  constructor(canvasW, canvasH, type, rng) {
    this.type = type;
    this.reset(canvasW, canvasH, rng, true);
  }
  reset(canvasW, canvasH, rng, initial = false) {
    this.x = rng() * canvasW;
    this.y = initial ? rng() * canvasH : -5;
    this.size = 1 + rng() * 2;
    this.speed = 0.3 + rng() * 1.2;
    this.opacity = 0.15 + rng() * 0.35;
    this.drift = (rng() - 0.5) * 0.8;
    this.life = 0;
    this.maxLife = 200 + rng() * 400;
  }
  update(canvasW, canvasH, windStrength, rng) {
    this.life++;
    if (this.type === 'snow') {
      this.y += this.speed;
      this.x += this.drift + windStrength * 0.5 + Math.sin(this.life * 0.02) * 0.3;
    } else if (this.type === 'wind') {
      this.x += this.speed * 2 + windStrength;
      this.y += Math.sin(this.life * 0.05) * 0.3;
    } else {
      this.x += this.drift + windStrength * 0.3;
      this.y += this.speed * 0.3;
    }
    if (this.y > canvasH + 10 || this.x > canvasW + 10 || this.x < -10 || this.life > this.maxLife) {
      this.reset(canvasW, canvasH, rng);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CLIMBER — animated walking figure
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
  }
  setTarget(nodeIdx) {
    const idx = Math.max(0, Math.min(nodeIdx, ROUTE_NODES.length - 1));
    const node = ROUTE_NODES[idx];
    if (node.z > this.targetZ + 1) this.facingDir = 1;
    else if (node.z < this.targetZ - 1) this.facingDir = -1;
    this.targetZ = node.z;
    this.isMoving = true;
  }
  update(dt) {
    const speed = Math.min(dt * 1.8, 1);
    const prevZ = this.worldZ;
    this.worldZ += (this.targetZ - this.worldZ) * speed;
    // Derive X and Y from the route path at current Z — guarantees climber stays on terrain
    this.worldX = lerpRouteX(this.worldZ);
    this.worldY = altToY(lerpRouteAlt(this.worldZ));
    const dist = Math.abs(this.worldZ - prevZ);
    this.isMoving = dist > 0.1;
    if (this.isMoving) {
      this.walkCycle += dt * 8;
    } else {
      this.walkCycle *= 0.9;
    }
    this.breathCycle += dt * 1.5;
  }
  draw(ctx, camera, canvasW, canvasH) {
    const projected = camera.project(this.worldX, this.worldY, this.worldZ, canvasW, canvasH);
    if (!projected || projected.depth > 600) return;
    const { x, y, scale } = projected;
    const size = Math.max(8, Math.min(scale * 12, 40));

    ctx.save();
    ctx.translate(x, y);

    const breathBob = Math.sin(this.breathCycle) * 0.8;
    const legSwing = this.isMoving ? Math.sin(this.walkCycle) * 0.4 : 0;
    const armSwing = this.isMoving ? Math.sin(this.walkCycle + Math.PI) * 0.35 : 0;
    const bodyBob = this.isMoving ? Math.abs(Math.sin(this.walkCycle * 2)) * 1.5 : 0;
    const h = size;
    const headR = h * 0.12;
    const torsoH = h * 0.35;
    const legH = h * 0.35;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0, h * 0.25, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    const legY = -torsoH + breathBob - bodyBob;
    ctx.strokeStyle = '#4a3828';
    ctx.lineWidth = Math.max(1.5, h * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-h * 0.06, legY);
    ctx.lineTo(-h * 0.06 + legSwing * h * 0.2, legY + legH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h * 0.06, legY);
    ctx.lineTo(h * 0.06 - legSwing * h * 0.2, legY + legH);
    ctx.stroke();

    // Boots
    ctx.fillStyle = '#2a1e14';
    const bootSize = Math.max(2, h * 0.05);
    ctx.fillRect(-h * 0.06 + legSwing * h * 0.2 - bootSize / 2, legY + legH - 1, bootSize, bootSize);
    ctx.fillRect(h * 0.06 - legSwing * h * 0.2 - bootSize / 2, legY + legH - 1, bootSize, bootSize);

    // Torso (red jacket)
    const torsoY = -torsoH - headR * 2 + breathBob - bodyBob;
    ctx.fillStyle = '#c94433';
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, torsoY + torsoH);
    ctx.lineTo(-h * 0.12, torsoY);
    ctx.lineTo(h * 0.12, torsoY);
    ctx.lineTo(h * 0.1, torsoY + torsoH);
    ctx.closePath();
    ctx.fill();

    // Jacket highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-h * 0.03, torsoY + 2, h * 0.06, torsoH * 0.6);

    // Arms
    ctx.strokeStyle = '#c94433';
    ctx.lineWidth = Math.max(1.2, h * 0.05);
    ctx.beginPath();
    ctx.moveTo(-h * 0.12, torsoY + h * 0.04);
    ctx.lineTo(-h * 0.18 + armSwing * h * 0.15, torsoY + torsoH * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h * 0.12, torsoY + h * 0.04);
    ctx.lineTo(h * 0.18 - armSwing * h * 0.15, torsoY + torsoH * 0.7);
    ctx.stroke();

    // Trekking pole
    ctx.strokeStyle = '#888';
    ctx.lineWidth = Math.max(0.8, h * 0.02);
    ctx.beginPath();
    const poleHandX = h * 0.18 - armSwing * h * 0.15;
    const poleHandY = torsoY + torsoH * 0.7;
    ctx.moveTo(poleHandX, poleHandY);
    ctx.lineTo(poleHandX + h * 0.05, poleHandY + legH * 0.9);
    ctx.stroke();

    // Backpack
    ctx.fillStyle = '#6b4226';
    const bpW = h * 0.14;
    const bpH = torsoH * 0.7;
    ctx.fillRect(-bpW / 2 + h * 0.01, torsoY + 1, bpW, bpH);

    // Head
    const headY = torsoY - headR + breathBob - bodyBob;
    ctx.fillStyle = '#d4a874';
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Hat/beanie
    ctx.fillStyle = '#2a4060';
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.2, headR * 1.05, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
// TERRAIN RENDERER
// ═══════════════════════════════════════════════════════════════

function getTerrainColor(altNorm) {
  if (altNorm > 0.85) return { r: 220, g: 230, b: 240 };
  if (altNorm > 0.70) return { r: 160, g: 170, b: 185 };
  if (altNorm > 0.50) return { r: 140, g: 130, b: 115 };
  if (altNorm > 0.25) return { r: 120, g: 115, b: 95  };
  return { r: 100, g: 105, b: 85 };
}

function lerpRouteX(z) {
  for (let i = 0; i < ROUTE_NODES.length - 1; i++) {
    if (z >= ROUTE_NODES[i].z && z <= ROUTE_NODES[i + 1].z) {
      const t = (z - ROUTE_NODES[i].z) / (ROUTE_NODES[i + 1].z - ROUTE_NODES[i].z);
      return ROUTE_NODES[i].x + (ROUTE_NODES[i + 1].x - ROUTE_NODES[i].x) * t;
    }
  }
  return z < ROUTE_NODES[0].z ? ROUTE_NODES[0].x : ROUTE_NODES[ROUTE_NODES.length - 1].x;
}

// Interpolate route altitude at any z position (keeps climber on terrain surface)
function lerpRouteAlt(z) {
  for (let i = 0; i < ROUTE_NODES.length - 1; i++) {
    if (z >= ROUTE_NODES[i].z && z <= ROUTE_NODES[i + 1].z) {
      const t = (z - ROUTE_NODES[i].z) / (ROUTE_NODES[i + 1].z - ROUTE_NODES[i].z);
      return ROUTE_NODES[i].alt + (ROUTE_NODES[i + 1].alt - ROUTE_NODES[i].alt) * t;
    }
  }
  return z < ROUTE_NODES[0].z ? ROUTE_NODES[0].alt : ROUTE_NODES[ROUTE_NODES.length - 1].alt;
}

function drawTerrain(ctx, camera, strips, canvasW, canvasH, atmosphere) {
  const visibleStrips = [];
  for (let i = 0; i < strips.length; i++) {
    const strip = strips[i];
    const altNorm = (strip.baseAlt - ALT_MIN) / ALT_RANGE;
    const baseY = altToY(strip.baseAlt);
    const leftY = altToY(strip.leftAlt);
    const rightY = altToY(strip.rightAlt);
    const rx = strip.routeX;
    const center = camera.project(rx, baseY, strip.z, canvasW, canvasH);
    const left = camera.project(rx - 300, leftY, strip.z, canvasW, canvasH);
    const right = camera.project(rx + 300, rightY, strip.z, canvasW, canvasH);
    if (!center || !left || !right) continue;
    if (center.y < -canvasH || center.y > canvasH * 2) continue;
    visibleStrips.push({ strip, center, left, right, altNorm, depth: center.depth });
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
    const shade = 0.7 + 0.3 * (1 - fogAmount);

    // Left face
    ctx.fillStyle = `rgb(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)})`;
    ctx.beginPath();
    ctx.moveTo(curr.left.x, curr.left.y);
    ctx.lineTo(curr.center.x, curr.center.y);
    ctx.lineTo(next.center.x, next.center.y);
    ctx.lineTo(next.left.x, next.left.y);
    ctx.closePath();
    ctx.fill();

    // Right face (brighter)
    const bShade = Math.min(shade * 1.15, 1);
    ctx.fillStyle = `rgb(${Math.round(r * bShade)},${Math.round(g * bShade)},${Math.round(b * bShade)})`;
    ctx.beginPath();
    ctx.moveTo(curr.center.x, curr.center.y);
    ctx.lineTo(curr.right.x, curr.right.y);
    ctx.lineTo(next.right.x, next.right.y);
    ctx.lineTo(next.center.x, next.center.y);
    ctx.closePath();
    ctx.fill();

    // Route trail on terrain
    if (i < visibleStrips.length - 2) {
      const rp = camera.project(lerpRouteX(curr.strip.z), altToY(curr.strip.baseAlt) + 0.5, curr.strip.z, canvasW, canvasH);
      const rpN = camera.project(lerpRouteX(next.strip.z), altToY(next.strip.baseAlt) + 0.5, next.strip.z, canvasW, canvasH);
      if (rp && rpN) {
        ctx.strokeStyle = `rgba(185,172,158,${0.3 * (1 - fogAmount)})`;
        ctx.lineWidth = Math.max(0.5, 1.5 * (1 - fogAmount));
        ctx.beginPath();
        ctx.moveTo(rp.x, rp.y);
        ctx.lineTo(rpN.x, rpN.y);
        ctx.stroke();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CAMP & SUMMIT MARKERS
// ═══════════════════════════════════════════════════════════════

function drawCampMarkers(ctx, camera, canvasW, canvasH, atmosphere) {
  ROUTE_NODES.forEach(node => {
    if (!node.camp) return;
    const projected = camera.project(node.x + 15, altToY(node.alt) + 3, node.z, canvasW, canvasH);
    if (!projected || projected.depth > 500) return;
    const fogAmount = Math.min(projected.depth / 500, 1) * atmosphere.fogDensity;
    const alpha = Math.max(0.15, 0.7 * (1 - fogAmount));
    const size = Math.max(3, Math.min(projected.scale * 6, 14));
    ctx.save();
    ctx.translate(projected.x, projected.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#d4a874';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.8, 0);
    ctx.lineTo(size * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(-size * 0.25, 0);
    ctx.lineTo(size * 0.25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}

function drawSummitFlag(ctx, camera, canvasW, canvasH, time) {
  const summit = ROUTE_NODES[ROUTE_NODES.length - 1];
  const projected = camera.project(summit.x, altToY(summit.alt) + 8, summit.z, canvasW, canvasH);
  if (!projected || projected.depth > 600) return;
  const size = Math.max(4, Math.min(projected.scale * 8, 20));
  const flagWave = Math.sin(time * 3) * 2;
  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#d44';
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.5);
  ctx.lineTo(size * 0.6 + flagWave, -size * 1.3);
  ctx.lineTo(0, -size * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// SKY — gradient + day cycle + stars
// ═══════════════════════════════════════════════════════════════

function lerpVal(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(t, 1));
}

function getAtmosphere(minutesOfDay, weatherSeverity, visibility, altitudeNorm) {
  const hour = (minutesOfDay || 360) / 60;
  const isNight = hour < 5.5 || hour > 20;
  const isDawn = hour >= 5.5 && hour < 7;
  const isDusk = hour >= 18 && hour < 20;

  let skyTop, skyBottom, fogColor, ambientLight;
  if (isNight) {
    skyTop = { r: 5, g: 8, b: 18 };
    skyBottom = { r: 15, g: 20, b: 35 };
    fogColor = { r: 10, g: 15, b: 25 };
    ambientLight = 0.25;
  } else if (isDawn) {
    const t = (hour - 5.5) / 1.5;
    skyTop = { r: lerpVal(15, 60, t), g: lerpVal(15, 80, t), b: lerpVal(40, 130, t) };
    skyBottom = { r: lerpVal(40, 200, t), g: lerpVal(25, 140, t), b: lerpVal(50, 100, t) };
    fogColor = { r: lerpVal(20, 160, t), g: lerpVal(18, 120, t), b: lerpVal(35, 100, t) };
    ambientLight = lerpVal(0.3, 0.85, t);
  } else if (isDusk) {
    const t = (hour - 18) / 2;
    skyTop = { r: lerpVal(60, 20, t), g: lerpVal(80, 15, t), b: lerpVal(130, 40, t) };
    skyBottom = { r: lerpVal(200, 80, t), g: lerpVal(140, 40, t), b: lerpVal(100, 50, t) };
    fogColor = { r: lerpVal(140, 30, t), g: lerpVal(100, 25, t), b: lerpVal(80, 40, t) };
    ambientLight = lerpVal(0.85, 0.3, t);
  } else {
    skyTop = { r: 40, g: 70, b: 140 };
    skyBottom = { r: 140, g: 170, b: 210 };
    fogColor = { r: 160, g: 180, b: 210 };
    ambientLight = 1.0;
  }

  const weather = Math.max(0, Math.min(weatherSeverity || 0, 4));
  const vis = Math.max(0, Math.min(visibility || 3, 4));
  const fogDensity = 0.3 + (weather / 4) * 0.4 + ((4 - vis) / 4) * 0.2;

  const altFactor = altitudeNorm * 0.15;
  skyTop.r = Math.max(0, skyTop.r - altFactor * 30);
  skyTop.g = Math.max(0, skyTop.g - altFactor * 20);
  skyTop.b = Math.max(0, skyTop.b + altFactor * 10);

  const hasSnow = altitudeNorm > 0.55 || weather >= 3;
  const hasDust = altitudeNorm < 0.5 && weather >= 1;
  const windStrength = weather * 0.5 + (altitudeNorm > 0.6 ? 1.5 : 0);

  return {
    skyTop, skyBottom, fogColor, fogDensity,
    ambientLight, isNight, isDawn, isDusk,
    hasSnow, hasDust, windStrength, hour,
  };
}

function drawSky(ctx, canvasW, canvasH, atmosphere, time) {
  const { skyTop, skyBottom, isNight, hour } = atmosphere;
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
  grad.addColorStop(0, `rgb(${skyTop.r},${skyTop.g},${skyTop.b})`);
  grad.addColorStop(0.6, `rgb(${skyBottom.r},${skyBottom.g},${skyBottom.b})`);
  grad.addColorStop(1, `rgb(${Math.round(skyBottom.r * 0.7)},${Math.round(skyBottom.g * 0.7)},${Math.round(skyBottom.b * 0.7)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Stars at night
  if (isNight || hour < 6 || hour > 19.5) {
    const starAlpha = isNight ? 0.7 : 0.2;
    const rng = seededRng(123);
    for (let i = 0; i < 40; i++) {
      const sx = rng() * canvasW;
      const sy = rng() * canvasH * 0.5;
      const sr = 0.3 + rng() * 1;
      const twinkle = 0.5 + Math.sin(time * 2 + i) * 0.5;
      ctx.fillStyle = `rgba(200,210,230,${starAlpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sun
  if (!isNight) {
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sunX = canvasW * 0.2 + Math.cos(sunAngle) * canvasW * 0.3;
    const sunY = canvasH * 0.4 - Math.sin(sunAngle) * canvasH * 0.3;
    ctx.fillStyle = 'rgba(255,240,200,0.3)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,250,230,0.7)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLES RENDERING
// ═══════════════════════════════════════════════════════════════

function drawParticles(ctx, particles, atmosphere) {
  particles.forEach(p => {
    let color;
    if (p.type === 'snow') {
      color = `rgba(220,230,240,${p.opacity * atmosphere.ambientLight})`;
    } else if (p.type === 'wind') {
      color = `rgba(180,190,200,${p.opacity * 0.4})`;
    } else {
      color = `rgba(160,140,120,${p.opacity * 0.3})`;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ═══════════════════════════════════════════════════════════════
// ALTITUDE HUD
// ═══════════════════════════════════════════════════════════════

function drawAltitudeHUD(ctx, canvasW, canvasH, positionIndex, atmosphere) {
  const node = ROUTE_NODES[Math.max(0, Math.min(positionIndex, ROUTE_NODES.length - 1))];
  const alpha = 0.45 * atmosphere.ambientLight + 0.15;
  ctx.save();
  ctx.font = `500 ${Math.max(9, canvasW * 0.022)}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = `rgba(200,210,220,${alpha})`;
  ctx.textAlign = 'left';
  ctx.fillText(`${node.alt}m`, 8, canvasH - 8);
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
 */
export function initMountainVisualization(container) {
  if (!container) return;

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
  const terrainStrips = generateTerrainStrips(120);

  const rng = seededRng(777);
  const particles = [];

  const state = {
    canvas, ctx, camera, climber, terrainStrips, particles, rng,
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
  // Initialize particles after canvas has been properly sized
  for (let i = 0; i < 50; i++) particles.push(new Particle(canvas.width, canvas.height, 'snow', rng));
  for (let i = 0; i < 20; i++) particles.push(new Particle(canvas.width, canvas.height, 'wind', rng));
  for (let i = 0; i < 15; i++) particles.push(new Particle(canvas.width, canvas.height, 'dust', rng));
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
    camera.update(dt);

    const posIdx = Math.max(0, Math.min(state.positionIndex, ROUTE_NODES.length - 1));
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
          // Reset inactive particles so they don't pop in at stale positions
          p.reset(canvasW, canvasH, rng, true);
        }
      });
    }

    ctx.clearRect(0, 0, canvasW, canvasH);
    drawSky(ctx, canvasW, canvasH, atmosphere, state.time);
    drawTerrain(ctx, camera, terrainStrips, canvasW, canvasH, atmosphere);
    drawCampMarkers(ctx, camera, canvasW, canvasH, atmosphere);
    drawSummitFlag(ctx, camera, canvasW, canvasH, state.time);
    if (!state.reducedMotion) drawParticles(ctx, particles, atmosphere);
    climber.draw(ctx, camera, canvasW, canvasH);
    drawAltitudeHUD(ctx, canvasW, canvasH, state.positionIndex, atmosphere);
  }

  state.animationId = requestAnimationFrame(frame);
}

/**
 * Update the climber position on the mountain.
 *
 * @param {number} positionIndex — current route index (0–14)
 * @param {object} [options]
 * @param {number} [options.highestIndex] — highest position reached
 * @param {number} [options.minutesOfDay] — current time of day (0–1440)
 * @param {number} [options.weatherSeverity] — weather severity (0–4)
 * @param {number} [options.visibility] — visibility level (0–4)
 */
export function updateClimberPosition(positionIndex, options = {}) {
  if (!_state) return;
  const idx = Math.max(0, Math.min(positionIndex, ROUTE_NODES.length - 1));
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
