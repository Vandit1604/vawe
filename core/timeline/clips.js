// core/clips.js: declarative composition layer (another engine parity):
//   • data-attribute timing/tracks   (data-start / data-duration / data-track / data-anim / data-out)
//   • a seekable animation-adapter interface (WAAPI + registered/GSAP paused timelines)
// Both are PURE in the time input: driveClips(clips, t) is a deterministic function of t; seeking a
// paused timeline to t is deterministic. This lets a scene be authored declaratively (fill HTML with
// timed clips) OR bring its own animation runtime, exactly like another engine' adapter model.
import { clamp01, easeOutCubic, defocus, rise, fade, pop, lift, slide, wipe, circleWipe, clockWipe,
  anticipateEase, overshootEase, stepClock, FPS } from '../motion/motion.js';
import { defineRegistry } from '../registry/registry.js';

// enter/exit animation registry: data-anim / data-out name → (t)=>styleObject.
// Exported so `make lib-test` can hold the DIRECTION contract of each name as a pure assertion, a
// registry entry whose motion contradicts its own name is invisible to every gate that only counts
// names, and that is exactly how `wipe-right` revealed right-to-left for as long as it did.
export const ANIM = {
  // THE SECOND ARGUMENT IS THE ENTRANCE WARP (core/motion.js), and only the entries that pass it on
  // accept `anticipate` / `overshoot`. Both dials ARE the easing, so an entrance that moves nothing
  // through space (fade), leaves through focus (defocus) or uncovers a fixed edge (the wipes, iris,
  // clock) has nothing for them to bend. Those entries take one argument and WARPABLE below names the
  // ones that take two, so asking for a wind-up on a fade is refused rather than silently dropped.
  fade,
  up: (t, warp) => rise(t, 48, warp), rise: (t, warp) => rise(t, 48, warp),
  pop: (t, warp) => pop(t, 0.86, warp), scale: (t, warp) => pop(t, 0.86, warp),
  lift: (t, warp) => lift(t, { warp }),
  // WRAPPED, arity 1, deliberately. `defocus`, `iris` and `clock` all take a second positional or
  // options argument of their OWN (blur radius, iris centre), and the second argument of an ANIM entry
  // is now the entrance warp. Naming them bare would hand the warp to whichever slot happened to be
  // second: `iris: circleWipe` was doing exactly that, and read the warp as its `cx`.
  defocus: (t) => defocus(t),
  'slide-left': (t, warp) => slide(t, 'left', 60, warp), 'slide-right': (t, warp) => slide(t, 'right', 60, warp),
  'slide-up': (t, warp) => slide(t, 'up', 60, warp), 'slide-down': (t, warp) => slide(t, 'down', 60, warp),
  // WIPES ARE NAMED FOR THE EDGE THE REVEAL TRAVELS TOWARD. `wipe-right` grows rightward from the left
  // edge, `wipe-down` grows downward from the top, `wipe-up` grows upward from the bottom (the one a bar
  // chart wants). Plain `wipe` is the default direction, rightward, the same function as `wipe-right`.
  //
  // core/motion.js `wipe(dir)` names its argument for the OPPOSITE thing: the edge the content is pinned
  // to while hidden, i.e. the edge it grows FROM. So every name here maps to the opposite direction, and
  // that is deliberate, not a typo. `wipe-right` used to be registered as `wipe(t,'right')` and therefore
  // revealed right-to-left, contradicting both its name and the comment that stood here, a layer wiped
  // the wrong way and nothing said so. The horizontal pair now follows the same rule as the vertical one.
  //
  // Pairing an exit: `out` plays an entrance BACKWARDS, so the exit that CONTINUES the travel is the
  // OPPOSITELY named one, exactly as with slide (`anim:"slide-right"` + `out:"slide-left"`):
  // `anim:"wipe-right"` + `out:"wipe-left"` reveals rightward, then erases rightward.
  wipe: (t) => wipe(t, 'left'),
  'wipe-right': (t) => wipe(t, 'left'), 'wipe-left': (t) => wipe(t, 'right'),
  'wipe-down': (t) => wipe(t, 'up'), 'wipe-up': (t) => wipe(t, 'down'),
  iris: (t) => circleWipe(t), clock: (t) => clockWipe(t),
  // `none` is a REAL entry, not a hole. The schema has always listed it for `anim`/`out`, but the
  // registry had no key for it, so resolveAnim fell through to fade: an author writing out:"none" to
  // stop a layer fading got the fade anyway, with nothing said. That is the silent-substitution class
  // this engine keeps paying for (MISTAKES #21). It is a no-op on BOTH halves, no transform here, and
  // no opacity ramp in driveClips below, so the layer simply appears and disappears at its window edges.
  // It still writes `transform: 'none'` because every anim owes the resting-key contract further down:
  // an entry that writes nothing leaves a transform from the OTHER half of the animation on the element,
  // and frames render out of order, so the leftover shows up as a render-order dependence (MISTAKES #41).
  none: () => ({ transform: 'none' }),
};
// Exported so the schema and the conformance sweep can DERIVE the valid names instead of restating
// them. A hand-copied list is how the schema came to advertise "slideL", an anim that never existed
// and therefore silently resolved to fade (MISTAKES #21).

