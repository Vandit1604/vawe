import test from 'node:test';
import assert from 'node:assert/strict';
// quality/gates/lib-test.mjs: fast pure-JS asserts for the motion primitives in core/motion/motion.js.
// No browser needed (the primitives are pure). Run: node quality/gates/lib-test.mjs  (make lib-test)
import { spring, springSettle, easeOutCubic,
  random, noise, hashSeed, resolveEasing, EASINGS, DEFAULT_MOTION,
  shake, trackingFor,
  anticipateEase, overshootEase, stepClock, icon } from '../../core/motion/motion.js';
import { srcUrl } from '../../core/engine/src-url.js';
import { layerTime, TIME_REMAP_NAMES, TIME_REMAP_BLURBS } from '../../core/timeline/time.js';
import { unitProgress, PRESETS, PRESET_BLURBS, wght } from '../../core/type/type.js';
import { PRESENTATIONS, cutStyle, soloCutStyle, SOLO_BLIND, CUT_BLURBS, cutWrites, TIMINGS } from '../../core/cuts/index.js';
import { PRESENTATIONS as CUT_PRESENTATIONS_AK } from '../../core/cuts/index.js';
import { dirVec as seamDirVec, featherFor as seamFeatherFor } from '../../core/timeline/seams.js';
import { killedBy, capabilitiesOf, checkCuts } from '../../core/fx/ancestor-kills.js';
import { ANIM_NAMES, ANIM_BLURBS, clipStyleAt, WARPABLE, entranceWarp } from '../../core/timeline/clips.js';
import { IDLE, IDLE_NAMES, IDLE_BLURBS, IDLE_IDENTITY, idleAt, idlePhase, idleTransform,
  normalizeIdle, settledGain } from '../../core/engine/idle.js';
import { SEAM_BLURBS } from '../../core/timeline/seams.js';
import { FX_TYPES, FX_BLURBS } from '../../core/fx/index.js';
import { GSAP_FX, GSAP_BLURBS, GSAP_REGISTRY, LOOP_FX, ONESHOT_FX } from '../../core/engine/gsap-effects.js';
import { BG_NAMES, BG_BLURBS, gradientFill } from '../../core/backgrounds/index.js';
import { GRADIENT_RECIPE_REGISTRY } from '../../core/backgrounds/gradient-recipes.js';
import { RESAMPLE_BLURBS } from '../../core/resample/effects.js';
import { CAP_STYLE_NAMES, CAPTION_BLURBS } from '../../core/type/captions.js';
import { COMPOSITION_NAMES, COMPOSITION_BLURBS } from '../../core/compositions/index.js';
import { PROFILES } from '../../harness/author/profiles.mjs';
import { createKit, GLYPH_PAINTERS, paintsOwnGlyphs, childExitDur } from '../../core/layers/util.js';
import { cameraAt, dollyZ, motionAt, resolveKeyedProps, poseBack, velocityAt, keyHandleErrors } from '../../core/timeline/sequence.js';
import { frame as squashFrame, build as squashBuild } from '../../core/fx/squash.js';
import { coverScale, isFullBleedPlane } from '../../core/tracks/overscan.js';
import { hasOwn3DMotion, computeGroup3D, applyGroup3DOpacityAdapt } from '../../core/tracks/group3d.js';
import { frame as lagFrame, build as lagBuild } from '../../core/fx/lag.js';
import { frame as matteFrame, build as matteBuild } from '../../core/fx/matte.js';
import { frame as uprightFrame, build as uprightBuild } from '../../core/fx/upright.js';
import { mergePan } from '../../core/timeline/pan-resolve.mjs';
import { patchMotion, upsertKey, layerSpan, matchBracket, applyOps } from '../../harness/author/patch-motion.mjs';
import { SHAPES as TRACK_SHAPES } from '../../harness/author/track.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MARGIN, MAX_ZOOM } from '../../core/layout/safe.js';
import { safeArea, DESTINATION_NAMES, nativeAspect, sceneDims, captionBand, frameOf, outOfFrame, settleWindow, reportBounds, boundsCheckOn } from '../../core/layout/safe.js';
import { resolveFilter, parseColor, FILTER_PRESETS, FILTER_REGISTRY, ensureFilterDef } from '../../core/looks/filters.js';
import fsMod from 'node:fs';
import { defineRegistry, registries, catalogued, checkBlurb, searchWords } from '../../core/registry/registry.js';
import { presentIn, existingAt, newSince, WINDOW_DAYS } from '../../harness/author/recency.mjs';
import { collect as arsenalCollect, coverageIn, CONFIDENT, snippet as arsenalSnippet, toks as arsenalToks, score as arsenalScore, SIDE_KINDS as arsenalSideKinds } from '../../harness/author/arsenal.mjs';
import { loadSchema, steps as atSteps, resolve as atResolve, allPaths as atPaths, childrenOf as atChildren, kindsOfEnum, fmtPath as atFmt } from '../../harness/author/schema-at.mjs';
import { token, literal, lit, resolveColor } from '../../core/color/color.js';
import { frame as varsFrame } from '../../core/tracks/vars.js';
import { junctionTable, resolveJunction, isJunctionRef, marksOf, bindWindowsToJunctions } from '../../core/timeline/junctions.js';
import { applyComposite } from '../../core/looks/index.js';
import { bakeCanvasFx } from '../../core/canvas/effects.js';
import { DIRS } from '../../core/cuts/index.js';
import { expandTheme } from '../../core/theme/roles.js';
import { colorAlpha } from '../../core/color/engine.js';
import { SPECTACLE_GAIN, attenuated, attenuatedKick, KNOBS, bindDials } from '../../core/registry/knobs.js';
import { dialsOf } from '../../core/registry/props.js';
import { resolveSpectacle } from '../../core/timeline/spectacle.js';
import { okDir as seamDir } from '../../core/timeline/seams.js';
import { produceBaseline } from '../../core/engine/produce.js';
import { resolveRelativeTimes } from '../../core/timeline/relative-time.js';
import { expandScene } from '../../core/engine/expand.js';
import { resolveTempo } from '../../core/engine/tempo.js';
import { easeErrors, bgErrors, durationWordErrors, cssErrors, authoredJunctionErrors } from '../../core/validate/validate.mjs';
import { raise as raiseJunction, deepEqual as junctionDeepEqual, migrateOne } from '../../harness/author/migrate-junctions.mjs';
import { splitWaiver, waiverCovers, isWaivedBy, groupWaivers, bareWaiverCoverage } from '../../harness/lib/waivers.mjs';
import { FEEL, DURATION, CAMERA_WORDS, resolveSeconds, resolveCameraMove, verifyVocab,
  COMPARATIVE, resolveComparative } from '../../core/registry/vocab.js';
