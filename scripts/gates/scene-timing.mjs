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
