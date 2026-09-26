// node --test tests/gates/stage.test.mjs
//
// Every one of the seven stages, derived by stageOf() from fixture films this file builds and removes
// itself. THIS MATTERS: harness/live/test/stage-gate.test.mjs used to borrow a real film,
// vawe-oblique, as a fixture, and it broke the day that film's own state moved on (the state it
// needed to test stopped existing). The fix there, and the rule here, is the same: never borrow a real
// film's CURRENT state as a fixture, because a real film's state is the one thing this repo promises
// will keep changing.
//
// Fixtures live under tests/fixtures/films/ (VAWE_FILMS_DIR points stageOf there for this run, never
// films/scene/, which is real film content this suite must not depend on) with a `stagetest-` prefix,
// and `after()` deletes every one of them whether a test passed or not.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { stageOf } from '../../quality/gates/stage.mjs';
import { firstCommand } from '../../quality/gates/next.mjs';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';

// stageOf/lookBlock/firstCommand's own path resolution reads VAWE_FILMS_DIR (default films/scene/,
// real film content this suite must not depend on); this file's fixtures live at tests/fixtures/films/
// instead. Set before stage.mjs/next.mjs are imported below, since they may read it at module scope.
process.env.VAWE_FILMS_DIR = 'tests/fixtures/films';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'tests/fixtures/films');
const abs = (rel) => path.join(SCENES, rel);

const written = [];
function write(rel, content) { fs.writeFileSync(abs(rel), content); written.push(abs(rel)); }
after(() => { for (const f of written) { try { fs.unlinkSync(f); } catch { /* already gone */ } } });

// `plan.done` (quality/gates/stage.mjs) needs a fresh plan-judge receipt, not a passing
// storyboard-check alone (every stage past `plan` used to be reachable by structure alone). A fixture
// that means to sit past `plan` marks itself judged the same way `make plan-judge` really does.
function markPlanJudged(sbRel) {
  writeReceipt('plan-judge', abs(sbRel));
  written.push(receiptPath('plan-judge', abs(sbRel)));
}

