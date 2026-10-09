// A slice that loses its page runs again on a fresh page, up to SLICE_ATTEMPTS in all; a render that still fails
// keeps its frames dir, and the next render of the same page and settings skips the slices it finished.
// Needs Chrome and ffmpeg.   node --test tests/media/render-resume.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage, InvariantError, SLICE_ATTEMPTS, removeStaleFrames } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/pages/seek-canvas.html';
// 0.5 s at 240 fps is 120 frames: two 60-frame slices.
const OPTS = { fps: 240, w: 160, h: 90, workers: 1 };
const SECOND_SLICE = '0.25-0.50s';

const failSecondSlice = (times) => ([lo], attempt) => {
  if (lo === 60 && attempt <= times) throw new Error('Target closed (injected by the test)');
};

const quietly = async (fn) => {
  const error = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = error; }
};

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

const framesDirs = (dir) => fs.readdirSync(dir).filter((n) => n.includes('.frames-'));

test('a slice that fails once, twice or three times is retried and the render finishes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-resume-'));
  try {
    for (const times of [1, 2, SLICE_ATTEMPTS - 1]) {
      const r = await quietly(() => renderPage(PAGE, path.join(dir, `${times}.mp4`), { ...OPTS, sliceFault: failSecondSlice(times) }));
      assert.equal(r.frames, 120);
      assert.deepEqual(r.restarted, Array(times).fill(SECOND_SLICE));
    }
    assert.deepEqual(framesDirs(dir), [], 'a finished render removes its frames');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a slice that fails 4 times fails the render, keeps the frames, and the next render resumes them', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-resume-'));
  const out = path.join(dir, 'film.mp4');
  try {
    const e = await quietly(() => renderPage(PAGE, out, { ...OPTS, sliceFault: failSecondSlice(SLICE_ATTEMPTS) }).then(() => null, (err) => err));
    assert.ok(e instanceof InvariantError, String(e));
    assert.match(e.message, new RegExp(`slice 60-120 \\(${SECOND_SLICE}\\) lost its page ${SLICE_ATTEMPTS} times`));
    assert.equal(e.progress, 0.5);
    assert.ok(fs.existsSync(path.join(e.framesDir, 'slice-0.done')), 'the finished first slice is marked');
    assert.ok(!fs.existsSync(out));

    const r = await renderPage(PAGE, out, OPTS);
    assert.equal(r.resumed, 1);
    assert.ok(!fs.existsSync(e.framesDir), 'the frames go once the encode succeeds');

    const clean = path.join(dir, 'clean.mp4');
    await renderPage(PAGE, clean, OPTS);
    assert.deepEqual(frameHashes(out), frameHashes(clean), 'a resumed render has the same pixels as a clean one');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('touching the page and core/ between a failed render and its resume keeps the frames key', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-resume-'));
  const out = path.join(dir, 'film.mp4');
  const core = 'core/layout/aspects.js';
  const before = fs.statSync(core);
  const pageBefore = fs.statSync(PAGE);
  try {
    const e = await quietly(() => renderPage(PAGE, out, { ...OPTS, workers: 2, sliceFault: failSecondSlice(SLICE_ATTEMPTS) }).then(() => null, (err) => err));
    assert.ok(e instanceof InvariantError, String(e));
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(PAGE, later, later);
    fs.utimesSync(core, later, later);
    const r = await renderPage(PAGE, out, { ...OPTS, workers: 2 });
    assert.equal(r.resumed, 1, 'the resume finds the kept slice after a touch');
    const clean = path.join(dir, 'clean.mp4');
    await renderPage(PAGE, clean, { ...OPTS, workers: 2 });
    assert.deepEqual(frameHashes(out), frameHashes(clean));
  } finally {
    fs.utimesSync(PAGE, pageBefore.atime, pageBefore.mtime);
    fs.utimesSync(core, before.atime, before.mtime);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('frames dirs untouched for 3 days are removed with a printed line, newer ones stay', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stale-'));
  try {
    const old = path.join(dir, 'a.mp4.frames-47126');
    const fresh = path.join(dir, 'b.mp4.frames-0123abcd');
    fs.mkdirSync(old);
    fs.mkdirSync(fresh);
    const now = Date.now();
    fs.utimesSync(old, new Date(now - 4 * 86400000), new Date(now - 4 * 86400000));
    const lines = [];
    assert.deepEqual(removeStaleFrames(dir, now, (l) => lines.push(l)), [old]);
    assert.match(lines[0], /^removed stale frames .*a\.mp4\.frames-47126 \(4 days old\)$/);
    assert.ok(fs.existsSync(fresh));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
