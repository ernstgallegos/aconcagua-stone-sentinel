// prototype/web-3d/src/sky.js
//
// Sky dome, sun/moon light, fog, cloud sea, stars and wind-blown snow.
// Everything here is driven by two engine values the player must learn to
// read — weather severity and visibility — plus the expedition clock.

import * as THREE from 'three';
import { clamp, lerp, smoothstep, seededRandom, fbm } from './noise.js';

// minutes → [zenith, horizon, sunTint, sunIntensity, ambient]
const KEYS = [
  [0, '#060a15', '#10182b', '#8fa6d8', 0.0, 0.36],
  [285, '#0c1226', '#232a46', '#8fa6d8', 0.0, 0.4],
  [330, '#2a3160', '#b0708c', '#ff9d7a', 0.4, 0.62],
  [360, '#3d4c8c', '#f0a48c', '#ffb089', 1.35, 0.98],
  [430, '#4868a8', '#f2c3a8', '#ffd0a6', 1.75, 0.9],
  [540, '#4a84c8', '#cfe0ee', '#fff1dc', 2.1, 0.8],
  [780, '#3c7ccf', '#d6e6f3', '#fffaf0', 2.5, 0.9],
  [990, '#4a7cc0', '#ecdcc6', '#ffe9c8', 2.1, 0.8],
  [1110, '#5a5596', '#f0a184', '#ffb07a', 1.3, 0.6],
  [1200, '#3a3470', '#b0607a', '#e88a78', 0.5, 0.6],
  [1290, '#141a38', '#33304f', '#8fa6d8', 0.0, 0.42],
  [1440, '#060a15', '#10182b', '#8fa6d8', 0.0, 0.36],
];
const KEY_COLORS = KEYS.map((k) => [new THREE.Color(k[1]), new THREE.Color(k[2]), new THREE.Color(k[3])]);
const OVERCAST_TOP = new THREE.Color('#6f7684');
const OVERCAST_HORIZON = new THREE.Color('#a9adb6');
const NIGHT_OVERCAST = new THREE.Color('#0b0e16');

const FOG_FAR = [95, 380, 1500, 5200];   // by visibility 0..3
const FOG_NEAR = [3, 18, 90, 260];

