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
// Five dials, in the order you should reach for them:
//   colour    the palette, including the ambient fill that decides whether shadows are warm or cool
//   pattern   the structure
//   envelope  how far each element reaches, as a function of where it sits, and how it tapers
//   shadow    how the light falls off, and the pattern's contrast and polarity
//   motion    how it lives against the clock

import { resolve, LightfieldError, SCHEMA, PATTERNS, DIRECTIONS, MOTIONS, SHAPES, ANCHORS } from './options.js';
import { rgba, fade, mix } from './colour.js';
import { rng, span, n } from './rng.js';
import { BUILDERS, fieldMass } from './patterns.js';

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
// The bloom appears as a CLUSTER of lobes of falling size, `colour.lobes` of them. One radial blob
// makes a spotlight. A cluster makes light that came from somewhere and spread, with dark lanes
// between the lobes, and those lanes are most of what the eye reads as depth. The seed places the
// cluster, so two fields sharing a palette are still two fields.
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
// `end` is where a lobe's light has finished, as a percentage of the lobe's own ending shape. It is
// a FUNCTION of colour.spread rather than a constant, because as a constant it was a number fitted
// to one photograph and imposed on every field after it. See colour.spread in options.js.
export const RAMP = { mid: 0.85, pos: 30, end: 80 };
export const rampEnd = (spread) => RAMP.end + 90 * spread;

// THE CLUSTER, as a series rather than as three literals.
//
// The first three entries are the fitted ones, unchanged and in their fitted order: the top lobe is
// the widest and sits high, and each one after it is a step smaller and a step fainter. That decay
// is the only thing the fitted three ever said, so continuing it is the honest generalisation, and
// `STEP` / `DIM` are read off the fitted numbers rather than invented (rx 40 -> 32 -> 28 and alpha
// 1 -> 0.96 -> 0.90 are both about 0.88 and about 0.95 per step near the end of the series).
//
// A lobe's `y` reach widens after the first, because the first lobe IS the top of the cluster and
// every lobe under it may sit anywhere down the frame.
const SERIES = [
  { yTo: 25, rx: [18, 40], ry: [30, 70], a: 1 },
  { yTo: 60, rx: [14, 32], ry: [20, 55], a: 0.96 },
  { yTo: 60, rx: [12, 28], ry: [18, 50], a: 0.9 },
];
const STEP = 0.88;   // each lobe past the fitted three is this much smaller than the one before it
const DIM = 0.95;    // and this much fainter
const FITTED = SERIES.length;

// WHERE ACROSS THE FRAME A LOBE MAY SIT. The span is the fitted one, 8% to 92%.
//
// At `evenness` 0 every lobe draws independently anywhere in it, which is what the fitted cluster
// does and which is LUMPY BY CONSTRUCTION: a handful of independent draws pile up, and the sum of a
// few piled-up blobs is humps with dips between them. It cannot make the broad flat band both
// references actually have. At 1 the span is cut into one band per lobe and each lobe draws inside
// its own, so the cluster covers the frame instead of clumping in part of it.
//
// Bands are handed out FROM THE MIDDLE OUTWARDS, because the series decays: the largest lobe takes
// the centre and the smaller ones fall away to the edges. Handing them out left to right would ramp
// the lobe size across the frame and tilt every field to one side.
const X0 = 8, X1 = 92;
export function bandOrder(count) {
  const mid = Math.floor((count - 1) / 2);
  const out = [mid];
  for (let d = 1; out.length < count; d++) {
    if (mid + d < count) out.push(mid + d);
    if (mid - d >= 0) out.push(mid - d);
  }
  return out;
}
// `u` is one draw in [0,1), taken by the caller so the random stream stays in lobe order.
// At evenness 0 this is exactly `X0 + (X1 - X0) * u`, which is `span(r, 8, 92)`: the fitted layout.
function lobeX(band, count, evenness, u) {
  const w = (X1 - X0) / count;
  const at = (t) => X0 + t * w;             // the edges of this lobe's own band
  const lo = X0 + (at(band) - X0) * evenness;
  const hi = X1 + (at(band + 1) - X1) * evenness;
  return lo + (hi - lo) * u;
}

// The nominal footprint of one lobe: the mid of its width range by the mid of its height range.
// It is what the area scaling below is computed from, so it has to be the same arithmetic for the
// fitted three and for everything after them.
const footprint = (s) => ((s.rx[0] + s.rx[1]) / 2) * ((s.ry[0] + s.ry[1]) / 2);

