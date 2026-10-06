import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runsIn, unrunReason, CHECK_TIER } from '../../harness/lib/draft-tiers.mjs';
import { createChecks, timeLine } from '../../harness/lib/check-runner.mjs';
import { settledSamples } from '../../harness/lib/draft-check.mjs';
import { dropGuesses } from '../../harness/lib/brief-tables.mjs';
import { buildRows, redLine, summaryLine } from '../../harness/lib/acceptance.mjs';

test('fast runs the fast tier, draft adds settled, full adds ship', () => {
  assert.deepEqual(Object.keys(CHECK_TIER).filter((c) => runsIn(c, 'fast')), ['motion', 'text', 'worlds', 'video']);
  assert.deepEqual(Object.keys(CHECK_TIER).filter((c) => runsIn(c, 'draft')), ['motion', 'text', 'worlds', 'video', 'contrast', 'layout', 'spec']);
  assert.equal(Object.keys(CHECK_TIER).filter((c) => runsIn(c, 'full')).length, Object.keys(CHECK_TIER).length);
  assert.match(unrunReason('loudness', 'draft'), /ship tier/);
  assert.equal(unrunReason('loudness', 'full'), null);
  assert.equal(unrunReason('text collisions', 'fast'), null);
});

test('a check outside the tier does not run, and an unchanged page re-runs nothing', async () => {
  const cwd = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-cache-'));
  fs.mkdirSync(path.join(dir, 'film'));
  const page = path.join(dir, 'film', 'page.html');
  fs.writeFileSync(page, '<html></html>');
  process.chdir(dir);
  try {
    let calls = 0;
    const fn = async () => { calls++; return { n: 1, gone: undefined }; };
    const first = createChecks({ pagePath: page, mode: 'draft' });
    assert.equal(await first.run('objects', fn), undefined);
    assert.deepEqual(await first.run('text', fn), { n: 1 });
    first.save();
    const second = createChecks({ pagePath: page, mode: 'draft' });
    assert.deepEqual(await second.run('text', fn), { n: 1 });
    assert.equal(calls, 1);
    assert.deepEqual(second.seconds(), [['text', 0]]);
    assert.deepEqual(await second.run('text', fn, { other: true }), { n: 1 });
    assert.equal(calls, 2);
  } finally { process.chdir(cwd); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the time line names every check', () => {
  assert.equal(timeLine({ captureMs: 18000, encodeMs: 300, checks: [['spec', 2], ['contrast', 3.1], ['text', 0.01]], capture: 'draft: jpeg, gpu' }),
    'time: capture 18.0 s (draft: jpeg, gpu) · checks 5.1 s (contrast 3.1, spec 2.0) · encode 0.3 s');
});

const line = (text, x = 0, opacity = 1) => ({ text, box: [x, 0, 100, 20], opacity });

test('settled samples are the last of each still run, and a film that never holds still gives its busiest sample', () => {
  const s = (t, ...lines) => ({ t, lines });
  const held = [s(1, line('a')), s(2, line('a')), s(3, line('a')), s(4, line('b')), s(5, line('b'))];
  assert.deepEqual(settledSamples(held).map((x) => x.t), [3, 5]);
  const moving = [s(1, line('a', 0)), s(2, line('a', 50), line('c')), s(3, line('a', 99))];
  assert.deepEqual(settledSamples(moving).map((x) => x.t), [2]);
});

test('template guess rows are dropped from the spec tables and counted', () => {
  const { set, guessed } = dropGuesses({ shots: [{ id: 's1 (guess: change me)' }], words: [{ text: 'Go (guess: change me)' }, { text: 'Real' }], objects: [], acceptance: [] });
  assert.deepEqual(set.words, [{ text: 'Real' }]);
  assert.deepEqual(guessed, { shots: 1, words: 1, objects: 0 });
});

test('only red rows print, one line each, and the count of green matches them', () => {
  const rows = buildRows([], { stills: [{ a: 1, b: 2 }], guessed: { words: 1 } }, { mode: 'draft' });
  const red = rows.filter((r) => r.status === 'advice');
  assert.equal(red.length, 1);
  assert.match(redLine(red[0]), /^ {2}still windows over 0.5 s outside a declared hold: 1 \(1-2 s held still\); keep one thing moving/);
  const measured = rows.filter((r) => r.status !== 'not measured').length;
  assert.equal(summaryLine(rows, 3, ['checks 1.0 s']), `acceptance: ${measured - 1} of ${measured} green (was 3) · checks 1.0 s`);
  const layout = rows.find((r) => r.metric === 'word cap height and position vs spec');
  assert.match(layout.measured, /^not set: /);
});
