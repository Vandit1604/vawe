// tests/gates/covered-move.test.mjs: is the covered-move report firing on the real defect,
// and staying quiet on everything that only looks like it (including its own former false positives:
// a mover already faded/translated off screen, and an html coverer whose opacity is unreadable).
//
//   node --test tests/gates/covered-move.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');

function run(scene) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covered-move-'));
  const scenePath = path.join(dir, 'film.json');
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
  const findingsOut = path.join(dir, 'findings.json');
  const r = spawnSync('node', [path.join(here, '../../quality/gates/covered-move.mjs'), scenePath],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VAWE_FINDINGS_OUT: findingsOut } });
  let records = [];
  try { records = JSON.parse(fs.readFileSync(findingsOut, 'utf8')); } catch { /* no findings written */ }
  return { ...r, records };
}

const BASE = { module: 'scene', theme: 'default', aspect: '16:9', duration: 20 };

// shaped like the real vawe-flow-2 T2 seam: a full-bleed group (track 1, index 0) exits
// (opacity 1 -> 0, x 0 -> -2400, easeInOutCubic, over a window of film time 6..6.3s) while a
// full-bleed image, same track, LATER in layers[], starts at `bStart`.
function seamScene({ bStart, bType = 'image' }) {
  const coverChild = bType === 'html'
    ? { id: 'card-a-bg', type: 'html', x: 0, y: 0, w: 1920, h: 1080, html: '<div></div>' }
    : { id: 'card-a-bg', type: 'image', x: 0, y: 0, w: 1920, h: 1080, src: 'x.jpg' };
  return {
    ...BASE,
    layers: [
      {
        id: 'terminal-plane', type: 'group', track: 1, start: 1, duration: 6, x: 0, y: 0, w: 1920, h: 1080,
        motion: [{ t: 0, opacity: 1, x: 0 }, { t: 5, opacity: 1, x: 0 }, { t: 5.3, opacity: 0, x: -2400, ease: 'easeInOutCubic' }],
        children: [{ id: 'inner', type: 'html', x: 0, y: 0, w: 1920, h: 1080, html: '<div></div>' }],
      },
      {
        id: 'card-a', type: 'group', track: 1, start: bStart, duration: 4, x: 0, y: 0, w: 1920, h: 1080,
        children: [coverChild],
      },
    ],
  };
}

test('A still visible when B starts (early in the exit) fires', () => {
  // at t=6.05 the exit is barely underway: terminal-plane is still mostly opaque and on canvas.
  const { records } = run(seamScene({ bStart: 6.05 }));
  const hit = records.find((r) => r.code === 'covered-move');
  assert.ok(hit, `expected a covered-move finding, got ${JSON.stringify(records)}`);
  assert.match(hit.summary, /"terminal-plane"/);
  assert.match(hit.summary, /"card-a"/);
  // the reported window is the VISIBLE remainder, not the whole authored window (6..6.3): it starts
  // at bStart and ends before the authored window's own end.
  const m = hit.fix.match(/Start "card-a" at ([\d.]+)s/);
  assert.ok(m, `fix should name a restart time, got: ${hit.fix}`);
  const restart = Number(m[1]);
  assert.ok(restart > 6.05 && restart <= 6.3, `expected 6.05 < restart <= 6.3, got ${restart}`);
});

test('A already faded and translated off screen when B starts (the T2 false positive) is silent', () => {
  // at t=6.28, 93% through the exit: easeInOutCubic has already carried opacity under 0.05 and x past
  // -2390, off the 1920-wide canvas. This is the shape of the real vawe-flow-2 T2 seam that used to
  // misfire: the move was fine, it was simply gone by the time the next beat started.
  const { records } = run(seamScene({ bStart: 6.28 }));
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('the same seam is silent once card-a starts after the move ends', () => {
  const { records } = run(seamScene({ bStart: 6.3 }));
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('a coverer on a LOWER track never fires, even while A is still visible', () => {
  const scene = seamScene({ bStart: 6.05 });
  scene.layers[1].track = 0; // below terminal-plane's track 1
  const { records } = run(scene);
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('a non-full-bleed coverer (a small card) never fires', () => {
  const scene = seamScene({ bStart: 6.05 });
  scene.layers[1].children[0].w = 400;
  scene.layers[1].children[0].h = 300;
  const { records } = run(scene);
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('an html B over a fading rect is silent (html coverage is undecidable from JSON, never guessed)', () => {
  const { records } = run(seamScene({ bStart: 6.05, bType: 'html' }));
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('B fading IN over A fading out (a crossfade) is silent', () => {
  const scene = seamScene({ bStart: 6.05 });
  // card-a fades in itself over its first 0.25s: it never hides terminal-plane, it dissolves across it.
  scene.layers[1].motion = [{ t: 0, opacity: 0 }, { t: 0.25, opacity: 1 }];
  const { records } = run(scene);
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('B already opaque at its own start, over a visible A, fires', () => {
  const scene = seamScene({ bStart: 6.05 });
  scene.layers[1].motion = [{ t: 0, opacity: 1 }]; // opaque from its first frame, no fade-in
  const { records } = run(scene);
  const hit = records.find((r) => r.code === 'covered-move');
  assert.ok(hit, `expected a covered-move finding, got ${JSON.stringify(records)}`);
});

test('a waived scene stays silent even with a live collision', () => {
  const scene = seamScene({ bStart: 6.05 });
  scene.authoring = { allow: ['covered-move'] };
  const { records } = run(scene);
  const hit = records.find((r) => r.code === 'covered-move');
  assert.ok(hit && hit.waived, `expected a waived finding, got ${JSON.stringify(records)}`);
});