// One line per enter/exit anim, beside the registry itself. docs/EFFECTS.md renders these, and
// quality/gates/lib-test.mjs fails when a name has no blurb, a name with no description is a
// vocabulary an author cannot choose from. The DIRECTIONS below are read off the registry above, not
// off the names: `slide-*` names the EDGE the layer travels from (and an `out` sends it back to that
// same edge), while `wipe-*` names the edge the reveal travels TOWARD. Those two conventions are
// opposite, they are both deliberate, and a blurb that guesses from the name gets one of them wrong.
export const ANIM_BLURBS = {
  fade: 'opacity only',
  up: 'translate up + fade in, the alias of `rise`',
  rise: 'translate up + fade in',
  pop: 'springs past its size and settles back, a small confident arrival for a chip, a badge or an icon',
  scale: 'punch in from small (overshoot)',
  lift: 'travels further than `pop` and settles alive, faces, avatars, a staggered row of cards',
  defocus: 'leave through blur (dense/faces)',
  'slide-left': 'enters from the left edge; as an `out`, leaves toward it',
  'slide-right': 'enters from the right edge; as an `out`, leaves toward it',
  'slide-up': 'enters from above; as an `out`, leaves upward',
  'slide-down': 'enters from below; as an `out`, leaves downward',
  wipe: 'clip reveal grows rightward. The default direction, same as `wipe-right`',
  'wipe-right': 'clip reveal grows rightward from the left edge',
  'wipe-left': 'clip reveal grows leftward from the right edge',
  'wipe-down': 'clip reveal grows downward from the top edge',
  'wipe-up': 'clip reveal grows upward from the bottom edge, so a column grows upward instead of appearing',
  iris: 'circular iris opens from the centre of the layer',
  clock: 'radial sweep from 12 o\'clock, clockwise',
  none: 'no move and no fade. The layer just appears at its window edges',
};

// Declared AFTER the blurbs so the registry can CARRY them. It used to sit above, so
// `defineRegistry` got `blurbs: null` and every reader that asks the registry what a name means
// got nothing, while the blurbs three lines below were rendered into docs and enforced by
// lib-test. Written and unread is the same as unwritten.
export const ANIM_REGISTRY = defineRegistry('anim', ANIM, { slot: 'anim', blurbs: ANIM_BLURBS,
  catalog: {
    title: 'Enter / exit anims',
    tag: 'per-layer',
    intro: '`anim` (enter) + `out` (exit) on any layer. Entrances decelerate, exits accelerate. `{ "anim":"rise", "out":"defocus" }`',
    usage: (n, { text }) => text({ anim: n, enterDur: 0.6, out: 'defocus' }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, anim: n, enterDur: 0.8, out: n, exitDur: 0.8, start: 0.4, duration: 5 }] }),
  },
});
export const ANIM_NAMES = ANIM_REGISTRY.names;

// The entrances that accept a WARP, and therefore the ones `anticipate` and `overshoot` are real on.
// Written out rather than probed, because a hand-written list of a registry's members is exactly what
// drifts here: `make lib-test` asserts this set is precisely the set of ANIM entries whose output
// actually CHANGES when a warp is handed to them, so a new entrance that threads one and is not named
// here fails the build, and a name here that quietly ignores the warp fails it too.
export const WARPABLE = Object.freeze(['up', 'rise', 'pop', 'scale', 'lift',
  'slide-left', 'slide-right', 'slide-up', 'slide-down']);

