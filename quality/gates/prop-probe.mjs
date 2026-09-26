// prop-probe.mjs: exercise EVERY declared layer prop against EVERY type that declares it, so a prop
// that nothing reads is found on the day it is declared rather than on the day an author happens to
// write it into a film.
//
// WHY THIS EXISTS AND WHAT IT IS NOT. `core/registry/prop-audit.js` already refuses a prop that was set and
// never read, at runtime, per layer, with no false positives from computed keys. It is live on every
// render (films/scene/scene.js:448 wraps every layer, :726 audits each one as its build finishes).
// Its only gap is COVERAGE: it can judge a prop only when an author wrote it. `metalness` and
// `roughness` were declared on the `three` layer (core/three-fx.js:29) and overwritten by literals in
// `deviceShowcase`, and no shipped scene set them on that path, so the check never had anything to
// fire on (engine-doctrine/MISTAKES.md #529, PARITY-AUDIT). This file supplies the missing input and reuses the
// whole mechanism: `watchProps` records the reads, `deadProps` decides, `auditedProps` scopes.
//
//   node quality/gates/prop-probe.mjs              every type, table + exit 1 on an unwaived death
//   node quality/gates/prop-probe.mjs three text   just those types
//
// ONE PROP PER LAYER, and that is not a style choice. A layer carrying all 46 of its type's props at
// once is not a layer any author would write; it takes branches nothing takes together and throws for
// reasons that have nothing to do with the question. So each probe layer is a minimal valid layer of
// its type plus exactly ONE target prop (plus that prop's own `when` guards), and the verdict asks
// about the target alone.
//
// THE WINDOW IS WIDER THAN THE RUNTIME AUDIT'S, deliberately. `auditLayer` snapshots at the end of
// BUILD and therefore cannot judge a type's own props, because a type that exports `frame` reads some
// of them per frame and a declaration cannot say which. The prober drives a fixed list of frames, in
// order, in one tab, and judges after, so a prop read in `frame()` counts as read. Deterministic by
// construction: one tab, ascending frames, no scrambler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { SHARED_PROPS } from '../../core/layers/vocabulary.js';
import { auditedProps } from '../../core/registry/prop-audit.js';
import { KNOBS } from '../../core/registry/knobs.js';
import { guardsOf } from '../../core/registry/props.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------------------------------------------------------------------------------------------
// WAIVERS. Keyed `type.prop`, every entry carrying a reason, the shape quality/gates/arsenal-check.mjs
// uses and for its reason: an unexplained list becomes a dumping ground, and a waiver nobody can read
// is indistinguishable from a bug nobody fixed. A waiver here says "this prop IS read, on a path this
// prober cannot reach", never "we gave up".
const WAIVERS = {
  // Both are read inside `clip`'s frame(), AFTER it returns on an empty manifest (core/layers/clip.js:19).
  // A clip manifest is GENERATED (scripts/gen-clip.mjs) and none is tracked, so the probe points at
  // assets/gen/sweep/manifest.json and gets real reads on a machine that has built one and nothing on a
  // fresh clone. Verified both ways: with that manifest present, neither prop reports.
  'clip.loop': 'read only once the frame manifest resolves; no clip manifest is tracked, so a fresh clone has no frames to advance',
  'clip.speed': 'same as clip.loop: core/layers/clip.js:19 returns on an empty manifest before either dial is read',
  // `delay` is read only inside addGroupChild (core/layers/util.js), a GROUP CHILD'S own offset into its
  // group's window; a top-level layer never reaches that code path. This harness builds one bare
  // top-level layer per type, which cannot construct the group-child context `delay` needs to be read
  // at all, the same shape clip.loop/clip.speed are waived for.
  '(every type).delay': 'read only on a group child (core/layers/util.js addGroupChild), which this single top-level-layer-per-type harness cannot construct',
  // Same class as `delay`, and util.js:97 already names the three together: "nothing is inherited for a
  // child except what the group's own layout gives it (`grow`, `basis`, `delay`)". `grow` is read at
  // core/layers/util.js:669 as flexGrow on a group CHILD, so a bare top-level layer never reaches it.
  '(every type).grow': 'read only on a group child (core/layers/util.js:669, flexGrow), which this single top-level-layer-per-type harness cannot construct',
};

