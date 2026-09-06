// scripts/gates/seam-forensics.mjs: the three defects a LUMINANCE flash never touches.
//
// scripts/gates/seam-snap.mjs proved the value of living inside the transition overlap instead of
// stepping over it, and then found nothing on a film that had three real defects at its two joints (a
// hand frame-by-frame read of out/demo.mp4, docs/MISTAKES.md-worthy but not yet logged there): a layer
// that had already ended, redrawn at the canvas origin (a RESURRECTION); the outgoing card still
// visible, fading, several extra frames past its own declared transition (a GHOST); and a background
// that steps instantly while the layers on top of it dissolve across the same window (a SPLIT SEAM). All
// three are invisible to a whole-frame luminance average: a resurrection and a ghost are LOCAL to one
// layer's box, and a split seam is a property of the field OUTSIDE every layer, which a flash check
// never samples on its own.
//
//   node scripts/gates/seam-forensics.mjs formats/scene/<file>.json     ·     make forensics D=<file>
//
// Reads the real rendered pixels via ffmpeg (scripts/lib/frame-forensics.mjs), the same reason
// seam-snap.mjs gives: a seam is composited during the render, so it exists only in the mp4. Boxes come
// from scripts/lib/layer-boxes.mjs, which calls the engine's OWN `resolveCoords` rather than
// re-deriving pin/percent/column arithmetic a second time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { layerBoxes, sceneDims } from '../lib/layer-boxes.mjs';
import { gradeable } from './tile.mjs';
import { gateFindings } from '../lib/findings.mjs';
import {
  requireTool, probeFps, probeTotalFrames, edgeReadingAt, diffBoxes, meanColorAt, savePNG, median,
} from '../lib/frame-forensics.mjs';

const f = gateFindings();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) {
  console.error('usage: node scripts/gates/seam-forensics.mjs <scene.json>');
  process.exit(2);
}
const data = loadScene(structuredClone(JSON.parse(fs.readFileSync(dataArg, 'utf8'))));
const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);
const ready = gradeable(dataArg, mp4);
if (!ready.ok) { console.error(`✗ ${ready.why}.\n  fix: ${ready.fix}`); process.exit(1); }

requireTool('ffprobe');
requireTool('ffmpeg');

const fps = probeFps(mp4);
if (!fps) { console.error(`✗ seam-forensics: ffprobe read no frame rate out of ${mp4}.`); process.exit(2); }
const total = probeTotalFrames(mp4);
if (!total) { console.error(`✗ seam-forensics: ffprobe could not count the frames in ${mp4}.`); process.exit(2); }

const [W, H] = sceneDims(data, data.aspect);
const layers = layerBoxes(data);

// intersection area of two boxes, as a fraction of `a`'s own area.
function overlapFraction(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const areaA = a.w * a.h;
  return areaA > 0 ? (ix * iy) / areaA : 0;
}

// A boundary this gate can reason about is a DECLARED one (cut/seam/sting), because a ghost's window
// and a split seam's window are both measured in the transition's own `dur`, and only a declared
// boundary carries one. (seam-snap.mjs also treats an inferred beat-start cluster as a boundary, for its
// flash check, which needs no `dur`; that inference is deliberately not repeated here.)
const boundaries = [];
for (const c of data.cuts || []) if (typeof c.t === 'number') boundaries.push({ t: c.t, dur: typeof c.dur === 'number' ? c.dur : 0.5 });
for (const s of data.seams || []) if (typeof s.t === 'number') boundaries.push({ t: s.t, dur: typeof s.dur === 'number' ? s.dur : 0.5 });
for (const s of data.stings || []) if (typeof s.t === 'number') boundaries.push({ t: s.t, dur: typeof s.dur === 'number' ? s.dur : 0.5 });
boundaries.sort((a, b) => a.t - b.t);

if (!boundaries.length) {
  console.log('✓ seam-forensics: no declared transition boundaries to sample (nothing to check)');
  f.emit();
  process.exit(0);
}

const SLUG = path.basename(dataArg, '.json');
const SHEET_DIR = `/tmp/seam-forensics/${SLUG}`;
fs.rmSync(SHEET_DIR, { recursive: true, force: true });
fs.mkdirSync(SHEET_DIR, { recursive: true });
const snap = (frameIdx, tag) => {
  const dest = path.join(SHEET_DIR, `${tag}_f${frameIdx}.png`);
  savePNG(mp4, frameIdx, dest);
  return dest;
};

// Thresholds are read off a real defect, not guessed: docs/CRAFT/TRANSITIONS.md#seam-forensics-tuning
// records the pixel readings on out/demo.mp4 that fixed each number below.
const GHOST_FLOOR = 4;      // mean |Δ| per channel (0-255) below this is compression noise, not a ghost
const GHOST_RATIO = 1.3;    // the +1f reading must still be this much above the +10f reading (decaying)
const RES_FLOOR = 4;        // edge-reading delta (0-255) below this is noise, not a redrawn shape
const SPLIT_FLOOR = 2;      // a colour-step floor so a dead-silent window can't flag on rounding alone

