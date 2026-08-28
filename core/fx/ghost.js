// core/fx/ghost.js: THE FIRST EFFECT IN THIS ENGINE THAT READS TIME AS A MATERIAL.
//
// Every one of the other 558 effects is a function of `t` evaluated once, at `t`. Not one of them ever
// asks where the layer WAS. This one does: it evaluates the layer's own motion track at t, and again at
// t minus a handful of frames, and draws from the difference. An echo trail is those past poses drawn as
// faded copies; a velocity blur is the same poses sampled inside a single frame so they read as a smear.
// ONE sampler, two presentations, because both answer the identical question and two owners of one fact
// is how this codebase drifts (docs/MISTAKES.md #423).
//
//   "modifiers": [{ "ghost": "trail" }]
//   "modifiers": [{ "ghost": { "mode": "blur", "k": 8 } }]
//
// WHY THIS IS SAFE HERE AND EXPENSIVE ELSEWHERE. Sampling an earlier frame is normally an accumulator,
// and an accumulator makes frame n a function of n AND of every frame drawn before it, exactly the bug
// that GSAP's `autoRemoveChildren` shipped into this engine (docs/MISTAKES.md #370), where a backward
// seek could not restore a tween the playhead had already passed. Nothing is remembered here. `motionAt`
// (core/sequence.js) is a pure function of local time, so the pose at n-k is COMPUTED from the same
// keyframes at every visit, in any order, from a cold DOM or a warm one. renderFrame(n) stays pure.
//
// WHY THE GHOSTS ARE CHILDREN OF THE LAYER, which is the decision the whole file turns on. A ghost drawn
// as a SIBLING would need the layer's FULL composed transform at t-k, the cut, the entrance, the motion
// track and the camera, recomposed outside the tracks that own them. That is a second owner of the
// composition, and core/fx/index.js already forbids a modifier from touching the composed transform for
// the same reason. As a CHILD, the ghost inherits everything the pipeline wrote to the layer this frame
// and only has to carry the DIFFERENCE between the pose now and the pose then, which is `M⁻¹·P` and is
// four numbers wide. Cut, entrance, ken burns, camera and lens all ride along for free.
//
// WHAT THAT COSTS, stated rather than hidden: the difference is exact wherever the layer's OWN entrance
// transform has settled (every anim resolves to its resting keys after `enterDur`, and most resting keys
// are `transform: none`). During the entrance ramp itself the inherited anim transform is not conjugated
// out, so a trail drawn across an entrance is approximate. Hand-keyed motion lives in the settled middle
// of a beat, which is where this is exact and where it is for.
//
// WHY IT NEEDS A `motion` TRACK AND SAYS SO. The past pose is read off the keys the author wrote. A layer
// with no motion track has no pose to look back at, and an effect that silently rendered nothing is the
// single most-logged bug class in this repo (#210 #213 #215 #217). It throws, naming the layer.
import { motionAt, poseBack } from '../sequence.js';
import { clamp01, FPS } from '../motion.js';

const MARK = 'data-ghost';

// Below this much separation between the pose now and the pose then, the ghost is sitting ON the layer
// and can only fatten it, which is what a trail on a STILL layer would be. The weight ramps in across
// it, so a stationary layer renders byte-identical to one carrying no ghost at all, and nobody has to
// remember to turn the effect off between moves.
const SEP_PX = 2;

// The two presentations, as two sets of defaults over one mechanism. `back` is the whole lookback window
// in SECONDS: a trail looks back six frames and spaces its copies one frame apart; a blur looks back one
// frame and spaces its copies inside it, which is what accumulation motion blur is.
const MODES = {
  trail: { k: 6, back: 6 / FPS, alpha: 0.5, fade: 0.6 },
  blur: { k: 6, back: 1 / FPS, alpha: 0.3, fade: 1 },
};
export const GHOST_KEYS = ['mode', 'k', 'back', 'alpha', 'fade'];

// K IS A DOM CLONE EACH, and a per-frame cost of k evaluations of the motion track plus k style writes.
// Twelve is the cap because past it the honest answer is a shader, not a stack of copies.
const K_MAX = 12;