// The wind-up, in FRAMES, because that is the unit the recipe is stated in (2 to 4 at 24fps) and it is
// the unit that stays right when an author lengthens the entrance: a wind-up expressed as a fraction of
// the ramp would grow with it and stop reading as a flick.
const WINDUP_FRAMES = 3;

// entranceWarp(el, enterDur): the layer's two dials → one warp function, or null when it set neither.
// Read off the dataset like every other clip input, so clipStyleAt stays a pure function of t and of
// attributes written once at build (formats/scene/scene.js setLayerTiming).
export function entranceWarp(el, enterDur) {
  const aRaw = el.dataset.anticipate, oRaw = el.dataset.overshoot;
  if (aRaw == null && oRaw == null) return null;
  const anim = el.dataset.anim || 'none';
  if (!WARPABLE.includes(anim))
    throw new Error(`layer with anim "${anim}" sets ${aRaw != null ? '`anticipate`' : '`overshoot`'}, and `
      + `that entrance has no travel to bend: both dials ARE the easing of a move through space or scale. `
      + `They are real on: ${WARPABLE.join(', ')}. Change the anim, or drop the dial.`);
  const a = aRaw != null ? parseFloat(aRaw) : 0;
  const o = oRaw != null ? parseFloat(oRaw) : 0;
  // The main move: the anim's own curve, or an overshoot of the asked-for amount replacing it.
  const main = (own) => (o > 0 ? overshootEase(o) : own);
  if (!(a > 0)) return (own) => main(own);
  const windup = enterDur > 0 ? (WINDUP_FRAMES / FPS) / enterDur : 0.25;
  return (own) => anticipateEase(main(own), { amount: a, windup });
}

// Base enter/exit durations, in seconds. Snap band (0.2-0.3s): a default entrance that lands in ~a
// third of a second reads as directed; the old 0.45/0.4 read as floaty. Exported so scene.html can
// scale them by the theme's motion.durationScale from ONE source (no duplicated literal).
export const BASE_ENTER = 0.3, BASE_EXIT = 0.26;

// The two ramp lengths driveClips drives an element's entrance and exit from, read off the element
// itself. Exported because a second reader has appeared. The idle track needs the SETTLED MIDDLE, and
// the settled middle is defined as "not either of these". Re-deriving them there would be two copies of
// the defaulting rule, and the copy that goes stale is invisible until an entrance and an idle overlap.
// Two functions rather than one returning a pair: this runs for every clip on every frame, and an
// object literal here is an allocation the render pays ~50,000 times a minute of video.
export const enterDurOf = (el) => (el.dataset.enter != null ? parseFloat(el.dataset.enter) : BASE_ENTER);
// NO DEFAULT FADE-OUT (docs/MISTAKES.md, "four hands on one layer's life"). formats/scene/scene.js
// (setLayerTiming) only writes `data-exitDur` for a layer that named an `out`, or one that named
// `exitDur` itself; a layer with neither holds to its own end. If this function still handed back
// BASE_EXIT whenever the attribute was absent, that silence would have been undone right here: the
// one write site would have stopped authoring the fade and the one read site would have kept
// inventing it anyway. `out` is the signal, read directly rather than trusting the attribute alone,
// so a caller that builds a clip by hand (no scene.js in the loop) gets the same rule for free.
export const exitDurOf = (el) => (el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : el.dataset.out ? BASE_EXIT : 0);

/**
 * The opacity envelope every layer fades through. Eased, and MIRRORED: the exit curve is the
 * complement of the entrance curve, so two layers handing over the same pixels sum to exactly 1.
 * Independent ease-out/ease-in curves both sit high mid-blend (measured 1.71 across a real handoff)
 * and the dissolve goes muddy. Pure, and exported so `make lib-test` can hold both properties.
 */
export const opacityEnvelope = (enterT, exitT = 0) =>
  easeOutCubic(clamp01(enterT)) * (exitT > 0 ? 1 - easeOutCubic(clamp01(exitT)) : 1);