// ── 1. GHOST: an outgoing layer still visible, fading, past its own transition ─────────────────────
// For every layer whose box we can resolve and whose authored end sits around this joint (it was the
// thing LEAVING here), compare the box one frame after the transition's own `dur` ends against the same
// box ten frames later, both against a frame well past either (fully settled). A layer correctly gone by
// `dur` reads the same at +1f and +10f (both ≈ the settled reading); a ghost reads elevated at +1f and
// has mostly resolved by +10f — the fingerprint is the DECAY, not the raw brightness, so a scene that is
// simply dark or busy there never trips it on its own.
for (const b of boundaries) {
  const jointFrame = Math.round(b.t * fps);
  const durFrames = Math.round(b.dur * fps);
  const f1 = jointFrame + durFrames + 1;
  const f2 = jointFrame + durFrames + 10;
  const fSettled = Math.min(total - 2, jointFrame + durFrames + 40);
  if (f2 >= fSettled) continue; // too close to the end of the film to have a settled reference
  const outgoing = layers.filter((l) => l.box && l.end != null
    && l.end >= b.t - b.dur - 0.5 && l.end <= b.t + b.dur + 0.05);
  for (const l of outgoing) {
    const d1 = diffBoxes(mp4, f1, fSettled, l.box, W, H);
    const d2 = diffBoxes(mp4, f2, fSettled, l.box, W, H);
    if (d1 == null || d2 == null) { f.warn('seam-unread', `ghost check at boundary ${b.t}s, layer "${l.label}": a frame would not decode`); continue; }
    if (d1 >= GHOST_FLOOR && d1 >= d2 * GHOST_RATIO) {
      const p1 = snap(f1, `ghost-${b.t}s-${l.i}`);
      f.fail('seam-ghost',
        `ghost at ${b.t}s: "${l.label}" still visible and fading ${(f1 - jointFrame - durFrames)}f past its own transition (Δ${d1.toFixed(1)} at +1f vs Δ${d2.toFixed(1)} at +10f, both against the settled frame)`,
        { at: `frame ${f1}`, fix: p1, doc: 'docs/CRAFT/TRANSITIONS.md#seam-forensics-ghost' });
    }
  }
}

// ── 2. RESURRECTION: a layer redrawn after its own authored end ────────────────────────────────────
// Baseline is the frame just before the layer ever draws (a clean read, since the bug this exists to
// catch is the layer coming back, not the layer failing to leave the frame it just occupied — that would
// already show as an unchanged reading right after `end`, which is why `end+1f` is NOT used as the
// baseline here). Probe is one frame before every LATER boundary. Blind spot: a layer that legitimately
// re-enters its own box later in the film (a second beat reusing the same coordinates on purpose) reads
// identically to a resurrection; nothing here knows the difference between "came back" and "was asked
// back", only that the box changed after being confirmed empty.
for (const l of layers) {
  if (l.start == null || l.end == null) continue;
  const baselineFrame = Math.max(0, Math.round(l.start * fps) - 2);
  // A boundary inside this layer's OWN crossfade window is its exit, not a resurrection: skip anything
  // closer than the boundary's own `dur` (or 0.3s, whichever is larger) past `end`.
  const laterBoundaries = boundaries.filter((b) => b.t > l.end + Math.max(0.3, b.dur));
  if (!laterBoundaries.length) continue;
  const boxesToCheck = [];
  if (l.box) boxesToCheck.push({ tag: 'box', box: l.box });
  // Cursor-type layers place with an absolute `path`, not `x`/`y`, so they carry no resolvable box
  // above; the origin corner is where this exact defect showed up (a stale render state falling back
  // to (0,0) rather than staying unmounted), so it is always checked for this type, box or no box.
  if (l.type === 'cursor') {
    const side = Math.round(Math.min(W, H) * 0.05);
    boxesToCheck.push({ tag: 'origin', box: { x: 0, y: 0, w: side, h: side } });
  }
  if (!boxesToCheck.length) continue;
  const b = laterBoundaries[0]; // the first later boundary is the earliest chance the bug can show
  const probeFrame = Math.round(b.t * fps) - 1;
  // A LATER beat legitimately reusing this same screen region (a title landing where the last one sat)
  // reads exactly like a resurrection to a box-only check with no idea what else is on screen. Skip the
  // authored box (never the origin corner, nothing legitimate lives there) when another layer's own box
  // covers most of it and that layer is actually on screen at the probe time.
  // The `beat` blueprint (blueprints/, out of scope here) lays its children out at render time rather
  // than authoring their x/y, so a later beat's own content shows up here with `box: null`: it cannot be
  // matched by overlap, only noticed. Any GROUP on screen at the probe time is the coarse version of the
  // same signal ("something else was authored for this moment") and is treated the same as a real
  // overlap, trading a little sensitivity for not flagging every beat-blueprint film's own next beat.
  const activeGroup = layers.some((other) => other.type === 'group' && other.i !== l.i && other.start != null
    && other.start <= b.t && (other.end == null || b.t <= other.end + 0.6));
  const reoccupied = boxesToCheck.some(({ tag }) => tag === 'box') && (activeGroup || layers.some((other) => other.i !== l.i
    && other.box && other.start != null && other.start <= b.t && (other.end == null || b.t <= other.end + 0.6)
    && overlapFraction(l.box, other.box) > 0.4));
  for (const { tag, box } of boxesToCheck) {
    if (tag === 'box' && reoccupied) continue;
    const e0 = edgeReadingAt(mp4, baselineFrame, box, W, H);
    const e1 = edgeReadingAt(mp4, probeFrame, box, W, H);
    if (e0 == null || e1 == null) { f.warn('seam-unread', `resurrection check for "${l.label}" (${tag}): a frame would not decode`); continue; }
    if (Math.abs(e1 - e0) >= RES_FLOOR) {
      const p1 = snap(probeFrame, `resurrection-${l.i}-${tag}`);
      f.fail('seam-resurrection',
        `resurrection: "${l.label}" ended at ${l.end.toFixed(2)}s but its ${tag === 'origin' ? 'origin corner' : 'authored box'} reads differently at ${b.t.toFixed(2)}s (edge reading ${e1} vs ${e0} clean, before it ever drew)`,
        { at: `frame ${probeFrame}`, fix: p1, doc: 'docs/CRAFT/TRANSITIONS.md#seam-forensics-resurrection' });
    }
  }
}

