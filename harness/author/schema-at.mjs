// schema-at.mjs: what may I WRITE at this path in a scene JSON?
//
//   node harness/author/schema-at.mjs                          # the top-level shape, one line per field
//   node harness/author/schema-at.mjs 'layers[].motion[]'      # every field legal on a keyframe
//   node harness/author/schema-at.mjs motion                   # a partial path, found rather than refused
//
// WHY THIS EXISTS, from a real failure. An author needed the names of the two bezier handles on a
// motion keyframe, guessed `in`/`out` from a comment, and shipped a refusal that rejected three
// correct films. The real names are `easeIn`/`easeOut`, and films/scene/schema.json HAS them, with a
// written label on every field, and nothing served it. So the answer existed, was checked by a gate,
// and was reachable only by reading a 2848-line JSON file, which is the same shape of failure
// `make arsenal` was built for one level up: a capability that is present, correct and unreachable is
// indistinguishable from one that is absent.
//
// THE SIBLING, and the division of labour. `make arsenal` answers "what can the engine DO" and ranks a
// plain-English question across every registry. This answers "what may I write HERE" and takes a PATH.
// Neither owns a list. Everything below is read from films/scene/schema.json at runtime, and the one
// thing that is not (which vocabulary an enum belongs to) is read from core/registry.js, live.
//
// THIS IS NOT A GATE. It checks nothing and blocks nothing. quality/gates/schema-drift.mjs already
// holds the schema against the code, both directions, and its `layers.item.motion.item` block is
// exactly the fact this tool serves. Adding a second opinion about the contract would be a fork.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA_PATH = path.join(repoRoot, 'films/scene/schema.json');

/** The one owner of every field, type, label and enum printed by this tool. */
export const loadSchema = () => JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// ---- the path an author types ---------------------------------------------------------------------
//
// TWO SPELLINGS, ONE MEANING, and the rule is stated here because it is the only thing about this tool
// somebody has to learn. `[]` says "into the element of this array": `layers[].motion[]` is the shape
// of one keyframe. The schema's own spelling for that step is the literal key `item`
// (`layers.item.motion.item`, which is how quality/gates/schema-drift.mjs addresses the same node), so
// a bare `item` segment is accepted and means the same thing, and a bare `fields` segment is accepted
// and means nothing at all, because descending into an object's fields already happens by name.
//
// The `[]` form is the one to write. It is what an author reading a scene sees (`"layers": [ … ]`),
// and it is unambiguous in a way the bare name is not: `layers.motion` also resolves here, because a
// help tool that refuses a nearly-right path teaches nobody anything, but it does not say whether
// `motion` sits on the array or on one layer.
export function steps(at) {
  const out = [];
  for (const raw of String(at || '').split('.')) {
    const seg = raw.trim();
    if (!seg) continue;
    const m = /^([^[\]]*)((?:\[\])*)$/.exec(seg);
    if (!m) { out.push({ bad: seg }); continue; }
    const name = m[1];
    if (name === 'item') out.push('[]');
    else if (name && name !== 'fields') out.push(name);
    for (let i = 0; i < m[2].length / 2; i++) out.push('[]');
  }
  return out;
}

/** The children of a schema node, whichever way it carries them: an array's element, or an object's fields. */
export const childrenOf = (n) => (n && typeof n === 'object' && (n.fields || n.item)) || null;

/** The display form of a resolved trail: `layers[].motion[]`. */
export const fmtPath = (trail) =>
  trail.reduce((a, s) => (s === '[]' ? `${a}[]` : a ? `${a}.${s}` : s), '');

/**
 * resolve(schema, steps) → { node, trail } on a hit, or { error, trail, map, want } on a miss.
 *   error 'unknown'  · `want` is not a field of the map reached so far. `map` is what IS legal there.
 *   error 'notArray' · a `[]` step on a node that is not an array.
 */
