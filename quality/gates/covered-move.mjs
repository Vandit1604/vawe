// quality/gates/covered-move.mjs: IS AN AUTHORED MOVE COVERED BY THE NEXT BEAT BEFORE IT PLAYS?
//
// vawe-flow-2's terminal group (track 1) carried a real exit (x 0 -> -2400, opacity 1 -> 0 over
// 0.3s), and the next beat's full-frame `card-a` (track 1, drawn later in `layers[]`) started on the
// exit's first frame. `track` sets stacking (core/timeline/clips.js ~260 writes zIndex off
// data-track; films/scene/scene.js:597 sets data-track to `L.track ?? idx`), and layers on the same
// track tie, so array order breaks the tie: later in `layers[]` draws on top. card-a covered the
// terminal group's exit before a single frame of it painted, so the render looked like a hard cut and
// an agent misread the missing exit as an engine bug. It was an authoring collision, not a bug: the
// exit was fine, it was just never on top of anything while it ran.
//
// REPORT ONLY, NEVER A BLOCK. This gate cannot tell a deliberate hard cut over a moving layer from an
// accident: both look identical in the JSON. It names the collision and the fix; a person or a critic
// decides whether the cover was the point. Waive with {"authoring":{"allow":["covered-move"]}}.
//
// SCOPE: top-level `layers[]` only (root stacking context), because that is where `track`/array-order
// stacking is decided (scene.js:597 is called with the ARRAY the layer lives in; a group's children
// compete for stacking only among themselves, in their own group, not against their group's siblings).
// That is also exactly the shape of the vawe-flow-2 defect this gate was written to catch.
//
// VISIBILITY, NOT THE AUTHORED WINDOW. The first cut of this reported the whole authored move window
// as "covered" the moment B's start fell inside it, which fired on terminal-plane's real exit: by the
// time card-a started, terminal-plane had already translated to x -2390 and faded to opacity 0.004, so
// nothing visible was actually hidden. `motionAt` (the same function core/tracks/motion.js drives a
// frame from) is the one place that already knows a layer's pose at an arbitrary instant, so THIS reads
// A's real pose at the moment B starts covering it, rather than re-deriving "is it still there" from
// the endpoints. A finding fires only if A is still on screen at that instant (opacity >= 0.05 and its
// translated box still overlaps the canvas), and reports the VISIBLE remainder of the overlap, not the
// window as authored.
//
// HTML COVERAGE IS NOT DECIDED HERE. An `html` layer's real opacity/background is markup this gate does
// not read (the fragment can be, and in this repo's own films is, transparent on purpose so a ground
// rect shows through it). Guessing "may cover" from the type alone produced four false positives on
// vawe-flow-2's own `gnd-*` backdrop rects. Deciding an html layer's real coverage is a rendered-pixel
// question, seam-forensics.mjs's / probe-frame's job, not this JSON-only gate's: an html B is simply
// never reported as a coverer here.
//
//   node quality/gates/covered-move.mjs <scene.json>   ·   make covered-move D=<file>
import fs from 'node:fs';
import { loadScene } from '../../core/engine/expand.js';
import { resolveCoords } from '../../core/engine/boot.js';
import { sceneDims } from '../../core/layout/safe.js';
import { isFullBleedPlane } from '../../core/tracks/overscan.js';
import { motionAt } from '../../core/timeline/sequence.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node quality/gates/covered-move.mjs <scene.json>'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }
let raw;
try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`✗ ${file} is not valid JSON: ${e.message}`); process.exit(1); }
if (raw.module !== 'scene') { console.log(`  covered-move · ${file}: not a scene module, nothing to check.`); process.exit(0); }
const allow = new Set((raw.authoring && Array.isArray(raw.authoring.allow)) ? raw.authoring.allow : []);

const data = loadScene(structuredClone(raw));
const [W, H] = sceneDims(data, data.aspect);
const canvas = { w: W, h: H };
resolveCoords(data, W, H); // mutates x/y/w/h into resolved pixel numbers, in place, on `data`

const top = Array.isArray(data.layers) ? data.layers : [];

// the properties an authored MOVE window changes. Identity is the value motionAt/poseAt fall back to
// for a prop no keyframe names, so a keyframe silent on a prop is read as "unchanged", not "zero".
const IDENTITY = { x: 0, y: 0, z: 0, opacity: 1, rotX: 0, rotY: 0, scale: 1 };
const MOVE_PROPS = Object.keys(IDENTITY);
const EPS = 0.001;

