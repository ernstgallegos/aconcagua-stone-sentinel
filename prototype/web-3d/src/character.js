// prototype/web-3d/src/character.js
//
// Stylised low-poly mountaineer built from primitives, with a small
// procedural animator (walk, idle, rest, struggle, collapse). The body is
// where the player reads fatigue: posture, cadence and stumbles change long
// before any number does.

import * as THREE from 'three';
import { clamp, lerp } from './noise.js';

export const CHARACTER_LOOKS = {
  francisco: { jacket: '#f07a28', hood: '#2f66b0', pants: '#5a5668', pack: '#7a8290', skin: '#c99774' },
  laura: { jacket: '#c8463a', hood: '#e9e3da', pants: '#3d4658', pack: '#6a5f55', skin: '#e0b48f' },
  erik: { jacket: '#2f6f8f', hood: '#1f3440', pants: '#3b3b40', pack: '#b9872f', skin: '#e3bba0' },
  daniela: { jacket: '#7a5ea8', hood: '#f2c14e', pants: '#4b4350', pack: '#3f4c56', skin: '#d6a57f' },
  blake: { jacket: '#e9b23a', hood: '#2b2b30', pants: '#2f3440', pack: '#7a2f2a', skin: '#e6c1a6' },
  irina: { jacket: '#3f9a8a', hood: '#d9d4cc', pants: '#40394a', pack: '#8a4f6a', skin: '#e8c7ae' },
  ranger: { jacket: '#5d6b3c', hood: '#8a7a4a', pants: '#4a4032', pack: null, skin: '#b9835f' },
  arriero: { jacket: '#8a3b2e', hood: '#2e2a26', pants: '#5a4a3a', pack: null, skin: '#a8734f' },
  doctor: { jacket: '#e9e3da', hood: '#c8463a', pants: '#3d4658', pack: null, skin: '#d9a987' },
  guide: { jacket: '#1f4f7a', hood: '#e2742c', pants: '#2f2f36', pack: '#3b3b40', skin: '#c08d68' },
  climber: { jacket: '#5b9a6a', hood: '#3b3b40', pants: '#4a4756', pack: '#7a5ea8', skin: '#deb393' },
};

