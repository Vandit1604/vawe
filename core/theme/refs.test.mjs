// core/theme/refs.test.mjs: a scene reference to a real token resolves; a bad one is refused.
// node core/theme/refs.test.mjs
import assert from 'node:assert/strict';
import { resolveTokenRefs } from './refs.js';

const values = new Map([['color.signal', '#ff5a1f'], ['size.gap', 24]]);

// ---- a token reference anywhere in the tree resolves to its value ----
{
  const data = { layers: [{ type: 'rect', fill: '{color.signal}', gap: '{size.gap}' }] };
  const out = resolveTokenRefs(data, values);
  assert.equal(out.layers[0].fill, '#ff5a1f');
  assert.equal(out.layers[0].gap, 24);
}

// ---- a plain string that is not a reference passes through unchanged ----
{
  const data = { layers: [{ type: 'text', text: 'hello {world}, not a token' }] };
  const out = resolveTokenRefs(data, values);
  assert.equal(out.layers[0].text, 'hello {world}, not a token');
}

// ---- on-screen copy that happens to be wrapped in one pair of braces is NOT a token reference ----
// (the real bug this pattern exists to avoid: vawe-explainer.json ships this exact illustrative line)
{
  const data = { layers: [{ type: 'text', text: '{ "module": "scene", "layers": [ ... ] }' }] };
  const out = resolveTokenRefs(data, values);
  assert.equal(out.layers[0].text, '{ "module": "scene", "layers": [ ... ] }');
}

// ---- a bad scene reference is refused, not silently left as the literal string ----
{
  const data = { layers: [{ fill: '{color.nope}' }] };
  assert.throws(() => resolveTokenRefs(data, values), /does not exist/);
}

console.log('refs.test.mjs: ok');
