import test from 'node:test';
import assert from 'node:assert/strict';
// tests/registry/lib-test.registry.test.mjs: fast pure-JS asserts, split by domain out of the old quality/gates/lib-test.mjs.
// No browser needed (the primitives are pure). Run: node tests/registry/lib-test.registry.test.mjs  (make test)
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

test('lib-test: registry', async () => {
// ---- core/registry/vocab.js: the plain words, accepted where the concrete value is ----
// The words are ALIASES. Three things have to hold or the whole idea is a second vocabulary that lies:
// every word resolves, every word resolves to the SAME thing its target does, and a concrete value is
// untouched by their existence. The fourth is that a typo is refused with its near misses.
{
  ok('vocab: every FEEL word resolves to its own target curve',
    Object.entries(FEEL).every(([w, t]) => typeof resolveEasing(w) === 'function' && resolveEasing(w) === EASINGS[t]));
  ok('vocab: every DURATION word is a positive number of seconds',
    Object.values(DURATION).every((s) => typeof s === 'number' && s > 0 && s <= 3));
  ok('vocab: every CAMERA word names a move that exists',
    Object.values(CAMERA_WORDS).every((t) => CAMERA_MOVE_NAMES.includes(t)));
  // The far side of every alias, asked of the real registries. A rename over there is caught here,
  // because core/registry/vocab.js is a leaf (core/motion/motion.js imports it) and cannot check itself at import.
  ok('vocab: verifyVocab finds no dangling target',
    verifyVocab({ easings: Object.keys(EASINGS), cameraMoves: CAMERA_MOVE_NAMES }).length === 0);
  // A word that shadows a curve would be unreachable: resolveEasing finds EASINGS first, so the word
  // would silently mean the curve. That is the substitution this file exists to prevent, one level up.
  ok('vocab: no FEEL word shadows an EASINGS name', Object.keys(FEEL).every((w) => !(w in EASINGS)));
  // Same argument across families: `pop` in two of them would render one meaning in the catalogue.
  ok('vocab: the three families share no word', (() => {
    const all = [...Object.keys(FEEL), ...Object.keys(DURATION), ...Object.keys(CAMERA_WORDS)];
    return new Set(all).size === all.length;
  })());
  // `medium` is BASE_ENTER. Asserted rather than imported: core/timeline/clips.js imports core/motion/motion.js, which
  // imports core/registry/vocab.js, and the cycle is not worth one constant.
  ok('vocab: `medium` is the engine\'s own default entrance (BASE_ENTER)', DURATION.medium === BASE_ENTER);

  // PASSTHROUGH: the non-negotiable. A scene naming a number or a real name is untouched.
  ok('vocab: a concrete duration passes through unchanged',
    resolveSeconds(0.42) === 0.42 && resolveSeconds(0) === 0 && resolveSeconds(null) === null && resolveSeconds(undefined) === undefined);
  ok('vocab: a concrete easing name still wins over the word list', resolveEasing('settle') === EASINGS.settle);
  ok('vocab: a real camera move name passes through', resolveCameraMove('slowPush') === 'slowPush');
  ok('vocab: a shot word becomes its move name', resolveCameraMove('pull back') === 'workspaceZoomOut');

  // REFUSAL, with the near misses named. Never a fallback.
  ok('vocab: an unknown feel word throws and names the near misses', (() => {
    try { resolveEasing('snapy'); return false; }
    catch (e) { return /unknown easing/.test(e.message) && /Did you mean/.test(e.message) && /"snappy"/.test(e.message); }
  })());
  ok('vocab: an unknown duration word throws and names the near misses', (() => {
    try { resolveSeconds('fastt'); return false; }
    catch (e) { return /unknown duration word/.test(e.message) && /did you mean "fast"/.test(e.message); }
  })());
  ok('vocab: resolveSeconds never substitutes a default', (() => {
    try { resolveSeconds('quick'); return false; } catch { return true; }
  })());
  // A feel word written into a slot that takes a different vocabulary is DIAGNOSED, not just rejected.
  // The cross-registry hint core/registry/registry.js exists for.
  ok('vocab: a feel word in the `anim` slot is named as a feel word', (() => {
    try { ANIM_REGISTRY.pick('snappy'); return false; }
    catch (e) { return /feel word/.test(e.message) && /ease: "snappy"/.test(e.message); }
  })());

  // The LOWERING pass is where a duration word becomes seconds for a layer. Idempotent, and it must
  // reach a group's children or a word works at one nesting level and NaNs at the next.
  ok('vocab: lowerScene resolves the layer timing words', (() => {
    const d = lowerScene({ layers: [{ text: 'A', enterDur: 'fast', exitDur: 'instant', duration: 'slow' }] });
    const L = d.layers[0];
    return L.enterDur === DURATION.fast && L.exitDur === DURATION.instant && L.duration === DURATION.slow;
  })());
  ok('vocab: lowerScene resolves words inside a group\'s children', (() => {
    const d = lowerScene({ layers: [{ type: 'group', children: [{ text: 'A', enterDur: 'medium' }] }] });
    return d.layers[0].children[0].enterDur === DURATION.medium;
  })());
  // `layers[].transition` (sugar over anim/out/dir/enterDur/exitDur) measured zero users and was
  // removed (#gsap-audit). It must REFUSE now, not silently accept and ignore: an unknown prop, not a
  // dead one that renders nothing.
  ok('vocab: a layer carrying the removed `transition` sugar is refused, not ignored', (() => {
    try { checkLayer({ type: 'text', transition: { in: 'rise' } }, {}, 'layers[0]'); return false; }
    catch (e) { return /unknown prop `transition`/.test(e.message); }
  })());
  // feather/angle: the two seam knobs, carried by lowerScene's `transitions` -> `seams` push.
  ok('vocab: lowerScene carries feather from transitions into seams', (() => {
    const d = lowerScene({ transitions: [{ at: 2, fx: 'wipe', mech: 'seam', feather: 0.12 }] });
    return d.seams[0].feather === 0.12;
  })());
  ok('vocab: lowerScene carries a numeric dir (angle) from transitions into seams', (() => {
    const d = lowerScene({ transitions: [{ at: 2, fx: 'wipe', mech: 'seam', dir: 35 }] });
    return d.seams[0].dir === 35;
  })());
  // COMPARATIVE: a direction over the DURATION ladder, not an absolute alias.
  ok('vocab: every COMPARATIVE word resolves to a real duration',
    Object.keys(COMPARATIVE).every((w) => Object.values(DURATION).includes(resolveComparative(w, 'medium'))));
  ok('vocab: faster from medium is fast, slower from medium is slow',
    resolveComparative('faster', 'medium') === DURATION.fast && resolveComparative('slower', 'medium') === DURATION.slow);
  // aka is the SEARCH index only (`make arsenal Q="snappier"`), same contract as every other
  // registry's aka: it is never a second spelling `pick()` itself accepts.
  ok('vocab: a comparative aka is not itself a resolvable word', (() => {
    try { resolveComparative('snappier', 'medium'); return false; } catch { return true; }
  })());
  // A step past either end of the ladder CLAMPS, it does not throw: there is nowhere shorter than
  // `instant` or longer than `luxurious` for the step to land.
  ok('vocab: faster past `instant` clamps at `instant`', resolveComparative('faster', 'instant') === DURATION.instant);
  ok('vocab: slower past `luxurious` clamps at `luxurious`', resolveComparative('slower', 'luxurious') === DURATION.luxurious);
  ok('vocab: resolveComparative defaults `current` to medium when absent',
    resolveComparative('faster', null) === DURATION.fast && resolveComparative('faster', undefined) === DURATION.fast);
  ok('vocab: resolveComparative snaps a bare number to its nearest ladder rung first',
    resolveComparative('slower', 0.58) === DURATION.luxurious); // nearest to 0.58 is `slow` (0.6), one step past it
  ok('vocab: an unknown comparative word throws and names the near misses', (() => {
    try { resolveComparative('fastr', 'medium'); return false; }
    catch (e) { return /comparative duration word/.test(e.message) && /"faster"/.test(e.message); }
  })());

  // energy: the film-wide default speed curve (core/transitions/energy.js), applied by lowerScene.
  ok('energy: every ENERGY value is a real TIMINGS curve', Object.values(ENERGY).every((t) => t in TIMINGS));
  ok('energy: okEnergy passes a known word and null, throws on an unknown', (() => {
    if (okEnergy('brand') !== 'brand' || okEnergy(null) !== null) return false;
    try { okEnergy('loud'); return false; } catch { return true; }
  })());
  ok('energy: lowerScene fills the timing of a hand-authored cut that names none', (() => {
    const d = lowerScene({ energy: 'hype', cuts: [{ t: 2, style: 'push' }] });
    return d.cuts[0].timing === ENERGY.hype; // 'snappy'
  })());
  ok('energy: an explicit timing on a cut beats the energy band', (() => {
    const d = lowerScene({ energy: 'hype', cuts: [{ t: 2, style: 'push', timing: 'ramp' }] });
    return d.cuts[0].timing === 'ramp';
  })());
  ok('energy: a film with no energy re-lowers byte-identical (no timing written)', (() => {
    const d = lowerScene({ cuts: [{ t: 2, style: 'push' }] });
    return d.cuts[0].timing === undefined;
  })());
  ok('energy: the band reaches a seam pushed through the transitions sugar', (() => {
    const d = lowerScene({ energy: 'calm', transitions: [{ at: 2, fx: 'wipe', mech: 'seam' }] });
    return d.seams[0].timing === ENERGY.calm; // 'out'
  })());

  // `transitions[]` is the ONLY authored junction form now; `cuts`/`stings`/`seams` are the internal
  // shape it lowers to (core/transitions/lower.js). An author who still writes one directly is refused
  // at validate, not silently accepted (harness/author/migrate-junctions.mjs converts an old scene).
  ok('validate: an authored cuts[] is refused, naming the migration script', (() => {
    const e = authoredJunctionErrors({ cuts: [{ t: 2, style: 'fade' }] });
    return e.length === 1 && /cuts\[\]/.test(e[0]) && /migrate-junctions\.mjs/.test(e[0]);
  })());
  ok('validate: an authored stings[]/seams[] is refused the same way', (() => {
    return authoredJunctionErrors({ stings: [{ t: 1, fx: 'flash' }] }).length === 1
      && authoredJunctionErrors({ seams: [{ t: 1, fx: 'wipe' }] }).length === 1;
  })());
  ok('validate: a scene with no raw junction key passes clean', authoredJunctionErrors({ transitions: [{ at: 1, fx: 'fade' }] }).length === 0);
  // `none` is a real cut (a hard cut with no visual transition) but sits outside the catalog's cut row
  // (core/transitions/catalog.js: nothing to browse in `make transitions`); it must still ROUTE as a
  // boundary cut, the same thing raw `cuts[].style:"none"` always meant.
  ok('lowering: a boundary transition can say "none", and it routes to cut', (() => {
    const d = lowerScene({ transitions: [{ at: 2, fx: 'none' }] });
    return d.cuts?.[0]?.style === 'none';
  })());

  // migrate-junctions.mjs: the round-trip proof itself, not just its result on the library.
  ok('migrate: raising a raw cut into transitions[] round-trips through lowerScene', (() => {
    const old = { cuts: [{ t: 2, style: 'punch', dur: 0.3 }] };
    const { next, ok: matched } = migrateOne(structuredClone(old));
    return matched && Array.isArray(next.transitions) && next.cuts === undefined
      && junctionDeepEqual(lowerScene(structuredClone(old)).cuts, lowerScene(structuredClone(next)).cuts);
  })());
  ok('migrate: a scene with no raw junction key is left untouched (clean, not rewritten)', (() => {
    const { next, ok: matched, clean } = migrateOne({ layers: [] });
    return clean === true && matched && next.transitions === undefined;
  })());
  // the one real conflict: a bare motion fx (RAMP_BY_DEFAULT) with no `timing` and no `energy` would
  // silently gain a ramp through transitions[] sugar. `raise` must PIN the true old default (`smooth`)
  // so the round trip still matches rather than silently re-timing the cut.
  ok('migrate: a bare ramp-eligible cut is pinned to `smooth`, and still round-trips', (() => {
    const old = { cuts: [{ t: 2, style: 'zoom' }] };
    const { next, ok: matched } = migrateOne(structuredClone(old));
    return matched && next.transitions[0].timing === 'smooth';
  })());
  ok('migrate: an author note (`_why`) on a raw seam survives into transitions[]', (() => {
    const old = { seams: [{ t: 2, fx: 'wipe', _why: 'soft edge' }] };
    const { next, ok: matched } = migrateOne(structuredClone(old));
    return matched && next.transitions[0]._why === 'soft edge'
      && lowerScene(structuredClone(next)).seams[0]._why === 'soft edge';
  })());
  ok('migrate: raise() marks the mechanism explicitly, so an ambiguous name (wipe) still routes right', (() => {
    const t = raiseJunction({ t: 1, fx: 'wipe' }, 'stings', {});
    return t.mech === 'sting' && boundaryMechanism(t.fx, t.mech) === 'sting';
  })());
  ok('vocab: seam dirVec resolves a numeric angle to a unit vector', (() => {
    const [x, y] = seamDirVec(90); // 90deg = up = [0,1] on this shader's y-up uv
    return Math.abs(x) < 1e-9 && Math.abs(y - 1) < 1e-9;
  })());
  ok('vocab: seam dirVec still resolves the 4 cardinal names, unchanged', (() => {
    const [x, y] = seamDirVec('right');
    return x === 1 && y === 0;
  })());
  ok('vocab: seam featherFor uses the per-fx default when opts.feather is absent',
    seamFeatherFor('wipe', 1, {}) === 0.015 && seamFeatherFor('blindsWipe', 1, {}) === 0.06);
  ok('vocab: seam featherFor honours an explicit opts.feather over the default',
    seamFeatherFor('wipe', 1, { feather: 0.12 }) === 0.12);
  ok('vocab: seam featherFor irisRound default tracks intensity, byte-identical to its old inline formula',
    seamFeatherFor('irisRound', 2, {}) === 0.02 + 0.04 * 2);
  ok('vocab: lowering is idempotent (a resolved number stays itself)', (() => {
    const d = lowerScene({ layers: [{ text: 'A', enterDur: 'fast' }] });
    return lowerScene(d).layers[0].enterDur === DURATION.fast;
  })());
  // The validator must accept what the renderer accepts and refuse what it refuses, at the entry point.
  ok('vocab: validate accepts a known duration word',
    durationWordErrors({ layers: [{ enterDur: 'fast' }] }).length === 0);
  ok('vocab: validate refuses an unknown one, naming the slot', (() => {
    const e = durationWordErrors({ layers: [{ enterDur: 'quick' }] });
    return e.length === 1 && /layers\[0\]\.enterDur/.test(e[0]) && /unknown duration word/.test(e[0]);
  })());
  ok('vocab: easeErrors accepts a feel word in an engine-driven field',
    easeErrors({ layers: [{ motion: [{ t: 0 }, { t: 1, ease: 'snappy' }] }] }).length === 0);
  // The camera sugar takes the shot word and builds the same keyframes the move name builds.
  ok('vocab: buildCameraMove takes a shot word', (() => {
    const a = JSON.stringify(buildCameraMove({ move: 'push in' }));
    return a === JSON.stringify(buildCameraMove({ move: 'slowPush' }));
  })());
}

// The engine carries TWO easing vocabularies and the FIELD decides which is in force. A GSAP ease is
// now an ALIAS onto its engine equivalent (resolveGsapAlias, core/motion.js), so it is allowed on an
// engine field too; a name with no engine equivalent (`steps`) still names the #381 wrong-slot mistake.
ok('easeErrors: an aliased GSAP ease in an engine field is allowed, an unaliased one still caught', (() => {
  const ok1 = easeErrors({ layers: [{ motion: [{ t: 0 }, { t: 1, ease: 'power2.inOut' }] }] }).length === 0;
  const e = easeErrors({ layers: [{ motion: [{ t: 0 }, { t: 1, ease: 'steps(4)' }] }] });
  return ok1 && e.length === 1 && /GSAP ease/.test(e[0]);
})());
ok('easeErrors: a GSAP ease in a GSAP field is allowed', easeErrors({ layers: [
  { parts: [{ select: 'rect', anim: 'growUp', ease: 'power2.inOut' }] },
  { morph: { to: 'x', ease: 'power3.inOut' } },
  { fx: { name: 'blurIn', ease: 'back.out(1.7)' } },
]}).length === 0);
ok('easeErrors: an engine ease in an engine field is allowed', easeErrors({
  layers: [{ motion: [{ t: 0 }, { t: 1, ease: 'easeOutCubic' }], varsEase: { '*': 'ramp', o: 'snap' } }],
  camera: [{ t: 0 }, { t: 1, ease: 'easeInOutSine' }],
}).length === 0);

// The DIRECTION of every named wipe in the layer registry (core/timeline/clips.js ANIM). Counting names cannot
// see this: `wipe-right` was registered as wipe(t,'right') and therefore revealed right-to-left, against
// its own name and the comment beside it, and no gate could tell. A wipe is named for the edge its
// reveal TRAVELS TOWARD; core/cuts `wipe(dir)` names the edge it grows FROM, so each pair is crossed.
// inset(top right bottom left): the side whose inset SHRINKS is the side the reveal moves toward.
ok('wipe-right grows rightward from the left edge', ANIM['wipe-right'](0.5).clipPath === 'inset(0 50% 0 0)');
ok('wipe-left grows leftward from the right edge', ANIM['wipe-left'](0.5).clipPath === 'inset(0 0 0 50%)');
ok('wipe-down grows downward from the top edge', ANIM['wipe-down'](0.5).clipPath === 'inset(0 0 50% 0)');
ok('wipe-up grows upward from the bottom edge', ANIM['wipe-up'](0.5).clipPath === 'inset(50% 0 0 0)');
ok('plain wipe is the default direction, rightward', ANIM.wipe(0.5).clipPath === ANIM['wipe-right'](0.5).clipPath);
ok('every wipe direction is a distinct reveal', new Set(['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down'].map((n) => ANIM[n](0.5).clipPath)).size === 4);


// ---- the block registry ----
// Nothing tested blocks/ at all, so a manifest row naming a family that does not exist, or a factory
// returning junk, only surfaced when someone rendered a catalog sheet and looked at it. These asserts
// hold the registry's actual contract (index.mjs header): every factory returns an ARRAY of layer
// objects, and same props → same layers.
{
  const names = Object.keys(BLOCKS);
  ok(`registry: ${names.length} blocks exported`, names.length > 0);

  // Call each row the way `make catalog` does: family factory + the manifest's props. A BARE name in
  // the registry is the raw factory with NO props merged, so calling it by name yields an empty block
  // (captions with no lines is correctly []). That is the registry working, not a bug to assert on.
  const build = (e, opts = {}) => BLOCKS[e.family]({ ...(e.props || {}), x: 100, y: 100, start: 0, dur: 4, ...opts });
  const bad = [];
  for (const e of CATALOG) {
    if (!BLOCKS[e.name]) { bad.push(`${e.name}: not in registry`); continue; }
    if (!BLOCKS[e.family]) { bad.push(`${e.name}: family "${e.family}" has no factory`); continue; }
    let out;
    try { out = build(e); }
    catch (err) { bad.push(`${e.name}: threw ${err.message}`); continue; }
    if (!Array.isArray(out) || !out.length) { bad.push(`${e.name}: did not return a non-empty array`); continue; }
    if (!out.every((L) => L && typeof L === 'object' && typeof L.type === 'string'))
      bad.push(`${e.name}: returned a layer with no type`);
    // The schema's `size` min is 18, and the validator checks TOP-LEVEL layers, so a block emitting a
    // smaller top-level size is a scene that cannot boot. Group children are not validated (which is
    // why card.stat's 15px inner label is legal), so this only asserts what the validator enforces.
    const small = out.filter((L) => typeof L.size === 'number' && L.size < 18).map((L) => L.size);
    if (small.length) bad.push(`${e.name}: top-level text size ${small.join(',')} < the schema's 18px min`);
  }
  ok(`registry: all ${CATALOG.length} manifest rows resolve + build${bad.length ? ': ' + bad.slice(0, 3).join(' · ') : ''}`, bad.length === 0);

  // ── A FACTORY WITH NO CATALOG ROW IS INVISIBLE, AND blocks/index.mjs NOW REFUSES ONE ─────────
  // The direction that loses authored work: it renders if you know its name and appears in no
  // catalog, no doc, no registry item and no search. Six codeBlock themes shipped that way. The
  // refusal is at the write site (module load), so this asserts the two halves of it that a bad edit
  // could quietly widen: every discovered factory is accounted for, and every exemption gives a
  // reason. An exemption with an empty reason is how the list becomes the hiding place.
  {
    const families = new Set(CATALOG.map((e) => e.family));
    const orphans = Object.keys(CATEGORY_OF).filter((n) => !families.has(n) && !NOT_A_BLOCK[n]);
    ok(`registry: every factory has a catalog row or a named exemption${orphans.length ? ': ' + orphans.join(', ') : ''}`,
      orphans.length === 0);
    const unreasoned = Object.entries(NOT_A_BLOCK).filter(([, why]) => typeof why !== 'string' || why.length < 20);
    ok(`registry: every NOT_A_BLOCK exemption carries a reason${unreasoned.length ? ': ' + unreasoned.map(([n]) => n).join(', ') : ''}`,
      unreasoned.length === 0);
    // The exemptions must stay EXEMPTIONS: a name here that later gets a catalog row is a block being
    // hidden from every listing by a stale line nobody re-read.
    const shadowed = Object.keys(NOT_A_BLOCK).filter((n) => families.has(n));
    ok(`registry: no NOT_A_BLOCK name also has a catalog row${shadowed.length ? ': ' + shadowed.join(', ') : ''}`,
      shadowed.length === 0);
  }

  // determinism is the product; a block that reads a clock or Math.random breaks every render.
  const drift = CATALOG.filter((e) => BLOCKS[e.family]).filter((e) => {
    try { return JSON.stringify(build(e, { x: 10, start: 1 })) !== JSON.stringify(build(e, { x: 10, start: 1 })); }
    catch { return false; }
  });
  ok(`registry: every block is deterministic${drift.length ? ': ' + drift.map((e) => e.name).join(', ') : ''}`, drift.length === 0);

  // ── THE DIALS `make arsenal` PUBLISHES ARE THE TABLE, NOT A COPY OF IT ────────────────────────
  // harness/author/block-dials.mjs reads each family's option table and harvests the note written
  // above each dial out of the module's SOURCE. The table half cannot drift (it is the same object),
  // but the note half is a line scan, and the way a line scan fails is silent: one unbalanced brace
  // and it starts attributing a note to the wrong dial, or reading a family that ended ten lines ago.
  // So the check is that the published rows are exactly the table's keys, in the table's order, with
  // the table's defaults, for every family, which is what a drifting scan stops being true of.
  {
    const { SCHEMAS } = await import('../../blocks/index.mjs');
    const { dialsFor } = await import('../../harness/author/block-dials.mjs');
    const bad = [];
    for (const family of Object.keys(SCHEMAS)) {
      const rows = await dialsFor(family, { withNotes: true });
      const keys = Object.keys(SCHEMAS[family]);
      if (rows.map((r) => r.name).join(',') !== keys.join(',')) { bad.push(`${family}: keys or order`); continue; }
      for (const r of rows) {
        if (JSON.stringify(r.def) !== JSON.stringify(SCHEMAS[family][r.name].def)) bad.push(`${family}.${r.name}: default`);
        // A note that swallowed a line of the table itself is the shape a broken scan produces, and a
        // key check cannot see it. Tested by the table's OWN vocabulary, not by punctuation: two real
        // notes describe a data shape as `[{code, value}]` and `{x,y}`, so a brace proves nothing.
        if (r.note && /\bkind:\s*'/.test(r.note)) bad.push(`${family}.${r.name}: note caught source`);
      }
    }
    ok(`block-dials: every family publishes its own table, keys, order and defaults${bad.length ? ': ' + bad.slice(0, 6).join(' · ') : ''}`,
      bad.length === 0);
  }

  // ── A BLOCK THAT DEPICTS A REAL OBJECT KEEPS ITS PROPORTIONS ──────────────────────────────────
  // Every one of these was a shipped defect: a constant that happened to look right at one size and
  // described a different object at the catalog's own props. `phoneFrame` is the worked example: it
  // carried `R.pill` (100px) on a 230px-wide device, 43% of the width, and rendered a capsule.
  {
    const wrong = [];
    for (const w of [230, 300, 600]) {
      const [dev] = BLOCKS.phoneFrame({ x: 0, y: 0, w, h: Math.round(w * 2.07) });
      const frac = dev.radius / w;
      if (frac < 0.13 || frac > 0.19) wrong.push(`phoneFrame w:${w} corner is ${(frac * 100).toFixed(0)}% of the width`);
      // concentric: the inner arc is the outer arc minus the gap between them, which is the frame's pad.
      if (dev.children[0].radius !== dev.radius - dev.pad) wrong.push(`phoneFrame w:${w} screen radius is not bezel minus pad`);
    }
    ok(`phoneFrame: the corner is a proportion of the device, and the screen is concentric with it${wrong.length ? ': ' + wrong.join(' · ') : ''}`, wrong.length === 0);
  }
  {
    // dock magnification is a scale of the whole icon, corners included: a fixed radius made the one
    // magnified tile read squarer than the neighbours it is meant to stand out from.
    const [dock] = BLOCKS.glassDock({ x: 0, y: 0, magnify: 2, size: 76,
      items: [1, 2, 3, 4, 5].map((n) => ({ icon: 'cube', label: 'i' + n })) });
    const fr = dock.children.map((c) => c.radius / c.w);
    ok(`glassDock: every tile's corner is the same fraction of its own size (${fr.map((f) => f.toFixed(2)).join(' ')})`,
      Math.max(...fr) - Math.min(...fr) < 0.02);
  }
  {
    // an avatar is an opaque object. `accentSoft` is 86% transparent, so a stack of them read as one
    // Venn diagram and the `--card` ring meant to cut each disc out of the next separated nothing.
    const stack = BLOCKS.avatarStack({ x: 0, y: 0, size: 48, avatars: [{ initials: 'AL' }, { initials: 'GH' }] });
    ok('avatarStack: the discs are opaque, so overlapping ones stack',
      stack.every((L) => !String(L.bg || '').includes('transparent')));
    // `avatarEl` sets initials at 0.4 of the disc; two capitals run about 0.48 of it and, centred,
    // end at 0.74 across. A shorter step parks the next disc on the glyphs.
    const step = stack[1].x - stack[0].x;
    ok(`avatarStack: the step (${(step / 48).toFixed(2)} of the disc) clears the centred initials`, step / 48 >= 0.74);
  }

  // The site's media is DERIVED but COMMITTED, which is a deliberate trade: generating it at deploy
  // would mean Chromium inside a node:22-alpine image to buy only what this assert buys for free.
  // The cost of committing derived output is that it can go stale silently, add a block, forget
  // `make blocks-scenes`, ship a card with a broken image. So the gate stands in for the build step:
  // every registry entry must have both its poster and the scene the site plays live.
  // This runs in lib-test because lib-test runs on pre-push, which is the last moment drift is cheap.
  {
    const mediaDir = path.join(repoRoot, 'site/public/assets/blocks');
    const gridRows = CATALOG.filter((e) => !e.overlay);
    const noMedia = gridRows.filter((e) => {
      const safe = e.name.replace(/[^a-z0-9.]/gi, '_');
      return !fs.existsSync(path.join(mediaDir, `${safe}.png`)) || !fs.existsSync(path.join(mediaDir, `${safe}.json`));
    }).map((e) => e.name);
    ok(`registry: all ${gridRows.length} grid blocks have a poster + scene${noMedia.length ? `, run \`make blocks-scenes\` for: ${noMedia.slice(0, 4).join(', ')}` : ''}`,
      noMedia.length === 0);
    // The frame rect is what keeps the poster and the live render framed identically. A block with a
    // scene but no rect renders nothing on the card at all, which is a silent, invisible failure.
    const framesPath = path.join(repoRoot, 'site/lib/block-frames.json');
    const framesOk = fs.existsSync(framesPath) ? JSON.parse(fs.readFileSync(framesPath, 'utf8')) : {};
    const noFrame = gridRows.filter((e) => !framesOk[e.name]).map((e) => e.name);
    ok(`registry: all ${gridRows.length} grid blocks have a poster frame rect${noFrame.length ? `, run \`make blocks-scenes\` for: ${noFrame.slice(0, 4).join(', ')}` : ''}`,
      noFrame.length === 0);
  }

  // lowerThird: one component, twelve chromes. The variant IS the block, so an unknown one must be
  // loud rather than silently falling back to a default nobody asked for.
  const lts = CATALOG.filter((e) => e.family === 'lowerThird');
  ok(`lowerThird: 12 variants registered (got ${lts.length})`, lts.length === 12);
  ok('lowerThird: unknown variant throws', (() => {
    try { BLOCKS.lowerThird({ variant: 'nope', name: 'x' }); return false; } catch { return true; }
  })());
  ok('lowerThird: role is optional (name alone still builds)',
    lts.every((e) => BLOCKS[e.family]({ variant: e.props.variant, name: 'Solo' }).length >= 1));
}


// ---- the registry primitive (core/registry/registry.js) ----
// Every named vocabulary resolves through `pick()`, which takes no fallback parameter, so a silent
// default is not expressible. engine-doctrine/MISTAKES.md #369.
{
  const r = defineRegistry('widget', { alpha: 1, beta: 2 }, { slot: 'widget',
    blurbs: { alpha: 'the first test widget, which exists only so this file has a vocabulary to pick from',
      beta: 'the second test widget, its sibling, kept distinct so an error can list more than one name' } });
  ok('registry: a known name resolves', r.pick('alpha') === 1);
  // THE BLURB IS THE RETRIEVAL INDEX, so an entry without one is a capability nobody can be told about.
  // This used to be caught by a ratchet in arsenal-check, which is to say on a push, after the fact.
  // The refusal is at the write site now, and these two assert both halves of it.
  ok('registry: an entry with no blurb is refused at LOAD, not at a gate', (() => {
    try { defineRegistry('gadget', { one: 1 }, { slot: 'gadget' }); return false; }
    catch (e) { return /have no blurb/.test(e.message) && /one/.test(e.message); } })());
  // AND THERE IS NO WAY OUT OF IT. `noBlurbs: '<reason>'` existed for the 42 easings, on the argument
  // that 41 near-identical sentences about acceleration would distinguish nothing. That was a reason to
  // write them WELL, not a licence to have none, and it left 42 capabilities reachable only by an author
  // who already knew the name. They are written; the hatch is gone; a hatch that exists gets reached for.
  ok('registry: there is no opt-out, a reason does not buy an exemption', (() => {
    try { defineRegistry('gadget', { one: 1 }, { slot: 'gadget',
      noBlurbs: 'named by curve and searched through a neighbouring vocabulary that carries the words' });
      return false; } catch (e) { return /have no blurb/.test(e.message); } })());
  ok('registry: and no entry anywhere in the engine is without one', (() => {
    for (const reg of registries()) {
      const b = reg.blurbs || {};
      if (Object.keys(reg.entries || {}).some((n) => !b[n])) { console.log(`    ${reg.kind} has a bare entry`); return false; }
    }
    return true; })());
  ok('registry: an unknown name THROWS rather than defaulting', (() => {
    try { r.pick('nope'); return false; } catch (e) { return /unknown widget/.test(e.message); }
  })());
  ok('registry: the error lists what the vocabulary does know', (() => {
    try { r.pick('nope'); return false; } catch (e) { return /alpha, beta/.test(e.message); }
  })());
  // The part that the evidence demanded: three of the five stranded names were real names in a
  // NEIGHBOURING registry, so a failed pick says where the name actually lives.
  ok('registry: a name from another registry is diagnosed, not just rejected', (() => {
    try { ANIM_REGISTRY.pick('bounceIn'); return false; }
    catch (e) { return /gsap effect/.test(e.message) && /fx: "bounceIn"/.test(e.message); }
  })());
  ok('registry: `preset` names are diagnosed when written into `anim`', (() => {
    try { ANIM_REGISTRY.pick('down'); return false; }
    catch (e) { return /kinetic preset/.test(e.message) && /preset: "down"/.test(e.message); }
  })());
  // ABSENCE is not an error - a layer with no anim fades, a cut with no name dissolves. That half is
  // proven by snap-all rather than here: 102 shipped scenes render byte-identically through this change,
  // and most of their layers declare no anim at all. Collapsing absence into "unknown" is exactly the
  // mistake that made the first cut of this change error on 18 scenes.
  ok('registry: every core vocabulary is built through the primitive', (() => {
    const kinds = registries().map((x) => x.kind);
    return ['anim', 'cut', 'kinetic preset', 'part entrance'].every((k) => kinds.includes(k));
  })());

  // ---- the catalog block: a vocabulary publishes itself, or it does not exist ----------------------
  // Adding one capability used to be four edits in three files (the registry, a section tuple in
  // effects-catalog.mjs, a USAGE form and a PREVIEW scene in effects-json.mjs) held together by two
  // gates. The four are one now. A HALF-WRITTEN block is refused at LOAD rather than by a gate, so the
  // bad state is unrepresentable: these five assertions are the proof of that, not the mechanism.
  const FULL = {
    title: 'Widgets', tag: 'per-layer', intro: 'what a widget is for',
    usage: (n) => `{"widget":"${n}"}`, noPreview: 'a widget has nothing to show',
  };
  ok('registry: a complete catalog block is carried on the registry', (() => {
    const w = defineRegistry('catalog widget', { alpha: 1 }, { slot: 'widget', catalog: FULL, blurbs: { alpha: 'the first test widget, which exists only so this file has a vocabulary to pick from' } });
    return !!w.catalog && w.catalog.title === 'Widgets' && w.catalog.usage('alpha') === '{"widget":"alpha"}';
  })());
  const refuses = (bad) => {
    try { defineRegistry('bad widget', { alpha: 1 }, { catalog: bad, blurbs: { alpha: 'the first test widget, which exists only so this file has a vocabulary to pick from' } }); return false; }
    catch (e) { return /catalog/.test(e.message); }
  };
  ok('registry: a catalog with no intro is refused at load', refuses({ ...FULL, intro: '' }));
  ok('registry: a catalog with no usage form is refused at load', refuses({ ...FULL, usage: undefined }));
  ok('registry: a catalog with NEITHER a preview nor a reason is refused',
    refuses({ ...FULL, noPreview: undefined }));
  ok('registry: a catalog with BOTH a preview and a reason is refused',
    refuses({ ...FULL, preview: () => ({}) }));
  // A registry with no catalog block is not catalogued, and the order is a property of the vocabulary
  // (tag then title) rather than of module evaluation order, so deleting an import cannot reshuffle
  // engine-doctrine/EFFECTS.md.
  ok('registry: catalogued() holds only the registries that publish themselves', (() => {
    try {
      const cats = catalogued();
      return cats.length > 0 && cats.every((r) => r.catalog) && cats.length < registries().length;
    } catch { return false; }   // a registry with no catalog reaching the sort throws, and that is a fail
  })());
  ok('registry: catalogued() is ordered by tag then title, not by definition order', (() => {
    const k = (r) => `${r.catalog.tag} ${r.catalog.title}`;
    return catalogued().every((r, i, a) => i === 0 || k(a[i - 1]) <= k(r));
  })());
  // PARTS lived inline inside scene.js's build path, which is why it had no catalogue entry.
  ok(`parts: the part-entrance vocabulary is importable (${PART_NAMES.length} entries)`, PART_NAMES.length === 9);
  ok('parts: every part entrance has a blurb', PART_NAMES.every((n) => PART_BLURBS[n]));
  // THE EXIT SLOT. A part could arrive and never leave, so a hand-authored html figure faded out as
  // ONE card while a native layer stack left piece by piece. That was read as a limit of the medium
  // in a head-to-head build; it was a missing fourth slot. Asserted per entry so a new part entrance
  // cannot be added entrance-only and quietly reintroduce it.
  ok('parts: every part entrance carries a paired exit', PART_NAMES.every((n) => {
    const v = PARTS[n][3];
    return v && typeof v === 'object' && Object.keys(v).length > 0;
  }));
  // A TRANSLATE CONTINUES, A SCALE REVERSES, and the difference is the house rule CLAUDE.md states for
  // layers: never enter-and-retreat. `fadeUp` rises in from +24 and must leave through NEGATIVE y, not
  // back down to where it came from. A scale has no onward direction, so it returns to its origin.
  ok('parts: a translate exit continues past its settled state, it does not retreat', (() => {
    for (const n of ['fadeUp', 'riseIn']) {
      const from = PARTS[n][1], out = PARTS[n][3];
      if (!(typeof from.y === 'number' && typeof out.y === 'number')) return false;
      if (Math.sign(out.y) === Math.sign(from.y)) return false;   // retreating the way it came
    }
    return true;
  })());
  // ONE NAME, ONE MEANING, ACROSS BOTH SLOTS. The two vocabularies had zero overlap: an author who
  // knew `anim:"fade"` had to learn a second disjoint set for parts. Any part entrance that shares a
  // name with a layer anim must mean the same thing, and this asserts the overlap exists at all so a
  // future addition cannot quietly re-fork the vocabulary.
  ok('parts: the shared names really are shared with the layer anim vocabulary',
    ['fade', 'slide-left', 'slide-right'].every((n) => PART_NAMES.includes(n)));
  ok('parts: a horizontal slide continues past centre rather than retreating', (() => {
    for (const n of ['slide-left', 'slide-right']) {
      const from = PARTS[n][1], out = PARTS[n][3];
      if (!(typeof from.x === 'number' && typeof out.x === 'number')) return false;
      if (Math.sign(out.x) === Math.sign(from.x)) return false;
    }
    return true;
  })());
  ok('parts: fade displaces nothing, in or out', (() => {
    const [, from, to, out] = PARTS.fade;
    const moves = (v) => Object.keys(v).some((k) => k !== 'opacity');
    return !moves(from) && !moves(to) && !moves(out);
  })());
  ok('parts: a scale exit returns to its own origin', (() => {
    for (const n of ['growUp', 'widen', 'popIn']) {
      const out = PARTS[n][3];
      const vals = Object.entries(out).filter(([k]) => k.startsWith('scale')).map(([, v]) => v);
      if (!vals.length || vals.some((v) => v !== 0)) return false;
    }
    return true;
  })());

  // ---- the effector: a falloff from a travelling point (engine-doctrine/CRAFT/AE-TECHNIQUES.md #4) ----------
  //
  // The sticky assertion is the one that matters. Everything else here is a shape contract; sticky is
  // the whole difference between a moving highlight and a painted trail, and it is the number the
  // technique states out loud (1 second). Asserted as a COMPARISON against sticky 0 at the same
  // instant, because "the value is non-zero" would pass on a rig that had simply not left yet.
  ok(`effector: the falloff vocabulary is importable (${FALLOFF_NAMES.length} shapes)`, FALLOFF_NAMES.length === 4);
  ok('effector: every falloff has a blurb', FALLOFF_NAMES.every((n) => FALLOFF_BLURBS[n]));
  ok('effector: every drive has a blurb', DRIVE_NAMES.every((n) => typeof DRIVES[n] === 'string' && DRIVES[n].length));
  // One contract, four shapes: full influence at the point, none at the radius. That is what lets
  // `radius` mean the same thing whichever shape is named, so a film can swap one for another.
  ok('effector: every falloff is 1 at the point and 0 at the radius', FALLOFF_NAMES.every((n) => {
    const f = FALLOFFS[n];
    return Math.abs(f(0) - 1) < 1e-9 && (n === 'step' ? true : Math.abs(f(1)) < 1e-9);
  }));
  ok('effector: an unknown falloff throws rather than falling back', (() => {
    try { effectorAt(0, 0, [{ t: 0, x: 0, y: 0 }], 0, { falloff: 'smoot' }); return false; } catch (e) { return true; }
  })());
  ok('effector: a path is required, a point that never moves is not an effector', (() => {
    try { effectorAt(0, 0, [], 0, {}); return false; } catch (e) { return true; }
  })());
  // THE STICKY DELAY. The point crosses this clone at t=0.3 and is twice the radius away by t=0.9.
  // With sticky 0 the clone is already back at rest; with sticky 1 it is still displaced, and that
  // held value IS the trail.
  ok('effector: a sticky delay holds a clone after the point has passed (the trail)', (() => {
    const path = [{ t: 0, x: 0, y: 0 }, { t: 2, x: 2000, y: 0, ease: 'linear' }];
    const dry = effectorAt(300, 0, path, 0.9, { radius: 300, sticky: 0, step: 1 / 30 }).v;
    const wet = effectorAt(300, 0, path, 0.9, { radius: 300, sticky: 1, step: 1 / 30 }).v;
    return dry === 0 && wet > 0.2;
  })());
  ok('effector: the trail decays to nothing once the sticky window has passed', (() => {
    // `linear`, so the assertion can name the frame the point crosses the clone. The default
    // interpolation is easeInOutCubic over a sparse pair, and the point would be nowhere near x=300
    // at t=0.3.
    const path = [{ t: 0, x: 0, y: 0 }, { t: 2, x: 2000, y: 0, ease: 'linear' }];
    const at = (t) => effectorAt(300, 0, path, t, { radius: 300, sticky: 1, step: 1 / 30 }).v;
    return at(0.5) > at(0.9) && at(0.9) > at(1.2) && at(1.9) === 0;
  })());
  // PURE IN t, which is the whole reason the trail is recomputed backward along the path rather than
  // accumulated. Sampling out of order must not change an answer.
  ok('effector: the same time gives the same influence whatever order it is asked in', (() => {
    const path = [{ t: 0, x: 0, y: 0 }, { t: 2, x: 2000, y: 0 }];
    const o = { radius: 400, sticky: 1, step: 1 / 30 };
    const fwd = [0.2, 0.6, 1.0, 1.4].map((t) => effectorAt(300, 0, path, t, o).v);
    const back = [1.4, 1.0, 0.6, 0.2].map((t) => effectorAt(300, 0, path, t, o).v).reverse();
    return fwd.every((v, i) => v === back[i]);
  })());
  // `push` is the drive a stagger cannot imitate: it reads the DIRECTION from the point to the clone.
  // A clone to the right of the point is shoved right; a clone to the left is shoved left.
  ok('effector: push shoves each clone along its own vector from the point', (() => {
    const path = [{ t: 0, x: 500, y: 0 }, { t: 2, x: 500, y: 0 }];
    const r = effectorStyle(effectorAt(600, 0, path, 0.5, { radius: 400 }), { push: 100 }).transform;
    const l = effectorStyle(effectorAt(400, 0, path, 0.5, { radius: 400 }), { push: 100 }).transform;
    return /translate\((\d|\.)/.test(r) && /translate\(-/.test(l);
  })());
  ok('effector: an unknown drive throws rather than doing nothing', (() => {
    const inf = { v: 1, ux: 1, uy: 0 };
    try { effectorStyle(inf, { scal: 1 }); return false; } catch (e) { return true; }
  })());
  ok('effector: a clone the point never reaches is left with no transform', () => true
    && effectorStyle(effectorAt(5000, 0, [{ t: 0, x: 0, y: 0 }, { t: 2, x: 100, y: 0 }], 1, { radius: 300 }), { scale: 1 }).transform === 'none');
  ok('effector: the track claims its own slot in the pipeline', TRACK_TYPES.includes('effector') && SLOTS.includes('effector'));

  // ---- where the cut goes, read off the speed graph (engine-doctrine/CRAFT/AE-TECHNIQUES.md #1) -------------
  //
  // A SCALE CHANGE IS MOTION. The technique's own demonstration is a null scaling 100 to 200 per cent
  // across the seam and nothing translating at all, so a reader that measured translation alone would
  // score that exact move at zero and advise the author to move the cut away from it.
  ok('velocity-cut: a pure scale change reads as picture speed', (() => {
    const L = { start: 0, duration: 2, motion: [{ t: 0, scale: 1 }, { t: 1, scale: 2, ease: 'linear' }] };
    return layerSpeedAt(L, 0.5, 30) > 400;
  })());
  // A ROTATION MOVES PIXELS TOO, and this reader could not see one. The technique this file
  // implements (engine-doctrine/CRAFT/AE-TECHNIQUES.md #1) hands a fast ROTATION across the seam, so the
  // advisory scored its own worked example at 0 px/s and called it a velocity trough.
  ok('velocity-cut: a pure rotation reads as picture speed', (() => {
    const L = { start: 0, duration: 2, motion: [{ t: 0, rot: 0 }, { t: 2, rot: 720 }] };
    return layerSpeedAt(L, 1, 30) > 400;
  })());
  ok('velocity-cut: a rotating seam is no longer reported as a trough', (() => {
    const layers = [{ start: 0, duration: 2, motion: [
      { t: 0, rot: 0, easeOut: 'hang' }, { t: 1.2, rot: 300, easeIn: { influence: 22, speed: 3 } }] }];
    return cutVelocityAdvice([{ t: 1.15 }], layers, { duration: 2 })[0].trough === false;
  })());
  ok('velocity-cut: and it reads an AUTHORED handle, because it derives from velocityAt', (() => {
    const flat = [{ start: 0, duration: 2, motion: [{ t: 0, x: 0 }, { t: 1.2, x: 900 }] }];
    const hung = [{ start: 0, duration: 2, motion: [
      { t: 0, x: 0, easeOut: 'hang' }, { t: 1.2, x: 900, easeIn: { influence: 22, speed: 3 } }] }];
    // The handle moves WHERE the speed is. The default curve is nearly stopped one frame before its
    // last key; `hang` out plus a fast arrival is at its fastest there. A reader blind to handles
    // would report the same number for both.
    return layerSpeedAt(hung[0], 1.15, 30) > 6 * layerSpeedAt(flat[0], 1.15, 30);
  })());
  ok('velocity-cut: a layer that is off screen contributes nothing', (() => {
    const L = { start: 1, duration: 1, motion: [{ t: 0, x: 0 }, { t: 1, x: 1000, ease: 'linear' }] };
    return layerSpeedAt(L, 0.5, 30) === 0 && layerSpeedAt(L, 1.5, 30) > 0;
  })());
  // THE ADVICE ITSELF. The move runs 1.0s to 1.5s and the cut is written at 0.9s, in the stillness
  // just before it. The peak the report names has to sit inside the move.
  ok('velocity-cut: a cut in a trough is named, with the peak it should move to', (() => {
    const layers = [{ start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 0 }, { t: 1.5, x: 900, ease: 'linear' }] }];
    const [r] = cutVelocityAdvice([{ t: 0.9 }], layers, { duration: 3 });
    return r.trough === true && r.peak.t > 1 && r.peak.t <= 1.5 && r.peak.speed > r.speed;
  })());
  // AND IT MUST STAY QUIET. A cut already sitting on the fastest frame near it needs no advice, and a
  // report that fires on every cut is a report nobody reads. Measured over the library, 19 of 194 cuts
  // in 47 films trip this.
  ok('velocity-cut: a cut already at the peak is left alone', (() => {
    const layers = [{ start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 0 }, { t: 1.5, x: 900, ease: 'linear' }] }];
    return cutVelocityAdvice([{ t: 1.25 }], layers, { duration: 3 })[0].trough === false;
  })());
  // A FILM WITH NOTHING MOVING has no move for a cut to hide inside, so this has nothing to say. Two
  // shipped films peak at 4 px/s beside a cut, which is a drift and not a move, and advising anybody
  // to re-time a seam around it would be noise.
  ok('velocity-cut: a still film is not a trough', (() => {
    const layers = [{ start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 3, x: 2, ease: 'linear' }] }];
    return cutVelocityAdvice([{ t: 1.5 }], layers, { duration: 3 })[0].trough === false;
  })());
  // ADVISORY, NEVER AUTOMATIC: it returns a reading and touches nothing. Asserted because the whole
  // argument for this shape is that a scene which writes 4.2 still cuts at 4.2.
  ok('velocity-cut: the advice moves no cut', (() => {
    const cuts = [{ t: 0.9, fx: 'fade' }];
    const layers = [{ start: 0, duration: 3, motion: [{ t: 0, x: 0 }, { t: 1, x: 0 }, { t: 1.5, x: 900, ease: 'linear' }] }];
    cutVelocityAdvice(cuts, layers, { duration: 3 });
    return cuts[0].t === 0.9 && cuts[0].fx === 'fade';
  })());

  // THE CAMERA IS THE NULL. AE-TECHNIQUES #1 parents both shots to one null and animates the NULL;
  // in this engine the thing that covers both shots at once is the camera. A reader that saw only
  // layer tracks scored the technique's own construction at ZERO px/s, which is the mistake the
  // advisory exists to catch, made by the advisory itself.
  ok('velocity-cut: a camera zoom reads as picture speed', (() => {
    const cam = [{ t: 0, s: 1 }, { t: 2, s: 2, ease: 'linear' }];
    return cameraSpeedAt(cam, 1, 30) > 200 && cameraSpeedAt([], 1, 30) === 0;
  })());
  ok('velocity-cut: a seam with NOTHING but a camera move under it is not read as dead', (() => {
    // Two abutting shots, no layer motion at all: the whole move lives on the camera.
    const layers = [{ start: 0, duration: 1.4 }, { start: 1.4, duration: 1.6 }];
    const cam = [{ t: 0.4, s: 1, easeOut: 'hang' }, { t: 2.4, s: 2, easeIn: 'hang' }];
    const blind = cutVelocityAdvice([{ t: 1.4 }], layers, { duration: 3 });
    const seeing = cutVelocityAdvice([{ t: 1.4 }], layers, { duration: 3, camera: cam });
    // Blind to the camera the frame reads dead; reading it, the seam sits ON the peak.
    return blind[0].speed === 0 && seeing[0].speed > 500 && seeing[0].peak.t === 1.4;
  })());

  // ---- the range selector's smoothness dial (engine-doctrine/CRAFT/AE-TECHNIQUES.md #5) ---------------------
  //
  // DEFAULT 1 IS THE IDENTITY, and that is why exposing this dial changed no rendered frame. Asserted
  // rather than assumed: the remap is (u-0.5)/s+0.5, which is only the identity at exactly s=1, so a
  // future default that drifted off 1 would silently move every kinetic preset in the library.
  ok('type: smoothness 1 is the identity, so no shipped frame moves', (() => {
    for (let i = 0; i <= 20; i++) {
      const t = i * 0.05;
      if (unitProgress(t, 0, 8, { each: 0.6 }) !== unitProgress(t, 0, 8, { each: 0.6, smoothness: 1 })) return false;
    }
    return true;
  })());
  // SMOOTHNESS 0 IS A SWAP, not a fast ease. The unit is unselected, then selected, and there is no
  // value in between at any time. That is the property a font morph is built on: a glyph vanishes
  // rather than scaling away.
  ok('type: smoothness 0 swaps rather than interpolates', (() => {
    for (let i = 0; i <= 60; i++) {
      const v = unitProgress(i * 0.02, 0, 8, { each: 0.6, smoothness: 0 });
      if (v !== 0 && v !== 1) return false;
    }
    return unitProgress(0.2, 0, 8, { each: 0.6, smoothness: 0 }) === 0
      && unitProgress(0.4, 0, 8, { each: 0.6, smoothness: 0 }) === 1;
  })());
  // A partial smoothness narrows the BAND around the midpoint and keeps it centred there, so the
  // moment a unit is half-way through is the same whatever the dial says. Without that the dial would
  // also shift the timing, and the stagger would stop meaning what it says.
  ok('type: a partial smoothness narrows the band without moving its centre', (() => {
    const at = (t, s) => unitProgress(t, 0, 8, { each: 0.6, smoothness: s });
    // The band is `smoothness` wide in u, centred on 0.5, so at 0.25 it spans u 0.375..0.625, which
    // is t 0.225..0.375 for a 0.6s window.
    return at(0.3, 0.25) === at(0.3, 1) && at(0.2, 0.25) === 0 && at(0.4, 0.25) === 1
      && at(0.2, 1) > 0 && at(0.4, 1) < 1;
  })());
}


// ---- every vocabulary refuses a WRONG name and keeps its default for an ABSENT one (#361) ----
{
  const refuses = (label, fn) => ok(`vocab: ${label} refuses an unknown name`, (() => {
    try { fn('zzz-not-real'); return false; } catch (e) { return /unknown/i.test(e.message); }
  })());
  refuses('background preset', (n) => bgPreset(n));
  refuses('composite look', (n) => { const el = { classList: { contains: () => false }, style: {}, appendChild() {} }; applyComposite(el, n); });
  refuses('canvas fx', (n) => bakeCanvasFx({ naturalWidth: 10, naturalHeight: 10 }, { fx: n }));
  refuses('seam direction', (n) => seamDir(n));
  // ...and ABSENCE still resolves to the documented default, which is the half that broke 18 scenes
  // when the first cut of this work collapsed the two questions into one answer.
  ok('vocab: an ABSENT background preset still defaults to paper', !!bgPreset(undefined).base);
  ok('vocab: an ABSENT canvasFx is a no-op, not an error', bakeCanvasFx({ naturalWidth: 0, naturalHeight: 0 }, {}) === null);
  // The three junction kinds are the ones a viewer always watches; all three now refuse.
  ok('vocab: the direction vocabulary has ONE definition', DIRS.length === 4 && DIRS.join() === 'left,right,up,down');
}


// ---- a new block cannot ship undiscoverable ----
// The hole this closes, probed rather than imagined: a catalog row with `blurb: ''` loaded silently and
// entered the search corpus with nothing to match on, so the block was reachable only by someone who
// already knew its exact name. Every discoverability failure this repo has paid for is that shape, and
// the refusal is at the write site (blocks/index.mjs) rather than here, because a gate that runs
// afterwards only promises to notice. These two assert it fires.
{
  const { checkBlurb } = await import('../../core/registry/registry.js');
  const throws = (blurb) => { try { checkBlurb('block', 'probeBlock', blurb); return false; } catch { return true; } };
  ok('blocks: a row with no blurb is refused at load', throws(''));
  ok('blocks: and one that only says its own name back is refused too', throws('a probe block'));
  const { CATALOG } = await import('../../blocks/catalog.mjs');
  ok('blocks: every catalog row already satisfies that rule',
    CATALOG.every((e) => { try { checkBlurb('block', e.name, e.blurb); return true; } catch { return false; } }));
}


// ---- the playground's pick list must name families that exist ----
// /playground is an EDIT, not an index: a hand-chosen handful, because a designer landing there should
// meet the engine at its best. /arsenal is the exhaustive catalogue and is gated to stay complete. The
// risk a hand-kept list carries is the one this repo names most often, a name that quietly stops
// existing, so the list is asserted here rather than trusted. This is the whole cost of curating, and
// it is one test.
{
  const src = fs.readFileSync(path.join(repoRoot, 'site/app/playground/PlaygroundClient.tsx'), 'utf8');
  const block = /const FEATURED = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  ok('playground: the pick list is where the test expects it', !!block);
  if (block) {
    const picked = [...block[1].matchAll(/"([A-Za-z][\w.]*)"/g)].map((m) => m[1]);
    const families = new Set(CATALOG.map((r) => r.name).filter((n) => !n.includes('.')));
    const gone = picked.filter((n) => !families.has(n));
    if (gone.length) console.log(`    playground names families that do not exist: ${gone.join(' ')}`);
    ok(`playground: all ${picked.length} featured blocks are real families`, gone.length === 0);
    // Small on purpose. If this ever needs raising, raise it deliberately: a page that shows everything
    // is the catalogue, and the catalogue already exists one route away.
    ok('playground: the pick list stays an edit, not an index', picked.length > 0 && picked.length <= 30);
  }
}


// ---- the search must know about the blocks ----
// Measured before this landed: the CLI corpus held 623 entries across 54 kinds and `block` was not one
// of them, so 97 of 97 block families were invisible to `make arsenal`. The website's /arsenal had
// indexed them all along, so two indexes over one library disagreed by 185 entries and the poorer one
// was the one CLAUDE.md tells an author to run before inventing anything. Worse than a gap: the tool
// prints "The N named things were searched... Assume the engine does not have it", which it said about
// `terminal`. A search that reports ABSENT about something present is the failure this repo has now
// paid for twice, once for effects with no blurb and once here.
{
  const all = await collectArsenal();
  const cat = (await import('../../blocks/catalog.mjs')).CATALOG;
  const found = new Set(all.filter((e) => e.kind === 'block').map((e) => e.name));
  // `r.family`, NOT `r.name`. The old set was "families that happen to have a bare row", which is 95 of
  // 100, so this passed over the five it existed to catch (`pricingCard` ships only as `card.pricing`).
  const familyOf = new Map(cat.map((r) => [r.name, r.family]));
  const families = [...new Set(cat.map((r) => r.family))];
  const represented = new Set([...found].map((n) => familyOf.get(n)).filter(Boolean));
  const missing = families.filter((f) => !represented.has(f));
  if (missing.length) console.log(`    blocks the search cannot find: ${missing.slice(0, 8).join(' ')}`);
  ok('arsenal: every block FAMILY in the catalog is in the search corpus', missing.length === 0);
  // THE RULE IS NARROWER THAN "NO VARIANTS", and the first version of this assertion had it too wide.
  // Variants are out because a variant and its family split their shared words: with all 185 rows in,
  // the blurb self-retrieval floor fell from 97% to 95%, since `notification.warn` ("toast, amber
  // accent") and `notification` describe one subject. That argument needs a family entry to split
  // WITH. Five families have no bare row at all (`pricingCard` ships only as `card.pricing`), so the
  // wide rule kept them out of the search entirely and `Q="a pricing plan card"` answered ABSENT about
  // a block the engine has. So: at most one entry per family, and a variant only where its family has
  // no bare row of its own.
  ok('arsenal: one entry per block family, never a family and its variants both', (() => {
    const familyOf = new Map(CATALOG.map((r) => [r.name, r.family]));
    const seen = new Map();
    for (const e of all.filter((x) => x.kind === 'block')) {
      const f = familyOf.get(e.name);
      if (!f) { console.log(`    corpus block "${e.name}" is in no catalog row`); return false; }
      if (seen.has(f)) { console.log(`    family ${f} appears twice: ${seen.get(f)} and ${e.name}`); return false; }
      seen.set(f, e.name);
    }
    return true; })());
  ok('arsenal: a variant is indexed ONLY where its family has no bare row', (() => {
    const bare = new Set(CATALOG.filter((r) => !r.name.includes('.')).map((r) => r.name));
    return all.filter((e) => e.kind === 'block' && e.name.includes('.'))
      .every((e) => !bare.has(CATALOG.find((r) => r.name === e.name).family)); })());
  ok('arsenal: and a block names the key an author writes, not a prose label',
    all.filter((e) => e.kind === 'block').every((e) => e.slot === 'block'));
  // The specific query that started this: a real block, by its own exact name, answered absent.
  ok('arsenal: `morphText` is findable by name', (() => {
    const hit = all.find((e) => e.name === 'morphText');
    return !!hit && hit.kind === 'block' && /gooey/.test(hit.blurb); })());
}


// ---- the block family map must match the directory it replaced ----
// blocks/index.mjs used to `fs.readdirSync` its own folder, which meant a new family file was picked
// up by existing. It imports statically now, so blocks can run in a browser (site-engine.mjs vendors
// the engine into the site, and three `node:` imports were the only thing keeping blocks out of it).
// The cost of that trade is exactly this: a family added and not imported would vanish in silence,
// which is the failure this repo names most often. So the directory is still the source of truth,
// and this is the thing that reads it.
{
  const dir = path.join(repoRoot, 'blocks');
  const onDisk = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs') && !NOT_A_FAMILY.has(f)).sort();
  const imported = Object.keys(FAMILY_MODULES).sort();
  const missing = onDisk.filter((f) => !imported.includes(f));
  const ghost = imported.filter((f) => !onDisk.includes(f));
  if (missing.length) console.log(`    family files on disk that nothing imports: ${missing.join(' ')}`);
  if (ghost.length) console.log(`    imported names with no file: ${ghost.join(' ')}`);
  ok('blocks: every family file in blocks/ is imported by blocks/index.mjs',
    missing.length === 0 && ghost.length === 0);
  ok('blocks: and each import is the module that file exports', imported.every((f) => {
    const m = FAMILY_MODULES[f];
    return m && typeof m === 'object' && typeof m.CATEGORY === 'string' && m.CATEGORY.length > 0; }));
  // The whole point of the change: nothing under blocks/ may reach for node again, or the site loses
  // the 100 option tables that blocks/schema.mjs exists to provide to a control panel.
  ok('blocks: no family imports node:, so the browser can run one', (() => {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.mjs')) continue;
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
      if (/from ['"]node:/.test(src)) { console.log(`    blocks/${f} imports node:`); return false; }
    }
    return true; })());
}


// ---- the catalogue is READ from the registries, not restated beside them --------------------------
// `scripts/site/effects-catalog.mjs` used to hand-list 32 sections whose name lists were, by
// inspection, exactly the registries sitting one import away. It reads `catalogued()` now, so this
// asserts the join actually happened: a registry that publishes itself has one section, carrying its
// own title, slot label, prose and names. A regression here is silent otherwise, because a section
// that vanishes takes its rows out of engine-doctrine/EFFECTS.md and the doc still regenerates cleanly.
{
  const { sections } = await import('../../scripts/site/effects-catalog.mjs');
  // Minus this file's own fixture on both sides: the `catalog widget` built a few hundred lines up is
  // a real registry in this process, so `catalogued()` publishes it and the catalogue then derives a
  // section for it. That IS the mechanism working; it just is not one of the engine's vocabularies.
  const fixture = ([title]) => title !== 'Widgets';
  const derived = sections.filter(([, , , , meta]) => meta && meta.reg).filter(fixture);
  const cats = catalogued().filter((r) => fixture([r.catalog.title]));
  // `cats.length > 20` is the non-vacuity clause and it is load-bearing: with the catalog block lost,
  // both sides go to zero and "every one has a section" passes over nothing at all.
  ok(`catalogue: every self-publishing registry has a section (${derived.length} of ${cats.length})`,
    cats.length > 20 && derived.length === cats.length && cats.every((r) => derived.some(([, , , , m]) => m.reg === r)));
  ok('catalogue: a derived section carries the registry\'s own title, tag, intro and names',
    derived.every(([title, intro, list, tag, meta]) => title === meta.reg.catalog.title
      && tag === meta.reg.catalog.tag && intro === meta.reg.catalog.intro
      && list.length === meta.reg.names.length && list.every((n) => meta.reg.has(n))));
  // The hand-written half is the vocabularies with NO registry behind them, so there is no definition
  // site to write a catalog block on. It shrinks only when one of them gains a registry.
  ok(`catalogue: ${sections.length - derived.length} sections stay hand-written, none of them a registry`,
    sections.filter(([, , , , meta]) => !meta || !meta.reg).every(([, , list]) =>
      !registries().some((r) => r.names.length === list.length && list.every((n) => r.has(n)))));
}


// ---- registry blurbs (the description lives beside the thing it describes) ------------------------
// engine-doctrine/EFFECTS.md is generated from the registries and 379 of its 476 rows had no description, because
// the only source was a FLAT 68-key map in the generator whose own comment called the notes "a bonus,
// never a second source of truth". A name with no description is a vocabulary nobody can choose from.
// Each family now keeps its blurbs next to its registry, and a missing one fails HERE, the same shape
// recipes/index.mjs checkRecipe uses: refuse at load rather than ship a name nobody can choose from.
{
  const families = [
    ['PRESETS', Object.keys(PRESETS), PRESET_BLURBS],
    ['ANIM_NAMES', ANIM_NAMES, ANIM_BLURBS],
    ['IDLE_NAMES', IDLE_NAMES, IDLE_BLURBS],
    ['PRESENTATIONS', Object.keys(PRESENTATIONS), CUT_BLURBS],
    ['SEAM_FX', SEAM_FX, SEAM_BLURBS],
    ['FX_TYPES', FX_TYPES, FX_BLURBS],
    ['GSAP_FX', GSAP_FX, GSAP_BLURBS],
    ['BG_NAMES', BG_NAMES, BG_BLURBS],
    ['RESAMPLE_FX', RESAMPLE_FX, RESAMPLE_BLURBS],
    ['CAP_STYLE_NAMES', CAP_STYLE_NAMES, CAPTION_BLURBS],
    ['COMPOSITION_NAMES', COMPOSITION_NAMES, COMPOSITION_BLURBS],
  ];
  for (const [label, keys, map] of families) {
    const miss = keys.filter((k) => !map[k]);
    const extra = Object.keys(map).filter((k) => !keys.includes(k));
    ok(`every ${label} entry has a blurb` + (miss.length ? `, missing ${miss.join(', ')}` : ''), miss.length === 0);
    ok(`no blurb for a ${label} entry that does not exist` + (extra.length ? `, ${extra.join(', ')}` : ''), extra.length === 0);
  }
  // A LOOP IS NOT AN ENTRANCE. GSAP_FX is one flat list of both, so a layer given `float` as its entrance
  // never settles and reads as a hung render. The two sets must stay disjoint and must together BE the
  // list, or a gate reasoning about either half is reasoning about the wrong names.
  ok('the GSAP loops and one-shots are disjoint and cover GSAP_FX',
    LOOP_FX.every((n) => !ONESHOT_FX.includes(n)) && LOOP_FX.length + ONESHOT_FX.length === GSAP_FX.length);
  ok('every GSAP loop says it never settles', LOOP_FX.every((n) => /LOOP|never settles/i.test(GSAP_BLURBS[n] || '')));

  // THE CAUTION IS DERIVABLE, so it must not drift. SOLO_BLIND is computed at load by probing every
  // presentation for a transform/filter that ever leaves identity, and scene.js throws on those styles
  // when sceneUnits is off. A blurb that names the caution for a different set than the runtime one is
  // worse than none: an author would trust it. Change a cut's mechanics and this fails until the blurb
  // is corrected.
  const cautioned = Object.entries(CUT_BLURBS).filter(([, v]) => /sceneUnits/.test(v)).map(([k]) => k).sort();
  const blind = [...SOLO_BLIND].sort();
  ok(`the sceneUnits caution names exactly the mask-only cuts (${blind.length})`,
    cautioned.length === blind.length && blind.every((n, i) => n === cautioned[i]));
}


// ---- the spectacle dial (core/registry/knobs.js arithmetic + core/timeline/spectacle.js walk) -----------------------
//
// The half that can be proved without a DOM: what the attenuation DOES to a number, and that a scene
// with no `spectacle` comes back untouched. Whether the film reads better is a question for eyes.
{
  const { rest, peak } = SPECTACLE_GAIN;
  ok('spectacle: an unset dial attenuates from its stated default', approx(attenuated(undefined, 1), rest));
  ok('spectacle: an authored dial attenuates from what was authored', approx(attenuated(0.8, 1), 0.8 * rest));
  ok('spectacle: attenuation is idempotent in the sense that it compounds, never grows', attenuated(1, 1) < 1);
  // A kick is a multiplier ABOUT 1, so the amplitude is the distance from 1 and not the value.
  ok('spectacle: a kick OUT is pulled toward 1', approx(attenuatedKick(1.06), 1 + 0.06 * rest));
  ok('spectacle: a kick IN is also pulled toward 1, not made stronger', (() => {
    const a = attenuatedKick(0.94); return a > 0.94 && a < 1;
  })());
  ok('spectacle: the peak sits above the sting default of 1', peak > 1);

  ok('spectacle: no block leaves the scene identical', (() => {
    const d = { stings: [{ t: 1, fx: 'burn' }], layers: [{ id: 'a', type: 'glow', intensity: 0.9 }] };
    const before = JSON.stringify(d);
    resolveSpectacle(d);
    return JSON.stringify(d) === before;
  })());

  {
    const d = {
      stings: [{ t: 1, fx: 'burn' }, { t: 3, fx: 'leak', intensity: 0.8 }],
      seams: [{ t: 2, fx: 'fade' }],
      layers: [
        { id: 'hero', type: 'glow', intensity: 0.9, filter: 'neon', modifiers: [{ kick: true }] },
        { id: 'chorus', type: 'glow', intensity: 0.9, filter: 'neon:0.9', modifiers: [{ kick: { scale: 1.2 } }] },
      ],
    };
    resolveSpectacle({ ...d, spectacle: { at: 6, of: 'hero', device: 'flash', why: 'the mark lands' } });
    const [s1, s2, added] = d.stings;
    ok('spectacle: an unset sting intensity is pulled off its default of 1', approx(s1.intensity, rest));
    ok('spectacle: an authored sting intensity is pulled off what was authored', approx(s2.intensity, 0.8 * rest));
    ok('spectacle: the seam is pulled down too', approx(d.seams[0].intensity, rest));
    ok('spectacle: the device is appended as a sting at `at`, at the peak',
      added && added.t === 6 && added.fx === 'flash' && added.intensity === peak);
    ok('spectacle: the named layer keeps every dial it had',
      d.layers[0].intensity === 0.9 && d.layers[0].filter === 'neon' && d.layers[0].modifiers[0].kick === true);
    ok('spectacle: every other layer is quietened', approx(d.layers[1].intensity, 0.9 * rest));
    ok('spectacle: a look with no positional strength resolves through the look before scaling',
      d.layers[1].filter === `neon:${+(0.9 * rest).toFixed(3)}`);
    ok('spectacle: a kick elsewhere is pulled toward 1', approx(d.layers[1].modifiers[0].kick.scale, attenuatedKick(1.2)));
  }

  // REFUSED, NEVER SUBSTITUTED. Each of the three names what is legal, because a spectacle that
  // silently did nothing would be the very defect the block exists to close.
  const refuses = (scene, rx) => { let m = ''; try { resolveSpectacle(scene); } catch (e) { m = e.message; } return rx.test(m); };
  const film = () => ({ layers: [{ id: 'logo', type: 'text', text: 'x' }] });
  ok('spectacle: an unknown device is refused and the legal ones are listed',
    refuses({ ...film(), spectacle: { at: 1, of: 'logo', device: 'sparkle', why: 'w' } }, /unknown spectacle device "sparkle"[\s\S]*chromaticSplit/));
  ok('spectacle: an unknown layer id is refused and the film\'s ids are listed',
    refuses({ ...film(), spectacle: { at: 1, of: 'nope', device: 'flash', why: 'w' } }, /no layer has id "nope"[\s\S]*logo/));
  ok('spectacle: a sting already on that instant is refused',
    refuses({ ...film(), stings: [{ t: 1.02, fx: 'burn' }], spectacle: { at: 1, of: 'logo', device: 'flash', why: 'w' } }, /collides with the sting "burn"/));
}


// ---- knobErrors: a dial on a preset that does not read it is a REFUSAL, not a warning --------------
// It was a warning printed by `quality/gates/knobs-audit.mjs` if you remembered to run it, while an
// unknown layer PROP of the same shape has thrown at boot for a long time. These say the two agree now.
{
  const { knobErrors } = await import('../../core/validate/validate.mjs');
  const of = (L) => knobErrors({ layers: [L] });

  ok('knobs: a legal dial on a listed preset is accepted',
    of({ type: 'text', preset: 'up', presetOpts: { dist: 40, each: 0.05 } }).length === 0);

  const typo = of({ type: 'text', preset: 'up', presetOpts: { dsit: 40 } });
  ok('knobs: a dial the preset does not read is refused, naming the dial, the preset and what it DOES read',
    typo.length === 1 && /`dsit`/.test(typo[0]) && /"up"/.test(typo[0]) && /`dist`/.test(typo[0]));
  ok('knobs: the refusal points at the nearest legal dial', /Did you mean 'dist'/.test(typo[0]));

  // A real dial of a SIBLING preset is the case the manifest exists for: `bounce` is a knob, and `up`
  // is not one of the presets that reads it.
  ok('knobs: a sibling preset\'s dial is still dead here',
    of({ type: 'text', preset: 'up', presetOpts: { bounce: 0.9 } }).length === 1);

  // THE HALF THAT MUST STAY QUIET. A preset the manifest does not list is not graded against
  // `_shared` alone, because that would refuse a shipped film for a HOLE in the manifest rather than
  // for a mistake in the film. `colorWave` and `shimmerWave` were the kinetic examples here until
  // `bindDials` (core/registry/knobs.js) made an unlisted kinetic dial impossible; the `globe` three scene is
  // still one, and the rule it proves has to keep a live subject.
  ok('knobs: a preset the manifest does not list is not graded at all',
    of({ type: 'three', three: 'globe', pointSize: 3, spin: 1 }).length === 0);
  // And the two that WERE that hole now have rows, so their real dials pass on the listed path.
  ok('knobs: colorWave and shimmerWave are listed, and their own dials are legal',
    of({ type: 'text', preset: 'colorWave', presetOpts: { flash: '#f00', to: '#fff', hold: 0.5 } }).length === 0
    && of({ type: 'text', preset: 'shimmerWave', presetOpts: { amp: 2 } }).length === 0
    && of({ type: 'text', preset: 'colorWave', presetOpts: { dist: 40 } }).length === 1);

  // A three scene's dials sit on the LAYER beside generic props, so only a real sibling dial can be
  // called misused, anything else is somebody's layout and must never be touched.
  ok('knobs: on a three layer a generic prop is left alone and a sibling scene\'s dial is refused',
    of({ type: 'three', three: 'pointCloud', x: 100, start: 2, w: 400 }).length === 0
    && of({ type: 'three', three: 'pointCloud', yaw: 12 }).length === 1);

  ok('knobs: children are walked, so a dead dial inside a group is found too',
    knobErrors({ layers: [{ type: 'group', children: [{ type: 'text', preset: 'up', presetOpts: { deg: 8 } }] }] })
      .some((e) => /children\[0\]\.presetOpts/.test(e)));

  // THE LIBRARY, BEFORE AND AFTER. A new refusal that fires on a shipped scene is a regression until
  // proven otherwise, so the count is asserted rather than remembered.
  {
    const dir = path.join(repoRoot, 'films', 'scene');
    const guilty = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json').filter((f) => {
      let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return false; }
      return d.module === 'scene' && knobErrors(d).length > 0;
    });
    ok(`knobs: no shipped scene is refused by the new rule${guilty.length ? ': ' + guilty.join(', ') : ''}`, guilty.length === 0);
  }
}


// ---- the effects catalogue can still be built --------------------------------------------------
// THIS ASSERT EXISTS BECAUSE THE CATALOGUE FAILED CORRECTLY AND FAR TOO LATE. `effects-json.mjs`
// refuses a family that has no authoring form and no preview (or a stated reason for having none),
// which is right. But nothing in the gate ladder ran it, so three families were added with no rows and
// the fault sat there until somebody typed `make effects` by hand and found the whole catalogue could
// not regenerate. Failing loudly is only half of failing early: a check nobody runs is a check that
// reports at a time of the author's choosing, which is exactly when they are not looking.
//
// Spawned rather than imported: the script is a build, and importing it would write 255 preview scenes
// as a side effect of running the tests. `--check` is the gap check and nothing else.
{
  const { execFileSync } = await import('node:child_process');
  let built = true, why = '';
  try {
    execFileSync(process.execPath, [new URL('../../scripts/site/effects-json.mjs', import.meta.url).pathname, '--check'],
      { stdio: 'pipe', cwd: new URL('../..', import.meta.url).pathname });
  } catch (e) { built = false; why = String(e.stderr || e.message).trim().split('\n').slice(0, 6).join(' · '); }
  ok(`the effects catalogue still builds: every family has a usage form and a preview or a reason${built ? '' : ' → ' + why}`, built);
}


// ---- AKA: the searchable half of a description that is never printed -------------------------------
// A blurb is prose a person reads in engine-doctrine/EFFECTS.md AND the retrieval index `make arsenal` ranks on.
// Those two jobs pull apart: "handheld" is the only word a director uses for `driftHold` and no honest
// rewrite of "a held frame that is never dead, a sub-12px Lissajous micro-drift" contains it. `aka`
// takes the search half so the prose half never has to become keyword soup.
{
  const corpus = await arsenalCollect();
  const drift = corpus.find((e) => e.name === 'driftHold');
  ok('aka reaches the search corpus', !!drift && drift.aka.includes('handheld'));
  ok('aka NEVER reaches the printed description, which is the whole point',
     !!drift && !/handheld/i.test(drift.blurb)
     && corpus.filter((e) => e.kind === 'camera move').every((e) => !/handheld/i.test(e.blurb)));
  // An aka is invisible: a typo'd key would index nothing, break nothing and report nothing, which is
  // the "written and never read" failure this repo pays for most. So it is refused at LOAD.
  ok('an aka naming something that is not an entry is refused at load', (() => {
    try { defineRegistry('t', { a: 1 }, { aka: { b: ['x'] }, blurbs: { alpha: 'the first test widget, which exists only so this file has a vocabulary to pick from' } }); return false; }
    catch (e) { return /not an entry here/.test(e.message); }
  })());
  ok('an empty aka list is refused rather than silently indexing nothing', (() => {
    try { defineRegistry('t', { a: 1 }, { aka: { a: [] }, blurbs: { alpha: 'the first test widget, which exists only so this file has a vocabulary to pick from' } }); return false; }
    catch (e) { return /non-empty array/.test(e.message); }
  })());
}


// ---- AN UNSEARCHABLE BLURB CANNOT BE WRITTEN (core/registry/registry.js checkBlurb) --------------------------
// The incident: `make arsenal "elements react to a moving point by distance"` answered NOTHING HERE
// CLEARLY MATCHES while core/tracks/effector.js was exactly that, because the blurb never used the
// words a person types. One blurb was rewritten; this is the class. The rule is the NARROWEST one that
// catches it, because a wrong refusal fires at module load and stops the engine, and this repo has
// deleted two gates for measuring the wrong thing (engine-doctrine/TASTE.md, `visual-vocabulary`).
{
  ok('a blurb that only restates the entry\'s own name is refused', (() => {
    try { checkBlurb('cut', 'fade', 'the fade cut fades'); return false; }
    catch (e) { return /only restates its own name/.test(e.message); }
  })());
  ok('a missing blurb is still refused, the older half of the same rule', (() => {
    try { checkBlurb('cut', 'fade', ''); return false; } catch (e) { return /has no blurb/.test(e.message); }
  })());
  // The direction that matters more: it must not fire on a real one. If this ever goes off, the RULE is
  // wrong, not the blurb.
  ok('a blurb that says one thing the name does not is accepted',
     checkBlurb('cut', 'fade', 'crossfade, the invisible cut') === undefined);
  ok('the refusal is wired into defineRegistry, not only blurbsOf', (() => {
    try { defineRegistry('t', { fade: 1 }, { blurbs: { fade: 'a fade that fades' } }); return false; }
    catch (e) { return /only restates its own name/.test(e.message); }
  })());
}


// ---- RETRIEVABILITY: does an entry's own description find that entry? ------------------------------
// The objective form of "is this blurb any good": take the blurb as the query, strip every word the
// NAME already carries (or the test grades itself), and ask where the entry lands in its own results.
// This measures DISTINCTIVENESS, never accuracy: a confidently wrong blurb full of rare words passes.
// Rank 1 is not the bar, because near-identical siblings legitimately cannot separate: `rise` and `up`
// are ALIASES with one sentence between them, and `scale` beaten by `punch` is two names for one move.
// TOP 3 is the bar. The report is harness/dev/blurb-retrieval.mjs; 98.1% clear it today.
{
  // Ranked the way rankQuery ranks: a SIDE_KIND sits on its own list, never in the vocabulary one, so
  // it must not compete here either. Read from arsenal's own SIDE_KINDS rather than naming `rule`
  // again: when skills joined that set, a hardcoded `rule` silently started measuring 19 entries
  // against a corpus they never rank in, which is a measurement of something the tool does not do.
  const corpus = (await arsenalCollect()).filter((e) => !arsenalSideKinds.has(e.kind));
  const own = (name) => new Set(String(name).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z0-9]+/g) || []);
  const selfRank = (e) => {
    const lower = e.name.toLowerCase(), parts = own(e.name);
    const qt = searchWords(e.blurb).filter((q) => !lower.includes(q) && !parts.has(q));
    if (!qt.length) return Infinity;
    const ranked = corpus.map((x) => ({ x, s: arsenalScore(x, qt) })).filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name));
    const i = ranked.findIndex((r) => r.x.name === e.name && r.x.kind === e.kind);
    return i < 0 ? Infinity : i + 1;
  };
  const blurbed = corpus.filter((e) => e.blurb && e.blurb.trim());
  const top3 = blurbed.filter((e) => selfRank(e) <= 3).length;
  // 97% is a RATCHET set just under where the vocabulary sits, not a round number: before the six terse
  // blurbs below it were rewritten the figure was 346/359, 96.4%, and this failed. MEASURED TODAY:
  // 796/819, 97.19%, which is 1.6 entries of slack. Two blurbs sliding out of their own top 3 turns
  // this red, so treat it as a live constraint when editing a blurb, not a formality.
  //
  // The corpus grew from 359 to 819 since that first figure, so the old 352/359 note is gone rather
  // than left to read as current.
  ok(`at least 97% of blurbs retrieve their own entry in the top 3 (${top3}/${blurbed.length})`,
     top3 / blurbed.length >= 0.97);
  // Infinity means the blurb left NO word after the name was stripped, or the entry is absent from its
  // own results. checkBlurb refuses the first case at load, so this is that refusal seen from outside.
  ok('no blurb in the engine is invisible to its own description',
     blurbed.every((e) => selfRank(e) !== Infinity));
}


// ---- dialsOf + bindDials: one owner for a kinetic default (core/registry/props.js, core/registry/knobs.js) ---------
//
// A kinetic preset used to state its dials TWICE, in its own signature and again in core/registry/knobs.js,
// and TEN defaults had drifted apart before anybody read both columns side by side. `stretch`
// destructures `from = 1.6` and the manifest advertised 0.4: a smear published as a shrink. The
// manifest is what `vawe_capabilities` hands an outside model, so that model wrote 0.4 to KEEP the
// default and got a frame the engine would never have produced, with no error anywhere.
{
  // 1. THE READER. It keeps the defaults, which is the whole difference from propsOf and paramsOf.
  ok('dialsOf: reads a preset\'s dials AND their defaults off its own signature',
    (() => { const d = dialsOf(PRESETS.up); return d && Object.keys(d).length === 1 && d.dist === 40; })());
  ok('dialsOf: reads a string, a boolean and a zero without turning any of them into a number',
    dialsOf(PRESETS.slide).dir === 'left' && dialsOf(PRESETS.draw).back === false
    && dialsOf(PRESETS.type).at === 0 && dialsOf(PRESETS.assemble).seed === 'assemble');
  ok('dialsOf: a colour default survives its own parentheses',
    dialsOf(PRESETS.highlight).color === 'rgba(255,220,90,0.35)');
  // A dial the signature NAMES but does not default (colorWave resolves both colours from the theme)
  // is present with an undefined value: the name is known, the default is not.
  ok('dialsOf: a dial with no stated default is named, not dropped', (() => {
    const d = dialsOf(PRESETS.colorWave);
    return 'flash' in d && d.flash === undefined && d.hold === 0.5;
  })());
  // 2. NULL IS "CANNOT SAY", NEVER "READS NONE" (core/registry/props.js:66-68 writes the rule down). `decode`
  // takes no options bag because animateUnits reads its dials for it, and an empty object here would
  // have deleted its three rows instead of leaving them hand-written.
  ok('dialsOf: a preset with no options bag returns null, not an empty set', dialsOf(PRESETS.decode) === null);
  ok('dialsOf: and so decode keeps its hand-written rows, defaults included',
    KNOBS.kinetic.decode.length === 3 && KNOBS.kinetic.decode[1].default === 48);

  // 3. THE REFUSALS, collected rather than thrown (build fix 10, adaptive safeguards wave 2): a
  // mismatch used to throw here, at module load, so one bad row crashed every `import` of this file.
  // The contract is unchanged, only WHEN it is enforced moved to DIAL_CONTRACT_VIOLATIONS + the
  // "dial contract" assertions further down this file. Each fixture uses its own preset name so it
  // cannot be mistaken for another fixture's violation, or for a real one.
  const fake = (fn) => fn;
  const violationsFor = (name, family, presets) => {
    const before = DIAL_CONTRACT_VIOLATIONS.length;
    bindDials(family, presets);
    return DIAL_CONTRACT_VIOLATIONS.slice(before).filter((v) => v.preset === name);
  };
  const contradiction = violationsFor('zzFixtureContradict',
    { zzFixtureContradict: [{ name: 'dist', type: 'number', default: 60, desc: 'rise px' }] },
    { zzFixtureContradict: fake((u, { dist = 40 } = {}) => u) });
  ok('bindDials: a hand-written default that contradicts the signature is collected, not thrown', contradiction.length === 1);
  ok('bindDials: and the message names BOTH numbers, so nobody has to go and look',
    /40/.test(contradiction[0].message) && /60/.test(contradiction[0].message) && /"dist"/.test(contradiction[0].message));
  const typo = violationsFor('zzFixtureTypo',
    { zzFixtureTypo: [{ name: 'dsit', type: 'number', desc: 'typo' }] },
    { zzFixtureTypo: fake((u, { dist = 40 } = {}) => u) });
  ok('bindDials: a dial the signature does not read is collected, and it lists what IS read',
    typo.some((v) => /does not[\s\S]*read/.test(v.message)));
  // The half that lost `assemble`'s five dials for its whole life: a real dial with no row is
  // invisible to vawe_capabilities, to `make knobs` and to the dead-knob validator.
  const missingRow = violationsFor('zzFixtureMissingRow', { zzFixtureMissingRow: [] },
    { zzFixtureMissingRow: fake((u, { spin = 65 } = {}) => u) });
  ok('bindDials: a signature dial with no manifest row is collected, and named', missingRow.length === 1 && /"spin"/.test(missingRow[0].message));
  ok('bindDials: a matching default is not a contradiction, and the row is bound',
    (() => {
      const fam = { zzFixtureMatch: [{ name: 'dist', type: 'number', default: 40, desc: 'rise px' }] };
      const clean = violationsFor('zzFixtureMatch', fam, { zzFixtureMatch: fake((u, { dist = 40 } = {}) => u) });
      return clean.length === 0 && fam.zzFixtureMatch[0].default === 40;
    })());

  // 4. THE LIVE MANIFEST. Every kinetic row's default now equals the signature's, by construction,
  // and the six presets that had no rows at all have them.
  const drift = [];
  for (const [name, fn] of Object.entries(PRESETS)) {
    const sig = dialsOf(fn); if (!sig) continue;
    for (const row of KNOBS.kinetic[name] || [])
      if (row.default !== (sig[row.name] === undefined ? null : sig[row.name])) drift.push(`${name}.${row.name}`);
  }
  ok(`knobs: every kinetic default is the signature's${drift.length ? ', drift: ' + drift.join(', ') : ''}`, drift.length === 0);
  for (const p of ['weight', 'shimmerWave', 'colorWave', 'strike', 'flap', 'assemble'])
    ok(`knobs: ${p} has manifest rows at all (it had none)`, (KNOBS.kinetic[p] || []).length > 0);
  ok('knobs: assemble advertises all five of its dials, `shuffle` included',
    ['dist', 'spin', 'shuffle', 'seed', 'blur'].every((d) => KNOBS.kinetic.assemble.some((r) => r.name === d)));
  // Every row still carries the part a signature CANNOT state. A row with no desc is a name in a list.
  const undescribed = Object.entries(KNOBS.kinetic).flatMap(([p, l]) => l.filter((r) => !r.desc).map((r) => `${p}.${r.name}`));
  ok(`knobs: every kinetic dial carries a desc${undescribed.length ? ': ' + undescribed.join(', ') : ''}`, undescribed.length === 0);
}


// ---- the search corpus and the catalogue are one population ------------------------------------
//
// The corpus read `*_REGISTRY` exports plus two hardcoded special cases (recipes, layer types), each
// added because its subject is not a registry. So a capability with no registry was invisible to the
// search this repo tells you to run before inventing anything: engine-doctrine/EFFECTS.md carried 639 effects and
// the corpus carried 445. `easeOutExpo`, `tiktok`, `wordFlash`, `refract` and `commaSplit` all returned
// NOTHING HERE CLEARLY MATCHES, over a sentence claiming 445 things had been searched. True about the
// corpus, false about the engine, and the worse kind of wrong because it reads as an answer.
{
  const { collect } = await import('../../harness/author/arsenal.mjs');
  const { sections } = await import('../../scripts/site/effects-catalog.mjs');
  const corpus = await collect();
  const catalogued = new Set(sections.flatMap(([, , names]) => (names || [])
    .map((e) => (typeof e === 'string' ? e : e && e.name)).filter(Boolean)));
  const missing = [...catalogued].filter((n) => !corpus.some((e) => e.name === n));
  ok(`arsenal: every name in the catalogue is searchable${missing.length ? ': ' + missing.slice(0, 6).join(', ') : ''}`,
    missing.length === 0);
  // The five that found nothing, named individually, because a population assertion passes the day
  // somebody shrinks both sides.
  for (const n of ['easeOutExpo', 'tiktok', 'wordFlash', 'refract', 'commaSplit']) {
    ok(`arsenal: \`${n}\` is in the corpus`, corpus.some((e) => e.name === n));
  }
  // A REGISTRY ENTRY MUST WIN over a catalogue row where both know a name, because only the registry
  // carries `slot` and `aka`. Losing that would quietly strip the paste target off half the answers.
  const anim = corpus.find((e) => e.name === 'defocus');
  ok('arsenal: a registry entry keeps its slot when the catalogue also lists it', !!anim && !!anim.slot);
}


// ── theme.look (W8, core/registry/theme-contract.js): refused at load with the near word, same discipline
// every other named vocabulary gets (core/registry/registry.js). A theme with no `look` is untouched by any of
// this: `look == null` short-circuits to a clean pass, asserted first so the optional-block contract
// itself is covered.
{
  const { lookErrors, LOOK_KEYS } = await import('../../core/registry/theme-contract.js');
  const { nearMisses } = await import('../../core/registry/registry.js');
  const bgNames = ['soft', 'paper', 'ink'];
  const transitionNames = ['fade', 'cinematicZoom', 'dissolve'];

  ok('theme.look: absent is clean (no look block is not an error)', lookErrors(null).length === 0);
  ok('theme.look: a complete, valid look is clean', lookErrors({
    backdrop: ['soft', 'paper'], scale: { hook: 90, headline: 60 }, layout: { anchor: 'left', margin: 160 },
    marks: { logo: 'x.svg', endCardSize: 140, headlineSize: 100 }, cuts: { default: 'fade', accent: 'dissolve' },
    field: { grain: 0, vignette: 0.1 },
  }, { bgNames, transitionNames, nearMisses }).length === 0);

  ok('theme.look: an unknown top-level key refuses with the near word', lookErrors({ backdorp: ['soft'] }, { bgNames, nearMisses })
    .some((m) => /look\.backdorp/.test(m) && /did you mean "backdrop"/.test(m)));
  // `cues` used to be a name here: dropped from LOOK_KEYS entirely, `buildSfx` (films/scene/scene.js)
  // already derives every cue from the transition actually used, so a fixed per-brand list is unanswerable.
  // `bgDefault`/`bgPalette` joined later: the retired top-level `theme.bgDefault`/`theme.bg` fields,
  // moved under `look` (core/theme/roles.js RETIRED_FIELDS), not a second top-level mechanism.
  ok('theme.look: LOOK_KEYS is the registry\'s own name list (one owner, not a second copy), and cues is gone',
    LOOK_KEYS.length === 8 && LOOK_KEYS.includes('backdrop') && LOOK_KEYS.includes('bgDefault') && LOOK_KEYS.includes('bgPalette') && !LOOK_KEYS.includes('cues'));

  ok('theme.look: a bad bg preset name refuses with the near word', lookErrors({ backdrop: ['sof'] }, { bgNames, nearMisses })
    .some((m) => /look\.backdrop names "sof"/.test(m) && /did you mean "soft"/.test(m)));
  ok('theme.look: a real bg preset passes even with bgNames handed in', lookErrors({ backdrop: ['soft'] }, { bgNames, nearMisses }).length === 0);
  ok('theme.look: backdrop names are unchecked (never assumed fine) when bgNames is not handed in, e.g. the browser boot path',
    lookErrors({ backdrop: ['not-a-real-preset'] }, {}).length === 0);

  ok('theme.look: a bad cut name refuses with the near word', lookErrors({ cuts: { default: 'fad' } }, { transitionNames, nearMisses })
    .some((m) => /look\.cuts\.default names "fad"/.test(m) && /did you mean "fade"/.test(m)));

  ok('theme.look: layout.anchor must be one of the three named directions', lookErrors({ layout: { anchor: 'up' } })
    .some((m) => /look\.layout\.anchor/.test(m)));
  ok('theme.look: scale values must be numbers', lookErrors({ scale: { hook: '90px' } })
    .some((m) => /look\.scale\.hook must be a number/.test(m)));

  // every theme pack this repo ships must itself be clean: the same live registries `make validate`
  // uses, so this is the real contract, not a mocked one.
  const { BG_NAMES: liveBg } = await import('../../core/backgrounds/index.js');
  const { TRANSITIONS: liveTransitions } = await import('../../core/transitions/catalog.js');
  const liveTransitionNames = liveTransitions.map((t) => t.name);
  const themeDir = path.join(repoRoot, 'themes');
  // themes/presets/ is gitignored (real-brand-named taste anchors, not redistributed) and may not
  // exist locally at all, e.g. right after a clean clone; an empty list is correct, not an error.
  const presetsDir = path.join(themeDir, 'presets');
  const themeFiles = fs.readdirSync(themeDir).filter((n) => n.endsWith('.json'))
    .concat(fs.existsSync(presetsDir) ? fs.readdirSync(presetsDir).filter((n) => n.endsWith('.json')).map((n) => `presets/${n}`) : []);
  let themeLookErrs = 0;
  for (const tf of themeFiles) {
    const t = JSON.parse(fs.readFileSync(path.join(themeDir, tf), 'utf8'));
    if (!t.look) continue;
    const errs = lookErrors(t.look, { bgNames: liveBg, transitionNames: liveTransitionNames, nearMisses });
    if (errs.length) { themeLookErrs++; console.error(`  theme ${tf}: ${errs.join('; ')}`); }
  }
  ok('theme.look: every shipped theme with a `look` block validates clean against the live registries', themeLookErrs === 0);
}

// ── site-counts SEES THE DOC SURFACES, AND STILL FAILS ON THEM ──────────────────────────────────
// The gate's rule was never wrong; its FILES list was. It stopped at site/ while
// docs-site/content/docs/layers.mdx said "fourteen types" against a registry of twenty-three and then
// listed fourteen, hiding nine primitives from every reader who took the page as the vocabulary.
// FILES is now walked rather than typed, so the thing to assert is the RESOLVED list: a walk that
// silently returns nothing looks exactly like a clean run, which is how the blind spot survived.
{
  const gate = path.join(repoRoot, 'quality/gates/site-counts.mjs');
  const files = spawnSync('node', [gate, '--files'], { encoding: 'utf8', cwd: repoRoot })
    .stdout.split('\n').filter(Boolean);
  ok('site-counts: the resolved surface list reaches docs-site/content/docs',
    files.includes('docs-site/content/docs/layers.mdx'));
  ok('site-counts: and engine-doctrine/', files.includes('engine-doctrine/PRIMITIVES.md'));
  ok('site-counts: while keeping the site surfaces it already had',
    files.includes('site/lib/features.ts') && files.includes('site/public/vawe-rules.md'));
  ok('site-counts: engine-doctrine/MISTAKES.md stays out, it is a log of numbers that WERE wrong',
    !files.includes('engine-doctrine/MISTAKES.md'));

  // Discovery is only half of it: a file can be in the list and still be read by nobody. Plant a
  // stale count in each new surface and require the gate to name that file. Both were proved to fail
  // by planting the number first and watching the gate stay green before the widening landed.
  const planted = [
    ['docs-site/content/docs/_lib-test-count.mdx', '# probe\n\nThere are 3 layer types.\n'],
    ['engine-doctrine/_LIB-TEST-COUNT.md', '# probe\n\nThe engine ships 3 kinetic presets.\n'],
  ];
  for (const [rel, body] of planted) {
    const abs = path.join(repoRoot, rel);
    try {
      fs.writeFileSync(abs, body);
      const r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
      ok(`site-counts: a wrong count in ${rel.split('/')[0]}/ is caught`,
        r.status === 1 && r.stderr.includes(rel));
    } finally { fs.rmSync(abs, { force: true }); }
  }

  // The waiver has to cost a sentence. `doc-refs-allow` set the precedent and this one copies it:
  // a bare marker is the cheap way out of a real stale number, so it does not count.
  const abs = path.join(repoRoot, 'engine-doctrine/_LIB-TEST-COUNT.md');
  try {
    fs.writeFileSync(abs, '<!-- site-counts-allow: the number below is a probe -->\nThere are 3 layer types.\n');
    ok('site-counts: a waiver WITH a reason silences the line',
      spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot }).status === 0);
    fs.writeFileSync(abs, '<!-- site-counts-allow: -->\nThere are 3 layer types.\n');
    ok('site-counts: a waiver with no reason does not',
      spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot }).status === 1);
  } finally { fs.rmSync(abs, { force: true }); }

  // ── AND IT READS THE TOOLS, WHICH IS WHERE A STALE COUNT COSTS MOST ───────────────────────────
  // A wrong number in marketing copy oversells the product. A wrong number in a gate's own finding
  // sends an author to a capability that is not there, or away from one that is: block-schema printed
  // "154 of 155 blocks" over a registry of 185, doc-map advertised engine-doctrine/EFFECTS.md as "15 families"
  // over 53, and feature-audit answered a monotony warning with "21 presets available" over 31. Same
  // class as `make sfx` in audio-check (the make-target test above), and nothing checked it either.
  // `make arsenal` is the shape to copy: it prints `all.length`, so it cannot be wrong.
  ok('site-counts: the resolved surface list reaches the author-facing tools',
    files.includes('harness/author/arsenal.mjs') && files.includes('quality/gates/audio-check.mjs'));
  {
    // The extension is joined rather than written, because `make check GATE=doc-refs` reads this file too and a
    // literal `quality/gates/*.mjs` in it is a script path the repo does not have. A probe that exists
    // for a hundred milliseconds is not a promise to a reader, so it must not read as one.
    const probe = path.join(repoRoot, 'quality/gates', ['_lib-test-count', 'mjs'].join('.'));
    try {
      // A CLAIM IN CODE and the SAME CLAIM IN A COMMENT, in one file, because the second is what makes
      // this check survivable. Every gate header in this repo discusses counts that were wrong once,
      // site-counts.mjs quotes four of them in its own opening paragraph, and a matcher that reads
      // comments reports the incident log. doc-refs.mjs:145 wrote that lesson down after reporting
      // `make builds` as missing when it was quoted inside a comment.
      fs.writeFileSync(probe, [
        '// the engine ships 3 kinetic presets, and this line must stay invisible to the gate',
        'console.log("the engine ships 3 kinetic presets");',
        '',
      ].join('\n'));
      let r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
      ok('site-counts: a wrong count printed by a script is caught, with its file and line',
        r.status === 1 && /quality\/gates\/_lib-test-count\.mjs:2\b/.test(r.stderr));
      ok('site-counts: and the identical claim on line 1 is not, because it is a comment',
        !/_lib-test-count\.mjs:1\b/.test(r.stderr));
      // `cuts` is the one subject the code surface drops, and it is dropped on measurement rather than
      // on taste: five of the seven bare-noun hits across both script directories say "cuts" and mean
      // an edit, a film version or a scene count. "needs 2 cuts or seams" is a validator message,
      // "Two cuts of the same film" is the judging rubric, "no cuts by design" is a waiver reason.
      // `blocks` is NOT dropped, because block-schema.mjs printed "154 of 155 blocks" over a registry
      // of 185 and that is the finding this whole surface exists for.
      fs.writeFileSync(probe, 'console.log("this film has 2 cuts");\n');
      r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
      ok('site-counts: a bare `cuts` in a script is left alone, it is an edit and not the registry',
        r.status === 0);
      fs.writeFileSync(probe, 'console.log("154 of 155 blocks put their anchor top-left");\n');
      r = spawnSync('node', [gate], { encoding: 'utf8', cwd: repoRoot });
      ok('site-counts: and a bare `blocks` is not, which is the claim block-schema actually printed',
        r.status === 1 && /_lib-test-count\.mjs:1\b/.test(r.stderr));
    } finally { fs.rmSync(probe, { force: true }); }
  }
}


