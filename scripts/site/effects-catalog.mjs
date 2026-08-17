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
import { LOOK_NAMES } from '../../core/looks.js';
import { CANVAS_FX_NAMES } from '../../core/canvas-fx.js';
import { PAINT_FX_NAMES } from '../../core/paint-fx.js';
import { BG_NAMES } from '../../core/backgrounds.js';
import { GSAP_FX, EXIT_FX } from '../../core/gsap-effects.js';
import { BEATS } from '../../blueprints/index.mjs';
import { CAMERA_MOVE_NAMES } from '../../core/camera-moves.js';
import { COMPOSITION_NAMES } from '../../core/compositions/index.js';
// EVERYTHING BELOW THIS LINE WAS MISSING, and `scripts/gates/arsenal-check.mjs` now fails if the next
// one is. The catalogue is what CLAUDE.md sends an author to before they choose, and it did not contain
// the three.js layer at all: a whole scene-graph capability with four registered scenes, a written
// determinism contract and a purity gate, invisible to the one document whose job is to list it.
import { LAYER_TYPES } from '../../core/layers/index.js';
import { THREE_FX } from '../../core/three-scenes.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { SEAM_FX } from '../../core/seams.js';
import { FX_TYPES } from '../../core/fx/index.js';
import { BLEND_MODES } from '../../core/fx/mix-blend.js';
import { FILTER_PRESETS } from '../../core/filters.js';
import { EASINGS } from '../../core/motion.js';
import { CAP_STYLE_NAMES } from '../../core/captions.js';
import { ICONS } from '../../core/icons.js';
import { RANSOM_FACES } from '../../core/ransom.js';
import { ASPECTS, DESTINATION_NAMES } from '../../core/safe.js';
import { GENERATORS } from '../../core/generators.js';
import { PATTERNS, SHAPES, ANCHORS, DIRECTIONS, MOTIONS } from '../../core/lightfield/options.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');

// Curated one-liners for the notable effects. An effect not listed still appears (name only) — the point
// is EXHAUSTIVE coverage from the registry; the notes are a bonus, never a second source of truth.
const DESC = {
  // kinetic type presets
  up: 'words/chars rise into place — the default kinetic headline', scale: 'punch in from small (overshoot)',
  blur: 'resolve out of blur — calm, premium', decode: 'scramble→settle, techy', tilt: '3D tilt-in',
  wave: 'sinusoidal wave across units', shimmerWave: 'looping light wave (per-unit)', draw: 'stroke draw-on for SVG paths',
  riseClip: 'mask-rise reveal', inkflash: 'per-word accent colour-wave', highlight: 'marker highlight sweep',
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
  terminalReveal: 'typing command + cursor + rising output + result', logoReveal: 'logo draws on + blooms + wordmark',
  cardCascade: 'title + cards pop in one after another', statReveal: 'hero count-up + kinetic label',
  ctaEnd: 'held end card: mark + install chip + url', verdictProof: 'typing command + tone verdict chip',
  // camera moves
  slowPush: 'gentle continuous zoom in (the frame stays alive)', diveIn: 'zoom INTO a target point (it travels to centre)',
  panFollow: 'camera pans to track downward-growing content (terminal)', workspaceZoomOut: 'pull back from a detail to reveal the whole',
  orbit: 'a gentle 3D swing around the frame (ry through 0)', multiPhase: 'chain legs into one journey (push, hold-drift, settle)',
  travel: 'station-to-station flight between points in STAGE coords — THE CAMERA AS THE TRANSITION (no cut)',
  truck: 'plain lateral travel, linear, so it reads as tracking rather than a lurch',
  logoLockup: 'mark pops + wordmark travels + kinetic headline', logoReveal: 'mark DRAWS on / MELTS from a blob + bloom + wordmark cascade',
  // per-frame accent layers (pseudo-names)
  'beam:border (border-beam)': 'a light travels the rounded-rect border', 'beam:shine (sheen sweep)': 'a sheen sweeps across the box',
  'svg:draw (stroke draws on)': 'the logo/icon stroke draws itself on, line by line',
  'svg:morph (shape melts into a logo)': 'one path melts into another (blob into logo), optional spin',
};

const d = (n) => DESC[n] || '—';
const table = (rows) => ['| name | what / when |', '|---|---|', ...rows.map(([n, x]) => `| \`${n}\` | ${x} |`)].join('\n');
const names = (arr) => [...new Set(arr)].sort();

