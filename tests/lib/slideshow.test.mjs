import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { slideshowTells, slideshowLines } from '../../harness/lib/slideshow.mjs';

const rec = (target, delay, over = {}) => ({ target, id: 'enter', props: ['opacity'], delay, duration: 0.5, easing: 'linear', opacity: [0, 1], kf: {}, ...over });
const out = (target, delay, over = {}) => rec(target, delay, { id: 'leave', opacity: [1, 0], ...over });
const world = (id, start, end, cut = end - start) => ({ id, start, end, cut, hold: 0 });
const codes = (r) => r.tells.map((t) => t.code);

// 4 centred titles, 2 s each, each fading in as the last fades out, hard crossfades between all of them
const classic = {
  worlds: [world('a', 0, 2), world('b', 2, 4), world('c', 4, 6), world('d', 6, 8)],
  records: [0, 2, 4, 6].flatMap((t, i) => [rec(`h${i}`, t), rec(`s${i}`, t), ...(i < 3 ? [out(`h${i}`, t + 1.5), out(`s${i}`, t + 1.5)] : [])]),
  transitions: [2, 4, 6].map((s) => ({ startFrame: s * 30, endFrame: s * 30 + 15, type: 'crossfade' })),
  fps: 30,
};

test('a classic slideshow fires the tells and scores them', () => {
  const r = slideshowTells(classic);
  for (const c of ['same-entrance', 'same-in-out', 'crossfade-every-cut', 'swap-no-carry', 'one-thing-scenes', 'equal-shots']) assert.ok(codes(r).includes(c), c);
  assert.equal(r.score, r.tells.length);
  assert.match(slideshowLines(r)[0], /^slideshow: score \d+\/10$/);
  assert.match(slideshowLines(r).join('\n'), /crossfade-every-cut at 2, 4, 6 s: 3 of 3 cuts are crossfades\. Fix: /);
});

// scenes of different lengths and sizes, entrances that differ and stagger, overlap, and one ring that crosses every cut
const move = (from) => ({ props: ['transform'], opacity: [0, 1], kf: { translate: [from, '0px 0px'] } });
const varied = {
  worlds: [world('a', 0, 1.2, 0.8), world('b', 0.8, 3.6, 2.4), world('c', 3.4, 4.6, 1.2), world('d', 4.2, 7, 2.8)],
  records: [
    rec('ring', 0.1, { duration: 6 }),
    rec('a1', 0.1, move('-200px 0px')), rec('a2', 0.4, move('0px 40px')), rec('a3', 0.55, { kf: { scale: ['0.6', '1'] } }),
    rec('b1', 0.9, move('0px 120px')), rec('b2', 1.4, move('300px 0px')), rec('b3', 2.2, { kf: { scale: ['0.5', '1'] } }), out('b1', 3.2),
    rec('c1', 3.4, move('200px 0px')), rec('c2', 3.9, { kf: { filter: ['blur(8px)', 'blur(0px)'] } }), rec('c3', 4.0, move('0px -60px')),
    rec('d1', 4.3, move('-100px 0px')), rec('d2', 4.6, move('0px 90px')), rec('d3', 5.2, { kf: { scale: ['1.4', '1'] } }),
  ],
  transitions: [{ startFrame: 24, endFrame: 24, type: 'push' }, { startFrame: 102, endFrame: 102, type: 'wipe' }, { startFrame: 126, endFrame: 126, type: 'match' }],
  fps: 30,
};

test('a varied continuous film earns no tell', () => {
  assert.deepEqual(slideshowTells(varied).tells, []);
  assert.deepEqual(slideshowLines(slideshowTells(varied)), []);
});

test('hard cuts with a fade in on every scene fire cut-and-fade-in', () => {
  const r = slideshowTells({ ...classic, transitions: classic.transitions.map((t) => ({ ...t, type: 'cut' })) });
  assert.ok(codes(r).includes('cut-and-fade-in'));
  assert.ok(!codes(r).includes('crossfade-every-cut'));
});

test('scenes that leave fully before the next one enters fire dead-gap, an overlap does not', () => {
  const gap = { worlds: classic.worlds, records: [0, 2, 4, 6].flatMap((t, i) => [rec(`h${i}`, t + 0.2, move('0px 50px')), ...(i < 3 ? [out(`h${i}`, t + 1.2, { duration: 0.4 })] : [])]) };
  assert.ok(codes(slideshowTells(gap)).includes('dead-gap'));
  const overlap = { worlds: classic.worlds, records: [0, 2, 4, 6].flatMap((t, i) => [rec(`h${i}`, t + (i ? -0.3 : 0.2), move('0px 50px')), ...(i < 3 ? [out(`h${i}`, t + 1.2, { duration: 0.4 })] : [])]) };
  assert.ok(!codes(slideshowTells(overlap)).includes('dead-gap'));
});

