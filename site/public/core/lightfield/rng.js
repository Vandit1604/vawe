// A seeded linear congruential generator. Numerical Recipes constants.
// The whole point of this file: the same seed gives the same sequence, in every runtime,
// forever. Never swap this for Math.random.

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A draw in [lo, hi).
export const span = (r, lo, hi) => lo + (hi - lo) * r();

// Fixed-precision printing. Float text must not drift between runs or platforms.
export const n = (x, places = 3) => {
  const v = Number(x.toFixed(places));
  return String(Object.is(v, -0) ? 0 : v);
};
