import { hold as holdDur } from './units.js';

// hold: the camera is explicitly LOCKED OFF for this window. Measured need (AGENTS.md build brief):
// `camera: hold` was written 84 times across 21 storyboards to mean "no camera move here", and it was
// the ONLY word this engine refused everywhere: the sole way to say "no camera" was to omit `camera:`
// entirely, so an author who wrote the decision down failed and one who said nothing passed.
//
// NOT an alias of driftHold. driftHold gives you a held frame that keeps breathing (a sub-12px
// Lissajous micro-drift); this is a tripod-still frame, zero motion, on purpose. Genuinely different
// shots, so both get their own name.
//
// It contributes ZERO keyframes: there is no camera to fake a path for, so it emits none rather than an
// identity path pretending to be one. Its window still comes from `start`/`dur` (core/engine/produce.js
// bakeCameraMove falls back to those when a move's own keyframes are empty), so `hold` still occupies
// real seconds and the overlap check that already refuses two camera specs racing the same time sees a
// declared `hold` exactly like any other move: a second camera reaching into a beat that declared
// itself locked off is refused, not silently allowed.
export function hold({ start = 0, dur = 0 } = {}) {
  holdDur('hold', 'dur', dur);
  return [];
}
