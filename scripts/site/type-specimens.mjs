// scripts/site/type-specimens.mjs: the /type page's catalogue, DERIVED from the registries.
//
//   site/lib/type-specimens.json          the catalogue the page renders (groups, blurbs, coverage)
//   site/public/assets/type/<id>.json     one real scene per specimen (the site plays these LIVE)
//   site/public/assets/type/<id>.png      one still per specimen, taken MID-MOTION
//
// Run it directly:  node scripts/site/type-specimens.mjs
//
// WHY IT IS GENERATED. A hand-kept list of kinetic presets goes stale the moment a preset is added,
// and nothing says so (docs/MISTAKES.md #159). So the inventory here is read out of the code that
// renders it: PRESETS + PRESET_BLURBS in core/type.js, BEATS + REQUESTS in blueprints/index.mjs, and
// the text-layer prop list the schema generates from the PROPS declarations. Add a preset and it
// appears on the site with its own blurb and a working specimen, with no edit here.
//
// WHAT IS STILL AUTHORED, and why it has to be. A specimen needs CONTENT, a word, a size, a beat's
// props, and no registry carries that. So this file authors the content and derives everything else,
// and every authored piece is checked against the registry it belongs to: a group that names a preset
// which no longer exists FAILS, a preset in no group lands in `unfiled` (visible on the page, never
// dropped), and a text-layer prop with no specimen is reported as coverage rather than hidden.
//
// WHY THE STILLS ARE MID-MOTION. Type in motion cannot be shown with a settled still: a grid of the
// same word set 27 times is a worse page than no page. Each poster is taken partway through the
// entrance, so the grid shows 27 different states of arrival, and the real motion is one click away
// in the real engine (the site ships core/ + scene.html already, see scripts/site/site-engine.mjs).
//
// WHY THE COPY IS A LINE AND NOT A WORD. Every specimen used to be set in the preset's own name:
// `blur`, `focus`, `slide`. It labelled itself, and it hid everything a film needs to know. A single
// word is the easiest case there is, so the page flattered all 27 presets equally: it never showed
// how a reveal reads ACROSS a line, where the copy wraps, what a stagger does over a clause, or how a
// per-word effect paces against real punctuation. The copy here is on-screen writing in the register
// the films use, and the LENGTH is chosen per specimen: short enough to hold one line where the point
// is the arrival, long enough to wrap where the wrap is the point. Per-character effects get shorter
// copy than per-word ones, because 30 staggers of noise is the failure they are prone to.
// Everything here is true or plainly illustrative (CLAUDE.md, "Content philosophy"): the numbers come
// from real films in formats/scene/, and nothing invents a statistic to have one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS, PRESET_BLURBS } from '../../core/type.js';
import { BEATS, REQUESTS } from '../../blueprints/index.mjs';
import { BEAT_BLURBS } from './blueprints-catalog.mjs';
import { serveRepo, launchPage, waitForEngine } from '../lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(repoRoot, 'site/public/assets/type');
const CATALOGUE = path.join(repoRoot, 'site/lib/type-specimens.json');
const SCHEMA = path.join(repoRoot, 'formats/scene/schema.json');
fs.mkdirSync(OUT, { recursive: true });

const W = 1920, H = 1080;
const DUR = 4.4;              // every specimen scene is the same length, so the page loops evenly
const START = 0.25;

// ── the prop labels, read off the generated schema ────────────────────────────────────────────────
// schema.json is itself generated from the PROPS declarations beside each layer read, so this is the
// same list the validator enforces. Walked rather than indexed: the labels sit at several depths.
const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
const LABELS = {};
(function walk(node, key) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.label === 'string' && key) LABELS[key] ??= node.label;
  for (const [k, v] of Object.entries(node)) walk(v, k);
})(schema, null);
// The props a text layer reads are its OWN plus the shared ones, `split`, `stagger` and `each` live
// in `shared` because every layer that can be split reads them, not because they are not typographic.
const TEXT_PROPS = schema.layerProps.byType.text;
const READABLE = new Set([...TEXT_PROPS, ...schema.layerProps.shared]);

