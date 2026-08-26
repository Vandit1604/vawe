// scripts/site/effects-catalog.mjs — GENERATE docs/EFFECTS.md: the single arsenal catalog so the model
// SEES every effect the engine offers and picks, instead of authoring plain rise+fade from a blank JSON.
// Derived from the registries themselves (the coverage.mjs pattern) — it can never drift from the code.
//   node scripts/site/effects-catalog.mjs [--check]   ·   make effects
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS } from '../../core/type.js';
import { ANIM_NAMES } from '../../core/clips.js';
import { PRESENTATIONS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { SPECTACLE_DEVICES } from '../../core/knobs.js';
import { LOOK_NAMES, LOOK_BLURBS } from '../../core/looks.js';
import { registersOf } from '../gates/craft-coverage.mjs';
// The per-family blurb maps, each living beside the registry it describes (the pattern blocks/catalog.mjs
// proves at 70/70). They take PRECEDENCE over DESC below, and that ordering is the point: DESC is a FLAT
// name-keyed map shared across 31 families, so `up` the anim was being handed `up` the kinetic preset's
// description ("words/chars rise into place"), which is about glyph units and not about a layer at all.
// A family-scoped map cannot make that mistake.
import { CUT_BLURBS } from '../../core/cuts.js';
import { SEAM_BLURBS } from '../../core/seams.js';
import { PRESET_BLURBS } from '../../core/type.js';
import { ANIM_BLURBS } from '../../core/clips.js';
import { IDLE_NAMES, IDLE_BLURBS } from '../../core/idle.js';
import { FX_BLURBS } from '../../core/fx/index.js';
// Read off blueprints/index.mjs's own trailing comments — the registry line that declares each beat IS
// the description, and blueprints-catalog.mjs already fails when one is missing. The hand-kept copy that
// used to live in DESC had drifted: 3 of 12 beats were absent from it.
import { BEAT_BLURBS } from './blueprints-catalog.mjs';
import { GSAP_BLURBS, GSAP_EXIT_BLURBS } from '../../core/gsap-effects.js';
import { BG_BLURBS } from '../../core/backgrounds.js';
import { LIGHTFIELD_BLURBS } from '../../core/lightfield/options.js';
import { RESAMPLE_BLURBS } from '../../core/resample-fx.js';
import { CAPTION_BLURBS } from '../../core/captions.js';
import { COMPOSITION_BLURBS } from '../../core/compositions/index.js';
import { CANVAS_FX_NAMES, CANVAS_FX_BLURBS } from '../../core/canvas-fx.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { BG_NAMES } from '../../core/backgrounds.js';
import { GSAP_FX, EXIT_FX } from '../../core/gsap-effects.js';
import { BEATS } from '../../blueprints/index.mjs';
import { CAMERA_MOVE_NAMES, CAMERA_MOVE_BLURBS } from '../../core/camera-moves.js';
import { COMPOSITION_NAMES } from '../../core/compositions/index.js';
// EVERYTHING BELOW THIS LINE WAS MISSING, and `scripts/gates/arsenal-check.mjs` now fails if the next
// one is. The catalogue is what CLAUDE.md sends an author to before they choose, and it did not contain
// the three.js layer at all: a whole scene-graph capability with four registered scenes, a written
// determinism contract and a purity gate, invisible to the one document whose job is to list it.
import { LAYER_TYPES, LAYER_BLURBS } from '../../core/layers/index.js';
import { THREE_FX, THREE_SCENES } from '../../core/three-scenes.js';
import { RAYMARCH_FX, RAYMARCH_SURFACES } from '../../core/raymarch-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { AMBIENT_FX, AMBIENT_SHADERS } from '../../core/shaders-ambient.js';
import { SEAM_FX } from '../../core/seams.js';
import { FX_TYPES } from '../../core/fx/index.js';
import { PART_NAMES, PART_BLURBS } from '../../core/parts.js';
import { BLEND_MODES } from '../../core/fx/mix-blend.js';
import { FILTER_PRESETS, FILTER_BLURBS } from '../../core/filters.js';
import { EASINGS } from '../../core/motion.js';
import { CAP_STYLE_NAMES } from '../../core/captions.js';
import { ICONS } from '../../core/icons.js';
import { RANSOM_FACES } from '../../core/ransom.js';
import { ASPECTS, DESTINATION_NAMES } from '../../core/safe.js';
import { GENERATORS, GENERATOR_BLURBS } from '../../core/generators.js';
import { PATTERNS, SHAPES, ANCHORS, DIRECTIONS, MOTIONS } from '../../core/lightfield/options.js';
import { FEEL, DURATION, CAMERA_WORDS } from '../../core/vocab.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');

