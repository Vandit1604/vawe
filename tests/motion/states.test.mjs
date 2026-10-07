import test from 'node:test';
import assert from 'node:assert/strict';
import { cutTimes, parseTimings, timingFor, flipOf, startMap, insideParent, moveFrames, fitStagger, moveOrder, retime, planCut, compose, invert } from '../../core/motion/states.js';

const rect = (x, y, w, h) => ({ x, y, w, h });
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const rule = (selectorText, style) => ({ selectorText, style });
const named = (name, old, now, extra = {}) => ({ name, el: name, rect: now, kind: 'text', parent: null, ...extra, old });
const state = (named = [], units = []) => ({ named: named.map((n) => ({ kind: 'text', parent: null, el: n.name, ...n })), units: units.map((el) => ({ el, name: null })) });

test('cutTimes: each world ends where the next begins, the last at the duration', () => {
  const spans = cutTimes([{ id: 's1', at: '0' }, { id: 's2', at: '1.8' }, { id: 's3', at: '4.4' }], 6);
  assert.deepEqual(spans, [{ id: 's1', start: 0, end: 1.8 }, { id: 's2', start: 1.8, end: 4.4 }, { id: 's3', start: 4.4, end: 6 }]);
});

test('cutTimes: the first world may omit data-at; a later one may not; times must rise', () => {
  assert.equal(cutTimes([{ id: 's1' }, { id: 's2', at: '2' }], 4)[0].start, 0);
  assert.throws(() => cutTimes([{ id: 's1' }, { id: 's2' }], 4), /s2 needs data-at/);
  assert.throws(() => cutTimes([{ id: 's1', at: '2' }, { id: 's2', at: '1' }], 4), /must come after/);
});

test('parseTimings: group, old and new rules by name and *, ms and s, comma lists, later rule wins per field', () => {
  const table = parseTimings([
    rule('::view-transition-group(*)', { animationDuration: '650ms' }),
    rule('::view-transition-group(memo), ::view-transition-group(tray)', { animationDuration: '0.8s', animationTimingFunction: 'ease-in-out', animationDelay: '' }),
    rule('::view-transition-old(root)', { animationDuration: '300ms' }),
    rule('::view-transition-new(root)', { animationDelay: '80ms, 2s' }),
    rule('::view-transition-group(memo)', { animationDelay: '0.1s' }),
    rule('.card', { animationDuration: '9s' }),
  ]);
  assert.deepEqual(table.get('group:*'), { duration: 0.65 });
  assert.deepEqual(table.get('group:memo'), { duration: 0.8, easing: 'ease-in-out', delay: 0.1 });
  assert.deepEqual(table.get('group:tray'), { duration: 0.8, easing: 'ease-in-out' });
  assert.deepEqual(table.get('old:root'), { duration: 0.3 });
  assert.deepEqual(table.get('new:root'), { delay: 0.08 });
  assert.equal(table.size, 5);
});

test('parseTimings: a cubic-bezier keeps its inner commas', () => {
  const table = parseTimings([rule('::view-transition-group(a)', { animationTimingFunction: 'cubic-bezier(0.2, 0, 0, 1), ease' })]);
  assert.equal(table.get('group:a').easing, 'cubic-bezier(0.2, 0, 0, 1)');
});

test('timingFor: the exact name beats *, a leaver reads old then group, unnamed content reads root', () => {
  const table = parseTimings([
    rule('::view-transition-group(*)', { animationDuration: '650ms', animationDelay: '10ms' }),
    rule('::view-transition-group(memo)', { animationDuration: '900ms' }),
    rule('::view-transition-old(memo)', { animationDuration: '200ms' }),
    rule('::view-transition-old(root)', { animationDuration: '300ms' }),
  ]);
  assert.equal(timingFor(table, 'move', 'memo').duration, 0.9);
  assert.equal(timingFor(table, 'move', 'other').duration, 0.65);
  assert.equal(timingFor(table, 'leave', 'memo').duration, 0.2);
  assert.equal(timingFor(table, 'enter', 'memo').duration, 0.9);
  assert.equal(timingFor(table, 'leave', null).duration, 0.3);
  assert.equal(timingFor(table, 'enter', null).duration, 0.65);
  assert.equal(timingFor(table, 'move', 'other').delay, 0.01);
  assert.equal(timingFor(new Map(), 'move', 'x').duration, undefined);
});

test('flipOf: centres give the translate; text scales by height, a box by the geometric mean, a plain shape by each axis', () => {
  const from = rect(0, 0, 200, 100), to = rect(300, 100, 50, 50);
  const text = flipOf(from, to, 'text'), box = flipOf(from, to, 'box'), plain = flipOf(from, to, 'plain');
  assert.deepEqual([text.dx, text.dy], [-225, -75]);
  assert.deepEqual([text.sx, text.sy], [2, 2]);
  near(box.sx, Math.sqrt(8));
  assert.equal(box.sx, box.sy);
  assert.deepEqual([plain.sx, plain.sy], [4, 2]);
  assert.deepEqual(flipOf(rect(0, 0, 0, 0), rect(5, 5, 10, 10), 'plain').sx, 1);
});

