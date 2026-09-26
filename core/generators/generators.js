// Registry of PLAYABLE GENERATORS: a pure function from an options object to markup, with no
// knowledge of scenes, layers or the renderer, so the same function runs in Go render, `make
// preview`, and the marketing site's dials.
//
// Entry shape: { name, blurb, schema, render(opts) -> html, docs }
//   schema     declarative option table (core/lightfield/options.js): `{ kind, ...bounds, def }`,
//              `kind: 'group'` nests via `fields`. Drives the generated control (slider/select/well).
//   presets    named full option objects; the schema `def` is a neutral value, not a good result.
//   normalise  optional: turns a plausible option set into a legal one, throws if it cannot.
//   render     must validate and throw on anything it does not understand, never substitute a default.
//   produces   'html' (markup for `--t`) or 'layers' (scene layers, previewed by booting the engine).
//
// A hand-kept list on the site side is a second source of truth that goes stale silently
// (engine-doctrine/MISTAKES.md #271), so the site reads GENERATORS directly.
import { lightfield } from '../lightfield/index.js';
import { crtSpec } from '../layers/util.js';
import { blurbsOf, defineRegistry } from '../registry/registry.js';
import { sanitizeHtml } from '../type/sanitize-html.js';
import { thermalPrimitives, THERMAL_REGION, THERMAL_RAMP } from '../looks/filters.js';
import { FALLOFF_NAMES } from '../motion/effector.js';
import { handleCurve } from '../motion/motion.js';
import { SCHEMA as LIGHTFIELD_SCHEMA, normalise as lightfieldNormalise, HONOURS } from '../lightfield/options.js';
import { PRESETS as LIGHTFIELD_PRESETS } from '../lightfield/presets.js';
// The playground lists FIELD GENERATORS only. Block families (blocks/schema.mjs) are scene FRAGMENTS,
// not pictures, so they are not listed here.
//
// One entry per LOOK, not per preset: `slats`, `rings` and `shards` are different pictures with
// different dials and references, each measured on its own (research/lightfield/lightfield-check.mjs).
// A look is a name, a preset, a reference, and a narrowed view of the shared schema.

// Which dials a look does not honour, from the generator's own HONOURS table. Narrowing is why a
// `rings` look cannot build the illegal pair `shadow.seamWidth` used to throw on (MISTAKES #277).
function narrow(schema, kind) {
  const drop = HONOURS.filter((r) => !r.by.includes(kind)).map((r) => r.at);
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (drop.includes(key)) continue;                       // a whole group
    if (spec.kind !== 'group') { out[key] = spec; continue; }
    const fields = Object.fromEntries(
      Object.entries(spec.fields).filter(([k]) => !drop.includes(`${key}.${k}`)));
    out[key] = { ...spec, fields };
  }
  return out;
}

// `ready` is a human judgement, not a number: a look is ready when somebody has put it beside its
// reference, looked, and would stand behind it.
// `lightfield-check.mjs` prints every look including held-back ones, so the gap stays visible.
const LOOKS = [
  { name: 'colonnade', preset: 'colonnade', ref: 'refs/ref-b.png', ready: true,
    blurb: 'Wide panels split by bright hairlines, soft masses under a glow.' },
  // HELD BACK: score stuck at 20.0 after the shadow temperature fix; the remaining gap is composition
  // (reference is a flowing field, this is one soft lobe), not colour.
  { name: 'blinds', preset: 'ref', ref: 'refs/lightfield-ref.jpg', ready: false,
    blurb: 'A backlit blind. Fine slats, a warm bloom behind them, cool shadow.' },
];

// `ember` (refs/ref-a.jpg, scored 22.2, READY) is not in LOOKS: a taste call, not a measurement gap.
// Its preset stays in core/lightfield/presets.js (`make gen X=lightfield PRESET=ember`), so bringing back its
// row here is the only thing needed to restore it.

// `tide` and `fern` are not in LOOKS: invented looks with no reference, never scored. Their presets
// stay reachable via `make gen X=lightfield`; adding a row here needs a reference and a score first.

const build = ({ name, preset, ref, blurb, ready }) => {
  const opts = LIGHTFIELD_PRESETS[preset];
  const kind = opts.pattern?.kind ?? LIGHTFIELD_SCHEMA.pattern.fields.kind.def;
  return {
    name,
    group: 'lightfield',
    blurb,
    docs: 'engine-doctrine/LIGHTFIELD.md',
    reference: ref,
    schema: narrow(LIGHTFIELD_SCHEMA, kind),
    presets: { [preset]: opts },
    produces: 'html',
    ready: !!ready,
    normalise: lightfieldNormalise,
    render: lightfield,
  };
};

// `bands` is a SHADER (core/shaders-ambient.js), reaching the playground as scene layers rather than
// HTML, so the preview boots the real engine on it instead of a second renderer.
//
// Schema lives here, not with the shader: the shader's parameter vector is four anonymous floats
// (`u_p`), and the NAMES belong with the generator that knows them, in degrees and percent.
//
// Position and place share the lightfield generator's own spelling: percent of the frame, 50/50
// unmoved, off-frame values legal (core/lightfield/options.js, `colour.originX`).
// `round` and `oval` share an index deliberately: one distance function, a different second radius.
// The shader's own numbering is fixed, so this table maps names to that fixed order, not the reverse.
const LIGHT_SHAPES = { round: 0, oval: 0, bar: 1, rounded: 2, cross: 3, sweep: 4 };
const LIGHT_SHAPE_NAMES = Object.keys(LIGHT_SHAPES);

// Shared by both cards: same light, one declaration, so the two panels cannot drift apart.
const LIGHT_SCHEMA = {
  lightShape:    { kind: 'enum', of: LIGHT_SHAPE_NAMES, def: 'round', primary: true,
                   note: 'round and oval are ellipses; bar is a band of light with no hot centre; cross is two bars; rounded is a chamfered box; sweep is a sector, like a beacon.' },
  lightWidth:    { kind: 'num', min: 0.05, max: 2, def: 0.62, primary: true,
                   note: 'how far the light reaches sideways, as a fraction of the frame height.' },
  lightHeight:   { kind: 'num', min: 0.05, max: 2, def: 0.62,
                   note: 'the same reach up and down. Equal to the width is a circle. `round` forces it equal.' },
  lightAngle:    { kind: 'num', min: -180, max: 180, def: 0, note: 'degrees. Turns the light\'s shape, so a bar can lie flat or stand up.' },
  lightOriginX:  { kind: 'num', min: -50, max: 150, def: 50, primary: true, note: 'percent across the frame. 50 is the middle; outside 0..100 is off-frame and legal.' },
  lightOriginY:  { kind: 'num', min: -50, max: 150, def: 45, primary: true, note: 'percent DOWN the frame. 45 is where the light always used to sit.' },
  lightEdge:     { kind: 'num', min: 0.3, max: 4, def: 1.6, note: 'how abruptly the light stops. Low is a wide haze, high is a defined pool.' },
  lightRing:     { kind: 'num', min: 0, max: 1.5, def: 0, note: 'put the light\'s brightest point at this radius instead of at its centre, making a halo. 0 is a solid light.' },
  lightPoints:   { kind: 'int', min: 0, max: 12, def: 0, note: 'how many spikes the light has. Needs lightSpike above 0 to show.' },
  lightSpike:    { kind: 'num', min: 0, max: 0.9, def: 0, note: 'how far the spikes reach. 0 is a smooth edge whatever lightPoints says.' },
  lightPolarity: { kind: 'num', min: -2, max: 2, def: 1, note: 'positive lights the field, negative DARKENS it: a shadow mass behind the bands rather than a glow in front.' },
};

