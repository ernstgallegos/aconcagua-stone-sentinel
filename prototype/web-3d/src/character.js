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
  const mat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 });
  const root = new THREE.Group();
  const body = new THREE.Group(); // tilts / bobs
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  body.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.34), mat(look.jacket));
  chest.position.y = 0.37;
  const hem = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), mat(look.jacket));
  hem.position.y = 0.02;
  torso.add(chest, hem);

  const head = new THREE.Group();
  head.position.y = 0.86;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(look.skin));
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(look.hood));
  hood.rotation.x = -0.35;
  hood.position.set(0, 0.02, -0.02);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.07, 0.06), mat('#1b1f29'));
  goggles.position.set(0, 0.03, 0.15);
  head.add(face, hood, goggles);
  torso.add(head);

  if (look.pack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), mat(look.pack));
    pack.position.set(0, 0.36, -0.28);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 7), mat('#c8b48f'));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.7, -0.27);
    torso.add(pack, roll);
  }

  function limb(len, radius, color, x, y) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 2, 6), mat(color));
    mesh.position.y = -len / 2 - radius * 0.4;
    pivot.add(mesh);
    return pivot;
  }
  const armL = limb(0.5, 0.085, look.jacket, -0.36, 0.62);
  const armR = limb(0.5, 0.085, look.jacket, 0.36, 0.62);
  for (const arm of [armL, armR]) {
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat('#22242b'));
    glove.position.y = -0.66;
    arm.add(glove);
  }
  torso.add(armL, armR);

  const legL = limb(0.62, 0.105, look.pants, -0.15, 0);
  const legR = limb(0.62, 0.105, look.pants, 0.15, 0);
  for (const leg of [legL, legR]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.34), mat('#2a2522'));
    boot.position.set(0, -0.84, 0.05);
    leg.add(boot);
  }
  hips.add(legL, legR);

  let pole = null;
  if (withPole) {
    pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 5), mat('#2a2c33'));
    pole.position.set(0, -0.72, 0.12);
    pole.rotation.x = -0.18;
    armR.add(pole);
  }

  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  root.scale.setScalar(1.08);

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
    const cadence = 1.55 + speed * 0.42;
    st.phase += dt * cadence * (moving ? 1 : 0) * Math.PI;
    const idle = performance.now() / 1000;
    const amp = moving ? clamp(speed / 5.5, 0.25, 1) : 0;

    st.sit = lerp(st.sit, pose === 'rest' ? 1 : 0, Math.min(1, dt * 3.2));
    st.down = lerp(st.down, pose === 'down' ? 1 : 0, Math.min(1, dt * 1.8));
    st.stagger = lerp(st.stagger, pose === 'struggle' ? 1 : 0, Math.min(1, dt * 4));

    const swing = Math.sin(st.phase) * 0.72 * amp;
    legL.rotation.x = swing * (1 - st.sit) - st.sit * 1.45;
    legR.rotation.x = -swing * (1 - st.sit) - st.sit * 1.3;
    armL.rotation.x = -swing * 0.62 * (1 - st.sit) - st.sit * 0.5;
    armR.rotation.x = swing * 0.5 * (1 - st.sit) - 0.12 - st.sit * 0.35;
    armL.rotation.z = -0.07 - st.stagger * 0.5;
    armR.rotation.z = 0.07 + st.stagger * 0.35;

    const breathe = Math.sin(idle * (1.6 + fatigue * 2.6)) * (0.012 + fatigue * 0.03);
    const bob = Math.abs(Math.cos(st.phase)) * 0.07 * amp;
    hips.position.y = 0.92 + bob + breathe - st.sit * 0.5;
    // Lean into the hill and the wind; hunch as fatigue builds.
    const lean = clamp(slope, -0.4, 0.5) * 0.45 * (moving ? 1 : 0.3) + fatigue * 0.24 + wind * 0.1 + st.stagger * 0.35;
    torso.rotation.x = lerp(torso.rotation.x, lean - st.sit * 0.15, Math.min(1, dt * 6));
    torso.rotation.z = Math.sin(st.phase) * 0.035 * amp + Math.sin(idle * 7) * 0.05 * st.stagger;
    head.rotation.x = -lean * 0.5 + fatigue * 0.28 + st.sit * 0.25;
    head.rotation.y = lerp(head.rotation.y, st.look, Math.min(1, dt * 4));

    body.rotation.x = st.down * 1.45;
    body.position.y = -st.down * 0.55;
    body.position.z = st.down * 0.5;
  }

  return { root, animate, state: st, look };
}
