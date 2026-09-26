// recipes/expand.mjs: expandRecipes(scene) -> scene, the one recipe expander. Turns a scene's
// top-level `recipes: [{recipe, ...slots, params}]` into plain core capabilities on the layers (and
// the scene root) the author already named, then removes `recipes`. Pure: returns a new scene, never
// mutates the one it was handed, so a scene with no `recipes` passes through unchanged (same
// idempotence contract as core/engine/expand.js `expandScene`).
//
// EVERY KIND COMPILES TO A NAMED CORE CAPABILITY, never to hand-typed motion keys where one exists:
// `seam` writes plain `motion` keys because a seam's travel comes from the layers' own boxes and has
// no single named primitive; `camera` writes a `cameraMove` sugar entry (core/camera-moves); `enter`
// writes the text/html split-track sugar (`split`, `preset`, core/kinetic/presets.js). A recipe that
// cannot reach a named capability for part of what it does REFUSES that part and says why, rather than
// hand-keying it (recipes/README.md, AGENTS.md "the core's named capabilities").
//
// Called from expandScene itself (core/engine/expand.js), the one place `{type:"beat"}` sugar already
// expands, so a scene carrying `recipes[]` renders through every existing path (`./bin/vawe`, `make
// dev`, the Node gates, the Go server's expand-blocks.mjs shell-out) with no second expansion site.
import { pickRecipe } from './index.mjs';
import { sceneDims } from '../core/layout/safe.js';

const AXIS_PROP = { x: 'x', y: 'y' };

function findLayer(scene, id) {
  return (scene.layers || []).find((l) => l.id === id);
}

// paramOf: the author's override if given, else the recipe's measured default. An enum'd param
// (`axis`) is checked so a typo or an invented value is refused, never silently accepted.
function paramOf(recipeName, recipe, key, overrides) {
  const spec = recipe.params[key];
  if (!spec) throw new Error(`recipe "${recipeName}": no param "${key}"`);
  const v = (overrides && key in overrides) ? overrides[key] : spec.default;
  if (spec.enum && !spec.enum.includes(v))
    throw new Error(`recipe "${recipeName}": param "${key}" must be one of ${spec.enum.join(', ')}, got ${JSON.stringify(v)}`);
  return v;
}

const SEAM_PROPS = ['x', 'y', 'z', 'rotX', 'rotY'];

