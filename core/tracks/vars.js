// core/tracks/vars.js — ANIMATED CSS VARIABLES. The engine could drive transform, opacity and blur and
// nothing else, so a block could only ever ENTER — every one of them wore the same `anim:'rise'`
// because there was no way to animate what the block actually DOES. A gauge cannot sweep to its
// reading, a bar cannot grow, a line cannot draw on. Interpolating a custom property fixes the whole
// class at once: the block writes `var(--p)` into its own CSS or SVG and the engine drives the number.
// Pure in n — the value is a function of t and nothing else.
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

export function frame(kit, el, L, units, t, f, start) {
  if (!(L.vars && t >= start)) return;
  const vd = L.varsDur ?? 1.0, v0 = start + (L.varsDelay ?? 0);
  const u = vd > 0 ? clamp01((t - v0) / vd) : 1;
  const e = resolveEasing(L.varsEase || 'easeOutCubic')(u);
  for (const [name, range] of Object.entries(L.vars)) {
    const [a, b] = Array.isArray(range) ? range : [0, range];
    el.style.setProperty(name, (a + (b - a) * e).toFixed(4));
  }
}
