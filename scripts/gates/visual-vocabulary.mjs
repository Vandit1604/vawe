// scripts/gates/visual-vocabulary.mjs — DOES THE FILM SHOW ANYTHING, OR IS IT ALL TYPE?
//
// Every other gate here checks that the words are good, the palette is locked, the motion is directed
// and the plan was kept. None of them notices that a film is 100% GLYPHS. So a video could be twelve
// seconds of monospace text sliding around inside boxes, pass the entire ladder, and never once SHOW
// the viewer a quantity, a proportion, or a relationship. Measured across the library when this gate
// was written: 52 of 93 shipped scenes carried no large pictorial layer at all. That is the house
// style, and it was nobody's decision.
//
// THE DISTINCTION THIS GATE TURNS ON, and it is the same one CLAUDE.md already makes about backgrounds:
//   DECORATION dresses the frame. A glow, a gradient, a hairline rule, a corner tick, a scanline
//     overlay, a logo mark beside a wordmark. Beautiful, and it carries no information.
//   EXPLANATION does work the words cannot. A bar whose length IS the number. A ring whose arc IS the
//     share. A captured product surface. A diagram of a flow. A photograph of the thing.
// A film can be drowning in the first and have none of the second. All three Ledgerline cuts were.
//
// WHAT IT MEASURES, and the size rule. A pictorial LAYER TYPE is necessary but nowhere near sufficient:
// `creed-launch` carries 19 of them and every one is a small logo. So a graphic only counts as CARRYING
// a beat when it is big enough to be the subject: at least 8% of the canvas, and not on the backdrop
// track. That single threshold is what separates "there is an icon on screen" from "the picture is the
// point", and it is why a wordmark's mark does not buy you a pass.
//
// WHAT IT CANNOT DO. It proves a picture is on screen and is large. It cannot prove the picture
// EXPLAINS anything: a big decorative photograph passes this gate and deserves to fail a human. Do not
// extend it to claim otherwise. Green here means the film is not pure typography. It does not mean the
// graphic earned its place, which is what `make judge` and your eyes are for.
//
//   node scripts/gates/visual-vocabulary.mjs <scene.json> [--strict]   ·   make visuals D=<file>
// FAIL: no-visual-vocabulary.   WARN: graphics-thin · text-only-beat. Both block under --strict.
// Waive a deliberate break with {"authoring":{"allow":["graphics-thin", ...]}}.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneTiming, num, spanOf } from './scene-timing.mjs';

