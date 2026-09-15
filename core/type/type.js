// core/type.js: kinetic-typography kit (another engine "Kinetic Type" parity). All PURE in the time
// input `t`: presets map a per-unit local progress `u∈[0,1]` → {opacity, transform, filter}.
// splitText() is a one-time DOM setup (build time); animateUnits() is called every frame.
import { clamp01, random } from '../motion/motion.js';
import { defineRegistry } from '../registry/registry.js';
import { wght, PRESETS, PRESET_BLURBS, PRESET_REGISTRY, DECODE_CHARS, DECODE_CHAR_BLURBS,
  DECODE_CHARS_REGISTRY, decodeText, flapText } from '../kinetic/presets.js';

// HOW FAR THE INK FALLS BELOW THE LINE BOX, in em, for the deepest descender in the faces we ship.
// Exported because a second consumer arrived: the wordSlot chip (core/fx/word-slot.js) clips at its
// own edge too, and a copied 0.3 in a second file is the drift this codebase logs most. One fact, one
// owner. It is a MEASUREMENT of the faces, not a taste setting: raise it only against a face whose
// descenders are cut, and both clips grow together.
export const INK_PAD_EM = 0.3;

// mix two hex colours. Pure. (colorWave now uses color-mix so it can take theme TOKENS, not just hex.)
const _hx = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, t) => { const pa = _hx(a), pb = _hx(b); return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`; };

// splitText(el, mode): wrap each char|word|line of el's text in a <span class="ku"> so units
// animate independently. Returns the unit spans (in order). Idempotent-ish: call once at build.
// Preserves spaces; 'word' keeps words unbreakable. Inline formatting (<em>/<b>/…) is PRESERVED:
// element shells are kept in place and their text split inside them, so `.big em` styling reaches
// the units. Plain-text inputs produce the exact same DOM as before.
export function splitText(el, mode = 'word') {
  // 'path': the units are SVG strokes, not glyphs, for the `draw` preset (a logo/icon/chart line
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

// THE STAGGER ORDER. `from` remaps a unit's index to its RANK in the wave, which is the dial that
// decides what the eye reads: a left-to-right train reads as typing, a centre-out train reads as the
// word arriving as one object. Every reference implementation ships it and ours could only ever start
// at the first glyph (engine-doctrine/CRAFT/PARITY-AUDIT.md).
//
// It is a RANK, not a delay, so `amount` can normalise it: the offsets are pure numbers and the step
// is seconds. `random` hashes the index, never Math.random(), so a backward seek is exact.
export const STAGGER_FROM_BLURBS = {
  first: 'the wave starts at the first unit and runs to the last, the default, and what a line of type being typed looks like',
  center: 'starts at the middle unit and opens outward both ways, so the word arrives as ONE object rather than as a train',
  last: 'starts at the last unit and runs backwards to the first, pair it with a right-to-left exit',
  edges: 'starts at BOTH ends and closes on the middle, a line that shuts like a door',
  random: 'a hashed, seeded shuffle of the order, scattered arrival that is identical on every render and at every seek',
  typewriter: 'types one character at a time at a fixed TYPING RATE (`cps`, chars/sec) instead of a shared budget, so any split layer can reveal char by char at a chosen speed and still use a preset, a colour ramp, or a reversed exit',
};

// A REGISTRY, not a bare list, so `make arsenal Q="start the stagger from the middle"` finds it: the
// search reads *_REGISTRY exports and nothing else. `pick` is deliberately unused here, because a
// numeric index is legal too and refusing one would be wrong; core/validate.mjs owns that refusal and
// reads its names from here.
export const STAGGER_FROM_REGISTRY = defineRegistry('stagger order', STAGGER_FROM_BLURBS,
  { slot: 'stagger.from', blurbs: STAGGER_FROM_BLURBS,
  catalog: {
    title: 'Stagger order (`from`)',
    tag: 'text/parts',
    intro: 'The ORDER a stagger runs in, on `stagger` as an object: `{ "stagger": { "amount": 0.6, "from": "center" } }`. Works in BOTH slots that take a stagger, a split text layer and `parts[]`. `each` is the per-unit delay; `amount` is the TOTAL seconds the whole train may take and derives that delay from the unit count, so a 90-glyph headline and a 6-word one hold the same beat. A number index is legal too: the wave starts at that unit.',
    usage: (n, { text }) => n === 'typewriter'
      ? text({ split: 'char', preset: 'up', each: 0.15, stagger: { from: 'typewriter', cps: 24 } })
      : text({ split: 'char', preset: 'up', each: 0.5, stagger: { amount: 0.6, from: n } }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, split: 'char', preset: 'up', each: n === 'typewriter' ? 0.15 : 0.5, stagger: n === 'typewriter' ? { from: 'typewriter', cps: 24 } : { amount: 0.9, from: n } }] }),
  },
});
export const STAGGER_FROM = STAGGER_FROM_REGISTRY.names;

// staggerOffset(i, n, from): unit i's rank in the wave, 0 = first to move.
export function staggerOffset(i, n, from = 'first') {
  const last = Math.max(0, (n || 1) - 1);
  if (typeof from === 'number') return Math.abs(i - from);
  if (from === 'last') return last - i;
  if (from === 'center') return Math.abs(i - last / 2);
  if (from === 'edges') return last / 2 - Math.abs(i - last / 2);
  if (from === 'random') return random(`stagger:${i}`) * last;
  return i; // 'first' and 'typewriter' both rank in index order; typewriter only changes the STEP below
}

// staggerFrom / staggerStep: the ONE reader of a stagger spec, so units, parts and the tactile mixer
// cannot each decide what `{ amount: 0.6 }` means. A bare number is the per-unit delay it always was.
export const staggerFrom = (spec) => (spec && typeof spec === 'object' ? (spec.from ?? 'first') : 'first');

export function staggerStep(spec, n, fallback = 0.06) {
  if (spec && typeof spec === 'object') {
    // typewriter's delay is a TYPING RATE, not a share of a shared budget: unit i lands at i/cps
    // seconds. Every other `from` produces a RANK here and `unitProgress` multiplies it by a step
    // derived FROM a budget (amount/n) or a flat fallback (each); typewriter is that same rank * step
    // shape run backwards, the step is given (1/cps) and the effective budget falls out of it. So it
    // slots into the existing contract as one more way to pick the step, not a second mechanism:
    // unitProgress, animateUnits, presets and core/tracks/units.js's reversed exits all stay unchanged.
    if (staggerFrom(spec) === 'typewriter') {
      // 24 matches core/layers/text.js's own `typing === true ? 24 : typing` default, so
      // `stagger: { from: 'typewriter' }` with no cps types at the same rate `typing: true` does.
      const cps = spec.cps > 0 ? spec.cps : 24;
      return 1 / cps;
    }
    if (spec.amount > 0) {
      let max = 0;
      for (let i = 0; i < (n || 1); i++) max = Math.max(max, staggerOffset(i, n, staggerFrom(spec)));
      return max > 0 ? spec.amount / max : 0;
    }
    return typeof spec.each === 'number' ? spec.each : fallback;
  }
  return typeof spec === 'number' ? spec : fallback;
}

// GSAP names two of the five differently (`start`/`end`). The engine keeps ONE set of author-facing
// words and translates at the one place a spec reaches GSAP, rather than making `parts` a second
// dialect of the same dial.
const GSAP_FROM = { first: 'start', last: 'end' };
export const gsapStagger = (spec, fallback) => (spec && typeof spec === 'object'
  ? { ...spec, ...(spec.from != null ? { from: GSAP_FROM[spec.from] ?? spec.from } : {}) }
  : (spec ?? fallback));

// unitProgress(t, i, n, {each, stagger, total}): local [0,1] progress for unit i of n at time t(s).
// each = per-unit animation seconds; stagger = delay step between units.
// SMOOTHNESS is the AE range selector's fourth dial, and it is not an easing. An easing bends the
// ramp; smoothness decides how WIDE the ramp is at all. At 1 the unit crosses its whole window
// continuously, which is what every preset here has always done, so 1 is the default and no shipped
// frame moves. At 0 the unit SWAPS: it is unselected, then it is selected, with nothing in between,
// and a glyph therefore vanishes rather than scaling away. That is the one value a font morph needs
// and the one nobody reaches by tuning a curve (engine-doctrine/CRAFT/AE-TECHNIQUES.md #5, #7).
//
// The remap is the transition band centred on the middle of the unit's own window:
//   u' = clamp01((u - 0.5) / smoothness + 0.5)
// At smoothness 1 that is the identity, which is why this is free. Below 1 the band narrows around
// the midpoint; at 0 it is a step.
//
// STAGGER TAKES THE OTHER TWO DIALS EVERY REFERENCE PRIMITIVE SHIPS (engine-doctrine/CRAFT/PARITY-AUDIT.md).
// `stagger: 0.05` is the per-unit delay and stays exactly what it was. The object form is GSAP's own,
// so the SAME words work in the `parts` slot and an author learns one vocabulary:
//   "stagger": { "each": 0.05, "from": "center" }   /   "stagger": { "amount": 0.6, "from": "edges" }
// `from` decides the ORDER (staggerOffset above) and `amount` is the TOTAL time the whole train may
// take, from which the per-unit delay is derived. Two shipped films hand-computed `amount` by dividing
// a beat by a glyph count; that arithmetic is this dial.
export function unitProgress(t, i, n, { each = 0.5, stagger = 0.06, smoothness = 1 } = {}) {
  const u = clamp01((t - staggerOffset(i, n, staggerFrom(stagger)) * staggerStep(stagger, n)) / each);
  if (smoothness >= 1) return u;
  if (!(smoothness > 0)) return u >= 0.5 ? 1 : 0;
  return clamp01((u - 0.5) / smoothness + 0.5);
}

// The kinetic PRESET vocabulary (weight/up/down/type/scale/blur/bounce/… and their decode/flap
// support functions) lives in core/kinetic/presets.js now: every preset is a pure `u → style`
// function with no dependency on splitText/unitProgress/animateUnits below, so it lifted out clean.
// Re-exported here (via the import above) so no importer of './type.js' has to change what it asks
// for, and animateUnits below (which reads PRESET_REGISTRY/decodeText/flapText directly) still sees
// them as local bindings, which a bare `export {…} from` does not provide.
export { wght, PRESETS, PRESET_BLURBS, PRESET_REGISTRY, DECODE_CHARS, DECODE_CHAR_BLURBS,
  DECODE_CHARS_REGISTRY, decodeText, flapText };

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
  // too low, pull it back up so the ring is centred on the pin.
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
export function animateUnits(units, t, { preset = 'blurUp', each = 0.5, stagger = 0.06, smoothness = 1, loop = false, speed = 1, phaseStep = 0.5, ...popts } = {}) {
  // An unknown name is a HARD ERROR. It used to fall back to `up`, so a typo - or a preset renamed out
  // from under a scene - rendered a plausible frame that was not what was asked for, and the schema does
  // not enumerate these names either, so nothing else caught it. Same reasoning as the unknown-modifier
  // throw in core/fx/index.js. engine-doctrine/MISTAKES.md #354.
  const fn = PRESET_REGISTRY.pick(preset);
  units.forEach((el, i) => {
    if (loop || preset === 'wave' || preset === 'shimmerWave') {
      Object.assign(el.style, fn(t * speed + i * phaseStep, popts));
    } else {
      const u = unitProgress(t, i, units.length, { each, stagger, smoothness });
      // POPTS REACHED EVERY PRESET BUT THIS ONE. The early return handed decodeText three arguments and
      // dropped `popts` on the floor, so `presetOpts` on a decode layer was accepted, forwarded nowhere
      // and silently inert, and the preset's own declared parameter was dead code. Input accepted and
      // then ignored is this repo's worst bug class (engine-doctrine/MISTAKES.md #543). `each` rides along because
      // the scramble RATE is per second and only the caller knows how long the window is.
      if (preset === 'decode') { decodeText(el, u, i, { ...popts, each }); el.style.opacity = u > 0 ? '1' : '0'; return; }
      // `flap` mutates the character too, but unlike decode it also has a hinge to apply, so the
      // preset's own style still runs. Both live here for the same reason: a preset returns a style
      // and neither of these two effects is one.
      if (preset === 'flap') flapText(el, u, popts.steps ?? 12);
      if (preset === 'riseClip' && el.parentElement && !el.parentElement.__clip) {
        // clip wrapper on demand (only for riseClip; keeps every other preset's DOM unchanged)
        const w = document.createElement('span');
        w.style.display = 'inline-block'; w.style.overflow = 'hidden'; w.style.verticalAlign = 'bottom'; w.__clip = true;
        // THE MASK MUST CONTAIN THE FONT'S FULL INK, NOT ITS LINE BOX. .hs-text sets line-height 1.04,
        // tighter than the descender depth of any real face, so `overflow: hidden` sliced 13px off
        // EVERY word at 76px, which is why g/y/p rendered with flat bottoms in shipped video. Pad the
        // mask downward and pull the identical amount back with a negative margin: the clip region
        // grows, the layout does not move a pixel. 0.3em clears the deepest descenders we ship.
        w.style.paddingBottom = `${INK_PAD_EM}em`; w.style.marginBottom = `${-INK_PAD_EM}em`;
        el.parentElement.insertBefore(w, el); w.appendChild(el);
      }
      // the unit INDEX as a third argument: `assemble` hashes it for its per-glyph scatter.
      // A third parameter rather than a key in popts, so no existing preset's signature moves.
      Object.assign(el.style, fn(u, popts, i));
    }
  });
}

// formatNumber(n, {currency, decimals, compact}): on-screen number formatting. compact abbreviates
// to K/M/B/T; currency prefixes '$'. Moved from core/motion/motion.js (was grouped with the other
// scene helpers there; it is text formatting, so it lives with the rest of the type package).
export function formatNumber(n, { currency = false, decimals = 0, compact = false } = {}) {
  let s;
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e12) s = (n / 1e12).toFixed(decimals === 0 ? 2 : decimals) + 'T';
    else if (a >= 1e9) s = (n / 1e9).toFixed(decimals === 0 ? 1 : decimals) + 'B';
    else if (a >= 1e6) s = (n / 1e6).toFixed(decimals === 0 ? 1 : decimals) + 'M';
    else if (a >= 1e3) s = (n / 1e3).toFixed(decimals === 0 ? 1 : decimals) + 'K';
    else s = n.toFixed(decimals);
    s = s.replace(/\.0+([TBMK])$/, '$1'); // 40.0M -> 40M
  } else {
    s = Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return (currency ? '$' : '') + s;
}

// ---------- text measuring (another engine measureText/fitText parity, browser only) ----------
// measureText: pixel width of `text` in CSS `font` shorthand. fitText: largest px size (stepping
// down) whose rendered width fits maxWidth. Call at build time (fonts already loaded in boot).
// Moved from core/motion/motion.js: this is text layout, not motion.
let _measureCtx;
export function measureText(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}
export function fitText(text, maxWidth, { font = (px) => `800 ${px}px Inter`, max = 168, min = 24, step = 2 } = {}) {
  let px = max;
  while (px > min && measureText(text, font(px)) > maxWidth) px -= step;
  return px;
}
// fitBox(el, {maxW, maxH, max, min}): MULTI-LINE overflow-safe fit (another engine fitTextOnNLines parity).
// `el` must be in-DOM. Binary-searches the largest font-size where the element (wrapping at maxW) fits
// within maxH AND no word overflows the width. Layout-only → deterministic at build time. Sets + returns px.
export function fitBox(el, { maxW, maxH, max = 168, min = 24 }) {
  el.style.width = maxW + 'px';
  let lo = min, hi = max, best = min;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    el.style.fontSize = mid + 'px';
    if (el.scrollHeight <= maxH + 1 && el.scrollWidth <= maxW + 1) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  el.style.fontSize = best + 'px';
  return best;
}
