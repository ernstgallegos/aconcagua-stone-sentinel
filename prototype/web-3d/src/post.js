// prototype/web-3d/src/post.js
//
// Post-processing chain: ambient occlusion (high quality only), a restrained
// bloom for snow and sky highlights, a colour grade that keeps the painted
// palette (violet shadows, warm highlights), then tone mapping.

import * as THREE from 'three';
import { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, GTAOPass, OutputPass } from 'three-addons';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uShadowTint: { value: new THREE.Color('#6b5a9a') },
    uHighlightTint: { value: new THREE.Color('#ffe2c4') },
    uSaturation: { value: 1.08 },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.32 },
    uStrain: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 uShadowTint; uniform vec3 uHighlightTint;
    uniform float uSaturation; uniform float uContrast; uniform float uVignette; uniform float uStrain;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Split toning in linear light: cool violet into the shadows, warmth into the highlights.
      float sh = 1.0 - smoothstep(0.0, 0.35, l);
      float hi = smoothstep(0.55, 1.6, l);
      c = mix(c, c * (uShadowTint / max(dot(uShadowTint, vec3(0.2126, 0.7152, 0.0722)), 0.001)), sh * 0.14);
      c = mix(c, c * uHighlightTint, hi * 0.35);
      c = mix(vec3(l), c, uSaturation - uStrain * 0.45);
      c = (c - 0.18) * uContrast + 0.18;
      vec2 q = vUv - 0.5;
      float v = smoothstep(0.35, 0.95, length(q) * 1.25);
      c *= 1.0 - v * (uVignette + uStrain * 0.5);
      gl_FragColor = vec4(max(c, 0.0), src.a);
    }`,
};

export const QUALITY_LEVELS = ['low', 'medium', 'high'];

export function createPost({ renderer, scene, camera, quality }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: quality === 'low' ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  // Given its own target, the composer takes that target's pixel size as its logical size and
  // would multiply by the pixel ratio again for every pass. Tell it the logical size up front.
  const logical = renderer.getSize(new THREE.Vector2());
  composer.setSize(logical.x, logical.y);
  composer.addPass(new RenderPass(scene, camera));

  let gtao = null;
  if (quality === 'high') {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.22, 0.75, 1.05);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    quality,
    render(dt) { composer.render(dt); },
    setSize(w, h, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(w, h);
    },
    /** 0..1 — the body's distress drains colour and closes the frame in. */
    setStrain(v) { grade.uniforms.uStrain.value = v; },
    /** Frees every pass too: the composer only disposes its own targets and copy pass. */
    dispose() {
      for (const pass of composer.passes) pass.dispose?.();
      composer.dispose();
    },
  };
}
