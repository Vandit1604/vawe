import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newFilm, newFilmLines } from '../../harness/cli/new.mjs';
import { parseDirections, directionsLines } from '../../harness/lib/directions.mjs';
import { ACCEPTANCE, GUESS } from '../../harness/lib/measured-brief.mjs';
import { briefLine } from '../../harness/lib/draft-check.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');

function briefFor(template, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-brief-'));
  fs.mkdirSync(path.join(root, 'prompts'));
  fs.copyFileSync(path.join(ROOT, 'prompts', template), path.join(root, 'prompts', template));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.symlinkSync(path.join(ROOT, 'assets/fonts'), path.join(root, 'assets/fonts'));
  const log = console.log;
  console.log = () => {};
  let made;
  try { made = newFilm('zz', { root, from: path.join(root, 'prompts', template), ...options }); } finally { console.log = log; }
  const text = fs.readFileSync(path.join(root, 'films/zz/brief.md'), 'utf8');
  fs.rmSync(root, { recursive: true, force: true });
  return { text, made };
}

const headings = (text) => [...text.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1]);

test('vawe new writes every section of the measured brief, in order', () => {
  const { text } = briefFor('brand-launch-from-url.md', { request: 'a launch film for acme', length: 20, title: 'Ship faster' });
  const order = ['Inputs', 'Task', 'Directions', 'Look', 'Spec', 'Shots', 'Words', 'Objects', 'Acceptance', 'Gates', 'Pitfalls', 'Deliver', 'Build', 'First draft'];
  const found = headings(text);
  const at = order.map((h) => found.indexOf(h));
  assert.ok(at.every((i) => i >= 0), `missing: ${order.filter((h) => !found.includes(h))}`);
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.ok(!found.includes('Keep and swap'), 'a launch film has no reference');
});

test('the Spec and Acceptance tables have the fixed header rows', () => {
  const { text } = briefFor('beat-sheet.md');
  for (const row of [
    '| id | start s | end s | the viewer notices | move in | move out | camera |',
    '| text | shot | appear s | settle s | cap % | x % | y % | weight | colour |',
    '| id | selector | shot | in s | settle s | out s |',
    '| metric | target |',
  ]) assert.ok(text.includes(`${row}\n`), row);
  for (const [metric, target] of ACCEPTANCE) assert.ok(text.includes(`| ${metric} | ${target} |`), metric);
  assert.equal(ACCEPTANCE.length, 16);
});

test('each table carries one example row marked as a guess, derived from the request', () => {
  const { text } = briefFor('beat-sheet.md', { length: 10, title: 'Ship faster' });
  const spec = text.split('## Spec')[1].split('## Acceptance')[0];
  const rows = spec.split('\n').filter((l) => l.includes(GUESS));
  assert.equal(rows.length, 3);
  assert.match(rows[0], /^\| s1 \(guess: change me\) \| 0 \| 5 \| Ship faster \|/);
  assert.match(rows[1], /^\| Ship faster \(guess: change me\) \| s1 \|/);
});

test('every field the request does not answer is a marked guess, and one line names them', () => {
  const { text, made } = briefFor('beat-sheet.md', { request: 'a five second sting', length: 5 });
  const look = text.split('## Look')[1].split('## ')[0];
  for (const key of ['ground', 'ink', 'accent', 'typeface', 'cap height', 'surface']) {
    assert.match(look, new RegExp(`^- ${key}: .+ \\(guess: change me\\)$`, 'm'));
  }
  assert.match(text, /^- what: a five second sting$/m);
  assert.match(text, /^- spectacle: 3 s \(guess: change me\)$/m);
  assert.deepEqual(made.guesses.slice(0, 4), ['for', 'message', 'spectacle', 'ground']);
  const line = newFilmLines('zz', made).find((l) => l.startsWith('guessed'));
  assert.match(line, /for, message, spectacle, ground, ink, accent, typeface, cap height, surface, shots, words, objects$/);
});

test('the three directions slots still parse, and the brief still counts as unanswered without a request', () => {
  const { text } = briefFor('brand-launch-from-url.md');
  const d = parseDirections(text);
  assert.deepEqual(d.slots.map((s) => s.id), ['A', 'B', 'C']);
  assert.match(directionsLines(text, 'films/zz')[0], /^directions: empty/);
  assert.match(briefLine(text), /template defaults/);
  assert.equal(briefLine(briefFor('brand-launch-from-url.md', { request: 'x' }).text), null);
});

test('a reference template adds Keep and swap between Look and Spec', () => {
  const { text, made } = briefFor('reference-rebuild.md');
  const found = headings(text);
  assert.ok(found.indexOf('Look') < found.indexOf('Keep and swap') && found.indexOf('Keep and swap') < found.indexOf('Spec'));
  assert.ok(made.guesses.includes('keep and swap'));
});
