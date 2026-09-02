// scripts/site/effects-catalog.mjs, GENERATE docs/EFFECTS.md: the single arsenal catalog so the model
// SEES every effect the engine offers and picks, instead of authoring plain rise+fade from a blank JSON.
// Derived from the registries themselves (the coverage.mjs pattern), it can never drift from the code.
//   node scripts/site/effects-catalog.mjs [--check]   ·   make effects
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTION_CUES } from '../../core/audio-tactile.js';
import { registersOf } from '../gates/craft-coverage.mjs';
import { catalogued } from '../../core/registry.js';
// The blurb maps of the families that have no registry, each still living beside the vocabulary it
// describes (the pattern blocks/catalog.mjs proves at 70/70). They take PRECEDENCE over DESC below, and
// that ordering is the point: DESC is a FLAT name-keyed map shared across families, so `up` the anim was
// being handed `up` the kinetic preset's description ("words/chars rise into place"), which is about
// glyph units and not about a layer at all. A family-scoped map cannot make that mistake. The 32
// registry-backed families no longer appear here at all: they carry their own blurbs and their own
// section, and are read off `catalogued()` below.
// `scripts/gates/arsenal-check.mjs` fails when a vocabulary the engine exports reaches none of these
// sections. The catalogue is what CLAUDE.md sends an author to before they choose, and it once did not
// contain the three.js layer at all: a whole scene-graph capability with four registered scenes, a
// written determinism contract and a purity gate, invisible to the one document whose job is to list it.
import { BLEND_MODES } from '../../core/fx/mix-blend.js';
import { EASINGS } from '../../core/motion.js';
import { RANSOM_FACES } from '../../core/ransom.js';
import { ASPECTS } from '../../core/safe.js';
import { FEEL, DURATION, CAMERA_WORDS } from '../../core/vocab.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');

// Curated one-liners for the notable effects. An effect not listed still appears (name only), the point
// is EXHAUSTIVE coverage from the registry; the notes are a bonus, never a second source of truth.
const DESC = {
  // kinetic type presets
  up: 'words/chars rise into place. The default kinetic headline', scale: 'punch in from small (overshoot)',
  blur: 'resolve out of blur, calm, premium', decode: 'scramble→settle, techy', tilt: '3D tilt-in',
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
  aurora: 'drifting colour aurora (moves)', mesh: 'soft gradient mesh (dark/saturated, check contrast)',
  constellation: 'drifting connected nodes (moves), telemetry/data feel', spotlight: 'radial spotlight glow',
  brandglow: 'breathing accent glow', paperShapes: 'faint drifting geometric shapes (light, subtle)',
  metallic: 'vertical light rods with a travelling SHIMMER (brushed metal / lit equaliser), dramatic dark bg, brand-coloured',
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
  // beats (the camera moves that used to sit here now carry their own blurbs, core/camera-moves.js)
  logoLockup: 'mark pops + wordmark travels + kinetic headline', logoReveal: 'mark DRAWS on / MELTS from a blob + bloom + wordmark cascade',
  // per-frame accent layers (pseudo-names)
  'beam:border (border-beam)': 'a light travels the rounded-rect border', 'beam:shine (sheen sweep)': 'a sheen sweeps across the box',
  'svg:draw (stroke draws on)': 'the logo/icon stroke draws itself on, line by line',
  'svg:morph (shape melts into a logo)': 'one path melts into another (blob into logo), optional spin',
};

// docs/CRAFT/SELECTION.md §4 already classifies every look and every sting by the register it evokes,
// and `craft-coverage` already FAILS when one is missing, so that map is both complete and guaranteed.
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
// considered" and points at the doc that actually helps. The families below are self-describing, the CSS
// spec defines a blend mode, `9:16` is its own definition, a drawn icon called `check` draws a check, or
// are better served at a level other than per-entry, which is true of easings.
export const d = (n, meta = {}) => (meta.blurbs && meta.blurbs[n])
  || DESC[n]
  || (meta.kind && REGISTERS[meta.kind] && REGISTERS[meta.kind][n])
  || meta.skip
  || '-';
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

