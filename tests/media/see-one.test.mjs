// The pure parts of `vawe see` on canned numbers. No ffmpeg, no browser.
import assert from 'node:assert/strict';
import test from 'node:test';
import { findRuns, findTransitions } from '../../harness/lib/ref-measure/transition.mjs';
import { despike, noiseOf, readMotion } from '../../harness/media/see/motion-math.mjs';
import { burstsOfMoves, cameraWords, grainOf, layoutTilt, maskFlashes, separateFlashes, seeProblem, sharpnessMap, shotsWithoutFlashes } from '../../harness/media/see/one-math.mjs';
import { peakSpeed, arcOf } from '../../harness/media/see/one-measure.mjs';
import { compareSides, vsLines } from '../../harness/media/see/one-vs.mjs';
import { notMeasured, shotAccount } from '../../harness/media/see/one-report.mjs';

const series = (values, dt = 1 / 30) => values.map((v, i) => ({ t: +(i * dt).toFixed(4), v }));

test('despike removes a one-frame spike and keeps a two-frame move', () => {
  assert.deepEqual(despike(series([0, 9, 0, 0])).map((p) => p.v), [0, 0, 0, 0]);
  assert.deepEqual(despike(series([0, 5, 5, 0])).map((p) => p.v), [0, 5, 5, 0]);
});

test('readMotion finds a slow move under the old fixed floor and one burst for a spring that turns', () => {
  const quiet = Array(20).fill(0);
  const slow = [...quiet, ...Array(30).fill(0.12), ...quiet];
  const r = readMotion(series(slow), 0, 70 / 30);
  assert.equal(r.moving, true);
  assert.equal(r.bursts.length, 1);
  assert.ok(Math.abs(r.start - 20 / 30) < 0.05, `start ${r.start}`);
  const spring = [...quiet, 4, 3, 2, 1, 0.4, 0.1, 0, 0.5, 0.9, 0.6, 0.3, 0.1, ...quiet];
  assert.equal(readMotion(series(spring), 0, spring.length / 30).bursts.length, 1);
});

test('readMotion splits two moves a real stop apart and ignores an encoder spike', () => {
  const two = [...Array(10).fill(0), 3, 3, 3, ...Array(10).fill(0), 3, 3, 3, ...Array(10).fill(0)];
  assert.equal(readMotion(series(two), 0, two.length / 30).bursts.length, 2);
  const spike = [...Array(10).fill(0), 7, ...Array(10).fill(0)];
  assert.equal(readMotion(series(spike), 0, spike.length / 30).moving, false);
  assert.deepEqual(readMotion([], 0, 1), null);
});

test('noiseOf takes the quietest fifth of the series', () => {
  const n = noiseOf(series([5, 5, 5, 5, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]));
  assert.equal(n.mu, 0.1);
  assert.equal(n.sigma, 0);
});

test('separateFlashes: a solid flash over the same shot takes its edges, a coloured short shot stays a shot, a white-out keeps its last edge as the cut', () => {
  const cuts = [{ frame: 24 }, { frame: 26 }, { frame: 60 }];
  const lab = (frame) => (frame < 40 ? [20, 0, 0] : [60, 20, 20]);
  const same = separateFlashes(cuts, [{ frame: 24, frames: 2, neutral: true }], () => [20, 0, 0]);
  assert.deepEqual(same.cuts.map((c) => c.frame), [60]);
  assert.equal(same.flashEdges.length, 2);
  assert.equal(same.flashes[0].sameShot, true);
  const shot = separateFlashes(cuts, [{ frame: 24, frames: 2, neutral: false }], (frame) => (frame < 25 ? [20, 0, 0] : [60, 20, 20]));
  assert.equal(shot.flashes.length, 0);
  assert.equal(shot.cuts.length, 3);
  const whiteOut = separateFlashes([{ frame: 38 }, { frame: 41 }], [{ frame: 38, frames: 3, neutral: true }], lab);
  assert.deepEqual(whiteOut.cuts.map((c) => c.frame), [41]);
  assert.equal(whiteOut.flashes[0].sameShot, false);
});

