// node --test tests/gates/craft-route.test.mjs
//
// Three fixture films, three different deliverable types, three different scene features, so the same
// gate that CAPTIONS.md/GRAMMAR.md/etc. read from route through harness/lib/craft-route.mjs to a
// different 1-3 docs each time. Fixtures live under tests/fixtures/films/ with a `crafttest-` prefix
// (the convention tests/gates/stage.test.mjs already set: never a real film, never films/scene/), and
// this file removes every one of them whether the run passes or not.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';

process.env.VAWE_FILMS_DIR = 'tests/fixtures/films';

import { stageOf } from '../../quality/gates/stage.mjs';
import { sceneFeatures, filmType, craftDocsFor } from '../../harness/lib/craft-route.mjs';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'tests/fixtures/films');
const abs = (rel) => path.join(SCENES, rel);

const written = [];
function write(rel, content) { fs.writeFileSync(abs(rel), content); written.push(abs(rel)); }
after(() => { for (const f of written) { try { fs.unlinkSync(f); } catch { /* already gone */ } } });

function markPlanJudged(sbRel) {
  writeReceipt('plan-judge', abs(sbRel));
  written.push(receiptPath('plan-judge', abs(sbRel)));
}

/** A storyboard thin enough to pass storyboard-check, so stageOf() reaches past `plan` without a
 * puppeteer frame-check run (no beat declares `weight:`). */
function storyboard(name, message) {
  const frag1 = `_${name}.hook.html`, frag2 = `_${name}.proof.html`;
  write(frag1, '<div></div>\n');
  write(frag2, '<div></div>\n');
  write(`${name}.storyboard.md`, [
    '---',
    `message: "${message}"`,
    'audience: "the test runner"',
    'threads: "one object, carried"',
    'duration: 4',
    'arc: "hook to payoff"',
    'format: "16:9"',
    'spectacle: "beat 2, the plate, a hard cut in scale"',
    'not: "no narration, no stock photos, no gradient hero"',
    '---',
    '',
    '## 1. hook (0.0-2.0)',
    '- type: html',
    `- fragment: tests/fixtures/films/${frag1}`,
    '- onscreen: "one line"',
    '- why: "opens on the claim, before the film has earned anything else"',
    '- becomes: "the claim becomes the proof"',
    '- blueprint: terminalReveal',
    '',
    '## 2. proof (2.0-4.0)',
    '- type: html',
    `- fragment: tests/fixtures/films/${frag2}`,
    '- onscreen: "one number"',
    '- why: "pays off the claim the first beat opened"',
    '- becomes: "the proof becomes the close"',
    '- blueprint: terminalReveal',
    '',
  ].join('\n'));
  markPlanJudged(`${name}.storyboard.md`);
}

// ---- fixture 1: a launch video, a camera move and a finish pass -----------------------------------
storyboard('crafttest-launch', 'a launch video for our site, market our product');
write('crafttest-launch.json', JSON.stringify({
  module: 'scene', layers: [{ type: 'text' }],
  cameraMove: { move: 'slowPush' },
  finish: { bloom: true },
}, null, 1) + '\n');

// ---- fixture 2: a vertical explainer, burnt-in captions --------------------------------------------
storyboard('crafttest-explainer', 'explain how this works, an explainer for a vertical feed');
write('crafttest-explainer.json', JSON.stringify({
  module: 'scene', layers: [{ type: 'text' }],
  captions: [{ t0: 0, t1: 1, text: 'one word' }],
}, null, 1) + '\n');

// ---- fixture 3: a sting, a three (WebGL) layer -----------------------------------------------------
storyboard('crafttest-sting', 'a sting, a logo reveal, six seconds');
write('crafttest-sting.json', JSON.stringify({
  module: 'scene', layers: [{ type: 'three' }],
}, null, 1) + '\n');

test('sceneFeatures: reads camera/finish, captions, and a three layer off the scene alone', () => {
  const launch = JSON.parse(fs.readFileSync(abs('crafttest-launch.json'), 'utf8'));
  const explainer = JSON.parse(fs.readFileSync(abs('crafttest-explainer.json'), 'utf8'));
  const sting = JSON.parse(fs.readFileSync(abs('crafttest-sting.json'), 'utf8'));

  assert.deepEqual(sceneFeatures(launch), { camera: true, three: false, captions: false, transitions: false, musicBed: false, finish: true });
  assert.deepEqual(sceneFeatures(explainer), { camera: false, three: false, captions: true, transitions: false, musicBed: false, finish: false });
  assert.deepEqual(sceneFeatures(sting), { camera: false, three: true, captions: false, transitions: false, musicBed: false, finish: false });
});

test('filmType: the brief/storyboard text alone names the deliverable, no scene needed', () => {
  assert.equal(filmType('a launch video for our site, market our product'), 'launch');
  assert.equal(filmType('explain how this works, an explainer for a vertical feed'), 'explainer');
  assert.equal(filmType('a sting, a logo reveal, six seconds'), 'sting');
  assert.equal(filmType('nothing that matches any row'), null);
});

test('craftDocsFor: never more than 3 docs, and a concrete feature outranks the type guess', () => {
  const docs = craftDocsFor({ type: 'launch', features: { camera: true, finish: true } });
  assert.ok(docs.length <= 3);
  assert.ok(docs.includes('engine-doctrine/CRAFT/GRAMMAR.md'), 'camera should route to the motion grammar doc');
  assert.ok(docs.includes('engine-doctrine/CRAFT/THEME-LOOK.md'), 'finish should route to the look/finish doc');
});

test('craftDocsFor: a caption feature routes to CAPTIONS.md', () => {
  const docs = craftDocsFor({ type: 'explainer', features: { captions: true } });
  assert.ok(docs.includes('engine-doctrine/CRAFT/CAPTIONS.md'));
});

test('craftDocsFor: a three layer routes to the discovery doc', () => {
  const docs = craftDocsFor({ type: 'sting', features: { three: true } });
  assert.ok(docs.includes('engine-doctrine/CRAFT/DISCOVERY.md'));
});

test('end to end: three fixture films of different types get three different routed doc sets', () => {
  const launch = stageOf('crafttest-launch');
  const explainer = stageOf('crafttest-explainer');
  const sting = stageOf('crafttest-sting');

  for (const st of [launch, explainer, sting]) assert.ok(st.craftDocs.length >= 1 && st.craftDocs.length <= 3);

  assert.ok(launch.craftDocs.includes('engine-doctrine/CRAFT/GRAMMAR.md'));
  assert.ok(explainer.craftDocs.includes('engine-doctrine/CRAFT/CAPTIONS.md'));
  assert.ok(sting.craftDocs.includes('engine-doctrine/CRAFT/DISCOVERY.md'));

  const sets = [launch.craftDocs, explainer.craftDocs, sting.craftDocs].map((d) => d.join('|'));
  assert.equal(new Set(sets).size, 3, 'three different films should not all read the same docs');
});
