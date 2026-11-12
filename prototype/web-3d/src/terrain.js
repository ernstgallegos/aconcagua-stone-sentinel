// prototype/web-3d/src/terrain.js
//
// Pure terrain field for the 3D prototype (no three.js / DOM).
// Maps route space (s, d) ⇄ world space (x, z) and answers "how high is the
// ground here?". The whole mountain is one ribbon grown around the route axis:
// a valley in the approach, a broad massif flank higher up.

import { noise2, fbm, ridged, smoothstep, clamp } from './noise.js';

export const S_BEFORE = 420;   // terrain modelled before Horcones
export const S_AFTER = 760;    // terrain modelled past the summit
const AXIS_STEP = 1;

export function createTerrain(route) {
  const sMin = -S_BEFORE;
  const sMax = route.total + S_AFTER;
  const count = Math.ceil((sMax - sMin) / AXIS_STEP) + 1;
  const ax = new Float32Array(count);
  const az = new Float32Array(count);
  const ah = new Float32Array(count);

  // Gentle macro-curve; radius stays > 4000 units so the ribbon never folds.
  const headingAt = (s) => 0.07 * Math.sin(s / 1100 + 0.4) + 0.025 * Math.sin(s / 420);
  {
    let x = 0;
    let z = 0;
    const zeroIdx = Math.round(-sMin / AXIS_STEP);
    ax[zeroIdx] = 0; az[zeroIdx] = 0; ah[zeroIdx] = headingAt(0);
    for (let i = zeroIdx + 1; i < count; i++) {
      const s = sMin + i * AXIS_STEP;
      const h = headingAt(s - AXIS_STEP / 2);
      x += Math.sin(h) * AXIS_STEP; z += Math.cos(h) * AXIS_STEP;
      ax[i] = x; az[i] = z; ah[i] = headingAt(s);
    }
    x = 0; z = 0;
    for (let i = zeroIdx - 1; i >= 0; i--) {
      const s = sMin + i * AXIS_STEP;
      const h = headingAt(s + AXIS_STEP / 2);
      x -= Math.sin(h) * AXIS_STEP; z -= Math.cos(h) * AXIS_STEP;
      ax[i] = x; az[i] = z; ah[i] = headingAt(s);
    }
  }

  const sToIndex = (s) => clamp((s - sMin) / AXIS_STEP, 0, count - 1.001);

  function axisAt(s, out = {}) {
    const f = sToIndex(s);
    const i = Math.floor(f);
    const t = f - i;
    out.x = ax[i] + (ax[i + 1] - ax[i]) * t;
    out.z = az[i] + (az[i + 1] - az[i]) * t;
    out.heading = ah[i] + (ah[i + 1] - ah[i]) * t;
    return out;
  }

  /** Trail centreline meander, as lateral offset from the axis. */
  const trailOffset = (s) => 24 * Math.sin(s / 88 + 0.6) + 8 * Math.sin(s / 37 + 2.1);
  const trailBlend = (d) => 1 - smoothstep(110, 650, Math.abs(d));

  const tmpA = {};
  /** Route space → world space. */
  function pointAt(s, d, out = {}) {
    axisAt(s, tmpA);
    const lateral = d + trailOffset(s) * trailBlend(d);
    // right-hand normal of heading (sin h, cos h) is (cos h, -sin h)
    out.x = tmpA.x + Math.cos(tmpA.heading) * lateral;
    out.z = tmpA.z - Math.sin(tmpA.heading) * lateral;
    return out;
  }

  /** Direction of the trail (unit vector in XZ) at s, including the meander. */
  function trailDirection(s, out = {}) {
    const a = pointAt(s - 1.5, 0, {});
    const b = pointAt(s + 1.5, 0, {});
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    out.x = (b.x - a.x) / len;
    out.z = (b.z - a.z) / len;
    return out;
  }

  /**
   * World space → route space. `hintS` (previous s) keeps the search local and cheap.
   */
  function project(x, z, hintS = null, out = {}) {
    let idx;
    if (hintS == null) {
      let best = Infinity;
      idx = 0;
      for (let i = 0; i < count; i += 8) {
        const dd = (ax[i] - x) ** 2 + (az[i] - z) ** 2;
        if (dd < best) { best = dd; idx = i; }
      }
    } else {
      idx = Math.round(sToIndex(hintS));
    }
    // Hill-descend on squared distance.
    let best = (ax[idx] - x) ** 2 + (az[idx] - z) ** 2;
    for (let guard = 0; guard < 4000; guard++) {
      const up = idx + 1 < count ? (ax[idx + 1] - x) ** 2 + (az[idx + 1] - z) ** 2 : Infinity;
      const dn = idx - 1 >= 0 ? (ax[idx - 1] - x) ** 2 + (az[idx - 1] - z) ** 2 : Infinity;
      if (up < best) { idx++; best = up; } else if (dn < best) { idx--; best = dn; } else break;
    }
    // Sub-step refinement along the local tangent.
    const h = ah[idx];
    const along = (x - ax[idx]) * Math.sin(h) + (z - az[idx]) * Math.cos(h);
    const s = clamp(sMin + idx * AXIS_STEP + along, sMin, sMax);
    axisAt(s, tmpA);
    const lateral = (x - tmpA.x) * Math.cos(tmpA.heading) - (z - tmpA.z) * Math.sin(tmpA.heading);
    const off = trailOffset(s);
    let d = lateral - off;
    for (let i = 0; i < 4; i++) d = lateral - off * trailBlend(d);
    out.s = s;
    out.d = d;
    return out;
  }

  // ── height field ─────────────────────────────────────────────────────────
  const S = route.nodeS;
  const lagoon = pointAt(S[1] + 6, 34, {});
  lagoon.radius = 21;
  const FLOOR = 18;
  const SUMMIT_H = route.heightAt(route.total);

  /** Ground height at route coords (s, d) whose world position is (x, z). */
  function heightRoute(s, d, x, z) {
    const b = route.heightAt(s);
    const a = Math.abs(d);
    const offTrail = smoothstep(1.8, 8, a);
    const n1 = fbm(x * 0.011, z * 0.011, 3);
    const n2 = noise2(x * 0.07, z * 0.07);
    const n3 = noise2(x * 0.27, z * 0.27);

    let h = b;
    // Near-field roughness: flat on the trail, lumpy scree away from it.
    h += offTrail * (n2 * 2.0 + n3 * 0.45) * (0.45 + 0.55 * smoothstep(0, 70, a));
    h += n1 * 15 * smoothstep(12, 130, a);

    // Approach: Horcones valley walls on both sides.
    const valley = 1 - smoothstep(S[4] - 40, S[6], s);
    if (valley > 0) {
      h += valley * 200 * Math.pow(smoothstep(34, 620, a), 1.3) * (0.8 + 0.3 * fbm(x * 0.004, z * 0.004, 2));
    }

    // Upper mountain: the route rides a broad flank that falls away to the valley floor.
    const massif = smoothstep(S[4], S[7], s);
    if (massif > 0) {
      const beyond = s > route.total ? smoothstep(route.total, route.total + 500, s) : 0;
      const drop = Math.max(0, b - FLOOR) * Math.pow(smoothstep(26, 1750 - beyond * 700, a), 0.85);
      // Uphill (left) side: the route traverses beneath a ridge that climbs to the
      // summit, so the mountain is always present above the climber.
      const ridgeFade = d < 0 ? massif * (1 - smoothstep(route.total - 170, route.total - 40, s)) : 0;
      if (ridgeFade > 0) {
        const up = smoothstep(36, 400, a) * ridgeFade;
        const ridgeTop = Math.min(route.heightAt(Math.min(route.total, s + 620)) + 14, SUMMIT_H - 4)
          + 26 * fbm(x * 0.006, z * 0.006, 3);
        const outer = Math.max(0, a - 400);
        const leftH = ridgeTop - Math.max(0, ridgeTop - FLOOR) * Math.pow(smoothstep(0, 1500, outer), 0.8);
        h = (h - massif * drop) * (1 - up) + leftH * up;
      } else {
        h -= massif * drop;
      }
      // Side-hill tilt so traverses read as traverses.
      const tilt = Math.sin(s / 260 + 1.1) * 0.2 * clamp(d, -170, 170) * smoothstep(3, 30, a);
      h += massif * tilt;
    }

    // La Canaleta: a scree gully with walls close on both sides.
    const gully = smoothstep(S[12] + 20, S[13] - 10, s) * (1 - smoothstep(S[14] - 40, S[14] - 8, s));
    if (gully > 0) h += gully * 24 * smoothstep(7, 46, a);

    // Distant ranges framing the valley.
    const far = smoothstep(560, 1500, a);
    if (far > 0) h += far * ridged(x * 0.0017, z * 0.0017, 4) * 240 * (1 - 0.55 * massif);

    // The summit is the highest ground on the map: saturate anything approaching it.
    const cap = SUMMIT_H - 3;
    if (h > cap - 14) {
      const capped = cap - 14 * Math.exp(-(h - (cap - 14)) / 14);
      // The trail itself is designed to top out at the summit, so leave it alone.
      const k = smoothstep(5, 28, a);
      h = h * (1 - k) + capped * k;
    }

    // Summit shelf stays flat and readable.
    const shelf = 1 - smoothstep(4, 22, Math.hypot(s - route.total, d));
    if (shelf > 0) h = h * (1 - shelf) + SUMMIT_H * shelf;

    // Laguna de Horcones basin.
    const lg = Math.hypot(x - lagoon.x, z - lagoon.z);
    if (lg < lagoon.radius + 14) h -= 3.2 * (1 - smoothstep(lagoon.radius - 8, lagoon.radius + 14, lg));

    return Math.max(h, -40);
  }

  const tmpP = {};
  /** Ground height at a world position. */
  function heightAt(x, z, hintS = null) {
    project(x, z, hintS, tmpP);
    return heightRoute(tmpP.s, tmpP.d, x, z);
  }

  /** Ground height directly from route coords. */
  function heightAtRoute(s, d) {
    const p = pointAt(s, d, {});
    return heightRoute(s, d, p.x, p.z);
  }

  const lagoonSurface = heightRoute(S[1] + 6, 34, lagoon.x, lagoon.z) + 2.0;

  return {
    sMin, sMax, axisAt, pointAt, project, trailDirection, trailOffset,
    heightRoute, heightAt, heightAtRoute,
    lagoon: { ...lagoon, y: lagoonSurface },
  };
}
