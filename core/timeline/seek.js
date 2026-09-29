// core/timeline/seek.js: the seek adapter a page and a scene share. seekAll(t) drives every
// registered timeline, CSS/WAAPI animation, SVG SMIL clock and vawe.onFrame hook to film time t.
// Imports only the clamp helper, so a bare page loads it without the JSON engine
// (core/timeline/clips.js re-exports these names).
import { clamp01 } from '../motion/motion.js';

// ---------- animation-adapter interface ----------
// A scene may `registerTimeline(tl)` any object with a seek(seconds) method (GSAP paused timelines,
// custom runtimes). seekAll(t) also drives paused WAAPI animations. Called by the engine each frame.
export function registerTimeline(tl) {
  (window.__timelines || (window.__timelines = [])).push(tl);
}

// vawe.onFrame(fn): a page's own hand-written driver (a canvas 2D ctx, a WebGL/three.js scene, a
// particle sim) registers ONE hook here instead of inventing a second clock. seekAll(t) calls every
// hook, in registration order, AFTER every declarative/WAAPI/SMIL animation on the page has already
// been seeked to t, and AWAITS it when it returns a promise (a hook that decodes a texture or builds
// geometry lazily on first call needs that). This is the one hook list a page's own JS may register
// on: a second ad-hoc rAF loop is exactly the non-determinism this file exists to rule out.
export function onFrame(fn) {
  (window.__vaweFrameHooks || (window.__vaweFrameHooks = [])).push(fn);
}
export function seekAll(t) {
  // registered / GSAP-style paused timelines
  for (const tl of window.__timelines || []) {
    if (typeof tl?.seek === 'function') tl.seek(t);
    else if (typeof tl?.time === 'function') tl.time(t);
    else if (typeof tl?.progress === 'function' && typeof tl.duration === 'function') tl.progress(tl.duration() ? clamp01(t / tl.duration()) : 0);
  }
  // GSAP global timeline, if present and paused
  if (window.gsap?.globalTimeline) { try { window.gsap.globalTimeline.pause(); window.gsap.globalTimeline.time(t); } catch { /* best-effort */ } }
  // paused WAAPI animations → deterministic currentTime. This covers CSS animations, CSS transitions
  // AND Web Animations alike: all three surface through document.getAnimations() in this Chromium, so
  // one loop seeks all of them, whether they came from a stylesheet, an inline style, or `element.animate()`.
  if (typeof document.getAnimations === 'function') {
    for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t * 1000; } catch { /* best-effort */ } }
  }
  // SVG SMIL (<animate>, <animateTransform>, <animateMotion>) runs on its OWN timeline, never on the
  // Web Animations one, so getAnimations() above cannot see it: an <svg> pauses and seeks separately.
  document.querySelectorAll('svg').forEach((svg) => {
    if (typeof svg.pauseAnimations === 'function') { try { svg.pauseAnimations(); svg.setCurrentTime(t); } catch { /* best-effort */ } }
  });
  const hooks = window.__vaweFrameHooks;
  if (!hooks || !hooks.length) return;
  // Sequential, not Promise.all: two hooks racing to the same canvas/GL context is a render-order
  // dependency, the exact bug this file's whole header rules out.
  return (async () => { for (const fn of hooks) await fn(t); })();
}
