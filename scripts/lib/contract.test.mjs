// scripts/lib/contract.test.mjs: the per-beat continuous-object contract chains, and a broken handoff
// is refused with BOTH values named.
//   node scripts/lib/contract.test.mjs
import assert from 'node:assert/strict';
import { parseEdge, chainErrors, edges } from './contract.mjs';

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

console.log('✓ contract.test.mjs: parseEdge, a clean chain, and a broken handoff (named, both sides) all behave');
