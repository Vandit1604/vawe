import assert from 'node:assert/strict';
import { expandRecipes } from './expand.mjs';

function scene(overrides = {}) {
  return {
    module: 'scene', duration: 4.2,
    recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline', ground: ['g1', 'g2'] }],
    layers: [
      { type: 'image', id: 'g1', start: 0, duration: 2.05, opacity: 0.7, modifiers: [{ plane: -2000 }] },
      { type: 'image', id: 'g2', start: 1.55, duration: 2.65, opacity: 0.32, modifiers: [{ plane: -2000 }] },
      { type: 'html', id: 'window', start: 0, duration: 1.95, motion: [{ t: 1.0, rotX: 7, rotY: -7 }] },
      { type: 'text', id: 'tagline', start: 1.8, duration: 2.18 },
    ],
    ...overrides,
  };
}

// A scene with no recipes[] passes through unchanged.
{
  const s = { module: 'scene', layers: [{ type: 'text', id: 'a' }] };
  assert.equal(expandRecipes(s), s);
}

// Basic expansion: motion keys land on the named layers, `recipes` is gone, the source is untouched.
{
  const s = scene();
  const out = expandRecipes(s);
  assert.ok(!('recipes' in out));
  assert.ok('recipes' in s, 'expandRecipes must not mutate its input');
  const win = out.layers.find((l) => l.id === 'window');
  const tag = out.layers.find((l) => l.id === 'tagline');
  const g1 = out.layers.find((l) => l.id === 'g1');
  const g2 = out.layers.find((l) => l.id === 'g2');
  assert.equal(win.motion.at(-1).x, -2500);
  assert.equal(win.motion.at(-1).ease, 'easeInCubic');
  assert.equal(win.motion.at(-2).x, 60);
  assert.equal(tag.start, 1.9 + 0.12);
  assert.equal(tag.motion[0].x, 2300);
  assert.equal(tag.motion[1].x, 0);
  assert.ok(g1.motion.some((k) => k.opacity === 0));
  assert.ok(g2.motion.some((k) => k.opacity === 0.32));
}

// axis override reads the y-axis measured defaults.
{
  const s = scene({ recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline', params: { axis: 'y' } }] });
  const out = expandRecipes(s);
  const win = out.layers.find((l) => l.id === 'window');
  assert.equal(win.motion.at(-1).y, -1400);
}

// unknown recipe name
assert.throws(() => expandRecipes(scene({ recipes: [{ recipe: 'nope', at: 1, out: 'window', in: 'tagline' }] })), /no recipe "nope"/);

// unknown layer id
assert.throws(() => expandRecipes(scene({ recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'ghost', in: 'tagline' }] })), /no layer id "ghost"/);

// missing slot
assert.throws(() => expandRecipes(scene({ recipes: [{ recipe: 'flow-seam', out: 'window', in: 'tagline' }] })), /missing slot "at"/);

// param outside its enum
assert.throws(() => expandRecipes(scene({ recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline', params: { axis: 'z' } }] })), /must be one of x, y/);

// out layer already keys the seam property inside the window: refused, never substituted
{
  const s = scene();
  s.layers.find((l) => l.id === 'window').motion.push({ t: 1.6, x: -100 });
  assert.throws(() => expandRecipes(s), /already has "x" keys/);
}

// depth collision: out layer keys rotX/rotY, ground has no `plane` modifier
{
  const s = scene();
  s.layers.find((l) => l.id === 'g1').modifiers = [];
  assert.throws(() => expandRecipes(s), /sits at z=0/);
}

console.log('ok - recipes/expand: keys and windows written on the named layers, every refusal named');
