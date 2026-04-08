#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const includeTemp = process.argv.includes('--include-temp');

const markdownTargets = [
  'README.md',
  'README.es.md',
  'docs',
];

if (includeTemp) markdownTargets.push('temp');

const failures = [];

const markdownLinkRegex = /\[[^\]]+\]\(([^)]+)\)/g;

function isExternalLink(link) {
  return /^(https?:\/\/|mailto:|#)/i.test(link);
}

function normalizeLinkTarget(rawLink) {
  return rawLink.split('#')[0].trim();
}

function collectMarkdownFiles(targetPath) {
  const fullPath = path.join(repoRoot, targetPath);
  if (!fs.existsSync(fullPath)) return [];
  const stats = fs.statSync(fullPath);
  if (stats.isFile()) return [fullPath];
  if (!stats.isDirectory()) return [];

  const files = [];
  const stack = [fullPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

function validateFileLinks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativeFile = path.relative(repoRoot, filePath);
  let match;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const rawLink = match[1];
    if (isExternalLink(rawLink)) continue;
    const target = normalizeLinkTarget(rawLink);
    if (!target) continue;

    const resolvedPath = path.resolve(path.dirname(filePath), target);
    if (!fs.existsSync(resolvedPath)) {
      failures.push({
        file: relativeFile,
        link: rawLink,
        resolved: path.relative(repoRoot, resolvedPath),
      });
    }
  }
}

const markdownFiles = markdownTargets.flatMap(collectMarkdownFiles);
markdownFiles.forEach(validateFileLinks);

if (failures.length > 0) {
  console.error('markdown-link-validation-failed');
  failures.forEach((failure) => {
    console.error(`- ${failure.file}: ${failure.link} -> ${failure.resolved}`);
  });
  process.exit(1);
}

console.log(`markdown-links-ok (${markdownFiles.length} files checked)`);
