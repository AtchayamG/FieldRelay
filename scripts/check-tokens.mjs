// Find CSS custom properties the app references but never defines.
//
// This exists because of a real bug: the logo referenced
// --fr-color-text-primary, which does not exist in this system, with a
// hardcoded near-white fallback. The fallback did its job silently and the
// wordmark was invisible in light theme.
//
// A var() fallback hides a typo instead of surfacing it, so the fallback is
// not the safety net it looks like. This script is.
//
//   node scripts/check-tokens.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not url.pathname — the latter yields "/D:/..." on Windows and
// every subsequent read silently finds nothing.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCES = ['apps/fieldrelay-app/src', 'packages/design-tokens/src'];
const EXTENSIONS = ['.ts', '.css', '.html', '.scss'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

const files = SOURCES.flatMap((source) => {
  try {
    return walk(join(ROOT, source));
  } catch {
    return [];
  }
});

const defined = new Set();
const used = new Map(); // name -> [{file, line, hasFallback}]

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    // A definition looks like "--fr-thing:" at the start of a declaration.
    for (const match of line.matchAll(/(^|[;{\s])(--fr-[a-z0-9-]+)\s*:/gi)) {
      defined.add(match[2]);
    }
    // A reference looks like var(--fr-thing) or var(--fr-thing, fallback).
    for (const match of line.matchAll(/var\(\s*(--fr-[a-z0-9-]+)\s*(,)?/gi)) {
      const name = match[1];
      if (!used.has(name)) used.set(name, []);
      used.get(name).push({
        file: relative(ROOT, file),
        line: index + 1,
        hasFallback: Boolean(match[2])
      });
    }
  });
}

const missing = [...used.entries()]
  .filter(([name]) => !defined.has(name))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length === 0) {
  console.log(`  every referenced token resolves (${defined.size} defined, ${used.size} referenced)`);
  process.exit(0);
}

console.log('  UNDEFINED TOKENS\n');
for (const [name, sites] of missing) {
  const masked = sites.some((site) => site.hasFallback);
  console.log(`  ${name}${masked ? '   [masked by a var() fallback]' : ''}`);
  for (const site of sites) {
    console.log(`      ${site.file}:${site.line}`);
  }
  console.log('');
}
console.log(`  ${missing.length} undefined token(s).`);
process.exit(1);
