import test from 'node:test';
import assert from 'node:assert/strict';
import { ONION_FRAMES, ONION_SPAN, blendWeights, frameTint, isLightGround, onionGraph, onionProblem, onionTimes, tintMixer } from '../../harness/media/see/onion-math.mjs';
import { analyseMove, analyseTrack, easeShape, moveScore, pathProgress, sampleTimes, scaleSeries, speedSeries, topMovers, trackPoints, velocityProblem } from '../../harness/media/see/velocity-math.mjs';
import { velocitySvg } from '../../harness/media/see/velocity-graph.mjs';

const H = 1000;
const ease = {
  linear: (u) => u,
  out: (u) => 1 - (1 - u) ** 3,
  in: (u) => u ** 3,
  inOut: (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  pop: (u) => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2,
};

// A box 100 x 100 that slides 400 px in `move` seconds after 0.1 s, with `fn` as its ease, sampled at 120 a second over 1 s.
function slide(fn, move = 0.5) {
  const times = sampleTimes(0, 1);
  const track = times.map((t) => [100 + 400 * fn(Math.min(1, Math.max(0, (t - 0.1) / move))) - 50, 500 - 50, 100, 100, 1]);
  return { times, pts: trackPoints(times, track) };
}

test('blendWeights: sum to 1, newest strongest, oldest faintest, rising with age', () => {
  for (const n of [2, 6, 12]) {
    const w = blendWeights(n);
    assert.equal(w.length, n);
    assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    assert.ok(w.every((x, i) => i === 0 || x > w[i - 1]));
  }
});

test('onionTimes: n times from the start to the end of the window', () => {
  assert.deepEqual(onionTimes(1, 1.5, 6), [1, 1.1, 1.2, 1.3, 1.4, 1.5]);
});

test('frameTint: the newest keeps its colours, the oldest is cool and the colour warms with age', () => {
  assert.equal(frameTint(5, 6).strength, 0);
  assert.ok(frameTint(0, 6).strength > frameTint(3, 6).strength);
  const old = frameTint(0, 6).color, young = frameTint(5, 6).color;
  assert.ok(old[2] > old[0] && young[0] > young[2]);
  assert.match(tintMixer(frameTint(5, 6)), /^rr=1\.0000:rg=0\.0000/);
});

test('onionGraph: one input per frame, a weight per frame, the negative only on a light ground', () => {
  const light = onionGraph([1, 1.1, 1.2], 640, 360, true);
  const dark = onionGraph([1, 1.1, 1.2], 640, 360, false);
  assert.match(light, /mix=inputs=3:weights='[\d. ]+'/);
  assert.equal((light.match(/negate/g) || []).length, 6);
  assert.equal(dark.includes('negate'), false);
  assert.ok(isLightGround(200) && !isLightGround(30));
});

test('onionProblem and velocityProblem: name the flag at fault', () => {
  assert.equal(onionProblem({ at: '2', span: 0.6, n: 6 }), null);
  assert.deepEqual([ONION_SPAN, ONION_FRAMES], [0.3, 5]);
  assert.match(onionProblem({ span: 0.6, n: 6 }), /--at/);
  assert.match(onionProblem({ at: '2', span: 0, n: 6 }), /--span/);
  assert.match(onionProblem({ at: '2', span: 0.6, n: 1 }), /-n/);
  assert.equal(velocityProblem({ at: '2', span: 1 }), null);
  assert.match(velocityProblem({ at: 'x', span: 1 }), /not a number/);
  assert.match(velocityProblem({ at: '2', span: 1, sel: '.a', ids: 'b' }), /not both/);
});

test('speedSeries: a constant slide has a constant speed in frame heights per second', () => {
  const { pts } = slide(ease.linear);
  const mid = speedSeries(pts, H).filter((p) => p.t > 0.2 && p.t < 0.5);
  for (const p of mid) assert.ok(Math.abs(p.v - 0.8) < 0.02, `${p.t} ${p.v}`);
});

test('scaleSeries: the scale is 1 at the last sample and its rate is the change per second', () => {
  const times = sampleTimes(0, 1);
  const pts = trackPoints(times, times.map((t) => [0, 0, 100 * (1 + t), 100 * (1 + t), 1]));
  const { rel, rate } = scaleSeries(pts);
  assert.equal(rel.at(-1).v, 1);
  assert.ok(Math.abs(rel[0].v - 0.5) < 1e-9);
  assert.ok(Math.abs(rate[60].v - 0.5) < 0.02);
});

test('analyseMove: start, peak, settle of a plain ease-out', () => {
  const { pts } = slide(ease.out);
  const m = analyseMove(pathProgress(pts, H), speedSeries(pts, H), 0.03);
  assert.equal(m.moves, true);
  assert.ok(m.start >= 0.1 && m.start < 0.15, `start ${m.start}`);
  assert.ok(m.peakAt < 0.2, `peak ${m.peakAt}`);
  assert.ok(m.settle > 0.45 && m.settle <= 0.6, `settle ${m.settle}`);
  assert.equal(m.settled, true);
  assert.ok(m.overshootPct < 0.5);
});

test('analyseMove: a pop ease passes its rest and the share is of the whole move', () => {
  const { pts } = slide(ease.pop);
  const m = analyseMove(pathProgress(pts, H), speedSeries(pts, H), 0.03);
  const peak = Math.max(...pts.map((p) => p.x)) - pts.at(-1).x;
  assert.ok(m.overshootPct > 5 && m.overshootPct < 15, `overshoot ${m.overshootPct}`);
  assert.ok(Math.abs(m.overshootPct - (100 * peak) / 400) < 1);
});

test('analyseMove: a move still going at the window end is not judged', () => {
  const { pts } = slide(ease.out, 2);
  const m = analyseMove(pathProgress(pts, H), speedSeries(pts, H), 0.03);
  assert.equal(m.settled, false);
  assert.equal(m.overshootPct, null);
});

test('analyseMove: a still element does not move', () => {
  const times = sampleTimes(0, 1);
  const pts = trackPoints(times, times.map(() => [10, 10, 50, 50, 1]));
  assert.equal(analyseTrack(pts, H).pos.moves, false);
  assert.equal(analyseTrack(pts, H).scale.moves, false);
});

test('easeShape: linear, ease-out, ease-in and in-out are told apart', () => {
  const shape = (fn) => { const { pts } = slide(fn); const m = analyseMove(pathProgress(pts, H), speedSeries(pts, H), 0.03); return m.shape; };
  assert.equal(shape(ease.linear), 'linear');
  assert.equal(shape(ease.out), 'ease-out');
  assert.equal(shape(ease.in), 'ease-in');
  assert.equal(shape(ease.inOut), 'in-out');
  assert.equal(easeShape([{ t: 0, v: 1 }], 0, 0), null);
});

test('analyseTrack: a box that grows past its final size overshoots on the scale channel', () => {
  const times = sampleTimes(0, 1);
  const pts = trackPoints(times, times.map((t) => { const s = 100 * (0.5 + 0.5 * ease.pop(Math.min(1, t / 0.5))); return [-s / 2, -s / 2, s, s, 1]; }));
  const a = analyseTrack(pts, H);
  assert.equal(a.pos.moves, false);
  assert.ok(a.scale.overshootPct > 5, `scale overshoot ${a.scale.overshootPct}`);
});

test('moveScore and topMovers: the elements that move most, never-shown ones last out', () => {
  const times = sampleTimes(0, 1);
  const track = (dx, alpha = 1) => times.map((t) => [dx * t, 0, 10, 10, alpha]);
  const scores = [moveScore(trackPoints(times, track(50)), H), moveScore(trackPoints(times, track(500)), H), moveScore(trackPoints(times, track(900, 0)), H), 0];
  assert.deepEqual(topMovers(scores, 4), [1, 0]);
  assert.deepEqual(topMovers(scores, 1), [1]);
});

test('velocitySvg: one polyline per element and a circle at each peak', () => {
  const line = (k) => [{ t: 0, v: 0 }, { t: 0.5, v: k }, { t: 1, v: 0 }];
  const svg = velocitySvg({ from: 0, to: 1, series: [
    { label: 'a', colour: '#111', speed: line(1), peak: { t: 0.5, v: 1 }, rel: null },
    { label: 'b <x>', colour: '#222', speed: line(2), peak: { t: 0.5, v: 2 }, rel: [{ t: 0, v: 0.5 }, { t: 1, v: 1 }] },
  ] });
  assert.equal((svg.match(/<polyline/g) || []).length, 3);
  assert.equal((svg.match(/<circle/g) || []).length, 2);
  assert.ok(svg.includes('b &lt;x&gt;'));
});
