// core/type.js — kinetic-typography kit (another engine "Kinetic Type" parity). All PURE in the time
// input `t`: presets map a per-unit local progress `u∈[0,1]` → {opacity, transform, filter}.
// splitText() is a one-time DOM setup (build time); animateUnits() is called every frame.
import { resolveEasing, clamp01, easeOutCubic, easeOutBack, easeOutSettle, spring, hashSeed } from './motion.js';
import { defineRegistry, blurbsOf, withBlurb } from './registry.js';

// mix two hex colours. Pure. (colorWave now uses color-mix so it can take theme TOKENS, not just hex.)
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

// Each preset carries its own one-liner, so adding a preset is ONE edit: the blurb rides the entry
// instead of sitting in a second map that agreed with this one only because a gate said so. Say what
// it LOOKS like and when to reach for it, not how the maths works, and carry the caution where there
// is one (`wave`/`shimmerWave` never settle). docs/EFFECTS.md renders these lines verbatim.
// withBlurb, not a local Object.assign: two agents built this independently and each invented its own
// way to attach a blurb, which is precisely the duplication the change exists to remove. One
// mechanism for a FUNCTION entry (core/registry.js), and a plain `blurb:` key for a DATA entry
// like a look, where no helper is needed.
const preset = (fn, blurb) => withBlurb(blurb, fn);

// wght(n) — one weight, said in BOTH channels, because the two are not interchangeable and neither
// alone is safe. `font-variation-settings` is the only one that can express 634, and 20 of the 31
// vendored woff2 carry a `wght` axis it drives continuously; on the other 11 (CourierPrime, the two
// InstrumentSerif cuts, IosevkaCharon, FiraSansExtraCondensed and the static inter-*/space-* subsets)
// it is SILENTLY IGNORED, which is this repo's most-logged bug shape. `fontWeight` is what those 11
// hear, so the ramp degrades to the nearest static cut instead of to a dead still.
// Rounded to 1 for the axis and to the CSS 100-step for the fallback: a value written every frame
// must be stable in u, and a float in a fallback nobody can interpolate buys nothing.
// NO `wdth`. Anybody is documented upstream as wdth+wght and core/tokens.css:58 repeats it, but
// fontkit reports ONE axis on the vendored subset and on all 19 others: the width axis did not
// survive subsetting. A width ramp would therefore be a no-op on every face this engine ships.
export const wght = (n) => {
  const v = Math.round(Math.max(100, Math.min(900, n)));
  return { fontWeight: String(Math.round(v / 100) * 100), fontVariationSettings: `'wght' ${v}` };
};


