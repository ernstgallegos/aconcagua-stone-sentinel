// prototype/web-3d/src/world.js
//
// Builds the visible mountain: terrain ribbon, scattered rock/ice/grass,
// camps, signposts, trail markers, the park gate and the summit cross.

import * as THREE from 'three';
import { V_SCALE } from './route.js';
import { fbm, noise2, seededRandom, smoothstep, clamp, lerp } from './noise.js';
import { createSurfaceTextures, createGroundMaterial, addWindSway } from './materials.js';

// Palette sampled from the project's cover and curated concept art:
// warm ochre ground, terracotta and violet strata, lavender shadow rock, rose-white snow.
const COL = {
  rockLow: new THREE.Color('#c08a5e'),
  rockOchre: new THREE.Color('#d9ae72'),
  rockMid: new THREE.Color('#a4828c'),
  rockHigh: new THREE.Color('#837796'),
  rockDark: new THREE.Color('#5c4b6b'),
  strataRed: new THREE.Color('#b9624a'),
  strataViolet: new THREE.Color('#7f5c8c'),
  snow: new THREE.Color('#fbf1f1'),
  snowShade: new THREE.Color('#d8cfe8'),
  grass: new THREE.Color('#aaa25c'),
  trailLow: new THREE.Color('#ead2ab'),
  trailHigh: new THREE.Color('#cdc4d6'),
};

const TENT_COLORS = ['#e2742c', '#e9b23a', '#3f7fb5', '#c8463a', '#5b9a6a', '#d9d4cc', '#7a5ea8'];

function lateralColumns() {
  const side = [0.8, 1.6, 2.4, 3.4, 4.6, 6, 7.6, 9.5, 12, 15, 18.5, 22.5, 27, 32, 38, 45, 53, 62, 72, 84, 98, 115, 135, 160, 190, 225, 270, 325, 390, 470, 570, 690, 840, 1020, 1240, 1500, 1850, 2300];
  return [...side.map((v) => -v).reverse(), 0, ...side];
}