// ── content: the one thing no registry carries ────────────────────────────────────────────────────
// The specimen copy is authored below, one line per specimen. It is the only part of this file a
// registry cannot supply, and it is the part that decides whether the page teaches anything.
//
// y is DERIVED, not set, because the copy now wraps. A two-line specimen parked at the y that centres
// one line sits low in the card and leaves a band of space nobody decided (docs/CRAFT/LAYOUT.md,
// passive whitespace reads as unfinished, not minimal). So the block is centred on its own height.
const ADVANCE = 0.55;   // average glyph advance in em, the same estimate core/validate.mjs:727 uses
const LINE_H = 1.04;    // .hs-text in formats/scene/scene.css
const plain = (t) => String(t ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// How many lines will this copy take in a w-wide column? Words do not break, so wrap them greedily.
// An estimate, not a measurement: this file writes the scene before a browser ever sees it. It is
// checked the only way it can be, by reading the posters it produces.
const linesOf = (text, size, w) => {
  const words = plain(text).split(' ').filter(Boolean);
  if (!words.length) return 1;
  const per = Math.max(1, Math.floor(w / (size * ADVANCE)));
  let lines = 1, len = 0;
  for (const word of words) {
    if (len && len + 1 + word.length > per) { lines++; len = word.length; }
    else len += (len ? 1 : 0) + word.length;
  }
  return lines;
};
// Optically centred: half the block height, then a nudge up, because a line's ink sits below the top
// of its line box. Calibrated to the 430 this file used by hand for a single 190px line.
const centreY = (text, size, w) => Math.round(540 - (linesOf(text, size, w) * size * LINE_H) / 2 - size * 0.06);

const textLayer = (over = {}) => {
  const L = {
    type: 'text', x: 210, w: 1500, align: 'center',
    size: 190, weight: 700, color: 'var(--text)',
    start: START, duration: DUR - START - 0.15, anim: 'none', exitDur: 0.22,
    ...over,
  };
  if (L.y == null && L.w && L.size && L.text) L.y = centreY(L.text, L.size, L.w);
  return L;
};

// ── when to take the still ────────────────────────────────────────────────────────────────────────
// MID-ENTRANCE, DERIVED FROM THE COPY. A fixed poster time cannot survive real lines: 0.52s was
// partway through a six-letter word and is a photograph of a nearly empty stage once the same preset
// is staggered across a sentence. So unless a specimen names its own time, the still is taken 45% of
// the way through the whole staggered entrance, computed from the copy that is actually set.
const unitsOf = (L) => {
  const t = plain(L.text);
  if (L.split === 'word') return Math.max(1, t.split(' ').filter(Boolean).length);
  if (L.split === 'char') return Math.max(1, t.replace(/ /g, '').length);
  return 1;
};
const midEntrance = (L) => {
  const total = L.typing ? plain(L.text).length / L.typing
    : (L.each ?? 0.55) + (L.stagger ?? 0) * (unitsOf(L) - 1);
  return Math.round(Math.min(START + 0.45 * total, DUR - 0.5) * 100) / 100;
};

// Per-preset staging: the COPY, its size, and only what the default would otherwise get wrong, a
// `slide` with no direction, a looping preset that needs a phase step, a `draw` that has no glyphs to
// draw. A preset absent from this table still works: it falls back to its own name, set at the plain
// treatment below, which is what makes a NEW preset appear on the page with no edit to this file.
//
// Sizes are chosen against the 1500px column, not picked evenly. A per-character preset is given a
// line that fits, because 30 staggers is what per-character motion is bad at; a per-word preset is
// given a clause long enough that the wrap is visible, because that is a thing the specimen should
// show and a single word never could.
const PRESET_STAGING = {
  // Reveal a line. Copy from real films: gh-wrapped's hook, its payoff, and its travelled change.
  up: { text: 'Nothing. Then June.', size: 132 },
  down: { text: 'It did not restart. It caught.', size: 140, split: 'word' },
  riseClip: { text: "26 lines. Somebody else's repo.", size: 130, split: 'word', each: 0.8 },
  blur: { text: 'Six months of silence, then one commit.', size: 120, split: 'word', presetOpts: { px: 30 }, each: 0.8 },
  focus: { text: 'Read the frame, not the file.', size: 140, split: 'word', each: 0.9 },
  slide: { text: 'One JSON in. One video out.', size: 140, split: 'word', presetOpts: { dir: 'right', dist: 160 } },
  skew: { text: 'The cut serves the emotion first.', size: 120, split: 'word' },
  fall: { text: 'Every layer lands somewhere.', size: 140, split: 'word' },
  type: { text: 'Type it. Do not fade it in.', size: 130, stagger: 0.055 },

  // Punctuate a word. Short on purpose: these land hard, and a long line under one is a contradiction.
  scale: { text: 'Then it caught.', size: 170 },
  stretch: { text: 'Wider than the frame.', size: 130, each: 0.8 },
  shadow: { text: 'It has weight.', size: 170 },
  swing: { text: 'Hung on one word.', size: 150 },
  bounce: { text: 'It lands, then settles.', size: 120 },
  elastic: { text: 'Overshoot, then correct.', size: 115 },
  flip: { text: 'Turn the claim over.', size: 135 },
  tilt: { text: 'Off axis, on purpose.', size: 130 },
  unfold: { text: 'Open it out.', size: 170 },

  // Resolve out of noise.
  decode: { text: 'Resolving out of noise.', size: 150, stagger: 0.045, each: 0.9 },
  chroma: { text: 'The colour separates, then agrees.', size: 120, split: 'word', each: 0.9 },

  // Paint the words. Per-word, so the copy is long enough for the paint to travel across a clause.
  gradient: { text: 'Painted through the glyphs.', size: 140, split: 'word', each: 1.6, poster: 2.05 },
  highlight: { text: 'The one word that matters.', size: 140, split: 'word', each: 1.1 },
  underline: { text: 'Draw a line under it.', size: 130, split: 'word', each: 1.1 },
  colorWave: { text: 'Colour travels word by word.', size: 140, split: 'word', each: 0.8, stagger: 0.22 },

  // Never settle. These loop, so they name their own poster: there is no entrance to be partway
  // through. The copy stays short BECAUSE of the caution below: a line nobody can settle on to read
  // must not be a line anyone needs to read.
  wave: { text: 'never settles', size: 160, split: 'char', stagger: 0, phaseStep: 0.45, speed: 0.6, poster: 1.85 },
  shimmerWave: { text: 'a surface, not a sentence', size: 108, split: 'char', stagger: 0, phaseStep: 0.12, speed: 0.5, poster: 2.2 },

  draw: {
    // the only preset whose units are STROKES, not glyphs. SplitText(el,'path') stamps pathLength
    text: '<svg viewBox="0 0 46 24" width="900" height="470" fill="none" style="display:block"><path d="M1 12 Q7 1 12 12 T23 12 T34 12 T46 4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>',
    x: 510, y: 305, w: null, align: null, size: null, weight: null, color: null,
    split: 'path', presetOpts: { ease: 'easeInOutSine' }, each: 2.2, poster: 1.4,
  },
};

// The intent groups. An author does not reach for "a preset", they reach for a thing to DO, so the
// page is ordered by the doing. Every name below is checked against PRESETS: a rename fails the run,
// and a preset in none of these lands in `unfiled` rather than vanishing.
const PRESET_GROUPS = [
  { id: 'reveal', title: 'Reveal a line',
    intent: 'The line arrives and settles. This is the default job of kinetic type, and most of the vocabulary lives here.',
    presets: ['up', 'down', 'riseClip', 'blur', 'focus', 'slide', 'skew', 'fall', 'type'] },
  { id: 'punctuate', title: 'Punctuate a word',
    intent: 'One word carries the beat. These land harder than a reveal, so they cost their welcome fast: one per film, on the word that deserves it.',
    presets: ['scale', 'stretch', 'shadow', 'swing', 'bounce', 'elastic', 'flip', 'tilt', 'unfold'] },
  { id: 'resolve', title: 'Resolve out of noise',
    intent: 'The word is wrong on arrival and corrects itself. The satisfying part is the correction, so give it room to be seen.',
    presets: ['decode', 'chroma'] },
  { id: 'paint', title: 'Paint the words',
    intent: 'The glyphs hold still and the colour does the moving. Nothing travels, so these sit under a camera move or a cut without fighting it.',
    presets: ['gradient', 'highlight', 'underline', 'colorWave'] },
  { id: 'ambient', title: 'Never settle',
    intent: 'A loop, not an entrance. These have no end state, so they are ambient only: never put a line the viewer has to read inside one.',
    presets: ['wave', 'shimmerWave'] },
  { id: 'stroke', title: 'Draw it instead of setting it',
    intent: 'The units are SVG strokes rather than glyphs, so a mark, a signature or a chart line writes itself on.',
    presets: ['draw'] },
];

// ── hand-set mechanics: per-layer text props, not presets ─────────────────────────────────────────
// Each names the schema props it demonstrates. Those names are asserted against the schema's own
// text-layer prop list, and whatever is left over is reported as coverage on the page.
const MECHANICS = [
  { id: 'typing', label: 'typing + caret', props: ['typing', 'caret', 'caretHold'],
    note: 'Characters arrive at a rate you set in characters per second, with a caret trailing the reveal. Pure in the frame number, so it seeks.',
    caution: 'A typing line is real time you are spending. Past about eight words it stops reading as writing and starts reading as waiting.',
    layer: { text: 'make video D=formats/scene/hook.json', font: 'mono', size: 78, typing: 16, caret: true, caretHold: true, align: 'left', x: 260 } },
  { id: 'untype', label: 'untype', props: ['untype', 'untypeRate'], poster: 2.6,
    note: 'The line types itself in, holds, then DELETES itself character by character. The "wrote it, thought better of it" beat.',
    caution: 'Faking it with a fade is the tell: a fade removes the whole line at once and the caret stops meaning anything.',
    layer: { text: 'Second thoughts, in public.', size: 120, typing: 22, untype: 2.0, untypeRate: 44, caret: true, caretHold: true, align: 'left', x: 260 } },
  { id: 'split-word', label: 'split: word', props: ['split', 'stagger', 'each'],
    note: 'The line is cut into words and each word animates on its own clock. The stagger is what makes a line read left to right instead of appearing.',
    layer: { text: 'The line is cut into words.', size: 140, split: 'word', preset: 'up', stagger: 0.09, each: 0.6 } },
  { id: 'split-char', label: 'split: char', props: ['split'],
    note: 'The same line cut into characters. Words stay unbreakable, so the line still wraps at spaces.',
    caution: 'Per-character on a long line is 30 staggers of noise. Reserve it for one short phrase.',
    layer: { text: 'Every character, on its own clock.', size: 120, split: 'char', preset: 'up', stagger: 0.03, each: 0.5 } },
  { id: 'tracking', label: 'tracking', props: ['tracking', 'ls'],
    note: 'The optical tracking ramp: display sizes get tightened, small sizes get opened, and light type on a dark ground is opened again to compensate for the way it blooms.',
    caution: 'Set `tracking` yourself only when you mean to override the ramp. It is already doing the right thing at every size.',
    layer: { text: 'TIGHTENED AT DISPLAY SIZE', size: 150, weight: 800, tracking: '-0.03em', preset: 'blur', split: 'char', stagger: 0.05 } },
  { id: 'gradient-fill', label: 'gradient fill', props: ['gradient'], poster: 2.0,
    note: 'A gradient painted THROUGH the letterforms with background-clip. Static by default; `animate` sets it turning, flowing or shimmering.',
    caution: 'One gradient headline per film. Two and neither is special.',
    // NO `split` here, deliberately. A gradient fill paints the CONTAINER and clips it to the text,
    // and a split layer moves the glyphs into child spans that carry no background of their own, so
    // they inherit `color: transparent` and paint nothing at all. See the note in the return report:
    // formats/scene/example-product-promo.json combines the two and its headline is invisible.
    layer: { text: 'Painted through the letterforms', size: 130, weight: 800, anim: 'fade', enterDur: 0.5,
      gradient: { colors: ['#2563eb', '#8b5cf6', '#06b6d4'], animate: 'spin', speed: 0.35 } } },
  { id: 'ransom', label: 'ransom', props: [], poster: 1.6,
    note: 'Every letter is cut from a different face and a different paper, picked from a seeded hash. The same seed gives the same note on every render, so the letters can keep changing without ever flickering.',
    caution: 'It shouts. It is a whole tone of voice, not an emphasis you can apply to one word inside a normal headline.',
    layer: { text: 'CUT FROM SIX PAPERS', size: 140, ransom: {}, ransomSeed: 'CUT FROM SIX PAPERS', preset: 'blur', presetOpts: { px: 14 }, stagger: 0.06 } },
  { id: 'circle', label: 'circle', props: [], poster: 2.2,
    note: 'The characters are laid around a ring and the ring turns. A seal, a badge, a stamp.',
    layer: { text: 'VAWE · ONE JSON · ONE VIDEO · ', size: 62, weight: 700, circle: { radius: 300 }, speed: 0.15, x: 960, y: 540, w: null, align: null } },
  { id: 'morph', label: 'morph', props: [], poster: 0.95,
    note: 'The letters of one word MIGRATE into the letters of another, rather than one fading out under the other.',
    caution: 'It needs a fixed width and a centre alignment, or the migration lands on a moving target.',
    layer: { text: 'the draft', size: 190, weight: 800, w: 1500, align: 'center', morph: { to: 'the film', dur: 1.4 } } },
];

// ── whole beats ───────────────────────────────────────────────────────────────────────────────────
// Names are asserted against BEATS; the blurb and the "how to ask for it" sentence come from the
// registry's own comments, never from a copy kept here. Beats not shown are reported as coverage.
const BEAT_SPECIMENS = [
  // The poster time is named here rather than derived: a beat expands into layers of its own, so the
  // entrance this file could measure is not the one the viewer sees.
  { id: 'typedHook', beat: 'typedHook', poster: 1.7, props: { text: 'Six months of nothing. Then June.' } },
  // wordBlast defaults to 380px because it punctuates ONE word. Two words at that size wrap and fall
  // out of the bottom of the frame, so the specimen sets the size its own copy needs.
  { id: 'wordBlast', beat: 'wordBlast', poster: 1.0, props: { text: 'IT CAUGHT', size: 260, y: 400 } },
  { id: 'propSentence', beat: 'propSentence', poster: 1.4, props: { items: [{ word: 'One' }, { chip: 'JSON' }, { word: 'in, one' }, { chip: 'video' }, { word: 'out.' }], y: 400 } },
];

// ── assemble ──────────────────────────────────────────────────────────────────────────────────────
const fail = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; };