export function resolve(schema, path_) {
  let node = { fields: schema.fields };
  const trail = [];
  for (const s of path_) {
    if (s && s.bad !== undefined) return { error: 'unknown', trail, map: childrenOf(node), want: s.bad };
    if (s === '[]') {
      if (!node.item) return { error: 'notArray', trail, node };
      node = { label: node.label, fields: node.item, wasArray: true };
      trail.push('[]');
      continue;
    }
    const map = childrenOf(node);
    if (!map || !Object.prototype.hasOwnProperty.call(map, s)) return { error: 'unknown', trail, map, want: s };
    node = map[s];
    trail.push(s);
  }
  return { node, trail };
}

/**
 * Every addressable path in the schema, as `[{ path, name, node }]`, so a partial path can be FOUND.
 * Depth-capped because the answer to "where does `motion` live" is never eleven levels down, and a cap
 * is cheaper than trusting a hand-written schema to be acyclic.
 */
export function allPaths(schema, maxDepth = 6) {
  const out = [];
  (function walk(map, trail, depth) {
    if (depth > maxDepth) return;
    for (const [name, node] of Object.entries(map)) {
      const here = [...trail, name];
      out.push({ path: fmtPath(here), trail: here, name, node });
      if (node && node.item) walk(node.item, [...here, '[]'], depth + 1);
      else if (node && node.fields) walk(node.fields, here, depth + 1);
    }
  })(schema.fields, [], 0);
  return out;
}

// ---- which VOCABULARY an enum is ------------------------------------------------------------------
//
// `make arsenal` tells you a vocabulary exists and `make schema AT=` tells you a field exists. The gap
// between them is the question this closes: `layers[].preset` is a string with a 38-name enum, and
// knowing that tells you nothing about what to search for next.
//
// DERIVED FROM THE REGISTRIES, NOT FROM A TABLE. A registry owns its `kind` and its `names`
// (core/registry.js), so an enum whose values contain every name of a registry IS that registry's
// vocabulary, and the match is made by value at runtime. A second table mapping schema path to
// registry would be a fourth copy of a fact that already has three, and it would drift: that is the
// failure the whole `defineRegistry` primitive exists to stop.
//
// Containment rather than equality, deliberately. Schema enums append documented sentinels the
// registry does not carry (`none`), and `layers.item.preset` is the UNION of two vocabularies that do
// not overlap (31 kinetic presets + 7 glow presets), so equality would report neither and containment
// reports both, which is the more useful answer.
const MIN_REG = 2;   // a one-name registry is contained in almost anything, so it proves nothing
export function kindsOfEnum(values, regs) {
  const have = new Set(values);
  return regs
    .filter((r) => r.names.length >= MIN_REG && r.names.every((n) => have.has(n)))
    .map((r) => r.kind);
}

/** Every registry the engine defines. Importing the modules is what registers them, and arsenal already walks them. */
async function registriesLive() {
  try {
    const { collect } = await import('./arsenal.mjs');
    await collect();                                   // imports every module that defines a vocabulary
    const { registries } = await import('../../core/registry/registry.js');
    return registries();
  } catch { return []; }                               // the kind line is a courtesy, never the answer
}

// ---- printing -------------------------------------------------------------------------------------
const COL = 78;
// The enum line sits under the label column, so it can run wider than the label without wrapping past
// a normal terminal, and it carries the two things nothing else prints: the values and their registry.
const ENUM_COL = 96;
const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const typeOf = (n) => (n && n.type) || (childrenOf(n) ? 'object' : '--');

/** The wrapped, indented form of a long label, for the ONE field a reader asked about. */
function wrap(s, indent, width = COL) {
  const words = oneLine(s).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && line.length + 1 + w.length > width) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.map((l) => indent + l).join('\n');
}