// NOT PROBED, which is a different statement from waived. A waiver says the prober reported a death
// and a human decided it was not one. This says the engine REFUSES the combination at boot, by name,
// with a message that says why: that is the opposite of the silent no-op this gate exists for, and
// probing it would only prove the refusal works.
const SKIP = {
  // TWO NAME COLLISIONS, and both are findings in their own right (engine-doctrine/MISTAKES.md #565): the prop is
  // read, but the flat schema gives the name ONE type for every layer, so the reading type cannot be
  // authored. They are not deaths, and a dead-prop gate is the wrong place to report them.
  'video.out': 'the schema types `out` as the exit-animation NAME for every layer, so a video `out` '
    + '(a source out-point in seconds) is refused at boot as a number and renders currentTime NaN as a string',
  'three.font': 'only `extrudeText` reads it, as a 3D typeface name (Anybody), and the schema `font` '
    + 'enum is sans|serif|mono|num for every layer, so that preset cannot be authored at all today',
  'three.text': 'same: `extrudeText` is the only reader and it cannot be reached (see three.font)',
  'three.resample': 'core/layers/canvas.js:51 refuses it: a three layer owns its own WebGL context and cannot be sampled',
  'raymarch.resample': 'core/layers/canvas.js:51 refuses it: a raymarch layer owns its own WebGL context and cannot be sampled',
  // `carry` is read at BOOT (core/engine/produce.js bakeCursorCarry) as a reference to a SECOND layer
  // by id, exactly the shape `follow`/`becomes`/`panWith` already have, and none of those three is ever
  // surfaced for probing either: this harness builds one minimal layer per prop, and a carry entry
  // naming a target that does not exist is refused loudly by design (the whole point of the feature).
  // Probing it would need a second, real layer in the same scene, which no other cross-layer prop gets.
  'cursor.carry': 'refused at boot without a real target layer to drag (core/engine/produce.js), the same shape as follow/becomes/panWith, none of which this single-layer harness can construct either',
  'globe.resample': 'core/layers/canvas.js:51 refuses it: a globe layer owns its own WebGL context and cannot be sampled',
};

// ---------------------------------------------------------------------------------------------
// A minimal VALID layer per type: the least a layer of that type needs to build at all. Harvested
// from the library (the smallest real layer of each type in films/scene/*.json), so these are shapes
// an author actually writes rather than a guess.
const BASE = {
  text: { text: 'probe', w: 600 },
  count: { from: 0, to: 10, w: 600 },
  image: { src: '/assets/brands/linear/icon.png', w: 200, h: 200 },
  // No footage is tracked, and the path is deliberately absent: the <video> element is built and its
  // props are read whether or not the file resolves, and a missing repo-local mp4 is not refused the
  // way a missing image is (core/boot.js preloads images only).
  video: { src: '/assets/clips/probe.mp4', w: 400, h: 300 },
  group: { children: [{ type: 'text', text: 'probe' }] },
  rect: { w: 200, h: 40 },
  glow: { x: 400, y: 400, w: 200, h: 200 },
  beam: { x: 400, y: 400, w: 300, h: 200 },
  svg: { d: 'M1 12 Q7 1 12 12', viewBox: '0 0 47 24', w: 200 },
  cursor: { size: 36, path: [{ t: 0, x: 100, y: 100 }, { t: 1, x: 300, y: 300 }] },
  clip: { src: '/assets/gen/sweep/manifest.json', w: 320 },
  html: { html: '<div style="width:200px;height:60px">probe</div>', w: 200 },
  component: { src: '/assets/brands/threadcite/components/howitworks.json', w: 600 },
  board: { x: 200, y: 200, w: 900, cols: [{ title: 'A', cards: [{ id: 'x', title: 'card' }] }] },
  doc: { x: 200, y: 200, w: 700, filename: 'Probe.tsx', blocks: [{ code: 'const a = 1' }] },
  shader: { shader: 'flow', w: 600, h: 400 },
  lottie: { src: '/assets/lottie/spin.json', w: 56, h: 56 },
  paint: { paint: 'meteor', w: 600, h: 400 },
  raymarch: { raymarch: 'metaballs', w: 600, h: 400 },
  three: { three: 'uiParallax', w: 600, h: 500 },
  globe: { w: 600, h: 600 },
  particles: { preset: 'confetti', w: 600, h: 400 },
  composition: { comp: 'pipelineFlow', w: 600 },
  adjust: { kind: 'blur' },
};