const sceneOf = (layers) => ({
  module: 'scene', aspect: '16:9', theme: 'vawe', duration: DUR,
  audio: { silent: true, _why: 'a type specimen is judged with the eyes' },
  bg: [{ t: 0, preset: 'plain' }],
  layers,
});

const specimens = [];   // flat, in page order
const groups = [];

const filed = new Set();
for (const g of PRESET_GROUPS) {
  const rows = [];
  for (const name of g.presets) {
    if (!PRESETS[name]) { fail(`group "${g.id}" names preset "${name}", which is not in core/type.js PRESETS`); continue; }
    filed.add(name);
    rows.push(presetSpecimen(name));
  }
  groups.push({ ...g, presets: undefined, source: 'core/type.js · PRESETS', specimens: rows });
}
// A preset in no group is NOT dropped. It shows up here with its registry blurb and a working
// specimen, which is the whole point of deriving: the page cannot quietly fall behind the engine.
const unfiled = Object.keys(PRESETS).filter((n) => !filed.has(n));
if (unfiled.length) {
  console.log(`  note: ${unfiled.length} preset(s) in no group → shown as "unfiled": ${unfiled.join(', ')}`);
  groups.push({
    id: 'unfiled', title: 'Not yet filed',
    intent: 'These presets are in the engine and nobody has said yet what they are for. They are listed because the catalogue is generated from the code, so a new preset shows up here rather than going missing.',
    source: 'core/type.js · PRESETS', specimens: unfiled.map(presetSpecimen),
  });
}