// The surface a layer paints on its own element rather than in its markup. Matched against the
// LONGHANDS of the layer's own inline style, and read from there rather than from getComputedStyle:
// a layer is built DETACHED (formats/scene/scene.js `buildLayer` creates the element and appends it
// afterwards), so a computed style at build time answers with the initial value for everything. A
// shorthand written inline (`el.style.background = ...`) enumerates as its longhands, so nothing has
// to know which spelling the primitive used. `opacity` is excluded on purpose: the fade down the
// trail is the ghost's own.
const PAINT = /^(background-|border-|box-shadow$|outline-|backdrop-filter$)/;

const name = (L) => `"${L.id || L.type || 'layer'}"`;

function resolve(spec, L) {
  const s = spec === true ? { mode: 'trail' }
    : typeof spec === 'string' ? { mode: spec }
    : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`ghost on ${name(L)}: expected true, a mode name, or an object like `
      + `{ "mode": "trail", "k": 6 }. Got ${JSON.stringify(spec)}. Keys: ${GHOST_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!GHOST_KEYS.includes(k))
      throw new Error(`ghost on ${name(L)}: unknown key "${k}", known: ${GHOST_KEYS.join(', ')}.`);
  const mode = s.mode ?? 'trail';
  if (!MODES[mode])
    throw new Error(`ghost on ${name(L)}: unknown mode "${mode}", known: ${Object.keys(MODES).join(', ')}. `
      + `\`trail\` draws the past poses as faded copies; \`blur\` samples them inside one frame so they `
      + `smear along the direction of travel. Both read the same motion track.`);
  const out = { ...MODES[mode], ...s, mode };
  if (!Number.isInteger(out.k) || out.k < 1 || out.k > K_MAX)
    throw new Error(`ghost on ${name(L)}: \`k\` is the number of samples, a whole number from 1 to `
      + `${K_MAX}: got ${JSON.stringify(out.k)}. Each one is a copy of the layer in the DOM.`);
  for (const key of ['back', 'alpha', 'fade'])
    if (typeof out[key] !== 'number' || !Number.isFinite(out[key]) || out[key] <= 0)
      throw new Error(`ghost on ${name(L)}: \`${key}\` must be a positive number, got ${JSON.stringify(out[key])}.`);
  return out;
}

