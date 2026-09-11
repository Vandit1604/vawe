// core/engine/produce.test.mjs: the runnable self-check for produceBaseline's inferred-cut default
// (docs/MISTAKES.md, "101 of 181 films had no joint at all") AND the content-aware style it now picks
// at each inferred joint (core/timeline/junctions.js classifyJoint/chooseCutStyles). Pure-JS, no DOM.
//   node core/engine/produce.test.mjs
import assert from 'node:assert/strict';
import { produceBaseline, resolveTextSize, bakeTextSizeRoles, applyAnticipateDefault, bakeCameraMove } from './produce.js';
import { anticipateFromMotion } from '../motion/motion.js';

const look = { cuts: { default: 'fade', accent: 'cinematicZoom' }, scale: { hook: 92, headline: 64, body: 38, caption: 24 } };
const frame = { w: 1920, h: 1080 };
// track-bearing beat layers with a gap wide enough to read as a cut (inferCuts's own default: 1.2s)
const beatLayers = (starts) => starts.map((start, i) => ({ type: 'text', track: i, start, duration: 3 }));

// ---- A jointless film with a real gap gains an inferred cut, AND sceneUnits in the SAME pass. No
// relationship crosses this joint (no survivor, no overlap, no medium/backdrop change, no velocity),
// so the doctrine default fires: a hard cut, not a spent-on-everything 'fade' ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.ok(Array.isArray(data.cuts) && data.cuts.length === 1, 'a real gap infers one cut');
  assert.equal(data.cuts[0].style, 'none', 'no relationship crosses this joint: the doctrine default is a hard cut, not a habitual fade');
  assert.ok(data.cuts[0]._why, 'the chosen style keeps its reason, for a gate that later disagrees');
  assert.equal(data.sceneUnits, true, 'sceneUnits fires in the SAME pass so the fading cut is not a whole-frame one');
}

// ---- a layer whose window STRADDLES the inferred joint (still on screen before and after) forces the
// invisible cut: a destroying style would wipe out something the film needs kept whole ----
{
  const layers = [
    { type: 'text', track: 0, start: 0, duration: 6 }, // straddles the joint at t=4
    { type: 'text', track: 1, start: 4, duration: 3 },
  ];
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], layers };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts[0].style, 'none', 'a surviving layer rules out every destroying style: only the hard cut remains');
}

// ---- overlapping boxes across the joint rule out the theme's default (fade-family) cut; with no
// promoting signal the joint still lands on the hard cut, never the accent nobody earned ----
{
  const layers = [
    { type: 'text', track: 0, start: 0, duration: 4, x: 100, y: 100, w: 400, h: 100 },
    { type: 'text', track: 1, start: 4, duration: 3, x: 200, y: 120, w: 400, h: 100 }, // overlaps the outgoing box
  ];
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], layers };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts[0].style, 'none', 'overlap rules out the fade-family default; nothing promotes the accent, so the hard cut stands');
}

// ---- a layer still moving (a keyed `motion` track) as the joint arrives promotes the theme's default
// cut over silence: this is the arithmetic signal, not a taste call ----
{
  const layers = [
    { type: 'text', track: 0, start: 0, duration: 4, motion: [{ t: 3.9, x: 0 }, { t: 4, x: 400 }] },
    { type: 'text', track: 1, start: 4, duration: 3 },
  ];
  // NOTE: produceBaseline's own `choreographed` guard skips inferred cuts entirely once ANY layer
  // carries a real motion track, so this exercises chooseCutStyles directly, the pure function
  // produceBaseline calls once a film is eligible for inference at all.
  const { chooseCutStyles } = await import('../timeline/junctions.js');
  const { layerSpeedAt } = await import('../timeline/velocity-cut.js');
  const rows = chooseCutStyles([4], layers, { cuts: look.cuts, bg: null, layerSpeedAt });
  assert.equal(rows[0].family, 'default', 'a moving layer at the joint promotes the theme default over the hard cut');
  assert.equal(rows[0].style, 'fade');
}

// ---- sceneUnits:false, WRITTEN BY THE AUTHOR, skips injection: cadence-film.json's real shape ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], sceneUnits: false, layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'sceneUnits:false is not force-converted to a moving style; injection is skipped');
  assert.equal(data.sceneUnits, false, 'the author\'s explicit false survives untouched');
}

// ---- a choreographed scene (a motion track) is skipped by both guards, same as before this change ----
{
  const data = {
    module: 'scene', duration: 10, bg: [{ preset: 'plain' }],
    layers: [{ type: 'text', track: 0, start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 10 }] },
      { type: 'text', track: 1, start: 4, duration: 3 }],
  };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'a choreographed scene gets no inferred cuts');
  assert.equal(data.sceneUnits, undefined, 'and no sceneUnits either');
}

