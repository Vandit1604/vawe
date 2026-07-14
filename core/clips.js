// core/clips.js — declarative composition layer (another engine parity):
//   • data-attribute timing/tracks   (data-start / data-duration / data-track / data-anim / data-out)
//   • a seekable animation-adapter interface (WAAPI + registered/GSAP paused timelines)
// Both are PURE in the time input: driveClips(root, t) is a deterministic function of t; seeking a
// paused timeline to t is deterministic. This lets a scene be authored declaratively (fill HTML with
// timed clips) OR bring its own animation runtime, exactly like another engine' adapter model.
import { clamp01, rise, fade, pop, slide, wipe, circleWipe, clockWipe } from './motion.js';

// enter/exit animation registry: data-anim / data-out name → (t)=>styleObject.
const ANIM = {
  fade, up: rise, rise, pop, scale: pop,
  'slide-left': (t) => slide(t, 'left'), 'slide-right': (t) => slide(t, 'right'),
  'slide-up': (t) => slide(t, 'up'), 'slide-down': (t) => slide(t, 'down'),
  wipe: (t) => wipe(t, 'left'), 'wipe-right': (t) => wipe(t, 'right'),
  iris: circleWipe, clock: clockWipe,
};
const resolveAnim = (name) => ANIM[name] || fade;
// invert an enter transition into an exit (reverse the progress: 1→hidden).
const asExit = (fn, t) => fn(1 - clamp01(t));

// driveClips(root, t): position every [data-start] clip in time. A clip is visible on
// [start, start+duration); it plays data-anim on entry and data-out (or its reverse anim) on exit.
// z-order comes from data-track. Off-window clips are fully transparent (layout preserved → pure).
export function driveClips(root, t) {
  const clips = root.querySelectorAll('[data-start]');
  for (const el of clips) {
    const start = parseFloat(el.dataset.start) || 0;
    const dur = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
    const end = start + dur;
    const enterDur = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
    const exitDur = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
    if (el.dataset.track != null) el.style.zIndex = el.dataset.track;

    if (t < start || t >= end) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue; }
    el.style.pointerEvents = '';
    const enterT = enterDur > 0 ? clamp01((t - start) / enterDur) : 1;
    const enterS = resolveAnim(el.dataset.anim)(enterT);
    let s = enterS, exitMul = 1;
    if (Number.isFinite(end)) {
      const exitT = exitDur > 0 ? clamp01((t - (end - exitDur)) / exitDur) : 0;
      if (exitT > 0) {
        exitMul = 1 - exitT;
        // DEFAULT exit = a calm fade in place (element stays at rest, only opacity drops). A moving exit
        // that reverses the enter on EVERY layer reads as too much motion once cuts/ken are also going.
        // Opt into a motion-out explicitly with `out` (e.g. out:"rush"/"slide") when a beat wants it.
        if (el.dataset.out) s = asExit(resolveAnim(el.dataset.out), exitMul);
      }
    }
    // compose: apply enter (or exit) transform/clip + fade by the combined opacity
    Object.assign(el.style, s);
    el.style.opacity = String((clamp01(enterT) * exitMul).toFixed(3));
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
