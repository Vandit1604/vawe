// core/idle.js — AUTHORED IDLE: the small continuous motion a layer carries while it is at REST.
//
// WHY THIS EXISTS. Measured across this library and the reference films: the reference frame is
// near-static 41% of its runtime, ours 20%, and `higgsfield-recreation` 0.0% — nothing in it is ever at
// rest for its whole five seconds. That reads as genre until you read the reference's own prompting
// guide, which asks for it by name on every example: "nothing ever fully stops. Every hold carries a
// little ambient idle motion, a 1-2% breathing scale, a slow drift."
//
// So their rest is not stillness, it is authored idle, and that is why their held frames read as
// confident while ours read as either frantic or dead. The doctrine here had a gate that BLOCKS a held
// frame (`dead-air` in beat-check) and nothing at all on the other side: an author who wanted a hold had
// to hand-key a motion track to get one that looked deliberate, and nobody does that, so nobody holds.
// This makes the held frame affordable by construction.
//
// PURE IN THE FRAME. Every generator is built from `sin` of the layer's local time. No Math.random, no
// Date.now, no accumulator: renderFrame(n) is a function of n alone and an idle that read a clock would
// be defect #370 again. The per-layer phase is hashed from the layer's identity, so a cast breathes out
// of step with itself and does so identically on every render and in every worker.
//
// THE DEFAULT IS `none`, and that is not timidity. 104 scenes are shipped against a byte-exact snapshot;
// an idle that arrived switched on would change every one of them and the diff would be unreadable.
import { clamp01, easeInOutSine, pulse, hashSeed } from './motion.js';
import { defineRegistry } from './registry.js';

// The neutral delta. A generator returns a partial and `idleAt` fills the rest from this, so `none` and
// "the settled window has not opened yet" are the same value rather than two spellings of nothing.
export const IDLE_IDENTITY = Object.freeze({ dx: 0, dy: 0, scale: 1, rot: 0 });

// Seconds the idle takes to reach full amplitude after the entrance settles, and to fade back to
// nothing before the exit begins. It is a RAMP and not a switch because the amplitude is what the eye
// tracks: a step from 0 to full at the end of the entrance is a visible flinch on the settle frame.
export const IDLE_BLEND = 0.35;

// ---------- the generators ----------
// Each takes `u` (seconds since the layer's own start) and its options, and returns a partial delta.
// `amp` and `period` carry a default per generator rather than one shared pair: 1.5% is a breath and
// 1.5px is not a drift.
export const IDLE = {
  // A true no-op, and a real entry rather than a hole. `idle: "none"` is how an author turns off a
  // scene-level default on one layer, and a name the registry does not know is refused, not defaulted.
  none: () => IDLE_IDENTITY,

  // BREATHE — the 1-2% scale the reference guide names. Scales the layer's BOX about its centre, so a
  // card grows and shrinks as one object. Slow: a 4.6s period is roughly a resting human breath, and
  // anything under ~3s reads as a pulse animation rather than as a thing being alive.
  breathe: (u, { amp = 0.015, period = 4.6, phase = 0 } = {}) => ({ scale: pulse(u + phase * period, { period, amt: amp }) }),

  // DRIFT — a slow translate on two incommensurate periods, so the path never closes into a visible
  // loop over a beat's length. The vertical axis is deliberately the smaller one: a frame that slides
  // sideways reads as camera, a frame that bobs reads as a mistake.
  drift: (u, { amp = 9, period = 11, phase = 0 } = {}) => {
    const a = ((u / period) + phase) * Math.PI * 2;
    return { dx: amp * Math.sin(a), dy: amp * 0.55 * Math.sin(a * 0.618 + 1.7) };
  },
};

export const IDLE_REGISTRY = defineRegistry('idle', IDLE, { slot: 'idle' });
export const IDLE_NAMES = IDLE_REGISTRY.names;

// One line per name, beside the registry, on the contract every other vocabulary in this engine keeps:
// a name with no description is a name an author cannot choose from.
export const IDLE_BLURBS = {
  none: 'no idle — the layer is truly still on its hold (the default)',
  breathe: '1.5% scale, ~4.6s — the held frame stays alive without moving',
  drift: 'slow translate on two periods, ~9px — the frame is never quite parked',
};

