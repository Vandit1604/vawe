// core/generators.js — the registry of PLAYABLE GENERATORS.
//
// A generator is a pure function from an options object to markup. It knows nothing about scenes,
// layers or the renderer, which is what lets the same function run in the Go render, in `make
// preview`, and in a browser on the marketing site with dials attached to it.
//
// THE CONTRACT. An entry is:
//
//   { name, blurb, schema, render(opts) -> html, docs }
//
//   schema  a DECLARATIVE option table, the shape core/lightfield/options.js defines: every field is
//           `{ kind, ...bounds, def }`, and `kind: 'group'` nests via `fields`. This is the whole
//           reason the registry exists. A JS default (`w = 560`) is a value; a schema entry is a
//           contract, and only a contract can produce a control: a range makes a slider, an `of`
//           makes a select, `hex` makes a colour well.
//   presets an optional named set of full option objects, and the better place to START someone. A
//           schema's `def` is the neutral value a field takes when nobody said otherwise, which is not
//           the same thing as a good-looking result: lightfield's fitted `ref` differs from its
//           defaults on three colour stops. Landing a visitor on the raw defaults shows them the
//           least considered version of the thing you are asking them to judge.
//   normalise optional. Turns a PLAUSIBLE option set into a legal one, and throws if it cannot. Some
//           dials are only meaningful for some structures, and a caller that picks a structure at
//           random cannot be expected to know the table. Without this the randomiser makes illegal
//           pairs and the person clicking sees an error they did not cause. It is not a silent
//           substitution: what it resets is a value the chosen structure has no way to express.
//   render  called with a partial options object. It MUST validate and throw on anything it does not
//           understand, rather than substituting a default. The playground shows that message to the
//           person turning the dial, so a thrown error is a feature here, not a failure.
//   produces what `render` returns: 'html', a markup string to inject and drive with `--t`. The page
//           also understands 'layers', an array of scene layers, which it previews by booting the
//           engine on a scene built around them. Nothing declares that today; it is kept because it is
//           the only correct way to show a scene fragment, and re-deriving it later would mean writing
//           a second engine that agrees with the first until it does not.
//
// WHY A REGISTRY AND NOT A LIST IN THE SITE. The site is a separate app that vendors this directory
// (scripts/site/site-engine.mjs). A hand-kept list over there is a second source of truth that goes
// stale silently, which is precisely how site/public froze 77 files behind core/ (docs/MISTAKES.md
// #271). The site reads GENERATORS and renders whatever it finds.
//
// ADDING ONE. Export a `SCHEMA` and a render function from your module, then add a row here. If your
// generator has no schema it does not belong in the playground yet: without one there is nothing to
// build a panel from, and inferring dials from example values guesses ranges and misses enums.
import { lightfield } from './lightfield/index.js';
import { crtSpec } from './layers/util.js';
import { SCHEMA as LIGHTFIELD_SCHEMA, normalise as lightfieldNormalise, HONOURS } from './lightfield/options.js';
import { PRESETS as LIGHTFIELD_PRESETS } from './lightfield/presets.js';
// The playground lists FIELD GENERATORS only. The 70 block families keep their declared schemas and
// their gate (blocks/schema.mjs, scripts/gates/block-schema.mjs), because a contract is worth having
// whether or not a page renders it. They are not here because a block is a scene FRAGMENT rather than a
// picture: previewing one means booting a whole scene around it, and a picker of 71 entries buried the
// thing people came to turn.
//
// ONE ENTRY PER LOOK, not one entry with five presets. `slats`, `rings` and `shards` are different
// pictures with different dials and different references, and folding them together meant one averaged
// fidelity score that could not say which look regressed. Each look now carries its own reference and
// is measured on its own (scripts/author/lightfield-check.mjs).
//
// One implementation underneath. A look is a name, a preset, a reference, and a NARROWED VIEW of the
// same schema.

// Which dials a look does not honour, taken from the generator's own HONOURS table rather than listed
// again here. Narrowing is why a `rings` look cannot show `shadow.seamWidth` and therefore cannot build
// the illegal pair that used to throw in someone's face (docs/MISTAKES.md #277).
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