// The VALUES are what gets truncated, never the vocabulary's name. A first cut clipped the whole line
// at one width, and on `bg[].preset` (21 names) that ate the only half an author cannot get anywhere
// else: the enum is visible again one drill-down away, the registry it belongs to is not.
function enumLine(node, regs, room = COL) {
  if (!Array.isArray(node.enum) || !node.enum.length) return null;
  const kinds = kindsOfEnum(node.enum, regs);
  const where = kinds.length ? `   (${kinds.join(' + ')}: make arsenal --kind "${kinds[0]}")` : '';
  let shown = node.enum.slice();
  let more = '';
  while (shown.length > 1
    && `one of: ${shown.join(' · ')}${more}${where}`.length > room) {
    shown = shown.slice(0, -1);
    more = ` … ${node.enum.length} in all`;
  }
  return `one of: ${shown.join(' · ')}${more}${where}`;
}

function printFields(map, regs, { pad = 4 } = {}) {
  const names = Object.keys(map).sort();
  const w = Math.max(...names.map((n) => n.length), 4);
  const tw = Math.max(...names.map((n) => typeOf(map[n]).length), 4);
  for (const name of names) {
    const node = map[name] || {};
    const mark = node.item ? '[]' : '';
    const label = clip(oneLine(node.label || node.hint || ''), COL);
    console.log(`${' '.repeat(pad)}${(name + mark).padEnd(w + 2)}${typeOf(node).padEnd(tw + 2)}${label}`);
    const en = enumLine(node, regs, ENUM_COL);
    if (en) console.log(`${' '.repeat(pad + w + tw + 4)}${en}`);
  }
  return names.length;
}

function printNode(trail, node, regs) {
  const label = oneLine(node.label || node.hint || '');
  // An array node's children are the fields of its ELEMENT, so the heading says so. Without this,
  // `AT=motion` resolved to `layers[].motion` and then listed keyframe fields under a path that names
  // the track, which reads as though a track carries an `x`.
  const here = fmtPath(trail) + (node.item ? '[]' : '');
  const map = childrenOf(node);
  // The label heads a CONTAINER and is printed in full under a LEAF, never both: a leaf's label is the
  // whole answer and is often a paragraph, and it read as a stutter when the header carried it too.
  console.log(`\n  ${here}${map && label ? `  ·  ${label}` : ''}\n`);
  if (map) {
    const n = printFields(map, regs);
    console.log(`\n  ${n} field(s). Drill in with AT='${here}.<field>'.\n`);
    return;
  }
  // A leaf: this IS the answer, so nothing about it is truncated.
  const bits = [`type ${typeOf(node)}`];
  for (const k of ['default', 'min', 'max', 'minLength', 'pattern']) if (node[k] !== undefined) bits.push(`${k} ${JSON.stringify(node[k])}`);
  console.log(`    ${bits.join('  ·  ')}`);
  if (node.label) console.log(wrap(node.label, '    '));
  if (Array.isArray(node.enum) && node.enum.length) {
    const kinds = kindsOfEnum(node.enum, regs);
    console.log(`\n    ${node.enum.length} legal value(s):`);
    console.log(wrap(node.enum.join(' · '), '      '));
    if (kinds.length) console.log(`\n    That vocabulary is the ${kinds.join(' + ')} registry: make arsenal --kind "${kinds[0]}"`);
  }
  console.log('');
}

// ---- the other path space: `block.<family>` --------------------------------------------------------
//
// THIS IS NOT A SECOND SCHEMA. films/scene/schema.json deliberately knows nothing about block props: a
// block layer is `{type:"block", block:"<name>", …props}` and blocks/schema.mjs `resolve()` is what
// validates those props, per family, against a table quality/gates/block-schema.mjs holds to the
// factory's real signature. So the path `block.<family>` has no owner in schema.json and never will.
// One tool, two disjoint path spaces, rather than a copy of one fact in both.
//
// The rules are converted into the schema's own node shape and handed to the SAME printers, so the
// answer to "what may I write on a glassCard" reads exactly like the answer to "what may I write on a
// motion keyframe". An author learns one output format, not two.
const BLOCK_KINDS_WITH_FIELDS = new Set(['group', 'row']);