// normalizeIdle(spec) — the three spellings an author may write, to one shape or null.
//   "breathe" · { name: "drift", amp: 14 } · "none" / false / null / undefined
// Returns null for "no idle", which is what every caller branches on. An unknown NAME throws through
// the registry rather than resolving to `none`, because a silently ignored idle looks exactly like a
// working default is on.
export function normalizeIdle(spec) {
  if (spec == null || spec === false || spec === 'none') return null;
  const s = typeof spec === 'string' ? { name: spec } : spec;
  if (!s || typeof s !== 'object' || typeof s.name !== 'string')
    throw new Error(`idle: expected a name or { name, amp?, period?, phase? }, got ${JSON.stringify(spec)}. `
      + `Known idles: ${IDLE_NAMES.join(', ')}.`);
  if (s.name === 'none') return null;
  IDLE_REGISTRY.pick(s.name);   // throws here, at author time, not on some later frame
  return s;
}

// idlePhase(key) — the per-layer offset, in turns [0,1). Two layers that breathe in lockstep read as one
// mechanism driving both; out of step they read as two live things. Hashed from the layer's own
// identity so it is the same number on every render, in every worker, at every frame rate.
export const idlePhase = (key) => hashSeed(String(key)) / 4294967296;

// idleAt(spec, u, phase) — the delta this idle contributes at `u` seconds into the layer's life.
// Pure: same arguments, same object. `gain` is applied by the caller, not here, so the generator and
// the settled-window envelope stay separately testable.
export function idleAt(spec, u, phase = 0) {
  const s = normalizeIdle(spec);
  if (!s) return IDLE_IDENTITY;
  const d = IDLE_REGISTRY.pick(s.name)(u, { ...s, phase });
  return { dx: d.dx ?? 0, dy: d.dy ?? 0, scale: d.scale ?? 1, rot: d.rot ?? 0 };
}

// settledGain(u, {dur, enterDur, exitDur}) — how much of the idle is live at `u`. Zero through the
// entrance and through the exit, one across the middle, eased at both joins.
//
// The ramps are NOT re-derived here. `enterDur`/`exitDur` are the same two numbers core/clips.js
// drives the entrance and exit from (enterDurOf / exitDurOf read them off the element's own dataset),
// so the settled middle this returns is exactly the span driveClips is not animating. An idle that
// overlapped either end would be fighting the entrance for the same pixels, which is how a settle
// starts to look mushy.
export function settledGain(u, { dur = Infinity, enterDur = 0, exitDur = 0 } = {}) {
  const from = enterDur, to = Math.max(from, dur - exitDur);
  if (!(u > from) || !(u < to)) return 0;
  const blend = Math.min(IDLE_BLEND, (to - from) / 2);
  if (!(blend > 0)) return 0;
  return easeInOutSine(Math.min(clamp01((u - from) / blend), clamp01((to - u) / blend)));
}

// idleTransform(d, gain) — the CSS, or '' when this frame contributes nothing. Written as a leading
// `translate(...) scale(...)` pair so it composes OUTSIDE whatever the entrance and the motion track
// already put on the element.
//
// SIX DECIMALS ON THE SCALE, TWO ON THE TRANSLATE. Coarser rounding is what turns a slow continuous
// move into a stair of 1px steps, and a stair on a text box is the sub-pixel shimmer core/motion.js
// snaps its easing endpoints to avoid. The transform lands on the layer's BOX and never on the glyph
// run inside it: one composited element moving is one resample, fifty glyph spans moving is fifty.
export function idleTransform(d, gain = 1) {
  const dx = d.dx * gain, dy = d.dy * gain;
  const sc = 1 + (d.scale - 1) * gain, rot = d.rot * gain;
  if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 && Math.abs(sc - 1) < 1e-6 && Math.abs(rot) < 1e-4) return '';
  return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sc.toFixed(6)})`
    + (rot ? ` rotate(${rot.toFixed(4)}deg)` : '');
}
