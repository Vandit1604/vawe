// core/lightfield/index.js: a light field generator.
//
//   lightfield()                       → the reference field, exactly
//   lightfield({ colour: {...} })       → the same field in another palette
//   lightfield({ pattern: { kind: 'rings' } }) → another structure entirely
//
// It takes options and returns an HTML string. It knows nothing about scenes, layers, beats or the
// renderer, so a caller can drop the result into a `{"type":"html"}` layer, a `bg` window, a preview
// page or a plain file. That is the whole coupling.
//
// Two rules it never breaks:
//   1. Every number comes from a seeded generator. The same seed and options give byte-identical
//      output, on any machine, forever.
//   2. Motion is a function of `var(--t)`, the engine's frame clock, and never a CSS @keyframe.
//      core/tokens.css kills `animation` with `!important` because the renderer seeks frames instead
//      of playing them. A keyframe here would render one frozen frame and warn nobody.
//
// Four dials, in the order you should reach for them:
//   colour   the palette          shadow   how the light falls off
//   pattern  the structure        motion   how it lives against the clock

import { resolve, LightfieldError, SCHEMA, PATTERNS, DIRECTIONS, MOTIONS } from './options.js';
import { rgba, fade, mix } from './colour.js';
import { rng, span, n } from './rng.js';
import { BUILDERS } from './patterns.js';

// A stable short name per option set, so two fields on one page cannot collide and the same
// options always produce the same class name.
function tag(opts) {
  const text = JSON.stringify(opts);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return 'lf' + h.toString(36);
}

// Where the light sits, as data.
//
// The bloom appears THREE times, as a cluster of lobes of falling size. One radial blob makes a
// spotlight. A cluster makes light that came from somewhere and spread, with dark lanes between the
// lobes, and those lanes are most of what the eye reads as depth. The seed places the cluster, so
// two fields sharing a palette are still two fields.
// The CSS below is built from this, and so is the search in
// scripts/author/lightfield-fit.mjs. One source, so a fitted seed cannot mean two different layouts.
// How a blob fades. It is here, exported, because the arithmetic search in lightfield-seeds.mjs
// composites the same blobs by hand: two copies of these numbers is two different layouts wearing
// one seed.
//
// The ramp is DELIBERATELY steep. A gentle fade spends most of the frame on a half-and-half mix of
// two hues, and an sRGB composite of two hues is less saturated than either: that wide mixed band is
// what read as brown. Holding 0.85 out to 30% and finishing by 80% narrows it. Measured against the
// reference, this ramp scores 18.13 where the gentle one scored 18.60.
export const RAMP = { mid: 0.85, pos: 30, end: 80 };
export function fieldBlobs(given) {
  // Resolve here too. This is exported, and an exported function that only works on options someone
  // else already filled in is a trap: the search tool passed a raw preset and got a crash on
  // `extra`. resolve() is idempotent, so calling it twice costs nothing and closes the hole.
  const opts = resolve(given);
  const r = rng(opts.seed ^ 0x0c010f);
  const { bloom, mid, deep, extra } = opts.colour;
  const blob = (hex, x, y, rx, ry, a) => ({ hex, x, y, rx, ry, a });
  // `mid` is drawn ON TOP of the bloom cluster. Under it, three overlapping orange lobes wash the
  // second colour out and the field goes back to being one hue, which is the thing `mid` exists to
  // prevent. Order here is CSS order: the first entry is the topmost layer.
  const lobes = [
    blob(bloom, span(r, 8, 92), span(r, 0, 25), span(r, 18, 40), span(r, 30, 70), 1),
    blob(bloom, span(r, 8, 92), span(r, 0, 60), span(r, 14, 32), span(r, 20, 55), 0.96),
    blob(bloom, span(r, 8, 92), span(r, 0, 60), span(r, 12, 28), span(r, 18, 50), 0.9),
  ];
  // `extra` sits on top of everything. A colour the four roles cannot name is almost always an
  // accent that has to CUT the field, and an accent under three orange lobes is not an accent.
  const accents = extra.map((hex) =>
    blob(hex, span(r, 5, 95), span(r, 0, 90), span(r, 10, 30), span(r, 14, 45), 0.92));
  return [
    ...accents,
    blob(mid, span(r, 25, 65), span(r, 35, 75), span(r, 16, 34), span(r, 26, 55), 0.95),
    ...lobes,
    blob(deep, span(r, 0, 18), span(r, 20, 55), span(r, 40, 64), span(r, 50, 80), 1),
  ];
}