test('shotsWithoutFlashes drops the shot inside a flash and joins the shots either side of a same-shot flash', () => {
  const shot = (index, f0, f1) => ({ index, f0, f1, elements: [{ id: `${index}.1` }], text: [], hits: [] });
  const out = shotsWithoutFlashes([shot(1, 0, 24), shot(2, 24, 26), shot(3, 26, 90)], [{ frame: 24, frames: 2, sameShot: true, at: 0.8 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].f1, 90);
  assert.deepEqual(out[0].flashes, [0.8]);
  assert.equal(out[0].elements.length, 2);
});

test('maskFlashes zeroes the energy under a flash and its edges', () => {
  const masked = maskFlashes(series([0, 9, 0, 9, 0, 0.5]), [{ frame: 1, frames: 2 }], 30);
  assert.deepEqual(masked.map((p) => p.v), [0, 0, 0, 0, 0, 0.5]);
});

test('burstsOfMoves joins moves that start before the last one ends and splits at a gap', () => {
  const moves = [{ id: 'a', start: 0.5, settle: 1.4 }, { id: 'b', start: 1.5, settle: 1.9 }, { id: 'c', start: 2.5, settle: 2.7 }, { id: 'd', start: null, settle: 3 }];
  assert.deepEqual(burstsOfMoves(moves), [{ t0: 0.5, t1: 1.9, elements: ['a', 'b'] }, { t0: 2.5, t1: 2.7, elements: ['c'] }]);
});

test('peakSpeed is the largest two-frame central difference', () => {
  const rows = [0, 2, 6, 12, 14, 15].map((x, i) => ({ f: i, x, y: 0 }));
  assert.equal(peakSpeed(rows, 30), 5 * 30);
});

test('cameraWords says push, pan and static in plain words', () => {
  assert.equal(cameraWords({ zoomTotal: 1, panTotalPx: [0, 0], peakZoomPerFrame: 0, peakPanPxPerFrame: 0 }, 30), 'static');
  assert.match(cameraWords({ zoomTotal: 1.2, panTotalPx: [60, 3], peakZoomPerFrame: 0.01, peakPanPxPerFrame: 4 }, 30), /push in x1.2.*pan right 60 px/);
  assert.match(cameraWords({ zoomTotal: 1, panTotalPx: [0, 0], peakZoomPerFrame: 0, peakPanPxPerFrame: 0, rotation: { total: -6 } }, 30), /rotate anticlockwise 6 deg/);
});

test('sharpnessMap: an even picture has a ratio near 1 and a half-blurred one a high ratio', () => {
  const w = 96, h = 72;
  const noise = (i) => ((i * 2654435761) >>> 0) % 256;
  const sharp = new Uint8Array(w * h).map((_, i) => noise(i));
  const half = sharp.map((v, i) => ((i % w) < w / 2 ? v : 128));
  assert.ok(sharpnessMap(sharp, w, h).ratio < 1.5);
  assert.ok(sharpnessMap(half, w, h).ratio > 3);
});

test('grainOf reads the temporal noise of flat tiles and is null without flat tiles', () => {
  const w = 64, h = 64, a = new Uint8Array(w * h).fill(100);
  const b = a.map((_, i) => 100 + ((i * 7919) % 5) - 2);
  const g = grainOf(a, b, w, h);
  assert.ok(g.sigma > 0.5 && g.sigma < 3, `sigma ${g.sigma}`);
  const busy = new Uint8Array(w * h).map((_, i) => (i % 2 ? 255 : 0));
  assert.equal(grainOf(busy, busy, w, h), null);
});

test('seeProblem names the first bad argument', () => {
  assert.equal(seeProblem({ at: '2.5' }), null);
  assert.match(seeProblem({ at: 'x' }), /--at/);
  assert.match(seeProblem({ atB: '1' }), /--at-b needs --vs/);
  assert.match(seeProblem({ from: '3', to: '2' }), /--to must be after --from/);
});

const side = (over = {}) => ({
  source: { name: 'x', kind: 'mp4', video: '/x.mp4', hash: 'abcdef0123456789' }, media: { width: 1920, height: 1080, fps: 30, duration: 10, frames: 300, specFps: 30, audio: false },
  structure: { shots: [{ index: 1, id: 'shot 1', start: 0, end: 5, length: 5, frames: 150, cutIn: { type: 'start', frames: 0 }, flashes: [] }, { index: 2, id: 'shot 2', start: 5, end: 10, length: 5, frames: 150, cutIn: { type: 'cut', frames: 1 }, flashes: [] }], cuts: [{ at: 5, type: 'cut' }], flashEdges: [], rhythm: { lengths: [5, 5], min: 5, median: 5, max: 5, advice: [] }, worlds: null, tempo: null },
  shots: [], look: { film: { luma: { median: 30, max: 200 }, clip: { median: 0, peak: 1 }, bloom: null, chroma: null, glow: null, texture: null }, flashes: [], perShot: [], colour: { chromaMedian: 10, chromaP90: 20, shareDark: 0.5, shareLight: 0.1 } },
  type: { words: [], lines: [], holds: null, ocr: true }, sound: { hits: [], mp4: null, page: null, bpm: null },
  ...over,
});

test('compareSides gives advice that names the page literal and none for equal films', () => {
  const a = side(), b = side({ look: { ...side().look, flashes: [{ frames: 2, seconds: 0.067, peakLuma: 200, baseLuma: 48 }], film: { ...side().look.film, bloom: { px: 16, sigma: 12.5, n: 100 }, chroma: { dx: -4, dy: 0, share: 80, n: 100 } } } });
  const rows = compareSides(a, b);
  const advice = rows.filter((r) => r.advice).map((r) => r.advice).join('\n');
  assert.match(advice, /add 1 flash:/);
  assert.match(advice, /film the screen with the lens/);
  assert.match(advice, /bloom \{strength, radius\}/);
  assert.match(advice, /aberration\.amount/);
  assert.doesNotMatch(advice, /text-shadow|mix-blend-mode|repeating-linear-gradient/);
  assert.equal(compareSides(a, side()).filter((r) => r.advice).length, 0);
  assert.ok(vsLines(rows, ['a', 'b']).join('\n').includes('Advice'));
});

test('shotAccount and notMeasured say what they know and what they do not', () => {
  const shot = { start: 0, end: 1, length: 1, frames: 30, cutIn: { type: 'start', frames: 0, dir: '' }, flashes: [], ground: null, palette: [{ hex: '#000000', share: 1 }], layout: [], moves: [], energy: { moving: false, peak: 0 }, camera: { words: 'static' }, eye: null, text: [], hits: [] };
  const lines = shotAccount(shot);
  assert.ok(lines.some((l) => /No part is tracked as moving/.test(l)));
  assert.ok(lines.some((l) => /Camera: static/.test(l)));
  assert.ok(notMeasured(side()).some((l) => /look at/.test(l)));
});

test('transitions: a ground that drifts over many frames is no transition, a hard cut is', () => {
  const w = 64, h = 36, n = 40;
  const rgb = new Uint8Array(n * w * h * 3);
  for (let f = 0; f < n; f++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (f * w * h + y * w + x) * 3, dot = (x - 32) ** 2 + (y - 18) ** 2 < 100;
      const g = dot ? 255 : 40 + f * 3;
      rgb[o] = g; rgb[o + 1] = g; rgb[o + 2] = dot ? 255 : g + 30;
    }
  }
  const drift = { w, h, n, rgb };
  assert.equal(findTransitions(drift).length, 0);
  const cut = { w, h, n, rgb: rgb.map((v, i) => (Math.floor(i / (w * h * 3)) >= 20 ? 255 - v : v)) };
  assert.equal(findRuns(cut).length, 1);
});