import { BASE_ENTER } from '../../core/timeline/clips.js';
import { CUT_REGISTRY } from '../../core/cuts/index.js';
import { CUT_CUE } from '../../core/audio/cues.js';
import { ANIM_REGISTRY } from '../../core/timeline/clips.js';
import { PART_NAMES, PART_BLURBS, PARTS } from '../../core/motion/parts.js';
import { FALLOFFS, FALLOFF_NAMES, FALLOFF_BLURBS, DRIVES, DRIVE_NAMES, effectorAt, effectorStyle } from '../../core/motion/effector.js';
import { cutVelocityAdvice, layerSpeedAt, cameraSpeedAt } from '../../core/timeline/velocity-cut.js';
import { TRACK_TYPES, SLOTS } from '../../core/tracks/index.js';
import { parseCameraLine, cameraErrors, cameraWarnings, cameraContinuityErrors, resolvedCamera, nearestCameraMoves, parseTransitionIn, transitionInErrors, transitionInWarnings, resolvedTransitionIn, nearestTransitions, parseTransitionWhy, transitionFindings, isContinuousBoundary } from '../../harness/lib/contract.mjs';
import { RELATIONSHIPS, DEVICES } from '../../core/transitions/relationships.js';
import { TRANSITIONS as TRANSITIONS_CATALOG } from '../../core/transitions/catalog.js';
import { adoptionReport } from '../../quality/gates/stage.mjs';
import { bgPaletteFrom } from '../../core/backgrounds/index.js';
import { parseColorRGB, colorDistance } from '../../core/color/engine.js';
import { toRgb as lightfieldToRgb } from '../../core/lightfield/colour.js';
import { presetSpec, pulseOpacity, alphaMix, liftWhite, cycleHue } from '../../core/layers/glow.js';
import { gradientCss, splitFillCss } from '../../core/layers/text.js';
import { rollOffsets, displayNum } from '../../core/layers/count.js';
import { dollyZoom, slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase, travel, truck, cameraShake, punchIn, driftHold, followCursor, buildCameraMove, CAMERA_MOVE_NAMES } from '../../core/camera-moves/index.js';
import { bakeCameraMove } from '../../core/engine/produce.js';
import { capWords, capUnitWins, capShape, wordU, lineU, CAP_STYLES } from '../../core/type/captions.js';
import { BLOCKS, CATEGORY_OF, NOT_A_BLOCK } from '../../blocks/index.mjs';
import { SHADER_FX } from '../../core/stings/index.js';
import { AMBIENT_FX, AMBIENT_SHADERS } from '../../core/surfaces/shaders-ambient.js';
import { shaderAt as ambientShaderAt, validate as ambientValidate } from '../../core/surfaces/shader.js';
import { raymarchAt, validate as raymarchValidate } from '../../core/surfaces/raymarch.js';
import { resolveComposite, LOOKS, LOOK_NAMES, isLook, lookName, KNOB_ROUTES, liveKnobs } from '../../core/looks/index.js';
import { luma, BAYER4, bayerAt, cellAverage, hash01, canvasFxKey, CANVAS_FX_NAMES, resolveFxSpec, CANVAS_FX_PRESETS } from '../../core/canvas/effects.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { FAMILY_MODULES, NOT_A_FAMILY } from '../../blocks/index.mjs';
import { collect as collectArsenal } from '../../harness/author/arsenal.mjs';
import { CUES, renderCue, musicBed, normalize, biquad, osc, SR } from '../../core/audio/kit.mjs';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid, snapToBeat, downbeats } from '../../core/beats/detect.js';
import { beatSyncOf, beatGridPath, bindBeats, snapJoints, unrollGrid, beatPeriod, DEFAULT_MAX_SHIFT } from '../../core/beats/index.js';
import { lift } from '../../core/motion/motion.js';
import { opacityEnvelope, ANIM } from '../../core/timeline/clips.js';
import { FX_PARAMS, bgOptKeys, bgOverErrors, bgPreset, applyBgOver } from '../../core/backgrounds/index.js';
import { bandEnergies, sampleAt, BANDS } from '../../core/tracks/spectrum.js';
import { ransomGlyph, ransomSwatches, RANSOM_FACES } from '../../core/type/ransom.js';
import { boundaryMechanism, lowerScene, checkStingColor } from '../../core/transitions/lower.js';
import { checkLayer } from '../../core/layers/vocabulary.js';
import { ENERGY, okEnergy } from '../../core/transitions/energy.js';
import { SEAM_FX } from '../../core/timeline/seams.js';
import { SEAM_CUE } from '../../core/audio/cues.js';
import { resolveBridges } from '../../core/audio/bridges.js';
import { RESAMPLE_FX, BLUR_DIR } from '../../core/resample/effects.js';
import { RAYMARCH_FX } from '../../core/surfaces/raymarch-fx.js';
import { THREE_FX } from '../../core/surfaces/three-scenes.js';
import { pairActs, parsePairs, verdictOf, isPlaceholderSurface } from '../../quality/gates/content-check.mjs';
import { evenSamples } from '../../quality/gates/beats-of.mjs';
import { gradeable, tileBox, baseOf } from '../../quality/gates/tile.mjs';
import { classifyRegions } from '../../quality/gates/motion-floor.mjs';
import { sceneTiming } from '../../quality/gates/scene-timing.mjs';
import { exitEmphasis, entranceEmphasis } from '../../quality/gates/choreo.mjs';
import { deriveEngineTruth, findNumberClaims, findRetiredNames } from '../../harness/lib/claims-truth.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import { DIAL_CONTRACT_VIOLATIONS } from '../../core/registry/knobs.js';

