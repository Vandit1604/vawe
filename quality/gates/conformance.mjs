// conformance.mjs: does the engine actually DO what it says it accepts?
//
//   node quality/gates/conformance.mjs            everything
//   node quality/gates/conformance.mjs enums      only the vocabulary sweep
//   node quality/gates/conformance.mjs props      only the prop-effect sweep
//   node quality/gates/conformance.mjs paths      only the cross-path sweep
//   make conformance
//
// WHY THIS EXISTS. Nine framework bugs were found by hand while authoring (docs/MISTAKES.md #19-27)
// and eight of them share one signature: the engine ACCEPTS an input and then silently ignores or
// substitutes it. `radius` on an image did nothing unless `ken` was also set. `slideL` was in a
// schema label but no such anim exists, so it resolved to `fade`. The `cuts` array was never read by
// auto sound-design. A group child dropped `radius` even after the top-level path was fixed.
//
// None of those are findable by reading code. They are all "looks plausible, does nothing". They ARE
// findable mechanically: apply the input, and assert the output CHANGED. That is all this does.
//
// Signature = window.__engine.frameSig(n), the engine's own content hash (DOM innerHTML + canvas
// pixels). Using the engine's hash means WebGL stings and canvas passes are covered too, and the
// sweep agrees with the thing it is sweeping.
//
// ...except that frameSig cannot be used to decide DISTINCTNESS, which is what phase 1 exists to
// decide. See BLIND_ATTRS below (MISTAKES #74).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
// Vocabulary is DERIVED from the registries, never restated here. A hand-typed list in a gate drifts
// from the code the same way the schema label did (MISTAKES #21), and then the gate certifies the
// drift. Importing means new vocabulary is swept the day it lands.
import { ANIM_NAMES } from '../../core/timeline/clips.js';
import { PRESETS } from '../../core/type/type.js';
import { LOOK_NAMES } from '../../core/looks/index.js';
import { CANVAS_FX_NAMES } from '../../core/canvas/effects.js';
import { serveRepo, waitForEngine } from '../lib/render-harness.mjs';
import { gateFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// A flag (only `--json` today) is not the phase selector: `process.argv[2]` used to be that unconditionally,
// so `conformance.mjs --json` silently ran phase "--json" instead of "all" (the same class of bug
// audit-scenes.mjs paid for once already: a flag swallowed as the positional argument).
const only = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'all';


// Scenes are served from MEMORY, never written to formats/. A sweep that litters the repo with
// hundreds of fixture files is a sweep nobody runs twice.
const scenes = new Map();
const { server, port } = await serveRepo({
  route: (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith('/__conf/')) return false;
    const body = scenes.get(url.slice('/__conf/'.length));
    if (!body) { res.writeHead(404); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
    return true;
  },
});

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const AVATAR = '/assets/brands/tpot/avatars/000-elonmusk.jpg';
const IMG = fs.existsSync(path.join(repoRoot, AVATAR.slice(1))) ? AVATAR : '/assets/icons/ui/check.svg';
// SAY WHICH ONE. This is the gate whose entire subject is silent substitution, and it silently
// substituted: a checkout without assets/brands/ sweeps every image prop against a small mono SVG, and
// its results are not comparable with a full checkout's.
console.log(`  image probe: ${IMG}${IMG === AVATAR ? '' : '   (the tpot avatar is absent here, a mono SVG has less to differ on)'}`);

// ------------------------------------------------------- the identity-blind signature (MISTAKES #74)
//
// frameSig hashes `document.body.innerHTML`, and scene.html stamps `data-anim="<name>"` on every
// layer. So the signature CONTAINS THE NAME OF THE THING BEING TESTED: two anims that render
// pixel-identically could never collide, and phase 1's "17 values · 17 distinct ✓" was a tautology.
// Proven by making `wipe-down` byte-identical to `wipe` and watching the sweep still say 17.
//
// Which attributes actually leak was measured, not guessed: each phase-1 vocabulary was rendered and
// its own value name searched for in the resulting DOM. `anim` (and its exit twin `out`) leak as a
// data-attribute. `kinetic preset`, `cut style`, `composite look` and `canvas fx` do NOT, they reach
// the frame as computed styles or as a baked data-URL, never as their own name. That measurement is
// why this is a two-attribute redaction and not a free-text scrub of every value name: over-redaction
// invents duplicates, and a gate that cries wolf gets skimmed (#85, #90).
const BLIND_ATTRS = ['anim', 'out'];

// blindSig MIRRORS frameSig (core/boot.js) instead of calling it, because the innerHTML term is
// exactly what must be redacted and frameSig does not expose it separately. A mirror can drift from
// its original, so with an EMPTY redaction list it must return frameSig's value bit for bit, and
// that is asserted below before any sweep runs. The reverted `visualSig` attempt failed precisely
// here: it hashed a hand-picked list of computed properties, was far LESS sensitive than frameSig,
// and reported five real props as inert. Mirroring makes "at least as sensitive" a fact, not a hope.
const blindSig = (n, blind) => {
  window.__engine.renderFrame(n);
  let html = document.body.innerHTML;
  for (const a of blind) html = html.replace(new RegExp(` data-${a}="[^"]*"`, 'g'), ` data-${a}="_"`);
  const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  let h = fnv(2166136261, html);
  const probe = document.createElement('canvas'); probe.width = 24; probe.height = 14;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  for (const cv of document.querySelectorAll('canvas')) {
    if (!cv.width || cv.style.display === 'none') continue;
    if (cv.getContext('2d')) { h = fnv(h, 'live2d:' + n); continue; }
    try {
      pctx.clearRect(0, 0, 24, 14); pctx.drawImage(cv, 0, 0, 24, 14);
      const d = pctx.getImageData(0, 0, 24, 14).data;
      let acc = '';
      for (let i = 0; i < d.length; i += 8) acc += d[i] + ',' + d[i + 3] + ';';
      h = fnv(h, acc);
    } catch (e) { h = fnv(h, 'opaque-canvas:' + n); }
  }
  return h.toString(36);
};

let id = 0;
/**
 * Render a scene and return its content signature across the sampled frames.
 * `blind` is the list of data-attributes whose values are neutralised first. Phases 2 and 3 pass
 * nothing and therefore keep using frameSig unchanged: the blind signature is only needed where the
 * question is "are these two VALUES the same", and confining it there is what keeps the prop sweep
 * (the one that really caught `tracking`, #28) free of new false positives.
 */
async function sig(scene, frames, blind = []) {
  const key = `s${id++}.json`;
  scenes.set(key, JSON.stringify(scene));
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent('/__conf/' + key)}&fps=30`, { waitUntil: 'load' });
  const err = await waitForEngine(page);
  if (err) return { error: String(err).slice(0, 120) };
  const out = blind.length
    ? await page.evaluate((fr, b, src) => fr.map((n) => new Function('return ' + src)()(n, b)), frames, blind, blindSig.toString())
    : await page.evaluate((fr) => fr.map((n) => window.__engine.frameSig(n)), frames);
  scenes.delete(key);
  return { sig: out.join(','), };
}

/**
 * Half one of falsifiability: the mirror is as sensitive as the original.
 * With nothing redacted, blindSig must reproduce frameSig exactly. If core/boot.js ever changes how
 * it hashes, this fails immediately and names the drift, instead of the sweep quietly measuring
 * something weaker than it claims.
 */
async function assertMirrorsFrameSig() {
  const key = `mirror.json`;
  scenes.set(key, JSON.stringify(base([T(), I({ x: 900, y: 200 })])));
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent('/__conf/' + key)}&fps=30`, { waitUntil: 'load' });
  await waitForEngine(page);
  const bad = await page.evaluate((src) => {
    const fn = new Function('return ' + src)();
    return [0, 7, 15, 29].filter((n) => fn(n, []) !== window.__engine.frameSig(n));
  }, blindSig.toString());
  scenes.delete(key);
  if (bad.length) note('signature', 'blindSig mirror', `blindSig(n, []) disagrees with frameSig at frame(s) ${bad.join(', ')}. The mirror has drifted from core/boot.js, so phase 1 is measuring something WEAKER than the engine's own hash. Re-sync blindSig before trusting any distinctness result.`);
  return bad.length === 0;
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