function expandSeamLine(scene, line, aspectKey) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };

  const recipe = pickRecipe(name);
  if (recipe.kind !== 'seam') bad(`expand.mjs only expands kind "seam" today, got "${recipe.kind}"`);
  for (const slot of ['at', 'out', 'in']) if (line[slot] == null) bad(`missing slot "${slot}"`);

  const outLayer = findLayer(scene, line.out);
  if (!outLayer) bad(`no layer id "${line.out}" (the "out" slot)`);
  const inLayer = findLayer(scene, line.in);
  if (!inLayer) bad(`no layer id "${line.in}" (the "in" slot)`);

  const axis = paramOf(name, recipe, 'axis', line.params);
  const gap = paramOf(name, recipe, 'gap', line.params);
  const exitDur = paramOf(name, recipe, 'exitDur', line.params);
  const enterDur = paramOf(name, recipe, 'enterDur', line.params);
  const groundFade = paramOf(name, recipe, 'groundFade', line.params);
  const driftPx = paramOf(name, recipe, 'driftPx', line.params)[axis];
  const prop = AXIS_PROP[axis];
  // Travel comes from the layers' own boxes and the canvas, not a distance measured off one film: the
  // outgoing layer rushes until its far edge has cleared the frame, the incoming one starts with its near
  // edge on the frame edge, so the ground is empty for `gap` whatever the layout.
  const [W, H] = sceneDims(scene, aspectKey);
  const span = axis === 'x' ? W : H;
  const extent = (L) => {
    const v = axis === 'x' ? L.w : (L.h ?? (L.type === 'text' && L.size ? L.size * 1.25 : null));
    if (v == null) bad(`"${L.id}" states no ${axis === 'x' ? 'w' : 'h'}, so the recipe cannot tell when it has left the frame`);
    return v;
  };
  // ponytail: a 10% margin covers a tilt and the blur trail; a rotated box's true extent needs projection.
  const exitPx = (outLayer[prop] ?? 0) + extent(outLayer) + 0.1 * span;
  const enterPx = span - (inLayer[prop] ?? 0);
  const at = line.at;
  const outStart = outLayer.start ?? 0;

  if (at - exitDur < outStart) bad(`"at" (${at}) minus exitDur (${exitDur}) lands before "${line.out}" even starts (${outStart})`);

  // Depth collision: every layer shares ONE CSS preserve-3d space once any layer keys z/rotX/rotY
  // (films/scene/scene.js ~1131), so a tilted seam layer cuts through a flat full-bleed ground at
  // z=0. Refuse and name the fix rather than move the ground into depth silently.
  const outKeysDepth = (outLayer.motion || []).some((k) => k.z != null || k.rotX != null || k.rotY != null);
  if (outKeysDepth && line.ground) {
    for (const gid of line.ground) {
      const g = findLayer(scene, gid);
      if (!g) continue;
      const plane = (g.modifiers || []).find((m) => 'plane' in m)?.plane;
      if (plane == null)
        bad(`ground layer "${gid}" sits at z=0 but "${line.out}" keys z/rotX/rotY; every layer shares one ` +
          `preserve-3d space once any layer tilts, so the flat ground gets cut through. Give "${gid}" a ` +
          `modifiers:[{plane:-2000}] (drawn oversize) to pull it behind`);
    }
  }

  // Collision: refuse rather than silently overwrite motion the author already keyed for this
  // property inside the seam window (from the anticipation drift onward).
  const collideFrom = at - exitDur;
  const already = new Set((outLayer.motion || [])
    .filter((k) => outStart + k.t >= collideFrom - 1e-6 && k[prop] != null)
    .map(() => prop));
  if (already.size) bad(`"${line.out}" already has "${prop}" keys inside the seam window (from ${collideFrom.toFixed(2)}s); the recipe would collide with them`);

  // OUT: an anticipation drift the wrong way, then an easeInCubic rush ending exactly at `at`.
  outLayer.motion = [...(outLayer.motion || []),
    { t: collideFrom - outStart, [prop]: driftPx, ease: 'easeInOutSine' },
    { t: at - outStart, [prop]: -exitPx, ease: 'easeInCubic' }];
  outLayer.duration = Math.max(outLayer.duration ?? 0, at - outStart);

  // IN: starts at + gap (the measured empty-ground window), arrives decelerating over enterDur.
  // Any motion the author already keyed on the "in" layer describes what happens AFTER arrival
  // (madera's tagline keeps drifting once it lands) and rides along unshifted, still relative to start.
  //
  // COMPOSES WITH word-by-word: a layer already carrying `split: "word"` (written by a word-by-word
  // recipe line elsewhere in the same `recipes[]` array, or authored by hand) arrives one word at a
  // time on its own split track, not as one block sliding in from the seam's axis. Writing the
  // whole-layer slide on top would move every word together AND stagger them individually, two
  // competing arrivals nothing asked for. So the slide is skipped: the split track owns the reveal,
  // and this recipe still owns the WHEN (`start`), which is the seam's real contribution here.
  inLayer.start = at + gap;
  if (inLayer.split !== 'word') {
    inLayer.motion = [
      { t: 0, [prop]: enterPx },
      { t: enterDur, [prop]: 0, ease: 'easeOutCubic' },
      ...(inLayer.motion || [])];
  }

  // GROUND: outgoing fades to 0, incoming fades in, both centred on `at` over groundFade. The keys run
  // 0 to 1 because a motion opacity multiplies the layer's own `opacity`, which stays the author's.
  if (line.ground) {
    const [outGid, inGid] = line.ground;
    const half = groundFade / 2;
    const og = outGid && findLayer(scene, outGid);
    if (og) {
      const gStart = og.start ?? 0;
      og.motion = [...(og.motion || []),
        { t: (at - half) - gStart, opacity: 1 },
        { t: (at + half) - gStart, opacity: 0, ease: 'easeInOutCubic' }];
    }
    const ig = inGid && findLayer(scene, inGid);
    if (ig) {
      const gStart = ig.start ?? 0;
      ig.motion = [...(ig.motion || []),
        { t: (at - half) - gStart, opacity: 0 },
        { t: (at + half) - gStart, opacity: 1, ease: 'easeInOutCubic' }];
    }
  }
}