// ---- a film with no inferable boundary (a contact sheet: everything starts near 0) gets none ----
{
  const data = { module: 'scene', duration: 5, bg: [{ preset: 'plain' }], layers: beatLayers([0, 0.1, 0.2]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts, undefined, 'no gap over the threshold, no cuts: the true answer for a contact sheet');
}

// ---- a film that already has a cut is left alone (absent-only) ----
{
  const data = { module: 'scene', duration: 10, bg: [{ preset: 'plain' }], cuts: [{ t: 4, style: 'none' }], layers: beatLayers([0, 4]) };
  produceBaseline(data, {}, frame, look);
  assert.equal(data.cuts.length, 1, 'an authored cut is not added to');
  assert.equal(data.cuts[0].style, 'none', 'and not rewritten');
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
// resolveCoords ever runs, and leaves a plain number or an absent size untouched ----
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

// ---- THE ORDERING ITSELF: a bottom-pinned, named-size layer must resolve to the safe bottom, not NaN.
// resolveCoords (core/engine/boot.js) reads `L.size` directly to estimate height for `pin:"bottom"`, so
// bakeTextSizeRoles has to run before it, exactly the order boot.js now calls them in. ----
{
  const { resolveCoords } = await import('./boot.js');
  const data = { module: 'scene', layers: [{ type: 'text', id: 'h', size: 'headline', pin: 'bottom', w: 800 }] };
  bakeTextSizeRoles(data, look);
  resolveCoords(data, 1920, 1080);
  assert.equal(data.layers[0].size, 64, 'the role lowered to the theme number before resolveCoords ran');
  assert.ok(Number.isFinite(data.layers[0].y), 'the bottom pin resolved to a real number, not NaN from a string size');
}

// ---- applyAnticipateDefault: opt-out, not opt-in, on a WARPABLE entrance that arrives after the first
// wave, derived from the theme's bounce (not a constant) ----
{
  const data = {
    module: 'scene',
    layers: [
      { type: 'text', id: 'hook', start: 0, anim: 'rise' },       // first wave: excluded
      { type: 'text', id: 'headline', start: 2, anim: 'rise' },   // qualifies
      { type: 'text', id: 'still', start: 2 },                    // no anim at all: excluded, nothing moves that wasn't
      { type: 'count', id: 'n', start: 2, anim: 'pop' },           // informational: excluded
      { type: 'text', id: 'opted-out', start: 2, anim: 'rise', anticipate: false }, // author opt-out
      { type: 'text', id: 'authored', start: 2, anim: 'rise', anticipate: 0.33 },   // author's own value wins
    ],
  };
  applyAnticipateDefault(data, { motion: { bounce: 0 } });
  const byId = (id) => data.layers.find((L) => L.id === id);
  assert.equal(byId('hook').anticipate, undefined, 'the first wave is already being looked at: excluded');
  assert.equal(byId('headline').anticipate, anticipateFromMotion(0), 'a later WARPABLE entrance gets the derived default');
  assert.equal(byId('still').anticipate, undefined, 'a layer with no anim at all never starts moving');
  assert.equal(byId('n').anticipate, undefined, 'a count layer is informational, excluded by name');
  assert.equal('anticipate' in byId('opted-out'), false, 'anticipate:false is consumed as an opt-out, not left for scene.js to reject');
  assert.equal(byId('authored').anticipate, 0.33, 'an authored value wins outright, untouched');
}

// ---- applyAnticipateDefault: DERIVED, not constant, from the theme's own bounce ----
{
  const two = () => [{ type: 'text', id: 'first', start: 0, anim: 'rise' }, { type: 'text', id: 'a', start: 2, anim: 'rise' }];
  const calm = { module: 'scene', layers: two() };
  const bouncy = { module: 'scene', layers: two() };
  applyAnticipateDefault(calm, { motion: { bounce: 0 } });
  applyAnticipateDefault(bouncy, { motion: { bounce: 0.4 } });
  assert.ok(bouncy.layers[1].anticipate > calm.layers[1].anticipate, 'a bouncier theme winds up more than a calm one');
}

// ---- applyAnticipateDefault: split/cut layers never get the dial, matching scene.js's own refusal ----
{
  const data = {
    module: 'scene',
    layers: [
      { type: 'text', id: 's', start: 2, split: 'word' },
      { type: 'text', id: 'c', start: 2, cut: 'jitter' },
    ],
  };
  applyAnticipateDefault(data, { motion: { bounce: 0 } });
  assert.equal(data.layers[0].anticipate, undefined, 'a split layer\'s entrance is owned elsewhere');
  assert.equal(data.layers[1].anticipate, undefined, 'a cut layer\'s entrance is owned elsewhere');
}

// ---- produceBaseline wires applyAnticipateDefault in, and produced:false opts out of it too ----
{
  const data = {
    module: 'scene', duration: 5, bg: [{ preset: 'plain' }],
    layers: [{ type: 'text', id: 'a', start: 0 }, { type: 'text', id: 'b', start: 2, anim: 'rise' }],
  };
  produceBaseline(data, { motion: { bounce: 0 } }, frame, look);
  assert.equal(data.layers[1].anticipate, anticipateFromMotion(0), 'produceBaseline applies the anticipate default');
}
{
  const data = {
    module: 'scene', duration: 5, bg: [{ preset: 'plain' }], produced: false,
    layers: [{ type: 'text', id: 'a', start: 0 }, { type: 'text', id: 'b', start: 2, anim: 'rise' }],
  };
  produceBaseline(data, { motion: { bounce: 0 } }, frame, look);
  assert.equal(data.layers[1].anticipate, undefined, 'produced:false opts out of the injected baseline, anticipate included');
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

console.log('produce.test.mjs: ok');
