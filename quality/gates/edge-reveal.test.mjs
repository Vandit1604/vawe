// quality/gates/edge-reveal.test.mjs: hermetic fixtures for the edge-reveal sampler.
//   node --test quality/gates/edge-reveal.test.mjs
// Fixtures are stagetest-prefixed scenes under films/scene/ (the convention core/layers/util.test.mjs
// already uses), removed in after() whether the run passes or fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { sampleEdgeReveal, toRanges } from './edge-reveal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'films/scene');
const written = [];
function write(name, obj) {
  const rel = `stagetest-edge-${name}.json`;
  fs.writeFileSync(path.join(SCENES, rel), JSON.stringify(obj));
  written.push(rel);
  return path.join('films/scene', rel);
}
after(() => { for (const f of written) { try { fs.unlinkSync(path.join(SCENES, f)); } catch { /* already gone */ } } });

const base = { module: 'scene', theme: 'vawe', aspect: '16:9', duration: 1.2,
  bg: [{ preset: 'plain', from: 0, to: 1.2 }] };

test('a full-frame rect with a camera key at s 0.95 fires, cause names the camera scale', async () => {
  const rel = write('cam-under', { ...base,
    camera: [{ t: 0, s: 0.95 }, { t: 1.2, s: 0.95 }],
    layers: [{ id: 'ground', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111', radius: 0, start: 0, duration: 1.2 }],
  });
  const ranges = toRanges(await sampleEdgeReveal(rel));
  assert.ok(ranges.length > 0, 'a camera under scale 1 must reveal every border');
  assert.ok(ranges.every((r) => /camera is at scale/.test(r.cause)), `expected a camera-scale cause, got: ${ranges.map((r) => r.cause)}`);
});

test('the same scene at camera s 1 is silent', async () => {
  const rel = write('cam-at-1', { ...base,
    camera: [{ t: 0, s: 1 }, { t: 1.2, s: 1 }],
    layers: [{ id: 'ground', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111', radius: 0, start: 0, duration: 1.2 }],
  });
  const ranges = toRanges(await sampleEdgeReveal(rel));
  assert.equal(ranges.length, 0, `expected silence at scale 1, got: ${JSON.stringify(ranges)}`);
});

test('a full-frame rect with radius 16 fires at the corners', async () => {
  const rel = write('radius', { ...base,
    layers: [{ id: 'ground', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111', radius: 16, start: 0, duration: 1.2 }],
  });
  const ranges = toRanges(await sampleEdgeReveal(rel));
  assert.ok(ranges.length > 0, 'a rounded full-bleed rect must reveal its own corners');
  assert.ok(ranges.every((r) => /border-radius/.test(r.cause)), `expected a border-radius cause, got: ${ranges.map((r) => r.cause)}`);
});

test('a layer sampled just before its start is silent (not yet entered, not a candidate)', async () => {
  // The samples at t=0..0.9 fall entirely before `start`, while the layer does not exist in the DOM
  // (or sits at opacity 0 mid-entrance): they must never be read as "a full-bleed layer failing to
  // cover", the false positive `make probe-frame` caught on vawe-flow-2's card-a (a layer sampled just
  // before its resolved clip window, not a real reveal).
  const rel = write('before-start', { ...base, duration: 1.6,
    layers: [{ id: 'late', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111', radius: 0, start: 1.0, duration: 0.6 }],
  });
  const ranges = toRanges(await sampleEdgeReveal(rel));
  assert.equal(ranges.length, 0, `a normal full-bleed layer with a delayed start must not fire, got: ${JSON.stringify(ranges)}`);
});

test('a layer scaled to 0.86 over a full opaque ground is silent (not the topmost full-bleed layer)', async () => {
  const rel = write('panel-over-ground', { ...base,
    layers: [
      { id: 'ground', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#050505', radius: 0, start: 0, duration: 1.2 },
      { id: 'panel', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#222', radius: 0, start: 0, duration: 1.2,
        motion: [{ t: 0, scale: 0.86 }, { t: 1.2, scale: 0.86 }] },
    ],
  });
  const ranges = toRanges(await sampleEdgeReveal(rel));
  assert.equal(ranges.length, 0, `a deliberate floating panel over a full ground must not fire, got: ${JSON.stringify(ranges)}`);
});

test('a waived edge-reveal finding is silent through authoring.allow, in the edge-check CLI', async () => {
  const rel = write('waived', { ...base,
    camera: [{ t: 0, s: 0.95 }, { t: 1.2, s: 0.95 }],
    layers: [{ id: 'ground', type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111', radius: 0, start: 0, duration: 1.2 }],
    authoring: { allow: ['edge-reveal'], _why: { 'edge-reveal': 'fixture: proves the waiver mechanism, not a real film' } },
  });
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('node', ['quality/gates/edge-check.mjs', rel, '--json'], { cwd: ROOT, encoding: 'utf8' });
  const records = JSON.parse(out);
  const edge = records.filter((r) => r.code === 'edge-reveal');
  assert.ok(edge.length > 0, 'the finding must still be recorded');
  assert.ok(edge.every((r) => r.waived === true), `every edge-reveal record must be waived, got: ${JSON.stringify(edge)}`);
});