// Curated one-liners for the notable effects. An effect not listed still appears (name only) — the point
// is EXHAUSTIVE coverage from the registry; the notes are a bonus, never a second source of truth.
const DESC = {
  // kinetic type presets
  up: 'words/chars rise into place — the default kinetic headline', scale: 'punch in from small (overshoot)',
  blur: 'resolve out of blur — calm, premium', decode: 'scramble→settle, techy', tilt: '3D tilt-in',
  wave: 'sinusoidal wave across units', shimmerWave: 'looping light wave (per-unit)', draw: 'stroke draw-on for SVG paths',
  riseClip: 'mask-rise reveal', colorWave: 'per-word accent colour-wave', highlight: 'marker highlight sweep',
  underline: 'underline draws on', gradient: 'gradient sweeps through letterforms',
  // anims
  rise: 'translate up + fade in', pop: 'scale overshoot', fade: 'opacity only', defocus: 'leave through blur (dense/faces)',
  'slide-left': 'enter/exit leftward', 'slide-right': 'enter/exit rightward', lift: 'staggered rise',
  // GSAP fx
  charOvershoot: 'per-letter overshoot', charBlurCascade: 'per-letter blur cascade', charFold: 'per-letter 3D fold',
  popIn: 'scale pop', blurIn: 'unblur in', float: 'idle float loop', pulse: 'idle pulse', breathe: 'idle breathe',
  // backgrounds (moving ones matter)
  aurora: 'drifting colour aurora (moves)', mesh: 'soft gradient mesh (dark/saturated — check contrast)',
  constellation: 'drifting connected nodes (moves) — telemetry/data feel', spotlight: 'radial spotlight glow',
  brandglow: 'breathing accent glow', paperShapes: 'faint drifting geometric shapes (light, subtle)',
  metallic: 'vertical light rods with a travelling SHIMMER (brushed metal / lit equaliser) — dramatic dark bg, brand-coloured',
  paperDots: 'faint drifting dot grid (light)', plain: 'flat theme field', dotmatrix: 'dot matrix grid',
  // stings / transitions
  whipPan: 'momentum swipe between beats', cinematicZoom: 'dive-in zoom into a screen', dissolve: 'time/place change',
  flashWhite: 'white flash on an energy pivot', glitch: 'RGB-split glitch', portal: 'glowing portal reveal (once)',
  // paint-fx
  matrix: 'falling glyph rain (per-frame)', starfield: 'flying starfield (per-frame)', waves: 'sine wave field (per-frame)',
  meteor: 'ballistic streaks with echo trails (per-frame)',
  // compositions (bespoke per-beat timelines)
  pipelineFlow: 'staged pipeline: cards pop in, connectors draw, a token travels each link, a check draws on (one hand-authored timeline)',
  // beats
  kineticHook: 'hook: eyebrow + hero count-up|word + kinetic subline', screenDive: 'kinetic title + UI shot ken-pushes in',
  terminalReveal: 'typing command + cursor + rising output + result',
  cardCascade: 'title + cards pop in one after another', statReveal: 'hero count-up + kinetic label',
  ctaEnd: 'held end card: mark + install chip + url', verdictProof: 'typing command + tone verdict chip',
  // beats (the camera moves that used to sit here now carry their own blurbs — core/camera-moves.js)
  logoLockup: 'mark pops + wordmark travels + kinetic headline', logoReveal: 'mark DRAWS on / MELTS from a blob + bloom + wordmark cascade',
  // per-frame accent layers (pseudo-names)
  'beam:border (border-beam)': 'a light travels the rounded-rect border', 'beam:shine (sheen sweep)': 'a sheen sweeps across the box',
  'svg:draw (stroke draws on)': 'the logo/icon stroke draws itself on, line by line',
  'svg:morph (shape melts into a logo)': 'one path melts into another (blob into logo), optional spin',
};

