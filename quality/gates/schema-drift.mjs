// schema-drift.mjs: keep the DATA CONTRACT honest. The engine (scene.html) reads layer props as
// `L.<prop>` / `C.<prop>`; the schema (schema.json) is what validate knows about. When a new
// primitive ships a prop that never gets registered (e.g. `motion` did), validation silently passes and
// it drifts. This asserts every prop the engine reads is defined somewhere in the schema.
//
//   node quality/gates/schema-drift.mjs            (make schema-check), exits 1 on drift
//   node quality/gates/schema-drift.mjs --write    (make schema-write) regenerate EVERY derived part,
//                                                  layerProps AND the registry-owned enums, then
//                                                  re-run with no flag to verify. A write that would
//                                                  DROP a prop name is refused; --force overrides.
//
// THE PER-LAYER VOCABULARY IS GENERATED, NOT MAINTAINED. `schema.layerProps` is written by this file
// from the PROPS declarations (core/registry/props.js) and checked in; the gate fails when the committed block
// differs from what the declarations produce. It is TYPE-SCOPED, and that is the whole point: this
// gate used to answer "is this prop in the schema?" by NAME over the flat `layers.item` map, so `src`
// on an `html` layer was indistinguishable from `src` on an `image` layer and a third meaning would
// have passed in silence. A name is not a fact about a layer; a name on a type is.
import fs from 'node:fs';
import { ANIM_NAMES } from '../../core/timeline/clips.js';
import { KEYFRAME_PROPS } from '../../core/timeline/sequence.js';
import { PRESET_REGISTRY } from '../../core/type/type.js';
import { GLOW_REGISTRY } from '../../core/layers/glow.js';
import { PARTICLES_REGISTRY } from '../../core/surfaces/particles.js';
import { AMBIENT_FX } from '../../core/surfaces/shaders-ambient.js';
import { PAINT_FX_NAMES } from '../../core/surfaces/paint-fx.js';
import { RESAMPLE_FX } from '../../core/resample/effects.js';
import { RAYMARCH_FX } from '../../core/surfaces/raymarch-fx.js';
import { THREE_FX } from '../../core/surfaces/three-scenes.js';
import { LAYER_TYPES, LAYER_PROPS } from '../../core/layers/index.js';
import { SHARED_PROPS } from '../../core/layers/vocabulary.js';
import { FX_TYPES } from '../../core/fx/index.js';
import { BLEND_MODES } from '../../core/fx/mix-blend.js';
import { ADJUST_REGISTRY } from '../../core/layers/adjust.js';
import { PRESENTATIONS, TIMINGS } from '../../core/cuts/index.js';
import { SHADER_FX } from '../../core/stings/index.js';
import { SEAM_FX } from '../../core/timeline/seams.js';
import { SPECTACLE_DEVICES } from '../../core/registry/knobs.js';
import { BG_NAMES } from '../../core/backgrounds/index.js';
import { CAP_STYLE_NAMES } from '../../core/type/captions.js';
import { PLACEMENT_REGISTRY } from '../../core/layout/safe.js';
import path from 'node:path';
import { gateFindings } from '../../harness/lib/findings.mjs';

