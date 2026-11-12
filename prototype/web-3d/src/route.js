// prototype/web-3d/src/route.js
//
// Pure route geometry: where each canonical node sits along the walkable axis,
// how high the trail is at any point, and which engine node "owns" a given
// stretch of trail. No three.js / DOM dependency (unit-testable under node).
//
// Coordinates
// ───────────
//   s  — progress along the route axis in world units (0 = Horcones, total = Summit)
//   d  — signed lateral offset from the trail centreline
//
// Turn mapping (the core 3D ⇄ engine contract)
// ────────────────────────────────────────────
// Every leg between node i and node i+1 has one "crux" line near its upper end.
// Walking UP across the crux of the leg above the current engine node resolves
// one advance turn (pace decides `advance` vs `advance_slowly`). Walking DOWN
// across the crux of the leg below resolves one `descend` turn. The engine,
// not the walk, decides whether the node actually changes.

export const V_SCALE = 0.12;        // world units per metre of altitude
export const LEG_BASE = 110;        // minimum leg length (world units)
export const LEG_PER_METRE = 0.18;  // extra leg length per metre of gain
export const CRUX_FRACTION = 0.85;  // crux sits at 85% of the leg (just below the upper node)
export const LAST_CRUX_FRACTION = 0.955;

const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));

export function buildRoute(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 2) throw new Error('buildRoute requires at least two nodes');
  const baseAlt = nodes[0].altitudeMeters;
  const nodeS = [0];
  const legLen = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const gain = Math.max(0, nodes[i + 1].altitudeMeters - nodes[i].altitudeMeters);
    const len = LEG_BASE + gain * LEG_PER_METRE;
    legLen.push(len);
    nodeS.push(nodeS[i] + len);
  }
  const total = nodeS[nodeS.length - 1];
  const nodeH = nodes.map((n) => (n.altitudeMeters - baseAlt) * V_SCALE);
  const cruxS = legLen.map((len, i) => nodeS[i] + len * (i === legLen.length - 1 ? LAST_CRUX_FRACTION : CRUX_FRACTION));
  const last = nodes.length - 1;

  /** Index of the leg containing s (clamped). */
  function legIndexAt(s) {
    if (s <= 0) return 0;
    for (let i = 0; i < legLen.length; i++) if (s < nodeS[i + 1]) return i;
    return legLen.length - 1;
  }

  /** Trail height (world units above Horcones) at axis progress s. */
  function heightAt(s) {
    if (s <= 0) return 0;
    if (s >= total) {
      // Small summit shelf, then the south face falls away.
      const over = s - total;
      if (over < 10) return nodeH[last];
      return nodeH[last] - (over - 10) * 1.15;
    }
    const i = legIndexAt(s);
    const u = clamp01((s - nodeS[i]) / legLen[i]);
    // Blend of linear and smoothstep: benches at nodes, steeper mid-leg.
    const eased = u * 0.35 + smooth(u) * 0.65;
    return nodeH[i] + (nodeH[i + 1] - nodeH[i]) * eased;
  }

  const altitudeAt = (s) => baseAlt + heightAt(Math.max(0, Math.min(total, s))) / V_SCALE;

  /** Engine node index that owns axis progress s. */
  function regionIndexAt(s) {
    let idx = 0;
    for (let i = 0; i < cruxS.length; i++) if (s >= cruxS[i]) idx = i + 1;
    return idx;
  }

  /**
   * Which crux (if any) has the walker crossed, given the engine's current node?
   * @returns {'up'|'down'|null}
   */
  function crossing(s, positionIndex) {
    if (positionIndex < last && s >= cruxS[positionIndex]) return 'up';
    if (positionIndex > 0 && s < cruxS[positionIndex - 1]) return 'down';
    return null;
  }

  /** Nearest node index to s and its distance along the axis. */
  function nearestNode(s) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < nodeS.length; i++) {
      const dist = Math.abs(s - nodeS[i]);
      if (dist < bestDist) { best = i; bestDist = dist; }
    }
    return { index: best, distance: bestDist };
  }

  return {
    nodes, baseAlt, nodeS, nodeH, legLen, cruxS, total, last,
    legIndexAt, heightAt, altitudeAt, regionIndexAt, crossing, nearestNode,
  };
}