// A look's reference, where one exists. `tide` and `fern` have none, and that is stated rather than
// scored against nothing.
// `ready` is the gate, and it is a HUMAN'S judgement rather than a number.
//
// The first version of this list gated on "has a reference", which only means a look CAN be measured.
// ember has a reference and scores 64.2: its reference is black with white-hot flames and the render is
// a pale field with black wedges, the tonal inverse. Measurable and wrong are not opposites, and
// shipping the second because of the first is how a library fills up with things nobody would defend.
//
// A look is `ready` when somebody has put it beside its reference, looked, and would stand behind it.
// The score is evidence for that judgement and never a substitute: `lightfield-check.mjs` prints every
// look including the ones held back, so the gap is visible rather than hidden by omission.
const LOOKS = [
  { name: 'colonnade', preset: 'colonnade', ref: 'refs/ref-b.png', ready: true,
    blurb: 'Wide panels split by bright hairlines, soft masses under a glow.' },
  // HELD BACK still. Its shadow temperature was fixed (+11.3 to -1.7) and its score did not move off
  // 20.0, because the remaining gap is COMPOSITION: the reference is a flowing field of magenta and
  // orange and this is one soft lobe that reads as a spotlight. A number that stays put while another
  // improves is the useful kind of stuck, and it says the next work is layout rather than colour.
  { name: 'blinds', preset: 'ref', ref: 'refs/lightfield-ref.jpg', ready: false,
    blurb: 'A backlit blind. Fine slats, a warm bloom behind them, cool shadow.' },
  // READY. Was the tonal inverse of its reference at 64.2 and is now the same construction at 22.2:
  // black ground, flame spikes climbing left to right. The tips are amber where the reference's are
  // white-hot, which needs an emitter colour that varies with intensity rather than a dial.
  { name: 'ember', preset: 'ember', ref: 'refs/ref-a.jpg', ready: true,
    blurb: 'Spires rising along an envelope, tapered, hot at the base.' },
];

// `tide` and `fern` are NOT here, and the reason is worth keeping.
//
// They were invented: no reference, never compared to anything, and `lightfield-check.mjs` reported
// them as unscored rather than passing. The user looked at the library and said everything except
// colonnade looked bad, which is the same finding arrived at by eye. An invented look is not a look, it
// is a guess with a name, and a library that shows guesses beside measured work teaches nobody which is
// which.
//
// The presets stay in core/lightfield/presets.js, so `rings` and `shards` are still reachable and still
// rendered by `make lightfield`. What they do not get is a card, until each has a reference and a score.
// Bringing one back is two lines here plus an image on disk.

const build = ({ name, preset, ref, blurb, ready }) => {
  const opts = LIGHTFIELD_PRESETS[preset];
  const kind = opts.pattern?.kind ?? LIGHTFIELD_SCHEMA.pattern.fields.kind.def;
  return {
    name,
    group: 'lightfield',
    blurb,
    docs: 'docs/LIGHTFIELD.md',
    reference: ref,
    schema: narrow(LIGHTFIELD_SCHEMA, kind),
    presets: { [preset]: opts },
    produces: 'html',
    ready: !!ready,
    normalise: lightfieldNormalise,
    render: lightfield,
  };
};

// EVERY look, ready or not. The check scores this list, so holding one back keeps it measured instead
// of making it disappear: a look nobody can see is exactly how tide and fern went unexamined (#282).
// `bands` is a SHADER, not markup: our own branch in core/shaders-ambient.js. It reaches the playground
// as scene LAYERS rather than HTML, which is the path the page already has for a scene fragment, so the
// preview boots the real engine on it and there is no second renderer to keep in step.
//
// Its schema is declared here rather than beside the shader because the shader's parameter vector is
// four anonymous floats by design: `u_p` means whatever the branch reading it says, so the NAMES live
// with the generator that knows them.
// NAMES THAT SAY WHAT THEY DO. The first version of this table read count / angle / glow / softness /
// edge / warm / core / deep, and every one of those failed the only test that matters for a control:
// somebody who has not read the shader cannot tell what it changes. `count` of what. `angle` in TURNS,
// so a right angle was 0.25. `glow` was a radius but is named like a switch. `softness` when three
// different things in the picture are soft. So they are renamed here, in DEGREES and in percent, and
// the shader's uniform layout did not move: this file is the layer whose whole job is turning names
// into positions, and the mapping lives in `render` below.
//
// WHERE A NUMBER MEANS A PLACE it is the same spelling the lightfield generator settled on: percent of
// the frame, 50/50 unmoved, off-frame values legal because a light source is often just outside the
// picture (core/lightfield/options.js, `colour.originX`). Two generators inventing two vocabularies for
// "where is the light" is how an author ends up converting units in their head.
// The name a person picks, and the distance function the shader runs. NOT the same list in the same
// order: `round` and `oval` are one function with a different second radius, so two names share an
// index, and the shader's numbering was fixed before these names existed. Sending the position in the
// name list instead of this table is a bug that draws a plausible picture, which is the worst kind:
// every shape rendered as a different shape and every one of them looked deliberate.
const LIGHT_SHAPES = { round: 0, oval: 0, bar: 1, rounded: 2, cross: 3, sweep: 4 };
const LIGHT_SHAPE_NAMES = Object.keys(LIGHT_SHAPES);

