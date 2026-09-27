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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { SHARED_PROPS } from '../../core/layers/vocabulary.js';
import { auditedProps } from '../../core/registry/prop-audit.js';
import { KNOBS } from '../../core/registry/knobs.js';
import { guardsOf } from '../../core/registry/props.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { resolveAnchorPoint } from '../../core/layout/safe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// out/.tmp_* is gitignored: the probe scenes are a build artefact, not films.
const OUT = path.join(ROOT, 'out/.tmp_prop-probe');

// VISIBILITY FLOOR: does this prop's own effect clear the noise floor, not just get READ.
// `deadProps` (above) answers "read or not"; it counts idle:drift's ~0.09/255 mean frame diff as
// alive because it never looks at a pixel. 0.6/255 is harness/media/see.mjs's own HOLD_FLOOR, the
// mean |diff| (YAVG of ffmpeg's tblend=difference,signalstats) under which nothing reads as moving
// on a real render; reused here, not re-derived, so the two tools cannot silently disagree on what
// "changed" means.
const VISIBILITY_FLOOR = 0.6;
// A 4x3 grid of non-overlapping slots on a 1920x1080 canvas, one per probe layer in a batch, so a
// with/without pixel diff for ONE prop never picks up a neighbour's own change. `board`/`doc` (900px/
// 700px wide BASE layers) can spill past their own 480px cell into the next; that dilutes their own
// crop with a few pixels of an unrelated, UNCHANGED neighbour (which contributes zero to a diff, since
// it is identical in both variants), never contaminates another prop's verdict.
const GRID_COLS = 4;
const CANVAS_W = 1920, CANVAS_H = 1080;
const CELL_W = CANVAS_W / GRID_COLS, CELL_H = CANVAS_H / Math.ceil(12 / GRID_COLS);
const gridOffset = (i) => ({ ox: (i % GRID_COLS) * CELL_W, oy: Math.floor(i / GRID_COLS) * CELL_H });

const FRAMES = [0, 15, 25, 35, 50, 70, 90];
const FPS = 30;
const FLOOR_FRAME = 50;   // 1.67s: past every default `start` (0.5s) and every default motion hold
const frameAtOrAfter = (tSec) => {
  const target = Math.round(tSec * FPS);
  return FRAMES.find((f) => f >= target) ?? FRAMES[FRAMES.length - 1];
};
const frameBefore = (tSec) => {
  const target = Math.round(tSec * FPS);
  return [...FRAMES].reverse().find((f) => f < target) ?? null;
};

// One ffmpeg process, two crops, one blend=difference: the same "how much did this change" question
// harness/media/see.mjs asks of two video frames, asked here of two PNGs (a prop present, a prop
// absent). Returns the mean |diff| on 0..255 (YAVG), or null if the crop could not be read (an
// out-of-canvas box, an ffmpeg failure): a null is reported as unchecked, never as a pass.
function pngDiffMean(a, b, box, metaFile) {
  const x = Math.max(0, Math.round(box.x)), y = Math.max(0, Math.round(box.y));
  const w = Math.max(2, Math.min(Math.round(box.w), CANVAS_W - x));
  const h = Math.max(2, Math.min(Math.round(box.h), CANVAS_H - y));
  const crop = `crop=${w}:${h}:${x}:${y}`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', a, '-i', b, '-filter_complex',
    `[0:v]${crop}[a];[1:v]${crop}[b];[a][b]blend=all_mode=difference,signalstats,metadata=mode=print:file=${metaFile}`,
    '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(metaFile)) return null;
  const m = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(fs.readFileSync(metaFile, 'utf8'));
  fs.rmSync(metaFile, { force: true });
  return m ? +m[1] : null;
}

