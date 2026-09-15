// node --test quality/gates/read-check.test.mjs
//
// engine-doctrine/RULES/readable-hold.md, P1 of .claude/plans/craft-knowledge/01-motion.plan.md: the
// unreadable-hold finding reports the fix, it never changes timing, and it must name the beat (or the
// layer id), the element, the measured hold, the minimum it needs, and the exact seconds to add.
import test from 'node:test';
import assert from 'node:assert';
import { readFindings, MIN_READABLE_HOLD, HOLD_PER_WORD } from './read-check.mjs';

// `cut: true` makes the settle window equal the raw duration minus the fixed ARRIVED_PAD (0.06s), so
// the measured hold is exact and the fixtures below are not at the mercy of the default enter/exit ramp.
const clip = (duration, extra = {}) => ({ type: 'clip', src: 'x', start: 0, duration, cut: true, ...extra });
const scene = (layers, beats) => [readFindings({ aspect: '16:9', duration: 6, layers }, beats)];

test('a clip held 0.6s fires unreadable-hold, names the beat (or id), and asks to add 0.6s', () => {
  const [findings] = scene([clip(0.66)], [{ name: 'reveal', start: 0, end: 0.7 }]);
  assert.equal(findings.length, 1);
  const f = findings[0];
  assert.equal(f.code, 'unreadable-hold');
  assert.match(f.msg, /beat 1 "reveal"/, 'names the beat, not just the layer id, when a storyboard resolves it');
  assert.match(f.msg, /clip/, 'names the element');
  assert.match(f.msg, /0\.60s/, 'names the measured hold');
  assert.match(f.msg, new RegExp(`${MIN_READABLE_HOLD.toFixed(2)}s`), 'names the minimum readable time');
  assert.match(f.msg, /Add 0\.60s/, 'names the exact seconds to add');
});

test('a clip held 0.6s falls back to the layer id when no beat resolves', () => {
  const [findings] = scene([clip(0.66)]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].msg, /layer #0/);
});

test('a 1.3s clip clears the 1.2s floor and stays silent', () => {
  const [findings] = scene([clip(1.3)]);
  assert.deepEqual(findings.filter((f) => f.code === 'unreadable-hold'), []);
});

test('prose text uses the read-twice reading-time rule, not the flat floor', () => {
  const text = { type: 'text', text: 'this headline needs more time on screen', start: 0, duration: 1.0, size: 60, cut: true };
  const [findings] = scene([text]);
  const f = findings.find((x) => x.code === 'unreadable-hold');
  assert.ok(f, 'a 7-word line held well under 4.2s must fire');
  assert.match(f.msg, new RegExp(`${HOLD_PER_WORD}s/word`), 'names the reading-time rule the gate already uses');
});
