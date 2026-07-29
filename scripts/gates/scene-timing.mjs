// scripts/gates/scene-timing.mjs — ONE model of when a scene's layers are actually on screen.
//
// A scene JSON does not say when its layers are visible. `start` + `duration` are what the AUTHOR wrote;
// the renderer then rewrites them. core/produce.js turns `sceneUnits` on for any cut film that is not
// already choreographed, and formats/scene/scene.js (setLayerTiming) then REPLACES every non-last-beat
// layer's duration with the run to `beatEnd + cutDur`, so the beat wrapper can slide the whole beat out
// as one unit. A gate that reads the raw fields sees holes the render does not have, and misses ones it
// does. beat-check learned that the expensive way (docs/MISTAKES.md #166) by modelling it inline.
//
// It lives here because a second gate now needs the same answer. Two copies of a model of someone else's
// code drift, and the copy that drifts is the one that stops catching the bug. Import it; do not fork it.
// If formats/scene/scene.js changes how it lowers timing, this file is the one place that follows.
//
//   import { sceneTiming } from './scene-timing.mjs';
//   const T = sceneTiming(sceneJson);
//   T.spans        // [[start, end], ...] for CONTENT layers, sorted, engine-corrected
//   T.allSpans     // the same for every top-level layer, blackouts and specks included
//   T.duration     // declared, else last end + a beat — the renderer's own rule
//   T.cutTimes     // sorted times of every real (style !== 'none') cut
//   T.sceneUnits   // whether the engine will wrap beats as units
//   T.edges        // [0, ...cutTimes] — the start of each beat
//   T.cutDurAt(t)  // the cut window that closes the beat at t
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneDims } from '../../core/safe.js';

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
// The tiers below are ordered by how much they KNOW, and the last two are the honest ones: `proxy`
// marks a guess as a guess, and `unknown` returns zero rather than inventing a size. An undeclared box
// is an unknown size, not a large one, so crediting it would let `{"type":"image","src":"x.png"}` buy a
// pass off nothing. Callers are expected to surface `how === 'unknown'` rather than silently skip it.
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

// THE PICTORIAL VOCABULARY — which layer types DEPICT and which merely DECORATE. It lives here, beside
// the geometry, because more than one gate needs it: `visual-vocabulary` asks whether a film shows
// anything, and `critique` asks whether a layer spanning the film is its subject or just wallpaper. Two
// copies of this list would eventually disagree about what a picture is.
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
  const w0 = num(L.w, null), h0 = num(L.h, null), sz = num(L.size, null);
  if (w0 != null && h0 != null) return { w: w0, h: h0, how: 'explicit' };
  const w = w0 ?? sz, h = h0 ?? sz;
  if (w != null && h != null) return { w, h, how: 'size' };
  const known = w ?? h;
  if (known == null) return { w: 0, h: 0, how: 'unknown' };
  const ar = intrinsicAspect(L.src, root);
  if (ar) return w != null ? { w, h: w / ar, how: 'intrinsic' } : { w: h * ar, h, how: 'intrinsic' };
  return { w: known, h: known, how: 'proxy' };
}

// the share of the canvas a layer actually covers. Clipped to the frame first: off-canvas pixels are
// not the subject, and clipping is what makes the `proxy` guess above safe to act on.
export function canvasShare(L, CW, CH, root = ROOT) {
  const b = boxOf(L, root);
  if (!b.w || !b.h) return { share: 0, how: b.how };
  const x = num(L.x, (CW - b.w) / 2), y = num(L.y, (CH - b.h) / 2);
  const vw = Math.max(0, Math.min(x + b.w, CW) - Math.max(x, 0));
  const vh = Math.max(0, Math.min(y + b.h, CH) - Math.max(y, 0));
  return { share: Math.min(1, (vw * vh) / (CW * CH)), how: b.how };
}

export function sceneTiming(d) {
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
  const unitEnd = (L) => {
    if (!sceneUnits || !cutTimes.length) return null;
    const start = num(L.start, 0);
    for (let i = 0; i < edges.length - 1; i++) {            // non-last beats only
      if (start >= edges[i] && start < cutTimes[i]) return cutTimes[i] + cutDurAt(cutTimes[i]);
    }
    return null;                                            // last beat: no exit cut, no extension
  };

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
  const correct = (list) => list.map((L) => { const [a, b] = spanOf(L); const u = unitEnd(L); return [a, u == null ? b : u]; })
    .sort((a, b) => a[0] - b[0]);
  const spans = correct(content);
  const allSpans = correct(layers);

  const lastEnd = spans.reduce((m, [, b]) => Math.max(m, b), 0);
  // same duration rule the renderer uses (formats/scene/scene.js): declared, else the last layer plus a beat.
  const duration = num(d.duration, 0) || +(lastEnd + 0.4).toFixed(2);

  return { layers, content, spans, allSpans, duration, lastEnd, cutTimes, cutDurAt, edges, sceneUnits, choreographed, unitEnd, canvas: [CANVAS_W, CANVAS_H] };
}
