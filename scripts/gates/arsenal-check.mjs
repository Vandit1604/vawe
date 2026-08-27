// scripts/gates/arsenal-check.mjs: is every capability the engine offers actually IN the catalogue
// an author is told to read?
//
//   node scripts/gates/arsenal-check.mjs
//
// WHY THIS EXISTS. CLAUDE.md step 0a says "see the whole arsenal, then choose: make effects →
// docs/EFFECTS.md". A film was authored around a hand-built SVG chart while `core/three-fx.js` sat in
// the repo with a full three.js scene-graph layer, a written determinism contract and four registered
// scenes. The author had not read the arsenal doc, which is one failure. The doc did not contain three
// either, which is the one worth fixing: 0 of 4 THREE_FX scenes were named in it, along with 0 of 5
// raymarch effects and 0 of 5 playground generators (docs/MISTAKES.md #321).
//
// The cause is that `scripts/site/effects-catalog.mjs` imports a HAND-WRITTEN list of registries. Add a
// vocabulary to core/ and it appears in the catalogue only if someone remembers to add an import line.
// `make effects-check` cannot catch that: it proves the registries the catalogue knows about are not
// stale, and has no way to know about the one it was never told about.
//
// WHY THIS IS A GATE AND NOT MORE AUTOMATION. Generating the catalogue mechanically from every export
// would produce a worse document: its value is the one-line description beside each name, which is
// judgement and not derivable. So the catalogue keeps its prose, and this makes an OMISSION LOUD
// instead of silent. That is the same trade as `make beats`: the tool cannot look at the picture, so it
// checks that somebody did.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOG = 'scripts/site/effects-catalog.mjs';