// BLOCKS ARE SUGAR, and this gate reads the raw JSON before `make expand` runs. So a genuine chart
// authored the fastest way, `{"type":"block","block":"lineChart"}`, looked like nothing at all and got
// a false `no-visual-vocabulary`. That is worse than a missed finding: it pushes authors off the one
// route that turns a number into a shape in a single line.
// The chart vocabulary is DERIVED from blocks/charts.mjs rather than retyped here, because a gate that
// restates a vocabulary eventually disagrees with it, and the gate is the copy that goes wrong.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHART_BLOCKS = new Set((() => {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'blocks', 'charts.mjs'), 'utf8');
    return [...src.matchAll(/^export\s+(?:function|const)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  } catch { return []; }
})());

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
if (!file) { console.error('usage: node scripts/gates/visual-vocabulary.mjs <scene.json> [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (d.module !== 'scene') { console.log(`  visual vocabulary · ${file}: not a scene module, nothing to check.`); process.exit(0); }
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// types that DEPICT something. `rect` is deliberately absent: a rect is a divider or a scrim far more
// often than it is a bar, and counting it would let any film buy a pass with a hairline.
const PICTORIAL = new Set(['svg', 'image', 'component', 'board', 'doc', 'clip', 'three', 'raymarch', 'paint', 'composition', 'cursor', 'lottie']);
// types that DECORATE. Listed so the gate cannot be satisfied by adding more light.
const CHROME = new Set(['glow', 'beam', 'shader', 'rect']);
const SUBJECT_AREA = 0.08;   // share of the canvas a graphic must cover to be the subject, not a garnish
const THIN = 1 / 3;          // share of beats that must carry one before the film stops reading as typeset

const T = sceneTiming(d);
const [CW, CH] = T.canvas;
const CANVAS = CW * CH;

// an html layer earns pictorial status by CONTAINING a graphic, not by being an html layer: an inline
// <svg>, a conic-gradient (the donut/ring idiom), or three-or-more boxes whose length is driven by a
// variable, which is what a bar chart looks like in markup.
const htmlGraphic = (h) => {
  if (typeof h !== 'string') return null;
  if (/<svg[\s>]/i.test(h)) return 'inline <svg>';
  if (/conic-gradient\(/i.test(h)) return 'conic-gradient (a ring/donut)';
  // a bar's length can be driven by `width`/`height` OR by `transform:scaleX/Y`, and the second is the
  // one an animator reaches for first because it does not relayout. Matching only the first was this
  // gate failing a real stacked bar chart on the day it was written.
  const bars = h.match(/(?:(?:width|height)\s*:\s*calc\([^;"]*var\(--|transform\s*:\s*scale[XY]\([^;"]*var\(--)/g);
  if (bars && bars.length >= 3) return `${bars.length} variable-length bars`;
  return null;
};

const carriers = [];   // graphics big enough to be the subject of a beat
const garnish = [];    // real graphics, too small to carry
const walk = (L, depth = 0) => {
  if (!L || typeof L !== 'object') return;
  const area = num(L.w, 0) * num(L.h, num(L.w, 0));
  const share = CANVAS ? area / CANVAS : 0;
  let why = null;
  if (PICTORIAL.has(L.type)) why = L.type;
  else if (L.type === 'block' && CHART_BLOCKS.has(L.block)) why = `block:${L.block}`;
  else if (L.type === 'html') { const g = htmlGraphic(L.html); if (g) why = g; }
  if (why && L.track !== 0) {
    const [a, b] = spanOf(L);
    const rec = { id: L.id || L.type, why, share, span: [a, b] };
    (share >= SUBJECT_AREA ? carriers : garnish).push(rec);
  }
  (L.children || []).forEach((c) => walk(c, depth + 1));
};
(Array.isArray(d.layers) ? d.layers : []).forEach((L) => walk(L));

// BEAT WINDOWS. Declared cuts are the truth when they exist; otherwise the film is chopped into roughly
// four-second stretches, which is close enough to a beat for "did you show anything here".
const dur = T.duration;
const windows = [];
if (T.cutTimes.length) {
  const edges = [0, ...T.cutTimes, dur];
  for (let i = 0; i < edges.length - 1; i++) if (edges[i + 1] - edges[i] > 0.05) windows.push([edges[i], edges[i + 1]]);
} else {
  const n = Math.max(1, Math.round(dur / 4));
  for (let i = 0; i < n; i++) windows.push([(i * dur) / n, ((i + 1) * dur) / n]);
}
const covered = windows.filter(([a, b]) => carriers.some((c) => c.span[0] < b - 1e-9 && c.span[1] > a + 1e-9));
const bare = windows.filter((w) => !covered.includes(w));

const s = (n) => `${(+n).toFixed(2)}s`;
const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });

console.log(`\n  visual vocabulary · ${file}`);
console.log(`  ${carriers.length} carrying graphic(s) · ${garnish.length} too small to carry · ${windows.length} beat window(s), ${covered.length} covered\n`);
for (const c of carriers) console.log(`    ✓ ${c.id}: ${c.why}, ${Math.round(c.share * 100)}% of frame, ${s(c.span[0])}-${s(c.span[1])}`);
for (const g of garnish) console.log(`    · ${g.id}: ${g.why}, only ${(g.share * 100).toFixed(1)}% of frame — a mark, not a subject`);
if (carriers.length || garnish.length) console.log('');

const HOW = `Ways to SHOW instead of set in type: a bar or column whose length IS the figure · a ring whose arc IS the share `
  + `· a real captured product surface (\`make capture\`) · a diagram of the flow · a map, a photo `
  + `· an svg that draws on or morphs. The one-line route is a chart block: ${[...CHART_BLOCKS].join(' / ') || 'see blocks/charts.mjs'}. `
  + `Doctrine: docs/CRAFT/SHOW-DONT-TELL.md. Vocabulary: docs/EFFECTS.md and \`make blueprints\`.`;

if (!carriers.length) {
  fail('no-visual-vocabulary', `nothing in this film SHOWS anything: every layer that carries information is type. `
    + `${garnish.length ? `There ${garnish.length === 1 ? 'is' : 'are'} ${garnish.length} pictorial layer(s), but ${garnish.length === 1 ? 'it is' : 'all are'} under `
      + `${Math.round(SUBJECT_AREA * 100)}% of the frame, which is a logo or an icon, not a subject. ` : ''}`
    + `Glow, gradients, rules, ticks and scanlines are DECORATION: they dress the frame and carry no information, `
    + `so no amount of them fixes this. A graphic earns its place by doing work the words cannot, which means encoding `
    + `a quantity geometrically or depicting a real thing. ${HOW}`);
} else if (covered.length / windows.length < THIN) {
  warn('graphics-thin', `only ${covered.length} of ${windows.length} beat windows have a graphic on screen `
    + `(${Math.round((covered.length / windows.length) * 100)}%). The film leans on type for most of its length. ${HOW}`);
}
// `graphics-thin` strictly IMPLIES a bare window, so reporting both showed an author two findings for
// one defect. They are now mutually exclusive: below the share it is a whole-film problem, above it the
// specific bare beats are the useful thing to name.
if (carriers.length && bare.length && covered.length / windows.length >= THIN) {
  warn('text-only-beat', `${bare.length} beat window(s) hold nothing but type: ${bare.map(([a, b]) => `${s(a)}-${s(b)}`).join(', ')}. `
    + `A beat that names a quantity and does not show it is asking the viewer to do the picturing.`);
}

const fails = findings.filter((f) => f.sev === 'FAIL' && !allow.has(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !allow.has(f.code));
const waived = findings.filter((f) => allow.has(f.code));
for (const f of fails) console.log(`  ✗ [${f.code}] ${f.msg}\n`);
for (const f of warns) console.log(`  ~ [${f.code}] ${f.msg}\n`);
for (const f of waived) console.log(`  ○ [${f.code}] waived via authoring.allow`);
if (!fails.length && !warns.length) console.log('  ✓ the film shows as well as tells.');
console.log(`\n  ${fails.length} fail · ${warns.length} warn`);
// prints on green too: a tick here is a low bar and saying so is the difference between a gate and a rubber stamp.
console.log(`  (this proves a picture is on screen and big enough to be the subject. Whether it EXPLAINS anything`);
console.log(`   is not measurable here and belongs to \`make judge\` and your eyes.)\n`);
process.exit(fails.length || (strict && warns.length) ? 1 : 0);