// windows(L) -> [{ from, to }] in FILM time, one per adjacent authored keyframe pair that changes any
// move prop. `L.motion[].t` is local to the layer's own clock (core/timeline/sequence.js motionAt),
// so film time is L.start + t.
function windows(L) {
  const kfs = Array.isArray(L.motion) ? L.motion : null;
  if (!kfs || kfs.length < 2 || typeof L.start !== 'number') return [];
  const out = [];
  let cur = { ...IDENTITY };
  for (const p of MOVE_PROPS) if (typeof kfs[0][p] === 'number') cur[p] = kfs[0][p];
  for (let i = 1; i < kfs.length; i++) {
    const kf = kfs[i];
    if (typeof kf.t !== 'number') continue;
    const next = { ...cur };
    for (const p of MOVE_PROPS) if (typeof kf[p] === 'number') next[p] = kf[p];
    const changed = MOVE_PROPS.some((p) => Math.abs(next[p] - cur[p]) > EPS);
    if (changed && typeof kfs[i - 1].t === 'number') out.push({ from: L.start + kfs[i - 1].t, to: L.start + kf.t });
    cur = next;
  }
  return out;
}

// effTrack/tieBreak mirror films/scene/scene.js:597 exactly (`L.track ?? idx`) and the verified
// stacking fact: same track ties, array order breaks the tie, LATER draws on top.
const effTrack = (L, idx) => (typeof L.track === 'number' ? L.track : idx);
function drawnAbove(bIdx, aIdx) {
  const a = top[aIdx], b = top[bIdx];
  const ta = effTrack(a, aIdx), tb = effTrack(b, bIdx);
  if (tb !== ta) return tb > ta;
  return bIdx > aIdx;
}

// isCoverer(L) -> true when L, AT REST, is a kind of layer whose coverage IS decidable from the JSON
// alone: an opaque fill, or a full-bleed image. `html` is deliberately absent (see the file header):
// its opacity is markup this gate cannot read, and a ground rect in this repo's own films is made
// transparent ON PURPOSE so it shows through the html fragment above it.
function isCoverer(L) {
  if (!L || typeof L !== 'object') return false;
  if (L.type === 'image' || L.type === 'video') return true;
  if (L.type === 'rect' && (L.fill || L.bg || L.color)) return true;
  if (L.type === 'group') {
    for (const child of L.children || []) {
      const box = (typeof child.x === 'number' && typeof child.y === 'number'
        && typeof child.w === 'number' && typeof child.h === 'number') ? child : null;
      if (box && isFullBleedPlane(box, canvas) && isCoverer(child)) return true;
    }
  }
  return false;
}

// visibleAt(A, lt) -> A's translated box + opacity at local time `lt` (`motionAt`, the same pose
// core/tracks/motion.js drives a frame from), or null once A is effectively gone: faded below 5%
// opacity, or translated fully off the canvas. `dx`/`dy` are motionAt's own output names for x/y.
function visibleAt(A, lt) {
  if (!Array.isArray(A.motion) || !A.motion.length) return null;
  const pose = motionAt(A.motion, lt, A.motionDelay);
  if (pose.opacity == null || pose.opacity < 0.05) return null;
  const box = { x: A.x + (pose.dx || 0), y: A.y + (pose.dy || 0), w: A.w, h: A.h };
  const overlapsCanvas = box.x < canvas.w && box.x + box.w > 0 && box.y < canvas.h && box.y + box.h > 0;
  return overlapsCanvas ? { box, opacity: pose.opacity } : null;
}

// visibleUntil(A, from, to) -> the last instant in [from, to] A is still visible, sampled forward
// (A's own move never reads past its own window, so `to` is always the window's own end).
const VISIBLE_STEPS = 24;
function visibleUntil(A, from, to) {
  let last = from;
  for (let s = 1; s <= VISIBLE_STEPS; s++) {
    const t = from + (to - from) * (s / VISIBLE_STEPS);
    if (!visibleAt(A, t - A.start)) break;
    last = t;
  }
  return last;
}

// B's own opacity, from `motionAt` the same way A's pose is read. A coverer with no `motion` of its
// own is opaque from the instant it exists (isCoverer already required a fill/full-bleed image).
function opacityAt(B, lt) {
  if (!Array.isArray(B.motion) || !B.motion.length) return 1;
  const pose = motionAt(B.motion, lt, B.motionDelay);
  return pose.opacity == null ? 1 : pose.opacity;
}