function presetSpecimen(name) {
  const stage = { ...(PRESET_STAGING[name] || {}) };
  const named = stage.poster;
  delete stage.poster;
  const layer = textLayer({
    text: name, split: 'char', preset: name, stagger: 0.05, each: 0.55, ...stage,
  });
  // a null in the staging table means "this preset's host does not take that prop at all"
  for (const [k, v] of Object.entries(layer)) if (v === null) delete layer[k];
  // Partway through the entrance, not after it: at 0.75s a 0.55s entrance has already landed, and
  // every card was a photograph of the same settled word. Derived from the copy unless named.
  const poster = named ?? midEntrance(layer);
  const blurb = PRESET_BLURBS[name];
  if (!blurb) fail(`preset "${name}" has no PRESET_BLURBS entry`);
  return {
    id: `preset-${name}`, label: name, kind: 'preset',
    source: 'core/type.js · PRESETS',
    blurb,
    // The caution is READ OUT of the registry blurb rather than written again here. Every one of
    // these words is the engine's own warning about the preset; a second copy would drift from it.
    caution: /\b(only|never settles|once per film|ambient)\b/i.test(blurb) ? blurb : null,
    poster, layer, scene: sceneOf([layer]),
  };
}

// mechanics
{
  const rows = [];
  const shownProps = new Set();
  for (const m of MECHANICS) {
    for (const p of m.props) {
      if (!READABLE.has(p)) fail(`mechanic "${m.id}" names prop "${p}", which the schema does not list on a text layer`);
      shownProps.add(p);
    }
    const layer = textLayer({ ...m.layer });
    for (const [k, v] of Object.entries(layer)) if (v === null) delete layer[k];
    rows.push({
      id: `mech-${m.id}`, label: m.label, kind: 'mechanic',
      source: 'core/layers/text.js · PROPS (via formats/scene/schema.json)',
      blurb: m.note,
      caution: m.caution ?? null,
      // every prop's one-line label, straight out of the generated schema
      props: m.props.map((p) => ({ name: p, label: LABELS[p] ?? null })),
      // Named only where the moment worth photographing is not the entrance: mid-DELETION for untype,
      // a turning gradient that has no entrance at all, a morph caught between its two words.
      poster: m.poster ?? midEntrance(layer), layer, scene: sceneOf([layer]),
    });
  }
  groups.push({
    id: 'mechanics', title: 'Set it by hand',
    intent: 'Below the presets, a text layer has its own mechanics: how the characters arrive, how the line is cut up, what paints the glyphs. These are props on the layer, not a preset you name.',
    source: 'core/layers/text.js · PROPS', specimens: rows,
  });
  // coverage: text props the schema documents that no specimen here demonstrates
  var notShown = TEXT_PROPS.filter((p) => !shownProps.has(p));
}