// ── the sections that WRITE THEMSELVES ──────────────────────────────────────────────────────────
//
// A registry that carries a `catalog` block (core/registry.js) already holds every part of a section:
// its title, its slot label, the prose an author reads, the names themselves, their blurbs, the JSON
// snippet and the preview scene. So it is READ here rather than restated. 32 of the 48 sections below
// used to be hand-listed beside the registry holding the identical names, and adding a capability was
// four edits in three files because of it.
//
// The walk is what makes it ONE edit. Without it a registry in a file this script never imports would
// simply not exist here, so a new vocabulary in a new file would still cost an import line: the same
// bug one level up. `arsenal-check` finds a module neither of us can import and says so.
const CORE = [];
const walkCore = (d) => {
  for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) walkCore(p); else if (/\.(js|mjs)$/.test(e.name)) CORE.push(p);
  }
};
walkCore('core');
// blueprints/index.mjs is NOT under core/ and holds the beat registry. It used to reach this file
// through an import line for BEATS and BEAT_BLURBS; the section derives itself now, so deleting that
// import as "no longer needed" would have made the whole beat family vanish from docs/EFFECTS.md in
// silence. Named here for the same reason scripts/gates/arsenal-check.mjs names it in its own walk.
CORE.push('blueprints/index.mjs');
for (const f of CORE) { try { await import(path.join(root, f)); } catch { /* browser-only; arsenal-check reports it */ } }

// The catalogue's own furniture, handed to a registry's `usage`/`preview` rather than imported by it:
// core/ ships to the browser and has no business knowing what a documentation swatch looks like.
// `j`, `text` and `full` write the authoring snippet; effects-json.mjs passes the scene half.
const j = (o) => JSON.stringify(o, null, 2);
export const USAGE_KIT = {
  j,
  text: (extra) => j({ type: 'text', text: 'Deterministic by design', x: 160, y: 420, w: 1600, size: 120, weight: 800, ...extra }),
  full: (extra) => j({ x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6, ...extra }),
};

const derived = catalogued().map((r) => {
  const c = r.catalog;
  return [c.title, c.intro, names(r.names), c.tag,
    { blurbs: r.blurbs, kind: c.register, skip: c.skip, reg: r, usage: c.usage, preview: c.preview, noPreview: c.noPreview }];
});

// EXPORTED so there is exactly one family list. `scripts/site/effects-json.mjs` builds the site's
// effects index off this same array, which is why the emit below is guarded: importing this module
// must read the registries, never rewrite docs/EFFECTS.md.
//
// The hand-written half, and it stays hand-written for one reason each: none of these is a registry.
// The remaining families and the rest are
// plain exports with no `defineRegistry` behind them, so there is no definition site to hang a catalog
// block on. Two are not even one vocabulary: "Per-frame accent layers" and "Vector layer" are
// pseudo-names for a MODE of a layer type, and "Plain words" merges three registries (feel · duration ·
// camera) into the one table an author reads. Give any of them a registry and it derives itself.
export const sections = [
  ...derived,
  ['Per-frame accent layers', '`{ "type":"beam", ... }`. A light that travels a border or a sheen that sweeps; pure in t (no CSS @keyframes). `{ "type":"beam","mode":"border","speed":0.5 }`', ['beam:border (border-beam)', 'beam:shine (sheen sweep)'], 'per-frame'],
  ['Vector layer (logos/icons)', '`{ "type":"svg", ... }`. A path that DRAWS itself on (stroke) or MELTS from one shape into another (true shape-morph, optional spin). `{ "type":"svg","d":"…","morph":{"to":"…","spin":6.28} }`', ['svg:draw (stroke draws on)', 'svg:morph (shape melts into a logo)'], 'per-frame'],
  // THE KEY IS `modifiers`, AND THIS LINE SAID `fx` FOR AS LONG AS THE FAMILY HAS EXISTED. `L.fx` is
  // the named-GSAP-effect slot and core/fx/index.js says so in capitals; an author who followed this
  // catalogue wrote `fx: [{ tilt: … }]` and got `layers[0].fx entry needs a name`. Ten modifiers,
  // about 80KB of engine, reached by 3 of 135 scenes and by 0 of 30 block files. Documentation alone
  // does not fix adoption (`parts` went 0 to 5 block files and its scenes stayed at 2), but a
  // catalogue that names the wrong key guarantees the opposite.
  ['Motion voices (tactile sound)', 'The film SOUNDS its own motion. `audio:{tactile:true}` and core/audio-tactile.js reads the timeline you already wrote: a layer thuds or plucks by its footprint and how far it travelled, a camera move is one `travel` per gesture, a counter plucks on the number\'s own easing curve, a declared `spectacle` gets a riser that ends on the moment. These five are motion voices, distinct from the fifteen INTERACTION cues (press, toggle, success) which are for a UI where somebody clicked. Any of them can also be placed by hand as `audio.cues[]`.', names(MOTION_CUES), 'audio', { skip: null }],
  ['Blend modes', '`mixBlend`: how a layer composites with what is beneath it.', names(BLEND_MODES), 'per-layer', { skip: 'the CSS compositing spec defines it, MDN `mix-blend-mode`' }],
  ['Easings', '`ease` on a motion key, a count, a camera leg. Entrances decelerate, exits accelerate; springs carry velocity.', names(Object.keys(EASINGS)), 'timing', { skip: 'named by curve; pick by FEELING from the table in docs/MOTION-CRAFT.md' }],
  ['Plain words (feel · duration · camera)', 'The row above lists 41 curves named by mechanism, which is why the default is to name none of them. These words resolve IN THE SAME SLOT as the concrete value: `ease:"snappy"`, `enterDur:"fast"`, `cameraMove:{move:"pull back"}`. Each is an alias onto something the engine already has, never a new capability, and an unknown one throws with the near misses named rather than falling back. When to reach for which: `docs/CRAFT/VOCABULARY.md` (`make vocab`).', names([...Object.keys(FEEL), ...Object.keys(DURATION), ...Object.keys(CAMERA_WORDS)]), 'timing', { blurbs: VOCAB_BLURBS }],
  ['Ransom faces', '`ransom` on a text layer: per-glyph face mixing, from this fixed set.', names(RANSOM_FACES.map((f) => f.family)), 'text', { skip: 'a typeface, see it, do not read about it' }],
  ['Output targets', '`aspect` picks the CANVAS. Five ratios; a ratio not named here is still honoured, sized to fit the long edge at 1920. WHERE the film is watched is the other half of the question and has its own section, Destinations: 9:16 for a website hero and 9:16 for TikTok are the same canvas, and only one of them has buttons painted down the right. One definition: `core/safe.js`.', names(Object.keys(ASPECTS)), 'canvas', { skip: 'a ratio is its own definition; the safe area it implies belongs to the destination, in the section below' }],
];

