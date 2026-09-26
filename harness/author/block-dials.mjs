import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