// beats
{
  const rows = [];
  for (const b of BEAT_SPECIMENS) {
    const fn = BEATS[b.beat];
    if (!fn) { fail(`beat specimen names "${b.beat}", which is not in blueprints/index.mjs BEATS`); continue; }
    let layers;
    try { layers = fn({ start: START, dur: DUR - START - 0.15, ...b.props }); }
    catch (e) { fail(`beat "${b.beat}" would not expand: ${e.message.split('\n')[0]}`); continue; }
    rows.push({
      id: `beat-${b.id}`, label: b.beat, kind: 'beat',
      source: 'blueprints/index.mjs · BEATS',
      blurb: BEAT_BLURBS[b.beat],
      ask: REQUESTS[b.beat],
      caution: null,
      poster: b.poster,
      // what an author WRITES is the one-line beat call, not the expansion
      layer: { type: 'beat', beat: b.beat, start: START, dur: DUR - START - 0.15, ...b.props },
      scene: sceneOf(layers),
    });
  }
  groups.push({
    id: 'beats', title: 'A whole beat, in one line',
    intent: 'A blueprint is not a preset, it is a directed beat: one line in the scene expands into the layers, the stagger and the exit that make the move work. These are the typographic ones.',
    source: 'blueprints/index.mjs · BEATS', specimens: rows,
  });
}

