// tests/media/render-page-determinism.test.mjs: house-rule self-check, no framework.
//   node tests/media/render-page-determinism.test.mjs
// Renders each fixture page twice and compares decoded frame hashes: a window.seek(t) canvas page, and a
// page that reads Date.now, performance.now and Math.random (the virtual clock makes those functions
// of the seek time). Launches Chrome, so it is not part of the fast unit run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/render-page.mjs');
const PAGES = path.join(ROOT, 'tests/fixtures/pages');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-page-determinism-'));

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

function render(page, name) {
  const out = path.join(tmp, name);
  execFileSync('node', [SCRIPT, path.join(PAGES, page), out, '--fps', '10', '--w', '320', '--h', '180'], { encoding: 'utf8' });
  return out;
}

function frameHashes(mp4) {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' });
  return out.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

try {
  for (const page of ['seek-canvas.html', 'clock-random.html']) {
    const a = frameHashes(render(page, `${page}-a.mp4`));
    const b = frameHashes(render(page, `${page}-b.mp4`));
    assert(a.length === 5, `${page}: expected 5 frames, got ${a.length}`);
    assert(JSON.stringify(a) === JSON.stringify(b), `${page}: two renders gave different frame hashes:\n${a}\n${b}`);
    assert(new Set(a).size > 1, `${page}: every frame is identical, the page did not move with the seek time`);
    console.log(`✓ render-page-determinism.test.mjs: ${page} renders identically twice and moves with t`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