function ruleNode(rule, note) {
  const n = { type: rule.kind, label: note || undefined };
  if (rule.def !== undefined) n.default = rule.def;
  if (rule.min !== undefined) n.min = rule.min;
  if (rule.max !== undefined) n.max = rule.max;
  if (rule.kind === 'enum' && Array.isArray(rule.of)) n.enum = rule.of;
  if (BLOCK_KINDS_WITH_FIELDS.has(rule.kind) && rule.fields) n.fields = tableNode(rule.fields);
  if (rule.kind === 'list' && rule.of) {
    // A list of ROWS has children worth drilling into; a list of scalars does not, and giving it an
    // empty `item` would print a heading over nothing. The element's kind goes in the type instead.
    if (rule.of.fields) n.item = tableNode(rule.of.fields);
    else n.type = `list of ${rule.of.kind}`;
  }
  if (rule.kind === 'oneOf' && Array.isArray(rule.of)) {
    n.type = `oneOf ${rule.of.map((a) => a.kind).join(' | ')}`;
  }
  return n;
}

const tableNode = (table, notes = {}) =>
  Object.fromEntries(Object.entries(table).map(([k, r]) => [k, ruleNode(r, notes[k])]));

// A BLOCK'S TABLE WANTS ITS DEFAULTS IN THE ROW, which is where this parts company with printFields.
// A schema container's children are mostly objects you drill into, so name + type + label is the right
// summary there. A block's children are all leaves, and the default and the range ARE the answer: an
// author who has to run nine more commands to learn nine defaults has been told nothing useful.
function printDials(rows, fields, regs) {
  const w = Math.max(...rows.map((r) => r.name.length), 4);
  const types = rows.map((r) => fields[r.name].type);
  const tw = Math.max(...types.map((t) => t.length), 4);
  const bounds = rows.map((r) => {
    const bits = [];
    if (r.def !== undefined) bits.push(`=${JSON.stringify(r.def)}`.length > 22 ? '=…' : `=${JSON.stringify(r.def)}`);
    if (r.min !== undefined || (r.max !== undefined && r.kind !== 'str' && r.kind !== 'list')) {
      bits.push(`${r.min ?? ''}..${r.max ?? ''}`);
    } else if (r.max !== undefined) bits.push(`\u2264${r.max}`);
    return bits.join(' ');
  });
  const bw = Math.max(...bounds.map((b) => b.length), 0);
  rows.forEach((r, i) => {
    const node = fields[r.name];
    // Wider than COL on purpose: the bounds column ate the note's room at the schema's width, and the
    // note is the one thing here that exists nowhere else an author can reach.
    const room = ENUM_COL - (w + tw + bw + 10);
    console.log(`    ${r.name.padEnd(w + 2)}${types[i].padEnd(tw + 2)}${bounds[i].padEnd(bw + 2)}`
      + clip(oneLine(r.note || ''), Math.max(room, 20)));
    const en = enumLine(node, regs, ENUM_COL);
    if (en) console.log(`${' '.repeat(w + tw + bw + 10)}${en}`);
  });
}