// NOT A VOCABULARY. Each of these is a SCREAMING_CASE export that an author never picks from, so the
// catalogue is the wrong home for it. Named with a reason, because an unexplained waiver list becomes a
// place to hide the next real one.
const WAIVED = new Map(Object.entries({
  PROPS: 'per-module prop declarations. Covered by schema-drift and layer-props, which check them against schema.json',
  SHARED_PROPS: 'the props every layer type inherits, a prop list, not a vocabulary',
  LAYER_PROPS: 'the generated prop table behind schema-drift',
  SURFACE_PROPS: 'as LAYER_PROPS, for surfaces',
  TRACK_PROPS: 'as LAYER_PROPS, for tracks',
  FX_PARAMS: 'parameter metadata for the background presets, which ARE catalogued',
  KNOBS: 'playground control metadata, not an effect a scene can name',
  SPECTACLE_KEYS: 'the four keys of the `spectacle` block (at/of/device/why). The block is documented in docs/PRIMITIVES.md and its DEVICE vocabulary IS catalogued, as "Spectacle devices"; this is the shape of the object, not a vocabulary of effects',
  DEPRECATED_FX: 'the sixteen gsap entrances that duplicate an anim exactly, mapped to their replacement. Every one is ALREADY catalogued under "GSAP named effects"; this marks which to stop using (#364)',
  DEPRECATED_EXIT: 'as DEPRECATED_FX, for the exits',

  ICON_REGISTRY: 'the registry object wrapping ICONS, which IS catalogued as "Drawn icons"',
  ICON_NAMES: 'the same list the Drawn icons section already renders from ICONS',
  DIRS: 'the four travel directions (left/right/up/down). A scene names one, but as the `dir` field of a '
    + 'cut or seam, and the schema carries it as an enum on both. This is the shared constant behind those, '
    + 'not a vocabulary of its own',

  JUNCTION_KINDS: 'the three joint kinds a `"cut@1"` reference may name. Each is already catalogued as its own family (Scene cuts, Seams, Shader stings). This is the GRAMMAR for pointing at one, documented in docs/PRIMITIVES.md, not a fourth vocabulary',
  ANIM_REGISTRY: 'the registry OBJECT wrapping ANIM, which is catalogued as "Enter / exit anims". A scene names an anim, never a registry',
  BG_REGISTRY: 'as ANIM_REGISTRY, for BG_NAMES ("Backgrounds")',
  SEAM_REGISTRY: 'as ANIM_REGISTRY, for SEAM_FX ("Seams")',
  SHADER_REGISTRY: 'as ANIM_REGISTRY, for SHADER_FX ("Shader stings")',
  CANVAS_REGISTRY: 'as ANIM_REGISTRY, for CANVAS_FX_NAMES ("Canvas image passes")',
  PAINT_REGISTRY: 'as ANIM_REGISTRY, for PAINT_FX_NAMES ("Generative paint FX")',
  RAYMARCH_REGISTRY: 'as ANIM_REGISTRY, for RAYMARCH_FX ("Raymarched surfaces")',
  AMBIENT_REGISTRY: 'as ANIM_REGISTRY, for AMBIENT_FX ("Ambient shader fields")',
  THREE_REGISTRY: 'as ANIM_REGISTRY, for THREE_FX ("three.js scenes")',
  CAMERA_REGISTRY: 'as ANIM_REGISTRY, for CAMERA_MOVE_NAMES ("Camera moves")',
  FEEL_REGISTRY: 'as ANIM_REGISTRY, for FEEL. The words themselves ARE catalogued under "Plain words", and in full in docs/CRAFT/VOCABULARY.md',
  DURATION_REGISTRY: 'as FEEL_REGISTRY, for DURATION',
  CAMERA_WORD_REGISTRY: 'as FEEL_REGISTRY, for CAMERA_WORDS',
  okDir: 'the direction guard seams shares with core/cuts.js DIRS; a scene names a direction, not a guard',

  CUT_REGISTRY: 'as ANIM_REGISTRY, for PRESENTATIONS ("Scene cuts")',
  TIMING_REGISTRY: 'as ANIM_REGISTRY, for TIMINGS. The cut timing curve, catalogued with the cuts',
  GSAP_REGISTRY: 'as ANIM_REGISTRY, for GSAP_FX ("GSAP named effects")',
  GSAP_EXIT_REGISTRY: 'as ANIM_REGISTRY, for EXIT_FX ("GSAP exits")',
  PRESET_REGISTRY: 'as ANIM_REGISTRY, for PRESETS ("Kinetic text presets")',
  PARTS: 'the raw [setup, from, to] tuples behind the part entrances, which ARE catalogued by name',
  PART_BLURBS: 'the blurb map the Part entrances section renders',
  PART_REGISTRY: 'the registry object; PART_NAMES is what the catalogue lists',

  KNOB_ROUTES: 'the map from a lookOpts knob to the private pass arguments it sets. The KNOBS themselves are '
    + 'catalogued in the Composite looks section and PRIMITIVES.md; this is the wiring under them, and a scene '
    + 'names a knob, never a route',
  LOOP_FX: 'the loop half of GSAP_FX, which IS catalogued. A subset named so a gate can tell an entrance from something that never settles',
  ONESHOT_FX: 'the other half of the same split',
  LOOK_BLURBS: 'the descriptions OF the looks, rendered in the catalogue beside each look. The words, not a vocabulary of their own',
  PRESET_BLURBS: 'as LOOK_BLURBS, for kinetic presets',
  ANIM_BLURBS: 'as LOOK_BLURBS, for enter/exit anims',
  CUT_BLURBS: 'as LOOK_BLURBS, for scene cuts',
  SEAM_BLURBS: 'as LOOK_BLURBS, for seams',
  FX_BLURBS: 'as LOOK_BLURBS, for per-layer modifiers',
  GSAP_BLURBS: 'as LOOK_BLURBS, for GSAP named effects',
  GSAP_EXIT_BLURBS: 'as LOOK_BLURBS, for GSAP exits',
  BEAT_BLURBS: 'as LOOK_BLURBS, scraped from the blueprint registry\'s own trailing comments',
  UNIFORM_FAMILIES: 'shader uniform grouping for the playground panel',
  KERNELS: 'convolution matrices behind the filter presets, which ARE catalogued',
  TIMINGS: 'cut duration constants',
  MECHANISMS: 'internal classification of transitions, used by the direction gate',
  FAMILIES: 'internal classification of transitions, used by the direction gate',
  HONOURS: 'which lightfield options each pattern reads, drives narrow(), not an author choice',
  BUILDERS: 'the lightfield pattern implementations behind PATTERNS, which IS catalogued',
  SLOTS: 'track slot names, internal to the track resolver',
  FPS: 'the frame rate constant',
  CANVAS_FX: 'the implementations behind CANVAS_FX_NAMES, which IS catalogued',
  CANVAS_FX_PRESETS: 'preset bundles over CANVAS_FX_NAMES',
  ALL_GENERATORS: 'includes generators held back from the library; GENERATORS is the catalogued list',
  COMPOSITIONS: 'the implementations behind COMPOSITION_NAMES, which IS catalogued',
  CAP_STYLES: 'the implementations behind CAP_STYLE_NAMES, which IS catalogued',
  DESTINATIONS: 'the safe-area table behind DESTINATION_NAMES, which IS catalogued',
  BANDS: 'a single generator definition, reached through GENERATORS',
  THREE_FX_PROPS: 'prop declaration',
  CAMERA_MOVES: 'the move implementations behind CAMERA_MOVE_NAMES, which IS catalogued',
  LOOKS: 'the look implementations behind LOOK_NAMES, which IS catalogued',
  PAINT_FX: 'the implementations behind PAINT_FX_NAMES, which IS catalogued',
  ANIM: 'the anim implementations behind ANIM_NAMES, which IS catalogued',
  IDLE: 'the idle generators behind IDLE_NAMES, which IS catalogued',
  IDLE_REGISTRY: 'as IDLE. The registry object, not a name a scene can write',
  // A scene never names a caption SKIN: it sets `captionMode`/`captionStyle` and the skin follows from
  // that plus the destination. CAPTION_SKINS is the geometry table captionBand() measures against, so
  // there is nothing here for an author to choose. It reached main uncatalogued, which is why the gate
  // is right to have asked (docs/MISTAKES.md #392).
  CAPTION_SKINS: 'the caption geometry captionBand() measures against; a scene sets captionMode/captionStyle and the skin follows',
  CAPTION_LINES: 'as CAPTION_SKINS, how many lines the band reserves, not a name a scene can write',
  // A scene names a caption STYLE and the shape follows it. CAP_STYLE_SHAPE is how the RENDERER
  // treats that style (one word on screen, or split per character); an author never writes it and
  // could not use it if they did. The fact it carries IS catalogued, in the place an author actually
  // reads: every shaped style says so in its own CAPTION_BLURBS line, which is the row `make effects`
  // prints. A second entry naming the mechanism would be the same fact filed under a word nobody
  // searches for.
  CAP_STYLE_SHAPE: 'how the renderer treats a style (one-word / per-character); the scene names the STYLE, and each shaped style says so in its own blurb',
  // A scene names a BEAT, and every beat is already catalogued by `make blueprints`. REQUESTS is the
  // prose sentence for asking for one in a STORYBOARD, which is a plan and not a scene, so there is
  // nothing here for a scene to write. It is surfaced where it is used: `make blueprints` prints an
  // `ask:` line per beat and refuses to run if any beat lacks one.
  REQUESTS: 'the plain-language ask line per beat, printed by `make blueprints`; a storyboard names it, a scene never does',
  PAL: 'the colour tables the background presets draw from, and those ARE catalogued',
  PAL_PLINTH: 'as PAL, for one brand',
  SCHEMA: 'the lightfield option schema. It drives narrow() and the playground panel; its user-facing dials are PATTERNS/SHAPES/ANCHORS/DIRECTIONS/MOTIONS, which ARE catalogued',
  RAMP: 'the lightfield bloom falloff constants',
  DEFAULT_MOTION: 'the fallback motion block',
  REQUIRED: 'the theme contract keys a theme file must define, checked by the theme gate, not chosen by a scene',
  ORDER: 'track resolution order',
  LAYER_OWNED: 'which props a layer owns versus its sequence, internal to the sequencer',
  DENSE_KEY_SEC: 'a density threshold constant',
  GHOST_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  // Not a vocabulary a scene can name: it is the set of props whose PRESENCE makes preload fetch
  // GSAP. It is exported only so lib-test can re-derive it and refuse to drift (#467, and #148
  // is what drift cost last time). An author never writes GSAP_PROPS; they write `fx` or `parts`,
  // and those are catalogued where they belong.
  GSAP_PROPS: 'the props that trigger the GSAP fetch; exported for the lockstep guard, not nameable in a scene',
  KICK_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  KICK_KINDS: 'option values of one fx; the fx itself is catalogued under FX_TYPES',
  OCCLUDE_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  PLANE_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  PROGRESS_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  SHADOW_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  TILT_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  CUT_CUE: 'sound. The catalogue is picture; the sound vocabulary is documented in docs/CRAFT/SOUND.md and graded by make audio-check',
  SEAM_CUE: 'sound, as CUT_CUE',
  CUES: 'sound, as CUT_CUE',
  PROFILE_BED: 'sound, as CUT_CUE',
  TRANSITIONS: 'the transition implementations behind PRESENTATIONS, which IS catalogued',
  SURFACE_TYPES: 'the surfaces behind the layer types, which ARE catalogued via LAYER_TYPES',
  TRACK_TYPES: 'the track vocabulary, documented with the tracks in docs/PRIMITIVES.md rather than as an effect',
}));

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) files.push(p);
  }
};
walk('core');
if (fs.existsSync(path.join(ROOT, 'blueprints/index.mjs'))) files.push('blueprints/index.mjs');

