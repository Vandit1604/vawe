// core/type.js — kinetic-typography kit (another engine "Kinetic Type" parity). All PURE in the time
// input `t`: presets map a per-unit local progress `u∈[0,1]` → {opacity, transform, filter}.
// splitText() is a one-time DOM setup (build time); animateUnits() is called every frame.
import { resolveEasing, clamp01, easeOutCubic, easeOutBack, easeOutSettle, spring, hashSeed } from './motion.js';

// mix two hex colours (for the inkflash colour-wave preset). Pure.
const _hx = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, t) => { const pa = _hx(a), pb = _hx(b); return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`; };

// splitText(el, mode): wrap each char|word|line of el's text in a <span class="ku"> so units
// animate independently. Returns the unit spans (in order). Idempotent-ish: call once at build.
// Preserves spaces; 'word' keeps words unbreakable. Inline formatting (<em>/<b>/…) is PRESERVED:
// element shells are kept in place and their text split inside them, so `.big em` styling reaches
// the units. Plain-text inputs produce the exact same DOM as before.
export function splitText(el, mode = 'word') {
  // 'path': the units are SVG strokes, not glyphs — for the `draw` preset (a logo/icon/chart line
  // drawing itself on). Stamping pathLength="1" here NORMALISES every path to a unit length, so the
  // preset is a pure function of u with no getTotalLength() measurement and no layout read. Returns
  // early: the DOM is not restructured at all, so nothing else about the element changes.
  if (mode === 'path') {
    const paths = [...el.querySelectorAll('path, line, polyline, circle, rect, ellipse')];
    for (const p of paths) p.setAttribute('pathLength', '1');
    return paths;
  }
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
  // the zero-motion preset: a hard snap on, no transform. `at` chooses WHERE in the entrance it
  // snaps (default 0 = the moment it starts). Raise it for a delayed hard cut in a staggered line.
  type: (u, { at = 0 } = {}) => ({ opacity: u > at ? 1 : 0, transform: 'none' }),
  // scale up from small
  scale: (u, { from = 0.4 } = {}) => ({ opacity: clamp01(u * 2), transform: `scale(${(from + (1 - from) * easeOutBack(u)).toFixed(3)})` }),
  // blur + fade in
  blur: (u, { px = 16 } = {}) => ({ opacity: clamp01(u), filter: `blur(${((1 - easeOutCubic(u)) * px).toFixed(2)}px)` }),
  // springy bounce in
  // `settle` used to scale the spring INPUT (`u * settle * 2`) while spring's own omega is 2π/settle,
  // so the two cancelled and the dial did nothing (docs/MISTAKES.md #115). Input is a constant now, so
  // settle drives the settle time as named; the constant 1.0 keeps the default (settle 0.5) identical.
  bounce: (u, { bounce = 0.5, settle = 0.5, dist = 60 } = {}) => { const s = spring(u, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }; },
  // slide from a side
  slide: (u, { dir = 'left', dist = 80 } = {}) => { const k = 1 - easeOutSettle(u); const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist; const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist; return { opacity: clamp01(u), transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }; },
  // persistent sinusoidal wave (u is used as raw phase, not a one-shot). No `loop:true` needed: this
  // preset and `shimmerWave` are force-looped by name at animateUnits (line ~255), so the instruction
  // this comment used to carry was redundant and read as a requirement.
  wave: (u, { amp = 14, phase = 0 } = {}) => ({ opacity: 1, transform: `translateY(${(Math.sin(u * Math.PI * 2 + phase) * amp).toFixed(2)}px)` }),
  // shimmerWave — a 3D traveling shimmer over live text (motion-primitives TextShimmerWave). Each glyph
  // rides a bump (translate + scale + rotateY + brightness) and the bump travels across the word via the
  // per-unit phase offset. Looping (u is raw phase); pair with a small `phaseStep` (~0.12) so the wave
  // reads as one crest moving, not every letter pulsing together. Pure in the phase → pure in n.
  shimmerWave: (u, { amp = 1 } = {}) => {
    const b = (1 - Math.cos(u * Math.PI * 2)) / 2;   // 0..1..0 bump over one cycle
    return { opacity: 1,
      transform: `perspective(600px) translateY(${(-8 * b * amp).toFixed(2)}px) translateZ(${(24 * b * amp).toFixed(1)}px) rotateY(${(12 * b * amp).toFixed(2)}deg) scale(${(1 + 0.12 * b * amp).toFixed(3)})`,
      filter: `brightness(${(1 + 0.5 * b).toFixed(3)})` };
  },
  // 3D flip-up per unit (cards/letters somersault into place)
  // a 3D card flip in. `axis` picks the hinge (x = top-over, y = door-swing) and `deg` the start
  // angle (bigger = more severe). Defaults reproduce the old fixed behaviour exactly.
  flip: (u, { axis = 'x', deg = 80 } = {}) => {
    const a = (1 - easeOutCubic(u)) * -deg;
    const rot = String(axis).toLowerCase() === 'y' ? `rotateY(${a.toFixed(1)}deg)` : `rotateX(${a.toFixed(1)}deg)`;
    return { opacity: clamp01(u * 1.5), transform: `perspective(900px) ${rot}` };
  },
  // fall from above with gravity (accelerating), tiny overshoot squash at landing
  fall: (u, { dist = 90 } = {}) => { const e = easeOutBack(clamp01(u)); return { opacity: clamp01(u * 2), transform: `translateY(${(-(1 - e) * dist).toFixed(2)}px)` }; },
  // elastic pop: springy scale with visible wobble
  elastic: (u, { bounce = 0.62, settle = 0.5 } = {}) => { const s = spring(clamp01(u) * 1.2, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `scale(${(0.3 + 0.7 * s).toFixed(3)})` }; },
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
  // inkflash: a wave of accent sweeps THROUGH a phrase word by word — each unit takes the flash colour,
  // BLEEDS outward the way wet ink spreads into stock, then absorbs and settles to the resting colour.
  //
  // Two things were wrong with the first version and both are the same bug one level apart. It defaulted
  // `flash` to a hardcoded #ff742e and `to` to a hardcoded #1c1613 — one brand's orange settling onto one
  // brand's near-black, in a preset every theme is invited to use, so on any other palette it flashed a
  // colour the theme does not contain and settled to a colour that may be invisible against the backdrop.
  // Both now default to the THEME (var(--accent), var(--ink)), which is what "the accent colour" meant.
  // And it was a linear crossfade with no ink in it: the name promises pigment hitting paper, the code
  // recoloured a glyph. The bleed is what makes it ink. docs/MISTAKES.md #352.
  inkflash: (u, { flash, to, hold = 0.5, bleed = 14 } = {}) => {
    const p = clamp01(u);
    const e = easeOutCubic(clamp01((p - hold) / (1 - hold)));            // the settle, after the hold
    const wet = Math.sin(clamp01(p / Math.max(0.001, hold)) * Math.PI);  // 0 -> 1 -> 0 across the hit
    const f = flash || 'var(--accent)', rest = to || 'var(--ink)';
    return {
      opacity: clamp01(p * 4),
      // color-mix keeps this working with TOKENS, which a hex-only mixer could not do — the resting
      // colour is usually the theme's, and the theme is only known as a CSS variable at render time.
      color: `color-mix(in srgb, ${f} ${((1 - e) * 100).toFixed(1)}%, ${rest})`,
      // the spread: widest at the moment of contact, gone once the ink has soaked in
      textShadow: wet > 0.01 ? `0 0 ${(bleed * wet).toFixed(2)}px color-mix(in srgb, ${f} ${(55 * wet).toFixed(0)}%, transparent)` : 'none',
      transform: 'none',
    };
  },
  // underline: draws left -> right beneath the unit
  underline: (u, { color = 'currentColor', h = 3 } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% ${h}px`, backgroundPosition: '0 100%', transform: 'none' }; },
  // shadow: poster lift — long shadow collapses as the word settles
  shadow: (u, { dist = 14 } = {}) => { const k = (1 - easeOutCubic(clamp01(u))); return { opacity: clamp01(u * 1.5), transform: `translateY(${(-k * 6).toFixed(2)}px)`, textShadow: `0 ${(k * dist).toFixed(1)}px ${(k * dist * 1.6).toFixed(1)}px rgba(0,0,0,0.55)` }; },
  // riseClip: the word rises out from behind a mask at its own baseline.
  // `dist` is a PERCENTAGE of the unit's own height, not px. It was 44px, which is a different
  // fraction of a 40px caption than of a 150px headline — at large sizes the word was already
  // half-visible at u=0, so the mask read as a smudge instead of an edge. A percentage is
  // self-scaling and needs no measurement, so the preset stays a pure function of u.
  riseClip: (u, { dist = 130 } = {}) => ({ opacity: 1, transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * dist).toFixed(2)}%)` }),
  // draw: an SVG stroke draws itself on. Pairs with splitText(el,'path'), which stamps
  // pathLength="1" so dash units are normalised — the offset is then a pure function of u with no
  // measurement. `back:true` draws from the far end. Hidden at u=0, exact identity at u=1 (dash
  // cleared, not left at 0, so the stroke renders as authored — dasharray:1 on a closed shape
  // would otherwise round-trip a hairline seam).
  draw: (u, { ease = 'easeOutCubic', back = false } = {}) => {
    // presetOpts arrive from JSON, so `ease` is a NAME here, not a function — resolveEasing takes
    // either. (Every other preset takes only numbers, so this is the first one that needed it.)
    const k = clamp01(u);
    if (k >= 1) return { opacity: 1, strokeDasharray: 'none', strokeDashoffset: '0' };
    const p = resolveEasing(ease)(k);
    return { opacity: k > 0 ? 1 : 0, strokeDasharray: '1 1', strokeDashoffset: (back ? p - 1 : 1 - p).toFixed(4) };
  },
  // chroma: chromatic-aberration entrance. R/G/B channels split apart (textShadow ghosts) and
  // converge as the unit settles to a CRISP glyph (residual 0 by default → no colour border at rest;
  // pass residual:>0 to leave a hair of fringe). The satisfying part is the misregistration resolving.
  chroma: (u, { dist = 16, rise = 10, residual = 0 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    const off = ((1 - e) * dist + residual);
    const y = (1 - easeOutSettle(clamp01(u))) * rise;
    return { opacity: clamp01(u * 2), transform: `translateY(${y.toFixed(2)}px)`,
      textShadow: `${off.toFixed(2)}px 0 0 rgba(255,0,64,0.75), ${(-off).toFixed(2)}px 0 0 rgba(0,180,255,0.75)` };
  },
  // swing: each unit hinges down from its top edge and swings past centre with a spring, settling
  // upright (pendulum). Playful; good on short words / punchy brands.
  swing: (u, { deg = 24, bounce = 0.5, settle = 0.55 } = {}) => {
    const s = spring(clamp01(u), { bounce, settle });
    return { opacity: clamp01(u * 2.5), transformOrigin: 'top center', transform: `rotate(${((1 - s) * deg).toFixed(2)}deg)` };
  },
  // unfold: each unit opens from edge-on (rotateY) about its left hinge to lie flat — a card/panel
  // turning to face you. Premium; reads well on serif or heavy display faces.
  unfold: (u, { deg = 90 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 2), transformOrigin: 'left center', transform: `perspective(820px) rotateY(${((1 - e) * -deg).toFixed(1)}deg)` };
  },
};

// One line per kinetic preset, beside the presets themselves. docs/EFFECTS.md renders these, and
// scripts/gates/lib-test.mjs fails when a preset has no blurb — a name with no description is a
// vocabulary an author cannot choose from. Say what it LOOKS like and when to reach for it, not how
// the maths works, and carry the caution where there is one (`wave`/`shimmerWave` never settle).
export const PRESET_BLURBS = {
  up: 'words/chars rise into place — the default kinetic headline',
  down: 'words/chars drop into place from above — the mirror of `up`',
  type: 'typewriter hard on/off, no transform — terminals, timers, code',
  scale: 'punch in from small (overshoot)',
  blur: 'resolve out of blur — calm, premium',
  bounce: 'springy bounce in — playful brands only',
  slide: 'slides in from one side (`dir`) — pair it with the opposite exit',
  wave: 'sinusoidal wave across units — a LOOP that never settles; ambient only',
  shimmerWave: 'looping light wave (per-unit) — a 3D crest travelling across the word; never settles',
  flip: '3D flip-up per unit, letters somersault into place — `axis` picks the hinge',
  fall: 'falls from above under gravity and lands with a small squash',
  elastic: 'elastic scale pop with visible wobble — playful brands only',
  skew: 'italic shear that straightens as it lands — editorial, sporty',
  focus: 'focus pull, heavy blur and over-scale resolving to crisp — dreamy, premium',
  decode: 'scramble→settle, techy',
  tilt: '3D tilt-in',
  stretch: 'horizontal smear that snaps true — impact words',
  gradient: 'gradient sweeps through letterforms',
  highlight: 'marker highlight sweep',
  inkflash: 'per-word accent colour-wave',
  underline: 'underline draws on',
  shadow: 'a long poster shadow collapses as the word settles — poster statements',
  riseClip: 'mask-rise reveal',
  draw: 'stroke draw-on for SVG paths',
  chroma: 'R/G/B ghosts split apart and converge to a crisp glyph',
  swing: 'each unit hinges from its top edge and swings upright — playful, short words',
  unfold: 'opens from edge-on about its left hinge, a panel turning to face you — premium',
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

// circleText(el, units, {radius}): lay split CHARS around a circle (motion-primitives SpinningText).
// Each char sits at its angle on the ring, rotated to face outward (seal / badge). The container spins
// via an inline transform driven per frame in scene.html (pure in t). Build-time layout only here.
export function circleText(el, units, { radius = 220 } = {}) {
  const n = units.length || 1;
  el.style.width = radius * 2 + 'px';
  el.style.height = radius * 2 + 'px';
  el.style.overflow = 'visible';
  el.style.textAlign = 'center';
  // pin centred the box while its height was still 0 (this runs after positioning), so it sits `radius`
  // too low — pull it back up so the ring is centred on the pin.
  el.style.marginTop = -radius + 'px';
  units.forEach((u, i) => {
    const ang = (i / n) * 360;
    u.style.position = 'absolute';
    u.style.left = '50%'; u.style.top = '50%';
    u.style.transformOrigin = '0 0';
    // rotate to the char's slot, push out to the radius, then centre the glyph on that point
    u.style.transform = `rotate(${ang.toFixed(2)}deg) translate(-50%, ${(-radius).toFixed(0)}px)`;
    u.style.margin = '0';
  });
}

// animateUnits(units, t, opts): apply a preset to each split unit at time t. Presets except `wave`
// are one-shot staggered reveals; `wave` uses (t * speed + i*phaseStep) as a looping phase.
export function animateUnits(units, t, { preset = 'up', each = 0.5, stagger = 0.06, loop = false, speed = 1, phaseStep = 0.5, ...popts } = {}) {
  const fn = PRESETS[preset] || PRESETS.up;
  units.forEach((el, i) => {
    if (loop || preset === 'wave' || preset === 'shimmerWave') {
      Object.assign(el.style, fn(t * speed + i * phaseStep, popts));
    } else {
      const u = unitProgress(t, i, units.length, { each, stagger });
      if (preset === 'decode') { decodeText(el, u, i); el.style.opacity = u > 0 ? '1' : '0'; return; }
      if (preset === 'riseClip' && el.parentElement && !el.parentElement.__clip) {
        // clip wrapper on demand (only for riseClip; keeps every other preset's DOM unchanged)
        const w = document.createElement('span');
        w.style.display = 'inline-block'; w.style.overflow = 'hidden'; w.style.verticalAlign = 'bottom'; w.__clip = true;
        // THE MASK MUST CONTAIN THE FONT'S FULL INK, NOT ITS LINE BOX. .hs-text sets line-height 1.04
        // — tighter than the descender depth of any real face — so `overflow: hidden` sliced 13px off
        // EVERY word at 76px, which is why g/y/p rendered with flat bottoms in shipped video. Pad the
        // mask downward and pull the identical amount back with a negative margin: the clip region
        // grows, the layout does not move a pixel. 0.3em clears the deepest descenders we ship.
        w.style.paddingBottom = '0.3em'; w.style.marginBottom = '-0.3em';
        el.parentElement.insertBefore(w, el); w.appendChild(el);
      }
      Object.assign(el.style, fn(u, popts));
    }
  });
}