// Imported (by scripts/site/effects-json.mjs) this module is a DATA source for `sections`, so the
// CLI below must not run: it writes docs/EFFECTS.md and calls process.exit.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) emit();

function emit() {
  const out = [];
  out.push('# EFFECTS: the whole arsenal, in one place');
  out.push('');
  out.push('> GENERATED by `scripts/site/effects-catalog.mjs` (`make effects`) from the engine registries, it');
  out.push('> cannot drift from the code. This is the "see everything, then choose" catalog: skim it before');
  out.push('> authoring so you reach for the range instead of defaulting to `rise`+`fade`. Depth + doctrine:');
  out.push('> [`CRAFT/DIRECTION.md`](CRAFT/DIRECTION.md) · recipes: [`MOTION-RECIPES.md`](MOTION-RECIPES.md) ·');
  out.push('> beats: [`CRAFT/BLUEPRINTS.md`](CRAFT/BLUEPRINTS.md). Determinism: every animated effect is a pure');
  out.push('> function of the frame (CSS `@keyframes` are killed), motion comes from the engine, not from CSS.');
  out.push('');
  out.push('## Pick by what you need (mechanism-choice)');
  out.push('');
  out.push('| You need… | Reach for |');
  out.push('|---|---|');
  out.push('| A key line to land with motion | a kinetic text preset (`split`+`preset`) or a GSAP char fx |');
  out.push('| A number to read | `{ "type":"count" }` (it counts up) |');
  out.push('| To move between beats | a cut (family) + at most 1-3 seams; a sting on a background jump |');
  out.push('| To zoom into a product/UI | a `cinematicZoom` seam + `ken` push, or a camera `diveIn` |');
  out.push('| One form to BECOME another across a cut (a match cut) | `matches:[{at:"cut@1", from:"<id>", to:"<id>"}]`. The joint owns the handover: the outgoing layer ends on it, the incoming one opens wearing its pose and settles into its own. The engine produces the alignment, so nothing is hand-aligned and nothing can drift (core/junctions.js) |');
  out.push('| To move BETWEEN two elements without cutting | `cameraMove:{move:"travel", stations:[…]}`. Lay the beats out as stations on a canvas bigger than the frame and fly between them. Pair with a `plane` modifier or every layer moves by the same amount and it reads as a slide |');
  out.push('| A living background | a moving `bg` preset (aurora/constellation/paperShapes), brand-appropriate |');
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
    console.error('✗ effects-catalog: a family with a blurb map has entries missing from it:');
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
    if (cur.trim() !== md.trim()) { console.error('✗ docs/EFFECTS.md is stale, run `make effects` (a registered effect is missing/changed).'); process.exit(1); }
    console.log('✓ docs/EFFECTS.md is in sync with the registries'); process.exit(0);
  }
  fs.writeFileSync(dest, md);
  console.log(`✓ wrote docs/EFFECTS.md: ${total} effects across ${sections.length} families`);
}
