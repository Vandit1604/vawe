import test from 'node:test';
import assert from 'node:assert/strict';
import { recordsFromBoxes, motionLint } from '../../harness/lib/motion-lint.mjs';
import { maxStepDeltas, lintTimes } from '../../harness/lib/box-track.mjs';

const W = 1920, H = 1080;
const clamp = (u) => Math.min(1, Math.max(0, u));
const easeOut = (u) => 1 - (1 - u) ** 3;
const tween = (t, a, b, from, to, ease = easeOut) => from + (to - from) * ease(clamp((t - a) / (b - a)));

// A page that paints in window.seek: a title enters on an ease-out and leaves as slowly on a linear
// slide, three words land on one frame, a span rides the title, the stage never moves.
function film() {
  const times = lintTimes(3);
  const title = (t) => {
    const out = t >= 2;
    const x = out ? tween(t, 2, 2.6, 100, 400, (u) => u) : tween(t, 0.2, 0.8, -200, 100);
    const o = out ? tween(t, 2, 2.6, 1, 0, (u) => u) : tween(t, 0.2, 0.8, 0, 1);
    return [x, 400, 600, 120, o, o];
  };
  const word = (k) => (t) => { const o = tween(t, 1, 1.4, 0, 1); return [200 + k * 300, tween(t, 1, 1.4, 700, 600), 250, 80, o, o]; };
  const els = [() => [0, 0, W, H, 1, 1], title, word(0), word(1), word(2), (t) => { const b = title(t); return [b[0] + 20, b[1] + 10, 100, 40, b[4], 1]; }];
  return {
    times, area: W * H, width: W, height: H, canvas: 0,
    labels: ['div#stage', 'h1 "Title"', 'span "one"', 'span "two"', 'span "three"', 'em "rides"'],
    parent: [-1, 0, 0, 0, 0, 1],
    tracks: els.map((f) => times.map(f)),
  };
}

test('recordsFromBoxes infers entrances and exits from the curves and leaves out still and riding elements', () => {
  const records = recordsFromBoxes(film());
  const byLabel = (l) => records.filter((r) => r.label === l);
  assert.deepEqual(byLabel('div#stage'), []);
  assert.deepEqual(byLabel('em "rides"'), []);
  const [enter, leave] = byLabel('h1 "Title"');
  assert.equal(enter.id, 'enter');
  // An ease-out tail under a quarter pixel a step is no motion, so the inferred landing comes early.
  assert.ok(Math.abs(enter.delay - 0.2) < 0.02 && enter.duration > 0.45 && enter.duration <= 0.6, `${enter.delay} ${enter.duration}`);
  assert.deepEqual(enter.opacity.map(Math.round), [0, 1]);
  assert.equal(enter.easing, 'inferred');
  assert.match(enter.from, /^translate\(-29\d\.\dpx, 0\.0px\)$/);
  assert.equal(leave.id, 'leave');
  assert.equal(leave.easing, 'linear');
});

test('the same lint rules run on inferred records: exit length, group landing, linear move', () => {
  const codes = motionLint({ records: recordsFromBoxes(film()), scripted: false }).map((f) => `${f.code}@${f.at.toFixed(1)}`);
  assert.ok(codes.includes('exit-length@2.0'), codes.join(' '));
  assert.ok(codes.includes('group-landing@1.4'), codes.join(' '));
  assert.ok(codes.includes('linear-move@2.0'), codes.join(' '));
});

test('a camera push is the camera\'s record; the words it scales ride it', () => {
  const times = lintTimes(2);
  const cam = (t) => { const z = 1 + 0.2 * t / 2; return [W / 2 * (1 - z), H / 2 * (1 - z), W * z, H * z, 1, 1]; };
  const word = (t) => { const c = cam(t), z = c[2] / W; return [c[0] + 300 * z, c[1] + 500 * z, 200 * z, 80 * z, 1, 1]; };
  const records = recordsFromBoxes({ times, area: W * H, width: W, height: H, canvas: 0, labels: ['div.camera', 'span "up"'], parent: [-1, 0], tracks: [times.map(cam), times.map(word)] });
  assert.deepEqual(records.map((r) => `${r.label} ${r.easing}`), ['div.camera linear']);
});

test('a still page gives no records; the speed pass reads the largest step of any box', () => {
  const still = { ...film(), tracks: [[[0, 0, 10, 10, 1, 1], [0, 0, 10, 10, 1, 1]]], parent: [-1], labels: ['div'], times: [0, 0.1] };
  assert.deepEqual(recordsFromBoxes(still), []);
  assert.deepEqual(maxStepDeltas([[[0, 0, 10, 10], [3, 4, 10, 10], [3, 4, 10, 17]], [[0, 0, 1, 1], [1, 0, 1, 1], [1, 0, 1, 1]]]), [5, 7]);
});

test('lintTimes samples 60 a second up to 300 samples', () => {
  assert.equal(lintTimes(1).length, 61);
  assert.equal(lintTimes(20).length, 301);
  assert.equal(lintTimes(20)[1], 0.0667);
});