// docs/CRAFT/SELECTION.md §4 already classifies every look and every sting by the register it evokes,
// and `craft-coverage` already FAILS when one is missing — so that map is both complete and guaranteed.
// It just had no reader, which is why 31 looks and 35 stings rendered here as bare names. Falling back to
// the register is not a stopgap: for a held texture, "analog nostalgia (warm, dated)" is the thing an
// author is choosing between, more useful than a sentence about `lomo`'s curve.
const REGISTERS = registersOf(fs.readFileSync(path.join(root, 'docs/CRAFT/SELECTION.md'), 'utf8'));

// `kind` scopes the lookup because `thermal` is BOTH a look and a sting, with a different register in
// each table. Sections that carry no register pass nothing and behave exactly as before.
// `meta` is the section's own vocabulary: { blurbs } for a family that keeps its descriptions beside its
// registry, { kind } for one classified by register in SELECTION.md §4. Sections with neither pass nothing
// and fall through to DESC exactly as before.
// `meta.skip` is a DECISION, rendered instead of a blank. A dash reads as "nobody got to it" and invites
// somebody to spend a day writing 41 descriptions of standard easing curves; a reason reads as "this was
// considered" and points at the doc that actually helps. The families below are self-describing — the CSS
// spec defines a blend mode, `9:16` is its own definition, a drawn icon called `check` draws a check — or
// are better served at a level other than per-entry, which is true of easings.
export const d = (n, meta = {}) => (meta.blurbs && meta.blurbs[n])
  || DESC[n]
  || (meta.kind && REGISTERS[meta.kind] && REGISTERS[meta.kind][n])
  || meta.skip
  || '—';
const table = (rows) => ['| name | what / when |', '|---|---|', ...rows.map(([n, x]) => `| \`${n}\` | ${x} |`)].join('\n');
const names = (arr) => [...new Set(arr)].sort();

// The plain words, rendered as word → the concrete value it resolves to. The blurb IS the mapping,
// because that is the only thing worth knowing here; the "when to reach for it" column lives in the
// dedicated doc (`make vocab` → docs/CRAFT/VOCABULARY.md), generated from the same registry.
const VOCAB_BLURBS = Object.fromEntries([
  ...Object.entries(FEEL).map(([w, t]) => [w, `feel → \`ease: "${t}"\``]),
  ...Object.entries(DURATION).map(([w, s]) => [w, `duration → \`${s}\` seconds`]),
  ...Object.entries(CAMERA_WORDS).map(([w, t]) => [w, `camera → \`move: "${t}"\``]),
]);

