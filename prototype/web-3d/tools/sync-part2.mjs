#!/usr/bin/env node
// Regenerates src/part2-data.js from the canonical Part 2 narrative in web-v1.
// web-v1/ui/screens.js cannot be imported (it owns DOM side effects), so the
// plates are copied and a parity test keeps the copy honest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');

export function readCanonicalPlates() {
  const src = fs.readFileSync(path.join(root, 'prototype/web-v1/ui/screens.js'), 'utf8');
  const seq = src.slice(src.indexOf('const PART2_NARRATIVE_SEQUENCE = ['), src.indexOf('const PART2_NARRATIVE_IDS'));
  const es = src.slice(src.indexOf('const PART2_NARRATIVE_ES = {'), src.indexOf('const PART2_BREATHING_LINES'));
  // eslint-disable-next-line no-new-func
  const { PART2_NARRATIVE_SEQUENCE, PART2_NARRATIVE_ES } = new Function(`${seq}${es}; return { PART2_NARRATIVE_SEQUENCE, PART2_NARRATIVE_ES };`)();
  return PART2_NARRATIVE_SEQUENCE.map((p) => ({
    id: p.id,
    eyebrow: p.eyebrow,
    title: p.title,
    body: p.body,
    art: p.illustrationSrc ? p.illustrationSrc.replace(/^(\.\.\/)+art\//, '') : null,
    alt: p.illustrationAlt || '',
    es: PART2_NARRATIVE_ES[p.id] || {},
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const header = [
    '// GENERATED from prototype/web-v1/ui/screens.js (PART2_NARRATIVE_SEQUENCE / PART2_NARRATIVE_ES).',
    '// Do not edit by hand: web-v1 owns this copy; tests/surface.test.js fails if the two drift.',
    '// Regenerate with: node prototype/web-3d/tools/sync-part2.mjs',
    '',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'prototype/web-3d/src/part2-data.js'), `${header}export const PART2_PLATES = ${JSON.stringify(readCanonicalPlates(), null, 2)};\n`);
  console.log('part2-data.js regenerated');
}
