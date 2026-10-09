// A final whose audio mux fails keeps its captured frames, records the real stage and percent, and the retry
// re-runs only the mux: no slice is captured again and the pixels match a clean render.
// Needs Chrome and ffmpeg.   node --test --test-concurrency=1 tests/media/render-mux-retry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/pages/idle-daemon-audio.html';
// 2 s at 30 fps is 60 frames: one slice.
const OPTS = { final: true, fps: 30, blur: 1, w: 160, h: 90, workers: 1 };

const videoHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-map', '0:v', '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('a mux that fails once keeps the frames; the retry captures nothing and writes the same film', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-mux-'));
  const out = path.join(dir, 'film.mp4');
  const log = console.log;
  console.log = () => {};
  try {
    const captured = [];
    const countCaptures = () => { captured.push(1); };
    const e = await renderPage(PAGE, out, { ...OPTS, sliceFault: countCaptures, muxFault: () => { throw new Error('mux failed (injected by the test)'); } }).then(() => null, (err) => err);
    assert.ok(e, 'the render fails');
    assert.equal(e.stage, 'audio mux');
    assert.equal(e.progress, 1, 'the capture was complete');
    assert.ok(fs.existsSync(path.join(e.framesDir, 'slice-0.done')), 'the captured slice is kept');
    assert.ok(!fs.existsSync(out));
    assert.deepEqual(fs.readdirSync(dir).filter((n) => n.includes('.tmp-') || n.includes('.mux-')), [], 'no half-written files stay');
    assert.equal(captured.length, 1);

    const r = await renderPage(PAGE, out, { ...OPTS, sliceFault: countCaptures });
    assert.equal(captured.length, 1, 'the retry captured no slice');
    assert.equal(r.resumed, 1);
    assert.ok(r.audio);

    const clean = path.join(dir, 'clean.mp4');
    await renderPage(PAGE, clean, OPTS);
    assert.deepEqual(videoHashes(out), videoHashes(clean));
  } finally { console.log = log; fs.rmSync(dir, { recursive: true, force: true }); }
});
