// blueprints/beats-track.mjs: the KEYED-TRACK beats, harvested from formats/scene/higgsfield-recreation.json,
// the one film in this library where 75% of the layers carry a hand-written `motion` track (the median is 0).
//
// Both beats here are the mechanics of that film generalised, and neither can be reached from a preset:
// a preset animates ONE layer over ONE span with ONE curve, and what makes the exemplar read as a captured
// product film is the opposite of that. A track whose keys are irregular and whose interior is linear, and
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

// recordedPan: a surface WIDER THAN THE FRAME, panned on an irregular multi-key linear track, with
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

  const surface = surfaceLayer({ image, capture, html, w, h }, 'recordedPan');

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

// echoRing: a stroked ring that REPLAYS another layer's path one beat late, growing and fading as it
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

// ---- THE CAMERA-LED PAIR -------------------------------------------------------------------------
//
// Both were measured off the another engine reference library rather than invented, and both do a thing a
// preset cannot: `scrollStory` moves a surface's CONTENT while the frame stays put, and `focusRack`
// changes which PLANE is sharp without moving anything at all.

// The engine's own interpolator takes engine easing names (core/motion.js EASINGS); the craft notes for
// these two beats are written in GSAP's vocabulary, which is real here but only on GSAP-driven fields.
// Accepting both spellings costs three lines and saves an author a thrown error on the value the doc
// told them to use. GSAP powers are one off the obvious reading: power2 is cubic, power3 is quartic.
const GSAP_EASE_ALIAS = { 'power3.out': 'easeOutQuart', 'power2.inOut': 'easeInOutCubic', 'power2.out': 'easeOutCubic' };
const engineEase = (e) => GSAP_EASE_ALIAS[e] || e;

// The surface a pan or a scroll moves: a captured component, an image, or hand HTML. Precedence is
// stated rather than inferred, and an empty surface is refused, a blueprint that silently emits
// nothing is a black hole in a contact sheet with no error anywhere.
function surfaceLayer({ image, capture, html, w, h }, who) {
  if (html) return { type: 'html', html, w, ...(h != null ? { h } : {}) };
  if (capture) return { type: 'component', src: capture.src, ...(capture.part ? { part: capture.part } : {}), w };
  if (image) return { type: 'image', src: image, w, ...(h != null ? { h } : {}) };
  throw new Error(`${who} needs a surface: \`html\` (a string), \`capture\` ({src, part}) or \`image\` (a path).`);
}

