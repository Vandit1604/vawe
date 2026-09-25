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

test('lib-test: type', async () => {
// ---- the `wght` axis reaches a HEADLINE, not only a caption --------------------------------------
// wght() writes BOTH channels on purpose: 11 of the 31 vendored faces carry no axis and ignore
// font-variation-settings silently, so the fontWeight half is what keeps the ramp from being a dead
// still on them. That is the assertion, not an implementation detail.
{
  ok('wght says the weight in both channels', (() => {
    const w = wght(634);
    return w.fontVariationSettings === "'wght' 634" && w.fontWeight === '600';
  })());
  ok('wght: the STATIC-face channel is a legal CSS 100-step at every point of a ramp',
    [100, 213, 455, 634, 780, 900].every((n) => /^[1-9]00$/.test(wght(n).fontWeight)));
  ok('wght clamps to the axis range rather than emitting a value no face has',
    wght(-40).fontVariationSettings === "'wght' 100" && wght(5000).fontVariationSettings === "'wght' 900");
  const axis = (u) => +/'wght' (\d+)/.exec(PRESETS.weight(u).fontVariationSettings)[1];
  ok('preset `weight` thickens monotonically from its floor to its ceiling',
    axis(0) === 200 && axis(1) === 800 && axis(0.25) < axis(0.5) && axis(0.5) < axis(0.75));
  ok('preset `weight` reads its own from/to', (() => {
    const w = PRESETS.weight(1, { from: 300, to: 500 });
    return w.fontVariationSettings === "'wght' 500";
  })());
  ok('preset `weight` degrades to a static cut too: it never writes the axis alone',
    PRESETS.weight(0.5).fontWeight != null);
}


// ---- wordSlot: the box is the WIDEST candidate, and the clock picks which one shows ---------------
// The sizing is CSS (one grid cell, every candidate in it), so what a headless test can prove is the
// STRUCTURE that gets that sizing and the index arithmetic that drives it. A fake DOM, the same shape
// the preloadImages block above uses, because the real one is a browser.
{
  const mkEl = (tag) => ({
    tag, style: {}, attrs: {}, childNodes: [], get children() { return this.childNodes.filter((n) => n.nodeType === 1); },
    nodeType: 1, parentNode: null,
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; },
    insertBefore(n, ref) { const i = ref ? this.childNodes.indexOf(ref) : this.childNodes.length; n.parentNode = this; this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, n); return n; },
    querySelector() { return this.childNodes.find((n) => n.nodeType === 1 && n.attrs && n.attrs['data-word-slot']) || null; },
  });
  const priorDoc = globalThis.document;
  globalThis.document = { createElement: mkEl, createTextNode: (v) => ({ nodeType: 3, nodeValue: v, parentNode: null }) };
  const ws = await import('../../core/fx/word-slot.js');

  const mount = (text) => { const el = mkEl('div'); el.appendChild(globalThis.document.createTextNode(text)); return el; };
  const WORDS = ['docs', 'dashboards', 'specs'];
  const el = mount('Ship {} in seconds');
  ws.build(null, el, {}, { words: WORDS });
  const slot = el.querySelector();
  ok('wordSlot puts EVERY candidate in the same grid cell. That is what sizes the box to the widest',
    slot && slot.children.length === 3 && slot.children.every((c) => c.style.gridArea === '1 / 1'));
  ok('wordSlot leaves the text before and after the placeholder in place',
    el.childNodes[0].nodeValue === 'Ship ' && el.childNodes[2].nodeValue === ' in seconds');
  ok('wordSlot never hides a candidate with display/visibility. A hidden grid item must still size the track',
    slot.children.every((c) => c.style.display == null && c.style.visibility == null));

  const opac = (t) => { ws.frame(null, el, { start: 0 }, t, null, { words: WORDS, every: 1, swap: 0.25 });
    return slot.children.map((c) => +c.style.opacity); };
  ok('wordSlot holds word 0 before the first swap: a slot is never blank',
    opac(0)[0] === 1 && opac(0.9)[0] === 1);
  ok('wordSlot crossfades exactly two words mid-swap and nothing else',
    (() => { const o = opac(1.125); return Math.abs(o[0] - 0.5) < 0.02 && Math.abs(o[1] - 0.5) < 0.02 && o[2] === 0; })());
  ok('wordSlot settles on word 1 after its swap window', opac(1.6)[1] === 1);
  ok('wordSlot HOLDS the last word past the end rather than blanking',
    opac(9)[2] === 1 && opac(9)[0] === 0);
  ok('wordSlot loops back to the first word when asked', (() => {
    ws.frame(null, el, { start: 0 }, 3.6, null, { words: WORDS, every: 1, swap: 0.25, loop: true });
    return +slot.children[0].style.opacity === 1;
  })());
  ok('wordSlot is pure in t: the same second twice gives the same frame',
    JSON.stringify(opac(1.4)) === JSON.stringify(opac(1.4)));
  // The gates read the DOM, and every candidate is in it so the box can be sized to the widest. Exactly
  // the words NOT on screen this frame must say so, or the audit grades the film against all of them
  // concatenated and manufactures a finding whose only fix is to make the film worse.
  const inkOff = (t) => { opac(t); return slot.children.map((c) => c.attrs['data-ink'] || 'on'); };
  ok('wordSlot marks every off-screen candidate as not-ink, and only those',
    JSON.stringify(inkOff(0.4)) === JSON.stringify(['on', 'off', 'off'])
    && JSON.stringify(inkOff(2.0)) === JSON.stringify(['off', 'on', 'off']));
  ok('wordSlot marks BOTH words as ink mid-swap: a crossfade really does show two',
    JSON.stringify(inkOff(1.125)) === JSON.stringify(['on', 'on', 'off']));

  ok('wordSlot refuses one word, a swap longer than the hold, an unknown key and a missing placeholder', [
    () => ws.build(null, mount('Ship {} fast'), {}, { words: ['docs'] }),
    () => ws.build(null, mount('Ship {} fast'), {}, { words: WORDS, swap: 2, every: 1 }),
    () => ws.build(null, mount('Ship {} fast'), {}, { words: WORDS, chipp: true }),
    () => ws.build(null, mount('Ship it fast'), {}, { words: WORDS }),
    () => ws.build(null, mount('Ship {} fast'), { split: 'word' }, { words: WORDS }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));
  ok('wordSlot chip: the brand plate carries the guaranteed ink for that fill, never a hex', (() => {
    const e2 = mount('Ship {} fast');
    ws.build(null, e2, {}, { words: WORDS, chip: true });
    const s2 = e2.querySelector();
    return s2.style.background === 'var(--accent)' && s2.style.color === 'var(--on-accent)';
  })());

  globalThis.document = priorDoc;
}


  assert.equal(fail, 0, `${fail} of ${pass + fail} assertion(s) failed`);
  assert.ok(pass >= 19, `expected at least 19 assertions (the count this file was split with) to have run, saw ${pass}`);
});
