#!/usr/bin/env node
// quality/gates/frame-check.mjs: THE PLAN, COMPARED WITH THE FRAMES BUILT FROM IT.
//
//   make frame-check D=formats/scene/<film>.json   ·   node quality/gates/frame-check.mjs <film> [--json]
//
// Nothing in this repo did this. `storyboard-check` grades the plan against itself; `critique` and
// `eye-trace` read the scene JSON after assembly; `make preview` judges one fragment with no idea which
// beat it serves. So a storyboard could describe one picture while its fragment drew another, and every
// gate stayed green: beat 3 of vawe-oblique planned `blueprint: terminalReveal`, described "a white
// pill bar with a round cobalt run button" in its own `picture:` line, and shipped an AI chat input
// into a film about a command line (docs/MISTAKES.md #596).
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStoryboard, blocksOf, fieldIn, frontmatter } from '../../harness/author/storyboard-parse.mjs';
import { extractKitBlock } from '../../harness/lib/stagekit.mjs';
import { fragmentFontSizes } from '../../harness/lib/kit-ramp.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { sceneDims } from '../../core/layout/safe.js';
import { readDesignSpec } from '../../harness/lib/design-spec.mjs';
import { runDesignDrift } from './design-drift.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
if (!arg) { console.error('usage: make frame-check D=formats/scene/<film>.json'); process.exit(2); }
const base = String(arg).replace(/\.(json|storyboard\.md)$/, '');
const sbPath = [base + '.storyboard.md', path.join('formats/scene', path.basename(base) + '.storyboard.md')]
  .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
if (!sbPath) { console.error(`no storyboard for "${arg}"`); process.exit(2); }