// One record per drift check, rendered verbatim (each summary already carries the full multi-line
// report a human reads, same shape discovery.mjs uses). `--write` is a generator, not a report, and
// stays untouched below; only the four checks that can fail with `bad code left in schema.json` route
// through here, so `--json` finally gets a real payload instead of silently doing nothing.
const f = gateFindings({ line: (r) => r.summary });

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
// THE ENGINE IS EVERY FILE THAT READS A LAYER PROP, and that list is derived rather than remembered.
// It was `scene.html` + `core/layers/*.js`, written when scene.html WAS the orchestrator. scene.html
// is now a 20-line shell that imports scene.js, and it contains zero `L.` reads, so for as long as
// that split has existed, every prop read only by the orchestrator (cut · vars · react · motionBlur ·
// borderTrail · circle · becomes · panWith …) was outside the check, and the gate reported green over
// the blind spot (docs/MISTAKES.md #235).
//
// So the scan is the orchestrator plus the four REGISTRY DIRECTORIES, each walked whole: a layer prop
// is read by the thing that DRAWS a layer (core/layers, and core/surfaces for the four types whose
// output is a canvas), the thing that MODIFIES one (core/fx) or the pipeline that COMPOSES one per
// frame (core/tracks), and each of those is one file per entry in a directory, so a walk cannot go
// stale the way a hand-written file list did.
//
// Deliberately not all of core/: `L` is a local name elsewhere (core/audio-kit.mjs builds a synth voice
// from an `L` carrying attack/decay/waveform), and a gate widened until it invents findings is worse
// than the gap it closed.
const engineFiles = [path.join(ROOT, 'formats/scene/scene.html'), path.join(ROOT, 'formats/scene/scene.js')];
for (const dir of ['core/layers', 'core/surfaces', 'core/fx', 'core/tracks'])
  for (const f of fs.readdirSync(path.join(ROOT, dir)))
    if (f.endsWith('.js')) engineFiles.push(path.join(ROOT, dir, f));