// The series, `count` long, scaled so it covers the same total area as the fitted three.
//
// Without the scaling, `lobes` would be a brightness dial wearing a structure dial's name: eight
// lobes at the fitted sizes is eight times the light, and every palette would blow out as you turned
// it. With it, the dial only ever decides how the same light is DIVIDED, which is the question it is
// there to ask.
export function lobeSeries(count) {
  const specs = [];
  for (let i = 0; i < count; i++) {
    if (i < FITTED) { specs.push(SERIES[i]); continue; }
    const p = specs[i - 1];
    specs.push({ yTo: p.yTo, rx: p.rx.map((v) => v * STEP), ry: p.ry.map((v) => v * STEP), a: p.a * DIM });
  }
  const sum = (xs) => xs.reduce((t, s) => t + footprint(s), 0);
  // Always the fitted three's total, so one lobe is that whole area in one mass and eight is the
  // same area cut eight ways. At count 3 the two sums are the same arithmetic on the same numbers,
  // so the scale is exactly 1 and the fitted layout is byte-identical.
  const k = Math.sqrt(sum(SERIES) / sum(specs));
  return specs.map((s) => ({ ...s, rx: s.rx.map((v) => v * k), ry: s.ry.map((v) => v * k) }));
}

export function fieldBlobs(given) {
  // Resolve here too. This is exported, and an exported function that only works on options someone
  // else already filled in is a trap: the search tool passed a raw preset and got a crash on
  // `extra`. resolve() is idempotent, so calling it twice costs nothing and closes the hole.
  const opts = resolve(given);
  const r = rng(opts.seed ^ 0x0c010f);
  const { bloom, mid, deep, extra, originX, originY } = opts.colour;
  // The light cluster moves as one rigid body. The defaults are the centres of the ranges below, so
  // an unmoved field draws exactly the layout that was fitted to the reference photograph.
  const dx = originX - 50, dy = originY - 12.5;
  const blob = (hex, x, y, rx, ry, a) => ({ hex, x, y, rx, ry, a });
  const lightBlob = (hex, x, y, rx, ry, a) => blob(hex, x + dx, y + dy, rx, ry, a);
  // `mid` is drawn ON TOP of the bloom cluster. Under it, three overlapping orange lobes wash the
  // second colour out and the field goes back to being one hue, which is the thing `mid` exists to
  // prevent. Order here is CSS order: the first entry is the topmost layer.
  const count = opts.colour.lobes;
  const bands = bandOrder(count);
  const lobes = lobeSeries(count).map((s, i) =>
    lightBlob(bloom, lobeX(bands[i], count, opts.colour.evenness, r()), span(r, 0, s.yTo),
      span(r, s.rx[0], s.rx[1]), span(r, s.ry[0], s.ry[1]), s.a));
  // `extra` sits on top of everything. A colour the four roles cannot name is almost always an
  // accent that has to CUT the field, and an accent under three orange lobes is not an accent.
  const accents = extra.map((hex) =>
    blob(hex, span(r, 5, 95), span(r, 0, 90), span(r, 10, 30), span(r, 14, 45), 0.92));
  return [
    ...accents,
    lightBlob(mid, span(r, 25, 65), span(r, 35, 75), span(r, 16, 34), span(r, 26, 55), 0.95),
    ...lobes,
    blob(deep, span(r, 0, 18), span(r, 20, 55), span(r, 40, 64), span(r, 50, 80), 1),
  ];
}

// The base the blobs sit on: the deep colour draining into the ground across the frame.
export const fieldBase = ({ colour: { deep, ground } }) =>
  `linear-gradient(100deg in oklab, ${mix(deep, ground, 0.35)} 0%, ${mix(deep, ground, 0.7)} 52%, ${ground} 100%)`;

