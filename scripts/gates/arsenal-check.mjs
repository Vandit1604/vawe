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
// raymarch effects and 0 of 5 playground generators (docs/MISTAKES.md #335).
//
// The cause WAS that `scripts/site/effects-catalog.mjs` imported a HAND-WRITTEN list of registries. Add
// a vocabulary to core/ and it appeared in the catalogue only if someone remembered an import line.
// `make effects-check` cannot catch that: it proves the registries the catalogue knows about are not
// stale, and has no way to know about the one it was never told about.
//
// THAT HALF IS NOW UNREPRESENTABLE, AND THIS GATE SHRANK ACCORDINGLY. A registry carries a `catalog`
// block at its definition (core/registry.js) and the catalogue reads `catalogued()` over every module
// under core/, so a registry that publishes itself needs no import line and no section tuple. What is
// left for a gate is the half that cannot be derived: a vocabulary with NO registry behind it, which
// has no definition site to hang prose on and therefore no way to announce itself.
//
// WHY NOT AUTOMATE THAT HALF TOO. Generating a section mechanically from any old export would produce a
// worse document: its value is the one-line description beside each name, which is judgement. So the
// remaining sections keep their prose, and this makes an OMISSION LOUD instead of silent. Same trade as
// `make beats`: the tool cannot look at the picture, so it checks that somebody did.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registries } from '../../core/registry.js';
// The catalogue's own family list, not its source text. A registry that publishes itself (a `catalog`
// block on its defineRegistry call) is no longer NAMED in effects-catalog.mjs at all, so grepping that
// file for its export would report every derived vocabulary as missing. Reading `sections` asks the
// stronger question anyway: not "is the word in the file" but "is this vocabulary in the document".
import { sections } from '../site/effects-catalog.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOG = 'scripts/site/effects-catalog.mjs';
// The printed line is rendered FROM the record (docs/MISTAKES.md #401): each record's `summary` already
// carries the full multi-line advice a human reads, so the custom renderer prints it verbatim.
const f = gateFindings({ line: (r) => r.summary });