// Same question, asked OUTSIDE every declared layer box at once (blacked out on both sides first):
// did toggling this batch's props leak pixels anywhere but their own boxes. Attributed to the whole
// batch, not one prop, because every layer in it changed between the two images: see the note beside
// its call site.
function maskedDiffMean(a, b, boxes, metaFile) {
  if (!boxes.length) return null;
  const draw = boxes.map(({ x, y, w, h }) => `drawbox=x=${Math.round(x)}:y=${Math.round(y)}:`
    + `w=${Math.round(w)}:h=${Math.round(h)}:color=black:t=fill`).join(',');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', a, '-i', b, '-filter_complex',
    `[0:v]${draw}[a];[1:v]${draw}[b];[a][b]blend=all_mode=difference,signalstats,metadata=mode=print:file=${metaFile}`,
    '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(metaFile)) return null;
  const m = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(fs.readFileSync(metaFile, 'utf8'));
  fs.rmSync(metaFile, { force: true });
  return m ? +m[1] : null;
}

// WHERE/WHEN: a prop that moves or times a layer is checked against the JSON, not just against
// itself. `motion`'s `x` is an OFFSET added to `L.x` (films/scene/scene.js resolveBoxes: `x = (L.x ??
// 60) + (m ? m.dx : 0) + p.dx`), and a keyframe's `t` is SECONDS since the layer's own start (
// core/timeline/sequence.js poseAt compares it to `lt` directly, never a 0..1 fraction); both read
// off that one function, not re-derived here, so this check cannot drift from what actually renders.
function checkXY(prop, L, boxesByFrame, push) {
  const [fx, fy] = resolveAnchorPoint(L.anchorPoint ?? null);
  const w = typeof L.w === 'number' ? L.w : 0;
  const h = typeof L.h === 'number' ? L.h : 0;
  const f = FRAMES.find((fr) => boxesByFrame[fr] && boxesByFrame[fr].visible);
  if (f == null) { push('never visible in any sampled frame; position not checked', null, null); return; }
  const box = boxesByFrame[f];
  const expLeft = L.x - fx * w, expTop = L.y - fy * h;
  if (Math.abs(box.left - expLeft) > 2) push(`left at frame ${f}`, expLeft, box.left);
  if (Math.abs(box.top - expTop) > 2) push(`top at frame ${f}`, expTop, box.top);
}

function checkTiming(L, boxesByFrame, push) {
  // Both edges, always: testing `duration` alone still opens at `start` (frame0 is invisible for that
  // reason, nothing to do with the prop under test), and testing `start` alone still closes at
  // `start + duration`. Asserting only the edge named by the prop under test read frame 0 as a
  // `duration` failure when it was really just "before start" (caught empirically: text.duration).
  const sf = Math.round((L.start ?? 0) * FPS);
  const ef = Math.round(((L.start ?? 0) + (L.duration ?? 0)) * FPS);
  for (const fr of FRAMES) {
    if (Math.abs(fr - sf) < 2 || Math.abs(fr - ef) < 2) continue;   // ambiguous within a frame of either edge
    const box = boxesByFrame[fr];
    const visible = !!(box && box.visible);
    const shouldBeVisible = fr > sf && fr < ef;
    if (visible !== shouldBeVisible) push(`visible at frame ${fr}`, shouldBeVisible, visible);
  }
}

function checkMotion(L, boxesByFrame, push) {
  if (!Array.isArray(L.motion) || L.motion.length < 2) return;
  const [fx] = resolveAnchorPoint(L.anchorPoint ?? null);
  const w = typeof L.w === 'number' ? L.w : 0;
  const k0 = L.motion[0], k1 = L.motion[L.motion.length - 1];
  const startBox = boxesByFrame[frameAtOrAfter((L.start ?? 0) + (k0.t ?? 0))];
  const endBox = boxesByFrame[frameAtOrAfter((L.start ?? 0) + (k1.t ?? 0))];
  if (startBox && typeof k0.x === 'number') {
    const exp = L.x + k0.x - fx * w;
    if (Math.abs(startBox.left - exp) > 2) push('left at motion start key', exp, startBox.left);
  }
  if (endBox && typeof k1.x === 'number') {
    const exp = L.x + k1.x - fx * w;
    if (Math.abs(endBox.left - exp) > 2) push('left at motion end key (or held there)', exp, endBox.left);
  }
}

