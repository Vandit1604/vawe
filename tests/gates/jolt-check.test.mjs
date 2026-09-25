// tests/gates/jolt-check.test.mjs: does the jolt step actually see a jolt, and only a jolt.
//
//   node --test tests/gates/jolt-check.test.mjs
//
// Each fixture is spawned through the real CLI (jolt-check.mjs has no importable guard, same as most
// per-scene gates here), reading its findings back off VAWE_FINDINGS_OUT the same way author-check does.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');

function runJolt(scene) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jolt-check-'));
  const scenePath = path.join(dir, 'film.json');
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
  const findingsOut = path.join(dir, 'findings.json');
  const r = spawnSync('node', [path.join(here, '../../quality/gates/jolt-check.mjs'), scenePath],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VAWE_FINDINGS_OUT: findingsOut } });
  let records = [];
  try { records = JSON.parse(fs.readFileSync(findingsOut, 'utf8')); } catch { /* no findings written */ }
  return { ...r, records, scenePath, dir };
}

const BASE = { module: 'scene', theme: 'default', aspect: '16:9', duration: 4 };

test('a linear camera travel station (a hard speed kink) fires velocity-spike', () => {
  // hold at x:0 through 0.9s, then a LINEAR leg that must reach -1500px by 2.9s: onset and offset are
  // both instantaneous, so the frame straddling t=0.9 jumps by ~750 px/s in one tick (measured; a
  // matched easeInOutCubic leg over the same span peaks at ~78 px/s, see the "silent" test below).
  const scene = { ...BASE, camera: [
    { t: 0, x: 0 }, { t: 0.9, x: 0, ease: 'linear' },
    { t: 2.9, x: -1500, ease: 'linear' }, { t: 3.9, x: -1500, ease: 'linear' },
  ], layers: [{ id: 'bg', type: 'html', start: 0, duration: 4, html: '<div></div>' }] };
  const { records } = runJolt(scene);
  const spikes = records.filter((r) => r.code === 'velocity-spike');
  assert.ok(spikes.length >= 1, `expected a velocity-spike, got ${JSON.stringify(records)}`);
});

test('an easeIn-handle arrival into a hold fires (the arrival adapt skips authored handles)', () => {
  // `easeIn: "fling"` arrives at ~4x the segment's average speed on purpose (core/motion/motion.js
  // HANDLES.fling); resolveKeyedProps' adaptArrivalEase leaves any key that already carries an
  // authored easeIn/easeOut handle alone, so a fast arrival that then holds keeps its jolt.
  const scene = { ...BASE, layers: [{
    id: 'card', type: 'html', start: 0, duration: 3, html: '<div>card</div>',
    motion: [{ t: 0, x: 0 }, { t: 1, x: 500, easeIn: 'fling' }, { t: 1.5, x: 500 }],
  }] };
  const { records } = runJolt(scene);
  const spikes = records.filter((r) => r.code === 'velocity-spike');
  assert.ok(spikes.length >= 1, `expected a velocity-spike from the skipped arrival adapt, got ${JSON.stringify(records)}`);
});

test('the same shapes, eased end to end, are silent', () => {
  const scene = { ...BASE, camera: [
    { t: 0, x: 0 }, { t: 0.9, x: 0, ease: 'easeInOutCubic' },
    { t: 2.9, x: -1500, ease: 'easeInOutCubic' }, { t: 3.9, x: -1500, ease: 'easeInOutCubic' },
  ], layers: [{
    id: 'card', type: 'html', start: 0, duration: 4, html: '<div>card</div>',
    motion: [{ t: 0, x: 0 }, { t: 1, x: 500, ease: 'easeInOutCubic' }, { t: 1.5, x: 500 }],
  }] };
  const { records } = runJolt(scene);
  const spikes = records.filter((r) => r.code === 'velocity-spike');
  assert.equal(spikes.length, 0, `an eased station should not jolt, got ${JSON.stringify(spikes)}`);
});

test('motion-floor is skipped when there is no current render', () => {
  const scene = { ...BASE, layers: [{ id: 'bg', type: 'html', start: 0, duration: 4, html: '<div></div>' }] };
  const { stdout, status } = runJolt(scene);
  assert.match(stdout, /motion-floor: skipped, no current render/);
  assert.equal(status, 0);
});
