import assert from 'node:assert/strict';
import { expandRecipes } from './expand.mjs';

function scene(overrides = {}) {
  return {
    module: 'scene', aspect: '16:9', duration: 4.2,
    recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline', ground: ['g1', 'g2'] }],
    layers: [
      { type: 'image', id: 'g1', start: 0, duration: 2.05, opacity: 0.7, modifiers: [{ plane: -2000 }] },
      { type: 'image', id: 'g2', start: 1.55, duration: 2.65, opacity: 0.32, modifiers: [{ plane: -2000 }] },
      { type: 'html', id: 'window', x: 150, y: 90, w: 1500, h: 900, start: 0, duration: 1.95, motion: [{ t: 1.0, rotX: 7, rotY: -7 }] },
      { type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 1.8, duration: 2.18 },
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
  assert.equal(win.motion.at(-1).x, -(150 + 1500 + 192));  // far edge clears the frame plus 10%
  assert.equal(win.motion.at(-1).ease, 'easeInCubic');
  assert.equal(win.motion.at(-2).x, 60);
  assert.equal(tag.start, 1.9 + 0.067);
  assert.equal(tag.motion[0].x, 1920 - 90);  // near edge starts on the frame edge
  assert.equal(tag.motion[1].x, 0);
  assert.ok(g1.motion.some((k) => k.opacity === 0));
  assert.ok(g2.motion.some((k) => k.opacity === 1), 'ground keys multiply the layer opacity, so they end at 1');
}

// axis override reads the y-axis measured defaults.
{
  const s = scene({ recipes: [{ recipe: 'flow-seam', at: 1.9, out: 'window', in: 'tagline', params: { axis: 'y' } }] });
  const out = expandRecipes(s);
  const win = out.layers.find((l) => l.id === 'window');
  assert.equal(win.motion.at(-1).y, -(90 + 900 + 108));
}

// a layer with no width cannot be told when it has left the frame
{
  const s = scene();
  delete s.layers.find((l) => l.id === 'window').w;
  assert.throws(() => expandRecipes(s), /states no w/);
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

// ---- window-dolly (kind "camera") ------------------------------------------------------------------

function cameraScene(overrides = {}) {
  return {
    module: 'scene', aspect: '16:9', duration: 4.54,
    recipes: [{ recipe: 'window-dolly', from: 0, to: 4.54, target: 'window' }],
    layers: [
      { type: 'html', id: 'window', x: 150, y: 90, w: 1500, h: 900, start: 0, duration: 4.54 },
    ],
    ...overrides,
  };
}

// basic expansion: one diveIn leg lands on cameraMove, aimed at the target's own box centre.
{
  const out = expandRecipes(cameraScene());
  assert.ok(!('recipes' in out));
  assert.ok(Array.isArray(out.cameraMove));
  const spec = out.cameraMove[0];
  assert.equal(spec.move, 'diveIn');
  assert.equal(spec.start, 0);
  assert.equal(spec.dur, 4.54);
  assert.equal(spec.tx, 150 + 1500 / 2);
  assert.equal(spec.ty, 90 + 900 / 2);
  assert.equal(spec.to, 1.3);          // the measured default
  assert.equal(spec.targetW, 1500);
  assert.equal(spec.targetH, 900);
}

// a second camera line appends a second leg rather than clobbering the first.
{
  const s = cameraScene({
    recipes: [
      { recipe: 'window-dolly', from: 0, to: 2, target: 'window' },
      { recipe: 'window-dolly', from: 2, to: 4.54, target: 'window', params: { zoomTo: 1.9 } },
    ],
  });
  const out = expandRecipes(s);
  assert.equal(out.cameraMove.length, 2);
  assert.equal(out.cameraMove[1].to, 1.9);
}

// "to" must land after "from"
assert.throws(() => expandRecipes(cameraScene({ recipes: [{ recipe: 'window-dolly', from: 2, to: 2, target: 'window' }] })), /must be after "from"/);

// unknown target layer
assert.throws(() => expandRecipes(cameraScene({ recipes: [{ recipe: 'window-dolly', from: 0, to: 1, target: 'ghost' }] })), /no layer id "ghost"/);

// ---- word-by-word (kind "enter") -------------------------------------------------------------------

function enterScene(overrides = {}) {
  return {
    module: 'scene', aspect: '16:9', duration: 6,
    recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline' }],
    layers: [
      { type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 0, duration: 1.46, text: 'MADERA understands your taste.' },
    ],
    ...overrides,
  };
}

// basic expansion: the layer's own split-text sugar, no hand-keyed motion.
{
  const out = expandRecipes(enterScene());
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.start, 4.58);
  assert.equal(tag.split, 'word');
  assert.equal(tag.preset, 'up');
  assert.equal(tag.each, 0.35);
  assert.equal(tag.stagger, 0.06);
  assert.ok(!tag.motion, 'a named split preset is used, never hand-keyed motion');
}

// a single colour routes through colorWave as its flash; more than one is refused, named.
{
  const out = expandRecipes(enterScene({ recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', colors: ['#111'] }] }));
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.preset, 'colorWave');
  assert.equal(tag.presetOpts.flash, '#111');
}
assert.throws(() => expandRecipes(enterScene({
  recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', colors: ['#111', '#c8a45c', '#3a7a4e', '#2f5aa8'] }],
})), /no core capability holds more than one/);

// a layer that already carries `split` is refused rather than overwritten
assert.throws(() => expandRecipes(enterScene({
  layers: [{ type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 0, duration: 1.46, split: 'char' }],
})), /already carries "split/);

// ---- flow-seam composes with word-by-word: no whole-layer slide once the "in" layer is split -------
{
  const s = {
    module: 'scene', aspect: '16:9', duration: 6.5,
    recipes: [
      { recipe: 'word-by-word', at: 4.607, layer: 'tagline' }, // at + gap of the seam below
      { recipe: 'flow-seam', at: 4.54, out: 'window', in: 'tagline' },
    ],
    layers: [
      { type: 'html', id: 'window', x: 150, y: 90, w: 1500, h: 900, start: 0, duration: 4.54 },
      { type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 0, duration: 1.46 },
    ],
  };
  const out = expandRecipes(s);
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.split, 'word');
  assert.equal(tag.start, 4.54 + 0.067);  // the seam's own gap wins the timing
  assert.ok(!tag.motion, 'the split track owns the arrival; no whole-layer slide is written on top');
}

// the same two lines written seam-first compose identically: kinds run in a fixed order
{
  const s = {
    module: 'scene', aspect: '16:9', duration: 6.5,
    recipes: [
      { recipe: 'flow-seam', at: 4.54, out: 'window', in: 'tagline' },
      { recipe: 'word-by-word', at: 4.607, layer: 'tagline' },
    ],
    layers: [
      { type: 'html', id: 'window', x: 150, y: 90, w: 1500, h: 900, start: 0, duration: 4.54 },
      { type: 'text', id: 'tagline', x: 90, y: 480, size: 92, start: 0, duration: 1.46 },
    ],
  };
  const tag = expandRecipes(s).layers.find((l) => l.id === 'tagline');
  assert.equal(tag.split, 'word');
  assert.ok(!tag.motion, 'seam written before word-by-word must still not slide the split layer');
}

console.log('ok - recipes/expand: keys and windows written on the named layers, every refusal named');
