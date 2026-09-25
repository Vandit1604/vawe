// core/theme/tokens.test.mjs: alias chains, cycle refusal, unknown-path refusal, type mismatch
// refusal, OKLCH normalisation. node core/theme/tokens.test.mjs
import assert from 'node:assert/strict';
import { resolveTokens, flattenTokens } from './tokens.js';
import { parseColor, colorAlpha } from '../color/engine.js';

// ---- a plain colour token resolves and normalises ----
{
  const { values, errors } = resolveTokens({ c: { night: { $type: 'color', $value: '#080d16' } } }, { parseColor });
  assert.equal(values.get('c.night'), '#080d16');
  assert.deepEqual(errors, []);
}

// ---- an alias chain resolves through more than one hop ----
{
  const tree = {
    a: { $type: 'color', $value: '#ff0000' },
    b: { $type: 'color', $value: '{a}' },
    c: { $type: 'color', $value: '{b}' },
  };
  const { values, errors } = resolveTokens(tree, { parseColor });
  assert.equal(values.get('c'), '#ff0000', 'a chain a<-b<-c resolves to the root colour');
  assert.deepEqual(errors, []);
}

// ---- a cycle is refused, not infinitely recursed ----
{
  const tree = { a: { $type: 'color', $value: '{b}' }, b: { $type: 'color', $value: '{a}' } };
  const { errors } = resolveTokens(tree, { parseColor });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /token cycle/);
}

// ---- an unknown alias path is refused ----
{
  const tree = { a: { $type: 'color', $value: '{nowhere}' } };
  const { errors } = resolveTokens(tree, { parseColor });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not exist/);
}

// ---- a type mismatch is refused (a `number` token that resolves to a string) ----
{
  const tree = { n: { $type: 'number', $value: 'not-a-number' } };
  const { errors } = resolveTokens(tree, { parseColor });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must resolve to a number/);
}

// ---- a colour that fails to parse (any grammar) is refused, not silently kept as a string ----
{
  const tree = { c: { $type: 'color', $value: 'not-a-colour' } };
  const { errors } = resolveTokens(tree, { parseColor });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is not a colour/);
}

// ---- OKLCH normalises to a canonical hex string parseColor already understands ----
{
  const tree = { c: { $type: 'color', $value: 'oklch(0.7 0.15 250)' } };
  const { values, errors } = resolveTokens(tree, { parseColor });
  assert.deepEqual(errors, []);
  assert.match(values.get('c'), /^#[0-9a-f]{6}$/, 'an OKLCH token resolves to a plain #rrggbb string');
  assert.ok(parseColor(values.get('c')), 'the normalised value parses through the engine\'s own colour grammar');
}

// ---- a gradient token resolves every stop, alias or literal, the same way a colour does ----
{
  const tree = {
    a: { $type: 'color', $value: '#111111' },
    g: { $type: 'gradient', $value: ['{a}', 'oklch(0.9 0.02 90)', '#000000'] },
  };
  const { values, errors } = resolveTokens(tree, { parseColor });
  assert.deepEqual(errors, []);
  const g = values.get('g');
  assert.equal(g.length, 3);
  assert.equal(g[0], '#111111');
  assert.match(g[1], /^#[0-9a-f]{6}$/);
  assert.equal(g[2], '#000000');
}

// ---- a translucent colour keeps its alpha, not rounded to opaque ----
{
  const tree = { c: { $type: 'color', $value: 'rgba(37,99,235,0.10)' } };
  const { values, errors } = resolveTokens(tree, { parseColor, colorAlpha });
  assert.deepEqual(errors, []);
  assert.equal(values.get('c'), 'rgba(37,99,235,0.1)');
}

// ---- flattenTokens builds dotted paths for a nested group ----
{
  const flat = flattenTokens({ color: { brand: { signal: { $type: 'color', $value: '#ff0000' } } } });
  assert.ok(flat.has('color.brand.signal'));
}

console.log('tokens.test.mjs: ok');

// ---- a node with only one of $type/$value is reported, not dropped ----
{
  const { values, errors } = resolveTokens({ c: { broken: { $type: 'color' }, half: { $value: '#fff' } } }, {});
  assert.equal(values.size, 0);
  assert.deepEqual(errors, ['token "c.broken" needs both $type and $value', 'token "c.half" needs both $type and $value']);
}