const engineSrc = engineFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const SCHEMA_PATH = path.join(ROOT, 'formats/scene/schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// ---------- THE DERIVED PER-LAYER VOCABULARY (generated -> checked in -> verified) ----------
//
// Two halves, kept apart because they are different facts. `byType` is what ONE primitive reads and
// nothing else does; `shared` is what every layer carries whatever its type. Names only: the guards
// (`preset` needs `split`) stay live in the declarations, where `make layer-props` reads them, because
// a guard is a question about one layer's other props and a static vocabulary cannot answer it.
const vocabulary = {
  _generated: 'node quality/gates/schema-drift.mjs --write - do not hand-edit',
  _source: 'the PROPS declarations beside each read (core/registry/props.js - core/layers/vocabulary.js)',
  shared: Object.keys(SHARED_PROPS).sort(),
  byType: Object.fromEntries(LAYER_TYPES.map((t) => [t, Object.keys(LAYER_PROPS[t]).sort()])),
};

// ONE NAME PER LINE, at the indentation the file already uses. This function used to emit each array
// on a single line, which is not a formatting preference: schema.json is committed one-name-per-line,
// so every `--write` reflowed a 451-line block into 6 and `git diff --stat` reported ~445 deletions for
// a one-prop change. A reviewer read that as "the shared array was deleted" and it was not, the data
// round-tripped identical (docs/MISTAKES.md #564). A generated block whose diff is unreadable cannot be
// reviewed, and an unreviewable diff is how a real deletion would hide.
//
// THE INDENT IS READ OFF THE FILE, not assumed. It was hardcoded to two spaces here and in the splice
// regex below, and formats/scene/schema.json is written with ONE, so the anchor never matched: `--write`
// found no block, fell through to the "no `fields` anchor" branch and exited 2 without writing the
// layerProps block OR the registry-owned enums. The command CLAUDE.md names as the way to regenerate the
// schema could not regenerate it, and the only symptom was an error message about a different anchor.
function renderVocabulary(v, pad = '  ') {
  const p2 = pad.repeat(2), p3 = pad.repeat(3);
  const arr = (a, ind) => a.length
    ? `[\n${a.map((x) => ind + pad + JSON.stringify(x)).join(',\n')}\n${ind}]`
    : '[]';
  const types = Object.entries(v.byType).map(([t, ps]) => `${p3}${JSON.stringify(t)}: ${arr(ps, p3)}`);
  return `${pad}"layerProps": {\n`
    + `${p2}"_generated": ${JSON.stringify(v._generated)},\n`
    + `${p2}"_source": ${JSON.stringify(v._source)},\n`
    + `${p2}"shared": ${arr(v.shared, p2)},\n`
    + `${p2}"byType": {\n` + types.join(',\n') + `\n${p2}}\n`
    + `${pad}},`;
}

// schema prop name -> the registry that owns it. `extra` covers documented sentinels the registry
// does not carry (a `none` no-op), which are part of the contract but not of the vocabulary.
// Addressed by EXACT PATH, not by prop name: the schema has several `type` and `preset` enums for
// different things (a layer type vs a bg fx type; a kinetic preset vs a bg preset), and matching by
// name compared a bg preset list against the kinetic registry and reported 41 phantom drifts.
const at = (p) => p.split('.').reduce((o, k) => (o || {})[k], schema.fields);
const OWNED = [
  { path: 'layers.item.anim',   want: [...ANIM_NAMES, 'none'],                 src: 'core/clips.js ANIM' },
  { path: 'layers.item.out',    want: [...ANIM_NAMES, 'none'],                 src: 'core/clips.js ANIM' },
  { path: 'layers.item.shader', want: AMBIENT_FX,                              src: 'core/shaders-ambient.js AMBIENT_FX' },
  { path: 'layers.item.three',    want: THREE_FX,                             src: 'core/three-scenes.js THREE_FX' },
  { path: 'layers.item.raymarch', want: RAYMARCH_FX,                          src: 'core/raymarch-fx.js RAYMARCH_FX' },
  { path: 'layers.item.resample', want: RESAMPLE_FX,                          src: 'core/resample-fx.js RESAMPLE_FX' },
  { path: 'layers.item.paint',    want: PAINT_FX_NAMES,                       src: 'core/paint-fx.js PAINT_FX' },
  { path: 'layers.item.children.item.type', want: LAYER_TYPES,                  src: 'core/layers/index.js REGISTRY (via kit.buildLeaf)' },
  { path: 'layers.item.type',     want: LAYER_TYPES,                          src: 'core/layers/index.js REGISTRY' },
  { path: 'cuts.item.style',    want: [...Object.keys(PRESENTATIONS), 'none'], src: 'core/cuts.js PRESENTATIONS' },
  { path: 'layers.item.cut',    want: Object.keys(PRESENTATIONS),              src: 'core/cuts.js PRESENTATIONS (a per-layer cut)' },
  { path: 'bg.item.preset',     want: BG_NAMES,                                src: 'core/backgrounds.js BG_NAMES' },
  { path: 'stings.item.fx',     want: SHADER_FX,                               src: 'core/stings.js SHADER_FX' },
  { path: 'seams.item.fx',      want: SEAM_FX,                                 src: 'core/seams.js SEAM_FX' },
  { path: 'seams.item.timing',  want: Object.keys(TIMINGS),                    src: 'core/cuts.js TIMINGS' },
  { path: 'spectacle.fields.device', want: SPECTACLE_DEVICES.names,           src: 'core/knobs.js SPECTACLE_DEVICES' },
  // unified transitions: `timing` mirrors TIMINGS; `fx` is intentionally NOT enumerated (its valid set
  // is the union of all four registries. The router in transitions-lower.js is the drift-proof guard).
  { path: 'transitions.item.timing', want: Object.keys(TIMINGS),               src: 'core/cuts.js TIMINGS' },
  { path: 'layers.item.cutTiming', want: Object.keys(TIMINGS),                 src: 'core/cuts.js TIMINGS (via TIMING_REGISTRY)' },
  { path: 'layers.item.modifiers.item.mixBlend', want: BLEND_MODES,            src: 'core/fx/mix-blend.js BLEND_MODES' },
  // The adjustment layer's kinds. Added because the first version of that enum was hand-typed into the
  // schema and went stale the moment a kind was added: the registry knew `bloom`, the validator did not,
  // and a correct scene was refused at boot. Every enum on this list exists because that happened once.
  { path: 'layers.item.kind',   want: ADJUST_REGISTRY.names,                   src: 'core/layers/adjust.js ADJUST_REGISTRY' },
  // MISTAKES #400 logged the schema enum as a hand-written second copy of the caption registry and
  // left lib-test comparing the two. Comparing is not owning: the gate said "they differ" and the
  // author still hand-edited schema.json. The registry owns it here, so --write derives it.
  { path: 'captionStyle',       want: CAP_STYLE_NAMES,                        src: 'core/captions.js CAP_STYLES' },
  // The `pin` enum used to be a hand-typed 17-name copy, one of three (core/engine/boot.js resolved
  // it, core/validate/validate.mjs's degenerate-pin check held a second copy). All three now read
  // core/layout/safe.js PLACEMENT_REGISTRY; this line makes the schema the fourth reader, not a copy.
  { path: 'layers.item.pin',    want: PLACEMENT_REGISTRY.names,               src: 'core/layout/safe.js PLACEMENT_REGISTRY' },
  // `out` sat on this table for as long as it has existed and derived NOTHING, because the schema
  // declared it a bare string and the loop below skipped a path with no enum without a word. The skip
  // is loud now, and the enum is seeded, so the claim and the effect finally agree.
  { path: 'layers.item.out',    want: [...ANIM_NAMES, 'none'],                 src: 'core/clips.js ANIM' },
  // One `preset` slot, two vocabularies, and they do not overlap: 31 kinetic names for split text and
  // 7 glow names. So a single enum still tells each name from a typo, and the per-TYPE question stays
  // where it belongs, with the registry that throws at boot.
  { path: 'layers.item.preset', want: [...PRESET_REGISTRY.names, ...GLOW_REGISTRY.names, ...PARTICLES_REGISTRY.names], src: 'core/type.js PRESETS + core/layers/glow.js GLOW_PRESETS + core/surfaces/particles.js PARTICLES_REGISTRY' },
  // `ease` and `varsEase` are deliberately NOT enumerated, and a first attempt to add them here was
  // wrong in a way worth recording: the enum was Object.keys(EASINGS), and a shipped scene writing
  // `ease: "sharp"` stopped booting, because the field also takes the FEEL words and the interpolation
  // modes. core/motion.js `isEasingName` is the ONE membership test over that union, and its own
  // comment says core/validate.mjs already held a second copy that was a registry behind. A schema
  // enum would have been the third.
];

// THE OWNED ENUMS ARE GENERATED TOO. Until now this table only COMPARED, so every registry that grew
// needed a second, hand edit in schema.json and the gate's own advice ("--write") fixed only
// layerProps. One fact, one owner: the registry owns the vocabulary and the schema RECEIVES it.
//
// Located in the TEXT by its current VALUES, not by a path anchor: schema.json is hand-formatted
// (inline objects, per-site indentation) and a JSON.stringify round-trip would reflow the whole file,
// making every regeneration look like a rewrite. Values are a safe key because the parsed node at the
// path tells us exactly what array to look for. A site outside the table holding the same array is
// rewritten too, and that is harmless: same values in, same values out, only the registry's order.
const ENUM_RE = /"enum"\s*:\s*\[[^\]]*\]/g;