// NOT A VOCABULARY. Each of these is a SCREAMING_CASE export that an author never picks from, so the
// catalogue is the wrong home for it. Named with a reason, because an unexplained waiver list becomes a
// place to hide the next real one.
const WAIVED = new Map(Object.entries({
  UNITS: 'the transition LIBRARY behind the seam runner (core/transitions/units.js): one GLSL unit per seam fx. A scene names a seam by its fx name (fade/wipe/whipPan…), and SEAM_REGISTRY in core/seams.js catalogues every one of those with its blurb. UNITS is the backing data the registry derives from, not a fifth thing to choose',
  CORE_UNITS: 'the 14 original seam units, concatenated into UNITS (core/transitions/units.js). Backing data, catalogued through SEAM_REGISTRY like the rest',
  HOUSE_UNITS: 'the hand-written vawe house-set seam units (core/transitions/units-house.js), concatenated into UNITS and catalogued through SEAM_REGISTRY. Backing data, not a separate vocabulary',
  CAPABILITIES: 'the measured table of which ANCESTOR style silently disables which DESCENDANT capability (core/ancestor-kills.js). A scene names a capability by writing `glass`/`mixBlend`/`plane`, all of which ARE catalogued; this is the interaction table behind the refusal, not a fifth thing to choose',
  IDENT: 'the identity style set a cut resets to (core/cuts.js). A reset, not an effect: the CUT vocabulary it belongs to is catalogued in full',
  PROPS: 'per-module prop declarations. Covered by schema-drift and layer-props, which check them against schema.json',
  SHARED_PROPS: 'the props every layer type inherits, a prop list, not a vocabulary',
  POSE: 'the table a motion keyframe is evaluated through (core/sequence.js): authored name to pose key to identity. An author writes `x` or `ox` on a KEY, which formats/scene/schema.json documents field by field and schema-drift checks against this table. A field list, not a vocabulary to pick a name from',
  KEYFRAME_PROPS: 'what a keyframe may carry, generated from POSE and SIDES. Same argument: it is the list schema-drift compares the schema against, not a set of names an author chooses between',
  LAYER_PROPS: 'the generated prop table behind schema-drift',
  SURFACE_PROPS: 'as LAYER_PROPS, for surfaces',
  TRACK_PROPS: 'as LAYER_PROPS, for tracks',
  FX_PARAMS: 'parameter metadata for the background presets, which ARE catalogued',
  THERMAL_REGION: 'the filter region the thermal blur needs so its tail is not clipped. A geometry constant, not something a scene can name',
  KNOBS: 'playground control metadata, not an effect a scene can name',
  SPECTACLE_KEYS: 'the four keys of the `spectacle` block (at/of/device/why). The block is documented in docs/PRIMITIVES.md and its DEVICE vocabulary IS catalogued, as "Spectacle devices"; this is the shape of the object, not a vocabulary of effects',
  DEPRECATED_FX: 'the sixteen gsap entrances that duplicate an anim exactly, mapped to their replacement. Every one is ALREADY catalogued under "GSAP named effects"; this marks which to stop using (#364)',
  DEPRECATED_EXIT: 'as DEPRECATED_FX, for the exits',

  DIRS: 'the four travel directions (left/right/up/down). A scene names one, but as the `dir` field of a '
    + 'cut or seam, and the schema carries it as an enum on both. This is the shared constant behind those, '
    + 'not a vocabulary of its own',

  JUNCTION_KINDS: 'the three joint kinds a `"cut@1"` reference may name. Each is already catalogued as its own family (Scene cuts, Seams, Shader stings). This is the GRAMMAR for pointing at one, documented in docs/PRIMITIVES.md, not a fourth vocabulary',


  KNOB_ROUTES: 'the map from a lookOpts knob to the private pass arguments it sets. The KNOBS themselves are '
    + 'catalogued in the Composite looks section and PRIMITIVES.md; this is the wiring under them, and a scene '
    + 'names a knob, never a route',
  LOOP_FX: 'the loop half of GSAP_FX, which IS catalogued. A subset named so a gate can tell an entrance from something that never settles',
  ONESHOT_FX: 'the other half of the same split',
  LOOK_BLURBS: 'the descriptions OF the looks, rendered in the catalogue beside each look. The words, not a vocabulary of their own',
  PASSES: 'the pass library behind the composite looks (core/looks/presets.js): the GLSL/canvas passes a LOOK is built from. An author names a LOOK (catalogued as Composite looks), never a raw pass. Backing data, not a vocabulary',
  PASS_READS: 'the map of which pass reads which knob (core/looks/presets.js), the wiring under the looks. A scene names a knob or a look, never this table',
  UNIFORM_FAMILIES: 'shader uniform grouping for the playground panel',
  KERNELS: 'convolution matrices behind the filter presets, which ARE catalogued',
  MECHANISMS: 'internal classification of transitions, used by the direction gate',
  FAMILIES: 'internal classification of transitions, used by the direction gate',
  BUILDERS: 'the lightfield pattern implementations behind PATTERNS, which IS catalogued',
  SLOTS: 'track slot names, internal to the track resolver',
  CANVAS_FX_PRESETS: 'preset bundles over CANVAS_FX_NAMES',
  // FOUND BY A COLLISION, not by a new export. `named()` is a bare word match over the catalogue
  // source, and the catalogue used to import `PRESETS` from core/type.js for the kinetic-preset
  // section, so core/lightfield/PRESETS was silently credited with a different file's import line.
  // The kinetic presets now write their own section and that import is gone, and the false pass went
  // with it. The waiver itself: these are full option BUNDLES for the lightfield generator, the CLI
  // and the playground starting point. A scene names the dials (PATTERNS/SHAPES/ANCHORS/…, which ARE
  // catalogued) and pastes the markup the generator emits; it never writes `preset: "colonnade"`.
  PRESETS: 'fitted option bundles for the lightfield generator (core/lightfield/presets.js), used by the CLI and as the playground start state. Its user-facing dials ARE catalogued under "Lightfield dials"',
  COMPOSITIONS: 'the implementations behind COMPOSITION_NAMES, which IS catalogued',
  CAP_STYLES: 'the implementations behind CAP_STYLE_NAMES, which IS catalogued',
  DESTINATIONS: 'the safe-area table behind DESTINATION_NAMES, which IS catalogued',
  CAMERA_MOVES: 'the move implementations behind CAMERA_MOVE_NAMES, which IS catalogued',
  LOOKS: 'the look implementations behind LOOK_NAMES, which IS catalogued',
  // A scene never names a caption SKIN: it sets `captionMode`/`captionStyle` and the skin follows from
  // that plus the destination. CAPTION_SKINS is the geometry table captionBand() measures against, so
  // there is nothing here for an author to choose. It reached main uncatalogued, which is why the gate
  // is right to have asked (docs/MISTAKES.md #409).
  CAPTION_SKINS: 'the caption geometry captionBand() measures against; a scene sets captionMode/captionStyle and the skin follows',
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
  DEFAULT_MOTION: 'the fallback motion block',
  REQUIRED: 'the theme contract keys a theme file must define, checked by the theme gate, not chosen by a scene',
  LAYER_OWNED: 'which props a layer owns versus its sequence, internal to the sequencer',
  GHOST_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  LAG_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  MATTE_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  SQUASH_KEYS: 'option keys of one fx; the fx itself is catalogued under FX_TYPES',
  WARPABLE: 'the entrances that accept the `anticipate` / `overshoot` dials. Every one of them is ALREADY catalogued, by name, under "Enter / exit anims"; this is a property of those names, not a vocabulary beside them, and the two dials are documented on the anim rows and in formats/scene/schema.json',
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
  // FOUND BY THE ARRAY-OF-OBJECTS WIDENING (see isVocabulary). Each is a table of records, which is
  // the shape RANSOM_FACES has, so the widening that found the faces found these four with it.
  RANSOM_FACES: 'the ARRAY view of the eight ransom faces. `RANSOM_REGISTRY` (core/ransom.js) is the same set as a map, carries the blurbs and writes the catalogue section, so this is one vocabulary in two shapes. The array cannot be recognised by identity: its members are `{family, weight}` records, not names, and ransomGlyph picks by index, so the order is what the array is for',
  GENERATORS: 'the ARRAY view of the ready generators. `GENERATOR_ENTRIES` is the same set as a map and IS the registry (core/generators.js), so this is one vocabulary in two shapes, not two. Identity cannot see that: the array is built by a filter and is a different object. The playground reads the array because it wants the order',
  ALL_GENERATORS: 'every generator including the ones held back. `GENERATORS` is the ready subset and it IS catalogued; a scene can only name a generator that ships',
  TRANSITIONS: 'the derived index over every transition mechanism (anim / cut / sting / seam), built from those registries at import time. Every member is catalogued in its own family; this is the join, as MECHANISMS and FAMILIES beside it',
  HONOURS: 'which lightfield pattern honours which optional dial (core/lightfield/options.js). The refusal table behind narrow(), not a set of names: a scene writes the DIAL, and the dials ARE catalogued under "Lightfield dials"',
  BANDS: 'sound. The three band splits the audio analyser measures energy in, as CUT_CUE',
  ON_INK: 'the four status fills a block puts text on, and the palette key that overrides the ink for each. A theme contract the boot writes off and the theme gate grades off; a scene names neither side of it',
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
//
// TWO SHAPES IT USED TO MISS, both widened deliberately and both measured over the whole repo first.
// A KEY MAY START WITH A DIGIT. The test was `/^[a-zA-Z][\w-]*$/`, so `ASPECTS` (core/safe.js: the
// five canvases, keyed `16:9`, `9:16`, `1:1`, ...) was not a vocabulary as far as this gate was
// concerned. That is the single most author-facing table in the engine and the gate could not see it.
// Widening the first character to include a digit, and the rest to include `:` and `.`, finds exactly
// one new export across all of core/, and it is ASPECTS.
// A VOCABULARY MAY BE A TABLE OF RECORDS. `RANSOM_FACES` (core/ransom.js) is a real set of names an
// author picks from, shaped as an array of `{family, weight}` objects, and an array branch that only
// accepted strings could not see it either. This one is the wider of the two: it finds seven exports,
// three of which are real (RANSOM_FACES, GENERATORS, ALL_GENERATORS) and four of which are tables the
// engine reads and a scene never writes, so those four are WAIVED above with their reason. Signal
// still beats noise, which is the bar; a widening that lost that argument would have been reverted.
const isVocabulary = (v) => {
  if (Array.isArray(v)) {
    if (v.length < 2) return false;
    return v.every((x) => typeof x === 'string')
      || v.every((x) => x && typeof x === 'object' && !Array.isArray(x));
  }
  if (v && typeof v === 'object') {
    const k = Object.keys(v);
    return k.length >= 2 && k.every((x) => /^[a-zA-Z0-9][\w:.-]*$/.test(x))
      && !Object.values(v).every((x) => typeof x === 'number');
  }
  return false;
};

// KEYED BY FILE AND NAME, NEVER BY NAME ALONE. These two maps were keyed by the export NAME with
// first-file-wins, and two files may export the same word: `PRESETS` is core/lightfield/presets.js
// (fitted option bundles, waived below) AND core/type.js:188 (the kinetic preset entries map behind
// PRESET_REGISTRY). Whichever `readdir` handed back first took the key and the other one did not exist
// as far as this gate was concerned, so the same collision between a registry part and a bare
// vocabulary would have LAUNDERED the bare one into the derived bucket and stopped checking it, with
// which of the two was hidden decided by directory order. Keying by `file::name` costs the count its
// tidiness (46 files export a `PROPS`, and all 46 are now counted and all 46 are waived by the one
// PROPS entry) and buys back the guarantee that no export is invisible. The waiver list and the
// catalogue test stay keyed by name on purpose: they answer "is this WORD in the document", which is
// a question about the word and not about which file it came from.
const found = new Map();      // `file::NAME` -> [file, NAME]
const exported = new Map();   // every SCREAMING_CASE export, heuristic or not
const unreadable = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const names = [...src.matchAll(/export const ([A-Z][A-Z0-9_]{2,})\s*=/g)].map((m) => m[1]);
  if (!names.length) continue;
  let mod;
  try { mod = await import(path.join(ROOT, f)); } catch { unreadable.push(f); continue; }
  for (const n of names) if (isVocabulary(mod[n])) found.set(`${f}::${n}`, [f, n]);
  // Collected WITHOUT the shape heuristic, on purpose. A registry part is known by identity, and the
  // heuristic is a guess made before identity was available: it drops an all-numeric map, so `DURATION`
  // (a word to a number of seconds) never reached the collection and its registry then looked
  // uncatalogued while the catalogue names it in full.
  for (const n of names) exported.set(`${f}::${n}`, [n, mod[n]]);
}

// ---- ONE VOCABULARY IS ONE CAPABILITY, EVEN WHEN IT IS FOUR EXPORTS --------------------------------
//
// This gate walks EXPORTS, and a vocabulary is normally exported four times: the entries map (`ANIM`),
// its name list (`ANIM_NAMES`), its descriptions (`ANIM_BLURBS`) and the registry that binds them
// (`ANIM_REGISTRY`). All four matched the shape heuristic above, so the gate reported four capabilities
// where an author can name exactly one, and the extra three were each bought off with a hand-written
// sentence. 55 of the 120 waivers were that, and every future registry would have added three more.
//
// The registry already KNOWS its own parts, so nothing here needs a naming convention: `entries` and
// `blurbs` are matched by IDENTITY, the registry object by identity, and the derived name list by value
// (`Object.keys` hands back a fresh array every time, so identity cannot reach it). A vocabulary that is
// not a registry is still reported, which is the half of this gate worth keeping: it is how a capability
// with no owner gets found.
const REGS = registries();
const sameNames = (v, names) => Array.isArray(v) && v.length === names.length
  && [...v].sort().join('\u0000') === [...names].sort().join('\u0000');
const partOfRegistry = (v) => REGS.find((r) => v === r || v === r.entries || (r.blurbs && v === r.blurbs)
  || (r.pitfalls && v === r.pitfalls) || sameNames(v, r.names));

const derived = new Map();   // `file::NAME` -> registry
for (const [key, [, value]] of exported) {
  const r = partOfRegistry(value);
  if (r) { derived.set(key, r); found.delete(key); }
}

// `--list` DUMPS THE SWEEP AND CHECKS NOTHING. Every fix to the shape heuristic here was made by
// writing a throwaway script that re-walked core/ and printed what changed, because the gate itself
// only ever printed a count. A count cannot tell you WHICH export a widening admitted, so the throwaway
// got written again for the next widening. This is that script, kept: one key per line, `file::NAME`,
// which is also the key lib-test asserts on to prove the two shapes this gate used to be blind to
// (a digit-keyed table, and two files exporting the same word) are both seen.
if (process.argv.includes('--list')) {
  for (const [key] of found) console.log(`found   ${key}`);
  for (const [key, r] of derived) console.log(`derived ${key}\t${r.kind}`);
  process.exit(0);
}

const catalog = fs.readFileSync(path.join(ROOT, CATALOG), 'utf8');
const named = (n) => new RegExp(`\\b${n}\\b`).test(catalog);
const missing = [];

// A REGISTRY IS CHECKED ONCE, THROUGH ANY OF ITS EXPORTS. The catalogue reaches a vocabulary by
// whichever export reads best at the call site (`Object.keys(PRESETS)` here, `IDLE_REGISTRY.names`
// there), and which one it picked is not a fact worth having an opinion about. A registry no export of
// which is named is a capability with no way in, and NO WAIVER IS ACCEPTED for one: a registry exists
// precisely so an author can name the thing, so "an author never picks from this" cannot be true of it.
const IN_CATALOGUE = new Set(sections.map(([, , , , meta]) => meta && meta.reg).filter(Boolean));
const byReg = new Map();
for (const [key, r] of derived) (byReg.get(r) || byReg.set(r, []).get(r)).push(key.split('::').pop());
for (const [r, names] of byReg) {
  if (IN_CATALOGUE.has(r)) continue;   // it wrote its own section, from its own definition site
  if (names.some(named)) continue;     // an older vocabulary the catalogue still lists by export name
  missing.push([`${r.kind} (${names.join(' / ')})`,
    'a registry with no `catalog` block: add one to its defineRegistry call']);
}

for (const [, [file, name]] of found) {
  if (WAIVED.has(name)) continue;
  if (named(name)) continue;
  missing.push([name, file]);
}

// A WAIVER FOR SOMETHING NO LONGER FOUND IS A LIE THE NEXT READER INHERITS. The list is the record of
// what was deliberately left out, so an entry that no longer matches anything makes it a worse record
// every time it is skipped in silence.
const foundNames = new Set([...found.values()].map(([, n]) => n));
const dead = [...WAIVED.keys()].filter((n) => !foundNames.has(n));
if (dead.length) {
  console.log(`\n  ~ ${dead.length} waiver(s) no longer match any export the walk finds. Most will be`);
  console.log('    registry parts, which are now recognised by identity and need no waiver:');
  console.log(`      ${dead.join(', ')}`);
}

const waived = [...found.values()].filter(([, n]) => WAIVED.has(n)).length;
const covered = found.size - waived - missing.length;
console.log(`\n  arsenal · ${files.length} source file(s) walked · ${found.size + derived.size} vocabular(ies) found`);
console.log(`    ${derived.size} are the entries, names, blurbs or object of ${new Set(derived.values()).size} registr(ies), counted once each`);
console.log(`    ${found.size} are not a registry: ${waived} waived · ${covered} in the catalogue`);

// ---- THE RATCHET: `covered` MAY FALL AND MAY NEVER RISE ------------------------------------------
//
// `covered` is the count of real capabilities that are catalogued BY HAND, because they are not
// registries. Every one of them is a section somebody has to remember to write, keep, and keep keyed to
// a slug of its own title, and that is the coupling `defineRegistry({ catalog })` was built to end: a
// registry publishes its own section, so the correct thing costs one edit instead of four.
//
// This gate's own job has been shrinking all along and nothing said so. Most of what it used to check
// is now structural and cannot be reached from here: a half-written catalog block throws at LOAD
// (`checkCatalog`), a blurb that restates its own name is refused at LOAD (`checkBlurb`), and a dial
// whose default contradicts its signature throws at LOAD (`bindDials`). What is LEFT is the one question
// no derivation can answer, because it is a decision rather than a fact: **is this thing a capability,
// and did you give it a registry?**
//
// So the number is ratcheted rather than gated at zero. Zero is not reachable today and pretending
// otherwise would make this a rule people turn off: three registries deliberately have no catalog block
// (feel, duration and camera words merge into one "Plain words" table), and several sections have no
// registry behind them at all yet. A ratchet says the only allowed direction, which is the true rule.
//
// Lower it deliberately with --stamp, never to quiet a complaint. That is `make legacy STAMP=1`'s
// argument, in the gate one directory over.
{
  const RATCHET = path.join(ROOT, 'verify/arsenal-ratchet.json');
  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ handCatalogued: covered }, null, 1)}\n`);
    console.log(`    ✓ ratchet stamped at ${covered} hand-catalogued capabilit(ies)`
      + `${prior ? `, down from ${prior.handCatalogued}` : ''}`);
  } else if (prior && covered > prior.handCatalogued) {
    f.fail('arsenal-ratchet',
      `${covered} capabilit(ies) are catalogued by hand, up from ${prior.handCatalogued}. ` +
      'A capability that is not a registry needs a section, a usage form and a preview written ' +
      'for it, in three files, keyed by a slug of its own title. Give it a registry with a ' +
      '`catalog` block instead and it publishes all three itself, from one edit. ' +
      'If it genuinely cannot be a registry, lower the bar on purpose: ' +
      'node scripts/gates/arsenal-check.mjs --stamp');
    f.emit();
    process.exit(1);
  } else if (prior && covered < prior.handCatalogued) {
    console.log(`    ~ ${prior.handCatalogued - covered} fewer hand-catalogued than the ratchet allows.`
      + ' Lower it: node scripts/gates/arsenal-check.mjs --stamp');
  }
}
// ---- THE SECOND RATCHET: `bare` MAY FALL AND MAY NEVER RISE --------------------------------------
//
// An entry with no blurb is findable only by its exact name, which means only by someone who already
// knows it. That is the discovery problem in one line, and it was 131 entries across eight registries
// until it was measured: `make arsenal Q="slow down at the end"`, `Q="a film burn between two shots"`
// and `Q="make the camera move closer"` all answered NOTHING HERE CLEARLY MATCHES for capabilities the
// engine has. `sharp`, `burn` and `push in` were all sitting there unblurbed. A search that reports
// ABSENT about something present is worse than one that stays quiet, because it ends the looking.
//
// Ratcheted rather than gated at zero for one honest reason: the 42 EASINGS deliberately carry none.
// That decision is written at EASING_REGISTRY in core/motion.js, 41 near-identical sentences about
// acceleration being worse than one feel table, and it only holds because the FEEL words now carry the
// plain English an author would actually type. Zero is therefore not the target; not-more is.
{
  const RATCHET = path.join(ROOT, 'verify/blurb-ratchet.json');
  const bare = [];
  for (const reg of Object.values(REGS)) {
    const names = Object.keys(reg.entries || {});
    const b = reg.blurbs || {};
    for (const n of names) if (!b[n]) bare.push(`${reg.kind}:${n}`);
  }
  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    // THE LIST, NOT ONLY THE COUNT. A count can say a rule was broken; only the list can say WHICH entry
    // broke it. The first version stored the number, so removing `shield`'s blurb reported "43, up from
    // 42" and then printed eight easings, none of which had changed. A gate that cannot name its own
    // finding sends the reader to look through 591 entries by hand.
    fs.writeFileSync(RATCHET, `${JSON.stringify({ unblurbed: bare.length, entries: bare.sort() }, null, 1)}\n`);
    console.log(`    ✓ blurb ratchet stamped at ${bare.length} unblurbed entr(ies)`
      + `${prior ? `, down from ${prior.unblurbed}` : ''}`);
  } else if (prior && bare.length > prior.unblurbed) {
    const known = new Set(prior.entries || []);
    const fresh = bare.filter((n) => !known.has(n));
    f.fail('blurb-ratchet',
      `${bare.length} registry entr(ies) have no blurb, up from ${prior.unblurbed}. ` +
      `new since the ratchet: ${(fresh.length ? fresh : bare).slice(0, 8).join(' ')}` +
      `${(fresh.length ? fresh : bare).length > 8 ? ' …' : ''} ` +
      'Without a blurb an entry is findable only by someone who already knows its name, ' +
      'so `make arsenal Q="..."` will report it ABSENT. Write one where the entry is: ' +
      'blurbs: { <name>: "what it does, in one line" }  beside the defineRegistry call. ' +
      'If it genuinely should carry none, lower the bar on purpose: ' +
      'node scripts/gates/arsenal-check.mjs --stamp');
    f.emit();
    process.exit(1);
  } else if (prior && bare.length < prior.unblurbed) {
    console.log(`    ~ ${prior.unblurbed - bare.length} fewer unblurbed than the ratchet allows.`
      + ' Lower it: node scripts/gates/arsenal-check.mjs --stamp');
  } else if (!prior) {
    console.log(`    ~ ${bare.length} unblurbed entr(ies), no ratchet yet. Stamp it: --stamp`);
  }
}

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
  f.emit();
  process.exit(0);
}
for (const [name, file] of missing) f.fail('arsenal-missing', `${name.padEnd(22)} ${file}`, {
  fix: 'a REGISTRY writes its own section: give its defineRegistry call a `catalog` block '
    + '(title / tag / intro / usage / preview or noPreview, core/registry.js) and run `make effects`. '
    + `Anything else adds a section to ${CATALOG}, or is waived in this file WITH A REASON if it is `
    + 'not something a scene can name',
  doc: 'docs/EFFECTS.md',
});
console.error(`\n  ✗ ${missing.length} capabilit(ies) the engine offers and the catalogue never mentions:\n`);
f.emit();
console.error(`\n  An author told to "see the whole arsenal, then choose" cannot choose these.\n`);
process.exit(1);
