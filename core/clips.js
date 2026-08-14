// core/clips.js — declarative composition layer (another engine parity):
//   • data-attribute timing/tracks   (data-start / data-duration / data-track / data-anim / data-out)
//   • a seekable animation-adapter interface (WAAPI + registered/GSAP paused timelines)
// Both are PURE in the time input: driveClips(root, t) is a deterministic function of t; seeking a
// paused timeline to t is deterministic. This lets a scene be authored declaratively (fill HTML with
// timed clips) OR bring its own animation runtime, exactly like another engine' adapter model.
import { clamp01, easeOutCubic, defocus, rise, fade, pop, lift, slide, wipe, circleWipe, clockWipe } from './motion.js';

// enter/exit animation registry: data-anim / data-out name → (t)=>styleObject.
// Exported so `make lib-test` can hold the DIRECTION contract of each name as a pure assertion — a
// registry entry whose motion contradicts its own name is invisible to every gate that only counts
// names, and that is exactly how `wipe-right` revealed right-to-left for as long as it did.
export const ANIM = {
  fade, up: rise, rise, pop, scale: pop, lift, defocus,
  'slide-left': (t) => slide(t, 'left'), 'slide-right': (t) => slide(t, 'right'),
  'slide-up': (t) => slide(t, 'up'), 'slide-down': (t) => slide(t, 'down'),
  // WIPES ARE NAMED FOR THE EDGE THE REVEAL TRAVELS TOWARD. `wipe-right` grows rightward from the left
  // edge, `wipe-down` grows downward from the top, `wipe-up` grows upward from the bottom (the one a bar
  // chart wants). Plain `wipe` is the default direction, rightward — the same function as `wipe-right`.
  //
  // core/motion.js `wipe(dir)` names its argument for the OPPOSITE thing: the edge the content is pinned
  // to while hidden, i.e. the edge it grows FROM. So every name here maps to the opposite direction, and
  // that is deliberate, not a typo. `wipe-right` used to be registered as `wipe(t,'right')` and therefore
  // revealed right-to-left, contradicting both its name and the comment that stood here — a layer wiped
  // the wrong way and nothing said so. The horizontal pair now follows the same rule as the vertical one.
  //
  // Pairing an exit: `out` plays an entrance BACKWARDS, so the exit that CONTINUES the travel is the
  // OPPOSITELY named one, exactly as with slide (`anim:"slide-right"` + `out:"slide-left"`):
  // `anim:"wipe-right"` + `out:"wipe-left"` reveals rightward, then erases rightward.
  wipe: (t) => wipe(t, 'left'),
  'wipe-right': (t) => wipe(t, 'left'), 'wipe-left': (t) => wipe(t, 'right'),
  'wipe-down': (t) => wipe(t, 'up'), 'wipe-up': (t) => wipe(t, 'down'),
  iris: circleWipe, clock: clockWipe,
  // `none` is a REAL entry, not a hole. The schema has always listed it for `anim`/`out`, but the
  // registry had no key for it, so resolveAnim fell through to fade: an author writing out:"none" to
  // stop a layer fading got the fade anyway, with nothing said. That is the silent-substitution class
  // this engine keeps paying for (MISTAKES #21). It is a no-op on BOTH halves — no transform here, and
  // no opacity ramp in driveClips below — so the layer simply appears and disappears at its window edges.
  // It still writes `transform: 'none'` because every anim owes the resting-key contract further down:
  // an entry that writes nothing leaves a transform from the OTHER half of the animation on the element,
  // and frames render out of order, so the leftover shows up as a render-order dependence (MISTAKES #41).
  none: () => ({ transform: 'none' }),
};
// Exported so the schema and the conformance sweep can DERIVE the valid names instead of restating
// them. A hand-copied list is how the schema came to advertise "slideL", an anim that never existed
// and therefore silently resolved to fade (MISTAKES #21).
export const ANIM_NAMES = Object.keys(ANIM);

// Base enter/exit durations, in seconds. Snap band (0.2-0.3s): a default entrance that lands in ~a
// third of a second reads as directed; the old 0.45/0.4 read as floaty. Exported so scene.html can
// scale them by the theme's motion.durationScale from ONE source (no duplicated literal).
export const BASE_ENTER = 0.3, BASE_EXIT = 0.26;

/**
 * The opacity envelope every layer fades through. Eased, and MIRRORED: the exit curve is the
 * complement of the entrance curve, so two layers handing over the same pixels sum to exactly 1.
 * Independent ease-out/ease-in curves both sit high mid-blend (measured 1.71 across a real handoff)
 * and the dissolve goes muddy. Pure, and exported so `make lib-test` can hold both properties.
 */
export const opacityEnvelope = (enterT, exitT = 0) =>
  easeOutCubic(clamp01(enterT)) * (exitT > 0 ? 1 - easeOutCubic(clamp01(exitT)) : 1);
