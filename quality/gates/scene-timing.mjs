// quality/gates/scene-timing.mjs: ONE model of when a scene's layers are actually on screen.
//
// A scene JSON does not say when its layers are visible. `start` + `duration` are what the AUTHOR wrote;
// the renderer then rewrites them. core/engine/produce.js turns `sceneUnits` on for any cut film that is not
// already choreographed, and formats/scene/scene.js (setLayerTiming) then REPLACES the duration of each
// non-last-beat layer that is still the beat's CURRENT STATE with the run to `beatEnd + cutDur`, so the
// beat wrapper can slide the whole beat out as one unit. A gate that reads the raw fields sees holes the
// render does not have, and misses ones it does. beat-check learned that the expensive way
// (docs/MISTAKES.md #172) by modelling it inline. Which layers count as current is #555.
//
// It lives here because a second gate now needs the same answer. Two copies of a model of someone else's
// code drift, and the copy that drifts is the one that stops catching the bug. Import it; do not fork it.
// If formats/scene/scene.js changes how it lowers timing, this file is the one place that follows.
//
//   import { sceneTiming } from './scene-timing.mjs';
//   const T = sceneTiming(sceneJson);
//   T.spans        // [[start, end], ...] for CONTENT layers, SORTED, engine-corrected, so spans[i] is
//                  // NOT content[i]. For a per-layer question use T.contentSpans.
//   T.contentSpans // the same spans, aligned to T.content by index, unsorted
//   T.allSpans     // the same for every top-level layer, blackouts and specks included
//   T.duration     // declared, else last end + a beat, the renderer's own rule
//   T.cutTimes     // sorted times of every real (style !== 'none') cut
//   T.sceneUnits   // whether the engine will wrap beats as units
//   T.edges        // [0, ...cutTimes], the start of each beat
//   T.cutDurAt(t)  // the cut window that closes the beat at t
//   T.unitCut(L)   // the cut that closes this layer's beat (null when the wrapper leaves it alone)
//   T.unitEnd(L)   // where the engine actually drops the layer: unitCut + that cut's window
//   T.scene        // the scene LOWERED (see sceneTiming below), read cuts/seams/stings from here
//   T.lives        // per content layer: { id, enter, exit|null, becomes, cutOut, planned, channels }
//                  // exit carries { kind, start, end, ease }: ease is the last motion key's own ease
//                  // (or "rush" from `out:"rush"`), the authored answer to "does this exit accelerate"
//   T.beatMotion   // per scene-timing beat (cut-segmented): { index, start, end, kinds, count, offsets }
//   T.beatMotionAt(start, end) // the same for an ARBITRARY window, e.g. a storyboard beat's own times
//   T.handoffs     // [{ from, to, gap, declared }] - an exit leading into another's entrance
//   T.cameraStillHeldAt(start, end) // {pose, legEndT, layer} | null: the camera at a beat's start is
//                  // away from rest because an EARLIER leg already ended, and this beat's own content
//                  // fills the frame (skills/vawe-camera/SKILL.md: a camera move holds its end pose forever)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneDims } from '../../core/layout/safe.js';
import { cameraView, cameraAt } from '../../core/timeline/sequence.js';
import { loadScene } from '../../core/engine/expand.js';
import { BASE_ENTER, BASE_EXIT } from '../../core/timeline/clips.js';

export const num = (v, dflt) => (typeof v === 'number' && Number.isFinite(v) ? v : dflt);

// share of each canvas axis a garnish (a dot, a spinner, an icon) stays under. Exported because gates
// quote it in their messages, and a message that names a different number than the check used is a lie.
export const SPECK = 0.08;

// a beat blueprint layer carries `dur`, a primitive carries `duration`; both mean the same window.
export const spanOf = (L) => {
  const start = num(L.start, 0);
  return [start, start + num(L.duration, num(L.dur, 2))];
};