test('layoutTilt reads the lean of a turned rectangle and is zero for an upright one', () => {
  const w = 400, h = 300;
  const rect = (deg) => {
    const th = (deg * Math.PI) / 180, a = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x - 200) * Math.cos(th) + (y - 150) * Math.sin(th), v = -(x - 200) * Math.sin(th) + (y - 150) * Math.cos(th);
      const edge = Math.min(Math.max(0, Math.min(100 - Math.abs(u), 40 - Math.abs(v)) + 0.5), 1);
      a[y * w + x] = 20 + 235 * edge;
    }
    return a;
  };
  const turned = layoutTilt(rect(8), w, h);
  assert.ok(Math.abs(turned.deg - 8) <= 1.5, `deg ${turned.deg}`);
  assert.equal(layoutTilt(rect(0), w, h).deg, 0);
  assert.deepEqual(layoutTilt(new Uint8Array(w * h), w, h), { deg: 0, share: 0, peaks: [] });
});

test('vs: a lens page gets lens options, a count delta says how many, silent and low-OCR sides give no sound or word advice', () => {
  const base = side();
  const lensPage = side({ source: { ...base.source, lens: true }, look: { ...base.look, film: { ...base.look.film, bloom: { px: 4, sigma: 3, n: 50 } } } });
  const ref = side({ look: { ...base.look, flashes: [1, 2, 3].map(() => ({ frames: 2, seconds: 0.07, peakLuma: 200, baseLuma: 40 })), film: { ...base.look.film, bloom: { px: 16, sigma: 12.5, n: 50 } } }, sound: { hits: [], mp4: null, page: null, bpm: 178, hasAudio: false }, type: { words: [{ text: 'x', hold: 1, capHeightPct: 4, fontPx: 50 }], lines: [], holds: null, ocr: true, confidence: 'low' } });
  const rows = compareSides(lensPage, ref);
  const text = rows.filter((r) => r.advice).map((r) => r.advice).join('\n');
  assert.match(text, /bloom\.radius until the glow measures 16 px \(core\/surfaces\/lens\.js\)|bloom\.radius until the glow measures 16 px/);
  assert.match(text, /add 3 flashes/);
  assert.doesNotMatch(text, /BPM|cues|word/);
  assert.equal(rows.find((r) => r.measure === 'tempo BPM').b, 'no audio');
});

test('arcOf: the bow of a path off its chord as a share of the chord; a straight or short path has none to print', () => {
  const rows = (pts) => pts.map(([x, y], f) => ({ f, x, y }));
  assert.equal(arcOf(rows([[0, 0], [100, 0], [200, 0], [300, 0]])), 0);
  assert.equal(arcOf(rows([[0, 0], [100, 30], [200, 30], [300, 0]])), 0.1);
  assert.equal(arcOf(rows([[0, 0], [30, 5], [60, 0]])), null);
  assert.equal(arcOf(rows([[0, 0], [300, 0]])), null);
});

test('resolveSource throws a SourceError for a draft that is not there', async () => {
  const { resolveSource, SourceError } = await import('../../harness/media/see/one-input.mjs');
  await assert.rejects(resolveSource('films/examples/colour-sting/page.html', { draft: '/no/such/draft.mp4' }), (e) => e instanceof SourceError && /no such --draft file/.test(e.message));
});
