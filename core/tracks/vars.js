// core/tracks/vars.js: ANIMATED CSS VARIABLES. The engine could drive transform, opacity and blur and
// nothing else, so a block could only ever ENTER. Every one of them wore the same `anim:'rise'`
// because there was no way to animate what the block actually DOES. A gauge cannot sweep to its
// reading, a bar cannot grow, a line cannot draw on. Interpolating a custom property fixes the whole
// class at once: the block writes `var(--p)` into its own CSS or SVG and the engine drives the number.
// Pure in n: the value is a function of t and nothing else.
//   vars: { '--p': [0, 1] }, varsDur: 1.2, varsDelay: 0.15, varsEase: 'easeOutCubic'
//
// Custom properties are its own namespace, so no other track can collide with it. It runs before
// `react` and `transform` only because a value the layer's CSS reads should be settled before anything
// modulates what that CSS produced.
import { clamp01, resolveEasing } from '../motion.js';

export const slot = 'vars';

export const PROPS = {
  vars: {},
  varsDur: { when: 'vars' }, varsDelay: { when: 'vars' }, varsEase: { when: 'vars' },
};

// PER-CHANNEL timing. `varsEase`, `varsDur` and `varsDelay` each take a scalar (every channel, the
// original meaning) OR a map keyed by channel name, with `'*'` as the map's own default.
//
// WHY. One ease was computed for ALL channels, so a layer wanting width on one curve and radius on
// another had nowhere to put the second. higgsfield-recreation.json layer 4 morphs a rounded rect into a
// pill and needed exactly that, so its author drove a LINEAR 0→1 and hand-wrote the easing as polynomials
// inside CSS: `calc(392px - (var(--p)*0.35 + var(--p)*var(--p)*0.65) * 205px)` for width against
// `calc(30px + var(--p)*var(--p)*var(--p) * 900px)` for the radius. That is a workaround, and by this
// repo's own rule a workaround is a bug report. docs/MISTAKES.md #357.
const per = (v, name, dflt) =>
  (v && typeof v === 'object' && !Array.isArray(v)) ? (v[name] ?? v['*'] ?? dflt) : (v ?? dflt);

export function frame(kit, el, L, units, t, f, start) {
  if (!(L.vars && t >= start)) return;
  for (const [name, range] of Object.entries(L.vars)) {
    const vd = per(L.varsDur, name, 1.0);
    const v0 = start + per(L.varsDelay, name, 0);
    const u = vd > 0 ? clamp01((t - v0) / vd) : 1;
    const e = resolveEasing(per(L.varsEase, name, 'easeOutCubic'))(u);
    const [a, b] = Array.isArray(range) ? range : [0, range];
    el.style.setProperty(name, (a + (b - a) * e).toFixed(4));
  }
}
