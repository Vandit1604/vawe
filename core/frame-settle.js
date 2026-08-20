// core/frame-settle.js — the barrier for per-frame work that CANNOT finish synchronously.
//
// `renderFrame(n)` is synchronous by contract, and the capture waits two real rAFs after it so the
// browser has painted (internal/scene/scene.go). That is enough for a DOM write and a CSS transform,
// which is everything the engine did until footage arrived. It is NOT enough for a <video> seek: setting
// `currentTime` starts an asynchronous decode that fires `seeked` whenever it is ready, which is
// routinely longer than two frames. Capture without waiting and the frame holds whatever the decoder had
// lying around, which is the PREVIOUS frame's picture or a blank one, and it varies by machine and by
// worker. That is the same class of defect as #370: a frame whose content depends on something other
// than `n`.
//
// So a layer that starts asynchronous work registers it here, and the capture drains this before it
// shoots. Purity is preserved because the WORK is still a pure function of `n` (seek to a time computed
// from `n`); only the completion is asynchronous.
//
// Deliberately NOT a promise chain on the engine: a layer must be able to register from anywhere in the
// frame pass without threading a return value up through the renderer, the group child path and the
// track pipeline.

const pending = new Set();

/** Register async work the next capture must wait for. Never throws into the caller's frame pass. */
export function settleOn(p) {
  if (!p || typeof p.then !== 'function') return;
  pending.add(p);
  // `finally` on a rejection would leave the rejection unhandled and surface as a page error, which
  // `newTab` treats as a dead scene. A seek that fails is a bad frame, not a dead film; it is caught
  // here and reported by the layer that owns it.
  p.then(() => pending.delete(p), () => pending.delete(p));
}

/** Drain. Resolves when every registered piece of work has settled. Safe to call with nothing pending. */
export function frameSettle() {
  return pending.size ? Promise.all([...pending]).then(() => undefined) : Promise.resolve();
}

if (typeof window !== 'undefined') window.__frameSettle = frameSettle;