/** Unknown names fall back to fade SILENTLY — that is why `make conformance` asserts each is distinct. */
const resolveAnim = (name) => ANIM[name] || fade;
// invert an enter transition into an exit (reverse the progress: 1→hidden).
// Play an entrance BACKWARDS to make an exit: progress 1 (settled) -> 0 (offset/hidden).
// Takes exitT (0 at the start of the exit, 1 at the end), NOT exitMul — passing the already-inverted
// exitMul cancelled the inversion, so `out` ran the entrance FORWARDS: the layer teleported to its
// offset the instant the exit began and then slid home while fading. Every directional exit in the
// engine was backwards (MISTAKES #40).
const asExit = (fn, exitT) => fn(1 - clamp01(exitT));

// driveClips(root, t): position every [data-start] clip in time. A clip is visible on
// [start, start+duration); it plays data-anim on entry and data-out (or its reverse anim) on exit.
// z-order comes from data-track. Off-window clips are fully transparent (layout preserved → pure).
export function driveClips(root, t) {
  const clips = root.querySelectorAll('[data-start]');
  for (const el of clips) {
    const start = parseFloat(el.dataset.start) || 0;
    const dur = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
    const end = start + dur;
    const enterDur = el.dataset.enter != null ? parseFloat(el.dataset.enter) : BASE_ENTER;
    const exitDur = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : BASE_EXIT;
    if (el.dataset.track != null) el.style.zIndex = el.dataset.track;

    // OFF-WINDOW MUST BE A STATE, NOT AN ABSENCE. This branch used to zero opacity and `continue`,
    // leaving every OTHER property exactly as the previously-rendered frame wrote it — so an off-window
    // clip's transform was a function of which frame a worker happened to render before this one, which
    // is the one thing renderFrame(n) promises it is not.
    //
    // It hid because opacity 0 makes it invisible. It surfaced through geometry: getBoundingClientRect
    // on a CHILD includes its ancestors' transforms, so the two text nodes inside a not-yet-entered
    // `rise` group reported y 418.7 rendering forwards and 454.3 rendering backwards — the rise
    // distance, stuck. Two scenes were quarantined by the determinism net for it, and a quarantined
    // scene gets no regression baseline, so the files carrying the bug were also the files with no
    // protection against the next one.
    //
    // The resting set is the same one the in-window path composes for the same reason (MISTAKES #41):
    // only the layer's OWN anims contribute keys, so an authored look on a property nothing animates is
    // left alone. Writing it here costs nothing visible — the element is transparent — and makes the
    // whole style a pure function of t.
    if (t < start || t >= end) {
      const off = el.dataset.out ? resolveAnim(el.dataset.out) : null;
      Object.assign(el.style, { ...(off ? off(1) : {}), ...resolveAnim(el.dataset.anim)(1) });
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      continue;
    }
    el.style.pointerEvents = '';
    const enterT = enterDur > 0 ? clamp01((t - start) / enterDur) : 1;
    const enterS = resolveAnim(el.dataset.anim)(enterT);
    let s = enterS, exitMul = 1, exitT = 0;
    if (Number.isFinite(end)) {
      exitT = exitDur > 0 ? clamp01((t - (end - exitDur)) / exitDur) : 0;
      if (exitT > 0) {
        exitMul = 1 - exitT;
        // DEFAULT exit = a calm fade in place (element stays at rest, only opacity drops). A moving exit
        // that reverses the enter on EVERY layer reads as too much motion once cuts/ken are also going.
        // Opt into a motion-out explicitly with `out` (e.g. out:"rush"/"slide") when a beat wants it.
        if (el.dataset.out) s = asExit(resolveAnim(el.dataset.out), exitT);
      }
    }
    // Clear what the OTHER animation could have written before applying this one. Entrances and
    // exits write different CSS properties — `defocus` writes filter, `wipe` writes clipPath, `rise`
    // writes only transform — so a property set during an exit was never cleared by the entrance and
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
    // single entrance arrived on different curves — the thing you feel as "the easing is off"
    // without being able to point at it. docs/MOTION-CRAFT.md has said "entrances decelerate, exits
    // accelerate, never linear on visible moves" the whole time; the engine just did not do it.
    Object.assign(el.style, restingKeys, s);
    // The exit is the MIRROR of the entrance curve, not an independent one. That matters because two
    // layers handing over share the same pixels: with independent ease-out/ease-in curves both sit
    // high through the middle of the blend (measured sum 1.71 across tpot's This handoff) and the
    // dissolve turns muddy — the very problem the reel was repaced to avoid. Mirrored curves sum to
    // exactly 1 for any matched handoff, while a solo fade still eases instead of ramping linearly.
    // multiply in the authored base opacity, so `opacity: 0.4` dims the layer for its whole life
    // without fighting the entrance/exit fade that shares this property
    const base = el.dataset.opacity != null ? parseFloat(el.dataset.opacity) : 1;
    // The `none` half opts OUT of the envelope, not just out of the transform. Opacity is written here,
    // outside the anim registry, so a style-only no-op would still have faded — the author would have
    // removed the move and kept the very thing they asked to stop.
    const fadeInT = el.dataset.anim === 'none' ? 1 : enterT;
    const fadeOutT = el.dataset.out === 'none' ? 0 : exitT;
    el.style.opacity = String((opacityEnvelope(fadeInT, fadeOutT) * base).toFixed(3));
  }
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