const BAND_SCHEMA = {
  // 48: measured by rendering 8/16/25/40/60/80 side by side; the picture reads as light-behind-a-screen
  // above ~40, as cut stripes below ~25. `spectrum` overrides this with 10.7, fitted to a photo (14.2 err).
  bands:       { kind: 'num', min: 2, max: 80, def: 48, primary: true, scale: 'log',
                 note: 'how many bands fit across the frame at zoom 1.' },
  bandAngle:   { kind: 'num', min: -90, max: 90, def: 0, note: 'degrees. 0 stands the bands upright.' },
  bandOffset:  { kind: 'num', min: 0, max: 1, def: 0, note: 'slides the whole set sideways by a fraction of one band, which is how you put a seam or a band centre on the middle of the frame.' },
  mirrorBands: { kind: 'bool', def: false, note: 'fold the pattern about the field\'s middle, so each band shades outward on both sides instead of one way across the whole picture.' },
  zoom:        { kind: 'num', min: 0.2, max: 6, def: 1, primary: true,
                 note: 'push into the pattern, around the LIGHT rather than around the middle of the frame. It magnifies; it does not change how many bands `bands` means.' },
};

const BANDS_SCHEMA = {
  shape: { kind: 'enum', of: ['panels', 'arcs', 'rounded'], def: 'panels', primary: true,
           note: 'what the bands are cut on: upright panels, rings around a point, or nested rounded rectangles.' },
  ...BAND_SCHEMA,
  shapeOriginX: { kind: 'num', min: -50, max: 150, def: 50, note: 'percent across. Where arcs and rounded rectangles are centred; panels ignore it.' },
  shapeOriginY: { kind: 'num', min: -50, max: 150, def: 50, note: 'percent down. The other half of the same point.' },
  ...LIGHT_SCHEMA,
  // No `brightness`: the shared shader tail does `alpha *= clamp(u_intensity)`, so it was an opacity
  // dial, not a light one. Use `lightPolarity` for light strength, colour fields for how bright it reads.
  seed:       { kind: 'int', min: 0, max: 4294967295, def: 7, primary: true },
  colour: {
    kind: 'group',
    fields: {
      farEdges:    { kind: 'hex', def: '#3a1f00', primary: true, note: 'the colour the field falls to where the light does not reach.' },
      midField:    { kind: 'hex', def: '#ffb300', primary: true, note: 'the lit face of a band.' },
      lightCore:   { kind: 'hex', def: '#ffe6a8', primary: true, note: 'the hottest part, and the colour the light itself adds.' },
      deepShadow:  { kind: 'hex', def: '#05060a', primary: true, note: 'the dark that owns the far edges, and what a negative lightPolarity paints.' },
    },
  },
};

// The SPECTRUM card. Same shader, a different picture, and a different colour model: here the palette
// is a RAMP read end to end rather than four named roles, so the fields are positions.
const SPECTRUM_SCHEMA = {
  ...BAND_SCHEMA,
  bands:       { ...BAND_SCHEMA.bands, min: 3, max: 40, def: 10.7 },
  bandOffset:  { ...BAND_SCHEMA.bandOffset, def: 0.5 },
  mirrorBands: { ...BAND_SCHEMA.mirrorBands, def: true },
  gradientAngle: { kind: 'num', min: -180, max: 180, def: 90, primary: true,
                   note: 'degrees. Which way the colour ramp runs. 90 sends it straight down the frame, at a right angle to upright bands, which is the whole point of this look.' },
  converge:    { kind: 'num', min: 0, max: 0.4, def: 0.10, primary: true,
                 note: 'how much less of the ramp each band shows as it gets further from the middle. 0 is flat stripes all alike; a tenth is what reads as depth.' },
  bandLean:    { kind: 'num', min: 0, max: 1.5, def: 0.5,
                 note: 'how much of that step happens ACROSS a band instead of on its seam. 0 makes every band one flat depth.' },
  bandShading: { kind: 'num', min: -1, max: 1, def: -0.25,
                 note: 'darken a band toward one edge. Negative brightens the outer edge instead, which is what a lit column does.' },
  ...LIGHT_SCHEMA,
  lightPolarity: { ...LIGHT_SCHEMA.lightPolarity, def: 0, note: 'positive lights the field, negative darkens it, and here 0 means NO light at all: the ramp carries the picture on its own.' },
  seed:       { kind: 'int', min: 0, max: 4294967295, def: 0 },
  // Numbered, not named: position IS the meaning on a ramp.
  colour: {
    kind: 'group',
    fields: Object.fromEntries(['#effce6', '#def9de', '#68b290', '#c0e87a', '#7ccdd8', '#56a0dd', '#dcf4fb', '#eeffff']
      .flatMap((def, i) => [
        [`ramp${i + 1}`, { kind: 'hex', def, primary: i < 4,
          note: `ramp stop ${i + 1} of 8, by default ${Math.round((i / 7) * 100)}% along the gradient.` }],
        // def is exactly i/7, not a rounded decimal: `(i/7).toFixed(4)` would not equal 1/7 in the
        // shader's own arithmetic and would shift every untouched ramp.
        [`ramp${i + 1}At`, { kind: 'num', min: 0, max: 1, def: i / 7, primary: false, monotone: 'ramp',
          note: `how far along the gradient stop ${i + 1} sits. Stops must stay in order.` }],
      ])),
  },
};

const deg = (d) => (d ?? 0) / 360;                       // the shader counts turns; a person counts degrees
const frac = (pct, mid = 50) => ((pct ?? mid) - mid) / 100;  // percent of frame -> fraction from that point
const pick = (o, k, s) => o?.[k] ?? s[k]?.def;