test('every element of a scene arriving on one frame with one move fires all-at-once', () => {
  const together = { worlds: classic.worlds, records: [0, 2, 4, 6].flatMap((t, i) => [1, 2, 3].map((k) => rec(`e${i}${k}`, t + 0.1, move('0px 40px')))) };
  assert.ok(codes(slideshowTells(together)).includes('all-at-once'));
});

test('a film that holds still for a quarter of its length fires static-holds', () => {
  const held = slideshowTells({ ...varied, staticRuns: [{ a: 1, b: 3, len: 2 }], duration: 7 });
  assert.deepEqual(codes(held), ['static-holds']);
});

test('an enter() pair (its move and its fade start together) is one entrance of the move kind, and an em offset is a move', () => {
  const entrance = (target, at, from) => [
    rec(target, at, { props: ['translate', 'scale', 'filter'], opacity: null, kf: { translate: [from, '0px'], scale: ['0.96', '1'], filter: ['blur(10px)', 'blur(0px)'] } }),
    rec(target, at, { id: 'enter-fade', duration: 0.16 }),
  ];
  const rising = [0, 1, 2, 3, 4, 5].flatMap((i) => entrance(`e${i}`, i * 0.3, '0px 0.4em'));
  const tell = slideshowTells({ worlds: classic.worlds, records: rising }).tells.find((t) => t.code === 'same-entrance');
  assert.equal(tell.what, '6 of 6 elements enter with one move (blur + moves up + scale in)');
  const mixed = [0, 1, 2, 3, 4, 5].flatMap((i) => entrance(`e${i}`, i * 0.3, i % 2 ? '0.6em 0px' : '0px 0.4em'));
  assert.ok(!codes(slideshowTells({ worlds: classic.worlds, records: mixed })).includes('same-entrance'));
});

test('film shape alone never fires on fewer than the repeat counts', () => {
  assert.deepEqual(slideshowTells({ worlds: [world('a', 0, 2), world('b', 2, 4)], records: [rec('x', 0), rec('y', 2)] }).tells, []);
});

test('vawe check slideshow: the classic fixture page fires, the varied page passes', () => {
  const run = (f) => spawnSync(process.execPath, ['quality/gates/slideshow.mjs', `tests/fixtures/pages/slideshow-${f}.html`], { encoding: 'utf8' });
  const bad = run('classic');
  assert.equal(bad.status, 0);
  assert.match(bad.stdout, /score [1-9]\d*\/10/);
  assert.match(bad.stdout, /slideshow-equal-shots/);
  assert.match(run('varied').stdout, /score 0\/10/);
});

test('a page whose motion no source sees skips the record tells and keeps the world and video tells', () => {
  const r = slideshowTells({ ...classic, records: null });
  assert.equal(r.skipped, true);
  assert.deepEqual(codes(r).sort(), ['crossfade-every-cut', 'equal-shots']);
  assert.equal(slideshowTells(classic).skipped, false);
});

test('sightedRecords is null for a seek(t) page without sampled boxes', async () => {
  const { sightedRecords } = await import('../../harness/lib/motion-lint.mjs');
  assert.equal(sightedRecords({ scripted: true, records: [] }), null);
  assert.deepEqual(sightedRecords({ scripted: false, records: [1] }), [1]);
});

const carryBase = { worlds: classic.worlds, records: classic.records.map((r) => ({ ...r, duration: 0.5 })) };
const thread = (translates) => rec('thread', 0, {
  id: '', duration: 7.6, opacity: null, props: ['translate'], kf: { translate: ['0px 0px', '0px 0px'] },
  stops: [0, 1.8, 2.3, 3.8, 4.3, 5.8, 6.3, 7.6].map((s, i) => ({ offset: s / 7.6, translate: translates(i) })),
});
const withThread = (r) => codes(slideshowTells({ ...carryBase, records: [...carryBase.records, r] }));

test('one drift across the whole film is no handoff: swap-no-carry still fires', () => {
  const drift = rec('drift', 0.1, { id: '', duration: 7.5, opacity: null, props: ['translate'], kf: { translate: ['0px 0px', '120px 0px'] } });
  assert.ok(withThread(drift).includes('swap-no-carry'));
});

test('an element that hops across every cut is a handoff: no swap-no-carry', () => {
  assert.ok(!withThread(thread((i) => `${(i >> 1) % 2 ? 300 : 0}px 0px`)).includes('swap-no-carry'));
});

test('an element visible on both sides that holds still at the cut is no handoff', () => {
  assert.ok(withThread(thread(() => '0px 0px')).includes('swap-no-carry'));
});

test('a short exit-then-enter gap under the cut window does not fire dead-gap', () => {
  const short = { worlds: classic.worlds, records: [0, 2, 4, 6].flatMap((t, i) => [rec(`h${i}`, t + 0.1, move('0px 50px')), ...(i < 3 ? [out(`h${i}`, t + 1.5, { duration: 0.4 })] : [])]) };
  assert.ok(!codes(slideshowTells(short)).includes('dead-gap'));
});
