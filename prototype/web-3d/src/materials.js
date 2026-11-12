// prototype/web-3d/src/materials.js
//
// Procedural surface library: tileable rock / scree / snow textures generated
// at load (no downloaded assets) and a layered PBR material that blends them
// per pixel by slope, altitude and noise. Used by the terrain and by boulders,
// so loose rock, bedrock and snow cover read as one continuous surface.

import * as THREE from 'three';
import { seededRandom } from './noise.js';

const fade = (t) => t * t * (3 - 2 * t);

/** Periodic value noise on a `period`×`period` lattice. */
function lattice(period, rand) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = fade(x - xi);
    const fy = fade(y - yi);
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0];
    const b = g[y0 * period + x1];
    const c = g[y1 * period + x0];
    const d = g[y1 * period + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Tileable fractal noise sampler over u,v ∈ [0,1). */
function tileFbm(basePeriod, octaves, rand) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(lattice(basePeriod * 2 ** o, rand));
  return (u, v) => {
    let amp = 0.5;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const p = basePeriod * 2 ** o;
      sum += layers[o](u * p, v * p) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

/** Tileable Worley (cellular) distance: returns [F1 in 0..~1, id of nearest cell 0..1]. */
function tileWorley(cells, rand) {
  const px = new Float32Array(cells * cells);
  const py = new Float32Array(cells * cells);
  const id = new Float32Array(cells * cells);
  for (let i = 0; i < px.length; i++) { px[i] = rand(); py[i] = rand(); id[i] = rand(); }
  const out = [0, 0];
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let best = 9;
    let bestId = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox;
        const gy = cy + oy;
        const k = (((gy % cells) + cells) % cells) * cells + (((gx % cells) + cells) % cells);
        const dx = gx + px[k] - x;
        const dy = gy + py[k] - y;
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; bestId = id[k]; }
      }
    }
    out[0] = Math.sqrt(best);
    out[1] = bestId;
    return out;
  };
}

function bake(size, fn, renderer) {
  const data = new Uint8Array(size * size * 4);
  const px = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x / size, y / size, px);
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, px[0] * 255));
      data[i + 1] = Math.max(0, Math.min(255, px[1] * 255));
      data[i + 2] = Math.max(0, Math.min(255, px[2] * 255));
      data[i + 3] = Math.max(0, Math.min(255, px[3] * 255));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build the shared detail textures. Channels are data, not colour:
 *   rock   — r: albedo variation, g: secondary variation, b: strata, a: height
 *   gravel — r: per-pebble brightness, g: low-frequency patchiness, b: grit, a: height
 *   snow   — r: drift pattern, g: brightness, b: sparkle seed, a: height (sastrugi)
 */
export function createSurfaceTextures(renderer, size = 512) {
  const rand = seededRandom(90210);

  const rN = tileFbm(4, 6, rand);
  const rFine = tileFbm(32, 3, rand);
  const rCrack = tileFbm(6, 5, rand);
  const rWarp = tileFbm(3, 3, rand);
  const rock = bake(size, (u, v, o) => {
    const n = rN(u, v);
    const fine = rFine(u, v);
    const ridge = 1 - Math.abs(rCrack(u, v) * 2 - 1);
    const crack = Math.pow(Math.max(0, ridge - 0.72) / 0.28, 1.6);
    const warp = rWarp(u, v);
    const strata = 0.5 + 0.5 * Math.sin((v + warp * 0.22) * Math.PI * 2 * 11 + n * 3);
    const band = fade(Math.min(1, Math.max(0, (strata - 0.35) / 0.4)));
    o[0] = 0.5 + (n - 0.5) * 0.9 + (fine - 0.5) * 0.35 - crack * 0.42;
    o[1] = 0.5 + (warp - 0.5) * 1.1;
    o[2] = band;
    o[3] = 0.28 + n * 0.5 + band * 0.16 + (fine - 0.5) * 0.14 - crack * 0.55;
  }, renderer);

  const gBig = tileWorley(18, rand);
  const gSmall = tileWorley(52, rand);
  const gLow = tileFbm(3, 4, rand);
  const gGrit = tileFbm(64, 2, rand);
  const gravel = bake(size, (u, v, o) => {
    const a = gBig(u, v);
    const f1 = a[0];
    const idA = a[1];
    const b = gSmall(u, v);
    const f2 = b[0];
    const idB = b[1];
    // Large stones only where their id says so: scree is mostly small stuff.
    const stone = idA > 0.55 ? 1 - Math.min(1, f1 / 0.62) : 0;
    const pebble = 1 - Math.min(1, f2 / 0.7);
    const grit = gGrit(u, v);
    const h = Math.max(fade(stone) * 0.95, fade(pebble) * 0.5) + (grit - 0.5) * 0.12;
    o[0] = 0.42 + (stone > 0.08 ? idA : idB) * 0.55 + (grit - 0.5) * 0.2;
    o[1] = gLow(u, v);
    o[2] = grit;
    o[3] = h;
  }, renderer);

  const sDrift = tileFbm(3, 5, rand);
  const sRidge = tileFbm(5, 4, rand);
  const sFine = tileFbm(48, 2, rand);
  const snow = bake(size / 2, (u, v, o) => {
    const drift = sDrift(u, v * 2.0);
    // Sastrugi: wind-carved ridges, stretched along one axis.
    const ridge = 1 - Math.abs(sRidge(u * 3, v) * 2 - 1);
    const fine = sFine(u, v);
    o[0] = drift;
    o[1] = 0.6 + (drift - 0.5) * 0.5 + (fine - 0.5) * 0.25;
    o[2] = fine;
    o[3] = 0.35 + drift * 0.35 + Math.pow(ridge, 3) * 0.3;
  }, renderer);

  return { rock, gravel, snow };
}