// One mapping, both cards. `render` is called with partial option objects, so every read falls back to
// the schema's own default.
function bandLayers(o, S, { gradient }) {
  const shape = pick(o, 'shape', S) ?? 'panels';
  const lname = pick(o, 'lightShape', S);
  const lshape = LIGHT_SHAPES[lname];
  if (lshape === undefined) throw new Error(`unknown lightShape "${lname}". One of: ${LIGHT_SHAPE_NAMES.join(', ')}`);
  const width = pick(o, 'lightWidth', S);
  // `round` has no second radius, so height is forced equal to width here too, same reset `normalise` does.
  const height = pick(o, 'lightShape', S) === 'round' ? width : pick(o, 'lightHeight', S);
  const bands = pick(o, 'bands', S);
  if (!(bands > 0)) throw new Error(`bands must be a positive number, got ${bands}`);
  const zoom = pick(o, 'zoom', S);
  if (!(zoom > 0)) throw new Error(`zoom must be greater than 0, got ${zoom}`);
  // A schema may declare a companion `<name>At` position per hex stop, sent as `#rrggbb@0.42`
  // (core/surfaces/palette.js). Without one, like BANDS_SCHEMA, stops emit as plain hex, spread evenly.
  const stopKeys = Object.keys(S.colour.fields).filter((k) => S.colour.fields[k].kind === 'hex');
  const colours = stopKeys.map((k) => {
    const hex = o?.colour?.[k] ?? S.colour.fields[k].def;
    const posField = S.colour.fields[`${k}At`];
    if (!posField) return hex;
    return `${hex}@${o?.colour?.[`${k}At`] ?? posField.def}`;
  });
  const at = (c) => Number(String(c).split('@')[1]);
  for (let i = 1; i < colours.length; i++) {
    if (colours[i].includes('@') && at(colours[i]) < at(colours[i - 1])) {
      throw new Error(`${stopKeys[i]}At (${at(colours[i])}) sits before ${stopKeys[i - 1]}At (${at(colours[i - 1])}). Ramp stops must stay in order.`);
    }
  }
  // EVEN POSITIONS ARE SENT AS NO POSITIONS. Not a shortcut: the shader's positional path and its
  // even path are the same formula in real arithmetic and different pictures in float32, because 1/7
  // does not round-trip. Emitting `@0.142857…` for an untouched ramp would shift the spectrum card
  // the moment this feature landed, for nobody's benefit. So the suffix appears only once someone has
  // actually moved a stop, and until then the render is bit-for-bit what it always was.
  const even = colours.length > 1
    && colours.every((c, i) => c.includes('@') && at(c) === i / (colours.length - 1));
  const stops = even ? colours.map((c) => c.split('@')[0]) : colours;
  return [{
    type: 'shader', shader: 'bands',
    intensity: 1,   // this uniform is alpha in the shared shader tail, not luminance
    seed: pick(o, 'seed', S),
    // No aspect divide here: the shader normalises its own band axis. Dividing here too doubled the
    // correction and clamped `spectrum`'s ramp to its end stop, flattening the right of the frame.
    params: [bands, deg(pick(o, 'bandAngle', S)), width, pick(o, 'lightEdge', S)],
    params2: [['panels', 'arcs', 'rounded'].indexOf(shape),
      frac(pick(o, 'shapeOriginX', S) ?? 50), -frac(pick(o, 'shapeOriginY', S) ?? 50),
      pick(o, 'lightPolarity', S)],
    params3: [gradient ? 1 : 0, deg(pick(o, 'gradientAngle', S) ?? 0),
      pick(o, 'converge', S) ?? 0, pick(o, 'bandOffset', S)],
    params4: [pick(o, 'mirrorBands', S) ? 1 : 0,
      frac(pick(o, 'lightOriginX', S)), -frac(pick(o, 'lightOriginY', S), 45), lshape],
    params5: [height / width, deg(pick(o, 'lightAngle', S)),
      pick(o, 'bandShading', S) ?? 0, pick(o, 'bandLean', S) ?? 0],
    params6: [pick(o, 'lightRing', S), pick(o, 'lightPoints', S), pick(o, 'lightSpike', S), zoom],
    colors: stops,
    // No w/h: core/surfaces/shader.js sizes an unboxed ambient layer to the frame. A declared box bakes
    // in whatever aspect the generator was fitted at, leaving bare background outside it on other canvases.
    x: 0, y: 0, start: 0, duration: 6,
  }];
}

// A dial the chosen shape has no way to express is RESET rather than obeyed, and saying so is the
// difference between this and a silent substitution: `round` is a circle by definition, so a height
// that differs from the width is not a setting it can honour.
const bandsNormalise = (o) => {
  const out = { ...o };
  if (out.lightShape === 'round' && out.lightHeight !== out.lightWidth) out.lightHeight = out.lightWidth;
  return out;
};

const BANDS = {
  name: 'bands',
  group: 'shader',
  blurb: 'A ramp repeated over a field: panels, concentric arcs or nested rounds, with a light behind.',
  docs: 'engine-doctrine/LIGHTFIELD.md',
  reference: null,
  schema: BANDS_SCHEMA,
  presets: { bands: {} },
  produces: 'layers',
  ready: true,
  normalise: bandsNormalise,
  render: (o) => bandLayers(o, BANDS_SCHEMA, { gradient: false, w: 1920, h: 1080 }),
};

// Fitted to refs/colonnade/c6.jpg at its own 9:16, mean per-channel error 14.2/255 against the
// reference; remaining differences are in engine-doctrine/LIGHTFIELD.md.
const SPECTRUM = {
  name: 'spectrum',
  group: 'shader',
  blurb: 'Upright bands with a colour ramp falling down the frame, each band showing less of it than the one inside it.',
  docs: 'engine-doctrine/LIGHTFIELD.md',
  reference: 'refs/colonnade/c6.jpg',
  schema: SPECTRUM_SCHEMA,
  presets: { c6: {} },
  produces: 'layers',
  ready: true,
  normalise: bandsNormalise,
  render: (o) => bandLayers(o, SPECTRUM_SCHEMA, { gradient: true, w: 1080, h: 1920 }),  // portrait: fitted at 9:16
};

