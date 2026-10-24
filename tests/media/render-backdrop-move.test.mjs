// A WAAPI `translate` animation on an element with backdrop-filter is drawn at its in-between position in a draft and a final,
// not only when it ends. The fixture sits outside tests/fixtures/pages so e2e does not render it.
// Needs Chrome and ffmpeg.   node --test tests/media/render-backdrop-move.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/backdrop-translate/page.html';
const SIZE = { w: 480, h: 270 };
const DARK = 80;

function cardLeftEdge(mp4, second) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(second), '-i', mp4, '-frames:v', '1', '-vf', `scale=${SIZE.w}:${SIZE.h}`, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  const row = Math.round(SIZE.h * 0.15);
  for (let x = 0; x < SIZE.w; x++) if (raw[row * SIZE.w + x] < DARK) return x;
  return -1;
}

for (const final of [false, true]) {
  test(`${final ? 'a final' : 'a draft'} draws the card halfway through its move`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-backdrop-'));
    try {
      const out = path.join(dir, 'film.mp4');
      await renderPage(PAGE, out, { ...SIZE, fps: 10, workers: 1, final, blur: 1, audio: false });
      const [start, middle, end] = [0, 1, 1.9].map((s) => cardLeftEdge(out, s));
      assert.ok(start >= 0 && end > start, `the card is found at the start (${start}) and the end (${end})`);
      assert.ok(Math.abs(middle - (start + end) / 2) <= 0.05 * (end - start) + 2, `the card is at ${middle} at 1 s, between ${start} and ${end}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
