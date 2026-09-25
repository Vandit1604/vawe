import test from 'node:test';
import assert from 'node:assert/strict';
// tests/timeline/lib-test.timeline.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/timeline/lib-test.timeline.test.mjs  (make test)
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

test('lib-test: timeline', async () => {
// ---- THE ENTRANCE WARP: anticipation (#5) and the overshoot dial (#3), engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md
// Both dials ARE the easing of an entrance, so they are asserted on the curve AND through clipStyleAt,
// which is the only thing that composes them onto a real layer.
{
  const probe = () => () => 2;   // a warp that ignores the anim's own curve and returns a constant
  const changes = ANIM_NAMES.filter((n) => JSON.stringify(ANIM[n](0.5, probe)) !== JSON.stringify(ANIM[n](0.5)));
  ok('WARPABLE names exactly the entrances that honour a warp, no more and no fewer',
     JSON.stringify([...changes].sort()) === JSON.stringify([...WARPABLE].sort()));

  // ANTICIPATION: back along the travel first, then straight into the move, landing exactly at rest.
  const a = anticipateEase(easeOutCubic, { amount: 0.15, windup: 0.25 });
  ok('anticipateEase is terminal at both ends', a(0) === 0 && a(1) === 1);
  ok('anticipateEase winds BACK before it moves forward', a(0.1) < 0 && a(0.2) < 0);
  ok('anticipateEase reaches the asked-for counter-move and no more',
     Math.abs(a(0.25) + 0.15) < 1e-9 && [0.05, 0.1, 0.15, 0.2, 0.25].every((u) => a(u) >= -0.1501));
  ok('anticipateEase has no hold at the turn: it is climbing again one frame later', a(0.28) > a(0.25));

  // OVERSHOOT: the amount an author asks for is the amount the curve delivers.
  for (const amt of [0.08, 0.12, 0.15]) {
    const o = overshootEase(amt);
    let peak = 0; for (let i = 0; i <= 1000; i++) peak = Math.max(peak, o(i / 1000));
    ok(`overshootEase(${amt}) peaks within a point of the amount asked for (got ${(peak - 1).toFixed(4)})`,
       Math.abs((peak - 1) - amt) < 0.01);
    ok(`overshootEase(${amt}) lands exactly at rest`, o(1) === 1 && o(0) === 0);
  }

  // THE REFUSAL. A dial on an entrance with no travel is named, not dropped.
  ok('a dial on a non-directional entrance is refused by name', (() => {
    try { entranceWarp({ dataset: { anim: 'fade', overshoot: '0.12' } }, 0.3); return false; }
    catch (e) { return /has no travel to bend/.test(e.message) && /fade/.test(e.message); }
  })());
  ok('an entrance with neither dial gets no warp at all', entranceWarp({ dataset: { anim: 'rise' } }, 0.3) === null);

  // COMPOSED ONTO A REAL LAYER. `rise` starts 48px below its box; with a wind-up it starts there and
  // goes FURTHER down before it comes up, and with an overshoot it passes rest and comes back.
  const yOf = (st) => parseFloat(st.transform.match(/translateY\(([-\d.]+)px\)/)[1]);
  const clipW = (d) => ({ dataset: { start: '0', duration: '3', enter: '0.3', anim: 'rise', ...d } });
  const plain = clipW({}), wound = clipW({ anticipate: '0.15' }), over = clipW({ overshoot: '0.12' });
  ok('anticipate: the layer is FURTHER from rest two frames in than it was at t=0',
     yOf(clipStyleAt(wound, 2 / 30)) > yOf(clipStyleAt(plain, 0)));
  ok('anticipate: it still lands exactly at rest when the ramp ends',
     Math.abs(yOf(clipStyleAt(wound, 0.3))) < 1e-6);
  ok('overshoot: the layer passes rest and comes back (a negative translate mid-entrance)',
     (() => { for (let f = 1; f < 9; f++) if (yOf(clipStyleAt(over, f / 30)) < -0.5) return true; return false; })());
  ok('overshoot: 12% of the 48px travel is about 5.8px past rest',
     (() => { let m = 0; for (let f = 0; f <= 9; f++) m = Math.min(m, yOf(clipStyleAt(over, f / 30))); return Math.abs(-m - 48 * 0.12) < 1.2; })());
  ok('neither dial changes a layer that sets neither',
     JSON.stringify(clipStyleAt(plain, 0.12)) === JSON.stringify(clipStyleAt(clipW({}), 0.12)));

  // ANIMATE ON TWOS (#24): the clock quantises, anchored on the layer's own start.
  ok('stepClock holds each pose for a whole step, anchored on the layer start',
     stepClock(2.0, 15, 2) === 2 && stepClock(2.04, 15, 2) === 2 && Math.abs(stepClock(2.07, 15, 2) - (2 + 1 / 15)) < 1e-9);
  ok('stepClock refuses a rate that is not a positive number', (() => {
    try { stepClock(1, 0); return false; } catch (e) { return /updates per second/.test(e.message); }
  })());
  const stepped = clipW({ step: '15' });
  ok('a stepped layer renders the SAME pose for both frames of its step',
     JSON.stringify(clipStyleAt(stepped, 2 / 30)) === JSON.stringify(clipStyleAt(stepped, 3 / 30)));
  ok('a stepped layer still MOVES between steps',
     JSON.stringify(clipStyleAt(stepped, 2 / 30)) !== JSON.stringify(clipStyleAt(stepped, 4 / 30)));
  ok('a stepped clock is pure: the same t answers the same after a seek away',
     (() => { const x = JSON.stringify(clipStyleAt(stepped, 0.17)); clipStyleAt(stepped, 2.4); return x === JSON.stringify(clipStyleAt(stepped, 0.17)); })());
}


// ---- THE LAYER'S CLOCK (core/timeline/time.js): TIME REMAPPING -------------------------------------------
// AE recipe #25, the speed ramp. `timeWarp` was one easing over one span and therefore MONOTONE in
// speed; a keyed remap is what expresses fast-HOLD-fast, and the freeze and the rewind fall out of the
// same mechanism. Every assert below is a pure read of one number, which is the whole design.
{
  const at = (L, t, span = 2) => layerTime(L, t, 0, span);
  ok('a layer with no time dial is handed the film\'s own second, untouched',
     at({}, 0.7) === 0.7 && at({}, 0) === 0);
  ok('timeWarp still lands exactly on the layer\'s end, as it did before core/timeline/time.js owned it',
     Math.abs(at({ timeWarp: 'easeInQuint' }, 2) - 2) < 1e-9 && at({ timeWarp: 'easeInQuint' }, 0) === 0);
  ok('timeWarp is monotone in SPEED, which is why a hold needs keys instead', (() => {
    const L = { timeWarp: 'easeInOutCubic' }, d = (t) => at(L, t + 0.01) - at(L, t);
    return d(0.2) < d(1.0) && d(1.8) < d(1.0);   // one hump: it cannot ramp, hold, then ramp again
  })());
  ok('the `whip` shape crawls, bolts, then lands: its middle is the fastest part by far', (() => {
    const L = { timeRemap: 'whip' }, d = (t) => at(L, t + 0.02) - at(L, t);
    return d(0.9) > 6 * d(0.2) && d(0.9) > 6 * d(1.8);
  })());
  ok('the `hold` shape sits near 30% speed across its middle half', (() => {
    const L = { timeRemap: 'hold' }, mid = (at(L, 1.5) - at(L, 0.5)) / 1.0;
    return mid > 0.2 && mid < 0.4;
  })());
  ok('`freeze` holds the last pose dead still to the end',
     Math.abs(at({ timeRemap: 'freeze' }, 1.4) - at({ timeRemap: 'freeze' }, 2)) < 1e-9);
  ok('`rewind` returns to where it started, so `at` may fall even though `t` never does',
     Math.abs(at({ timeRemap: 'rewind' }, 2) - 0) < 1e-9 && at({ timeRemap: 'rewind' }, 1) > 1.9);
  ok('a named shape scales to the layer\'s own span, so one name fits any duration',
     Math.abs(at({ timeRemap: 'freeze' }, 6, 10) / 10 - at({ timeRemap: 'freeze' }, 1.2, 2) / 2) < 1e-9);
  ok('hand-written keys are read in SECONDS, and a repeated `at` is a freeze', (() => {
    const L = { timeRemap: [{ t: 0, at: 0 }, { t: 1, at: 0.5 }, { t: 2, at: 0.5 }] };
    return Math.abs(at(L, 1) - 0.5) < 1e-9 && Math.abs(at(L, 1.8) - 0.5) < 1e-9;
  })());
  ok('the clock is PURE: a backwards seek answers exactly what the forward pass did', (() => {
    const L = { timeRemap: 'whip' }, x = at(L, 0.83);
    at(L, 1.9); at(L, 0.1);
    return at(L, 0.83) === x;
  })());
  ok('an unknown remap name is refused with the menu, never resolved to a default', (() => {
    try { at({ timeRemap: 'ramp' }, 1); return false; } catch (e) { return /unknown time remap/.test(e.message); }
  })());
  ok('a remap key that moves BACKWARDS in `t` is refused, naming which key', (() => {
    try { at({ timeRemap: [{ t: 0, at: 0 }, { t: 1, at: 1 }, { t: 0.5, at: 2 }] }, 1); return false; }
    catch (e) { return /only ever goes forward/.test(e.message); }
  })());
  ok('timeWarp and timeRemap on one layer are refused rather than one silently winning', (() => {
    try { at({ timeWarp: 'easeInQuint', timeRemap: 'whip' }, 1); return false; }
    catch (e) { return /two spellings of one/.test(e.message); }
  })());
  ok('every named shape carries a blurb, so `make arsenal` can find it',
     TIME_REMAP_NAMES.length === 4 && TIME_REMAP_NAMES.every((n) => (TIME_REMAP_BLURBS[n] || '').length > 20));
}


// ---- THE VELOCITY READ (core/timeline/sequence.js), and the three modifiers built on it -------------------
{
  // LINEAR on purpose: motionAt eases a sparse segment, so a track written without `ease` has an
  // instantaneous velocity at its midpoint nearly three times its average, and every number below
  // would then be asserting the shape of easeInOutCubic rather than the shape of the velocity read.
  const kf = [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: 600, ease: 'linear' }, { t: 2, x: 600, ease: 'linear' }];
  ok('velocityAt reports px per SECOND, not per frame',
     Math.abs(velocityAt(kf, 0.5, 1 / 30).speed - 600) < 1);
  ok('velocityAt tapers to zero at the layer\'s first frame rather than extrapolating',
     velocityAt(kf, 0, 1 / 30).speed === 0);
  ok('velocityAt is the read the motion track already made: hypot over one frame, divided by that frame',
     (() => { const p = poseBack(kf, 0.5, 1 / 30), n = motionAt(kf, 0.5);
       return Math.abs(velocityAt(kf, 0.5, 1 / 30).speed / 30 - Math.hypot(n.dx - p.dx, n.dy - p.dy)) < 1e-9; })());
  ok('velocityAt refuses a window that is not a positive number of seconds', (() => {
    try { velocityAt(kf, 0.5, 0); return false; } catch (e) { return /positive lookback/.test(e.message); }
  })());

  // ---- `make track SHAPE=exit` must not brake in the middle of a departure -----------------------
  //
  // A named easing is a function of ONE segment's own progress, so it ends that segment fast and
  // starts the next one at rest: an interior key is a dead stop by construction (the SMOOTH section of
  // core/timeline/sequence.js). `exit` is the one emitted shape whose interior key is a pure WAYPOINT, the
  // travel never turns around, so the stop there is a defect and not the shape. Both segments were
  // `easeInCubic` and the departure collapsed from 285 px/s to 31 at its own waypoint. Asserted as a
  // velocity FLOOR rather than as the two key names, because the names are one way to get there and
  // the floor is the thing a viewer sees.
  const exitKeys = TRACK_SHAPES.exit({ dur: 0.55, to: -260, axis: 'y' });
  // Sampled from the WAYPOINT to the end, never from t=0: the layer is meant to leave from rest, so the
  // low velocity in its first frames is the shape. The defect is a brake once it is already moving.
  const exitFloor = (keys) => {
    let min = Infinity;
    for (let i = 0; i <= 12; i++) min = Math.min(min, Math.abs(velocityAt(keys, 0.187 + ((0.55 - 0.187) * i) / 12, 1 / 30).vy));
    return min;
  };
  ok('the emitted `exit` track never brakes below 250 px/s on its way out', exitFloor(exitKeys) > 250);
  ok('the shape it replaced DID brake, so the floor above is measuring something', exitFloor([
    { t: 0, y: 0, opacity: 1 }, { t: 0.187, y: -31.2, opacity: 1, ease: 'easeInCubic' },
    { t: 0.55, y: -260, opacity: 0, ease: 'easeInCubic' }]) < 60);
  ok('`exit` still LEAVES: it is faster at the frame edge than anywhere earlier',
     Math.abs(velocityAt(exitKeys, 0.55, 1 / 30).vy) > exitFloor(exitKeys) * 2);
  ok('every track `make track` emits is legal: no key carries two authored curves',
     Object.keys(TRACK_SHAPES).every((n) => keyHandleErrors(TRACK_SHAPES[n]({}), n).length === 0));

  // SQUASH: the perpendicular axis is the RECIPROCAL, which is the difference between a squash and a zoom.
  const scene = { clock: { fps: 30, t: 0, frame: 0, duration: 3 } };
  const sq = (L, t, spec = true) => { const el = { style: {} }; squashFrame(null, el, L, t, scene, spec); return el.style.scale; };
  const mover = { id: 'ball', start: 0, motion: kf };
  ok('squash conserves volume: the two axes multiply to 1', (() => {
    const [a, b] = sq(mover, 0.5).split(' ').map(Number); return Math.abs(a * b - 1) < 1e-4;
  })());
  ok('squash stretches the axis it is TRAVELLING on', (() => {
    const [a, b] = sq(mover, 0.5).split(' ').map(Number); return a > 1 && b < 1;
  })());
  ok('squash stretches vertically for a layer that falls', (() => {
    const [a, b] = sq({ id: 'drop', start: 0, motion: [{ t: 0, y: 0, ease: 'linear' }, { t: 1, y: 600, ease: 'linear' }] }, 0.5).split(' ').map(Number);
    return b > 1 && a < 1;
  })());
  ok('a still layer renders identically to one carrying no squash at all', sq(mover, 1.5) === 'none');
  ok('squash reaches the amount asked for at the speed asked for', (() => {
    const [a] = sq(mover, 0.5, { amount: 0.25, at: 600 }).split(' ').map(Number);
    return Math.abs(a - 1.25) < 1e-3;
  })());
  ok('squash refuses an unknown option key by name', (() => {
    try { sq(mover, 0.5, { ammount: 0.2 }); return false; } catch (e) { return /unknown key "ammount"/.test(e.message); }
  })());
  ok('squash refuses a layer with no motion track, at BUILD', (() => {
    try { squashBuild(null, { style: {} }, { id: 'x' }, true); return false; }
    catch (e) { return /no `motion` track/.test(e.message); }
  })());
  ok('squash and kick may not share the `scale` longhand in silence', (() => {
    try { squashBuild(null, { style: {} }, { id: 'x', motion: kf, modifiers: [{ squash: true }, { kick: true }] }, true); return false; }
    catch (e) { return /also carries `kick`/.test(e.message); }
  })());

  // LAG: the trailing layer carries the leader's pose, late, and rings past its stop.
  const view = { clock: scene.clock, ids: ['ball', 'tail'], specOf: (id) => (id === 'ball' ? mover : null) };
  const lg = (t, spec = { of: 'ball' }) => { const el = { style: {} }; lagFrame(null, el, { id: 'tail' }, t, view, spec); return el.style.translate; };
  ok('lag carries the leader\'s pose from `delay` frames ago', (() => {
    const got = parseFloat(lg(0.5, { of: 'ball', delay: 3, amp: 0 }));
    return Math.abs(got - motionAt(kf, 0.5 - 3 / 30).dx) < 0.01;
  })());
  ok('lag with a longer delay is further behind', (() => {
    const a = parseFloat(lg(0.5, { of: 'ball', delay: 1, amp: 0 })), b = parseFloat(lg(0.5, { of: 'ball', delay: 3, amp: 0 }));
    return b < a;
  })());
  ok('lag overruns the leader\'s stop and rings back through it', (() => {
    const xs = []; for (let f = 31; f < 48; f++) xs.push(parseFloat(lg(f / 30)));
    return xs.some((x) => x > 600.5) && xs.some((x) => x < 599.5);
  })());
  ok('lag\'s overrun decays: the last ring is smaller than the first', (() => {
    const at = (f) => Math.abs(parseFloat(lg(f / 30)) - 600);
    return at(46) < at(34);
  })());
  ok('lag refuses a leader with no motion track', (() => {
    try { lagFrame(null, { style: {} }, { id: 'tail' }, 0.5, { ...view, specOf: () => ({ id: 'ball' }) }, { of: 'ball' }); return false; }
    catch (e) { return /no `motion` track/.test(e.message); }
  })());
  ok('lag refuses a chain, because it reads keyframes and would land where nothing is', (() => {
    try { lagFrame(null, { style: {} }, { id: 'tail' }, 0.5, { ...view, specOf: () => ({ id: 'ball', motion: kf, modifiers: [{ lag: 'other' }] }) }, { of: 'ball' }); return false; }
    catch (e) { return /itself lagging/.test(e.message); }
  })());
  ok('lag refuses a layer trailing itself', (() => {
    try { lagBuild(null, { style: {} }, { id: 'tail' }, { of: 'tail' }); return false; }
    catch (e) { return /cannot trail itself/.test(e.message); }
  })());

  // MATTE: the mask follows the SOURCE's live box, which is what makes a gradient into a wipe.
  const boxes = { sweep: { cx: 300, cy: 100, w: 400, h: 200, scale: 1 }, plate: { cx: 500, cy: 100, w: 1000, h: 200, scale: 1 } };
  const mview = { clock: scene.clock, ids: ['sweep', 'plate'],
    specOf: (id) => (id === 'sweep' ? { id: 'sweep', type: 'rect', bg: 'linear-gradient(90deg,#000,#fff)' } : null),
    boxOf: (id) => boxes[id] };
  const mt = (spec = 'sweep') => { const el = { style: {} }; matteFrame(null, el, { id: 'plate' }, 0, mview, spec); return el.style; };
  ok('matte takes the source layer\'s gradient as the mask image', mt().maskImage === 'linear-gradient(90deg,#000,#fff)');
  ok('matte defaults to LUMINANCE, which is what a luma matte means', mt().maskMode === 'luminance');
  ok('matte sizes and places the mask from the source\'s box, relative to its own',
     mt().maskSize === '400.00px 200.00px' && mt().maskPosition === '100.00px 0.00px');
  ok('matte moves with the source: shift the source box and the mask position follows', (() => {
    boxes.sweep = { ...boxes.sweep, cx: 700 }; const p = mt().maskPosition;
    boxes.sweep = { ...boxes.sweep, cx: 300 }; return p === '500.00px 0.00px';
  })());
  ok('matte refuses a source that paints nothing a mask can use', (() => {
    try { matteFrame(null, { style: {} }, { id: 'plate' }, 0, { ...mview, specOf: () => ({ id: 'sweep', type: 'paint' }) }, 'sweep'); return false; }
    catch (e) { return /paints nothing a mask can use/.test(e.message); }
  })());
  ok('matte refuses an unknown mode by name', (() => {
    try { matteFrame(null, { style: {} }, { id: 'plate' }, 0, mview, { from: 'sweep', mode: 'luma' }); return false; }
    catch (e) { return /unknown mode "luma"/.test(e.message); }
  })());
  ok('matte refuses to share `mask-image` with the layer\'s own `mask`', (() => {
    try { matteBuild(null, { style: {} }, { id: 'plate', mask: 'linear-gradient(#000,#fff)' }, 'sweep'); return false; }
    catch (e) { return /also sets `mask`/.test(e.message); }
  })());

  // UPRIGHT (auto-orient): the correction is the NEGATIVE of the carrier's own keyed rotation, read
  // from its keyframes and not from anything the carrier's own frame pass wrote. So these run the
  // modifier with no renderer and no DOM at all, which is the point: if the answer needed the rendered
  // transform, this test could not exist and renderFrame(n) would depend on layer order.
  const wheel = { id: 'wheel', type: 'group', start: 1, motion: [{ t: 0, rot: 0 }, { t: 2, rot: 180 }] };
  const uview = { clock: scene.clock, ids: ['wheel', 'photo'], specOf: (id) => (id === 'wheel' ? wheel : null), boxOf: () => null };
  const up = (t, spec = 'wheel', L = { id: 'photo' }) => { const el = { style: {} }; uprightFrame(null, el, L, t, uview, spec); return el.style.rotate; };
  ok('upright cancels the carrier\'s rotation exactly, at the carrier\'s own start', up(1) === 'none');
  ok('upright reads the carrier\'s LOCAL time, so its `start` offsets the angle', up(3) === '-180.000deg');
  ok('upright is the negative of the carrier mid-move, sampled from the same track', up(2) === '-90.000deg');
  ok('upright writes `none` rather than leaving a stale rotate when the carrier is square', up(1) === 'none' && up(3) !== 'none');
  ok('upright takes the bare id and { of } to mean the same thing', up(2) === up(2, { of: 'wheel' }));
  ok('upright refuses an unknown key by name', (() => {
    try { up(2, { of: 'wheel', axis: 'z' }); return false; }
    catch (e) { return /unknown key "axis"/.test(e.message); }
  })());
  ok('upright refuses `true`, because a layer cannot guess which ancestor turns', (() => {
    try { up(2, true); return false; } catch (e) { return /There is no `true`/.test(e.message); }
  })());
  ok('upright refuses a carrier that never turns, rather than rendering as its own absence', (() => {
    try { uprightFrame(null, { style: {} }, { id: 'photo' }, 1, { ...uview, specOf: () => ({ id: 'wheel', motion: [{ t: 0, x: 40 }] }) }, 'wheel'); return false; }
    catch (e) { return /no `rot` key in a `motion` track/.test(e.message); }
  })());
  ok('upright refuses an unknown carrier id by name', (() => {
    try { up(2, 'nowhere'); return false; } catch (e) { return /no layer with id "nowhere"/.test(e.message); }
  })());
  ok('upright refuses a layer holding itself upright', (() => {
    try { uprightBuild(null, { style: {} }, { id: 'photo' }, 'photo'); return false; }
    catch (e) { return /cannot hold itself upright/.test(e.message); }
  })());
  ok('upright refuses to share the `rotate` longhand with `tilt`', (() => {
    try { uprightBuild(null, { style: {} }, { id: 'photo', modifiers: [{ tilt: { y: 20 } }, { upright: 'wheel' }] }, 'wheel'); return false; }
    catch (e) { return /also carries `tilt`/.test(e.message); }
  })());
}


// ---- mergePan: every fabricated key must state the WHOLE pose (MISTAKES #194, #195) ------------
// motionAt reads a track key to key, so an omitted property is identity, not "unchanged". mergePan
// interleaves two tracks, so each key it produces is missing whatever the OTHER track declared unless
// it fills it in. Both directions failed at once and neither is visible in the JSON: the pan's keys
// carried a constant `rot:0` that fought the author's rotation, and the author's rot-only keys carried
// no x so the layer snapped back to its origin between them. The scene that caught it (`cadence`'s
// spinner) has since been cut, so these are the only thing holding the fix down.
{
  const src = { id: 'page', start: 0, motion: [{ t: 0, x: 0 }, { t: 0.5, x: -300, ease: 'linear' }, { t: 1, x: -600, ease: 'linear' }] };
  // a layer that TURNS while it rides: rot-only keys, interleaved between the pan's x-only keys
  const rider = { id: 'spin', panWith: 'page', start: 0, motion: [{ t: 0, x: 0, rot: 0 }, { t: 0.4, rot: 180, ease: 'linear' }, { t: 0.8, rot: 360, ease: 'linear' }] };
  const merged = mergePan(rider, src);
  const sample = (t) => motionAt(merged, t);
  let xMono = true, rotMono = true;
  for (let n = 1; n <= 30; n++) {
    const a = sample((n - 1) / 30), b = sample(n / 30);
    if (b.dx > a.dx + 1e-6) xMono = false;        // the page only ever moves left
    if (b.rot < a.rot - 1e-6) rotMono = false;    // the spinner only ever turns forward
  }
  ok('mergePan · travel never reverses between the rider\'s own keys', xMono);
  ok('mergePan · rotation is never reset by the pan\'s keys', rotMono);
  ok('mergePan · rot-only keys do not end the pan', approx(sample(1).dx, -600, 1));
  ok('mergePan · the rider still reaches its own final rotation', approx(sample(0.8).rot, 360, 1));

  // ...and a layer that states a POSITION of its own has left the page: the pan stops contributing,
  // so the source's later keys cannot drag it back onto a path it already left.
  const peeler = { id: 'btn', panWith: 'page', start: 0, motion: [{ t: 0, x: 0, y: 0 }, { t: 0.6, x: -320, y: -80, ease: 'linear' }] };
  const pm = mergePan(peeler, src);
  ok('mergePan · peeling drops the source keys past the break', pm.every((k) => k.t <= 0.6 + 1e-6));
  ok('mergePan · the peeled layer holds its own destination', approx(motionAt(pm, 1).dx, -320, 1));
}


// ---- junctions: name a moment by its JOINT, never by its time (core/timeline/junctions.js) ----
{
  const marks = [{ t: 1.6, kind: 'cut' }, { t: 4.4, kind: 'cut' }, { t: 7.8, kind: 'sting' }];
  const table = junctionTable(marks);
  ok('junctions: per-kind lists are time-ordered', JSON.stringify(table.cut) === '[1.6,4.4]');
  ok('junctions: `junction` merges every kind', JSON.stringify(table.junction) === '[1.6,4.4,7.8]');
  ok('junctions: a ref resolves to the joint\'s own time', resolveJunction('cut@1', table) === 4.4);
  ok('junctions: `sting@0` is indexed within its kind', resolveJunction('sting@0', table) === 7.8);
  // Nothing is guessed: "cut@3" on a two-cut film is a typo, not a hint.
  ok('junctions: an index past the end throws and names what the film HAS', (() => {
    try { resolveJunction('cut@9', table, 'bg[2].from'); return false; }
    catch (e) { return /does not exist/.test(e.message) && /cut@0\.\.1/.test(e.message); }
  })());
  ok('junctions: an unknown kind throws', (() => {
    try { resolveJunction('beat@0', table); return false; } catch (e) { return /unknown junction kind/.test(e.message); }
  })());
  ok('junctions: a time is not mistaken for a ref, and vice versa',
    !isJunctionRef(1.6) && !isJunctionRef('1.6') && isJunctionRef('cut@0'));
  ok('junctions: marksOf reads a LOWERED scene\'s cuts/seams/stings',
    JSON.stringify(marksOf({ cuts: [{ t: 2 }], stings: [{ t: 1 }] })) === '[{"t":1,"kind":"sting"},{"t":2,"kind":"cut"}]');
  // bg windows that name NO times bind to the film's own joints, one each, in order. Before this,
  // every one of them defaulted to 0..1e9 and bgWinAt kept the last, so all but the final window were
  // accepted and never drawn, silent substitution, the same shape as #213 and #369.
  {
    const T = junctionTable([{ t: 2, kind: 'cut' }, { t: 5, kind: 'cut' }, { t: 8, kind: 'sting' }]);
    const w = bindWindowsToJunctions([{ preset: 'paper' }, { preset: 'dark' }, { preset: 'accent' }], T);
    ok('bg/junctions: unbounded windows take the joints in order',
      w[0].from === 0 && w[0].to === 2 && w[1].from === 2 && w[1].to === 5);
    ok('bg/junctions: the last window runs to the end (no `to`)', w[2].to === undefined && w[2].from === 5);
    ok('bg/junctions: one window is still the whole film',
      bindWindowsToJunctions([{ preset: 'paper' }], T).length === 1
      && bindWindowsToJunctions([{ preset: 'paper' }], T)[0].from === undefined);
    ok('bg/junctions: a window that names an edge is left alone', (() => {
      const src = [{ preset: 'paper' }, { preset: 'dark', from: 3 }];
      return bindWindowsToJunctions(src, T)[0].from === undefined;
    })());
    ok('bg/junctions: too few joints throws and names what the film has', (() => {
      const thin = junctionTable([{ t: 2, kind: 'cut' }]);
      try { bindWindowsToJunctions([{}, {}, {}], thin); return false; }
      catch (e) { return /needs 2 cuts or seams and this film has 1/.test(e.message) && /cut@0\.\.0/.test(e.message); }
    })());
    // A STING IS NOT A JOINT, and nothing pinned that until two films shipped with the wrong backdrop.
    // This binder read `table.junction`, the merged list, while shotWindows twelve lines below argues
    // the case against it and the schema promises "the film's CUTS". Declaring a `spectacle` injects a
    // sting, so every window slid one joint late, silently. The sting here sits BEFORE the cut, which
    // is the case the old assertion could not see: its sting was last, so excluding it changed nothing.
    ok('bg/junctions: a sting is not a joint, so windows skip it', (() => {
      const withSting = junctionTable([{ t: 1, kind: 'sting' }, { t: 4, kind: 'cut' }]);
      const bound = bindWindowsToJunctions([{ preset: 'paper' }, { preset: 'dark' }], withSting, 10);
      return bound[0].to === 4 && bound[1].from === 4;
    })());
    ok('bg/junctions: a joint past the end is not a joint either', (() => {
      const late = junctionTable([{ t: 4, kind: 'cut' }, { t: 99, kind: 'cut' }]);
      try { bindWindowsToJunctions([{}, {}, {}], late, 10); return false; }
      catch (e) { return /this film has 1/.test(e.message); }
    })());
    ok('bg/junctions: the validator catches it without a render', (() => {
      const errs = bgErrors({ bg: [{ preset: 'paper' }, { preset: 'dark' }], transitions: [] });
      return errs.some((e) => /needs 1 cuts or seams and this film has 0/.test(e));
    })());
    ok('bg/junctions: the validator lowers `transitions` first, and does not eat them', (() => {
      const cfg = { bg: [{ preset: 'paper' }, { preset: 'dark' }], transitions: [{ at: 2, fx: 'fade' }] };
      const errs = bgErrors(cfg);
      return errs.length === 0 && Array.isArray(cfg.transitions) && cfg.transitions.length === 1;
    })());
  }
  // `matches` (a top-level array binding two layers onto a junction, via bindMatchesToJunctions) used
  // to have its own test block here. Deleted with the mechanism: it measured ONE use across the whole
  // library and its only value over writing `becomes`/`duration`/`start` by hand was retiming onto a
  // named joint, on that one scene (engine-doctrine/MISTAKES.md #364-adjacent). `becomes` itself is still tested
  // by lib-test's produce.js coverage below.

  // The grammar has ONE definition now. audio-bridges established it and backgrounds reuse it; two
  // hand-kept copies of a definition is MISTAKES #159 exactly.
  ok('junctions: audio bridges resolve through the same table', (() => {
    const out = resolveBridges({ bridges: [{ bridge: 'j', sound: 'tense', at: 'cut@1', lead: 0.5 }] }, marks, 20);
    return out.length === 1 && out[0].at === 4.4;
  })());
}


// ---- opacity envelope (core/timeline/clips.js): eased, and safe to cross-dissolve with ----
{
  ok('envelope: not linear (an entrance decelerates)', opacityEnvelope(0.25, 0) > 0.4);
  ok('envelope: 0 at the start, 1 when settled', opacityEnvelope(0, 0) === 0 && opacityEnvelope(1, 0) === 1);
  ok('envelope: gone at the end of an exit', opacityEnvelope(1, 1) === 0);
  ok('envelope: monotonic in', (() => { let p = -1; for (let t = 0; t <= 1.001; t += 0.05) { const v = opacityEnvelope(t, 0); if (v < p - 1e-9) return false; p = v; } return true; })());
  // THE invariant: a handoff (A exiting while B enters, matched windows) holds constant density.
  // Without it the blend brightens in the middle and reads as muddy, measured 1.71 before the fix.
  ok('envelope: a matched handoff sums to exactly 1', (() => {
    for (let t = 0; t <= 1.001; t += 0.05) {
      const leaving = opacityEnvelope(1, t), arriving = opacityEnvelope(t, 0);
      if (Math.abs(leaving + arriving - 1) > 1e-9) return false;
    } return true; })());
}


// ---- clipStyleAt (core/timeline/clips.js): the composition asked for, not performed ----
// A fake element is enough because the function reads only `el.dataset` and writes nothing. That is
// the whole point of the lift: the pose at t is a VALUE, so it can be asked for out of order, twice,
// or for a t nobody is rendering.
{
  const clip = (d) => ({ dataset: { start: '1', duration: '3', ...d } });
  const keys = (o) => Object.keys(o).sort().join(',');

  // COMPLETE, NOT A DELTA (MISTAKES #41). Entrances and exits write different CSS properties, so both
  // branches must hand back every property either half of this layer's animation can touch, or the
  // one the other half wrote sticks across out-of-order worker frames.
  const both = clip({ anim: 'wipe', out: 'defocus', track: '3' });
  const inWin = clipStyleAt(both, 2), offWin = clipStyleAt(both, 9);
  ok('clipStyleAt: in-window carries the resting keys of BOTH halves', 'clipPath' in inWin && 'filter' in inWin);
  ok('clipStyleAt: off-window carries the resting keys of BOTH halves', 'clipPath' in offWin && 'filter' in offWin);
  ok('clipStyleAt: off-window is a state, not an absence', offWin.opacity === '0' && offWin.pointerEvents === 'none');
  ok('clipStyleAt: in-window re-enables pointer events', inWin.pointerEvents === '');
  ok('clipStyleAt: both branches return zIndex from the track', inWin.zIndex === '3' && offWin.zIndex === '3');
  ok('clipStyleAt: no track means no zIndex key, so the stylesheet keeps it',
     !('zIndex' in clipStyleAt(clip({ anim: 'fade' }), 2)));
  ok('clipStyleAt: the envelope owns opacity, not the anim',
     clipStyleAt(clip({ anim: 'fade', opacity: '0.4' }), 2).opacity === '0.400');

  // PURE IN t. Ask twice with a different t asked in between, then sweep scrambled against forward.
  const a1 = clipStyleAt(both, 1.15); clipStyleAt(both, 3.9); const a2 = clipStyleAt(both, 1.15);
  ok('clipStyleAt: the same t answers the same twice, whatever was asked between',
     JSON.stringify(a1) === JSON.stringify(a2));
  ok('clipStyleAt: a scrambled sweep matches a forward one', (() => {
    const ts = [0.5, 1.1, 1.4, 2, 3.6, 3.95, 4.5];
    const fwd = ts.map((t) => JSON.stringify(clipStyleAt(both, t)));
    const order = [4, 0, 6, 2, 5, 1, 3];
    const seen = new Map();
    for (const i of order) seen.set(i, JSON.stringify(clipStyleAt(both, ts[i])));
    return ts.every((_, i) => seen.get(i) === fwd[i]);
  })());
  ok('clipStyleAt: writes nothing (a frozen element is still answerable)',
     clipStyleAt(Object.freeze({ dataset: Object.freeze({ start: '0', duration: '2', anim: 'rise' }) }), 1).opacity === '1.000');
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 113, `expected at least 113 assertions (the count this file was split with) to have run, saw ${pass}`);
});
