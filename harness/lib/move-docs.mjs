// The move docs of prompts/moves a filled Board names, as advice lines: the path to read and its "Use when" sentence.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moveRows, boardFilled } from './board.mjs';

const MOVES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prompts/moves');
const INDEX_DOCS = new Set(['README', 'RECIPES']);
const MAX_LINES = 6;
const WHEN_MAX = 110;

const plain = (s) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** The first sentence after "**Use when**" of a move doc, or null when it has none. */
export function whenToUse(markdown) {
  const m = /\*\*Use when\*\*\s+([\s\S]*?)(?:\.\s|\.$|\n\n)/.exec(markdown);
  if (!m) return null;
  const text = m[1].replace(/\s+/g, ' ').trim();
  return text.length > WHEN_MAX ? `${text.slice(0, WHEN_MAX - 3)}...` : text;
}

/** [{ name, when }] for every move doc in `dir`, longest name first so "whip pan" wins over "pan". */
export function moveDocs(dir = MOVES_DIR) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !INDEX_DOCS.has(f.slice(0, -3)))
    .map((f) => ({ name: f.slice(0, -3), when: whenToUse(fs.readFileSync(path.join(dir, f), 'utf8')) }))
    .sort((a, b) => b.name.length - a.name.length);
}

/** One advice line per move doc that a Board move cell names (at most MAX_LINES): where to read it and when it applies. [] for a brief with no filled Board. */
export function moveDocLines(brief, docs = moveDocs()) {
  if (boardFilled(brief ?? '') !== true) return [];
  const named = new Set();
  for (const { move } of moveRows(brief)) {
    const cell = plain(move);
    const hit = docs.find((d) => cell.includes(plain(d.name)));
    if (hit) named.add(hit);
  }
  const lines = [...named].map((d) => `board: read prompts/moves/${d.name}.md${d.when ? ` (use when ${d.when})` : ''}`);
  return lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), `board: ${lines.length - MAX_LINES} more named moves, docs in prompts/moves/`] : lines;
}