// scrollStory: a surface TALLER than the frame whose content scrolls while the frame stays put, so the
// beat reads as a screen recording of somebody scrolling a page.
//
// What makes it read as a recording rather than as an animation, all of it measured:
//
//   1. THE TILT IS STATIC. tiltY ±4..12deg, tiltX 0..6, perspective 800..2000px, held for the whole
//      beat. A tilt that animates is a camera move, and a camera move over a scroll is two ideas at
//      once. The lean is a `tilt` modifier (core/fx/tilt.js), which is one shared camera, not a
//      per-layer fisheye. Pass `tilt: false` for a flat-on screen.
//   2. THE SHADOW LEANS THE SAME WAY. Its x-offset takes the SIGN of tiltY; point them opposite and the
//      plane stops reading as a plane. Written through `css` because the `shadow` modifier derives its
//      direction from `scene.lighting` and this one has to follow the tilt.
//   3. THE STOPS ARE ABSOLUTE, and they come from real cumulative section heights (`sections`), never
//      from a tunable travel distance. Every step gets a HOLD key at the value the previous step
//      finished on, so step A is over before step B starts. The interior can never cross-fade two
//      scrolls into one long drift.
//   4. ONE EASE ACROSS EVERY SCROLL. `power3.out` reads as a programmatic scroll (a wheel event landing);
//      `power2.inOut` reads as a camera pan. Mixing them inside one scene reads as jerky, so `ease` is a
//      single prop and every step takes it.
//
// The spotlight, when asked for, is a radial-gradient overlay ABOVE the content and fixed to the FRAME,
// not welded to the surface, and it fades in only once the last scroll has landed.
export function scrollStory({ id = 'scrollstory', image, capture, html, x = 0, y = 0, w = 1920, h,
  sections = [], stops, stepDur = 1.2, dwell = 0.5, lead = 0.35, leadY = 26, ease = 'power3.out',
  tilt, shadowBlur = 70, spotlight = false, spotlightDur = 0.6, riders = [],
  anim = 'fade', enterDur = 0.4, out = 'fade', exitDur = 0.25, start = 0, dur = 5 } = {}) {
  // Cumulative section heights → the absolute offset of each section's top. n sections make n-1 scrolls.
  const offs = Array.isArray(stops) && stops.length
    ? stops.slice()
    : sections.slice(0, -1).map(((sum) => (v) => (sum += v))(0));
  if (!offs.length) {
    throw new Error('scrollStory needs somewhere to scroll TO: pass `sections` (the real pixel height of '
      + 'each section of the surface, top to bottom) or `stops` (absolute offsets from the content '
      + 'origin). A scroll distance guessed as a tunable lands between two sections every time.');
  }
  for (let i = 0; i < offs.length; i++) {
    if (!(offs[i] > 0) || (i && offs[i] <= offs[i - 1])) {
      throw new Error(`scrollStory: stop ${i} is ${offs[i]}. Stops are ABSOLUTE distances from the content `
        + 'origin and must increase; a delta list read as absolutes scrolls backwards.');
    }
  }

  const E = engineEase(ease);
  const surface = surfaceLayer({ image, capture, html, w, h }, 'scrollStory');

  // The lead is a drift into place, so the first scroll never has a standing start. It is the only key
  // here on a curve of its own; every scroll takes `ease`, and every hold between them is linear.
  const motion = [{ t: 0, y: leadY }, { t: round(lead), y: 0, ease: 'easeInOutSine' }];
  let end = lead;
  offs.forEach((off, i) => {
    const from = round(lead + i * (stepDur + dwell));
    if (i) motion.push({ t: from, y: round(-offs[i - 1]), ease: 'linear' });
    end = round(from + stepDur);
    motion.push({ t: end, y: round(-off), ease: E });
  });
  if (end > dur + 1e-6) {
    throw new Error(`scrollStory: ${offs.length} scrolls run to ${end}s of a ${dur}s beat. Give the beat a `
      + 'longer `dur`, or a shorter `stepDur`/`dwell`/`lead`. A scroll cut off by its own layer ending '
      + 'stops mid-travel, which reads as a dropped frame.');
  }
  // Measured against the start of the beat's own EXIT, not against `dur`: a spotlight still fading in
  // while the surface under it fades out is a vignette nobody ever sees at full strength. Caught by
  // eye on the first probe, where the two ramps ran over each other and the frame read as empty.
  if (spotlight && dur - exitDur - end < spotlightDur - 1e-6) {
    throw new Error(`scrollStory: the spotlight has ${round(dur - exitDur - end)}s between the last scroll `
      + `landing and this beat's exit, and needs ${spotlightDur}s to fade in. Lengthen \`dur\`, or shorten `
      + '`spotlightDur` (0.4 to 0.8). A vignette that arrives during the exit is never seen.');
  }

  // NOT `tilt = {}` in the signature: expand-blocks reads a beat's accepted props off its source
  // with /\(\s*\{([^}]*)\}/, so the first `}` in the parameter list ends the list it knows about, and an
  // object default there makes every later prop report as ignored when the beat accepts it fine.
  const lean = tilt === false ? null : { y: -7, x: 2, dist: 1400, ...(tilt || {}) };
  const layers = [{
    ...surface, id, x, y, anim, enterDur, out, exitDur, start, duration: dur, motion,
    ...(lean ? {
      modifiers: [{ tilt: lean }],
      css: { boxShadow: `${Math.sign(lean.y || 1) * 30}px 36px ${shadowBlur}px rgba(12,14,20,0.30)` },
    } : {}),
  }];

  for (const r of riders) {
    const { delay = 0, ...layer } = r;
    layers.push({
      ...layer,
      panWith: id,
      start: start + delay,
      duration: layer.duration != null ? layer.duration : round(dur - delay),
    });
  }

  if (spotlight) {
    const k = typeof spotlight === 'number' ? spotlight : 1;
    layers.push({
      type: 'rect', x: 0, y: 0, w: 1920, h: 1080, radius: 0,
      bg: `radial-gradient(ellipse 60% 52% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,${round(0.34 * k)}) 62%,`
        + ` rgba(0,0,0,${round(0.62 * k)}) 100%)`,
      start: round(start + end), duration: round(dur - end),
      anim: 'fade', enterDur: spotlightDur, out: 'fade', exitDur,
    });
  }
  return layers;
}

