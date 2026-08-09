// scripts/gates/feature-audit.mjs — static utilization report: what the framework OFFERS vs what the
// authored videos actually USE. No browser, no render — pure JSON walk. This is the another engine
// `lint`/`inspect` analogue: keep authored content honest against the framework's real capability,
// and surface the newest/best primitives (group layout, spring easing, multi-line fit) that videos
// haven't adopted yet. WARN-tier: always exits 0 (a coaching report, not a blocker).
//
// Run: node scripts/gates/feature-audit.mjs   (make feature-audit)
import fs from 'fs';
import path from 'path';
import { PRESETS } from '../../core/type.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { SCENE_DIR } from './paths.mjs';

const DIR = SCENE_DIR;
const SKIP = new Set(['sample.json', 'schema.json']);
const isReel = (f) => /demo|reel/.test(f); // showcase reels exercise the whole vocab by design

// capability primitives: presence of the key anywhere in the tree is "adopted"
const CAPS = ['group', 'motion', 'camera', 'cut', 'fx', 'ken', 'layout', 'fitH', 'fitText'];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !SKIP.has(f)).sort();

const KIN = new Set(Object.keys(PRESETS)); // only these are kinetic entrance presets ('paper'/'accent' are bg specs)

// walk one video → { keys:Set, presets:{}, cuts:Set, fx:Set, spring:bool, entrances:count }
function scan(obj) {
  const keys = new Set(), presets = {}, cuts = new Set(), fx = new Set();
  let spring = false, entrances = 0;
  (function rec(o) {
    if (Array.isArray(o)) return o.forEach(rec);
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) keys.add(k);
    if (o.preset && KIN.has(o.preset)) { presets[o.preset] = (presets[o.preset] || 0) + 1; entrances++; }
    if (o.split && !o.preset) entrances++; // a split layer with default entrance still counts
    if (o.cut) cuts.add(o.cut);
    if (o.fx != null) fx.add(String(o.fx));
    if (typeof o.ease === 'string' && o.ease.includes('spring')) spring = true;
    Object.values(o).forEach(rec);
  })(obj);
  return { keys, presets, cuts, fx, spring, entrances };
}

const vids = files.map((f) => ({ f, reel: isReel(f), ...scan(JSON.parse(fs.readFileSync(path.join(DIR, f)))) }));
const ship = vids.filter((v) => !v.reel);

// ---- 1. vocabulary coverage (across ALL authored files — reels prove a primitive exists) ----
const allPresets = new Set(), allCuts = new Set(), allFx = new Set();
for (const v of vids) { Object.keys(v.presets).forEach((p) => allPresets.add(p)); v.cuts.forEach((c) => allCuts.add(c)); v.fx.forEach((x) => allFx.add(x)); }
const coverage = (label, offered, used) => {
  const unused = offered.filter((x) => !used.has(x));
  const pct = Math.round((used.size / offered.length) * 100);
  console.log(`  ${label.padEnd(22)} ${String(used.size).padStart(2)}/${offered.length}  (${pct}%)  unused: ${unused.join(', ') || '—'}`);
};
console.log('\n=== VOCABULARY COVERAGE (framework offers → ever used by any video) ===');
coverage('kinetic presets', Object.keys(PRESETS), allPresets);
coverage('cut presentations', Object.keys(PRESENTATIONS).filter((c) => c !== 'none'), allCuts);
coverage('shader stings', SHADER_FX, allFx);

// ---- 2. per-video capability adoption (shipped videos, reels excluded) ----
console.log('\n=== CAPABILITY ADOPTION (shipped videos; reels excluded) ===');
const has = (v, cap) => (cap === 'spring' ? v.spring : v.keys.has(cap));
const cols = [...CAPS, 'spring'];
console.log('  ' + 'video'.padEnd(20) + cols.map((c) => c.slice(0, 6).padEnd(7)).join(''));
for (const v of ship) console.log('  ' + v.f.replace('.json', '').padEnd(20) + cols.map((c) => (has(v, c) ? 'Y' : '·').padEnd(7)).join(''));
const totals = cols.map((c) => ship.filter((v) => has(v, c)).length);
console.log('  ' + `TOTAL /${ship.length}`.padEnd(20) + totals.map((t) => String(t).padEnd(7)).join(''));
const never = cols.filter((c, i) => totals[i] === 0);
if (never.length) console.log(`\n  ⚠ NEVER adopted by any shipped video: ${never.join(', ')}  — the newest/best primitives are going unused.`);

// ---- 3. preset-monotony warnings (shipped videos) ----
console.log('\n=== ENTRANCE VARIETY (shipped videos) ===');
let warned = 0;
for (const v of ship) {
  const total = Object.values(v.presets).reduce((a, b) => a + b, 0);
  if (total < 5) continue;
  const [top, n] = Object.entries(v.presets).sort((a, b) => b[1] - a[1])[0];
  const share = n / total;
  if (share > 0.5) { console.log(`  ⚠ ${v.f}: "${top}" is ${Math.round(share * 100)}% of ${total} entrances — vary it (21 presets available).`); warned++; }
}
if (!warned) console.log('  ✓ no single preset dominates any shipped video');

console.log('\nfeature-audit: report only (WARN tier). Prefer group/spring/fitH per docs/PRIMITIVES.md.');
