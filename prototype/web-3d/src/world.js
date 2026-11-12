// prototype/web-3d/src/world.js
//
// Builds the visible mountain: terrain ribbon, scattered rock/ice/grass,
// camps, signposts, trail markers, the park gate and the summit cross.

import * as THREE from 'three';
import { V_SCALE } from './route.js';
import { fbm, noise2, seededRandom, smoothstep, clamp, lerp } from './noise.js';

const COL = {
  rockLow: new THREE.Color('#9a6b56'),
  rockOchre: new THREE.Color('#b0855f'),
  rockMid: new THREE.Color('#84707a'),
  rockHigh: new THREE.Color('#665e6e'),
  rockDark: new THREE.Color('#4a4354'),
  snow: new THREE.Color('#f3eef4'),
  snowShade: new THREE.Color('#cfd3e8'),
  grass: new THREE.Color('#8f8a55'),
  trailLow: new THREE.Color('#cdb08e'),
  trailHigh: new THREE.Color('#b9b3c4'),
};

const TENT_COLORS = ['#e2742c', '#e9b23a', '#3f7fb5', '#c8463a', '#5b9a6a', '#d9d4cc', '#7a5ea8'];

function lateralColumns() {
  const side = [1.5, 3.2, 5.5, 8.5, 12, 16, 21, 27, 34, 42, 52, 64, 78, 95, 115, 140, 170, 205, 250, 305, 370, 450, 550, 670, 820, 1000, 1220, 1500, 1850, 2300];
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

export function buildWorld({ scene, route, terrain }) {
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

  // ── terrain ribbon ───────────────────────────────────────────────────────
  const cols = lateralColumns();
  const ROW_STEP = 4;
  const rows = Math.floor((terrain.sMax - terrain.sMin) / ROW_STEP) + 1;
  const nCols = cols.length;
  const positions = new Float32Array(rows * nCols * 3);
  const meta = new Float32Array(rows * nCols * 2); // s, d
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
  const c2 = new THREE.Color();
  for (let i = 0; i < rows * nCols; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const s = meta[i * 2];
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
    c1.lerp(COL.rockDark, steep * 0.45);
    // Sparse high-desert grass low in the valley.
    const grass = (1 - smoothstep(3250, 3750, alt)) * (1 - steep) * clamp(0.35 + nB * 0.6, 0, 0.7);
    c1.lerp(COL.grass, grass);
    // Snow line (lower on the distant ranges' shaded sides via noise).
    // Patchy cover: wind-scoured rock shows through until well above 6000 m.
    const cover = smoothstep(4700, 6300, alt + nA * 380);
    const patch = noise2(x * 0.045 + 11, z * 0.045 - 7) * 0.5 + nB * 0.25;
    const snow = smoothstep(0.34, 0.6, cover * 1.25 + patch * (1 - cover * 0.6) * smoothstep(0.02, 0.3, cover) - steep * 0.35);
    c2.copy(COL.snow).lerp(COL.snowShade, clamp(0.3 + nB * 0.4 + steep * 0.4, 0, 1));
    c1.lerp(c2, clamp(snow, 0, 1));
    // Worn trail.
    const onTrail = (1 - smoothstep(1.0, 3.6, a)) * (s > -40 && s < route.total + 6 ? 1 : 0);
    if (onTrail > 0) {
      c2.copy(COL.trailLow).lerp(COL.trailHigh, smoothstep(4700, 5600, alt));
      c1.lerp(c2, onTrail * 0.62);
    }
    const jitter = 1 + nB * 0.05;
    colors[i * 3] = c1.r * jitter; colors[i * 3 + 1] = c1.g * jitter; colors[i * 3 + 2] = c1.b * jitter;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrainMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0,
  }));
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

  // Rocks and boulders.
  scatter({
    geometry: new THREE.DodecahedronGeometry(1, 0),
    material: flat(),
    count: 2600,
    place(o, c) {
      const s = lerp(-70, route.total + 30, rand());
      const side = rand() < 0.5 ? -1 : 1;
      const d = side * (4.5 + Math.pow(rand(), 1.7) * 150);
      const p = groundAt(s, d);
      if (nearLagoon(p)) return false;
      const big = rand() < 0.07;
      const sc = big ? 1.6 + rand() * 2.6 : 0.25 + rand() * 0.9;
      if (big && Math.abs(d) < 9) return false;
      o.position.set(p.x, p.y + sc * 0.25, p.z);
      o.rotation.set(rand() * 6.3, rand() * 6.3, rand() * 6.3);
      o.scale.set(sc * (0.8 + rand() * 0.6), sc * (0.55 + rand() * 0.5), sc * (0.8 + rand() * 0.6));
      const alt = altOf(p.y);
      c.copy(COL.rockLow).lerp(COL.rockHigh, smoothstep(3600, 5600, alt)).multiplyScalar(0.72 + rand() * 0.4);
      if (alt > 5300 && rand() < 0.4) c.lerp(COL.snow, 0.55);
      return true;
    },
  });

  // High-desert grass tufts and low shrubs (approach only).
  scatter({
    geometry: new THREE.ConeGeometry(0.42, 0.55, 5),
    material: flat(),
    count: 1500,
    castShadow: false,
    place(o, c) {
      const s = lerp(-70, S[3] + 40, rand());
      const d = (rand() < 0.5 ? -1 : 1) * (3.5 + Math.pow(rand(), 1.4) * 95);
      const p = groundAt(s, d);
      if (altOf(p.y) > 3850 || nearLagoon(p)) return false;
      const sc = 0.35 + rand() * 0.6;
      o.position.set(p.x, p.y + 0.2 * sc, p.z);
      o.rotation.set(0, rand() * 6.3, 0);
      o.scale.set(sc * 1.1, sc * 1.5, sc * 1.1);
      c.set(rand() < 0.3 ? '#6f7445' : '#958c52').multiplyScalar(0.8 + rand() * 0.35);
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
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(terrain.lagoon.radius + 6, 40),
    new THREE.MeshStandardMaterial({ color: '#4a7f94', roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.9 }),
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
  const tentGeo = new THREE.ConeGeometry(1.75, 1.7, 4, 1);
  tentGeo.rotateY(Math.PI / 4);
  const domeGeo = new THREE.SphereGeometry(3.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const campPlan = { approach_confluencia: 8, base_plaza_mulas: 17, camp_canada: 4, camp_nido_condores: 6, camp_colera: 3 };
  const interactables = [];
  const playerTents = [];
  route.nodes.forEach((node, i) => {
    if (!node.isCamp) return;
    const n = campPlan[node.id] ?? 4;
    const placed = [];
    for (let t = 0, guard = 0; t < n && guard < 400; guard++) {
      const s = S[i] + lerp(-24, 20, rand());
      const d = (rand() < 0.35 ? -1 : 1) * lerp(12, 48, rand());
      if (placed.some((q) => Math.hypot(q.s - s, q.d - d) < 6.5)) continue;
      placed.push({ s, d });
      const p = groundAt(s, d);
      const big = node.id === 'base_plaza_mulas' && t < 2;
      const mesh = new THREE.Mesh(big ? domeGeo : tentGeo, flat(big ? '#d9d4cc' : TENT_COLORS[Math.floor(rand() * TENT_COLORS.length)]));
      mesh.position.set(p.x, p.y + (big ? -0.2 : 0.8), p.z);
      mesh.rotation.y = rand() * 6.3;
      if (!big) mesh.scale.set(1.25, 1, 0.95 + rand() * 0.3);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      t++;
    }
    // The player's own tent, right beside the trail.
    const tp = groundAt(S[i] + 10, 7.4);
    const tent = new THREE.Group();
    const body = new THREE.Mesh(tentGeo, flat('#e2742c'));
    body.position.y = 0.82;
    body.scale.set(1.3, 1, 1.05);
    body.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), flat('#3b3632'));
    pole.position.set(1.9, 1.3, 0);
    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.03), flat('#f2c14e'));
    pennant.position.set(2.22, 2.4, 0);
    tent.add(body, pole, pennant);
    tent.position.copy(tp);
    tent.rotation.y = rand() * 6.3;
    group.add(tent);
    playerTents.push(body);
    interactables.push({ type: 'tent', nodeIndex: i, position: tp.clone(), radius: 5 });
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
    setPlayerTentColor(hex) { playerTents.forEach((m) => m.material.color.set(hex)); },
  };
}
