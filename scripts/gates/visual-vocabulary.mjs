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
import { sceneTiming, num, spanOf, canvasShare } from './scene-timing.mjs';
import { BLOCKS } from '../../blocks/index.mjs';

// BLOCKS ARE SUGAR and this gate reads raw JSON, so a chart authored the fast way looked like nothing.
// The first fix derived a chart NAME LIST by regexing the exports of blocks/charts.mjs, which was wrong
// in both directions: it missed every pictorial non-chart block (phoneFrame, browserFrame, table), and
// it admitted `statBig`, which blocks/charts.mjs:12-19 shows emits a `count` layer plus a text label.
// That is a number set in type wearing a chart's name, i.e. the exact thing this gate exists to catch,
// and it would have bought a scene a pass. So: call the factory and MEASURE WHAT IT EMITS. A block earns
// its place by what it draws, never by what it is called, and `statBig` now fails on its own merits.
const expand = (L) => {
  const f = BLOCKS[L.block];
  if (typeof f !== 'function') return [];
  try { const { type, block, ...opts } = L; return (f(opts) || []).filter(Boolean); } catch { return []; }
};

// The blocks worth SUGGESTING are the ones that actually draw something, so the list is derived the same
// way the check is: call each factory and see whether it emits a pictorial layer. `statBig` drops out of
// its own accord, which is the point. Advisory text and the check can no longer disagree.
const drawsSomething = (name) => {
  try {
    // sample data, because a data-driven block called with none of it correctly draws nothing and
    // would drop out of its own suggestion list.
    const out = (BLOCKS[name]({
      data: [{ label: 'a', value: 3 }, { label: 'b', value: 2 }, { label: 'c', value: 1 }],
      segments: [{ label: 'a', value: 3 }, { label: 'b', value: 1 }],
      series: [{ label: 'a' }, { label: 'b' }], value: 50, max: 100,
    }) || []).filter(Boolean);
    return out.some(function has(L) {
      return L && (PICTORIAL.has(L.type) || (L.type === 'html' && htmlGraphic(L.html)) || (L.children || []).some(has));
    });
  } catch { return false; }
};

const file = process.argv[2];
const strict = process.argv.includes('--strict') || process.env.STRICT === '1';
if (!file) { console.error('usage: node scripts/gates/visual-vocabulary.mjs <scene.json> [--strict]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (d.module !== 'scene') { console.log(`  visual vocabulary · ${file}: not a scene module, nothing to check.`); process.exit(0); }
// A GENERATED DERIVATIVE IS NOT SEPARATE DEBT. `<name>.expanded.json` and `<name>.beatsync.json` are
// machine output; fixing the source fixes them, and reporting both doubles the apparent size of a
// backlog, which is how a campaign gets abandoned partway. Same reasoning as the line above: say which
// and pass, rather than inventing a finding nobody can act on independently.
const derived = file.match(/^(.*)\.(expanded|beatsync)\.json$/);
if (derived && fs.existsSync(`${derived[1]}.json`)) {
  console.log(`  visual vocabulary · ${file}: generated from ${path.basename(derived[1])}.json — check the source, not the output.`);
  process.exit(0);
}
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
const unmeasured = []; // pictorial layers whose size cannot be established at all
const pictorialWhy = (L) => {
  if (PICTORIAL.has(L.type)) return L.type;
  if (L.type === 'html') return htmlGraphic(L.html);
  return null;
};
const walk = (L, span = null) => {
  if (!L || typeof L !== 'object') return;
  const at = span || spanOf(L);
  if (L.type === 'block') {                       // measure what the factory actually draws
    for (const e of expand(L)) walk(e, at);
    (L.children || []).forEach((c) => walk(c, at));
    return;
  }
  const why = pictorialWhy(L);
  if (why && L.track !== 0) {
    const { share, how } = canvasShare(L, CW, CH);
    const rec = { id: L.id || L.type, why, share, how, span: at };
    if (how === 'unknown') unmeasured.push(rec);
    else (share >= SUBJECT_AREA ? carriers : garnish).push(rec);
  }
  (L.children || []).forEach((c) => walk(c, at));
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
for (const c of carriers) console.log(`    ✓ ${c.id}: ${c.why}, ${c.how === 'proxy' ? '~' : ''}${Math.round(c.share * 100)}% of frame, ${s(c.span[0])}-${s(c.span[1])}`);
for (const g of garnish) console.log(`    · ${g.id}: ${g.why}, only ${g.how === 'proxy' ? '~' : ''}${(g.share * 100).toFixed(1)}% of frame — a mark, not a subject`);
for (const u of unmeasured) console.log(`    ? ${u.id}: ${u.why}, size undeclared — UNMEASURED, not cleared`);
if (carriers.length || garnish.length || unmeasured.length) console.log('');

const SUGGEST = [...new Set(Object.keys(BLOCKS).filter(drawsSomething))].slice(0, 8);
const HOW = `Ways to SHOW instead of set in type: a bar or column whose length IS the figure · a ring whose arc IS the share `
  + `· a real captured product surface (\`make capture\`) · a diagram of the flow · a map, a photo `
  + `· an svg that draws on or morphs. The one-line route is a block that draws: ${SUGGEST.join(' / ') || 'see blocks/charts.mjs'}. `
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
if (unmeasured.length) {
  warn('unmeasured-graphic', `${unmeasured.length} pictorial layer(s) declare no size this gate can resolve `
    + `(${unmeasured.map((u) => `"${u.id}"`).join(', ')}), so they are UNJUDGED rather than cleared. `
    + `An undeclared box is an unknown size, not a large one, so crediting it would let a bare \`src\` buy a pass. `
    + `Give the layer a \`w\`/\`h\`/\`size\`, or point \`src\` at a local asset whose header states its aspect.`);
}
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