// opaqueSince(B, from, to) -> the first instant in [from, to] B's own opacity reaches 0.95 (it hides
// whatever is behind it only once it is itself mostly solid), or null if it never does in that span.
// B FADING IN over A fading out is a crossfade, not a cover, until B is the one actually on top.
const OPAQUE_STEPS = 24;
function opaqueSince(B, from, to) {
  if (opacityAt(B, from - B.start) >= 0.95) return from;
  for (let s = 1; s <= OPAQUE_STEPS; s++) {
    const t = from + (to - from) * (s / OPAQUE_STEPS);
    if (opacityAt(B, t - B.start) >= 0.95) return t;
  }
  return null;
}

const findings = [];
for (let ai = 0; ai < top.length; ai++) {
  const A = top[ai];
  if (typeof A.start !== 'string') { /* fine, a number or absent */ }
  else { continue; } // item 2 owns the relative-start resolver; a string start here is unjudged, not covered
  const wins = windows(A);
  if (!wins.length) continue;
  for (let bi = 0; bi < top.length; bi++) {
    if (bi === ai) continue;
    const B = top[bi];
    if (typeof B.start !== 'number') continue; // an unresolved relative start: skip, don't guess
    if (!drawnAbove(bi, ai)) continue;
    const bBox = (typeof B.x === 'number' && typeof B.y === 'number' && typeof B.w === 'number' && typeof B.h === 'number') ? B : null;
    if (!bBox || !isFullBleedPlane(bBox, canvas) || !isCoverer(B)) continue;
    for (const w of wins) {
      if (B.start < w.from || B.start >= w.to) continue;
      // B only COVERS once it is itself mostly opaque: a fading-in B over a fading-out A is a
      // crossfade, not a cover, until B is actually the solid one on top.
      const coverStart = opaqueSince(B, B.start, w.to);
      if (coverStart == null) continue;
      // A must still be ON SCREEN the instant B becomes opaque: not already faded/translated away.
      if (!visibleAt(A, coverStart - A.start)) continue;
      // THE VISIBLE PART OF THE OVERLAP, not the authored window: from the moment B is opaque AND
      // A is still on screen, to the last instant A is still visible.
      const to = visibleUntil(A, coverStart, w.to);
      const aTrack = effTrack(A, ai), bTrack = effTrack(B, bi);
      const why = bTrack !== aTrack
        ? `track ${bTrack} draws above track ${aTrack}`
        : `same track (${aTrack}), later in layers[] (index ${bi} > ${ai})`;
      findings.push({ a: A.id || `layer#${ai}`, b: B.id || `layer#${bi}`, from: coverStart, to, why });
    }
  }
}

console.log(`\n  covered-move · ${file}`);
console.log(`  ${top.length} top-level layer(s) checked\n`);

const round = (n) => Math.round(n * 1000) / 1000;
const F = gateFindings({ scene: file, indent: '  ', line: (r, g) => [
  `  ${g} [${r.code}] ${r.summary}`,
  `      ${r.fix}`,
].join('\n') });
for (const rec of findings) {
  F.finding({
    code: 'covered-move',
    severity: 'warn',
    waived: allow.has('covered-move'),
    at: { layer: rec.a },
    summary: `"${rec.a}" is still visible (opacity >= 0.05, on canvas) from ${round(rec.from)}s to `
      + `${round(rec.to)}s while "${rec.b}" covers it starting at ${round(rec.from)}s: ${rec.why}.`,
    fix: `Start "${rec.b}" at ${round(rec.to)}s (after "${rec.a}" is no longer visible), `
      + `or give "${rec.a}" a track above "${rec.b}".`,
  });
}
F.emit();

if (!findings.length) console.log('  ✓ no authored move is covered by a full-bleed layer above it before it plays.');
console.log(`\n  ${allow.has('covered-move') ? 0 : findings.length} finding(s)${allow.has('covered-move') && findings.length ? ` (waived, ${findings.length} live)` : ''}.`);
console.log('  (report only, never blocks: a covering start can be a deliberate hard cut. Reads the declared JSON,');
console.log('   not rendered pixels, and never judges html coverage; see engine-doctrine/CRAFT/TRANSITIONS.md.)\n');
process.exit(0); // report-only: never fails the build, regardless of TASTE=1