// Unknown names used to fall back to `fade` SILENTLY, and the comment here pointed at `make conformance`
// as the mitigation, but conformance asserts each anim is DISTINCT, which is a different property than
// "the name the author wrote exists". Five layers in three shipped scenes were silently fading because of
// it. Now it throws, and because three of those five were real names from a NEIGHBOURING registry, the
// error says where the name does live. See core/registry.js and docs/MISTAKES.md #355.
// ABSENCE and a WRONG NAME are different questions, and the old `ANIM[name] || fade` answered both with
// `fade`. A layer that declares no anim is simply PRESENT for its window (`none`, not `fade`, see
// `anim` default in formats/scene/scene.js `setLayerTiming`); a layer that names one the engine does
// not have is a mistake. Splitting them is the whole point - and collapsing them is what let five
// layers in three shipped scenes ask for an entrance that does not exist and get a cross-fade instead.
const resolveAnim = (name) => (name == null ? ANIM.none : ANIM_REGISTRY.pick(name));
// invert an enter transition into an exit (reverse the progress: 1→hidden).
// Play an entrance BACKWARDS to make an exit: progress 1 (settled) -> 0 (offset/hidden).
// Takes exitT (0 at the start of the exit, 1 at the end), NOT exitMul, passing the already-inverted
// exitMul cancelled the inversion, so `out` ran the entrance FORWARDS: the layer teleported to its
// offset the instant the exit began and then slid home while fading. Every directional exit in the
// engine was backwards (MISTAKES #40).
const asExit = (fn, exitT) => fn(1 - clamp01(exitT));
// ASEXIT ALREADY OBEYS docs/RULES/ease-direction.md FOR EVERY `anim`/`out` PAIR, structurally, with no
// second curve to author: every ANIM entry decelerates INTO t=1 (an ease-out settle), and sampling that
// same curve at a linearly DECREASING argument does not just walk it backwards, it inverts which half of
// the curve is slow. The settle (low slope, near t=1) lands at the START of the exit and the departure
// (high slope, near t=0) lands at its END, so the exit reads as accelerating even though no ease-in
// function was ever written. The rule's remaining gap is the hand-keyed `motion[]` track, where a
// segment's default ease is picked with no notion of entrance/exit/handover; that default lives in
// core/timeline/sequence.js, outside this file.

// collectClips(root): the FIXED set of timed elements a scene drives, taken ONCE when the scene has
// finished building. driveClips used to run this query itself, on every frame, 780 attribute-selector
// tree walks per render for a set that cannot change after build.
//
// The cost was the smaller half. A live query means driveClips operates on whatever is in the DOM at
// the instant it runs, so anything that adds or removes a `[data-start]` element mid-render changes
// what frame N renders and nothing says so. The header of this file claims driveClips is a pure
// function of t, and a live query is the one line in it that was not. It is the same shape as the
// off-window branch below (MISTAKES #41): a style that depended on which frame a worker happened to
// render first. Frozen because the array is the scene's timing contract, not a scratch list.
//
// NOTHING in this engine legitimately adds a clip after build, and that is a checked claim, not an
// assumption: every writer of `dataset.start` runs at build time (formats/scene/scene.js
// `setLayerTiming` for a top-level layer, core/layers/util.js `addGroupChild` for a group child). If a
// future feature ever does need to add one. A beat materialised mid-film, a lazily built sub-scene.
// It must call collectClips again and hand driveClips the new array, rather than reinstating the live
// query. Re-collecting is an explicit build-time act; a live query is an invisible per-frame one.
export function collectClips(root) {
  return Object.freeze([...root.querySelectorAll('[data-start]')]);
}

// EL.STYLE.TRANSFORM IS AN ACCUMULATOR, SO SOMEBODY HAS TO EMPTY IT. Four tracks PREPEND to it
// (react, follow, motion, idle: the `accumulate` list in docs/CODEMAPS/ARCHITECTURE.md), each reading
// back what is already on the element and composing onto it. That is only safe if the element starts
// every frame clean, and it did not: `restingKeys` clears a property only when one of the layer's OWN
// anims writes it, so a layer whose entrance is `wipe`, `iris` or `clock` (all clipPath, no transform)
// never had its transform reset, and each frame composed onto the string left by whichever frame a
// worker rendered before. Order-dependent by construction, which is the one thing renderFrame(n)
// promises it is not.
//
// It surfaced the moment a second accumulator ran on such a layer: turning the idle default on
// quarantined `linear-agents`, whose `wipe-right` rect also carries a keyed motion track, at
// scale 0.9897 forwards and 0.9694 backwards. The bug was older than the idle; the idle only gave it
// a second voice loud enough to hear.
//
// Transform is the ONE property with this shape, because it is the one every compositing track shares,
// so it is reset unconditionally rather than left to the anim registry. Any anim that does write a
// transform still wins: this spreads first, and `restingKeys` and the composed style spread after it.
const TF_RESET = Object.freeze({ transform: 'none' });

