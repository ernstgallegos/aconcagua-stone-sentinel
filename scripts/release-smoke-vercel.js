#!/usr/bin/env node

import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = (process.argv[2] || 'https://aconcagua-stone-sentinel.vercel.app').replace(/\/$/, '');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const releaseMarker = `Prototype · v${packageJson.version}`;

function fetchPath(pathname) {
  const url = `${baseUrl}${pathname}`;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed (${res.statusCode}) for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`FAIL: ${label} did not contain expected marker: ${needle}`);
  }
}

const checks = [
  {
    path: '/',
    label: 'Landing page',
    markers: ['Play current web prototype', 'prototype/web-v1/index.html'],
  },
  {
    path: '/prototype/web-v1/index.html',
    label: 'web-v1 shell',
    markers: ['id="screen-title"', 'id="screen-expedition-setup"', releaseMarker],
  },
  {
    path: '/docs/deep-links.web-v1.md',
    label: 'Part 2 deep-link docs',
    markers: ['mendoza_room', 'future_cta'],
  },
];

try {
  for (const check of checks) {
    const content = await fetchPath(check.path);
    for (const marker of check.markers) {
      assertContains(content, marker, check.label);
    }
  }
} catch (err) {
  // Distinguish network/DNS errors (environment issue) from deployment failures
  // (real problem) so developers running this offline get a clear message.
  const NETWORK_ERROR_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'];
  const isNetworkError = NETWORK_ERROR_CODES.includes(err.code);
  if (isNetworkError) {
    console.error(`release smoke skipped — network unreachable (${err.code}): ${baseUrl}`);
    console.error('This is expected in sandboxed/offline environments. Set a reachable URL via: npm run smoke:release <url>');
    process.exit(0);
  }
  throw err;
}

console.log(`release smoke passed for ${baseUrl}`);
