// core/effector.js: a FALLOFF from a travelling point, driving many clones at once.
//
// WHAT IT IS FOR. The engine could already say "these N things arrive one after another": that is a
// stagger, and `parts` (core/parts.js) and the split-text track both spend one. A stagger can only
// express a ONE-DIMENSIONAL order, the order the elements happen to sit in the DOM. An effector
// expresses DISTANCE, in two dimensions, from a point that moves. The same rig therefore gives a wave
// across a row, a ripple out of a centre and a stroke painted across a grid, and the only thing that
// changes between the three is where the point goes (docs/CRAFT/AE-TECHNIQUES.md #4).
//
// NO KEYFRAME LANDS ON ANY CLONE. One point is keyed and the falloff is the whole choreography. That
// is the part worth holding on to when reading this file: nothing here schedules anything.
//
// THE POINT'S PATH IS A `motion` TRACK, not a second key format. `motionAt` (core/sequence.js) already
// owns "a list of {t,x,y,ease} keys, interpolated", including `ease: "through"`, so an effector path is
// keyed with exactly the syntax an author already writes on a layer. One fact, one owner.
//
// STICKY IS THE WHOLE FEATURE, and it is why this is not a moving highlight. Without it a clone
// returns to rest the instant the point leaves its radius, and what you see is a bright spot sliding
// about. With a sticky delay the clone HOLDS what the pass did to it and releases over that delay, so
// the point paints a trail behind itself. The source states 1 second, which is a very long time in a
// 30fps film and is the number that makes the difference visible at all.
//
// PURE IN t. The trail is not accumulated between frames: it is recomputed at every visit by looking
// BACKWARD along the point's own path, which is itself a pure function of time. A backward seek and a
// cold DOM therefore give the same answer as a forward render, the argument core/sequence.js already
// makes for velocityAt.
import { defineRegistry } from '../registry/registry.js';
import { motionAt } from '../timeline/sequence.js';
import { resolveEasing, springEase } from './motion.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---- FALLOFF: normalised distance r (0 at the point, 1 at the radius) -> influence in [0,1] -------
// Every one of these is 1 at r=0 and 0 at r>=1. That contract is what lets `radius` mean the same
// thing whichever shape is named, and lib-test asserts it.
export const FALLOFFS = {
  linear: (r) => 1 - r,
  // The one to reach for. Flat at both ends, so a clone eases into the field and out of it instead of
  // starting to move the instant the radius touches it.
  smooth: (r) => 1 - (r * r * (3 - 2 * r)),
  // A dome: full influence is held much closer to the point and then falls off a cliff. This is the
  // shape that reads as a physical object passing under the grid rather than as a gradient over it.
  sphere: (r) => Math.sqrt(Math.max(0, 1 - r * r)),
  // No falloff at all: inside the radius or outside it. For a hard-edged pass across the clones,
  // which is the effector's answer to smoothness 0 on a range selector (core/type.js).
  step: () => 1,
};

// EVERY BLURB SAYS WHAT THE FAMILY IS FOR, not just how its own curve bends, because a blurb is the
// only text `make arsenal` searches (harness/author/arsenal.mjs ranks name + kind + blurb, nothing
// else). These four described a CURVE and never said "elements react to a moving point by distance",
// so that exact question returned NOTHING HERE CLEARLY MATCHES over the family that answers it, and
// offered a three.js point cloud instead. A capability nobody can find is a capability nobody has.
export const FALLOFF_BLURBS = {
  linear: 'proximity: each element reacts by its DISTANCE from the moving point, straight from full at the point to nothing at the radius. The plain ramp',
  smooth: 'proximity by distance from a moving point, on a smoothstep: flat at both ends, so an element eases into the point\'s reach and out of it. The default',
  sphere: 'proximity by distance, as a dome: elements near the moving point react fully, then a cliff. Reads as an object passing beneath them',
  step: 'no falloff: an element reacts fully inside the moving point\'s radius and not at all outside. A hard-edged pass, hover-like',
};

