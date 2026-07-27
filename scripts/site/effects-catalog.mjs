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
  paperDots: 'faint drifting dot grid (light)', plain: 'flat theme field', dotmatrix: 'dot matrix grid',
  // stings / transitions
  whipPan: 'momentum swipe between beats', cinematicZoom: 'dive-in zoom into a screen', dissolve: 'time/place change',
  flashWhite: 'white flash on an energy pivot', glitch: 'RGB-split glitch', portal: 'glowing portal reveal (once)',
  // paint-fx
  matrix: 'falling glyph rain (per-frame)', starfield: 'flying starfield (per-frame)', waves: 'sine wave field (per-frame)',
  meteor: 'ballistic streaks with echo trails (per-frame)',
  // beats
  kineticHook: 'hook: eyebrow + hero count-up|word + kinetic subline', screenDive: 'kinetic title + UI shot ken-pushes in',
  terminalReveal: 'typing command + cursor + rising output + result', logoReveal: 'logo draws on + blooms + wordmark',
  cardCascade: 'title + cards pop in one after another', statReveal: 'hero count-up + kinetic label',
  ctaEnd: 'held end card: mark + install chip + url', verdictProof: 'typing command + tone verdict chip',
  // camera moves
  slowPush: 'gentle continuous zoom in (the frame stays alive)', diveIn: 'zoom INTO a target point (it travels to centre)',
  panFollow: 'camera pans to track downward-growing content (terminal)', workspaceZoomOut: 'pull back from a detail to reveal the whole',
  orbit: 'a gentle 3D swing around the frame (ry through 0)', multiPhase: 'chain legs into one journey (push, hold-drift, settle)',
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
  ['Seams (2-scene blends)', '`seams:[{t,fx,dur}]` — one earned expressive transition, reserved for the payoff.', names(['dissolve', 'whipPan', 'cinematicZoom', 'flashWhite', 'crossWarp', 'portal']), 'transition'],
  ['Composite looks (static)', '`filter:"<look>"` — a colour-grade / treatment on a layer (STATIC).', names(LOOK_NAMES), 'static'],
  ['Canvas image passes (baked)', '`canvasFx` — a one-time baked image pass (cannot move).', names(CANVAS_FX_NAMES), 'static'],
  ['Generative paint FX (per-frame)', '`{ "type":"paint", "paint":"<name>" }` — a full-canvas animated field, pure in t.', names(PAINT_FX_NAMES), 'per-frame'],
  ['Backgrounds', '`bg:[{preset,from,to}]` — the field behind everything; moving ones (aurora/constellation/mesh/…) animate.', names(BG_NAMES), 'background'],
  ['Per-frame accent layers', '`{ "type":"beam", ... }` — a light that travels a border or a sheen that sweeps; pure in t (no CSS @keyframes). `{ "type":"beam","mode":"border","speed":0.5 }`', ['beam:border (border-beam)', 'beam:shine (sheen sweep)'], 'per-frame'],
  ['Vector layer (logos/icons)', '`{ "type":"svg", ... }` — a path that DRAWS itself on (stroke) or MELTS from one shape into another (true shape-morph, optional spin). `{ "type":"svg","d":"…","morph":{"to":"…","spin":6.28} }`', ['svg:draw (stroke draws on)', 'svg:morph (shape melts into a logo)'], 'per-frame'],
  ['Beat blueprints', '`{ "type":"beat", "beat":"<name>", ... }` — a whole beat\'s directed motion; `make expand`. See BLUEPRINTS.md.', names(Object.keys(BEATS)), 'blueprint'],
  ['Camera moves', '`"cameraMove": { "move":"<name>", ... }` — a calculated camera path → `data.camera` (smooth, velocity-continuous). `{ "move":"diveIn","tx":960,"ty":300,"to":1.6 }`', names(CAMERA_MOVE_NAMES), 'camera'],
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
