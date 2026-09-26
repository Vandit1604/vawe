import test from 'node:test';
import assert from 'node:assert/strict';
// tests/tracks/lib-test.tracks.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/tracks/lib-test.tracks.test.mjs  (make test)
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
import { sceneTiming } from '../../quality/gates/scene-timing.mjs';
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

test('lib-test: tracks', async () => {
// ---- vars track: PER-CHANNEL timing (core/tracks/vars.js) ----
{
  const drive = (L, t) => { const out = {}; varsFrame({ kit: null, el: { style: { setProperty: (k, v) => { out[k] = +v; } } }, L, units: null, t, f: 0, start: 0 }); return out; };
  const two = { vars: { '--a': [0, 1], '--b': [0, 1] } };
  ok('vars: a scalar varsEase still drives every channel identically (back-compat)', (() => {
    const o = drive({ ...two, varsEase: 'linear', varsDur: 1 }, 0.5); return o['--a'] === 0.5 && o['--b'] === 0.5;
  })());
  ok('vars: a per-channel varsEase gives each channel its own curve', (() => {
    const o = drive({ ...two, varsEase: { '--a': 'linear', '--b': 'easeInCubic' }, varsDur: 1 }, 0.5);
    return o['--a'] === 0.5 && Math.abs(o['--b'] - 0.125) < 1e-6;
  })());
  ok('vars: a per-channel varsDur lets one channel finish before another', (() => {
    const o = drive({ ...two, varsEase: 'linear', varsDur: { '*': 1, '--b': 0.5 } }, 0.5);
    return o['--a'] === 0.5 && o['--b'] === 1;
  })());
  ok('vars: `*` is the map\'s own default', (() => {
    const o = drive({ ...two, varsEase: { '*': 'linear' }, varsDur: 1 }, 0.25);
    return o['--a'] === 0.25 && o['--b'] === 0.25;
  })());
  // The acceptance test from the plan: higgsfield's morph had FOUR hand-written curves in CSS calc().
  // Three are expressible exactly; `1 - 3.2p²` is `1→0` on easeInQuad over dur/√3.2, which is why
  // per-channel DURATION had to ship alongside per-channel easing.
  ok('vars: the label fade `1 - 3.2p^2` is exactly easeInQuad over dur/sqrt(3.2)', (() => {
    const D = 0.4, d = D / Math.sqrt(3.2);
    for (const t of [0.05, 0.1, 0.15, 0.2]) {
      const poly = 1 - 3.2 * (t / D) ** 2;
      const o = drive({ vars: { '--o': [1, 0] }, varsEase: 'easeInQuad', varsDur: d }, t);
      if (poly > 0 && Math.abs(o['--o'] - poly) > 1e-3) return false;
    }
    return true;
  })());
}


// ---- overscan: the full-bleed-plane cover scale (core/tracks/overscan.js) ----
{
  const canvas = { w: 1920, h: 1080 };
  const fullBox = { x: 0, y: 0, w: 1920, h: 1080 };
  const cardBox = { x: 400, y: 300, w: 800, h: 600 };
  ok('overscan: isFullBleedPlane is true for a box that covers the whole stage', isFullBleedPlane(fullBox, canvas));
  ok('overscan: isFullBleedPlane is false for a smaller card', !isFullBleedPlane(cardBox, canvas));
  ok('overscan: isFullBleedPlane is false for a box full on one axis only',
    !isFullBleedPlane({ x: 0, y: 0, w: 1920, h: 600 }, canvas));

  const basePose = (over) => ({
    box: fullBox, originPct: { ox: 50, oy: 50 }, scale: 1, rotZ: 0, rotX: 0, rotY: 0, z: 0,
    canvas, persp: 1600, cam: { x: 0, y: 0, z: 0, rx: 0, ry: 0, roll: 0 }, ...over,
  });
  const flat = coverScale(basePose({}));
  ok('overscan: a flat plane (no rotation, z=0) needs exactly 1x', flat === 1);

  const tilted = coverScale(basePose({ rotX: 13, rotY: -15 }));
  ok('overscan: a tilted full-bleed plane needs more than 1x', tilted > 1);

  const tiltedMore = coverScale(basePose({ rotX: 26, rotY: -30 }));
  ok('overscan: a larger tilt needs a larger cover scale', tiltedMore > tilted);

  const pushedBack = coverScale(basePose({ rotX: 13, rotY: -15, z: -260 }));
  ok('overscan: the same tilt pushed further behind the picture plane needs a larger scale',
    pushedBack > tilted);

  const withCamera = coverScale(basePose({ rotX: 13, rotY: -15, z: -260, cam: { x: 0, y: 0, z: 200, rx: 0, ry: 0, roll: 0 } }));
  ok('overscan: composes with a moving camera (a push-in dolly still resolves to a finite, sane scale)',
    Number.isFinite(withCamera) && withCamera >= 1 && withCamera < 64);

  // classification: a card that never covers the stage is simply not in scope, whatever it does.
  ok('overscan: classification excludes a non-full-bleed card even under a hard tilt',
    !isFullBleedPlane(cardBox, canvas));

  // determinism: same inputs, same answer, called twice, called out of order.
  const a1 = coverScale(basePose({ rotX: 13, rotY: -15, z: -260 }));
  const a2 = coverScale(basePose({ rotX: 13, rotY: -15, z: -260 }));
  ok('overscan: coverScale is a pure function of its pose (repeat call, same answer)', a1 === a2);
  const b = coverScale(basePose({ rotX: 5, rotY: -5 })); // unrelated call in between
  const a3 = coverScale(basePose({ rotX: 13, rotY: -15, z: -260 }));
  ok('overscan: coverScale carries no state between calls (order-independent)', a1 === a3 && b !== a1);
}

// group3d: a group never gets its own preserve-3d, so a child's own rotY/rotX/z would flatten onto
// the group's plane without this. Mock elements only need parentElement/style/dataset, plain objects
// stand in for real DOM nodes (core/tracks/group3d.js's functions never touch anything else).
{
  const mockEl = (parentElement = null) => ({ style: {}, dataset: {}, parentElement });

  ok('group3d: hasOwn3DMotion is false with no motion track', !hasOwn3DMotion({}));
  ok('group3d: hasOwn3DMotion is false for a flat (x/y/rot only) motion track',
    !hasOwn3DMotion({ motion: [{ t: 0, x: 10 }, { t: 1, rot: 5 }] }));
  ok('group3d: hasOwn3DMotion is true the moment a key states rotY', hasOwn3DMotion({ motion: [{ t: 0, rotY: 45 }] }));
  ok('group3d: hasOwn3DMotion is true for z', hasOwn3DMotion({ motion: [{ t: 0, z: -260 }] }));

  // flat group: no descendant keys 3D, so it is left alone (the terminal-plane case, KEYED-MOTION.md 5b).
  const flatGroupEl = mockEl();
  const flatChildEl = mockEl(flatGroupEl);
  const flatLayers = [
    { L: { type: 'group' }, el: flatGroupEl },
    { L: { type: 'text', motion: [{ t: 0, x: 5 }] }, el: flatChildEl },
  ];
  const flatResult = computeGroup3D(flatLayers);
  ok('group3d: a group with no 3D-keying descendant needs no preserve-3d', flatResult.need3D.size === 0);
  ok('group3d: a flat group has nothing to adapt', flatResult.adapt.length === 0);

  // the ticket's shape: films-ring (opacity-only) holding wall-left/wall-right (their own rotY/z).
  const ringEl = mockEl();
  const wallLeftEl = mockEl(ringEl);
  const wallRightEl = mockEl(ringEl);
  const ringLayers = [
    { L: { type: 'group', motion: [{ t: 0, opacity: 0 }, { t: 1, opacity: 1 }] }, el: ringEl },
    { L: { type: 'rect', motion: [{ t: 0, rotY: 45, z: -260 }] }, el: wallLeftEl },
    { L: { type: 'rect', motion: [{ t: 0, rotY: -45, z: -260 }] }, el: wallRightEl },
  ];
  const ringResult = computeGroup3D(ringLayers);
  ok('group3d: an ancestor group of a 3D-keying child needs preserve-3d', ringResult.need3D.has(ringEl));
  ok('group3d: exactly one group needed preserve-3d (the leaves themselves are not groups)',
    ringResult.need3D.size === 1);
  ok('group3d: the flattening group\'s direct children are both collected', ringResult.adapt.length === 1
    && ringResult.adapt[0].children.length === 2
    && ringResult.adapt[0].children.includes(wallLeftEl) && ringResult.adapt[0].children.includes(wallRightEl));

  // a nested group: outer -> inner (3D-holding) -> leaf (the actual 3D key). Both groups need it.
  const outerEl = mockEl();
  const innerEl = mockEl(outerEl);
  const leafEl = mockEl(innerEl);
  const nestedLayers = [
    { L: { type: 'group' }, el: outerEl },
    { L: { type: 'group' }, el: innerEl },
    { L: { type: 'rect', motion: [{ t: 0, rotX: 20 }] }, el: leafEl },
  ];
  const nestedResult = computeGroup3D(nestedLayers);
  ok('group3d: every group ancestor between a 3D leaf and the camera needs preserve-3d',
    nestedResult.need3D.has(outerEl) && nestedResult.need3D.has(innerEl));

  // applyGroup3DOpacityAdapt: the group's resolved opacity/filter (as motion.js would have written it)
  // moves onto its children, multiplying into whatever they already carry, and the group resets.
  const gEl = mockEl(); gEl.style.opacity = '0.4'; gEl.style.filter = 'blur(2px)'; gEl.id = 'g1';
  const c1 = mockEl(gEl); c1.style.opacity = '0.8';
  const c2 = mockEl(gEl); // no prior opacity: baseline 1
  const logged = new Set();
  applyGroup3DOpacityAdapt([{ el: gEl, children: [c1, c2] }], logged);
  ok('group3d push-down: the group itself is reset to opaque', gEl.style.opacity === '1');
  ok('group3d push-down: the group itself is reset unfiltered', gEl.style.filter === 'none');
  ok('group3d push-down: multiplies into a child\'s existing opacity (0.8 * 0.4)', c1.style.opacity === (0.8 * 0.4).toFixed(3));
  ok('group3d push-down: a child with no prior opacity gets exactly the group\'s (1 * 0.4)', c2.style.opacity === (1 * 0.4).toFixed(3));
  ok('group3d push-down: a filtered group appends its filter onto an unfiltered child', c2.style.filter === 'blur(2px)');
  ok('group3d push-down: logs the adaptation exactly once per group', logged.size === 1 && logged.has(gEl));

  // an already-opaque, unfiltered group (no adaptation needed) is left untouched and unlogged.
  const quietEl = mockEl(); quietEl.style.opacity = '1'; quietEl.style.filter = 'none';
  const quietChild = mockEl(quietEl); quietChild.style.opacity = '0.5';
  const quietLogged = new Set();
  applyGroup3DOpacityAdapt([{ el: quietEl, children: [quietChild] }], quietLogged);
  ok('group3d push-down: a group at rest (opacity 1, no filter) changes nothing', quietChild.style.opacity === '0.5' && quietLogged.size === 0);

  // determinism: same inputs, same result, repeat call, order-independent between separate groups.
  const detEl = mockEl(); detEl.style.opacity = '0.6';
  const detChild = mockEl(detEl);
  applyGroup3DOpacityAdapt([{ el: detEl, children: [detChild] }], new Set());
  const firstRun = detChild.style.opacity;
  const detEl2 = mockEl(); detEl2.style.opacity = '0.6';
  const detChild2 = mockEl(detEl2);
  applyGroup3DOpacityAdapt([{ el: detEl2, children: [detChild2] }], new Set());
  ok('group3d push-down: deterministic, same pose gives the same composed opacity every time', firstRun === detChild2.style.opacity);

  // REGRESSION (the whole-beat blur bug): a group's own blur decays 8px -> 0 across ten frames while
  // its child keeps a STATIC pose (no own blur/opacity key), the shape scene5's rack-focus beat took.
  // The child never gets a fresh unconditional write of its own to `filter`, so a naive push-down reads
  // back what IT pushed last frame and appends onto it again: a monotonically DECAYING blur rendered as
  // a monotonically GROWING, ever-thicker stack of blur() functions, heavy for the whole beat instead of
  // fading out. Each frame's composed blur must equal the group's OWN blur for that frame, nothing more.
  const decayEl = mockEl();
  const decayChild = mockEl(decayEl);
  const blurSteps = [8, 7, 6, 5, 4, 3, 2, 1, 0.5, 0];
  for (const b of blurSteps) {
    decayEl.style.opacity = '1';
    decayEl.style.filter = b > 0 ? `blur(${b.toFixed(2)}px)` : 'none';
    applyGroup3DOpacityAdapt([{ el: decayEl, children: [decayChild] }], new Set());
  }
  ok('group3d push-down: a decaying group blur composes to exactly this frame\'s value, never accumulates',
    decayChild.style.filter === 'none');
}

// RELATIVE TIME (core/timeline/relative-time.js): resolveRelativeTimes, and its place in
// core/engine/expand.js's expandScene, BEFORE core/engine/tempo.js's resolveTempo, so an offset
// authored in the film's real seconds scales like any other authored time instead of landing on top
// of an already-scaled target.
{
  const GRID = 1 / 60;
  const snap = (v) => Math.round(v / GRID) * GRID;

  // a layer start named relative to another layer's end, plus an offset.
  const scene1 = { layers: [
    { id: 'hero', type: 'text', start: 1, duration: 2 },
    { id: 'b', type: 'text', start: 'hero.end+0.5' },
  ] };
  resolveRelativeTimes(scene1);
  ok('relative-time: layer start resolves off another layer\'s end plus an offset',
    typeof scene1.layers[1].start === 'number' && approx(scene1.layers[1].start, 3.5));

  // a bare id (no `.end`) means that layer's own start.
  const scene2 = { layers: [
    { id: 'a', type: 'text', start: 2 },
    { id: 'c', type: 'text', start: 'a-0.5' },
  ] };
  resolveRelativeTimes(scene2);
  ok('relative-time: a bare id names that layer\'s start', approx(scene2.layers[1].start, 1.5));

  // a cameraMove start written relative to a layer's end (array-of-specs form and single-spec form).
  const scene3 = { layers: [{ id: 'reveal', type: 'text', start: 1, duration: 1 }],
    cameraMove: [{ move: 'slowPush', start: 'reveal.end+0.2', dur: 2, from: 1, to: 1.1 }] };
  resolveRelativeTimes(scene3);
  ok('relative-time: cameraMove[].start resolves off a layer\'s end', approx(scene3.cameraMove[0].start, 2.2));

  const scene3b = { layers: [{ id: 'reveal', type: 'text', start: 1, duration: 1 }],
    cameraMove: { move: 'slowPush', start: 'reveal.end', dur: 2 } };
  resolveRelativeTimes(scene3b);
  ok('relative-time: the single-spec cameraMove object form resolves too', approx(scene3b.cameraMove.start, 2));

  // a transition boundary written relative to a layer's end.
  const scene4 = { layers: [{ id: 'beat1', type: 'text', start: 0, duration: 4 }],
    transitions: [{ at: 'beat1.end', fx: 'whip' }] };
  resolveRelativeTimes(scene4);
  ok('relative-time: transitions[].at resolves off a layer\'s end', approx(scene4.transitions[0].at, 4));

  // unknown id and circular reference keep their named errors.
  let unknownMsg = '';
  try { resolveRelativeTimes({ layers: [{ id: 'a', type: 'text', start: 'nope+1' }] }); }
  catch (e) { unknownMsg = e.message; }
  ok('relative-time: an unknown id names itself in the error', unknownMsg.includes('"nope"') && unknownMsg.includes('unknown reference'));

  let circularMsg = '';
  try { resolveRelativeTimes({ layers: [
    { id: 'x', type: 'text', start: 'y+1' },
    { id: 'y', type: 'text', start: 'x+1' },
  ] }); } catch (e) { circularMsg = e.message; }
  ok('relative-time: a circular reference is refused, not resolved to a guess', circularMsg.includes('circular'));

  // a bg window's own string grammar ("cut@N", core/timeline/junctions.js) is a DIFFERENT mechanism and
  // untouched here: this resolver must never mistake a junction reference for an unknown layer id.
  const scene5 = { layers: [{ id: 'hero', type: 'text', start: 0 }], bg: [{ preset: 'plain', from: 'cut@1' }] };
  resolveRelativeTimes(scene5);
  ok('relative-time: leaves a bg window\'s junction reference alone (a different grammar, a different owner)',
    scene5.bg[0].from === 'cut@1');

  // THE ORDERING PROOF: expandScene resolves relative time BEFORE tempo scales it, so the resolved
  // number scales like any other authored time rather than adding an unscaled offset onto a scaled one.
  const tempoScene = { tempo: 0.85, layers: [
    { id: 'hero', type: 'text', start: 1, duration: 2 },
    { id: 'b', type: 'text', start: 'hero.end+0.5' },
  ] };
  const expanded = expandScene(tempoScene);
  const expectedB = snap(3.5 * (1 / 0.85)); // resolved (3.5) THEN scaled, matching resolveTempo's own snap
  ok('relative-time + tempo: expandScene resolves the reference before tempo scales the result',
    typeof expanded.layers[1].start === 'number' && approx(expanded.layers[1].start, expectedB));

  // a numbers-only scene expands byte-identical: nothing here is a string, every branch is a no-op.
  const plain = { layers: [{ id: 'hero', type: 'text', start: 1, duration: 2 }] };
  const plainCopy = JSON.parse(JSON.stringify(plain));
  resolveRelativeTimes(plainCopy);
  ok('relative-time: a numbers-only scene is untouched', JSON.stringify(plainCopy) === JSON.stringify(plain));

  // a scene with NO beats[] at all behaves byte-identical even when it names layer ids that would
  // otherwise collide with beat syntax: the `beat:` prefix is the only trigger.
  const noBeats = { layers: [{ id: 'hero', type: 'text', start: 1, duration: 2 }] };
  const noBeatsCopy = JSON.parse(JSON.stringify(noBeats));
  resolveRelativeTimes(noBeatsCopy);
  ok('relative-time: a scene with no beats[] is untouched', JSON.stringify(noBeatsCopy) === JSON.stringify(noBeats));
}

// EDITS[] (real-footage cut list, core/engine/expand.js `lowerEdits`): lowers to one `video` layer per
// entry, chained by "<id>.end" through the same resolveRelativeTimes every other sugar uses.
{
  const scene = {
    module: 'scene', duration: 10,
    edits: [
      { id: 'a', src: 'assets/clips/interview.mp4', in: 4, out: 9.5, audio: true },
      { id: 'b', src: 'assets/clips/broll.mp4', in: 12, out: 15 },
    ],
  };
  const x = expandScene(structuredClone(scene));
  ok('edits: lowers to one video layer per entry', x.layers.length === 2 && x.layers.every((l) => l.type === 'video'));
  ok('edits: first cut starts at 0, duration = out-in', x.layers[0].start === 0 && approx(x.layers[0].duration, 5.5));
  ok('edits: second cut chains off the first cut\'s end', approx(x.layers[1].start, 5.5) && approx(x.layers[1].duration, 3));
  ok('edits: fields pass through (src, in, out, audio)', x.layers[0].src === 'assets/clips/interview.mp4'
    && x.layers[0].in === 4 && x.layers[0].out === 9.5 && x.layers[0].audio === true);
  ok('edits: `edits` is consumed and deleted, never leaks past expand', !('edits' in x));

  // `rate` halves the duration.
  const rated = expandScene({ module: 'scene', duration: 5,
    edits: [{ id: 'a', src: 'assets/clips/x.mp4', in: 0, out: 4, rate: 2 }] });
  ok('edits: a rate of 2 halves the duration', approx(rated.layers[0].duration, 2));

  // a transition authored at a cut boundary still resolves after lowering.
  const withTransition = expandScene({ module: 'scene', duration: 10,
    edits: [
      { id: 'a', src: 'assets/clips/x.mp4', in: 0, out: 3 },
      { id: 'b', src: 'assets/clips/y.mp4', in: 0, out: 2 },
    ],
    transitions: [{ at: 'a.end', fx: 'whip' }] });
  ok('edits: a transition at a cut boundary resolves after lowering', approx(withTransition.transitions[0].at, 3));

  // duplicate id and missing src throw named errors.
  let dupMsg = '';
  try { expandScene({ module: 'scene', duration: 4, edits: [
    { id: 'a', src: 'x.mp4', in: 0, out: 1 }, { id: 'a', src: 'y.mp4', in: 0, out: 1 },
  ] }); } catch (e) { dupMsg = e.message; }
  ok('edits: a duplicate id throws a named error', dupMsg.includes('duplicate id') && dupMsg.includes('"a"'));

  let missingSrcMsg = '';
  try { expandScene({ module: 'scene', duration: 4, edits: [{ id: 'a', in: 0, out: 1 }] }); }
  catch (e) { missingSrcMsg = e.message; }
  ok('edits: a missing src throws a named error', missingSrcMsg.includes('`src`') && missingSrcMsg.includes('"a"'));

  // a scene with no edits[] passes through byte-identical.
  const noEdits = { module: 'scene', duration: 4, layers: [{ id: 'hero', type: 'text', start: 0, duration: 4 }] };
  const noEditsCopy = structuredClone(noEdits);
  expandScene(noEditsCopy);
  ok('edits: a scene with no edits[] is untouched byte for byte', JSON.stringify(noEditsCopy) === JSON.stringify(noEdits));
}

// BEAT-RELATIVE TIME (item 3, `beats[]` + "beat:<id>.start"/"beat:<id>.end"): a beat gives its own id
// to every field the plain relative-time grammar already reaches, plus a bg window from/to, which the
// bare grammar was refused (that string slot's own junction grammar).
{
  // layer start off a beat's start plus an offset, and off a beat's end.
  const s1 = { beats: [{ id: 'b1', start: 2, duration: 3 }],
    layers: [{ id: 'x', type: 'text', start: 'beat:b1.start + 0.3' }, { id: 'y', type: 'text', start: 'beat:b1.end' }] };
  resolveRelativeTimes(s1);
  ok('relative-time: layer start resolves off a beat\'s start plus an offset', approx(s1.layers[0].start, 2.3));
  ok('relative-time: layer start resolves off a beat\'s end', approx(s1.layers[1].start, 5));

  // cameraMove[].start off a beat.
  const s2 = { beats: [{ id: 'b1', start: 1, duration: 2 }],
    cameraMove: [{ move: 'slowPush', start: 'beat:b1.start', dur: 1, from: 1, to: 1.1 }] };
  resolveRelativeTimes(s2);
  ok('relative-time: cameraMove[].start resolves off a beat', approx(s2.cameraMove[0].start, 1));

  // transitions[].at off a beat's end.
  const s2b = { beats: [{ id: 'b1', start: 0, duration: 4 }], transitions: [{ at: 'beat:b1.end', fx: 'whip' }] };
  resolveRelativeTimes(s2b);
  ok('relative-time: transitions[].at resolves off a beat\'s end', approx(s2b.transitions[0].at, 4));

  // a bg window's from/to, `beat:`-prefixed only: this is the one place the bare grammar was refused.
  const s3 = { beats: [{ id: 'b1', start: 0, duration: 3 }, { id: 'b2', start: 3, duration: 2 }],
    bg: [{ preset: 'plain', from: 'beat:b1.start', to: 'beat:b2.end' }] };
  resolveRelativeTimes(s3);
  ok('relative-time: bg window from/to resolve off beats (the beat: prefix only)',
    approx(s3.bg[0].from, 0) && approx(s3.bg[0].to, 5));

  // a beat's own start relative to another beat.
  const s4 = { beats: [{ id: 'a', start: 1, duration: 2 }, { id: 'b', start: 'beat:a.end + 0.5' }] };
  resolveRelativeTimes(s4);
  ok('relative-time: a beat\'s own start may be relative to another beat', approx(s4.beats[1].start, 3.5));

  // unknown beat id names itself in the error.
  let unknownBeatMsg = '';
  try { resolveRelativeTimes({ beats: [{ id: 'a', start: 0, duration: 1 }],
    layers: [{ id: 'x', type: 'text', start: 'beat:nope.start' }] }); }
  catch (e) { unknownBeatMsg = e.message; }
  ok('relative-time: an unknown beat id names itself in the error',
    unknownBeatMsg.includes('"nope"') && unknownBeatMsg.includes('unknown beat reference'));

  // circular beat reference is refused, the same "circular reference" shape a layer gets.
  let circularBeatMsg = '';
  try { resolveRelativeTimes({ beats: [{ id: 'p', start: 'beat:q.start' }, { id: 'q', start: 'beat:p.start' }] }); }
  catch (e) { circularBeatMsg = e.message; }
  ok('relative-time: a circular beat reference is refused, not resolved to a guess', circularBeatMsg.includes('circular'));

  // the pre-existing junction grammar stays untouched even when the scene also carries beats[]: "beat:"
  // and "cut@1" cannot collide (proved directly against both regexes, not just observed on one scene).
  const s5 = { beats: [{ id: 'b1', start: 0, duration: 1 }], layers: [{ id: 'hero', type: 'text', start: 0 }],
    bg: [{ preset: 'plain', from: 'cut@1' }] };
  resolveRelativeTimes(s5);
  ok('relative-time: a junction ref ("cut@1") is untouched on a scene that also has beats[]', s5.bg[0].from === 'cut@1');
  const JUNCTION_REF = /^([a-z]+)@(\d+)$/;
  const BEAT_TARGET = /^beat:([\w-]+)\.(start|end)\s*([+-]\s*[\d.]+)?$/;
  ok('relative-time: "beat:x.start" and "cut@1" cannot both match, by construction',
    !JUNCTION_REF.test('beat:x.start') && !BEAT_TARGET.test('cut@1'));

  // tempo scales beats[] the same as every other authored time, keeping a "beat:" reference resolved
  // BEFORE tempo in step with everything it can sit beside.
  const GRID2 = 1 / 60;
  const snap2 = (v) => Math.round(v / GRID2) * GRID2;
  const tempoBeats = { tempo: 0.85, beats: [{ id: 'b1', start: 1, duration: 2 }],
    layers: [{ id: 'x', type: 'text', start: 'beat:b1.start + 0.5' }] };
  const expandedBeats = expandScene(tempoBeats);
  ok('relative-time + tempo: beats[] scale the same as every other authored time',
    approx(expandedBeats.beats[0].start, snap2(1 * (1 / 0.85))) && approx(expandedBeats.beats[0].duration, snap2(2 * (1 / 0.85))));
  ok('relative-time + tempo: a beat: reference resolves before tempo scales the result',
    approx(expandedBeats.layers[0].start, snap2(1.5 * (1 / 0.85))));

  // a camera move that overruns the beats it declares is REPORTED (console.warn), never blocked.
  const origWarn = console.warn;
  let warned = '';
  console.warn = (msg) => { warned += msg; };
  try {
    const overrun = { beats: [{ id: 'b1', start: 0, duration: 2 }],
      cameraMove: [{ move: 'slowPush', start: 1.5, dur: 1, from: 1, to: 1.1, beats: ['b1'] }] };
    bakeCameraMove(overrun, { W: 1920, H: 1080 });
    ok('cameraMove.beats: a move that runs past its declared beats is reported, not thrown', warned.includes('runs outside'));
    ok('cameraMove.beats: the render still bakes (report, never block)', Array.isArray(overrun.camera) && overrun.camera.length > 0);
  } finally { console.warn = origWarn; }

  // a camera move that fits inside its declared beats stays silent.
  const origWarn2 = console.warn;
  let warned2 = '';
  console.warn = (msg) => { warned2 += msg; };
  try {
    const fits = { beats: [{ id: 'b1', start: 0, duration: 2 }, { id: 'b2', start: 2, duration: 2 }],
      cameraMove: [{ move: 'slowPush', start: 0, dur: 4, from: 1, to: 1.1, beats: ['b1', 'b2'] }] };
    bakeCameraMove(fits, { W: 1920, H: 1080 });
    ok('cameraMove.beats: a move that fits its declared beats stays silent', warned2 === '');
  } finally { console.warn = origWarn2; }

  // PROOF NOTHING EXISTING CHANGES: every one of these fixtures (copies of real, committed films,
  // never read from films/scene/ itself so this suite carries no film dependency) declares no
  // `beats[]`, so item 3's every new branch (beat pass 0, `beat:` checks in the layer/transition/
  // camera/bg passes) is a no-op for it. Expanding it before and after this file's changes must
  // produce the identical scene.
  const NO_BEATS_FIXTURES = ['tests/fixtures/films/sample.json', 'tests/fixtures/films/_auto-orient.json'];
  for (const rel of NO_BEATS_FIXTURES) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw.beats !== undefined) continue; // not a fixture for this proof
    let expanded;
    try { expanded = expandScene(JSON.parse(JSON.stringify(raw))); } catch { continue; } // not every fixture is a bootable scene on its own
    ok(`relative-time item 3 no-op: ${rel} expands with no beats[] key introduced`, expanded.beats === undefined);
  }
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 72, `expected at least 72 assertions (the count this file was split with) to have run, saw ${pass}`);
});
