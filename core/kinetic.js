// kinetic.js — kinetic-typography kit (another engine "Kinetic Type" parity). All PURE in the time
// input `t`: presets map a per-unit local progress `u∈[0,1]` → {opacity, transform, filter}.
// splitText() is a one-time DOM setup (build time); animateUnits() is called every frame.
import { clamp01, easeOutCubic, easeOutBack, easeOutSettle, spring, hashSeed } from './lib.js';

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
  up: (u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${((1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
  down: (u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${(-(1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
  // typewriter: hard on/off (unit is fully in once its progress passes ~0)
  type: (u) => ({ opacity: u > 0 ? 1 : 0, transform: 'none' }),
  // scale up from small
  scale: (u, { from = 0.4 } = {}) => ({ opacity: clamp01(u * 2), transform: `scale(${(from + (1 - from) * easeOutBack(u)).toFixed(3)})` }),
  // blur + fade in
  blur: (u, { px = 16 } = {}) => ({ opacity: clamp01(u), filter: `blur(${((1 - easeOutCubic(u)) * px).toFixed(2)}px)` }),
  // springy bounce in
  bounce: (u, { bounce = 0.5, settle = 0.5, dist = 60 } = {}) => { const s = spring(u * settle * 2, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }; },
  // slide from a side
  slide: (u, { dir = 'left', dist = 80 } = {}) => { const k = 1 - easeOutSettle(u); const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist; const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist; return { opacity: clamp01(u), transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }; },
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
  // decode: deterministic scramble -> resolve (tech reveal; hero words only). Uses data-final
  // stashed by animateUnits on first call; character choice = hashSeed(unit index, step) — pure.
  decode: (u, { i = 0 } = {}) => {
    const uu = clamp01(u);
    return { opacity: uu > 0 ? 1 : 0, __decode: uu, transform: 'none' }; // resolved in animateUnits (needs textContent)
  },
  // tilt: small rotate-in + rise (sporty/editorial)
  tilt: (u, { deg = 8, dist = 26 } = {}) => { const e = easeOutSettle(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateY(${((1 - e) * dist).toFixed(2)}px) rotate(${((1 - e) * -deg).toFixed(2)}deg)` }; },
  // stretch: horizontal smear that snaps true (impact words)
  stretch: (u, { from = 1.6 } = {}) => { const e = easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 2), transform: `scaleX(${(from + (1 - from) * e).toFixed(3)})`, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }; },
  // gradient sweep: background-clip text, gradient slides through (ONE hero word per film)
  gradient: (u, { c1 = '#8a8f98', c2 = '#ffffff' } = {}) => { const pos = (100 - clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(100deg, ${c1} 20%, ${c2} 50%, ${c1} 80%)`, backgroundSize: '250% 100%', backgroundPosition: `${pos}% 0`, webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', transform: 'none' }; },
  // highlight: marker band grows behind the unit (emphasis mid-sentence)
  highlight: (u, { color = 'rgba(255,220,90,0.35)' } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% 78%`, backgroundPosition: '0 60%', transform: 'none' }; },
  // underline: draws left -> right beneath the unit
  underline: (u, { color = 'currentColor', h = 3 } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% ${h}px`, backgroundPosition: '0 100%', transform: 'none' }; },
  // shadow: poster lift — long shadow collapses as the word settles
  shadow: (u, { dist = 14 } = {}) => { const k = (1 - easeOutCubic(clamp01(u))); return { opacity: clamp01(u * 1.5), transform: `translateY(${(-k * 6).toFixed(2)}px)`, textShadow: `0 ${(k * dist).toFixed(1)}px ${(k * dist * 1.6).toFixed(1)}px rgba(0,0,0,0.55)` }; },
  // riseClip: word rises out of its own baseline (needs clip wrappers — pass clip:true to splitText... handled by animateUnits fallback to plain rise if no wrapper)
  riseClip: (u, { dist = 44 } = {}) => ({ opacity: 1, transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * dist).toFixed(2)}px)` }),
};

// decode support: scrambles textContent deterministically until u resolves each char L->R.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ023456789#$%&';
export function decodeText(el, u, unitIndex) {
  if (el.__final == null) el.__final = el.textContent;
  const fin = el.__final, n = fin.length;
  if (u >= 1) { if (el.textContent !== fin) el.textContent = fin; return; }
  const settled = Math.floor(clamp01(u) * (n + 1));
  const step = Math.floor(clamp01(u) * 24); // scramble evolves with u (pure)
  let out = '';
  for (let c = 0; c < n; c++) {
    if (c < settled || fin[c] === ' ') out += fin[c];
    else out += GLYPHS[hashSeed(`${unitIndex}:${c}:${step}`) % GLYPHS.length];
  }
  if (el.textContent !== out) el.textContent = out;
}

// animateUnits(units, t, opts): apply a preset to each split unit at time t. Presets except `wave`
// are one-shot staggered reveals; `wave` uses (t * speed + i*phaseStep) as a looping phase.
export function animateUnits(units, t, { preset = 'up', each = 0.5, stagger = 0.06, loop = false, speed = 1, phaseStep = 0.5, ...popts } = {}) {
  const fn = PRESETS[preset] || PRESETS.up;
  units.forEach((el, i) => {
    if (loop || preset === 'wave') {
      Object.assign(el.style, fn(t * speed + i * phaseStep, popts));
    } else {
      const u = unitProgress(t, i, units.length, { each, stagger });
      if (preset === 'decode') { decodeText(el, u, i); el.style.opacity = u > 0 ? '1' : '0'; return; }
      if (preset === 'riseClip' && el.parentElement && !el.parentElement.__clip) {
        // clip wrapper on demand (only for riseClip; keeps every other preset's DOM unchanged)
        const w = document.createElement('span');
        w.style.display = 'inline-block'; w.style.overflow = 'hidden'; w.style.verticalAlign = 'bottom'; w.__clip = true;
        el.parentElement.insertBefore(w, el); w.appendChild(el);
      }
      Object.assign(el.style, fn(u, popts));
    }
  });
}