// Same layout in, same layout out: multi-line stays multi-line at its own indent, one-line stays one.
function renderEnum(found, values) {
  const json = values.map((v) => JSON.stringify(v));
  if (!found.includes('\n')) return `"enum": [${json.join(', ')}]`;
  const indent = found.match(/\n([ ]*)/)[1];
  const close = (found.match(/\n([ ]*)\]$/) || [, indent.slice(0, -2)])[1];
  return `"enum": [\n${json.map((v) => indent + v).join(',\n')}\n${close}]`;
}

// The values a path SHOULD carry: registry order (lib-test pins five enums to it exactly), deduped,
// because the sentinels appended above (`none`) are already in some registries.
const ownedEnum = (want) => [...new Set(want)];

// A PATH ON THE OWNED TABLE CLAIMS AN OWNER, SO IT MUST HAVE SOMETHING TO OWN. Both loops below used
// to `continue` past a path the schema declares without an `enum`, and `layers.item.out` therefore sat
// on the table deriving nothing while the gate printed a tick: it was declared a bare string, so there
// was no array to compare or rewrite and nothing said so. A declaration accepted and then ignored is
// the exact failure this file exists to end, so the refusal lives here, once, and both callers use it.
function ownedEnumNode(pth, src) {
  const node = at(pth);
  if (!node) {
    console.error(`\u2717 ${pth} is on the owned table and does not exist in the schema`);
    process.exit(2);
  }
  if (!Array.isArray(node.enum)) {
    console.error(`\u2717 ${pth} names ${src} as the owner of its vocabulary, but the schema declares no`);
    console.error('  "enum" there, so nothing is compared and nothing is derived. Seed it with an empty');
    console.error('  "enum": [] at that path and re-run with --write.');
    process.exit(2);
  }
  return node;
}