export function createSky({ scene, renderer }) {
  const uniforms = {
    topColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color() },
    sunGlow: { value: 1 },
    haze: { value: 0 },
    hazeColor: { value: new THREE.Color() },
    uCoverage: { value: 0.3 },
    uCloudOffset: { value: new THREE.Vector2() },
    uCloudLit: { value: new THREE.Color('#ffffff') },
    uCloudShade: { value: new THREE.Color('#8f93a8') },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor;
        uniform float sunGlow; uniform float haze; uniform vec3 hazeColor;
        uniform float uCoverage; uniform vec2 uCloudOffset; uniform vec3 uCloudLit; uniform vec3 uCloudShade;
        varying vec3 vDir;
        float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float cfbm(vec2 p) {
          float a = 0.5; float s = 0.0;
          for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
          return s;
        }
        void main() {
          vec3 dir = normalize(vDir);
          float h = clamp(dir.y, -0.2, 1.0);
          float t = pow(smoothstep(-0.08, 0.75, h), 0.6);
          vec3 col = mix(horizonColor, topColor, t);
          vec3 sd = normalize(sunDir);
          float sdot = max(dot(dir, sd), 0.0);
          col += sunColor * (pow(sdot, 420.0) * 2.4 + pow(sdot, 22.0) * 0.24 + pow(sdot, 4.0) * 0.08) * sunGlow;

          // Cloud deck: a noise field on a plane overhead, lit from the sun side.
          if (dir.y > 0.01) {
            vec2 uv = dir.xz / (dir.y + 0.14) * 1.15 + uCloudOffset;
            float warp = cfbm(uv * 0.55 + 4.7);
            float d = cfbm(uv + warp * 0.9);
            float edge0 = mix(0.66, 0.22, uCoverage);
            float c = smoothstep(edge0 - 0.07, edge0 + 0.16, d);
            float toward = cfbm(uv + sd.xz * 0.22 + warp * 0.9);
            float lit = clamp(0.62 + (d - toward) * 2.6 + sdot * 0.25, 0.0, 1.0);
            vec3 cloud = mix(uCloudShade, uCloudLit, lit);
            cloud += sunColor * pow(sdot, 8.0) * 0.25 * sunGlow;   // silver lining near the sun
            float fadeOut = smoothstep(0.01, 0.2, dir.y);
            col = mix(col, cloud, c * fadeOut);
          }

          col = mix(col, hazeColor, haze * (1.0 - 0.35 * smoothstep(0.1, 0.9, h)));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);

  // Stars
  const starRand = seededRandom(42);
  const starPos = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const u = starRand() * Math.PI * 2;
    const v = Math.acos(starRand() * 0.95 + 0.03);
    starPos[i * 3] = Math.sin(v) * Math.cos(u) * 8500;
    starPos[i * 3 + 1] = Math.cos(v) * 8500;
    starPos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 8500;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: '#dfe8ff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
  stars.renderOrder = -9;
  stars.frustumCulled = false;
  scene.add(stars);

  // Lights
  const hemi = new THREE.HemisphereLight('#cfe0ff', '#6b5a52', 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  const SH = 58;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  sun.shadow.radius = 2.2;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog('#cfe0ee', 200, 5000);

  // Cloud sea below the upper mountain
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256; cloudCanvas.height = 256;
  {
    const ctx = cloudCanvas.getContext('2d');
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        // tileable by blending wrapped samples
        const n = (fbm(x / 34, y / 34, 4) + fbm((x - 256) / 34, y / 34, 4) * (x / 256) + fbm(x / 34, (y - 256) / 34, 4) * (y / 256)) / (1 + x / 256 + y / 256);
        const v = clamp(0.62 + n * 0.9, 0, 1);
        const i = (y * 256 + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(smoothstep(0.42, 0.8, v) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
  cloudTex.repeat.set(9, 9);
  const cloudSea = new THREE.Mesh(
    new THREE.PlaneGeometry(16000, 16000),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false, fog: true }),
  );
  cloudSea.rotation.x = -Math.PI / 2;
  cloudSea.renderOrder = 2;
  scene.add(cloudSea);

  // Wind-blown snow / spindrift
  const SNOW_COUNT = 3200;
  const BOX = new THREE.Vector3(70, 34, 70);
  const snowPos = new Float32Array(SNOW_COUNT * 3);
  const snowRand = seededRandom(7);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPos[i * 3] = (snowRand() - 0.5) * BOX.x;
    snowPos[i * 3 + 1] = (snowRand() - 0.5) * BOX.y;
    snowPos[i * 3 + 2] = (snowRand() - 0.5) * BOX.z;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const flakeCanvas = document.createElement('canvas');
  flakeCanvas.width = 32; flakeCanvas.height = 32;
  {
    const ctx = flakeCanvas.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
    color: '#ffffff', size: 0.12, map: new THREE.CanvasTexture(flakeCanvas), transparent: true, opacity: 0, depthWrite: false, fog: true,
  }));
  snow.frustumCulled = false;
  scene.add(snow);

  // Smoothed state
  const cur = {
    minutes: 360, weather: 0, visibility: 3, fogFar: FOG_FAR[3], fogNear: FOG_NEAR[3], wind: 0.2,
  };
  const target = { minutes: 360, weather: 0, visibility: 3 };
  const windDir = new THREE.Vector3(1, 0, 0.3).normalize();
  const cTop = new THREE.Color();
  const cHor = new THREE.Color();
  const cSun = new THREE.Color();
  const sunVec = new THREE.Vector3();
  const cloudLit = new THREE.Color();
  const cloudShade = new THREE.Color();
  let gust = 0;
  let clock = 0;

  function sample(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    let i = 0;
    while (i < KEYS.length - 2 && m >= KEYS[i + 1][0]) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = clamp((m - a[0]) / (b[0] - a[0]), 0, 1);
    cTop.copy(KEY_COLORS[i][0]).lerp(KEY_COLORS[i + 1][0], t);
    cHor.copy(KEY_COLORS[i][1]).lerp(KEY_COLORS[i + 1][1], t);
    cSun.copy(KEY_COLORS[i][2]).lerp(KEY_COLORS[i + 1][2], t);
    return { sunIntensity: lerp(a[4], b[4], t), ambient: lerp(a[5], b[5], t), m };
  }

  return {
    windDir,
    get wind() { return cur.wind; },
    get gust() { return gust; },
    get minutes() { return cur.minutes; },
    get fogFar() { return cur.fogFar; },
    /** 0..1: how far the air lets you see (1 = clear to the horizon). */
    get clearness() { return smoothstep(900, 4200, cur.fogFar); },
    get horizonColor() { return cHor; },
    get zenithColor() { return cTop; },
    get sunDirection() { return sunVec; },
    get sunColor() { return sun.color; },
    get sunStrength() { return sun.intensity; },
    /** Shadow map texels are expensive on weak GPUs. */
    setShadowQuality(size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } },
    /** Tell the sky what the engine now says. `snap` skips the time-lapse. */
    setConditions({ minutesAbsolute, weather, visibility }, snap = false) {
      target.minutes = minutesAbsolute;
      target.weather = weather;
      target.visibility = visibility;
      if (snap) {
        cur.minutes = minutesAbsolute; cur.weather = weather; cur.visibility = visibility;
        cur.fogFar = FOG_FAR[clamp(Math.round(visibility), 0, 3)];
        cur.fogNear = FOG_NEAR[clamp(Math.round(visibility), 0, 3)];
      }
    },
    update(dt, camera, playerPos, altitudeBand) {
      clock += dt;
      // Time-lapse toward the engine clock (fast enough to finish in ~2.5 s).
      const gap = target.minutes - cur.minutes;
      cur.minutes += Math.abs(gap) < 0.5 ? gap : gap * Math.min(1, dt * 1.6) + Math.sign(gap) * Math.min(Math.abs(gap), dt * 12);
      cur.weather = lerp(cur.weather, target.weather, Math.min(1, dt * 0.7));
      cur.visibility = lerp(cur.visibility, target.visibility, Math.min(1, dt * 0.7));

      const { sunIntensity, ambient, m } = sample(cur.minutes);
      const overcast = clamp(cur.weather / 4, 0, 1);
      const night = sunIntensity <= 0.01 ? 1 : 0;

      // Sun path: rises ~06:10, sets ~19:50.
      const dayT = (m - 318) / (1215 - 318);
      const elev = Math.sin(clamp(dayT, -0.2, 1.2) * Math.PI) * 1.05;
      const az = lerp(-1.9, 1.9, clamp(dayT, 0, 1));
      if (elev > -0.05) sunVec.set(Math.sin(az) * Math.cos(elev), Math.max(0.06, Math.sin(elev)), Math.cos(az) * Math.cos(elev)).normalize();
      else sunVec.set(-0.4, 0.75, -0.3).normalize(); // moon

      cTop.lerp(night ? NIGHT_OVERCAST : OVERCAST_TOP, overcast * 0.85);
      cHor.lerp(night ? NIGHT_OVERCAST : OVERCAST_HORIZON, overcast * 0.9);

      // Fog follows visibility (log-space lerp so whiteouts close in convincingly).
      const vi = clamp(cur.visibility, 0, 3);
      const lo = Math.floor(vi);
      const hi = Math.min(3, lo + 1);
      const ft = vi - lo;
      let far = Math.exp(lerp(Math.log(FOG_FAR[lo]), Math.log(FOG_FAR[hi]), ft));
      let near = lerp(FOG_NEAR[lo], FOG_NEAR[hi], ft);
      if (cur.weather > 2.5) { far *= lerp(1, 0.6, clamp(cur.weather - 2.5, 0, 1)); }
      cur.fogFar = lerp(cur.fogFar, far, Math.min(1, dt * 1.2));
      cur.fogNear = lerp(cur.fogNear, near, Math.min(1, dt * 1.2));
      scene.fog.near = cur.fogNear;
      scene.fog.far = cur.fogFar;
      scene.fog.color.copy(cHor);

      uniforms.topColor.value.copy(cTop);
      uniforms.horizonColor.value.copy(cHor);
      uniforms.sunDir.value.copy(sunVec);
      uniforms.sunColor.value.copy(cSun);
      uniforms.sunGlow.value = (1 - overcast * 0.9) * (night ? 0.25 : 1);
      uniforms.haze.value = 1 - smoothstep(300, 2600, cur.fogFar);
      uniforms.hazeColor.value.copy(cHor);
      // Clouds: fair-weather scraps on a clear day, a closed lid in a storm; they drift with the wind.
      uniforms.uCoverage.value = clamp(0.2 + overcast * 0.85, 0, 1);
      uniforms.uCloudOffset.value.x += windDir.x * dt * (0.004 + cur.wind * 0.02);
      uniforms.uCloudOffset.value.y += windDir.z * dt * (0.004 + cur.wind * 0.02);
      cloudLit.set('#ffffff').lerp(cSun, night ? 0 : 0.45).multiplyScalar(night ? 0.16 : clamp(0.55 + sunIntensity * 0.3, 0, 1.25) * (1 - overcast * 0.35));
      cloudShade.copy(cHor).lerp(cTop, 0.55).multiplyScalar(night ? 0.5 : 0.82 - overcast * 0.22);
      uniforms.uCloudLit.value.copy(cloudLit);
      uniforms.uCloudShade.value.copy(cloudShade);
      dome.position.copy(camera.position);
      stars.position.copy(camera.position);
      stars.material.opacity = clamp((night ? 1 : 1 - sunIntensity * 2.5), 0, 1) * (1 - overcast) * (1 - uniforms.haze.value);

      const direct = night ? 0.16 * (1 - overcast) : sunIntensity * (1 - overcast * 0.78);
      sun.intensity = direct;
      sun.color.copy(night ? cSun.set('#8fa6d8') : cSun);
      sun.position.copy(playerPos).addScaledVector(sunVec, 180);
      sun.target.position.copy(playerPos);
      hemi.intensity = ambient * (1 - overcast * 0.25) + overcast * 0.12;
      hemi.color.copy(cTop).lerp(new THREE.Color('#ffffff'), 0.45);
      hemi.groundColor.set('#8f8196').lerp(cHor, 0.35); // lavender bounce: shadows read violet, as in the paintings
      renderer.toneMappingExposure = night ? 1.05 : 1.12 - overcast * 0.12;

      // Wind: stronger with weather and altitude, with slow gusts.
      const baseWind = 0.12 + cur.weather * 0.22 + altitudeBand * 0.05;
      gust = 0.5 + 0.5 * Math.sin(clock * 0.37) * Math.sin(clock * 0.11 + 1.3);
      cur.wind = lerp(cur.wind, clamp(baseWind * (0.7 + gust * 0.6), 0, 1.3), Math.min(1, dt * 1.5));
      windDir.set(Math.cos(clock * 0.021 + 0.8), 0, Math.sin(clock * 0.021 + 0.8));

      // Spindrift
      const snowAmount = clamp((cur.weather - 0.6) / 2.6, 0, 1) * 0.85 + (altitudeBand >= 3 ? 0.12 : 0) + (altitudeBand >= 4 ? 0.08 : 0);
      snow.material.opacity = clamp(snowAmount, 0, 0.95);
      snow.visible = snowAmount > 0.02;
      if (snow.visible) {
        const speed = 5 + cur.wind * 34;
        const p = snowGeo.attributes.position;
        const arr = p.array;
        const drawn = Math.floor(SNOW_COUNT * clamp(0.25 + snowAmount, 0, 1));
        snowGeo.setDrawRange(0, drawn);
        for (let i = 0; i < drawn; i++) {
          const j = i * 3;
          arr[j] += (windDir.x * speed + Math.sin(clock * 2 + i) * 0.8) * dt;
          arr[j + 1] += (-1.4 - (i % 5) * 0.25 + Math.sin(clock * 1.3 + i * 0.7) * 0.9) * dt;
          arr[j + 2] += (windDir.z * speed + Math.cos(clock * 1.7 + i) * 0.8) * dt;
          if (arr[j] > BOX.x / 2) arr[j] -= BOX.x; else if (arr[j] < -BOX.x / 2) arr[j] += BOX.x;
          if (arr[j + 1] < -BOX.y / 2) arr[j + 1] += BOX.y; else if (arr[j + 1] > BOX.y / 2) arr[j + 1] -= BOX.y;
          if (arr[j + 2] > BOX.z / 2) arr[j + 2] -= BOX.z; else if (arr[j + 2] < -BOX.z / 2) arr[j + 2] += BOX.z;
        }
        p.needsUpdate = true;
        snow.position.copy(camera.position);
        snow.material.size = 0.1 + cur.wind * 0.05;
      }

      // Cloud sea: only once the climber is clearly above it.
      const seaY = 122;
      cloudSea.position.set(playerPos.x, seaY, playerPos.z);
      cloudTex.offset.set((playerPos.x / 16000) * 9 + clock * 0.0012, (-playerPos.z / 16000) * 9 + clock * 0.0007);
      cloudSea.material.opacity = smoothstep(seaY + 22, seaY + 75, playerPos.y) * 0.9 * (1 - overcast * 0.5);
      cloudSea.material.color.copy(cHor).lerp(new THREE.Color('#ffffff'), night ? 0.05 : 0.55);
      cloudSea.visible = cloudSea.material.opacity > 0.01;
    },
  };
}