const VERT_PARS = /* glsl */`
varying vec3 vTPos;
varying vec3 vTNormal;
#ifdef TERRAIN_TRAIL
attribute float aTrail;
varying float vTrail;
#endif
`;

const VERT_MAIN = /* glsl */`
{
  vec4 tWorld = vec4(transformed, 1.0);
  vec3 tN = objectNormal;
  #ifdef USE_INSTANCING
    tWorld = instanceMatrix * tWorld;
    tN = mat3(instanceMatrix) * tN;
  #endif
  vTPos = (modelMatrix * tWorld).xyz;
  vTNormal = normalize(mat3(modelMatrix) * tN);
  #ifdef TERRAIN_TRAIL
    vTrail = aTrail;
  #endif
}
`;

const FRAG_PARS = /* glsl */`
uniform sampler2D tRock;
uniform sampler2D tGravel;
uniform sampler2D tSnow;
uniform float uBaseAlt;
uniform float uInvVScale;
uniform float uBump;
uniform float uSnowShift;
uniform float uDetailScale;
varying vec3 vTPos;
varying vec3 vTNormal;
#ifdef TERRAIN_TRAIL
varying float vTrail;
#endif
vec4 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z);
  return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
}
`;

// Replaces <color_fragment>: decides what the ground is made of, per pixel.
const FRAG_COLOR = /* glsl */`
vec3 gN = normalize(vTNormal);
float tAlt = uBaseAlt + vTPos.y * uInvVScale;
float tSlope = clamp(1.0 - gN.y, 0.0, 1.0);
float tS = uDetailScale;
vec4 rock = triplanar(tRock, vTPos, gN, 0.06 * tS);
vec4 rockFar = triplanar(tRock, vTPos, gN, 0.0085);
vec4 gravel = texture2D(tGravel, vTPos.xz * 0.11 * tS);
vec4 gravelFar = texture2D(tGravel, vTPos.xz * 0.027);
vec4 snowT = texture2D(tSnow, vTPos.xz * 0.055);
vec3 tint = vec3(1.0);
#ifdef USE_COLOR
  tint = vColor.rgb;
#endif

// Bedrock shows where it is steep; everything else is scree and dirt.
float rockW = smoothstep(0.2, 0.4, tSlope + (rock.a - 0.5) * 0.2 + (rockFar.g - 0.5) * 0.12);
vec3 groundCol = tint * mix(0.8, 1.14, gravel.r) * mix(0.84, 1.14, gravelFar.g);
vec3 strataTint = mix(vec3(1.0), vec3(1.12, 0.9, 0.86), rockFar.b * 0.55);
vec3 rockCol = tint * strataTint * vec3(0.84, 0.79, 0.83) * mix(0.62, 1.16, rock.r) * mix(0.82, 1.1, rockFar.r);
vec3 tCol = mix(groundCol, rockCol, rockW);
float tH = mix(gravel.a, rock.a, rockW);
float tRough = mix(0.97, 0.9, rockW);
float tTrail = 0.0;
#ifdef TERRAIN_TRAIL
  tTrail = smoothstep(0.22, 0.7, vTrail + (gravelFar.a - 0.45) * 0.3);
  vec3 trailCol = tint * vec3(1.24, 1.17, 1.07) * mix(0.84, 1.04, gravel.b);
  tCol = mix(tCol, trailCol, tTrail * 0.82);
  tH = mix(tH, gravel.a * 0.28, tTrail);
#endif

// Snow: an altitude line broken up by drift patterns, shed by steep faces.
float snowLine = smoothstep(4600.0, 5700.0, tAlt + (rockFar.a - 0.45) * 950.0 + uSnowShift);
float snowW = smoothstep(0.4, 0.6, snowLine * 1.18 + (snowT.r - 0.5) * 0.6 * (1.0 - snowLine * 0.45)
  + (gravelFar.a - 0.42) * 0.5 + (rockFar.r - 0.5) * 0.35 - tSlope * 1.15) * smoothstep(0.0, 0.06, snowLine);
snowW *= 1.0 - tTrail * 0.2;
vec3 snowCol = mix(vec3(0.78, 0.8, 0.94), vec3(1.0, 0.985, 0.975), snowT.g);
tCol = mix(tCol, snowCol, snowW);
tH = mix(tH, snowT.a * 0.3, snowW);
tRough = mix(tRough, 0.58, snowW);
diffuseColor.rgb *= tCol;
`;