// A plausible value per prop. It only has to be ACCEPTED and TRUTHY: the Proxy records the read
// whatever the value is, so the value's only jobs are to not throw and to not read as an opt-out
// (`false` is how every opt-out in this engine is spelled, core/props.js:29).
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'films/scene/schema.json'), 'utf8'));
const SCHEMA_PROPS = SCHEMA.fields.layers.item;

// Names whose generic value would throw or be ignored, one line each. A `type.prop` key wins over a
// bare name: `out` is an exit-animation NAME everywhere and a source out-point in SECONDS on `video`,
// one spelling for two things, and a string there renders `currentTime = NaN`.
const VALUES = {
  src: '/assets/icons/anthropic.svg',
  'video.in': 0,
  'video.out': 3,
  ease: 'linear',
  poles: 2,
  typing: true,
  hues: [265, 200, 320],
  screen: '/assets/brands/linear/icon.png',
  html: '<div style="width:120px;height:40px">probe</div>',
  children: [{ type: 'text', text: 'probe' }],
  motion: [{ t: 0, x: 0 }, { t: 1, x: 20 }],
  path: [{ t: 0, x: 100, y: 100 }, { t: 1, x: 300, y: 300 }],
  colors: ['#2563eb', '#8fc0ff', '#1d4ed8', '#3b82f6'],
  pal: ['#2563eb', '#8fc0ff', '#1d4ed8', '#3b82f6'],
  lines: ['const a = 1', 'return a'],
  planes: [{ src: '/assets/brands/linear/icon.png', x: 0, y: 0, z: 0 }],
  blocks: [{ code: 'const a = 1' }],
  cols: [{ title: 'A', cards: [{ id: 'x', title: 'card' }] }],
  cards: [{ id: 'x', title: 'card' }],
  props: {},
  vars: { '--probe': [0, 1] },
  css: { letterSpacing: '0.01em' },
  clicks: [0.5],
  // `preset` is ONE slot over two registries (31 kinetic names for split text, 7 glow names, no
  // overlap), so the schema enum's first entry is a kinetic name and a glow layer must be told its own.
  // Before core/layers/glow.js became a registry an unknown name here returned null and painted the
  // plain gradient, so this probe passed by rendering the wrong thing.
  // A field whose valid set is a UNION no enum can express (EASINGS + the feel words + the
  // interpolation modes) still needs one real value to probe with. That is an input, not a contract.
  ease: 'easeOutCubic',
  varsEase: 'easeOutCubic',
  'glow.preset': 'bloom',
  'particles.preset': 'confetti',   // `preset` also names the particles emitter's mode (confetti/sparks/dust)
  'cursor.style': 'hand',   // `style` is a registry name (core/layers/cursor.js CURSOR_STYLES), not free text
  color: '#2563eb',
  anim: 'fade',
  out: 'fade',
  comp: 'pipelineFlow',
  dest: [10, 50],
  origin: [40, 10],
  shaderKeys: [{ t: 2, shader: 'voronoi' }],
  raymarchKeys: [{ t: 2, shader: 'caustics' }],
  paintKeys: [{ t: 2, paint: 'ink' }],
  threeKeys: [{ t: 2, three: 'extrudeText' }],
};