function assertPosition(type, prop, at, L, boxesByFrame, mismatches) {
  const push = (msg, expected, got) => mismatches.push({ type, prop, at, msg, expected, got });
  if (prop === 'x' || prop === 'y' || prop === 'anchorPoint') checkXY(prop, L, boxesByFrame, push);
  else if (prop === 'start' || prop === 'duration') checkTiming(L, boxesByFrame, push);
  else if (prop === 'motion') checkMotion(L, boxesByFrame, push);
}
const MOVE_PROPS = new Set(['x', 'y', 'anchorPoint', 'start', 'duration', 'motion']);
void frameBefore;   // read by nothing yet; kept for a future before/after pair on a boundary prop

// `cursor` is the one type films/scene/scene.js documents as NOT reading x/y/motion like every other
// layer: its own comment says its on-screen point comes from `path` inside its own frame(), so testing
// x/y/motion against it is not a mismatch, it is asking the wrong question of a documented exception.
// `start`/`duration` still gate its visibility the same as any layer, so those two stay checked.
const NO_XY_MOTION = new Set(['cursor']);

function applyPositionChecks(type, batch, layers, ids, boxesById, mismatches) {
  for (let i = 0; i < batch.length; i++) {
    const prop = batch[i].prop;
    if (!MOVE_PROPS.has(prop)) continue;
    if (NO_XY_MOTION.has(type) && prop !== 'start' && prop !== 'duration') continue;
    assertPosition(type, prop, batch[i].at, layers[i], boxesById[ids[i]], mismatches);
  }
}

// One layer's own box at the frame the floor/leak screenshots were taken, or the first frame it was
// visible at all: a prop that only shows up briefly (a caret blink, a `start` near the sample grid)
// still gets a crop to measure, instead of being silently skipped because FLOOR_FRAME missed it.
function boxForCrop(boxesForId) {
  return boxesForId[FLOOR_FRAME] || FRAMES.map((f) => boxesForId[f]).find(Boolean);
}

// VISIBILITY FLOOR + LOCALITY: one screenshot of this batch WITH every prop, one of the same batch with
// each layer's own target prop removed, cropped per layer for the floor and masked whole-frame for the
// leak check. A boot failure on the off-variant (a prop that turns out to be load-bearing to build at
// all, e.g. `text` on a text layer) is reported as unchecked, not folded into "dead": this gate is
// answering "does removing it move a pixel", and it never got to ask that question.
async function captureVisibility(browser, page, ctx, sinks) {
  const { url, type, c, batch, ids, boxesById, requiredIdx } = ctx;
  const onPng = path.join(OUT, `${type}-${c}.on.png`);
  const offPng = path.join(OUT, `${type}-${c}.off.png`);
  await page.evaluate((n) => window.__engine.renderFrame(n), FLOOR_FRAME);
  await page.screenshot({ path: onPng });
  await page.close();

  const offUrl = url.replace(`${type}-${c}.json`, `${type}-${c}.off.json`);
  const offErr = await bootAndShoot(browser, offUrl, offPng);
  if (offErr) { sinks.visSkipped.push({ type, props: batch.map((b) => b.prop).join(' '), reason: offErr }); return; }

  const cropBoxes = [];
  for (let i = 0; i < batch.length; i++) {
    // schema.json#layerContracts named this one REQUIRED: nothing was removed to build its "without",
    // so a pixel diff here would report 0 and read as near-dead when it is the opposite, load-bearing.
    // Reported per-prop, never folded into the batch failure the same field would otherwise cause.
    if (requiredIdx && requiredIdx.has(i)) {
      sinks.visSkipped.push({ type, props: batch[i].prop,
        reason: 'required to build the layer at all (schema.json#layerContracts); no "without" variant exists to diff against' });
      continue;
    }
    const b = boxForCrop(boxesById[ids[i]]);
    if (!b) continue;   // never visible at any sampled frame: nothing to crop, nothing to claim
    cropBoxes.push({ x: b.left, y: b.top, w: b.width, h: b.height });
    const meta = path.join(OUT, `${type}-${c}-${i}.meta.txt`);
    const meanDiff = pngDiffMean(onPng, offPng, { x: b.left, y: b.top, w: b.width, h: b.height }, meta);
    if (meanDiff != null && meanDiff < VISIBILITY_FLOOR)
      sinks.nearDead.push({ type, prop: batch[i].prop, at: batch[i].at, meanDiff });
  }
  const leak = maskedDiffMean(onPng, offPng, cropBoxes, path.join(OUT, `${type}-${c}-leak.meta.txt`));
  if (leak != null && leak >= VISIBILITY_FLOOR) sinks.leaks.push({ type, c, meanDiff: leak });
}

