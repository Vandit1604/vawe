// quality/gates/covered-move.mjs: IS AN AUTHORED MOVE COVERED BY THE NEXT BEAT BEFORE IT PLAYS?
//
// vawe-flow-2's terminal group (track 1) carried a real exit (x 0 -> -2400, opacity 1 -> 0 over
// 0.3s), and the next beat's full-frame `card-a` (track 1, drawn later in `layers[]`) started on the
// exit's first frame. `track` sets stacking (core/timeline/clips.js ~260 writes zIndex off
// data-track; formats/scene/scene.js:597 sets data-track to `L.track ?? idx`), and layers on the same
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
//   node quality/gates/covered-move.mjs <scene.json>   ·   make covered-move D=<file>
import fs from 'node:fs';
import { loadScene } from '../../core/engine/expand.js';
import { resolveCoords } from '../../core/engine/boot.js';
import { sceneDims } from '../../core/layout/safe.js';
import { isFullBleedPlane } from '../../core/tracks/overscan.js';
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

// effTrack/tieBreak mirror formats/scene/scene.js:597 exactly (`L.track ?? idx`) and the verified
// stacking fact: same track ties, array order breaks the tie, LATER draws on top.
const effTrack = (L, idx) => (typeof L.track === 'number' ? L.track : idx);
function drawnAbove(bIdx, aIdx) {
  const a = top[aIdx], b = top[bIdx];
  const ta = effTrack(a, aIdx), tb = effTrack(b, bIdx);
  if (tb !== ta) return tb > ta;
  return bIdx > aIdx;
}

// isCoverer(L) -> { opaque, confidence } for whether L, AT REST, is the kind of thing that hides
// whatever is behind it: an opaque fill, or a full-bleed image/video/html. This reads the declared
// JSON, not rendered pixels (that is seam-forensics.mjs's job), so an html layer's actual markup
// opacity is unknowable here and is reported at lower confidence rather than guessed at.
function isCoverer(L) {
  if (!L || typeof L !== 'object') return { opaque: false, confidence: 'n/a' };
  if (L.type === 'image' || L.type === 'video') return { opaque: true, confidence: 'high' };
  if (L.type === 'rect' && (L.fill || L.bg || L.color)) return { opaque: true, confidence: 'high' };
  if (L.type === 'html') return { opaque: true, confidence: 'may cover' };
  if (L.type === 'group') {
    for (const child of L.children || []) {
      const box = (typeof child.x === 'number' && typeof child.y === 'number'
        && typeof child.w === 'number' && typeof child.h === 'number') ? child : null;
      if (box && isFullBleedPlane(box, canvas)) {
        const c = isCoverer(child);
        if (c.opaque) return c;
      }
    }
  }
  return { opaque: false, confidence: 'n/a' };
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
    if (!bBox || !isFullBleedPlane(bBox, canvas)) continue;
    const cover = isCoverer(B);
    if (!cover.opaque) continue;
    for (const w of wins) {
      if (B.start < w.from || B.start >= w.to) continue;
      const aTrack = effTrack(A, ai), bTrack = effTrack(B, bi);
      const why = bTrack !== aTrack
        ? `track ${bTrack} draws above track ${aTrack}`
        : `same track (${aTrack}), later in layers[] (index ${bi} > ${ai})`;
      findings.push({
        a: A.id || `layer#${ai}`, b: B.id || `layer#${bi}`, from: w.from, to: w.to, why,
        confidence: cover.confidence, bStart: B.start,
      });
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
    summary: `"${rec.a}" moves from ${round(rec.from)}s to ${round(rec.to)}s, and "${rec.b}" `
      + `starts at ${round(rec.bStart)}s${rec.confidence === 'may cover' ? ' (may cover, unread html opacity)' : ''} `
      + `on top of it: ${rec.why}.`,
    fix: `Start "${rec.b}" at ${round(rec.to)}s (after "${rec.a}"'s move ends), `
      + `or give "${rec.a}" a track above "${rec.b}".`,
  });
}
F.emit();

if (!findings.length) console.log('  ✓ no authored move is covered by a full-bleed layer above it before it plays.');
console.log(`\n  ${allow.has('covered-move') ? 0 : findings.length} finding(s)${allow.has('covered-move') && findings.length ? ` (waived, ${findings.length} live)` : ''}.`);
console.log('  (report only, never blocks: a covering start can be a deliberate hard cut. Reads the declared JSON,');
console.log('   not rendered pixels; an html coverer\'s real opacity is unknowable here, see docs/CRAFT/TRANSITIONS.md.)\n');
process.exit(0); // report-only: never fails the build, regardless of TASTE=1