// Every dial that describes the LIGHT, shared by both cards, because it is the same light. Declared
// once so the two panels cannot drift apart.
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

// The bands themselves, shared for the same reason.
const BAND_SCHEMA = {
  // 48, not 25. MEASURED BY LOOKING: rendered at 8, 16, 25, 40, 60 and 80 side by side, the picture
  // changes character between 25 and 40. Below it the stripes are the subject and they cut the light
  // into slabs; above it the light is the subject and the stripes are texture across it, which is what
  // "a light behind a screen" means. 25 sat on the wrong side of that line and nothing had chosen it.
  // 48 leaves room to roll both ways inside the half that reads.
  //
  // NOT raised on `spectrum`, which overrides this with 10.7. That one is fitted to a photograph and
  // scores 14.2 against it, so its default is a measurement and not a preference.
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
  // NO `brightness`. It read as a brightness dial and was an OPACITY one: the shared shader tail does
  // `alpha *= clamp(u_intensity)`, so anything under 1 made the whole field translucent and let the
  // page behind it wash through. Every value except 1 looked broken, which means it was never a
  // control, it was a way to spoil the picture. The light's own strength is `lightPolarity`, and the
  // colours are where you change how bright the thing is.
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
  // Eight stops read in order from the start of the ramp to its end. They are numbered rather than
  // named because on a ramp the POSITION is the meaning: stop 3 is a third of the way down and calling
  // it "midField" would be a guess about a picture nobody has made yet.
  colour: {
    kind: 'group',
    fields: Object.fromEntries(['#effce6', '#def9de', '#68b290', '#c0e87a', '#7ccdd8', '#56a0dd', '#dcf4fb', '#eeffff']
      .flatMap((def, i) => [
        [`ramp${i + 1}`, { kind: 'hex', def, primary: i < 4,
          note: `ramp stop ${i + 1} of 8, by default ${Math.round((i / 7) * 100)}% along the gradient.` }],
        // WHERE the stop sits. Defaulted to the even spacing this ramp always had, so nothing moves
        // until someone moves it, and NOT primary: it is the axis you reach for after the colours are
        // right, when a feature is too narrow for eight evenly spaced stops to describe. Adding stops
        // cannot fix that, because the narrowest thing eight even stops can draw is a seventh of the
        // ramp however many you have.
        // EXACTLY i/7, never rounded for looks. `Number((i/7).toFixed(4))` is 0.1429, and a ramp
        // built on 0.1429 is not the ramp built on 1/7: the divisor below it becomes 0.1429 instead
        // of 0.142857 and every field that never asked for positions would quietly shift. A default
        // whose whole job is to reproduce the old behaviour has to reproduce it to the last bit.
        [`ramp${i + 1}At`, { kind: 'num', min: 0, max: 1, def: i / 7, primary: false, monotone: 'ramp',
          note: `how far along the gradient stop ${i + 1} sits. Stops must stay in order.` }],
      ])),
  },
};

const deg = (d) => (d ?? 0) / 360;                       // the shader counts turns; a person counts degrees
const frac = (pct, mid = 50) => ((pct ?? mid) - mid) / 100;  // percent of frame -> fraction from that point
const pick = (o, k, s) => o?.[k] ?? s[k]?.def;