// ---- dial contract (core/registry/knobs.js bindDials): the mismatch check used to throw at module
// load, so one preset a day behind its own row list took the whole engine down on import. It now
// COLLECTS into DIAL_CONTRACT_VIOLATIONS instead, and this is where the contract is actually enforced:
// a real mismatch fails this gate by name, same as the old throw did, but a broken preset can no longer
// crash every other render on the way in. ----
{
  const before = DIAL_CONTRACT_VIOLATIONS.length;
  let threw = false;
  try {
    // a preset whose signature reads a dial ("undocumentedDial") that core/knobs.js never lists: the
    // exact "a dial with no row" case the old code threw on at import.
    bindDials({ fakePreset: [] }, { fakePreset: ({ undocumentedDial = 1 } = {}) => ({ undocumentedDial }) });
  } catch { threw = true; }
  ok('bindDials: a preset with an undocumented dial no longer throws at bind time', !threw);
  ok('bindDials: the mismatch is collected instead, naming the preset and the dial',
    DIAL_CONTRACT_VIOLATIONS.slice(before).some((v) => v.preset === 'fakePreset' && v.dial === 'undocumentedDial'));

  // REAL_DIAL_VIOLATIONS was snapshotted at the top of this file, right after import (so before this
  // or any other fixture ran bindDials again): it is exactly what `bindDials(KNOBS.kinetic, PRESETS)`
  // found in the real repo at module load, none of the synthetic entries every fixture above adds.
  if (REAL_DIAL_VIOLATIONS.length) for (const v of REAL_DIAL_VIOLATIONS) console.error(`  dial contract: ${v.preset}.${v.dial}: ${v.message}`);
  ok('dial contract: every real kinetic preset\'s dials and knobs.js rows agree', REAL_DIAL_VIOLATIONS.length === 0);
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 243, `expected at least 243 assertions (the count this file was split with) to have run, saw ${pass}`);
});
