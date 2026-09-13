// quality/gates/covered-move.test.mjs: is the covered-move report firing on the real defect,
// and staying quiet on everything that only looks like it.
//
//   node --test quality/gates/covered-move.test.mjs
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
  const r = spawnSync('node', [path.join(here, 'covered-move.mjs'), scenePath],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VAWE_FINDINGS_OUT: findingsOut } });
  let records = [];
  try { records = JSON.parse(fs.readFileSync(findingsOut, 'utf8')); } catch { /* no findings written */ }
  return { ...r, records };
}

const BASE = { module: 'scene', theme: 'default', aspect: '16:9', duration: 20 };

// shaped like the real vawe-flow-2 T2 seam: a full-bleed group (track 1, index 0) exits
// (opacity 1 -> 0 over 0.3s) while a full-bleed image, same track, LATER in layers[], starts
// mid-exit.
function seamScene({ bStart }) {
  return {
    ...BASE,
    layers: [
      {
        id: 'terminal-plane', type: 'group', track: 1, start: 1, duration: 6, x: 0, y: 0, w: 1920, h: 1080,
        motion: [{ t: 0, opacity: 1, x: 0 }, { t: 5, opacity: 1, x: 0 }, { t: 5.3, opacity: 0, x: -2400 }],
        children: [{ id: 'inner', type: 'html', x: 0, y: 0, w: 1920, h: 1080, html: '<div></div>' }],
      },
      {
        id: 'card-a', type: 'group', track: 1, start: bStart, duration: 4, x: 0, y: 0, w: 1920, h: 1080,
        children: [{ id: 'card-a-bg', type: 'image', x: 0, y: 0, w: 1920, h: 1080, src: 'x.jpg' }],
      },
    ],
  };
}

test('a fixture shaped like vawe-flow-2 T2 fires with the right fix numbers', () => {
  // exit window is film time 6..6.3 (start 1 + local t 5..5.3); card-a starts at 6.2, mid-exit.
  const { records } = run(seamScene({ bStart: 6.2 }));
  const hit = records.find((r) => r.code === 'covered-move');
  assert.ok(hit, `expected a covered-move finding, got ${JSON.stringify(records)}`);
  assert.match(hit.summary, /"terminal-plane"/);
  assert.match(hit.summary, /"card-a"/);
  assert.match(hit.fix, /Start "card-a" at 6\.3s/);
});

test('the same seam is silent once card-a starts after the move ends', () => {
  const { records } = run(seamScene({ bStart: 6.3 }));
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('a coverer on a LOWER track never fires, even mid-move', () => {
  const scene = seamScene({ bStart: 6.2 });
  scene.layers[1].track = 0; // below terminal-plane's track 1
  const { records } = run(scene);
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('a non-full-bleed coverer (a small card) never fires', () => {
  const scene = seamScene({ bStart: 6.2 });
  scene.layers[1].children[0].w = 400;
  scene.layers[1].children[0].h = 300;
  const { records } = run(scene);
  assert.ok(!records.some((r) => r.code === 'covered-move'), `expected silence, got ${JSON.stringify(records)}`);
});

test('a waived scene stays silent even with a live collision', () => {
  const scene = seamScene({ bStart: 6.2 });
  scene.authoring = { allow: ['covered-move'] };
  const { records } = run(scene);
  const hit = records.find((r) => r.code === 'covered-move');
  assert.ok(hit && hit.waived, `expected a waived finding, got ${JSON.stringify(records)}`);
});
