// The page `vawe new` starts from depends on the film type (harness/cli/route.mjs STARTERS): a sting, a brand launch and a story
// each have a starter file; every other type takes the general one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STARTERS, readRouting } from '../../harness/cli/route.mjs';
import { newFilm, starterPage, starterFace, typeBeats } from '../../harness/cli/new.mjs';
import { isStarterPage } from '../../harness/lib/frames-page.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const TYPES = Object.keys(STARTERS);
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
  const launch = newIn('zz-b', { request: 'an 11 s launch film for https://acme.example', title: 'Ship faster' });
  assert.match(launch.page, /data-ui/);
  assert.deepEqual(worldIds(launch.page), ['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
  const story = newIn('zz-c', { request: 'an 11 s explainer: how a refund works', title: 'Refund fast' });
  assert.match(story.page, /class="flow"/);
  assert.deepEqual(worldIds(story.page), ['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
});

test('a request that names no length gets the length of the type starter', () => {
  const launch = newIn('zz-i', { request: 'a launch film for https://acme.example', title: 'Ship faster' });
  assert.match(launch.page, new RegExp(`<meta name="duration" content="${STARTERS['brand launch'].length}">`));
  const story = newIn('zz-j', { request: 'an explainer: how a refund works', title: 'Refund fast' });
  assert.match(story.page, new RegExp(`<meta name="duration" content="${STARTERS['story or explainer'].length}">`));
});

test('a starter page declares no waiver', () => {
  for (const type of TYPES) assert.doesNotMatch(starterPage({ type, length: STARTERS[type].length ?? 5, title: 'Acme' }), /id="authoring"/, type);
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
  const { page, brief } = newIn('zz-f', { request: 'an 11 s launch film for https://acme.example', title: 'Ship faster' });
  const shots = brief.split('### Shots')[1].split('### Words')[0].split('\n').filter((l) => /^\| s\d /.test(l));
  assert.deepEqual(shots.map((l) => l.split('|')[1].trim()), worldIds(page));
  assert.match(shots[1], /^\| s2 \| 1\.58 \| 3\.64 \|/);
});

for (const type of TYPES) {
  const length = { sting: 5, 'brand launch': 11, 'story or explainer': 10.5 }[type];
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