// The base the blobs sit on: the deep colour draining into the ground across the frame.
export const fieldBase = ({ colour: { deep, ground } }) =>
  `linear-gradient(100deg in oklab, ${mix(deep, ground, 0.35)} 0%, ${mix(deep, ground, 0.7)} 52%, ${ground} 100%)`;

function paintField(opts) {
  const css = ({ hex, x, y, rx, ry, a }) =>
    `radial-gradient(${n(rx)}% ${n(ry)}% at ${n(x)}% ${n(y)}% in oklab, ${rgba(hex, a)} 0%, ${rgba(hex, a * RAMP.mid)} ${RAMP.pos}%, ${fade(hex)} ${RAMP.end}%)`;
  return [...fieldBlobs(opts).map(css), fieldBase(opts)].join(',');
}

// The strongest a lit face may scale the picture under it: 1/(1-0.34), about 1.5x. Dodge climbs to
// infinity as it approaches 1, so this is the clamp that keeps `sheen: 1` a bright field and not a
// white one.
const DODGE = 0.34;

// Which way is "away". 0deg is up, and CSS turns clockwise from there.
const ANGLE = { top: 0, 'top-right': 45, right: 90, 'bottom-right': 135, bottom: 180, 'bottom-left': 225, left: 270, 'top-left': 315 };

// The falloff. `depth` is how dark the far side goes, `softness` is how long it takes to get there,
// `direction` is which way it is. This is the mood control: the same palette and pattern read as
// dawn or as a cellar depending on it.
function paintShadow(opts) {
  const { depth, softness, direction } = opts.shadow;
  const g = opts.colour.ground;
  if (depth === 0) return null;
  const start = (1 - softness) * 68;
  const stops = `${fade(g)} ${n(start)}%, ${rgba(g, depth * 0.42)} ${n(start + (100 - start) * 0.5)}%, ${rgba(g, depth)} 100%`;
  if (direction === 'center') return `radial-gradient(72% 82% at 50% 50%, ${stops})`;
  // A directional fall gets a frame vignette under it. Light that leaves one way still leaves at
  // every edge, and without this the far corners stay lit and the field reads as a printed gradient.
  const vignette = `radial-gradient(76% 88% at 50% 46%, ${fade(g)} 40%, ${rgba(g, depth * 0.5)} 100%)`;
  return `${vignette},${`linear-gradient(${ANGLE[direction]}deg, ${stops})`}`;
}

// Motion, as CSS that reads `var(--t)` (seconds into the video, never frames).
// `speed` 1 is about one slow breath every ten seconds, which is the pace a background moves at.
const RATE = 0.62; // radians per second at speed 1

// Motion is computed PER GROUP, not per cell. A seam and the face beside it are one slat, and if
// they take different phases the blind tears itself apart along every bar.
function motions(opts, groups) {
  const { kind, speed, amount } = opts.motion;
  const none = { transform: '', opacity: '' };
  if (kind === 'still' || speed === 0 || amount === 0) return { body: none, group: () => none };

  const r = rng(opts.seed ^ 0x30f10a);
  const wave = () => `sin(var(--t) * ${n(RATE * speed * span(r, 0.6, 1.5), 4)} + ${n(span(r, 0, 6.283), 2)})`;
  const dim = (k, w) => `calc(1 - ${n(k * amount)} * (0.5 + 0.5 * ${w}))`;

  // breathe never moves the body: nothing travels, so it cannot read as a scroll.
  const body = kind === 'breathe' ? none
    : { transform: `translateX(calc(${wave()} * ${n((kind === 'drift' ? 26 : 10) * amount)}px))`, opacity: '' };

  const table = [];
  for (let i = 0; i < groups; i++) {
    const w = wave();
    const slide = n(span(r, 3, 13) * amount);
    if (kind === 'drift') table.push(none);                       // the field travels as one body
    else if (kind === 'breathe') table.push({ transform: '', opacity: dim(0.34, w) });
    else table.push({ transform: `translateX(calc(${w} * ${slide}px))`, opacity: dim(0.18, w) });
  }
  return { body, group: (i) => table[i] || none };
}

