import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const recipes = fs.readFileSync(path.join(ROOT, 'prompts/moves/RECIPES.md'), 'utf8');
const SLOT = "invent: the film's own moment";

test('every recipe has exactly one invention slot, in a beat row with a line on what to invent', () => {
  const sections = recipes.split(/^## (?=\d+\. )/m).slice(1);
  assert.equal(sections.length, 15);
  for (const section of sections) {
    const title = section.split('\n')[0];
    const rows = section.split('\n').filter((l) => l.startsWith('|') && l.split('|')[2]?.trim() === SLOT);
    assert.equal(rows.length, 1, `${title}: slot rows`);
    const cells = rows[0].split('|').map((c) => c.trim());
    assert.ok(cells[3].length > 20, `${title}: the carry cell says what to invent`);
  }
});