// Unlike the field cards, `crt` is a treatment applied to whatever is under it, so it needs a stand-in
// screen to show it on. The stand-in is bright on dark deliberately: the bloom on a lit edge is the
// part a generative overlay cannot do, and it is invisible with nothing lit to bloom.
const CRT_SCHEMA = {
  bloom:     { kind: 'num', min: 0, max: 8, def: 1.6, primary: true,
               note: 'how far the picture underneath spreads, in pixels. This is the phosphor, and it is the part an overlay cannot do. Brightness rises with it, because blurring a bright shape over more area would otherwise dim it.' },
  lines:     { kind: 'unit', def: 0.42, primary: true,
               note: 'how dark each scanline is. 0 removes them.' },
  gap:       { kind: 'num', min: 2, max: 12, def: 4, primary: true,
               note: 'pixels from one scanline to the next. Bigger is a coarser, older tube.' },
  scan:      { kind: 'num', min: 0, max: 6, def: 1,
               note: 'pixels of dark in each line. It can never exceed the gap, or the field would be solid black.' },
  vignette:  { kind: 'unit', def: 0.5, primary: true, note: 'how much the corners fall away.' },
  tintAmount:{ kind: 'unit', def: 0.25, primary: true, note: 'how much of the phosphor colour is laid over the whole picture. 0 leaves the colours alone.' },
  // Three colour fields, not one: text, ground and phosphor tint are three separate decisions, which
  // is what lets a red line sit inside a white bloom.
  colour: {
    kind: 'group', primary: true,
    fields: {
      text:   { kind: 'hex', def: '#5cff9d', primary: true, note: 'the words on the screen. The bloom takes its hue from this, because a phosphor glows the colour of what is lit.' },
      ground: { kind: 'hex', def: '#04140b', primary: true, note: 'the tube behind the words, before any scanline or falloff.' },
      tint:   { kind: 'hex', def: '#19ff7a', primary: true, note: 'the phosphor colour laid over the whole picture. `tintAmount` decides how much of it lands.' },
    },
  },
  // THE SCREEN'S OWN WORDS. Every other card here has no content to speak of, because a field IS its
  // own subject. This one is a treatment, and a treatment needs something to treat, so the stand-in
  // words are part of what you are looking at and there is no reason they should be mine.
  //
  // `str` is the right kind rather than `text`: the randomiser skips it by declaration, because
  // content is not a dial and rolling somebody's words is not a variation of the look.
  text:    { kind: 'str', def: 'VHS', note: 'the big line on the screen. <b> and <em> work.' },
  sub:     { kind: 'str', def: 'GREEN PHOSPHOR · SCANLINE · BLOOM', note: 'the small line under it. Leave it empty to drop it.' },
};

const hexToRgba = (hex, a) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
};

const CRT = {
  name: 'crt',
  group: 'treatment',
  blurb: 'A cathode ray tube: the picture under it goes soft and blooms, then scanlines and a corner falloff go over the top.',
  docs: 'engine-doctrine/EFFECTS.md',
  reference: null,
  schema: CRT_SCHEMA,
  presets: { tube: {} },
  produces: 'html',
  ready: true,
  render: (o) => {
    const amt = o?.tintAmount ?? CRT_SCHEMA.tintAmount.def;
    const { filter, background } = crtSpec({
      bloom: pick(o, 'bloom', CRT_SCHEMA),
      lines: pick(o, 'lines', CRT_SCHEMA),
      gap: pick(o, 'gap', CRT_SCHEMA),
      scan: pick(o, 'scan', CRT_SCHEMA),
      vignette: pick(o, 'vignette', CRT_SCHEMA),
      tint: amt > 0 ? hexToRgba(o?.colour?.tint ?? CRT_SCHEMA.colour.fields.tint.def, amt * 0.35) : null,
    });
    // crtSpec is the same function core/layers/util.js calls, so a card that looks right is evidence
    // about the layer, not just this file. Sanitised with the engine's own sanitiser: these words come
    // from a public text box, so `<b>`/`<em>` survive but a script or iframe does not.
    const line = sanitizeHtml(o?.text ?? CRT_SCHEMA.text.def);
    const sub = sanitizeHtml(o?.sub ?? CRT_SCHEMA.sub.def);
    const F = CRT_SCHEMA.colour.fields;
    const ink = o?.colour?.text ?? F.text.def;
    const ground = o?.colour?.ground ?? F.ground.def;
    // Sub-line colour is derived, not a fourth dial: a dimmer version of the main ink. On a light
    // ground the derivation goes quiet, an accepted limit of one dial driving two things.
    const subInk = hexToRgba(ink, 0.72);
    // The bloom is a `filter` on the picture, not `backdrop-filter` over it: the playground rasterises
    // through an SVG foreignObject, and backdrop-filter does not composite inside one (no page backdrop
    // to sample), so the phosphor silently vanished on export. Filtering the picture works in both
    // places. The engine's own `crt` layer prop keeps backdrop-filter, correctly, since it renders in a
    // real browser over content it does not own.
    // Type is sized in `cqw` (from the card), not `vw` (from the viewport): the two differ inside the
    // exporter's foreignObject, which is a different viewport than the live preview.
    return `<div style="position:absolute;inset:0;overflow:hidden;container-type:size">
  <div style="position:absolute;inset:0;background:${ground};${filter ? `filter:${filter};` : ''}">
    <div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center;
      font:800 clamp(28px,17cqw,96px)/1 var(--font-sans,system-ui),sans-serif;color:${ink};letter-spacing:.01em">${line}
      ${sub ? `<div style="font:400 clamp(8px,3.2cqw,15px)/1.4 var(--font-sans,system-ui),sans-serif;color:${subInk};margin-top:.7em;letter-spacing:.22em">${sub}</div>` : ''}
    </div>
  </div>
  <div style="position:absolute;inset:0;pointer-events:none;background-image:${background || 'none'}"></div>
</div>`;
  },
};


// The After Effects thermal-blur look, as a generator rather than only the `thermalBlur` filter
// preset: on a transparent layer the ramp's bottom stops never arrive, so the full three-band look
// needs an opaque black plate under `mix-blend-mode: screen`, a construction this card provides.
//
// `thermalPrimitives` in core/filters.js is the one owner of the filter chain; the engine's
// `filter: "thermalBlur"` builds from the same function. The <svg> is inlined rather than referenced
// because a `url(#id)` def resolves to nothing inside the exporter's SVG foreignObject, the same
// export trap the CRT card's phosphor hit.
const THERMAL_SCHEMA = {
  radius:  { kind: 'num', min: 1, max: 24, def: 6, primary: true,
             note: 'the near blur, in pixels, and the only dial that matters. Small keeps the letters legible with a hot edge; large lets the ramp EAT the thin strokes, which is the reference look.' },
  heat:    { kind: 'unit', def: 1, primary: true,
             note: 'how much of the thermal plate shows over the plain white one. 0 is untreated type, so this is the dial an animation would key from 0 to 1.' },
  colour: {
    kind: 'group', primary: true,
    fields: {
      ground: { kind: 'hex', def: '#000000', primary: true, note: 'the ground behind the type. The plate itself is always true black, because a gradient map reads luminance and needs a real black to map its far field from; this is what the card sits on.' },
    },
  },
  text:    { kind: 'str', def: 'thermal blur', note: 'the words. <b> and <em> work.' },
};

