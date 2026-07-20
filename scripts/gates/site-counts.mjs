// scripts/gates/site-counts.mjs — assert every capability count written on the SITE still matches the
// registry it describes.  make site-counts
//
// WHY THIS EXISTS: the marketing copy said "96 components", "96 blocks across 44 families" and
// "44 families" while the registry held 148 across 64; vawe-rules.md claimed 22 kinetic presets, 32
// stings, 16 backgrounds and 16 themes against real counts of 25/35/17/18, and listed names to match
// its own stale numbers. Nine wrong figures, all shipped, all in the <meta> description or the page
// body. None of it was carelessness at the time of writing: every one was correct when typed, and the
// registry moved underneath it. Hand-typed numbers about a growing registry go stale by default, so
// the only durable fix is a gate that reads both and compares.
//
// Deliberately NOT a rewriter. It reports file:line, the stated number and the real one, and leaves
// the wording to a human: a count often sits inside a sentence that needs rephrasing, not a substitution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../../core/type.js';
import { LOOK_NAMES } from '../../core/looks.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';
import { CATALOG } from '../../blocks/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const size = (o) => (Array.isArray(o) ? o.length : Object.keys(o).length);

// The grid is CATALOG minus full-frame overlays — the same set the site's /blocks page lists, so the
// number the copy quotes and the number the page renders are the same number by construction.
const grid = CATALOG.filter((e) => !e.overlay);

const TRUTH = {
  blocks: grid.length,
  components: grid.length,
  families: new Set(grid.map((e) => e.family)).size,
  looks: size(LOOK_NAMES),
  'composite looks': size(LOOK_NAMES),
  stings: size(SHADER_FX),
  'shader stings': size(SHADER_FX),
  'kinetic presets': size(PRESETS),
  cuts: size(PRESENTATIONS),
  'canvas fx': size(CANVAS_FX_NAMES),
  themes: fs.readdirSync(path.join(root, 'themes')).filter((f) => f.endsWith('.json')).length,
};

const FILES = [
  'site/lib/features.ts',
  'site/public/vawe-rules.md',
  ...walk('site/app').filter((f) => /\.tsx?$/.test(f)),
];

function walk(rel) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(rel, e.name)) : [path.join(rel, e.name)]);
}

const subjects = Object.keys(TRUTH).sort((a, b) => b.length - a.length).join('|');
// Two shapes appear in the copy and both must be checked:
//   "148 blocks", "a 148-block library"   → number first
//   "## Kinetic presets (25)"             → heading with the count in parentheses
const NUM_FIRST = new RegExp(`\\b(\\d+)[ \\u00a0-](${subjects})\\b`, 'gi');
const HEADING = new RegExp(`\\b(${subjects})\\s*\\((\\d+)\\)`, 'gi');

const bad = [];
for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const check = (subject, stated) => {
      const real = TRUTH[subject.toLowerCase()];
      if (real == null || +stated === real) return;
      bad.push({ rel, line: i + 1, subject: subject.toLowerCase(), stated: +stated, real, text: line.trim().slice(0, 96) });
    };
    for (const m of line.matchAll(NUM_FIRST)) check(m[2], m[1]);
    for (const m of line.matchAll(HEADING)) check(m[1], m[2]);
  });
}

if (!bad.length) {
  const summary = Object.entries(TRUTH).map(([k, v]) => `${k} ${v}`).join(' · ');
  console.log(`✓ site counts match the registries\n  ${summary}`);
  process.exit(0);
}
console.error(`✗ ${bad.length} stale count(s) on the site:\n`);
for (const b of bad) {
  console.error(`  ${b.rel}:${b.line}  says ${b.stated} ${b.subject}, registry has ${b.real}`);
  console.error(`    ${b.text}`);
}
console.error('\n  Update the copy (and any name list under it), or the number is a claim the product does not back.');
process.exit(1);