async function bootAndShoot(browser, url, outPng) {
  let offPage = null;
  try {
    offPage = await browser.newPage();
    await offPage.setViewport({ width: CANVAS_W, height: CANVAS_H });
    // Same suppression the "on" page gets (core/registry/prop-audit.js auditLayer): stripping one
    // guarded prop can leave another, unrelated field of the SAME layer unread (a coupling this file
    // does not model), and that must not crash a batch's floor check the way it would a real render.
    await offPage.evaluateOnNewDocument(() => { window.__PROP_PROBE = []; });
    await offPage.goto(url, { waitUntil: 'load' });
    const err = await waitForEngine(offPage, { throwOnTimeout: false });
    if (err) return String(err).slice(0, 300);
    await offPage.evaluate((n) => window.__engine.renderFrame(n), FLOOR_FRAME);
    await offPage.screenshot({ path: outPng });
    return null;
  } catch (e) {
    return String(e.message || e).slice(0, 300);
  } finally {
    if (offPage) await offPage.close();
  }
}

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
  // A visible fill by default: the dead-prop check never needed one (it only asks "was this read"),
  // but the visibility floor asks "did this move a pixel", and a transparent box has no pixel for
  // `opacity`/`radius`/`shadow`/`reflect`/`progressiveBlur`/`mask` to modulate, near-dead by
  // construction rather than by measurement. `bg` itself still overrides this when IT is the target.
  rect: { w: 200, h: 40, bg: '#2563eb' },
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

// THE OWNER OF "must this field stay". schema.json#layerContracts names every field a layer type
// refuses to build without (`required`), a field where at least one of a pair must survive
// (`requiredOneOf`), and a field whose removal strands another (`coupled`), each one read off the
// real throw (see the block's own `_source`). A prop named here is never deleted alone when this
// file builds the "without" variant, so removing it cannot break the eleven OTHER probes sharing its
// batch's off-scene (one page, one boot, one bad layer refuses all twelve).
const CONTRACTS = SCHEMA.layerContracts || {};
const REQUIRED = CONTRACTS.required || {};
const REQUIRED_ONE_OF = CONTRACTS.requiredOneOf || {};
const COUPLED = CONTRACTS.coupled || {};
const REQUIRED_FOR_PRESET = CONTRACTS.requiredForPreset || {};
// `preset` is `three`'s own `at` (the scene name this probe was asked against): `lines` is required
// only on the two code* scenes that lay it out, never on the nine that never read it.
const isRequired = (type, prop, preset) => (REQUIRED[type] || []).includes(prop)
  || (REQUIRED_ONE_OF[type] || []).includes(prop)
  || (preset != null && (REQUIRED_FOR_PRESET[type]?.[preset] || []).includes(prop));

// Delete a dotted path (`vars.--glow-c`) off a plain object, the shape a coupling needs when the
// stranded field lives inside another prop's own object rather than beside it.
function deletePath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) { cur = cur?.[parts[i]]; if (cur == null) return; }
  delete cur[parts[parts.length - 1]];
}

