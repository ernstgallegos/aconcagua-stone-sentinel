#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageLockPath = path.resolve(__dirname, '..', 'package-lock.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const packageJson = readJson(packageJsonPath);
const packageLock = readJson(packageLockPath);

const packageVersion = packageJson.version;
const lockfileRootVersion = packageLock?.packages?.['']?.version;

if (!packageVersion) {
  console.error('package.json is missing a root version field.');
  process.exit(1);
}

if (!lockfileRootVersion) {
  console.error('package-lock.json is missing packages[""].version.');
  process.exit(1);
}

if (packageVersion !== lockfileRootVersion) {
  console.error(
    `Version mismatch detected: package.json=${packageVersion} package-lock.json root=${lockfileRootVersion}`
  );
  process.exit(1);
}

console.log(`Lockfile version check passed (${packageVersion}).`);