// EXPORTED so there is exactly one family list. `scripts/site/effects-json.mjs` builds the site's
// effects index off this same array, which is why the emit below is guarded: importing this module
// must read the registries, never rewrite docs/EFFECTS.md.
export const sections = [
  ['Kinetic text presets', '`split`+`preset` on a text layer — words/chars reveal with motion. `{ "split":"word", "preset":"up", "each":0.4, "stagger":0.05 }`', names(Object.keys(PRESETS)), 'text', { blurbs: PRESET_BLURBS }],
  ['Enter / exit anims', '`anim` (enter) + `out` (exit) on any layer. Entrances decelerate, exits accelerate. `{ "anim":"rise", "out":"defocus" }`', names(ANIM_NAMES), 'per-layer', { blurbs: ANIM_BLURBS }],
  ['Idles (ambient hold motion)', '`idle` on a layer, or scene-level `idle` for the whole cast. Runs across the SETTLED MIDDLE only, between the enter ramp and the exit ramp, so it never fights an entrance. Off unless asked; `idle:"none"` on a layer opts one back out of a scene default. `{ "idle":"breathe" }` or `{ "idle":{"name":"drift","amp":14,"period":9} }`', names(IDLE_NAMES), 'per-layer/scene', { blurbs: IDLE_BLURBS }],
  ['GSAP named effects', '`fx` (enter) / `fxOut` (exit); per-letter on a `split` layer. `{ "anim":"none", "fx":"charOvershoot" }`', names(GSAP_FX), 'per-layer/text', { blurbs: GSAP_BLURBS }],
  ['GSAP exits', '`fxOut` — pair every entrance with a directional exit.', names(EXIT_FX), 'exit', { blurbs: GSAP_EXIT_BLURBS }],
  ['Scene cuts', '`cuts:[{t,style}]` — the beat-to-beat cut family. One family per film.', names(Object.keys(PRESENTATIONS)), 'transition', { blurbs: CUT_BLURBS }],
  ['Shader stings', '`stings:[{t,fx}]` — a full-frame shader accent on a reveal / background jump.', names(SHADER_FX), 'transition', { kind: 'sting' }],
  ['Spectacle devices', '`"spectacle": { "at", "of", "device", "why" }` — the film NOMINATES its one loud moment. `device` is written as a shader sting at `at`, above the film; the other half is what makes it real, because with a spectacle declared the engine pulls EVERY competing amplitude dial down to 55% (other stings, seams, look strength, glow/beam intensity, kick scale) and exempts the layer named by `of`. Naming the peak is a promise the rest stays restrained. `core/spectacle.js`.', names(SPECTACLE_DEVICES.names), 'scene', { blurbs: SPECTACLE_DEVICES.blurbs }],
  ['Seams (2-scene blends)', '`seams:[{t,fx,dur}]` — one earned expressive transition, reserved for the payoff.', names(SEAM_FX), 'transition', { blurbs: SEAM_BLURBS }],
  ['Composite looks (static)', '`filter:"<look>"` — a colour-grade / treatment on a layer (STATIC). One positional arg is always strength (`"neon:0.9"`); the rest ride in `lookOpts`. **`strength` is the only knob every look takes** — `color` (recolours glow, streak, leak, wash and light), `color2` (the other side of a colour split), `colors` (gradient-map stops), `grain` and `vignette` each need the matching pass, so they apply to some looks and not others. A knob a look cannot apply THROWS and names what that look does take, rather than being silently dropped; `liveKnobs(name)` in `core/looks.js` is the list.', names(LOOK_NAMES), 'static', { kind: 'look', blurbs: LOOK_BLURBS }],
  ['Canvas image passes (baked)', '`canvasFx` — a one-time baked image pass (cannot move).', names(CANVAS_FX_NAMES), 'static', { blurbs: CANVAS_FX_BLURBS }],
  ['Generative paint FX (per-frame)', '`{ "type":"paint", "paint":"<name>" }` — a full-canvas animated field, pure in t.', names(PAINT_FX_NAMES), 'per-frame'],
  ['Backgrounds', '`bg:[{preset,from,to}]` — the field behind everything; moving ones (aurora/constellation/mesh/…) animate.', names(BG_NAMES), 'background', { blurbs: BG_BLURBS }],
  ['Per-frame accent layers', '`{ "type":"beam", ... }` — a light that travels a border or a sheen that sweeps; pure in t (no CSS @keyframes). `{ "type":"beam","mode":"border","speed":0.5 }`', ['beam:border (border-beam)', 'beam:shine (sheen sweep)'], 'per-frame'],
  ['Vector layer (logos/icons)', '`{ "type":"svg", ... }` — a path that DRAWS itself on (stroke) or MELTS from one shape into another (true shape-morph, optional spin). `{ "type":"svg","d":"…","morph":{"to":"…","spin":6.28} }`', ['svg:draw (stroke draws on)', 'svg:morph (shape melts into a logo)'], 'per-frame'],
  ['Beat blueprints', '`{ "type":"beat", "beat":"<name>", ... }` — a whole beat\'s directed motion; `make expand`. See BLUEPRINTS.md.', names(Object.keys(BEATS)), 'blueprint', { blurbs: BEAT_BLURBS }],
  ['Camera moves', '`"cameraMove": { "move":"<name>", ... }` — a calculated camera path → `data.camera` (smooth, velocity-continuous). `{ "move":"diveIn","tx":960,"ty":300,"to":1.6 }`', names(CAMERA_MOVE_NAMES), 'camera', { blurbs: CAMERA_MOVE_BLURBS }],
  ['Compositions (bespoke per-beat timeline)', '`{ "type":"composition", "comp":"<name>", "props":{…} }` — a FIRST-PARTY hand-authored multi-tween GSAP timeline for one beat (the safe form of another engine\' one-timeline-per-beat model). JSON names the comp + passes DATA; code lives in `compositions/index.js`. Reach for it when `parts`/blueprints can\'t express the choreography (overlapping tweens, a token travelling a path while a check draws). Pure (seeked).', names(COMPOSITION_NAMES), 'composition', { blurbs: COMPOSITION_BLURBS }],
  ['Layer types', 'The vocabulary itself: `{ "type":"<name>" }`. Everything else in this document is a dial ON one of these. Full props per type: `formats/scene/schema.json`, and `docs/PRIMITIVES.md` for what each is FOR.', names(LAYER_TYPES), 'layer', { blurbs: LAYER_BLURBS }],
  ['three.js scenes (real geometry)', '`{ "type":"three", "three":"<name>" }` — a scene graph: meshes, materials, lights, a camera. For what a distance field structurally cannot express: a font outline, a device body, a captured UI plane, a point cloud. Deterministic by contract — every object is POSED ABSOLUTELY from t, never stepped by delta (`core/three-fx.js`), and `make canvas-purity` hashes the real pixels to prove it.', names(THREE_FX), 'layer', { kind: 'three', blurbs: THREE_SCENES }],
  ['Raymarched surfaces', '`{ "type":"raymarch", "raymarch":"<name>" }` — implicit surfaces from a distance field. A subject you place, not a field behind everything.', names(RAYMARCH_FX), 'layer', { blurbs: RAYMARCH_SURFACES }],
  ['Layer-as-texture (resample)', '`"resample":{ "fx":"<name>", "amount":[from,to] }` — bind a LAYER as a GL texture and re-sample it through a fragment shader. This is the family that needs to SEE pixels: real lens distortion, radial and spin blur.\n\nIt works on ANY layer. One that already owns a raster (`image` · `paint` · `shader`) is sampled LIVE, every frame, so the source keeps moving under the pass. Every other type — `text`, `rect`, `group`, `svg`, `component`, `html`, a whole composed beat — is BAKED once at boot: the built subtree is serialised into an offscreen raster and sampled as a still. The motion then comes from the pass (the `amount` ramp, the noise clock), not from the source, so a `count` that ticks or a `type` that types is frozen at the state the build left it in. `raymarch`, `three`, `globe` and `video` are refused by name: their pixels live in a canvas or a video bitmap, which is not part of the DOM, so neither path can read them.\n\nEach resampled layer takes its own WebGL context and browsers cap those at roughly 16. This is a hero-shot effect: one or two per film, never decoration on fifty layers.', names(RESAMPLE_FX), 'per-frame', { blurbs: RESAMPLE_BLURBS }],
  ['Ambient shader fields', '`{ "type":"shader", "shader":"<name>" }` — a full-frame generative field, pure in t, palette-tintable via `colors`. Sits behind content; no sampler, so it cannot read what is under it.', names(AMBIENT_FX), 'per-frame', { blurbs: AMBIENT_SHADERS }],
  ['Per-layer fx', '`"fx"` blocks on a layer — a physical treatment rather than an entrance: a kick on the beat, a blend mode, an occlusion, a tilt, a progress ring, a cast shadow.', names(FX_TYPES), 'per-layer', { blurbs: FX_BLURBS }],
  ['Part entrances', 'THE BRIDGE between hand-written markup and the engine\'s clock. `parts: [{ select, anim, each, stagger, delay, out, exitDur }]` on a hand-authored html/svg layer — a CSS SELECTOR into your own markup, and every matched element gets an engine-driven, SEEKED entrance with a stagger, so a figure can grow its bars, then draw its line, then pop its dots. `out: true` gives each part its paired exit, anchored to the layer\'s end, so a hand-authored figure leaves piece by piece instead of fading as one card. That is the whole point on an `html` layer: the markup keeps the entire CSS surface AND the clock still owns each piece, which a hand-rolled `calc()` off `var(--t)` never gives back. A translate exit CONTINUES and a scale exit REVERSES, the same never-enter-and-retreat rule layers follow. Selectors default to `rect, circle, path, polyline, line, [data-part]`.', names(PART_NAMES), 'per-layer', { blurbs: PART_BLURBS }],
  ['Blend modes', '`mixBlend` — how a layer composites with what is beneath it.', names(BLEND_MODES), 'per-layer', { skip: 'the CSS compositing spec defines it — MDN `mix-blend-mode`' }],
  ['Filter presets', '`filter:"<name>"` — a named colour grade. Composite LOOKS are the richer set above; these are the primitives.', names(Object.keys(FILTER_PRESETS)), 'static', { blurbs: FILTER_BLURBS }],
  ['Easings', '`ease` on a motion key, a count, a camera leg. Entrances decelerate, exits accelerate; springs carry velocity.', names(Object.keys(EASINGS)), 'timing', { skip: 'named by curve; pick by FEELING from the table in docs/MOTION-CRAFT.md' }],
  ['Plain words (feel · duration · camera)', 'The row above lists 41 curves named by mechanism, which is why the default is to name none of them. These words resolve IN THE SAME SLOT as the concrete value: `ease:"snappy"`, `enterDur:"fast"`, `cameraMove:{move:"pull back"}`. Each is an alias onto something the engine already has, never a new capability, and an unknown one throws with the near misses named rather than falling back. When to reach for which: `docs/CRAFT/VOCABULARY.md` (`make vocab`).', names([...Object.keys(FEEL), ...Object.keys(DURATION), ...Object.keys(CAMERA_WORDS)]), 'timing', { blurbs: VOCAB_BLURBS }],
  ['Caption styles', '`captions:{ style:"<name>" }` — how burnt-in captions present. Sound and captions: `docs/CRAFT/SOUND.md`.', names(CAP_STYLE_NAMES), 'captions', { blurbs: CAPTION_BLURBS }],
  ['Drawn icons', '`svgIcon("<name>")` — a first-party vector, when no real logo or captured UI exists. Prefer a real asset: `make capture`, then a brand mark, then these, then emoji last.', names(Object.keys(ICONS)), 'asset', { skip: 'the name is the drawing' }],
  ['Ransom faces', '`ransom` on a text layer — per-glyph face mixing, from this fixed set.', names(RANSOM_FACES.map((f) => f.family)), 'text', { skip: 'a typeface — see it, do not read about it' }],
  ['Output targets', '`aspect` picks the canvas; `destination` picks the SAFE AREA inside it. They are different questions: 9:16 for a website hero and 9:16 for TikTok are the same canvas, and TikTok paints a rail down the right and captions across the bottom. One definition: `core/safe.js`.', names([...Object.keys(ASPECTS), ...DESTINATION_NAMES]), 'canvas', { skip: 'an aspect or a platform; core/safe.js holds the safe area each implies' }],
  ['Generators (the playground)', 'Parametric field generators with declared option schemas, turnable at /playground and usable as a `bg` or a layer. `make list` for their dials.', names(GENERATORS.map((g) => g.name)), 'generator', { blurbs: GENERATOR_BLURBS }],
  ['Lightfield dials', 'The option vocabulary of the lightfield generators: the pattern, the envelope shape and its anchor, the shadow direction, and how the field lives against the clock. Depth: `docs/LIGHTFIELD.md`.', names([...PATTERNS, ...SHAPES, ...ANCHORS, ...DIRECTIONS, ...MOTIONS]), 'generator', { blurbs: LIGHTFIELD_BLURBS }],
];

