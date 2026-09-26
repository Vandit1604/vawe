import test from 'node:test';
import assert from 'node:assert/strict';
// tests/motion/lib-test.motion.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/motion/lib-test.motion.test.mjs  (make test)
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

test('lib-test: motion', async () => {

// colorDistance is alpha-aware: quality/gates/design-drift.mjs's COLOR_TOL (6) draws the hint/drift
// line, and this is the bug it was drawn to catch (a 72%-white read as a match for solid white).
ok('colorDistance: alpha gap is drift, not a hint', colorDistance('rgba(255,255,255,0.72)', '#ffffff') > 6);
ok('colorDistance: same rgba against itself is legal (0)', colorDistance('rgba(255,255,255,0.72)', 'rgba(255,255,255,0.72)') === 0);
ok('colorDistance: 1-2 unit RGB gap at equal alpha is still a hint', colorDistance('rgb(254,254,253)', 'rgb(255,255,255)') <= 6);
ok('colorDistance: unparseable colour is Infinity, not a false match', colorDistance('not-a-colour', '#ffffff') === Infinity);

// `node tests/motion/lib-test.motion.test.mjs --colours` prints what the ONE parser now does with the colours
// the four old copies disagreed about. The asserts below are the gate; this is how you READ it.
if (process.argv.includes('--colours')) {
  const rows = [
    ['#7cf', 'filters + motion only 3-digit form'],
    ['#7cfa', 'was gate-only (#rgba)'],
    ['#ee7c56', 'the only form the lightfield takes, on purpose'],
    ['#0b0b0fcc', 'was gate-only (#rrggbbaa)'],
    ['#12345', 'a typo: null everywhere, before and after'],
    ['rgb(1, 2, 3)', 'every copy took this'],
    ['rgb(1 2 3)', 'was motion-only (space-separated)'],
    ['rgba(1.5, 2, 3, 0.5)', 'was gate-only (float channels)'],
    ['foo rgb(1,2,3)', 'was motion-only: the missing anchor, now null'],
    [[1, 2, 3], 'was motion-only (array passthrough)'],
  ];
  console.log('\n  the one colour parser · core/color/engine.js\n');
  for (const [v, why] of rows) {
    const t = parseColor(v), o = parseColorRGB(v);
    let lf; try { lf = JSON.stringify(lightfieldToRgb(v)); } catch { lf = 'refused'; }
    console.log(`  ${JSON.stringify(v).padEnd(24)} ${String(JSON.stringify(t)).padEnd(14)} ${String(JSON.stringify(o)).padEnd(26)} lightfield:${lf.padEnd(10)} ${why}`);
  }
  console.log('');
  process.exit(0);
}

// spring (analytic, pure)
ok('spring 0', spring(0) === 0);
ok('spring settles to ~1', approx(spring(5, { settle: 0.6 }), 1, 0.02));
ok('spring rises early', spring(0.1) > 0 && spring(0.1) < 1.5);
ok('spring overshoots when bouncy', (() => { let m = 0; for (let t = 0; t < 1; t += 0.01) m = Math.max(m, spring(t, { bounce: 0.6, settle: 0.5 })); return m > 1.0; })());
ok('spring no overshoot at bounce 0', (() => { let m = 0; for (let t = 0; t < 2; t += 0.01) m = Math.max(m, spring(t, { bounce: 0, settle: 0.6 })); return m <= 1.0001; })());
ok('spring deterministic', spring(0.37, { bounce: 0.4 }) === spring(0.37, { bounce: 0.4 }));
ok('springSettle positive finite', (() => { const s = springSettle({ bounce: 0.3, settle: 0.6 }); return s > 0 && Number.isFinite(s); })());

// seeded randomness: deterministic, in-range, seed-sensitive
ok('random in [0,1)', (() => { for (let i = 0; i < 200; i++) { const r = random(i); if (r < 0 || r >= 1) return false; } return true; })());
ok('random deterministic', random(42) === random(42) && random('x') === random('x'));
ok('random seed-sensitive', random(1) !== random(2) && random('a') !== random('b'));
ok('hashSeed uint32', Number.isInteger(hashSeed(7)) && hashSeed(7) >= 0 && hashSeed(7) < 2 ** 32);
ok('noise in [0,1)', (() => { for (let x = 0; x < 20; x += 0.3) { const v = noise(x, 5); if (v < 0 || v >= 1) return false; } return true; })());
ok('noise continuous at lattice', approx(noise(3, 9), random('9:3'), 1e-9));
ok('noise deterministic', noise(2.5, 1) === noise(2.5, 1));

// easing registry
ok('resolveEasing by name', resolveEasing('easeOutCubic') === EASINGS.easeOutCubic);
ok('resolveEasing passthrough fn', (() => { const f = (t) => t; return resolveEasing(f) === f; })());
// ABSENT and WRONG are different questions, so they get different answers and one assertion each.
ok('resolveEasing absent → easeOutCubic', resolveEasing(null) === easeOutCubic && resolveEasing('') === easeOutCubic);
ok('resolveEasing unknown → throws', (() => { try { resolveEasing('nope'); return false; } catch { return true; } })());
// A GSAP ease name is now an ALIAS onto its equivalent engine curve (resolveGsapAlias), so an author
// who knows GSAP's vocabulary can use it on an engine field too; `steps`/`rough`/`slow` have no
// engine equivalent and still name the #355 wrong-slot mistake.
ok('resolveEasing aliases a GSAP ease and still names the wrong slot for one it cannot',
  resolveEasing('power2.inOut') === EASINGS.easeInOutCubic
  && (() => { try { resolveEasing('steps(4)'); return false; } catch (e) { return /GSAP ease/.test(e.message); } })());
// Every easing the LIBRARY names must resolve: the census that made throwing safe, kept as a gate.
ok('resolveEasing accepts every name the library uses', ['linear', 'easeOutCubic', 'easeInOutCubic', 'ramp', 'spring', 'springEase', 'settle', 'snap', 'brake', 'rush'].every((n) => typeof resolveEasing(n) === 'function'));
ok('EASINGS linear', EASINGS.linear(0.42) === 0.42);


// ---- easing registry contract ----------------------------------------------------------------
// Every named easing must be a real 0->1 curve. Asserted across the WHOLE registry, not just the
// new ones: a curve that does not land on 1 silently leaves elements short of their final position.
{
  const { EASINGS } = await import('../../core/motion/motion.js');
  // These curves leave [0,1] BY DESIGN: `back` dips below 0 to anticipate, `elastic`/`spring` ring
  // past 1 before settling. The f(0)=0 / f(1)=1 checks below still apply to them, overshooting is
  // character, not arriving is a bug (see the spring-bouncy f(1)=0.96 fix).
  const OVERSHOOT = new Set(['easeOutBack', 'easeInBack', 'easeInOutBack', 'easeOutElastic', 'easeInElastic',
    'easeInOutElastic', 'spring', 'springStiff', 'spring-bouncy', 'spring-stiff', 'settle', 'snap']);
  let bad = [];
  for (const [name, fn] of Object.entries(EASINGS)) {
    if (Math.abs(fn(0)) > 1e-6) bad.push(`${name}(0)!=0`);
    if (Math.abs(fn(1) - 1) > 1e-6) bad.push(`${name}(1)!=1`);
    if (fn(0.5) !== fn(0.5)) bad.push(`${name} nondeterministic/NaN`);
    if (!OVERSHOOT.has(name)) { // overshoot curves legitimately leave [0,1]
      for (let t = 0; t <= 1; t += 0.05) { const v = fn(t); if (v < -1e-6 || v > 1 + 1e-6) { bad.push(`${name} out of range at ${t.toFixed(2)}`); break; } }
    }
  }
  ok(`easings: all ${Object.keys(EASINGS).length} land 0->1${bad.length ? ': ' + bad.slice(0, 4).join(', ') : ''}`, bad.length === 0);
  // the sine family closes a documented gap: the planning skill says "ambient loops sinusoidal"
  ok('easing sine family present', ['easeInSine', 'easeOutSine', 'easeInOutSine'].every((k) => typeof EASINGS[k] === 'function'));
  ok('easeOutSine is gentler than easeOutQuint early', EASINGS.easeOutSine(0.25) < EASINGS.easeOutQuint(0.25));
  ok('easeInOutSine symmetric', Math.abs(EASINGS.easeInOutSine(0.5) - 0.5) < 1e-9);
}


// ---- idle (core/engine/idle.js) --------------------------------------------------------------------------
// An idle runs on EVERY frame of a layer's hold, so the two things that can go wrong are the two things
// that are expensive: it is not pure in the frame, or it does something when nobody asked. Both are
// asserted here rather than left to the render, because both are invisible in a still.
{
  const EPS = 1e-12;
  const near = (a, b, e = EPS) => Math.abs(a - b) <= e;

  // PURE IN THE TIME. The reference guide's idle is built from sin of the clock, and the wrong reading
  // of that sentence is a real clock. Same input twice, same output, is what separates the two.
  for (const name of IDLE_NAMES) {
    let same = true;
    for (const u of [0, 0.37, 1.5, 4.6, 11, 97.31]) {
      const a = idleAt(name, u, 0.41), b = idleAt(name, u, 0.41);
      if (!near(a.dx, b.dx) || !near(a.dy, b.dy) || !near(a.scale, b.scale) || !near(a.rot, b.rot)) same = false;
    }
    ok(`idle "${name}" is pure, same time, same delta`, same);
  }

  // A TRUE NO-OP, on all four channels. `none` exists so an author can opt one layer out of a scene
  // default; an idle that moved anything at all through that name would be the opposite of the ask.
  {
    // BOTH DOORS. `idleAt` short-circuits on the name before the generator is reached, so asserting
    // only through it would prove the short-circuit and say nothing about IDLE.none itself, and the
    // generator is what a future caller reaching into the registry would get.
    let flat = true;
    for (const u of [0, 0.9, 3.3, 12.7]) {
      for (const d of [idleAt('none', u, 0.6), { ...IDLE_IDENTITY, ...IDLE.none(u, {}) }])
        if (d.dx !== 0 || d.dy !== 0 || d.scale !== 1 || d.rot !== 0) flat = false;
    }
    ok('idle "none" is a true no-op (dx=dy=rot=0, scale=1)', flat);
    ok('idle "none" normalizes to nothing, so the track never runs', normalizeIdle('none') === null);
    ok('an absent idle normalizes to nothing', normalizeIdle(undefined) === null && normalizeIdle(null) === null && normalizeIdle(false) === null);
    ok('IDLE.none returns the shared identity, not a fresh object per frame', IDLE.none() === IDLE_IDENTITY);
    ok('none writes no transform at any gain', idleTransform(idleAt('none', 3, 0.2), 1) === '');
  }

  // The AMPLITUDE the reference asks for by name: a 1-2% breathing scale. A breathe that reached 8%
  // would be a pulse animation, and one that reached 0.2% would be the sub-pixel shimmer core/motion/motion.js
  // snaps its easing endpoints to avoid.
  {
    let lo = Infinity, hi = -Infinity;
    for (let u = 0; u < 12; u += 0.01) { const s = idleAt('breathe', u, 0).scale; lo = Math.min(lo, s); hi = Math.max(hi, s); }
    ok(`breathe stays inside the 1-2% band it is named for (${((hi - 1) * 100).toFixed(2)}%)`, hi - 1 >= 0.01 && hi - 1 <= 0.02 && near(hi - 1, 1 - lo, 1e-6));
    ok('breathe moves nothing but scale', idleAt('breathe', 2.2, 0).dx === 0 && idleAt('breathe', 2.2, 0).dy === 0);
    ok('drift translates and does not scale', idleAt('drift', 3, 0).scale === 1 && Math.abs(idleAt('drift', 3, 0).dx) > 0);
  }

  // THE PHASE IS THE LAYER'S, and it is stable. Two layers breathing in lockstep read as one mechanism
  // driving both; the same layer breathing differently on a re-render is a purity bug wearing a costume.
  ok('idlePhase is deterministic', idlePhase('hero') === idlePhase('hero'));
  ok('idlePhase separates two layers', idlePhase('hero') !== idlePhase('sub'));
  ok('idlePhase is a turn in [0,1)', IDLE_NAMES.every(() => idlePhase('x') >= 0 && idlePhase('x') < 1));
  ok('a phase shifts the wave', !near(idleAt('breathe', 1, 0).scale, idleAt('breathe', 1, 0.5).scale, 1e-6));

  // THE SETTLED MIDDLE. Zero through the entrance and through the exit, an idle that overlapped either
  // would be fighting the very ramp driveClips is animating, for the same pixels.
  {
    const w = { dur: 4, enterDur: 0.4, exitDur: 0.3 };
    ok('no idle before the entrance has landed', settledGain(0, w) === 0 && settledGain(0.39, w) === 0);
    ok('no idle once the exit has begun', settledGain(3.7, w) === 0 && settledGain(4, w) === 0);
    ok('full idle across the middle', near(settledGain(2, w), 1, 1e-9));
    ok('the gain eases in rather than stepping', settledGain(0.5, w) > 0 && settledGain(0.5, w) < 1);
    ok('the gain is symmetric about the middle', near(settledGain(0.4 + 0.2, w), settledGain(3.7 - 0.2, w), 1e-9));
    ok('the gain never leaves [0,1]', (() => { for (let u = -1; u < 5; u += 0.01) { const g = settledGain(u, w); if (!(g >= 0 && g <= 1)) return false; } return true; })());
    // A layer whose ramps eat its whole window has no settled middle at all, and must idle nowhere
    // rather than compress a breath into two frames.
    ok('a window with no settled middle carries no idle', settledGain(0.3, { dur: 0.6, enterDur: 0.3, exitDur: 0.3 }) === 0);
    ok('an open-ended window still settles', settledGain(9, { dur: Infinity, enterDur: 0.3, exitDur: 0.26 }) > 0);
  }

  // GAIN ZERO IS THE IDENTITY, which is what makes the joins continuous: the idle grows out of rest
  // instead of appearing at full amplitude on the settle frame.
  ok('gain 0 contributes no transform', idleTransform(idleAt('breathe', 2, 0.3), 0) === '' && idleTransform(idleAt('drift', 2, 0.3), 0) === '');
  ok('the transform names translate and scale, in that order', /^translate\([^)]*\) scale\(/.test(idleTransform({ dx: 3, dy: 1, scale: 1.01, rot: 0 }, 1)));

  // A NAME THE REGISTRY DOES NOT KNOW IS REFUSED, never resolved to `none`. A silently ignored idle
  // looks exactly like a working one from the JSON, which is this repo's most expensive bug class.
  {
    let msg = '';
    try { normalizeIdle('breath'); } catch (e) { msg = e.message; }
    ok('a misspelled idle is refused and names what exists', /unknown idle "breath"/.test(msg) && /breathe/.test(msg));
    let msg2 = '';
    try { normalizeIdle({ amp: 3 }); } catch (e) { msg2 = e.message; }
    ok('an idle object without a name is refused', /expected a name/.test(msg2));
  }
}


// ---------- the three motion-standard changes ----------
// engine-doctrine/CRAFT/MOTION-STANDARDS.md audits this engine against animations.dev / emilkowal.ski. Three
// things came out of it, and all three are pinned here because all three are one-line reversions.
{
  ok('the default ease is the STRONG one', DEFAULT_MOTION.easing === 'easeOutQuint');
  // Their `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` against ours, sampled at 21 points. This is the
  // measurement the change was made on, so it is the measurement that should fail if either moves.
  {
    const bez = (x1, y1, x2, y2) => (t) => {
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 24; i++) {
        u = (lo + hi) / 2; const mt = 1 - u;
        const x = 3 * mt * mt * u * x1 + 3 * mt * u * u * x2 + u * u * u;
        if (x < t) lo = u; else hi = u;
      }
      const mt = 1 - u; return 3 * mt * mt * u * y1 + 3 * mt * u * u * y2 + u * u * u;
    };
    const theirs = bez(0.23, 1, 0.32, 1), ours = EASINGS.easeOutQuint;
    let err = 0; for (let i = 0; i <= 20; i++) { const t = i / 20; err += Math.abs(theirs(t) - ours(t)); }
    ok('easeOutQuint IS their custom ease-out, within 0.01', err / 21 < 0.01);
    // And the one we moved away from is measurably weaker, which is the whole reason for the change.
    let errOld = 0; for (let i = 0; i <= 20; i++) { const t = i / 20; errOld += Math.abs(theirs(t) - EASINGS.easeOutCubic(t)); }
    ok('easeOutCubic is the weaker curve they argue against', errOld / 21 > (err / 21) * 3);
  }
  // Stagger sits mid-band of their 30-80ms. Pinned because it is right by accident, not by decision.
  ok('the default stagger is inside the 30-80ms band', DEFAULT_MOTION.stagger >= 0.03 && DEFAULT_MOTION.stagger <= 0.08);
  // ORIGIN, AND THE COLLISION IT WALKED INTO. `origin` is a CSS transform-origin on every layer and the
  // [lon, lat] of a route's start on a `three` globe. Dispatched on the value's SHAPE, because a
  // transform-origin is never an array and a lon/lat pair is never a string. The first version threw on
  // the array and failed showcase-flight-globe at boot.
  {
    const src = fs.readFileSync(new URL('../../core/layers/util.js', import.meta.url), 'utf8');
    ok('origin reaches transformOrigin', /el\.style\.transformOrigin = L\.origin/.test(src));
    ok('an ARRAY origin is left to the globe', /Array\.isArray\(L\.origin\)\) return/.test(src));
    ok('a non-string, non-array origin is refused by name', /`\\`origin\\` is a CSS transform-origin/.test(src));
  }
}


// ---------- `through`: the speed graph ----------
// An easing is a function of ONE segment's progress, so it necessarily starts and ends that segment at
// zero velocity, and an interior keyframe becomes a dead stop. Measured on three sparse keys
// (0 → 300 → 900px, key at t=0.60) in px/s either side of it: the default curve reads 8 · 2 · 16,
// `linear` reads 500 · 750 · 1000 (no stop, but a discontinuity), and `through` reads 749 · 770 · 845.
// That difference IS the feature, so it is what gets asserted rather than the implementation.
{
  const { motionAt } = await import('../../core/timeline/sequence.js');
  const { INTERP } = await import('../../core/registry/vocab.js');
  const { isEasingName } = await import('../../core/motion/motion.js');
  const track = (ease) => [{ t: 0, x: 0 }, { t: 0.6, x: 300, ease }, { t: 1.2, x: 900, ease }];
  const vel = (t, ease) => { const k = track(ease), h = 1 / 60;
    return (motionAt(k, t + h).dx - motionAt(k, t - h).dx) / (2 * h); };

  ok('the default curve stops dead at an interior key', Math.abs(vel(0.6, undefined)) < 20);
  ok('`through` carries real velocity across that key', vel(0.6, 'through') > 400);
  // C1: the velocity either side of the key must MATCH, which is the actual definition of the fix. A
  // curve that merely happened to be fast at the key would pass the assert above and fail this one.
  const before = vel(0.585, 'through'), after = vel(0.615, 'through');
  ok('velocity is continuous through the key, not merely non-zero',
    Math.abs(after - before) / Math.max(before, after) < 0.15);
  // And it still comes to rest at both ends, so a travel eases out of and back into stillness.
  ok('`through` still starts and ends at rest',
    Math.abs(vel(0.005, 'through')) < 60 && Math.abs(vel(1.195, 'through')) < 120);
  // It reaches the authored values exactly: an interpolation that smoothed the KEYS would be wrong.
  ok('`through` passes through its keys exactly',
    Math.abs(motionAt(track('through'), 0.6).dx - 300) < 0.01
    && Math.abs(motionAt(track('through'), 1.2).dx - 900) < 0.01);

  // NOT AN EASING, and the separation is the point. `smooth` is a FEEL WORD for easeInOutCubic and the
  // first version of this shadowed it, which resolveEasing accepted because it knew the name.
  ok('`through` is a declared interpolation mode', Object.prototype.hasOwnProperty.call(INTERP, 'through'));
  ok('`through` is a legal `ease` value', isEasingName('through'));
  let threw = null;
  try { (await import('../../core/motion/motion.js')).resolveEasing('through'); } catch (e) { threw = e.message; }
  ok('resolveEasing REFUSES it: a mode is not a curve', threw != null);
  ok('`smooth` is still the feel word it always was',
    Math.abs(vel(0.6, 'smooth') - vel(0.6, undefined)) < 1);

  // ONE INTERPOLATOR, NOT TWO. cameraAt's comment said it "mirrors motionAt" and they had already
  // drifted: `through` was dispatched inside motionAt, so a camera key naming it threw
  // `unknown easing "through"`. Both now go through segmentAt, and this asserts the camera gets the
  // whole segment vocabulary rather than a copy of half of it.
  const { cameraAt, segmentAt } = await import('../../core/timeline/sequence.js');
  const cam = [{ t: 0, x: 0 }, { t: 0.6, x: 300, ease: 'through' }, { t: 1.2, x: 900, ease: 'through' }];
  const camVel = (t) => { const h = 1 / 60; return (cameraAt(cam, t + h).x - cameraAt(cam, t - h).x) / (2 * h); };
  ok('the camera speaks `through` too, because it shares the interpolator', camVel(0.6) > 400);
  ok('the camera default is still plain easeInOutCubic, no density rule',
    Math.abs(cameraAt([{ t: 0, x: 0 }, { t: 0.1, x: 100 }], 0.05).x - 50) < 0.01);
  // segmentAt is the shared owner: past the last key there is no segment and the last key holds.
  const at = segmentAt([{ t: 0, x: 0 }, { t: 1, x: 300 }], 1, 9);
  ok('segmentAt holds the last key past the end', at('x', 0) === 300);
}


// ---------- the graph editor's primitive: cubicBezier ----------
// Asserted against PUBLISHED fixtures rather than against itself. AE's Easy Ease is influence 33.33
// both sides with zero speed, which is cubic-bezier(0.333, 0, 0.667, 1); CSS `ease-in-out` is
// cubic-bezier(0.42, 0, 0.58, 1). A solver that agreed only with its own arithmetic would pass a
// round-trip test and still draw the wrong curve.
{
  const { cubicBezier, easeInOutCubic } = await import('../../core/motion/motion.js');
  // An independent high-iteration bisection solve of the same curve: different algorithm, same answer.
  const ref = (x1, y1, x2, y2) => {
    const at = (u, a1, a2) => 3 * (1 - u) * (1 - u) * u * a1 + 3 * (1 - u) * u * u * a2 + u * u * u;
    return (t) => { let lo = 0, hi = 1;
      for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (at(m, x1, x2) < t) lo = m; else hi = m; }
      return at((lo + hi) / 2, y1, y2); };
  };
  let worst = 0;
  for (const c of [[0.333, 0, 0.667, 1], [0.42, 0, 0.58, 1], [0.25, 0.1, 0.25, 1], [0.05, 1.6, 0.2, 1]]) {
    const mine = cubicBezier(...c), theirs = ref(...c);
    for (let i = 0; i <= 100; i++) worst = Math.max(worst, Math.abs(mine(i / 100) - theirs(i / 100)));
  }
  ok('cubicBezier agrees with an independent solve of the same curve', worst < 1e-5);

  const easyEase = cubicBezier(0.333, 0, 0.667, 1);
  ok('Easy Ease pins both ends exactly', easyEase(0) === 0 && easyEase(1) === 1);
  ok('Easy Ease is symmetric about its midpoint', Math.abs(easyEase(0.5) - 0.5) < 1e-9
    && Math.abs(easyEase(0.25) + easyEase(0.75) - 1) < 1e-6);
  // The published value: cubic-bezier(0.42, 0, 0.58, 1) reads 0.1292 at t = 0.25. That is NOT
  // easeInOutCubic (0.0625), which is the confusion this fixture exists to prevent: CSS `ease-in-out`
  // and a cubic ease-in-out are different curves with nearly the same name.
  const cssEIO = cubicBezier(0.42, 0, 0.58, 1);
  ok('cubic-bezier(.42,0,.58,1) reads 0.1292 at t=0.25', Math.abs(cssEIO(0.25) - 0.129162) < 1e-4);
  ok('and it is NOT easeInOutCubic', Math.abs(cssEIO(0.25) - easeInOutCubic(0.25)) > 0.05);
  // The diagonal short-circuits to the identity, exactly, with no solve at all.
  const lin = cubicBezier(0, 0, 1, 1);
  ok('the diagonal is the identity, bit for bit', [0, 0.13, 0.5, 0.87, 1].every((t) => lin(t) === t));
  // Monotone in t for any in-range control points: an easing that went backwards would rewind a move.
  const steep = cubicBezier(0.02, 0, 0.98, 1);
  let mono = true, prev = -1;
  for (let i = 0; i <= 500; i++) { const v = steep(i / 500); if (v < prev - 1e-9) mono = false; prev = v; }
  ok('a near-vertical curve is still monotone in t', mono);
  // Overshoot is allowed: y outside [0,1] is a real shape (a back ease), so it must NOT be clamped.
  ok('y is not clamped, so overshoot survives', cubicBezier(0.3, 0, 0.4, 1.7)(0.72) > 1);
}


// ---------- keyframe handles: influence AND speed, per key, per side ----------
// The design decision under test is that SPEED is a multiple of the segment's own average velocity
// rather than absolute units per second. In absolute units, y1 = (speed * influenceSeconds) / delta,
// which carries the property's delta: one authored "200 units/sec" gives y1 = 0.125 for a 400px move
// and y1 = 100 for a 0.5 scale change, and divides by zero on a property that does not move. As a
// multiple, outSpeed = frac * (delta / dur), the delta and the duration cancel and y1 = frac * x1.
// These asserts are that cancellation, measured through the shipped code.
{
  const { handleCurve, cubicBezier, HANDLE_REGISTRY, resolveHandle } = await import('../../core/motion/motion.js');
  const { motionAt, keyHandleErrors, velocityAt } = await import('../../core/timeline/sequence.js');

  // ONE HANDLE PAIR, EVERY PROPERTY. x, scale and rot share no scale, and the same key drives all
  // three to the SAME fractional progress. A speed term in absolute units could not do this.
  const multi = [{ t: 0, x: 0, scale: 1, rot: 0, easeOut: { influence: 20, speed: 4 } },
                 { t: 1, x: 400, scale: 2, rot: 90, easeIn: 'easyEase' }];
  const frac = (v, a, b) => (v - a) / (b - a);
  let sameProgress = true;
  for (const t of [0.1, 0.3, 0.5, 0.9]) {
    const m = motionAt(multi, t);
    const fx = frac(m.dx, 0, 400), fs = frac(m.scale, 1, 2), fr = frac(m.rot, 0, 90);
    if (Math.abs(fx - fs) > 1e-9 || Math.abs(fx - fr) > 1e-9) sameProgress = false;
  }
  ok('one handle pair drives x, scale and rot to identical progress', sameProgress);
  // And it is the same curve whatever the segment lasts, which absolute units would not be either.
  const short = [{ t: 0, x: 0, easeOut: { influence: 20, speed: 4 } }, { t: 0.5, x: 400 }];
  const long = [{ t: 0, x: 0, easeOut: { influence: 20, speed: 4 } }, { t: 4, x: 400 }];
  ok('the curve is the same shape at any segment duration',
    Math.abs(motionAt(short, 0.25).dx - motionAt(long, 2).dx) < 1e-6);
  // A property that does NOT change across the segment must still interpolate, not divide by zero.
  const still = [{ t: 0, x: 100, easeOut: { influence: 20, speed: 4 } }, { t: 1, x: 100, easeIn: 'easyEase' }];
  ok('a zero delta is not a special case', motionAt(still, 0.4).dx === 100);

  // easyEase on both sides IS the published Easy Ease, cubic-bezier(1/3, 0, 2/3, 1).
  const ee = handleCurve('easyEase', 'easyEase'), pub = cubicBezier(1 / 3, 0, 2 / 3, 1);
  let w = 0; for (let i = 0; i <= 100; i++) w = Math.max(w, Math.abs(ee(i / 100) - pub(i / 100)));
  ok('easyEase on both sides is AE Easy Ease exactly', w < 1e-9);
  // The closed form: y1 = speed * influence/100, y2 = 1 - speed * influence/100.
  const drawn = handleCurve({ influence: 25, speed: 2 }, null);
  const closed = cubicBezier(0.25, 0.5, 2 / 3, 2 / 3);
  let w2 = 0; for (let i = 0; i <= 100; i++) w2 = Math.max(w2, Math.abs(drawn(i / 100) - closed(i / 100)));
  ok('handleCurve is y = speed * influence/100, with the delta cancelled out', w2 < 1e-9);
  // A HANDLE NAMED FOR AN OVERSHOOT MUST OVERSHOOT, and `overshoot` shipped for a day not doing it.
  // `y2 = 1 - speed * influence`, so a POSITIVE arriving speed pulls the control point below the key and
  // the curve peaks at exactly 1. It was a plain ease-in carrying an overshoot's blurb, and nothing
  // reported it: a rendered frame looked plausible and an author would have concluded our overshoot was
  // weak. Sampling the peak is the only thing that can tell those two apart.
  const peakOf = (name) => { const f = handleCurve('easyEase', name); let p = -Infinity;
    for (let i = 0; i <= 2000; i++) p = Math.max(p, f(i / 2000)); return p; };
  ok('the overshoot handle actually sails past its key', peakOf('overshoot') > 1.05);
  ok('handles that promise no overshoot stay at or under 1',
    ['easyEase', 'hang', 'fling', 'linear'].every((n) => peakOf(n) <= 1 + 1e-9));

  // An ABSENT side is the linear half, so a one-sided handle means what it says.
  ok('handleCurve returns null when neither side authors one', handleCurve(null, null) === null);
  ok('speed 1 both sides IS linear', (() => { const f = handleCurve('linear', 'linear');
    return [0.2, 0.5, 0.8].every((t) => Math.abs(f(t) - t) < 1e-9); })());

  // DEFAULTS ARE SACRED: a track with no handle takes the path it took before handles existed.
  const plain = [{ t: 0, x: 0 }, { t: 1, x: 300 }, { t: 2, x: 900 }];
  ok('a handleless track is byte-identical to the old default path',
    motionAt(plain, 0.37).dx === 60.78359999999999);

  // THE VELOCITY READ inherits handles for free, because it derives from motionAt.
  const peak = (kfs) => Math.max(...[...Array(30)].map((_, i) => velocityAt(kfs, i / 30, 1 / 30).speed));
  ok('velocityAt sees an authored handle without being told about it',
    peak([{ t: 0, x: 0, easeOut: 'hang' }, { t: 1, x: 400, easeIn: 'hang' }]) > 1.25 * peak([{ t: 0, x: 0 }, { t: 1, x: 400 }]));

  // THE REFUSALS. `through` COMPUTES the tangent, a handle AUTHORS it, a named ease is a third
  // answer. All three refused by name rather than one silently winning.
  ok('a key with both `through` and a handle is refused',
    keyHandleErrors([{ t: 0 }, { t: 1, ease: 'through', easeIn: 'easyEase' }], 'L').length === 1);
  ok('a named ease and a handle on one segment are refused',
    keyHandleErrors([{ t: 0, easeOut: 'fling' }, { t: 1, ease: 'easeOutQuint' }], 'L').length === 1);
  ok('a handle on its own is fine', keyHandleErrors([{ t: 0, easeOut: 'fling' }, { t: 1, easeIn: 'easyEase' }], 'L').length === 0);
  ok('`ease` on a key shapes the PREVIOUS segment, so it does not clash with that key\'s `easeOut`',
    keyHandleErrors([{ t: 0 }, { t: 1, ease: 'easeOutQuint', easeOut: 'fling' }, { t: 2 }], 'L').length === 0);
  ok('an out-of-range influence is refused with the unit named',
    /PER CENT of the segment/.test(keyHandleErrors([{ t: 0, easeOut: { influence: 400 } }, { t: 1 }], 'L')[0] || ''));
  ok('an unknown handle name is refused, not substituted',
    /unknown keyframe handle/.test(keyHandleErrors([{ t: 0, easeOut: 'easyEaseOut' }, { t: 1 }], 'L')[0] || ''));
  // There is ONE name per SHAPE and the SLOT picks the side. easyEaseIn/easyEaseOut would be two
  // spellings of one thing, which is the fork this repo logs most.
  ok('there is no side-specific spelling of a handle name',
    !HANDLE_REGISTRY.names.some((n) => /In$|Out$/.test(n)));
  ok('every handle name resolves to a real { influence, speed }',
    HANDLE_REGISTRY.names.every((n) => { const h = resolveHandle(n, 'easeOut');
      return Number.isFinite(h.influence) && Number.isFinite(h.speed) && h.influence >= 0 && h.influence <= 100; }));

  // AND THE CLOCK. timeRemap keys are a key list with an `ease` per segment, exactly like a motion
  // track, so they take the same handles from the same solver rather than growing a second dial.
  // The units land better here than anywhere else: this segment's velocity IS a playback rate.
  const { layerTime } = await import('../../core/timeline/time.js');
  const clock = (remap) => (t) => layerTime({ timeRemap: remap }, t, 0, 2);
  const evenly = clock([{ t: 0, at: 0 }, { t: 2, at: 2 }]);
  ok('a handleless timeRemap is still the straight line it always was',
    Math.abs(evenly(0.5) - 0.5) < 1e-9 && Math.abs(evenly(1.5) - 1.5) < 1e-9);
  const stopped = clock([{ t: 0, at: 0 }, { t: 2, at: 2, easeIn: 'easyEase' }]);
  // speed 0 on the arriving handle means the clock is at a DEAD STOP as it reaches the key, so the
  // last stretch of source time is crossed slowly and the layer freezes into its final pose.
  const rate = (f, t, h = 1 / 60) => (f(t + h) - f(t - h)) / (2 * h);
  ok('a timeRemap handle with speed 0 stops the clock at that key', rate(stopped, 1.99) < 0.1);
  ok('and the same clock is running FASTER than real time in the middle', rate(stopped, 1.0) > 1.2);
  const fast = clock([{ t: 0, at: 0 }, { t: 2, at: 2, easeIn: { influence: 20, speed: 4 } }]);
  ok('speed 4 on the arriving handle means 4x playback at that key',
    Math.abs(rate(fast, 1.98) - 4) < 0.6);
  // BAKED ONCE, NOT PER FRAME. layerTime runs once per layer per frame and used to re-validate every
  // key and, for a NAMED shape, allocate a fresh array on the way. bakeTimeRemap resolves it at boot.
  const { bakeTimeRemap } = await import('../../core/timeline/time.js');
  const baked = { timeRemap: 'whip', duration: 4 };
  bakeTimeRemap(baked);
  ok('bakeTimeRemap turns a named shape into seconds keys', Array.isArray(baked.timeRemap)
    && baked.timeRemap[baked.timeRemap.length - 1].t === 4);
  ok('and the mark is non-enumerable, so no walker sees a new key',
    baked.timeRemap.baked === true && !Object.keys(baked.timeRemap).includes('baked'));
  const again = baked.timeRemap;
  bakeTimeRemap(baked);
  ok('baking twice is a no-op, so a re-boot on the same data is safe', baked.timeRemap === again);
  ok('a baked layer reads the same clock an unbaked one does', (() => {
    const raw = { timeRemap: 'whip', duration: 4 };
    for (const t of [0.3, 1.7, 2.9, 3.8])
      if (Math.abs(layerTime(raw, t, 0, 4) - layerTime(baked, t, 0, 4)) > 1e-12) return false;
    return true;
  })());
  let bootThrew = null;
  try { bakeTimeRemap({ id: 'clocky', timeRemap: [{ t: 0, at: 0 }, { t: 1 }], duration: 2 }); }
  catch (e) { bootThrew = e.message; }
  ok('a bad key list fails at BAKE time, naming the layer',
    bootThrew != null && /clocky/.test(bootThrew) && /numeric/.test(bootThrew));

  ok('a timeRemap key with both a handle and a named ease is refused',
    keyHandleErrors([{ t: 0, at: 0, easeOut: 'fling' }, { t: 2, at: 2, ease: 'easeOutQuint' }], 'r').length === 1);

  // And the CAMERA gets all of it, because it shares segmentAt.
  const { cameraAt } = await import('../../core/timeline/sequence.js');
  const cam = [{ t: 0, s: 1, easeOut: 'hang' }, { t: 1, s: 2, easeIn: 'hang' }];
  ok('a camera key takes handles too', cameraAt(cam, 0.5).s === 1.5 && cameraAt(cam, 0.15).s < 1.05);
}


// ---------- an authored filter survives a motion track ----------
// The motion track owns `style.filter` (it writes the velocity blur there) and used to strip EVERY
// `blur(...)` out of the current value before adding its own, on the assumption that any blur it found
// was its own from a previous frame. It cannot tell the two apart: an authored `filter: "blur(38px)"`
// is the same six characters. A layer that declared a blur AND carried a motion track lost the blur
// completely, on every frame, silently, with `filter: none` on the element and no error anywhere.
{
  const src = fs.readFileSync(new URL('../../core/tracks/motion.js', import.meta.url), 'utf8');
  ok('the motion track stashes its base filter rather than pattern-matching it',
    /el\.__hsBlur = \{ out: el\.style\.filter, base: fBase \}/.test(src));
  ok('it no longer strips blur\(\) out of whatever it finds', !/replace\(\/blur\\\(\[\^\)\]\*\\\)\/g/.test(src));
  // The stash is compared against the OUTPUT it produced, so a fresh write from build or an earlier
  // track is recognised as a new base. Storing what was written instead of reading it back is the bug
  // the idle track already logged: CSSOM re-serialises on the way in and the two never compare equal.
  ok('the base is recognised by comparing against its own output', /cur === prior\.out \? prior\.base : cur/.test(src));
}


// ---- a motion keyframe may not carry a property nothing interpolates -----------------------------
//
// Found by checking a claim rather than by a gate. The research pass said a keyable anchor point was
// declined because "a group does it", and a group gives a DIFFERENT FIXED pivot by nesting, never a
// travelling one. `origin` is a static CSS transform-origin written once at build, so a key carrying it
// was accepted and read by nothing: the author writes a pivot that travels and gets one that does not.
// Every unknown key was in that position, not just origin: {"t":0,"rot":0,"zzNonsense":5} validated clean.
{
  const { resolveKeyedProps, KEYFRAME_PROPS } = await import('../../core/timeline/sequence.js');
  const track = (extra) => [{ id: 'probe', type: 'rect', motion: [{ t: 0, rot: 0, ...extra }, { t: 1, rot: 45 }] }];
  const refuses = (extra) => { try { resolveKeyedProps(track(extra)); return null; } catch (e) { return e.message; } };

  ok('keyframe: `origin` is refused, because the pivot cannot travel',
    /origin/.test(refuses({ origin: '0% 50%' }) || ''));
  ok('keyframe: and the message says what to do instead',
    /key `ox`\/`oy`/.test(refuses({ origin: '0% 50%' }) || ''));
  ok('keyframe: any property nothing interpolates is refused, not just the one that found this',
    !!refuses({ zzNonsense: 5 }));
  ok('keyframe: the message lists what a keyframe DOES carry',
    /scale/.test(refuses({ zzNonsense: 5 }) || '') && /ease/.test(refuses({ zzNonsense: 5 }) || ''));
  ok('keyframe: a legal track still passes', refuses({ ease: 'settle' }) === null);
  // THE REGRESSION THIS CHECK ITSELF CAUSED, kept as a test rather than as a memory. The first cut of
  // KEYFRAME_PROPS was hand-written and guessed `in`/`out` for the bezier handles where the code says
  // `easeIn`/`easeOut` (core/timeline/sequence.js SIDES), so three shipped films were refused for writing the
  // CORRECT thing. A second list, written inside the check for second lists. The list is generated from
  // POSE and SIDES now, and these two assertions are what would have caught it.
  ok('keyframe: the real handle names are accepted', refuses({ easeIn: 'easyEase', easeOut: 'hang' }) === null);
  // A layer that declares w/h/track, because keying a BOX the layer never declared is a different and
  // correct refusal (there is nothing to animate from, engine-doctrine/MISTAKES.md #563).
  const boxed = (extra) => { try {
    resolveKeyedProps([{ id: 'probe', type: 'rect', w: 100, h: 50, track: 1,
      motion: [{ t: 0, rot: 0, ...extra }, { t: 1, rot: 45 }] }]); return null;
  } catch (e) { return e.message; } };
  ok('keyframe: every name in KEYFRAME_PROPS is one a keyframe can actually carry',
    KEYFRAME_PROPS.filter((p) => p !== 't')
      .every((p) => boxed({ [p]: p.startsWith('ease') ? 'linear' : 1 }) === null));
  // `dy` is the POSE's output name, not an authored one, so an author reading a pose and writing it
  // back gets silence. 32 keys in one shipped film were exactly that.
  ok('keyframe: a pose OUTPUT name is not an authored name', !!refuses({ dy: 90 }));
  ok('keyframe: an author annotation is left alone', refuses({ _why: 'a note' }) === null);

  // THE KEYABLE ANCHOR POINT. `origin` is static and always was; `ox`/`oy` are the travelling pivot,
  // as percentages of the layer's own box. A layer that never keys them must be untouched, because
  // every film in the library relies on that.
  const { motionAt } = await import('../../core/timeline/sequence.js');
  const pivot = motionAt([{ t: 0, rot: 0, ox: 0, oy: 50 }, { t: 1, rot: 45, ox: 100, oy: 50 }], 0.5);
  ok('anchor: the pivot travels between the keys', pivot.ox === 50 && pivot.oy === 50);
  const noPivot = motionAt([{ t: 0, rot: 0 }, { t: 1, rot: 45 }], 0.5);
  ok('anchor: a track that never keys it returns null, so the layer keeps its own origin',
    noPivot.ox === null && noPivot.oy === null);
  // Same rule as w/h: both endpoints state it or neither does. One-sided cannot mean "hold", because
  // that is the second interpretation rule engine-doctrine/MISTAKES.md #563 exists to refuse.
  ok('anchor: one endpoint alone is not enough',
    motionAt([{ t: 0, ox: 0 }, { t: 1, rot: 45 }], 0.5).ox === null);
  ok('anchor: the refusal for `origin` now names the thing that works',
    /ox/.test(refuses({ origin: '0% 50%' }) || ''));
  // ONE OWNER: the list the refusal reads is the list the evaluator interpolates.
  ok('keyframe: every property the evaluator reads is in KEYFRAME_PROPS',
    ['x', 'y', 'scale', 'rot', 'opacity', 'blur', 'w', 'h', 'track'].every((p) => KEYFRAME_PROPS.includes(p)));
}


// ---- motionDelay: follow-through on ONE layer -----------------------------------------------------
//
// Every property on a motion track used to stop on the same frame, which is the difference between a
// thing that moves and a thing that is moved. Measured before it was built: 138 of the library's 283
// motion tracks key position AND scale/rot/opacity together.
{
  const { motionAt } = await import('../../core/timeline/sequence.js');
  const kfs = [{ t: 0, x: 0, scale: 1, rot: 0 }, { t: 1, x: 100, scale: 2, rot: 90 }];

  // ABSENCE COSTS NOTHING AND CHANGES NOTHING. Every film in the library renders through this call,
  // so the undelayed path must be identical, not merely close.
  ok('motionDelay: a track without one is byte-identical to before',
    JSON.stringify(motionAt(kfs, 0.5)) === JSON.stringify(motionAt(kfs, 0.5, undefined))
    && JSON.stringify(motionAt(kfs, 0.5, 0)) === JSON.stringify(motionAt(kfs, 0.5)));

  // THE POINT: one property lags, the others do not move with it.
  const lagged = motionAt(kfs, 0.5, { scale: 0.3 });
  const plain = motionAt(kfs, 0.5);
  ok('motionDelay: the delayed property reads EARLIER on the same track', lagged.scale < plain.scale);
  ok('motionDelay: and every other property is untouched',
    lagged.dx === plain.dx && lagged.rot === plain.rot);

  // A scalar delays everything, which is the original meaning varsDelay also carries.
  const all = motionAt(kfs, 0.5, 0.3);
  ok('motionDelay: a number delays every property', all.dx < plain.dx && all.scale < plain.scale);
  // and `*` is the map's own default, so a map can delay everything EXCEPT one thing.
  const star = motionAt(kfs, 0.5, { '*': 0.3, x: 0 });
  ok('motionDelay: `*` is the map default and a named 0 opts one property back out',
    star.dx === plain.dx && star.scale < plain.scale);

  // PURITY. A shifted pure function is still pure, and renderFrame(n) depends on it.
  ok('motionDelay: the same t returns the same pose',
    JSON.stringify(motionAt(kfs, 0.42, { rot: 0.1 })) === JSON.stringify(motionAt(kfs, 0.42, { rot: 0.1 })));

  // A LAYER-OWNED PROP THE TRACK NEVER KEYS MUST STAY null. Sampling it earlier would hand the caller
  // a number for a property the author never animated, which is exactly the class engine-doctrine/MISTAKES.md #563
  // is about: a size reinterpreted without anything saying so.
  ok('motionDelay: an unkeyed layer-owned property stays null rather than becoming a number',
    motionAt(kfs, 0.5, { '*': 0.2 }).w === null);
}


// ---- EASINGS.hold: the one interpolation that must NOT travel -----------------------------------
//
// Every other entry in the table is continuous and lands at 1. A hold is the opposite by design, so a
// future tidy-up that "fixes" it to ease would silently turn every stepped swap into a 33ms slide. It
// is asserted at the ends AND in the middle, because a curve that merely starts and finishes right is
// exactly what a hold is not.
{
  const { EASINGS, resolveEasing } = await import('../../core/motion/motion.js');
  const h = EASINGS.hold;
  ok('motion: hold does not travel anywhere inside its segment',
    [0, 0.01, 0.25, 0.5, 0.75, 0.99, 0.999999].every((t) => h(t) === 0));
  ok('motion: hold jumps to 1 exactly at the far key', h(1) === 1);
  ok('motion: hold is reachable by name, like every other easing',
    typeof resolveEasing('hold') === 'function' && resolveEasing('hold')(0.5) === 0);
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 138, `expected at least 138 assertions (the count this file was split with) to have run, saw ${pass}`);
});