// One mapping, both cards. `render` is called with PARTIAL option objects (a card previews from a
// preset that sets almost nothing), so every read falls back to the schema's own declared default
// rather than to a literal written twice.
function bandLayers(o, S, { gradient, w, h }) {
  const ar = w / h;
  const shape = pick(o, 'shape', S) ?? 'panels';
  const lname = pick(o, 'lightShape', S);
  const lshape = LIGHT_SHAPES[lname];
  if (lshape === undefined) throw new Error(`unknown lightShape "${lname}" — one of: ${LIGHT_SHAPE_NAMES.join(', ')}`);
  const width = pick(o, 'lightWidth', S);
  // `round` has no second radius to give, so it is the ratio 1 whatever the height dial says. This is
  // the same reset `normalise` performs on the option object; doing it here as well means a caller who
  // skipped normalise gets a circle rather than silently gets an oval called round.
  const height = pick(o, 'lightShape', S) === 'round' ? width : pick(o, 'lightHeight', S);
  const bands = pick(o, 'bands', S);
  if (!(bands > 0)) throw new Error(`bands must be a positive number, got ${bands}`);
  const zoom = pick(o, 'zoom', S);
  if (!(zoom > 0)) throw new Error(`zoom must be greater than 0, got ${zoom}`);
  // The STOPS are the hex fields. A schema may also declare a companion `<name>At` position for each
  // one, and then every stop carries its own place on the ramp as a `#rrggbb@0.42` suffix
  // (core/surfaces/palette.js). A schema that declares no positions, like BANDS_SCHEMA, emits plain
  // hex and is spread evenly exactly as before.
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
    // Always 1. See the note where `brightness` used to be: this uniform is alpha in the shared tail,
    // not luminance, so the only value that does not spoil the picture is full.
    intensity: 1,
    seed: pick(o, 'seed', S),
    // NO aspect divide. It used to be here because the shader's band axis was in aspect-scaled units,
    // so `bands` had to be corrected to keep meaning bands-across-the-frame. The shader normalises that
    // axis itself now, and dividing here as well applied the correction TWICE: on a 16:9 canvas the
    // band index that drives `converge` came out wrong and the ramp clamped to its end stop, which for
    // `spectrum` is white, so the right of the frame went flat. One correction, in the place that knows
    // the aspect, which is the shader.
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
    // NO w/h. core/surfaces/shader.js sizes an UNBOXED ambient layer to the frame. Declaring a box
    // bakes in whatever aspect the generator was fitted at: `spectrum` carried 1080x1920, so on a 16:9
    // canvas it painted 1080 of 1920 pixels and the right 44% was bare background. I chased that as a
    // shader bug through three wrong hypotheses; sampling the pixel said rgb(12,19,29), the scene's own
    // dark, and the answer was the box all along.
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
  docs: 'docs/LIGHTFIELD.md',
  reference: null,
  schema: BANDS_SCHEMA,
  presets: { bands: {} },
  produces: 'layers',
  ready: true,
  normalise: bandsNormalise,
  render: (o) => bandLayers(o, BANDS_SCHEMA, { gradient: false, w: 1920, h: 1080 }),
};

// MEASURED, not invented. Fitted to refs/colonnade/c6.jpg at that image's own 9:16, where it scores a
// mean per-channel error of 14.2 out of 255 against the reference. What still differs is written down
// in docs/LIGHTFIELD.md rather than left for the next person to rediscover.
const SPECTRUM = {
  name: 'spectrum',
  group: 'shader',
  blurb: 'Upright bands with a colour ramp falling down the frame, each band showing less of it than the one inside it.',
  docs: 'docs/LIGHTFIELD.md',
  reference: 'refs/colonnade/c6.jpg',
  schema: SPECTRUM_SCHEMA,
  presets: { c6: {} },
  produces: 'layers',
  ready: true,
  normalise: bandsNormalise,
  // PORTRAIT, because the look is: the ramp needs the long axis to read, and the reference it was
  // fitted against is 9:16. Landscape draws the same construction squashed.
  render: (o) => bandLayers(o, SPECTRUM_SCHEMA, { gradient: true, w: 1080, h: 1920 }),
};

