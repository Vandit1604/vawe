import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { recipeEcho, recipeMoves, shotMoveCells } from '../../harness/lib/recipe-echo.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const recipes = fs.readFileSync(path.join(ROOT, 'prompts/moves/RECIPES.md'), 'utf8');

const shots = (rows) => `### Shots\n| id | start s | end s | the viewer notices | move in | move out | camera |\n|---|---|---|---|---|---|---|\n${rows.map(([i, o], n) => `| s${n} | 0 | 1 | x | ${i} | ${o} | static |`).join('\n')}\n\n### Words\n`;

test('recipeMoves reads every chain in table order', () => {
  const chains = recipeMoves(recipes);
  assert.equal(Object.keys(chains).length, 14);
  assert.deepEqual(chains[1], ['text-as-mask', 'color-block-wipe', 'logo-sting', 'blur-word-cascade']);
});

test('shotMoveCells reads only the move in and move out cells', () => {
  assert.deepEqual(shotMoveCells(shots([['Text as mask', '[color-block-wipe](x.md)']])), ['text-as-mask-color-block-wipe']);
  assert.deepEqual(shotMoveCells('# no shots table'), []);
});

test('a Shots table that follows a chain 1:1 gets one advice line naming a move', () => {
  const brief = shots([['text-as-mask', 'cut'], ['color-block-wipe', 'cut'], ['logo-sting', 'cut'], ['blur-word-cascade', 'cut']]);
  const [line, ...more] = recipeEcho(brief, recipes);
  assert.equal(more.length, 0);
  assert.match(line, /^the beats follow recipe 1 almost 1:1; turn the \S+ beat into the film's own moment$/);
});

test('three of four moves in order is over 70 percent; two of four is not', () => {
  const three = shots([['text-as-mask', 'cut'], ['logo-sting', 'cut'], ['blur-word-cascade', 'cut']]);
  assert.match(recipeEcho(three, recipes)[0], /recipe 1 /);
  const two = shots([['text-as-mask', 'cut'], ['my own reveal', 'cut'], ['blur-word-cascade', 'cut']]);
  assert.deepEqual(recipeEcho(two, recipes), []);
});

test('the same moves in another order, or a film of its own moves, give no advice', () => {
  const reversed = shots([['blur-word-cascade', 'cut'], ['logo-sting', 'cut'], ['color-block-wipe', 'cut'], ['text-as-mask', 'cut']]);
  assert.deepEqual(recipeEcho(reversed, recipes), []);
  assert.deepEqual(recipeEcho(shots([['a ring opens', 'whip']]), recipes), []);
});

test('the advice names a move the film can change, not exit-fast or drift-hold', () => {
  const brief = shots([['count-up', 'exit-fast'], ['chart-build', 'exit-fast'], ['logo-wall', 'exit-fast'], ['wordmark-cascade', 'cta-pop'], ['drift-hold', 'cut']]);
  const line = recipeEcho(brief, recipes)[0];
  assert.match(line, /recipe 12 /);
  assert.doesNotMatch(line, /turn the (exit-fast|drift-hold) beat/);
});