// ---------------------------------------------------------------------------------------------------
// HOW BIG IS A LAYER, and why `w * h` was the wrong answer.
//
// Layers are not all sized by `w`/`h`. A `cursor` and a `progressRing` take `size`; an image routinely
// declares one axis and lets the other follow the asset's own aspect. A gate that multiplies `w` by `h`
// therefore reads 0 for those and reports it with total confidence, which is how `plinth-ad`'s hero
// figure (h:1440, no w, i.e. 67% of the frame) came to be dismissed as "a mark, not a subject".
//
// The tiers below are ordered by how much they KNOW, and the last one is the honest one: `unknown`
// returns zero rather than inventing a size. An undeclared box is an unknown size, not a large one, so
// crediting it would let `{"type":"image","src":"x.png"}` buy a pass off nothing. Callers are expected
// to surface `how === 'unknown'` rather than silently skip it.
//
// THERE USED TO BE A FOURTH TIER, `proxy`, and deleting it is the point of this note. A layer declaring
// only one axis and carrying no readable intrinsic aspect was squared: w became h. A 590x18 decorative
// underline was therefore measured as 590x590 and credited with about a tenth of the frame. That is not
// a guess marked as a guess, it is a wrong number with a label on it, and every caller multiplied it
// into an area and compared it against a threshold. A gate cannot be allowed to invent the one quantity
// it exists to measure. If you need the real box of a single-axis layer, measure the rendered DOM.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const _aspect = new Map();

// width/height ratio of a local asset, read from its own header. PNG/JPEG/SVG, no dependencies.
export function intrinsicAspect(src, root = ROOT) {
  if (typeof src !== 'string' || !src) return null;
  if (/^(https?:|data:)/i.test(src)) return null;
  const rel = src.replace(/^\/+/, '');
  if (_aspect.has(rel)) return _aspect.get(rel);
  let ar = null;
  try {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.svg') {
        const s = fs.readFileSync(file, 'utf8').slice(0, 2000);
        const vb = s.match(/viewBox\s*=\s*"[\s\d.+-]*?([\d.]+)[\s,]+([\d.]+)\s*"/i);
        if (vb) ar = +vb[1] / +vb[2];
        else {
          const w = s.match(/\bwidth\s*=\s*"([\d.]+)/i), h = s.match(/\bheight\s*=\s*"([\d.]+)/i);
          if (w && h && +h[1]) ar = +w[1] / +h[1];
        }
      } else {
        const b = fs.readFileSync(file);
        if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {          // PNG: IHDR w,h at 16,20
          ar = b.readUInt32BE(16) / b.readUInt32BE(20);
        } else if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {      // JPEG: first SOFn frame header
          for (let i = 2; i + 9 < b.length;) {
            if (b[i] !== 0xff) { i++; continue; }
            const mk = b[i + 1];
            if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) {
              ar = b.readUInt16BE(i + 7) / b.readUInt16BE(i + 5); break;  // width / height
            }
            i += 2 + (b.readUInt16BE(i + 2) || 0);
          }
        }
      }
    }
  } catch { ar = null; }
  if (!Number.isFinite(ar) || ar <= 0) ar = null;
  _aspect.set(rel, ar);
  return ar;
}

// THE PICTORIAL VOCABULARY, which layer types DEPICT and which merely DECORATE. It lives here, beside
// the geometry, because a gate that reasons about layers needs it: `critique` asks whether a layer
// spanning the film is its subject or just wallpaper. It is kept in one place so two copies could never
// disagree about what counts as a picture. (`visual-vocabulary` was the other reader, and is deleted.)
//
// `rect` is deliberately absent: a rect is a divider or a scrim far more often than it is a bar, and
// counting it would let any film buy a pass with a hairline.
export const PICTORIAL = new Set(['svg', 'image', 'component', 'board', 'doc', 'clip', 'three', 'raymarch', 'paint', 'composition', 'cursor', 'lottie']);
// types that DECORATE. Listed so a gate cannot be satisfied by adding more light.
export const CHROME = new Set(['glow', 'beam', 'shader', 'rect']);