/** `AT=block` and `AT=block.<family>`. Returns false when the path is not ours, so the schema answers it. */
async function printBlockPath(steps_, regs) {
  const [, family] = steps_;
  const [{ SCHEMAS, CATEGORY_OF }, { CATALOG }, dials] = await Promise.all([
    import('../../blocks/index.mjs'),
    import('../../blocks/catalog.mjs'),
    import('./block-dials.mjs'),
  ]);
  const families = Object.keys(SCHEMAS).sort();

  if (!family) {
    const byCat = {};
    for (const f of families) (byCat[CATEGORY_OF[f] || 'Other'] ||= []).push(f);
    console.log(`\n  block  ·  ${families.length} block families, each with its own option table\n`);
    for (const cat of Object.keys(byCat).sort()) {
      console.log(`    ${cat}`);
      console.log(wrap(byCat[cat].join(' · '), '      '));
    }
    console.log(`\n  Ask about one: make arsenal AT='block.${families[0]}'`);
    console.log(`  What each one DRAWS is the other question: make arsenal Q="<what you want to show>"\n`);
    return true;
  }

  if (!SCHEMAS[family]) {
    // A scene writes `card.pricing`, so an author asking about that name is in the right place and
    // holding a variant. Its options are its FAMILY's options, so answer with the family rather than
    // refuse a name the registry really has.
    const row = (CATALOG || []).find((r) => r && r.name === family);
    if (row && SCHEMAS[row.family]) {
      console.log(`\n  "${family}" is ${row.family} with preset props, so it takes ${row.family}'s options.`);
      return printBlockPath(['block', row.family], regs);
    }
    let near = [];
    try { ({ nearMisses: near } = await import('../../core/registry/registry.js')); near = near(family, families); } catch { near = []; }
    console.log(`\n  no block family "${family}".${near.length ? ` Did you mean ${near.map((n) => `\`${n}\``).join(', ')}?` : ''}`);
    console.log(`\n  make arsenal AT=block   lists all ${families.length}.\n`);
    return true;
  }

  const rows = await dials.dialsFor(family, { withNotes: true });
  const notes = Object.fromEntries(rows.filter((r) => r.note).map((r) => [r.name, r.note]));
  const fields = tableNode(SCHEMAS[family], notes);

  // ONE DIAL, asked about by name. The schema's own leaf printer already says type · default · min ·
  // max, wraps the note in full and lists an enum's legal values with the registry it belongs to,
  // which is exactly the shape of a block rule. Nothing about this branch is block-specific.
  const dial = steps_[2];
  if (dial) {
    if (!fields[dial]) {
      // A SCENE WRITES `card.pricing`, so `AT=block.card.pricing` is the path an author actually types,
      // and it arrives here looking like an unknown option on the `card` family. It is a variant name:
      // answer with the family whose options it really takes.
      const variant = (CATALOG || []).find((r) => r && r.name === `${family}.${dial}`);
      if (variant && SCHEMAS[variant.family]) {
        console.log(`\n  "${family}.${dial}" is ${variant.family} with preset props, so it takes ${variant.family}'s options.`);
        return printBlockPath(['block', variant.family], regs);
      }
      let near = [];
      const legal = Object.keys(fields).sort();
      try { ({ nearMisses: near } = await import('../../core/registry/registry.js')); near = near(dial, legal); } catch { near = []; }
      console.log(`\n  ${family} has no option "${dial}".${near.length ? ` Did you mean ${near.map((n) => `\`${n}\``).join(', ')}?` : ''}`);
      console.log(`\n  What IS legal on a ${family} (${legal.length}):\n`);
      console.log(wrap(legal.join(' · '), '    '));
      console.log('');
      return true;
    }
    printNode(['block', family, dial], fields[dial], regs);
    return true;
  }

  const blurb = ((CATALOG || []).find((r) => r && r.family === family) || {}).blurb || '';
  console.log(`\n  block.${family}${blurb ? `  ·  ${blurb}` : ''}\n`);
  printDials(rows, fields, regs);
  const withNote = rows.find((r) => r.note) || rows[0];
  console.log(`\n  ${rows.length} option(s). One in full, with its note: AT='block.${family}.${withNote.name}'`);
  // PLACEMENT AND TIMING APPEAR IN NO TABLE, by design (blocks/schema.mjs PASSTHROUGH): the scene
  // supplies them and a container injects them. Without this line the table reads as complete and an
  // author concludes a block cannot be placed.
  console.log(`  Plus x · y · start · dur on every block. Those are the scene's, not the block's, so`);
  console.log(`  they are in no table: blocks/schema.mjs passes them through untouched.\n`);
  return true;
}