function rewriteOwnedEnums(src) {
  const targets = [];
  for (const { path: pth, want } of OWNED) {
    const node = ownedEnumNode(pth, OWNED.find((o) => o.path === pth).src);
    const key = JSON.stringify(node.enum);
    const same = targets.find((t) => t.key === key);
    // Two paths whose arrays read alike cannot be told apart by value. Identical intent (seams.timing
    // and transitions.timing are both TIMINGS) is one target that fires twice; different intent is
    // ambiguous, so refuse rather than guess.
    if (same) {
      if (JSON.stringify(same.want) !== JSON.stringify(ownedEnum(want))) {
        console.error(`\u2717 ${pth} and ${same.path} hold the same enum but want different values`); process.exit(2);
      }
      continue;
    }
    targets.push({ path: pth, key, want: ownedEnum(want), hits: 0 });
  }
  const out = src.replace(ENUM_RE, (m) => {
    let cur;
    try { cur = JSON.parse(m.slice(m.indexOf('['))); } catch { return m; }
    const t = targets.find((x) => x.key === JSON.stringify(cur));
    if (!t) return m;
    t.hits++;
    return renderEnum(m, t.want);
  });
  for (const t of targets) if (!t.hits) { console.error(`\u2717 could not find ${t.path}'s enum in the schema text`); process.exit(2); }
  return { out, targets };
}