const sections = [
  ['Kinetic text presets', '`split`+`preset` on a text layer — words/chars reveal with motion. `{ "split":"word", "preset":"up", "each":0.4, "stagger":0.05 }`', names(Object.keys(PRESETS)), 'text'],
  ['Enter / exit anims', '`anim` (enter) + `out` (exit) on any layer. Entrances decelerate, exits accelerate. `{ "anim":"rise", "out":"defocus" }`', names(ANIM_NAMES), 'per-layer'],
  ['GSAP named effects', '`fx` (enter) / `fxOut` (exit); per-letter on a `split` layer. `{ "anim":"none", "fx":"charOvershoot" }`', names(GSAP_FX), 'per-layer/text'],
  ['GSAP exits', '`fxOut` — pair every entrance with a directional exit.', names(EXIT_FX), 'exit'],
  ['Scene cuts', '`cuts:[{t,style}]` — the beat-to-beat cut family. One family per film.', names(Object.keys(PRESENTATIONS)), 'transition'],
  ['Shader stings', '`stings:[{t,fx}]` — a full-frame shader accent on a reveal / background jump.', names(SHADER_FX), 'transition'],
  ['Seams (2-scene blends)', '`seams:[{t,fx,dur}]` — one earned expressive transition, reserved for the payoff.', names(SEAM_FX), 'transition'],
  ['Composite looks (static)', '`filter:"<look>"` — a colour-grade / treatment on a layer (STATIC).', names(LOOK_NAMES), 'static'],
  ['Canvas image passes (baked)', '`canvasFx` — a one-time baked image pass (cannot move).', names(CANVAS_FX_NAMES), 'static'],
  ['Generative paint FX (per-frame)', '`{ "type":"paint", "paint":"<name>" }` — a full-canvas animated field, pure in t.', names(PAINT_FX_NAMES), 'per-frame'],
  ['Backgrounds', '`bg:[{preset,from,to}]` — the field behind everything; moving ones (aurora/constellation/mesh/…) animate.', names(BG_NAMES), 'background'],
  ['Per-frame accent layers', '`{ "type":"beam", ... }` — a light that travels a border or a sheen that sweeps; pure in t (no CSS @keyframes). `{ "type":"beam","mode":"border","speed":0.5 }`', ['beam:border (border-beam)', 'beam:shine (sheen sweep)'], 'per-frame'],
  ['Vector layer (logos/icons)', '`{ "type":"svg", ... }` — a path that DRAWS itself on (stroke) or MELTS from one shape into another (true shape-morph, optional spin). `{ "type":"svg","d":"…","morph":{"to":"…","spin":6.28} }`', ['svg:draw (stroke draws on)', 'svg:morph (shape melts into a logo)'], 'per-frame'],
  ['Beat blueprints', '`{ "type":"beat", "beat":"<name>", ... }` — a whole beat\'s directed motion; `make expand`. See BLUEPRINTS.md.', names(Object.keys(BEATS)), 'blueprint'],
  ['Camera moves', '`"cameraMove": { "move":"<name>", ... }` — a calculated camera path → `data.camera` (smooth, velocity-continuous). `{ "move":"diveIn","tx":960,"ty":300,"to":1.6 }`', names(CAMERA_MOVE_NAMES), 'camera'],
  ['Compositions (bespoke per-beat timeline)', '`{ "type":"composition", "comp":"<name>", "props":{…} }` — a FIRST-PARTY hand-authored multi-tween GSAP timeline for one beat (the safe form of another engine\' one-timeline-per-beat model). JSON names the comp + passes DATA; code lives in `compositions/index.js`. Reach for it when `parts`/blueprints can\'t express the choreography (overlapping tweens, a token travelling a path while a check draws). Pure (seeked).', names(COMPOSITION_NAMES), 'composition'],
  ['Layer types', 'The vocabulary itself: `{ "type":"<name>" }`. Everything else in this document is a dial ON one of these. Full props per type: `formats/scene/schema.json`, and `docs/PRIMITIVES.md` for what each is FOR.', names(LAYER_TYPES), 'layer'],
  ['three.js scenes (real geometry)', '`{ "type":"three", "three":"<name>" }` — a scene graph: meshes, materials, lights, a camera. For what a distance field structurally cannot express: a font outline, a device body, a captured UI plane, a point cloud. Deterministic by contract — every object is POSED ABSOLUTELY from t, never stepped by delta (`core/three-fx.js`), and `make canvas-purity` hashes the real pixels to prove it.', names(THREE_FX), 'layer'],
  ['Raymarched surfaces', '`{ "type":"raymarch", "raymarch":"<name>" }` — implicit surfaces from a distance field. A subject you place, not a field behind everything.', names(RAYMARCH_FX), 'layer'],
  ['Layer-as-texture (resample)', '`"resample":{ "fx":"<name>", "amount":[from,to] }` — bind a layer that is already a raster (a canvas or an `<img>`) as a GL texture and re-sample it through a fragment shader. This is the family that needs to SEE pixels: real lens distortion, radial and spin blur.', names(RESAMPLE_FX), 'per-frame'],
  ['Ambient shader fields', '`{ "type":"shader", "shader":"<name>" }` — a full-frame generative field, pure in t, palette-tintable via `colors`. Sits behind content; no sampler, so it cannot read what is under it.', names(AMBIENT_FX), 'per-frame'],
  ['Per-layer fx', '`"fx"` blocks on a layer — a physical treatment rather than an entrance: a kick on the beat, a blend mode, an occlusion, a tilt, a progress ring, a cast shadow.', names(FX_TYPES), 'per-layer'],
  ['Blend modes', '`mixBlend` — how a layer composites with what is beneath it.', names(BLEND_MODES), 'per-layer'],
  ['Filter presets', '`filter:"<name>"` — a named colour grade. Composite LOOKS are the richer set above; these are the primitives.', names(Object.keys(FILTER_PRESETS)), 'static'],
  ['Easings', '`ease` on a motion key, a count, a camera leg. Entrances decelerate, exits accelerate; springs carry velocity.', names(Object.keys(EASINGS)), 'timing'],
  ['Caption styles', '`captions:{ style:"<name>" }` — how burnt-in captions present. Sound and captions: `docs/CRAFT/SOUND.md`.', names(CAP_STYLE_NAMES), 'captions'],
  ['Drawn icons', '`svgIcon("<name>")` — a first-party vector, when no real logo or captured UI exists. Prefer a real asset: `make capture`, then a brand mark, then these, then emoji last.', names(Object.keys(ICONS)), 'asset'],
  ['Ransom faces', '`ransom` on a text layer — per-glyph face mixing, from this fixed set.', names(RANSOM_FACES.map((f) => f.family)), 'text'],
  ['Output targets', '`aspect` picks the canvas; `destination` picks the SAFE AREA inside it. They are different questions: 9:16 for a website hero and 9:16 for TikTok are the same canvas, and TikTok paints a rail down the right and captions across the bottom. One definition: `core/safe.js`.', names([...Object.keys(ASPECTS), ...DESTINATION_NAMES]), 'canvas'],
  ['Generators (the playground)', 'Parametric field generators with declared option schemas, turnable at /playground and usable as a `bg` or a layer. `make list` for their dials.', names(GENERATORS.map((g) => g.name)), 'generator'],
  ['Lightfield dials', 'The option vocabulary of the lightfield generators: the pattern, the envelope shape and its anchor, the shadow direction, and how the field lives against the clock. Depth: `docs/LIGHTFIELD.md`.', names([...PATTERNS, ...SHAPES, ...ANCHORS, ...DIRECTIONS, ...MOTIONS]), 'generator'],
];

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
out.push('| To move BETWEEN two elements without cutting | `cameraMove:{move:"travel", stations:[…]}` — lay the beats out as stations on a canvas bigger than the frame and fly between them. Pair with a `plane` modifier or every layer moves by the same amount and it reads as a slide |');
out.push('| A living background | a moving `bg` preset (aurora/constellation/paperShapes) — brand-appropriate |');
out.push('| A whole beat, directed | a `{type:"beat"}` blueprint |');
out.push('| A border to glow / a sheen to sweep | the per-frame effects (border-beam / shine) |');
out.push('| A logo to appear | the `logoReveal` beat / path draw-on / shape-morph |');
out.push('| A figure to animate PIECE BY PIECE (default for charts/diagrams) | `parts` on the layer: stagger growUp/drawOn/popIn across its children (bars grow, line draws, dots pop) |');
out.push('');
let total = 0;
for (const [title, intro, list, tag] of sections) {
  total += list.length;
  out.push(`## ${title}  \`[${tag}]\``);
  out.push('');
  out.push(intro);
  out.push('');
  out.push(table(list.map((n) => [n, d(n)])));
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
