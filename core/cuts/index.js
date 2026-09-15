// core/cuts/index.js: THE RUNNER. presentations.js (the cut fx) and timings.js (the speed dial) are
// DATA + their own registries; this file is the generic machinery around them: cutStyle/soloCutStyle
// pick a presentation and a timing and turn seq() state into a style object for the scene root.
// Same package split as core/stings/ and core/backgrounds/: core/cuts.js re-exports this whole
// surface so every existing importer keeps its `from './cuts.js'` path.
//
// another engine's two-axis split, ported to the pure model: a TIMING shapes how progress 0->1 evolves
// through the cut window; a PRESENTATION says what the cut looks like, pure style objects for the
// entering / exiting scene root. Everything derives from sequence()'s enter/exit values, so it stays
// pure in n and composes with in-scene motion.
//
//   const seq = sequence(n, fps, SEGS, { transition: TRANS });
//   applyT(sceneRoot, cutStyle(sc.transition, seq, { dir: 'left' }));
//
// cutStyle ALWAYS returns the full style set (identity values in the steady state) so a property
// written during the cut can never stick, byte-identical DOM for any render order.
import { defineRegistry } from '../registry/registry.js';
import { PRESENTATIONS, CUT_BLURBS, IDENT, DIRS, SOLO_BLIND, cutWrites, HIDE_CHANNELS,
  wipe, circleWipe, clockWipe } from './presentations.js';
import { TIMINGS, TIMING_BLURBS, TIMING_REGISTRY } from './timings.js';

export { PRESENTATIONS, CUT_BLURBS, IDENT, DIRS, SOLO_BLIND, cutWrites };
export { TIMINGS, TIMING_BLURBS, TIMING_REGISTRY };
// wipe/circleWipe/clockWipe: the junction-wipe transition helpers, moved from core/motion/motion.js.
// Exported here so an importer can take the barrel instead of reaching into presentations.js.
export { wipe, circleWipe, clockWipe };

// soloCutStyle: cutStyle for the single-root path. Same closed-form styles, visibility pinned open.
export function soloCutStyle(name, seqState, opts) {
  const s = { ...cutStyle(name, seqState, opts) };
  for (const k of HIDE_CHANNELS) s[k] = IDENT[k];
  return s;
}

// cutStyle(name, seqState, opts) → style object for the ACTIVE scene root at this frame.
// seqState is the return of sequence(); opts: {timing, dir, dist, cx, cy}.
export function cutStyle(name, seqState, { timing = 'smooth', dir = 'left', dist = 90, cx = 50, cy = 50 } = {}) {
  // Both used to fall back silently (to `fade` and `smooth`). A cut is a JUNCTION - the one moment the
  // viewer is guaranteed to be looking - so a mistyped one quietly becoming a dissolve is the worst
  // place in the engine to substitute. core/registry.js, engine-doctrine/MISTAKES.md #355.
  // absent → the documented default; NAMED-BUT-UNKNOWN → throw. See core/clips.js for why they differ.
  const P = name == null ? PRESENTATIONS.fade : CUT_REGISTRY.pick(name);
  const T = typeof timing === 'function' ? timing : timing == null ? TIMINGS.smooth : TIMING_REGISTRY.pick(timing);
  const o = { dir, dist, cx, cy };
  if (seqState.exit > 0) return P.exit(T(seqState.exit), o);
  if (seqState.enter < 1) return P.enter(T(seqState.enter), o);
  return P.enter(1, o); // steady state = identity (must not leave cut styles stuck)
}

// Built at the END so both maps are fully defined. `slot` is how an author writes it in a scene.
export const CUT_REGISTRY = defineRegistry('cut', PRESENTATIONS, { slot: 'cut', blurbs: CUT_BLURBS,
  catalog: {
    title: 'Scene cuts',
    tag: 'transition',
    intro: '`cuts:[{t,style}]`. The beat-to-beat cut family. One family per film.',
    usage: (n, { j }) => j({ cuts: [{ t: 2.4, style: n }] }),
    preview: (n, { base, TWO }) => base({ layers: TWO(2.4), cuts: [{ t: 2.4, style: n }] }),
  },
});