// Splice by anchor rather than re-serialising the whole schema: schema.json carries hand-formatted
// inline objects that a JSON.stringify round-trip would explode, and a generator that reformats the
// file it edits makes every regeneration look like a rewrite.
const BLOCK = /\n( +)"layerProps": \{[\s\S]*?\n\1\},/;
if (process.argv.includes('--write')) {
  const src = fs.readFileSync(SCHEMA_PATH, 'utf8');
  // Presence of an anchor, not "did the text change": a re-run over an already-current file changes
  // nothing, and reading that as a missing anchor made --write fail the second time it was called.
  const found = BLOCK.exec(src);
  const FIELDS = /\n( +)"fields": \{/;
  const fields = FIELDS.exec(src);
  if (!found && !fields) { console.error('\u2717 could not place the layerProps block - no existing block and no `"fields": {` anchor'); process.exit(2); }
  const pad = (found ? found[1] : fields[1]);
  const block = '\n' + renderVocabulary(vocabulary, pad);
  const spliced = found ? src.replace(BLOCK, block) : src.replace(FIELDS, `${block}\n${pad}"fields": {`);
  const { out: next, targets } = rewriteOwnedEnums(spliced);

  // NO WRITE MAY LOSE VOCABULARY IN SILENCE. Everything above this line is the generator agreeing with
  // itself: `--write` produces the block and the check then compares the file against the same
  // computation, so re-running the gate can never tell "I verified this" from "I produced this"
  // (docs/MISTAKES.md #564). The one thing a re-run cannot see is what the write TOOK AWAY, so that is
  // measured here, against the file as it stood, and it is measured on NAMES rather than on lines: a
  // reflow is not a loss and a lost prop is not a formatting difference.
  //
  // Adding a prop is additions only and writes with no ceremony. Removing one is rare and deliberate,
  // so it is named and it needs `--force`: an author deleting a feature says so, and a generator that
  // has gone blind (a module that stopped exporting PROPS merges as `{}` and takes its whole half of
  // the vocabulary with it) cannot get past this without a human typing the flag.
  const before = schema.layerProps || {};
  const names = (v) => new Set([...(v.shared || []), ...Object.values(v.byType || {}).flat()]);
  const had = names(before), now = names(vocabulary);
  const gone = [...had].filter((k) => !now.has(k)).sort();
  const added = [...now].filter((k) => !had.has(k)).sort();
  if (added.length) console.log(`  + ${added.length} prop name(s): ${added.join(', ')}`);
  if (gone.length) console.log(`  - ${gone.length} prop name(s): ${gone.join(', ')}`);
  if (!added.length && !gone.length) console.log('  (no vocabulary change: formatting and enums only)');
  if (gone.length && !process.argv.includes('--force')) {
    console.error(`\u2717 refusing to write: this would drop ${gone.length} prop name(s) the committed schema carries.`);
    console.error(`    ${gone.join(', ')}`);
    console.error('    Nothing re-running this gate can catch that: it would compare the file against the');
    console.error('    same computation that shrank it, and agree. Either a module stopped declaring what');
    console.error('    it reads, or the removal is real.');
    console.error('    fix: restore the declaration, or re-run with --force if the props are genuinely gone.');
    process.exit(2);
  }
  fs.writeFileSync(SCHEMA_PATH, next);
  console.log('✓ wrote formats/scene/schema.json layerProps (generated from the declarations)');
  console.log(`✓ wrote ${targets.length} registry-owned enum(s) at ${targets.reduce((a, t) => a + t.hits, 0)} site(s)`);
  process.exit(0);
}
{
  const have = JSON.stringify(schema.layerProps ?? null);
  const want = JSON.stringify(vocabulary);
  if (have !== want) {
    const lines = ['✗ formats/scene/schema.json `layerProps` is stale - it is GENERATED from the PROPS',
      '  declarations and a module has changed what it reads since it was last written.'];
    const hv = schema.layerProps || {};
    const cmp = (label, a = [], b = []) => {
      const add = b.filter((x) => !a.includes(x)), rm = a.filter((x) => !b.includes(x));
      if (add.length) lines.push(`    ${label}: now declared, not in the file - ${add.join(', ')}`);
      if (rm.length) lines.push(`    ${label}: in the file, no longer declared - ${rm.join(', ')}`);
    };
    cmp('shared', hv.shared, vocabulary.shared);
    for (const t of new Set([...Object.keys(hv.byType || {}), ...LAYER_TYPES])) cmp(t, (hv.byType || {})[t], vocabulary.byType[t]);
    lines.push('  fix: node quality/gates/schema-drift.mjs --write');
    for (const l of lines) console.error(l);   // f.fail RECORDS, it does not print: findings.mjs:70
    f.fail('schema-layerprops-stale', lines.join('\n'));
    process.exit(1);
  }
  const n = Object.values(vocabulary.byType).reduce((a, ps) => a + ps.length, 0);
  console.log(`✓ layerProps in sync - ${LAYER_TYPES.length} types declaring ${n} type-scoped prop(s) + ${vocabulary.shared.length} shared`);
}

// BOTH DIRECTIONS, against the hand-written docs in `layers.item`. The declarations say what the
// engine READS; `layers.item` says what an author may WRITE, and it carries the labels and enums no
// declaration can. They must name the same set, or one of them is lying:
//   - declared and undocumented -> validate's unknown-prop pass REJECTS a prop the engine honours.
//     `hue` (paint aurora) sat here, invisible to the regex below because paint-fx reads it as `o.hue`.
//   - documented and undeclared -> the schema advertises a prop nothing implements, which is the `slideL`
//     class of bug (#21): the author writes it, validate is happy, and the render ignores it.
{
  const LI = schema.fields?.layers?.item || {};
  const CI = LI.children?.item || {};
  const documented = new Set([...Object.keys(LI), ...Object.keys(CI)]);
  const declared = new Set([...vocabulary.shared, ...Object.values(vocabulary.byType).flat()]);
  const undocumented = [...declared].filter((k) => !documented.has(k)).sort();
  const unread = [...documented].filter((k) => !declared.has(k)).sort();
  if (undocumented.length || unread.length) {
    const lines = [];
    if (undocumented.length) {
      lines.push(`✗ the engine declares ${undocumented.length} layer prop(s) that layers.item does not document:`);
      for (const k of undocumented) lines.push(`    • ${k}  (validate rejects it today; the engine reads it)`);
    }
    if (unread.length) {
      lines.push(`✗ layers.item documents ${unread.length} prop(s) no module declares:`);
      for (const k of unread) lines.push(`    • ${k}  (an author can write it and nothing will read it)`);
      lines.push('    either declare it beside the code that reads it, or delete it from the schema.');
    }
    for (const l of lines) console.error(l);   // f.fail RECORDS, it does not print: findings.mjs:70
    f.fail('schema-doc-mismatch', lines.join('\n'));
    process.exit(1);
  }
  console.log(`✓ layers.item documents exactly the ${declared.size} prop(s) the engine declares`);
}

// props the engine reads off a layer/child object (L.<prop>, LL.<prop> or C.<prop>). `LL` is the same
// layer under an inner name where `L` is already taken, core/three-fx.js has always done it, and
// core/surfaces does it in the per-frame draw. quality/gates/layer-props.mjs has matched all three
// since it shipped; this pattern matched two, so a prop read only as `LL.` counted as read nowhere.
const engineProps = new Set();
for (const m of engineSrc.matchAll(/\b(?:LL?|C)\.([a-zA-Z][a-zA-Z0-9]*)/g)) engineProps.add(m[1]);

// every field name DEFINED anywhere in the schema (skip the JSON-schema structural keywords)
const RESERVED = new Set(['type', 'label', 'item', 'enum', 'min', 'max', 'default', 'required',
  'minLength', 'pattern', 'minItems', 'maxItems', 'fields', 'properties', 'note', 'name']);
const defined = new Set();
// `schema.fields` and not `schema`: the derived `layerProps` block below is keyed by LAYER TYPE, and
// walking it would enter every type name into the set of "fields the schema defines".
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!RESERVED.has(k)) defined.add(k); walk(v); }
})(schema.fields);