const FRAG_ROUGH = /* glsl */`
float roughnessFactor = tRough;
`;

// Appended after <normal_fragment_maps>: bump from the blended height field.
const FRAG_BUMP = /* glsl */`
{
  vec3 tSigX = dFdx(-vViewPosition);
  vec3 tSigY = dFdy(-vViewPosition);
  vec2 tDH = vec2(dFdx(tH), dFdy(tH)) * uBump * (1.0 - snowW * 0.55);
  vec3 tR1 = cross(tSigY, normal);
  vec3 tR2 = cross(normal, tSigX);
  float tDet = dot(tSigX, tR1);
  vec3 tGrad = sign(tDet) * (tDH.x * tR1 + tDH.y * tR2);
  normal = normalize(abs(tDet) * normal - tGrad);
}
`;

/**
 * Layered ground material.
 * @param {object} opts
 * @param {object} opts.textures    - from createSurfaceTextures
 * @param {number} opts.baseAlt     - altitude (m) at world y = 0
 * @param {number} opts.vScale      - world units per metre
 * @param {boolean} [opts.trail]    - geometry carries an `aTrail` attribute
 * @param {number} [opts.bump]
 * @param {number} [opts.snowShift] - metres added to the altitude before the snow test
 * @param {number} [opts.detailScale]
 */
export function createGroundMaterial({ textures, baseAlt, vScale, trail = false, bump = 0.07, snowShift = 0, detailScale = 1, ...rest }) {
  const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, ...rest });
  const uniforms = {
    tRock: { value: textures.rock },
    tGravel: { value: textures.gravel },
    tSnow: { value: textures.snow },
    uBaseAlt: { value: baseAlt },
    uInvVScale: { value: 1 / vScale },
    uBump: { value: bump },
    uSnowShift: { value: snowShift },
    uDetailScale: { value: detailScale },
  };
  material.defines = { ...(material.defines || {}) };
  if (trail) material.defines.TERRAIN_TRAIL = '';
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <color_fragment>', FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_BUMP}`);
  };
  material.customProgramCacheKey = () => `ground:${trail ? 1 : 0}`;
  return material;
}

/** Vertex wind sway for instanced grass: bends blades by their own height. */
export function addWindSway(material, timeUniform, strength = 0.16) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float swayPhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.29;
          float swayAmt = (position.y + 0.5) * ${strength.toFixed(3)};
          transformed.x += sin(uTime * 2.3 + swayPhase) * swayAmt + sin(uTime * 5.1 + swayPhase * 1.7) * swayAmt * 0.35;
          transformed.z += cos(uTime * 1.7 + swayPhase) * swayAmt * 0.6;
        #endif`);
  };
  material.customProgramCacheKey = () => 'grass-sway';
  return material;
}