/**
 * Build a light field.
 *
 * @param {object} [given] see SCHEMA in ./options.js for every key, its range and its default.
 * @returns {string} a self-contained HTML fragment: one <style> and one <div>.
 * @throws {LightfieldError} on an unknown key, an out-of-range number or a malformed colour.
 */
export function lightfield(given) {
  const opts = resolve(given);
  const cls = tag(opts);

  // The pattern never sees a colour. It asks for `dark` or `lit` and this decides what those are.
  //
  // Both are NEUTRAL GREY, and both blend multiplicatively, which is the whole point. MULTIPLY
  // scales every channel down by one factor; COLOR-DODGE scales every channel up by one factor.
  // A single factor per pixel leaves the ratios between R, G and B untouched, so a seam gets darker
  // and a face gets brighter and neither gets greyer. Chroma survives, and it rises on the faces.
  //
  // Dodge also leaves black alone: base / (1 - 0) is base, and 0 / anything is 0. That matters here
  // more than it sounds. `plus-lighter` ADDS, so it lit up the reference's black right-hand side
  // with bars that should not be there. Light that is not behind the blind cannot come through it.
  //
  // Dodge is driven by the grey VALUE, not by alpha. Alpha on a dodge layer lerps towards the
  // source and desaturates, which is the bug being fixed, so a face at zero strength is opaque
  // BLACK, the exact no-op, and never a transparent pixel.
  const paints = {
    dark: (a) => `rgba(0,0,0,${n(Math.min(1, Math.max(0, a)))})`,
    lit: (a) => { const v = Math.round(255 * Math.min(1, Math.max(0, a)) * DODGE); return `rgb(${v},${v},${v})`; },
  };
  const { cells, mask } = BUILDERS[opts.pattern.kind](opts, paints);

  const groups = cells.reduce((m, c) => (c.g > m ? c.g : m), -1) + 1;
  const mo = motions(opts, groups);
  const shadow = paintShadow(opts);

  const cell = (c) => {
    const m = mo.group(c.g);
    let style = c.style;
    // A cell may already carry a transform (shards are rotated). Motion goes in front of it as a
    // second function, never as a replacement.
    if (m.transform) {
      style = /transform:/.test(style)
        ? style.replace('transform:', `transform:${m.transform} `)
        : `${style};transform:${m.transform}`;
    }
    if (m.opacity) style += `;opacity:${m.opacity}`;
    return `<i style="${style}"></i>`;
  };

  const darkCells = cells.filter((c) => !c.lit);
  const litCells = cells.filter((c) => c.lit);
  const layer = (name, blend, list) => list.length
    ? `.${cls} .${name}{position:absolute;inset:-4%;mix-blend-mode:${blend}`
      + `${mo.body.transform ? `;transform:${mo.body.transform}` : ''}`
      + `${mask ? `;mask-image:${mask};-webkit-mask-image:${mask}` : ''}}`
    : '';

  const css = [
    `.${cls}{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:${opts.colour.ground}`
      // A dial at its no-op value emits nothing, so the markup says what the options said.
      + `${opts.colour.vivid === 1 ? '' : `;filter:saturate(${n(opts.colour.vivid)})`}}`,
    `.${cls} .f{position:absolute;inset:-4%;background:${paintField(opts)}}`,
    layer('d', 'multiply', darkCells),
    layer('l', 'color-dodge', litCells),
    `.${cls} i{position:absolute;display:block;will-change:transform,opacity}`,
    shadow ? `.${cls} .s{position:absolute;inset:0;pointer-events:none;background:${shadow}}` : '',
  ].filter(Boolean).join('\n');

  const box = (name, list) => (list.length ? `<div class="${name}">\n${list.map(cell).join('\n')}\n</div>` : '');
  return `<style>\n${css}\n</style>\n<div class="${cls}"><div class="f"></div>`
    + `${box('d', darkCells)}${box('l', litCells)}${shadow ? '<div class="s"></div>' : ''}</div>`;
}

export { LightfieldError, SCHEMA, PATTERNS, DIRECTIONS, MOTIONS };
export default lightfield;
