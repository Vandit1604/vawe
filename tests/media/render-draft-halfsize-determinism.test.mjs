// A draft at the default half size renders to the same frames twice: the browser's own downscale of a
// WebGL page gave different pixels run to run, so the draft captures full size and ffmpeg scales it.
// Needs Chrome and ffmpeg.   node --test tests/media/render-draft-halfsize-determinism.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const PAGE = 'films/examples/colour-sting/page.html';

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('webgl draft at the default size: two renders give identical frames', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-draft-half-'));
  try {
    const runs = [];
    for (const name of ['a', 'b']) {
      const mp4 = path.join(dir, `${name}.mp4`);
      await renderPage(PAGE, mp4, { fps: 30, from: 0.5, durArg: 1.5 });
      runs.push(frameHashes(mp4));
    }
    const size = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, 'a.mp4')], { encoding: 'utf8' }).trim();
    assert.match(size, /^960,540/);
    assert.equal(runs[0].length, 45);
    assert.deepEqual(runs[1], runs[0]);
    assert.ok(new Set(runs[0]).size > 1, 'the window moves');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
