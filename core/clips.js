// core/clips.js — declarative composition layer (another engine parity):
//   • data-attribute timing/tracks   (data-start / data-duration / data-track / data-anim / data-out)
//   • a seekable animation-adapter interface (WAAPI + registered/GSAP paused timelines)
// Both are PURE in the time input: driveClips(root, t) is a deterministic function of t; seeking a
// paused timeline to t is deterministic. This lets a scene be authored declaratively (fill HTML with
// timed clips) OR bring its own animation runtime, exactly like another engine' adapter model.
import { clamp01, easeOutCubic, defocus, rise, fade, pop, lift, slide, wipe, circleWipe, clockWipe } from './motion.js';

// enter/exit animation registry: data-anim / data-out name → (t)=>styleObject.
const ANIM = {
  fade, up: rise, rise, pop, scale: pop, lift, defocus,
  'slide-left': (t) => slide(t, 'left'), 'slide-right': (t) => slide(t, 'right'),
  'slide-up': (t) => slide(t, 'up'), 'slide-down': (t) => slide(t, 'down'),
  wipe: (t) => wipe(t, 'left'), 'wipe-right': (t) => wipe(t, 'right'),
  // core/motion.js `wipe()` has implemented all four directions since it was written; only the two
  // horizontal ones were ever registered here, so a bar could not grow from its baseline by name and
  // blocks reached for a hand-rolled mask instead. Named for the edge the reveal TRAVELS TOWARD, which
  // is how `wipe`/`wipe-right` already read: `wipe-down` grows downward from the top edge,
  // `wipe-up` grows upward from the bottom — the one a bar chart wants.
  'wipe-down': (t) => wipe(t, 'up'), 'wipe-up': (t) => wipe(t, 'down'),
  iris: circleWipe, clock: clockWipe,
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

    if (t < start || t >= end) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue; }
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
    el.style.opacity = String((opacityEnvelope(enterT, exitT) * base).toFixed(3));
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
