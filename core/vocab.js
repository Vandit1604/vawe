// core/vocab.js: the plain words an author is allowed to write where a concrete engine value goes.
//
// WHY THIS EXISTS. Every motion vocabulary in this engine is named by MECHANISM: `easeOutQuart`,
// `workspaceZoomOut`, `0.3`. An author reaching for the right one pays a document read; an author
// reaching for the wrong one pays nothing, so the measured default is `anim:"fade"` and a bare
// `rise`. A guide cannot fix that, because a guide is a gate by another name: it only works on the
// author who already stopped to read it. The fix is to make the word ITSELF resolve, at the same
// slot, so the cheap reach and the right reach are the same keystrokes.
//
// THE WORDS ARE NOT A SECOND VOCABULARY. Each one is an ALIAS onto a value the engine already has,
// and every target is asserted to exist by `make lib-test`. Nothing here can be picked that could
// not be picked before; a word is a shorter spelling, never a new capability.
//
// WHERE THE MEANINGS COME FROM. Two of these words are already spoken elsewhere in the engine and
// they keep that meaning exactly: `snappy` and `smooth` are cut timings (core/cuts.js TIMINGS), and
// their easing targets are the same curves those timings use. One word, one meaning, whichever slot
// it lands in. A word that would have meant something different in two slots is not in the list.
//
// AN UNKNOWN WORD THROWS. It never falls back. That is the whole argument of core/registry.js, and
// this file is built on it rather than beside it: a silent substitution renders a plausible frame
// that is not the one asked for, and the author has no way to see it (docs/MISTAKES.md #213 · #367).
import { defineRegistry } from './registry.js';

// ---- FEEL: a word → an easing name in core/motion.js EASINGS ------------------------------------
// Chosen by what the engine can already do, not by what reads well: every value below is a key of
// EASINGS, checked by lib-test. Words that ARE already EASINGS keys (`linear`, `spring`, `settle`,
// `snap`, `rush`, `brake`, `ramp`) are deliberately absent. ResolveEasing finds those first, and a
// word shadowing a curve is exactly the ambiguity this file exists to remove.
export const FEEL = {
  snappy: 'easeOutQuart',        // the cut timing `snappy`, as an easing. Decisive, no overshoot.
  smooth: 'easeInOutCubic',      // the cut timing `smooth`. Eases at both ends: travel, not arrival.
  soft: 'settle',                // the house entrance: decelerate with a whisper of settle.
  sharp: 'easeOutExpo',          // arrives almost instantly and stops. For a cut-like reveal.
  gentle: 'easeInOutSine',       // the shallowest curve here. Idle drift, backgrounds, holds.
  heavy: 'easeInOutQuint',       // long ramp at both ends: mass, something large being moved.
  pop: 'easeOutBack',            // the cut timing `pop`. Overshoots past the mark and comes back.
  bouncy: 'spring-bouncy',       // visible ring before it rests. Toy, playful, loud.
  elastic: 'easeOutElastic',     // more ring than `bouncy`, and longer. Use once per film.
  stiff: 'spring-stiff',         // spring physics with the overshoot damped almost out.
  mechanical: 'linear',          // no easing at all. A machine, a ticker, a conveyor.
};

// ---- DURATION: a word → seconds ----------------------------------------------------------------
// `medium` is 0.3 because that is BASE_ENTER (core/clips.js), the house default this engine already
// gives every layer that names nothing. Not imported: core/clips.js imports core/motion.js, which
// imports this file, and the cycle is not worth a constant. lib-test asserts the two agree.
//
// The range is MOTION scale (0.08s to 1.2s), because every slot that takes these words is an
// entrance, an exit or a junction. A word is not a film length, and the scene-root `duration` does
// not take one.
export const DURATION = {
  instant: 0.08,     // under the threshold where the eye reads travel. A state change, not a move.
  fast: 0.18,        // read as quick but still a move.
  medium: 0.3,       // BASE_ENTER, the engine's own default entrance.
  slow: 0.6,         // deliberate. The eye has time to follow the whole path.
  luxurious: 1.2,    // a held gesture. One per film, on the beat that deserves the screen time.
};

