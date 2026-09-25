import assert from 'node:assert/strict';
import { expandRecipes } from '../../recipes/expand.mjs';

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

// a single colour routes through colorWave as its flash.
{
  const out = expandRecipes(enterScene({ recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', colors: ['#111'] }] }));
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.preset, 'colorWave');
  assert.equal(tag.presetOpts.flash, '#111');
}

// two or more colours route through colorWave's `colors`, one per word, settling to the layer's own
// ink by default (madera: "each word landing in its own colour before the line settles to one ink").
{
  const out = expandRecipes(enterScene({
    recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', colors: ['#111', '#c8a45c', '#3a7a4e', '#2f5aa8'] }],
  }));
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.preset, 'colorWave');
  assert.deepEqual(tag.presetOpts.colors, ['#111', '#c8a45c', '#3a7a4e', '#2f5aa8']);
  assert.equal(tag.presetOpts.settle, 'var(--layer-ink, var(--ink))');
}

// `settle: null` keeps each word its own colour forever instead of settling to one ink.
{
  const out = expandRecipes(enterScene({
    recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', colors: ['#111', '#c8a45c'], settle: null }],
  }));
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.equal(tag.presetOpts.settle, undefined);
}

// exit: copied straight onto the layer's own `exit`, the word-by-word twin of the arrival.
{
  const out = expandRecipes(enterScene({
    recipes: [{ recipe: 'word-by-word', at: 4.58, layer: 'tagline', exit: { preset: 'down', at: 1.2, each: 0.3 } }],
  }));
  const tag = out.layers.find((l) => l.id === 'tagline');
  assert.deepEqual(tag.exit, { preset: 'down', at: 1.2, each: 0.3 });
}

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

// the real expansion path keeps a camera recipe's leg: expandScene must not drop cameraMove
{
  const { expandScene } = await import('../../core/engine/expand.js');
  const s = {
    module: 'scene', aspect: '16:9', duration: 4,
    recipes: [{ recipe: 'window-dolly', from: 0, to: 3, target: 'window' }],
    layers: [{ type: 'html', id: 'window', x: 460, y: 240, w: 1000, h: 600, start: 0, duration: 4 }],
  };
  const out = expandScene(structuredClone(s));
  assert.ok(Array.isArray(out.camera) && out.camera.length >= 2, 'a window-dolly recipe must reach data.camera through expandScene');
  assert.ok(out.camera.some((k) => k.s > 1), 'the dolly pushes in (some key has scale above 1)');
}

// ---- object-wipe (kind "seam", live lockstep sweep, no gap) ----------------------------------------

function wipeScene(overrides = {}) {
  return {
    module: 'scene', aspect: '16:9', duration: 3,
    recipes: [{ recipe: 'object-wipe', at: 0.5, out: 'pageA', in: 'pageB' }],
    layers: [
      { type: 'html', id: 'pageA', x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 1.5 },
      { type: 'html', id: 'pageB', x: 0, y: 0, w: 1920, h: 1080, start: 0.5, duration: 1.5 },
    ],
    ...overrides,
  };
}

// both layers travel the full canvas span in lockstep, arriving together with no gap.
{
  const out = expandRecipes(wipeScene());
  const a = out.layers.find((l) => l.id === 'pageA');
  const b = out.layers.find((l) => l.id === 'pageB');
  assert.equal(a.motion[0].x, 0);
  assert.equal(a.motion[0].t, 0.5);
  assert.equal(a.motion[1].x, -1920);        // right-to-left default: out leaves toward -x
  assert.equal(a.motion[1].t, 0.5 + 0.5);    // measured default dur
  assert.equal(b.start, 0.5);
  assert.equal(b.motion[0].x, 1920);         // in starts fully off the entry edge
  assert.equal(b.motion[1].x, 0);
  assert.equal(b.motion[1].t, 0.5);          // dur, relative to its own (reset) start
}

// direction override flips the sign.
{
  const out = expandRecipes(wipeScene({
    recipes: [{ recipe: 'object-wipe', at: 0.5, out: 'pageA', in: 'pageB', params: { direction: 'left-to-right' } }],
  }));
  const a = out.layers.find((l) => l.id === 'pageA');
  const b = out.layers.find((l) => l.id === 'pageB');
  assert.equal(a.motion[1].x, 1920);
  assert.equal(b.motion[0].x, -1920);
}

// collision: an already-keyed x on either layer is refused, never overwritten.
{
  const s = wipeScene();
  s.layers.find((l) => l.id === 'pageA').motion = [{ t: 0.2, x: -50 }];
  assert.throws(() => expandRecipes(s), /already has "x" keys/);
}

// unknown layer id on either slot
assert.throws(() => expandRecipes(wipeScene({ recipes: [{ recipe: 'object-wipe', at: 0.5, out: 'ghost', in: 'pageB' }] })), /no layer id "ghost"/);
assert.throws(() => expandRecipes(wipeScene({ recipes: [{ recipe: 'object-wipe', at: 0.5, out: 'pageA', in: 'ghost' }] })), /no layer id "ghost"/);

// ---- colour-wipe (kind "seam", panel becomes the next ground, no fade) -----------------------------

function colourWipeScene(overrides = {}) {
  return {
    module: 'scene', aspect: '16:9', duration: 3,
    recipes: [{ recipe: 'colour-wipe', at: 1.0, shape: 'panel', out: 'oldContent' }],
    layers: [
      { type: 'shape', id: 'panel', x: 0, y: 0, w: 1920, h: 1080, opacity: 1, duration: 2 },
      { type: 'text', id: 'oldContent', x: 90, y: 480, size: 92, start: 0, duration: 1.5 },
    ],
    ...overrides,
  };
}

// the panel sweeps in and lands at 0, and STAYS (no fade key written on it).
{
  const out = expandRecipes(colourWipeScene());
  const panel = out.layers.find((l) => l.id === 'panel');
  assert.equal(panel.start, 1.0);
  assert.equal(panel.motion[0].x, -1920);    // left-to-right default: panel enters from the left
  assert.equal(panel.motion[1].x, 0);
  assert.equal(panel.motion[1].t, 0.067);    // measured default sweepDur
  assert.ok(!panel.motion.some((k) => k.opacity != null), 'the panel becomes the ground, it never fades');
}

// the optional `out` layer drops to opacity 0 once the panel has fully covered the frame.
{
  const out = expandRecipes(colourWipeScene());
  const old = out.layers.find((l) => l.id === 'oldContent');
  assert.ok(old.motion.some((k) => k.opacity === 0 && Math.abs(k.t - (1.0 + 0.067)) < 1e-9));
}

// `out` is optional: omitting it still expands the panel alone.
{
  const out = expandRecipes(colourWipeScene({ recipes: [{ recipe: 'colour-wipe', at: 1.0, shape: 'panel' }] }));
  const old = out.layers.find((l) => l.id === 'oldContent');
  assert.ok(!old.motion, 'no `out` slot means no opacity key is written');
}

// unknown shape layer id
assert.throws(() => expandRecipes(colourWipeScene({ recipes: [{ recipe: 'colour-wipe', at: 1.0, shape: 'ghost' }] })), /no layer id "ghost"/);

// missing required slot
assert.throws(() => expandRecipes(colourWipeScene({ recipes: [{ recipe: 'colour-wipe', shape: 'panel' }] })), /missing slot "at"/);

console.log('ok - recipes/expand: keys and windows written on the named layers, every refusal named');