// expandWipeLine: `object-wipe`. Both layers slide the SAME distance along the axis, in lockstep,
// starting together at `at`: the outgoing layer travels from 0 to off-canvas, the incoming layer
// travels from off-canvas to 0, so a hard edge sweeps the frame with both scenes live throughout.
// This is NOT flow-seam's mechanism (sequential exit, an empty-ground gap, then a separate arrival):
// arc-space-swiping's swipe never shows an empty frame, so there is no gap here at all.
function expandWipeLine(scene, line, aspectKey) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'seam') bad(`expand.mjs only expands kind "seam" here, got "${recipe.kind}"`);
  for (const slot of ['at', 'out', 'in']) if (line[slot] == null) bad(`missing slot "${slot}"`);
  const outLayer = findLayer(scene, line.out);
  if (!outLayer) bad(`no layer id "${line.out}" (the "out" slot)`);
  const inLayer = findLayer(scene, line.in);
  if (!inLayer) bad(`no layer id "${line.in}" (the "in" slot)`);

  const axis = paramOf(name, recipe, 'axis', line.params);
  const direction = paramOf(name, recipe, 'direction', line.params);
  const dur = paramOf(name, recipe, 'dur', line.params);
  const ease = paramOf(name, recipe, 'ease', line.params);
  const prop = AXIS_PROP[axis];
  const sign = (direction === 'left-to-right' || direction === 'top-to-bottom') ? 1 : -1;

  const [W, H] = sceneDims(scene, aspectKey);
  const span = axis === 'x' ? W : H;

  const at = line.at;
  const outStart = outLayer.start ?? 0;
  if (at < outStart) bad(`"at" (${at}) lands before "${line.out}" even starts (${outStart})`);

  if ((outLayer.motion || []).some((k) => k[prop] != null))
    bad(`"${line.out}" already has "${prop}" keys; the recipe would collide with them`);
  if ((inLayer.motion || []).some((k) => k[prop] != null))
    bad(`"${line.in}" already has "${prop}" keys; the recipe would collide with them`);

  // OUT: slides from its resting position toward the sweep direction and off-canvas, arriving
  // exactly at `at + dur`. "left-to-right" (sign +1) pushes it off the right edge; "right-to-left"
  // (sign -1, arc-space-swiping's own measured direction) pushes it off the left edge.
  outLayer.motion = [...(outLayer.motion || []),
    { t: at - outStart, [prop]: 0 },
    { t: (at + dur) - outStart, [prop]: sign * span, ease }];
  outLayer.duration = Math.max(outLayer.duration ?? 0, (at + dur) - outStart);

  // IN: starts at the same instant, positioned fully off-canvas on the edge the sweep travels FROM
  // (the opposite side to where the outgoing layer exits), and lands at 0 together with it: the hard
  // edge between the two never opens a gap.
  inLayer.start = at;
  inLayer.motion = [
    { t: 0, [prop]: -sign * span },
    { t: dur, [prop]: 0, ease },
    ...(inLayer.motion || [])];
}

// expandColourWipeLine: `colour-wipe`. One panel layer sweeps from off-canvas to fully covering the
// frame and then STAYS: it is the next ground, not a decoration removed once the cut lands (measured
// off make-it-move t=4.63, where the ground itself changes colour across the same 4-frame window the
// panel sweeps). An optional `out` layer is dropped to opacity 0 once covered, purely so it stops
// rendering; the panel already occludes it visually before that.
function expandColourWipeLine(scene, line, aspectKey) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'seam') bad(`expand.mjs only expands kind "seam" here, got "${recipe.kind}"`);
  for (const slot of ['at', 'shape']) if (line[slot] == null) bad(`missing slot "${slot}"`);
  const shape = findLayer(scene, line.shape);
  if (!shape) bad(`no layer id "${line.shape}" (the "shape" slot)`);

  const axis = paramOf(name, recipe, 'axis', line.params);
  const direction = paramOf(name, recipe, 'direction', line.params);
  const dur = paramOf(name, recipe, 'sweepDur', line.params);
  const ease = paramOf(name, recipe, 'ease', line.params);
  const prop = AXIS_PROP[axis];
  const sign = (direction === 'left-to-right' || direction === 'top-to-bottom') ? 1 : -1;

  const [W, H] = sceneDims(scene, aspectKey);
  const span = axis === 'x' ? W : H;

  if ((shape.motion || []).some((k) => k[prop] != null))
    bad(`"${line.shape}" already has "${prop}" keys; the recipe would collide with them`);

  const at = line.at;
  shape.start = at;
  // The panel enters from the edge the sweep travels FROM: "left-to-right" (sign +1, make-it-move's
  // own measured direction) starts it off-canvas on the left, sliding to 0 so the covering edge moves
  // left to right as it arrives.
  shape.motion = [
    { t: 0, [prop]: -sign * span },
    { t: dur, [prop]: 0, ease },
    ...(shape.motion || [])];

  if (line.out) {
    const outLayer = findLayer(scene, line.out);
    if (!outLayer) bad(`no layer id "${line.out}" (the "out" slot)`);
    const outStart = outLayer.start ?? 0;
    outLayer.motion = [...(outLayer.motion || []),
      { t: (at + dur) - outStart, opacity: 0 }];
  }
}

