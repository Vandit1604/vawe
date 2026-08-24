// scripts/gates/site-counts.mjs — assert every capability count written on the SITE still matches the
// registry it describes.  make site-counts
//
// KNOWN LIMIT, worth stating so the next false positive is recognised rather than argued with: the
// word "families" belongs to TWO registries. Blocks have 70, effects have 35, and this gate compares
// every "<n> families" it finds against the block count wherever the sentence sits. A true statement
// about effect families therefore reads as a stale block count. The fix so far is to avoid writing a
// bare family count inside the effects surfaces; scoping the comparison by file path would be better
// and is not done.
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
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../../core/type.js';
import { LOOK_NAMES } from '../../core/looks.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { validateAll } from '../../core/validate.mjs';

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
  // COUNT WHAT SHIPS, not what is on this disk. Three brand themes are deliberately untracked but
  // still present locally, so `readdirSync` says 38 here and a fresh clone has 35. A copy line reading
  // "38 themes" would therefore pass on the author's machine and fail for every contributor — the
  // stale-count failure this gate exists to prevent, inverted. The site describes the PUBLISHED
  // product, so the published set is the truth. (Same lesson as docs/MISTAKES.md #423: grade the thing
  // that actually ships, never the copy sitting in the working tree.)
  themes: (() => {
    try {
      const tracked = execFileSync('git', ['ls-files', 'themes'], { cwd: root, encoding: 'utf8' });
      const n = tracked.split('\n').filter((f) => f.endsWith('.json')).length;
      if (n) return n;
    } catch { /* not a git checkout — fall back to disk */ }
    return fs.readdirSync(path.join(root, 'themes')).filter((f) => f.endsWith('.json')).length;
  })(),
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
// ADJECTIVES ARE ALLOWED TO SIT BETWEEN THE NUMBER AND ITS NOUN, and until now they hid the claim.
// "148 vetted, deterministic, theme-aware components" slipped past this gate for as long as it took
// someone to read the page, because the pattern demanded the digit sit directly beside the word. A
// count is stale whether or not the author put three adjectives in front of the thing being counted.
// Bounded to a short run of word characters, commas and hyphens so it cannot leap across a sentence
// and pair a number with a noun that has nothing to do with it.
// Two guards on that run, and BOTH were added after the widening invented findings on its first run.
// Widening it to skip adjectives made it skip other things too:
//   * "155 blocks across 70 families" matched 155 -> families, leaping over the noun 155 belongs to.
//     So an intervening word may not itself be one of the subjects: the nearest noun wins.
//   * "154 of 155 blocks" matched 154 -> blocks, over the top of the number actually attached to it.
//     So the run may not contain a digit either: the nearest NUMBER wins.
// A gate change must never invent findings, and this one did until it was tested against real lines
// rather than against the case it was written for.
const NUM_FIRST = new RegExp(`\\b(\\d+)[ \\u00a0-](?:(?!${subjects})[a-z-]+,?[ \\u00a0]){0,4}(${subjects})\\b`, 'gi');
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


// ── THE EDITOR'S STARTER SCENE MUST ACTUALLY BOOT ────────────────────────────────────────────────
// /editor shipped for some time rendering a blank stage. The page loaded, the JSON showed, the
// scrubber showed, and the engine refused to boot inside the iframe because `bg` had become required
// and the starter predated it. The refusal was correct and it was LOUD, in `window.__engineError`
// inside a frame nothing was reading, so the only outward sign was an empty box.
//
// A default that does not render is worse than no default: it is the first thing anyone sees, and it
// says the engine is broken. This runs the starter through the same validator the engine calls at
// boot, which is the check that would have caught it on the day.
{
  const src = fs.readFileSync(path.join(root, 'site/app/editor/EditorClient.tsx'), 'utf8');
  const m = src.match(/const STARTER = `([\s\S]*?)`;/);
  const REL = 'site/app/editor/EditorClient.tsx';
  const fail = (text) => bad.push({ rel: REL, line: '-', stated: 'a starter that', subject: 'boots', real: 'a scene the engine refuses', text });
  if (!m) fail('could not find the STARTER scene');
  else {
    let scene = null;
    try { scene = JSON.parse(m[1]); } catch (e) { fail(`the STARTER scene is not valid JSON: ${e.message}`); }
    if (scene) {
      const schemaPath = path.join(root, 'formats', scene.module || 'scene', 'schema.json');
      const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : null;
      for (const err of validateAll(schema, scene)) fail(err);
    }
  }
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