function makeLabelTexture(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 176;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b2c22';
  ctx.fillRect(0, 0, 512, 176);
  ctx.fillStyle = '#e9dcc4';
  ctx.fillRect(8, 8, 496, 160);
  ctx.fillStyle = '#2c2019';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 46;
  ctx.font = `600 ${size}px Georgia, 'Times New Roman', serif`;
  while (ctx.measureText(title).width > 470 && size > 22) {
    size -= 2;
    ctx.font = `600 ${size}px Georgia, 'Times New Roman', serif`;
  }
  ctx.fillText(title, 256, subtitle ? 74 : 88);
  if (subtitle) {
    ctx.font = "600 30px 'Courier New', monospace";
    ctx.fillStyle = '#7a3d22';
    ctx.fillText(subtitle, 256, 130);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildWorld({ scene, route, terrain, renderer, dem = null }) {
  const group = new THREE.Group();
  scene.add(group);
  const rand = seededRandom(6962);
  const S = route.nodeS;
  const tmp = {};
  const groundAt = (s, d) => {
    terrain.pointAt(s, d, tmp);
    return new THREE.Vector3(tmp.x, terrain.heightRoute(s, d, tmp.x, tmp.z), tmp.z);
  };
  const altOf = (h) => route.baseAlt + h / V_SCALE;
  const timeUniform = { value: 0 };
  const textures = createSurfaceTextures(renderer);
  const groundOpts = { textures, baseAlt: route.baseAlt, vScale: V_SCALE };

  // ── terrain ribbon ───────────────────────────────────────────────────────
  const cols = lateralColumns();
  const ROW_STEP = 2.5;
  const rows = Math.floor((terrain.sMax - terrain.sMin) / ROW_STEP) + 1;
  const nCols = cols.length;
  const positions = new Float32Array(rows * nCols * 3);
  const meta = new Float32Array(rows * nCols * 2); // s, d
  const trail = new Float32Array(rows * nCols);
  for (let r = 0; r < rows; r++) {
    const s = terrain.sMin + r * ROW_STEP;
    for (let c = 0; c < nCols; c++) {
      const d = cols[c];
      terrain.pointAt(s, d, tmp);
      const i = r * nCols + c;
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = terrain.heightRoute(s, d, tmp.x, tmp.z);
      positions[i * 3 + 2] = tmp.z;
      meta[i * 2] = s; meta[i * 2 + 1] = d;
      trail[i] = (1 - smoothstep(0.9, 3.4, Math.abs(d))) * (s > -40 && s < route.total + 6 ? 1 : 0);
    }
  }
  const indices = new Uint32Array((rows - 1) * (nCols - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < nCols - 1; c++) {
      const a = r * nCols + c;
      const b = a + 1;
      const cc = a + nCols;
      const dd = cc + 1;
      // The grid is laid out with s increasing along rows and d along columns;
      // this winding makes the faces point up (+Y).
      indices[k++] = a; indices[k++] = cc; indices[k++] = b;
      indices[k++] = b; indices[k++] = cc; indices[k++] = dd;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aTrail', new THREE.BufferAttribute(trail, 1));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  {
    // Guard against inverted winding (would render the mountain from below).
    const n = geo.attributes.normal;
    let sum = 0;
    for (let i = 0; i < n.count; i += 97) sum += n.getY(i);
    if (sum < 0) {
      for (let i = 0; i < indices.length; i += 3) { const t = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = t; }
      geo.index.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
  const normals = geo.attributes.normal;
  const colors = new Float32Array(rows * nCols * 3);
  const c1 = new THREE.Color();
  for (let i = 0; i < rows * nCols; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const a = Math.abs(meta[i * 2 + 1]);
    const alt = altOf(y);
    const ny = normals.getY(i);
    const steep = clamp((1 - ny) * 2.4, 0, 1);
    const nA = fbm(x * 0.02, z * 0.02, 3);
    const nB = noise2(x * 0.11, z * 0.11);

    // Rock bands by altitude.
    c1.copy(COL.rockLow).lerp(COL.rockOchre, clamp(0.5 + nA * 0.9, 0, 1));
    c1.lerp(COL.rockMid, smoothstep(3700, 4700, alt + nA * 300));
    c1.lerp(COL.rockHigh, smoothstep(5000, 6100, alt + nA * 300));
    // Sedimentary strata: tilted terracotta and violet bands on open slopes.
    const band = Math.sin(alt * 0.019 + x * 0.004 + nA * 2.6);
    const strata = smoothstep(26, 180, a) * (0.25 + steep * 0.6);
    if (band > 0.35) c1.lerp(COL.strataRed, strata * smoothstep(0.35, 0.8, band) * (1 - smoothstep(4300, 5200, alt)));
    else if (band < -0.45) c1.lerp(COL.strataViolet, strata * smoothstep(0.45, 0.9, -band));
    c1.lerp(COL.rockDark, steep * 0.5);
    // Sparse high-desert grass low in the valley.
    const grass = (1 - smoothstep(3250, 3750, alt)) * (1 - steep) * clamp(0.35 + nB * 0.6, 0, 0.7);
    c1.lerp(COL.grass, grass);
    const jitter = 1 + nB * 0.05;
    colors[i * 3] = c1.r * jitter; colors[i * 3 + 1] = c1.g * jitter; colors[i * 3 + 2] = c1.b * jitter;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Macro tint lives in vertex colours; rock, scree, trail and snow are resolved per pixel.
  const terrainMesh = new THREE.Mesh(geo, createGroundMaterial({ ...groundOpts, trail: true, vertexColors: true }));
  terrainMesh.receiveShadow = true;
  terrainMesh.frustumCulled = false;
  group.add(terrainMesh);

  // ── instanced scatter ────────────────────────────────────────────────────
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  function scatter({ geometry, material, count, place, castShadow = true }) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    let n = 0;
    for (let i = 0; i < count * 4 && n < count; i++) {
      const ok = place(dummy, col, i);
      if (!ok) continue;
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  }
  const flat = (color = 0xffffff) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
  const nearLagoon = (p) => Math.hypot(p.x - terrain.lagoon.x, p.z - terrain.lagoon.z) < terrain.lagoon.radius + 3;

  // Rocks and boulders share the ground material, so they pick up the same rock detail and snow caps.
  function boulderGeometry(detail, seed) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let n = 0; n < pos.count; n++) {
      v.fromBufferAttribute(pos, n);
      const k = 1 + fbm(v.x * 1.3 + seed, v.y * 1.3 - seed + v.z * 0.7, 3) * 0.42 + noise2(v.z * 3.1 + seed, v.x * 3.1) * 0.08;
      v.multiplyScalar(k);
      v.y *= 0.82;
      pos.setXYZ(n, v.x, v.y, v.z);
    }
    // Icosahedron vertices are duplicated per face; merge by position so normals come out smooth.
    const merged = new Map();
    const normal = new Float32Array(pos.count * 3);
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let n = 0; n < pos.count; n++) {
      const key = `${pos.getX(n).toFixed(3)},${pos.getY(n).toFixed(3)},${pos.getZ(n).toFixed(3)}`;
      const acc = merged.get(key) || [0, 0, 0];
      acc[0] += nrm.getX(n); acc[1] += nrm.getY(n); acc[2] += nrm.getZ(n);
      merged.set(key, acc);
    }
    for (let n = 0; n < pos.count; n++) {
      const acc = merged.get(`${pos.getX(n).toFixed(3)},${pos.getY(n).toFixed(3)},${pos.getZ(n).toFixed(3)}`);
      const len = Math.hypot(acc[0], acc[1], acc[2]) || 1;
      // Keep a hint of facets: blend smooth and face normals.
      normal[n * 3] = acc[0] / len * 0.7 + nrm.getX(n) * 0.3;
      normal[n * 3 + 1] = acc[1] / len * 0.7 + nrm.getY(n) * 0.3;
      normal[n * 3 + 2] = acc[2] / len * 0.7 + nrm.getZ(n) * 0.3;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    return g;
  }
  const rockMaterial = createGroundMaterial({ ...groundOpts, bump: 0.1, detailScale: 2.0, snowShift: -150 });
  const rockTint = (c, alt) => {
    c.copy(COL.rockLow).lerp(COL.rockMid, smoothstep(3500, 4700, alt)).lerp(COL.rockHigh, smoothstep(4900, 6000, alt)).multiplyScalar(0.78 + rand() * 0.36);
  };
  scatter({
    geometry: boulderGeometry(1, 3.1),
    material: rockMaterial,
    count: 3000,
    place(o, c) {
      const s = lerp(-70, route.total + 30, rand());
      const d = (rand() < 0.5 ? -1 : 1) * (3.6 + Math.pow(rand(), 1.8) * 150);
      const p = groundAt(s, d);
      if (nearLagoon(p)) return false;
      const sc = 0.16 + Math.pow(rand(), 2.2) * 1.0;
      o.position.set(p.x, p.y + sc * 0.22, p.z);
      o.rotation.set(rand() * 6.3, rand() * 6.3, rand() * 6.3);
      o.scale.set(sc * (0.8 + rand() * 0.7), sc * (0.6 + rand() * 0.5), sc * (0.8 + rand() * 0.7));
      rockTint(c, altOf(p.y));
      return true;
    },
  });
  scatter({
    geometry: boulderGeometry(3, 11.7),
    material: rockMaterial,
    count: 260,
    place(o, c) {
      const s = lerp(-70, route.total + 30, rand());
      const d = (rand() < 0.5 ? -1 : 1) * (10 + Math.pow(rand(), 1.3) * 150);
      const p = groundAt(s, d);
      if (nearLagoon(p)) return false;
      const sc = 1.5 + Math.pow(rand(), 1.6) * 3.4;
      o.position.set(p.x, p.y + sc * 0.18, p.z);
      o.rotation.set((rand() - 0.5) * 0.7, rand() * 6.3, (rand() - 0.5) * 0.7);
      o.scale.set(sc * (0.85 + rand() * 0.6), sc * (0.6 + rand() * 0.45), sc * (0.85 + rand() * 0.6));
      rockTint(c, altOf(p.y));
      return true;
    },
  });

  // High-desert grasses in loose clumps, with the yellow flowers of the approach.
  const tuftCentres = [];
  scatter({
    geometry: new THREE.ConeGeometry(0.07, 1, 3),
    material: addWindSway(new THREE.MeshStandardMaterial({ roughness: 0.9 }), timeUniform),
    count: 9000,
    castShadow: false,
    place(o, c, i) {
      const cluster = Math.floor(i / 9);
      const cr = seededRandom(cluster * 6151 + 5);
      const cs = lerp(-70, S[3] + 60, cr());
      const cd = (cr() < 0.5 ? -1 : 1) * (3.2 + Math.pow(cr(), 1.5) * 105);
      const s = cs + (rand() - 0.5) * 1.1;
      const d = cd + (rand() - 0.5) * 1.1;
      if (Math.abs(d) < 2.6) return false;
      const p = groundAt(s, d);
      if (altOf(p.y) > 3950 || nearLagoon(p)) return false;
      const sc = 0.4 + rand() * 0.7;
      o.position.set(p.x, p.y + 0.42 * sc, p.z);
      o.rotation.set((rand() - 0.5) * 0.7, rand() * 6.3, (rand() - 0.5) * 0.7);
      o.scale.set(sc, sc, sc);
      const tone = cr();
      c.set(tone < 0.3 ? '#a3a65c' : tone < 0.7 ? '#c9b866' : '#e0c97c').multiplyScalar(0.82 + rand() * 0.3);
      if (i % 9 === 0 && tone > 0.55) tuftCentres.push(new THREE.Vector3(p.x, p.y + 0.85 * sc, p.z));
      return true;
    },
  });
  scatter({
    geometry: new THREE.IcosahedronGeometry(0.11, 0),
    material: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, emissive: new THREE.Color('#6b5200'), emissiveIntensity: 0.5 }),
    count: Math.min(900, tuftCentres.length * 3),
    castShadow: false,
    place(o, c, i) {
      const centre = tuftCentres[Math.floor(i / 3)];
      if (!centre) return false;
      o.position.set(centre.x + (rand() - 0.5) * 0.7, centre.y + (rand() - 0.5) * 0.3, centre.z + (rand() - 0.5) * 0.7);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      c.set(rand() < 0.8 ? '#f2cf4a' : '#f6e7a0');
      return true;
    },
  });

  // Penitentes — the wind-carved snow blades typical of the high Andes.
  scatter({
    geometry: new THREE.ConeGeometry(0.34, 1.7, 5),
    material: flat(),
    count: 1300,
    place(o, c, i) {
      const cluster = Math.floor(i / 14);
      const cr = seededRandom(cluster * 7919 + 13);
      const cs = lerp(S[4] + 30, S[10] + 10, cr());
      const cd = (cr() < 0.5 ? -1 : 1) * (10 + cr() * 75);
      const s = cs + (rand() - 0.5) * 12;
      const d = cd + (rand() - 0.5) * 12;
      if (Math.abs(d) < 5.5) return false;
      const p = groundAt(s, d);
      const sc = 0.5 + rand() * 1.1;
      o.position.set(p.x, p.y + 0.75 * sc, p.z);
      o.rotation.set((rand() - 0.5) * 0.25, rand() * 6.3, 0.18 + (rand() - 0.5) * 0.2);
      o.scale.set(sc, sc, sc);
      c.copy(COL.snow).lerp(COL.snowShade, rand() * 0.6);
      return true;
    },
  });

  // Cairns along the low trail, orange-tipped wands higher up.
  const markerSpots = [];
  for (let s = 14; s < route.total - 6; s += 30) {
    const side = Math.round(s / 30) % 2 === 0 ? 1 : -1;
    markerSpots.push({ s, d: side * 3.6, high: route.altitudeAt(s) > 4900 });
  }
  const cairnSpots = markerSpots.filter((m) => !m.high);
  const wandSpots = markerSpots.filter((m) => m.high);
  scatter({
    geometry: new THREE.DodecahedronGeometry(0.34, 0),
    material: flat(),
    count: cairnSpots.length * 4,
    place(o, c, i) {
      const spot = cairnSpots[Math.floor(i / 4)];
      if (!spot) return false;
      const level = i % 4;
      const p = groundAt(spot.s, spot.d);
      const sc = 1.25 - level * 0.24;
      o.position.set(p.x + (rand() - 0.5) * 0.08, p.y + 0.16 + level * 0.3, p.z + (rand() - 0.5) * 0.08);
      o.rotation.set(rand(), rand() * 6.3, rand());
      o.scale.set(sc, sc * 0.62, sc);
      c.set('#b29a86').multiplyScalar(0.8 + rand() * 0.3);
      return true;
    },
  });
  scatter({
    geometry: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5),
    material: flat(),
    count: wandSpots.length,
    place(o, c, i) {
      const spot = wandSpots[i];
      if (!spot) return false;
      const p = groundAt(spot.s, spot.d);
      o.position.set(p.x, p.y + 0.72, p.z);
      o.rotation.set((rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2);
      o.scale.set(1, 1, 1);
      c.set('#3b3632');
      return true;
    },
  });
  scatter({
    geometry: new THREE.BoxGeometry(0.34, 0.2, 0.03),
    material: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, emissive: new THREE.Color('#5a2408'), emissiveIntensity: 0.6 }),
    count: wandSpots.length,
    castShadow: false,
    place(o, c, i) {
      const spot = wandSpots[i];
      if (!spot) return false;
      const p = groundAt(spot.s, spot.d);
      o.position.set(p.x + 0.16, p.y + 1.36, p.z);
      o.rotation.set(0, rand() * 6.3, 0);
      o.scale.set(1, 1, 1);
      c.set('#ff7a2a');
      return true;
    },
  });

  // ── lagoon ───────────────────────────────────────────────────────────────
  // Fresnel water: reflects the sky colour at grazing angles, shows depth looking down,
  // with two scrolling ripple layers and a sun glint.
  const waterUniforms = {
    uTime: timeUniform,
    tNoise: { value: textures.gravel },
    uSky: { value: new THREE.Color('#9fc0e6') },
    uHorizon: { value: new THREE.Color('#d6e6f3') },
    uDeep: { value: new THREE.Color('#1f4a55') },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4) },
    uSunColor: { value: new THREE.Color('#fff3da') },
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 1 },
    fogFar: { value: 1000 },
  };
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(terrain.lagoon.radius + 6, 48),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      vertexShader: `
        varying vec3 vW;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform float uTime; uniform sampler2D tNoise;
        uniform vec3 uSky; uniform vec3 uHorizon; uniform vec3 uDeep; uniform vec3 uSunDir; uniform vec3 uSunColor;
        uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
        varying vec3 vW;
        void main() {
          vec2 p = vW.xz;
          float h1 = texture2D(tNoise, p * 0.035 + vec2(uTime * 0.012, uTime * 0.007)).g;
          float h2 = texture2D(tNoise, p * 0.09 - vec2(uTime * 0.02, -uTime * 0.013)).b;
          float e = 0.6;
          float hx = texture2D(tNoise, (p + vec2(e, 0.0)) * 0.035 + vec2(uTime * 0.012, uTime * 0.007)).g
                   + 0.5 * texture2D(tNoise, (p + vec2(e, 0.0)) * 0.09 - vec2(uTime * 0.02, -uTime * 0.013)).b;
          float hz = texture2D(tNoise, (p + vec2(0.0, e)) * 0.035 + vec2(uTime * 0.012, uTime * 0.007)).g
                   + 0.5 * texture2D(tNoise, (p + vec2(0.0, e)) * 0.09 - vec2(uTime * 0.02, -uTime * 0.013)).b;
          float h0 = h1 + 0.5 * h2;
          vec3 n = normalize(vec3((h0 - hx) * 0.9, 1.0, (h0 - hz) * 0.9));
          vec3 v = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          vec3 r = reflect(-v, n);
          vec3 sky = mix(uHorizon, uSky, clamp(r.y * 1.6, 0.0, 1.0));
          vec3 col = mix(uDeep, sky, 0.18 + 0.82 * fres);
          col += uSunColor * pow(max(dot(r, normalize(uSunDir)), 0.0), 220.0) * 1.6;
          float dist = length(cameraPosition - vW);
          col = mix(col, fogColor, smoothstep(fogNear, fogFar, dist));
          gl_FragColor = vec4(col, 0.93);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(terrain.lagoon.x, terrain.lagoon.y - 0.7, terrain.lagoon.z);
  group.add(water);

  // ── signposts ────────────────────────────────────────────────────────────
  const postMat = flat('#4b3526');
  const signs = [];
  function addSign(s, d, title, subtitle, scale = 1) {
    const p = groundAt(s, d);
    const dir = terrain.trailDirection(s, {});
    const sign = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.3 * scale, 6), postMat);
    post.position.y = 1.15 * scale;
    post.castShadow = true;
    sign.add(post);
    const tex = makeLabelTexture(title, subtitle);
    const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2.9 * scale, 1.0 * scale), boardMat);
    front.position.set(0, 2.05 * scale, 0.05);
    const back = front.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.05;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.96 * scale, 1.06 * scale, 0.08), postMat);
    slab.position.y = 2.05 * scale;
    slab.castShadow = true;
    sign.add(slab, front, back);
    sign.position.copy(p);
    // Board faces down-trail so climbers read it as they arrive.
    sign.rotation.y = Math.atan2(-dir.x, -dir.z);
    group.add(sign);
    signs.push(sign);
    return sign;
  }
  route.nodes.forEach((node, i) => {
    const clean = node.name.replace(/\s*\(\d+m\)/, '');
    const parts = clean.split(' — ');
    const place = parts[parts.length - 1];
    const kind = parts.length > 1 ? `${parts[0]} · ` : '';
    addSign(S[i] + (i === route.last ? -7 : 1.5), 4.4, place, `${kind}${node.altitudeMeters} m`);
  });

  // ── camps ────────────────────────────────────────────────────────────────
  const fabric = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0 });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#2b2d33', roughness: 0.5, metalness: 0.4 });
  const domeGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const ribGeo = new THREE.TorusGeometry(1, 0.018, 5, 20, Math.PI);
  const guyGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
  /** Expedition dome tent: shell, vestibule, crossing poles, door and guy lines. */
  function makeTent(color, scale = 1) {
    const tent = new THREE.Group();
    const shell = new THREE.Mesh(domeGeo, fabric(color));
    shell.scale.set(1.5 * scale, 1.12 * scale, 1.15 * scale);
    const fly = new THREE.Color(color).multiplyScalar(0.72);
    const vestibule = new THREE.Mesh(domeGeo, fabric(fly));
    vestibule.scale.set(0.8 * scale, 0.78 * scale, 0.78 * scale);
    vestibule.position.x = 1.25 * scale;
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.42 * scale, 12, 0, Math.PI), fabric('#1c1d22'));
    door.position.set(1.93 * scale, 0.02, 0);
    door.rotation.y = Math.PI / 2;
    door.scale.y = 1.25;
    tent.add(shell, vestibule, door);
    for (const ang of [0.62, -0.62]) {
      const rib = new THREE.Mesh(ribGeo, poleMat);
      rib.scale.set(1.52 * scale, 1.14 * scale, 1.17 * scale);
      rib.rotation.y = ang;
      tent.add(rib);
    }
    for (const [gx, gz] of [[-1.6, 1.25], [-1.6, -1.25], [1.1, 1.3], [1.1, -1.3]]) {
      const guy = new THREE.Mesh(guyGeo, poleMat);
      const from = new THREE.Vector3(gx * 0.55 * scale, 0.75 * scale, gz * 0.55 * scale);
      const to = new THREE.Vector3(gx * scale * 1.15, 0, gz * scale * 1.15);
      guy.position.copy(from).add(to).multiplyScalar(0.5);
      guy.scale.y = from.distanceTo(to);
      guy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      tent.add(guy);
    }
    tent.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    tent.userData.shell = shell;
    tent.userData.vestibule = vestibule;
    return tent;
  }
  const campPlan = { approach_confluencia: 8, base_plaza_mulas: 17, camp_canada: 4, camp_nido_condores: 6, camp_colera: 3 };
  const interactables = [];
  const playerTents = [];
  const gearSpots = [];
  route.nodes.forEach((node, i) => {
    if (!node.isCamp) return;
    const n = campPlan[node.id] ?? 4;
    const placed = [];
    for (let t = 0, guard = 0; t < n && guard < 400; guard++) {
      const s = S[i] + lerp(-24, 20, rand());
      const d = (rand() < 0.35 ? -1 : 1) * lerp(12, 48, rand());
      if (placed.some((q) => Math.hypot(q.s - s, q.d - d) < 7.5)) continue;
      placed.push({ s, d });
      const p = groundAt(s, d);
      const big = node.id === 'base_plaza_mulas' && t < 2;
      const tent = makeTent(big ? '#e9e3da' : TENT_COLORS[Math.floor(rand() * TENT_COLORS.length)], big ? 2.6 : 0.95 + rand() * 0.25);
      tent.position.set(p.x, p.y - 0.06, p.z);
      tent.rotation.y = rand() * 6.3;
      group.add(tent);
      if (rand() < 0.7) gearSpots.push({ s: s + (rand() - 0.5) * 3, d: d + (rand() < 0.5 ? 2.6 : -2.6) });
      t++;
    }
    // The player's own tent, right beside the trail.
    const tp = groundAt(S[i] + 10, 7.4);
    const tent = makeTent('#e2742c', 1.05);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), poleMat);
    pole.position.set(-1.9, 1.3, 0.6);
    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.03), fabric('#f2c14e'));
    pennant.position.set(-1.58, 2.4, 0.6);
    tent.add(pole, pennant);
    tent.position.set(tp.x, tp.y - 0.06, tp.z);
    tent.rotation.y = rand() * 6.3;
    group.add(tent);
    playerTents.push(tent);
    gearSpots.push({ s: S[i] + 12.5, d: 9.6 });
    interactables.push({ type: 'tent', nodeIndex: i, position: tp.clone(), radius: 5 });
  });
  // Expedition gear beside the tents: supply barrels and duffels.
  scatter({
    geometry: new THREE.CylinderGeometry(0.3, 0.3, 0.85, 12),
    material: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
    count: gearSpots.length,
    place(o, c, i) {
      const g = gearSpots[i];
      if (!g) return false;
      const p = groundAt(g.s, g.d);
      o.position.set(p.x, p.y + 0.4, p.z);
      o.rotation.set(0, rand() * 6.3, 0);
      o.scale.set(1, 1, 1);
      c.set(rand() < 0.7 ? '#2d5f9a' : '#c94f2e');
      return true;
    },
  });
  scatter({
    geometry: new THREE.CapsuleGeometry(0.24, 0.7, 3, 8),
    material: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    count: gearSpots.length,
    place(o, c, i) {
      const g = gearSpots[i];
      if (!g) return false;
      const p = groundAt(g.s + 0.9, g.d + 0.5);
      o.position.set(p.x, p.y + 0.22, p.z);
      o.rotation.set(Math.PI / 2, 0, rand() * 6.3);
      o.scale.set(1, 1, 1);
      c.set(['#d8a531', '#2f3a3f', '#a33a2c', '#3f6f52'][Math.floor(rand() * 4)]);
      return true;
    },
  });

  // ── Horcones: ranger hut and park gate ───────────────────────────────────
  {
    const hp = groundAt(-6, -13);
    const hut = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.8, 4.6), flat('#8a6a4c'));
    walls.position.y = 1.4;
    const roofGeo = new THREE.ConeGeometry(4.6, 1.7, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, flat('#5b2f25'));
    roof.position.y = 3.6;
    roof.scale.set(1.15, 1, 0.82);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.08), flat('#3b2a1f'));
    door.position.set(0, 1, 2.33);
    hut.add(walls, roof, door);
    hut.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    hut.position.copy(hp);
    const dir = terrain.trailDirection(-6, {});
    hut.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2;
    group.add(hut);

    const gs = -24;
    const left = groundAt(gs, -4.2);
    const right = groundAt(gs, 4.2);
    const gate = new THREE.Group();
    for (const p of [left, right]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.2, 7), postMat);
      post.position.set(p.x, p.y + 2.1, p.z);
      post.castShadow = true;
      gate.add(post);
    }
    const mid = left.clone().add(right).multiplyScalar(0.5);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(left.distanceTo(right) + 0.8, 1.05, 0.14), new THREE.MeshStandardMaterial({
      map: makeLabelTexture('Parque Provincial Aconcagua', null), roughness: 0.85,
    }));
    beam.position.set(mid.x, Math.max(left.y, right.y) + 4.1, mid.z);
    beam.rotation.y = Math.atan2(right.x - left.x, right.z - left.z) + Math.PI / 2;
    beam.castShadow = true;
    gate.add(beam);
    group.add(gate);
    interactables.push({ type: 'gate', position: groundAt(gs + 1, 0), radius: 6.5 });
  }

  // ── summit cross ─────────────────────────────────────────────────────────
  {
    const sp = groundAt(route.total + 2.5, 3);
    const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd4', roughness: 0.35, metalness: 0.8, flatShading: true });
    const cross = new THREE.Group();
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), metal);
    up.position.y = 1.1;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.14), metal);
    arm.position.y = 1.65;
    cross.add(up, arm);
    const flagColors = ['#3f7fb5', '#f3eef4', '#c8463a', '#5b9a6a', '#e9b23a'];
    flagColors.forEach((fc, fi) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.02), flat(fc));
      f.position.set(-0.7 + fi * 0.35, 0.95 - Math.abs(fi - 2) * 0.08, 0.1);
      cross.add(f);
    });
    cross.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    cross.position.copy(sp);
    group.add(cross);
  }

  // ── thresholds: where the mountain answers ───────────────────────────────
  // Two stone piles joined by a line of prayer flags mark each crux, so the
  // player can see where an attempt is decided before walking into it.
  {
    const pileGeo = new THREE.DodecahedronGeometry(0.6, 0);
    const flagGeo = new THREE.BoxGeometry(0.34, 0.26, 0.02);
    const flagColors = ['#3f7fb5', '#f3eef4', '#c8463a', '#5b9a6a', '#e9b23a'];
    const pileMat = flat('#8d7a70');
    const cordMat = flat('#2a2522');
    route.cruxS.forEach((cs) => {
      const a = groundAt(cs, -3.6);
      const b = groundAt(cs, 3.6);
      for (const p of [a, b]) {
        for (let level = 0; level < 3; level++) {
          const pile = new THREE.Mesh(pileGeo, pileMat);
          const sc = 1.15 - level * 0.3;
          pile.scale.set(sc, sc * 0.7, sc);
          pile.position.set(p.x, p.y + 0.25 + level * 0.52, p.z);
          pile.rotation.set(rand(), rand() * 6, rand());
          pile.castShadow = true;
          group.add(pile);
        }
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), cordMat);
        stick.position.set(p.x, p.y + 2.1, p.z);
        group.add(stick);
      }
      const top = Math.max(a.y, b.y) + 2.75;
      for (let f = 0; f < 9; f++) {
        const u = (f + 0.5) / 9;
        const flag = new THREE.Mesh(flagGeo, flat(flagColors[f % flagColors.length]));
        const sag = Math.sin(u * Math.PI) * 0.45;
        flag.position.set(lerp(a.x, b.x, u), lerp(a.y, b.y, u) * 0 + top - sag, lerp(a.z, b.z, u));
        flag.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
        group.add(flag);
      }
    });
  }

  // ── the sentinel: the real Aconcagua massif as backdrop ──────────────────
  // Geometry comes from open elevation data (assets/aconcagua-dem.bin), enlarged so it
  // dominates the approach the way the paintings show it. It is scenery only: it
  // dissolves into haze as the climber gets onto the mountain, so the walked summit
  // stays the highest ground.
  const massif = (() => {
    // The axis is only modelled a short way past the summit; extend it in a straight line.
    // (Use the axis heading, not the trail direction: the trail meanders.)
    const edge = terrain.axisAt(route.total + 600, {});
    const centre = { x: edge.x + Math.sin(edge.heading) * 2350, z: edge.z + Math.cos(edge.heading) * 2350 };
    const base = new THREE.Color('#ffffff');
    const mat = createGroundMaterial({
      ...groundOpts, vertexColors: true, fog: false, transparent: true, bump: 0.5, detailScale: 0.12, snowShift: -1500,
    });
    let mesh = null;
    if (dem) {
      const N = dem.meta.size;
      const STEP = 2;                       // 128×128 quads is plenty at this distance
      const G = Math.floor((N - 1) / STEP) + 1;
      const SCALE = V_SCALE * 4.2;          // world units per metre, uniform: true proportions, enlarged
      const cell = (dem.meta.extentMetres / (N - 1)) * SCALE;
      const [sx, sy] = dem.meta.summitCell;
      // Keep only the main massif (about 5.5 km around the summit): neighbouring ranges,
      // once enlarged, would stand in front of it.
      const RADIUS = 2770;
      const FLOOR_M = 3900;
      // Seen from 18 km the real summit stands only ~12° above the horizon. Relief is
      // exaggerated so it reads the way it feels on the approach (and in the paintings).
      const RELIEF = 1.65;
      const pos = new Float32Array(G * G * 3);
      const colr = new Float32Array(G * G * 3);
      const cc = new THREE.Color();
      for (let gy = 0; gy < G; gy++) {
        for (let gx = 0; gx < G; gx++) {
          const ix = Math.min(N - 1, gx * STEP);
          const iy = Math.min(N - 1, gy * STEP);
          const metres = dem.data[iy * N + ix];
          // East is to the climber's right (-X); north is ahead (+Z).
          const x = -(ix - sx) * cell;
          const z = -(iy - sy) * cell;
          const r = Math.hypot(x, z) / RADIUS;
          const skirt = 1 - smoothstep(0.55, 1, r);
          const y = (Math.max(0, metres - FLOOR_M) * SCALE * RELIEF) * skirt - (1 - skirt) * 260 - 30;
          const k = (gy * G + gx) * 3;
          pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
          const t = clamp((metres - FLOOR_M) / 3000, 0, 1);
          const n = fbm(x * 0.0016, z * 0.0016, 3);
          cc.copy(COL.rockLow).lerp(COL.rockMid, clamp(t * 1.5 + n * 0.3, 0, 1)).lerp(COL.strataRed, clamp(0.2 + n, 0, 0.4) * (1 - t)).lerp(COL.rockHigh, smoothstep(0.55, 0.9, t) * 0.6);
          colr[k] = cc.r; colr[k + 1] = cc.g; colr[k + 2] = cc.b;
        }
      }
      const idx = [];
      for (let gy = 0; gy < G - 1; gy++) {
        for (let gx = 0; gx < G - 1; gx++) {
          const a = gy * G + gx;
          idx.push(a, a + 1, a + G, a + 1, a + G + 1, a + G);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      if (g.attributes.normal.getY(Math.floor(G * G / 2)) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
      // The snow test in the shader reads altitude from world y; map it back to real metres.
      mat.userData.uniforms.uBaseAlt.value = FLOOR_M + (30 / (SCALE * RELIEF));
      mat.userData.uniforms.uInvVScale.value = 1 / (SCALE * RELIEF);
      mesh = new THREE.Mesh(g, mat);
      mesh.position.set(centre.x, 0, centre.z);
      mesh.frustumCulled = false;
      mesh.renderOrder = -5;
      group.add(mesh);
    }
    return {
      /** @param {number} s climber progress  @param {number} clear 0..1 how far the air lets you see  @param {THREE.Color} haze */
      update(s, clear, haze) {
        if (!mesh) return;
        const onMountain = smoothstep(route.nodeS[4] - 60, route.nodeS[7], s);
        const opacity = clamp(clear, 0, 1) * (1 - onMountain);
        mesh.visible = opacity > 0.01;
        mat.opacity = opacity;
        // Aerial perspective: distant rock takes on the colour of the air.
        mat.color.copy(base).lerp(haze, 0.46).multiplyScalar(1.25);
      },
    };
  })();

  // ── NPC anchors ──────────────────────────────────────────────────────────
  const npcAnchors = [
    { id: 'ranger', nodeIndex: 0, position: groundAt(5, -5.2) },
    { id: 'arriero', nodeIndex: 2, position: groundAt(S[2] - 3, -6.2) },
    { id: 'doctor', nodeIndex: 4, position: groundAt(S[4] + 3, -6.6) },
    { id: 'guide', nodeIndex: 8, position: groundAt(S[8] + 2, -6.2) },
    { id: 'climber', nodeIndex: 10, position: groundAt(S[10] - 2, -6.0) },
  ];

  return {
    group,
    terrainMesh,
    interactables,
    npcAnchors,
    groundAt,
    massif,
    /** @param {number} time seconds  @param {object} [sky] live sky state for water reflections */
    update(time, sky = null) {
      timeUniform.value = time;
      if (sky) {
        waterUniforms.uSky.value.copy(sky.zenithColor);
        waterUniforms.uHorizon.value.copy(sky.horizonColor);
        waterUniforms.uSunDir.value.copy(sky.sunDirection);
        waterUniforms.uSunColor.value.copy(sky.sunColor).multiplyScalar(sky.sunStrength);
        waterUniforms.fogColor.value.copy(scene.fog.color);
        waterUniforms.fogNear.value = scene.fog.near;
        waterUniforms.fogFar.value = scene.fog.far;
      }
    },
    setPlayerTentColor(hex) {
      playerTents.forEach((tent) => {
        tent.userData.shell.material.color.set(hex);
        tent.userData.vestibule.material.color.set(hex).multiplyScalar(0.72);
      });
    },
  };
}
