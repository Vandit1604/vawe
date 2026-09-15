// generators/sim/sims/lib/rng.mjs: the seeded randomness a sim is allowed to use.
//
// A bake is only worth trusting if it REPRODUCES: same source + same seed → the same PNG bytes.
// Determinism does not disappear when a simulation runs offline, it MOVES to bake time. So a sim
// draws every "random" number from here, never from the platform, and `make sim-audit` fails any
// sim that reaches for the platform's entropy or the wall clock.

/** mulberry32: 32-bit state, one multiply-xor round. Fast, well-distributed, and exactly repeatable. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** uniform in [0,1) */
    next,
    /** uniform in [lo,hi) */
    range: (lo, hi) => lo + next() * (hi - lo),
    /** integer in [lo,hi] */
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    /** approximately normal, mean 0 sd 1 (sum of 3 uniforms, cheap and bounded) */
    gauss: () => (next() + next() + next() - 1.5) * 1.1547,
    /** a unit vector at a uniformly random angle */
    dir: () => { const a2 = next() * Math.PI * 2; return [Math.cos(a2), Math.sin(a2)]; },
    /** pick one of an array */
    pick: (arr) => arr[Math.floor(next() * arr.length) % arr.length],
  };
}

/** Value noise on an integer lattice, seeded. Pure in (x,y,seed) so it needs no state to be stable. */
export function hash01(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t) => Math.pow(clamp01(t), 3);

/** rgba() from a [r,g,b] triple plus alpha. Keeps sims off string concatenation in hot loops. */
export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(4)})`;
/** mix two [r,g,b] triples */
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
