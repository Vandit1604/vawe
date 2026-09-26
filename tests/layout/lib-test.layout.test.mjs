import test from 'node:test';
import assert from 'node:assert/strict';
// tests/layout/lib-test.layout.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/layout/lib-test.layout.test.mjs  (make test)
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

test('lib-test: layout', async () => {
// ---- the safe area ----
// The point of core/layout/safe.js is that ONE function answers "where may content live", so the asserts that
// matter are the relationships the four old tables got wrong, not the arithmetic.
{
  const A = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350] };

  ok('safe: unknown destination throws (never a silent default box)',
    (() => { try { safeArea(1080, 1920, 'nope'); return false; } catch { return true; } })());

  // web = margin only. This is the default precisely so that a portrait canvas does NOT inherit a
  // phone feed's caption strip just for being taller than it is wide, the bug this module exists for.
  const web = safeArea(1080, 1920, 'web');
  ok('safe: web is symmetric margin only', web.x0 === web.margin && web.y0 === web.margin
    && web.x1 === 1080 - web.margin && web.y1 === 1920 - web.margin);
  ok('safe: margin is 6% of the SHORT edge at every ratio',
    Object.values(A).every(([w, h]) => safeArea(w, h, 'web').margin === Math.round(Math.min(w, h) * 0.06)));

  // The regression that started this: 1:1 and 4:5 were classed "portrait" and given TikTok's 240/580,
  // reserving 76% of a square's height. A square destined for a feed must keep essentially all of it.
  const sq = safeArea(1080, 1080, 'feed');
  ok(`safe: 1:1 feed keeps its frame (was 24% usable, now ${(100 * (sq.y1 - sq.y0) / 1080).toFixed(0)}%)`,
    (sq.y1 - sq.y0) / 1080 > 0.85);
  ok('safe: 4:5 feed keeps its frame', (() => { const s = safeArea(1080, 1350, 'feed'); return (s.y1 - s.y0) / 1350 > 0.85; })());

  // tiktok must still reproduce the repo's existing portrait box, those are the only platform numbers
  // with provenance, so carrying them over as fractions must not quietly change them.
  const tt = safeArea(1080, 1920, 'tiktok');
  ok(`safe: tiktok 9:16 keeps the historic chrome (y0=${tt.y0} y1=${tt.y1} x1=${tt.x1})`,
    tt.y0 === 240 && tt.y1 === 1340 && tt.x1 === 900);

  // captionBand: the strip a burnt-in caption occupies, so a headline can be kept off it. Derived from
  // safeArea rather than from a second table, because the platform's chrome is not a property of the
  // aspect and one definition of that has to be enough (engine-doctrine/MISTAKES.md #409, #165).
  {
    const web = captionBand(1080, 1920, 'web');
    const tik = captionBand(1080, 1920, 'tiktok');
    ok('captionBand: it sits at the bottom and has real height',
      web.y1 <= 1920 && web.y0 < web.y1 && web.height > 0);
    // The band must RISE with the platform's chrome. tiktok reserves 0.302 of the bottom against web's
    // smaller box, so the same caption sits higher, and a band that ignored destination would place a
    // keep-out over pixels the caption cannot use.
    ok(`captionBand: tiktok sits above web (tiktok y1=${tik.y1} < web y1=${web.y1})`, tik.y1 < web.y1);
    // It must agree with safeArea's own bottom edge rather than drifting from it.
    ok('captionBand: never reaches below the destination safe area', tik.y1 <= safeArea(1080, 1920, 'tiktok').y1);
  }
  ok('safe: tiktok reserves more than web (chrome is real)', tt.y1 < web.y1 && tt.x1 < web.x1);

  // max(), never sum: a platform rail already reaches the frame edge, so adding margin double-counts.
  ok('safe: chrome and margin combine with max, not +',
    tt.x0 === tt.margin && tt.y0 === Math.round(1920 * 0.125));

  // Every destination must produce a box that is inside the canvas and non-empty at its native ratio.
  const bad = [];
  for (const name of DESTINATION_NAMES) {
    const [w, h] = A[nativeAspect(name) || '16:9'];
    const s = safeArea(w, h, name);
    if (!(s.x0 >= 0 && s.y0 >= 0 && s.x1 <= w && s.y1 <= h && s.x1 > s.x0 && s.y1 > s.y0)) bad.push(name);
  }
  ok(`safe: all ${DESTINATION_NAMES.length} destinations yield a valid box${bad.length ? ': ' + bad.join(', ') : ''}`, bad.length === 0);
  ok('safe: nativeAspect is null for the canvas-agnostic ones',
    nativeAspect('web') === null && nativeAspect('feed') === null && nativeAspect('tiktok') === '9:16');
}