for (const g of groups) specimens.push(...g.specimens);
if (process.exitCode) { console.error('\n✗ catalogue is inconsistent with the registries, nothing written'); process.exit(1); }

// ── write the scenes, then shoot one mid-motion still each ────────────────────────────────────────
let wrote = 0;
for (const s of specimens) {
  const p = path.join(OUT, `${s.id}.json`);
  const body = JSON.stringify(s.scene, null, 2) + '\n';
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body) { fs.writeFileSync(p, body); wrote++; }
}

const { server, port } = await serveRepo();
// Half scale: the card is ~420px wide, so 960x540 is already generous and 40 full-size PNGs are not.
const { browser, page } = await launchPage({ width: W, height: H, scale: 0.5 });

let shot = 0, miss = 0;
for (const s of specimens) {
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/site/public/assets/type/${s.id}.json&fps=30&aspect=16:9`, { waitUntil: 'load' });
  const boot = await waitForEngine(page, { throwOnTimeout: false });
  if (boot) { console.error(`  boot fail ${s.id}: ${boot}`); miss++; continue; }
  try {
    // The control is THIS scene at frame 0, before the layer starts: same stage, same backdrop,
    // nothing on it. Comparing against it needs no second scene and no PNG decoder.
    await page.evaluate(() => window.__engine.renderFrame(0));
    const blank = await page.screenshot();
    await page.evaluate((t) => window.__engine.renderFrame(Math.round(t * 30)), s.poster);
    // A still of an empty stage is the one failure that ships silently: it looks like a design
    // choice. Ask the DOM whether anything is actually painted at the moment being photographed.
    // IS ANYTHING ACTUALLY PAINTED? Compare the pixels against the same scene before it starts. A DOM probe was tried first and it PASSED a blank frame: the glyphs of a
    // background-clip:text layer inherit `color: transparent` and carry no fill of their own, so they
    // measure as full-size opaque boxes while painting nothing. A blank still that ships looks like a
    // design decision, so the check has to look at the picture, not at the markup.
    const png = await page.screenshot();
    // puppeteer returns a Uint8Array, not a Buffer, so wrap before comparing.
    if (Buffer.from(png).equals(Buffer.from(blank))) {
      console.error(`  \u2717 ${s.id}: the frame at ${s.poster}s is EMPTY (pixel-identical to this scene before it starts)`);
      miss++;
    }
    fs.writeFileSync(path.join(OUT, `${s.id}.png`), png);
    shot++;
  } catch (e) { console.error(`  still fail ${s.id}: ${e.message.slice(0, 90)}`); miss++; }
}
await page.close(); await browser.close(); server.close();

// ── the catalogue ─────────────────────────────────────────────────────────────────────────────────
const catalogue = {
  _generated: 'node scripts/site/type-specimens.mjs, do not hand-edit',
  _derivedFrom: [
    'core/type.js · PRESETS + PRESET_BLURBS',
    'core/layers/text.js · PROPS (through the generated formats/scene/schema.json)',
    'blueprints/index.mjs · BEATS + REQUESTS (+ the registry comments, via blueprints-catalog.mjs)',
  ],
  counts: {
    specimens: specimens.length,
    presetsInEngine: Object.keys(PRESETS).length,
    presetsShown: specimens.filter((s) => s.kind === 'preset').length,
    beatsInEngine: Object.keys(BEATS).length,
    beatsShown: specimens.filter((s) => s.kind === 'beat').length,
  },
  // Said out loud on the page. A catalogue that shows a subset and does not say so is the same lie
  // as one that has gone stale, only harder to notice.
  coverage: {
    textPropsNotShown: notShown,
    beatsNotShown: Object.keys(BEATS).filter((n) => !BEAT_SPECIMENS.some((b) => b.beat === n)),
  },
  groups: groups.map((g) => ({
    id: g.id, title: g.title, intent: g.intent, source: g.source,
    specimens: g.specimens.map((s) => ({
      id: s.id, label: s.label, kind: s.kind, source: s.source,
      blurb: s.blurb, caution: s.caution, ask: s.ask ?? null, props: s.props ?? null,
      poster: s.poster,
      // what the author copies: the layer, not the whole scene
      json: JSON.stringify(s.layer, null, 2),
    })),
  })),
};
fs.writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 2) + '\n');

// sweep media for specimens that no longer exist
const keep = new Set(specimens.flatMap((s) => [`${s.id}.json`, `${s.id}.png`]));
const stale = fs.readdirSync(OUT).filter((f) => !keep.has(f));
for (const f of stale) fs.rmSync(path.join(OUT, f));

const bytes = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`type-specimens: ${specimens.length} specimens · ${wrote} scene(s) written · ${shot} still(s) (${(bytes / 1e6).toFixed(1)}MB)`
  + `\n  catalogue → ${path.relative(repoRoot, CATALOGUE)}`
  + (stale.length ? `\n  removed ${stale.length} stale file(s)` : '')
  + (notShown.length ? `\n  text props with no specimen: ${notShown.join(', ')}` : '')
  + (miss ? `\n  ${miss} MISSING` : ''));
if (miss) process.exit(1);
