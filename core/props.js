// core/props.js: what a module says about the layer props it reads, and the two operations every
// registry and every gate performs on those statements.
//
// A module that reads `L.<prop>` declares it beside the read:
//
//   export const PROPS = {
//     radius: {},                 // read unconditionally
//     preset: { when: 'split' },  // read only when the layer also sets `split`
//   };
//
// WHY DECLARED AND NOT FOUND. `layer-props` used to answer "does anything read this prop?" by regex
// over a hardcoded list of files plus one hop of each builder's relative imports. That list is a map of
// where the engine lived on the day the gate was written, and the engine keeps moving: the day
// core/tracks/ became a registry, 1454 live props started reporting as dropped, because a directory the
// list did not name is a directory the gate cannot see. Three earlier fixes to the same gate each widened
// the scan by one shape and each was overtaken by the next move (docs/MISTAKES.md #229 · #232 · #242).
// A declaration cannot be outrun by a file move: it travels in the file that does the reading.
//
// THE GUARD IS THE HALF THAT MATTERS. Six props fire only behind another prop, `preset` needs `split`,
// `dist` needs `cut` or `split`, `motionBlur` needs `motion`, and a layer that sets one without its
// enabler renders exactly as if the prop were absent. The old scanner could not express that at all, so
// it called those live and shouted about the 1482 that worked.

// Both spellings of a guard: `when: 'split'` and `when: ['cut', 'split']` (any of them enables the read).
const guardsOf = (d) => (d && d.when ? (Array.isArray(d.when) ? d.when : [d.when]) : []);

// A guard is satisfied by PRESENCE, not by truth of an arbitrary value, except `false`, which is how
// every opt-out in this engine is spelled (`motionBlur: false`, `caret: false`). `motion: []` counts as
// present because the track runs on it and finds nothing, which is a different bug from a missing enabler.
export const guardMet = (L, g) => L[g] != null && L[g] !== false;

// Does this declaration fire for THIS layer? Unconditional, or any one of its guards is set.
export const firesOn = (L, decl) => {
  const g = guardsOf(decl);
  return g.length === 0 || g.some((k) => guardMet(L, k));
};

// mergeProps: the union of several modules' declarations. Two modules reading the same prop is the
// normal case, not a conflict: `dist` is read by the cut track behind `cut` and by the units track behind
// `split`, and a layer that sets either enabler gets it. So guards UNION, and an unconditional read
// anywhere makes the prop unconditional. The least restrictive claim wins, because the question the
// gate asks is "does ANYTHING read this", and one reader is enough.
export function mergeProps(...sets) {
  const out = {};
  for (const set of sets) {
    for (const [k, decl] of Object.entries(set || {})) {
      const g = guardsOf(decl);
      const prev = out[k];
      if (prev === undefined) { out[k] = g.length ? { when: [...g] } : {}; continue; }
      if (!prev.when || !g.length) { out[k] = {}; continue; }
      for (const x of g) if (!prev.when.includes(x)) prev.when.push(x);
    }
  }
  return out;
}