// ---- the CLI --------------------------------------------------------------------------------------
// Guarded the way arsenal.mjs is, because everything above is a library: quality/gates/lib-test.mjs
// imports `resolve`, `steps` and `kindsOfEnum` and would otherwise print a schema map on import.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const schema = loadSchema();
  const regs = await registriesLive();
  const at = process.argv.slice(2).filter((a) => !a.startsWith('--')).join('').trim();

  if (!at) {
    console.log(`\n  ${schema.title}  ·  the top-level shape of a scene JSON\n`);
    const n = printFields(schema.fields, regs, { pad: 2 });
    console.log(`\n  ${n} top-level field(s). Ask about one: make schema AT='layers[].motion[]'`);
    console.log(`  A path is dotted, and \`[]\` steps into an array's element. \`layers.item.motion.item\`,`);
    console.log(`  the schema's own spelling, means the same thing.\n`);
    process.exit(0);
  }

  const want = steps(at);
  if (want[0] === 'block') { await printBlockPath(want, regs); process.exit(0); }

  const r = resolve(schema, want);
  if (!r.error) { printNode(r.trail, r.node, regs); process.exit(0); }

  // ---- a wrong or partial path must HELP -----------------------------------------------------------
  //
  // Modelled on core/registry.js `hint`, which is the tone this repo already uses for "that name is not
  // in this vocabulary": name what IS legal, offer the near word, and never resolve to something
  // plausible instead. The two failures are different questions and get different answers.
  //
  // A PARTIAL PATH (`AT=motion`) fails at the root, and the author almost certainly typed a real field
  // and not its address. So the tree is searched for a field of that name, and one hit is simply
  // ANSWERED: making somebody retype the full path they did not know is the whole problem restated.
  if (r.trail.length === 0) {
    const key = String(r.want || '').toLowerCase();
    const hits = allPaths(schema).filter((p) => p.name.toLowerCase() === key);
    const near = hits.length ? [] : allPaths(schema).filter((p) => p.name.toLowerCase().includes(key));
    if (hits.length === 1) {
      console.log(`\n  "${at}" is not a top-level field, but \`${hits[0].name}\` lives at one place:`);
      printNode(hits[0].trail, hits[0].node, regs);
      process.exit(0);
    }
    const candidates = hits.length ? hits : near;
    if (candidates.length) {
      console.log(`\n  "${at}" is not a top-level field. ${candidates.length} path(s) ${hits.length ? 'end in' : 'contain'} that name:\n`);
      for (const c of candidates.slice(0, 20)) console.log(`    ${c.path.padEnd(46)}${clip(oneLine(c.node.label || ''), 54)}`);
      if (candidates.length > 20) console.log(`    … ${candidates.length - 20} more`);
      console.log(`\n  Ask about one: make schema AT='${candidates[0].path}'\n`);
      process.exit(0);
    }
  }

  if (r.error === 'notArray') {
    console.log(`\n  \`${fmtPath(r.trail)}\` is not an array, so \`[]\` has nothing to step into.`);
    console.log(`  It is a ${typeOf(r.node)}. Drop the \`[]\`: make schema AT='${fmtPath(r.trail)}'\n`);
    process.exit(0);
  }

  // AN UNKNOWN FIELD AT A REAL PATH names the legal set, because the author is already in the right
  // place and one word out. `nearMisses` is core/registry.js's own "did you mean", reused rather than
  // re-spelled: two spellings of that is one too many, which is why that helper is exported at all.
  const where = fmtPath(r.trail) || 'the top level';
  const legal = r.map ? Object.keys(r.map).sort() : [];
  let near = [];
  try { ({ nearMisses: near } = await import('../../core/registry/registry.js')); near = near(r.want, legal); } catch { near = []; }
  console.log(`\n  no field "${r.want}" at \`${where}\`.${near.length ? ` Did you mean ${near.map((n) => `\`${n}\``).join(', ')}?` : ''}`);
  console.log(`\n  What IS legal at \`${where}\` (${legal.length}):\n`);
  console.log(wrap(legal.join(' · '), '    '));
  console.log(`\n  make schema AT='${where === 'the top level' ? '<field>' : `${where}.<field>`}' for one of them.\n`);
  process.exit(0);
}
