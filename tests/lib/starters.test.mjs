// The page `vawe new` starts from depends on the film type (harness/cli/route.mjs STARTERS): a sting, a brand launch and a story
// each have a starter file; every other type takes the general one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STARTERS, readRouting, starterSpec, starterType } from '../../harness/cli/route.mjs';
import { newFilm, starterPage, starterFace, typeBeats } from '../../harness/cli/new.mjs';
import { isStarterPage } from '../../harness/lib/frames-page.mjs';
import { measuredSections } from '../../harness/lib/measured-brief.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TYPES = Object.keys(STARTERS);
// the shortest length that routes to the type starter (STARTERS min, else the sting length), and the default of its template
const LENGTHS = { sting: [5], 'brand launch': [15, 16], 'story or explainer': [30] };
const worldIds = (page) => [...page.matchAll(/data-world="([a-z0-9-]+)"/g)].map((m) => m[1]);

function newIn(name, options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-starters-'));
  for (const dir of ['prompts', 'guides', 'assets/fonts']) {
    fs.mkdirSync(path.dirname(path.join(root, dir)), { recursive: true });
    fs.symlinkSync(path.join(ROOT, dir), path.join(root, dir));
  }
  const log = console.log;
  console.log = () => {};
  try {
    const made = newFilm(name, { root, defaults: true, ...options });
    return { made, page: fs.readFileSync(path.join(root, made.page), 'utf8'), brief: fs.readFileSync(path.join(root, 'films', name, 'brief.md'), 'utf8') };
  } finally {
    console.log = log;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('every starter type is a ROUTING.md film type with a starter file', () => {
  const rows = Object.keys(readRouting(ROOT));
  for (const [type, { file }] of Object.entries(STARTERS)) {
    assert.ok(rows.includes(type), `${type} is not a row of guides/ROUTING.md`);
    assert.ok(fs.existsSync(path.join(ROOT, 'harness/cli/starters', `${file}.html`)), `${file}.html`);
  }
});

test('a request routes to the starter of its film type', () => {
  const sting = newIn('zz-a', { request: 'a 5 s logo reveal sting for Acme', title: 'Acme' });
  assert.match(sting.page, /the quiet beat/);
  assert.deepEqual(worldIds(sting.page), ['s1', 's2', 's3']);
  const launch = newIn('zz-b', { request: 'a 16 s launch film for https://acme.example', title: 'Ship faster' });
  assert.match(launch.page, /data-ui/);
  assert.deepEqual(worldIds(launch.page), ['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
  const story = newIn('zz-c', { request: 'a 30 s explainer: how a refund works', title: 'Refund fast' });
  assert.match(story.page, /class="flow"/);
  assert.deepEqual(worldIds(story.page), Array.from({ length: 12 }, (_, i) => `s${i + 1}`));
});

test('the template Length line is the one owner: the brief and the page say the same seconds', () => {
  for (const [name, request] of [['zz-i', 'a launch film for https://acme.example'], ['zz-j', 'an explainer: how a refund works']]) {
    const { page, brief } = newIn(name, { request, title: 'Refund fast' });
    const line = brief.match(/^- (?:Platform|Length)[^:]*: .*?(\d+(?:\.\d+)?) s/m);
    assert.ok(line, `${name}: no length line in the brief`);
    assert.match(page, new RegExp(`<meta name="duration" content="${line[1]}">`), name);
  }
});

test('a film shorter than the template Length takes the general starter', () => {
  for (const [name, request] of [['zz-k', 'an 11 s launch film for https://acme.example'], ['zz-l', 'an 11 s explainer: how a refund works']]) {
    assert.match(newIn(name, { request }).page, /<ul class="facts">/, name);
  }
});

test('the length picks the starter: general below the short min and past the short max, short between, full from the min', () => {
  const route = (type) => ({ known: true, type });
  const spec = (type, length) => (starterType(route(type), length) ? starterSpec(type, length).worlds?.length ?? 'full' : 'general');
  assert.deepEqual([7.9, 8, 9, 9.1, 14.9, 15].map((s) => spec('brand launch', s)), ['general', 4, 4, 'general', 'general', 'full']);
  assert.deepEqual([8.9, 9, 9.5, 9.6, 29.9, 30].map((s) => spec('story or explainer', s)), ['general', 4, 4, 'general', 'general', 'full']);
});

test('the short starter pages keep the worlds of the full starter, declare no waiver and match the brief Shots ids', () => {
  for (const [type, lengths, ids] of [['brand launch', [8, 9], ['s1', 's2', 's4', 's7']], ['story or explainer', [9, 9.5], ['s1', 's2', 's6', 's12']]]) {
    for (const length of lengths) {
      const page = starterPage({ type, length, title: 'Acme', face: starterFace('zz-short') });
      assert.deepEqual(worldIds(page), ids, `${type} ${length} s`);
      const beats = typeBeats(type, length);
      assert.deepEqual(beats.map((b) => b.id), ids);
      const { spec } = measuredSections({ name: 'zz-short', request: 'r', title: 'Acme', length, beats, face: starterFace('zz-short') }).sections;
      assert.deepEqual(spec.split('\n').filter((l) => /^\| s\d+ /.test(l)).map((l) => l.split('|')[1].trim()), ids);
      assert.doesNotMatch(page, /id="authoring"|\{\{/);
      assert.match(page, new RegExp(`<meta name="duration" content="${length}">`));
    }
  }
});

test('the template Length line states the short minimum of its starter', () => {
  for (const [file, type] of [['brand-launch-from-url', 'brand launch'], ['story-explainer', 'story or explainer']]) {
    const low = fs.readFileSync(path.join(ROOT, 'prompts', `${file}.md`), 'utf8').match(/^\*\*Length:\*\* (\d+)/m)[1];
    assert.equal(Number(low), STARTERS[type].short.min, file);
  }
});

test('a starter page declares no waiver', () => {
  for (const type of TYPES) assert.doesNotMatch(starterPage({ type, length: LENGTHS[type].at(-1), title: 'Acme' }), /id="authoring"/, type);
});

test('another film type, and a film made with --from, keep the general starter', () => {
  const reel = newIn('zz-d', { request: 'a showreel of our work', length: 15 });
  assert.match(reel.page, /<ul class="facts">/);
  const unclear = newIn('zz-g', { request: 'something with our logo in it' });
  assert.match(unclear.page, /<ul class="facts">/);
  const invented = newIn('zz-h', { request: 'a launch film for an invented product' });
  assert.match(invented.page, /<ul class="facts">/);
  const from = newIn('zz-e', { from: path.join(ROOT, 'prompts/beat-sheet.md'), length: 6 });
  assert.match(from.page, /<ul class="facts">/);
});

test('the brief Shots table has one row per world of the type starter', () => {
  const { page, brief } = newIn('zz-f', { request: 'a 16 s launch film for https://acme.example', title: 'Ship faster' });
  const shots = brief.split('### Shots')[1].split('### Words')[0].split('\n').filter((l) => /^\| s\d /.test(l));
  assert.deepEqual(shots.map((l) => l.split('|')[1].trim()), worldIds(page));
  assert.match(shots[1], /^\| s2 \| 2\.3 \| 5\.3 \|/);
});

test('the shortest length of each type starter is the STARTERS min', () => {
  for (const type of TYPES) assert.equal(LENGTHS[type][0], STARTERS[type].min ?? LENGTHS[type][0], type);
});

for (const type of TYPES) {
  const length = LENGTHS[type].at(-1);
  const make = (extra = {}) => starterPage({ type, length, title: 'Acme', face: starterFace('zz-type'), ...extra });

  test(`${type}: a valid page under the contract`, () => {
    const page = make();
    assert.doesNotMatch(page, /\{\{|undefined|NaN/);
    assert.match(page, new RegExp(`<meta name="duration" content="${length}">`));
    assert.match(page, /<meta name="message" /);
    assert.match(page, /<meta name="spectacle" content="\d+(\.\d+)?">/);
    assert.match(page, /<meta name="signature" content="band=; ease=; stagger=; seam=; palette=; thread=">/);
    assert.doesNotMatch(page, /cubic-bezier|system-ui|<audio|data-synth|https?:/);
    assert.match(page, /@font-face \{ font-family: "[^"]+"; src: url\("assets\/[A-Za-z]+\.woff2"\)/);
    assert.match(page, /EASE\./);
    const beats = typeBeats(type, length);
    assert.deepEqual(worldIds(page), beats.map((b) => b.id));
    for (const b of beats) assert.match(page, new RegExp(`--beat-${beats.indexOf(b) + 1}: ${b.start}s;`));
  });

  test(`${type}: sizes follow the frame, so no aspect crops it`, () => {
    const page = make({ aspect: '9:16' });
    assert.match(page, /<html data-aspect="9:16">/);
    assert.doesNotMatch(page, /font-size: \d+(\.\d+)?px/);
  });

  test(`${type}: the spectacle second lies inside the film, after the first world`, () => {
    const spectacle = Number(make().match(/<meta name="spectacle" content="([\d.]+)">/)[1]);
    assert.ok(spectacle > typeBeats(type, length)[1].start && spectacle < length, `${spectacle} s`);
  });

  test(`${type}: still reads as the unedited starter`, () => {
    assert.equal(isStarterPage(make()), true);
  });
}