// The CRT card.
//
// Every other card in this library is a FIELD: it paints a backdrop and that backdrop is the whole
// subject. `crt` is not one. It is a treatment applied to whatever is under it, so a card showing it
// on its own would show nothing at all, and a card showing it over a flat colour would show only its
// scanlines, which is the half that was already easy.
//
// So this card carries a stand-in screen, and the dials act on the treatment rather than on the
// screen. The stand-in is deliberately plain and deliberately BRIGHT ON DARK, because the thing worth
// looking at is what happens to a lit edge: the bloom is the half a generative overlay cannot do, and
// it is invisible unless there is something lit to bloom.
const CRT_SCHEMA = {
  bloom:     { kind: 'num', min: 0, max: 8, def: 1.6, primary: true,
               note: 'how far the picture underneath spreads, in pixels. This is the phosphor, and it is the part an overlay cannot do. Brightness rises with it, because blurring a bright shape over more area would otherwise dim it.' },
  lines:     { kind: 'unit', def: 0.34, primary: true,
               note: 'how dark each scanline is. 0 removes them.' },
  gap:       { kind: 'num', min: 2, max: 12, def: 3, primary: true,
               note: 'pixels from one scanline to the next. Bigger is a coarser, older tube.' },
  scan:      { kind: 'num', min: 0, max: 6, def: 1,
               note: 'pixels of dark in each line. It can never exceed the gap, or the field would be solid black.' },
  vignette:  { kind: 'unit', def: 0.5, primary: true, note: 'how much the corners fall away.' },
  tintAmount:{ kind: 'unit', def: 0, note: 'how much of the phosphor colour is laid over the whole picture. 0 leaves the colours alone.' },
  colour: {
    kind: 'group',
    fields: { tint: { kind: 'hex', def: '#1e46ff', note: 'the phosphor colour, used only when tintAmount is above 0.' } },
  },
};

const hexToRgba = (hex, a) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
};

const CRT = {
  name: 'crt',
  group: 'treatment',
  blurb: 'A cathode ray tube: the picture under it goes soft and blooms, then scanlines and a corner falloff go over the top.',
  docs: 'docs/EFFECTS.md',
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
    // ONE element over the screen, carrying exactly what the engine's `crt` layer prop carries. Not a
    // second implementation: crtSpec is the same function core/layers/util.js calls, so a card that
    // looks right is evidence about the layer and not about this file.
    return `<div style="position:absolute;inset:0;overflow:hidden;background:#050b1e">
  <div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center;
    font:800 clamp(28px,8.5vw,96px)/1 var(--font-sans,system-ui),sans-serif;color:#bfe3ff;letter-spacing:.01em">CRT
    <div style="font:400 clamp(8px,1.6vw,15px)/1.4 var(--font-sans,system-ui),sans-serif;color:#5aa6ff;margin-top:.7em;letter-spacing:.22em">PHOSPHOR &middot; SCANLINE &middot; BLOOM</div>
  </div>
  <div style="position:absolute;inset:0;pointer-events:none;backdrop-filter:${filter};-webkit-backdrop-filter:${filter};background-image:${background || 'none'}"></div>
</div>`;
  },
};

export const ALL_GENERATORS = [...LOOKS.map(build), BANDS, SPECTRUM, CRT];

// What the library shows.
export const GENERATORS = ALL_GENERATORS.filter((g) => g.ready);

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

// ── randomise, within what each field DECLARES ──────────────────────────────────────────────────
//
// The point of a schema is that a range is stated rather than guessed, so a randomiser is derivable:
// every bounded number, every enum, every boolean already carries its own legal set. Nothing here
// invents a bound. A field with no declared range is LEFT ALONE, and `skipped` says which, because a
// randomiser that makes up limits produces values the generator will refuse, and the person turning the
// dial gets an error they did not cause.
//
// IT VARIES THE LOOK ON SCREEN, it does not replace it. Rolling every field uniformly changes the
// STRUCTURE and the COLOUR at once, so each click is an unrelated picture and most of them are muddy.
// Here the preset chooses what kind of thing this is and randomise explores inside it:
//
//   enum      KEPT. `pattern.kind` and `motion.kind` are what the thing IS.
//   number    NUDGED around its current value, not rolled across its range.
//   colour    hue and saturation roll, LIGHTNESS is kept, so the palette's own ordering survives.
//   seed      rolled outright. A range in the billions is an identifier, not a dial, and re-rolling
//             it is the cheapest way to get a genuinely different arrangement of the same look.
//
// Every one of those is derived from what the schema already declares. Nothing here knows what a
// lightfield is.
//
// `rand` is injected so a caller can seed it. Same rand and same base, same options.
// A number moves by up to 22% of its declared range OR half of where it already sits, whichever is
// SMALLER. The second clause is what keeps a nudge a nudge: `pattern.count` is declared 1 to 400, so a
// flat 22% is plus or minus 88, and a field of 58 slats became 138. Half the current value keeps a
// small number in its own neighbourhood while a large one still gets room.
const NUDGE = 0.22;
const IDENTIFIER = 100000;          // a range wider than this is an id, not a dial

