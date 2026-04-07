#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const skipDirs = new Set(['.git', 'node_modules']);
const failures = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

    try {
      JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      failures.push({ file: path.relative(repoRoot, fullPath), error: err.message });
    }
  }
}

walk(repoRoot);

if (failures.length) {
  console.error('JSON validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.error}`);
  }
  process.exit(1);
}

console.log('all-json-ok');
