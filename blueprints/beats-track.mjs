// blueprints/beats-track.mjs — the KEYED-TRACK beats, harvested from formats/scene/higgsfield-recreation.json,
// the one film in this library where 75% of the layers carry a hand-written `motion` track (the median is 0).
//
// Both beats here are the mechanics of that film generalised, and neither can be reached from a preset:
// a preset animates ONE layer over ONE span with ONE curve, and what makes the exemplar read as a captured
// product film is the opposite of that — a track whose keys are irregular and whose interior is linear, and
// several layers sharing it. docs/CRAFT/KEYED-MOTION.md carries the measurements this file is built from.
//
// Colours are semantic theme vars; coordinates are the 1920x1080 stage. Pure: props in, layers out.
import { INK } from './kit.mjs';
import { motionAt } from '../core/sequence.js';

// The scroll rhythm measured off `higgsfield-recreation` beat 2, normalised: [fraction of the pan's
// duration, fraction of its travel]. Nothing about it is regular, and that is the whole point. The gaps
// run 0.25, 0.16, 0.21, 0.21, 0.16 and the per-segment SPEED runs 1.03, 1.35, 1.29, 0.75, 0.59 of the
// average: the page surges, then gives up. Even keys with a curve over them read as an animation of a
// page; these read as somebody's hand.
export const SCROLL_RHYTHM = [[0.25, 0.258], [0.4125, 0.48], [0.625, 0.745], [0.8375, 0.903], [1, 1]];

// The bloom envelope of the exemplar's `ring`, normalised: [fraction of life, fraction of the growth,
// opacity]. It arrives almost instantly and leaves slowly, which is why it reads as a wake left behind
// rather than as a second object entering.
const RING_ENVELOPE = [[0, 0, 0], [0.08, 0.318, 0.85], [0.23, 0.4545, 0.9], [0.64, 0.745, 0.5], [1, 1, 0]];

const round = (v) => +v.toFixed(3);
const lerpAt = (rows, at, col) => {                   // piecewise-linear read of a normalised envelope
  if (at <= rows[0][0]) return rows[0][col];
  const last = rows[rows.length - 1];
  if (at >= last[0]) return last[col];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (at <= b[0]) return a[col] + (b[col] - a[col]) * (b[0] === a[0] ? 1 : (at - a[0]) / (b[0] - a[0]));
  }
  return last[col];
};

// recordedPan — a surface WIDER THAN THE FRAME, panned on an irregular multi-key linear track, with
// riders welded to that same track. Beat 2 of the exemplar.
//
// Two things make it read as a screen recording rather than as an animation, and both are props because
// both are the thing an author will want to change:
//
//   1. The KEYS ARE IRREGULAR (`rhythm`). A pan of two keys under one curve is a glide, and a glide is
//      right for a card arriving and wrong for a page a person is scrolling. The shape comes from where
//      the keys sit, not from a curve fitted over them, so the interior is `linear` throughout. Only the
//      settle before the scroll gets a curve (`easeInOutSine`), because that part really is a span.
//   2. The RIDERS ARE WELDED (`riders`). A cursor or a callout that merely fades over a moving page
//      floats above it and gives the trick away. Each rider gets `panWith`, so the engine copies this
//      surface's track as deltas from the rider's own origin and time-shifts it by the rider's start
//      (core/pan-resolve.mjs). A rider may still declare motion of its own: what it declares wins, which
//      is how a rider peels off the page and leaves.
//
// The surface is an image path, a captured component, or hand HTML. It must overflow the frame in the
// direction of travel; panning a surface that fits shows the void behind it.
export function recordedPan({ id = 'recpan', image, capture, html, x = 0, y = 0, w = 1920, h,
  travel = -600, lead = 30, leadDur = 0.45, hold = 0, panDur = 0.8, rhythm = SCROLL_RHYTHM,
  riders = [], anim = 'fade', enterDur = 0.3, out = 'fade', exitDur = 0.1, start = 0, dur = 3 } = {}) {
  const panAt = leadDur + hold;
  if (panAt + panDur > dur + 1e-6) {
    throw new Error(`recordedPan: the pan runs to ${round(panAt + panDur)}s of a ${dur}s beat. Give the beat `
      + 'a longer `dur`, or a shorter `leadDur`/`hold`/`panDur`. A pan cut off by its own layer ending '
      + 'stops mid-travel, which reads as a dropped frame.');
  }

  // The surface itself. Precedence is stated rather than inferred, and an empty beat is refused: a
  // blueprint that silently emits nothing is a black hole in a contact sheet with no error anywhere.
  let surface;
  if (html) surface = { type: 'html', html, w, ...(h != null ? { h } : {}) };
  else if (capture) surface = { type: 'component', src: capture.src, ...(capture.part ? { part: capture.part } : {}), w };
  else if (image) surface = { type: 'image', src: image, w, ...(h != null ? { h } : {}) };
  else throw new Error('recordedPan needs a surface: `html` (a string), `capture` ({src, part}) or `image` (a path).');

  // The lead is a drift into place, not part of the scroll: the page is already moving when the scroll
  // starts, so the scroll never has a standing start. It is the only key here that carries a curve.
  const motion = [{ t: 0, x: lead }, { t: round(panAt), x: 0, ease: 'easeInOutSine' }];
  for (const [at, p] of rhythm) motion.push({ t: round(panAt + at * panDur), x: round(travel * p), ease: 'linear' });

  const layers = [{ ...surface, id, x, y, anim, enterDur, out, exitDur, start, duration: dur, motion }];

  for (const r of riders) {
    const { delay = 0, ...layer } = r;
    layers.push({
      ...layer,
      panWith: id,
      start: start + delay,
      duration: layer.duration != null ? layer.duration : round(dur - delay),
    });
  }
  return layers;
}

