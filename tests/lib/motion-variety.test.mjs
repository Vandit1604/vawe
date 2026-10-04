import test from 'node:test';
import assert from 'node:assert/strict';
import { scenesOf, entranceDirection, easeCount, lockstep, motionVariety } from '../../harness/lib/motion-variety.mjs';
import { motionLint } from '../../harness/lib/motion-lint.mjs';
import { EASE } from '../../core/motion/presets.js';
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

const rec = (over) => ({ target: 0, label: 'h1', id: 'enter', props: ['translate'], delay: 0, duration: 0.5, easing: EASE.land, kfEasings: [], opacity: [0, 1], from: 'translate(0px, 24px)', fullFrame: false, decorative: false, ...over });
const enters = (n, over = () => ({})) => Array.from({ length: n }, (_, i) => rec({ target: i, delay: i * 0.6, ...over(i) }));

test('a scene starts at an entrance, and a gap over scene-budget.scene_gap_s starts the next', () => {
  const gap = LIMITS['scene-budget'].scene_gap_s;
  const scenes = scenesOf([rec({ delay: 0 }), rec({ target: 1, delay: 0.5 }), rec({ target: 2, delay: 0.5 + gap + 0.1 }), rec({ target: 3, id: 'leave', opacity: [1, 0], delay: 2 })]);
  assert.deepEqual(scenes.map((s) => [s.at, s.records.length]), [[0, 2], [0.5 + gap + 0.1, 2]]);
  assert.deepEqual(scenesOf([]), []);
});

test('entrances: three phrases that all start from below fire; a stagger counts once; another side or a fade ends it', () => {
  const found = entranceDirection(enters(3));
  assert.deepEqual(found.map((f) => [f.code, f.rule]), [['entrance-direction', 'entrance-origin']]);
  assert.match(found[0].what, /3 entrances in the scene at 0\.00 s all come from below/);
  assert.equal(entranceDirection(enters(9, (i) => ({ delay: i * 0.05 }))).length, 0);
  assert.equal(entranceDirection(enters(3, (i) => ({ from: i === 1 ? 'translate(-24px, 0px)' : 'translate(0px, 24px)' }))).length, 0);
  assert.equal(entranceDirection(enters(3, (i) => ({ from: i === 1 ? '' : 'translate(0px, 24px)' }))).length, 0);
  assert.equal(entranceDirection(enters(2)).length, 0);
});

test('eases: more than the limit among a scene\'s entrances fire; exits, linear and inferred curves are not counted', () => {
  const eased = (names) => names.map((n, i) => rec({ target: i, delay: i * 0.1, easing: EASE[n] ?? n }));
  assert.equal(easeCount(eased(['land', 'glide'])).length, 0);
  const [f] = easeCount(eased(['land', 'glide', 'pop']));
  assert.deepEqual([f.code, f.rule], ['ease-count', 'ease-variety']);
  assert.match(f.what, /3 eases \(land, glide, pop\); the rule allows 2/);
  assert.equal(easeCount([...eased(['land', 'glide']), rec({ target: 7, id: 'leave', opacity: [1, 0], easing: EASE.launch })]).length, 0);
  assert.equal(easeCount(eased(['land', 'glide', 'linear'])).length, 0);
  assert.equal(easeCount(eased(['land', 'glide', 'inferred'])).length, 0);
});

test('lockstep: two entrances that start and last alike fire; an offset or another duration clears it; a drift is not an entrance', () => {
  const pair = (b) => [rec({ target: 0 }), rec({ target: 1, ...b })];
  assert.deepEqual(lockstep(pair({})).map((f) => [f.code, f.rule]), [['lockstep', 'ease-variety']]);
  assert.equal(lockstep(pair({ delay: 0.06 })).length, 0);
  assert.equal(lockstep(pair({ duration: 0.65 })).length, 0);
  assert.equal(lockstep(pair({ id: '', opacity: null })).length, 0);
  assert.equal(lockstep([rec({}), rec({})]).length, 0);
});

test('motionLint carries the three checks, so the page waiver and the printed line work like the rest', () => {
  const codes = motionLint({ records: enters(3), scripted: false }).map((f) => f.code);
  assert.ok(codes.includes('entrance-direction'));
  assert.equal(motionVariety([]).length, 0);
});