// ---- the frame object, and the settled-off-frame report ----
// frameOf() is the one builder every consumer RECEIVES from, so what matters is that it agrees with
// the two functions it is made of, at every ratio and every destination. outOfFrame() is the check at
// the placement funnel, and the assert that earns its place is the third one: a layer MID-ENTRANCE is
// legitimately off-frame and must never be reported (the rule quality/audit.mjs learned in #376).
{
  const ratios = ['16:9', '9:16', '1:1', '4:5', '4:3'];
  const wrong = [];
  for (const key of ratios) for (const dest of DESTINATION_NAMES) {
    const f = frameOf({ destination: dest }, key);
    const [w, h] = sceneDims({}, key);
    const s = safeArea(w, h, dest);
    if (f.W !== w || f.H !== h || f.aspect !== key || f.destination !== dest) wrong.push(`${key}/${dest}: dims`);
    if (JSON.stringify(f.safe) !== JSON.stringify(s)) wrong.push(`${key}/${dest}: safe box`);
  }
  ok(`frame: frameOf agrees with sceneDims+safeArea at ${ratios.length} ratios x ${DESTINATION_NAMES.length} destinations`
    + (wrong.length ? ': ' + wrong.slice(0, 3).join('; ') : ''), wrong.length === 0);
  ok('frame: a 4:3 canvas is 1440x1080, not the long-edge fallback',
    frameOf({ aspect: '4:3' }).W === 1440 && frameOf({ aspect: '4:3' }).H === 1080);
  ok('frame: explicit pixel dims win, so a view outside boot gets its real canvas',
    (() => { const f = frameOf({ W: 1440, H: 1080, destination: 'web' }); return f.W === 1440 && f.H === 1080; })());
  ok('frame: destination reaches the safe box (tiktok chrome, not just margin)',
    frameOf({ destination: 'tiktok' }, '9:16').safe.y1 === 1340);
  ok('frame: an unknown destination throws here too, never a silent web box',
    (() => { try { frameOf({ destination: 'nope' }, '9:16'); return false; } catch { return true; } })());

  const F = frameOf({}, '16:9');                                   // 1920x1080
  const settled = { type: 'text', x: 1700, y: 100, w: 600, h: 120, start: 0, duration: 6 };
  ok('bounds: a SETTLED box hanging off the right edge is reported, with the overhang',
    (() => { const r = outOfFrame(settled, F); return !!r && r.over.right === 380 && r.over.left === 0; })());
  ok('bounds: a box inside the frame reports nothing',
    outOfFrame({ type: 'text', x: 100, y: 100, w: 600, h: 120, start: 0, duration: 6 }, F) === null);

  // THE ONE THAT MATTERS. Same box, same layer, graded 0.1s in: it is still sliding on, so there is no
  // verdict to give. A check without this fires on every well-made entrance in the library.
  ok('bounds: the SAME box mid-entrance is NOT reported (arrived-only, engine-doctrine/MISTAKES.md #390)',
    outOfFrame(settled, F, 0.1) === null);
  ok('bounds: settleWindow uses audit.mjs\'s own numbers (start+enter+pad)',
    settleWindow({ start: 1, duration: 5 }).t0 === 1 + 0.45 + 0.06);
  ok('bounds: a MOVING exit ends the settled window early, a fading one does not',
    settleWindow({ start: 0, duration: 5, out: 'slide-left' }).t1 === 5 - 0.4 - 0.06
    && settleWindow({ start: 0, duration: 5 }).t1 === 5);
  ok('bounds: a layer that never comes to rest is never graded',
    settleWindow({ start: 0, duration: 0.2 }) === null
    && outOfFrame({ ...settled, duration: 0.2 }, F) === null);
  ok('bounds: an unplaced layer is the stylesheet\'s business, not the check\'s',
    outOfFrame({ type: 'text', w: 600, start: 0, duration: 6 }, F) === null);

  // REPORT ONLY. It must return findings and print, and it must not throw, the refusal is a later
  // decision for a human holding the count of shipped films it would fail.
  ok('bounds: reportBounds returns findings and never throws',
    (() => { const lines = []; const out = reportBounds([settled, { type: 'rect', x: 10, y: 10, w: 100, h: 100, start: 0, duration: 6 }], F, (s) => lines.push(s));
      return out.length === 1 && lines.length === 1 && /frame-bounds/.test(lines[0]); })());
  ok('bounds: the check is OFF unless asked for', boundsCheckOn() === false);
}


// ---- sceneDims (core/layout/safe.js): how big is the frame, asked once ----
{
  ok('dims: aspect wins', sceneDims({ aspect: '16:9' }).join() === '1920,1080');
  ok('dims: portrait aspect', sceneDims({ aspect: '9:16' }).join() === '1080,1920');
  ok('dims: an explicit key overrides the scene', sceneDims({ aspect: '9:16' }, '1:1').join() === '1080,1080');
  ok('dims: legacy orientation still honoured', sceneDims({ orientation: 'landscape' }).join() === '1920,1080');
  ok('dims: portrait is the default', sceneDims({}).join() === '1080,1920');
  // THE regression: `aspect` must beat the absence of `orientation`. Five tools read only the latter,
  // so every 16:9 scene rendered into a portrait viewport and was silently cropped (MISTAKES #46).
  ok('dims: aspect alone is enough (no orientation field)', sceneDims({ aspect: '16:9' })[0] === 1920);
  ok('dims: an unnamed ratio fits the long edge', sceneDims({ aspect: '21:9' }).join() === '1920,823');
}


// ---- ONE definition of the canvas: no tool may re-derive dimensions from `orientation` ----
// core/layout/safe.js exists because four copies of the safe box disagreed; the same then happened to the
// frame size across eight call sites. This asserts the copies stay gone rather than trusting a memo.
{
  const scan = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : scan(fp);
    return /\.(mjs|js)$/.test(e.name) ? [fp] : [];
  });
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const offenders = [];
  for (const fp of [...scan(path.join(root, 'scripts')), ...scan(path.join(root, 'harness')), ...scan(path.join(root, 'quality')), ...scan(path.join(root, 'core'))]) {
    if (fp.endsWith(path.join('core', 'safe.js')) || fp.endsWith(path.join('gates', 'lib-test.mjs'))) continue;
    const src = fs.readFileSync(fp, 'utf8');
    if (/landscape\s*\?\s*(1920\s*:\s*1080|\[1920)/.test(src)) offenders.push(path.relative(root, fp));
  }
  ok(`dims: nobody re-derives the canvas (${offenders.join(', ') || 'clean'})`, offenders.length === 0);
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 35, `expected at least 35 assertions (the count this file was split with) to have run, saw ${pass}`);
});
