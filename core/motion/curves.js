// Pure curve math: easings and cubicBezier. No imports, safe in any page or in node.

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const punch = (t, amt = 0.14) => 1 + amt * Math.sin(clamp01(t) * Math.PI);
export const easeInCubic = (t) => t * t * t;
export const easeOutElastic = (t) => { if (t <= 0) return 0; if (t >= 1) return 1; const p = 0.3; return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1; };
export const easeInQuart = (t) => t * t * t * t;
// sine family: taste/craft/motion-craft.md / the planning skill prescribe "ambient loops sinusoidal", which was
// unexpressable until now: the registry had no sine curve at all. This is the gentlest ease there
// is (no hard stop), which is exactly what a drifting/breathing loop wants.
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
// quint: one notch sharper than quart, softer than expo. The "luxurious settle" for hero moves.
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuart = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

// ---- the complete named-curve set (easings.net / Penner). Every family in In/Out/InOut so an
// author never has to hand-roll a curve or settle for a near-miss. All pure, all guarded by the
// easing-registry contract in lib-test (f(0)=0, f(1)=1, finite, deterministic).
export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInQuint = (t) => t * t * t * t * t;
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
// circ: mechanical/geometric, starts or stops very hard. Good for wipes and mechanical UI.
export const easeInCirc = (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc = (t) => (t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2);
// back: anticipation, dips BELOW 0 before launching (easeIn) / past 1 before settling (easeOut).
export const easeInBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; };
export const easeInOutBack = (t) => { const c1 = 1.70158, c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; };
// elastic: rubber band. Endpoints snapped so it lands exactly (the raw formula rings past 1).
export const easeInElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)));
export const easeInOutElastic = (t) => { const c5 = (2 * Math.PI) / 4.5; return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; };
// bounce: ball drop. Stays inside [0,1], it never overshoots, it rebounds.
export const easeOutBounce = (t) => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; };
export const easeInBounce = (t) => 1 - easeOutBounce(1 - t);
export const easeInOutBounce = (t) => (t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2);
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));
export const easeInOutExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : 1 - Math.pow(2, -20 * t + 10) / 2);

// A cubic bezier on the unit square, P0 (0,0) and P3 (1,1) fixed, P1/P2 authored: the same maths CSS
// `cubic-bezier()` runs, so a curve copied from CSS or After Effects reproduces here exactly.
//
// x(s) = t is inverted by Newton-Raphson (monotone for x1, x2 in [0,1]), with a bisection fallback for
// the flat spots where the derivative goes to zero. Deterministic, allocation-free: sampled once per
// property per layer per frame.
const bezA = (a1, a2) => 1 - 3 * a2 + 3 * a1;
const bezB = (a1, a2) => 3 * a2 - 6 * a1;
const bezC = (a1) => 3 * a1;
const bezAt = (s, a1, a2) => ((bezA(a1, a2) * s + bezB(a1, a2)) * s + bezC(a1)) * s;
const bezSlope = (s, a1, a2) => 3 * bezA(a1, a2) * s * s + 2 * bezB(a1, a2) * s + bezC(a1);

/**
 * cubicBezier(x1, y1, x2, y2) → (t) => y. `x1`/`x2` are clamped to [0,1] because they are TIME and a
 * control point outside the segment makes x(s) non-monotone, which has no inverse. `y1`/`y2` are NOT
 * clamped: a y outside [0,1] is an overshoot, which is a real and wanted shape.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const a1 = clamp01(x1), a2 = clamp01(x2);
  if (a1 === y1 && a2 === y2) return (t) => t;   // the identity line, exactly, with no solve
  return (t) => {
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    // Newton first, from t itself: for a curve near the diagonal that is already close.
    let s = t;
    for (let i = 0; i < 8; i++) {
      const d = bezSlope(s, a1, a2);
      if (!(Math.abs(d) > 1e-6)) break;
      const e = bezAt(s, a1, a2) - t;
      if (Math.abs(e) < 1e-9) return bezAt(s, y1, y2);
      s -= e / d;
      if (!(s >= 0) || !(s <= 1)) break;          // out of range, hand it to bisection
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 40; i++) {
      const x = bezAt(s, a1, a2);
      if (Math.abs(x - t) < 1e-9) break;
      if (x < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return bezAt(s, y1, y2);
  };
}
