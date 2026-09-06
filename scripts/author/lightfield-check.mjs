// scripts/author/lightfield-check.mjs: one row per LOOK, not one averaged number.
//
//   node scripts/author/lightfield-check.mjs          every look that has a reference
//   node scripts/author/lightfield-check.mjs blinds   just one
//
// WHY THIS EXISTS. `lightfield` was one generator with five presets and one fidelity score, taken
// against one photograph. That score said 12.7 while a human said "that is not it" (docs/MISTAKES.md
// #262, #278), and it could not have said WHICH look regressed even if it had been right, because four
// of the five were never measured at all.
//
// A look is now its own registry entry with its own reference, so this walks the registry rather than a
// list. Adding a look with a reference adds a row here and nothing else.
//
// A look with NO reference is reported as such and not scored. Scoring against nothing is how a green
// tick gets attached to a picture nobody has ever compared.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ALL_GENERATORS, defaultsOf } from '../../core/layout/generators.js';
import { shoot } from './lightfield-shot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const only = process.argv[2];

const merge = (base, patch) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base[k] || {}, v) : v;
  }
  return out;
};

// Mean per-channel difference on a coarse grid, plus warmth (r minus b) in the DARKEST fifth. The
// second is there because the first was blind to it: the shadows were warm where the reference's were
// cool and every sample point sat in the highlights.
const W = 240, H = 135;
const pixels = (file) => execFileSync('ffmpeg',
  ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { maxBuffer: 1 << 28 });

function compare(refFile, genFile) {
  const a = pixels(refFile), b = pixels(genFile);
  let diff = 0, n = 0;
  const lum = [];
  for (let i = 0; i < a.length; i += 3) {
    diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    n += 3;
    lum.push([0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2], i]);
  }
  // The darkest fifth OF THE REFERENCE, never of the render: splitting by the render's own luma lets a
  // wrong picture choose the regions it is graded on.
  lum.sort((x, y) => x[0] - y[0]);
  const dark = lum.slice(0, Math.floor(lum.length / 5));
  const warm = (buf) => dark.reduce((s, [, i]) => s + (buf[i] - buf[i + 2]), 0) / dark.length;
  return { err: diff / n, refWarm: warm(a), genWarm: warm(b) };
}

const rows = [];
for (const g of ALL_GENERATORS) {
  if (only && g.name !== only) continue;
  // This tool shoots an HTML fragment. A generator that emits scene LAYERS (the blinds shader) is a
  // different kind of thing and is scored by rendering a scene, not by writing a file. Skipping it
  // loudly rather than crashing on a caller it was never written for.
  if (g.produces !== 'html') { rows.push({ name: g.name, note: `produces ${g.produces}, not scored here` }); continue; }
  const preset = Object.values(g.presets || {})[0] || {};
  const opts = merge(defaultsOf(g.schema), preset);
  // `shoot` takes a FILE, because that is what every other caller has. Writing one here rather than
  // widening a shared signature for one consumer.
  const frag = path.join(ROOT, 'out', `_check-${g.name}.html`);
  const out = path.join(ROOT, 'out', `_check-${g.name}.png`);
  fs.mkdirSync(path.dirname(frag), { recursive: true });
  fs.writeFileSync(frag, g.render(opts));
  await shoot(frag, out);
  if (!g.reference) { rows.push({ name: g.name, note: 'no reference' }); continue; }
  const ref = path.join(ROOT, g.reference);
  if (!fs.existsSync(ref)) { rows.push({ name: g.name, note: `reference missing: ${g.reference}` }); continue; }
  rows.push({ name: g.name, ready: g.ready, ...compare(ref, out) });
}

console.log('look        block err   shadow warmth (r-b)      verdict');
console.log('----------  ---------   ref      gen    delta    -------');
let worst = 0;
for (const r of rows) {
  if (r.note) { console.log(`${r.name.padEnd(11)} ${'-'.padStart(9)}   ${r.note}`); continue; }
  const d = r.genWarm - r.refWarm;
  worst = Math.max(worst, r.err);
  // A shadow that is warm where the reference's is cool reads as brown-black against blue-black, and
  // it is the difference a mean error cannot see.
  const verdict = r.ready ? (Math.abs(d) > 12 ? 'SHADOW TEMPERATURE' : r.err > 24 ? 'structure or colour' : 'close')
    : 'HELD BACK, not in the library';
  console.log(`${r.name.padEnd(11)} ${r.err.toFixed(1).padStart(9)}   ${r.refWarm.toFixed(1).padStart(6)} `
    + `${r.genWarm.toFixed(1).padStart(6)} ${d >= 0 ? '+' : ''}${d.toFixed(1).padStart(6)}    ${verdict}`);
}
console.log(`\n${rows.filter((r) => !r.note).length} look(s) scored, `
  + `${rows.filter((r) => r.note).length} without a reference. Worst block error ${worst.toFixed(1)}.`);