// focusRack. A rack focus: one plane pulls sharp while the other goes soft. Depth of field, not a
// camera move, which is the distinction the whole beat turns on. The camera transforms the FRAME, so
// faking a rack with one is impossible by construction: the two planes have to disagree. So the blur
// lives on each layer's own `m.blur` channel (core/tracks/motion.js) and nothing here touches a camera.
//
//   · Blur 3..6px per depth step, and never past ~8 soft / 16 default / 24 heavy.
//   · THE SOFT PLANE ALSO DIMS, and the dim does half the work: 0.4 hard / 0.55 default / 0.7 subtle.
//     Modest blur plus a dim reads more like real depth of field than blur cranked to its cap. Below
//     0.35 the plane reads as REMOVED rather than defocused, so it is refused.
//   · Both tweens sit at the SAME position and duration on the same channel, so the exchange is one
//     event. The incoming plane is PRE-BLURRED from the first frame of the beat, because a plane that
//     starts sharp and blurs on the way to sharp pops.
//   · The focal plane ends genuinely sharp (blur 0, opacity 1) and sits LAST, above the soft ones.
//   · `settle` keeps sharp frames after the rack lands. Cutting away mid-defocus reads as a glitch.
//
// `sharp` and `soft` each take one layer or a list of them. Blur the small or grouped layers, never a
// full-frame one: the cost is radius x area, so a 1920-wide plane at 6px is the whole canvas rasterised
// through a filter on every frame.
export function focusRack({ sharp, soft, at = 0.9, rackDur = 0.7, blur = 5, dim = 0.55,
  ease = 'power2.inOut', settle = 0.3, start = 0, dur = 3 } = {}) {
  const near = [].concat(sharp || []), far = [].concat(soft || []);
  if (!near.length || !far.length) {
    throw new Error('focusRack needs both planes: `sharp` (what pulls INTO focus) and `soft` (what goes '
      + 'out of it). One plane defocusing alone is `out:"defocus"`, not a rack.');
  }
  if (!(dim >= 0.35)) {
    throw new Error(`focusRack: dim ${dim} reads as REMOVED, not defocused. Depth of field dims to about `
      + '0.4 (hard) / 0.55 (default) / 0.7 (subtle); below 0.35 the plane has left the shot.');
  }
  if (!(blur > 0) || blur > 24) {
    throw new Error(`focusRack: blur ${blur}px is outside 0..24. A depth step is 3..6px; 8 is soft, 16 is `
      + 'the usual maximum and 24 is heavy. Past that the plane is a smear and the dim is doing nothing.');
  }
  if (at + rackDur + settle > dur + 1e-6) {
    throw new Error(`focusRack: the rack lands at ${round(at + rackDur)}s and needs ${settle}s settled `
      + `after it, in a ${dur}s beat. Cutting away from a mid-defocus frame reads as a render glitch, so `
      + 'give the beat a longer `dur` or move `at` earlier.');
  }
  for (const L of far) {
    if ((L.w ?? 0) >= 1728) {
      throw new Error(`focusRack: the soft plane is ${L.w}px wide, near the full 1920 canvas. Blur cost is `
        + 'radius x AREA, so a full-frame plane rasterises the whole canvas through a filter every frame. '
        + 'Blur the small or grouped layers and let the backdrop carry the rest of the frame.');
    }
  }

  const E = engineEase(ease);
  const t1 = round(at), t2 = round(at + rackDur);
  const track = (from, to) => {
    const keys = [{ t: 0, blur: from.blur, opacity: from.opacity }];
    if (t1 > 0) keys.push({ t: t1, blur: from.blur, opacity: from.opacity, ease: 'linear' });
    keys.push({ t: t2, blur: to.blur, opacity: to.opacity, ease: E });
    return keys;
  };
  // The beat owns the clock, so a plane's own start/duration would desync its track from the exchange.
  const plane = (L, keys) => ({ ...L, start, duration: dur, motion: keys });

  return [
    ...far.map((L) => plane(L, track({ blur: 0, opacity: 1 }, { blur, opacity: dim }))),
    ...near.map((L) => plane(L, track({ blur, opacity: dim }, { blur: 0, opacity: 1 }))),
  ];
}