// Props whose string is handed to CSS verbatim. The value has to PARSE, not merely be a string.
const CSS_VALUED = {
  background: 'rgb(1, 2, 3)', bg: 'rgb(1, 2, 3)', color: 'rgb(1, 2, 3)', fill: 'rgb(1, 2, 3)',
  stroke: 'rgb(1, 2, 3)', border: '1px solid rgb(1, 2, 3)',
  mask: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0))',
  maskImage: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0))',
  origin: '50% 50%', transformOrigin: '50% 50%',
  items: 'center', justify: 'flex-start', align2: 'center', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
  textAlign: 'left', direction: 'ltr', wrap: 'nowrap', flexWrap: 'nowrap',
};

function valueFor(prop, type) {
  if (`${type}.${prop}` in VALUES) return VALUES[`${type}.${prop}`];
  if (prop in VALUES) return VALUES[prop];
  const s = SCHEMA_PROPS[prop] || {};
  if (Array.isArray(s.enum) && s.enum.length) return s.enum.find((v) => v !== 'none' && v !== false) ?? s.enum[0];
  const t = String(s.type || '');
  if (t.includes('boolean') && !t.includes('number')) return true;
  if (t.startsWith('array')) return [];
  if (t.startsWith('object')) return {};
  // A CSS-VALUED PROP NEEDS A LEGAL CSS VALUE. 'probe' in `background` or `maskImage` is not a colour
  // or an image, and this probe only ever worked there because the browser DISCARDED the declaration
  // in silence. core/layers/util.js now refuses a dropped declaration by name, so the probe's own
  // synthetic value became a boot error: the check depended on the silent fallback it exists beside.
  if (t.includes('string') && !t.includes('number')) return CSS_VALUED[prop] ?? 'probe';
  // 0.5 is truthy, inside every 0..1 dial and harmless as a px count; the schema's own `min` wins
  // where there is one, because core/validate.mjs refuses the whole scene over a single out-of-range
  // number and one refused scene is a whole type unchecked.
  if (s.min != null && s.min > 0.5) return s.min;
  if (s.max != null && s.max < 0.5) return s.max;
  return 0.5;
}

// The guard vocabulary has ONE owner (core/props.js), so the prober cannot drift from what the engine
// and every other gate mean by `when`.

// The surface for one type: what the runtime audit already scopes (the kit's build-phase vocabulary)
// plus everything the type declares for itself, which is the half nothing has ever exercised.
function surfaceOf(type) {
  return [...new Set([...auditedProps(type), ...Object.keys(LAYER_PROPS[type] || {})])]
    // A prop whose GUARD is skipped is skipped with it: `resampleFx` needs `resample`, and a layer
    // type that refuses `resample` has no way to reach the prop behind it either.
    .filter((k) => !k.startsWith('_') && k !== 'type' && !SKIP[`${type}.${k}`]
      && !guardsOf(declOf(type, k)).some((g) => SKIP[`${type}.${g}`]))
    .sort();
}

const declOf = (type, prop) => (LAYER_PROPS[type] || {})[prop] || SHARED_PROPS[prop] || {};