// Props that are legitimately inert on their own: each needs a REASON, never a bare name, or the
// allowlist quietly becomes the place bugs go to hide.
const EXPECTED_INERT = {
  'text.radius': 'chipBox early-returns without bg/border/shadow. A corner radius on a transparent text box is meaningless',
  'text.pad':    'same: padding only applies once the layer has a chip/pill background',
  'rect.shadow': 'rect already paints a fill; shadow needs elevation to differ visibly at this size',
};

// Declared SYNONYMS: two names deliberately bound to the same function in the registry, not two names
// that accidentally do the same thing. Same discipline as EXPECTED_INERT, a reason, never a bare
// pair, because this is the one place a real duplicate could now hide. The very first run of the
// fixed distinctness check surfaced both of these, which is the evidence that it can see duplicates
// at all; they are exempt because core/clips.js writes `up: rise, rise` and `pop, scale: pop`
// literally, i.e. the aliasing is declared, not emergent.
const EXPECTED_ALIAS = {
  'layer anim': {
    'rise=up': '`up` and `rise` are the same entry in the ANIM registry. One spelling names the direction, the other the gesture',
    'scale=pop': '`scale` and `pop` are the same entry in the ANIM registry, same reason',
    'wipe-right=wipe': '`wipe` is the DEFAULT direction of the wipe family and the family is named for the edge the reveal travels toward, so the default IS `wipe-right`; `wipe-left`/`wipe-up`/`wipe-down` are the other three',
  },
};