const THERMAL = {
  name: 'thermalBlur',
  group: 'treatment',
  blurb: 'White type blurred, then remapped through a heat ramp: white cores, an orange body, a blue rim, and the thin strokes eaten away.',
  docs: 'engine-doctrine/EFFECTS.md',
  reference: null,
  schema: THERMAL_SCHEMA,
  presets: { heat: {} },
  produces: 'html',
  ready: true,
  render: (o) => {
    const radius = pick(o, 'radius', THERMAL_SCHEMA);
    const heat = pick(o, 'heat', THERMAL_SCHEMA);
    const ground = o?.colour?.ground ?? THERMAL_SCHEMA.colour.fields.ground.def;
    const line = sanitizeHtml(o?.text ?? THERMAL_SCHEMA.text.def);
    const region = Object.entries(THERMAL_REGION).map(([k, v]) => `${k}="${v}"`).join(' ');
    // Sized from the CARD and not the viewport: `cqw` asks the container, which is the same box live
    // and inside the exporter's foreignObject. `vw` is not, and it renders one size in each.
    const type = 'font:700 clamp(24px,15cqw,180px)/1 var(--font-sans,system-ui),sans-serif;letter-spacing:-.03em;white-space:nowrap';
    const plate = `position:absolute;inset:0;background:#000;mix-blend-mode:screen;display:grid;place-items:center;color:#fff;${type}`;
    return `<div style="position:absolute;inset:0;overflow:hidden;container-type:size;background:${ground}">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="pg-thermal" ${region} color-interpolation-filters="sRGB">${thermalPrimitives({ radius, stops: THERMAL_RAMP })}</filter>
  </defs></svg>
  <div style="${plate};filter:url(#pg-thermal);opacity:${heat.toFixed(3)}">${line}</div>
  <div style="${plate};opacity:${(1 - heat ** 3).toFixed(3)}">${line}</div>
</div>`;
  },
};


// The dial worth turning is `sticky`: at 0 the point is a moving highlight; above ~0.5s the same rig
// paints a trail, since clones the point has passed stay displaced.
const EFFECTOR_SCHEMA = {
  sticky:    { kind: 'num', min: 0, max: 2, def: 1, primary: true,
               note: 'seconds a clone HOLDS what the pass did to it before easing back. 0 is a moving highlight; 1 is the value the technique states, and it is what turns the pass into a painted trail.' },
  radius:    { kind: 'num', min: 60, max: 900, def: 320, primary: true,
               note: 'how far the point reaches, in pixels. Smaller than the gap between clones and only one reacts at a time.' },
  falloff:   { kind: 'enum', of: FALLOFF_NAMES, def: 'smooth', primary: true,
               note: 'how influence drops off with distance. `sphere` reads as an object passing beneath the grid; `step` is a hard edge.' },
  scale:     { kind: 'num', min: -0.9, max: 1.5, def: 0.75, primary: true,
               note: 'added to a fully affected clone\'s scale. Negative shrinks the ones the point is nearest.' },
  push:      { kind: 'num', min: -160, max: 160, def: 0,
               note: 'pixels shoved ALONG the vector from the point to the clone. This is the drive that reads direction, and the one a stagger cannot express at all.' },
  rotate:    { kind: 'num', min: -180, max: 180, def: 0, note: 'degrees at full influence.' },
  overshoot: { kind: 'unit', def: 0, note: 'how far past rest a clone rings on its way back. Needs sticky above 0 to have a window to ring in.' },
  cols:      { kind: 'int', min: 2, max: 16, def: 8, note: 'clones across.' },
  rows:      { kind: 'int', min: 1, max: 12, def: 8, note: 'clones down.' },
  colour:    { kind: 'hex', def: '#e8ff59', note: 'the clone.' },
};

const EFFECTOR = {
  name: 'effector',
  group: 'motion',
  blurb: 'Move a hundred copies with one moving point, and keyframe none of them. Each copy reacts to how FAR the point is, not to its place in a list, so you get a wave, a ripple, or a trail that lags behind. Flip between trail, highlight and ripple to see it.',
  docs: 'engine-doctrine/EFFECTS.md',
  reference: null,
  schema: EFFECTOR_SCHEMA,
  presets: { trail: {}, highlight: { sticky: 0 }, ripple: { falloff: 'sphere', push: 90, scale: 0 } },
  produces: 'layers',
  ready: true,
  render: (o) => {
    const g = (k) => pick(o, k, EFFECTOR_SCHEMA);
    const cols = g('cols'), rows = g('rows'), colour = g('colour');
    const W = 1920, H = 1080, cell = 96, gap = 28;
    const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
    const cells = Array.from({ length: cols * rows }, () =>
      `<div data-clone style="width:${cell}px;height:${cell}px;border-radius:14px;background:${colour}"></div>`).join('');
    // The path crosses the grid and comes back on a lower line, so one render shows both the leading
    // edge and the tail the sticky delay leaves behind it.
    const path = [
      { t: 0, x: -220, y: gh * 0.28 },
      { t: 2.2, x: gw + 220, y: gh * 0.28, ease: 'through' },
      { t: 4.4, x: -220, y: gh * 0.72, ease: 'through' },
      { t: 6, x: gw * 0.5, y: gh * 0.5 },
    ];
    const drives = { scale: g('scale') };
    if (g('push')) drives.push = g('push');
    if (g('rotate')) drives.rotate = g('rotate');
    return [{
      type: 'html', x: (W - gw) / 2, y: (H - gh) / 2, w: gw, h: gh, start: 0, duration: 6, anim: 'none',
      html: `<div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:${gap}px">${cells}</div>`,
      effector: {
        select: '[data-clone]', path, radius: g('radius'), falloff: g('falloff'),
        sticky: g('sticky'), overshoot: g('overshoot'), drives,
      },
    }];
  },
};

// One dial: `smoothness`. At 1 (the engine's historic default) a glyph crosses its window
// continuously; at 0 it swaps between states with nothing in between.
const SELECTOR_SCHEMA = {
  smoothness: { kind: 'unit', def: 1, primary: true,
                note: 'how WIDE each glyph\'s transition band is, which is not the same as its curve. 1 is continuous, the engine\'s historic behaviour. 0 is a swap with no interpolation, and it is the value a font morph is built on.' },
  preset:     { kind: 'enum', of: ['up', 'scale', 'blur', 'weight', 'fall', 'flip'], def: 'scale', primary: true,
                note: 'the kinetic preset the selector is driving. `scale` and `blur` show the swap most plainly, because at smoothness 0 there is no scaling and no blurring left to see.' },
  stagger:    { kind: 'num', min: 0, max: 0.3, def: 0.07, primary: true, note: 'seconds between one glyph and the next.' },
  each:       { kind: 'num', min: 0.1, max: 2, def: 0.6, note: 'seconds one glyph spends crossing its own window.' },
  text:       { kind: 'str', def: 'swap, do not scale', note: 'the words.' },
};