// A `three` scene's dials sit on the LAYER and each preset reads only its own, so core/validate.mjs
// refuses `metalness` on a preset that never heard of it. The manifest (core/knobs.js) already says
// which preset reads which dial, so the probe asks the preset that claims the prop. `deviceShowcase`
// is the reason this exists: its two dials were declared and written as literals.
// `extrudeText` is passed over when another preset reads the same dial: it needs a 3D typeface the
// schema will not let a scene name (see SKIP), so a probe aimed at it dies for the wrong reason.
// THE CONTEXT A PROP IS READ IN, which the `when` guard vocabulary cannot express. A guard is
// satisfied by PRESENCE (core/props.js:29), so it can say "`fitH` needs `fit`" and cannot say "`angle`
// is read when `mode` is SHINE" or "`amp` belongs to the `waves` paint". Those are per-preset dials,
// and probing one against the wrong preset proves nothing: the prop really is unread there.
//
// Each entry names the file and line that does the reading, so a stale entry is one grep from being
// caught. This is the map to extend when a new preset lands with dials of its own.
const AS = {
  // beam: the sheen mode only (core/layers/beam.js:23, :74). The default ring reads none of them.
  'beam.angle': { mode: 'shine' }, 'beam.intensity': { mode: 'shine' }, 'beam.period': { mode: 'shine' },
  // resample: `angle` is read by ONE fx, `directionalBlur` (core/resample/index.js, core/resample/effects.js).
  // The default guard value for `resample` is the first RESAMPLE_FX entry (`zoomBlur`), which never
  // reads it, so `angle` reports dead against every resamplable type unless the probe is pointed at
  // the one fx that does. `paint` already declares its own unrelated `angle` and needs no override.
  'image.angle': { resample: { fx: 'directionalBlur' } },
  'shader.angle': { resample: { fx: 'directionalBlur' } },
  'particles.angle': { resample: { fx: 'directionalBlur' } },
  // paint: per-fx dials (core/paint-fx.js:43 matrix · :88 aurora · :143 waves).
  'paint.size': { paint: 'matrix' }, 'paint.tail': { paint: 'matrix' }, 'paint.rate': { paint: 'matrix' },
  'paint.hue': { paint: 'aurora' }, 'paint.hues': { paint: 'aurora' }, 'paint.amp': { paint: 'waves' },
  // glow: `cycle` times the chromaCycle preset (core/layers/glow.js:262); `intensity` and `color2` are
  // read by liveColor (:205, :208), which returns the theme's accent glow before either when the layer
  // states no `color` of its own, and `color2` on top of that only when --glow-c is keyed.
  'glow.cycle': { preset: 'chromaCycle' },
  'glow.intensity': { color: '#2563eb' },
  'glow.color2': { color: '#2563eb', vars: { '--glow-c': [0, 1] }, varsDur: 0.8 },
  // doc: `blockGap` is the margin on a HEADING block (core/layers/doc.js:17); a code block has none.
  'doc.blockGap': { blocks: [{ h: 'Heading' }, { code: 'const a = 1' }] },
};

// The `globe` three scene reads a dozen dials off the layer (core/three-fx.js:372, :417) and has no
// core/knobs.js manifest entry at all, which core/validate.mjs treats as "nothing to say about this
// preset" rather than "no dials". Naming it once here is what stops all twelve reporting dead against
// a preset that never heard of them.
const THREE_PRESET = {
  origin: 'globe', dest: 'globe', arcHeight: 'globe', drawStart: 'globe', drawDur: 'globe',
  spinFrom: 'globe', spinTo: 'globe', spinDur: 'globe', sunFrom: 'globe', sunTo: 'globe',
  sunLat: 'globe', dawnWidth: 'globe',
  device: 'deviceShowcase', screen: 'deviceShowcase', fov: 'deviceShowcase', settle: 'deviceShowcase',
};

// EVERY PRESET THAT CLAIMS THE DIAL, not the first one, and that is the whole acceptance test. Five
// three scenes read `metalness`; the one that ignored it was `deviceShowcase`. A prober that asked one
// preset per prop would have asked `shatter`, seen a live read, and passed over the exact bug it was
// built for.
function presetsFor(prop) {
  if (THREE_PRESET[prop]) return [THREE_PRESET[prop]];
  const claim = Object.entries(KNOBS.three || {})
    .filter(([preset, list]) => preset !== '_shared' && list.some((k) => k.name === prop))
    .map(([preset]) => preset)
    .filter((p) => p !== 'extrudeText');   // its typeface cannot be authored, see SKIP
  return claim.length ? claim : [null];
}

// Props that are two spellings of one thing: core/validate.mjs refuses both at once. Probing either
// means dropping the other out of the base layer.
const EXCLUSIVE = [['html', 'src']];