// Names whose generic value would throw or be ignored, one line each. A `type.prop` key wins over a
// bare name: `out` is an exit-animation NAME everywhere and a source out-point in SECONDS on `video`,
// one spelling for two things, and a string there renders `currentTime = NaN`.
const VALUES = {
  clock: { duration: 1 },
  src: '/assets/icons/anthropic.svg',
  'video.in': 0,
  'video.out': 3,
  ease: 'linear',
  // `d` needs a real, non-degenerate SVG path (at least two distinct points): core/validate/svg.mjs
  // now refuses a zero-length `d`, and the generic string probe ('probe') is exactly that.
  d: 'M0 0 L1 1',
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
  // group: `gridCols` is read only inside layoutGroupGrid (core/layers/util.js:528), one of three
  // branches layoutGroup picks by `layout`. The guard is only presence of `layout`, satisfied by
  // 'row' (the schema enum's first entry, valueFor's default), which runs layoutGroupFlex instead
  // and never reaches gridCols. Same class as beam's `mode: 'shine'` above: point the guard at the
  // one value that actually reads the dial.
  'group.gridCols': { layout: 'grid' },
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
  // rect.js: `const paint = bg ?? fill ?? color;`. BASE.rect's own default `bg` (added so a bare rect
  // has a visible fill for the visibility floor) would otherwise shadow `fill`/`color` forever: the
  // fallback chain never reaches past `bg`, so testing either would always read as near-dead by
  // construction, exactly the false positive this file exists to avoid producing.
  if (type === 'rect' && (prop === 'fill' || prop === 'color')) delete L.bg;
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

const RUN_STARTED = Date.now();
const puppeteer = (await import('puppeteer')).default;
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const types = only.length ? only : LAYER_TYPES;
fs.mkdirSync(OUT, { recursive: true });

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

const findings = [];   // { type, prop }
const errors = [];     // { type, error }   a real engine error: this type is BROKEN
const unchecked = [];  // { type, props }   the page never answered in time: this type is UNKNOWN
const nearDead = [];   // { type, prop, at, meanDiff }   read, but under the visibility floor
const visSkipped = []; // { type, props, reason }        the off-variant could not be built or read
const mismatches = []; // { type, prop, at, msg, expected, got }   box disagrees with the JSON
const leaks = [];      // { type, c, meanDiff }   a batch's own props moved a pixel outside every declared box

// TWELVE LAYERS PER SCENE, and the number is load-bearing. A `three` or `globe` layer owns a WebGL
// context and a browser hands out about sixteen; forty-six in one page fails inside three.js with a
// shader error that says nothing about the cause. A page of image layers hits the softer version of
// the same wall: boot draws frame 0 itself and a stack of large undecoded pictures is not ready.
const PER_SCENE = 12;

for (const type of types) {
  if (!BASE[type]) { errors.push({ type, error: 'no BASE layer declared in prop-probe.mjs' }); continue; }
  const all = probesOf(type);
  // x/y/anchorPoint/start/duration/motion are read off the raw layer by buildLayer itself
  // (films/scene/scene.js), never through the watched-proxy `auditedProps` scopes, so `surfaceOf`
  // never surfaces them and the dead-prop check has no opinion on them (correctly: they can never be
  // dead). WHERE/WHEN still needs them on a layer to measure against, so they are added here, once per
  // type, skipped if the type's own surface already carries the name (LAYER_PROPS-declared, so already
  // in `all`; the position check would otherwise ask about it twice on two different layers).
  const already = new Set(all.map((p) => p.prop));
  for (const prop of MOVE_PROPS) if (!already.has(prop)) all.push({ prop, at: null, layer: probeLayer(type, prop, null) });
  for (let c = 0; c * PER_SCENE < all.length; c++) {
  const batch = all.slice(c * PER_SCENE, (c + 1) * PER_SCENE);
  const props = batch.map((b) => b.prop);
  const layers = batch.map((b) => b.layer);
  // A unique id and a grid slot per layer, so a with/without screenshot pair can be cropped to THIS
  // prop's own box alone: x/y are universal (films/scene/scene.js buildLayer: `el.style.left = L.x ??
  // 60`), so adding a slot offset to whatever x/y the probe already gave the layer works for every
  // type without knowing its shape, and does not change what is being asked (is this prop read).
  layers.forEach((L, i) => {
    L.id = `p${c}_${i}`;
    const { ox, oy } = gridOffset(i);
    L.x = ox + (typeof L.x === 'number' ? L.x : 0);
    L.y = oy + (typeof L.y === 'number' ? L.y : 0);
  });
  // Deleting the target prop can strand a guard that was injected ONLY to reach it (`colw` needs
  // `layout` set; remove `colw` and a bare `layout` is itself unread, refused at boot as ANOTHER dead
  // prop that has nothing to do with the one under test). Guards already part of BASE (a real preset
  // selector like `three`) are left alone: `g in BASE[type]` is true for those, never for a guard this
  // file injected only for the probe.
  //
  // A prop schema.json#layerContracts names REQUIRED (or half of a requiredOneOf pair) is never
  // deleted at all: the layer would refuse to build with it gone, and one refused layer takes the
  // whole batch's off-scene down with it (twelve layers, one page, one boot). That layer's own
  // "without" is therefore identical to its "with", reported per-prop in `requiredIdx` below rather
  // than measured, so its eleven neighbours still get a real number. A COUPLED pair is the opposite
  // shape: removing one strands the other (`color2` gone, `vars['--glow-c']` still keyed), so both go.
  const requiredIdx = new Set();
  const offLayers = layers.map((L, i) => {
    const o = structuredClone(L);
    const targetProp = batch[i].prop;
    if (isRequired(type, targetProp, batch[i].at)) { requiredIdx.add(i); return o; }
    delete o[targetProp];
    for (const g of guardsOf(declOf(type, targetProp))) if (!(g in (BASE[type] || {}))) delete o[g];
    for (const [a, b] of COUPLED[type] || []) {
      if (a === targetProp) deletePath(o, b);
      else if (b === targetProp) deletePath(o, a);
    }
    return o;
  });
  const file = path.join(OUT, `${type}-${c}.json`);
  const offFile = path.join(OUT, `${type}-${c}.off.json`);
  // `produced: false` because a PROBE IS NOT A FILM. The produced baseline injects a camera, scene
  // units and (since the inferred-cut default) a cut into any film that declares none, and these
  // fixtures declare none by construction: they are one layer per prop on a plain field. An injected
  // `fade` cut puts an `opacity` on the wrapper every layer sits inside, which is exactly what a prop
  // that reads the pixels BEHIND it (`glass`, `progressiveBlur`) cannot survive, so every such prop
  // reported itself dead. The opt-out is the engine's own (core/engine/produce.js), and it is the right
  // one here: this gate asks "does the engine read this prop", not "does this scene look directed".
  // It STAYS required for that reason alone: pulled, the two paths (produced vs not) read pixels
  // differently for exactly the props this file exists to check, which would be the audit lying to
  // itself about what it measured.
  const wrap = (ls) => ({ module: 'scene', produced: false, theme: 'default', aspect: '16:9', duration: 4, bg: [{ preset: 'plain' }], layers: ls });
  fs.writeFileSync(file, JSON.stringify(wrap(layers), null, 1));
  fs.writeFileSync(offFile, JSON.stringify(wrap(offLayers), null, 1));

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
    // Full canvas viewport, not puppeteer's 800x600 default: a screenshot narrower than the grid this
    // batch is laid out on would crop `col >= 2` clean off, and every prop in those columns would crop
    // to background and read as dead by construction, not by measurement.
    await page.setViewport({ width: CANVAS_W, height: CANVAS_H });
    await page.evaluateOnNewDocument(() => { window.__PROP_PROBE = []; });
    await page.goto(url, { waitUntil: 'load' });
    err = await waitForEngine(page, { throwOnTimeout: false });
    if (err !== 'timeout') break;   // a real engine error is answered on the first try; only load is retried
  }
  if (err === 'timeout') { unchecked.push({ type, props: props.join(' ') }); await page.close(); continue; }
  if (err) { errors.push({ type, error: `${props.join(' ')}\n    ${String(err).slice(0, 400)}` }); await page.close(); continue; }

  // A frame can throw from inside a primitive (a dial the probe gave a shape the fx cannot draw), and
  // that is a chunk that was not checked, not a crash of the run.
  let result;
  const ids = layers.map((L) => L.id);
  try {
  result = await page.evaluate(async (names, layerIds, frames) => {
    const engine = window.__engine;
    // A resample samples the layer's own <img>, so an undecoded picture is "no pixels" and throws.
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    const boxes = {};
    for (const id of layerIds) boxes[id] = {};
    // Five ascending frames in one tab, not three: a caret BLINKS, so `caretHold` is only reached on the
    // frames where the blink is on, and three samples all landed in the off phase. The SAME pass also
    // takes each layer's own box at each frame, so where/when checks cost nothing beyond what dead-prop
    // reading already pays for.
    for (const n of frames) {
      engine.renderFrame(n);
      for (const id of layerIds) {
        const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
        if (!el) { boxes[id][n] = null; continue; }
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        boxes[id][n] = { left: r.left, top: r.top, width: r.width, height: r.height,
          visible: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.01 };
      }
    }
    const { deadProps } = await import('/core/registry/prop-audit.js');
    const dead = [];
    const sink = window.__PROP_PROBE;
    for (let i = 0; i < names.length; i++) {
      const e = sink[i];
      if (!e) { dead.push(i); continue; }              // never audited: report it, do not assume it passed
      if (deadProps(e.layer, new Set([names[i]])).length) dead.push(i);
    }
    return { dead, boxes };
  }, props, ids, FRAMES);
  } catch (e) {
    errors.push({ type, error: `${props.join(' ')}\n    ${String(e.message || e).slice(0, 400)}` });
    await page.close();
    continue;
  }
  for (const i of result.dead) findings.push({ type, prop: batch[i].prop, at: batch[i].at });

  // WHERE/WHEN, off the same boxes: does the JSON's x/y/start/duration/motion agree with what rendered.
  applyPositionChecks(type, batch, layers, ids, result.boxes, mismatches);

  await captureVisibility(browser, page, { url, type, c, batch, ids, boxesById: result.boxes, requiredIdx },
    { nearDead, visSkipped, leaks });
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

// NEAR-DEAD: read, but its own on/off diff never clears the floor harness/media/see.mjs uses for "is
// anything moving". Reported as a warning, not folded into `dead`: the prop IS read (deadProps agrees),
// this only says a human would not see it.
console.log(`\nVISIBILITY · ${nearDead.length} near-dead (< ${VISIBILITY_FLOOR}/255) · `
  + `${mismatches.length} where/when mismatches · ${leaks.length} batches leaking outside their boxes · `
  + `${visSkipped.length} off-variants not checked`);
for (const f of nearDead) {
  console.log(`  ~ ${f.type}: ${label(f)} moved ${f.meanDiff.toFixed(3)}/255, under the ${VISIBILITY_FLOOR} floor`);
  findingsOut.warn('prop-near-dead', `${f.type}: ${label(f)} set, read, but ${f.meanDiff.toFixed(3)}/255 mean diff `
    + `(floor ${VISIBILITY_FLOOR}) with the prop removed: a human would not see it change`, {
    at: `${f.type}.${f.prop}${f.at ? `@${f.at}` : ''}`,
    fix: 'confirm the effect is meant to be this subtle, or the reader is computing the wrong thing',
  });
}
for (const m of mismatches) {
  console.log(`  x ${m.type}: ${m.prop} ${m.msg}: expected ${m.expected}, got ${m.got}`);
  findingsOut.warn('prop-position-mismatch', `${m.type}: ${m.prop} ${m.msg} (expected ${m.expected}, got ${m.got})`, {
    at: `${m.type}.${m.prop}`,
    fix: 'the rendered box disagrees with the JSON: check the layer builder or the layout math for this prop',
  });
}
for (const l of leaks) {
  console.log(`  ! ${l.type} batch ${l.c}: ${l.meanDiff.toFixed(3)}/255 changed outside every declared layer box`);
  findingsOut.warn('prop-leak', `${l.type} batch ${l.c}: ${l.meanDiff.toFixed(3)}/255 mean diff outside every `
    + `layer's own box when its props were removed (attributed to the batch, not one prop: see the comment `
    + `beside captureVisibility in quality/gates/prop-probe.mjs)`, { at: l.type,
    fix: 're-run this type alone (`node quality/gates/prop-probe.mjs ' + l.type + '`) to narrow the batch',
  });
}
for (const v of visSkipped) {
  console.log(`  ? ${v.type}: floor/leak not checked (${v.reason})`);
  findingsOut.warn('prop-visibility-not-checked', `${v.type}: ${v.props}: the off-variant did not build: ${v.reason}`, {
    at: v.type, fix: 'a required field was removed to build the off-variant; this is a coverage gap, not a defect',
  });
}
console.log(`\nRUNTIME · ${((Date.now() - RUN_STARTED) / 1000).toFixed(1)}s`);
findingsOut.emit();
process.exit(findingsOut.records.some((r) => r.severity === 'error') ? 1 : 0);

}   // isMain