const SELECTOR = {
  name: 'rangeSelector',
  group: 'type',
  blurb: 'The AE range selector\'s smoothness dial on this engine\'s kinetic presets: at 1 a glyph transitions, at 0 it swaps outright, which is the value a font morph needs.',
  docs: 'engine-doctrine/EFFECTS.md',
  reference: null,
  schema: SELECTOR_SCHEMA,
  presets: { swap: { smoothness: 0 }, continuous: {} },
  produces: 'layers',
  ready: true,
  render: (o) => [{
    type: 'text', pin: 'stage', y: 460, align: 'center', size: 130, weight: 700,
    color: 'var(--text)', start: 0, duration: 5, anim: 'none',
    text: sanitizeHtml(pick(o, 'text', SELECTOR_SCHEMA)),
    split: 'char', preset: pick(o, 'preset', SELECTOR_SCHEMA),
    stagger: pick(o, 'stagger', SELECTOR_SCHEMA), each: pick(o, 'each', SELECTOR_SCHEMA),
    smoothness: pick(o, 'smoothness', SELECTOR_SCHEMA),
  }],
};

// A handle has four numbers you cannot predict the feel of, so this card samples `handleCurve`
// (core/motion.js, the one owner) live. Two panels: the graph flatters any curve; the strip below it
// samples at even TIME intervals and marks the value, showing what the eye actually reads on a frame.
const HANDLE_SCHEMA = {
  outInfluence: { kind: 'num', min: 0, max: 100, def: 100 / 3, primary: true,
                  note: 'how far along the segment the LEAVING handle reaches, as a per cent of its duration. AE\'s Easy Ease is a third. Large means the value hangs at this key and the movement is crushed into the far end.' },
  outSpeed:     { kind: 'num', min: -2, max: 6, def: 0, primary: true,
                  note: 'how fast the value is moving AS IT LEAVES the first key, as a MULTIPLE of the segment\'s own average velocity. 0 is a dead stop, 1 is a straight line, 4 rushes out. Negative winds back before setting off.' },
  inInfluence:  { kind: 'num', min: 0, max: 100, def: 100 / 3, primary: true,
                  note: 'the same reach for the ARRIVING handle, measured back from the second key.' },
  inSpeed:      { kind: 'num', min: -2, max: 6, def: 0, primary: true,
                  note: 'how fast the value is moving AS IT ARRIVES. 0 lands dead; above 1 it is still travelling when it gets there, which is what makes a swap read as one gesture rather than a dissolve.' },
  ticks:        { kind: 'int', min: 6, max: 48, def: 24,
                  note: 'how many even slices of TIME the strip samples. 24 is a second at 24fps, so each tick is a frame.' },
  colour:       { kind: 'hex', def: '#e8ff59', note: 'the curve.' },
};

const HANDLE_CARD = {
  name: 'keyframeHandle',
  group: 'motion',
  blurb: 'Why two easings that look alike FEEL different: one curve between two keyframes, drawn beside a strip of evenly spaced dots. The dots bunch where the thing is slow and spread where it is fast, which the curve alone hides. Flip between easyEase, snap, hang and overshoot to see it.',
  docs: 'engine-doctrine/EFFECTS.md',
  reference: null,
  schema: HANDLE_SCHEMA,
  presets: {
    easyEase: {},
    snap: { outInfluence: 18, outSpeed: 4, inInfluence: 18, inSpeed: 4 },
    hang: { outInfluence: 85, outSpeed: 0, inInfluence: 20, inSpeed: 1 },
    overshoot: { outInfluence: 30, outSpeed: 0, inInfluence: 62, inSpeed: 1.8 },
  },
  produces: 'html',
  ready: true,
  render: (o) => {
    const oi = pick(o, 'outInfluence', HANDLE_SCHEMA), os = pick(o, 'outSpeed', HANDLE_SCHEMA);
    const ii = pick(o, 'inInfluence', HANDLE_SCHEMA), is = pick(o, 'inSpeed', HANDLE_SCHEMA);
    const n = Math.round(pick(o, 'ticks', HANDLE_SCHEMA));
    const col = o?.colour ?? HANDLE_SCHEMA.colour.def;
    const f = handleCurve({ influence: oi, speed: os }, { influence: ii, speed: is });
    // The four control-point coordinates, spelled out on the card because the numbers ARE the
    // teaching: x is influence over 100, y is speed times that x.
    const x1 = oi / 100, y1 = os * x1, x2 = 1 - ii / 100, y2 = 1 - is * (ii / 100);
    const W = 100, H = 100, px = (x) => (x * W).toFixed(2), py = (y) => ((1 - y) * H).toFixed(2);
    let d = `M 0 ${py(0)}`;
    for (let i = 1; i <= 120; i++) { const t = i / 120; d += ` L ${px(t)} ${py(f(t))}`; }
    const ticks = [...Array(n + 1)].map((_, i) => f(i / n));
    const marks = ticks.map((v) => `<i style="position:absolute;left:${(v * 100).toFixed(3)}%;top:0;bottom:0;width:2px;margin-left:-1px;background:${col};opacity:.75"></i>`).join('');
    const box = 'position:absolute;background:#0b0b0c;border:1px solid #ffffff1a;border-radius:8px';
    return `<div style="position:absolute;inset:0;background:#000;container-type:size;font:500 clamp(8px,2.4cqw,15px)/1.4 var(--font-sans,system-ui),sans-serif;color:#fff">
  <div style="${box};left:6%;top:8%;width:52%;aspect-ratio:1;overflow:hidden">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
      <path d="M 0 100 L 100 0" stroke="#ffffff26" stroke-width="0.6" fill="none" vector-effect="non-scaling-stroke"/>
      <path d="M 0 ${py(0)} L ${px(x1)} ${py(y1)}" stroke="#ffffff59" stroke-width="0.6" fill="none" vector-effect="non-scaling-stroke"/>
      <path d="M 100 ${py(1)} L ${px(x2)} ${py(y2)}" stroke="#ffffff59" stroke-width="0.6" fill="none" vector-effect="non-scaling-stroke"/>
      <path d="${d}" stroke="${col}" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>
      <circle cx="${px(x1)}" cy="${py(y1)}" r="2.4" fill="${col}" vector-effect="non-scaling-stroke"/>
      <circle cx="${px(x2)}" cy="${py(y2)}" r="2.4" fill="${col}" vector-effect="non-scaling-stroke"/>
    </svg>
  </div>
  <div style="position:absolute;left:62%;right:6%;top:8%;opacity:.82">
    <div style="opacity:.55;letter-spacing:.08em;text-transform:uppercase">cubic-bezier</div>
    <div style="color:${col};margin-top:.3em">${x1.toFixed(3)}, ${y1.toFixed(3)}, ${x2.toFixed(3)}, ${y2.toFixed(3)}</div>
    <div style="opacity:.55;margin-top:1.2em;letter-spacing:.08em;text-transform:uppercase">out</div>
    <div>influence ${oi.toFixed(0)}% &middot; speed ${os.toFixed(2)}x</div>
    <div style="opacity:.55;margin-top:.9em;letter-spacing:.08em;text-transform:uppercase">in</div>
    <div>influence ${ii.toFixed(0)}% &middot; speed ${is.toFixed(2)}x</div>
  </div>
  <div style="position:absolute;left:6%;right:6%;bottom:8%">
    <div style="opacity:.55;margin-bottom:.5em;letter-spacing:.08em;text-transform:uppercase">even slices of time, marked where the value is</div>
    <div style="${box};position:relative;height:3.2em;overflow:hidden">${marks}</div>
  </div>
</div>`;
  },
};