// an html layer earns pictorial status by CONTAINING a graphic, not by being an html layer: an inline
// <svg>, a conic-gradient (the donut/ring idiom), or three-or-more boxes whose length is driven by a
// variable, which is what a bar chart looks like in markup.
export const htmlGraphic = (h) => {
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

export function boxOf(L, root = ROOT) {
  // A KEYED BOX IS THE BIGGEST BOX IT EVER IS. `w`/`h` motion keys let a layer change size over the
  // film, and every gate downstream of this asks a question the authored resting size cannot answer:
  // does this cover the safe area, does it overlap its neighbour, is it big enough to be the subject.
  // Reading the resting value called each tile of a reflowing photo grid "a mark, not a subject" while
  // it was filling a third of the frame. Largest, not first, because these gates all ask about the
  // worst case; a gate wanting the box AT a moment should call motionAt.
  const kw = [], kh = [];
  if (Array.isArray(L.motion)) for (const k of L.motion) {
    if (k && typeof k === 'object') { if (num(k.w, null) != null) kw.push(k.w); if (num(k.h, null) != null) kh.push(k.h); }
  }
  const w0 = kw.length ? Math.max(num(L.w, 0), ...kw) : num(L.w, null);
  const h0 = kh.length ? Math.max(num(L.h, 0), ...kh) : num(L.h, null);
  const sz = num(L.size, null);
  if (w0 != null && h0 != null) return { w: w0, h: h0, how: 'explicit' };
  const w = w0 ?? sz, h = h0 ?? sz;
  if (w != null && h != null) return { w, h, how: 'size' };
  const known = w ?? h;
  if (known == null) return { w: 0, h: 0, how: 'unknown' };
  const ar = intrinsicAspect(L.src, root);
  if (ar) return w != null ? { w, h: w / ar, how: 'intrinsic' } : { w: h * ar, h, how: 'intrinsic' };
  // one axis, no intrinsic aspect: the other axis is genuinely not known here. Say so.
  return { w: 0, h: 0, how: 'unknown' };
}

// the share of the FRAME a layer actually covers. Clipped to the frame first: off-canvas pixels are
// not the subject. A layer whose box is unknown reports a share of 0, never a guess.
//
// `view` is WHERE THE FRAME IS, from cameraView(). Without it the frame is the canvas box at the origin,
// which is where the camera stands on frame 0 and nowhere else: on a film that travels between stations
// (linear-journey lays five of them across 5760x2160) a station that FILLS the screen scored 0, because
// every one of its pixels is off-canvas at the origin. Pass a view and both halves move with the camera.
// The clip and the denominator, so the share stays "how much of what the viewer sees is this layer".
// Absent or null it is the old canvas-box answer, byte for byte.
export function canvasShare(L, CW, CH, root = ROOT, view = null) {
  const b = boxOf(L, root);
  if (!b.w || !b.h) return { share: 0, how: b.how };
  // an undeclared x/y centres the layer in the CANVAS, not in the view: the renderer's default is a stage
  // coordinate and the camera does not move it. So this stays CW/CH whether or not a view was supplied.
  const x = num(L.x, (CW - b.w) / 2), y = num(L.y, (CH - b.h) / 2);
  const V = view || { x: 0, y: 0, w: CW, h: CH };
  const vw = Math.max(0, Math.min(x + b.w, V.x + V.w) - Math.max(x, V.x));
  const vh = Math.max(0, Math.min(y + b.h, V.y + V.h) - Math.max(y, V.y));
  return { share: Math.min(1, (vw * vh) / (V.w * V.h)), how: b.how };
}

// sceneView(d, t, CW, CH): the stage rectangle the camera is looking at, or `null` for "no opinion,
// measure against the canvas as before". THE WHOLE RULE IN ONE PLACE, because it has two halves and the
// second is easy to forget: `cameraView` refuses when the CAMERA carries an angle, and it takes
// keyframes, so it cannot see that a top-level `tilt` or `plane` modifier builds the same 3D rig with no
// camera angle at all (formats/scene/scene.js:705). playhead ships `{"tilt":{"y":18}}` + `{"plane":-500}`
// and its stage is visibly turned at 12.4s; a view computed there is a rect standing in for a quad, and
// deleting findings against it deletes them for a reason that is not true.
// It was split across cameraView and one call site when `scattered-beat` was the only consumer. A second
// consumer (beat-check's camera-aimed-at-nothing) is exactly when a half-remembered rule gets remembered
// by half, so it moves here, where both callers get both halves or neither.
export function sceneView(d, t, CW, CH) {
  const layers = Array.isArray(d?.layers) ? d.layers : [];
  const rigged = layers.some((l) => (Array.isArray(l?.modifiers) ? l.modifiers : [])
    .some((m) => m && typeof m === 'object' && (m.tilt != null || m.plane != null)));
  if (rigged || d?.tilt != null) return null;
  return cameraView(Array.isArray(d?.camera) ? d.camera : null, t, CW, CH);
}

// inView(L, view): does this layer's box meet the camera's rectangle? `null` view means yes: the caller
// has no camera opinion and must not lose a layer to one. An UNKNOWN box keeps its POSITION (boxOf's
// contract is that the extent is unknown, never that the layer is elsewhere), so it is placed by its own
// x/y and given no size, which can keep a layer whose top-left sits just outside a view its body is in.
// That direction is deliberate: this predicate only ever REMOVES things from a count, so erring toward
// "visible" cannot invent a finding.
//
// UNKNOWN IS PER AXIS, NOT PER LAYER. `boxOf` returns {0,0,'unknown'} whenever ONE axis cannot be
// derived, so an html fragment that declares `w: 1600` and no `h` (its height comes from the fragment's
// own aspect, which no gate can read) was judged as a zero-area POINT at its top-left corner. A 1600px
// grid whose left edge sat 46px outside the view was therefore "not being looked at" while it filled
// the frame, and `camera-aimed-at-nothing` invented 1.4s of emptiness in gh-wrapped, the exact
// direction the paragraph above says this predicate must never take. Reading each axis's declared value
// back keeps boxOf's contract (the extent it could not derive is still unknown) and only ever grows the
// box, so it can delete a false finding and cannot create a true one. docs/MISTAKES.md.
export function inView(L, view, root = ROOT) {
  if (!view) return true;
  // x/y are NOT always numbers: `x:"center"` and the `pin` keywords are resolved by the engine against
  // the safe area, and nothing here can do that. A string compares false against every number in JS
  // silently, so `<=` judged every centred layer to be outside the frame and ab2-control-tenor gained a
  // second of invented emptiness. No coordinate means no opinion, which is the only direction that
  // cannot manufacture a finding.
  if (!Number.isFinite(L?.x) || !Number.isFinite(L?.y)) return true;
  const b = boxOf(L, root);
  const known = b.how !== 'unknown';
  const w = known ? b.w : (num(L.w, null) ?? 0), h = known ? b.h : (num(L.h, null) ?? 0);
  return L.x <= view.x + view.w && L.x + w >= view.x && L.y <= view.y + view.h && L.y + h >= view.y;
}

// LOWER FIRST. The unified `transitions` surface is the documented way to declare a boundary, and the
// engine expands it to cuts/seams/stings before it renders anything (core/transitions/lower.js). A model
// of the clock that reads raw `cuts` therefore says brew-launch-act1 has no boundaries when it has four,
// and every gate built on this model inherits that. #380 fixed eight consumers one at a time and missed
// the ninth; lowering HERE is what makes the tenth impossible. docs/MISTAKES.md #394, #407.
//
// CLONED, because loadScene mutates and `delete`s `transitions` off what it is given. That is right for
// the renderer, which lowers once at the top, and wrong for a gate: a check that rewrites the object it
// is grading changes what every later check sees. core/validate/validate.mjs clones for the same reason.
// Lowering is idempotent, so a caller that already lowered pays a copy and nothing else.
export function sceneTiming(input) {
  const d = loadScene(structuredClone(input));
  const layers = (Array.isArray(d.layers) ? d.layers : []).filter((L) => L && typeof L === 'object');

  const cutTimes = [...new Set((Array.isArray(d.cuts) ? d.cuts : [])
    .filter((c) => c && typeof c === 'object' && c.style && c.style !== 'none' && num(c.t, null) !== null)
    .map((c) => num(c.t, 0)))].sort((a, b) => a - b);
  const choreographed = layers.some(function has(L) {
    return L && typeof L === 'object' && ((Array.isArray(L.motion) && L.motion.length > 1) || (L.children || []).some(has));
  });
  const sceneUnits = d.sceneUnits === true
    || (d.sceneUnits == null && d.produced !== false && cutTimes.length > 0 && !choreographed);
  // the cut window that closes beat i, matching scene.js's `dur ?? 0.4`.
  const cutDurAt = (t) => {
    const c = (Array.isArray(d.cuts) ? d.cuts : []).find((x) => x && num(x.t, null) === t);
    return c && c.dur != null ? num(c.dur, 0.4) : 0.4;
  };
  const edges = [0, ...cutTimes];
  // beat i covers [edges[i], cutTimes[i]); the last beat runs to the end and has no exit cut.
  // The CUT that closes a layer's beat, which is where the wrapper starts sliding it out. Separated
  // from unitEnd because the two answer different questions: unitEnd is when the layer is gone, this is
  // when the film moves on from it. A layer authored to leave long before its beat's cut is being HELD,
  // and telling the two apart needs the cut time, not the end of the cut window.
  // Only the layers that are still the beat's CURRENT STATE ride the wrapper out; the ones the beat
  // already replaced keep their authored window and leave when the author said (docs/MISTAKES.md #555).
  // Mirrors `beatIsCurrent` in formats/scene/scene.js exactly, including the start-times-only ceiling.
  const EPS = 1e-6;
  const beatIsCurrent = (L, i) => {
    const end = num(L.start, 0) + (L.duration == null ? Infinity : num(L.duration, Infinity));
    if (end >= cutTimes[i] - EPS) return true;
    for (const o of layers) {
      if (o.acrossBeats === true) continue;
      const s = num(o.start, 0);
      if (s >= edges[i] && s < cutTimes[i] && s >= end - EPS) return false;
    }
    return true;
  };
  const unitCut = (L) => {
    if (!sceneUnits || !cutTimes.length) return null;
    // `acrossBeats` opts a layer out of the wrapper (formats/scene/scene.js beatIndexOf), so the engine
    // leaves its authored window alone. Modelling it as truncated would make every gate that reasons
    // about time deny the existence of the one thing they ask for.
    if (L.acrossBeats === true) return null;
    const start = num(L.start, 0);
    for (let i = 0; i < edges.length - 1; i++) {            // non-last beats only
      if (start >= edges[i] && start < cutTimes[i]) return beatIsCurrent(L, i) ? cutTimes[i] : null;
    }
    return null;                                            // last beat: no exit cut, no extension
  };

  const unitEnd = (L) => { const c = unitCut(L); return c == null ? null : c + cutDurAt(c); };

  // a blackout and a speck both keep a window open without putting anything in the frame.
  const [CANVAS_W, CANVAS_H] = sceneDims(d);
  const OPAQUE_FILL = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i; // a bare hex: no alpha channel, no gradient stops
  const blackout = (L) => L.type === 'rect' && num(L.w, 0) >= CANVAS_W && num(L.h, 0) >= CANVAS_H
    && typeof L.bg === 'string' && OPAQUE_FILL.test(L.bg.trim()) && num(L.opacity, 1) >= 1;
  // an undeclared box is an unknown size, not a small one, so it counts. `h` falls back to `w` because a
  // fragment sized to a narrow width (an html dot, an icon) is narrow in both directions.
  const speck = (L) => num(L.w, Infinity) < CANVAS_W * SPECK && num(L.h, num(L.w, Infinity)) < CANVAS_H * SPECK;
  // top-level only: a group's window already covers its children, and a child's own `start` is read against
  // the same clock, so counting children as well would only widen a window the parent already holds.
  const content = layers.filter((L) => L.track !== 0 && !blackout(L) && !speck(L));

  // scene.js REPLACES a non-last-beat layer's duration with the run to `beatEnd + cutDur` (it does not
  // take a max), so a layer can be shortened as well as lengthened. Mirror that exactly.
  const correctEach = (list) => list.map((L) => { const [a, b] = spanOf(L); const u = unitEnd(L); return [a, u == null ? b : u]; });
  const correct = (list) => correctEach(list).sort((a, b) => a[0] - b[0]);
  const spans = correct(content);
  // `spans` is SORTED, so spans[i] is not content[i]. Every consumer so far only merges it into a coverage
  // map, where order cannot matter, and the sort is what makes that merge a single pass. The moment a gate
  // asks a per-layer question of the clock (beat-check's camera-aimed-at-nothing needs "where was THIS
  // layer at t"), the index looks aligned and is not: it silently answers about a different layer, which
  // read as 2.15s of empty frame on a film whose frames were full. Aligned copy, same correction, no sort.
  const contentSpans = correctEach(content);
  const allSpans = correct(layers);

  const lastEnd = spans.reduce((m, [, b]) => Math.max(m, b), 0);
  // same duration rule the renderer uses (formats/scene/scene.js): declared, else the last layer plus a beat.
  const duration = num(d.duration, 0) || +(lastEnd + 0.4).toFixed(2);

  // ── CHOREOGRAPHY: each layer's LIFE, what moves together per beat, and the handoffs between them ──
  // `becomes`, here, is a DECLARED handoff: a `flow-seam` recipe names the outgoing layer (`out`) and
  // the incoming one (`in`) at the boundary it joins, which is exactly an element's exit leading into
  // another element's entrance. Read off the RAW input, before loadScene deletes `recipes` on its way
  // to expanding them into motion/camera: this is authored intent, not a pixel inference.
  const rawRecipes = Array.isArray(input?.recipes) ? input.recipes
    : Array.isArray(input?.data?.recipes) ? input.data.recipes : [];
  const becomesMap = new Map();
  for (const r of rawRecipes) if (r && typeof r.out === 'string' && typeof r.in === 'string') becomesMap.set(r.out, r.in);

  // which POSE channels a layer's own motion track actually MOVES, grouped the way a motion designer
  // would name them, not by the engine's internal key names. A channel counts only when it VARIES
  // across the track: `resolveKeyedProps` backfills every key with the layer's resting value the
  // moment ONE key sets it, so presence alone would count a layer that keys nothing as keying
  // everything. `parts`/`kinetic` are staggers, not POSE channels, so they are named separately.
  const CHANNELS = {
    position: ['x', 'y', 'ox', 'oy'], scale: ['scale', 'w', 'h'],
    rotation: ['rot', 'rotX', 'rotY', 'z'], blur: ['blur'], opacity: ['opacity'],
  };
  const varyingChannels = (L) => {
    const out = new Set();
    if (Array.isArray(L.motion) && L.motion.length > 1) {
      for (const [name, keys] of Object.entries(CHANNELS)) {
        for (const p of keys) {
          const vals = L.motion.map((k) => k && k[p]).filter((v) => v != null);
          if (vals.length > 1 && new Set(vals).size > 1) { out.add(name); break; }
        }
      }
    }
    if (L.parts != null) out.add('parts-stagger');
    if (L.kinetic != null) out.add('kinetic-stagger');
    if (L.idle != null && L.idle !== 'none' && L.idle !== false) out.add('idle');
    return out;
  };

  // LIFE: enter (anim/motion/parts/kinetic, else 'none' - it simply appears), hold, exit (`out`, else
  // none), and whether that life is PLANNED: a real `out`, the beat wrapper sliding it out on a cut
  // (`unitCut`), a `flow-seam` naming it as the outgoing half of a handoff, or it simply holds to the
  // film's own end. Anything else is a layer that appears and is never designed to leave.
  // the ease driving the LAST leg of a layer's own motion track, i.e. the move landing on its exit.
  // `ease` and `easeIn` both name the curve a segment ARRIVES on (core/timeline/sequence.js's per-side
  // comment); either is the authored answer to "does this layer's departure accelerate".
  const lastKeyEase = (L) => {
    if (!Array.isArray(L.motion) || !L.motion.length) return null;
    const last = L.motion[L.motion.length - 1];
    return (last && (last.ease || last.easeIn)) || null;
  };

  const lives = content.map((L, idx) => {
    const [s, e] = contentSpans[idx];
    const channels = varyingChannels(L);
    const enterKind = L.anim || (channels.size ? [...channels][0] : null);
    const enterDur = num(L.enterDur, enterKind ? BASE_ENTER : 0);
    const exitDeclared = L.out != null;
    const exitDur = num(L.exitDur, exitDeclared ? BASE_EXIT : 0);
    const uc = unitCut(L);
    const becomesTo = L.id ? becomesMap.get(L.id) || null : null;
    const atFilmEnd = e >= duration - EPS;
    const planned = exitDeclared || uc != null || becomesTo != null || atFilmEnd;
    // `rush` is the engine's own name for "accelerate away" (core/motion/motion.js), so an author who
    // set `out:"rush"` with no separate keyframe ease still gets credit for an accelerating exit.
    const exitEase = exitDeclared ? (lastKeyEase(L) || (L.out === 'rush' ? 'rush' : null)) : null;
    return {
      id: L.id || `${L.type || 'layer'}#${idx}`,
      start: s, end: e, channels: [...channels],
      enter: { kind: enterKind || 'none', start: s, end: +(s + enterDur).toFixed(3) },
      exit: exitDeclared ? { kind: L.out, start: +(e - exitDur).toFixed(3), end: e, ease: exitEase } : null,
      becomes: becomesTo, cutOut: uc, planned,
      // The layer's own motion track, on its LOCAL clock (kfs[0].t is the layer's own start). Carried
      // here so a caller can measure the layer's actual speed at its enter/exit edges (velocityAt,
      // core/timeline/sequence.js) instead of only reading the authored duration/ease as a proxy.
      motion: Array.isArray(L.motion) && L.motion.length > 1 ? L.motion : null,
    };
  });

  // BEAT MOTION: which kinds move together in each beat (edges[i] .. its cut, or the end for the last
  // beat), and the OFFSETS between their start times - a beat where everything starts on the same
  // frame has one offset of 0; a beat with staggered arrivals has several small ones.
  const camKfs = Array.isArray(d.camera) ? d.camera.filter((k) => k && typeof k === 'object' && num(k.t, null) != null) : [];
  // a camera LEG (consecutive keyframes whose pose actually differs) as a [start, end] span. Shared by
  // beatMotionAt (below) and by callers measuring how much of the film the camera actually travels
  // (choreo.mjs's camera-coverage-floor): one model of "when is the camera moving", not two.
  const CAM_POSE_KEYS = ['x', 'y', 's', 'rx', 'ry', 'roll', 'z'];
  const cameraLegSpans = [];
  for (let k = 0; k < camKfs.length - 1; k++) {
    const a = camKfs[k], b = camKfs[k + 1];
    if (CAM_POSE_KEYS.some((p) => a[p] != null && b[p] != null && a[p] !== b[p])) {
      cameraLegSpans.push([num(a.t, 0), num(b.t, 0)]);
    }
  }
  // Exported as a FUNCTION, not only the cut-segmented array below, because a film with no cuts (a
  // continuous camera move, like a whole `flow-seam` film) has exactly one scene-timing beat but nine
  // STORYBOARD beats, and it is the storyboard's beats a caller usually wants this measured against.
  const beatMotionAt = (start, end) => {
    const active = content.filter((_, idx) => contentSpans[idx][0] < end && contentSpans[idx][1] > start);
    const kinds = new Set();
    // ONE ENTRY PER MOTION INSTANCE, duplicates kept: two things starting on the same frame is an
    // offset of ZERO, a real fact about the beat, not a start time to collapse away. A Set here would
    // silently erase the "everything fires at once" case this measurement exists to catch.
    const starts = [];
    for (const L of active) {
      const ch = varyingChannels(L);
      for (const c of ch) kinds.add(c);
      if (ch.size) starts.push(num(L.start, 0));
    }
    // a camera leg overlapping this window.
    for (const [ls, le] of cameraLegSpans) {
      if (ls >= end || le <= start) continue;
      kinds.add('camera'); starts.push(ls);
    }
    for (const r of rawRecipes) {
      const at = num(r.at, num(r.from, null));
      if (at != null && at >= start && at < end) { kinds.add('recipe'); starts.push(at); }
    }
    const sortedStarts = starts.sort((a, b) => a - b);
    const offsets = sortedStarts.slice(1).map((t, i2) => +(t - sortedStarts[i2]).toFixed(3));
    return { start, end, kinds: [...kinds], count: kinds.size, offsets };
  };
  const beatEnds = [...cutTimes, duration];
  const beatMotion = edges.map((start, i) => ({ index: i, ...beatMotionAt(start, beatEnds[i]) }));

  // THE CAMERA HOLDS ITS END POSE (OWNER'S DECISION, skills/vawe-camera/SKILL.md): `cameraAt` holds the
  // last keyframe past its own window, by design, for every render. This is the scene-side twin of
  // contract.mjs's `cameraStillHeldWarnings`: it reads the BAKED camera (`d.camera`, already resolved
  // from every `cameraMove`/recipe leg) rather than re-parsing the plan, so it catches whatever actually
  // reached the JSON, including a hand-authored `camera[]` array the plan-side gate never sees.
  const FULL_FRAME_SHARE = 0.8;
  const REST_S_EPS = 0.02, REST_PX_EPS = 1, REST_DEG_EPS = 1;
  const restCam = (c) => !c || (Math.abs(c.s - 1) < REST_S_EPS && Math.abs(c.x) < REST_PX_EPS && Math.abs(c.y) < REST_PX_EPS
    && Math.abs(c.rx) < REST_DEG_EPS && Math.abs(c.ry) < REST_DEG_EPS && Math.abs(c.roll) < REST_DEG_EPS);
  /** cameraStillHeldAt(start, end) -> {pose, legEndT, layer} | null. `start` is a beat's own start
   * (the pose the camera actually sits at when that beat begins): away from rest, held there since a
   * LEG THAT ALREADY ENDED (never one still live across `start`, which is ordinary motion, not a hold),
   * and this beat's own content fills the frame (a beat that itself frames a close/tight shot is not
   * misled by an inherited push, it may well be using it). */
  const cameraStillHeldAt = (start, end) => {
    if (!camKfs.length) return null;
    const maxT = Math.max(...camKfs.map((k) => num(k.t, 0)));
    if (start < maxT - EPS) return null;                 // still inside a live leg
    const pose = cameraAt(d.camera, start);
    if (restCam(pose)) return null;
    const active = content.filter((_, idx) => contentSpans[idx][0] <= start + EPS && contentSpans[idx][1] > start);
    const full = active.find((L) => canvasShare(L, CANVAS_W, CANVAS_H).share >= FULL_FRAME_SHARE);
    if (!full) return null;
    return { pose, legEndT: maxT, layer: full.id || full.type || 'layer' };
  };

  // HANDOFFS. Declared ones (flow-seam's out/in) are exact. Everything else is measured: an exit
  // ending within HANDOFF_WINDOW of another layer's entrance, in the SAME screen region. The window is
  // not an imported UI number; it is this film's own declared handoffs, which land at 0s gap by
  // construction (a flow-seam boundary IS the shared instant), widened to half a motion-floor window
  // (0.25s) so an entrance a few frames early or late still counts as the same handoff, not a miss.
  const HANDOFF_WINDOW = 0.25;
  const rectOf = (L) => {
    const b = boxOf(L);
    if (!b.w || !b.h) return null;
    return { x: num(L.x, (CANVAS_W - b.w) / 2), y: num(L.y, (CANVAS_H - b.h) / 2), w: b.w, h: b.h };
  };
  const sameRegion = (a, b) => {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };
  const byId = new Map(lives.map((L) => [L.id, L]));
  const handoffs = [];
  const covered = new Set(); // "fromId>toId" pairs already accounted for, declared or found
  for (const [outId, inId] of becomesMap) {
    const from = byId.get(outId), to = byId.get(inId);
    if (!from?.exit || !to) continue;
    handoffs.push({ from: outId, to: inId, gap: +(to.enter.start - from.exit.end).toFixed(3), declared: true });
    covered.add(`${outId}>${inId}`);
  }
  const layerById = new Map(content.map((L, idx) => [lives[idx].id, L]));
  for (const from of lives) {
    if (!from.exit) continue;
    for (const to of lives) {
      if (to === from || covered.has(`${from.id}>${to.id}`)) continue;
      const gap = to.enter.start - from.exit.end;
      if (Math.abs(gap) > HANDOFF_WINDOW) continue;
      if (!sameRegion(rectOf(layerById.get(from.id)), rectOf(layerById.get(to.id)))) continue;
      handoffs.push({ from: from.id, to: to.id, gap: +gap.toFixed(3), declared: false });
      covered.add(`${from.id}>${to.id}`);
    }
  }

  // `scene` is the LOWERED clone. A gate that reads `d.cuts` off its own copy is reading the authored
  // surface, not the rendered one; this is the same scene with the sugar already expanded.
  return {
    scene: d, layers, content, spans, contentSpans, allSpans, duration, lastEnd, cutTimes, cutDurAt, edges,
    sceneUnits, choreographed, unitCut, unitEnd, canvas: [CANVAS_W, CANVAS_H],
    lives, beatMotion, beatMotionAt, handoffs, cameraStillHeldAt, cameraLegSpans,
  };
}
