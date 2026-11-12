import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoute, V_SCALE } from '../src/route.js';
import { normalizeNodes } from '../src/sim.js';
import { createTerrain } from '../src/terrain.js';
import { loadData } from './helpers.js';

const nodes = normalizeNodes(loadData().nodes);
const route = buildRoute(nodes);

test('route places every canonical node in order along the axis', () => {
  assert.equal(route.nodeS.length, nodes.length);
  assert.equal(route.nodeS[0], 0);
  for (let i = 1; i < route.nodeS.length; i++) assert.ok(route.nodeS[i] > route.nodeS[i - 1]);
  assert.equal(route.total, route.nodeS[route.last]);
});

test('trail height matches node altitudes and never loses height on the way up', () => {
  nodes.forEach((node, i) => {
    assert.ok(Math.abs(route.altitudeAt(route.nodeS[i]) - node.altitudeMeters) < 0.5, node.id);
  });
  let prev = -Infinity;
  for (let s = 0; s <= route.total; s += 3) {
    const h = route.heightAt(s);
    assert.ok(h >= prev - 1e-9, `height dipped at s=${s}`);
    prev = h;
  }
  assert.ok(Math.abs(route.heightAt(route.total) - (nodes[route.last].altitudeMeters - nodes[0].altitudeMeters) * V_SCALE) < 1e-6);
});

test('each crux sits inside its own leg, close to the upper node', () => {
  route.cruxS.forEach((crux, i) => {
    assert.ok(crux > route.nodeS[i] && crux < route.nodeS[i + 1], `crux ${i}`);
    assert.ok((crux - route.nodeS[i]) / route.legLen[i] >= 0.8, `crux ${i} should be near the top of the leg`);
  });
});

test('region ownership: a node owns the trail from the crux below to the crux above', () => {
  assert.equal(route.regionIndexAt(-20), 0);
  assert.equal(route.regionIndexAt(0), 0);
  nodes.forEach((_, i) => assert.equal(route.regionIndexAt(route.nodeS[i]), i, `node ${i} must sit in its own region`));
  assert.equal(route.regionIndexAt(route.cruxS[0] - 0.01), 0);
  assert.equal(route.regionIndexAt(route.cruxS[0] + 0.01), 1);
});

test('crossing only fires when the walker leaves the engine node region', () => {
  for (let i = 0; i < nodes.length; i++) {
    assert.equal(route.crossing(route.nodeS[i], i), null, `standing on node ${i} resolves nothing`);
  }
  assert.equal(route.crossing(route.cruxS[3] + 0.5, 3), 'up');
  assert.equal(route.crossing(route.cruxS[3] - 0.5, 4), 'down');
  assert.equal(route.crossing(route.total + 5, route.last), null, 'nothing above the summit');
  assert.equal(route.crossing(-25, 0), null, 'leaving the park is an explicit gate action, not a crossing');
});

test('terrain: route ⇄ world mapping round-trips and the trail stays walkable', () => {
  const terrain = createTerrain(route);
  for (let s = -20; s <= route.total; s += 37) {
    for (const d of [-80, -12, 0, 9, 60]) {
      const p = terrain.pointAt(s, d, {});
      const back = terrain.project(p.x, p.z, null, {});
      assert.ok(Math.abs(back.s - s) < 0.6, `s round-trip at (${s}, ${d}) → ${back.s}`);
      assert.ok(Math.abs(back.d - d) < 0.6, `d round-trip at (${s}, ${d}) → ${back.d}`);
      const h = terrain.heightRoute(s, d, p.x, p.z);
      assert.ok(Number.isFinite(h), `finite height at (${s}, ${d})`);
    }
    // On the centreline the ground is the designed trail profile.
    assert.ok(Math.abs(terrain.heightAtRoute(s, 0) - route.heightAt(s)) < 0.75, `trail height at s=${s}`);
  }
});

test('terrain: nothing in the walkable corridor is higher than the summit', () => {
  const terrain = createTerrain(route);
  const summit = route.heightAt(route.total);
  for (let s = route.nodeS[10]; s <= route.total; s += 11) {
    for (let d = -92; d <= 92; d += 23) {
      assert.ok(terrain.heightAtRoute(s, d) <= summit + 0.5, `(${s.toFixed(0)}, ${d}) rises above the summit`);
    }
  }
});
