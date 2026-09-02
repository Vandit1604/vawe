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
import { registries } from '../../core/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOG = 'scripts/site/effects-catalog.mjs';

// NOT A VOCABULARY. Each of these is a SCREAMING_CASE export that an author never picks from, so the
// catalogue is the wrong home for it. Named with a reason, because an unexplained waiver list becomes a
// place to hide the next real one.
const WAIVED = new Map(Object.entries({
  CAPABILITIES: 'the measured table of which ANCESTOR style silently disables which DESCENDANT capability (core/ancestor-kills.js). A scene names a capability by writing `glass`/`mixBlend`/`plane`, all of which ARE catalogued; this is the interaction table behind the refusal, not a fifth thing to choose',
  IDENT: 'the identity style set a cut resets to (core/cuts.js). A reset, not an effect: the CUT vocabulary it belongs to is catalogued in full',
  PROPS: 'per-module prop declarations. Covered by schema-drift and layer-props, which check them against schema.json',
  SHARED_PROPS: 'the props every layer type inherits, a prop list, not a vocabulary',
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
  UNIFORM_FAMILIES: 'shader uniform grouping for the playground panel',
  KERNELS: 'convolution matrices behind the filter presets, which ARE catalogued',
  MECHANISMS: 'internal classification of transitions, used by the direction gate',
  FAMILIES: 'internal classification of transitions, used by the direction gate',
  BUILDERS: 'the lightfield pattern implementations behind PATTERNS, which IS catalogued',
  SLOTS: 'track slot names, internal to the track resolver',
  CANVAS_FX_PRESETS: 'preset bundles over CANVAS_FX_NAMES',
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
const exported = new Map();   // every SCREAMING_CASE export, heuristic or not
const unreadable = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const names = [...src.matchAll(/export const ([A-Z][A-Z0-9_]{2,})\s*=/g)].map((m) => m[1]);
  if (!names.length) continue;
  let mod;
  try { mod = await import(path.join(ROOT, f)); } catch { unreadable.push(f); continue; }
  for (const n of names) if (isVocabulary(mod[n]) && !found.has(n)) found.set(n, f);
  // Collected WITHOUT the shape heuristic, on purpose. A registry part is known by identity, and the
  // heuristic is a guess made before identity was available: it drops an all-numeric map, so `DURATION`
  // (a word to a number of seconds) never reached the collection and its registry then looked
  // uncatalogued while the catalogue names it in full.
  for (const n of names) if (!exported.has(n)) exported.set(n, [f, mod[n]]);
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
  || sameNames(v, r.names));

const derived = new Map();
for (const [name, [, value]] of exported) {
  const r = partOfRegistry(value);
  if (r) { derived.set(name, r); found.delete(name); }
}

const catalog = fs.readFileSync(path.join(ROOT, CATALOG), 'utf8');
const named = (n) => new RegExp(`\\b${n}\\b`).test(catalog);
const missing = [];

// A REGISTRY IS CHECKED ONCE, THROUGH ANY OF ITS EXPORTS. The catalogue reaches a vocabulary by
// whichever export reads best at the call site (`Object.keys(PRESETS)` here, `IDLE_REGISTRY.names`
// there), and which one it picked is not a fact worth having an opinion about. A registry no export of
// which is named is a capability with no way in, and NO WAIVER IS ACCEPTED for one: a registry exists
// precisely so an author can name the thing, so "an author never picks from this" cannot be true of it.
const byReg = new Map();
for (const [name, r] of derived) (byReg.get(r) || byReg.set(r, []).get(r)).push(name);
for (const [r, names] of byReg) {
  if (names.some(named)) continue;
  missing.push([`${r.kind} (${names.join(' / ')})`, `${names.length} export(s), no catalogue section`]);
}

for (const [name, file] of found) {
  if (WAIVED.has(name)) continue;
  if (named(name)) continue;
  missing.push([name, file]);
}

// A WAIVER FOR SOMETHING NO LONGER FOUND IS A LIE THE NEXT READER INHERITS. The list is the record of
// what was deliberately left out, so an entry that no longer matches anything makes it a worse record
// every time it is skipped in silence.
const dead = [...WAIVED.keys()].filter((n) => !found.has(n));
if (dead.length) {
  console.log(`\n  ~ ${dead.length} waiver(s) no longer match any export the walk finds. Most will be`);
  console.log('    registry parts, which are now recognised by identity and need no waiver:');
  console.log(`      ${dead.join(', ')}`);
}

const covered = found.size - [...WAIVED.keys()].filter((n) => found.has(n)).length - missing.length;
console.log(`\n  arsenal · ${files.length} source file(s) walked · ${found.size + derived.size} vocabular(ies) found`);
console.log(`    ${derived.size} are the entries, names, blurbs or object of ${new Set(derived.values()).size} registr(ies), counted once each`);
console.log(`    ${found.size} are not a registry: ${[...WAIVED.keys()].filter((n) => found.has(n)).length} waived · ${covered} in the catalogue`);
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
