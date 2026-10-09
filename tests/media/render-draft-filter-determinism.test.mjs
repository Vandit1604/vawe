// A draft of a page with an SVG filter (the gooey move) renders to the same frames twice, with two workers.
// Needs Chrome and ffmpeg.   node --test tests/media/render-draft-filter-determinism.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage, usesSvgFilter } from '../../harness/media/render-page.mjs';

const GOOEY = 'prompts/moves/demo/gooey-filter.html';

const frameHashes = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());

test('usesSvgFilter finds a filter element and ignores a plain canvas page', () => {
  assert.equal(usesSvgFilter(GOOEY), true);
  assert.equal(usesSvgFilter('tests/fixtures/pages/seek-canvas.html'), false);
});

test('gooey filter draft: two renders give identical frames', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-draft-filter-'));
  try {
    const opts = { fps: 60, from: 0.4, durArg: 1.2, w: 640, h: 360, workers: 2 };
    const runs = [];
    for (const name of ['a', 'b', 'c']) {
      const mp4 = path.join(dir, `${name}.mp4`);
      await renderPage(GOOEY, mp4, opts);
      runs.push(frameHashes(mp4));
    }
    assert.equal(runs[0].length, 72);
    assert.deepEqual(runs[1], runs[0]);
    assert.deepEqual(runs[2], runs[0]);
    assert.ok(new Set(runs[0]).size > 1, 'the window moves');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