// ---------------------------------------------------------------- PHASE 1, vocabulary
// Every declared enum value must produce a DISTINCT frame. A value that renders identically to the
// fallback is unimplemented, misspelled, or dead vocabulary the schema still advertises.
async function sweepEnums() {
  console.log('\n── phase 1 · vocabulary: does every declared value actually do something?');

  // The DEFAULT value of each vocabulary is by definition identical to the no-value baseline, so it
  // is not evidence of anything. Naming them keeps the sweep honest instead of reporting 1 false
  // finding per category forever.
  const DEFAULTS = { 'layer anim': 'none', 'kinetic preset': 'up' };
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
      // because `style` is required. That is a valid schema rule, not a bug to route around).
      build: (v) => base([T(), T({ text: 'Second', y: 600, start: 1, duration: 1 })],
        v === undefined ? {} : { cuts: [{ t: 1, style: v }] }) },
    { label: 'composite look', values: LOOK_NAMES,
      frames: [15], build: (v) => base([I({ filter: v })]) },
    { label: 'canvas fx', values: CANVAS_FX_NAMES,
      frames: [15], build: (v) => base([I({ canvasFx: v })]) },
  ];

  for (const V of VOCAB) {
    // The baseline is the SAME scene with the value omitted, that is what a silent fallback returns.
    const baseSig = await sig(V.build(undefined), V.frames, BLIND_ATTRS);
    if (baseSig.error) { note('vocab', V.label, `baseline scene errored: ${baseSig.error}`); continue; }
    const seen = new Map(), sigs = new Set();
    const dead = [], collided = [];
    for (const v of V.values) {
      const r = await sig(V.build(v), V.frames, BLIND_ATTRS);
      if (r.error) { note('vocab', `${V.label}:${v}`, `render error: ${r.error}`); continue; }
      sigs.add(r.sig);
      if (r.sig === baseSig.sig && DEFAULTS[V.label] !== v) dead.push(v);
      else if (seen.has(r.sig)) collided.push(`${v}=${seen.get(r.sig)}`);
      else seen.set(r.sig, v);
    }
    const aliases = EXPECTED_ALIAS[V.label] || {};
    const dupes = collided.filter((p) => !aliases[p]);

    // ── HALF TWO OF FALSIFIABILITY: the declared aliases are the POSITIVE CONTROL.
    // `up`/`rise` and `scale`/`pop` are the same function object in core/clips.js, so any signature
    // worth trusting MUST see them as one thing. If one stops colliding, the signature has gone back
    // to carrying the value's identity and every "distinct" printed below is unearned.
    // The first version of this assertion used the DEFAULT value instead, and it was vacuous: scene.html
    // stamps `data-anim` on every layer and (at the time) defaulted it to `fade`, so the baseline and
    // `anim:'fade'` matched even with redaction switched off. Verified by switching it off, the sweep
    // still said clean. That is the same self-fulfilling shape as the bug being fixed, one level up.
    // (The default is `none` now; this note describes the shape of the old bug, not today's setup.)
    for (const pair of Object.keys(aliases)) {
      if (!collided.includes(pair)) note('vocab', `${V.label} (falsifiability)`, `\`${pair}\` are the same entry in the registry and MUST hash identically, but this sweep saw them as distinct. The signature is identity-revealing again, so nothing below is evidence. Check BLIND_ATTRS against what scene.html now stamps on a layer.`);
    }

    const total = V.values.length;
    // "distinct" counts distinct SIGNATURES. The old arithmetic (values minus inert) could never
    // print a number below the value count for a duplicate, which is how "17 values · 17 distinct ✓"
    // survived two values being byte-identical.
    const distinct = sigs.size;
    const alias = Object.keys(aliases).length;
    console.log(`   ${V.label.padEnd(18)} ${String(total).padStart(3)} values · ${String(distinct).padStart(3)} distinct${alias ? ` (${alias} declared alias)` : ''}${dead.length ? `  ✗ ${dead.length} inert` : '  ✓'}`);
    if (dead.length) note('vocab', V.label, `${dead.length}/${total} render IDENTICAL to the fallback (unimplemented or dead vocabulary): ${dead.join(', ')}`);
    if (dupes.length) note('vocab', V.label, `${dupes.length} value(s) render identically to another value: ${dupes.slice(0, 8).join(', ')}`);
  }
}

