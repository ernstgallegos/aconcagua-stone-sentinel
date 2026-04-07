#!/usr/bin/env node

import https from 'node:https';

const baseUrl = (process.argv[2] || 'https://aconcagua-stone-sentinel.vercel.app').replace(/\/$/, '');

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
    markers: ['id="screen-title"', 'id="screen-expedition-setup"', 'Prototype · v1.4.6'],
  },
  {
    path: '/docs/deep-links.web-v1.md',
    label: 'Part 2 deep-link docs',
    markers: ['mendoza_room', 'future_cta'],
  },
];

for (const check of checks) {
  const content = await fetchPath(check.path);
  for (const marker of check.markers) {
    assertContains(content, marker, check.label);
  }
}

console.log(`release smoke passed for ${baseUrl}`);
