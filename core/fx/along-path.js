// core/fx/along-path.js — TYPE SET ON A CURVE, and travelling along it.
//
//   "modifiers": [{ "alongPath": { "curve": "arc", "w": 900, "h": 260 } }]
//   "modifiers": [{ "alongPath": { "curve": "wave", "from": -20, "to": 120, "dur": 3 } }]
//
// The engine could already fly a whole LAYER along a path (`motionPath`), and it could lay chars
// around a circle (`circleText`). It could not set a line of type on an arbitrary curve, which is the
// general case the circle is one point of: a headline riding over a product shot, a caption bending
// under a mark, a word crawling round a bend. There was no substitute, only a different effect.
//
// WHY A MODIFIER AND NOT A PRESET. A preset maps a per-unit progress to a STYLE, and the units are
// spans in the flow — no style makes a span follow a curve. This has to REBUILD the layer as SVG, and
// rebuilding the DOM once at build time and driving one attribute per frame is exactly the two-pass
// shape core/fx exists for. Nor a layer type: the thing being curved is text that already has a
// colour, a face, a size and a clock; a `curvedText` layer would restate all four.
//
// NO MEASUREMENT, EVER. The box is declared (`w`/`h`) and the viewBox matches it one-to-one, so a user
// unit is a pixel and the inherited `font-size` lands at the size the layer asked for. `startOffset`
// is a PERCENTAGE of the path, which the browser resolves, so nothing here calls getTotalLength() and
// nothing depends on when the fonts finished loading.
//
// PURITY. build() restructures once; frame() writes one attribute on the element this file created,
// never on the layer, so the composition-order contract in core/fx/index.js holds.

import { clamp01, resolveEasing } from '../motion.js';

const KEYS = ['curve', 'd', 'w', 'h', 'from', 'to', 'dur', 'delay', 'ease', 'anchor'];
const MARK = 'data-along-path';

// The named curves, each written against the declared box so it scales with it. An author who wants
// something else passes `d` and owns the coordinates.
const CURVES = {
  arc: (w, h) => `M 0 ${r(h * 0.94)} Q ${r(w / 2)} ${r(-h * 0.5)} ${w} ${r(h * 0.94)}`,
  dip: (w, h) => `M 0 ${r(h * 0.12)} Q ${r(w / 2)} ${r(h * 1.5)} ${w} ${r(h * 0.12)}`,
  wave: (w, h) => `M 0 ${r(h * 0.5)} C ${r(w * 0.18)} ${r(h * 0.04)} ${r(w * 0.32)} ${r(h * 0.04)} `
    + `${r(w * 0.5)} ${r(h * 0.5)} S ${r(w * 0.82)} ${r(h * 0.96)} ${w} ${r(h * 0.5)}`,
  ramp: (w, h) => `M 0 ${r(h * 0.9)} L ${w} ${r(h * 0.18)}`,
};
const r = (n) => Math.round(n * 100) / 100;
const NAMES = Object.keys(CURVES);

function resolve(spec) {
  const s = typeof spec === 'string' ? { curve: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`alongPath: expected a curve name or an object like { "curve": "arc", "w": 900 } `
      + `— got ${JSON.stringify(spec)}. Keys: ${KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!KEYS.includes(k)) throw new Error(`alongPath: unknown key "${k}" — known: ${KEYS.join(', ')}.`);
  const w = s.w == null ? 900 : s.w, h = s.h == null ? 260 : s.h;
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0)
    throw new Error(`alongPath: "w" and "h" are the box the curve is drawn in, in pixels; got ${w}x${h}`);
  let d = s.d;
  if (d == null) {
    const curve = s.curve == null ? 'arc' : s.curve;
    if (!CURVES[curve])
      throw new Error(`alongPath: unknown curve "${curve}" — known: ${NAMES.join(', ')}. `
        + `Pass \`d\` instead to set your own path, in a ${w}x${h} box.`);
    d = CURVES[curve](w, h);
  } else if (typeof d !== 'string' || !d.trim()) {
    throw new Error(`alongPath: "d" is an SVG path string; got ${JSON.stringify(d)}`);
  }
  // Both default to the middle, so the line simply SITS on the curve and travels only when asked. A
  // default drift would move every headline an author only wanted bent.
  const from = s.from == null ? 50 : s.from, to = s.to == null ? from : s.to;
  const dur = s.dur == null ? 2 : s.dur, delay = s.delay == null ? 0 : s.delay;
  if (![from, to, dur, delay].every(Number.isFinite) || dur <= 0 || delay < 0)
    throw new Error(`alongPath: "from"/"to" are percentages along the path, "dur"/"delay" seconds; `
      + `got from=${from} to=${to} dur=${dur} delay=${delay}`);
  const anchor = s.anchor == null ? 'middle' : s.anchor;
  if (!['start', 'middle', 'end'].includes(anchor))
    throw new Error(`alongPath: "anchor" is "start", "middle" or "end" — which end of the line sits at `
      + `the offset. Got ${JSON.stringify(anchor)}.`);
  return { d, w, h, from, to, dur, delay, ease: s.ease || 'easeInOutCubic', anchor };
}

const NS = 'http://www.w3.org/2000/svg';

export function build(kit, el, L, spec) {
  const { d, w, h, from, anchor } = resolve(spec);
  if (L.split)
    throw new Error(`alongPath: this layer also sets \`split: "${L.split}"\`, and the splitter runs `
      + `AFTER this and would wrap HTML spans inside the SVG, which renders nothing. Drop \`split\` — `
      + `the curve is the treatment — or put the kinetic line in a layer of its own.`);
  const words = el.textContent.trim();
  if (!words)
    throw new Error(`alongPath: the layer has no text to set on the curve. Give it \`text\`, or apply `
      + `the modifier to the layer that carries the words.`);
  // An id unique to this layer: two curved layers in one frame would otherwise share a path and the
  // second `href` would resolve to the first one's shape.
  const id = `ap-${L.id || L.type || 'x'}-${Math.abs(hash(words + d))}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute(MARK, '1');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.style.overflow = 'visible';
  const defs = document.createElementNS(NS, 'defs');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('id', id);
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  defs.appendChild(path);
  const text = document.createElementNS(NS, 'text');
  // currentColor, so the layer's own ink — including the per-window automatic ink core/layers/util.js
  // resolves — reaches the glyphs. A fill of its own would override a colour the engine just decided.
  text.setAttribute('fill', 'currentColor');
  text.setAttribute('text-anchor', anchor);
  const tp = document.createElementNS(NS, 'textPath');
  tp.setAttribute('href', `#${id}`);
  tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
  tp.setAttribute('startOffset', `${from}%`);
  tp.textContent = words;
  text.appendChild(tp);
  svg.appendChild(defs);
  svg.appendChild(text);
  el.textContent = '';
  el.appendChild(svg);
}

// FNV-1a. Deterministic, and only ever used to make an element id unique — never to vary a look.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

export function frame(kit, el, L, t, scene, spec) {
  const { from, to, dur, delay, ease } = resolve(spec);
  if (from === to) return;                 // a line that only bends writes nothing per frame
  const tp = el.querySelector(`[${MARK}] textPath`);
  if (!tp) return;
  const p = resolveEasing(ease)(clamp01((t - (L.start ?? 0) - delay) / dur));
  tp.setAttribute('startOffset', `${(from + (to - from) * p).toFixed(3)}%`);
}
