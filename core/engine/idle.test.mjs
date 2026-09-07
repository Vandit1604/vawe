// core/engine/idle.test.mjs: the runnable self-check that a layer with no authored idle is truly
// still, and that `idle: "breathe"`/"drift" still work when asked for. Pure-JS, no DOM.
//   node core/engine/idle.test.mjs
import assert from 'node:assert/strict';
import { idleAt, normalizeIdle, IDLE_IDENTITY } from './idle.js';

// ---- no spec, no motion: the caller's default path (nothing authored) ----
assert.equal(normalizeIdle(undefined), null, 'no idle authored: normalizeIdle returns null (the "off" value)');
assert.equal(normalizeIdle('none'), null, '"none" is the explicit spelling of the same off value');
assert.deepEqual(idleAt(undefined, 5), IDLE_IDENTITY, 'idleAt with nothing authored is the identity delta (no move)');

// ---- authored idle still works (the opt-in half of the same contract) ----
{
  const d = idleAt('breathe', 1.15);
  assert.notEqual(d.scale, 1, 'idle:"breathe" (authored) does move scale');
}
{
  const d = idleAt({ name: 'drift', amp: 20 }, 2.3);
  assert.ok(d.dx !== 0 || d.dy !== 0, 'idle:"drift" (authored) does move position');
}

console.log('✓ idle.test.mjs: no authored idle is truly still, and breathe/drift still work when asked for');