function probeLayer(type, prop, preset) {
  const L = { type, ...BASE[type], start: 0.5, duration: 4 };
  for (const pair of EXCLUSIVE) if (pair.includes(prop)) for (const k of pair) if (k !== prop) delete L[k];
  // The three code* scenes derive their whole layout from the snippet and refuse to build without it
  // (core/three-fx.js:179), so it is part of a minimal valid layer for those three presets.
  // litPlane is the same shape for a different input: it textures a real capture and refuses to render an
  // undecoded one (core/surfaces/three-fx.js textureFrom), so without a real image every dial it reads
  // would report dead for the wrong reason. A TRACKED capture, because assets/brands/** is gitignored and
  // this probe also runs in worktrees and CI.
  if (preset) {
    L.three = preset;
    if (preset.startsWith('code')) L.lines = VALUES.lines;
    if (preset === 'litPlane') L.screen = '/assets/brands/ditherkit/sections/05-line.png';
  }
  Object.assign(L, AS[`${type}.${prop}`] || {});
  for (const g of guardsOf(declOf(type, prop))) if (L[g] === undefined) L[g] = valueFor(g, type);
  L[prop] = valueFor(prop, type);
  return L;
}

// One probe = one question: is THIS prop read on THIS layer. `three` asks once per preset that claims
// the dial; every other type asks once.
function probesOf(type) {
  return surfaceOf(type).flatMap((prop) => (type === 'three' ? presetsFor(prop) : [null])
    .map((preset) => ({ prop, at: preset, layer: probeLayer(type, prop, preset) })));
}

