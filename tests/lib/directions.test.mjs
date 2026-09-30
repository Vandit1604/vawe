import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseDirections, rangeProblems, directionsLines, hueFamilies, typefaceKey, sameMove, familyOf } from '../../harness/lib/directions.mjs';
import { newFilm } from '../../harness/cli/new.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');

const slot = (id, f) => `### ${id}\n\n${Object.entries(f).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`;
const brief = (slots, picked = '- picked: B, because the object carries the promise') => `# x: brief\n\n## Directions\n\nintro\n\n${slots.join('\n')}\n${picked}\n\n## Beats\n\n- family: ignored here\n`;

const RANGED = [
  slot('A', { family: 'type-led', sentence: 'the name folds open', 'key frame': 'a huge serif word', palette: '#efe9dc, #16151a, vermilion #d8432b', typeface: 'Fraunces 900 italic', move: 'fold the lines', thread: 'the word' }),
  slot('B', { family: 'object-led', sentence: 'the bottle pours', 'key frame': 'a glass bottle on stone', palette: '#25211d, green #2f7d5b', typeface: 'IBM Plex Mono', move: 'pour into the frame', thread: 'the liquid' }),
  slot('C', { family: 'graphic-led', sentence: 'bars keep time', 'key frame': 'ultramarine bars on yellow', palette: '#f2c14e, #2336c8', typeface: 'Avenir Next Condensed', move: 'slice across on the beat', thread: 'the bars' }),
];

test('parseDirections reads three slots, their fields and the picked line', () => {
  const d = parseDirections(brief(RANGED));
  assert.equal(d.found, true);
  assert.deepEqual(d.slots.map((s) => s.id), ['A', 'B', 'C']);
  assert.equal(d.slots[1].fields['key frame'], 'a glass bottle on stone');
  assert.deepEqual(d.picked, { id: 'B', reason: 'the object carries the promise' });
  assert.equal(parseDirections('# no section').found, false);
  assert.equal(parseDirections(brief(RANGED, '- picked: [A, B or C], because [one reason]')).picked.id, null);
});

test('rangeProblems: three families, hues, faces and moves apart give no advice', () => {
  assert.deepEqual(rangeProblems(parseDirections(brief(RANGED)).slots), []);
});

test('rangeProblems flags a shared family, hue family, typeface, move and two attractor heroes', () => {
  const twin = [
    slot('A', { family: 'graphic', sentence: 'a glowing sun rises', 'key frame': 'an orange sun on dusk', palette: 'amber #ff8a1f on navy', typeface: 'Fraunces', move: 'bloom from the centre', thread: 'the light' }),
    slot('B', { family: 'graphic, colour field', sentence: 'a ring of light', 'key frame': 'a thin ring', palette: 'orange #f06a1a', typeface: 'Fraunces 700', move: 'bloom outward', thread: 'the ring' }),
    RANGED[0],
  ];
  const out = rangeProblems(parseDirections(brief(twin)).slots).join('\n');
  assert.match(out, /A and B are both graphic-led/);
  assert.match(out, /A and B share the orange hue family/);
  assert.match(out, /A and B use the same typeface \(fraunces\)/);
  assert.match(out, /A and B have the same signature move/);
  assert.match(out, /A and B carry the film on a circle, orb, sun, ring or glow/);
});

test('empty slots are not compared', () => {
  assert.deepEqual(rangeProblems([{ id: 'A', fields: { family: 'type' } }, { id: 'B', fields: { family: 'type' } }]), []);
});

test('the pieces: hue families ignore neutrals, faces drop weights, moves compare by verb', () => {
  assert.deepEqual([...hueFamilies('#efe9dc #16151a #ffffff')], []);
  assert.deepEqual([...hueFamilies('#2336c8 and gold')].sort(), ['blue', 'yellow']);
  assert.equal(typefaceKey('Fraunces 900 Italic, serif'), 'fraunces');
  assert.equal(sameMove('fold the letters', 'fold the sheet'), true);
  assert.equal(sameMove('pour', 'slice'), false);
  assert.equal(familyOf('object-led (a real thing or the product UI)'), 'object');
});

test('directionsLines: empty, filled without a pick, filled and picked', () => {
  assert.match(directionsLines(brief([slot('A', { family: 'type' })]), 'films/x')[0], /^directions: empty; fill three .*films\/x\/directions.html --fresh --stage stills/);
  assert.match(directionsLines(brief(RANGED, ''), 'films/x')[0], /no `picked:` with a reason/);
  assert.deepEqual(directionsLines(brief(RANGED), 'films/x'), []);
  assert.deepEqual(directionsLines(null, 'films/x'), []);
});

test('vawe new writes three empty family slots, a picked line and three starter stills', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-new-'));
  fs.mkdirSync(path.join(root, 'prompts'));
  fs.copyFileSync(path.join(ROOT, 'prompts/brand-launch-from-url.md'), path.join(root, 'prompts/brand-launch-from-url.md'));
  const log = console.log;
  console.log = () => {};
  try { newFilm('zz', { root }); } finally { console.log = log; }
  const text = fs.readFileSync(path.join(root, 'films/zz/brief.md'), 'utf8');
  const d = parseDirections(text);
  assert.deepEqual(d.slots.map((s) => familyOf(s.fields.family)), ['type', 'object', 'graphic']);
  assert.equal(d.picked.id, null);
  assert.match(directionsLines(text, 'films/zz')[0], /^directions: empty/);
  const html = fs.readFileSync(path.join(root, 'films/zz/directions.html'), 'utf8');
  assert.match(html, /A, type-led[\s\S]*B, object-led[\s\S]*C, graphic-led/);
  fs.rmSync(root, { recursive: true, force: true });
});