// boxCenter(L): the stage point a camera dollies toward. w/h fall back the same way the seam's own
// `extent()` does for a text layer with no authored `h`, so a camera line can target a text layer
// without the author restating its measured line-height.
function boxCenter(L) {
  const w = L.w;
  const h = L.h ?? (L.type === 'text' && L.size ? L.size * 1.25 : null);
  return { tx: (L.x ?? 0) + (w != null ? w / 2 : 0), ty: (L.y ?? 0) + (h != null ? h / 2 : 0), w, h };
}

// expandCameraLine: `{ recipe, from, to, target }` -> one `diveIn` leg appended to the scene's own
// `cameraMove` sugar (core/camera-moves/dive-in.js). diveIn is the named move that aims at a POINT and
// grows scale continuously toward it, which is exactly "a slow continuous dolly-in on a window or
// card stack": no hand camera keys are written, only a spec the engine's own sugar resolver already
// understands. `followLayer` (the other move that can aim at a layer) was NOT used: it holds zoom
// fixed for the whole shot and cannot ramp scale, so it cannot express a push at all.
function expandCameraLine(scene, line) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'camera') bad(`expand.mjs only expands kind "camera" here, got "${recipe.kind}"`);
  for (const slot of ['from', 'to', 'target']) if (line[slot] == null) bad(`missing slot "${slot}"`);
  const target = findLayer(scene, line.target);
  if (!target) bad(`no layer id "${line.target}" (the "target" slot)`);
  if (!(line.to > line.from)) bad(`"to" (${line.to}) must be after "from" (${line.from})`);

  const zoomTo = paramOf(name, recipe, 'zoomTo', line.params);
  const headroom = paramOf(name, recipe, 'headroom', line.params);
  const ease = paramOf(name, recipe, 'ease', line.params);

  const { tx, ty, w, h } = boxCenter(target);
  const spec = { move: 'diveIn', start: line.from, dur: line.to - line.from, tx, ty, to: zoomTo, headroom, ease };
  // targetW/targetH are only passed when known, so diveIn's own headroom refusal (it would push the
  // target past the frame) fires exactly where it already fires for a hand-written diveIn: nothing
  // about routing this through a recipe should silence that check.
  if (w != null) spec.targetW = w;
  if (h != null) spec.targetH = h;

  const existing = scene.cameraMove == null ? [] : (Array.isArray(scene.cameraMove) ? scene.cameraMove : [scene.cameraMove]);
  scene.cameraMove = [...existing, spec];
}