// A storyboard that passes storyboard-check AND frame-check with zero errors (warnings are fine), so a
// stage past `plan` can be reached without spinning up the puppeteer half of frame-check: that half
// only runs when a beat declares `weight:`, which this fixture never does.
function passingStoryboard(name, { layers = false } = {}) {
  const frag1 = `_${name}.hook.html`, frag2 = `_${name}.proof.html`;
  write(frag1, '<div></div>\n');
  write(frag2, '<div></div>\n');
  write(`${name}.storyboard.md`, [
    '---',
    'message: "A fixture film, so the derivation has a plan to grade."',
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
  write(`${name}.json`, JSON.stringify({ module: 'scene', layers: layers ? [{ type: 'text' }] : [] }, null, 1) + '\n');
  markPlanJudged(`${name}.storyboard.md`);
}

test('stage 1, brief: no brief, no storyboard, nothing written at all', () => {
  const st = stageOf('stagetest-nothing-here-at-all');
  assert.equal(st.stage, 'brief');
  assert.match(st.next, /make quiz/);
});

test('stage 2, plan: a brief exists (so stage 1 is done) and no storyboard does', () => {
  write('stagetest-plan.brief.md', 'SUBJECT one line\n');
  const st = stageOf('stagetest-plan');
  assert.equal(st.stage, 'plan');
  assert.match(st.next, /STORYBOARD-TEMPLATE/);
});

test('stage 2, plan: a storyboard exists and fails its own gate', () => {
  write('stagetest-plan-bad.storyboard.md', '---\nmessage: "too thin to pass"\n---\n\n## 1. only one beat\n');
  const st = stageOf('stagetest-plan-bad');
  assert.equal(st.stage, 'plan');
  assert.match(st.next, /storyboard-check/);
});

test('stage 3, design: the storyboard passes its gate and a beat names a fragment that does not exist', () => {
  write('stagetest-design.storyboard.md', [
    '---',
    'message: "A fixture film, so the derivation has a plan to grade."',
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
    '- fragment: tests/fixtures/films/_stagetest-design.hook.html',
    '- onscreen: "one line"',
    '- why: "opens on the claim, before the film has earned anything else"',
    '- becomes: "the claim becomes the proof"',
    '- blueprint: terminalReveal',
    '',
    '## 2. proof (2.0-4.0)',
    '- type: html',
    '- fragment: tests/fixtures/films/_stagetest-design.proof.html',
    '- onscreen: "one number"',
    '- why: "pays off the claim the first beat opened"',
    '- becomes: "the proof becomes the close"',
    '- blueprint: terminalReveal',
    '',
  ].join('\n'));
  write('stagetest-design.json', JSON.stringify({ module: 'scene', layers: [] }, null, 1) + '\n');
  markPlanJudged('stagetest-design.storyboard.md');
  // deliberately never writing the two fragment files
  const st = stageOf('stagetest-design');
  assert.equal(st.stage, 'design');
  assert.equal(st.missingFrags.length, 2);
  assert.match(st.next, /stagekit\.mjs/);
});

test('stage 4, assemble: frames match the plan, the scene JSON has no layers', () => {
  passingStoryboard('stagetest-assemble', { layers: false });
  const st = stageOf('stagetest-assemble');
  assert.equal(st.stage, 'assemble');
  assert.match(st.next, /make assemble/);
});

test('stage 5, direct: layers exist, no transition does', () => {
  passingStoryboard('stagetest-direct', { layers: true });
  const st = stageOf('stagetest-direct');
  assert.equal(st.stage, 'direct');
  assert.match(st.next, /make critics/);
});

test('stage 6, render: layers and a transition exist, never rendered', () => {
  passingStoryboard('stagetest-render', { layers: true });
  const jsonPath = `stagetest-render.json`;
  write(jsonPath, JSON.stringify({
    module: 'scene', layers: [{ type: 'text' }], transitions: [{ at: 2, kind: 'cut' }],
  }, null, 1) + '\n');
  const st = stageOf('stagetest-render');
  assert.equal(st.stage, 'render');
  assert.match(st.next, /make ship/);
});

test('stage 7, judge: rendered, and judge is never marked done on its own', () => {
  passingStoryboard('stagetest-judge', { layers: true });
  write('stagetest-judge.json', JSON.stringify({
    module: 'scene', layers: [{ type: 'text' }], transitions: [{ at: 2, kind: 'cut' }],
  }, null, 1) + '\n');
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const mp4 = path.join(ROOT, 'out', 'stagetest-judge.mp4');
  fs.writeFileSync(mp4, 'not a real mp4, just a marker file');
  try {
    const st = stageOf('stagetest-judge');
    assert.equal(st.stage, 'judge');
    assert.match(st.next, /make judge/);
  } finally {
    fs.unlinkSync(mp4);
  }
});

test('the order is always the same seven stages, regardless of where a film sits', () => {
  const st = stageOf('stagetest-nothing-here-at-all');
  assert.deepEqual(st.order, ['brief', 'plan', 'design', 'assemble', 'direct', 'render', 'judge']);
});

// ---- make next: it runs ONE command, straight off stage.mjs's own verdict ----

test('next: strips a trailing parenthetical note off the runnable command', () => {
  assert.equal(
    firstCommand('make studio D=x.json   (press 1 for the plan)'),
    'make studio D=x.json',
  );
});

test('next: keeps only the first half of a ", then" chain, never the second command', () => {
  assert.equal(firstCommand('make judge D=x.json, then make ledger D=x.json'), 'make judge D=x.json');
});

test('next: a compound "run this, then do this by hand" line also keeps only the runnable half', () => {
  assert.equal(
    firstCommand('node harness/author/stagekit.mjs x.json, then author each fragment: stage kit → look at it'),
    'node harness/author/stagekit.mjs x.json',
  );
});

test('next: a plain command with neither separator passes through unchanged', () => {
  assert.equal(firstCommand('make ship D=x.json'), 'make ship D=x.json');
});