// ---- CAMERA: a word → a move name in core/camera-moves.js CAMERA_MOVES --------------------------
// The move names are verbs-plus-nouns from the code (`workspaceZoomOut`), which is right for the
// function and wrong for a person describing a shot. These are the shot descriptions.
export const CAMERA_WORDS = {
  'push in': 'slowPush',
  'slow push-in': 'slowPush',
  'pull back': 'workspaceZoomOut',
  'zoom out': 'workspaceZoomOut',
  dive: 'diveIn',
  follow: 'panFollow',
  sweep: 'truck',
  tour: 'travel',
  'pan stations': 'travel',
  circle: 'orbit',
  'ui focus zoom': 'diveIn',
  'punch in': 'punchIn',
  shake: 'cameraShake',
  'drift hold': 'driftHold',
};

// Registered through the same primitive as every other vocabulary, so a word written into the WRONG
// slot is diagnosed rather than merely rejected: `anim: "snappy"` now answers "that is a feel word,
// try `ease`" instead of listing thirty anims it is not among. The registry also owns the near-miss
// list and the "never a fallback" contract. There is no `pick(name, default)` to reach for.
// ---- INTERPOLATION MODES: not curves, and that is the whole distinction --------------------------
//
// An EASING is a function of one segment's own progress: it cannot see the keys either side, so it
// necessarily starts and ends that segment at zero velocity. A FEEL WORD is another spelling of one.
// An interpolation MODE is a third thing: it decides how the value between two keys is computed at all,
// and it is allowed to read the neighbours.
//
// `through` is the speed graph. It fits a cubic Hermite whose tangent at each key comes from that key's
// NEIGHBOURS, so the velocity entering a key equals the velocity leaving it and a travel through
// several keys reads as one gesture instead of stopping at each. Measured on three sparse keys, the
// default curve passes the interior key at 2 px/s and `through` passes it at 770 (core/sequence.js).
//
// They live in the same `ease` field because that is where an author reaches for them, and they are
// listed separately because calling one an easing is what made the first attempt name it `smooth`,
// which is already a feel word for easeInOutCubic. `resolveEasing` never sees these: core/sequence.js
// dispatches them before it is called, and a mode reaching resolveEasing would be a bug.
export const INTERP = {
  through: 'velocity carries THROUGH the key: a cubic Hermite with neighbour tangents, so a travel across several keys is one gesture rather than a stop at each',
};

export const INTERP_REGISTRY = defineRegistry('interpolation mode', INTERP, { slot: 'ease' });

export const FEEL_REGISTRY = defineRegistry('feel word', FEEL, { slot: 'ease' });
export const DURATION_REGISTRY = defineRegistry('duration word', DURATION, { slot: 'enterDur' });
export const CAMERA_WORD_REGISTRY = defineRegistry('camera word', CAMERA_WORDS, { slot: 'cameraMove.move' });

/**
 * resolveSeconds(v): a duration slot's value, whatever spelling it arrived in.
 *   a number  → itself (a scene that names 0.42 keeps naming 0.42)
 *   absent    → itself, so the caller's own default still decides
 *   a word    → its seconds
 *   anything else → throws, naming the words and the near misses
 * Idempotent, so a lowering pass may run twice over the same data.
 */
export const resolveSeconds = (v) => {
  if (v == null || typeof v === 'number') return v;
  return DURATION_REGISTRY.pick(v);
};

/** resolveCameraMove(name): a move name passes through; a shot word becomes its move name. */
export const resolveCameraMove = (name) => {
  if (typeof name !== 'string') return name;
  return Object.prototype.hasOwnProperty.call(CAMERA_WORDS, name) ? CAMERA_WORDS[name] : name;
};

/**
 * verifyVocab({ easings, cameraMoves }): every word's target still exists.
 * Called by lib-test rather than at import time: this file must stay a leaf (core/motion.js imports
 * it), so it cannot import the registries it aliases. A rename on the far side is caught by the
 * gate, not by a crash inside a render worker.
 */
export function verifyVocab({ easings, cameraMoves }) {
  const bad = [];
  for (const [w, target] of Object.entries(FEEL)) if (!easings.includes(target)) bad.push(`feel "${w}" → missing easing "${target}"`);
  for (const [w, target] of Object.entries(CAMERA_WORDS)) if (!cameraMoves.includes(target)) bad.push(`camera "${w}" → missing move "${target}"`);
  return bad;
}
