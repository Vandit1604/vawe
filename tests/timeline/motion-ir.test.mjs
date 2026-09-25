// core/timeline/motion-ir.test.mjs: fast pure-JS asserts for buildMotionIR, plus the no-change proof
// for jolt-check's migration to it (quality/gates/jolt-check.mjs). No DOM needed.
//
//   node --test core/timeline/motion-ir.test.mjs
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMotionIR } from '../../core/timeline/motion-ir.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// A fixture covering all four sources this stage times: a top-level layer's `motion[]`, a GROUP
// CHILD with its own `delay` and `contentStart`, a kinetic split `preset`, and a `parts` entrance.
const fixture = {
  layers: [
    { id: 'headline', type: 'text', start: 1, duration: 2,
      motion: [{ t: 0, x: 0, opacity: 0 }, { t: 0.4, x: 40, opacity: 1, ease: 'linear' }] },
    { id: 'panel', type: 'group', start: 5, duration: 3, children: [
      { id: 'child-a', type: 'video', delay: 0.5, contentStart: 0.2, duration: 2,
        motion: [{ t: 0, scale: 0.9 }, { t: 0.6, scale: 1, ease: 'easeOutCubic' }] },
    ] },
    { id: 'ticker', type: 'text', start: 2, duration: 2, split: 'word', preset: 'up' },
    { id: 'figure', type: 'html', start: 3, duration: 2, html: '<svg><rect/></svg>',
      parts: [{ select: 'rect', anim: 'growUp' }] },
  ],
  camera: [{ t: 0, s: 1 }, { t: 2, s: 1.2, ease: 'easeInOutCubic' }],
};

test('json motion on a top-level layer: segment times are absolute (layer.start + key.t)', () => {
  const ir = buildMotionIR(fixture);
  const x = ir.find((e) => e.id === 'headline' && e.source === 'json' && e.prop === 'dx');
  assert.ok(x, 'expected a dx entry for the headline layer');
  assert.deepEqual(x.segments, [{ t0: 1, t1: 1.4, from: 0, to: 40, ease: 'linear' }]);
  const op = ir.find((e) => e.id === 'headline' && e.source === 'json' && e.prop === 'opacity');
  assert.deepEqual(op.segments, [{ t0: 1, t1: 1.4, from: 0, to: 1, ease: 'linear' }]);
});

test('group child motion: absolute start is the parent\'s start plus the child\'s own delay', () => {
  const ir = buildMotionIR(fixture);
  const scale = ir.find((e) => e.id === 'child-a' && e.source === 'json' && e.prop === 'scale');
  // panel.start (5) + child-a.delay (0.5) = 5.5, NOT contentStart: motion reads the visibility clock.
  assert.deepEqual(scale.segments, [{ t0: 5.5, t1: 6.1, from: 0.9, to: 1, ease: 'easeOutCubic' }]);
});

test('kinetic preset: covered, but unit count is DOM-dependent so segments stay null with a why', () => {
  const ir = buildMotionIR(fixture);
  const kin = ir.find((e) => e.id === 'ticker' && e.source === 'kinetic');
  assert.ok(kin, 'expected a kinetic entry for the split layer');
  assert.equal(kin.prop, 'up');
  assert.equal(kin.segments, null);
  assert.match(kin.why, /split word\/char count/);
});

test('parts entrance: covered, but real select() match count is DOM-dependent so segments stay null', () => {
  const ir = buildMotionIR(fixture);
  const p = ir.find((e) => e.id === 'figure' && e.source === 'parts');
  assert.ok(p, 'expected a parts entry for the html figure');
  assert.equal(p.prop, 'growUp');
  assert.equal(p.segments, null);
  assert.match(p.why, /DOM query/);
});

test('camera keys: segments in absolute film seconds, one entry per varying prop', () => {
  const ir = buildMotionIR(fixture);
  const s = ir.find((e) => e.source === 'camera' && e.prop === 's');
  assert.deepEqual(s.segments, [{ t0: 0, t1: 2, from: 1, to: 1.2, ease: 'easeInOutCubic' }]);
  // x/y/rx/ry/roll never vary in this fixture: no entry, not a zero-length segment.
  assert.ok(!ir.some((e) => e.source === 'camera' && e.prop === 'x'));
});

test('a layer with no motion, idle, preset or parts contributes nothing to the IR', () => {
  const ir = buildMotionIR({ layers: [{ id: 'still', type: 'rect', start: 0, duration: 1 }] });
  assert.equal(ir.length, 0);
});

// ---- IR coverage vs. a naive scan: the id scheme agrees on every layer, in every shipped film -----
// jolt-check used to decide "does THIS layer have a track worth scanning" with its own
// `Array.isArray(L.motion) && L.motion.length >= 2`, at the top level only; it now asks buildMotionIR
// (quality/gates/jolt-check.mjs), which also reaches into group children (item 2's own requirement).
// This asserts buildMotionIR's id/coverage never disagrees with a naive whole-tree scan using the same
// rule, on every layer of every shipped film, so the migration could not have silently dropped or
// double-counted one. (jolt-check's own scope is top-level only, same as before this change; the
// velocity ARITHMETIC it runs is untouched, still sequence.js's velocityAt/cameraAt/cameraVelocityAt
// on each layer's raw keyframes. A full before/after `diff` of the gate's stdout on the whole library,
// run once by hand during this change, was empty save for one unrelated stack-trace line number.)
test('motion-ir json coverage matches a naive raw-JSON scan, on every layer of every shipped film', () => {
  const dir = path.join(ROOT, 'films/scene');
  const films = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  assert.ok(films.length > 0, 'expected shipped films in films/scene');
  for (const name of films) {
    let data;
    // gh-wrapped.template.json is a deliberate TEMPLATE with placeholder syntax that is not valid
    // JSON (jolt-check.mjs itself throws identically on it, before and after this change: skip it
    // here rather than re-asserting a fact about a file this test does not own).
    try { data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); }
    catch { continue; }
    const layers = Array.isArray(data.layers) ? data.layers
      : Array.isArray(data?.data?.layers) ? data.data.layers : [];
    // Mirrors buildMotionIR's own id scheme (L.id, else type#index-in-its-own-array), recursing into
    // group children the same way, so this is the SAME question the raw check used to answer, asked
    // of the same set of elements the IR now walks.
    const rawIds = new Set();
    const walk = (list) => (list || []).forEach((L, idx) => {
      if (Array.isArray(L?.motion) && L.motion.length >= 2) rawIds.add(L.id || `${L.type || 'layer'}#${idx}`);
      if (Array.isArray(L?.children)) walk(L.children);
    });
    walk(layers);
    const ir = buildMotionIR({ layers, camera: Array.isArray(data.camera) ? data.camera : [] });
    const irIds = new Set(ir.filter((e) => e.source === 'json').map((e) => e.id));
    assert.deepEqual(irIds, rawIds, `${name}: IR json-motion ids differ from the raw-JSON check`);
  }
});