// ── 3. SPLIT SEAM: the field steps while the layers on top of it dissolve ──────────────────────────
// The field is a strip outside every authored layer box: the bottom margin, on the working assumption
// that nothing here is placed edge-to-edge (a scene that fills the bottom margin with real content will
// see its own layer's motion here, a known blind spot rather than a silent one). Across the transition's
// own window, the field's mean colour should move in small, roughly even steps; one step several times
// the size of the rest is a hard swap disguised inside a soft transition.
const stripH = Math.max(20, Math.round(H * 0.037));
const fieldBox = { x: 0, y: H - stripH, w: W, h: stripH };
for (const b of boundaries) {
  const half = b.dur / 2;
  const startFrame = Math.max(0, Math.round((b.t - half) * fps));
  const endFrame = Math.min(total - 1, Math.round((b.t + half) * fps));
  if (endFrame - startFrame < 3) continue; // too short a window to have a real median step
  const colors = [];
  for (let fr = startFrame; fr <= endFrame; fr++) {
    const c = meanColorAt(mp4, fr, fieldBox, W, H);
    if (c) colors.push({ fr, c });
  }
  if (colors.length < 4) { f.warn('seam-unread', `split-seam check at boundary ${b.t}s: too few frames decoded`); continue; }
  const steps = [];
  for (let i = 1; i < colors.length; i++) {
    const [pr, pg, pb] = colors[i - 1].c, [cr, cg, cb] = colors[i].c;
    steps.push((Math.abs(cr - pr) + Math.abs(cg - pg) + Math.abs(cb - pb)) / 3 * 255);
  }
  const med = median(steps);
  const threshold = Math.max(3 * med, SPLIT_FLOOR);
  const maxStep = Math.max(...steps);
  if (maxStep > threshold) {
    const idx = steps.indexOf(maxStep);
    const stepFrame = colors[idx + 1].fr;
    const p1 = snap(stepFrame, `split-${b.t}s`);
    f.fail('seam-split',
      `split seam at ${b.t}s: the field jumps ${maxStep.toFixed(1)} at frame ${stepFrame} (median step ${med.toFixed(1)} across the ${b.dur}s window) while the transition is still dissolving the layers on top of it`,
      { at: `frame ${stepFrame}`, fix: p1, doc: 'docs/CRAFT/TRANSITIONS.md#seam-forensics-split-seam' });
  }
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
const errors = f.records.filter((r) => r.severity === 'error').length;
if (!errors) {
  console.log(`✓ seam-forensics clean across ${boundaries.length} boundary(ies): no resurrection, ghost or split seam (sheet dir: ${SHEET_DIR})`);
  f.emit();
  process.exit(0);
}
for (const r of f.records) if (r.severity === 'error') console.error(`  ✗ [${r.code}] ${r.summary}\n    frame → ${r.fix}`);
console.error(`\n✗ seam-forensics: ${errors} defect(s) the flash check can't see. Frames written under ${SHEET_DIR}.`);
f.emit();
process.exit(1);
