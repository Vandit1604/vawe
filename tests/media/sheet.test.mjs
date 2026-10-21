import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { tileLabel, evenSeconds, storyboardSeconds, localSeconds } from '../../harness/media/sheet.mjs';

test('a tile label carries the second, then the world when it has one', () => {
  assert.equal(tileLabel(1.2, null), '1.2s');
  assert.equal(tileLabel(1.2, 'hot'), '1.2s hot');
});

test('the default seconds are the middle of each world, else evenly spread', () => {
  assert.deepEqual(storyboardSeconds([{ id: 'a', start: 0, end: 1 }, { id: 'b', start: 1, end: 3 }], 3), [0.5, 2]);
  assert.deepEqual(storyboardSeconds([], 4), evenSeconds(4));
  assert.equal(evenSeconds(12).length, 12);
});

test('localSeconds maps film seconds into a span mp4 and names the span when one is outside', () => {
  assert.deepEqual(localSeconds([5, 6.5], 5, 3), [0, 1.5]);
  assert.deepEqual(localSeconds([2], 0, 4), [2]);
  assert.throws(() => localSeconds([2, 9], 5, 3), /9 s is outside the film seconds 5-8/);
  assert.throws(() => localSeconds([2], 5, 3), /--from/);
});

test('sheet of a span mp4 maps --at with --from and refuses a second outside the span', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-sheet-span-'));
  const mp4 = path.join(dir, 'span.mp4');
  const made = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=10:duration=3', '-pix_fmt', 'yuv420p', mp4]);
  assert.equal(made.status, 0);
  const sheet = path.join(import.meta.dirname, '../../harness/media/sheet.mjs');
  const run = (...a) => spawnSync(process.execPath, [sheet, mp4, ...a, '--out', path.join(dir, 'o.png')], { encoding: 'utf8' });
  const ok = run('--at', '5.5,7', '--from', '5');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /5\.5s, 7s/);
  const bad = run('--at', '4');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /outside the film seconds 0-3/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('sheet --labels on an mp4 needs the page of its film, and names the path it looked for', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-sheet-labels-'));
  const mp4 = path.join(dir, 'no-such-film.mp4');
  assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=10:duration=1', '-pix_fmt', 'yuv420p', mp4]).status, 0);
  const sheet = path.join(import.meta.dirname, '../../harness/media/sheet.mjs');
  const r = spawnSync(process.execPath, [sheet, mp4, '--labels', '--out', path.join(dir, 'o.png')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /films\/no-such-film\/page\.html does not exist/);
  fs.rmSync(dir, { recursive: true, force: true });
});