// ---------------------------------------------------------------- PHASE 2, prop effect
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

// ---------------------------------------------------------------- PHASE 3, cross-path
// The same primitive is built by more than one constructor (top-level layer vs group child). A prop
// fixed on one path stays broken on the other, silently, exactly MISTAKES #24.
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
    if (topWorks !== grpWorks) note('cross-path', `image.${p}`, `honoured on ${topWorks ? 'top-level but IGNORED as a group child' : 'group child but IGNORED at top level'}. One primitive, two constructors, one forgotten`);
  }
}

// Both halves of the distinctness proof run BEFORE the sweep that depends on them: the mirror check
// here, the default-collides-with-baseline check inside phase 1.
if (only === 'all' || only === 'enums') { await assertMirrorsFrameSig(); await sweepEnums(); }
if (only === 'all' || only === 'props') await sweepProps();
if (only === 'all' || only === 'paths') await sweepPaths();

await browser.close(); server.close();

console.log('\n' + '='.repeat(72));
const gf = gateFindings({ line: (r) => `  [${r.area}] ${r.at}\n      ${r.summary}\n` });
for (const r of findings) gf.fail('conformance', r.detail, { at: r.subject, area: r.area });

if (!findings.length) console.log('✓ conformance clean: every declared value and prop changes the output');
else console.log(`CONFORMANCE FINDINGS (${findings.length})\n`);
gf.emit();
if (findings.length) {
  console.log('Each finding is one of: unimplemented vocabulary, a prop accepted and discarded, or a');
  console.log('constructor that forgot a prop. Triage against docs/MISTAKES.md #19-27 before fixing.');
}
process.exit(findings.length ? 1 : 0);
