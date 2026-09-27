// tests/engine/produce.test.mjs: the runnable self-check for core/engine/produce.js's FILL-ONLY
// contract. The engine may fill a value the author left blank (a text size role, the default bg/finish,
// an authored cameraMove's real keyframes) but must never add structure the author did not write: no
// invented cut, no sceneUnits switch, no wind-up on an entrance that named none. This file used to also
// cover injectCuts (an inferred-cut default) and applyAnticipateDefault (an entrance wind-up default);
// both are retired (the owner's rule: fill blanks, never add structure) and removed from produce.js, so
// their tests are gone too, not adapted.
//   node tests/engine/produce.test.mjs
import assert from 'node:assert/strict';
import { produceBaseline, resolveTextSize, bakeTextSizeRoles, bakeCameraMove, applyBgDefault } from '../../core/engine/produce.js';

const look = { cuts: { default: 'fade', accent: 'cinematicZoom' }, scale: { hook: 92, headline: 64, body: 38, caption: 24 } };
const frame = { w: 1920, h: 1080 };

// ---- produceBaseline adds NOTHING to a scene with no boundary, no sceneUnits and no cameraMove: no
// inferred cut, no sceneUnits switch, no camera. The engine fills blanks; it does not add structure ----
{
  const data = {
    module: 'scene', duration: 10, bg: [{ preset: 'plain' }],
    layers: [{ type: 'text', track: 0, start: 0, duration: 3 }, { type: 'text', track: 1, start: 4, duration: 3 }],
  };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'no cut is invented for a film that declared none');
  assert.equal(data.sceneUnits, undefined, 'sceneUnits is never turned on by default');
  assert.equal(data.camera, undefined, 'no camera is invented for a film that declared none');
}

// ---- a film that already has a cut, or an explicit sceneUnits, is left byte-for-byte alone ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], cuts: [{ t: 4, style: 'none' }], sceneUnits: false, layers: [] };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts.length, 1, 'an authored cut is not added to');
  assert.equal(data.cuts[0].style, 'none', 'and not rewritten');
  assert.equal(data.sceneUnits, false, 'an authored sceneUnits survives untouched');
}

// ---- NO auto camera, and cameraMove sugar still becomes real camera keys on the one funnel ----
{
  const base = () => ({ module: 'scene', duration: 6, bg: [{ preset: 'plain' }], layers: [{ type: 'text', text: 'x' }] });
  const plain = produceBaseline(base(), {}, frame, look);
  assert.equal(plain.camera, undefined, 'a scene with no cameraMove gets no camera');

  const sugar = produceBaseline({ ...base(), cameraMove: { move: 'slowPush', dur: 4 } }, {}, frame, look);
  assert.equal(sugar.cameraMove, undefined, 'cameraMove sugar is consumed');
  assert.ok(Array.isArray(sugar.camera) && sugar.camera.length > 1, 'and baked to real camera keys');
}

// ---- resolveTextSize: a role resolves, a number passes through, an unknown role names the real ones ----
{
  assert.equal(resolveTextSize('headline', look.scale, 'size'), 64, 'a known role resolves to the theme number');
  assert.equal(resolveTextSize(48, look.scale, 'size'), 48, 'a number passes through untouched');
  assert.equal(resolveTextSize(null, look.scale, 'size'), null, 'no size at all stays absent (text.js\'s own 96 default applies later)');
  assert.throws(() => resolveTextSize('headine', look.scale, 'layer "x" size'),
    /headine.*Known roles: hook, headline, body, caption/s, 'an unknown role throws and names every real role');
}

// ---- bakeTextSizeRoles: lowers size roles across the WHOLE tree (group children included) before
// resolveCoords ever runs, and leaves an already-numeric size untouched ----
{
  const data = {
    module: 'scene',
    layers: [
      { type: 'text', id: 'a', size: 'hook' },
      { type: 'text', id: 'b', size: 40 },
      { type: 'group', children: [{ type: 'text', id: 'c', size: 'caption' }] },
    ],
  };
  bakeTextSizeRoles(data, look);
  assert.equal(data.layers[0].size, 92, 'a top-level role lowers to the theme number');
  assert.equal(data.layers[1].size, 40, 'an already-numeric size is untouched');
  assert.equal(data.layers[2].children[0].size, 24, 'a role inside a group is still a role');
}

// ---- a text/count layer that names NO size at all FILLS one by POSITION (first is the hook, second
// the headline, a rect/image/etc with no size is never touched) instead of falling through to
// text.js's flat 96px default. A fill, logged: it names a value, not structure ----
{
  const data = {
    module: 'scene',
    layers: [
      { type: 'text', id: 'headline' },
      { type: 'text', id: 'subline' },
      { type: 'count', id: 'stat' },
      { type: 'text', id: 'caption-ish' }, // 4th and beyond clamp to the last role
      { type: 'rect', id: 'r' },
    ],
  };
  bakeTextSizeRoles(data, look);
  assert.equal(data.layers[0].size, 92, 'the first sizeless text layer reads as the hook');
  assert.equal(data.layers[1].size, 64, 'the second reads as the headline');
  assert.equal(data.layers[2].size, 38, 'the third reads as body');
  assert.equal(data.layers[3].size, 24, 'a fourth clamps to the last role, caption, rather than throwing');
  assert.equal(data.layers[4].size, undefined, 'a non-text layer with no size is never auto-sized');
}