export function build(kit, el, L, spec) {
  const { k } = resolve(spec, L);
  if (!Array.isArray(L.motion) || !L.motion.length)
    throw new Error(`ghost on ${name(L)}: this layer has no \`motion\` track, so there is no earlier pose `
      + `to look back at and the effect would render nothing. Give the layer keyed motion, or drop the `
      + `modifier. An entrance is not motion the ghost can read: it is composed by the clip pipeline and `
      + `the ghost rides it rather than sampling it.`);
  // A CANVAS CANNOT BE CLONED, and this is also the answer to the WebGL context cap (core/webgl.js caps
  // near 16 and a film has already rendered blank for passing it). `cloneNode` on a canvas copies the
  // element and NOT its pixels, so a paint/shader/raymarch layer would trail six blank rectangles; and
  // the alternative, giving each ghost a live context, would spend k contexts per layer and blank the
  // film. Refused by name instead. Ghosts never allocate a GL context, so a scene may carry as many as
  // it likes.
  if (el.tagName === 'CANVAS' || el.querySelector('canvas'))
    throw new Error(`ghost on ${name(L)}: this layer draws into a <canvas>, whose pixels a clone does not `
      + `carry, so every copy would be blank. Trail the layer that CONTAINS the canvas instead, or put `
      + `the move on a layer that draws in the DOM.`);
  // The rotation and scale halves of the separation measure need a radius: turning a layer by a degree
  // displaces nothing at its centre and a great deal at its corner. Measured ONCE, here, because a
  // layout read per frame is both slow and a value that could change under a frame that never asked.
  const r = Math.hypot(el.offsetWidth || 0, el.offsetHeight || 0) / 2;
  el.dataset.ghostR = String(r > 1 ? r : 100);
  // Absolutely-positioned ghosts need a positioned layer to sit inside. Nearly every layer already is;
  // this covers the ones that are not, and it is a build-time write to a property no track owns.
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  if (cs && cs.position === 'static') el.style.position = 'relative';
  // A NEGATIVE z-index ONLY MEANS "behind the layer" INSIDE A STACKING CONTEXT THE LAYER OWNS, and the
  // layer owns one only on the frames its tracks happen to write a transform. Left to chance, a trail
  // would sit behind the whole stage on some frames and in front of the words on others. `isolate` makes
  // the context unconditional, at build, so every frame paints the same way.
  el.style.isolation = 'isolate';
  // Snapshot BEFORE inserting, or each ghost would carry the ghosts inserted before it.
  const inner = el.innerHTML;
  const first = el.firstChild;
  // WHAT THE LAYER PAINTS IS NOT IN ITS innerHTML. A rect's fill, a card's radius, a chip's border and
  // its shadow are all CSS on the layer ELEMENT, so a ghost cloning only the markup left a hollow
  // outline of a filled plate behind. For a `rect`, which carries no markup at all, it left
  // nothing and the effect rendered a silent no-op. Read the paint off the layer once, here, and hand
  // each echo the same surface.
  const paint = [];
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style.item(i);
    if (PAINT.test(prop)) paint.push([prop, el.style.getPropertyValue(prop)]);
  }
  for (let i = 0; i < k; i++) {
    const g = document.createElement('div');
    g.setAttribute(MARK, String(i));
    // Copies of the layer's own words are in the DOM now, so say they are not ink: an audit reading the
    // text would otherwise grade the film against seven overlapping headlines it invented itself.
    g.setAttribute('aria-hidden', 'true');
    g.setAttribute('data-ink', 'off');
    g.style.position = 'absolute';
    g.style.inset = '0';
    g.style.pointerEvents = 'none';
    g.style.opacity = '0';
    // DOM ORDER DOES NOT DECIDE THIS. An absolutely-positioned child paints in a later step of the
    // stacking algorithm than its parent's in-flow content, so `first` bought nothing: the trail was
    // drawn ON TOP of the very words it was trailing. A negative z-index is the one thing that puts a
    // positioned child under the layer's own content, and `isolation` above is what makes it hold.
    g.style.zIndex = '-1';
    g.style.boxSizing = 'border-box';
    for (const [prop, v] of paint) g.style.setProperty(prop, v);
    g.innerHTML = inner;
    el.insertBefore(g, first);
  }
}

export function frame(kit, el, L, t, scene, spec) {
  const { k, back, alpha, fade } = resolve(spec, L);
  const ghosts = el.querySelectorAll(`:scope > [${MARK}]`);
  if (!ghosts.length) return;
  const r = parseFloat(el.dataset.ghostR) || 100;
  // BEFORE FRAME 0 the sample is CLAMPED to the layer's own first pose, not extrapolated and not
  // skipped. A film that opens on a move therefore opens with its trail collapsed into the layer and
  // grows it as the move begins, because a thing that has not moved yet has left nothing behind. The
  // clamp is also what makes the first frames of a film identical with and without the modifier.
  const lt = Math.max(0, t - (L.start ?? 0));
  const m = motionAt(L.motion, lt);
  const step = back / k;
  for (let i = 0; i < k; i++) {
    // `poseBack` (core/sequence.js) is the shared lookback, the one `velocityAt` and squash read
    // through too. It carries the clamp this comment describes, so there is one owner of it.
    const p = poseBack(L.motion, lt, (i + 1) * step);
    // The ghost is a CHILD, so it already carries the layer's pose at t. Undo that and apply the pose at
    // t-k: G = M⁻¹·P, which in a CSS transform list reads left to right as rotate/scale undone, the
    // translation difference, then the past scale and rotation.
    ghosts[i].style.transform =
      `rotate(${(-m.rot).toFixed(3)}deg) scale(${(1 / m.scale).toFixed(5)}) `
      + `translate(${(p.dx - m.dx).toFixed(2)}px, ${(p.dy - m.dy).toFixed(2)}px) `
      + `scale(${p.scale.toFixed(5)}) rotate(${p.rot.toFixed(3)}deg)`;
    const sep = Math.hypot(p.dx - m.dx, p.dy - m.dy)
      + Math.abs(p.rot - m.rot) * (Math.PI / 180) * r
      + Math.abs(p.scale - m.scale) * r;
    ghosts[i].style.opacity = (alpha * Math.pow(fade, i) * clamp01(sep / SEP_PX)).toFixed(4);
  }
}
