// kinetic.js — kinetic-typography kit (another engine "Kinetic Type" parity). All PURE in the time
// input `t`: presets map a per-unit local progress `u∈[0,1]` → {opacity, transform, filter}.
// splitText() is a one-time DOM setup (build time); animateUnits() is called every frame.
import { clamp01, easeOutCubic, easeOutBack, spring } from './lib.js';

// splitText(el, mode): wrap each char|word|line of el's text in a <span class="ku"> so units
// animate independently. Returns the unit spans (in order). Idempotent-ish: call once at build.
// Preserves spaces; 'word' keeps words unbreakable. Inline formatting (<em>/<b>/…) is PRESERVED:
// element shells are kept in place and their text split inside them, so `.big em` styling reaches
// the units. Plain-text inputs produce the exact same DOM as before.
export function splitText(el, mode = 'word') {
  const mk = (t) => { const s = document.createElement('span'); s.className = 'ku'; s.style.display = 'inline-block'; s.style.whiteSpace = 'pre'; s.textContent = t; return s; };
  const units = [];
  const splitInto = (dest, text) => {
    if (mode === 'char') {
      // wrap each WORD in a nowrap inline-block so the line breaks at spaces (never mid-word),
      // while individual chars still animate. Whitespace is kept as plain text between wrappers.
      for (const w of text.split(/(\s+)/)) {
        if (w === '') continue;
        if (/^\s+$/.test(w)) { dest.appendChild(document.createTextNode(w)); continue; }
        const wrap = document.createElement('span');
        wrap.style.display = 'inline-block'; wrap.style.whiteSpace = 'nowrap';
        for (const ch of w) { const s = mk(ch); wrap.appendChild(s); units.push(s); }
        dest.appendChild(wrap);
      }
    } else if (mode === 'line') {
      text.split('\n').forEach((ln, i) => { if (i) dest.appendChild(document.createElement('br')); const s = mk(ln); dest.appendChild(s); units.push(s); });
    } else { // word
      const parts = text.split(/(\s+)/); // keep the whitespace tokens
      for (const p of parts) { if (p === '') continue; const s = mk(p); dest.appendChild(s); if (p.trim()) units.push(s); }
    }
  };
  const walk = (src, dest) => {
    for (const node of [...src.childNodes]) {
      if (node.nodeType === 3) splitInto(dest, node.nodeValue);
      else if (node.nodeType === 1) { const shell = node.cloneNode(false); dest.appendChild(shell); walk(node, shell); }
    }
  };
  const src = el.cloneNode(true);
  el.textContent = '';
  walk(src, el);
  return units;
}

// unitProgress(t, i, n, {each, stagger, total}): local [0,1] progress for unit i of n at time t(s).
// each = per-unit animation seconds; stagger = delay step between units.
export function unitProgress(t, i, n, { each = 0.5, stagger = 0.06 } = {}) {
  return clamp01((t - i * stagger) / each);
}

// ---------- presets: u∈[0,1] → style object (compositor-friendly props only) ----------
export const PRESETS = {
  // rise + fade (default kinetic reveal)
  up: (u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${((1 - easeOutCubic(u)) * dist).toFixed(2)}px)` }),
  down: (u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${(-(1 - easeOutCubic(u)) * dist).toFixed(2)}px)` }),
  // typewriter: hard on/off (unit is fully in once its progress passes ~0)
  type: (u) => ({ opacity: u > 0 ? 1 : 0, transform: 'none' }),
  // scale up from small
  scale: (u, { from = 0.4 } = {}) => ({ opacity: clamp01(u * 2), transform: `scale(${(from + (1 - from) * easeOutBack(u)).toFixed(3)})` }),
  // blur + fade in
  blur: (u, { px = 16 } = {}) => ({ opacity: clamp01(u), filter: `blur(${((1 - easeOutCubic(u)) * px).toFixed(2)}px)` }),
  // springy bounce in
  bounce: (u, { bounce = 0.5, settle = 0.5, dist = 60 } = {}) => { const s = spring(u * settle * 2, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }; },
  // slide from a side
  slide: (u, { dir = 'left', dist = 80 } = {}) => { const k = 1 - easeOutCubic(u); const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist; const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist; return { opacity: clamp01(u), transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }; },
  // persistent sinusoidal wave (u is used as raw phase, not a one-shot) — pass loop:true in animateUnits
  wave: (u, { amp = 14, phase = 0 } = {}) => ({ opacity: 1, transform: `translateY(${(Math.sin(u * Math.PI * 2 + phase) * amp).toFixed(2)}px)` }),
  // 3D flip-up per unit (cards/letters somersault into place)
  flip: (u) => ({ opacity: clamp01(u * 1.5), transform: `perspective(900px) rotateX(${((1 - easeOutCubic(u)) * -80).toFixed(1)}deg)` }),
  // fall from above with gravity (accelerating), tiny overshoot squash at landing
  fall: (u, { dist = 90 } = {}) => { const e = easeOutBack(clamp01(u)); return { opacity: clamp01(u * 2), transform: `translateY(${(-(1 - e) * dist).toFixed(2)}px)` }; },
  // elastic pop: springy scale with visible wobble
  elastic: (u, { bounce = 0.62, settle = 0.5 } = {}) => { const s = spring(clamp01(u) * settle * 2.4, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `scale(${(0.3 + 0.7 * s).toFixed(3)})` }; },
  // skew slide: italic shear that straightens as it lands (editorial/sporty)
  skew: (u, { dist = 70 } = {}) => { const k = 1 - easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateX(${(-k * dist).toFixed(2)}px) skewX(${(-k * 14).toFixed(1)}deg)` }; },
  // focus pull: heavy blur + slight over-scale resolving to crisp
  focus: (u, { px = 22 } = {}) => ({ opacity: clamp01(u * 1.3), transform: `scale(${(1 + (1 - easeOutCubic(clamp01(u))) * 0.06).toFixed(3)})`, filter: `blur(${((1 - easeOutCubic(clamp01(u))) * px).toFixed(2)}px)` }),
};

// animateUnits(units, t, opts): apply a preset to each split unit at time t. Presets except `wave`
// are one-shot staggered reveals; `wave` uses (t * speed + i*phaseStep) as a looping phase.
export function animateUnits(units, t, { preset = 'up', each = 0.5, stagger = 0.06, loop = false, speed = 1, phaseStep = 0.5, ...popts } = {}) {
  const fn = PRESETS[preset] || PRESETS.up;
  units.forEach((el, i) => {
    if (loop || preset === 'wave') {
      Object.assign(el.style, fn(t * speed + i * phaseStep, popts));
    } else {
      Object.assign(el.style, fn(unitProgress(t, i, units.length, { each, stagger }), popts));
    }
  });
}
