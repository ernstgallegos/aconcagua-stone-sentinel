#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const testsRoot = path.join(repoRoot, 'prototype', 'web-v1', 'tests');

function collectTests(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTests(fullPath, acc);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.test.js')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

if (!fs.existsSync(testsRoot)) {
  console.error(`Test directory not found: ${testsRoot}`);
  process.exit(1);
}

const files = collectTests(testsRoot).sort();
if (!files.length) {
  console.error(`No web-v1 test files found under: ${testsRoot}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