test('startMap and insideParent: a child inside a moved parent composes back to its old rect', () => {
  const parentNew = rect(100, 100, 400, 200), parentOld = rect(0, 0, 200, 100);
  const flip = flipOf(parentOld, parentNew, 'box');
  const map = startMap(flip, parentNew);
  const oldChild = rect(20, 10, 40, 20);
  const inside = insideParent(oldChild, map);
  const c = { x: inside.x + inside.w / 2, y: inside.y + inside.h / 2 };
  near(map.s * c.x + map.x, oldChild.x + oldChild.w / 2);
  near(map.s * c.y + map.y, oldChild.y + oldChild.h / 2);
  near(inside.w * map.s, oldChild.w);
  const m = { s: 2, x: 5, y: -3 };
  const id = compose(m, invert(m));
  near(id.s, 1); near(id.x, 0); near(id.y, 0);
});

test('moveFrames: starts on the old rect, ends at rest; a far move bows, a near one does not', () => {
  const far = moveFrames({ dx: -600, dy: 0, sx: 2, sy: 2 });
  assert.equal(far[0].translate, '-600px 0px');
  assert.equal(far[0].scale, '2 2');
  assert.equal(far.at(-1).translate, '0px 0px');
  assert.equal(far.at(-1).scale, '1 1');
  assert.notEqual(far[4].translate, '-300px 0px');
  const near1 = moveFrames({ dx: -100, dy: 0, sx: 1, sy: 1 });
  assert.equal(near1[4].translate, '-50px 0px');
});

test('moveFrames: two movers going opposite ways bow to opposite sides, so they pass without crossing', () => {
  const y = (frames) => Number(frames[4].translate.split(' ')[1].replace('px', ''));
  const right = moveFrames({ dx: 600, dy: 0, sx: 1, sy: 1 }), left = moveFrames({ dx: -600, dy: 0, sx: 1, sy: 1 });
  assert.ok(y(right) * y(left) < 0);
});

test('fitStagger: any count fits inside the total; one item starts at `at`', () => {
  assert.deepEqual(fitStagger(1, 2), [2]);
  const t = fitStagger(78, 1);
  assert.equal(t[0], 1);
  assert.ok(t.at(-1) - 1 <= 0.5 + 1e-9);
  assert.ok(t.every((v, i) => i === 0 || v >= t[i - 1]));
  assert.ok(fitStagger(4, 0, 0.1).at(-1) <= 0.1 + 1e-9);
});

test('moveOrder: a mover that lands where another stands goes after it; a ring does not hang', () => {
  const a = { name: 'a', old: rect(0, 0, 100, 50), rect: rect(300, 0, 100, 50), flip: { dx: -300, dy: 0 } };
  const b = { name: 'b', old: rect(300, 0, 100, 50), rect: rect(600, 0, 100, 50), flip: { dx: -300, dy: 0 } };
  const c = { name: 'c', old: rect(0, 200, 100, 50), rect: rect(300, 200, 100, 50), flip: { dx: -300, dy: 0 } };
  const order = moveOrder([a, b, c]).map((m) => m.name);
  assert.ok(order.indexOf('b') < order.indexOf('a'));
  const x = { name: 'x', old: rect(0, 0, 100, 50), rect: rect(300, 0, 100, 50), flip: { dx: -300, dy: 0 } };
  const y = { name: 'y', old: rect(300, 0, 100, 50), rect: rect(0, 0, 100, 50), flip: { dx: 300, dy: 0 } };
  assert.equal(moveOrder([x, y]).length, 2);
});

test('retime: two movers that would cross are separated in time; clear movers keep their start', () => {
  const m1 = { from: rect(0, 0, 100, 100), to: rect(600, 0, 100, 100), start: 0, duration: 0.4 };
  const m2 = { from: rect(300, -300, 100, 100), to: rect(300, 300, 100, 100), start: 0.05, duration: 0.4 };
  const lone = { from: rect(0, 500, 100, 100), to: rect(600, 500, 100, 100), start: 0.1, duration: 0.65 };
  const out = retime([m1, m2, lone]);
  assert.equal(out.get(m1), 0);
  assert.ok(out.get(m2) > 0.05);
  assert.equal(out.get(lone), 0.1);
});

test('retime: a tray and the bars inside it do not hold each other back', () => {
  const tray = { from: rect(0, 0, 800, 400), to: rect(0, 300, 800, 100), start: 0, duration: 0.65 };
  const bar = { from: rect(100, 100, 8, 200), to: rect(100, 330, 8, 40), start: 0.05, duration: 0.65 };
  assert.equal(retime([tray, bar]).get(bar), 0.05);
});

const TABLE = new Map();
const endOf = (a) => (a.timing.delay + a.timing.duration) / 1000;
const startOf = (a) => a.timing.delay / 1000;