// `free` rolls a field across its whole declared range instead of nudging, and lets an enum change.
// That is what a PER SECTION button means: the global one varies the look you have, and asking for one
// section by name is asking for that aspect to be different, not slightly different.
export function randomOptions(schema, rand = Math.random, out = {}, skipped = [], base = null, free = false, ctx = null) {
  // ONE hue anchor per CALL, so every role in a palette agrees where the palette went while consecutive
  // rolls land somewhere new. The first version cached it on the base object, which is the same object
  // every time the panel rolls, so five rolls produced the same colour and the fix looked like a
  // regression that had merely stopped moving.
  ctx = ctx || { hue: rand() * 360 };
  for (const [key, spec] of Object.entries(schema)) {
    switch (spec.kind) {
      case 'group': {
        const sub = {};
        randomOptions(spec.fields, rand, sub, skipped, base?.[key] ?? null, free, ctx);
        out[key] = sub;
        break;
      }
      case 'enum':
        // What the thing IS. Rolling it is picking a different subject, which the presets already do.
        out[key] = free || base?.[key] === undefined ? spec.of[Math.floor(rand() * spec.of.length)] : base[key];
        break;
      case 'bool':
        out[key] = free || base?.[key] === undefined ? rand() < 0.5 : base[key];
        break;
      case 'unit':
      case 'int':
      case 'num': {
        const min = spec.kind === 'unit' ? 0 : spec.min;
        const max = spec.kind === 'unit' ? 1 : spec.max;
        if (typeof min !== 'number' || typeof max !== 'number') { skipped.push(key); break; }
        const span = max - min;
        const from = typeof base?.[key] === 'number' ? base[key] : min + rand() * span;
        // An identifier is rolled; a dial is nudged around where it already sits.
        // A nudge is bounded by the smaller of 22% of the RANGE and half of where the dial already sits.
        // The second clause is what keeps it a nudge rather than a jump, and it does two jobs. It stops
        // `pattern.count` at 58 landing on 138. And on a SIGNED dial it preserves the sign: `sheen: -1`
        // means an emitted silhouette and `seam: -0.6` means a bright hairline, so a roll that crosses
        // zero does not vary the picture, it deletes the thing the picture is made of. Rolling `shadow`
        // freely took colonnade's near-black from 23% of the frame to 3.2%, measured, while rolling
        // `colour` freely left it at 25.1%. Contrast is composition, and composition is what a
        // randomiser preserves.
        // A COUNT IS PERCEPTUALLY LOGARITHMIC, and a linear nudge on one is lopsided. `bands` sits at
        // 48 in a range to 80: plus 12 adds a quarter more stripes and is barely a change, while minus
        // 12 removes a quarter and visibly coarsens the picture. Halving a count is an enormous visual
        // step; adding half again is a small one. So a symmetric nudge in the number is an asymmetric
        // nudge in the picture, and it spends half its rolls at the crude end.
        //
        // Looking at the renders is what settles it rather than the arithmetic. Below about 25 bands
        // the stripes ARE the subject and they break the light into slabs; above about 40 the light is
        // the subject and the stripes are texture over it, which is the whole idea of the generator.
        // Half of every roll was landing in the first half.
        //
        // A schema declares `scale: 'log'` and the nudge becomes multiplicative. Note what this
        // replaces: `Math.abs(from) * 0.5` was already a linear stand-in for exactly this, added
        // because `pattern.count` at 58 rolled to 138. That clause stays for every other dial, where
        // it is doing a different job, which is holding the sign on a signed dial.
        const logScale = spec.scale === 'log' && min > 0 && from > 0;
        // The same 22% of the declared range, measured in log space, and capped so a roll can never
        // more than 1.6x or less than 1/1.6x the count.
        const logReach = Math.min(NUDGE * Math.log(max / min), Math.log(1.6));
        const reach = Math.min(span * NUDGE, Math.abs(from) * 0.5 || span * NUDGE);
        const lo = from < 0 ? min : Math.max(min, 0);
        const hi = from < 0 ? Math.min(max, 0) : max;
        const v = free || span > IDENTIFIER
          ? min + rand() * span
          : logScale
            ? Math.min(max, Math.max(min, from * Math.exp((rand() * 2 - 1) * logReach)))
            : Math.min(hi, Math.max(lo, from + (rand() * 2 - 1) * reach));
        out[key] = spec.kind === 'int' ? Math.round(v) : +v.toFixed(3);
        break;
      }
      case 'hex': {
        // A PALETTE IS ONE HUE WITH OFFSETS, not four independent colours.
        //
        // Rolling each hue over the whole circle produced a green bloom, a blue blob and a yellow wash
        // in one frame: three unrelated light sources and nothing to look at. Measured across the five
        // committed presets, the LIT roles span an arc of 10, 22, 39 and 40 degrees. The one outlier is
        // `fern` at 86, and `fern` is one of the two looks that was judged bad by eye. So narrow is not
        // a taste I am imposing; it is what everything that works here already does.
        //
        // So the palette's own SHAPE is kept and only its anchor moves: each role holds its hue offset
        // from the bloom, its lightness, and roughly its saturation. Same argument as the lightness rule
        // below it, one axis over. A roll gives the same palette in a different colour, which is a
        // variation; four random hues is a collision.
        const from = base?.[key];
        const anchorHue = ctx.hue;
        if (!from) { out[key] = hslHex(anchorHue, 45 + rand() * 45, 12 + rand() * 55); break; }
        const me = toHsl(from);
        // ROTATING AN ARC DOES NOT PRESERVE ITS CHARACTER, which is the hole in the paragraph above.
        // Keeping each role's offset from the anchor keeps the palette's SHAPE, and the shape is not
        // the whole of what makes a palette work, because hue space is not uniform. `spectrum` spans
        // 125 degrees, from yellow-green through to blue: wide, and every colour in it clean. Rotate
        // that same arc onto magenta and its middle now crosses red, orange and yellow, and at these
        // stops' saturation that middle IS brown. Measured on one roll: #bb6b5f brick, #d3bb81 khaki,
        // #dce152 mustard. Those are stops, not a mixing artefact between them.
        //
        // So a wide arc is COMPRESSED toward its anchor before it is rotated. The cap is 60 degrees,
        // chosen above every preset that works (10, 22, 39, 40) and well under the one judged bad
        // (86). The fitted palettes themselves are untouched: this runs only on a roll.
        const arc = paletteArc(base, ctx);
        const k = arc.span > ARC_CAP ? ARC_CAP / arc.span : 1;
        const offset = anchorHue + signedHue(me.h - arc.anchor) * k;
        // A little play in saturation, none in the relationship. Presets run 0.55 to 1.00.
        const sat = clamp(me.s * 100 * (0.85 + rand() * 0.3), 40, 100);
        out[key] = hslHex(((offset % 360) + 360) % 360, sat, me.l * 100);
        break;
      }
      // `color` may hold a theme expression, and a random hex would silently drop the theming that is
      // the whole reason that kind exists. `str`, `list`, `row`, `oneOf`, `block` and `hexlist` are
      // content, and content is not a dial.
      default:
        skipped.push(key);
    }
  }
  // SOME NUMBERS ARE A SET, NOT A ROW OF INDEPENDENT DIALS. The ramp positions must not cross: stop 5
  // sitting before stop 4 is not a ramp, and the generator rightly refuses it. Rolling each one on its
  // own produced exactly that, and the playground threw on its first random spectrum.
  //
  // Sorting is the whole fix, and it is the right one rather than a repair: what a caller wants from
  // rolling these is different SPACING, and the spacing is a property of the set. Sorting varies where
  // the ramp's features sit and can never produce an order nobody asked for.
  //
  // Declared with `monotone: '<name>'` on each member, so this stays a rule about a declaration and
  // not a rule about ramps.
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
// `hueOf(base, ANCHOR_ROLE)` returned 0 whenever the named role was absent, and a ramp has no
// `bloom`: `spectrum`'s eight stops are ramp1..ramp8. So every spectrum palette was being measured
// against red, a colour not in it. It happened to look right, because measuring a whole palette from
// a fixed wrong origin still rotates it rigidly, which is the same answer for a different reason. It
// stops being the same answer the moment anything else uses the offset, as the compression below now
// does. So the anchor falls back to the first stop with real colour in it.
//
// The span is the SMALLEST arc containing every saturated hue, found as the circle minus its largest
// gap. Taking max-minus-min would call a palette straddling zero nearly 360 degrees wide.
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

const hueOf = (obj, role) => (obj && obj[role] ? toHsl(obj[role]).h : 0);

const lightnessOf = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return 40;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
};

function hslHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