// expandEnterLine: `{ recipe, at, layer, colors?, exit? }` -> the layer's own kinetic split-text sugar
// (`split`, `preset`, `each`, `stagger`; core/kinetic/presets.js via core/tracks/units.js), never hand
// keys per word. `colors` routes through colorWave's own `colors` dial (core/kinetic/presets.js), which
// gives unit `i` its own arrival colour (`colors[i % n]`) rather than one shared accent: this used to be
// refused past one distinct value because colorWave could only sweep a single flash, and that gap is
// what this line existed to name (engine-doctrine/MISTAKES.md). A single colour still routes through `flash`,
// unchanged, so a one-colour line keeps behaving exactly as before.
function expandEnterLine(scene, line) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'enter') bad(`expand.mjs only expands kind "enter" here, got "${recipe.kind}"`);
  for (const slot of ['at', 'layer']) if (line[slot] == null) bad(`missing slot "${slot}"`);
  const L = findLayer(scene, line.layer);
  if (!L) bad(`no layer id "${line.layer}" (the "layer" slot)`);
  if (L.split) bad(`"${line.layer}" already carries "split: ${JSON.stringify(L.split)}"; the recipe would overwrite it`);
  const distinct = line.colors ? new Set(line.colors) : null;

  const preset = paramOf(name, recipe, 'preset', line.params);
  const each = paramOf(name, recipe, 'each', line.params);
  const stagger = paramOf(name, recipe, 'stagger', line.params);

  L.start = line.at;
  L.split = 'word';
  L.preset = preset;
  L.each = each;
  L.stagger = stagger;
  if (distinct && distinct.size === 1) {
    L.preset = 'colorWave';
    L.presetOpts = { ...(L.presetOpts || {}), flash: line.colors[0] };
  } else if (distinct && distinct.size > 1) {
    L.preset = 'colorWave';
    // The measured film settles the whole line to one ink once every word has landed (recipes.json
    // "note"), so this line states that default rather than leaving `colors` to its engine-level default
    // of staying scattered forever; an author who wants the scatter to persist passes `settle: null`.
    L.presetOpts = { ...(L.presetOpts || {}), colors: line.colors,
      settle: line.settle === null ? undefined : (line.settle || 'var(--layer-ink, var(--ink))') };
  }
  // exit: the word-by-word twin of the arrival, same shape core/tracks/units.js reads off the layer
  // directly (`preset`, `at` seconds from the layer's OWN start, `each`, `stagger`, `from`). Copied
  // through as-is: the recipe adds no vocabulary of its own here, it only names where the film measured
  // it (madera exits its tagline word by word before the next one enters).
  if (line.exit) L.exit = { ...line.exit };
}

// expandCursorLine: `hover-click` -> the cursor layer's OWN `snapTo`/`clicks`/`styleAt`, the props
// core/layers/cursor.js already exposes for exactly this. Every source measured for this recipe
// hand-typed the target's screen px instead of naming it; this writes the same three props an author
// could type by hand, aimed at a layer id rather than a guessed coordinate.
function expandCursorLine(scene, line) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'cursor') bad(`expand.mjs only expands kind "cursor" here, got "${recipe.kind}"`);
  for (const slot of ['at', 'cursor', 'target']) if (line[slot] == null) bad(`missing slot "${slot}"`);

  const cur = findLayer(scene, line.cursor);
  if (!cur) bad(`no layer id "${line.cursor}" (the "cursor" slot)`);
  if (cur.type !== 'cursor') bad(`"${line.cursor}" is a "${cur.type}" layer, not "cursor" (the "cursor" slot)`);
  if (!findLayer(scene, line.target)) bad(`no layer id "${line.target}" (the "target" slot)`);

  const edge = paramOf(name, recipe, 'edge', line.params);
  const approach = paramOf(name, recipe, 'approach', line.params);
  const clickDelay = paramOf(name, recipe, 'clickDelay', line.params);
  const style = paramOf(name, recipe, 'style', line.params);

  const at = line.at;
  cur.snapTo = [...(cur.snapTo || []), { t: at, id: line.target, edge, dur: approach }];
  cur.clicks = [...(cur.clicks || []), at + clickDelay];
  // Switched shape starts easing in alongside the approach, so the hand is already showing well before
  // the click lands rather than popping the instant the box is reached.
  cur.styleAt = [...(cur.styleAt || []), { t: Math.max(0, at - approach), style }];
}