// ---------------------------------------------------------------------------------------------
// EXPORTED so lib-test can assert the two things a table of results cannot show: that a guarded prop
// is probed with its guard SET, and that the three probes cover every preset claiming a dial. Run only
// when this file is the entry point, so importing it costs a browser nothing.
export { probesOf, surfaceOf };
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {

const puppeteer = (await import('puppeteer')).default;
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const types = only.length ? only : LAYER_TYPES;
// out/.tmp_* is gitignored: the probe scenes are a build artefact, not films.
const OUT = path.join(ROOT, 'out/.tmp_prop-probe');
fs.mkdirSync(OUT, { recursive: true });

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

const findings = [];   // { type, prop }
const errors = [];     // { type, error }   a real engine error: this type is BROKEN
const unchecked = [];  // { type, props }   the page never answered in time: this type is UNKNOWN

// TWELVE LAYERS PER SCENE, and the number is load-bearing. A `three` or `globe` layer owns a WebGL
// context and a browser hands out about sixteen; forty-six in one page fails inside three.js with a
// shader error that says nothing about the cause. A page of image layers hits the softer version of
// the same wall: boot draws frame 0 itself and a stack of large undecoded pictures is not ready.
const PER_SCENE = 12;

for (const type of types) {
  if (!BASE[type]) { errors.push({ type, error: 'no BASE layer declared in prop-probe.mjs' }); continue; }
  const all = probesOf(type);
  for (let c = 0; c * PER_SCENE < all.length; c++) {
  const batch = all.slice(c * PER_SCENE, (c + 1) * PER_SCENE);
  const props = batch.map((b) => b.prop);
  const layers = batch.map((b) => b.layer);
  const file = path.join(OUT, `${type}-${c}.json`);
  // `produced: false` because a PROBE IS NOT A FILM. The produced baseline injects a camera, scene
  // units and (since the inferred-cut default) a cut into any film that declares none, and these
  // fixtures declare none by construction: they are one layer per prop on a plain field. An injected
  // `fade` cut puts an `opacity` on the wrapper every layer sits inside, which is exactly what a prop
  // that reads the pixels BEHIND it (`glass`, `progressiveBlur`) cannot survive, so every such prop
  // reported itself dead. The opt-out is the engine's own (core/engine/produce.js), and it is the right
  // one here: this gate asks "does the engine read this prop", not "does this scene look directed".
  fs.writeFileSync(file, JSON.stringify({ module: 'scene', produced: false, theme: 'default', duration: 4, bg: [{ preset: 'plain' }], layers }, null, 1));

  // A TIMEOUT IS A STATEMENT ABOUT THIS MACHINE, NOT ABOUT THE LAYER, and this gate used to conflate
  // the two. `waitForEngine` returns the literal string 'timeout' when the page does not park
  // __engineReady in time, and that was pushed into `errors` beside a real __engineError, so a loaded
  // machine produced `✗ probe-boot-error` and blocked the push. Measured back to back on an idle
  // machine: one run failed on `composition` with 'timeout', the next passed clean, and an earlier
  // pair failed on `three` and then passed. The failing type moved every time, which is the signature
  // of load rather than of a defect.
  //
  // So: boot is retried ONCE on a timeout, in a fresh page. A second timeout is reported as a type
  // that was NOT CHECKED (a warning naming the machine), never as a type that failed. The safety
  // property is unchanged, because an unchecked type is still reported and never silently passed:
  // the same shape seam-snap's requireTool uses when ffmpeg is missing, and what SAFEGUARDS.md means
  // by refusing only for determinism and a construction bug.
  const url = `http://127.0.0.1:${port}/films/scene/scene.html`
    + `?data=${encodeURIComponent(`/out/.tmp_prop-probe/${type}-${c}.json`)}&fps=30`;
  let page = null;
  let err = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (page) await page.close();
    page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { window.__PROP_PROBE = []; });
    await page.goto(url, { waitUntil: 'load' });
    err = await waitForEngine(page, { throwOnTimeout: false });
    if (err !== 'timeout') break;   // a real engine error is answered on the first try; only load is retried
  }
  if (err === 'timeout') { unchecked.push({ type, props: props.join(' ') }); await page.close(); continue; }
  if (err) { errors.push({ type, error: `${props.join(' ')}\n    ${String(err).slice(0, 400)}` }); await page.close(); continue; }

  // A frame can throw from inside a primitive (a dial the probe gave a shape the fx cannot draw), and
  // that is a chunk that was not checked, not a crash of the run.
  let dead;
  try {
  dead = await page.evaluate(async (names) => {
    const engine = window.__engine;
    // A resample samples the layer's own <img>, so an undecoded picture is "no pixels" and throws.
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    // Five ascending frames in one tab, not three: a caret BLINKS, so `caretHold` is only reached on the
    // frames where the blink is on, and three samples all landed in the off phase.
    for (const n of [0, 15, 25, 35, 50, 70, 90]) engine.renderFrame(n);
    const { deadProps } = await import('/core/registry/prop-audit.js');
    const out = [];
    const sink = window.__PROP_PROBE;
    for (let i = 0; i < names.length; i++) {
      const e = sink[i];
      if (!e) { out.push(i); continue; }              // never audited: report it, do not assume it passed
      if (deadProps(e.layer, new Set([names[i]])).length) out.push(i);
    }
    return out;
  }, props);
  } catch (e) {
    errors.push({ type, error: `${props.join(' ')}\n    ${String(e.message || e).slice(0, 400)}` });
    await page.close();
    continue;
  }
  await page.close();
  for (const i of dead) findings.push({ type, prop: batch[i].prop, at: batch[i].at });
  }
}

await browser.close();
server.close();