export const FALLOFF_REGISTRY = defineRegistry('effector falloff', FALLOFFS, { slot: 'effector.falloff', blurbs: FALLOFF_BLURBS,
  catalog: {
    title: 'Effector falloffs',
    tag: 'per-layer',
    intro: 'A FALLOFF FROM A TRAVELLING POINT, driving the layer\'s own children. `effector: { select, path, radius, falloff, drives, sticky, overshoot }` on any layer with children. A stagger can only express the order the elements sit in; this expresses DISTANCE, in two dimensions, from a point that moves, so one rig gives a wave, a ripple out of a centre and a stroke painted across a grid, and only the point\'s path changes. `path` is a motion-key list ({t,x,y,ease}) in the layer\'s own coordinates, so it is keyed exactly like a `motion` track. NO KEYFRAME LANDS ON ANY CLONE. `sticky` (seconds) is what makes it a trail rather than a moving highlight: a clone HOLDS what the pass did to it and releases over that delay, and 1s is the value the technique is built on. These names are the shape of the falloff.',
    usage: (n, { j }) => j({ type: 'html', html: '<div data-clone>…</div>×64', x: 160, y: 140, w: 1600, effector: { select: '[data-clone]', falloff: n, radius: 320, sticky: 1, drives: { scale: 0.75 }, path: [{ t: 0, x: -220, y: 300 }, { t: 2.2, x: 1820, y: 300 }] } }),
    noPreview: "a falloff is the SHAPE of one point's reach, and it is invisible without the clones it acts on. Turn it on the playground's `effector` card, where the same grid is redrawn as you change it.",
  },
});
export const FALLOFF_NAMES = FALLOFF_REGISTRY.names;

// The properties an effector may drive, and what an amount of 1 means for each. Declared rather than
// inferred so a misspelt drive is refused by name instead of silently doing nothing, which is the
// failure shape this repo logs most.
export const DRIVES = {
  scale: 'what an element\'s proximity to the moving point is SPENT on: added to 1, so `scale: 0.6` swells a fully affected clone to 1.6',
  rotate: 'proximity spent on rotation, in degrees. `rotate: 25` turns a fully affected clone by 25',
  x: 'pixels, a sideways offset that does not depend on where the point is',
  y: 'pixels, the same on the other axis',
  push: 'pixels ALONG the vector from the point to the clone. Positive shoves clones away, negative pulls them in. The only drive that reads the direction as well as the distance',
  opacity: 'added to 1. `opacity: -0.7` dims a fully affected clone to 0.3',
};
// `slot` carries `{}`: the name is a KEY in that map, its value the amount.
// The entries ARE the descriptions, so they are the blurbs too: one map, one owner.
export const DRIVE_REGISTRY = defineRegistry('effector drive', DRIVES, { slot: 'effector.drives{}', blurbs: DRIVES,
  catalog: {
    title: 'Effector drives',
    tag: 'per-layer',
    intro: 'What an effector\'s influence is SPENT on: `drives: { scale: 0.6, push: 90 }`, where the number is the amount at full influence. `push` is the one a stagger cannot imitate, because it reads the direction from the point to the clone as well as the distance.',
    usage: (n, { j }) => j({ type: 'html', html: '<div data-clone>…</div>×64', x: 160, y: 140, w: 1600, effector: { select: '[data-clone]', drives: { [n]: 0.6 }, radius: 320, sticky: 1, path: [{ t: 0, x: -220, y: 300 }, { t: 2.2, x: 1820, y: 300 }] } }),
    noPreview: "a drive is what the influence is spent on, so it shows nothing without a falloff and a field of clones. The playground's `effector` card carries all six on one grid.",
  },
});
export const DRIVE_NAMES = DRIVE_REGISTRY.names;

/**
 * rawInfluence(cx, cy, kfs, s, radius, shape): what the point at time `s` does to a clone at (cx,cy),
 * plus the unit vector from the point to the clone. Returned together because `push` needs both and
 * re-deriving the direction would mean evaluating the path a second time.
 */
function rawInfluence(cx, cy, kfs, s, radius, shape) {
  const p = motionAt(kfs, s);
  const dx = cx - p.dx, dy = cy - p.dy;
  const d = Math.hypot(dx, dy);
  if (d >= radius) return { v: 0, ux: 0, uy: 0 };
  const v = clamp01(shape(d / radius));
  const inv = d > 1e-4 ? 1 / d : 0;
  return { v, ux: dx * inv, uy: dy * inv };
}

/**
 * effectorAt(cx, cy, kfs, t, opts): one clone's influence at local time `t`.
 *
 *   { v, ux, uy }   v in [0,1], or below 0 while an overshoot rings past rest, and the unit vector
 *                   from the point to the clone at the moment that influence was earned.
 *
 * opts: { radius, falloff, sticky, release, overshoot, step }
 *   sticky    seconds a clone holds what the pass did to it. 0 is a moving highlight, 1 is a trail.
 *   release   the easing the held value comes back to rest on. Ignored when overshoot is set.
 *   overshoot 0..1, how far past rest the clone rings on the way back. Uses the same closed-form
 *             spring the rest of the engine does, so "springy" means one thing here.
 *   step      seconds between backward samples. The caller passes 1/fps, so the trail is sampled at
 *             exactly the resolution the film is rendered at and no finer.
 *
 * THE MAX, not a sum. Two moments of the point's path may both reach one clone, and adding them would
 * make a slow pass hit harder than a fast one purely because it was sampled more often. The clone
 * takes the strongest thing that has happened to it inside the sticky window, which is also what
 * "hold what the pass did to it" means literally.
 */
