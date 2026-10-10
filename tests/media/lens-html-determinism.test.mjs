// A draft of a lens page whose HTML screen changes every frame renders to the same frames twice, with several lanes.
// Needs Chrome and ffmpeg.   node --test --test-concurrency=1 tests/media/lens-html-determinism.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/pages/lens-html-changing.html';
const RUNS = ['a', 'b', 'c'];

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('htmlSource lens draft: three renders give identical frames', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-lens-html-'));
  try {
    const runs = [];
    for (const name of RUNS) {
      const mp4 = path.join(dir, `${name}.mp4`);
      await renderPage(PAGE, mp4, { fps: 30, durArg: 2, workers: 3 });
      runs.push(frameHashes(mp4));
    }
    assert.equal(runs[0].length, 60);
    for (const run of runs.slice(1)) assert.deepEqual(run, runs[0]);
    assert.ok(new Set(runs[0]).size > 30, 'the screen changes every frame');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