test('planCut: leavers end by the cut, movers start at it, enterers come after the movers have nearly landed', () => {
  const prev = state([{ name: 'memo', rect: rect(0, 0, 100, 50) }, { name: 'gone', rect: rect(0, 100, 50, 50) }], ['chip']);
  const next = state([{ name: 'memo', rect: rect(400, 300, 200, 100) }, { name: 'fresh', rect: rect(0, 0, 50, 50) }], ['title']);
  const { anims } = planCut(prev, next, TABLE, { at: 5, floor: 3 });
  const by = (role) => anims.filter((a) => a.role === role);
  assert.deepEqual(by('leave').map((a) => a.el).sort(), ['chip', 'gone']);
  by('leave').forEach((a) => assert.ok(endOf(a) <= 5 + 1e-9 && startOf(a) >= 3));
  const move = by('move');
  assert.deepEqual(move.map((a) => a.el), ['memo']);
  assert.ok(startOf(move[0]) >= 5);
  const lands = endOf(move[0]);
  by('enter').forEach((a) => assert.ok(startOf(a) > 5 && startOf(a) < lands && startOf(a) >= 5 + 0.85 * (lands - 5) - 0.3));
  assert.deepEqual(by('enter').map((a) => a.el).sort(), ['fresh', 'fresh', 'title', 'title']);
  assert.equal(anims.some((a) => a.role !== 'move' && a.el === 'memo'), false);
});

test('planCut: a leaver runs 0.6 of an entrance and the first state has no leavers', () => {
  const next = state([], ['a']);
  const first = planCut(null, next, TABLE, { at: 0 }).anims;
  assert.ok(first.every((a) => a.role === 'enter'));
  const enterMain = first.find((a) => a.timing.id === 'enter');
  const leave = planCut(state([], ['a']), state(), TABLE, { at: 4 }).anims[0];
  near(leave.timing.duration / enterMain.timing.duration, 0.6, 0.01);
});

test('planCut: CSS timing overrides duration, easing and delay for each role', () => {
  const table = parseTimings([
    rule('::view-transition-group(memo)', { animationDuration: '1s', animationTimingFunction: 'ease-in', animationDelay: '0.2s' }),
    rule('::view-transition-old(gone)', { animationDuration: '100ms' }),
    rule('::view-transition-new(fresh)', { animationDuration: '500ms', animationDelay: '50ms' }),
  ]);
  const prev = state([{ name: 'memo', rect: rect(0, 0, 100, 50) }, { name: 'gone', rect: rect(0, 100, 50, 50) }]);
  const next = state([{ name: 'memo', rect: rect(400, 0, 100, 50) }, { name: 'fresh', rect: rect(0, 0, 50, 50) }]);
  const { anims } = planCut(prev, next, table, { at: 2 });
  const move = anims.find((a) => a.role === 'move');
  assert.deepEqual([move.timing.delay, move.timing.duration, move.timing.easing], [2200, 1000, 'ease-in']);
  assert.equal(anims.find((a) => a.role === 'leave').timing.duration, 100);
  const enter = anims.find((a) => a.role === 'enter' && a.timing.id === 'enter');
  assert.equal(enter.timing.duration, 500);
  assert.ok(startOf(enter) >= 2.05);
});

test('planCut: a mover with no motion makes no animation; the old instance is not a leaver', () => {
  const same = rect(10, 10, 80, 40);
  const { anims } = planCut(state([{ name: 'w', rect: same }]), state([{ name: 'w', rect: same }]), TABLE, { at: 1 });
  assert.deepEqual(anims, []);
});

test('planCut: a name nested in a moving parent shares its timing; a container that enters around a mover does not fade', () => {
  const prev = state([
    { name: 'card', rect: rect(0, 0, 400, 200), kind: 'box' },
    { name: 'w', rect: rect(20, 20, 100, 40), parent: 'card' },
  ]);
  const next = state([
    { name: 'card', rect: rect(200, 300, 400, 400), kind: 'box' },
    { name: 'w', rect: rect(220, 330, 100, 40), parent: 'card' },
    { name: 'late', rect: rect(220, 400, 100, 40), parent: 'card' },
  ]);
  const { anims } = planCut(prev, next, TABLE, { at: 1 });
  const card = anims.find((a) => a.name === 'card'), w = anims.find((a) => a.name === 'w');
  assert.ok(card && w);
  assert.deepEqual([w.timing.delay, w.timing.duration], [card.timing.delay, card.timing.duration]);

  const entering = planCut(state([{ name: 'w', rect: rect(0, 0, 100, 40) }]), state([{ name: 'box', rect: rect(0, 0, 500, 300), kind: 'box' }, { name: 'w', rect: rect(50, 60, 100, 40), parent: 'box' }]), TABLE, { at: 1 }).anims;
  const boxEnter = entering.filter((a) => a.name === 'box');
  assert.deepEqual(boxEnter.map((a) => a.timing.id), ['enter']);
});

test('planCut: a named element inside a leaving named parent does not leave on its own', () => {
  const prev = state([{ name: 'box', rect: rect(0, 0, 100, 100), kind: 'box' }, { name: 'inner', rect: rect(5, 5, 20, 20), parent: 'box' }]);
  const { anims } = planCut(prev, state(), TABLE, { at: 3 });
  assert.deepEqual(anims.map((a) => a.name), ['box']);
});
