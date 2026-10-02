// A 0.2 s window of a WebGL shader page and of a window.seek canvas page renders to the same frames twice
// while two cores run a busy loop. Needs Chrome and ffmpeg.   node --test tests/media/render-determinism-load.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const SPIN = 'let x = 0; for (;;) x += Math.sqrt(x + 1);';

function busyCores(n) {
  const kids = Array.from({ length: n }, () => spawn(process.execPath, ['-e', SPIN], { stdio: 'ignore' }));
  return () => kids.forEach((k) => k.kill());
}

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

for (const page of ['tests/fixtures/pages/shader-field.html', 'tests/fixtures/pages/seek-canvas.html']) {
  test(`${path.basename(page)}: a 0.2 s window renders the same frames twice on a loaded machine`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-det-load-'));
    const stop = busyCores(2);
    try {
      const opts = { fps: 60, from: 0.2, durArg: 0.2, w: 640, h: 360, workers: 1 };
      const runs = [];
      for (const name of ['a', 'b']) {
        const mp4 = path.join(dir, `${name}.mp4`);
        await renderPage(page, mp4, opts);
        runs.push(frameHashes(mp4));
      }
      assert.equal(runs[0].length, 12);
      assert.deepEqual(runs[1], runs[0]);
      assert.ok(new Set(runs[0]).size > 1, 'the window moves');
    } finally { stop(); fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
