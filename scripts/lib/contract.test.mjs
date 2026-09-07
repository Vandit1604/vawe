// scripts/lib/contract.test.mjs: the per-beat continuous-object contract chains, and a broken handoff
// is refused with BOTH values named.
//   node scripts/lib/contract.test.mjs
import assert from 'node:assert/strict';
import { parseEdge, chainErrors, edges, parseMotionEntry, parseMotion, motionErrors, SPEED_BAND } from './contract.mjs';

// parseEdge: the happy path, quotes stripped (storyboard-parse.mjs's fieldIn does not strip them)
assert.deepEqual(parseEdge('"bottom-left@120x40"'), { placement: 'bottom-left', w: 120, h: 40 });
assert.equal(parseEdge(null), null);
assert.equal(parseEdge('<fill: <placement>@<w>x<h>>'), null, 'an unfilled scaffold marker is "no opinion", not a value');

// an unknown placement is refused with a near-word hint, never silently coerced
{
  const bad = parseEdge('bottom-lft@10x10');
  assert.ok(bad.error, 'a typo\'d placement must carry an error');
  assert.match(bad.error, /bottom-left/, 'the near-miss suggestion should name the real word');
}

// a malformed edge string is refused, not parsed into garbage numbers
assert.ok(parseEdge('nonsense').error);

// a film naming no continuous object at all: nothing to check, no false positive
assert.deepEqual(chainErrors([{ name: 'A' }, { name: 'B' }]), []);

// a clean chain: no errors
{
  const beats = [
    { name: 'A', object_in: 'top-left@10x10', object_out: 'bottom-left@10x10' },
    { name: 'B', object_in: 'bottom-left@10x10', object_out: 'bottom-right@10x10' },
  ];
  assert.deepEqual(chainErrors(beats), []);
  assert.equal(edges(beats).length, 2);
}

// A BROKEN HANDOFF IS REFUSED WITH BOTH VALUES NAMED. This is the contract's whole job: three scene
// agents each writing a beautiful, independently-correct fragment is still a slideshow if the object
// they hand off does not land in the same place, and the fix has to be actionable from the error alone.
{
  const beats = [
    { name: 'A', object_in: 'top-left@10x10', object_out: 'bottom-left@10x10' },
    { name: 'B', object_in: 'bottom-right@10x10', object_out: 'top-left@10x10' },
  ];
  const errs = chainErrors(beats);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /beat 1 \(A\)/);
  assert.match(errs[0], /beat 2 \(B\)/);
  assert.match(errs[0], /bottom-left@10x10/, 'beat A\'s object_out must be named');
  assert.match(errs[0], /bottom-right@10x10/, 'beat B\'s object_in must be named');
  assert.equal(edges(beats).length, 0, 'a broken chain yields no edges to build a track from');
}

// ── the motion plan: parseMotionEntry / parseMotion / motionErrors ─────────────────────────────────
{
  const e = parseMotionEntry('[data-part="headline"]@slide-left:energy');
  assert.deepEqual(e, { selector: '[data-part="headline"]', kind: 'slide-left', inBand: 'energy', outBand: 'energy' }, 'one band fills both in and out');
}
{
  const e = parseMotionEntry('.card@popIn:energy/cinematic');
  assert.deepEqual(e, { selector: '.card', kind: 'popIn', inBand: 'energy', outBand: 'cinematic' }, 'two bands: in then out');
}
{
  // an unknown part kind is refused with a near-word hint, exactly as an unknown placement is above
  const bad = parseMotionEntry('.card@slide-lft:energy');
  assert.ok(bad.error, 'a typo\'d part kind must carry an error');
  assert.match(bad.error, /slide-left/, 'the near-miss suggestion should name the real word');
}
{
  const bad = parseMotionEntry('.card@popIn:blazing');
  assert.ok(bad.error, 'an unknown speed band is refused');
}
assert.deepEqual(parseMotion(null), [], 'unset motion is no opinion, same convention as object_in/out');
assert.deepEqual(parseMotion('none'), [], '`none` is an explicit no-motion beat');
{
  const es = parseMotion('.a@fadeUp:energy; .b@popIn:gravity/cinematic');
  assert.equal(es.length, 2, '`;`-separated entries for more than one moving element in a beat');
  assert.equal(es[0].selector, '.a');
  assert.equal(es[1].outBand, 'cinematic');
}
{
  const beats = [{ name: 'A', motion: '.a@fadeUp:energy' }, { name: 'B', motion: '.b@nope:energy' }];
  const errs = motionErrors(beats);
  assert.equal(errs.length, 1, 'only the beat with a broken entry is reported');
  assert.match(errs[0], /beat 2 \(B\)/);
}
// every named band resolves to a real duration, so assemble.mjs never keys a `parts` entry with `undefined`
for (const band of Object.keys(SPEED_BAND)) assert.ok(SPEED_BAND[band] > 0, `${band} must be a positive duration`);

console.log('✓ contract.test.mjs: parseEdge, a clean chain, a broken handoff (named, both sides), and the motion plan all behave');