const src = fs.readFileSync(sbPath, 'utf8');
const sb = parseStoryboard(src);
const blocks = blocksOf(src);
const beats = sb.beats.map((b, i) => ({
  ...b,
  archetype: (fieldIn(blocks[i], 'archetype') || '').trim(),
  weight: (fieldIn(blocks[i], 'weight') || '').trim(),
  payoff: (fieldIn(blocks[i], 'threads') || fieldIn(blocks[i], 'object') || '').trim(),
  fragment: (fieldIn(blocks[i], 'fragment') || '').split(/\s+\(/)[0].trim() || null,
}));

const gf = gateFindings();
const errs = [], warns = [];
const err = (code, msg, extra) => { errs.push(msg); gf.fail(code, msg, extra); };
const warn = (code, msg, extra) => { warns.push(msg); gf.warn(code, msg, extra); };

// ── 1. every fragment pastes the shared kit block, and the film's scales stay in one family ────────
// The kit is a foundation an author MAY draw on, never a whitelist that refuses a literal value: any
// CSS is allowed for size, shadow, radius and spacing (owner decision, docs/MISTAKES.md #621). What
// still matters is that a film's frames read as one film, so this only reports, film-wide, when its
// fragments have drifted onto many different type scales.
// SCALE_DRIFT_MAX: more distinct literal sizes than this across one film's fragments and the frames
// stop reading as one film (docs/CRAFT/HTML-FRAGMENTS.md's "seven frames, eight invented sizes" case).
const SCALE_DRIFT_MAX = 7;
// A film that has DECLARED its values (`<film>.design.md`) gets the stricter per-value check below
// instead: `scale-drift` is the coarse "too many sizes" warn for a film that never opted in, and it
// would only be noise once design-drift is naming every undeclared value by itself.
const filmJsonPath = sbPath.replace(/\.storyboard\.md$/, '.json');
const designSpec = fs.existsSync(filmJsonPath) ? readDesignSpec(filmJsonPath) : null;
const filmSizes = new Map(); // px -> Set of fragments using it
for (const b of beats) {
  if (!b.fragment) continue;
  const file = path.join(ROOT, b.fragment);
  if (!fs.existsSync(file)) { err('fragment-missing', `beat "${b.name}" names ${b.fragment} and no such file exists.`); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const kit = extractKitBlock(raw);
  if (!kit) {
    warn('kit-markers-missing', `${b.fragment} carries no STAGEKIT markers, so every tool that strips the kit `
      + 'before judging a fragment is judging the kit as the author\'s own CSS. Paste `buildKit().block`, not the '
      + '`<film>.kit.css` sidecar (docs/MISTAKES.md #594).');
  }
  const own = (kit ? raw.replace(kit, '') : raw).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const px of fragmentFontSizes(own)) {
    if (!filmSizes.has(px)) filmSizes.set(px, new Set());
    filmSizes.get(px).add(b.fragment);
  }
}
if (!designSpec && filmSizes.size > SCALE_DRIFT_MAX) {
  const list = [...filmSizes.keys()].sort((a, b2) => a - b2).join(', ');
  warn('scale-drift', `this film's fragments use ${filmSizes.size} distinct literal type sizes `
    + `(${list}px), more than ${SCALE_DRIFT_MAX}. Any size is allowed; the kit's roles are there `
    + 'if two close fragments would rather share one scale.');
}

// ── 1b. design-drift: every visible box's font, radius, shadow and colour against the declared set ──
// ONE IMPLEMENTATION, TWO ENTRY POINTS: the check itself lives in design-drift.mjs (also its own
// `make design-drift D=` target); this just calls it, on the SAME `gf` emitter, rather than shelling
// out and parsing prose back. Silent (no browser launched) when the film has no design.md.
if (designSpec) {
  const before = gf.records.length;
  runDesignDrift(filmJsonPath, gf);
  for (const r of gf.records.slice(before)) (r.severity === 'error' ? errs : warns).push(r.summary);
}

// ── 2. the object the storyboard promised, against the layer the assembly actually shipped ─────────
// `object:` names a continuous thing that survives every cut, and docs/CRAFT/STORYBOARD-TEMPLATE.md
// gives it TWO legal ways to keep that promise: a per-beat `object:` line (the object is drawn fresh,
// by hand, inside each beat's own fragment, and nothing here can see into that) or a structured
// `object_in`/`object_out` chain, which `assemble.mjs` turns into one real cross-beat layer. Only the
// second way leaves a trace this gate can check, so this fires only when NEITHER beat-level mechanism
// was ever reached for: the frontmatter names an object and no beat locates it at all (the same "claim
// nobody kept" storyboard-check.mjs already names), and the assembled scene shows it, either no layer
// named "object" exists, or `assemble.mjs`'s own literal default shipped untouched (a plain rect, `fill:
// 'var(--accent)'`, docs/MISTAKES.md #596's sibling: the plan said one thing, the frame carries the
// tool's placeholder for it). A film that DOES locate the object per beat is answering the promise the
// other legal way and must not be flagged for it.
const jsonPath = filmJsonPath;
let scene = null;
if (fs.existsSync(jsonPath)) {
  try { scene = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch { scene = null; }
}

const beatLocatesObject = blocks.some((b) => fieldIn(b, 'object') || fieldIn(b, 'object_in') || fieldIn(b, 'object_out'));
// A film with neither `object:` nor `threads:` has promised no continuity at all, a manifesto or an
// anthology says so on purpose (docs/CRAFT/FILM-STRUCTURE.md), and full-bleed beats are the honest
// shape of that. `claimsContinuity` is true only once the plan itself says something should carry
// across the cuts, which is the fact that makes an unmet promise a defect rather than a valid style.
// `threads:` is deliberately NOT part of this. It answers "what holds the film across cuts" and a
// film under 15s hard-errors without one, so nearly every storyboard has one, and what it promises is
// often a MOTIF or an ARGUMENT rather than a travelling thing. `hinge` declares a plum ink underline
// that draws on under one word per beat, plus a line of reasoning: both are kept honestly INSIDE each
// beat's own full-bleed fragment, and convicting that film of a structural defect is exactly the
// false positive docs/MISTAKES.md #603 was written about. Only `object:` promises a thing that
// travels, so only `object:` can be broken by frames that give it nowhere to travel.
const claimsContinuity = !!sb.object;
if (scene && sb.object && !beatLocatesObject) {
  const layers = Array.isArray(scene.layers) ? scene.layers : [];
  const objectLayer = layers.find((l) => l && l.id === 'object');
  const isDefaultPlaceholder = objectLayer && objectLayer.type === 'rect' && objectLayer.fill === 'var(--accent)';
  if (!objectLayer || isDefaultPlaceholder) {
    err('object-is-placeholder',
      `the storyboard's \`object:\` line promises "${sb.object}", but no beat ever locates it (no beat carries `
      + 'an `object:` line of its own, nor `object_in`/`object_out`), and the assembled scene '
      + (objectLayer
        ? 'still carries `assemble.mjs`\'s literal default for it: a plain rect filled `var(--accent)`, never given a real appearance.'
        : 'has no layer named "object" at all: nothing was ever built for it.')
      + ' Extend that `object:` line into either a per-beat `object:` describing what it becomes at each cut, '
      + 'or a structured `object_in`/`object_out` chain that `assemble.mjs` can build and you then style. '
      + 'A promise this repo\'s own tool can name and skip is not a decision anyone made.');
  }
}

// ── 3. every beat as its own whole frame, so nothing has anywhere to survive a cut ──────────────────
// A full-bleed html layer (0,0, the whole canvas) is the right call for a film with one beat, and it
// stays right for a film that never claimed continuity at all: a manifesto or an anthology names no
// `object:` and no `threads:` on purpose, and seven independent full frames is that film done correctly
// (docs/CRAFT/FILM-STRUCTURE.md, `vawe-continuous-action`'s own "do not use it for a manifesto"). What
// this fires on is narrower: a plan that names an `object:`, a thing that should TRAVEL, and then
// never locates it in a single beat, so the claim and the frames disagree. A film
// that locates the object per beat (vawe-oblique's own device: the same prop, described as changing
// state at each cut, drawn fresh inside each full-bleed fragment) is answering the claim the narrative
// way and must not be flagged for choosing that over a positioned cross-beat layer.
if (scene && claimsContinuity && !beatLocatesObject) {
  const [canvasW, canvasH] = sceneDims(scene);
  const htmlLayers = (Array.isArray(scene.layers) ? scene.layers : []).filter((l) => l && l.type === 'html');
  const fullBleed = (l) => l.x === 0 && l.y === 0 && l.w === canvasW && l.h === canvasH;
  if (htmlLayers.length > 1 && htmlLayers.every(fullBleed)) {
    err('frame-as-surface',
      `all ${htmlLayers.length} html layer(s) are full-bleed (0,0,${canvasW}x${canvasH}), so every beat swaps the `
      + 'entire canvas rather than a piece of it, yet the storyboard claims something carries across the cuts '
      + `(\`object: "${sb.object}"\`) and no beat ever locates it. `
      + 'Either write a per-beat `object:` naming what it becomes at each cut, or give at least one element a '
      + 'real position and size a later beat can pick up, instead of every beat swapping the whole canvas.');
  }
}

// ── report ─────────────────────────────────────────────────────────────────────────────────────────
if (process.argv.includes('--json')) { console.log(JSON.stringify(gf.toJSON ? gf.toJSON() : { errs, warns }, null, 2)); process.exit(errs.length ? 1 : 0); }
console.log(`\n  frame-check · ${path.relative(ROOT, sbPath)} · ${beats.filter((b) => b.fragment).length} fragment(s)`);
for (const m of errs) console.log(`    ✗ ${m}`);
for (const m of warns) console.log(`    ~ ${m}`);
if (!errs.length && !warns.length) console.log('    ✓ every frame matches what its beat planned\n');
else console.log('');
process.exit(errs.length ? 1 : 0);