export function buildCharacter(lookId = 'francisco', { withPole = true } = {}) {
  const look = CHARACTER_LOOKS[lookId] || CHARACTER_LOOKS.francisco;
  const mat = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const jacket = mat(look.jacket, 0.72);
  const pants = mat(look.pants, 0.86);
  const dark = mat('#23242b', 0.7);
  const root = new THREE.Group();
  const body = new THREE.Group(); // tilts / bobs
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.94;
  body.add(hips);
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 4, 12), pants);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  // Torso: a down jacket reads as stacked baffles.
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.3, 6, 16), jacket);
  chest.position.y = 0.36;
  chest.scale.set(1.12, 1, 0.82);
  torso.add(chest);
  for (let i = 0; i < 4; i++) {
    const baffle = new THREE.Mesh(new THREE.TorusGeometry(0.228 - Math.abs(i - 1.5) * 0.012, 0.03, 6, 20), jacket);
    baffle.rotation.x = Math.PI / 2;
    baffle.position.y = 0.16 + i * 0.13;
    baffle.scale.set(1.14, 0.84, 1);
    torso.add(baffle);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 16), jacket);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.7;
  torso.add(collar);

  const head = new THREE.Group();
  head.position.y = 0.86;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12), mat(look.skin, 0.75));
  face.scale.set(0.92, 1.05, 0.98);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.66), mat(look.hood, 0.8));
  hood.rotation.x = -0.42;
  hood.position.set(0, 0.03, -0.025);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 5, 16, Math.PI), mat(look.hood, 0.8));
  brim.rotation.set(Math.PI / 2 - 0.5, 0, 0);
  brim.position.set(0, 0.07, 0.03);
  const goggles = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.15, metalness: 0.6 }));
  goggles.rotation.z = Math.PI / 2;
  goggles.position.set(0, 0.035, 0.125);
  goggles.scale.z = 0.6;
  head.add(face, hood, brim, goggles);
  torso.add(head);

  if (look.pack) {
    const packMat = mat(look.pack, 0.8);
    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 5, 12), packMat);
    pack.position.set(0, 0.4, -0.27);
    pack.scale.set(1.12, 1, 0.82);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), packMat);
    lid.position.set(0, 0.68, -0.26);
    lid.scale.set(1.12, 0.55, 0.85);
    const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.14, 3, 8), mat(new THREE.Color(look.pack).multiplyScalar(0.8), 0.8));
    pocket.position.set(0, 0.34, -0.41);
    pocket.scale.set(1.3, 1, 0.6);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.46, 12), mat('#c8b48f', 0.9));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.12, -0.3);
    torso.add(pack, lid, pocket, roll);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 5, 14, Math.PI * 1.05), dark);
      strap.position.set(side * 0.15, 0.44, -0.03);
      strap.rotation.set(0, Math.PI / 2, -0.25);
      strap.scale.set(0.95, 1.25, 1);
      torso.add(strap);
    }
  }

  /** Two-segment limb: returns the upper pivot and the lower (knee / elbow) pivot. */
  function limb({ upper, lower, radius, material, x, y, end }) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(radius, upper, 4, 10), material);
    a.position.y = -upper / 2 - radius * 0.3;
    const joint = new THREE.Group();
    joint.position.y = -upper - radius * 0.6;
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.86, lower, 4, 10), material);
    b.position.y = -lower / 2 - radius * 0.2;
    joint.add(b);
    if (end) { end.position.y = -lower - radius * 0.6; joint.add(end); }
    pivot.add(a, joint);
    return { pivot, joint };
  }
  const glove = () => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), dark); g.scale.set(1, 1.2, 0.9); return g; };
  const boot = () => {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.1, 3, 8), mat('#3a2f2a', 0.7));
    upper.position.y = 0.02;
    const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 3, 8), mat('#1d1a18', 0.9));
    sole.rotation.x = Math.PI / 2;
    sole.position.set(0, -0.085, 0.07);
    sole.scale.set(1.05, 1, 0.7);
    const gaiter = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.1, 0.2, 10), mat(look.hood, 0.8));
    gaiter.position.y = 0.16;
    g.add(upper, sole, gaiter);
    return g;
  };
  const L = { arm: limb({ upper: 0.27, lower: 0.25, radius: 0.078, material: jacket, x: -0.3, y: 0.6, end: glove() }),
              leg: limb({ upper: 0.36, lower: 0.34, radius: 0.098, material: pants, x: -0.125, y: -0.02, end: boot() }) };
  const R = { arm: limb({ upper: 0.27, lower: 0.25, radius: 0.078, material: jacket, x: 0.3, y: 0.6, end: glove() }),
              leg: limb({ upper: 0.36, lower: 0.34, radius: 0.098, material: pants, x: 0.125, y: -0.02, end: boot() }) };
  torso.add(L.arm.pivot, R.arm.pivot);
  hips.add(L.leg.pivot, R.leg.pivot);

  if (withPole) {
    const pole = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 1.18, 6), new THREE.MeshStandardMaterial({ color: '#8a8d96', roughness: 0.35, metalness: 0.8 }));
    shaft.position.y = -0.5;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.16, 8), dark);
    grip.position.y = 0.06;
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10), dark);
    basket.position.y = -1.02;
    pole.add(shaft, grip, basket);
    pole.position.y = -0.3;
    pole.rotation.x = 0.5;
    R.arm.joint.add(pole);
  }

  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  root.scale.setScalar(1.06);

  const st = { phase: 0, pose: 'walk', poseT: 0, sit: 0, down: 0, stagger: 0, look: 0 };

  /**
   * @param {number} dt
   * @param {object} p
   * @param {number} p.speed       - ground speed (world units / s)
   * @param {number} [p.fatigue]   - 0..1
   * @param {number} [p.wind]      - 0..1.3
   * @param {number} [p.slope]     - signed grade in direction of travel
   * @param {string} [p.pose]      - 'walk' | 'rest' | 'struggle' | 'down'
   */
  function animate(dt, { speed = 0, fatigue = 0, wind = 0, slope = 0, pose = 'walk' } = {}) {
    st.pose = pose;
    const moving = speed > 0.25;
    const cadence = 1.5 + speed * 0.4;
    st.phase += dt * cadence * (moving ? 1 : 0) * Math.PI;
    const idle = performance.now() / 1000;
    const amp = moving ? clamp(speed / 5.5, 0.3, 1) : 0;
    const climb = clamp(slope, -0.4, 0.6);

    st.sit = lerp(st.sit, pose === 'rest' ? 1 : 0, Math.min(1, dt * 3.2));
    st.down = lerp(st.down, pose === 'down' ? 1 : 0, Math.min(1, dt * 1.8));
    st.stagger = lerp(st.stagger, pose === 'struggle' ? 1 : 0, Math.min(1, dt * 4));
    const up = 1 - st.sit;

    // Legs: hip swings, knee folds as the leg comes through; steeper ground lifts the knee higher.
    const stride = (0.62 + climb * 0.35) * amp;
    for (const [side, leg] of [[1, L.leg], [-1, R.leg]]) {
      const ph = st.phase + (side > 0 ? 0 : Math.PI);
      const hip = Math.sin(ph) * stride + climb * 0.3 * amp;
      const lift = Math.max(0, Math.cos(ph)) * (0.95 + climb * 0.9) * amp;
      leg.pivot.rotation.x = -hip * up - lift * 0.35 * up - st.sit * 1.5;
      leg.joint.rotation.x = (lift * 1.05 + 0.06) * up + st.sit * 1.55;
      leg.pivot.rotation.z = side * 0.02;
    }
    // Arms: counter-swing with a soft elbow; the pole arm reaches and plants.
    const swing = Math.sin(st.phase) * 0.5 * amp;
    L.arm.pivot.rotation.x = swing * up - st.sit * 0.55;
    L.arm.joint.rotation.x = -(0.32 + Math.max(0, swing) * 0.5) * up - st.sit * 0.7;
    R.arm.pivot.rotation.x = (-swing * 0.75 - 0.22) * up - st.sit * 0.5;
    R.arm.joint.rotation.x = -(0.55 + Math.max(0, -swing) * 0.4) * up - st.sit * 0.6;
    L.arm.pivot.rotation.z = -0.1 - st.stagger * 0.5;
    R.arm.pivot.rotation.z = 0.1 + st.stagger * 0.35;

    const breathe = Math.sin(idle * (1.6 + fatigue * 2.6)) * (0.01 + fatigue * 0.028);
    const bob = Math.abs(Math.cos(st.phase)) * 0.055 * amp;
    hips.position.y = 0.94 - bob + breathe - st.sit * 0.52;
    hips.rotation.y = Math.sin(st.phase) * 0.09 * amp;
    chest.scale.z = 0.82 + breathe * 1.4;
    // Lean into the hill and the wind; hunch as fatigue builds.
    const lean = climb * 0.5 * (moving ? 1 : 0.3) + fatigue * 0.24 + wind * 0.1 + st.stagger * 0.35 + 0.04;
    torso.rotation.x = lerp(torso.rotation.x, lean - st.sit * 0.12, Math.min(1, dt * 6));
    torso.rotation.y = -Math.sin(st.phase) * 0.12 * amp;
    torso.rotation.z = Math.sin(st.phase) * 0.03 * amp + Math.sin(idle * 7) * 0.05 * st.stagger;
    head.rotation.x = -lean * 0.45 + fatigue * 0.28 + st.sit * 0.25;
    head.rotation.y = lerp(head.rotation.y, st.look, Math.min(1, dt * 4)) + Math.sin(st.phase) * 0.05 * amp;

    body.rotation.x = st.down * 1.45;
    body.position.y = -st.down * 0.55;
    body.position.z = st.down * 0.5;
  }

  return { root, animate, state: st, look };
}
