import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRecords, motionLint, exitLength, groupLanding, linearMove, seamRepeat, oneBand, moveDirection, unwaived, lintLines } from '../../harness/lib/motion-lint.mjs';

const rec = (o) => ({ target: 0, label: 'h1 "Hi"', id: '', props: ['opacity'], delay: 0, duration: 0.5, easing: 'linear',
  kfEasings: ['ease', 'ease'], opacity: null, from: '', fullFrame: false, ...o });

test('an exit as long as its entrance is flagged under rule 5; a shorter one is not', () => {
  const inn = rec({ opacity: [0, 1], duration: 0.6 });
  const [f] = exitLength([inn, rec({ opacity: [1, 0], delay: 2, duration: 0.6 })]);
  assert.equal(f.rule, 5);
  assert.equal(f.at, 2);
  assert.deepEqual(exitLength([inn, rec({ opacity: [1, 0], delay: 2, duration: 0.36 })]), []);
});

test('three entrances landing on one 60 fps frame are a group landing; a stagger is not', () => {
  const same = [0, 1, 2].map((k) => rec({ target: k, opacity: [0, 1], delay: 1, duration: 0.4 }));
  const [f] = groupLanding(same);
  assert.equal(f.rule, 8);
  assert.equal(f.at, 1.4);
  const staggered = [0, 1, 2].map((k) => rec({ target: k, opacity: [0, 1], delay: 1 + k * 0.05, duration: 0.4 }));
  assert.deepEqual(groupLanding(staggered), []);
});

test('linear easing on a move over 0.3 s is flagged; a per-keyframe curve or a short move is not', () => {
  const move = { props: ['translate'], kfEasings: ['linear', 'linear'] };
  assert.equal(linearMove([rec({ ...move, duration: 0.8 })])[0].rule, 6);
  assert.deepEqual(linearMove([rec({ ...move, duration: 0.2 })]), []);
  assert.deepEqual(linearMove([rec({ ...move, duration: 0.8, kfEasings: ['linear(0, 0.5, 1)', 'linear'] })]), []);
  assert.deepEqual(linearMove([rec({ props: ['color'], kfEasings: ['linear'], duration: 0.8 })]), []);
});

test('a default CSS keyword on a move over 0.3 s points at the EASE names; a custom curve does not', () => {
  const move = { props: ['translate'], duration: 0.8 };
  const [f] = linearMove([rec({ ...move, easing: 'ease-in-out', kfEasings: ['linear', 'linear'] })]);
  assert.equal(f.code, 'default-ease');
  assert.match(f.fix, /EASE\.land.*EASE\.leave/);
  assert.match(linearMove([rec({ ...move, easing: 'ease', kfEasings: ['ease', 'ease'] })])[0].what, /CSS keyword ease/);
  assert.match(linearMove([rec({ ...move, kfEasings: ['linear', 'linear'] })])[0].fix, /EASE\.land/);
  assert.deepEqual(linearMove([rec({ ...move, easing: 'linear(0, 0.6, 1)', kfEasings: ['ease', 'ease'] })]), []);
  assert.deepEqual(linearMove([rec({ ...move, easing: 'ease', kfEasings: ['ease', 'ease'], duration: 0.2 })]), []);
});

test('moveDirection reads translate, translateX/Y and a single-value translate', () => {
  assert.equal(moveDirection('0 0.5em'), 'y+');
  assert.equal(moveDirection('-0.8em'), 'x-');
  assert.equal(moveDirection('translateY(12%)'), 'y+');
  assert.equal(moveDirection('translate(-40px, 0px)'), 'x-');
  assert.equal(moveDirection('inset(0 0 0 100%)'), '');
});

test('the same full-frame seam move twice in a row is flagged; a changed direction and hard cuts are not', () => {
  const seam = (delay, from) => rec({ fullFrame: true, props: ['translate'], delay, duration: 0.4, from, kfEasings: ['x', 'x'] });
  const [f] = seamRepeat([seam(1, '100% 0'), seam(2, '100% 0')]);
  assert.equal(f.rule, 10);
  assert.equal(f.at, 2);
  assert.deepEqual(seamRepeat([seam(1, '100% 0'), seam(2, '0 100%')]), []);
  const cut = (delay) => rec({ fullFrame: true, opacity: [0, 1], delay, duration: 0.001 });
  assert.deepEqual(seamRepeat([cut(1), cut(2)]), []);
});

test('one speed band across the film is flagged unless the page paints in script', () => {
  const same = [rec({ opacity: [0, 1], duration: 0.4 }), rec({ opacity: [0, 1], delay: 1, duration: 0.45 })];
  assert.equal(oneBand(same)[0].rule, 8);
  assert.deepEqual(oneBand(same, { scripted: true }), []);
  assert.deepEqual(oneBand([...same, rec({ opacity: [0, 1], duration: 1.2 })]), []);
});

test('a waiver with a reason silences its line, bare or at its second', () => {
  const findings = exitLength([rec({ opacity: [0, 1], duration: 0.3 }), rec({ opacity: [1, 0], delay: 2, duration: 0.3 })]);
  assert.equal(unwaived(findings, { allow: ['exit-length'], _why: { 'exit-length': 'the slow fade is the ending' } }).length, 0);
  assert.equal(unwaived(findings, { allow: ['exit-length@2.00'], _why: { 'exit-length@2.00': 'the slow fade is the ending' } }).length, 0);
  assert.equal(unwaived(findings, { allow: ['exit-length'] }).length, 1);
});

test('lines carry the rule, the second, the code and one fix, in time order', () => {
  const findings = motionLint({ scripted: false, records: [
    rec({ target: 0, opacity: [0, 1], duration: 0.3 }), rec({ target: 0, opacity: [1, 0], delay: 3, duration: 0.3 }),
    rec({ target: 1, props: ['translate'], kfEasings: ['linear', 'linear'], delay: 1, duration: 0.9 }),
  ] });
  const lines = lintLines(findings);
  assert.match(lines[0], /^rule 6 @1\.00s linear-move: .*; fix: /);
  assert.match(lines[1], /^rule 5 @3\.00s exit-length: /);
});

test('an element inside aria-hidden is texture: its exit is not measured', () => {
  const inn = rec({ opacity: [0, 1], duration: 0.6, decorative: true });
  assert.deepEqual(exitLength([inn, rec({ opacity: [1, 0], delay: 2, duration: 0.6, decorative: true })]), []);
});

test('an exit sampled at a spacing as long as the exit is not measured; a measured one still is', () => {
  const inn = rec({ opacity: [0, 1], duration: 0.6 });
  const coarse = rec({ opacity: [1, 0], delay: 2, duration: 0.075, step: 0.075 });
  assert.deepEqual(exitLength([inn, coarse]), []);
  const fine = rec({ opacity: [1, 0], delay: 2, duration: 0.3, step: 0.075 });
  assert.deepEqual(exitLength([inn, fine]), []);
  const slow = rec({ opacity: [1, 0], delay: 2, duration: 0.75, step: 0.075 });
  assert.equal(exitLength([inn, slow]).length, 1);
});

test('mergeRecords: sampled records get targets of their own, so an entrance never pairs with another element exit', () => {
  const animated = [rec({ target: 0, opacity: [0, 1], duration: 0.6 }), rec({ target: 1, opacity: [0, 1], duration: 0.6 })];
  const sampled = [rec({ target: 0, opacity: [1, 0], delay: 2, duration: 0.9, step: 0.05 })];
  const merged = mergeRecords(animated, sampled);
  assert.deepEqual(merged.map((r) => r.target), [0, 1, 2]);
  assert.deepEqual(exitLength(merged), []);
});