// echoRing — a stroked ring that REPLAYS another layer's path one beat late, growing and fading as it
// goes. Beat 4 of the exemplar, where the generate button has become a dot and is about to expand.
//
// Its job is not decoration. A slow morph starves the eye: the subject is changing shape over most of a
// second and almost nothing MOVES, so the frame reads as stalled even though it is working. The echo
// supplies that motion by replaying where the subject just was, which is the one addition that cannot
// compete with the subject for attention, because it is only ever showing the past.
//
// It takes the `path` it echoes as a prop, so it hangs off any layer: pass that layer's `motion` track
// and the delay into it. Positions are read as DELTAS from the path's pose at `delay`, so the ring starts
// where you place it and then travels the same shape the subject travelled. Curves, not linear: the
// exemplar's ring is the deliberate opposite of its mechanical layers, 5 keys and every one cubic,
// because a bloom is physical and a cursor is not.
export function echoRing({ path = [], delay = 0, x = 750, y = 330, size = 420, color = INK,
  strokeWidth = 4, grow = [0.5, 1.6], peak = 0.9, ease = 'easeOutCubic', start = 0, dur = 0.66 } = {}) {
  const [from, to] = grow;
  const keys = Array.isArray(path) ? path.filter((k) => typeof k?.t === 'number') : [];
  const base = keys.length ? motionAt(keys, delay) : null;

  // Sample where the SOURCE turns as well as where the envelope does, so the echo keeps the shape of the
  // path instead of a straight line drawn between its endpoints.
  const times = new Set(RING_ENVELOPE.map(([at]) => round(at * dur)));
  const eased = new Map();
  for (const k of keys) {
    const t = round(k.t - delay);
    if (t > 0 && t < dur) { times.add(t); if (k.ease) eased.set(t, k.ease); }
  }

  const motion = [...times].sort((a, b) => a - b).map((t) => {
    const at = dur === 0 ? 1 : t / dur;
    const key = { t, scale: round(from + (to - from) * lerpAt(RING_ENVELOPE, at, 1)),
      opacity: round((peak / 0.9) * lerpAt(RING_ENVELOPE, at, 2)), ease: eased.get(t) || ease };
    if (base) {
      const p = motionAt(keys, delay + t);
      key.x = round(p.dx - base.dx);
      key.y = round(p.dy - base.dy);
    }
    return key;
  });

  return [{
    type: 'rect', x, y, w: size, h: size, radius: round(size / 2),
    bg: 'transparent', border: `${strokeWidth}px solid ${color}`,
    start, duration: dur, motion,
  }];
}