// ---------- presets: u∈[0,1] → style object (compositor-friendly props only) ----------
export const PRESETS = {
  // weight — the font's own `wght` axis IS the entrance. Every other preset here moves a glyph or fades
  // it; this one redraws the outline, which is the one register a static face cannot fake and the thing
  // current practice means by kinetic typography. Staggered per unit, the ramp reads as a CREST OF
  // WEIGHT travelling the headline rather than as a line of type arriving.
  //
  // ON THE 11 STATIC FACES IT STILL WORKS, and that is the reason wght() writes both channels:
  // `font-variation-settings` is silently ignored by a face with no axis, so on CourierPrime, the two
  // InstrumentSerif cuts, IosevkaCharon, FiraSansExtraCondensed and the static inter-*/space-* subsets
  // the `fontWeight` half lands instead and the ramp degrades to the nearest 100-step cut. Coarse, and
  // never a dead still — the failure this repo logs most.
  //
  // NO WIDTH TWIN. No face this engine ships keeps a `wdth` axis (core/tokens.css:58): the width axis
  // did not survive subsetting, so a width ramp would be a no-op on all 31 and is deliberately unbuilt.
  //
  // WEIGHT IS A LAYOUT PROPERTY whichever channel writes it, so the words after the one being drawn
  // shift as the crest passes. On a centred headline that reads as the line breathing; it is the cost
  // of the register, not a bug. Pair it with `split:"word"` and a stagger, and give the line room.
  weight: preset((u, { from = 200, to = 800, rise = 12 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 2), ...wght(from + (to - from) * e),
      transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * rise).toFixed(2)}px)` };
  },
    'the glyphs THICKEN into place along the font\'s own `wght` axis, a crest of weight travelling the line · the one register a static face cannot fake, and it degrades to the nearest static cut rather than to a dead still'),
  // rise + fade (default kinetic reveal)
  up: preset((u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${((1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
    'words/chars rise into place — the default kinetic headline'),
  down: preset((u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${(-(1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
    'words/chars drop into place from above — the mirror of `up`'),
  // typewriter: hard on/off (unit is fully in once its progress passes ~0)
  // the zero-motion preset: a hard snap on, no transform. `at` chooses WHERE in the entrance it
  // snaps (default 0 = the moment it starts). Raise it for a delayed hard cut in a staggered line.
  type: preset((u, { at = 0 } = {}) => ({ opacity: u > at ? 1 : 0, transform: 'none' }),
    'typewriter hard on/off, no transform — terminals, timers, code'),
  // scale up from small
  scale: preset((u, { from = 0.4 } = {}) => ({ opacity: clamp01(u * 2), transform: `scale(${(from + (1 - from) * easeOutBack(u)).toFixed(3)})` }),
    'punch in from small (overshoot)'),
  // blur + fade in
  blur: preset((u, { px = 16 } = {}) => ({ opacity: clamp01(u), filter: `blur(${((1 - easeOutCubic(u)) * px).toFixed(2)}px)` }),
    'resolve out of blur — calm, premium'),
  // springy bounce in
  // `settle` used to scale the spring INPUT (`u * settle * 2`) while spring's own omega is 2π/settle,
  // so the two cancelled and the dial did nothing (docs/MISTAKES.md #115). Input is a constant now, so
  // settle drives the settle time as named; the constant 1.0 keeps the default (settle 0.5) identical.
  bounce: preset((u, { bounce = 0.5, settle = 0.5, dist = 60 } = {}) => { const s = spring(u, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }; },
    'springy bounce in — playful brands only'),
  // slide from a side
  slide: preset((u, { dir = 'left', dist = 80 } = {}) => { const k = 1 - easeOutSettle(u); const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist; const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist; return { opacity: clamp01(u), transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }; },
    'slides in from one side (`dir`) — pair it with the opposite exit'),
  // persistent sinusoidal wave (u is used as raw phase, not a one-shot). No `loop:true` needed: this
  // preset and `shimmerWave` are force-looped by name at animateUnits (line ~255), so the instruction
  // this comment used to carry was redundant and read as a requirement.
  wave: preset((u, { amp = 14, phase = 0 } = {}) => ({ opacity: 1, transform: `translateY(${(Math.sin(u * Math.PI * 2 + phase) * amp).toFixed(2)}px)` }),
    'sinusoidal wave across units — a LOOP that never settles; ambient only'),
  // shimmerWave — a 3D traveling shimmer over live text (motion-primitives TextShimmerWave). Each glyph
  // rides a bump (translate + scale + rotateY + brightness) and the bump travels across the word via the
  // per-unit phase offset. Looping (u is raw phase); pair with a small `phaseStep` (~0.12) so the wave
  // reads as one crest moving, not every letter pulsing together. Pure in the phase → pure in n.
  shimmerWave: preset((u, { amp = 1 } = {}) => {
    const b = (1 - Math.cos(u * Math.PI * 2)) / 2;   // 0..1..0 bump over one cycle
    return { opacity: 1,
      transform: `perspective(600px) translateY(${(-8 * b * amp).toFixed(2)}px) translateZ(${(24 * b * amp).toFixed(1)}px) rotateY(${(12 * b * amp).toFixed(2)}deg) scale(${(1 + 0.12 * b * amp).toFixed(3)})`,
      filter: `brightness(${(1 + 0.5 * b).toFixed(3)})` };
  },
    'looping light wave (per-unit) — a 3D crest travelling across the word; never settles'),
  // 3D flip-up per unit (cards/letters somersault into place)
  // a 3D card flip in. `axis` picks the hinge (x = top-over, y = door-swing) and `deg` the start
  // angle (bigger = more severe). Defaults reproduce the old fixed behaviour exactly.
  flip: preset((u, { axis = 'x', deg = 80 } = {}) => {
    const a = (1 - easeOutCubic(u)) * -deg;
    const rot = String(axis).toLowerCase() === 'y' ? `rotateY(${a.toFixed(1)}deg)` : `rotateX(${a.toFixed(1)}deg)`;
    return { opacity: clamp01(u * 1.5), transform: `perspective(900px) ${rot}` };
  },
    '3D flip-up per unit, letters somersault into place — `axis` picks the hinge'),
  // fall from above with gravity (accelerating), tiny overshoot squash at landing
  fall: preset((u, { dist = 90 } = {}) => { const e = easeOutBack(clamp01(u)); return { opacity: clamp01(u * 2), transform: `translateY(${(-(1 - e) * dist).toFixed(2)}px)` }; },
    'falls from above under gravity and lands with a small squash'),
  // elastic pop: springy scale with visible wobble
  elastic: preset((u, { bounce = 0.62, settle = 0.5 } = {}) => { const s = spring(clamp01(u) * 1.2, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `scale(${(0.3 + 0.7 * s).toFixed(3)})` }; },
    'elastic scale pop with visible wobble — playful brands only'),
  // skew slide: italic shear that straightens as it lands (editorial/sporty)
  skew: preset((u, { dist = 70 } = {}) => { const k = 1 - easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateX(${(-k * dist).toFixed(2)}px) skewX(${(-k * 14).toFixed(1)}deg)` }; },
    'italic shear that straightens as it lands — editorial, sporty'),
  // focus pull: heavy blur + slight over-scale resolving to crisp
  focus: preset((u, { px = 22 } = {}) => ({ opacity: clamp01(u * 1.3), transform: `scale(${(1 + (1 - easeOutCubic(clamp01(u))) * 0.06).toFixed(3)})`, filter: `blur(${((1 - easeOutCubic(clamp01(u))) * px).toFixed(2)}px)` }),
    'focus pull, heavy blur and over-scale resolving to crisp — dreamy, premium'),
  // decode: deterministic scramble -> resolve (tech reveal; hero words only). Uses data-final
  // stashed by animateUnits on first call; character choice = hashSeed(unit index, step) — pure.
  decode: preset((u, { i = 0 } = {}) => {
    const uu = clamp01(u);
    return { opacity: uu > 0 ? 1 : 0, __decode: uu, transform: 'none' }; // resolved in animateUnits (needs textContent)
  },
    'scramble→settle, techy'),
  // tilt: small rotate-in + rise (sporty/editorial)
  tilt: preset((u, { deg = 8, dist = 26 } = {}) => { const e = easeOutSettle(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateY(${((1 - e) * dist).toFixed(2)}px) rotate(${((1 - e) * -deg).toFixed(2)}deg)` }; },
    '3D tilt-in'),
  // stretch: horizontal smear that snaps true (impact words)
  stretch: preset((u, { from = 1.6 } = {}) => { const e = easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 2), transform: `scaleX(${(from + (1 - from) * e).toFixed(3)})`, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }; },
    'horizontal smear that snaps true — impact words'),
  // gradient sweep: background-clip text, gradient slides through (ONE hero word per film)
  gradient: preset((u, { c1 = '#8a8f98', c2 = '#ffffff' } = {}) => { const pos = (100 - clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(100deg, ${c1} 20%, ${c2} 50%, ${c1} 80%)`, backgroundSize: '250% 100%', backgroundPosition: `${pos}% 0`, webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', transform: 'none' }; },
    'gradient sweeps through letterforms'),
  // highlight: marker band grows behind the unit (emphasis mid-sentence)
  highlight: preset((u, { color = 'rgba(255,220,90,0.35)' } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% 78%`, backgroundPosition: '0 60%', transform: 'none' }; },
    'marker highlight sweep'),
  // colorWave: a wave of the accent sweeps THROUGH a phrase word by word - each unit appears in the
  // accent colour and settles to the resting one. Split by word with a stagger (or staggered per-layer)
  // so the wave travels along the line.
  //
  // IT WAS CALLED `inkflash`, and the name was the only ink in it. The effect was extracted from the
  // Brew launch film (docs/CRAFT/REFERENCE-STUDY.md), where a collage "lights EACH word orange in turn";
  // what was measured off that reference was a COLOUR WAVE, and that is faithfully what was built. The
  // name promised pigment hitting paper, so a bleed was later added to make the code match the word -
  // which is designing backwards from a label. Renamed to what it does, and the bleed removed with the
  // name that asked for it. A real ink effect is still unbuilt and should be built as itself.
  //
  // The two colours were `#ff742e` and `#1c1613`: the reference brand's accent and ink (themes/brew.json),
  // frozen into a preset every theme may use. They default to the THEME now. docs/MISTAKES.md #354.
  colorWave: preset((u, { flash, to, hold = 0.5 } = {}) => {
    const e = easeOutCubic(clamp01((clamp01(u) - hold) / (1 - hold)));
    // The resting colour DEFAULTS TO THE LAYER'S OWN, not to `var(--ink)`. This preset paints `color` on
    // every unit every frame, so it overrides the per-window automatic ink that core/layers/util.js just
    // resolved — and `--ink` is the dark one in a white-first theme, so a colour-wave headline over a
    // dark bg window settled to invisible while the same headline without the preset read fine.
    // `--layer-ink` is that layer's settled colour, published by util.js. An explicit `to` still wins.
    const f = flash || 'var(--accent)', rest = to || 'var(--layer-ink, var(--ink))';
    return {
      opacity: clamp01(u * 4),
      // color-mix, not a hex lerp: the resting colour is usually the theme's, and a theme colour is only
      // known as a CSS variable at render time. The original mixHex could only take literals.
      color: `color-mix(in srgb, ${f} ${((1 - e) * 100).toFixed(1)}%, ${rest})`,
      transform: 'none',
    };
  },
    'the accent sweeps word by word along a line, each unit lighting then settling to the resting colour'),
  // underline: draws left -> right beneath the unit
  underline: preset((u, { color = 'currentColor', h = 3 } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% ${h}px`, backgroundPosition: '0 100%', transform: 'none' }; },
    'underline draws on'),
  // shadow: poster lift — long shadow collapses as the word settles
  shadow: preset((u, { dist = 14 } = {}) => { const k = (1 - easeOutCubic(clamp01(u))); return { opacity: clamp01(u * 1.5), transform: `translateY(${(-k * 6).toFixed(2)}px)`, textShadow: `0 ${(k * dist).toFixed(1)}px ${(k * dist * 1.6).toFixed(1)}px rgba(0,0,0,0.55)` }; },
    'a long poster shadow collapses as the word settles — poster statements'),
  // riseClip: the word rises out from behind a mask at its own baseline.
  // `dist` is a PERCENTAGE of the unit's own height, not px. It was 44px, which is a different
  // fraction of a 40px caption than of a 150px headline — at large sizes the word was already
  // half-visible at u=0, so the mask read as a smudge instead of an edge. A percentage is
  // self-scaling and needs no measurement, so the preset stays a pure function of u.
  riseClip: preset((u, { dist = 130 } = {}) => ({ opacity: 1, transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * dist).toFixed(2)}%)` }),
    'mask-rise reveal'),
  // draw: an SVG stroke draws itself on. Pairs with splitText(el,'path'), which stamps
  // pathLength="1" so dash units are normalised — the offset is then a pure function of u with no
  // measurement. `back:true` draws from the far end. Hidden at u=0, exact identity at u=1 (dash
  // cleared, not left at 0, so the stroke renders as authored — dasharray:1 on a closed shape
  // would otherwise round-trip a hairline seam).
  draw: preset((u, { ease = 'easeOutCubic', back = false } = {}) => {
    // presetOpts arrive from JSON, so `ease` is a NAME here, not a function — resolveEasing takes
    // either. (Every other preset takes only numbers, so this is the first one that needed it.)
    const k = clamp01(u);
    if (k >= 1) return { opacity: 1, strokeDasharray: 'none', strokeDashoffset: '0' };
    const p = resolveEasing(ease)(k);
    return { opacity: k > 0 ? 1 : 0, strokeDasharray: '1 1', strokeDashoffset: (back ? p - 1 : 1 - p).toFixed(4) };
  },
    'stroke draw-on for SVG paths'),
  // chroma: chromatic-aberration entrance. R/G/B channels split apart (textShadow ghosts) and
  // converge as the unit settles to a CRISP glyph (residual 0 by default → no colour border at rest;
  // pass residual:>0 to leave a hair of fringe). The satisfying part is the misregistration resolving.
  chroma: preset((u, { dist = 16, rise = 10, residual = 0 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    const off = ((1 - e) * dist + residual);
    const y = (1 - easeOutSettle(clamp01(u))) * rise;
    return { opacity: clamp01(u * 2), transform: `translateY(${y.toFixed(2)}px)`,
      textShadow: `${off.toFixed(2)}px 0 0 rgba(255,0,64,0.75), ${(-off).toFixed(2)}px 0 0 rgba(0,180,255,0.75)` };
  },
    'R/G/B ghosts split apart and converge to a crisp glyph'),
  // swing: each unit hinges down from its top edge and swings past centre with a spring, settling
  // upright (pendulum). Playful; good on short words / punchy brands.
  swing: preset((u, { deg = 24, bounce = 0.5, settle = 0.55 } = {}) => {
    const s = spring(clamp01(u), { bounce, settle });
    return { opacity: clamp01(u * 2.5), transformOrigin: 'top center', transform: `rotate(${((1 - s) * deg).toFixed(2)}deg)` };
  },
    'each unit hinges from its top edge and swings upright — playful, short words'),
  // unfold: each unit opens from edge-on (rotateY) about its left hinge to lie flat — a card/panel
  // turning to face you. Premium; reads well on serif or heavy display faces.
  unfold: preset((u, { deg = 90 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 2), transformOrigin: 'left center', transform: `perspective(820px) rotateY(${((1 - e) * -deg).toFixed(1)}deg)` };
  },
    'opens from edge-on about its left hinge, a panel turning to face you — premium'),
  // strike — a rule DRAWS THROUGH the unit and the word dims behind it. This is the "not X, Y" beat,
  // and it is the half of it the engine could not say: rejecting a word out loud, on screen, so the
  // replacement means something. `grep strike core/` returned nothing before this entry.
  //
  // The rule is a BACKGROUND, not a border and not `text-decoration`: a background can be sized to a
  // percentage of the unit's own box, so the line grows across the word as a pure function of u, and
  // it needs no measurement of the glyphs. Same instrument as `underline` and `highlight`, aimed at
  // the middle of the line box instead of the baseline.
  //
  // THE DIM STARTS AFTER THE LINE HAS CROSSED (0.6), because a word that fades while it is being
  // struck reads as a word disappearing, not as a word being rejected. It must stay legible: "not X"
  // is only worth showing while X can still be read. `fade: 0` keeps it at full strength.
  strike: preset((u, { color = 'currentColor', h = 3, fade = 0.45, at = 54 } = {}) => {
    const p = clamp01(u);
    const w = (easeOutCubic(p) * 100).toFixed(1);
    return { opacity: (1 - fade * clamp01((p - 0.6) / 0.4)).toFixed(4),
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${w}% ${h}px`,
      backgroundPosition: `0 ${at}%`, transform: 'none' };
  },
    'a rule draws THROUGH the word and it dims behind the line, still legible — the "not X, Y" beat, where the rejection is the content'),
  // flap — a SPLIT-FLAP BOARD: the glyph steps FORWARD through the board's own alphabet, one flap at a
  // time, and lands on its letter. Every unit hinges as it turns, so a staggered line reads as a
  // mechanical row settling left to right.
  //
  // NOT `decode`. decode scrambles at random and resolves; the whole charm of a board is that the
  // sequence is ORDERED, so a viewer can see the letter coming three flaps out. Different rhythm
  // (mechanical, not techy) and a different read, which is why it is a second preset and not a knob.
  //
  // The character is mutated by flapText in animateUnits — the same seam `decode` uses, because a
  // preset returns a STYLE and the board's subject is the text. `steps` is how many flaps it runs, so
  // it is also the speed: the whole run is fitted into `each`, however many flaps you ask for.
  flap: preset((u, { steps = 12 } = {}) => {
    const p = clamp01(u);
    if (p >= 1) return { opacity: 1, transform: 'none' };
    // the hinge angle inside ONE flap, so the stutter has the same period as the character change
    const q = (1 - p) * steps;
    const frac = q - Math.floor(q);
    return { opacity: 1, transformOrigin: 'center center',
      transform: `perspective(420px) rotateX(${(-72 * frac).toFixed(2)}deg)` };
  },
    'the glyph steps FORWARD through the board\'s alphabet one flap at a time and lands on its letter, hinging as it turns — an airport board, ordered where `decode` is random'),
};

// Read off the presets themselves; blurbsOf throws at load naming any preset that forgot one.
export const PRESET_BLURBS = blurbsOf('kinetic preset', PRESETS);

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

// flap support: the split-flap alphabet, and the ordered walk up to the final character. A board only
// carries the glyphs on its drums, so lowercase is shown as its capital while the drum is turning and
// the AUTHOR'S text is restored exactly at the end — a lowercase headline still renders as written.
// A character the board has no drum for (an emoji, a CJK glyph) never flaps: it is simply there.
const FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-/&$%+#@';
export function flapText(el, u, steps = 12) {
  if (el.__final == null) el.__final = el.textContent;
  const fin = el.__final;
  if (u >= 1) { if (el.textContent !== fin) el.textContent = fin; return; }
  // walk BACKWARDS from the target by the flaps still to run, so the drum arrives forward onto it
  const back = Math.ceil(clamp01(1 - u) * steps);
  let out = '';
  for (const ch of fin) {
    const idx = FLAPS.indexOf(ch.toUpperCase());
    out += idx < 0 ? ch : FLAPS[((idx - back) % FLAPS.length + FLAPS.length) % FLAPS.length];
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
  // An unknown name is a HARD ERROR. It used to fall back to `up`, so a typo - or a preset renamed out
  // from under a scene - rendered a plausible frame that was not what was asked for, and the schema does
  // not enumerate these names either, so nothing else caught it. Same reasoning as the unknown-modifier
  // throw in core/fx/index.js. docs/MISTAKES.md #354.
  const fn = PRESET_REGISTRY.pick(preset);
  units.forEach((el, i) => {
    if (loop || preset === 'wave' || preset === 'shimmerWave') {
      Object.assign(el.style, fn(t * speed + i * phaseStep, popts));
    } else {
      const u = unitProgress(t, i, units.length, { each, stagger });
      if (preset === 'decode') { decodeText(el, u, i); el.style.opacity = u > 0 ? '1' : '0'; return; }
      // `flap` mutates the character too, but unlike decode it also has a hinge to apply, so the
      // preset's own style still runs. Both live here for the same reason: a preset returns a style
      // and neither of these two effects is one.
      if (preset === 'flap') flapText(el, u, popts.steps ?? 12);
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

// Defined after PRESETS so the map is complete. Gives the cross-registry hint: `preset:"popIn"`
// is told that popIn is a gsap effect, which is the mistake three shipped layers actually made.
export const PRESET_REGISTRY = defineRegistry('kinetic preset', PRESETS, { slot: 'preset', blurbs: PRESET_BLURBS });