export const ALL_GENERATORS = [...LOOKS.map(build), BANDS, SPECTRUM, CRT, THERMAL, EFFECTOR, HANDLE_CARD, SELECTOR];

// What the library shows.
export const GENERATORS = ALL_GENERATORS.filter((g) => g.ready);

// Derived here, not the catalogue, so a new generator without a blurb is refused at load rather than
// shipping a blank row.
const GENERATOR_ENTRIES = Object.fromEntries(GENERATORS.map((g) => [g.name, g]));
export const GENERATOR_BLURBS = blurbsOf('generator', GENERATOR_ENTRIES);

// The words an author types who does not know the generator by name, never printed, only searched.
const GENERATOR_AKA = {
  thermalBlur: ['heat vision', 'heat camera', 'infrared'],
  colonnade: ['tall columns of light', 'panels split by hairlines'],
  bands: ['ramp panels', 'concentric arcs of light'],
  spectrum: ['color ramp bands', 'rainbow gradient bands'],
  crt: ['scanline overlay', 'old tv screen effect', 'phosphor bloom'],
  effector: ['a live dial preview', 'a property driver card'],
  keyframeHandle: ['a keyframe easing handle', 'bezier handle card'],
  rangeSelector: ['a per-character range selector', 'a text range dial'],
};

// Holds what ships (GENERATOR_ENTRIES), not ALL_GENERATORS: `ready:false` looks stay held back
// (HELD_BACK counts them). No `pick()` caller: a scene pastes the markup the playground emits, it
// never names a generator, so this registry declares no slot.
export const GENERATOR_REGISTRY = defineRegistry('generator', GENERATOR_ENTRIES, { blurbs: GENERATOR_BLURBS, aka: GENERATOR_AKA,
  catalog: {
    title: 'Generators (the playground)',
    tag: 'generator',
    intro: 'Parametric field generators with declared option schemas, turnable at /playground and usable as a `bg` or a layer. `make list` for their dials.',
    usage: (n, { j }) => `// turn the dials at /playground?gen=${n}, then paste the markup:\n${j({ bg: [{ html: '…', from: 0, to: 6 }] })}`,
    noPreview: 'generators have their own surface with every dial attached: /playground.',
  },
});

// How many exist but are not shown. The page says this out loud: a one-card library with no
// explanation reads as a broken page, and "two more are being worked on" is both true and the more
// useful thing to know.
export const HELD_BACK = ALL_GENERATORS.length - GENERATORS.length;

export const byName = (name) => GENERATORS.find((g) => g.name === name) || null;

// Walk a schema into a flat list of controls: [{ path, key, group, spec }]. One place decides how a
// schema becomes a panel, so the site never re-derives it and a new `kind` shows up everywhere at once.
export function controlsOf(schema, group = null, out = []) {
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.kind === 'group') controlsOf(spec.fields, key, out);
    else out.push({ path: group ? `${group}.${key}` : key, key, group, spec });
  }
  return out;
}

// The defaults, as a real options object. Used for the playground's initial state and to diff against
// so a shared link carries only what was actually changed.
export function defaultsOf(schema) {
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = spec.kind === 'group' ? defaultsOf(spec.fields) : spec.def;
  }
  return out;
}

// Only what differs from the defaults, nested. A permalink is then short and, more usefully, READABLE:
// it says what this person changed, which is the thing worth copying into a scene or into a bug report.
export function diffFromDefaults(opts, schema) {
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    const v = opts?.[key];
    if (v === undefined) continue;
    if (spec.kind === 'group') {
      const sub = diffFromDefaults(v, spec.fields);
      if (Object.keys(sub).length) out[key] = sub;
    } else if (JSON.stringify(v) !== JSON.stringify(spec.def)) {
      out[key] = v;
    }
  }
  return out;
}

// Randomise within what each field DECLARES: every bounded number, enum and boolean already carries
// its legal set, so nothing here invents a bound. A field with no declared range is left alone
// (`skipped` records which), because inventing a limit would produce values the generator refuses.
//
// It varies the look, not replaces it: the preset picks what kind of thing this is, randomise
// explores inside it.
//   enum    kept: `pattern.kind` is what the thing IS.
//   number  nudged around its current value, not rolled across the whole range.
//   colour  hue and saturation roll; lightness is kept, so the palette's ordering survives.
//   seed    rolled outright: a billions-wide range is an identifier, not a dial.
const NUDGE = 0.22;
const IDENTIFIER = 100000;          // a range wider than this is an id, not a dial

// `free` rolls a field across its whole declared range and lets an enum change (the per-section
// button), instead of nudging around the current value (the global button).

function rollEnumField(key, spec, state) {
  const { base, free, rand, out } = state;
  out[key] = free || base?.[key] === undefined ? spec.of[Math.floor(rand() * spec.of.length)] : base[key];
}

function rollBoolField(key, state) {
  const { base, free, rand, out } = state;
  out[key] = free || base?.[key] === undefined ? rand() < 0.5 : base[key];
}

// The same 22% of the declared range, measured in log space, and capped so a roll can never
// more than 1.6x or less than 1/1.6x the count.
// Nudge is bounded by the smaller of 22% of the range and half the current value, which stops a
// signed dial (`sheen`, `seam`) crossing zero: rolling `shadow` freely moved colonnade's near-black
// from 23% of frame to 3.2%, measured, while a bounded roll on `colour` left it at 25.1%.
// `scale: 'log'` makes the nudge multiplicative: a linear nudge on `bands` (48 of 2..80) is
// perceptually lopsided, since halving a count is a bigger visual step than adding half again.
function nudgeNumber(bounds, rand) {
  const { min, max, from, free, logScale } = bounds;
  const span = max - min;
  const logReach = Math.min(NUDGE * Math.log(max / min), Math.log(1.6));
  const reach = Math.min(span * NUDGE, Math.abs(from) * 0.5 || span * NUDGE);
  const lo = from < 0 ? min : Math.max(min, 0);
  const hi = from < 0 ? Math.min(max, 0) : max;
  return free || span > IDENTIFIER
    ? min + rand() * span
    : logScale
      ? Math.min(max, Math.max(min, from * Math.exp((rand() * 2 - 1) * logReach)))
      : Math.min(hi, Math.max(lo, from + (rand() * 2 - 1) * reach));
}