// ---------------------------------------------------------------------------------------------
// TWO VERDICTS, because a dead prop means two different things depending on who declared it.
//
// A prop the TYPE declares and this type never reads is a death: the declaration is the type's own
// promise, and nothing kept it. That is where `metalness` lived.
//
// A prop the KIT declares (`bg`, `pad`, `prefix` …) is advertised on every layer and read by some
// types and not others: `prefix` is alive on `count` and meaningless on `text`. Reporting that per
// type would print several hundred lines of "not every type uses every shared prop", which is not a
// finding, and is already refused at author time by core/prop-audit.js the moment somebody writes it.
// The only shared-prop death this can add is a prop NO type reads, so that is what it looks for, and
// only on a full run: a subset cannot know what the types it skipped read.
const ownDead = findings.filter((f) => (LAYER_PROPS[f.type] || {})[f.prop] !== undefined);
const kitDead = [];
if (!only.length) {
  const checked = types.filter((t) => !errors.some((e) => e.type === t));
  // A name a TYPE declares for itself is that type's business and is out of the shared question
  // entirely: `prefix` is count's, so the fact that the other 22 types ignore it says nothing.
  const owned = new Set(LAYER_TYPES.flatMap((t) => Object.keys(LAYER_PROPS[t] || {})));
  const shared = [...new Set(findings.map((f) => f.prop))]
    .filter((p) => SHARED_PROPS[p] !== undefined && !owned.has(p));
  for (const p of shared) {
    const scoped = checked.filter((t) => auditedProps(t).has(p));
    if (scoped.length && scoped.every((t) => findings.some((f) => f.type === t && f.prop === p)))
      kitDead.push({ type: '(every type)', prop: p });
  }
}

// A waiver may name the preset (`three.metalness@shatter`) or the prop for every preset.
const waiverOf = (f) => WAIVERS[`${f.type}.${f.prop}${f.at ? `@${f.at}` : ''}`] || WAIVERS[`${f.type}.${f.prop}`];
const label = (f) => f.prop + (f.at ? `@${f.at}` : '');
const all = [...ownDead, ...kitDead];
const live = all.filter((f) => !waiverOf(f));
const waived = all.filter((f) => waiverOf(f));

const findingsOut = gateFindings();
console.log(`PROP PROBE · ${types.length} types · ${all.length} dead · ${waived.length} waived`);
const byType = new Map();
for (const f of live) byType.set(f.type, [...(byType.get(f.type) || []), label(f)]);
for (const [t, ps] of [...byType].sort()) console.log(`  ${t.padEnd(13)} ${ps.join(', ')}`);
for (const f of live) findingsOut.fail('dead-prop', `${f.type}: ${label(f)} set and never read`, {
  at: `${f.type}.${f.prop}${f.at ? `@${f.at}` : ''}`,
  fix: 'fix the reader, delete the declaration, or waive it with a reason in WAIVERS (quality/gates/prop-probe.mjs)',
});
for (const e of errors) console.log(`  ! ${e.type}: ${e.error}`);
for (const e of errors) findingsOut.fail('probe-boot-error', `${e.type}: ${e.error}`, {
  at: e.type,
  fix: 'the probe scene did not boot for this type: fix the base layer or the probe value, this type was NOT checked',
});
if (errors.length) console.log('\nA type whose probe scene did not boot was NOT checked. Fix the base layer or the value.');
// Reported, never silent, and never blocking: this run simply does not know about these types.
for (const u of unchecked) {
  console.log(`  ? ${u.type}: the probe page did not boot within the timeout, twice. NOT checked on this run.`);
  findingsOut.warn('probe-boot-timeout', `${u.type}: the probe page did not boot in time on two attempts, so this type was NOT checked`, {
    at: u.type,
    fix: 're-run `make check GATE=prop-probe` on a quieter machine; this says nothing about the layer, only that the page did not answer',
  });
}
if (unchecked.length) console.log(`\n${unchecked.length} type(s) went unchecked because the page did not boot in time. That is a fact about this machine, not about the engine.`);
if (live.length) {
  console.log(`\n${live.length} prop${live.length === 1 ? '' : 's'} set and never read. Each one is a value the`
    + ` engine accepts and ignores: fix the reader, delete the declaration, or waive it with a reason`
    + ` in WAIVERS (quality/gates/prop-probe.mjs).`);
}
findingsOut.emit();
process.exit(findingsOut.records.some((r) => r.severity === 'error') ? 1 : 0);

}   // isMain
