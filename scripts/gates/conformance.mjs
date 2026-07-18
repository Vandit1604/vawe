// conformance.mjs — does the engine actually DO what it says it accepts?
//
//   node scripts/gates/conformance.mjs            everything
//   node scripts/gates/conformance.mjs enums      only the vocabulary sweep
//   node scripts/gates/conformance.mjs props      only the prop-effect sweep
//   node scripts/gates/conformance.mjs paths      only the cross-path sweep
//   make conformance
//
// WHY THIS EXISTS. Nine framework bugs were found by hand while authoring (docs/MISTAKES.md #19-27)
// and eight of them share one signature: the engine ACCEPTS an input and then silently ignores or
// substitutes it. `radius` on an image did nothing unless `ken` was also set. `slideL` was in a
// schema label but no such anim exists, so it resolved to `fade`. The `cuts` array was never read by
// auto sound-design. A group child dropped `radius` even after the top-level path was fixed.
//
// None of those are findable by reading code — they are all "looks plausible, does nothing". They ARE
// findable mechanically: apply the input, and assert the output CHANGED. That is all this does.
//
// Signature = window.__engine.frameSig(n), the engine's own content hash (DOM innerHTML + canvas
// pixels). Using the engine's hash means WebGL stings and canvas passes are covered too, and the
// sweep agrees with the thing it is sweeping.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
// Vocabulary is DERIVED from the registries, never restated here. A hand-typed list in a gate drifts
// from the code the same way the schema label did (MISTAKES #21) — and then the gate certifies the
// drift. Importing means new vocabulary is swept the day it lands.
import { ANIM_NAMES } from '../../core/clips.js';
import { PRESETS } from '../../core/type.js';
import { LOOK_NAMES } from '../../core/looks.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const only = process.argv[2] || 'all';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// Scenes are served from MEMORY, never written to formats/. A sweep that litters the repo with
// hundreds of fixture files is a sweep nobody runs twice.
const scenes = new Map();
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith('/__conf/')) {
    const body = scenes.get(url.slice('/__conf/'.length));
    if (!body) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(body);
  }
  const p = path.join(repoRoot, url.replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const AVATAR = '/assets/brands/tpot/avatars/000-elonmusk.jpg';
const IMG = fs.existsSync(path.join(repoRoot, AVATAR.slice(1))) ? AVATAR : '/assets/icons/ui/check.svg';

let id = 0;
/** Render a scene and return its content signature across the sampled frames. */
async function sig(scene, frames) {
  const key = `s${id++}.json`;
  scenes.set(key, JSON.stringify(scene));
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent('/__conf/' + key)}&fps=30`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  const err = await page.evaluate(() => window.__engineError || null);
  if (err) return { error: String(err).slice(0, 120) };
    const out = await page.evaluate((fr) => fr.map((n) => window.__engine.frameSig(n)), frames);
  scenes.delete(key);
  return { sig: out.join(','), };
}

const base = (layers, extra = {}) => ({
  module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
  bg: [{ preset: 'plain', from: 0, to: 2 }], layers, ...extra,
});

const findings = [];
const note = (area, subject, detail) => findings.push({ area, subject, detail });
const T = (o = {}) => ({ type: 'text', text: 'Conformance probe', x: 200, y: 400, w: 1200, align: 'left', size: 90, weight: 600, start: 0, duration: 2, ...o });
const I = (o = {}) => ({ type: 'image', src: IMG, x: 200, y: 400, w: 240, h: 240, start: 0, duration: 2, ...o });

// Values that must visibly change the frame if the prop is honoured at all.
const PROBE = {
  radius: 90, color: '#ff0000', bg: '#00ff00', size: 150, weight: 900, tracking: '0.4em', ls: '0.4em',
  blur: 6, pad: 40, border: '4px solid #ff0000', shadow: true, italic: true,
  w: 700, h: 500, x: 700, y: 700, ken: true, edgeFade: true, canvasFx: 'halftone',
  filter: 'grayscale(1)', align: 'right', font: 'mono', mask: 'linear-gradient(#000,transparent)',
  elevation: 3, maxLines: 1, fit: true,
};

// Props that are legitimately inert on their own — each needs a REASON, never a bare name, or the
// allowlist quietly becomes the place bugs go to hide.
const EXPECTED_INERT = {
  'text.radius': 'chipBox early-returns without bg/border/shadow — a corner radius on a transparent text box is meaningless',
  'text.pad':    'same: padding only applies once the layer has a chip/pill background',
  'rect.shadow': 'rect already paints a fill; shadow needs elevation to differ visibly at this size',
};

// ---------------------------------------------------------------- PHASE 1 — vocabulary
// Every declared enum value must produce a DISTINCT frame. A value that renders identically to the
// fallback is unimplemented, misspelled, or dead vocabulary the schema still advertises.
async function sweepEnums() {
  console.log('\n── phase 1 · vocabulary: does every declared value actually do something?');

  // The DEFAULT value of each vocabulary is by definition identical to the no-value baseline, so it
  // is not evidence of anything. Naming them keeps the sweep honest instead of reporting 1 false
  // finding per category forever.
  const DEFAULTS = { 'layer anim': 'fade', 'kinetic preset': 'up' };
  const CUT_STYLES = (() => {
    const j = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats/scene/schema.json'), 'utf8'));
    let found = [];
    const walk = (o) => { if (!o || typeof o !== 'object') return;
      if (Array.isArray(o.enum) && o.enum.includes('punch') && o.enum.includes('softwipe')) found = o.enum.filter((v) => v !== 'none');
      for (const k in o) walk(o[k]); };
    walk(j); return found;
  })();

  const VOCAB = [
    { label: 'layer anim', values: ANIM_NAMES,
      frames: [3, 6, 9], build: (v) => base([T({ anim: v, enterDur: 0.8 })]) },
    { label: 'kinetic preset', values: Object.keys(PRESETS),
      frames: [4, 8, 14], build: (v) => base([T({ split: 'word', preset: v, each: 0.9, stagger: 0.08, anim: 'none' })]) },
    { label: 'cut style', values: CUT_STYLES, frames: [29, 31, 33],
      // baseline = the SAME scene with NO cut at all (passing style:undefined fails validation,
      // because `style` is required — that is a valid schema rule, not a bug to route around).
      build: (v) => base([T(), T({ text: 'Second', y: 600, start: 1, duration: 1 })],
        v === undefined ? {} : { cuts: [{ t: 1, style: v }] }) },
    { label: 'composite look', values: LOOK_NAMES,
      frames: [15], build: (v) => base([I({ filter: v })]) },
    { label: 'canvas fx', values: CANVAS_FX_NAMES,
      frames: [15], build: (v) => base([I({ canvasFx: v })]) },
  ];

  for (const V of VOCAB) {
    // The baseline is the SAME scene with the value omitted — that is what a silent fallback returns.
    const baseSig = await sig(V.build(undefined), V.frames);
    if (baseSig.error) { note('vocab', V.label, `baseline scene errored: ${baseSig.error}`); continue; }
    const seen = new Map();
    const dead = [], dupes = [];
    for (const v of V.values) {
      const r = await sig(V.build(v), V.frames);
      if (r.error) { note('vocab', `${V.label}:${v}`, `render error: ${r.error}`); continue; }
      if (r.sig === baseSig.sig && DEFAULTS[V.label] !== v) dead.push(v);
      else if (seen.has(r.sig)) dupes.push(`${v}=${seen.get(r.sig)}`);
      else seen.set(r.sig, v);
    }
    const total = V.values.length;
    console.log(`   ${V.label.padEnd(18)} ${String(total).padStart(3)} values · ${String(total - dead.length).padStart(3)} distinct${dead.length ? `  ✗ ${dead.length} inert` : '  ✓'}`);
    if (dead.length) note('vocab', V.label, `${dead.length}/${total} render IDENTICAL to the fallback (unimplemented or dead vocabulary): ${dead.join(', ')}`);
    if (dupes.length) note('vocab', V.label, `${dupes.length} value(s) render identically to another value: ${dupes.slice(0, 8).join(', ')}`);
  }
}

// ---------------------------------------------------------------- PHASE 2 — prop effect
// A prop the schema advertises for a layer type must change that layer's output. This is the sweep
// that would have caught `radius` doing nothing on an image (MISTAKES #19) the day it was written.
async function sweepProps() {
  console.log('\n── phase 2 · props: does every accepted prop change the output?');
  const TARGETS = [
    { type: 'text', mk: (p, v) => base([T({ [p]: v })]), props: ['color', 'size', 'weight', 'tracking', 'ls', 'align', 'font', 'bg', 'radius', 'pad', 'border', 'shadow', 'italic', 'filter', 'x', 'y', 'w', 'maxLines'] },
    { type: 'image', mk: (p, v) => base([I({ [p]: v })]), props: ['radius', 'ken', 'edgeFade', 'canvasFx', 'filter', 'mask', 'x', 'y', 'w', 'h'] },
    { type: 'rect', mk: (p, v) => base([{ type: 'rect', x: 200, y: 300, w: 600, h: 300, bg: '#0093eb', start: 0, duration: 2, [p]: v }]), props: ['bg', 'radius', 'border', 'shadow', 'elevation', 'x', 'y', 'w', 'h'] },
  ];
  for (const t of TARGETS) {
    const baseSig = await sig(t.mk('__none', 0), [15]);
    if (baseSig.error) { note('props', t.type, `baseline errored: ${baseSig.error}`); continue; }
    const inert = [];
    for (const p of t.props) {
      if (!(p in PROBE)) continue;
      const r = await sig(t.mk(p, PROBE[p]), [15]);
      if (r.error) { note('props', `${t.type}.${p}`, `render error: ${r.error}`); continue; }
      if (r.sig === baseSig.sig && !EXPECTED_INERT[`${t.type}.${p}`]) inert.push(p);
    }
    console.log(`   ${t.type.padEnd(18)} ${String(t.props.length).padStart(3)} props  ${inert.length ? `✗ ${inert.length} inert` : '✓ all honoured'}`);
    if (inert.length) note('props', t.type, `accepted but produce NO output change: ${inert.join(', ')}`);
  }
}

// ---------------------------------------------------------------- PHASE 3 — cross-path
// The same primitive is built by more than one constructor (top-level layer vs group child). A prop
// fixed on one path stays broken on the other, silently — exactly MISTAKES #24.
async function sweepPaths() {
  console.log('\n── phase 3 · cross-path: does a prop behave the same inside a group?');
  const props = { radius: 90, w: 300, h: 300 };
  for (const [p, v] of Object.entries(props)) {
    const topOff = await sig(base([I({ w: 240, h: 240 })]), [15]);
    const topOn = await sig(base([I({ w: 240, h: 240, [p]: v })]), [15]);
    const grpOff = await sig(base([{ type: 'group', layout: 'row', gap: 10, x: 200, y: 400, start: 0, duration: 2, children: [{ type: 'image', src: IMG, w: 240, h: 240 }] }]), [15]);
    const grpOn = await sig(base([{ type: 'group', layout: 'row', gap: 10, x: 200, y: 400, start: 0, duration: 2, children: [{ type: 'image', src: IMG, w: 240, h: 240, [p]: v }] }]), [15]);
    const topWorks = topOff.sig !== topOn.sig, grpWorks = grpOff.sig !== grpOn.sig;
    const verdict = topWorks && grpWorks ? '✓ both' : topWorks && !grpWorks ? '✗ DIVERGES (top-level only)' : !topWorks && grpWorks ? '✗ DIVERGES (group only)' : '~ inert on both';
    console.log(`   image.${p.padEnd(12)} top=${topWorks ? 'yes' : 'no '}  group-child=${grpWorks ? 'yes' : 'no '}   ${verdict}`);
    if (topWorks !== grpWorks) note('cross-path', `image.${p}`, `honoured on ${topWorks ? 'top-level but IGNORED as a group child' : 'group child but IGNORED at top level'} — one primitive, two constructors, one forgotten`);
  }
}

if (only === 'all' || only === 'enums') await sweepEnums();
if (only === 'all' || only === 'props') await sweepProps();
if (only === 'all' || only === 'paths') await sweepPaths();

await browser.close(); server.close();

console.log('\n' + '='.repeat(72));
if (!findings.length) { console.log('✓ conformance clean — every declared value and prop changes the output'); process.exit(0); }
console.log(`CONFORMANCE FINDINGS (${findings.length})\n`);
for (const f of findings) console.log(`  [${f.area}] ${f.subject}\n      ${f.detail}\n`);
console.log('Each finding is one of: unimplemented vocabulary, a prop accepted and discarded, or a');
console.log('constructor that forgot a prop. Triage against docs/MISTAKES.md #19-27 before fixing.');
process.exit(1);
