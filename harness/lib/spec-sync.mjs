// The brief's Words appear/settle cells and Objects in/settle/out cells rewritten from the times the last draft
// measured (the `spec` of out/<name>.acceptance.json, measuredSpec in spec-conformance.mjs). Text, shot and the
// target cells (cap, x, y) stay. A cell that changed ends in `*`; the next sync clears the mark. Pure.
import { COLUMNS, tableRows, numberOf } from './brief-tables.mjs';

const MARK = '*';
const SAME_S = 0.005;

const cellsToLine = (cells) => `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;

function newCell(old, value) {
  const text = old.replace(/^`+|`+$/g, '').replace(/\*$/, '').trim();
  const before = numberOf(text);
  const unit = /\s*s$/.test(text) ? ' s' : '';
  const next = `${+value.toFixed(2)}${unit}`;
  return before !== null && Math.abs(before - value) <= SAME_S ? { cell: old.replace(/\s*\*$/, ''), changed: false } : { cell: `${next}${MARK}`, changed: true, from: text };
}

function syncTable(lines, name, keyOf, fields, measured) {
  const changes = [];
  const missing = [];
  for (const { line, cells, row } of tableRows(lines, name)) {
    const found = measured.find((m) => keyOf(m).toLowerCase() === String(row[name === 'Words' ? 'text' : 'id']).toLowerCase());
    if (!found) { missing.push(`${name} "${row[name === 'Words' ? 'text' : 'id']}"`); continue; }
    const next = [...cells];
    for (const f of fields) {
      const i = COLUMNS[name].indexOf(f);
      if (found[f] == null || row[f] === null) continue;
      const { cell, changed, from } = newCell(cells[i] ?? '', found[f]);
      next[i] = cell;
      if (changed) changes.push(`${name} "${row[name === 'Words' ? 'text' : 'id']}" ${f}: ${from} -> ${cell.slice(0, -1)}`);
    }
    if (next.some((c, i) => c !== cells[i])) lines[line] = cellsToLine(next);
  }
  return { changes, missing };
}

/** { text, changes, missing }: the brief text with the measured times written in, the changed cells as lines, the rows no measure matched. */
export function syncSpec(briefText, measured) {
  const lines = briefText.split('\n');
  const words = syncTable(lines, 'Words', (m) => m.text, ['appear', 'settle'], measured.words);
  const objects = syncTable(lines, 'Objects', (m) => m.id, ['in', 'settle', 'out'], measured.objects);
  return { text: lines.join('\n'), changes: [...words.changes, ...objects.changes], missing: [...words.missing, ...objects.missing] };
}