function rollNumberField(key, spec, state) {
  const { base, free, rand, out, skipped } = state;
  const min = spec.kind === 'unit' ? 0 : spec.min;
  const max = spec.kind === 'unit' ? 1 : spec.max;
  if (typeof min !== 'number' || typeof max !== 'number') { skipped.push(key); return; }
  const from = typeof base?.[key] === 'number' ? base[key] : min + rand() * (max - min);
  const logScale = spec.scale === 'log' && min > 0 && from > 0;
  const v = nudgeNumber({ min, max, from, free, logScale }, rand);
  out[key] = spec.kind === 'int' ? Math.round(v) : +v.toFixed(3);
}

// A PALETTE IS ONE HUE WITH OFFSETS, not four independent colours.
//
// Rolling each hue over the whole circle produced a green bloom, a blue blob and a yellow wash
// in one frame: three unrelated light sources and nothing to look at. Measured across the five
// committed presets, the LIT roles span an arc of 10, 22, 39 and 40 degrees. The one outlier is
// `fern` at 86, and `fern` is one of the two looks that was judged bad by eye. So narrow is not
// a taste I am imposing; it is what everything that works here already does.
//
// Each role holds its hue offset from the anchor and roughly its saturation, so a roll varies the
// palette's colour without breaking its shape. A wide hue arc is compressed toward its anchor before
// rotating (cap 60 degrees: above every working preset's span of 10-40, below the one judged bad at
// 86), because hue space is not uniform: rotating `spectrum`'s clean 125-degree arc onto magenta
// measured brown stops (#bb6b5f, #d3bb81, #dce152) where it crossed red/orange/yellow.
function rotateHueToAnchor(me, anchorHue, state) {
  const { base, rand, ctx } = state;
  const arc = paletteArc(base, ctx);
  const k = arc.span > ARC_CAP ? ARC_CAP / arc.span : 1;
  const offset = anchorHue + signedHue(me.h - arc.anchor) * k;
  const sat = clamp(me.s * 100 * (0.85 + rand() * 0.3), 40, 100);
  return { offset, sat };
}

function rollHexField(key, spec, state) {
  const { base, rand, ctx, out } = state;
  const from = base?.[key];
  const anchorHue = ctx.hue;
  if (!from) { out[key] = hslHex(anchorHue, 45 + rand() * 45, 12 + rand() * 55); return; }
  const me = toHsl(from);
  const { offset, sat } = rotateHueToAnchor(me, anchorHue, state);
  out[key] = hslHex(((offset % 360) + 360) % 360, sat, me.l * 100);
}

// Ramp positions (`monotone: '<name>'` group) must not cross, or the generator refuses them. Rolling
// each independently can invert their order, so this sorts each group back into place after rolling.
function sortMonotoneGroups(schema, out) {
  const groups = new Map();
  for (const [key, spec] of Object.entries(schema)) {
    if (!spec.monotone || typeof out[key] !== 'number') continue;
    if (!groups.has(spec.monotone)) groups.set(spec.monotone, []);
    groups.get(spec.monotone).push(key);
  }
  for (const keys of groups.values()) {
    const sorted = keys.map((k) => out[k]).sort((a, b) => a - b);
    keys.forEach((k, i) => { out[k] = sorted[i]; });
  }
}

export function randomOptions(schema, rand = Math.random, out = {}, skipped = [], base = null, free = false, ctx = null) {
  // One hue anchor per call, not cached on the base object, so every role agrees on where the
  // palette went and consecutive rolls still land somewhere new.
  ctx = ctx || { hue: rand() * 360 };
  const state = { base, free, rand, out, skipped, ctx };
  for (const [key, spec] of Object.entries(schema)) {
    switch (spec.kind) {
      case 'group': {
        const sub = {};
        randomOptions(spec.fields, rand, sub, skipped, base?.[key] ?? null, free, ctx);
        out[key] = sub;
        break;
      }
      case 'enum':
        rollEnumField(key, spec, state);
        break;
      case 'bool':
        rollBoolField(key, state);
        break;
      case 'unit':
      case 'int':
      case 'num':
        rollNumberField(key, spec, state);
        break;
      case 'hex':
        rollHexField(key, spec, state);
        break;
      // `color` may hold a theme expression, and a random hex would silently drop the theming that is
      // the whole reason that kind exists. `str`, `list`, `row`, `oneOf`, `block` and `hexlist` are
      // content, and content is not a dial.
      default:
        skipped.push(key);
    }
  }
  sortMonotoneGroups(schema, out);
  return out;
}

// The role every other colour is measured against. `bloom` is the light the field rises to, so it is
// the one a viewer reads first and the natural anchor for the rest.
const ANCHOR_ROLE = 'bloom';

// How wide a hue arc a rolled palette may span. See the note at the `hex` case for the measurement.
const ARC_CAP = 60;

// A hue difference as the SHORT way round, in -180..180. Hue is a circle and subtracting two numbers
// on it is only correct when the answer happens not to cross zero.
const signedHue = (d) => ((((d % 360) + 540) % 360) - 180);

// The anchor this palette's hues are measured from, and how wide an arc they cover.
//
// Falls back to the first saturated stop when ANCHOR_ROLE is absent: a ramp like `spectrum` (ramp1..8)
// has no `bloom`, and anchoring on a missing role's implicit 0 measured every spectrum palette against
// red, a colour not in it.
//
// Span is the smallest arc containing every saturated hue (circle minus its largest gap): max-minus-min
// would call a palette straddling zero nearly 360 degrees wide.
function paletteArc(base, ctx) {
  ctx.arcs = ctx.arcs || new Map();
  if (ctx.arcs.has(base)) return ctx.arcs.get(base);
  const hues = Object.values(base || {})
    .filter((v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))
    .map(toHsl).filter((c) => c.s > 0.15).map((c) => c.h);
  let out;
  if (!hues.length) out = { anchor: 0, span: 0 };
  else {
    const anchor = base?.[ANCHOR_ROLE] ? toHsl(base[ANCHOR_ROLE]).h : hues[0];
    const sorted = [...hues].sort((a, b) => a - b);
    let gap = 360 - (sorted[sorted.length - 1] - sorted[0]);
    for (let i = 1; i < sorted.length; i++) gap = Math.max(gap, sorted[i] - sorted[i - 1]);
    out = { anchor, span: 360 - gap };
  }
  ctx.arcs.set(base, out);
  return out;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function toHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return { h: 0, s: 0.6, l: 0.4 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? 60 * ((((g - b) / d) % 6 + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  const l = (mx + mn) / 2;
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

function hslHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