// engine internals that are NOT authored data fields (computed / structural), so not in the schema
const INTERNAL = new Set(['type', 'children', 'part', 'use']);

const missing = [...engineProps].filter((p) => !defined.has(p) && !INTERNAL.has(p)).sort();
if (missing.length) {
  const lines = [`✗ schema drift: engine reads ${missing.length} prop(s) not in schema.json:`];
  for (const p of missing) lines.push(`    • L.${p}`);
  lines.push('  add them to formats/scene/schema.json (or to INTERNAL in this script if truly computed).');
  for (const l of lines) console.error(l);   // f.fail RECORDS, it does not print: findings.mjs:70
  f.fail('schema-engine-prop-missing', lines.join('\n'));
  process.exit(1);
}
console.log(`✓ schema in sync: all ${engineProps.size} engine props are defined in schema.json`);

// EVERY enum in the schema is a COPY of a registry the engine owns, and a copy drifts. The schema
// once advertised "slideL", an anim that never existed and so silently resolved to fade (#21). This
// check existed for exactly that, and covered ONE enum out of eight. Adding `nebula` to AMBIENT_FX
// made the schema reject a valid value and nothing said so until a scene failed to validate
// (docs/MISTAKES.md #137). Every vocabulary the engine owns is compared here now, both directions.
{
  let bad = 0, checked = 0;
  for (const { path: pth, want, src } of OWNED) {
    const node = ownedEnumNode(pth, src);
    checked++;
    const d = node.enum;
    const wantS = [...new Set(want)].sort().join(',');
    if ([...new Set(d)].sort().join(',') === wantS) continue;
    const missing = want.filter((x) => !d.includes(x));
    const extra = d.filter((x) => !want.includes(x));
    const lines = [`\u2717 ${pth} DRIFT vs ${src}`];
    if (missing.length) lines.push(`    schema is MISSING: ${missing.join(', ')}  (the engine accepts these; the schema rejects them)`);
    if (extra.length) lines.push(`    schema ADVERTISES: ${extra.join(', ')}  (nothing implements these)`);
    for (const l of lines) console.error(l);
    f.fail('schema-enum-drift', lines.join('\n'), { at: pth });
    bad++;
  }
  // The modifier vocabulary is a set of KEYS, not an enum, so the loop above cannot see it: a second
  // file in core/fx/ would be dispatchable by the engine and rejected by validate's unknown-prop pass,
  // which is drift pointing the other way \u2014 the engine accepts what the schema refuses.
  {
    const node = at('layers.item.modifiers.item') || {};
    const have = Object.keys(node).sort().join(',');
    if (have !== [...FX_TYPES].sort().join(',')) {
      const missing = FX_TYPES.filter((x) => !(x in node));
      const extra = Object.keys(node).filter((x) => !FX_TYPES.includes(x));
      const lines = ['\u2717 layers.item.modifiers.item DRIFT vs core/fx/index.js REGISTRY'];
      if (missing.length) lines.push(`    schema is MISSING: ${missing.join(', ')}  (the engine accepts these; the schema rejects them)`);
      if (extra.length) lines.push(`    schema ADVERTISES: ${extra.join(', ')}  (nothing implements these)`);
      // NOT `--write`: each key here carries that modifier's own hand-written prop schema, which no
      // generator can invent. The shared fix line below said --write and it does nothing for this
      // block, so an author ran it, saw the same failure, and had no next move.
      lines.push('    fix: add the key by hand to layers.item.modifiers.item in formats/scene/schema.json'
        + ': this block is a hand-written prop schema per modifier, NOT a generated enum.');
      for (const l of lines) console.error(l);
      f.fail('schema-modifier-drift', lines.join('\n'), { at: 'layers.item.modifiers.item' });
      bad++;
    } else checked++;
  }
  // A KEYFRAME'S FIELDS LIVED IN THREE PLACES: the evaluator (core/sequence.js `POSE`, which the pose
  // is generated from), the refusal that names what a key may carry, and this schema's `motion.item`.
  // The first two share one table now; this was the third, and it drifted the moment a property was
  // added, so the schema described a keyframe the engine no longer had. COMPARED rather than written,
  // for the reason the modifier block above gives: each field carries a hand-written label explaining
  // what it means, and no generator can invent those.
  {
    const documented = Object.keys(at('layers.item.motion.item') || {});
    const missing = KEYFRAME_PROPS.filter((p) => !documented.includes(p));
    const extra = documented.filter((p) => !KEYFRAME_PROPS.includes(p));
    if (missing.length || extra.length) {
      const lines = ['\u2717 layers.item.motion.item DRIFT vs core/sequence.js KEYFRAME_PROPS'];
      if (missing.length) lines.push(`    schema is MISSING: ${missing.join(', ')}  (a key may carry these; the schema does not say so)`);
      if (extra.length) lines.push(`    schema ADVERTISES: ${extra.join(', ')}  (a key carrying these is refused at boot)`);
      lines.push('    fix: add the field by hand to layers.item.motion.item in formats/scene/schema.json'
        + ': each one carries a label no generator can invent.');
      for (const l of lines) console.error(l);
      f.fail('schema-motion-drift', lines.join('\n'), { at: 'layers.item.motion.item' });
      bad++;
    }
  }

  if (bad) { console.error('  fix (the enums above): node quality/gates/schema-drift.mjs --write  (those are GENERATED)'); process.exit(1); }
  console.log(`\u2713 ${checked} schema enum(s) derived from the registries they copy, in sync`);
}