// expandWarpLine: kind "warp", four recipes (orbit-path/line-reveal/scatter-burst/time-ramp), each
// writing ONE GSAP-backed layer field the engine already reads (films/scene/scene.js applyGsapHooks,
// core/timeline/time.js) and nothing else. Unlike seam/camera/enter, a warp recipe has no travel or
// box math to compute: it is a named, arsenal-searchable route to a primitive an author could already
// write by hand, so the whole expander is "pick the params, write the field".
function expandWarpLine(scene, line) {
  const name = line.recipe;
  const bad = (why) => { throw new Error(`recipe "${name}": ${why}`); };
  const recipe = pickRecipe(name);
  if (recipe.kind !== 'warp') bad(`expand.mjs only expands kind "warp" here, got "${recipe.kind}"`);
  for (const slot of ['at', 'layer']) if (line[slot] == null) bad(`missing slot "${slot}"`);
  const L = findLayer(scene, line.layer);
  if (!L) bad(`no layer id "${line.layer}" (the "layer" slot)`);
  L.start = line.at;

  if (name === 'orbit-path') {
    if (line.path == null) bad('missing slot "path"');
    if (L.motionPath) bad(`"${line.layer}" already has "motionPath"; the recipe would overwrite it`);
    L.motionPath = { path: line.path,
      align: paramOf(name, recipe, 'align', line.params),
      autoRotate: paramOf(name, recipe, 'autoRotate', line.params),
      curviness: paramOf(name, recipe, 'curviness', line.params),
      from: paramOf(name, recipe, 'from', line.params),
      to: paramOf(name, recipe, 'to', line.params),
      dur: paramOf(name, recipe, 'dur', line.params),
      ease: paramOf(name, recipe, 'ease', line.params) };
  } else if (name === 'line-reveal') {
    if (L.split) bad(`"${line.layer}" already carries "split: ${JSON.stringify(L.split)}"; splitText re-wraps the same text and the two splitters would fight`);
    if (L.splitText) bad(`"${line.layer}" already has "splitText"; the recipe would overwrite it`);
    L.splitText = { mask: paramOf(name, recipe, 'mask', line.params),
      dur: paramOf(name, recipe, 'dur', line.params),
      ease: paramOf(name, recipe, 'ease', line.params),
      stagger: paramOf(name, recipe, 'stagger', line.params) };
  } else if (name === 'scatter-burst') {
    if (!L.split) bad(`"${line.layer}" has no "split"; physics needs split units to scatter, a whole unsplit layer just flies as one`);
    if (L.physics) bad(`"${line.layer}" already has "physics"; the recipe would overwrite it`);
    L.physics = { velocity: paramOf(name, recipe, 'velocity', line.params),
      angle: paramOf(name, recipe, 'angle', line.params),
      gravity: paramOf(name, recipe, 'gravity', line.params),
      friction: paramOf(name, recipe, 'friction', line.params),
      spread: paramOf(name, recipe, 'spread', line.params),
      dur: paramOf(name, recipe, 'dur', line.params) };
  } else if (name === 'time-ramp') {
    if (L.timeRemap != null) bad(`"${line.layer}" already has "timeRemap"; the recipe would overwrite it`);
    if (L.timeWarp != null) bad(`"${line.layer}" already has "timeWarp"; timeRemap and timeWarp are refused together (core/timeline/time.js)`);
    L.timeRemap = paramOf(name, recipe, 'shape', line.params);
  } else bad(`expand.mjs has no warp expander for "${name}"`);
}

// aspectKey names the canvas a seam's travel (exitPx/enterPx, off sceneDims) should measure against.
// Omitted (default '') keeps sceneDims' own default, the scene's own declared aspect: core/engine/expand.js
// passes the render's actual aspect key through here, from internal/render/expand.go, so a flow-seam
// authored once travels the right distance on every canvas the film ships at, not only its own.
export function expandRecipes(scene, aspectKey = '') {
  if (!scene || typeof scene !== 'object' || !('recipes' in scene)) return scene;
  const { recipes, ...rest } = scene;
  const out = { ...rest, layers: (scene.layers || []).map((l) => ({ ...l })) };
  // Kinds run in a fixed order, not the order the author wrote them: a seam reads whether its "in" layer
  // is already split by an enter recipe, so an enter line must land first whatever its place in the list.
  const RANK = { enter: 0, camera: 1, seam: 2 };
  const ordered = (recipes || []).map((line, i) => ({ line, i, rank: RANK[pickRecipe(line.recipe).kind] ?? 3 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i).map((x) => x.line);
  for (const line of ordered) {
    const kind = pickRecipe(line.recipe).kind;
    // Three recipes share kind "seam" but compile through different mechanisms (flow-seam's
    // sequential exit-then-arrive with a ground gap vs. object-wipe/colour-wipe's lockstep sweep with
    // none), so the seam branch dispatches on the recipe's own name rather than its kind alone.
    if (kind === 'seam') {
      if (line.recipe === 'object-wipe') expandWipeLine(out, line, aspectKey);
      else if (line.recipe === 'colour-wipe') expandColourWipeLine(out, line, aspectKey);
      else expandSeamLine(out, line, aspectKey);
    }
    else if (kind === 'camera') expandCameraLine(out, line);
    else if (kind === 'enter') expandEnterLine(out, line);
    else if (kind === 'cursor') expandCursorLine(out, line);
    else if (kind === 'warp') expandWarpLine(out, line);
    else throw new Error(`recipe "${line.recipe}": expand.mjs does not yet expand kind "${kind}"`);
  }
  return out;
}
