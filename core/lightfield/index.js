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
// Stop positions: full alpha at the centre, 0.62 of it at 42% out, gone by 88%.
export function fieldBlobs(opts) {
  const r = rng(opts.seed ^ 0x0c010f);
  const { bloom, mid, deep } = opts.colour;
  const blob = (hex, x, y, rx, ry, a) => ({ hex, x, y, rx, ry, a });
  // `mid` is drawn ON TOP of the bloom cluster. Under it, three overlapping orange lobes wash the
  // second colour out and the field goes back to being one hue, which is the thing `mid` exists to
  // prevent. Order here is CSS order: the first entry is the topmost layer.
  const lobes = [
    blob(bloom, span(r, 8, 92), span(r, 0, 25), span(r, 18, 40), span(r, 30, 70), 1),
    blob(bloom, span(r, 8, 92), span(r, 0, 60), span(r, 14, 32), span(r, 20, 55), 0.96),
    blob(bloom, span(r, 8, 92), span(r, 0, 60), span(r, 12, 28), span(r, 18, 50), 0.9),
  ];
  return [
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
    `radial-gradient(${n(rx)}% ${n(ry)}% at ${n(x)}% ${n(y)}% in oklab, ${rgba(hex, a)} 0%, ${rgba(hex, a * 0.62)} 42%, ${fade(hex)} 88%)`;
  return [...fieldBlobs(opts).map(css), fieldBase(opts)].join(',');
}

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

// Motion, as CSS that reads `var(--t)` (seconds into the video).
// `speed` 1 is about one slow breath every ten seconds, which is the pace a background should move at.
const RATE = 0.62; // radians per second at speed 1

function motionFor(opts, r, index) {
  const { kind, speed, amount } = opts.motion;
  if (kind === 'still' || speed === 0 || amount === 0) return { transform: '', opacity: '' };
  const w = n(RATE * speed * span(r, 0.6, 1.5), 4);
  const phase = n(span(r, 0, 6.283), 2);
  const wave = `sin(var(--t) * ${w} + ${phase})`;
  switch (kind) {
    case 'drift':
      // The field travels as one body. Cells hold station against each other.
      return index === -1 ? { transform: `translateX(calc(${wave} * ${n(26 * amount)}px))`, opacity: '' } : { transform: '', opacity: '' };
    case 'breathe':
      // Cells brighten and dim in place. Nothing moves, so it never reads as a scroll.
      return index === -1 ? { transform: '', opacity: '' } : { transform: '', opacity: `calc(1 - ${n(0.34 * amount)} * (0.5 + 0.5 * ${wave}))` };
    case 'shimmer':
      // Cells slide against each other. Seams open and close, and the field looks alive.
      return index === -1
        ? { transform: `translateX(calc(${wave} * ${n(10 * amount)}px))`, opacity: '' }
        : { transform: `translateX(calc(${wave} * ${n(span(r, 3, 13) * amount)}px))`, opacity: `calc(1 - ${n(0.18 * amount)} * (0.5 + 0.5 * ${wave}))` };
    default:
      return { transform: '', opacity: '' };
  }
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
  const { cells, mask } = BUILDERS[opts.pattern.kind](opts);

  const mr = rng(opts.seed ^ 0x30f10a);
  const body = motionFor(opts, mr, -1);
  const shadow = paintShadow(opts);

  const css = [
    `.${cls}{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:${opts.colour.ground}}`,
    `.${cls} .f{position:absolute;inset:-4%;background:${paintField(opts)}}`,
    // `overlay` is what keeps the pattern honest: white brightens the hue under it and black deepens
    // it. Plain alpha would wash every lit edge towards grey and the field would lose its colour.
    `.${cls} .p{position:absolute;inset:-4%;mix-blend-mode:overlay${body.transform ? `;transform:${body.transform}` : ''}${mask ? `;mask-image:${mask};-webkit-mask-image:${mask}` : ''}}`,
    `.${cls} .p>i{position:absolute;display:block;will-change:transform,opacity}`,
    shadow ? `.${cls} .s{position:absolute;inset:0;pointer-events:none;background:${shadow}}` : '',
  ].filter(Boolean).join('\n');

  const html = cells
    .map((c, i) => {
      const m = motionFor(opts, mr, i);
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
    })
    .join('\n');

  return `<style>\n${css}\n</style>\n<div class="${cls}"><div class="f"></div><div class="p">\n${html}\n</div>${shadow ? `<div class="s"></div>` : ''}</div>`;
}

export { LightfieldError, SCHEMA, PATTERNS, DIRECTIONS, MOTIONS };
export default lightfield;