// Exported so a probe can render the colour field ALONE, with no pattern over it. The question
// "is the field already brown, or does the composite make it brown?" is only answerable by looking
// at the field on its own, and re-deriving this ramp in the probe would mean measuring a different
// field from the one that ships.
export function paintField(given) {
  const opts = resolve(given);
  const end = n(rampEnd(opts.colour.spread));
  const css = ({ hex, x, y, rx, ry, a }) =>
    `radial-gradient(${n(rx)}% ${n(ry)}% at ${n(x)}% ${n(y)}% in oklab, ${rgba(hex, a)} 0%, ${rgba(hex, a * RAMP.mid)} ${RAMP.pos}%, ${fade(hex)} ${end}%)`;
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
  const { depth, softness, direction, originX, originY } = opts.shadow;
  const g = opts.colour.ground;
  if (depth === 0) return null;
  const start = (1 - softness) * 68;
  const mid = start + (100 - start) * 0.5;
  // WHERE THE DARK IS, as an offset from the unmoved position. 50/50 gives exactly 0 and 0, so every
  // string below is character for character what it was before this dial existed.
  const dx = originX - 50, dy = originY - 50;
  const pct = (v) => n(v < 0 ? 0 : v > 100 ? 100 : v);
  const stops = `${fade(g)} ${n(start)}%, ${rgba(g, depth * 0.42)} ${n(mid)}%, ${rgba(g, depth)} 100%`;
  if (direction === 'center') return `radial-gradient(72% 82% at ${n(50 + dx)}% ${n(50 + dy)}%, ${stops})`;
  // Away along ONE axis. The same profile, mirrored about the CENTRE OF THE LIT BAND: `start` and
  // `mid` are distances from the light, so a point at distance u sits at c - u/2 on the near side and
  // at c + u/2 on the far one. The band itself takes nothing at all. `c` is the middle of the frame
  // until the origin moves it, which is the whole of what a position means for this shape: the dark
  // is the two ends, so placing it is placing the light band between them.
  if (direction === 'top-and-bottom' || direction === 'left-and-right') {
    const c = 50 + (direction === 'top-and-bottom' ? dy : dx);
    const near = (u) => pct(c - u / 2), far = (u) => pct(c + u / 2);
    return `linear-gradient(${direction === 'top-and-bottom' ? 180 : 90}deg, ${rgba(g, depth)} 0%, `
      + `${rgba(g, depth * 0.42)} ${near(mid)}%, ${fade(g)} ${near(start)}%, ${fade(g)} ${far(start)}%, `
      + `${rgba(g, depth * 0.42)} ${far(mid)}%, ${rgba(g, depth)} 100%)`;
  }
  // A linear gradient has a direction and no centre, so only the component of the move ALONG the fall
  // can reach it: it makes the darkness begin earlier or later. The direction vector for a CSS angle
  // A is (sin A, -cos A) in screen coordinates, y down, so that component is dx*sin - dy*cos.
  const rad = (ANGLE[direction] * Math.PI) / 180;
  const shift = dx * Math.sin(rad) - dy * Math.cos(rad);
  const moved = `${fade(g)} ${pct(start + shift)}%, ${rgba(g, depth * 0.42)} ${pct(mid + shift)}%, ${rgba(g, depth)} 100%`;
  // A directional fall gets a frame vignette under it. Light that leaves one way still leaves at
  // every edge, and without this the far corners stay lit and the field reads as a printed gradient.
  // The vignette is radial, so it is the half of this shape that CAN take the whole vector.
  const vignette = `radial-gradient(76% 88% at ${n(50 + dx)}% ${n(46 + dy)}%, ${fade(g)} 40%, ${rgba(g, depth * 0.5)} 100%)`;
  return `${vignette},${`linear-gradient(${ANGLE[direction]}deg, ${moved})`}`;
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
  // Dodge also leaves black alone: base / (1 - 0) is base, and 0 / anything is 0. That is why it is
  // the right blend for a face catching light, and it is also its whole limitation: wherever the
  // field has drained away, an element scaling it cannot be seen at all.
  //
  // THIS COMMENT USED TO SAY the reference's black right-hand side has no bars in it and that
  // plus-lighter "lit up bars that should not be there". That is false about the photograph. Crop
  // the darkest third of refs/lightfield-ref.jpg and lift it and there are ranks of cool grey slats
  // running to the right edge; measured, that third's striping is edge 4.22 and swing 14.52 against
  // the whole frame's 3.26 and 10.70, so it is STRONGER there than anywhere. What was actually wrong
  // was the strength, not the presence. `colour.through` is the dial for it, and it screens rather
  // than adds so a face already brighter than the light landing on it does not walk up.
  //
  // Dodge is driven by the grey VALUE, not by alpha. Alpha on a dodge layer lerps towards the
  // source and desaturates, which is the bug being fixed, so a face at zero strength is opaque
  // BLACK, the exact no-op, and never a transparent pixel.
  //
  // An EMITTED element is the other half of that argument, and it is a different operation, not a
  // stronger one. Dodge multiplies, and 1.5 times black is black, so an element can never be
  // brighter than the field it stands on. A flame is brighter than the night behind it. So an
  // emitted element ADDS `bloom` on a plus-lighter layer: bright against black, and clipping to
  // white where the field beneath it is already hot. `lit(0)` stays the exact no-op in both modes,
  // opaque black under dodge and transparent under plus-lighter, so the patterns need no branch.
  const emitted = opts.shadow.light === 'emitted';
  const clamp = (a) => Math.min(1, Math.max(0, a));
  const paints = {
    dark: (a) => `rgba(0,0,0,${n(clamp(a))})`,
    lit: emitted
      ? (a) => rgba(opts.colour.bloom, clamp(a))
      : (a) => { const v = Math.round(255 * clamp(a) * DODGE); return `rgb(${v},${v},${v})`; },
  };
  const { cells, mask } = BUILDERS[opts.pattern.kind](opts, paints);

  // The field-wide silhouette. It is ONE group, not one per column: a horizon whose columns each
  // took their own phase would tear along every column, which is the same argument that makes a
  // seam and the face beside it one slat.
  const ridgeGroup = cells.reduce((m, c) => (c.g > m ? c.g : m), -1) + 1;
  const ridge = fieldMass(opts, paints.dark, ridgeGroup);

  const groups = ridgeGroup + (ridge ? 1 : 0);
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
  // THE LIGHT THROUGH THE PATTERN. The same faces a second time, painted as light rather than as a
  // scaling of what is behind them, so the pattern still exists where the field has gone black.
  //
  // The builder is called again rather than the cells being recoloured, because a builder seeds its
  // own generator from `opts.seed` and therefore lays out the identical geometry every time. Reading
  // the styles back out and swapping a colour inside them would be a parser, and a parser is how the
  // two copies drift apart.
  //
  // Only the LIT cells. A seam is where no light comes through, so it is a gap in this layer, which
  // is what makes the transmitted light read as bars rather than as a wash.
  const throughCells = opts.colour.through === '#000000' ? []
    : BUILDERS[opts.pattern.kind](opts, {
      dark: () => 'rgba(0,0,0,0)',
      lit: (a) => rgba(opts.colour.through, clamp(a)),
    }).cells.filter((c) => c.lit);
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
    // Ambient fill, and the reason a picture can have warm light and cool shadows at once.
    //
    // SCREEN lifts black to exactly this colour and leaves white exactly white, which is what a
    // faint cold skylight does to a scene lit by one warm source. It sits ABOVE the colour field and
    // BELOW the pattern on purpose: fill is light, so the blind occludes it like any other light,
    // and the seams stay relatively dark instead of being flattened by a wash laid over the top.
    //
    // Black is the exact identity, so the default emits no layer at all.
    opts.colour.shade === '#000000' ? ''
      : `.${cls} .sh{position:absolute;inset:-4%;mix-blend-mode:screen;background:${opts.colour.shade}}`,
    // The ridge takes the softness dial as a BLUR of the whole mass, not as a mask on each column.
    // A mask fades one element towards its own free end; a horizon goes soft as a single silhouette,
    // and 180 columns each fading on their own is a comb, not a haze.
    ridge ? `.${cls} .r{position:absolute;inset:-4%;mix-blend-mode:multiply`
      + `${opts.envelope.softness === 0 ? '' : `;filter:blur(${n(opts.envelope.softness * 6)}vmin)`}`
      + `${mo.body.transform ? `;transform:${mo.body.transform}` : ''}}` : '',
    layer('d', 'multiply', darkCells),
    layer('l', emitted ? 'plus-lighter' : 'color-dodge', litCells),
    // SCREEN, not plus-lighter, and the difference is the whole behaviour. plus-lighter ADDS, so it
    // brightens the lit half of the picture by as much as the dark half and every highlight walks
    // up: measured, it matched the reference's striping exactly and cost 3.4 points of block error
    // doing it. Screen is x + y - xy, so it lifts black to the colour and leaves white alone, which
    // is what light arriving on a surface that is already brighter than it actually looks like.
    // It goes ABOVE the dodged faces, because light through the blind lands on the blind too.
    layer('p', 'screen', throughCells),
    // NO `will-change` HERE, deliberately. It used to be on every element, and a field can carry 400 of
    // them: that is 400 compositor layers, more than Chrome will keep rastered, so it cycles which ones
    // it paints and the picture never settles. Measured on `tide` at 120 rings: consecutive screenshots
    // 90ms apart differed forever, the PNG oscillating between 200K and 270K, and with will-change off
    // the same field was byte-identical from the eighth attempt on. Same family as the deferred raster
    // in docs/MISTAKES.md #267, which cost whole product screenshots. A promotion hint that the browser
    // cannot honour is worse than none (docs/MISTAKES.md #272).
    `.${cls} i{position:absolute;display:block}`,
    shadow ? `.${cls} .s{position:absolute;inset:0;pointer-events:none;background:${shadow}}` : '',
  ].filter(Boolean).join('\n');

  const box = (name, list) => (list.length ? `<div class="${name}">\n${list.map(cell).join('\n')}\n</div>` : '');
  const fill = opts.colour.shade === '#000000' ? '' : '<div class="sh"></div>';
  return `<style>\n${css}\n</style>\n<div class="${cls}"><div class="f"></div>${fill}`
    + `${ridge ? box('r', ridge) : ''}${box('d', darkCells)}${box('l', litCells)}${box('p', throughCells)}`
    + `${shadow ? '<div class="s"></div>' : ''}</div>`;
}

export { LightfieldError, SCHEMA, PATTERNS, DIRECTIONS, MOTIONS, SHAPES, ANCHORS };
export default lightfield;