// Snapshot taken BEFORE any test fixture runs: knobs.js's own `bindDials(KNOBS.kinetic, PRESETS)` ran
// at import, above, so this is exactly the real repo's violations, none of the synthetic ones the
// bindDials tests further down push onto the same array to test the collection mechanism itself.
const REAL_DIAL_VIOLATIONS = DIAL_CONTRACT_VIOLATIONS.slice();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let pass = 0, fail = 0;
const r2gain = (v) => Math.round(v * 1000) / 1000;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('✗ ' + name); } };

test('lib-test: layers', async () => {
// ---- AN ENTRANCE IS PART OF WHERE A LAYER IS (MISTAKES #461). films/scene/scene.js resolveBoxes
// folds the enter/exit transform into every box, so boxOf reports the pose on screen rather than the
// pose the layer is heading for. It does that by reading the composed transform through DOMMatrix,
// which means the fold is only as complete as the shapes the registry writes. These pin the two halves
// that would break it silently: the distances a box now moves by, and the claim that every entrance
// writes nothing but px translates and unitless scales. Add an anim that rotates, skews or translates
// in `%` and the fold would drop it with no error, so this fails instead.
ok('rise starts a full 48px below its box', (() => { const m = ANIM.rise(0).transform.match(/translateY\(([-\d.]+)px\)/); return m && Math.abs(parseFloat(m[1]) - 48) < 0.01; })());
ok('slide-left starts a full 60px to the left of its box', (() => { const m = ANIM['slide-left'](0).transform.match(/translate\((-?[\d.]+)px/); return m && Math.abs(parseFloat(m[1]) + 60) < 0.01; })());
ok('pop moves no centre, only scale', ANIM.pop(0).transform.startsWith('scale('));
ok('every entrance writes a transform a box can fold (px translate / unitless scale only)', (() => {
  const FOLDABLE = /^(none|((translate|translateX|translateY)\(\s*-?[\d.]+px\s*(,\s*-?[\d.]+px\s*)?\)|scale\(\s*-?[\d.]+\s*\))(\s+|$))+$/;
  for (const n of ANIM_NAMES) for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const tr = ANIM[n](t).transform;
    if (tr != null && !FOLDABLE.test(tr.trim())) return false;
  }
  return true;
})());


// ---- gradient + split: the fill each unit carries (core/layers/text.js) --------------------------
// `gradient` + `split` rendered NOTHING for as long as both existed. gradientFill paints the container
// and sets the text transparent; splitText then moves every glyph into a child span, and while `color`
// and `-webkit-text-fill-color` inherit, `background-image` does not. So the glyphs were transparent
// with no paint of their own, and a shipped film's headline was invisible (engine-doctrine/MISTAKES.md #417).
//
// ASSERT ON THE RESOLVED PAINT, NEVER ON THE BOX. That is the trap the bug set: a transparent glyph
// still measures as a full-size opaque box, so every DOM-geometry check in this repo passed a blank
// frame. Each unit must carry an IMAGE, the text clip, and an offset that keeps the ramp continuous.
{
  const STATIC = gradientCss({ from: '#ff0000', to: '#0000ff', angle: 90 }, 0);
  const box = { w: 1000, h: 200 };
  const at = (dx, dy = 0) => splitFillCss(STATIC, box, { dx, dy });
  const first = at(0), later = at(400);

  ok('split unit carries its own background-image', /gradient\(/.test(first.backgroundImage));
  ok('split unit clips the image to its glyphs',
    first.backgroundClip === 'text' && first.webkitBackgroundClip === 'text');
  ok('split unit keeps the glyph fill transparent so the image shows through',
    first.color === 'transparent' && first.webkitTextFillColor === 'transparent');
  // The container's own paint is NOT the unit's paint. If this ever equals the raw css again, the
  // per-unit pass has been reduced to a copy and the ramp restarts inside every word.
  ok('the unit image box is the CONTAINER, sized in px', first.backgroundSize === '1000.00px 200.00px');
  ok('a unit further along the line is offset back by its own position',
    first.backgroundPosition === '0.00px 0.00px' && later.backgroundPosition === '-400.00px 0.00px');
  ok('the offset is the unit position, so the sweep is continuous not per-word',
    parseFloat(at(250).backgroundPosition) - parseFloat(at(100).backgroundPosition) === -150);
  ok('a second line offsets vertically too', at(0, 120).backgroundPosition === '0.00px -120.00px');

  // `flow` and `shimmer` size the image past the box and slide it with a PERCENTAGE position, which
  // resolves against (box - image) and therefore means something different in a unit's smaller box.
  // Resolving it against the container first is what keeps a moving fill in step across the units.
  const FLOW = gradientCss({ from: '#ff0000', to: '#0000ff', animate: 'flow', speed: 0.5 }, 1);
  ok('flow keeps its 200% image, in container px', splitFillCss(FLOW, box, { dx: 0, dy: 0 }).backgroundSize === '2000.00px 200.00px');
  ok('flow resolves its percentage against the CONTAINER slack', (() => {
    const p = parseFloat(FLOW.backgroundPosition); // 50% at t=1, speed 0.5
    return approx(parseFloat(splitFillCss(FLOW, box, { dx: 0, dy: 0 }).backgroundPosition), (p / 100) * (box.w - 2000), 0.01);
  })());
  ok('every unit of a flow fill shares one moving field', (() => {
    const a = parseFloat(splitFillCss(FLOW, box, { dx: 0, dy: 0 }).backgroundPosition);
    const b = parseFloat(splitFillCss(FLOW, box, { dx: 300, dy: 0 }).backgroundPosition);
    return approx(a - b, 300, 0.01);
  })());
  // spin is a conic gradient at 100% 100%: no slack, so the unit offset is the only shift.
  const SPIN = gradientCss({ colors: ['#f00', '#0f0', '#00f'], animate: 'spin' }, 2);
  ok('spin units shift by position alone', splitFillCss(SPIN, box, { dx: 120, dy: 40 }).backgroundPosition === '-120.00px -40.00px');

  ok('splitFillCss is pure', JSON.stringify(at(77, 33)) === JSON.stringify(at(77, 33)));
}

// ---------- the adjustment layer: one grade over everything BENEATH ----------
// Its whole job happens in build(), against a DOM element, so what is testable without a browser is
// the vocabulary and the two refusals. That the grade actually LANDS on the layers under it, and only
// on those, is a rendered fact and was verified as one: a probe with text on track 1, an adjust on
// track 2 and text on track 3 blurs the first and the ground and leaves the third crisp, and the keyed
// `--adjust` reads 0.0000 → 0.5781 → 1.0000 across an easeOutCubic ramp.
{
  const { ADJUST_REGISTRY, ADJUST_BLURBS } = await import('../../core/layers/adjust.js');
  const { LAYER_TYPES } = await import('../../core/layers/index.js');
  // Asserted on SHAPE, not on a count. The first version pinned `length === 5` and broke the moment
  // `bloom` was added, which is a test failing for the one reason it should not: the thing it guards
  // growing. A registry that refuses an unknown name is the property worth holding.
  ok('the adjustment kinds are a registry, not a switch', ADJUST_REGISTRY.names.length >= 5
    && ADJUST_REGISTRY.has('blur') && ADJUST_REGISTRY.has('desaturate') && ADJUST_REGISTRY.has('bloom'));
  // BLOOM IS THE ONLY KIND THAT COMPOSITES BACK. Every other replaces what is beneath; a bloom that did
  // that would erase its own subject, which is exactly what the un-blended version did on screen.
  ok('bloom brightens as well as blurring', /brightness/.test(ADJUST_REGISTRY.pick('bloom')('1')));
  {
    const src = fs.readFileSync(new URL('../../core/layers/adjust.js', import.meta.url), 'utf8');
    ok('bloom screen-blends, and only bloom', /=== 'bloom'\) el\.style\.mixBlendMode = 'screen'/.test(src));
    // An authored w/h must reach the element. It did not: `h` was written only when ABSENT, so an
    // adjust layer given an explicit box measured 950x0, covered nothing, and rendered a frame
    // identical to one with no grade. Width arrives from the shared box helper; height never does.
    ok('an authored height is honoured', /el\.style\.height = L\.h == null \?/.test(src));
  }
  ok('every adjustment kind carries a blurb', ADJUST_REGISTRY.names.every((n) => typeof ADJUST_BLURBS[n] === 'string' && ADJUST_BLURBS[n].length > 10));
  // The engine's own answer to an unknown name: refuse and say what it knows, never resolve to a
  // default. A grade that silently did nothing would be indistinguishable from one that did.
  let threw = null; try { ADJUST_REGISTRY.pick('greyscale'); } catch (e) { threw = e.message; }
  ok('an unknown kind is refused by name', threw != null && /greyscale/.test(threw) && /desaturate/.test(threw));
  ok('`adjust` is a registered layer type', LAYER_TYPES.includes('adjust'));
  // EVERY KIND RAMPS FROM NOTHING IN THE SAME DIRECTION. `--adjust` runs 0..1 and carries the strength,
  // so a keyed grade always starts at no-grade whichever kind it is. A kind whose zero was the strong
  // end would key backwards and nothing would say so.
  const zeroed = ADJUST_REGISTRY.names.map((n) => ADJUST_REGISTRY.pick(n)('0'));
  ok('every kind is a no-op at --adjust 0', zeroed.every((css) => /\(calc\(/.test(css) && css.includes('0')));
}


// ---------- named depths: a plane you can reach without arithmetic ----------
// The modifier worked and 3 films of 134 used it, while 44 of the 47 films that move the camera had
// every layer at z = 0. `depth` is the same modifier behind a name resolved against the film's lens.
// That it PROJECTS rather than scales was verified by render, and the rendered numbers are pinned as
// the arithmetic here: far/back/near are drawn at 0.571 / 0.727 / 1.389 of their authored width and
// travel 228.6 / 290.9 / 555.5px against the picture plane's 400 under the same camera. Travel and
// magnification are the same ratio, which is what makes it a distance.
{
  const { DEPTH_PLANES, DEPTH_REGISTRY, DEPTH_BLURBS, depthZ, PLANE_KEYS } = await import('../../core/fx/plane.js');
  const DEPTH_NAMES = DEPTH_REGISTRY.names;
  const { bakeDepth } = await import('../../core/engine/produce.js');
  ok('every named depth carries a blurb', DEPTH_NAMES.every((n) => typeof DEPTH_BLURBS[n] === 'string'));
  // A FRACTION OF THE LENS, NEVER A PIXEL COUNT. A film that keys `p` changes what 600px behind the
  // picture plane means; it must not change what "back" means.
  ok('a name is a fraction of the lens', depthZ('back', 1600) === -600 && depthZ('back', 800) === -300);
  ok('a raw number passes through as px', depthZ(-900, 1600) === -900);
  ok('near and front are toward the eye, far and back away',
    depthZ('near', 1600) > 0 && depthZ('front', 1600) > 0 && depthZ('far', 1600) < 0 && depthZ('back', 1600) < 0);
  // The magnification each name lands on, which is the number an author actually has to decide about.
  const mag = (n, lens = 1600) => lens / (lens - depthZ(n, lens));
  ok('far/back/near magnify by 0.571 / 0.727 / 1.389, as rendered',
    approx(mag('far'), 0.5714, 1e-3) && approx(mag('back'), 0.7273, 1e-3) && approx(mag('near'), 1.3889, 1e-3));
  ok('no name reaches the lens itself', DEPTH_NAMES.every((n) => Math.abs(DEPTH_PLANES[n]) < 1));
  // An unknown name is refused with the whole menu AND each option's magnification, because making the
  // author compute lens/(lens - z) to find out what a name does is the barrier this exists to remove.
  let m = null; try { depthZ('mid', 1600); } catch (e) { m = e.message; }
  ok('an unknown depth is refused with the menu and its magnifications',
    m != null && /far/.test(m) && /0\.57x/.test(m) && /1\.39x/.test(m));
  // THE SUGAR BECOMES THE MODIFIER, or core/engine/boot.js throws. A field written and read by nothing is the
  // failure the whole bake path exists to make impossible (engine-doctrine/MISTAKES.md #444).
  const d = { layers: [{ type: 'rect', depth: 'back' }] };
  bakeDepth(d);
  ok('depth lowers to the plane modifier, holding its size', d.layers[0].depth === undefined
    && JSON.stringify(d.layers[0].modifiers) === JSON.stringify([{ plane: { z: -600, hold: true } }]));
  const keyed = { camera: [{ t: 0, p: 800 }], layers: [{ type: 'rect', depth: 'back' }] };
  bakeDepth(keyed);
  ok('the bake reads the lens off the camera', keyed.layers[0].modifiers[0].plane.z === -300);
  // A group is a flat parent, so a child standing behind it is projected by nothing. Refused where the
  // author's own word is, not one lowering later where the message would name `plane` instead.
  let g = null;
  try { bakeDepth({ layers: [{ type: 'group', children: [{ type: 'rect', depth: 'back' }] }] }); }
  catch (e) { g = e.message; }
  ok('depth on a group child is refused, naming the group', g != null && /group/i.test(g) && /depth/.test(g));

  // THE SCALE CORRECTION, which is what makes `depth` a multiplane rig rather than a raw distance.
  // Every AE tool applies it and this one printed the arithmetic in an error message instead, which is
  // what `depth` in 1 scene of 170 cost. The vocabulary holds; the raw primitive does not, because a
  // primitive that silently rescales what it was handed is a primitive that lies, and two shipped
  // films place 28 layers by the projected size they already get.
  const src = fs.readFileSync(new URL('../../core/fx/plane.js', import.meta.url), 'utf8');
  ok('hold is a plane key, so the validator and the schema can both see it',
    PLANE_KEYS.includes('hold') && PLANE_KEYS.includes('z'));
  ok('the correction is (lens - z) / lens, the same number the refusal quotes',
    /\(\(cam\.lens - z\) \/ cam\.lens\)/.test(src));
  // A depth keyed through `--plane-z` TRAVELS, so a build-time constant would hold the size the layer
  // has at the end of the travel and make the start wrong. The correction is CSS for that reason, and
  // it carries the same clamp as the translate so the two can never disagree about where the layer is.
  ok('a keyed depth corrects against the live z, with the translate\'s own clamp',
    /scale = drivesZ\(L\)/.test(src) && /calc\(\(\$\{cam\.lens\} - min\(/.test(src));
  ok('an unheld plane never writes the scale longhand', /if \(hold\) \{\n    el\.style\.scale/.test(src));
  // `kick` and `squash` write the same longhand and modifiers resolve last-writer-wins, so one of them
  // would silently win by array order. Input accepted and then ignored is the shape this repo ranks
  // first, so it is refused by name at build.
  const { build: planeBuild } = await import('../../core/fx/plane.js');
  let clash = null;
  try {
    planeBuild(null, null, { modifiers: [{ plane: { z: -600, hold: true } }, { kick: true }] },
      { z: -600, hold: true });
  } catch (e) { clash = e.message; }
  ok('hold beside kick is refused, naming both', clash != null && /hold/.test(clash) && /kick/.test(clash));
  let bad = null;
  try { planeBuild(null, null, {}, { z: -600, hold: 'yes' }); } catch (e) { bad = e.message; }
  ok('hold must be a boolean', bad != null && /hold must be true or false/.test(bad));
}


// ---------- a glow that can change ----------
// The intensity was baked into the gradient at build, so a glow was a constant for the layer's life.
// `pin-583145851797705243` measures its light swelling to fill the frame (mean luma down the frame
// 60·64·69·46·55·86·84) and collapsing once the subject settles (7·8·7·17·40·29·77): the glow is the
// picture, not a trim. Verified by render before this was written; what is pinned here is the CONTRACT
// that made it safe, because that is what a future edit will break.
{
  const src = fs.readFileSync(new URL('../../core/layers/glow.js', import.meta.url), 'utf8');
  ok('glow declares both live properties', /--glow-i/.test(src) && /--glow-r/.test(src));
  // THE WHOLE REASON THE LIBRARY DID NOT MOVE. `calc(72%)` computes to `72%`, so pixels never changed,
  // but the SERIALISED string did and eight shipped scenes reported a snapshot change for a rendering
  // that was byte-identical. A baseline that moves for a cosmetic reason is one nobody reads next time.
  ok('the calc form is gated on the layer declaring the var', /const drives = \(L, name\)/.test(src)
    && /drives\(L, GLOW_VARS\.i\)/.test(src) && /drives\(L, GLOW_VARS\.r\)/.test(src));
  ok('an undriven radius keeps the plain percentage', /: `\${pct}%`/.test(src));
  // Both default to 1 inside the calc, so a var that is declared but not yet reached still renders as
  // authored rather than as nothing.
  ok('both properties default to 1', (src.match(/var\(\$\{GLOW_VARS\.[ir]\}, 1\)/g) || []).length === 2);
}


// ---- svg `draw`: the write-on RESOLVES into the fill ----------------------------------------------
// The standard logo-reveal recipe uses the drawn stroke as an alpha matte for the real artwork, so the
// mark ends as itself. We shipped only the first half: `fill: none` was forced for a draw and frame()
// never restored it, so a logo could write on and could never end filled. These assert the second half
// arrives, that a mark WITHOUT a fill is untouched (the 7 draw layers in the library carry none), and
// that the two alphas do not cross at half each, which reads as dimming rather than as resolving.
{
  const mkSvgEl = (tag) => ({
    tag, style: {}, attrs: {}, childNodes: [], nodeType: 1, parentNode: null, dataset: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; },
    removeChild(n) { this.childNodes = this.childNodes.filter((c) => c !== n); return n; },
    // svg.js's draw reveal measures the path's real length (getTotalLength) instead of relying on the
    // browser's own pathLength=1 rescaling, which mismeasures arcs (engine-doctrine/MISTAKES.md). This mock has no
    // layout engine to measure a real `d`, so it returns a fixed stand-in; every assert below reads
    // fill/stroke opacity, never the dash length itself, so the exact number does not matter.
    getTotalLength() { return 100; },
  });
  const DOC = { createElement: mkSvgEl, createElementNS: (_ns, tag) => mkSvgEl(tag) };
  const svg = await import('../../core/layers/svg.js');

  const mount = (L) => {
    const prior = globalThis.document;
    globalThis.document = DOC;
    try { const el = mkSvgEl('div'); svg.build(null, el, L); return el; }
    finally { globalThis.document = prior; }
  };
  const at = (el, L, t) => {
    svg.frame(null, el, L, t);
    const p = el.__svgPath;
    return { fill: +(p.style.fillOpacity ?? 1), stroke: +(p.style.strokeOpacity ?? 1) };
  };

  const TRI = 'M50 5 L95 95 L5 95 Z';
  const filled = { type: 'svg', d: TRI, fill: 'var(--accent)', start: 0, draw: { dur: 1.2, fillDur: 0.5 } };
  const elF = mount(filled);
  ok('svg draw: the fill COLOUR survives the build. It used to be discarded by a forced `fill: none`',
    elF.__svgPath.getAttribute('fill') === 'var(--accent)' && elF.__drawFill === 'var(--accent)');
  ok('svg draw: the fill is invisible while the stroke is still drawing',
    at(elF, filled, 0.6).fill === 0 && at(elF, filled, 1.2).fill === 0);
  ok('svg draw: the mark ENDS AS THE FILLED LOGO, stroke gone. The whole point of the effect',
    (() => { const a = at(elF, filled, 1.7); return a.fill === 1 && a.stroke === 0; })());
  ok('svg draw: the fill resolve is monotonic and clamped over its window',
    (() => {
      let prev = -1;
      for (let t = 1.2; t <= 1.75; t += 0.025) {
        const f = at(elF, filled, t).fill;
        if (f < prev - 1e-9 || f < 0 || f > 1) return false;
        prev = f;
      }
      return true;
    })());
  ok('svg draw: the two alphas never sit at half each, which would read as the mark DIMMING',
    (() => {
      for (let t = 1.2; t <= 1.7; t += 0.01) { const a = at(elF, filled, t); if (a.fill + a.stroke < 0.9) return false; }
      return true;
    })());
  ok('svg draw: the frame stamp changes DURING the resolve, when `u` is pinned at 1 and the '
    + 'static-frame dedup would otherwise reuse a neighbour and drop the whole second half',
    (() => { at(elF, filled, 1.3); const a = elF.dataset.df; at(elF, filled, 1.55); return a !== elF.dataset.df; })());

  const outline = { type: 'svg', d: TRI, stroke: 'var(--accent)', start: 0, draw: { dur: 1.2 } };
  const elO = mount(outline);
  ok('svg draw with NO fill is exactly what it always was: an outline, no resolve, no opacity written',
    elO.__svgPath.getAttribute('fill') === 'none' && elO.__drawFill === null
    && at(elO, outline, 2).fill === 1 && elO.__svgPath.style.fillOpacity === undefined);

  ok('svg draw: `draw.fill: true` means the theme accent, the same spelling `fill: true` already had',
    mount({ type: 'svg', d: TRI, draw: { dur: 1, fill: true } }).__drawFill === 'var(--accent)');
  ok('svg draw: `draw.fill` OVERRIDES the layer fill, so a mark strokes in one colour and lands in another',
    mount({ type: 'svg', d: TRI, fill: '#111', draw: { dur: 1, fill: '#e11d48' } }).__drawFill === '#e11d48');

  // The ease was hardcoded easeOutCubic, so every write-on started at maximum speed. Absent still means
  // easeOutCubic; a WRONG name throws rather than substituting, which is core/motion/motion.js's contract.
  const eased = { type: 'svg', d: TRI, stroke: 'v', start: 0, draw: { dur: 1.2, ease: 'easeInOutCubic' } };
  const elE = mount(eased);
  ok('svg draw: `draw.ease` reaches the pixels. easeInOutCubic is slower off the mark than the old hardcoded easeOutCubic',
    (() => {
      svg.frame(null, elE, eased, 0.3); const a = +elE.dataset.dw;
      svg.frame(null, elO, outline, 0.3); return a < +elO.dataset.dw;
    })());
  ok('svg draw: an unknown `draw.ease` is REFUSED at build, never silently substituted',
    (() => {
      try { mount({ type: 'svg', d: TRI, draw: { ease: 'nope' } }); return false; }
      catch (e) { return /unknown easing/.test(e.message); }
    })());
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 55, `expected at least 55 assertions (the count this file was split with) to have run, saw ${pass}`);
});
