// A final render gives the same frames for one worker and for two: each worker captures in its own
// browser, so the lanes share no screenshot lock and no raster state. Needs Chrome and ffmpeg.
//   node --test tests/media/render-final-lanes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/pages/late-first-seek.html';

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('a final render of 2 slices is identical at 1 and 2 workers', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-lanes-'));
  try {
    const runs = [];
    for (const workers of [1, 2]) {
      const mp4 = path.join(dir, `w${workers}.mp4`);
      await renderPage(PAGE, mp4, { final: true, fps: 60, blur: 1, durArg: 2, audio: false, workers });
      runs.push(frameHashes(mp4));
    }
    assert.equal(runs[0].length, 120);
    assert.deepEqual(runs[1], runs[0]);
    assert.ok(new Set(runs[0]).size > 1, 'the frames move');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a final lane whose Chrome dies gets a new one for the retry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-lanes-'));
  const error = console.error;
  console.error = () => {};
  try {
    const killFirstLane = async ([lo], attempt, lane) => {
      if (lo === 0 && attempt === 1) { await lane.browser.close(); throw new Error('Target closed (injected by the test)'); }
    };
    const r = await renderPage(PAGE, path.join(dir, 'a.mp4'), { final: true, fps: 60, blur: 1, durArg: 2, audio: false, workers: 2, sliceFault: killFirstLane });
    assert.equal(r.frames, 120);
    assert.equal(r.restarted.length, 1);
  } finally { console.error = error; fs.rmSync(dir, { recursive: true, force: true }); }
});