// WHAT COUNTS AS A VOCABULARY IS DECIDED BY THE VALUE, NOT THE NAME. The first version matched every
// SCREAMING_CASE export and flagged 55 things, most of them constants: TAU, BAYER4, MARGIN, a palette
// of hex strings. A gate that cries about `TAU` teaches people to skim its output, and then it stops
// working for the case it was written for.
//
// A vocabulary is a set of NAMES A SCENE CAN WRITE. In practice that is an array of two or more
// strings, or an object keyed by those names. A number, a matrix of numbers, or a bag of numeric
// constants is not something an author picks from.
const isVocabulary = (v) => {
  if (Array.isArray(v)) return v.length >= 2 && v.every((x) => typeof x === 'string');
  if (v && typeof v === 'object') {
    const k = Object.keys(v);
    return k.length >= 2 && k.every((x) => /^[a-zA-Z][\w-]*$/.test(x))
      && !Object.values(v).every((x) => typeof x === 'number');
  }
  return false;
};

const found = new Map();
const unreadable = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const names = [...src.matchAll(/export const ([A-Z][A-Z0-9_]{2,})\s*=/g)].map((m) => m[1]);
  if (!names.length) continue;
  let mod;
  try { mod = await import(path.join(ROOT, f)); } catch { unreadable.push(f); continue; }
  for (const n of names) if (isVocabulary(mod[n]) && !found.has(n)) found.set(n, f);
}

