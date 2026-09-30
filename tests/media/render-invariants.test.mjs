// tests/media/render-invariants.test.mjs: every render invariant fails on its fixture with one line and
// exit 2, and passes on its twin. Needs Chrome and ffmpeg.
//   node --test tests/media/render-invariants.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { frameProblems } from '../../harness/media/render-page.mjs';

const dir = 'tests/fixtures/pages';
const out = path.join(os.tmpdir(), `invariants-${process.pid}.mp4`);
const render = (page) => spawnSync(process.execPath, ['harness/media/render-page.mjs', page, out], { encoding: 'utf8' });

const FAILS = [
  ['invariants/invariant-audio-bad.html', /^✗ <audio> at 0.5 s: data-synth="key" is not a voice/],
  ['invariants/invariant-audio-missing.html', /^✗ <audio> at 0.2 s: src="missing.wav" .* does not exist/],
  ['invariants/invariant-font-bad.html', /^✗ font Nope failed to load/],
  ['invariants/invariant-assert-bad.html', /^✗ assert at 0.5 s failed: headline says Bye/],
  ['invariants/brief-drift/page.html', /^brief: 5 s 16:9; page: 1 s 16:9$/],
];
for (const [page, line] of FAILS) {
  test(`${page} exits 2 with one line`, () => {
    const r = render(path.join(dir, page));
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr.trim(), line);
    assert.equal(r.stderr.trim().split('\n').length, 1);
  });
}

test('a blank run in the middle renders and advises with the range to declare', () => {
  const r = render(path.join(dir, 'invariants/invariant-blank-bad.html'));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /~ frames \d+-\d+ .* blank; declare it with <meta name="blank"/);
});

for (const page of ['invariant-blank-ok.html', 'invariant-assert-ok.html']) {
  test(`${page} renders`, () => {
    const r = render(path.join(dir, page));
    assert.equal(r.status, 0, r.stderr);
  });
}

test('a frame count that is not round(duration x fps) is named', () => {
  const lines = frameProblems(new Array(29).fill(false), { frames: 30, fps: 30, from: 0, declared: [] });
  assert.deepEqual(lines, ['the encode has 29 frame(s), expected 30 (round(duration x fps))']);
});

test('a blank frame outside a declared range is named with the range to declare', () => {
  const blank = Array.from({ length: 60 }, (_, i) => i >= 45 && i <= 47);
  assert.deepEqual(frameProblems(blank, { frames: 60, fps: 30, from: 0, declared: [] }),
    ['frames 45-47 (1.5-1.57 s) blank; declare it with <meta name="blank" content="1.5-1.6"> if intended']);
  assert.deepEqual(frameProblems(blank, { frames: 60, fps: 30, from: 0, declared: [[1.5, 1.6]] }), []);
});

test('a short blank run at either end is an entrance or an exit, a long one is named', () => {
  const edges = Array.from({ length: 60 }, (_, i) => i < 5 || i > 56);
  assert.deepEqual(frameProblems(edges, { frames: 60, fps: 30, from: 0, declared: [] }), []);
  const long = Array.from({ length: 60 }, (_, i) => i < 12);
  assert.equal(frameProblems(long, { frames: 60, fps: 30, from: 0, declared: [] }).length, 1);
});
