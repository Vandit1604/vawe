// The SPEC and ACCEPTANCE tables of a brief.md, as plain arrays. A missing table gives an empty array, so
// an old brief with no tables parses to nothing. Columns are read by position, in the order the brief writes them.
import fs from 'node:fs';
import path from 'node:path';

const COLUMNS = {
  Shots: ['id', 'start', 'end', 'notices', 'moveIn', 'moveOut', 'camera'],
  Words: ['text', 'shot', 'appear', 'settle', 'cap', 'x', 'y', 'weight', 'colour'],
  Objects: ['id', 'selector', 'shot', 'in', 'settle', 'out'],
  Acceptance: ['metric', 'target'],
};
const NUMERIC = new Set(['start', 'end', 'appear', 'settle', 'cap', 'x', 'y', 'in', 'out']);

const cellsOf = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
const isSeparator = (cells) => cells.every((c) => /^:?-{2,}:?$/.test(c));
const clean = (c) => c.replace(/^`+|`+$/g, '').trim();

/** "1.2 s" and "14%" give a number; "", "-" and prose give null. */
export function numberOf(cell) {
  const m = /^\s*(-?\d+(?:\.\d+)?|-?\.\d+)\s*(?:s|%)?\s*$/.exec(cell);
  return m ? Number(m[1]) : null;
}

function rowsAfter(lines, from) {
  const rows = [];
  for (let i = from + 1; i < lines.length && !/^#{1,6}\s/.test(lines[i]); i++) {
    if (!lines[i].trim().startsWith('|')) continue;
    rows.push(cellsOf(lines[i]));
  }
  return rows.slice(1).filter((r) => !isSeparator(r));
}

function table(lines, name) {
  const head = lines.findIndex((l) => new RegExp(`^#{2,4}\\s+${name}\\s*$`, 'i').test(l.trim()));
  if (head < 0) return [];
  const keys = COLUMNS[name];
  return rowsAfter(lines, head).filter((r) => r.some(Boolean)).map((cells) => Object.fromEntries(keys.map((k, i) => {
    const cell = clean(cells[i] ?? '');
    return [k, NUMERIC.has(k) ? numberOf(cell) : cell];
  })));
}

/** { shots, words, objects, acceptance } from the text of a brief.md; null text gives four empty arrays. */
export function parseBriefTables(text) {
  const lines = String(text ?? '').split('\n');
  return { shots: table(lines, 'Shots'), words: table(lines, 'Words'), objects: table(lines, 'Objects'), acceptance: table(lines, 'Acceptance') };
}

/** The text of the brief.md next to a page, or null when there is none. */
export function readBrief(pagePath) {
  try { return fs.readFileSync(path.join(path.dirname(path.resolve(pagePath)), 'brief.md'), 'utf8'); } catch { return null; }
}