export function effectorAt(cx, cy, kfs, t, { radius = 300, falloff = 'smooth', sticky = 0, release = 'linear', overshoot = 0, step = 1 / 30 } = {}) {
  if (!Array.isArray(kfs) || !kfs.length)
    throw new Error('effectorAt: the effector needs a path, a non-empty array of {t,x,y} keys. '
      + 'A point that never moves affects the same clones on every frame, which is a style rule, not an effector.');
  const shape = FALLOFF_REGISTRY.pick(falloff);
  const now = rawInfluence(cx, cy, kfs, t, radius, shape);
  if (!(sticky > 0)) return now;
  // decay(a): what is LEFT of an influence earned `a` of the way back through the sticky window. 1 at
  // a=0, 0 at a=1. With an overshoot it crosses below 0 on the way, which IS the clone travelling past
  // rest and coming back, and is the reason this is a spring rather than a curve with a dip drawn in.
  const curve = overshoot > 0
    ? springEase({ response: 0.5, dampingFraction: Math.max(0.2, 1 - clamp01(overshoot) * 0.75) })
    : resolveEasing(release);
  let best = now;
  // HOW MANY BACKWARD SAMPLES, and why the cap is a number rather than the honest `sticky / step`.
  // One sample per frame of the sticky window is what makes the trail land on the poses the pass
  // actually visited: fewer and the trail beads, because a clone between two samples is never
  // touched. 240 is eight seconds at 30fps and comfortably past any sticky an author would write
  // (the playground card's own dial tops out at 2). Above it the trail does not break, it stops
  // getting FINER: the window is still walked to `sticky` seconds back, in coarser steps, so a 20s
  // sticky would sample every 83ms and a clone could sit in a gap. The cap exists because this runs
  // per CLONE per frame: on the card's default 8x8 grid, n=240 would be 15,360 distance reads a
  // frame, and the cap is what stops a mistyped `sticky` turning a render into a stall.
  const n = Math.min(240, Math.max(1, Math.ceil(sticky / Math.max(step, 1e-4))));
  for (let i = 1; i <= n; i++) {
    const s = t - (i * sticky) / n;
    if (s < 0) break;
    const r = rawInfluence(cx, cy, kfs, s, radius, shape);
    if (r.v <= 0) continue;
    const v = r.v * (1 - curve(i / n));
    // MAGNITUDE, not value, and that is what makes the overshoot survive. With `overshoot > 0` the
    // spring curve crosses above 1, so `1 - curve()` goes NEGATIVE: the clone is past rest on its way
    // back. A plain `v > best.v` would discard exactly those samples and the overshoot would never
    // reach the frame, leaving a dial that reads as doing nothing.
    if (Math.abs(v) > Math.abs(best.v)) best = { v, ux: r.ux, uy: r.uy };
  }
  return best;
}

/**
 * effectorStyle(inf, drives): the influence, spent on the properties the author named.
 * Returns { transform, opacity } and `opacity` is null when no drive touched it, so a clone keeps
 * whatever opacity its own CSS gave it rather than being written to 1 every frame.
 */
export function effectorStyle(inf, drives) {
  let tx = 0, ty = 0, rot = 0, sc = 1, op = null;
  for (const [k, amount] of Object.entries(drives)) {
    DRIVE_REGISTRY.pick(k);
    const a = inf.v * amount;
    if (k === 'scale') sc += a;
    else if (k === 'rotate') rot += a;
    else if (k === 'x') tx += a;
    else if (k === 'y') ty += a;
    else if (k === 'push') { tx += inf.ux * a; ty += inf.uy * a; }
    else if (k === 'opacity') op = clamp01(1 + a);
  }
  const parts = [];
  if (tx || ty) parts.push(`translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`);
  if (rot) parts.push(`rotate(${rot.toFixed(2)}deg)`);
  if (sc !== 1) parts.push(`scale(${Math.max(0, sc).toFixed(4)})`);
  return { transform: parts.length ? parts.join(' ') : 'none', opacity: op };
}