// clipStyleAt(el, t): the composition itself, as a VALUE. A clip is visible on
// [start, start+duration); it plays data-anim on entry and data-out (or a plain fade) on exit.
// z-order comes from data-track. Off-window clips are fully transparent (layout preserved → pure).
//
// It returns the complete style rather than writing one, so the engine can be ASKED what a layer looks
// like at any t without drawing that t. Reading it back off el.style is not the same question: an
// element carries one pose at a time, and asking for a second one would mean rendering a frame nobody
// wants. Anything that reasons ABOUT motion (a ghost that needs the pose an entrance ago, a cut that
// reads how fast the outgoing layer was travelling) needs the pose at two times at once.
//
// PURE: reads only el.dataset, which is written at build time (formats/scene/scene.js `setLayerTiming`,
// core/layers/util.js `addGroupChild`), and writes nothing.
export function clipStyleAt(el, t) {
  const start = parseFloat(el.dataset.start) || 0;
  // ANIMATE ON TWOS. `step` quantises this layer's own clock, and it has to happen HERE as well as in
  // the track pipeline, because the entrance is composed by this function and not by a track. Anchored
  // on the layer's start so its first frame is exact rather than half a step early.
  if (el.dataset.step != null) t = stepClock(t, parseFloat(el.dataset.step), start);
  const dur = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
  const end = start + dur;
  const enterDur = enterDurOf(el);
  const exitDur = exitDurOf(el);
  // zIndex only when the layer declares a track, so a layer that does not is left at whatever the
  // stylesheet gave it. Including the key unconditionally would write the string "undefined".
  const z = el.dataset.track != null ? { zIndex: el.dataset.track } : {};

  // OFF-WINDOW MUST BE A STATE, NOT AN ABSENCE. This branch used to zero opacity and `continue`,
  // leaving every OTHER property exactly as the previously-rendered frame wrote it, so an off-window
  // clip's transform was a function of which frame a worker happened to render before this one, which
  // is the one thing renderFrame(n) promises it is not.
  //
  // It hid because opacity 0 makes it invisible. It surfaced through geometry: getBoundingClientRect
  // on a CHILD includes its ancestors' transforms, so the two text nodes inside a not-yet-entered
  // `rise` group reported y 418.7 rendering forwards and 454.3 rendering backwards, the rise
  // distance, stuck. Two scenes were quarantined by the determinism net for it, and a quarantined
  // scene gets no regression baseline, so the files carrying the bug were also the files with no
  // protection against the next one.
  //
  // The resting set is the same one the in-window path composes for the same reason (MISTAKES #41):
  // only the layer's OWN anims contribute keys, so an authored look on a property nothing animates is
  // left alone. Writing it here costs nothing visible (the element is transparent) and makes the
  // whole style a pure function of t.
  if (t < start || t >= end) {
    const off = el.dataset.out ? resolveAnim(el.dataset.out) : null;
    return { ...z, ...TF_RESET, ...(off ? off(1) : {}), ...resolveAnim(el.dataset.anim)(1), opacity: '0', pointerEvents: 'none' };
  }
  const enterT = enterDur > 0 ? clamp01((t - start) / enterDur) : 1;
  // The warp bends the ENTRANCE only. An exit plays an entrance backwards, and a wind-up on the way out
  // is the enter-and-retreat the house rules already refuse; an overshoot on an exit is a layer that
  // leaves and comes back to say goodbye.
  let s = resolveAnim(el.dataset.anim)(enterT, entranceWarp(el, enterDur)), exitT = 0;
  if (Number.isFinite(end)) {
    exitT = exitDur > 0 ? clamp01((t - (end - exitDur)) / exitDur) : 0;
    // DEFAULT exit = a calm fade in place (element stays at rest, only opacity drops). A moving exit
    // that reverses the enter on EVERY layer reads as too much motion once cuts/ken are also going.
    // Opt into a motion-out explicitly with `out` (e.g. out:"rush"/"slide") when a beat wants it.
    if (exitT > 0 && el.dataset.out) s = asExit(resolveAnim(el.dataset.out), exitT);
  }
  // Clear what the OTHER animation could have written before applying this one. Entrances and
  // exits write different CSS properties, `defocus` writes filter, `wipe` writes clipPath, `rise`
  // writes only transform, so a property set during an exit was never cleared by the entrance and
  // STUCK. Frames render out of order across workers, so "a later frame" is not "after": a frame
  // that had rendered clean alone came back blurred once an exit frame had run. cutStyle has always
  // returned its full style set for exactly this reason; the anim registry had no such contract.
  // Only the layer's OWN anims contribute keys, so an authored `filter` look on a layer that does
  // not animate filter is left alone. (MISTAKES #41)
  const outFn = el.dataset.out ? resolveAnim(el.dataset.out) : null;
  const restingKeys = { ...(outFn ? outFn(1) : {}), ...resolveAnim(el.dataset.anim)(1) };

  // compose: apply enter (or exit) transform/clip + fade by the combined opacity.
  // The opacity envelope is EASED, not linear. This line used to multiply two linear ramps while
  // the transform beside it was eased (`rise` settles on easeOutSettle), so the two halves of a
  // single entrance arrived on different curves. The thing you feel as "the easing is off"
  // without being able to point at it. docs/MOTION-CRAFT.md has said "entrances decelerate, exits
  // accelerate, never linear on visible moves" the whole time; the engine just did not do it.
  //
  // The exit is the MIRROR of the entrance curve, not an independent one. That matters because two
  // layers handing over share the same pixels: with independent ease-out/ease-in curves both sit
  // high through the middle of the blend (measured sum 1.71 across tpot's This handoff) and the
  // dissolve turns muddy. The very problem the reel was repaced to avoid. Mirrored curves sum to
  // exactly 1 for any matched handoff, while a solo fade still eases instead of ramping linearly.
  // multiply in the authored base opacity, so `opacity: 0.4` dims the layer for its whole life
  // without fighting the entrance/exit fade that shares this property
  const base = el.dataset.opacity != null ? parseFloat(el.dataset.opacity) : 1;
  // The `none` half opts OUT of the envelope, not just out of the transform. Opacity is written here,
  // outside the anim registry, so a style-only no-op would still have faded, the author would have
  // removed the move and kept the very thing they asked to stop. It is LAST in the object so it wins
  // over the `opacity` key `fade`/`rise`/`pop` put in the composed style.
  const fadeInT = el.dataset.anim === 'none' ? 1 : enterT;
  const fadeOutT = el.dataset.out === 'none' ? 0 : exitT;
  return { ...z, pointerEvents: '', ...TF_RESET, ...restingKeys, ...s,
    opacity: String((opacityEnvelope(fadeInT, fadeOutT) * base).toFixed(3)) };
}