// ---- THE ORDERING ITSELF: a bottom-pinned, named-size layer must resolve to the safe bottom, not NaN.
// resolveCoords (core/engine/boot.js) reads `L.size` directly to estimate height for `pin:"bottom"`, so
// bakeTextSizeRoles has to run before it, exactly the order boot.js now calls them in. ----
{
  const { resolveCoords } = await import('../../core/engine/boot.js');
  const data = { module: 'scene', layers: [{ type: 'text', id: 'h', size: 'headline', pin: 'bottom', w: 800 }] };
  bakeTextSizeRoles(data, look);
  resolveCoords(data, 1920, 1080);
  assert.equal(data.layers[0].size, 64, 'the role lowered to the theme number before resolveCoords ran');
  assert.ok(Number.isFinite(data.layers[0].y), 'the bottom pin resolved to a real number, not NaN from a string size');
}

// ---- a travel "caret" station finds a typing text layer nested in a `layout:free` group at the
// group's STAGE position, not at the child's own offset inside it (findLayerById now sums every
// ancestor free-group's x/y on the walk down; core/engine/produce.js findLayerById) ----
{
  const travelSpec = () => ({ move: 'travel', start: 0, stations: [{ tx: 960, ty: 540 }, { caret: '#t1' }] });
  const flatSpec = travelSpec(), groupSpec = travelSpec();
  const flat = {
    module: 'scene', duration: 5, bg: [{ preset: 'plain' }], cameraMove: flatSpec,
    layers: [{ type: 'text', id: 't1', x: 150, y: 230, w: 300, text: 'hello', typing: true, start: 1.5 }],
  };
  const grouped = {
    module: 'scene', duration: 5, bg: [{ preset: 'plain' }], cameraMove: groupSpec,
    layers: [{ type: 'group', id: 'g1', x: 100, y: 200, layout: 'free', start: 0, duration: 5,
      children: [{ type: 'text', id: 't1', x: 50, y: 30, w: 300, text: 'hello', typing: true, start: 1.5 }] }],
  };
  bakeCameraMove(flat, { W: 1920, H: 1080 });
  bakeCameraMove(grouped, { W: 1920, H: 1080 });
  assert.deepEqual(groupSpec.stations, flatSpec.stations,
    'a caret station on a group child resolves to the same stage box as an equivalent flat layer');
}

// ---- applyBgDefault: a scene naming no `bg` (or an empty one) gets the theme's own animated backdrop
// sugar; an authored, non-empty `bg` is left completely untouched ----
{
  const bare = { module: 'scene', layers: [] };
  applyBgDefault(bare);
  assert.deepEqual(bare.bg, [{ use: 'theme' }], 'no bg key at all defaults to the theme\'s own backdrop');
  const empty = { module: 'scene', bg: [], layers: [] };
  applyBgDefault(empty);
  assert.deepEqual(empty.bg, [{ use: 'theme' }], 'an empty bg array is treated the same as no bg at all');
  const authored = { module: 'scene', bg: [{ preset: 'plain' }], layers: [] };
  applyBgDefault(authored);
  assert.deepEqual(authored.bg, [{ preset: 'plain' }], 'an authored bg is never touched');
}

// ---- resolveCoords: a lone top-level text layer naming no position at all centres itself on the
// frame's optical centre (anchorPoint:"center", OPTICAL_Y down), rather than the page's own flat
// (60, 240) corner default (films/scene/scene.js) ----
{
  const { resolveCoords } = await import('../../core/engine/boot.js');
  const data = { module: 'scene', layers: [{ type: 'text', id: 'solo', size: 92, text: 'Hello' }] };
  resolveCoords(data, 1920, 1080);
  const L = data.layers[0];
  assert.equal(L.anchorPoint, 'center', 'a lone text layer with no position gets a center anchor point');
  assert.ok(L.w > 0, 'it gets a real width to centre against');
  const hEst = L.size * 1.2;
  assert.equal(L.x, Math.round(1920 / 2 - L.w / 2), 'its box, not just its corner, is horizontally centred');
  assert.equal(L.y, Math.round(1080 * 0.46 - hEst / 2), 'its box is vertically centred on the optical centre, ~46% down');
}

// ---- the loneness check ignores synthetic `_finish` layers (core/engine/finish.js resolveFinishLayers
// runs BEFORE resolveCoords in boot.js's real pipeline, so a defaulted scene's `data.layers` already
// holds a bloom + vignette by the time resolveCoords sees it): a scene with one authored text layer
// plus two `_finish` layers still centres the text, not "3 top-level layers so do nothing" ----
{
  const { resolveCoords } = await import('../../core/engine/boot.js');
  const data = {
    module: 'scene',
    layers: [
      { type: 'text', id: 'solo', size: 92, text: 'Hello' },
      { type: 'adjust', _finish: true, w: 1920, h: 1080 },
      { type: 'rect', _finish: true, w: 1920, h: 1080 },
    ],
  };
  resolveCoords(data, 1920, 1080);
  assert.equal(data.layers[0].anchorPoint, 'center', 'the authored layer is still recognised as lone despite the finish layers');
}

// ---- a lone text layer that DOES name a position (or a pin, or an anchorPoint) keeps exactly what it
// authored: the default only fills a gap, it never overrides a real decision ----
{
  const { resolveCoords } = await import('../../core/engine/boot.js');
  const data = { module: 'scene', layers: [{ type: 'text', id: 'solo', size: 92, x: 10, y: 20 }] };
  resolveCoords(data, 1920, 1080);
  assert.equal(data.layers[0].x, 10);
  assert.equal(data.layers[0].y, 20);
  assert.equal(data.layers[0].anchorPoint, undefined, 'no anchorPoint is invented for an authored position');
}

console.log('produce.test.mjs: ok');