// Imported (by scripts/site/effects-json.mjs) this module is a DATA source for `sections`, so the
// CLI below must not run: it writes docs/EFFECTS.md and calls process.exit.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) emit();

function emit() {
  const out = [];
  out.push('# EFFECTS — the whole arsenal, in one place');
  out.push('');
  out.push('> GENERATED by `scripts/site/effects-catalog.mjs` (`make effects`) from the engine registries — it');
  out.push('> cannot drift from the code. This is the "see everything, then choose" catalog: skim it before');
  out.push('> authoring so you reach for the range instead of defaulting to `rise`+`fade`. Depth + doctrine:');
  out.push('> [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md) · recipes: [`MOTION-RECIPES.md`](MOTION-RECIPES.md) ·');
  out.push('> beats: [`CRAFT/BLUEPRINTS.md`](CRAFT/BLUEPRINTS.md). Determinism: every animated effect is a pure');
  out.push('> function of the frame (CSS `@keyframes` are killed) — motion comes from the engine, not from CSS.');
  out.push('');
  out.push('## Pick by what you need (mechanism-choice)');
  out.push('');
  out.push('| You need… | Reach for |');
  out.push('|---|---|');
  out.push('| A key line to land with motion | a kinetic text preset (`split`+`preset`) or a GSAP char fx |');
  out.push('| A number to read | `{ "type":"count" }` (it counts up) |');
  out.push('| To move between beats | a cut (family) + at most 1-3 seams; a sting on a background jump |');
  out.push('| To zoom into a product/UI | a `cinematicZoom` seam + `ken` push, or a camera `diveIn` |');
  out.push('| One form to BECOME another across a cut (a match cut) | `matches:[{at:"cut@1", from:"<id>", to:"<id>"}]` — the joint owns the handover: the outgoing layer ends on it, the incoming one opens wearing its pose and settles into its own. The engine produces the alignment, so nothing is hand-aligned and nothing can drift (core/junctions.js) |');
  out.push('| To move BETWEEN two elements without cutting | `cameraMove:{move:"travel", stations:[…]}` — lay the beats out as stations on a canvas bigger than the frame and fly between them. Pair with a `plane` modifier or every layer moves by the same amount and it reads as a slide |');
  out.push('| A living background | a moving `bg` preset (aurora/constellation/paperShapes) — brand-appropriate |');
  out.push('| A whole beat, directed | a `{type:"beat"}` blueprint |');
  out.push('| A border to glow / a sheen to sweep | the per-frame effects (border-beam / shine) |');
  out.push('| A logo to appear | the `logoReveal` beat / path draw-on / shape-morph |');
  out.push('| A figure to animate PIECE BY PIECE (default for charts/diagrams) | `parts` on the layer: stagger growUp/drawOn/popIn across its children (bars grow, line draws, dots pop) |');
  out.push('');
  let total = 0;
  // A family that keeps a blurb map must keep it COMPLETE. blueprints-catalog.mjs:44 exits 1 when a beat
  // has no trailing comment, for the same reason: a catalog that silently renders a blank is how 379 of 476
  // rows came to be blank in the first place. lib-test asserts this too; this is the copy that fires when
  // somebody adds an effect and regenerates the docs without running the tests.
  const gaps = [];
  for (const [title, , list, , meta] of sections) {
    if (!meta || !meta.blurbs) continue;
    const miss = list.filter((n) => !meta.blurbs[n]);
    if (miss.length) gaps.push(`${title}: ${miss.join(', ')}`);
  }
  if (gaps.length) {
    console.error('✗ effects-catalog: a family with a blurb map has entries missing from it —');
    for (const g of gaps) console.error(`    ${g}`);
    console.error('  Add the blurb beside the registry (that is where it lives), then re-run.');
    process.exit(1);
  }

  for (const [title, intro, list, tag, meta] of sections) {
    total += list.length;
    out.push(`## ${title}  \`[${tag}]\``);
    out.push('');
    out.push(intro);
    out.push('');
    out.push(table(list.map((n) => [n, d(n, meta)])));
    out.push('');
  }
  out.push(`---`);
  out.push(`_${total} effects across ${sections.length} families. Regenerate: \`make effects\`._`);
  const md = out.join('\n') + '\n';

  const dest = path.join(root, 'docs/EFFECTS.md');
  if (CHECK) {
    const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
    if (cur.trim() !== md.trim()) { console.error('✗ docs/EFFECTS.md is stale — run `make effects` (a registered effect is missing/changed).'); process.exit(1); }
    console.log('✓ docs/EFFECTS.md is in sync with the registries'); process.exit(0);
  }
  fs.writeFileSync(dest, md);
  console.log(`✓ wrote docs/EFFECTS.md — ${total} effects across ${sections.length} families`);
}