// driveClips(clips, t): position every clip in time, clipStyleAt, performed.
export function driveClips(clips, t) {
  for (const el of clips) Object.assign(el.style, clipStyleAt(el, t));
}

// ---------- animation-adapter interface ----------
// A scene may `registerTimeline(tl)` any object with a seek(seconds) method (GSAP paused timelines,
// custom runtimes). seekAll(t) also drives paused WAAPI animations. Called by the engine each frame.
export function registerTimeline(tl) {
  (window.__timelines || (window.__timelines = [])).push(tl);
}
export function seekAll(t) {
  // registered / GSAP-style paused timelines
  for (const tl of window.__timelines || []) {
    if (typeof tl?.seek === 'function') tl.seek(t);
    else if (typeof tl?.time === 'function') tl.time(t);
    else if (typeof tl?.progress === 'function' && typeof tl.duration === 'function') tl.progress(tl.duration() ? clamp01(t / tl.duration()) : 0);
  }
  // GSAP global timeline, if present and paused
  if (window.gsap?.globalTimeline) { try { window.gsap.globalTimeline.pause(); window.gsap.globalTimeline.time(t); } catch (e) {} }
  // paused WAAPI animations → deterministic currentTime
  if (typeof document.getAnimations === 'function') {
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t * 1000; } catch (e) {} }
  }
}
