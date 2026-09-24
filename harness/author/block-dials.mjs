// block-dials.mjs: what can I DIAL on this block, and what does each dial mean?
//
// WHY THIS EXISTS, from a real gap. `make arsenal Q="glass panel"` answered with a name, a blurb and
// the line `"block": "glassCard"`. That block takes nine options, each with a type, a range and a
// default, and none of them reached the author. The block library's own comparison makes the point:
// a HyperFrames block is one HTML document with a private timeline, and it PUBLISHES its 14
// parameters; ours is a function the engine animates, which is the better architecture, and it
// published nothing. A capability that is present, correct and unreachable is indistinguishable from
// one that is absent.
//
// NOTHING HERE IS A NEW CONTRACT. Every family module already exports `<FAM>_SCHEMAS`, merged into
// `SCHEMAS` by blocks/index.mjs, and quality/gates/block-schema.mjs already holds every table against
// the factory's real signature. This file reads that table and the comments written above it. It owns
// no list, declares no default, and cannot disagree with the engine.
//
// THE NOTES ARE THE POINT, and they are comments, so they are not in the runtime object:
//
//   // How milky the glass is. 0 is clear and the panel is only its edge and its blur; 1 is opaque
//   // white and the backdrop it exists to blur stops reading at all.
//   tint: { kind: 'unit', def: 0.06 },
//
// The rule says `0..1`. Only the note says what 0 and 1 LOOK like, which is the thing that decides
// whether an author moves the dial at all. Harvested from source, lazily, and only by the deep view:
// the compact line in a search result is built from the runtime table alone and reads no files.
//
// WHY AUTHORING-SIDE and not blocks/schema.mjs: that module is imported on the validate path, which
// runs on every scene, and it must not grow file reads to serve a help tool.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---- which FILE owns a family --------------------------------------------------------------------
//
// Derived, never a second map. blocks/index.mjs keys FAMILY_MODULES by file and builds its own
// `ownerOf` in a loop that does not export it; rather than ask for that to be exported, the same fact
// is re-derived from the tables themselves, which is where this file is already looking.
let OWNER = null;
async function ownerOf(family) {
  if (!OWNER) {
    OWNER = {};
    const { FAMILY_MODULES } = await import('../../blocks/index.mjs');
    for (const [file, mod] of Object.entries(FAMILY_MODULES)) {
      for (const t of Object.keys(mod).filter((k) => k.endsWith('_SCHEMAS'))) {
        for (const fam of Object.keys(mod[t])) OWNER[fam] = file;
      }
    }
  }
  return OWNER[family] || null;
}

// ---- harvesting the notes ------------------------------------------------------------------------
//
// A line scan, not a parser, and the limits are deliberate. It tracks brace depth with strings and
// trailing comments stripped first, because a `str` default may hold a brace and counting it would
// close the table early. Depth 1 is a family, depth 2 is one of its dials, and a `//` run directly
// above a key is that key's note. A blank line or any other statement clears the buffer, so a comment
// about the TABLE does not become the first dial's note.
const stripped = (line) => line
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/\/\/.*$/, '');

const KEY = /^\s*([A-Za-z_$][\w$]*)\s*:/;

/** family → { dial: note }, for every family declared in one module file. */
function notesInFile(file) {
  let src;
  try { src = fs.readFileSync(path.join(repoRoot, 'blocks', file), 'utf8'); } catch { return {}; }
  const out = {};
  let depth = 0;          // 0 = outside any table, 1 = inside the table, 2 = inside one family
  let inTable = false;
  let fam = null;
  let buf = [];
  for (const line of src.split('\n')) {
    const comment = /^\s*\/\/ ?(.*)$/.exec(line);
    if (comment && inTable) { buf.push(comment[1].trim()); continue; }

    const bare = stripped(line);
    if (!inTable) {
      if (/^export\s+const\s+\w*_SCHEMAS\s*=\s*\{/.test(bare)) { inTable = true; depth = 1; buf = []; }
      continue;
    }

    const key = KEY.exec(bare);
    if (key && depth === 1) { fam = key[1]; out[fam] = out[fam] || {}; }
    else if (key && depth === 2 && fam) {
      if (buf.length) out[fam][key[1]] = buf.join(' ');
    }

    const opens = (bare.match(/\{/g) || []).length;
    const closes = (bare.match(/\}/g) || []).length;
    depth += opens - closes;
    if (depth <= 0) { inTable = false; fam = null; }
    buf = [];
  }
  return out;
}

const CACHE = new Map();
/** { dial: note } for one family. Reads its module's source once, then remembers. */
export async function notesFor(family) {
  const file = await ownerOf(family);
  if (!file) return {};
  if (!CACHE.has(file)) CACHE.set(file, notesInFile(file));
  return CACHE.get(file)[family] || {};
}

// ---- the rows ------------------------------------------------------------------------------------

/**
 * One family's table as rows, in the table's own key order (which is also the order
 * blocks/schema.mjs `resolve` serialises them in), as `{ name, note, ...rule }`.
 *
 * SYNCHRONOUS, and that is what keeps the search path free: harness/author/arsenal.mjs already holds
 * the blocks module when it builds its block entries, so it calls this with the table in hand rather
 * than making its whole ranking pipeline async to fetch a fact it was already looking at.
 */
export function rowsFrom(table, notes = {}) {
  if (!table) return null;
  return Object.entries(table).map(([name, rule]) => ({ name, ...rule, note: notes[name] || null }));
}

/** The same rows, looked up by family name. `withNotes` is the only thing that reads a file. */
export async function dialsFor(family, { withNotes = false } = {}) {
  const { SCHEMAS } = await import('../../blocks/index.mjs');
  return rowsFrom(SCHEMAS[family], withNotes ? await notesFor(family) : {});
}

// A default, short enough to sit in a list of nine of them. A string prints bare when it is one word,
// because `anim=pop` is the thing an author copies and `anim="pop"` is not. Anything with structure
// prints as its KIND, since half a chart's data array in a summary line is noise, not an answer.
const shortDef = (d, kind) => {
  if (d === undefined) return null;
  if (typeof d === 'string') return /^[\w.\-#]+$/.test(d) ? d : `<${kind}>`;
  if (d === null || typeof d === 'object') return `<${kind}>`;
  return JSON.stringify(d);
};

/**
 * The one-line summary printed under a block in a search result: `w=640 h=360 title tint=0.06`.
 * A dial with no default prints bare, so the line itself says which props the block needs FROM the
 * author and which it already has an opinion about.
 */
export function compactDials(rows, { width = 84, indent = '             ' } = {}) {
  if (!rows || !rows.length) return null;
  const words = rows.map((r) => {
    const d = shortDef(r.def, r.kind);
    return d === null ? r.name : `${r.name}=${d}`;
  });
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && line.length + 1 + w.length > width) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.join(`\n${indent}`);
}