const catalog = fs.readFileSync(path.join(ROOT, CATALOG), 'utf8');
const missing = [];
for (const [name, file] of found) {
  if (WAIVED.has(name)) continue;
  if (new RegExp(`\\b${name}\\b`).test(catalog)) continue;
  missing.push([name, file]);
}

const covered = found.size - WAIVED.size - missing.length;
console.log(`\n  arsenal · ${files.length} source file(s) walked · ${found.size} vocabular(ies) found · ${WAIVED.size} waived · ${covered} in the catalogue`);
// A SWEEP THAT SAW NOTHING MUST NOT PRINT A TICK. `walk('core')` is a bare readdir, so a moved or empty
// core/ produced `0 vocabular(ies) found` and then `✓ every capability the engine exports is named`.
if (!found.size) {
  console.error(`\n  ✗ arsenal found NO vocabularies at all across ${files.length} file(s) under core/.`);
  console.error(`    The engine cannot have none, so this gate did not see its subject. Nothing below was checked.\n`);
  process.exit(3);
}
// A module this gate cannot import is a hole in it, and a hole nobody is told about is how the last
// one happened. Browser-only modules are expected here; the list being non-empty is not a failure, the
// list being INVISIBLE would be.
if (unreadable.length) console.log(`  ~ ${unreadable.length} module(s) could not be imported in node, so their exports are unchecked: ${unreadable.join(', ')}`);

if (!missing.length) {
  console.log(`  ✓ every capability the engine exports is named in docs/EFFECTS.md\n`);
  process.exit(0);
}
console.error(`\n  ✗ ${missing.length} capabilit(ies) the engine offers and the catalogue never mentions:\n`);
for (const [name, file] of missing) console.error(`     ${name.padEnd(22)} ${file}`);
console.error(`\n  An author told to "see the whole arsenal, then choose" cannot choose these. Either add a`);
console.error(`  section for it to ${CATALOG} and run \`make effects\`, or waive it in`);
console.error(`  this file WITH A REASON if it is not something a scene can name.\n`);
process.exit(1);
