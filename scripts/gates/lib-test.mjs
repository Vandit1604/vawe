// scripts/gates/lib-test.mjs: fast pure-JS asserts for the motion primitives in core/motion.js.
// No browser needed (the primitives are pure). Run: node scripts/gates/lib-test.mjs  (make lib-test)
import { clamp01, lerp, interpolate, spring, springSettle, track, rise, fade, pop, slide, easeOutCubic,
  random, noise, stagger, hashSeed, resolveEasing, EASINGS, motionDefaults, DEFAULT_MOTION,
  sequence, wipe, circleWipe, clockWipe, shake, pulse, accel, decel, speedRamp, trackingFor, springEase,
  anticipateEase, overshootEase, stepClock } from '../../core/motion.js';
import { layerTime, TIME_REMAP_NAMES, TIME_REMAP_BLURBS } from '../../core/time.js';
import { unitProgress, PRESETS, PRESET_BLURBS, wght, staggerOffset, staggerStep, gsapStagger, decodeText, DECODE_CHARS, STAGGER_FROM } from '../../core/type.js';
import { PRESENTATIONS, cutStyle, soloCutStyle, SOLO_BLIND, CUT_BLURBS, cutWrites } from '../../core/cuts.js';
import { PRESENTATIONS as CUT_PRESENTATIONS_AK } from '../../core/cuts.js';
import { killedBy, capabilitiesOf, checkCuts } from '../../core/ancestor-kills.js';
import { ANIM_NAMES, ANIM_BLURBS, clipStyleAt, WARPABLE, entranceWarp } from '../../core/clips.js';
import { IDLE, IDLE_NAMES, IDLE_BLURBS, IDLE_IDENTITY, idleAt, idlePhase, idleTransform,
  normalizeIdle, settledGain } from '../../core/idle.js';
import { SEAM_BLURBS } from '../../core/seams.js';
import { FX_TYPES, FX_BLURBS } from '../../core/fx/index.js';
import { GSAP_FX, EXIT_FX, GSAP_BLURBS, GSAP_EXIT_BLURBS, LOOP_FX, ONESHOT_FX } from '../../core/gsap-effects.js';
import { BG_NAMES, BG_BLURBS } from '../../core/backgrounds.js';
import { RESAMPLE_BLURBS } from '../../core/resample-fx.js';
import { CAP_STYLE_NAMES, CAPTION_BLURBS } from '../../core/captions.js';
import { COMPOSITION_NAMES, COMPOSITION_BLURBS } from '../../core/compositions/index.js';
import { PROFILES } from '../author/profiles.mjs';
import { createKit, GLYPH_PAINTERS, paintsOwnGlyphs } from '../../core/layers/util.js';
import { cameraAt, dollyZ, motionAt, resolveKeyedProps, poseBack, velocityAt } from '../../core/sequence.js';
import { frame as squashFrame, build as squashBuild } from '../../core/fx/squash.js';
import { frame as lagFrame, build as lagBuild } from '../../core/fx/lag.js';
import { frame as matteFrame, build as matteBuild } from '../../core/fx/matte.js';
import { frame as uprightFrame, build as uprightBuild } from '../../core/fx/upright.js';
import { mergePan } from '../../core/pan-resolve.mjs';
import { patchMotion, upsertKey, layerSpan, matchBracket, applyOps } from '../author/patch-motion.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARGIN, MAX_ZOOM } from '../../core/safe.js';
import { safeArea, DESTINATION_NAMES, nativeAspect, sceneDims, captionBand, frameOf, outOfFrame, settleWindow, reportBounds, boundsCheckOn } from '../../core/safe.js';
import { resolveFilter, parseColor, FILTER_PRESETS, FILTER_REGISTRY, ensureFilterDef } from '../../core/filters.js';
import fsMod from 'node:fs';
import { defineRegistry, registries, catalogued } from '../../core/registry.js';
import { presentIn, existingAt, newSince, WINDOW_DAYS } from '../author/recency.mjs';
import { collect as arsenalCollect, coverageIn, CONFIDENT, snippet as arsenalSnippet, toks as arsenalToks } from '../author/arsenal.mjs';
import { token, literal, lit, resolveColor } from '../../core/color.js';
import { frame as varsFrame } from '../../core/tracks/vars.js';
import { junctionTable, resolveJunction, isJunctionRef, marksOf, bindWindowsToJunctions, bindMatchesToJunctions, MATCH_HANDOVER_SHARE } from '../../core/junctions.js';
import { applyComposite } from '../../core/looks.js';
import { bakeCanvasFx } from '../../core/canvas-fx.js';
import { DIRS } from '../../core/cuts.js';
import { SPECTACLE_GAIN, attenuated, attenuatedKick, KNOBS, bindDials } from '../../core/knobs.js';
import { dialsOf } from '../../core/props.js';
import { resolveSpectacle } from '../../core/spectacle.js';
import { okDir as seamDir } from '../../core/seams.js';
import { BEATS } from '../../blueprints/index.mjs';
import { DEPRECATED_FX, DEPRECATED_EXIT } from '../../core/gsap-effects.js';
import { produceBaseline } from '../../core/produce.js';
import { lintData, easeErrors, bgErrors, matchErrors, durationWordErrors, cssErrors } from '../../core/validate.mjs';
import { FEEL, DURATION, CAMERA_WORDS, resolveSeconds, resolveCameraMove, verifyVocab } from '../../core/vocab.js';
import { BASE_ENTER } from '../../core/clips.js';
import { CUT_REGISTRY } from '../../core/cuts.js';
import { CUT_CUE } from '../../core/audio-cues.js';
import { ANIM_REGISTRY } from '../../core/clips.js';
import { PART_NAMES, PART_BLURBS, PARTS } from '../../core/parts.js';
import { FALLOFFS, FALLOFF_NAMES, FALLOFF_BLURBS, DRIVES, DRIVE_NAMES, effectorAt, effectorStyle } from '../../core/effector.js';
import { cutVelocityAdvice, layerSpeedAt, cameraSpeedAt } from '../../core/velocity-cut.js';
import { TRACK_TYPES, SLOTS } from '../../core/tracks/index.js';
import { bgPaletteFrom } from '../../core/backgrounds.js';
import { parseColorRGB } from '../../core/motion.js';
import { toRgb as lightfieldToRgb } from '../../core/lightfield/colour.js';
import { presetSpec, pulseOpacity, alphaMix, liftWhite, cycleHue, flashEnvelope } from '../../core/layers/glow.js';
import { lerpPoints, pointsToD, bestRotation, rotatePoints, morphD } from '../../core/path-morph.js';
import { beamAngle, shinePos, beamConic } from '../../core/layers/beam.js';
import { typedLen, gradientCss, splitFillCss } from '../../core/layers/text.js';
import { rollOffsets, displayNum } from '../../core/layers/count.js';
import { dollyZoom, slowPush, diveIn, panFollow, workspaceZoomOut, orbit, multiPhase, travel, truck, cameraShake, punchIn, driftHold, followCursor, buildCameraMove, CAMERA_MOVE_NAMES } from '../../core/camera-moves.js';
import { bakeCameraMove } from '../../core/produce.js';
import { capWords, capUnitWins, capShape, wordU, lineU, CAP_STYLES } from '../../core/captions.js';
import { BLOCKS, CATEGORY_OF, NOT_A_BLOCK } from '../../blocks/index.mjs';
import { SHADER_FX } from '../../core/stings.js';
import { AMBIENT_FX, AMBIENT_SHADERS } from '../../core/shaders-ambient.js';
import { shaderAt as ambientShaderAt, validate as ambientValidate } from '../../core/surfaces/shader.js';
import { raymarchAt, validate as raymarchValidate } from '../../core/surfaces/raymarch.js';
import { resolveComposite, LOOKS, LOOK_NAMES, isLook, lookName, KNOB_ROUTES, liveKnobs } from '../../core/looks.js';
import { luma, BAYER4, bayerAt, cellAverage, hash01, canvasFxKey, CANVAS_FX_NAMES, resolveFxSpec, CANVAS_FX_PRESETS } from '../../core/canvas-fx.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { CUES, renderCue, musicBed, normalize, biquad, SR } from '../../core/audio-kit.mjs';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid, snapToBeat, downbeats } from '../../core/beats.js';
import { beatSyncOf, beatGridPath, bindBeats, snapJoints, unrollGrid, beatPeriod, DEFAULT_MAX_SHIFT } from '../../core/beat-bind.js';
import { lift } from '../../core/motion.js';
import { opacityEnvelope, ANIM } from '../../core/clips.js';
import { FX_PARAMS, bgOptKeys, bgOverErrors, bgPreset, applyBgOver } from '../../core/backgrounds.js';
import { bandEnergies, sampleAt, BANDS } from '../../core/spectrum.js';
import { ransomGlyph, ransomSwatches, RANSOM_FACES } from '../../core/ransom.js';
import { boundaryMechanism, lowerScene, checkStingColor } from '../../core/transitions-lower.js';
import { SEAM_FX } from '../../core/seams.js';
import { SEAM_CUE } from '../../core/audio-cues.js';
import { resolveBridges } from '../../core/audio-bridges.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { THREE_FX } from '../../core/three-scenes.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let pass = 0, fail = 0;
const r2gain = (v) => Math.round(v * 1000) / 1000;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('✗ ' + name); } };

// `node scripts/gates/lib-test.mjs --colours` prints what the ONE parser now does with the colours
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
  console.log('\n  the one colour parser · core/motion.js\n');
  for (const [v, why] of rows) {
    const t = parseColor(v), o = parseColorRGB(v);
    let lf; try { lf = JSON.stringify(lightfieldToRgb(v)); } catch { lf = 'refused'; }
    console.log(`  ${JSON.stringify(v).padEnd(24)} ${String(JSON.stringify(t)).padEnd(14)} ${String(JSON.stringify(o)).padEnd(26)} lightfield:${lf.padEnd(10)} ${why}`);
  }
  console.log('');
  process.exit(0);
}

// clamp01 / lerp
ok('clamp01 below', clamp01(-2) === 0);
ok('clamp01 above', clamp01(5) === 1);
ok('lerp mid', approx(lerp(0, 10, 0.5), 5));

// interpolate
ok('interp at start', interpolate(0, [0, 1], [10, 20]) === 10);
ok('interp at end', interpolate(1, [0, 1], [10, 20]) === 20);
ok('interp mid', approx(interpolate(0.5, [0, 1], [10, 20]), 15));
ok('interp clamp low', interpolate(-3, [0, 1], [10, 20]) === 10);
ok('interp clamp high', interpolate(9, [0, 1], [10, 20]) === 20);
ok('interp multi-stop', approx(interpolate(2, [0, 1, 4], [0, 100, 400]), interpolate(2, [1, 4], [100, 400])));
ok('interp segment B', approx(interpolate(2.5, [0, 1, 4], [0, 100, 400]), 100 + (400 - 100) * ((2.5 - 1) / 3)));
ok('interp easing applied', approx(interpolate(0.5, [0, 1], [0, 1], { easing: easeOutCubic }), easeOutCubic(0.5)));
ok('interp no-extrapolate guard', interpolate(5, [0, 1], [0, 1], { clamp: false }) >= 0); // doesn't throw

// spring (analytic, pure)
ok('spring 0', spring(0) === 0);
ok('spring settles to ~1', approx(spring(5, { settle: 0.6 }), 1, 0.02));
ok('spring rises early', spring(0.1) > 0 && spring(0.1) < 1.5);
ok('spring overshoots when bouncy', (() => { let m = 0; for (let t = 0; t < 1; t += 0.01) m = Math.max(m, spring(t, { bounce: 0.6, settle: 0.5 })); return m > 1.0; })());
ok('spring no overshoot at bounce 0', (() => { let m = 0; for (let t = 0; t < 2; t += 0.01) m = Math.max(m, spring(t, { bounce: 0, settle: 0.6 })); return m <= 1.0001; })());
ok('spring deterministic', spring(0.37, { bounce: 0.4 }) === spring(0.37, { bounce: 0.4 }));
ok('springSettle positive finite', (() => { const s = springSettle({ bounce: 0.3, settle: 0.6 }); return s > 0 && Number.isFinite(s); })());

// track
const beats = [{ name: 'a', dur: 1 }, { name: 'b', dur: 2 }, { name: 'c', dur: 1 }];
ok('track first beat', track(0, 30, beats).name === 'a');
ok('track t01 mid', approx(track(15, 30, beats).t01, 0.5));        // 0.5s into 'a' (dur 1)
ok('track second beat', track(45, 30, beats).name === 'b');       // 1.5s → 'b'
ok('track t01 in range', (() => { for (let n = 0; n < 120; n += 7) { const r = track(n, 30, beats); if (r.t01 < 0 || r.t01 > 1) return false; } return true; })());
ok('track past end → last beat', track(1000, 30, beats).name === 'c');
ok('track localT', approx(track(45, 30, beats).localT, 0.5));     // 1.5s - start(1.0) = 0.5

// transition helpers
ok('rise shape', (() => { const s = rise(0); return s.transform.includes('translateY') && s.opacity === 0; })());
ok('rise settled', (() => { const s = rise(1); return approx(s.opacity, 1) && s.transform.includes('translateY(0'); })());
ok('fade', fade(0.5).opacity === 0.5);
ok('pop opacity clamped', pop(1).opacity === 1 && pop(1).transform.includes('scale'));
ok('slide dir', slide(0, 'left', 60).transform.includes('-60') || slide(0, 'left', 60).transform.includes('-6'));

// seeded randomness: deterministic, in-range, seed-sensitive
ok('random in [0,1)', (() => { for (let i = 0; i < 200; i++) { const r = random(i); if (r < 0 || r >= 1) return false; } return true; })());
ok('random deterministic', random(42) === random(42) && random('x') === random('x'));
ok('random seed-sensitive', random(1) !== random(2) && random('a') !== random('b'));
ok('hashSeed uint32', Number.isInteger(hashSeed(7)) && hashSeed(7) >= 0 && hashSeed(7) < 2 ** 32);
ok('noise in [0,1)', (() => { for (let x = 0; x < 20; x += 0.3) { const v = noise(x, 5); if (v < 0 || v >= 1) return false; } return true; })());
ok('noise continuous at lattice', approx(noise(3, 9), random('9:3'), 1e-9));
ok('noise deterministic', noise(2.5, 1) === noise(2.5, 1));

// stagger
ok('stagger 0', stagger(0) === 0);
ok('stagger step', approx(stagger(3, 0.1), 0.3));

// easing registry
ok('resolveEasing by name', resolveEasing('easeOutCubic') === EASINGS.easeOutCubic);
ok('resolveEasing passthrough fn', (() => { const f = (t) => t; return resolveEasing(f) === f; })());
// ABSENT and WRONG are different questions, so they get different answers and one assertion each.
ok('resolveEasing absent → easeOutCubic', resolveEasing(null) === easeOutCubic && resolveEasing('') === easeOutCubic);
ok('resolveEasing unknown → throws', (() => { try { resolveEasing('nope'); return false; } catch { return true; } })());
// A GSAP ease is a REAL name in the other vocabulary, which is the #355 wrong-slot mistake. The error
// has to say so, or it reads as "that curve does not exist" when the curve exists one field away.
ok('resolveEasing names the wrong slot for a GSAP ease', (() => {
  try { resolveEasing('power2.inOut'); return false; } catch (e) { return /GSAP ease/.test(e.message) && /parts\[\]\.ease/.test(e.message); }
})());
// Every easing the LIBRARY names must resolve: the census that made throwing safe, kept as a gate.
ok('resolveEasing accepts every name the library uses', ['linear', 'easeOutCubic', 'easeInOutCubic', 'ramp', 'spring', 'springEase', 'settle', 'snap', 'brake', 'rush'].every((n) => typeof resolveEasing(n) === 'function'));
ok('EASINGS linear', EASINGS.linear(0.42) === 0.42);

// ---- core/vocab.js: the plain words, accepted where the concrete value is ----
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
  // because core/vocab.js is a leaf (core/motion.js imports it) and cannot check itself at import.
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
  // `medium` is BASE_ENTER. Asserted rather than imported: core/clips.js imports core/motion.js, which
  // imports core/vocab.js, and the cycle is not worth one constant.
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
  // The cross-registry hint core/registry.js exists for.
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
  ok('vocab: lowerScene carries a word through transition.dur', (() => {
    const d = lowerScene({ layers: [{ text: 'A', transition: { in: 'rise', out: 'fade', dur: 'fast' } }] });
    return d.layers[0].enterDur === DURATION.fast && d.layers[0].exitDur === DURATION.fast;
  })());
  ok('vocab: lowering is idempotent (a resolved number stays itself)', (() => {
    const d = lowerScene({ layers: [{ text: 'A', enterDur: 'fast' }] });
    return lowerScene(d).layers[0].enterDur === DURATION.fast;
  })());
  // The validator must accept what the renderer accepts and refuse what it refuses, at the entry point.
  ok('vocab: validate accepts a known duration word',
    durationWordErrors({ layers: [{ enterDur: 'fast', transition: { dur: 'slow' } }] }).length === 0);
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

// The engine carries TWO easing vocabularies and the FIELD decides which is in force. The exclusion
// list is the whole rule, and it can rot in silence: too strict invents findings on scenes that name a
// GSAP ease correctly (showcase-lumen, showcase-type-labour both do), too loose and the wrong-slot
// name renders on a curve nobody chose. One assertion per direction. docs/MISTAKES.md #381.
ok('easeErrors: a GSAP ease in an engine field is caught', (() => {
  const e = easeErrors({ layers: [{ motion: [{ t: 0 }, { t: 1, ease: 'power2.inOut' }] }] });
  return e.length === 1 && /GSAP ease/.test(e[0]);
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

// motionDefaults
ok('motionDefaults resolves easing to fn', typeof motionDefaults({ motion: { easing: 'easeOutQuart' } }).easing === 'function');
ok('motionDefaults falls back to DEFAULT', motionDefaults(undefined).bounce === DEFAULT_MOTION.bounce);
ok('motionDefaults keeps overrides', motionDefaults({ motion: { enter: 99 } }).enter === 99);
ok('motionDefaults durationScale default 1', motionDefaults({ motion: {} }).durationScale === 1);

// sequencing: segments with transition windows (trans=0.4 default)
const segs = [{ name: 's1', dur: 2 }, { name: 's2', dur: 2 }, { name: 's3', dur: 1 }];
ok('sequence picks segment', sequence(30, 30, segs).name === 's1');            // 1s → s1
ok('sequence second segment', sequence(90, 30, segs).name === 's2');           // 3s → s2
ok('sequence enter ramps from 0', approx(sequence(0, 30, segs).enter, 0));     // start of s1
ok('sequence enter completes', sequence(30, 30, segs).enter === 1);            // 1s in → past 0.4 trans
ok('sequence exit 0 mid-segment', sequence(30, 30, segs).exit === 0);          // 1s in, not near end
ok('sequence exit ramps at end', sequence(59, 30, segs).exit > 0);             // ~1.97s into s1 (dur 2)
ok('sequence active in [0,1]', (() => { for (let n = 0; n < 150; n += 3) { const a = sequence(n, 30, segs).active; if (a < 0 || a > 1) return false; } return true; })());
ok('sequence deterministic', sequence(77, 30, segs).active === sequence(77, 30, segs).active);
// holdLast (default): the LAST segment never exits. The ending holds through the final frame
ok('sequence last segment holds (exit 0)', sequence(149, 30, segs).exit === 0);          // ~4.97s, end of s3
ok('sequence last segment fully active', sequence(149, 30, segs).active === 1);          // no fade at the end
ok('sequence holdLast:false restores exit', sequence(149, 30, segs, { holdLast: false }).exit > 0.9);
ok('sequence holdLast leaves earlier exits alone', sequence(59, 30, segs).exit > 0);     // s1 still exits

// transitions → clip-path strings, monotonic reveal
ok('wipe hidden at 0', wipe(0, 'left').clipPath.includes('100%'));
ok('wipe revealed at 1', wipe(1, 'left').clipPath === 'inset(0 0% 0 0)');
ok('wipe has webkit alias', wipe(0.5).WebkitClipPath === wipe(0.5).clipPath);
ok('circleWipe grows', parseFloat(circleWipe(1).clipPath.match(/[\d.]+/)[0]) > parseFloat(circleWipe(0.2).clipPath.match(/[\d.]+/)[0]));
ok('circleWipe at 0 is zero-radius', circleWipe(0).clipPath.startsWith('circle(0.0%'));
ok('clockWipe is polygon', clockWipe(0.5).clipPath.startsWith('polygon('));
ok('clockWipe full at 1 has all corners', (() => { const p = clockWipe(1).clipPath; return p.includes('100.0% 0.0%') && p.includes('100.0% 100.0%') && p.includes('0.0% 100.0%'); })());
ok('clockWipe deterministic', clockWipe(0.33).clipPath === clockWipe(0.33).clipPath);

// The DIRECTION of every named wipe in the layer registry (core/clips.js ANIM). Counting names cannot
// see this: `wipe-right` was registered as wipe(t,'right') and therefore revealed right-to-left, against
// its own name and the comment beside it, and no gate could tell. A wipe is named for the edge its
// reveal TRAVELS TOWARD; motion.js `wipe(dir)` names the edge it grows FROM, so each pair is crossed.
// inset(top right bottom left): the side whose inset SHRINKS is the side the reveal moves toward.
ok('wipe-right grows rightward from the left edge', ANIM['wipe-right'](0.5).clipPath === 'inset(0 50% 0 0)');
ok('wipe-left grows leftward from the right edge', ANIM['wipe-left'](0.5).clipPath === 'inset(0 0 0 50%)');
ok('wipe-down grows downward from the top edge', ANIM['wipe-down'](0.5).clipPath === 'inset(0 0 50% 0)');
ok('wipe-up grows upward from the bottom edge', ANIM['wipe-up'](0.5).clipPath === 'inset(50% 0 0 0)');
ok('plain wipe is the default direction, rightward', ANIM.wipe(0.5).clipPath === ANIM['wipe-right'](0.5).clipPath);
ok('every wipe direction is a distinct reveal', new Set(['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down'].map((n) => ANIM[n](0.5).clipPath)).size === 4);

// ---- AN ENTRANCE IS PART OF WHERE A LAYER IS (MISTAKES #461). formats/scene/scene.js resolveBoxes
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

// ---- THE ENTRANCE WARP: anticipation (#5) and the overshoot dial (#3), docs/CRAFT/AFTER-EFFECTS-RECIPES.md
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

// ---- THE LAYER'S CLOCK (core/time.js): TIME REMAPPING -------------------------------------------
// AE recipe #25, the speed ramp. `timeWarp` was one easing over one span and therefore MONOTONE in
// speed; a keyed remap is what expresses fast-HOLD-fast, and the freeze and the rewind fall out of the
// same mechanism. Every assert below is a pure read of one number, which is the whole design.
{
  const at = (L, t, span = 2) => layerTime(L, t, 0, span);
  ok('a layer with no time dial is handed the film\'s own second, untouched',
     at({}, 0.7) === 0.7 && at({}, 0) === 0);
  ok('timeWarp still lands exactly on the layer\'s end, as it did before core/time.js owned it',
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

// ---- THE VELOCITY READ (core/sequence.js), and the three modifiers built on it -------------------
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

// ---- background `opts`: a knob a window declares must be READ, or refused by name (MISTAKES #157).
// The accepted set is derived from the fx implementations, so these also pin that the derivation is
// live: rename the property an fx reads and the vocabulary must follow it.
ok('bg opts vocabulary is derived from the fx implementation (liquid)', ['scale', 'speed', 'warp', 'edge0', 'edge1', 'gloss', 'res'].every((k) => FX_PARAMS.liquid.includes(k)));
ok('bg opts vocabulary is per preset (a dots preset has no `scale`)', !bgOptKeys(bgPreset('paperDots')).includes('scale') && bgOptKeys(bgPreset('paperDots')).includes('spacing'));
const bgOver = (preset, over) => { try { return applyBgOver(bgPreset(preset), over); } catch { return null; } };
ok('bg opts reach the fx (liquid scale/speed/edge0)', (() => { const s = bgOver('liquid', { scale: 1.6, speed: 0.3, edge0: 0.4 }); const fx = s && s.fx.find((f) => f.type === 'liquid'); return !!fx && fx.scale === 1.6 && fx.speed === 0.3 && fx.edge0 === 0.4; })());
ok('bg opts meta knobs still scale the baked numbers', (() => { const s = bgOver('paperDots', { dotAlpha: 0.5, grain: 0.2 }); const d = s && s.fx.find((f) => f.type === 'dots'), g = s && s.fx.find((f) => f.type === 'grain'); return !!d && d.peakAlpha === 0.5 && g.alpha === 0.2; })());
ok('a bg opt no fx here reads is REFUSED, not dropped', bgOverErrors(bgPreset('liquid'), { dotAlpha: 0.2 }, 'bg[0]').length === 1 && bgOver('liquid', { dotAlpha: 0.2 }) === null);

// kinetic typography: unitProgress staggering + presets (pure)
ok('unitProgress unit 0 starts at 0', approx(unitProgress(0, 0, 3, { each: 0.5, stagger: 0.06 }), 0));
ok('unitProgress later unit delayed', unitProgress(0.06, 1, 3, { each: 0.5, stagger: 0.06 }) === 0);
ok('unitProgress completes', unitProgress(2, 2, 3, { each: 0.5, stagger: 0.06 }) === 1);
ok('unitProgress clamped [0,1]', (() => { for (let t = -1; t < 3; t += 0.1) { const u = unitProgress(t, 1, 4); if (u < 0 || u > 1) return false; } return true; })());

// THE OTHER TWO STAGGER DIALS (docs/CRAFT/PARITY-AUDIT.md). `from` is an ORDER and `amount` a TOTAL
// time, and the first thing asserted is that neither moves a frame of what shipped.
ok('a number stagger is exactly what it was: offset i, no remap', (() => {
  for (let i = 0; i < 6; i++) for (let t = -0.2; t < 2; t += 0.07) {
    if (Math.abs(unitProgress(t, i, 6, { each: 0.5, stagger: 0.06 }) - Math.max(0, Math.min(1, (t - i * 0.06) / 0.5))) > 1e-12) return false;
  }
  return true;
})());
ok('from:first is the default and changes nothing',
  unitProgress(0.3, 3, 8, { each: 0.5, stagger: 0.05 }) === unitProgress(0.3, 3, 8, { each: 0.5, stagger: { each: 0.05, from: 'first' } }));
// Every order is a RANK inside [0, n-1], so `amount` can normalise it and no order can push a unit
// outside the train. The four named orders start at 0; `random` is a hashed float, so its earliest
// unit lands within one step of 0 rather than exactly on it.
ok('every named order is a rank inside [0, n-1]', STAGGER_FROM.every((f) => {
  const r = [...Array(7).keys()].map((i) => staggerOffset(i, 7, f));
  return (f === 'random' || Math.min(...r) === 0) && r.every((x) => x >= 0 && x <= 6);
}));
ok('from:center opens outward from the middle unit',
  staggerOffset(3, 7, 'center') === 0 && staggerOffset(0, 7, 'center') === 3 && staggerOffset(6, 7, 'center') === 3);
ok('from:last runs backwards', staggerOffset(6, 7, 'last') === 0 && staggerOffset(0, 7, 'last') === 6);
ok('from:edges closes on the middle', staggerOffset(0, 7, 'edges') === 0 && staggerOffset(6, 7, 'edges') === 0 && staggerOffset(3, 7, 'edges') === 3);
ok('from: an index starts the wave at that unit', staggerOffset(4, 9, 4) === 0 && staggerOffset(0, 9, 4) === 4);
ok('from:random is HASHED, never Math.random: identical on a re-read',
  staggerOffset(5, 20, 'random') === staggerOffset(5, 20, 'random') && staggerOffset(5, 20, 'random') !== staggerOffset(6, 20, 'random'));
// `amount` is the dial two shipped films hand-computed by dividing a beat by a glyph count.
ok('amount caps the WHOLE train, whatever the unit count', [6, 30, 90].every((n) => {
  const step = staggerStep({ amount: 0.6 }, n);
  return approx(step * (n - 1), 0.6);
}));
ok('amount normalises against the ORDER, not the raw index', approx(staggerStep({ amount: 0.6, from: 'center' }, 11) * staggerOffset(0, 11, 'center'), 0.6));
ok('amount 0.6 on 90 units still lands the last unit inside its own beat',
  unitProgress(0.6 + 0.5, 89, 90, { each: 0.5, stagger: { amount: 0.6 } }) === 1);
ok('a stagger object with neither dial falls back to the caller default', staggerStep({ from: 'center' }, 8, 0.045) === 0.045);
ok('gsapStagger translates only the two words GSAP spells differently',
  gsapStagger({ each: 0.05, from: 'first' }).from === 'start' && gsapStagger({ from: 'last' }).from === 'end'
  && gsapStagger({ from: 'center' }).from === 'center' && gsapStagger(0.07) === 0.07 && gsapStagger(undefined, 0.07) === 0.07);

// TEXT SCRAMBLE: a RATE, a charset, and a reveal delay (docs/CRAFT/PARITY-AUDIT.md).
const scramble = (u, opts) => { const el = { textContent: 'DETERMINISTIC' }; decodeText(el, u, 0, opts); return el.textContent; };
ok('decode default is byte-identical to the baked 24 steps it replaced', (() => {
  for (let u = 0; u < 1; u += 0.017) if (scramble(u) !== scramble(u, { rate: 48, each: 0.5 })) return false;
  return true;
})());
ok('decode is pure in u: the same frame twice is the same string', scramble(0.37) === scramble(0.37));
ok('decode resolves left to right and finishes', scramble(1) === 'DETERMINISTIC' && scramble(0.99).endsWith('C') === false || scramble(1) === 'DETERMINISTIC');
// The bug the rate fixes: the scramble used to slow down purely because the reveal was longer.
ok('rate is per SECOND, so a 2s window scrambles as often as a 0.5s one', (() => {
  const steps = (each) => new Set([...Array(60).keys()].map((k) => scramble(k / 60, { each }))).size;
  return steps(2) >= steps(0.5) * 0.8;
})());
ok('a fixed COUNT is what it is no longer: doubling each doubles the refreshes',
  new Set([...Array(60).keys()].map((k) => scramble(k / 60, { each: 1 }))).size
  > new Set([...Array(60).keys()].map((k) => scramble(k / 60, { each: 0.25 }))).size);
ok('chars takes a named set and uses ONLY that set',
  [...scramble(0.05, { chars: 'numbers' })].every((c) => DECODE_CHARS.numbers.includes(c) || 'DETERMINISTIC'.includes(c)));
ok('chars takes a raw string of your own glyphs',
  [...scramble(0.05, { chars: 'xyz' })].every((c) => 'xyz'.includes(c) || 'DETERMINISTIC'.includes(c)));
ok('revealDelay holds the word FULLY scrambled before it resolves',
  scramble(0.2, { revealDelay: 0.5 })[0] !== 'D' || scramble(0.3, { revealDelay: 0.5 })[0] !== 'D');
ok('revealDelay 0 is what shipped', scramble(0.4) === scramble(0.4, { revealDelay: 0 }));

ok('preset up hidden at 0', PRESETS.up(0).opacity === 0 && PRESETS.up(0).transform.includes('translateY'));
ok('preset up shown at 1', approx(PRESETS.up(1).opacity, 1) && PRESETS.up(1).transform.includes('translateY(0.00px)'));
ok('preset type hard on/off', PRESETS.type(0).opacity === 0 && PRESETS.type(0.01).opacity === 1);
ok('preset scale grows', PRESETS.scale(1).transform.includes('scale(1'));
ok('preset blur clears', PRESETS.blur(1).filter.includes('blur(0.00px)'));
ok('preset wave oscillates', PRESETS.wave(0).transform !== PRESETS.wave(0.25).transform);
ok('presets deterministic', PRESETS.bounce(0.4).transform === PRESETS.bounce(0.4).transform);
// draw: the stroke-on preset. pathLength=1 normalisation (splitText 'path') means the offset is the
// remaining fraction of the line, so these asserts are exact and need no DOM.
ok('preset draw hidden at 0', PRESETS.draw(0).opacity === 0 && PRESETS.draw(0).strokeDashoffset === '1.0000');
ok('preset draw identity at 1', PRESETS.draw(1).strokeDasharray === 'none' && PRESETS.draw(1).strokeDashoffset === '0' && PRESETS.draw(1).opacity === 1);
ok('preset draw monotonic', (() => { let prev = 2; for (let u = 0; u < 1; u += 0.05) { const o = +PRESETS.draw(u).strokeDashoffset; if (o > prev + 1e-9) return false; prev = o; } return true; })());
ok('preset draw clamped [0,1]', (() => { for (let u = -0.5; u < 1; u += 0.1) { const o = +PRESETS.draw(u).strokeDashoffset; if (o < 0 || o > 1) return false; } return true; })());
ok('preset draw back reverses', PRESETS.draw(0.25).strokeDashoffset !== PRESETS.draw(0.25, { back: true }).strokeDashoffset);
ok('preset draw deterministic', PRESETS.draw(0.37).strokeDashoffset === PRESETS.draw(0.37).strokeDashoffset);
// chroma/swing/unfold: appearance presets. Each must be hidden at 0, land at (near) identity at 1,
// and be deterministic. chroma keeps a hair of coloured fringe at rest (by design), never a transform.
ok('preset chroma hidden at 0, split wide', PRESETS.chroma(0).opacity === 0 && parseFloat(PRESETS.chroma(0).textShadow) >= 16);
ok('preset chroma converges to a crisp glyph at rest (no fringe by default)', (() => { const s = PRESETS.chroma(1); return s.transform === 'translateY(0.00px)' && parseFloat(s.textShadow) === 0; })());
ok('preset chroma residual opt leaves a fringe when asked', Math.abs(parseFloat(PRESETS.chroma(1, { residual: 1.2 }).textShadow) - 1.2) < 1e-6);
ok('preset chroma fringe shrinks monotonically', (() => { let prev = 1e9; for (let u = 0; u <= 1; u += 0.05) { const o = Math.abs(parseFloat(PRESETS.chroma(u).textShadow)); if (o > prev + 1e-9) return false; prev = o; } return true; })());
ok('preset swing hinges from top, settles upright', PRESETS.swing(0).transformOrigin === 'top center' && Math.abs(parseFloat(PRESETS.swing(1).transform.match(/rotate\(([-\d.]+)deg\)/)[1])) < 1.0);
ok('preset unfold opens from edge-on to flat', PRESETS.unfold(0).transform.includes('rotateY(-90') && /rotateY\(-?0\.0deg\)/.test(PRESETS.unfold(1).transform) && PRESETS.unfold(0).transformOrigin === 'left center');
ok('appearance presets deterministic', PRESETS.chroma(0.4).textShadow === PRESETS.chroma(0.4).textShadow && PRESETS.swing(0.4).transform === PRESETS.swing(0.4).transform);


// assemble: the scattered-glyph reveal. Every assert below is about the three steps of the AE recipe
// (own offset, FIXED field, shuffled arrival), because those are the three ways it can be built wrong.
ok('preset assemble lands at identity', (() => { const t = PRESETS.assemble(1, {}, 3).transform; return /translate\(0\.00px, 0\.00px\) rotate\(-?0\.00deg\)/.test(t) && +PRESETS.assemble(1, {}, 3).opacity === 1; })());
ok('preset assemble clears its motion blur', PRESETS.assemble(1, {}, 7).filter === 'blur(0.00px)');
ok('preset assemble blur:0 writes no filter', PRESETS.assemble(0.3, { blur: 0 }, 7).filter === undefined);
ok('preset assemble scatters each glyph differently', PRESETS.assemble(0.2, {}, 1).transform !== PRESETS.assemble(0.2, {}, 2).transform);
ok('preset assemble is deterministic in the index', PRESETS.assemble(0.31, {}, 5).transform === PRESETS.assemble(0.31, {}, 5).transform);
ok('preset assemble seed re-rolls the field', PRESETS.assemble(0.2, {}, 4).transform !== PRESETS.assemble(0.2, { seed: 'other' }, 4).transform);
ok('preset assemble shuffles the arrival order', (() => {
  // the hashed delay must leave at least one LATER glyph ahead of an earlier one at mid-run
  const at = (i) => +PRESETS.assemble(0.5, {}, i).opacity;
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (at(j) > at(i) + 1e-6) return true;
  return false;
})());
ok('preset assemble hidden at 0 for every glyph', (() => { for (let i = 0; i < 20; i++) if (+PRESETS.assemble(0, {}, i).opacity !== 0) return false; return true; })());
ok('preset assemble travels in from its offset and arrives at zero', (() => {
  const dist = (u) => { const m = PRESETS.assemble(u, {}, 9).transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/); return Math.hypot(+m[1], +m[2]); };
  // easeOutSettle rings, so the path is not monotonic. What must hold: it starts far, is closing by
  // mid-run, and lands exactly on the glyph's own slot.
  return dist(0) > 70 && dist(0.6) < dist(0) && dist(1) === 0;
})());

// count roll: the odometer. The two asserts that matter are the two steps of the recipe: the last wheel
// is CONTINUOUS in its place, and every wheel above it is geared, still until the one below crosses 9.
ok('roll gives one wheel per digit', rollOffsets('12,480', 12480).length === 5);
ok('roll lands on integers at rest', rollOffsets('12480', 12480).every((o) => Math.abs(o - Math.round(o)) < 1e-9));
ok('roll reads the digits of its own value', rollOffsets('12480', 12480).join() === '1,2,4,8,0');
ok('roll drives the last wheel continuously', (() => { const o = rollOffsets('4', 4.5); return Math.abs(o[0] - 4.5) < 1e-9; })());
ok('roll leaves a higher wheel still while the one below is mid-run', (() => { const o = rollOffsets('43', 43.5); return o[0] === 4 && Math.abs(o[1] - 3.5) < 1e-9; })());
ok('roll carries the higher wheel as the one below crosses 9', (() => { const o = rollOffsets('49', 49.7); return o[0] > 4 && o[0] < 5; })());
ok('roll wraps forward past 9 (the strip carries an eleventh cell)', (() => { const o = rollOffsets('9', 9.6); return o[0] > 9 && o[0] < 10; })());
ok('roll places the decimals below the point', rollOffsets('98.6', 98.6).map((o) => Math.round(o)).join() === '9,8,6');
ok('roll is deterministic', rollOffsets('98.6', 98.61).join() === rollOffsets('98.6', 98.61).join());
ok('roll drives the wheels in the units the TEXT is written in', displayNum(2.5e9, { to: 2.5e9 }) === 2.5 && displayNum(41, { unit: '%', to: 100 }) === 41);

// matchCut: the graphic match. The three asserts are the three steps, and the identity contract that
// every presentation owes cutStyle at its own steady state.
ok('cut matchCut holds identity at each steady state', (() => {
  const e = PRESENTATIONS.matchCut.enter(1, { cx: 50, cy: 50 }), x = PRESENTATIONS.matchCut.exit(0, { cx: 50, cy: 50 });
  return e.clipPath === 'none' && e.opacity === '1' && x.clipPath === 'none' && x.opacity === '1';
})());
ok('cut matchCut closes the outgoing beat down to the held shape', (() => {
  const a = +PRESENTATIONS.matchCut.exit(0.1, { cx: 50, cy: 50 }).clipPath.match(/circle\(([\d.]+)%/)[1];
  const b = +PRESENTATIONS.matchCut.exit(0.49, { cx: 50, cy: 50 }).clipPath.match(/circle\(([\d.]+)%/)[1];
  return a > b && b < 25;
})());
ok('cut matchCut swaps the content at the midpoint, never crossfades', (() => {
  const outLate = PRESENTATIONS.matchCut.exit(0.5, { cx: 50, cy: 50 }).opacity;
  const inEarly = PRESENTATIONS.matchCut.enter(0.49, { cx: 50, cy: 50 }).opacity;
  return outLate === '0' && inEarly === '0';   // only one beat ever paints
})());
ok('cut matchCut opens the incoming beat out of the SAME shape', (() => {
  const held = +PRESENTATIONS.matchCut.exit(0.4999, { cx: 50, cy: 50 }).clipPath.match(/circle\(([\d.]+)%/)[1];
  const from = +PRESENTATIONS.matchCut.enter(0.5, { cx: 50, cy: 50 }).clipPath.match(/circle\(([\d.]+)%/)[1];
  return Math.abs(held - from) < 0.1;
})());
ok('cut matchCut aims the shape with cx/cy', PRESENTATIONS.matchCut.enter(0.6, { cx: 30, cy: 70 }).clipPath.includes('at 30% 70%'));
ok('cut matchCut is registered with a blurb', CUT_BLURBS.matchCut && /match/i.test(CUT_BLURBS.matchCut));

// new kinetic presets: hidden at 0, fully landed at 1
for (const k of ['flip', 'fall', 'elastic', 'skew', 'focus']) {
  ok(`preset ${k} starts hidden`, PRESETS[k](0).opacity === 0);
  ok(`preset ${k} lands opaque`, approx(+PRESETS[k](1).opacity, 1, 0.01));
}
ok('preset focus resolves crisp', PRESETS.focus(1).filter.includes('blur(0.00px)'));

// new kinetic presets (batch 2)
for (const k of ['tilt', 'stretch', 'shadow']) {
  ok(`preset ${k} starts hidden-ish`, +PRESETS[k](0).opacity < 0.5);
  ok(`preset ${k} lands opaque`, approx(+PRESETS[k](1).opacity, 1, 0.01));
}
ok('preset gradient sweeps', PRESETS.gradient(0).backgroundPosition !== PRESETS.gradient(1).backgroundPosition);
ok('preset highlight grows', PRESETS.highlight(1).backgroundSize.startsWith('100'));
ok('preset underline draws', PRESETS.underline(0.5).backgroundSize.startsWith('50'));
// riseClip travels in PERCENT of the unit's own height, not px: 44px was a different fraction of a
// 40px caption than of a 150px headline, so at large sizes the word was already half out from behind
// its mask at u=0. These assert the invariant, not the literal string, the old assertion pinned
// "(0.00px)" and so failed the moment the unit was corrected, which says nothing about identity.
ok('preset riseClip identity at 1', parseFloat(PRESETS.riseClip(1).transform.match(/-?[\d.]+/)[0]) === 0);
ok('preset riseClip travels in % (scales with type size)', PRESETS.riseClip(0).transform.includes('%'));
ok('preset riseClip starts fully behind its mask', parseFloat(PRESETS.riseClip(0).transform.match(/-?[\d.]+/)[0]) >= 110);
ok('presets deterministic (stretch)', JSON.stringify(PRESETS.stretch(0.37)) === JSON.stringify(PRESETS.stretch(0.37)));

// shake / pulse: deterministic, decaying, zero before the hit
ok('shake zero before hit', shake(-0.1).x === 0 && shake(0).y === 0);
ok('shake deterministic', shake(0.2, { seed: 5 }).x === shake(0.2, { seed: 5 }).x);
ok('shake seeds differ', shake(0.2, { seed: 5 }).x !== shake(0.2, { seed: 9 }).x);
ok('shake decays', Math.abs(shake(2).x) < Math.abs(shake(0.05).x) + 1e-9);
ok('pulse centered', approx(pulse(0), 1, 0.05) && pulse(0.6) !== pulse(0.3));

// velocity ramping: monotone, endpoints exact, peak-velocity placement honored
ok('accel endpoints', accel(0) === 0 && accel(1) === 1);
ok('accel slow start', accel(0.3) < 0.3);
ok('decel fast start', decel(0.3) > 0.3);
ok('speedRamp endpoints', speedRamp(0) === 0 && speedRamp(1) === 1);
ok('speedRamp slow at both ends', speedRamp(0.1) < 0.1 && speedRamp(0.9) > 0.9);
ok('speedRamp monotone', (() => { let prev = 0; for (let t = 0; t <= 1.001; t += 0.01) { const v = speedRamp(t); if (v < prev - 1e-9) return false; prev = v; } return true; })());
ok('speedRamp peak shifts', speedRamp(0.3, { peak: 0.2 }) > speedRamp(0.3, { peak: 0.8 }));
ok('EASINGS has ramps', typeof EASINGS.ramp === 'function' && typeof EASINGS.rush === 'function' && typeof EASINGS.brake === 'function');

// optical tracking: em string, monotone tighter as size grows
ok('trackingFor em string', trackingFor(16).endsWith('em'));
ok('trackingFor tightens', parseFloat(trackingFor(120)) < parseFloat(trackingFor(16)));
ok('trackingFor endpoints', Math.abs(parseFloat(trackingFor(14)) - -0.008) < 1e-6 && Math.abs(parseFloat(trackingFor(120)) - -0.022) < 1e-6);

// LIGHT-ON-DARK OPTICAL COMPENSATION: trackingFor(px, dark). A light glyph on a dark ground irradiates,
// so it reads heavier and its gaps read tighter than the same pair inverted; the correction opens the
// tracking back up at display sizes. Three things have to stay true, and each one is a way this could
// silently go wrong:
//   1. the ONE-ARGUMENT form is byte-identical, or 21 dark themes get re-tracked by an unrelated change;
//   2. the TWO-ARGUMENT form actually differs, or the feature is inert and nothing says so;
//   3. it is PURE, same input, same string, no clock and no randomness anywhere in the ramp.
{
  const sizes = [12, 14, 20, 28, 32, 40, 48, 64, 96, 120, 200];
  ok('trackingFor 1-arg unchanged by the dark term',
    sizes.every((p) => trackingFor(p) === trackingFor(p, false)));
  // the exact strings the ramp shipped before polarity existed
  ok('trackingFor 1-arg ramp is the measured one',
    trackingFor(14) === '-0.0080em' && trackingFor(32) === '-0.0120em'
    && trackingFor(64) === '-0.0170em' && trackingFor(120) === '-0.0220em');
  ok('trackingFor dark differs at display sizes',
    parseFloat(trackingFor(96, true)) > parseFloat(trackingFor(96)));
  ok('trackingFor dark opens, never tightens',
    sizes.every((p) => parseFloat(trackingFor(p, true)) >= parseFloat(trackingFor(p)) - 1e-9));
  // body type is left alone on purpose: the source rule fixes body with weight and line-height, not
  // tracking, and a 14px caption that moves is a diff with no visible cause.
  ok('trackingFor dark is a no-op at body size',
    trackingFor(14, true) === trackingFor(14) && trackingFor(12, true) === trackingFor(12));
  ok('trackingFor dark lift reaches, and is capped at, 0.010em',
    Math.abs((parseFloat(trackingFor(120, true)) - parseFloat(trackingFor(120))) - 0.010) < 1e-6
    && Math.abs((parseFloat(trackingFor(200, true)) - parseFloat(trackingFor(200))) - 0.010) < 1e-6);
  // the dent a flat lift would put in the size ramp: dark type must still tighten as it grows.
  ok('trackingFor dark still tightens with size', (() => {
    let prev = Infinity;
    for (let p = 14; p <= 140; p += 1) { const v = parseFloat(trackingFor(p, true)); if (v > prev + 1e-9) return false; prev = v; }
    return true;
  })());
  ok('trackingFor is pure', sizes.every((p) => trackingFor(p, true) === trackingFor(p, true)
    && trackingFor(p) === trackingFor(p)));
  ok('trackingFor always an em string', sizes.every((p) => /^-?\d+\.\d{4}em$/.test(trackingFor(p, true))));
}

// LETTER-SPACING HAS EXACTLY ONE WRITER. This is the contract MISTAKES #28 and #388 were both breaches
// of: styleText resolved the value, microType overwrote it one statement later, and that one statement
// silently discarded the author's `tracking` (12 shipped scenes) and then the light-on-dark polarity.
// Each repair threaded another argument into the second writer, which fixed the symptom and left the
// trap. Two things are pinned below, and BOTH are needed:
//   1. the SOURCE test. No file in core/ may assign letter-spacing except the resolver. A second
//      writer now fails here rather than in a film nobody diffs.
//   2. the BEHAVIOUR tests. The one resolver really does fold in every opinion (author prop, size
//      ramp, polarity, mono, raw), so nobody has to add a second write to get one of them honoured.
{
  // 1. THE SOURCE TEST.
  const coreFiles = [];
  const walkCore = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkCore(p);
      else if (e.name.endsWith('.js')) coreFiles.push(p);
    }
  };
  walkCore(path.join(repoRoot, 'core'));
  // Assignment forms only. A tween that ANIMATES letter-spacing (core/gsap-effects.js `expandIn`) is a
  // motion over the settled value, not a second opinion about what the settled value is.
  const WRITE = /\.style\.letterSpacing\s*=|setProperty\(\s*['"]letter-spacing['"]/;
  // The allowlist is a list of REASONS, not of files. A file may only be here if it writes a value it
  // did not decide.
  const ALLOWED = {
    'core/layers/util.js': 'the resolver: trackingCss decides, styleText writes, once',
    'core/morph.js': 'copies the ALREADY-RESOLVED computed value onto a wrapper (getComputedStyle → wrap), so the glyphs keep their spacing through the morph. It forms no opinion.',
  };
  const writers = coreFiles
    .filter((p) => WRITE.test(fs.readFileSync(p, 'utf8')))
    .map((p) => path.relative(repoRoot, p).split(path.sep).join('/'))
    .sort();
  const rogue = writers.filter((p) => !(p in ALLOWED));
  ok(`letter-spacing has one writer (rogue: ${rogue.join(', ') || 'none'})`, rogue.length === 0);
  ok('the resolver is still the writer', writers.includes('core/layers/util.js'));

  // 2. THE BEHAVIOUR TESTS. createKit needs no DOM to build the kit, and styleText needs no real
  // element: it only assigns onto `el.style`. So the exact string a layer settles on is testable here,
  // which is what makes "one writer" a property worth having rather than a tidiness argument.
  const kitFor = (theme, ink) => createKit({
    theme, inkAt: () => ink, bgWinAt: () => null, ACCENT_BGS: [], trackingFor,
    splitText: () => null, icon: () => '', extra: [],
  });
  const spacingOf = (L, { theme = { type: { optical: true }, palette: { text: '#111111', ink: '#f4f4f4' } }, ink = null } = {}) => {
    const el = { style: { setProperty() {} } };
    kitFor(theme, ink).styleText(el, L, 1);
    return el.style.letterSpacing;
  };
  const DARK_GROUND = '#f4ecd0'; // a LIGHT ink → the ground under it is dark
  const LIGHT_GROUND = '#111111';

  ok('author `tracking` survives the whole pass (#28)', spacingOf({ text: 'A', size: 150, tracking: '0.42em' }) === '0.42em');
  ok('author `ls` survives the whole pass (#79)', spacingOf({ text: 'A', size: 150, ls: '0.31em' }) === '0.31em');
  ok('author prop wins over the polarity lift too',
    spacingOf({ text: 'A', size: 150, ls: '0.31em' }, { ink: DARK_GROUND }) === '0.31em');
  ok('the size ramp is the default', spacingOf({ text: 'A', size: 120 }) === trackingFor(120));
  ok('the dark lift reaches the settled value (#388)',
    spacingOf({ text: 'A', size: 120 }, { ink: DARK_GROUND }) === trackingFor(120, true)
    && spacingOf({ text: 'A', size: 120 }, { ink: LIGHT_GROUND }) === trackingFor(120));
  // mono and raw take the older kit rule; pinned so a "tidy-up" cannot quietly re-track code blocks.
  ok('mono is not optically tracked by the micro rule',
    spacingOf({ text: 'A', size: 120, font: 'mono' }, { theme: { palette: {} } }) === '-0.03em');
  ok('raw serif keeps its own fit',
    spacingOf({ text: 'A', size: 120, font: 'serif', raw: true }) === '0');

  // 3. POLARITY IS NOT THE LAYER'S TO ANSWER WHEN AN EFFECT REPAINTS EVERY GLYPH. `ransom` cuts each
  // letter onto its own light paper chip, so a ransom layer whose LAYER ink is light is dark-on-light
  // everywhere the eye can see. The lift must not fire. False is the conservative answer: the polarity
  // term only ever ADDS, so declining to answer renders exactly as no effect would.
  ok('paintsOwnGlyphs names ransom', paintsOwnGlyphs({ ransom: true }) && !paintsOwnGlyphs({ text: 'A' }));
  ok('every GLYPH_PAINTERS key is a layer prop that flips it',
    GLYPH_PAINTERS.length > 0 && GLYPH_PAINTERS.every((k) => paintsOwnGlyphs({ [k]: true })));
  ok('a ransom layer over a dark ground takes NO dark lift',
    spacingOf({ text: 'A', size: 150, ransom: true }, { ink: DARK_GROUND }) === trackingFor(150));
  ok('a non-ransom layer over the same ground still does',
    spacingOf({ text: 'A', size: 150 }, { ink: DARK_GROUND }) === trackingFor(150, true));
  ok('onDark itself is the thing that declines',
    kitFor({ palette: {} }, DARK_GROUND).onDark({ ransom: true }, 1) === false
    && kitFor({ palette: {} }, DARK_GROUND).onDark({ text: 'A' }, 1) === true);
}

// transitions kit: every presentation lands at full visibility (enter(1)); fade-out family exits hidden
{
  const opts = { dir: 'left', dist: 90, cx: 50, cy: 50 };
  for (const [name, P] of Object.entries(PRESENTATIONS)) {
    if (name === 'none') continue;
    const landed = P.enter(1, opts);
    ok(`cut ${name} lands visible`, approx(+(landed.opacity ?? 1), 1, 0.01));
    if (landed.filter && landed.filter !== 'none') ok(`cut ${name} lands unblurred`, landed.filter.includes('(0.00px)'));
    if (!['wipe', 'iris', 'clock', 'softwipe', 'softiris', 'barn', 'letterbox'].includes(name)) {
      const gone = P.exit(1, opts);
      ok(`cut ${name} exits hidden`, +(gone.opacity ?? 1) <= 0.05);
    }
  }
  const steady = cutStyle('whip', { enter: 1, exit: 0 }, opts);
  ok('cutStyle steady opaque', approx(+steady.opacity, 1, 0.01));
  ok('cutStyle exit fades', +cutStyle('fade', { enter: 1, exit: 0.9 }, opts).opacity < 0.2);
  ok('cutStyle deterministic', JSON.stringify(cutStyle('jitter', { enter: 0.4, exit: 0 }, opts)) === JSON.stringify(cutStyle('jitter', { enter: 0.4, exit: 0 }, opts)));

  // SOLO MODE (MISTAKES #166). A cut driven onto ONE root runs exit to completion and only THEN enter,
  // so any visibility channel it touches empties the whole frame at the midpoint. soloCutStyle must hold
  // every such channel at identity across the entire window, for every style and every phase.
  const HIDE = ['opacity', 'clipPath', 'WebkitClipPath', 'maskImage', 'WebkitMaskImage'];
  const visible = (s) => +s.opacity === 1 && HIDE.slice(1).every((k) => s[k] === 'none');
  for (const name of Object.keys(PRESENTATIONS)) {
    let held = true, moved = false;
    for (let i = 0; i <= 10; i++) {
      const p = i / 10;
      for (const st of [soloCutStyle(name, { exit: p, enter: 1 }, opts), soloCutStyle(name, { exit: 0, enter: p }, opts)]) {
        if (!visible(st)) held = false;
        if (st.transform !== 'none' || st.filter !== 'none') moved = true;
      }
    }
    ok(`solo ${name} never hides the frame`, held);
    // and the classification must agree with what actually moves, or the loud refusal in
    // formats/scene/scene.js is guarding the wrong set.
    ok(`solo ${name} SOLO_BLIND matches what moves`, SOLO_BLIND.has(name) !== moved);
  }
  ok('SOLO_BLIND is derived, not empty and not everything', SOLO_BLIND.size > 0 && SOLO_BLIND.size < Object.keys(PRESENTATIONS).length);
  ok('solo: a pure-opacity style is blind', SOLO_BLIND.has('fade'));
  ok('solo: transform/filter styles are usable', !SOLO_BLIND.has('punch') && !SOLO_BLIND.has('blur'));
  ok('soloCutStyle keeps the style character', soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts).transform !== 'none');
  ok('soloCutStyle deterministic', JSON.stringify(soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts)) === JSON.stringify(soloCutStyle('punch', { exit: 0.5, enter: 1 }, opts)));
  ok('soloCutStyle steady state is visually identity', visible(soloCutStyle('punch', { enter: 1, exit: 0 }, opts))
    && soloCutStyle('punch', { enter: 1, exit: 0 }, opts).filter === 'none');
}

// ANCESTOR KILLS (core/ancestor-kills.js): an ancestor style that silently disables a descendant
// capability. Every row is measured by scripts/dev/probe-ancestor-kills.mjs; these assert that the
// table stays wired to the cut vocabulary, not that the browser still behaves that way.
{
  // cutWrites is DERIVED from the presentations, so it must agree with what each one visibly does.
  ok('cutWrites: blur writes a filter and nothing else in solo', [...cutWrites('blur', { solo: true })].join() === 'filter');
  ok('cutWrites: blur also fades under sceneUnits', cutWrites('blur').has('opacity') && cutWrites('blur').has('filter'));
  ok('cutWrites: slide never writes a filter', !cutWrites('slide', { solo: true }).has('filter'));
  ok('cutWrites: a mask style collapses onto one channel name', cutWrites('softwipe').has('maskImage')
    && !cutWrites('softwipe').has('WebkitMaskImage'));
  ok('cutWrites: none writes nothing', cutWrites('none').size === 0);
  ok('cutWrites: every presentation classifies itself', Object.keys(CUT_PRESENTATIONS_AK).every((k) => cutWrites(k) instanceof Set));

  // the measured matrix, at the three rows the engine actually acts on
  ok('kills: a filter takes the backdrop away', killedBy(['filter'], 'backdrop').length === 1);
  ok('kills: a clip does NOT take the backdrop away', killedBy(['clipPath'], 'backdrop').length === 0);
  ok('kills: overflow does NOT take the backdrop away', killedBy(['overflow'], 'backdrop').length === 0);
  ok('kills: a transform does NOT take the backdrop away', killedBy(['transform'], 'backdrop').length === 0);
  ok('kills: a transform DOES take a blend away', killedBy(['transform'], 'blend').length === 1);
  ok('kills: a clip takes depth away', killedBy(['clipPath'], 'depth').length === 1);
  ok('kills: a transform does NOT take depth away', killedBy(['transform'], 'depth').length === 0);
  ok('kills: an unknown capability throws', (() => { try { killedBy([], 'nope'); return false; } catch { return true; } })());

  ok('capabilitiesOf: glass asks for the backdrop', capabilitiesOf({ glass: 'refract' })[0].cap === 'backdrop');
  ok('capabilitiesOf: glass:false asks for nothing', capabilitiesOf({ glass: false }).length === 0);
  ok('capabilitiesOf: a plane modifier asks for depth', capabilitiesOf({ modifiers: [{ plane: -800 }] })[0].cap === 'depth');
  ok('capabilitiesOf: an adjust layer asks for the backdrop', capabilitiesOf({ type: 'adjust', kind: 'blur' })[0].cap === 'backdrop');
  ok('capabilitiesOf: a plain layer asks for nothing', capabilitiesOf({ type: 'text', text: 'x' }).length === 0);

  // THE REPORTED BUG, as a test: a glass layer under a filter-writing cut must refuse, and the
  // refusal must name the layer, the capability and a way out. docs/MISTAKES.md #542.
  const glassScene = { cuts: [{ t: 8.2, style: 'blur', dur: 0.34 }], sceneUnits: false,
    layers: [{ id: 'lens', type: 'html', glass: 'refract', start: 0.35, duration: 10.8 }] };
  let msg = '';
  try { checkCuts(glassScene); } catch (e) { msg = e.message; }
  ok('ancestor-kills refuses blur-cut over a glass layer', msg.length > 0);
  ok('the refusal names the layer', msg.includes('"lens"'));
  ok('the refusal names the conflicting thing', msg.includes('blur') && msg.includes('filter'));
  ok('the refusal names a way out', msg.includes('slide'));
  ok('the refusal never offers a style that has the same defect', !/\(([^)]*)\)/.test(msg) || !msg.split('(')[1].split(')')[0].split(', ').some((k) => cutWrites(k, { solo: true }).has('filter')));
  // a cut that writes no filter is fine over the same layer
  ok('a transform-only cut over glass is allowed',
    (() => { try { checkCuts({ ...glassScene, cuts: [{ t: 8.2, style: 'slide', dur: 0.34 }] }); return true; } catch { return false; } })());
  // and a cut OUTSIDE the layer's window is fine, whatever it writes
  ok('a blur cut outside the layer window is allowed',
    (() => { try { checkCuts({ ...glassScene, cuts: [{ t: 20, style: 'blur', dur: 0.34 }] }); return true; } catch { return false; } })());
  // depth is the second live row: the same filter flattens the rig (formats/scene/scene.js says so)
  let dmsg = '';
  try { checkCuts({ cuts: [{ t: 1, style: 'blur', dur: 0.3 }], layers: [{ id: 'card', modifiers: [{ plane: -800 }], start: 0, duration: 5 }] }); } catch (e) { dmsg = e.message; }
  ok('ancestor-kills refuses a filter cut over a depth layer', dmsg.includes('"card"') && dmsg.includes('plane'));
  // a group CHILD carrying glass is still a descendant of the cut root, so it is checked too
  let cmsg = '';
  try { checkCuts({ cuts: [{ t: 1, style: 'blur', dur: 0.3 }], layers: [{ id: 'g', type: 'group', start: 0, duration: 5, children: [{ id: 'pane', glass: true }] }] }); } catch (e) { cmsg = e.message; }
  ok('ancestor-kills reaches group children', cmsg.includes('"pane"'));
}

// timeline evaluators (core/sequence.js): pure math lifted out of scene.html
{
  // cameraAt: empty → null; endpoints clamp; midpoint eases between two keyframes
  ok('cameraAt empty null', cameraAt([], 1) === null);
  ok('cameraAt undefined null', cameraAt(undefined, 1) === null);
  const cam = [{ t: 0, s: 1, x: 0, y: 0 }, { t: 2, s: 2, x: 100, y: -50 }];
  ok('cameraAt before start holds first', cameraAt(cam, -1).s === 1 && cameraAt(cam, -1).x === 0);
  ok('cameraAt after end holds last', cameraAt(cam, 9).s === 2 && cameraAt(cam, 9).x === 100);
  const cmid = cameraAt(cam, 1); // easeInOutCubic(0.5) === 0.5 → exact midpoint
  ok('cameraAt mid scale', approx(cmid.s, 1.5));
  ok('cameraAt mid pan', approx(cmid.x, 50) && approx(cmid.y, -25));
  ok('cameraAt defaults missing keys', approx(cameraAt([{ t: 0 }, { t: 1 }], 0.5).s, 1));
  ok('cameraAt roll defaults to 0', cameraAt([{ t: 0 }, { t: 1 }], 0.5).roll === 0);
  ok('cameraAt roll lerps', approx(cameraAt([{ t: 0, roll: 0 }, { t: 1, roll: 10 }], 0.5).roll, 5));

  // dollyZ: `s` is WHERE THE CAMERA STANDS, so it must convert to a depth the projection agrees with:
  // a camera whose translateZ is z magnifies the canvas plane by lens/(lens-z), and that must come back
  // out as exactly the `s` that went in. A round trip is the only assertion that catches a sign flip.
  ok('dollyZ identity at s=1', dollyZ(1, 1600) === 0);
  ok('dollyZ round-trips through the projection', [1.05, 1.35, 2, 0.6].every((s) => {
    const z = dollyZ(s, 1600);
    return approx(1600 / (1600 - z), s);
  }));
  ok('dollyZ scales with the lens', approx(dollyZ(2, 800), 400) && approx(dollyZ(2, 1600), 800));
  ok('dollyZ refuses a camera at infinite distance', (() => {
    try { dollyZ(0, 1600); return false; } catch (e) { return /positive magnification/i.test(e.message); }
  })());

  // motionAt: clamps before first / after last kf; lerps a mid-segment; honors per-kf ease
  const kf = [{ t: 0, x: 0, y: 0, scale: 1, opacity: 0 }, { t: 1, x: 100, y: 20, scale: 2, opacity: 1 }];
  ok('motionAt before first clamps', motionAt(kf, -1).dx === 0 && motionAt(kf, -1).opacity === 0);
  ok('motionAt after last clamps', motionAt(kf, 5).dx === 100 && motionAt(kf, 5).opacity === 1);
  const mmid = motionAt(kf, 0.5); // default ease easeInOutCubic → 0.5 at t=0.5
  ok('motionAt mid dx', approx(mmid.dx, 50) && approx(mmid.dy, 10));
  ok('motionAt mid scale', approx(mmid.scale, 1.5) && approx(mmid.opacity, 0.5));
  ok('motionAt norm defaults', motionAt([{ t: 0 }], 0).scale === 1 && motionAt([{ t: 0 }], 0).opacity === 1);
  // per-keyframe ease drives the segment (linear vs spring differ off the midpoint)
  const lin = motionAt([{ t: 0, x: 0 }, { t: 1, x: 100, ease: 'linear' }], 0.25).dx;
  const spr = motionAt([{ t: 0, x: 0 }, { t: 1, x: 100, ease: 'spring' }], 0.25).dx;
  ok('motionAt linear ease at .25', approx(lin, 25));
  ok('motionAt spring ease differs from linear', Math.abs(spr - 25) > 1);
  ok('motionAt deterministic', JSON.stringify(motionAt(kf, 0.3)) === JSON.stringify(motionAt(kf, 0.3)));

  // ---- the BOX track (w/h) -----------------------------------------------------------------------
  // w has no identity constant the way x has 0, so it gets ONE rule and resolveKeyedProps is what makes the
  // rule true: both endpoints carry a number, or the track does not animate the box. Anything softer
  // (hold the neighbour, fall back to a guess) is the second interpretation that #195 was made of.
  ok('motionAt no box keys → null', motionAt(kf, 0.5).w === null && motionAt(kf, 0.5).h === null);
  const box = resolveKeyedProps([{ w: 300, h: 200, motion: [{ t: 0 }, { t: 1, w: 900 }] }])[0].motion;
  ok('resolveKeyedProps fills the untouched key from the layer', box[0].w === 300 && box[0].h == null);
  ok('resolveKeyedProps leaves h alone when no key mentions it', box[1].h == null);
  ok('box lerps once filled', approx(motionAt(box, 0.5).w, 600) && motionAt(box, 0.5).h === null);
  ok('box clamps at the endpoints', motionAt(box, -1).w === 300 && motionAt(box, 9).w === 900);
  let threw = '';
  try { resolveKeyedProps([{ id: 'nobase', motion: [{ t: 0, w: 100 }] }]); } catch (e) { threw = e.message; }
  ok('resolveKeyedProps throws when there is no base box', /declares no w/.test(threw));
  // resolveKeyedProps must be idempotent: scene.js runs it once per boot, but a re-boot on the same data
  // object (studio reload, a gate that validates then renders) must not shift the answer.
  const twice = resolveKeyedProps(resolveKeyedProps([{ w: 300, motion: [{ t: 0 }, { t: 1, w: 900 }] }]))[0].motion;
  ok('resolveKeyedProps idempotent', twice[0].w === 300 && twice[1].w === 900);

  // ---- keyed DEPTH -------------------------------------------------------------------------------
  // `track` is the third layer-owned property, and the one that differs: it always HAS an identity,
  // because scene.js already defaults a layer's z-order to its index. So keying depth on a layer that
  // never declared it is ordinary rather than an error, and the fill has to come from the index.
  ok('motionAt no track keys → null', motionAt(kf, 0.5).track === null);
  const dep = resolveKeyedProps([{ id: 'a', motion: [{ t: 0 }] }, { id: 'ribbon', motion: [{ t: 0 }, { t: 1, track: 9 }] }])[1].motion;
  ok('keyed depth fills from the layer INDEX when undeclared', dep[0].track === 1);
  ok('keyed depth lerps', approx(motionAt(dep, 0.5).track, 5));
  const dep2 = resolveKeyedProps([{ track: 4, motion: [{ t: 0 }, { t: 1, track: 0 }] }])[0].motion;
  ok('an explicit track wins over the index', dep2[0].track === 4);
  ok('keyed depth clamps at the endpoints', motionAt(dep2, 9).track === 0);
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

// ---- easing registry contract ----------------------------------------------------------------
// Every named easing must be a real 0->1 curve. Asserted across the WHOLE registry, not just the
// new ones: a curve that does not land on 1 silently leaves elements short of their final position.
{
  const { EASINGS } = await import('../../core/motion.js');
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

// ---- the safe area ----
// The point of core/safe.js is that ONE function answers "where may content live", so the asserts that
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
  // aspect and one definition of that has to be enough (docs/MISTAKES.md #409, #165).
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
// legitimately off-frame and must never be reported (the rule verify/audit.mjs learned in #376).
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
  ok('bounds: the SAME box mid-entrance is NOT reported (arrived-only, docs/MISTAKES.md #390)',
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
  {
    // a dashboard's volume chart is measured against the panel it sits in.
    for (const w of [340, 380, 720]) {
      const [card] = BLOCKS.stripeCard({ x: 0, y: 0, w, amount: '$1' });
      const row = card.children[2].children;
      const spanned = row.reduce((a, b) => a + b.w, 0) + card.children[2].gap * (row.length - 1);
      ok(`stripeCard w:${w}: the bar chart spans the card's content box`, Math.abs(spanned - (w - 2 * card.pad)) < 1);
    }
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


// ---- wave 1 effects: filters · glow presets · caption styles ----
// Each family's pure surface, held to the contract its consumers rely on. The DOM halves (SVG def
// injection, the caption runtime) are covered by make probe + the rendered reel, not here.
{
  // colour-grade presets (core/filters.js)
  ok('filter: raw CSS passes through', resolveFilter('blur(4px) saturate(1.2)').filter === 'blur(4px) saturate(1.2)');
  ok('filter: sepia param', resolveFilter('sepia:0.6').filter === 'sepia(0.6)');
  ok('filter: vignette is an overlay, never a filter', resolveFilter('vignette:0.6').filter === '' && /radial-gradient/.test(resolveFilter('vignette:0.6').overlay));
  ok('filter: deterministic param-addressed ids', resolveFilter('duotone:#141414,#7cffd4').filter === 'url("#f-duotone-141414-7cffd4")');
  ok('filter: goo is a param-addressed svg def', resolveFilter('goo').filter === 'url("#f-goo-r12-h19")');
  ok('filter: goo radius and hardness reach the id', resolveFilter('goo:16,26').filter === 'url("#f-goo-r16-h26")');
  ok('filter: goo clamps a silly radius rather than emitting it', resolveFilter('goo:900').filter === 'url("#f-goo-r60-h19")');
  ok('filter: goo is registered with a blurb, so `make arsenal` finds it', FILTER_REGISTRY.has('goo') && /metaball/i.test(FILTER_REGISTRY.blurbs.goo));
  ok('filter: null safe', JSON.stringify(resolveFilter(null)) === JSON.stringify({ filter: '', overlay: null }));
  ok('filter: parseColor hex3 + rgb + junk', JSON.stringify(parseColor('#7cf')) === '[119,204,255]' && JSON.stringify(parseColor('rgb(1, 2, 3)')) === '[1,2,3]' && parseColor('nope') === null);
  ok('filter: all six presets exist', ['duotone','tritone','gradientMap','posterize','sepia','vignette'].every((k) => FILTER_PRESETS[k]));

  // THE ONE COLOUR PARSER (core/motion.js). Four copies with four grammars became one, and this is
  // the falsifiable half of that claim: for each old copy, a colour it REJECTED and a colour it
  // ACCEPTED, run through the shared parser now. If the union ever narrows, or the anchor is
  // dropped again, one of these flips. `node scripts/gates/lib-test.mjs --colours` prints the table.
  const J = (v) => JSON.stringify(parseColor(v));
  // filters.js rejected every hex that was not 3 or 6 digits, so an 8-digit brand colour read null
  // and the grade silently fell back to white.
  ok('colour: filters.js rejected #rrggbbaa, now parsed, alpha dropped', J('#0b0b0fcc') === '[11,11,15]');
  ok('colour: filters.js rejected #rgba, now parsed', J('#7cfa') === '[119,204,255]');
  ok('colour: filters.js accepted #rgb and rgb(), still the same channels', J('#7cf') === '[119,204,255]' && J('rgb(1, 2, 3)') === '[1,2,3]');
  // motion.js was the only copy with an array passthrough, and the only one whose rgb() was
  // UNANCHORED. The passthrough is kept; the missing anchor was a bug and is gone.
  ok('colour: motion.js array passthrough kept', J([1, 2, 3]) === '[1,2,3]');
  ok('colour: motion.js unanchored rgb() is now rejected', parseColor('foo rgb(1,2,3)') === null && parseColor('rgb(1,2,3) bar') === null);
  // designspec-check.mjs split rgb() on commas only, so the modern space-separated CSS form was
  // null to the gate; and it alone read floats, which the palette-distance maths depends on.
  ok('colour: designspec rejected space-separated rgb(), now parsed', J('rgb(1 2 3)') === '[1,2,3]' && J('rgb(1 2 3 / 50%)') === '[1,2,3]');
  ok('colour: designspec accepted float channels, still unrounded', J('rgba(1.5, 2, 3, 0.5)') === '[1.5,2,3]');
  ok('colour: 5- and 7-digit hex are a typo, not a colour', parseColor('#12345') === null && parseColor('#1234567') === null);
  // The {r,g,b} adapter is the SAME parse, reshaped, never a second grammar.
  ok('colour: parseColorRGB is the tuple, reshaped', JSON.stringify(parseColorRGB('#0b0b0fcc')) === '{"r":11,"g":11,"b":15}' && parseColorRGB('nope') === null);
  // lightfield stays 6-digit-hex only ON PURPOSE (core/lightfield/colour.js), a narrow wrapper over
  // the shared parser, not a widening of it. Everything the shared parser gained is still refused here.
  ok('colour: lightfield accepts its 6-digit hex', JSON.stringify(lightfieldToRgb('#ee7c56')) === '{"r":238,"g":124,"b":86}');
  ok('colour: lightfield still refuses what the shared parser gained', ['#7cf', '#0b0b0fcc', 'rgb(1,2,3)'].every((v) => {
    try { lightfieldToRgb(v); return false; } catch { return true; }
  }));
  // chromaGlow: soft neon bloom in the glyph shape (pure CSS drop-shadow stack, no SVG)
  ok('filter: chromaGlow is a pure-css glow preset', FILTER_PRESETS.chromaGlow && FILTER_PRESETS.chromaGlow.kind === 'css' && FILTER_PRESETS.chromaGlow.mode === 'glow');
  ok('filter: chromaGlow is a smooth white drop-shadow bloom (no hard fringe)', (() => { const f = resolveFilter('chromaGlow').filter; return f.startsWith('drop-shadow(') && (f.match(/drop-shadow/g) || []).length >= 4 && f.includes('255,255,255') && !/drop-shadow\(0 -?\d+px/.test(f); })());
  ok('filter: chromaGlow size scales the bloom radii', (() => { const big = resolveFilter('chromaGlow:2').filter; return big.includes('80.0px') && !resolveFilter('chromaGlow:1').filter.includes('80.0px'); })());
  ok('filter: chromaGlow deterministic + no SVG url', resolveFilter('chromaGlow:1.5').filter === resolveFilter('chromaGlow:1.5').filter && !resolveFilter('chromaGlow').filter.includes('url('));

  // glow presets (core/layers/glow.js)
  ok('glow: five presets yield backgrounds', ['bloom','halation','diffusion','rimLight','spotlight'].every((n) => typeof presetSpec(n, {}).background === 'string'));
  // A MISS THROWS, and this assertion used to demand the opposite. presetSpec answered an unknown name
  // with null, the builder read null as "no preset asked for", and `preset: "blom"` painted the plain
  // gradient in silence. The test encoded that as the contract, which is how a silent substitution
  // survives a gate. core/registry.js owns the seven names now, so a miss names them and suggests the
  // near one.
  ok('glow: an unknown preset THROWS, and the message names the vocabulary and the near miss', (() => {
    try { presetSpec('blom'); return false; } catch (e) {
      return /glow preset/.test(e.message) && /bloom/.test(e.message);
    }
  })());
  ok('glow: theme-adaptive by default', presetSpec('bloom', {}).background.includes('var(--accent)'));
  ok('glow: explicit tint threads through', presetSpec('bloom', { color: '#123456' }).background.includes('#123456'));
  ok('glow: cx/cy move the light centre', presetSpec('bloom', { cx: 0.25, cy: 0.75 }).background.includes('at 25.0% 75.0%'));
  ok('glow: pulse pure in t + amplitude clamped', pulseOpacity(1.3, 2) === pulseOpacity(1.3, 2)
    && (() => { for (let t = 0; t < 4; t += 0.05) { const o = pulseOpacity(t, 2, 9); if (o < 0.7 || o > 1) return false; } return true; })());
  ok('glow: helpers', alphaMix('red', 0.5) === 'color-mix(in srgb, red 50%, transparent)' && liftWhite('red', 70) === 'color-mix(in srgb, red 30%, white)');

  // chromatic glow presets (wave: chromatic aberration family)
  ok('glow: chromatic is a screen-blended RGB-split halo', (() => { const s = presetSpec('chromatic', {}); return s.blend === 'screen' && s.background.includes('#ff0033') && s.background.includes('#00ff5a') && s.background.includes('#0066ff'); })());
  ok('glow: chromatic offsets the channels off-centre', presetSpec('chromatic', {}).background.includes('at 45.5%') && presetSpec('chromatic', {}).background.includes('at 54.5%'));
  ok('glow: chromaCycle yields a screen-blended neon base', (() => { const s = presetSpec('chromaCycle', {}); return s.blend === 'screen' && typeof s.background === 'string'; })());
  ok('glow: cycleHue sweeps 0->360, pure + looping', cycleHue(0) === 0 && cycleHue(3, 6) === 180 && approx(cycleHue(6, 6), 0) && cycleHue(1.7, 5) === cycleHue(1.7, 5));

  // caption styles (core/captions.js)
  const cap = { t0: 1, t1: 3, text: 'Ship the <b>payoff</b> last' };
  const wins = capWords(cap);
  ok('captions: markup-stripped to 4 word windows, contiguous from t0', wins.length === 4 && approx(wins[0].t0, 1)
    && wins[3].t1 <= 3 && wins.every((w, i) => i === 0 || approx(w.t0, wins[i - 1].t1, 1e-3)));
  ok('captions: longer word holds longer (speech pacing)', (wins[2].t1 - wins[2].t0) > (wins[1].t1 - wins[1].t0));
  ok('captions: explicit words win', capWords({ ...cap, words: [{ t0: 1, t1: 1.2 }, { t0: 1.2, t1: 1.4 }, { t0: 1.4, t1: 2 }, { t0: 2, t1: 3 }] })[2].t1 === 2);
  ok('captions: deterministic', JSON.stringify(capWords(cap)) === JSON.stringify(capWords(cap)));
  ok('captions: wordU clamps, lineU monotonic 0->1', wordU(0, wins[0]) === 0 && wordU(99, wins[0]) === 1
    && lineU(0.5, wins) === 0 && approx(lineU(99, wins), 1)
    && (() => { let p = 0; for (let t = 1; t <= 3.2; t += 0.03) { const v = lineU(t, wins); if (v < p - 1e-9) return false; p = v; } return true; })());
  ok('captions: highlight band grows + uses accent token', parseFloat(CAP_STYLES.highlight(0.5).backgroundSize) === 50
    && CAP_STYLES.highlight(0.5).backgroundImage.includes('var(--accent)'));
  ok('captions: pillKaraoke sweeps 0->100', CAP_STYLES.pillKaraoke(0).backgroundSize.startsWith('0') && CAP_STYLES.pillKaraoke(1).backgroundSize.startsWith('100'));
  // the repo has shipped sub-4.5:1 dimming twice; the inactive treatment must be a colour mix, never opacity
  ok('captions: weightShift dims via color-mix, never opacity', (() => { const st = CAP_STYLES.weightShift(1, false); return st.opacity === undefined && st.color.includes('color-mix'); })());
  ok('captions: weightShift bump settles to 1', CAP_STYLES.weightShift(1, true).transform === 'scale(1.000)');
  ok('captions: clipWipe hidden at 0, full at 1', CAP_STYLES.clipWipe(0).clipPath.includes('100.00%') && CAP_STYLES.clipWipe(1).clipPath.includes('0.00%'));

  // ---- wave 3: the two mechanisms a style function cannot express by returning a value ----
  // `mode:'one'` and `unit:'char'` are decided by the CALLER before any style runs, so they are
  // declared in CAP_STYLE_SHAPE and checked here rather than inferred from a style's output.
  ok('captions: a style with no declared shape is word-level and line-mode',
    capShape('highlight').unit === 'word' && capShape('highlight').mode === 'line'
    && capShape('nope-not-a-style').mode === 'line');
  ok('captions: the one-word styles declare mode:one, typeOn declares unit:char',
    capShape('wordFlash').mode === 'one' && capShape('wordSlide').mode === 'one'
    && capShape('typeOn').unit === 'char' && capShape('typeOn').mode !== 'one');
  // The char windows must align INDEX FOR INDEX with core/type.js splitText('char'), which emits one
  // unit per non-space character, word by word. There is no DOM here, so the count is the check.
  const chw = capUnitWins(cap, 'char');
  ok('captions: char windows are one per non-space character',
    chw.length === 'Shipthepayofflast'.length && chw.every((w) => w.w.trim().length === 1));
  ok('captions: char windows are contiguous and stay inside their own word',
    chw.every((w, i) => i === 0 || approx(w.t0, chw[i - 1].t1, 1e-3))
    && approx(chw[0].t0, wins[0].t0, 1e-3) && chw[chw.length - 1].t1 <= wins[wins.length - 1].t1 + 1e-6);
  // SPEECH PACING SURVIVES THE SUBDIVISION, and the honest statement of it is about the WINDOW,
  // not the word length. Characters fill their own word's window, so a word the voice holds longer
  // gives its letters longer. Checked against EXPLICIT timings, because that is the design: under
  // the length-proportional fallback a word's window grows as (len+1) while its letter count grows
  // as len, so a longer word is fractionally FASTER per letter. That is an artifact of the
  // estimator and it is small; asserting the opposite of it, as a first draft of this line did, is
  // asserting a bug that is not there.
  ok('captions: characters inherit the pacing of the word window they sit in',
    (() => {
      const timed = { ...cap, words: [{ t0: 1, t1: 1.2 }, { t0: 1.2, t1: 1.4 }, { t0: 1.4, t1: 2.6 }, { t0: 2.6, t1: 3 }] };
      const c = capUnitWins(timed, 'char');
      const d = (w) => w.t1 - w.t0;
      return d(c[8]) > d(c[4]) && approx(c[7].t0, 1.4, 1e-3);   // 'payoff' is held 1.2s, 'the' 0.2s
    })());
  ok('captions: capUnitWins is deterministic and defaults to words',
    JSON.stringify(capUnitWins(cap)) === JSON.stringify(capWords(cap))
    && JSON.stringify(capUnitWins(cap, 'char')) === JSON.stringify(capUnitWins(cap, 'char')));
  // A one-word style paints only the word being spoken, so it needs no colour mix to say what is
  // unread: the unread words are not in the DOM. It must therefore never dim, in any state.
  ok('captions: the one-word styles never dim, in any state',
    ['wordFlash', 'wordSlide'].every((n) => [0, 0.5, 1].every((u) => [true, false].every((a) => {
      const st2 = CAP_STYLES[n](u, a);
      return st2.opacity === undefined && !/color-mix/.test(st2.color || '');
    }))));
  ok('captions: typeOn hides an unarrived character rather than dimming it, and holds its space',
    CAP_STYLES.typeOn(0, false).visibility === 'hidden'
    && CAP_STYLES.typeOn(0.5, true).visibility === 'visible'
    && CAP_STYLES.typeOn(0.5, true).boxShadow.includes('var(--accent)')
    && CAP_STYLES.typeOn(1, false).boxShadow === 'none'
    && CAP_STYLES.typeOn(0, false).opacity === undefined);

  // THE THREE STATES, once per style. A caption style whose upcoming and already-spoken words look
  // identical is a progress bar with no memory: the viewer cannot tell what has been read from what
  // is coming. Every style must therefore emit three DISTINCT declarations, and none of the three may
  // reach for opacity (the contrast doctrine at the top of core/captions.js).
  // clipWipe is exempt and cannot be tested this way: it is LINE-level, one argument, no word states.
  const st = (name, u, active) => JSON.stringify(CAP_STYLES[name](u, active));
  for (const name of CAP_STYLE_NAMES.filter((n) => n !== 'clipWipe')) {
    const upcoming = st(name, 0, false), current = st(name, 0.5, true), spoken = st(name, 1, false);
    ok(`captions: ${name}, upcoming, current and spoken all differ`,
      new Set([upcoming, current, spoken]).size === 3);
    // `undefined` or a flat 1 both mean "this style does not reach for opacity". PRESETS.highlight
    // writes 1 authoritatively, which is the opposite of the failure and must not read as one.
    ok(`captions: ${name}, no state dims by opacity`,
      [0, 0.5, 1].every((u) => [true, false].every((a) => {
        const o = CAP_STYLES[name](u, a).opacity;
        return o === undefined || Number(o) === 1;
      })));
    ok(`captions: ${name}. Every colour it names is a theme token`,
      [upcoming, current, spoken].every((s) => !/#[0-9a-f]{3}|rgba?\(|hsla?\(/i.test(s)));
    ok(`captions: ${name}, pure in u`, st(name, 0.37, true) === st(name, 0.37, true));
  }
  // The wave-2 bound that keeps captionBand() honest: nothing may scale past 1.22, which at the
  // styled skin's 64px stays inside its 14px pad. A style that wants more must move the band first.
  ok('captions: no style outgrows the caption band', CAP_STYLE_NAMES.every((name) => {
    for (let u = 0; u <= 1.0001; u += 0.02) for (const a of [true, false]) {
      const m = /scale\(([\d.]+)\)/.exec(CAP_STYLES[name](u, a).transform || '');
      if (m && parseFloat(m[1]) > 1.22) return false;
    }
    return true;
  }));
  ok('captions: neonEdge halo stays on the plate', (() => {
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const radii = [...CAP_STYLES.neonEdge(u, true).textShadow.matchAll(/([\d.]+)px/g)].map((m) => +m[1]);
      if (radii.some((r) => r > 14)) return false;
    }
    return CAP_STYLES.neonEdge(0, false).textShadow === 'none';
  })());
  ok('captions: underlineDraw rule grows 0 -> 100% and never covers the ink',
    CAP_STYLES.underlineDraw(0, false).backgroundSize.startsWith('0.0')
    && CAP_STYLES.underlineDraw(1, false).backgroundSize === '100.0% 4px'
    && CAP_STYLES.underlineDraw(0.5, true).backgroundPosition === '0 100%');
  ok('captions: readerFocus orders its three ink levels 76 < 88 < full',
    CAP_STYLES.readerFocus(0, false).color.includes('76%')
    && CAP_STYLES.readerFocus(1, false).color.includes('88%')
    && CAP_STYLES.readerFocus(0.5, true).color === 'var(--text)');
  // The schema's enum is a hand-written second copy of this vocabulary and nothing compared the two,
  // so a style added to the registry validated as an unknown name and the feature stayed unreachable.
  // Checked here rather than in schema-drift, which has no caption subject at all. MISTAKES #400.
  ok('captions: the schema enum IS the registry', (() => {
    const sch = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
    const en = sch.fields.captionStyle.enum;
    return en.length === CAP_STYLE_NAMES.length && CAP_STYLE_NAMES.every((n) => en.includes(n));
  })());
  // It must NOT settle to 1 while it is still the current word, or a still shows two states, not three.
  ok('captions: kineticSlam lands at 1.22 and holds above rest while current',
    CAP_STYLES.kineticSlam(0, true).transform === 'scale(1.220)'
    && CAP_STYLES.kineticSlam(1, true).transform === 'scale(1.040)'
    && CAP_STYLES.kineticSlam(1, false).transform === 'scale(1)');
}

// ---- shader stings ----
// The overlay itself is GL, so JS asserts the contract around it: one name list, one shader branch
// per name, and the schema exposing exactly that vocabulary, the three surfaces that can drift.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'stings.js'), 'utf8');
  ok(`stings: ${SHADER_FX.length} effects, all unique`, SHADER_FX.length > 0 && new Set(SHADER_FX).size === SHADER_FX.length);
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('const VERT'));
  const noBranch = SHADER_FX.map((_, i) => i).filter((i) => !frag.includes(`u_fx == ${i}`));
  ok(`stings: FRAG has a branch for every effect${noBranch.length ? ', missing ' + noBranch.map((i) => SHADER_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok('stings: no shader branch past the end of the list', !frag.includes(`u_fx == ${SHADER_FX.length}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  const en = schema.fields.stings.item.fx.enum;
  ok('stings: schema fx enum is exactly SHADER_FX, in order', JSON.stringify(en) === JSON.stringify(SHADER_FX));
  // EVERY branch keys off pp/bell (progress): a sting that ignores progress freezes mid-cut, which
  // defeats the only thing a sting is for. Derived from SHADER_FX, not a hand-typed wave list: the
  // list version covered 10 of 34 effects, so appending an effect added ZERO coverage and a frozen
  // new sting would have passed. Same failure as the hardcoded counts in MISTAKES #83.
  const STING_EXEMPT = new Set();   // none: a sting that does not move is not a sting
  const frozen = SHADER_FX.filter((name, i) => {
    if (STING_EXEMPT.has(name)) return false;
    const next = SHADER_FX[i + 1] ? frag.indexOf(`u_fx == ${i + 1}`) : frag.length;
    const body = frag.slice(frag.indexOf(`u_fx == ${i}`), next > 0 ? next : frag.length);
    return !(body.includes('pp') || body.includes('bell'));
  });
  ok(`stings: all ${SHADER_FX.length} branches depend on progress${frozen.length ? ', frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
}

// ---- three (real geometry) ----
// three.js is only deterministic if you keep it that way, and nothing about the library enforces it.
// These are the teeth behind core/three-fx.js's contract: the banned-API list is what stops someone
// reaching for THREE.Clock or Math.random six months from now and quietly breaking pure-in-n, which
// probe/canvas-purity would then catch only if the sampled frames happened to disagree.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'three-fx.js'), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok(`three: ${THREE_FX.length} scenes, all unique`, THREE_FX.length > 0 && new Set(THREE_FX).size === THREE_FX.length);
  // ONE list: three-scenes.js names them, three-fx.js implements them, and these must agree. The
  // split exists only because Node cannot resolve the browser-absolute three import.
  const implemented = [...code.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*)\(L, colors\) \{/gm)].map((m) => m[1]);
  const missing = THREE_FX.filter((n) => !implemented.includes(n));
  const extra = implemented.filter((n) => !THREE_FX.includes(n));
  ok(`three: every name in THREE_FX has a SCENES implementation${missing.length ? ', missing: ' + missing.join(', ') : ''}${extra.length ? ', orphaned: ' + extra.join(', ') : ''}`,
     missing.length === 0 && extra.length === 0);
  const BANNED = ['THREE.Clock', 'T().Clock', 'performance.now', 'Date.now', 'new Date', 'Math.random', 'requestAnimationFrame', 'AnimationMixer'];
  const used = BANNED.filter((b) => code.includes(b));
  ok(`three: no wall-clock or unseeded randomness${used.length ? ', found: ' + used.join(', ') : ''}`, used.length === 0);
  // A scene that never reads t is a still image rendered the most expensive way available.
  const frozen = THREE_FX.filter((n) => {
    const i = code.indexOf(`  ${n}(L, colors) {`);
    if (i < 0) return true;
    const body = code.slice(i, code.indexOf('\n  },', i));
    return !/pose\(t\b/.test(body);
  });
  ok(`three: every scene poses from t${frozen.length ? ', frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('three: schema enum is exactly THREE_FX, in order', JSON.stringify(schema.fields.layers.item.three.enum) === JSON.stringify(THREE_FX));
}

// ---- raymarch (3D subjects from distance fields) ----
// Two dispatch ladders here, not one: map() picks the distance field and the shading block picks the
// material. An effect present in one and missing from the other renders as an untextured silhouette
// or as nothing, so both are checked.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'raymarch-fx.js'), 'utf8');
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  ok(`raymarch: ${RAYMARCH_FX.length} scenes, all unique`, RAYMARCH_FX.length > 0 && new Set(RAYMARCH_FX).size === RAYMARCH_FX.length);
  const mapFn = frag.slice(frag.indexOf('float map(vec3 p)'), frag.indexOf('vec3 normalAt'));
  const noMap = RAYMARCH_FX.slice(0, -1).map((_, i) => i).filter((i) => !mapFn.includes(`u_fx == ${i}`));
  ok(`raymarch: map() dispatches every scene 0..${RAYMARCH_FX.length - 2}${noMap.length ? ', missing ' + noMap.map((i) => RAYMARCH_FX[i]).join(', ') : ''}`, noMap.length === 0);
  // every scene needs its own distance function, named for it, and every one must MOVE: a raymarched
  // subject that ignores time is a still image rendered the most expensive way available.
  const frozen = RAYMARCH_FX.filter((n) => {
    const fn = 'map' + n.charAt(0).toUpperCase() + n.slice(1);
    const i = frag.indexOf('float ' + fn);
    if (i < 0) return true;
    const body = frag.slice(i, frag.indexOf('\n}', i));
    return !body.includes('u_time');
  });
  ok(`raymarch: every scene has a named distance field that depends on time${frozen.length ? ', missing/frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('raymarch: schema enum is exactly RAYMARCH_FX, in order', JSON.stringify(schema.fields.layers.item.raymarch.enum) === JSON.stringify(RAYMARCH_FX));
  // ---- raymarchKeys: ONE window, several lit surfaces, cut on a chosen instant ----
  // The same lookup shaderKeys uses (core/surfaces/surface-keys.js), asserted separately because the
  // two surfaces read DIFFERENT authoring keys and a shared helper wired to the wrong one would still
  // pass every test written against the other.
  {
    const K = { raymarch: 'mandelbulb', raymarchKeys: [{ t: 2, shader: 'caustics' }, { t: 4, shader: 'chromeGlass' }] };
    ok('raymarchKeys: before the first key the layer shows its own `raymarch`', raymarchAt(K, 0) === 'mandelbulb' && raymarchAt(K, 1.99) === 'mandelbulb');
    ok('raymarchKeys: the key is inclusive, the swap lands ON its t', raymarchAt(K, 2) === 'caustics' && raymarchAt(K, 3.9) === 'caustics');
    ok('raymarchKeys: the last key holds to the end of the window', raymarchAt(K, 4) === 'chromeGlass' && raymarchAt(K, 99) === 'chromeGlass');
    ok('raymarchKeys: absent leaves the static name untouched', raymarchAt({ raymarch: 'holoFoil' }, 7) === 'holoFoil');
    const refuses = (L) => { try { raymarchValidate({ raymarch: 'metaballs', ...L }); return false; } catch { return true; } };
    ok('raymarchKeys: an unknown surface in a key is refused, not silently blank', refuses({ raymarchKeys: [{ t: 0, shader: 'mandlebulb' }] }));
    ok('raymarchKeys: a key with no `t` is refused', refuses({ raymarchKeys: [{ shader: 'caustics' }] }));
    ok('raymarchKeys: keys running backwards are refused (the later one could never be reached)',
      refuses({ raymarchKeys: [{ t: 3, shader: 'caustics' }, { t: 1, shader: 'holoFoil' }] }));
    ok('raymarchKeys: an empty list is refused rather than accepted and ignored', refuses({ raymarchKeys: [] }));
    ok('raymarchKeys: a valid list passes', !refuses(K));
    ok('raymarchKeys: the schema documents it as an array of { t, shader }',
      schema.fields.layers.item.raymarchKeys?.type === 'array'
      && schema.fields.layers.item.raymarchKeys.item.t.type === 'number'
      && schema.fields.layers.item.raymarchKeys.item.shader.type === 'string');
  }
}

// ---- resample (layer as texture) ----
// The distinguishing property of this shader vs the sting/ambient ones: EVERY branch must read the
// source texture. An effect that never calls texture2D is not a resample, it is a veil painted over
// the layer, and it would silently discard the pixels the author asked to transform.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'resample-fx.js'), 'utf8');
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  ok(`resample: ${RESAMPLE_FX.length} effects, all unique`, RESAMPLE_FX.length > 0 && new Set(RESAMPLE_FX).size === RESAMPLE_FX.length);
  const noBranch = RESAMPLE_FX.slice(0, -1).map((_, i) => i).filter((i) => !frag.includes(`u_fx == ${i}`));
  ok(`resample: FRAG has a branch for effects 0..${RESAMPLE_FX.length - 2}${noBranch.length ? ', missing ' + noBranch.map((i) => RESAMPLE_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok(`resample: last effect (${RESAMPLE_FX[RESAMPLE_FX.length - 1]}) is the trailing else`, !frag.includes(`u_fx == ${RESAMPLE_FX.length - 1}`));
  const branchAt = (i) => {
    const start = i === RESAMPLE_FX.length - 1 ? frag.lastIndexOf('} else {') : frag.indexOf(`u_fx == ${i}`);
    const next = i === RESAMPLE_FX.length - 1 ? frag.length : frag.indexOf('} else', start + 4);
    return frag.slice(start, next > start ? next : frag.length);
  };
  const blind = RESAMPLE_FX.filter((_, i) => !branchAt(i).includes('texture2D'));
  ok(`resample: every effect samples the source texture${blind.length ? ', blind: ' + blind.join(', ') : ''}`, blind.length === 0);
  // amount is the one dial every effect exposes; a branch that ignores it cannot be animated,
  // which is what `amount: [from, to]` exists for.
  const deaf = RESAMPLE_FX.filter((_, i) => !branchAt(i).includes('u_amt'));
  ok(`resample: every effect responds to amount${deaf.length ? ', deaf: ' + deaf.join(', ') : ''}`, deaf.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('resample: schema enum is exactly RESAMPLE_FX, in order', JSON.stringify(schema.fields.layers.item.resample.enum) === JSON.stringify(RESAMPLE_FX));
}

// ---- ambient shader looks ----
// Same three surfaces as stings, one difference: the last effect is the dispatch's trailing `else`
// (it has no `u_fx==N` literal), so branches are checked for indices 0..N-2 plus a final else.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'shaders-ambient.js'), 'utf8');
  ok(`ambient: ${AMBIENT_FX.length} effects, all unique`, AMBIENT_FX.length > 0 && new Set(AMBIENT_FX).size === AMBIENT_FX.length);
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('export function'));
  const noBranch = AMBIENT_FX.slice(0, -1).map((_, i) => i).filter((i) => !frag.includes(`u_fx==${i}`));
  ok(`ambient: FRAG has a branch for effects 0..${AMBIENT_FX.length - 2}${noBranch.length ? ', missing ' + noBranch.map((i) => AMBIENT_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok(`ambient: last effect (${AMBIENT_FX[AMBIENT_FX.length - 1]}) is the trailing else, no branch past it`, !frag.includes(`u_fx==${AMBIENT_FX.length - 1}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('ambient: schema shader enum is exactly AMBIENT_FX, in order', JSON.stringify(schema.fields.layers.item.shader.enum) === JSON.stringify(AMBIENT_FX));
  // ---- shaderKeys: ONE window, several looks, cut on a chosen instant ----
  // A lookup, never a transition: which look shows at `at` is a pure function of `at`, so a worker
  // that drew frame 200 before frame 5 cannot change frame 5. Asserted on both sides of a key and at
  // the key itself, because the boundary is the only part with an off-by-one to get wrong.
  {
    const K = { shader: 'voronoi', shaderKeys: [{ t: 2, shader: 'metaballs' }, { t: 4, shader: 'matrixDecode' }] };
    ok('shaderKeys: before the first key the layer shows its own `shader`', ambientShaderAt(K, 0) === 'voronoi' && ambientShaderAt(K, 1.99) === 'voronoi');
    ok('shaderKeys: the key is inclusive, the swap lands ON its t', ambientShaderAt(K, 2) === 'metaballs' && ambientShaderAt(K, 3.9) === 'metaballs');
    ok('shaderKeys: the last key holds to the end of the window', ambientShaderAt(K, 4) === 'matrixDecode' && ambientShaderAt(K, 99) === 'matrixDecode');
    ok('shaderKeys: absent leaves the static name untouched', ambientShaderAt({ shader: 'flow' }, 7) === 'flow' && ambientShaderAt({}, 7) === 'flow');
    const refuses = (L) => { try { ambientValidate(L); return false; } catch { return true; } };
    ok('shaderKeys: an unknown name in a key is refused, not silently blank', refuses({ shaderKeys: [{ t: 0, shader: 'aurara' }] }));
    ok('shaderKeys: a key with no `t` is refused', refuses({ shaderKeys: [{ shader: 'flow' }] }));
    ok('shaderKeys: keys running backwards are refused (the later one could never be reached)',
      refuses({ shaderKeys: [{ t: 3, shader: 'flow' }, { t: 1, shader: 'mist' }] }));
    ok('shaderKeys: an empty list is refused rather than accepted and ignored', refuses({ shaderKeys: [] }));
    ok('shaderKeys: a valid list passes', !refuses(K));
    ok('shaderKeys: the schema documents it as an array of { t, shader }',
      schema.fields.layers.item.shaderKeys?.type === 'array'
      && schema.fields.layers.item.shaderKeys.item.t.type === 'number'
      && schema.fields.layers.item.shaderKeys.item.shader.type === 'string');
  }
  // THE THREE FIELDS WITH A NAMED TECHNIQUE BEHIND THEM, each asserted on the step of its recipe that
  // is easy to lose and impossible to see in a still: reimplemented from the technique, never ported.
  for (const n of ['domainWarp', 'voronoi', 'metaballs'])
    ok(`ambient: ${n} is in the map with a blurb`, typeof AMBIENT_SHADERS[n] === 'string' && AMBIENT_SHADERS[n].length > 20);
  ok('ambient: fBm is lacunarity 2 / gain 0.5 over five octaves', /float fbm\(vec2 p\)[\s\S]{0,220}i < 5;[\s\S]{0,120}p \*= 2\.0; a \*= 0\.5;/.test(frag));
  ok('ambient: domainWarp warps TWICE (one level is a smear, not a fold)',
    /4\.0\*q/.test(frag) && /4\.0\*r/.test(frag));
  ok('ambient: voronoi finds its borders on the perpendicular bisector, not on F2-F1',
    /normalize\(d - mr\)/.test(frag));
  ok('ambient: metaballs merge on the polynomial smooth min', /float smin\(/.test(frag) && /d = smin\(d,/.test(frag));
  // EVERY ambient look must animate: one that ignores t is a frozen still on a layer whose entire
  // contract is "loops smoothly". Derived from AMBIENT_FX with a NAMED exemption set, because the
  // hand-typed wave list covered 8 of 17 and every appended effect landed outside it uncovered.
  // FRAG IS A TEMPLATE LITERAL. A backtick anywhere inside it ends the string, and what follows is
  // parsed as JavaScript: the failure is a syntax error or, worse, a page that hangs with nothing in
  // the log. Four separate times in one session a backtick reached a GLSL comment while someone was
  // quoting an identifier, including inside the comment warning about it. Care did not work; a check
  // does.
  // The BODY between the opening backtick and the closing one. Anything in there ends the string early.
  // Counting backticks in `frag` would be wrong twice over: the slice carries the opener AND the
  // closer, and it is exactly this kind of off-by-a-delimiter that the bug itself is.
  {
    const open = frag.indexOf('`');
    const close = frag.lastIndexOf('`');
    const body = open >= 0 && close > open ? frag.slice(open + 1, close) : '';
    ok('ambient: FRAG body contains no backtick (it would end the template literal)',
      body.length > 1000 && !body.includes('`'));
  }

  // A one-liner for "this must refuse the input", used throughout the block below.
  const thrown = (fn) => { try { fn(); return false; } catch { return true; } };
  // ── layer copy vs authored markup ──────────────────────────────────────────────────────────────
  {
    const { onScreenText, glyphText, layerText, snippet } = await import('../lib/text.mjs');
    ok('text: markup is stripped, which is what a viewer reads',
      onScreenText('Nothing came near the <b>edge.</b>') === 'Nothing came near the edge.');
    ok('text: a needle from the storyboard now matches the layer that emphasises a word',
      onScreenText('Nothing came near the <b>edge.</b>').includes('Nothing came near the edge.'));
    // The silent half of the same bug. This regex wants digits then whitespace, and a tag between
    // them is why a film that styled its own number walked past the check meant to catch it.
    const CLAIM = /\b(\d+)\s+(effects?|cuts?|shaders?)\b/i;
    ok('text: an emphasised number is still a claim',
      !CLAIM.test('<b>245</b> effects') && CLAIM.test(onScreenText('<b>245</b> effects')));
    ok('text: a count layer carries copy too', layerText({ type: 'count', text: '<b>9</b>' }) === '9');
    ok('text: a null type is a text layer', layerText({ text: 'hi' }) === 'hi');
    ok('text: an image layer has no copy', layerText({ type: 'image', text: 'x' }) === '');
    ok('text: a nullish text is empty, never the string "undefined"', onScreenText(undefined) === '' && onScreenText(null) === '');
    // Cutting the RAW string can slice a tag in half and print markup at a person.
    ok('text: a snippet cuts the readable copy, not the markup',
      snippet('Nothing came near the <b>edge.</b>', 24) === 'Nothing came near the ed…');

    // ── the three semantics this used to have, and which one each caller needs ────────────────────
    // A BLOCK tag breaks the run of text and an INLINE one does not. Substituting empty for every tag
    // (the old `plain`) glued 22 live strings, `"Financial infrastructure to<br>grow"` among them;
    // substituting a space for every tag (the old `onScreenText`) split "Northwind" in two.
    ok('text: a <br> separates two words',
      onScreenText('Financial infrastructure to<br>grow') === 'Financial infrastructure to grow');
    ok('text: emphasis INSIDE a word does not split it',
      onScreenText('North<b>wind</b>') === 'Northwind');
    ok('text: a block element separates its neighbours', onScreenText('<div>Mon</div><div>Tue</div>') === 'Mon Tue');
    // docs/MISTAKES.md #220/#216/#217: a <style> body, a <script> body and a comment are source the
    // frame never shows. Read as copy they became a brand-voice defect, clipped text and tiny type.
    ok('text: a stylesheet is not copy',
      onScreenText('<style>.g{color:red}/* unlock */</style><p>Ship it</p>') === 'Ship it');
    ok('text: an HTML comment is not copy', onScreenText('<!-- elevate --><p>Ship it</p>') === 'Ship it');
    ok('text: a script body is not copy', onScreenText('<script>var x="empower"</script>hi') === 'hi');
    // A string with no markup must survive untouched, so a plain comparison is unaffected.
    ok('text: prose with a bare < is left alone', onScreenText('a < b, and 3<4') === 'a < b, and 3<4');
    // glyphText is the DOM's textContent, which is what core/layers/text.js stripLen() counts, which is
    // what typedLen()'s visLen must be. A <br> costs the caret nothing.
    ok('text: glyphText counts what the caret walks, so a <br> is worth zero characters',
      glyphText('ab<br>cd') === 'abcd' && glyphText('<b>245</b>') === '245');
    ok('text: glyphText still refuses a stylesheet', glyphText('<style>.g{color:red}</style>hi') === ' hi');
    ok('text: the two variants disagree ONLY about tag spacing, never about which source is copy',
      onScreenText('<style>x</style>a<br>b') === 'a b' && glyphText('a<br>b') === 'ab');
  }

  // ── the layer TREE, walked once ────────────────────────────────────────────────────────────────
  {
    const { flattenLayers, flattenLayer } = await import('../lib/layers.mjs');
    const tree = [{ id: 'a', children: [{ id: 'b' }, { id: 'c', children: [{ id: 'd' }] }] }, { id: 'e' }];
    ok('layers: parents come before their children, depth first',
      flattenLayers(tree).map((l) => l.id).join('') === 'abcde');
    ok('layers: one layer plus its descendants', flattenLayer(tree[0]).map((l) => l.id).join('') === 'abcd');
    // seam-snap threw a TypeError on a null and inspect silently counted a stray string as a layer.
    ok('layers: a null in the array is skipped, not thrown on',
      flattenLayers([null, { id: 'a' }, undefined]).map((l) => l.id).join('') === 'a');
    ok('layers: a stray string is not a layer',
      flattenLayers(['oops', { id: 'a' }]).length === 1);
    ok('layers: a null child is skipped too',
      flattenLayers([{ id: 'a', children: [null, { id: 'b' }] }]).map((l) => l.id).join('') === 'ab');
    ok('layers: a non-array children is not walked', flattenLayers([{ id: 'a', children: 'x' }]).length === 1);
    ok('layers: no layers at all is empty, not an error',
      flattenLayers(undefined).length === 0 && flattenLayers(null).length === 0);
  }

  // ── crt ────────────────────────────────────────────────────────────────────────────────────────
  {
    const { crtSpec } = await import('../../core/layers/util.js');
    const d = crtSpec();
    ok('crt: the default blurs the backdrop, which is the half an overlay cannot do',
      /^blur\(1\.6px\)/.test(d.filter));
    // The one relationship in here that is not a preference. Blur spreads a glyph's light over more
    // area, so softness without lift is a dimmer picture, and a caller turning up `bloom` would be
    // quietly turning down the brightness.
    const b = (s) => Number(/brightness\(([\d.]+)\)/.exec(s)[1]);
    ok('crt: more bloom means more lift, always',
      b(crtSpec({ bloom: 4 }).filter) > b(crtSpec({ bloom: 1 }).filter));
    ok('crt: bloom 0 asks for no backdrop filter at all', crtSpec({ bloom: 0 }).filter === '');
    ok('crt: scanlines are HORIZONTAL, which is the direction a tube actually scans',
      d.background.includes('repeating-linear-gradient(to bottom'));
    ok('crt: lines 0 removes them and leaves the rest',
      !crtSpec({ lines: 0 }).background.includes('repeating-linear') && crtSpec({ lines: 0 }).background.includes('radial-gradient'));
    ok('crt: a scan thicker than the gap cannot paint a solid black field',
      crtSpec({ gap: 3, scan: 99 }).background.includes('0 3px'));
    ok('crt: everything off leaves nothing to paint',
      crtSpec({ lines: 0, vignette: 0 }).background === '');
    ok('crt: a tint is laid over the whole thing', crtSpec({ tint: 'red' }).background.startsWith('linear-gradient(red, red)'));
  }

  // ── ramp stop positions ────────────────────────────────────────────────────────────────────────
  // The whole contract of the feature, because every part of it has already been got wrong once.
  {
    const { palette } = await import('../../core/surfaces/palette.js');
    const hex = (n) => Array.from({ length: n }, (_, i) => '#0011' + String(i).padStart(2, '0'));
    ok('palette: plain stops parse to rgb triples, with no position',
      palette({ colors: ['#ff0000', '#00ff00'] }).every((c) => c.length === 3));
    ok('palette: a stop may name its own position',
      palette({ colors: ['#ff0000@0', '#00ff00@0.4'] })[1][3] === 0.4);
    ok('palette: a stop the engine cannot read THROWS rather than rendering as black',
      thrown(() => palette({ colors: ['teal'] })));
    ok('palette: a half-positioned ramp throws instead of guessing the rest',
      thrown(() => palette({ colors: ['#ff0000@0', '#00ff00'] })));
    ok('palette: a position outside 0..1 throws',
      thrown(() => palette({ colors: ['#ff0000@0', '#00ff00@2'] })));
    ok('palette: an empty or absent colors list is still null (use the effect default)',
      palette({}) === null && palette({ colors: [] }) === null);
    ok('palette: eight stops is still the ceiling the shader declares', hex(8).length === 8);
  }
  {
    // The EVEN case must reach the shader as no positions at all. The two shader paths are the same
    // formula in real arithmetic and different pictures in float32, so a generator that helpfully
    // filled in `@0.142857…` would shift every field that never asked for positions.
    const { ALL_GENERATORS, defaultsOf } = await import('../../core/generators.js');
    const spectrum = ALL_GENERATORS.find((g) => g.name === 'spectrum');
    const flat = spectrum.render(defaultsOf(spectrum.schema))[0].colors;
    ok('spectrum: untouched ramp stops carry NO position (bit-identical to before positions existed)',
      flat.length === 8 && flat.every((c) => !c.includes('@')));
    const moved = defaultsOf(spectrum.schema);
    moved.colour.ramp3At = 0.34;
    const withPos = spectrum.render(moved)[0].colors;
    ok('spectrum: moving one stop puts a position on EVERY stop',
      withPos.every((c) => c.includes('@')) && withPos[2].endsWith('@0.34'));
    const back = defaultsOf(spectrum.schema);
    back.colour.ramp3At = 0.05;   // before ramp2At (0.1428)
    ok('spectrum: stops that go backwards throw, naming both dials',
      thrown(() => spectrum.render(back)));
    const bands = ALL_GENERATORS.find((g) => g.name === 'bands');
    ok('bands: declares no stop positions, so its colours stay plain hex',
      bands.render(defaultsOf(bands.schema))[0].colors.every((c) => !c.includes('@')));
  }
  {
    // The sentinel is load-bearing and invisible: nothing about `-1` looks like "even" at a call site.
    ok('ambient: FRAG reads u_palAt[0] below zero as the even-spacing sentinel',
      frag.includes('A(0) < 0.0'));
  }

  const AMBIENT_EXEMPT = new Set(['barrel']);   // a static lens vignette, motionless by design
  const still = AMBIENT_FX.filter((name) => {
    const i = AMBIENT_FX.indexOf(name);
    const start = i === AMBIENT_FX.length - 1 ? frag.lastIndexOf('} else {') : frag.indexOf(`u_fx==${i}`);
    const nextI = frag.indexOf(`u_fx==${i + 1}`);
    const body = frag.slice(start, nextI > start ? nextI : start + 600);
    return !/\bt\b/.test(body);
  });
  const stillReal = still.filter((n) => !AMBIENT_EXEMPT.has(n));
  ok(`ambient: all ${AMBIENT_FX.length} looks animate (exempt: ${[...AMBIENT_EXEMPT].join(', ')})${stillReal.length ? '. Frozen: ' + stillReal.join(', ') : ''}`, stillReal.length === 0);
  // matrixDecode (wave 4, the trailing else) is digital rain, its heads must fall with t
  // Locate a branch by NAME, not by position: this used to slice the trailing `else`, which stopped
  // being matrixDecode the moment two effects were appended after it. A positional assertion silently
  // starts testing a different thing.
  const branchOf = (name) => { const i = frag.indexOf(name); if (i < 0) return ''; 
    const j = frag.indexOf('} else', i); return frag.slice(i, j < 0 ? frag.length : j); };
  for (const nm of ['matrixDecode', 'nebula', 'dotCrawl']) {
    ok(`ambient: ${nm} depends on time`, /\bt\b/.test(branchOf(nm)) && branchOf(nm).length > 40);
  }
}

// ---- composite looks (core/looks.js) ----
{
  ok(`looks: ${LOOK_NAMES.length} looks registered (>=26)`, LOOK_NAMES.length >= 26);
  ok('looks: Tier-B glassWarp uses an SVG displacement filter', resolveComposite('glassWarp').filter.includes('url("#f-displace-'));
  ok('looks: displace scale grows with strength', (() => { const big = resolveComposite('melt', {}, 1).filter, sm = resolveComposite('melt', {}, 0.1).filter; return big !== sm; })());
  ok('looks: unknown name -> null', resolveComposite('nope') === null);
  ok('looks: isLook/lookName parse a spec', isLook('neon:0.9') && lookName('neon:0.9') === 'neon' && !isLook('duotone'));
  const neon = resolveComposite('neon');
  // neon glows the LUMINANCE via an SVG bloom filter (url(#f-bloom-...)), not a CSS drop-shadow. By
  // default the glow keeps the SOURCE's own colours (id `f-bloom-src`), a real neon bleeds the image's
  // colours; an explicit colour override floods a uniform tint (encoded as RGB in the id).
  ok('looks: neon yields a filter with grade + bloom', neon.filter.includes('saturate(') && neon.filter.includes('url(#f-bloom'));
  ok('looks: neon default glows the source\'s own colours (no flood tint)', neon.filter.includes('f-bloom-src'));
  ok('looks: neon keys the bloom on VALUE (max channel) so saturated colours glow fully', neon.filter.includes('f-bloom-src-val'));
  const neonRed = resolveComposite('neon', { color: '#ff0000' }).filter;
  ok('looks: an explicit colour floods a uniform tint (encoded as RGB)', neonRed.includes('f-bloom-255_0_0') && !neonRed.includes('f-bloom-src'));
  // strength is a real master dial: the bloom radius (encoded -r<int>_<frac> in the filter id) grows with it
  const bloomR = (f) => { const m = f.match(/-r(\d+)_(\d+)/); return m ? parseFloat(`${m[1]}.${m[2]}`) : 0; };
  ok('looks: strength scales the look (bloom radii grow)', bloomR(resolveComposite('neon', {}, 1).filter) > bloomR(resolveComposite('neon', {}, 0.1).filter));
  ok('looks: strength clamps to [0,1]', resolveComposite('neon', {}, 5).filter === resolveComposite('neon', {}, 1).filter);
  // overlays: crt stacks scanlines + vignette, in pipeline order (texture before vignette)
  const crt = resolveComposite('crt');
  ok('looks: crt returns >=2 overlays (scanlines + vignette)', crt.overlays.length >= 2);
  ok('looks: pipeline order, grade before glow in neon', neon.filter.indexOf('saturate(') < neon.filter.indexOf('url(#f-bloom'));
  ok('looks: every look resolves to a filter or overlays', LOOK_NAMES.every((n) => { const r = resolveComposite(n); return r && (r.filter.length > 0 || r.overlays.length > 0); }));
  ok('looks: deterministic', resolveComposite('vhs', {}, 0.6).filter === resolveComposite('vhs', {}, 0.6).filter);

  // ---- the three guards from docs/MISTAKES.md #365 ----
  // All derived from LOOKS. A hand-written list is what let `color` be dead on nineteen looks while
  // the test above proved the feature on `neon`. One of the three where it happened to work.
  const sig = (r) => r.filter + '||' + JSON.stringify(r.overlays);
  const PROBE = { color: '#123456', color2: '#654321', colors: ['#111111', '#eeeeee'], grain: 0.9, vignette: 0.9, strength: 0.2 };

  // 1. A KNOB A LOOK DECLARES MUST DO SOMETHING. Behavioural, so it holds however routing is built.
  const deadKnobs = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(LOOKS[n].d)) {
      if (k === 'strength') continue;
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== sig(resolveComposite(n, { [k]: PROBE[k] })); } catch { moved = false; }
      if (!moved) deadKnobs.push(`${n}.${k}`);
    }
  }
  ok(`looks: every knob a look declares changes its output${deadKnobs.length ? ', dead: ' + deadKnobs.join(', ') : ''}`, deadKnobs.length === 0);

  // 1b. A VALUE A LOOK DECLARES MUST RENDER. The check above asks whether an AUTHOR can move the knob;
  // this asks whether the look's OWN default reaches the frame. They are different questions, because
  // the two travel by different routes: the author's knob is expanded into private argument names and
  // written AFTER the per-pass fixed bag (so it wins), while `d.color` is merged BEFORE it (so a pass
  // that fixes the same spelling silently shadows it). Sixteen looks declared a colour that never
  // rendered, including vintageAnamorphic's `#a9c8ff`. The exact hex the comment in core/looks.js
  // records finding dead and fixing, where the fix went to the pass and left the look entry behind.
  // Setting letterpress's to pure red moved zero pixels. docs/MISTAKES.md #380.
  const shadowed = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(LOOKS[n].d)) {
      if (k === 'strength' || PROBE[k] === undefined) continue;
      const saved = LOOKS[n].d[k];
      const before = sig(resolveComposite(n, {}));
      LOOKS[n].d[k] = PROBE[k];
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== before; } catch { moved = false; }
      LOOKS[n].d[k] = saved;
      if (!moved) shadowed.push(`${n}.${k}`);
    }
  }
  ok(`looks: every DEFAULT a look declares reaches the frame${shadowed.length ? ', shadowed: ' + shadowed.join(', ') : ''}`, shadowed.length === 0);

  // The routing table must agree with what the passes actually read, in BOTH directions, or the
  // "this look does not take that knob" error starts lying.
  const knobDrift = [];
  for (const n of LOOK_NAMES) {
    for (const k of Object.keys(KNOB_ROUTES)) {
      let moved = false;
      try { moved = sig(resolveComposite(n, {})) !== sig(resolveComposite(n, { [k]: PROBE[k] })); } catch { moved = false; }
      if (moved !== liveKnobs(n).includes(k)) knobDrift.push(`${n}.${k}`);
    }
  }
  ok(`looks: liveKnobs matches behaviour on all ${LOOK_NAMES.length} looks${knobDrift.length ? ', drift: ' + knobDrift.join(', ') : ''}`, knobDrift.length === 0);

  // A knob the look cannot apply is refused, not dropped (core/fx/index.js reasoning, one level up).
  ok('looks: a knob the look cannot use throws', (() => {
    try { resolveComposite('neon', { grain: 0.5 }); return false; } catch (e) { return /does not use/.test(e.message); }
  })());

  // 2. NO LOOK MAY BLUR THE ALPHA CHANNEL. #112 stated this rule and fixed one call site; `hStreak`
  // and `chromaPair` carried it for another two hundred entries. Stated once, for the whole registry.
  const alphaBlur = LOOK_NAMES.filter((n) => resolveComposite(n).filter.includes('drop-shadow('));
  ok(`looks: no look blurs the ALPHA channel (drop-shadow)${alphaBlur.length ? ': ' + alphaBlur.join(', ') : ''}`, alphaBlur.length === 0);
  ok('looks: vintageAnamorphic streaks the HIGHLIGHTS via a directional bloom (wide x, narrow y)',
    /f-bloom-[\d_]+-t[\d_]+-r[\d_]+-ry[\d_]+/.test(resolveComposite('vintageAnamorphic').filter));
  ok('looks: chromatic looks use a per-pixel channel split', resolveComposite('cyberpunk').filter.includes('#f-chroma-'));

  // 3. DISTINCT FILTER PARAMETERS MUST PRODUCE DISTINCT DEF IDS. ensureFilterDef caches by id, so a
  // parameter missing from the id means the second caller silently renders the first caller's filter.
  const idOf = (name, o) => ensureFilterDef(name, o);
  const bloomIds = [
    idOf('bloom', { radius: 10 }), idOf('bloom', { radius: 10, ry: 2 }), idOf('bloom', { radius: 10, ry: 4 }),
    idOf('bloom', { radius: 10, color: '#f00' }), idOf('bloom', { radius: 10, intensity: 2 }),
    idOf('bloom', { radius: 10, threshold: 0.3 }), idOf('bloom', { radius: 10, key: 'value' }),
  ];
  ok('filters: every bloom parameter reaches the def id (incl. the new ry)', new Set(bloomIds).size === bloomIds.length);
  const chromaIds = [
    idOf('chromaSplit', {}), idOf('chromaSplit', { px: 4 }),
    idOf('chromaSplit', { px: 4, warm: '#ff0000' }), idOf('chromaSplit', { px: 4, warm: 'rgba(255,0,0,0.5)' }),
    idOf('chromaSplit', { px: 4, cool: '#0000ff' }),
  ];
  ok('filters: every chromaSplit parameter reaches the def id (colour AND its alpha)', new Set(chromaIds).size === chromaIds.length);
}

// ---- themes: `default` IS the brand, and must stay identical to it ----
// `default` is the name every author reaches for by habit. It used to hold a mono+lime palette that
// belonged to no site of ours, so films shipped in a colour nobody chose (docs/MISTAKES.md #366). It
// now mirrors themes/vawe.json, and two files holding the same palette is exactly the shape that
// drifts, so the drift is a test, not a comment.
{
  const readTheme = (n) => JSON.parse(fsMod.readFileSync(new URL(`../../themes/${n}.json`, import.meta.url), 'utf8'));
  const def = readTheme('default'), vawe = readTheme('vawe'), neutral = readTheme('neutral');
  ok('themes: default mirrors the vawe brand palette exactly',
    JSON.stringify(def.palette) === JSON.stringify(vawe.palette));
  ok('themes: default carries the brand background pack too',
    JSON.stringify(def.bg || null) === JSON.stringify(vawe.bg || null));
  ok('themes: default is white-first cobalt, not the old lime', def.palette.accent === '#2563eb' && def.palette.bg === '#ffffff');
  ok('themes: the neutral reference still exists for a fork to copy, and is NOT the brand',
    neutral && neutral.palette && neutral.palette.accent !== vawe.palette.accent);
  // Every theme must resolve a background palette, whether it authors one or derives it.
  const themeDir = new URL('../../themes/', import.meta.url);
  const noPal = fsMod.readdirSync(themeDir).filter((f) => f.endsWith('.json')).filter((f) => {
    const t = JSON.parse(fsMod.readFileSync(new URL(f, themeDir), 'utf8'));
    return !t.bg && !bgPaletteFrom(t.palette);
  });
  ok(`themes: every theme resolves a background palette (authored or derived)${noPal.length ? ': ' + noPal.join(', ') : ''}`, noPal.length === 0);
}

// ---- the registry primitive (core/registry.js) ----
// Every named vocabulary resolves through `pick()`, which takes no fallback parameter, so a silent
// default is not expressible. docs/MISTAKES.md #369.
{
  const r = defineRegistry('widget', { alpha: 1, beta: 2 }, { slot: 'widget' });
  ok('registry: a known name resolves', r.pick('alpha') === 1);
  ok('registry: an unknown name THROWS rather than defaulting', (() => {
    try { r.pick('nope'); return false; } catch (e) { return /unknown widget/.test(e.message); }
  })());
  ok('registry: the error lists what the vocabulary does know', (() => {
    try { r.pick('nope'); return false; } catch (e) { return /alpha, beta/.test(e.message); }
  })());
  // The part that the evidence demanded: three of the five stranded names were real names in a
  // NEIGHBOURING registry, so a failed pick says where the name actually lives.
  ok('registry: a name from another registry is diagnosed, not just rejected', (() => {
    try { ANIM_REGISTRY.pick('popIn'); return false; }
    catch (e) { return /gsap effect/.test(e.message) && /fx: "popIn"/.test(e.message); }
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
    const w = defineRegistry('catalog widget', { alpha: 1 }, { slot: 'widget', catalog: FULL });
    return !!w.catalog && w.catalog.title === 'Widgets' && w.catalog.usage('alpha') === '{"widget":"alpha"}';
  })());
  const refuses = (bad) => {
    try { defineRegistry('bad widget', { alpha: 1 }, { catalog: bad }); return false; }
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
  // docs/EFFECTS.md.
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

  // ---- the effector: a falloff from a travelling point (docs/CRAFT/AE-TECHNIQUES.md #4) ----------
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

  // ---- where the cut goes, read off the speed graph (docs/CRAFT/AE-TECHNIQUES.md #1) -------------
  //
  // A SCALE CHANGE IS MOTION. The technique's own demonstration is a null scaling 100 to 200 per cent
  // across the seam and nothing translating at all, so a reader that measured translation alone would
  // score that exact move at zero and advise the author to move the cut away from it.
  ok('velocity-cut: a pure scale change reads as picture speed', (() => {
    const L = { start: 0, duration: 2, motion: [{ t: 0, scale: 1 }, { t: 1, scale: 2, ease: 'linear' }] };
    return layerSpeedAt(L, 0.5, 30) > 400;
  })());
  // A ROTATION MOVES PIXELS TOO, and this reader could not see one. The technique this file
  // implements (docs/CRAFT/AE-TECHNIQUES.md #1) hands a fast ROTATION across the seam, so the
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

  // ---- the range selector's smoothness dial (docs/CRAFT/AE-TECHNIQUES.md #5) ---------------------
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

// ---- sound: a CUT must have a voicing, exactly as a SEAM does ----
// lib-test already asserted "SEAM_CUE covers every SEAM_FX (no silent seam)". CUT_CUE had no equivalent,
// so the next presentation added to core/cuts.js would silently play the generic `whoosh`. The gate for
// one half of a pair and not the other is how a family goes quietly out of sync. docs/MISTAKES.md #374.
{
  // an explicit null is a DECISION (silence); only a missing KEY is a gap.
  const missing = CUT_REGISTRY.names.filter((n) => !(n in CUT_CUE));
  ok(`sound: CUT_CUE voices every one of the ${CUT_REGISTRY.names.length} cut presentations`
    + `${missing.length ? ', missing: ' + missing.join(', ') : ''}`, missing.length === 0);
}

// ---- blueprints: a HELD element needs idle motion (docs/MISTAKES.md #373) ----
{
  const cta = BEATS.ctaEnd({ mark: '/a.svg', command: 'npm i', sub: 's', url: 'u' });
  const mark = cta.find((l) => l.type === 'image');
  ok('blueprints: the end card\'s mark carries an idle loop, not a freeze', LOOP_FX.includes(mark.fx));
  // The measurement behind it: across the 12 beats, 33 layers are held >=2.5s and only 3 had ANY idle
  // motion. This asserts the one that is unambiguous. A mark on a held end card. It deliberately does
  // NOT assert the other 30: most are TEXT, and drifting type is harder to read, so "add idle
  // everywhere" would be the wrong lesson drawn from a true measurement.
  ok('blueprints: idle is on the MARK, not on the copy around it',
    cta.filter((l) => l.type === 'text').every((l) => !l.fx));
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

// ---- deprecation: 16 gsap names that duplicate an `anim` exactly (#364) ----
{
  ok('deprecated: every deprecated name STILL resolves, a notice, not a removal',
    Object.keys(DEPRECATED_FX).every((n) => GSAP_FX.includes(n))
    && Object.keys(DEPRECATED_EXIT).every((n) => EXIT_FX.includes(n)));
  ok('deprecated: each one names a REPLACEMENT, because "deprecated" alone is a scolding',
    Object.values({ ...DEPRECATED_FX, ...DEPRECATED_EXIT }).every((v) => /^(anim|out):"/.test(v)));
  // The ones that survive do something no `anim` can. A kinetic preset only works on a TEXT layer with
  // `split`, so bounceIn is NOT a duplicate of preset:"bounce" on an image, it is the only way.
  ok('deprecated: the per-character effects and idle loops are KEPT',
    ['charFold', 'charTilt', 'charBlurCascade', 'charOvershoot', 'float', 'breathe', 'wobble', 'heartbeat']
      .every((n) => !DEPRECATED_FX[n]));
  ok('deprecated: using one is a WARNING, not an error, it still renders', (() => {
    const w = lintData({ layers: [{ type: 'text', fx: 'popIn' }] });
    return w.some((m) => /deprecated/.test(m) && /anim:"pop"/.test(m));
  })());
  ok('deprecated: a kept effect produces no notice',
    !lintData({ layers: [{ type: 'text', fx: 'charFold' }] }).some((m) => /deprecated/.test(m)));
}

// ---- junctions: name a moment by its JOINT, never by its time (core/junctions.js) ----
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
  // ---- the MATCH CUT: the joint owns the handover, and the engine produces the alignment ----
  {
    const film = () => ({
      duration: 8, cuts: [{ t: 3, style: 'punch' }],
      matches: [{ at: 'cut@0', from: 'dot', to: 'card' }],
      layers: [{ id: 'dot', type: 'rect', start: 0.5, duration: 9 }, { id: 'card', type: 'rect', start: 6, duration: 2 }],
    });
    const bound = (d = film()) => { bindMatchesToJunctions(d, junctionTable(marksOf(d))); return d; };
    const L = (d, id) => d.layers.find((x) => x.id === id);
    {
      const d = bound();
      ok('match: the outgoing form ends ON the joint', L(d, 'dot').duration === 2.5);
      ok('match: the incoming form opens ON the joint', L(d, 'card').start === 3);
      ok('match: the handover is handed to `becomes`', L(d, 'dot').becomes === 'card' && L(d, 'dot').becomesDur === 0.42);
      ok('match: neither form ramps across the joint',
        L(d, 'dot').out === 'none' && L(d, 'dot').exitDur === 0 && L(d, 'card').anim === 'none' && L(d, 'card').enterDur === 0);
      const again = JSON.stringify(d);
      bindMatchesToJunctions(d, junctionTable(marksOf(d)));
      ok('match: binding twice is a no-op', JSON.stringify(d) === again);
    }
    ok('match: an id that is not a layer throws and lists the ids', (() => {
      const d = film(); d.matches[0].to = 'crd';
      try { bound(d); return false; } catch (e) { return /to "crd" is not the id/.test(e.message) && /dot, card/.test(e.message); }
    })());
    ok('match: a joint the film does not have throws', (() => {
      const d = film(); d.matches[0].at = 'cut@4';
      try { bound(d); return false; } catch (e) { return /"cut@4" does not exist/.test(e.message); }
    })());
    ok('match: an entrance or exit on either form is refused, not overwritten', (() => {
      const d = film(); d.layers[1].anim = 'rise';
      try { bound(d); return false; } catch (e) { return /a match cut has no entrance and no exit/.test(e.message) && /anim:"rise"/.test(e.message); }
    })());
    ok('match: a handover that eats its own shot is refused', (() => {
      const d = film(); d.duration = 3.6; d.matches[0].dur = 0.5;   // 0.5s of a 0.6s shot
      try { bound(d); return false; } catch (e) { return /the eye reads a move, not a match/.test(e.message); }
    })());
    ok(`match: the handover ceiling is a third of the shot, and it is OURS`, MATCH_HANDOVER_SHARE === 0.33);
    ok('match: beat-wrapped units that would tear the two forms apart are refused', (() => {
      const d = film(); d.sceneUnits = true;
      try { bound(d); return false; } catch (e) { return /carried apart at the very frame/.test(e.message) && /"sceneUnits": false/.test(e.message); }
    })());
    ok('match: a form that is not on screen before the joint is refused', (() => {
      const d = film(); d.layers[0].start = 4;
      try { bound(d); return false; } catch (e) { return /never on screen before the match/.test(e.message); }
    })());
    ok('match: a film that declares none is untouched', (() => {
      const d = { layers: [{ id: 'a' }] }, before = JSON.stringify(d);
      bindMatchesToJunctions(d, junctionTable([]));
      return JSON.stringify(d) === before;
    })());
    ok('match: the validator catches it without a render', (() => {
      const d = film(); d.matches[0].from = 'nope';
      return matchErrors(d).some((m) => /from "nope" is not the id/.test(m));
    })());
  }

  // The grammar has ONE definition now. audio-bridges established it and backgrounds reuse it; two
  // hand-kept copies of a definition is MISTAKES #159 exactly.
  ok('junctions: audio bridges resolve through the same table', (() => {
    const out = resolveBridges({ bridges: [{ bridge: 'j', sound: 'tense', at: 'cut@1', lead: 0.5 }] }, marks, 20);
    return out.length === 1 && out[0].at === 4.4;
  })());
}

// ---- css passthrough: `cssErrors` refuses every prop the engine rewrites every frame or kills
// globally, and stays silent on anything else (core/validate.mjs, core/layers/util.js applyCss) ----
{
  ok('css: opacity is refused, and names the alternative', (() => {
    const errs = cssErrors({ layers: [{ type: 'rect', css: { opacity: 0.5 } }] });
    return errs.some((e) => /css\.opacity is engine-owned/.test(e) && /`anim` \/ `motion`/.test(e));
  })());
  ok('css: transform/left/top/width/height/zIndex/pointerEvents/animation/transition/position are all refused', (() => {
    const OWNED = ['transform', 'left', 'top', 'width', 'height', 'zIndex', 'pointerEvents', 'animation', 'transition', 'position'];
    const errs = cssErrors({ layers: [{ type: 'rect', css: Object.fromEntries(OWNED.map((k) => [k, 1])) }] });
    return OWNED.every((k) => errs.some((e) => e.startsWith(`layer[0]: css.${k} is engine-owned`)));
  })());
  ok('css: a group child is walked too, not just top-level layers', (() => {
    const errs = cssErrors({ layers: [{ type: 'group', children: [{ type: 'rect', css: { opacity: 0.5 } }] }] });
    return errs.some((e) => /^layer\[0\]\.children\[0\]: css\.opacity/.test(e));
  })());
  ok('css: an unowned property (a box gradient, an inset highlight) is silent', (() => {
    const errs = cssErrors({ layers: [{ type: 'rect', css: { background: 'linear-gradient(0deg, red, blue)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)' } }] });
    return errs.length === 0;
  })());
  ok('css: no `css` prop at all is silent', cssErrors({ layers: [{ type: 'rect' }] }).length === 0);
}

// ---- vars track: PER-CHANNEL timing (core/tracks/vars.js) ----
{
  const drive = (L, t) => { const out = {}; varsFrame(null, { style: { setProperty: (k, v) => { out[k] = +v; } } }, L, null, t, 0, 0); return out; };
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

// ---- colour defaults: a token or a stated constant, never an unexplained hex (core/color.js) ----
{
  ok('color: a token resolves to var() in a CSS context', resolveColor(token('--accent'), 'css') === 'var(--accent, #ffffff)');
  ok('color: a token resolves to components where var() cannot go (SVG attrs, canvas)',
    JSON.stringify(resolveColor(token('--accent', { fallback: '#c2f23b' }), 'rgb', () => null)) === '[194,242,59]');
  ok('color: a plain string still works, so every old call site keeps its meaning',
    resolveColor('#ff0000', 'css') === '#ff0000');
  // The reason is the mechanism: a constant with no stated reason is indistinguishable from a brand
  // colour somebody forgot to tokenise, which is exactly how brew's orange ended up in a shared preset.
  ok('color: a deliberate constant MUST state why', (() => {
    try { lit('#000'); return false; } catch (e) { return /pass a reason/.test(e.message); }
  })());
  ok('color: literal() carries its reason with it', literal('#000', 'a vignette is black').why === 'a vignette is black');
  // The unfinished half of #351: a look's leak now follows the look's OWN declared colour.
  const leakOf = (n) => (resolveComposite(n).overlays.find((o) => /radial-gradient\(60%/.test(o.bg)) || {}).bg || '';
  ok('looks: fadedPolaroid leaks its OWN declared colour, not a fixed orange', leakOf('fadedPolaroid').includes('#ffd9a8'));
  ok('looks: nostalgia likewise', leakOf('nostalgia').includes('#ffcf9a'));
}

// ---- canvas FX (core/canvas-fx.js): pure pixel math (the DOM passes bake in the browser) ----
{
  ok('canvasfx: luma weights sum to 1 (rec709)', approx(luma(255, 255, 255), 255, 1e-3) && luma(0, 0, 0) === 0);
  ok('canvasfx: luma ranks green>red>blue', luma(0, 255, 0) > luma(255, 0, 0) && luma(255, 0, 0) > luma(0, 0, 255));
  // Bayer 4x4: 16 distinct thresholds, all in (0,1), tileable by &3
  ok('canvasfx: Bayer has 16 unique thresholds in (0,1)', (() => { const vs = BAYER4.flat(); return vs.length === 16 && new Set(vs).size === 16 && vs.every((v) => v > 0 && v < 1); })());
  ok('canvasfx: bayerAt tiles on a 4-grid', bayerAt(0, 0) === bayerAt(4, 8) && bayerAt(1, 2) === bayerAt(5, 6));
  // cell average over a 2x2 red/black patch = half red
  ok('canvasfx: cellAverage averages a cell', (() => { const d = [255, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255]; const [r, g, b] = cellAverage(d, 2, 0, 0, 2, 2, 2); return Math.round(r) === 128 && g === 0 && b === 0; })());
  ok('canvasfx: cellAverage clamps to image height (no overscan)', (() => { const d = [10, 10, 10, 255, 20, 20, 20, 255]; const [r] = cellAverage(d, 2, 0, 0, 2, 4, 1); return Math.round(r) === 15; })());
  ok('canvasfx: hash01 in [0,1), deterministic, seed-sensitive', (() => { for (let i = 0; i < 50; i++) { const v = hash01(i, i * 2, 3); if (v < 0 || v >= 1) return false; } return hash01(2, 5, 1) === hash01(2, 5, 1) && hash01(2, 5, 1) !== hash01(2, 5, 2); })());
  ok('canvasfx: key is stable + string/object equivalent', canvasFxKey('a.png', 'halftone') === canvasFxKey('a.png', { fx: 'halftone' }) && canvasFxKey('a.png', 'mosaic') !== canvasFxKey('b.png', 'mosaic'));
  ok('canvasfx: all 8 passes registered', ['halftone', 'dither', 'mosaic', 'stipple', 'ascii', 'edgeDetect', 'crosshatch', 'pixelSort'].every((n) => CANVAS_FX_NAMES.includes(n)) && CANVAS_FX_NAMES.length === 8);
  // Tier-C presets expand to a base pass; author overrides win; every preset targets a real pass
  ok('canvasfx: blueprint preset expands to edgeDetect', resolveFxSpec('blueprint').fx === 'edgeDetect' && resolveFxSpec('matrix').fx === 'ascii');
  ok('canvasfx: preset author-override wins', resolveFxSpec({ fx: 'blueprint', bg: [1, 2, 3] }).bg[0] === 1 && resolveFxSpec({ fx: 'comic', cell: 3 }).cell === 3);
  ok('canvasfx: base name passes through unchanged', resolveFxSpec('halftone').fx === 'halftone' && resolveFxSpec({ fx: 'mosaic', cell: 9 }).cell === 9);
  ok('canvasfx: every preset targets a real pass', Object.values(CANVAS_FX_PRESETS).every((p) => CANVAS_FX_NAMES.includes(p.fx)));
}

// ---- audio kit (core/audio-kit.mjs): synthesized cues must be deterministic + audible ----
{
  const a = renderCue(CUES.tick, 5), b = renderCue(CUES.tick, 5);
  ok('audio: renderCue is deterministic for a seed', a.length === b.length && a.every((v, i) => v === b[i]));
  ok('audio: a different seed changes the noise', (() => { const c = renderCue(CUES.tick, 6); return c.some((v, i) => v !== a[i]); })());
  ok('audio: every cue produces non-silent signal', Object.keys(CUES).every((n) => { const s = renderCue(CUES[n], 3); return s.some((v) => Math.abs(v) > 1e-4); }));
  ok('audio: no cue clips the 16-bit ceiling', Object.keys(CUES).every((n) => renderCue(CUES[n], 3).every((v) => Math.abs(v) <= 1)));
  // normalize is the reason cues are audible under a bed: raw Cuelume peaks bake at -25..-40 dBFS
  ok('audio: normalize lifts to the ceiling', (() => { const s = normalize(renderCue(CUES.whisper, 1), 0.8); let p = 0; for (const v of s) p = Math.max(p, Math.abs(v)); return Math.abs(p - 0.8) < 1e-3; })());
  ok('audio: normalize leaves silence alone (no /0)', (() => { const s = normalize(new Float32Array(64), 0.8); return s.every((v) => v === 0); })());
  ok('audio: tick is shorter than bloom (envelope shape survives)', renderCue(CUES.tick, 1).length < renderCue(CUES.bloom, 1).length);
  // a bed must loop seamlessly: first and last sample sit at the same point of every partial
  ok('audio: music bed is a whole number of seconds (seamless loop)', musicBed({ loop: 8 }).length === 8 * SR);
  ok('audio: music bed is deterministic', (() => { const x = musicBed({ loop: 2 }), y = musicBed({ loop: 2 }); return x.every((v, i) => v === y[i]); })());
  ok('audio: biquad bandpass rejects DC', (() => { const f = biquad('bandpass', 2000, 1.5); let last = 0; for (let i = 0; i < 500; i++) last = f(1); return Math.abs(last) < 0.05; })());
  ok('audio: biquad lowpass passes DC', (() => { const f = biquad('lowpass', 8000, 0.707); let last = 0; for (let i = 0; i < 500; i++) last = f(1); return last > 0.8; })());
}

// ---- beat detection (core/beats.js): the grid a beat-matched edit is built on ----
{
  const SR = 44100;
  // synthetic 120 BPM click track: a beat every 0.5s. If the detector cannot find THIS, it cannot
  // find a real one, and a wrong grid puts every cut between the beats instead of on them.
  const dur = 12, click = new Float32Array(SR * dur);
  for (let b = 0; b * 0.5 < dur; b++) {
    const o = Math.round(b * 0.5 * SR);
    for (let i = 0; i < 900 && o + i < click.length; i++) click[o + i] = Math.sin(i * 0.35) * Math.exp(-i / 220);
  }
  const { env, hopSeconds } = onsetEnvelope(click, SR);
  const { bpm, periodFrames, confidence } = estimateTempo(env, hopSeconds);
  ok('beats: detects 120 BPM on a synthetic click track', Math.abs(bpm - 120) < 4);
  ok('beats: reports high confidence on a clear pulse', confidence > 3);
  const phase = estimatePhase(env, periodFrames);
  const grid = beatGrid(periodFrames, phase, hopSeconds, dur);
  ok('beats: grid spacing matches the tempo', grid.length > 20 && Math.abs((grid[5] - grid[4]) - 0.5) < 0.03);
  ok('beats: grid phase lands on the clicks', Math.abs(grid[4] - Math.round(grid[4] / 0.5) * 0.5) < 0.06);
  // silence has no pulse: the detector must say so rather than invent a grid to snap cuts to
  const { env: envQ, hopSeconds: hq } = onsetEnvelope(new Float32Array(SR * 4), SR);
  ok('beats: silence yields no confident tempo', estimateTempo(envQ, hq).confidence < 1.6);
  // snapping must respect the author's intent
  const bts = [0, 0.5, 1, 1.5, 2];
  ok('beats: snapToBeat pulls a near miss onto the beat', snapToBeat(1.04, bts, 0.12) === 1);
  ok('beats: snapToBeat REFUSES to drag a far cut', snapToBeat(1.28, bts, 0.12) === 1.28);
  ok('beats: snapToBeat is a no-op with no grid', snapToBeat(3.3, [], 0.12) === 3.3);
  ok('beats: downbeats take every 4th beat', downbeats([0, 1, 2, 3, 4, 5, 6, 7, 8], 4).join() === '0,4,8');
  // ---- beat BINDING (core/beat-bind.js): the grid reaches the film's joints, or the render stops ----
  const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
  const G = { bpm: 120, confidence: 8, beats: [0, 0.5, 1, 1.5, 2, 2.5, 3], downbeats: [0, 2] };
  const sc = () => ({ audio: { music: 'beat', beatSync: true }, cuts: [{ t: 0.54, style: 'punch' }, { t: 1.28, style: 'punch' }], seams: [{ t: 1.75, dur: 0.5, fx: 'fade' }] });
  ok('beat-bind: a scene without beatSync is left entirely alone', beatSyncOf({ audio: { music: 'beat' } }) === null);
  ok('beat-bind: a bare bed name resolves to its sidecar', beatGridPath(sc()) === 'assets/music/beat.beats.json');
  ok('beat-bind: a .wav path resolves beside the track', beatGridPath({ audio: { music: 'assets/music/x.wav', beatSync: true } }) === 'assets/music/x.beats.json');
  const s1 = sc(); const r1 = bindBeats(s1, G);
  ok('beat-bind: a near-miss cut lands on the beat', s1.cuts[0].t === 0.5);
  ok('beat-bind: a far cut keeps the time the author wrote', s1.cuts[1].t === 1.28);
  ok('beat-bind: the run reports what moved and what did not', r1.moved.length === 1 && r1.held.length === 2);
  ok('beat-bind: a seam snaps the CENTRE of its blend', s1.seams[0].t === 1.75 && s1.seams[0].dur === 0.5);
  const s2 = sc(); s2.seams[0].t = 1.65; bindBeats(s2, G);
  ok('beat-bind: a seam whose centre is a near miss slides whole', Math.abs(s2.seams[0].t - 1.75) < 1e-6);
  const s3 = sc(); s3.cuts[0].snap = false; bindBeats(s3, G);
  ok('beat-bind: `snap:false` keeps a time the author means', s3.cuts[0].t === 0.54);
  const s4 = sc(); s4.audio.beatSync = { bar: true }; bindBeats(s4, G);
  ok('beat-bind: `bar:true` snaps to downbeats only', s4.cuts[0].t === 0.54);
  const s5 = { duration: 8, audio: { music: 'beat', beatSync: true }, cuts: [{ t: 4.48, style: 'punch' }] };
  bindBeats(s5, { ...G, seconds: 3 });
  ok('beat-bind: a looping bed unrolls its grid across the film', s5.cuts[0].t === 4.5);
  ok('beat-bind: the unroll leaves the caller\'s sidecar alone', G.beats.length === 7);
  ok('beat-bind: binding twice is identical (pure)', JSON.stringify(bindBeats(sc(), G)) === JSON.stringify(bindBeats(sc(), G)));
  ok('beat-bind: a missing grid THROWS rather than rendering unmatched', throws(() => bindBeats(sc(), null), /beat grid|beatmap/));
  ok('beat-bind: a pulseless track is refused, not snapped to', throws(() => bindBeats(sc(), { ...G, confidence: 1.2 }), /confidence/));
  ok('beat-bind: an empty grid is refused', throws(() => bindBeats(sc(), { ...G, beats: [] }), /carries no/));
  ok('beat-bind: beatSync with no track to read names the fix', throws(() => beatGridPath({ audio: { beatSync: true, music: 'auto' } }), /audio\.music/));
  // ONE POLICY (docs/MISTAKES.md #477). scripts/media/beatsync.mjs calls snapJoints/unrollGrid too, so
  // these pin the contract the CLI used to hold a second, wider opinion about.
  ok('beat-bind: the default tolerance IS snapToBeat\'s own', snapToBeat(1.04, bts) === snapToBeat(1.04, bts, DEFAULT_MAX_SHIFT));
  const s6 = { cuts: [{ t: 0.54 }], seams: [{ t: 1.75, dur: 0.5 }], stings: [{ t: 0.54, fx: 'flash' }] };
  const r6 = snapJoints(s6, G.beats, DEFAULT_MAX_SHIFT);
  // A STING RIDES ITS JOINT (docs/MISTAKES.md #496). It used to keep the time the author wrote, so a
  // sting authored ON a cut drifted off that cut by however far the cut moved.
  ok('beat-bind: a sting authored on a cut is still on that cut after the snap', s6.stings[0].t === s6.cuts[0].t);
  ok('beat-bind: snapJoints reports the drift the CLI prints', r6.moved[0].kind === 'cut' && r6.moved[0].drift === 0.04);
  const s6b = { cuts: [{ t: 0.54 }], stings: [{ t: 0.66, fx: 'flash' }] };
  snapJoints(s6b, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: a sting offset from its cut keeps the offset the author wrote',
     Math.abs((s6b.stings[0].t - s6b.cuts[0].t) - 0.12) < 1e-6);
  const s6c = { cuts: [{ t: 0.54 }], stings: [{ t: 3.1, fx: 'flash' }] };
  snapJoints(s6c, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: a sting that punctuates no joint keeps its own time', s6c.stings[0].t === 3.1);
  const s6d = { cuts: [{ t: 0.54 }], stings: [{ t: 0.54, fx: 'flash', snap: false }] };
  snapJoints(s6d, G.beats, DEFAULT_MAX_SHIFT);
  ok('beat-bind: `snap:false` holds a sting where the author put it', s6d.stings[0].t === 0.54);
  ok('beat-bind: the beat period is read off the grid, not guessed', Math.abs(beatPeriod(G.beats) - 0.5) < 1e-9);
  const s7 = sc(); bindBeats(s7, G);
  const s8 = { cuts: [{ t: 0.54, style: 'punch' }, { t: 1.28, style: 'punch' }], seams: [{ t: 1.75, dur: 0.5, fx: 'fade' }] };
  snapJoints(s8, unrollGrid(G.beats, 0, 0), DEFAULT_MAX_SHIFT);
  ok('beat-bind: the declaration and the CLI land every joint on the same beat',
     JSON.stringify(s8.cuts.map((c) => c.t)) === JSON.stringify(s7.cuts.map((c) => c.t))
     && s8.seams[0].t === s7.seams[0].t);
  ok('beat-bind: unrollGrid returns a new array and never edits the sidecar', unrollGrid(G.beats, 3, 8) !== G.beats && G.beats.length === 7);
  // the `lift` entrance must actually travel: pop only scaled 14%, which read as flat
  ok('motion: lift travels further than pop at t=0', parseFloat(String(lift(0).transform).match(/scale\(([\d.]+)/)[1]) < 0.75);
  ok('motion: lift settles to identity', lift(1).transform.includes('scale(1.0000)'));
}

// ---- opacity envelope (core/clips.js): eased, and safe to cross-dissolve with ----
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

// ---- clipStyleAt (core/clips.js): the composition asked for, not performed ----
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

// ---- sceneDims (core/safe.js): how big is the frame, asked once ----
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
// core/safe.js exists because four copies of the safe box disagreed; the same then happened to the
// frame size across eight call sites. This asserts the copies stay gone rather than trusting a memo.
{
  const scan = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : scan(fp);
    return /\.(mjs|js)$/.test(e.name) ? [fp] : [];
  });
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const offenders = [];
  for (const fp of [...scan(path.join(root, 'scripts')), ...scan(path.join(root, 'verify')), ...scan(path.join(root, 'core'))]) {
    if (fp.endsWith(path.join('core', 'safe.js')) || fp.endsWith(path.join('gates', 'lib-test.mjs'))) continue;
    const src = fs.readFileSync(fp, 'utf8');
    if (/landscape\s*\?\s*(1920\s*:\s*1080|\[1920)/.test(src)) offenders.push(path.relative(root, fp));
  }
  ok(`dims: nobody re-derives the canvas (${offenders.join(', ') || 'clean'})`, offenders.length === 0);
}

// ---- spectrum (core/spectrum.js): the audio-reactive bake is a pure transform ----
{
  const sr = 44100, n = sr, sig = new Float64Array(n);
  for (let i = 0; i < n; i++) sig[i] = Math.sin(2 * Math.PI * 80 * i / sr) * (i < n / 2 ? 1 : 0.05);
  const sp = bandEnergies(sig, sr, 30, BANDS);
  ok('spectrum: one row per video frame', sp.frames.length === 30);
  ok('spectrum: a row per band', sp.frames[0].length === BANDS.length);
  ok('spectrum: normalised into 0..1', sp.frames.every((r) => r.every((v) => v >= 0 && v <= 1)));
  // Compare ABSOLUTE peaks, not the normalised columns: every band is normalised to its own max, so
  // the normalised value of a silent band is meaningless on its own. That is exactly why `peak` exists.
  ok('spectrum: an 80Hz tone lands in the LOW band', sp.peak[0] > sp.peak[2] * 10);
  ok('spectrum: peak exposes that a band is near-silent', sp.peak[2] < 0.05);
  ok('spectrum: a quiet passage reads lower than a loud one', sp.frames[25][0] < sp.frames[5][0]);
  // THE property the determinism claim rests on: same samples in, same table out, always.
  ok('spectrum: deterministic', JSON.stringify(bandEnergies(sig, sr, 30, BANDS)) === JSON.stringify(sp));
  ok('spectrum: sampleAt holds the endpoints', sampleAt(sp, 9999, 'low') === sp.frames[sp.frames.length - 1][0]);
  // a typo must make the effect STAND STILL mid-render, never throw
  ok('spectrum: an unknown band is 0, not a throw', sampleAt(sp, 5, 'nope') === 0);
  ok('spectrum: a missing table is 0, not a throw', sampleAt(null, 5, 'low') === 0);
}

{
  // ransom: the whole effect rests on being a PURE function of (seed, index). If it ever picked up
  // Math.random or the clock the note would flicker frame to frame, this is the guard for that.
  const a = ransomGlyph('READ', 3, { accent: '#c8342b' });
  const b = ransomGlyph('READ', 3, { accent: '#c8342b' });
  ok('ransom: same (seed,i) → identical glyph spec', JSON.stringify(a) === JSON.stringify(b));
  ok('ransom: a different index changes the spec', JSON.stringify(ransomGlyph('READ', 4, {})) !== JSON.stringify(a));
  ok('ransom: a different seed changes the spec', JSON.stringify(ransomGlyph('DEAL', 3, {})) !== JSON.stringify(a));
  ok('ransom: picks a face from the pool', RANSOM_FACES.some((f) => f.family === a.family));
  ok('ransom: rotation stays within ±6°', Math.abs(a.rot) <= 6.001);
  ok('ransom: torn:false yields no clip-path', ransomGlyph('READ', 3, { torn: false }).clip === null);
  ok('ransom: accent tile carries the passed accent', ransomSwatches('#0af').some((s) => s.bg === '#0af'));
}

// ---- unified transitions router + lowering (core/transitions-lower.js) ----
{
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  ok('transitions: seam-only name routes to seam', boundaryMechanism('whipPan') === 'seam');
  ok('transitions: ambiguous basic defaults to cut', boundaryMechanism('fade') === 'cut' && boundaryMechanism('slide') === 'cut' && boundaryMechanism('wipe') === 'cut');
  ok('transitions: dissolve (no cut) routes to seam', boundaryMechanism('dissolve') === 'seam');
  ok('transitions: cut-only name routes to cut', boundaryMechanism('zoom') === 'cut');
  ok('transitions: sting-only name routes to sting', boundaryMechanism('glitch') === 'sting');
  ok('transitions: mech:seam upgrades an ambiguous basic', boundaryMechanism('fade', 'seam') === 'seam');
  ok('transitions: layer-only anim rejected as a boundary', throws(() => boundaryMechanism('pop')));
  ok('transitions: unknown fx rejected', throws(() => boundaryMechanism('definitely-not-a-fx')));
  ok('transitions: mech mismatch rejected', throws(() => boundaryMechanism('whipPan', 'cut')));
  // lowering expands + consumes the unified keys, in place, idempotently
  const d = lowerScene({ layers: [{ text: 'A', transition: { in: 'rise', dur: 0.4 } }], transitions: [{ at: 2, fx: 'whipPan', dur: 0.6, timing: 'snappy' }] });
  ok('transitions: boundary lowers to a seam', Array.isArray(d.seams) && d.seams[0].t === 2 && d.seams[0].fx === 'whipPan' && d.seams[0].timing === 'snappy');
  ok('transitions: unified keys are consumed', !('transitions' in d) && !('transition' in d.layers[0]));
  ok('transitions: layer transition lowers to anim/enterDur', d.layers[0].anim === 'rise' && d.layers[0].enterDur === 0.4);
  ok('transitions: ambiguous basic lowers to a cut', (() => { const x = lowerScene({ transitions: [{ at: 1, fx: 'slide', dir: 'left' }] }); return Array.isArray(x.cuts) && x.cuts[0].style === 'slide'; })());
  ok('transitions: lowering is idempotent (no-op second pass)', (() => { const x = lowerScene(lowerScene({ transitions: [{ at: 1, fx: 'fade' }] })); return x.cuts.length === 1; })());
  ok('transitions: a scene with no unified keys is untouched', (() => { const src = { layers: [{ text: 'x' }], cuts: [{ t: 1, style: 'fade' }] }; const x = lowerScene(src); return x.cuts.length === 1 && !('transitions' in x); })());
  // A STING TINT IS A COLOUR, NOT A HEX (docs/MISTAKES.md #497). The renderer read it with
  // parseInt(hex, 16), so a theme token or an rgb() became NaN and then [0,0,0]: a black tint, no error.
  ok('transitions: a sting tint may be a theme token', checkStingColor('var(--accent)', 'x') === 'var(--accent)');
  ok('transitions: a sting tint may be a hex or an rgb()',
     checkStingColor('#ff7a35', 'x') === '#ff7a35' && checkStingColor('rgb(255,0,0)', 'x') === 'rgb(255,0,0)');
  const refuses = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
  ok('transitions: a tint nothing can resolve is refused BY NAME, never tinted black',
     refuses(() => lowerScene({ stings: [{ t: 1, fx: 'flash', color: 'var(--nope)' }] }), /--nope/));
  ok('transitions: a sting palette is checked entry by entry',
     refuses(() => lowerScene({ stings: [{ t: 1, fx: 'leak', colors: ['#fff', 'not-a-colour'] }] }), /colors\[1\]/));
  // Auto sound-design must cue EVERY seam fx: a seam with no mapping falls back to a bare whoosh and
  // reads wrong (a bloom-iris should not swoosh). This gate is why `data.seams` stopped rendering silent
  // (audio derived cuts+stings only). If a new SEAM_FX ships without a SEAM_CUE row, this fails loudly.
  ok('audio: SEAM_CUE covers every SEAM_FX (no silent seam)', SEAM_FX.every((fx) => typeof SEAM_CUE[fx] === 'string'));
  ok('audio: every SEAM_CUE voicing resolves to a baked wav', Object.values(SEAM_CUE).every((c) => c === 'whoosh' || c === 'reveal' || c in CUES));
}

// ---- TACTILE sound design: the film's own motion, voiced (core/audio-tactile.js) -----------------
{
  const { tactileCues, capDensity, derive, travelOf, prominenceOf, MOTION_CUES, DENSITY, RISER_LEAD } =
    await import('../../core/audio-tactile.js');
  const canvas = { w: 1920, h: 1080 };

  // The five motion voices are being added to CUES in core/audio-kit.mjs alongside this module, so
  // this reports rather than fails: a name that has not baked yet renders silent, and the day one of
  // them is renamed this line is what says so.
  const unbaked = MOTION_CUES.filter((n) => !(n in CUES));
  if (unbaked.length) console.log(`  · tactile: motion cues not baked yet (pending core/audio-kit.mjs): ${unbaked.join(', ')}`);
  ok('tactile: `tick` and the interaction vocabulary it borrows already bake', 'tick' in CUES);

  ok('tactile: nothing sounds without a scene', tactileCues({}).length === 0);

  // THE CONTRACT SHAPE. The same { t, name, gain } every other cue in buildSfx carries: no second
  // pipeline, no schema change, and the Go mixer loads the baked wav by name exactly as it does today.
  const shaped = tactileCues({ duration: 6,
    layers: [{ type: 'rect', start: 0, w: 1200, h: 700, anim: 'slide-left' }] }, { canvas });
  ok('tactile: every cue is {t, name, gain} and nothing else',
     shaped.length > 0 && shaped.every((c) => Object.keys(c).sort().join() === 'gain,name,t'
       && typeof c.t === 'number' && typeof c.name === 'string' && typeof c.gain === 'number'));
  ok('tactile: cues come back sorted by time', shaped.every((c, i) => i === 0 || shaped[i - 1].t <= c.t));
  ok('tactile: every derived cue names a motion voice',
     derive({ duration: 30, spectacle: { at: 12 }, camera: [{ t: 0, s: 1 }, { t: 3, s: 1.4 }],
       layers: [{ type: 'rect', start: 1, w: 1400, h: 700 }, { type: 'rect', start: 4, w: 120, h: 60 },
         { type: 'count', start: 6, to: 40 }, { type: 'html', start: 9, w: 800, h: 400,
           parts: [{ select: '.r', stagger: 0.3, count: 3 }] }] }, { canvas })
       .every((c) => MOTION_CUES.includes(c.name)));

  // THE WHOLE POINT: the sound is a FUNCTION OF THE MOTION. Same entrance, different size.
  const one = (L) => tactileCues({ duration: 4, layers: [L] }, { canvas })[0];
  const big = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'rise' });
  const small = one({ type: 'rect', start: 1, w: 160, h: 60, anim: 'rise' });
  ok('tactile: a big layer thuds, a chip plucks', big.name === 'thud' && small.name === 'pluck');
  ok('tactile: the bigger layer lands louder', big.gain > small.gain);
  // ...and same size, different travel. With no per-cue parameters, LEVEL is the only handle on how
  // hard a thing lands, so a slide has to be louder than a fade of the identical card.
  const slid = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'slide-left' });
  const faded = one({ type: 'rect', start: 1, w: 1600, h: 800, anim: 'fade' });
  ok('tactile: travel sets the level', slid.gain > faded.gain && slid.name === faded.name);
  ok('tactile: travelOf reads the entrance vocabulary',
     travelOf('slide-left') > travelOf('rise') && travelOf('rise') > travelOf('pop') && travelOf('fade') === 0);
  ok('tactile: an unsized picture falls back to a stated size, never to zero',
     prominenceOf({ type: 'image' }, canvas).area > 0);
  ok('tactile: a headline is measured from its own copy, so it outweighs a caption',
     one({ type: 'text', start: 1, text: 'THE ONE THING TO REMEMBER', size: 140 }).gain
     > one({ type: 'text', start: 1, text: 'a footnote', size: 24 }).gain);
  ok('tactile: a hairline rule is decoration and never sounds',
     tactileCues({ duration: 4, layers: [{ type: 'rect', start: 1, w: 1600, h: 3 }] }, { canvas }).length === 0);
  ok('tactile: a glow is a condition of the frame, not an event',
     tactileCues({ duration: 4, layers: [{ type: 'glow', start: 1, w: 900, h: 900 }] }, { canvas }).length === 0);
  ok('tactile: a layer can opt out by name',
     tactileCues({ duration: 4, layers: [{ type: 'rect', start: 1, w: 1600, h: 800, sound: false }] }, { canvas }).length === 0);

  // CUTS AND SEAMS ARE NOT DERIVED HERE. CUT_CUE already voices them and a second table would be two
  // ways to say one thing. They arrive as `fixed`, rank against the motion, and come back untouched.
  ok('tactile: a cut is not re-voiced here',
     tactileCues({ duration: 6, cuts: [{ t: 2, style: 'punch' }] }, { canvas }).length === 0);
  ok('tactile: the fixed structural cues are never handed back',
     tactileCues({ duration: 6, layers: [{ type: 'rect', start: 4, w: 1200, h: 700 }] },
       { canvas, fixed: [{ t: 2, name: 'press' }] }).every((c) => c.name !== 'press'));
  ok('tactile: an arrival that flams against a cut is dropped, and the cut is not',
     tactileCues({ duration: 6, layers: [{ type: 'rect', start: 2.01, w: 1200, h: 700 }] },
       { canvas, fixed: [{ t: 2, name: 'press' }] }).length === 0);

  // A CAMERA MOVE. Contiguous changing keys are ONE move, and its size sets the level.
  const camCues = tactileCues({ duration: 30, camera: [
    { t: 0, s: 1, x: 0, y: 0 }, { t: 10, s: 1, x: 0, y: 0 },
    { t: 10.3, s: 1.13, x: 0, y: -10 }, { t: 12.3, s: 1, x: 0, y: 0 }, { t: 20, s: 1, x: 0, y: 0 }] }, { canvas });
  ok('tactile: a punch-in and its release are ONE travel, not two',
     camCues.length === 1 && camCues[0].name === 'travel' && camCues[0].t === 10);
  ok('tactile: a camera that only sits still says nothing',
     tactileCues({ duration: 20, camera: [{ t: 0, s: 1 }, { t: 19, s: 1 }] }, { canvas }).length === 0);
  ok('tactile: a longer move is a bigger gesture, so it is louder',
     tactileCues({ duration: 9, camera: [{ t: 0, s: 1 }, { t: 4, s: 1.6 }] }, { canvas })[0].gain
     > tactileCues({ duration: 9, camera: [{ t: 0, s: 1 }, { t: 0.5, s: 1.6 }] }, { canvas })[0].gain);

  // A COUNTER. Plucks on the number's own velocity curve, so an easeOut crowds them at the start.
  const cnt = tactileCues({ duration: 8, layers: [
    { type: 'count', start: 1, duration: 3, from: 0, to: 84, countStart: 0.2, countDur: 2, ease: 'easeOutCubic' }] }, { canvas });
  ok('tactile: a counter plucks, and never more than a handful',
     cnt.length >= 3 && cnt.length <= 7 && cnt.every((c) => c.name === 'pluck'));
  ok('tactile: a counter is quiet, or it is a machine gun', cnt.every((c) => c.gain <= 0.15));
  ok('tactile: the plucks follow the EASE, spreading as an easeOut settles',
     cnt[1].t - cnt[0].t < cnt[cnt.length - 1].t - cnt[cnt.length - 2].t);
  ok('tactile: the counter lands inside its own window',
     cnt[0].t >= 1.2 - 1e-9 && cnt[cnt.length - 1].t <= 3.2 + 1e-9);
  ok('tactile: the last pluck is the one that lands', cnt[cnt.length - 1].gain > cnt[0].gain);

  // A `parts` STAGGER. Thinned EVENLY when it is too fast to hear, never chewed into holes.
  const trainLayer = (count, stagger) => ({ type: 'html', start: 2, w: 900, h: 500,
    parts: [{ select: '.x', anim: 'fadeUp', stagger, delay: 0, count }] });
  const fast = tactileCues({ duration: 8, layers: [trainLayer(12, 0.05)] }, { canvas });
  ok('tactile: a 12-part train at 0.05s is thinned, never voiced 12 times', fast.length <= 6 && fast.length >= 2);
  ok('tactile: the thinned train stays EVENLY spaced',
     new Set(fast.slice(1).map((c, i) => +(c.t - fast[i].t).toFixed(3))).size === 1);
  ok('tactile: the thinned train is never faster than the ear can follow',
     fast.every((c, i) => i === 0 || c.t - fast[i - 1].t >= 0.2 - 1e-9));
  ok('tactile: a slow train keeps its own stagger',
     tactileCues({ duration: 8, layers: [trainLayer(4, 0.3)] }, { canvas })
       .every((c, i, a) => i === 0 || Math.abs((c.t - a[i - 1].t) - 0.3) < 1e-6));
  ok('tactile: a parts layer does not ALSO thud as one card', fast.every((c) => c.name === 'pluck'));
  ok('tactile: an unmatched selector sounds nothing, rather than guessing a count',
     tactileCues({ duration: 8, layers: [{ type: 'html', start: 2, w: 900, h: 500,
       parts: [{ select: '.x', stagger: 0.1 }] }] }, { canvas }).length === 0);

  // THE SPECTACLE. A riser that ENDS on the nominated moment, and the cap may not drop it.
  const spec = tactileCues({ duration: 30, spectacle: { at: 12, of: 'ring', device: 'ripple' },
    layers: Array.from({ length: 40 }, (_, i) => ({ type: 'rect', start: 11 + i * 0.02, w: 900, h: 500 })) }, { canvas });
  const riser = spec.find((c) => c.name === 'riser');
  ok('tactile: the spectacle rises INTO its moment and ends there',
     !!riser && Math.abs(riser.t + RISER_LEAD - 12) < 1e-6);
  ok('tactile: the density cap may not drop the moment the film nominated', !!riser);
  ok('tactile: no spectacle, no riser',
     tactileCues({ duration: 6, layers: [{ type: 'rect', start: 2, w: 900, h: 500 }] }, { canvas })
       .every((c) => c.name !== 'riser'));

  // DENSITY. The design problem, not the mapping.
  const hail = { duration: 30, layers: Array.from({ length: 120 },
    (_, i) => ({ type: 'rect', start: +(i * 0.12).toFixed(2), w: 700, h: 300, anim: 'rise' })) };
  const capped = tactileCues(hail, { canvas });
  ok('tactile: 120 events do not become 120 cues',
     derive(hail, { canvas }).length === 120 && capped.length < 120);
  ok('tactile: two cues never flam inside the merge gap',
     capped.every((c, i) => i === 0 || c.t - capped[i - 1].t >= DENSITY.minGap));
  ok('tactile: no second of the film carries more than the cap',
     capped.every((c) => capped.filter((k) => Math.abs(k.t - c.t) < 0.5).length <= DENSITY.maxPerSec));
  ok('tactile: the cap is authorable', tactileCues(hail, { canvas, config: { maxPerSec: 1 } }).length
     < tactileCues(hail, { canvas, config: { maxPerSec: 8 } }).length);
  ok('tactile: `gain` scales the whole mix',
     tactileCues(hail, { canvas, config: { gain: 0.5 } })
       .every((c, i) => Math.abs(c.gain - r2gain(capped[i].gain * 0.5)) < 1e-9));
  // Weight, not arrival order, decides who survives. A hairline that happens first must not silence
  // the headline that happens 10ms later: that is the whole reason cues carry a prominence.
  const clash = capDensity([
    { t: 1.0, name: 'pluck', gain: 0.1, w: 0.2 },
    { t: 1.01, name: 'thud', gain: 0.4, w: 0.7 }]);
  ok('tactile: at the same instant the more prominent cue wins',
     clash.length === 1 && clash[0].name === 'thud');

  // DETERMINISM. The same scene derives the identical list, every run.
  const rich = { duration: 20, camera: [{ t: 0, s: 1 }, { t: 6, s: 1.4 }],
    spectacle: { at: 12, of: 'x', device: 'ripple' },
    layers: [{ type: 'rect', start: 1, w: 1400, h: 700, anim: 'slide-left' },
      { type: 'text', start: 3, text: 'a headline that carries the frame', size: 120 },
      { type: 'count', start: 7, duration: 3, to: 900, ease: 'easeOutExpo' },
      { type: 'html', start: 10, w: 800, h: 400, parts: [{ select: '.r', stagger: 0.25, count: 5 }] }] };
  const runA = JSON.stringify(tactileCues(rich, { canvas }));
  ok('tactile: the same scene derives the identical cue list, every run',
     runA === JSON.stringify(tactileCues(rich, { canvas })));
  ok('tactile: the list does not depend on the order the scene declares its layers',
     JSON.stringify(tactileCues({ ...rich, layers: rich.layers.slice().reverse() }, { canvas })) === runA);
}

// ---- springEase (iOS-parameterised spring easing) ------------------------------------------------
{
  const house = springEase({ response: 0.5, dampingFraction: 1 });
  ok('springEase: 0 at u=0', house(0) === 0);
  ok('springEase: 1 at u=1', house(1) === 1);
  ok('springEase: critically damped never overshoots', [0, 0.2, 0.4, 0.6, 0.8, 0.99].every((u) => house(u) <= 1 + 1e-9));
  ok('springEase: critically damped is monotonic up', (() => { let prev = -1; for (let u = 0; u <= 1; u += 0.05) { const v = house(u); if (v < prev - 1e-9) return false; prev = v; } return true; })());
  ok('springEase: deterministic', house(0.37) === house(0.37));
  const bouncy = springEase({ response: 0.5, dampingFraction: 0.4 });
  ok('springEase: underdamped overshoots past 1 somewhere', (() => { for (let u = 0.1; u < 1; u += 0.02) if (bouncy(u) > 1.001) return true; return false; })());
  ok('springEase: default factory works', typeof springEase() === 'function' && springEase()(1) === 1);
}
// ---- path-morph (true shape morph): pure maths, no DOM ------------------------------------------
{
  const A = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const B = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }];
  ok('morph: u=0 equals A', lerpPoints(A, B, 0).every((p, i) => approx(p.x, A[i].x) && approx(p.y, A[i].y)));
  ok('morph: u=1 equals B', lerpPoints(A, B, 1).every((p, i) => approx(p.x, B[i].x) && approx(p.y, B[i].y)));
  ok('morph: u=0.5 is the midpoint', lerpPoints(A, B, 0.5).every((p, i) => approx(p.x, (A[i].x + B[i].x) / 2) && approx(p.y, (A[i].y + B[i].y) / 2)));
  ok('morph: deterministic (same u → same points)', JSON.stringify(lerpPoints(A, B, 0.37)) === JSON.stringify(lerpPoints(A, B, 0.37)));
  ok('morph: spin returns to identity at u=1 (no rotation at the end)', lerpPoints(A, B, 1, Math.PI).every((p, i) => approx(p.x, B[i].x, 1e-6) && approx(p.y, B[i].y, 1e-6)));
  ok('pointsToD closed appends Z', pointsToD(A, true).endsWith('Z'));
  ok('pointsToD open has no Z', !pointsToD(A, false).includes('Z'));
  ok('pointsToD starts with M', pointsToD(A).startsWith('M'));
  ok('rotatePoints wraps by k', (() => { const r = rotatePoints(A, 1); return r[0] === A[1] && r[3] === A[0]; })());
  ok('bestRotation of identical arrays is 0', bestRotation(A, A, 1) === 0);
  ok('morphD is a valid d string', /^M[-0-9.]/.test(morphD(A, B, 0.5)));
}
// ---- glow flash envelope (finite attack-decay) ---------------------------------------------------
ok('flash: 0 before start', flashEnvelope(-0.1) === 0);
ok('flash: 0 at t=0', approx(flashEnvelope(0, { attack: 0.3, decay: 1 }), 0));
ok('flash: peaks near the attack end', approx(flashEnvelope(0.3, { attack: 0.3, decay: 1, peak: 0.4 }), 0.4, 1e-6));
ok('flash: decays back to 0', flashEnvelope(1.3, { attack: 0.3, decay: 1, peak: 0.4 }) <= 1e-6);
ok('flash: peak capped at 0.45', flashEnvelope(0.3, { attack: 0.3, decay: 1, peak: 5 }) <= 0.45 + 1e-9);
ok('flash: never negative', [0, 0.1, 0.3, 0.7, 1.2, 2].every((t) => flashEnvelope(t) >= 0));
// ---- border-beam (pure angle / sheen position) ---------------------------------------------------
ok('beamAngle wraps 0..360', beamAngle(10, 0.5) >= 0 && beamAngle(10, 0.5) < 360);
ok('beamAngle deterministic', beamAngle(1.23, 0.7) === beamAngle(1.23, 0.7));
ok('shinePos travels -20..120', (() => { const p = shinePos(0.8, 1.6); return p >= -20 && p <= 120; })());
ok('beamConic is a conic-gradient', beamConic(45, '#fff', 90).startsWith('conic-gradient(from 45.0deg'));
// ---- gradient + split: the fill each unit carries (core/layers/text.js) --------------------------
// `gradient` + `split` rendered NOTHING for as long as both existed. gradientFill paints the container
// and sets the text transparent; splitText then moves every glyph into a child span, and while `color`
// and `-webkit-text-fill-color` inherit, `background-image` does not. So the glyphs were transparent
// with no paint of their own, and a shipped film's headline was invisible (docs/MISTAKES.md #417).
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
// ---- typing / untype character count (core/layers/text.js, pure in local t) -----------------------
{
  const VIS = 20;
  const fwd = (lt) => typedLen(lt, { cps: 10, visLen: VIS });
  ok('typedLen: starts at 0', fwd(0) === 0);
  ok('typedLen: rises with time', fwd(0.5) === 5 && fwd(1) === 10);
  ok('typedLen: reaches visLen', fwd(VIS / 10) === VIS);
  ok('typedLen: never exceeds visLen', (() => { for (let lt = 0; lt < 12; lt += 0.01) if (fwd(lt) > VIS) return false; return true; })());
  ok('typedLen: never below 0', (() => { for (let lt = -3; lt < 12; lt += 0.01) if (fwd(lt) < 0) return false; return true; })());
  ok('typedLen: forward count is non-decreasing', (() => { let prev = -1; for (let lt = 0; lt < 4; lt += 0.01) { const n = fwd(lt); if (n < prev) return false; prev = n; } return true; })());

  const un = (lt) => typedLen(lt, { cps: 10, visLen: VIS, untype: 2.5 });
  ok('untype: full line at the untype moment', un(2.5) === VIS);
  ok('untype: non-increasing after the untype time', (() => { let prev = Infinity; for (let lt = 2.5; lt < 8; lt += 0.01) { const n = un(lt); if (n > prev) return false; prev = n; } return true; })());
  ok('untype: deletes back to 0', un(2.5 + VIS / 10 + 0.05) === 0 && un(20) === 0);
  ok('untype: stays 0 once emptied', (() => { for (let lt = 6; lt < 30; lt += 0.05) if (un(lt) !== 0) return false; return true; })());
  ok('untypeRate changes the delete speed', (() => {
    const slow = typedLen(3, { cps: 10, visLen: VIS, untype: 2.5, untypeRate: 4 });
    const fast = typedLen(3, { cps: 10, visLen: VIS, untype: 2.5, untypeRate: 40 });
    return slow === VIS - 2 && fast === 0 && slow > fast;
  })());
  ok('untypeRate defaults to the typing rate', typedLen(3, { cps: 10, visLen: VIS, untype: 2.5 })
    === typedLen(3, { cps: 10, visLen: VIS, untype: 2.5, untypeRate: 10 }));
  ok('no untype: unaffected by untypeRate (regression guard)', (() => {
    for (let lt = 0; lt < 4; lt += 0.01) if (typedLen(lt, { cps: 10, visLen: VIS }) !== typedLen(lt, { cps: 10, visLen: VIS, untypeRate: 3 })) return false;
    return true;
  })());
  // PURITY: parallel seek renders evaluate frames out of order. Shuffled must equal ascending.
  ok('typedLen pure in lt (shuffled order = ascending order)', (() => {
    const args = { cps: 10, visLen: VIS, untype: 2.5, untypeRate: 7 };
    const times = [0, 0.37, 1.9, 2.5, 2.51, 3.3, 4.75, 6.2, 9, 0.04, 2.499, 5.5];
    const asc = [...times].sort((a, b) => a - b).map((lt) => [lt, typedLen(lt, args)]);
    const shuffled = [11, 3, 0, 7, 5, 1, 9, 2, 10, 4, 8, 6].map((i) => times[i]);
    const got = new Map(shuffled.map((lt) => [lt, typedLen(lt, args)]));
    return asc.every(([lt, n]) => got.get(lt) === n);
  })());
}
// ---- the catalogue is READ from the registries, not restated beside them --------------------------
// `scripts/site/effects-catalog.mjs` used to hand-list 32 sections whose name lists were, by
// inspection, exactly the registries sitting one import away. It reads `catalogued()` now, so this
// asserts the join actually happened: a registry that publishes itself has one section, carrying its
// own title, slot label, prose and names. A regression here is silent otherwise, because a section
// that vanishes takes its rows out of docs/EFFECTS.md and the doc still regenerates cleanly.
{
  const { sections } = await import('../site/effects-catalog.mjs');
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
// docs/EFFECTS.md is generated from the registries and 379 of its 476 rows had no description, because
// the only source was a FLAT 68-key map in the generator whose own comment called the notes "a bonus,
// never a second source of truth". A name with no description is a vocabulary nobody can choose from.
// Each family now keeps its blurbs next to its registry, and a missing one fails HERE, the same shape
// as blueprints-catalog.mjs, which exits 1 when a beat has no trailing comment.
{
  const families = [
    ['PRESETS', Object.keys(PRESETS), PRESET_BLURBS],
    ['ANIM_NAMES', ANIM_NAMES, ANIM_BLURBS],
    ['IDLE_NAMES', IDLE_NAMES, IDLE_BLURBS],
    ['PRESENTATIONS', Object.keys(PRESENTATIONS), CUT_BLURBS],
    ['SEAM_FX', SEAM_FX, SEAM_BLURBS],
    ['FX_TYPES', FX_TYPES, FX_BLURBS],
    ['GSAP_FX', GSAP_FX, GSAP_BLURBS],
    ['EXIT_FX', EXIT_FX, GSAP_EXIT_BLURBS],
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

// ---- reference profiles (scripts/author/profiles.mjs) --------------------------------------------
// Every name a profile BANS or PREFERS has to exist in the registry it comes from, or the rule is
// decoration. Two did not: a24 banned `pop` and vercel banned `bounce`, both sitting in `banCuts` and
// both compared only against cut styles, so neither ever fired. Split into banCuts (cut styles) and
// banMotion (an anim or a kinetic preset), and asserted here so the next one cannot go quiet.
{
  const CUTS = new Set(Object.keys(PRESENTATIONS));
  const MOTION = new Set([...ANIM_NAMES, ...Object.keys(PRESETS)]);
  const bad = [];
  for (const [name, P] of Object.entries(PROFILES)) {
    for (const k of ['cuts', 'banCuts']) for (const v of P[k] || []) if (!CUTS.has(v)) bad.push(`${name}.${k}: ${v}`);
    for (const v of P.banMotion || []) if (!MOTION.has(v)) bad.push(`${name}.banMotion: ${v}`);
    for (const v of P.stings || []) if (!SHADER_FX.includes(v)) bad.push(`${name}.stings: ${v}`);
  }
  ok('every profile names only real cuts / stings / entrances' + (bad.length ? `, ${bad.join(' · ')}` : ''), bad.length === 0);
  ok('every profile carries the 7 fields SELECTION.md declares',
    Object.values(PROFILES).every((P) => ['face', 'pace', 'easing', 'accent', 'look', 'blurb', 'antiBlurb'].every((k) => typeof P[k] === 'string' && P[k].length)));
}

// ---- camera moves (pure keyframe generators, checked through cameraAt) ----------------------------
{
  const push = slowPush({ start: 1, dur: 4, from: 1, to: 1.2 });
  ok('slowPush: 2 keyframes', push.length === 2);
  ok('slowPush: cameraAt start = from', approx(cameraAt(push, 1).s, 1));
  ok('slowPush: cameraAt end = to', approx(cameraAt(push, 5).s, 1.2));
  const dive = diveIn({ start: 0, dur: 2, tx: 1920, ty: 0, to: 1.5, canvasW: 1920, canvasH: 1080 });
  ok('diveIn: ends at target scale', approx(cameraAt(dive, 2).s, 1.5));
  ok('diveIn: pan centres the target (x = W/2 - tx)', approx(cameraAt(dive, 2).x, 1920 / 2 - 1920));
  ok('diveIn: pan y = H/2 - ty', approx(cameraAt(dive, 2).y, 1080 / 2 - 0));
  ok('diveIn: starts at identity', approx(cameraAt(dive, 0).s, 1) && approx(cameraAt(dive, 0).x, 0));
  const pan = panFollow({ start: 0, dur: 5, dy: -300 });
  ok('panFollow: interior ease is linear (constant velocity)', pan[1].ease === 'linear');
  ok('panFollow: cameraAt midpoint is halfway (linear)', approx(cameraAt(pan, 2.5).y, -150));
  const orb = orbit({ start: 0, dur: 6, deg: 12 });
  ok('orbit: 3 keyframes with a linear interior', orb.length === 3 && orb[1].ease === 'linear');
  ok('orbit: swings ry through 0', approx(cameraAt(orb, 3).ry, 0, 1e-3));
  const mp = multiPhase({ start: 0, legs: [{ dur: 1, s: 1.3 }, { dur: 2, s: 1.3 }, { dur: 1, s: 1 }] });
  ok('multiPhase: interior legs are linear, last eases out', mp[1].ease === 'linear' && mp[mp.length - 1].ease !== 'linear');
  ok('multiPhase: deterministic', JSON.stringify(multiPhase({ start: 0, legs: [{ dur: 1, s: 1.2 }] })) === JSON.stringify(multiPhase({ start: 0, legs: [{ dur: 1, s: 1.2 }] })));
  // A leg that mentions no axis must CHANGE no axis. `s` always carried forward; x and y defaulted to
  // 0 on the same line, so the documented "hold" leg between a push and a settle panned the camera all
  // the way home, 180px over 2s, a move as big as the push (MISTAKES #197). The old test passed `s` on
  // every leg and no position at all, which is exactly the input shape that works.
  const hold = multiPhase({ start: 0, legs: [{ dur: 1.5, s: 1.25, x: 180, y: -60 }, { dur: 2 }, { dur: 1.5, s: 1, x: 0, y: 0 }] });
  const h0 = cameraAt(hold, 1.5), h1 = cameraAt(hold, 3.5);
  ok('multiPhase: a leg that mentions nothing holds position', approx(h1.x, h0.x, 1e-6) && approx(h1.y, h0.y, 1e-6));
  ok('multiPhase: ...and holds scale, as it always did', approx(h1.s, h0.s, 1e-6));
  ok('multiPhase: an explicit later leg still moves', approx(cameraAt(hold, 5).x, 0, 1e-6) && approx(cameraAt(hold, 5).s, 1, 1e-6));
  // travel: the contract is the pan math, so every station must sit at frame CENTRE when the camera
  // arrives. That conversion is the reason the helper exists and the thing hand-typed legs get wrong.
  const trStations = [
    { tx: 400, ty: 300, s: 1.4 },
    { tx: 1500, ty: 800, s: 1.8, dur: 1.2, dwell: 0.6 },
    { tx: 960, ty: 540, s: 1, dur: 1 },
  ];
  const tr = travel({ stations: trStations, start: 0, canvasW: 1920, canvasH: 1080 });
  const arrivals = [0, 1.2, 2.8];   // station 0 opens the flight; 1.2 = dur, 2.8 = 1.2 + 0.6 dwell + 1
  ok('travel: every station lands at frame centre (x = W/2 - tx)', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).x, 1920 / 2 - st.tx, 1e-6)));
  ok('travel: ...and on y (y = H/2 - ty)', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).y, 1080 / 2 - st.ty, 1e-6)));
  ok('travel: each station arrives at its own scale', trStations.every((st, i) =>
    approx(cameraAt(tr, arrivals[i]).s, st.s, 1e-6)));
  // One journey, not four hops: an eased curve at each station zeroes velocity on arrival (#125).
  ok('travel: interiors are linear, only the final arrival settles',
    tr.slice(1, -1).every((k) => k.ease === 'linear') && tr[tr.length - 1].ease === 'easeOutCubic'
    && tr[0].ease === undefined);
  const dw0 = cameraAt(tr, 1.2), dw1 = cameraAt(tr, 1.5);
  ok('travel: a dwell holds the pose on s/x/y', approx(dw1.s, dw0.s, 1e-6) && approx(dw1.x, dw0.x, 1e-6)
    && approx(dw1.y, dw0.y, 1e-6));
  // The #197 shape: an axis a station does not mention must CHANGE nothing.
  const carry = travel({ stations: [{ tx: 0, ty: 0, s: 1.5 }, { tx: 1920, ty: 1080, dur: 1 }], start: 0 });
  ok('travel: a station without `s` carries the previous scale', approx(cameraAt(carry, 1).s, 1.5, 1e-6));
  ok('travel: a station without tx/ty carries the previous pan', (() => {
    const zoom = travel({ stations: [{ tx: 400, ty: 300, s: 1.2 }, { s: 2, dur: 1 }], start: 0 });
    const z = cameraAt(zoom, 1);
    return approx(z.x, 1920 / 2 - 400, 1e-6) && approx(z.y, 1080 / 2 - 300, 1e-6) && approx(z.s, 2, 1e-6);
  })());
  ok('travel: throws on missing/empty stations', ['skip', undefined, []].every((s) => {
    try { travel(s === 'skip' ? undefined : { stations: s }); return false; } catch { return true; }
  }));
  ok('travel: deterministic', JSON.stringify(travel({ stations: trStations }))
    === JSON.stringify(travel({ stations: trStations })));
  const tk = truck({ start: 1, dur: 2, dx: -800, s: 1.3 });
  ok('truck: 2 keyframes, x runs 0 → dx', tk.length === 2 && approx(cameraAt(tk, 1).x, 0)
    && approx(cameraAt(tk, 3).x, -800));
  ok('truck: s is constant across the move', [1, 1.5, 2, 2.5, 3].every((t) => approx(cameraAt(tk, t).s, 1.3, 1e-6)));
  ok('truck: lateral only, y never moves', approx(cameraAt(tk, 2).y, 0, 1e-6));
  // The canvas is now REQUIRED for any move that centres a point, because defaulting to landscape
  // mis-centred every target in a portrait scene by 420px per axis in silence. expand-blocks.mjs passes
  // sceneDims(data); here it is spelled out.
  ok('buildCameraMove resolves travel by name', JSON.stringify(buildCameraMove({ move: 'travel', stations: trStations }, [1920, 1080]))
    === JSON.stringify(travel({ stations: trStations })));
  ok('buildCameraMove injects the scene canvas into a targeting move',
    approx(cameraAt(buildCameraMove({ move: 'diveIn', tx: 540, ty: 960, dur: 1 }, [1080, 1920]), 1).x, 0)
    && approx(cameraAt(buildCameraMove({ move: 'diveIn', tx: 540, ty: 960, dur: 1 }, [1080, 1920]), 1).y, 0));
  ok('buildCameraMove REFUSES a targeting move with no canvas', (() => {
    try { buildCameraMove({ move: 'diveIn', tx: 540, ty: 960 }); return false; } catch { return true; }
  })());
  ok('buildCameraMove REFUSES a param the move does not read', (() => {
    try { buildCameraMove({ move: 'slowPush', too: 1.2 }); return false; } catch { return true; }
  })());
  ok('diveIn REFUSES a missing target coordinate instead of carrying NaN', (() => {
    try { diveIn({ tx: 960 }); return false; } catch { return true; }
  })());
  // A non-positive duration walks the keyframe clock BACKWARD, and cameraAt scans for its bracketing
  // pair assuming ascending t, so the camera teleports to the destination and the move vanishes. Zero is
  // the same class one step milder (a divide by zero, lerping NaN). Guarded for every generator, so
  // asserted for every generator.
  ok('every camera generator REFUSES a non-positive duration', [
    () => slowPush({ dur: -4 }), () => panFollow({ dur: 0 }), () => orbit({ dur: -6 }),
    () => multiPhase({ legs: [{ dur: -2 }] }), () => diveIn({ tx: 1, ty: 1, dur: -1 }),
    () => workspaceZoomOut({ dur: 0 }), () => truck({ dur: -2 }),
    () => travel({ stations: [{ tx: 0, ty: 0 }, { tx: 1, ty: 1, dur: -1 }] }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));
  ok('travel REFUSES a negative dwell but allows zero', (() => {
    try { travel({ stations: [{ tx: 0, ty: 0 }, { tx: 1, ty: 1, dwell: -10 }] }); return false; } catch {}
    return travel({ stations: [{ tx: 0, ty: 0 }, { tx: 500, ty: 500, dwell: 0 }] }).length === 2;
  })());
  ok('every emitted camera track is ascending in t', [
    slowPush({}), panFollow({}), orbit({}), multiPhase({ legs: [{ dur: 1 }, { dur: 2 }] }),
    diveIn({ tx: 100, ty: 100 }), workspaceZoomOut({}), truck({}),
    travel({ stations: [{ tx: 0, ty: 0 }, { tx: 500, ty: 500, dwell: 0.5 }, { tx: 900, ty: 100 }] }),
  ].every((kf) => kf.every((k, i) => i === 0 || k.t >= kf[i - 1].t)));
  ok('CAMERA_MOVE_NAMES picks up travel + truck',
    CAMERA_MOVE_NAMES.includes('travel') && CAMERA_MOVE_NAMES.includes('truck'));
  ok('buildCameraMove resolves by name', buildCameraMove({ move: 'slowPush', start: 0, dur: 2 }).length === 2);
  ok('buildCameraMove throws on unknown', (() => { try { buildCameraMove({ move: 'nope' }); return false; } catch { return true; } })());
  ok('CAMERA_MOVE_NAMES lists the generators', CAMERA_MOVE_NAMES.includes('diveIn') && CAMERA_MOVE_NAMES.includes('panFollow'));

  // ---- diveIn headroom: a target bigger than the frame is a REFUSAL, never a silent crop -----------
  // `to` used to be accepted at any value, so a dive could land with the thing it dove at cropped by the
  // canvas and say nothing. maxScale = min(0.88*W/targetW, 0.88*H/targetH).
  ok('diveIn: a `to` inside the headroom is allowed', diveIn({ tx: 960, ty: 540, to: 2,
    targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080 }).length === 2);
  ok('diveIn: REFUSES a `to` that pushes the target off-frame', (() => {
    try { diveIn({ tx: 960, ty: 540, to: 5, targetW: 400, targetH: 300, canvasW: 1920, canvasH: 1080 }); return false; }
    catch (e) { return /headroom|past the frame/i.test(e.message); }
  })());
  ok('diveIn: the limit is the tighter axis (0.88 * H / targetH here)', (() => {
    const max = Math.min(0.88 * 1920 / 400, 0.88 * 1080 / 900);   // 4.224 vs 1.056 → 1.056
    const inside = diveIn({ tx: 0, ty: 0, to: max - 1e-6, targetW: 400, targetH: 900, canvasW: 1920, canvasH: 1080 });
    try { diveIn({ tx: 0, ty: 0, to: max + 1e-3, targetW: 400, targetH: 900, canvasW: 1920, canvasH: 1080 }); return false; }
    catch { return inside.length === 2; }
  })());
  ok('diveIn: one axis alone still guards', (() => {
    try { diveIn({ tx: 0, ty: 0, to: 3, targetW: 1200, canvasW: 1920, canvasH: 1080 }); return false; } catch { return true; }
  })());
  ok('diveIn: no target size given = nothing to check, unchanged behaviour',
    diveIn({ tx: 0, ty: 0, to: 9 }).length === 2);
  ok('diveIn: REFUSES a non-positive target size', (() => {
    try { diveIn({ tx: 0, ty: 0, targetW: 0 }); return false; } catch { return true; }
  })());

  // ---- cameraShake: the randomness is SAMPLED at author time, so the render only lerps -------------
  const sh = cameraShake({ start: 2, dur: 0.42, fps: 30, seed: 5 });
  ok('cameraShake: opens at rest and returns to exactly zero', sh[0].x === 0 && sh[0].y === 0
    && sh[sh.length - 1].x === 0 && sh[sh.length - 1].y === 0);
  ok('cameraShake: one key per frame plus the rest key and the recovery', sh.length === 1 + 12 + 1);
  ok('cameraShake: t is strictly ascending', sh.every((k, i) => i === 0 || k.t > sh[i - 1].t));
  ok('cameraShake: ends at start + dur + recover', approx(sh[sh.length - 1].t, 2 + 0.42 + 0.1, 1e-9));
  ok('cameraShake: never touches scale (it is a translate, not a zoom)', sh.every((k) => k.s === 1));
  ok('cameraShake: y is 0.7 of the y channel, as measured off the reference', (() => {
    const raw = shake(1 / 30, { amp: 28, freq: 16, decay: 6.3, seed: 5 });
    return approx(sh[1].y, raw.y * 0.7, 1e-12) && approx(sh[1].x, raw.x, 1e-12);
  })());
  ok('cameraShake: the same seed gives byte-identical keyframes',
    JSON.stringify(cameraShake({ seed: 5 })) === JSON.stringify(cameraShake({ seed: 5 })));
  ok('cameraShake: a different seed gives a different shake',
    JSON.stringify(cameraShake({ seed: 5 })) !== JSON.stringify(cameraShake({ seed: 9 })));
  // Monotonic decay: an impact gets quieter, it does not swell. Compared as envelopes, not per sample.
  ok('cameraShake: decays. The late half is quieter than the early half', (() => {
    const body = sh.slice(1, -1), half = Math.floor(body.length / 2);
    const peak = (a) => Math.max(...a.map((k) => Math.abs(k.x)));
    return peak(body.slice(half)) < peak(body.slice(0, half));
  })());
  ok('cameraShake: REFUSES a non-positive dur, fps or a negative recover', [
    () => cameraShake({ dur: 0 }), () => cameraShake({ fps: 0 }), () => cameraShake({ recover: -1 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // ---- punchIn: the crash zoom, and the ONE move whose first leg is an ease-IN ---------------------
  const pi = punchIn({ start: 0, dur: 0.32, from: 0.72, to: 1, squash: 0.96, squashDur: 0.08, settleDur: 0.5 });
  ok('punchIn: 4 keyframes, from → to → squash → to', pi.length === 4
    && pi[0].s === 0.72 && pi[1].s === 1 && pi[2].s === 0.96 && pi[3].s === 1);
  ok('punchIn: t is strictly ascending', pi.every((k, i) => i === 0 || k.t > pi[i - 1].t));
  ok('punchIn: accelerates INTO frame (easeInExpo), then rings out (easeOutElastic)',
    pi[1].ease === 'easeInExpo' && pi[3].ease === 'easeOutElastic');
  ok('punchIn: both easings are real names in EASINGS', ['easeInExpo', 'easeOutElastic', 'easeOutQuad']
    .every((e) => Object.prototype.hasOwnProperty.call(EASINGS, e)));
  ok('punchIn: cameraAt reads the endpoints', approx(cameraAt(pi, 0).s, 0.72)
    && approx(cameraAt(pi, 0.32 + 0.08 + 0.5).s, 1));
  ok('punchIn: the squash really dips below the resting scale', cameraAt(pi, 0.4).s < 1);
  ok('punchIn: never pans. It is a scale move', pi.every((k) => k.x === 0 && k.y === 0));
  ok('punchIn: deterministic', JSON.stringify(punchIn({})) === JSON.stringify(punchIn({})));
  ok('punchIn: REFUSES a non-positive leg or magnification', [
    () => punchIn({ dur: 0 }), () => punchIn({ squashDur: -1 }), () => punchIn({ settleDur: 0 }),
    () => punchIn({ from: 0 }), () => punchIn({ squash: -0.5 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // ---- driftHold: a held frame that is never dead --------------------------------------------------
  const dh = driftHold({ start: 0, dur: 4, ax: 6, ay: 3, cycles: 1.5, ratio: 1.3 });
  ok('driftHold: spans exactly the window', approx(dh[0].t, 0) && approx(dh[dh.length - 1].t, 4, 1e-9));
  ok('driftHold: t is strictly ascending', dh.every((k, i) => i === 0 || k.t > dh[i - 1].t));
  ok('driftHold: opens at the origin and never leaves the declared amplitude',
    approx(dh[0].x, 0, 1e-12) && approx(dh[0].y, 0, 1e-12)
    && dh.every((k) => Math.abs(k.x) <= 6 + 1e-9 && Math.abs(k.y) <= 3 + 1e-9));
  ok('driftHold: it MOVES. The frame is not dead', Math.max(...dh.map((k) => Math.abs(k.x))) > 3);
  // The whole craft point: x and y at the same frequency walk a straight diagonal. At 1.3 they do not.
  ok('driftHold: x and y run at different frequencies (a Lissajous, not a diagonal)', (() => {
    const straight = driftHold({ ratio: 1 }), organic = driftHold({ ratio: 1.3 });
    const diag = (kf) => kf.every((k) => approx(k.x * (3 / 6), k.y, 1e-9));
    return diag(straight) && !diag(organic);
  })());
  ok('driftHold: holds scale (it is a drift, not a push)', dh.every((k) => k.s === 1));
  ok('driftHold: deterministic', JSON.stringify(driftHold({})) === JSON.stringify(driftHold({})));
  ok('driftHold: REFUSES an amplitude big enough to read as a shake', [
    () => driftHold({ ax: 40 }), () => driftHold({ ay: 30 }), () => driftHold({ cycles: 0 }),
    () => driftHold({ dur: -1 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  // The three new tracks obey the same ascending-t contract as the eight that came before.
  ok('the new camera generators are ascending in t too', [
    cameraShake({}), punchIn({}), driftHold({}),
  ].every((kf) => kf.every((k, i) => i === 0 || k.t > kf[i - 1].t)));
  ok('CAMERA_MOVE_NAMES picks up cameraShake + punchIn + driftHold',
    ['cameraShake', 'punchIn', 'driftHold'].every((n) => CAMERA_MOVE_NAMES.includes(n)));
  ok('buildCameraMove resolves the new moves, including through a shot word',
    JSON.stringify(buildCameraMove({ move: 'punch in', dur: 0.3 })) === JSON.stringify(punchIn({ dur: 0.3 }))
    && JSON.stringify(buildCameraMove({ move: 'shake', seed: 3 })) === JSON.stringify(cameraShake({ seed: 3 }))
    && JSON.stringify(buildCameraMove({ move: 'drift hold' })) === JSON.stringify(driftHold({})));
  // The schema's move list is FREE TEXT and has drifted before, it omitted travel and truck for months.
  // The code is the source of truth; this is the assertion that says so out loud.
  ok('the schema cameraMove label names every move the code exports', (() => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const label = JSON.parse(fs.readFileSync(path.join(root, 'formats/scene/schema.json'), 'utf8'))
      .fields.cameraMove.label;
    return CAMERA_MOVE_NAMES.every((n) => label.includes(n));
  })());
}


// ---- patch-motion: the editor writes back into HAND-FORMATTED files -------------------------------
// The invariant that makes an editor safe to point at a tracked repo: saving without changing anything
// must be a zero-byte diff, in every formatting style the library actually uses. Everything else about
// the editor can be redone; silently reformatting 104 scenes cannot be undone from a diff.
{
  for (const name of ['higgsfield-recreation', 'showcase', 'ledgerline-neon', 'demo-interactions']) {
    const f = path.join(repoRoot, 'formats/scene', `${name}.json`);
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    const d = JSON.parse(src);
    const withTrack = d.layers.map((l, i) => [l, i]).filter(([l]) => Array.isArray(l.motion) && l.motion.length);
    ok(`patch-motion no-op is byte-identical (${name})`,
      withTrack.every(([l, i]) => patchMotion(src, i, l.motion) === src));
    if (withTrack.length) {
      const [layer, idx] = withTrack.find(([l]) => l.motion.length > 2) || withTrack[0];
      const keys = JSON.parse(JSON.stringify(layer.motion));
      keys[1].x = (keys[1].x ?? 0) + 7;
      const out = patchMotion(src, idx, keys);
      ok(`patch-motion edit still parses (${name})`, JSON.parse(out).layers[idx].motion[1].x === keys[1].x);
      // Measured as a MULTISET difference, not by line index. Comparing index-by-index counts every
      // line that merely SHIFTED, and adding one property to a key legitimately adds a line, so an
      // otherwise perfect patch scored 431. What matters is how many lines are genuinely new or gone.
      const bag = (t) => t.split('\n').reduce((mm, l) => mm.set(l, (mm.get(l) || 0) + 1), new Map());
      const A = bag(src), B = bag(out);
      let churn = 0;
      for (const [l, n] of B) churn += Math.max(0, n - (A.get(l) || 0));
      for (const [l, n] of A) churn += Math.max(0, n - (B.get(l) || 0));
      // one moved keyframe must not rewrite the file: collapsing a property-per-line key onto one line
      // churned hundreds of lines before the key layout was preserved
      ok(`patch-motion one key = a small diff (${name}, ${churn} lines)`, churn <= 8);
    }
  }
  const hf = path.join(repoRoot, 'formats/scene/higgsfield-recreation.json');
  if (fs.existsSync(hf)) {
    const src = fs.readFileSync(hf, 'utf8'), d = JSON.parse(src);
    const btn = d.layers.findIndex((l) => l.id === 'btn');
    const sp = layerSpan(src, btn);
    ok('patch-motion scanner survives CSS braces in a string', JSON.parse(src.slice(sp.start, sp.end)).id === 'btn');
    const hook = d.layers.findIndex((l) => l.id === 'hook');
    const ins = JSON.parse(patchMotion(src, hook, [{ t: 0, x: 0 }, { t: 0.5, x: 40 }]));
    ok('patch-motion inserts into a layer with no track', ins.layers[hook].motion.length === 2);
    ok('patch-motion insert leaves every other layer identical',
      JSON.stringify(ins.layers.filter((_, i) => i !== hook)) === JSON.stringify(d.layers.filter((_, i) => i !== hook)));
    ok('patch-motion removes a track', JSON.parse(patchMotion(src, btn, [])).layers[btn].motion === undefined);
  }
  ok('matchBracket ignores brackets inside strings', matchBracket('{"a":"}]"}', 0) === 9);
  const up = upsertKey([{ t: 0, x: 0 }, { t: 1, x: 10 }], { t: 0.5, x: 5 });
  ok('upsertKey inserts sorted', up.length === 3 && up[1].t === 0.5);
  const re = upsertKey(up, { t: 0.5, x: 99 });
  ok('upsertKey updates rather than stacking', re.length === 3 && re[1].x === 99);
  ok('upsertKey merges onto the existing key', upsertKey([{ t: 0, x: 1, ease: 'linear' }], { t: 0, x: 2 })[0].ease === 'linear');

  // applyOps: the same no-reformatting promise, for the chooser's RFC 6902 patches. Accepting a
  // candidate in studio must move ONE preset name, so what is asserted is the size of the diff as much
  // as the result: a parse/stringify round trip would give the right JSON and the wrong file.
  {
    const src = '{\n "bg": [\n  { "preset": "paper", "opts": { "scale": 2 } },\n  { "preset": "dark" }\n ]\n}';
    const swapped = applyOps(src, [{ op: 'replace', path: '/bg/1/preset', value: 'liquid' }]);
    ok('applyOps replaces the preset of the window it names', JSON.parse(swapped).bg[1].preset === 'liquid');
    ok('applyOps touches one line and no other byte',
      swapped.split('\n').filter((l, i) => l !== src.split('\n')[i]).length === 1);
    const dropped = applyOps(src, [{ op: 'replace', path: '/bg/0/preset', value: 'paperDots' },
      { op: 'remove', path: '/bg/0/opts' }]);
    const d0 = JSON.parse(dropped).bg[0];
    ok('applyOps removes the `opts` the new preset has no knob for', d0.preset === 'paperDots' && d0.opts === undefined);
    ok('applyOps leaves the other window untouched', JSON.parse(dropped).bg[1].preset === 'dark');
    ok('applyOps refuses a path outside the shape it understands',
      (() => { try { applyOps(src, [{ op: 'replace', path: '/layers/0/text', value: 'x' }]); return false; }
        catch (e) { return /bg\/<i>/.test(e.message); } })());
    ok('applyOps refuses a scene with no such window',
      (() => { try { applyOps(src, [{ op: 'replace', path: '/bg/9/preset', value: 'x' }]); return false; }
        catch (e) { return /bg\[9\]/.test(e.message); } })());
  }
}


// ---- becomes: the handover must be EXACT, or a match cut silently stops reading ---------------------
{
  const src = fs.readFileSync(path.join(repoRoot, 'formats/scene/scene.js'), 'utf8');
  const body = src.slice(src.indexOf('function resolveBecomes'), src.indexOf('// resolveAnchors'));
  const num = (v, d2) => (typeof v === 'number' && Number.isFinite(v) ? v : d2);
  // eslint-disable-next-line no-new-func
  const resolveBecomes = new Function('num', `${body}; return resolveBecomes;`)(num);
  // The engine hands it the box measured at build. These layers state w/h, so nothing is measured.
  const unmeasured = () => null;
  const centre = (L, k) => [L.x + num(k.x, 0) + L.w / 2, L.y + num(k.y, 0) + L.h / 2];

  const A = { id: 'card', type: 'rect', x: 300, y: 200, w: 640, h: 380, start: 1, duration: 2, becomes: 'dot',
    motion: [{ t: 0 }, { t: 1.4, x: 120, y: -40, scale: 0.5, rot: 6 }] };
  const B = { id: 'dot', type: 'rect', x: 1500, y: 800, w: 80, h: 80, start: 3, duration: 2 };
  resolveBecomes({ layers: [A, B] }, unmeasured);
  const [acx, acy] = centre(A, A.motion[A.motion.length - 1]);
  const [bcx, bcy] = centre(B, B.motion[0]);
  // CSS scales about the element's own centre, so scaling must NOT move the centre. Using the scaled
  // half-width put this 160px out and it looked almost right, the worst kind of wrong for a match cut.
  ok('becomes hands over on the exact centre', acx === bcx && acy === bcy);
  ok('becomes covers the outgoing form', B.w * B.motion[0].scale >= A.w * 0.5);
  ok('becomes carries rotation and then releases it', B.motion[0].rot === 6 && B.motion[1].rot === 0);
  ok('becomes settles into the layer own pose', B.motion[1].x === 0 && B.motion[1].y === 0 && B.motion[1].scale === 1);

  // an incoming layer's own keys resume after the handover; keys inside it are dropped
  const C = { id: 'c', type: 'rect', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 1, becomes: 'd' };
  const D = { id: 'd', type: 'rect', x: 500, y: 500, w: 100, h: 100, start: 1, duration: 2,
    motion: [{ t: 0.1, x: 999 }, { t: 1.2, x: 40 }] };
  resolveBecomes({ layers: [C, D] }, unmeasured);
  ok('becomes drops incoming keys inside the handover', !D.motion.some((k) => k.x === 999));
  ok('becomes keeps incoming keys after the handover', D.motion.some((k) => k.t === 1.2 && k.x === 40));

  let threw = '';
  try { resolveBecomes({ layers: [{ id: 'x', becomes: 'nope' }] }, unmeasured); } catch (e) { threw = e.message; }
  ok('becomes throws on a dangling reference', /no layer with id/.test(threw));
  threw = '';
  try { resolveBecomes({ layers: [{ id: 'x', becomes: 'x' }] }, unmeasured); } catch (e) { threw = e.message; }
  ok('becomes throws on a self reference', /becomes itself/.test(threw));

  // THE CASE THAT WAS SILENT. A text layer states no w/h, so the old pass scored it 0x0: the scale
  // collapsed to 1 and the centre landed on the layer's top-left corner. The film rendered, every gate
  // passed, and the handover was merely wrong. The box now comes from the build measurement.
  {
    const word = { id: 'word', type: 'text', text: 'LATENCY', x: 300, y: 420, start: 0, duration: 3, becomes: 'card' };
    const card = { id: 'card', type: 'rect', x: 660, y: 340, w: 600, h: 400, start: 3, duration: 3 };
    const glyphs = { w: 780, h: 187 };
    resolveBecomes({ layers: [word, card] }, (L) => (L === word ? glyphs : null));
    const k = card.motion[0];
    ok('becomes centres an unsized outgoing layer on its MEASURED box',
      k.x === +(300 + glyphs.w / 2 - (660 + 300)).toFixed(3) && k.y === +(420 + glyphs.h / 2 - (340 + 200)).toFixed(3));
    ok('becomes scales an unsized outgoing layer by its MEASURED box',
      k.scale === +Math.max(glyphs.w / 600, glyphs.h / 400).toFixed(3) && k.scale > 1);
  }

  // A declared w/h still wins over the measurement, exactly as resolveBoxes reads `L.w ?? base.w`.
  {
    const a = { id: 'a', type: 'rect', x: 0, y: 0, w: 400, h: 400, start: 0, duration: 1, becomes: 'b' };
    const b = { id: 'b', type: 'rect', x: 0, y: 0, w: 200, h: 200, start: 1, duration: 1 };
    resolveBecomes({ layers: [a, b] }, () => ({ w: 999, h: 999 }));
    ok('becomes prefers the declared box to the measured one', b.motion[0].scale === 2);
  }

  // Unknowable rather than merely undeclared: nothing measured either. Refuse, never substitute.
  threw = '';
  try {
    resolveBecomes({ layers: [
      { id: 'ghost', type: 'text', x: 0, y: 0, start: 0, duration: 1, becomes: 'box' },
      { id: 'box', type: 'rect', x: 0, y: 0, w: 100, h: 100, start: 1, duration: 1 },
    ] }, () => null);
  } catch (e) { threw = e.message; }
  ok('becomes refuses a form with no box rather than guessing one', /no box to match against/.test(threw) && /ghost/.test(threw));

  // matches:[{at,from,to}] is the authoring front door and it hands the geometry to resolveBecomes, so
  // the same measurement has to reach through it. It never touches w/h itself.
  {
    const from = { id: 'word', type: 'text', x: 300, y: 420, start: 0, duration: 5 };
    const to = { id: 'card', type: 'rect', x: 660, y: 340, w: 600, h: 400, start: 4, duration: 4 };
    const scene = { duration: 8, sceneUnits: false, cuts: [{ t: 3, style: 'none' }], layers: [from, to],
      matches: [{ at: 'cut@0', from: 'word', to: 'card' }] };
    bindMatchesToJunctions(scene, junctionTable(marksOf(scene)));
    ok('matches hands the pair to becomes', from.becomes === 'card' && to.start === 3);
    resolveBecomes(scene, (L) => (L === from ? { w: 780, h: 187 } : null));
    ok('a matched handover is measured too', to.motion[0].scale === +Math.max(780 / 600, 187 / 400).toFixed(3));
  }
}

// ---- sound bridges (J/L-cuts) ------------------------------------------------------------------
// The resolver turns a NAMED junction into a span of seconds. Every wrong span sounds only slightly
// off, so the tests here are mostly about what it refuses.
{
  const MARKS = [{ t: 2, kind: 'cut' }, { t: 5, kind: 'cut' }, { t: 7, kind: 'seam' }];
  const one = (b) => resolveBridges({ bridges: [b] }, MARKS, 10)[0];

  const j = one({ bridge: 'j', at: 'cut@1', lead: 0.8, sound: 'tense' });
  ok('a J-cut starts before its junction', Math.abs(j.start - 4.2) < 1e-6 && j.at === 5);
  ok('a J-cut runs to the next junction by default', Math.abs(j.end - 7) < 1e-6);

  const l = one({ bridge: 'l', at: 'cut@1', lag: 1.2, sound: 'tense' });
  ok('an L-cut ends after its junction', Math.abs(l.end - 6.2) < 1e-6);
  ok('an L-cut starts at the previous junction by default', Math.abs(l.start - 2) < 1e-6);

  ok('a span overrides the default side', Math.abs(one({ bridge: 'j', at: 'cut@0', lead: 0.5, span: 1, sound: 'x' }).end - 3) < 1e-6);
  ok('a bridge fades by default', one({ bridge: 'j', at: 'cut@0', lead: 0.5, sound: 'x' }).fade > 0);
  ok('junction@ addresses every kind at once', one({ bridge: 'l', at: 'junction@2', lag: 0.5, sound: 'x' }).at === 7);
  ok('no bridges resolve to nothing', resolveBridges({}, MARKS, 10).length === 0);

  const throws = (b, re, label) => {
    let m = '';
    try { one(b); } catch (e) { m = e.message; }
    ok(label, re.test(m));
  };
  throws({ bridge: 'x', at: 'cut@0', lead: 1, sound: 'a' }, /must be "j"/, 'a bridge must be j or l');
  throws({ bridge: 'j', at: 'cut@9', lead: 1, sound: 'a' }, /does not exist/, 'an out-of-range junction names what exists');
  throws({ bridge: 'j', at: 'beat@0', lead: 1, sound: 'a' }, /unknown junction kind/, 'an unknown junction kind is refused');
  throws({ bridge: 'j', at: '4.37', lead: 1, sound: 'a' }, /must be "<kind>@<index>"/, 'a raw timestamp is not a junction');
  throws({ bridge: 'j', at: 'cut@1', lead: 4, sound: 'a' }, /reaches back past the previous junction/, 'a lead longer than the preceding beat is refused');
  throws({ bridge: 'l', at: 'cut@0', lag: 4, sound: 'a' }, /runs past the next junction/, 'a lag longer than the following beat is refused');
  throws({ bridge: 'j', at: 'cut@0', lead: 1 }, /"sound" must name/, 'a bridge without a sound is refused');
  throws({ bridge: 'j', at: 'cut@0', sound: 'a' }, /defined by its lead/, 'a J-cut without a lead is refused');
  throws({ bridge: 'l', at: 'cut@0', sound: 'a' }, /defined by its lag/, 'an L-cut without a lag is refused');
  throws({ bridge: 'j', at: 'cut@0', lead: 0.5, span: 0.2, fade: 1, sound: 'a' }, /does not fit/, 'a fade that does not fit the span is refused');
}

// ---- idle (core/idle.js) --------------------------------------------------------------------------
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
  // would be a pulse animation, and one that reached 0.2% would be the sub-pixel shimmer core/motion.js
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

// ---- the spectacle dial (core/knobs.js arithmetic + core/spectacle.js walk) -----------------------
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

// ---- produce: cameraMove sugar must BECOME camera keys, on the one path every render takes ---------
// The produced push was written at boot and read by nobody (only the author-time expander converted it),
// so a static scene was byte-identical at frame 2 and frame 170. These say the funnel is closed.
{
  const base = () => ({ module: 'scene', duration: 6, bg: { preset: 'plain' }, layers: [{ type: 'text', text: 'x' }] });
  const produced = produceBaseline(base(), {});
  ok('produce: an un-choreographed scene ends with real camera keys, not cameraMove sugar',
    produced.cameraMove === undefined && Array.isArray(produced.camera) && produced.camera.length > 1);
  ok('produce: the injected push is inside the visible band (>5%), and stays modest',
    (() => { const s = produced.camera.map((k) => k.s); const top = Math.max(...s);
      return Math.min(...s) === 1 && top >= 1.05 && top <= 1.08; })());

  const authored = produceBaseline({ ...base(), camera: [{ t: 0, s: 1 }, { t: 3, s: 1.4 }] }, {});
  ok('produce: a scene with its own camera is untouched',
    authored.camera.length === 2 && authored.camera[1].s === 1.4 && authored.cameraMove === undefined);

  const choreo = produceBaseline({ ...base(), layers: [{ type: 'text', text: 'x', motion: [{ t: 0, x: 0 }, { t: 2, x: 50 }] }] }, {});
  ok('produce: a choreographed scene gets no camera', choreo.camera === undefined && choreo.cameraMove === undefined);

  const off = produceBaseline({ ...base(), produced: false }, {});
  ok('produce: "produced": false opts out of the injected push', off.camera === undefined);
  const offSugar = produceBaseline({ ...base(), produced: false, cameraMove: { move: 'slowPush', dur: 4 } }, {});
  ok('produce: "produced": false still BAKES the author\'s own sugar (never ignores a written field)',
    offSugar.cameraMove === undefined && Array.isArray(offSugar.camera) && offSugar.camera.length > 1);

  let msg = '';
  try { produceBaseline({ ...base(), camera: [{ t: 0, s: 1 }], cameraMove: { move: 'slowPush' } }, {}); } catch (e) { msg = e.message; }
  ok('produce: camera + cameraMove together is refused, never silently clobbered', /BOTH/.test(msg));

  // THE PUSH AND THE MARGIN (docs/MISTAKES.md #478). core/safe.js owns how much zoom the margin
  // absorbs; produce.js owns the perception-driven 1.06 and reads that limit rather than re-deriving
  // it. If either number is edited alone, one of these two fails before a film is ever rendered.
  ok('safe: MAX_ZOOM is where a safe-edge layer reaches the frame edge',
    Math.abs(MAX_ZOOM - 0.5 / (0.5 - MARGIN)) < 1e-12);
  ok('produce: the injected push stays inside the zoom the margin absorbs',
    Math.max(...produced.camera.map((k) => k.s)) <= MAX_ZOOM);
  ok('safe: an edge-pinned layer under the injected push is NOT cropped by the frame',
    (() => { const H = 1080, top = Math.max(...produced.camera.map((k) => k.s));
      return (H * (0.5 - MARGIN)) * top < H * 0.5; })());
}

// ---- shader sting ids: the branch number is written down, not inferred from array order ----
{
  const { SHADER_ID: ID, SHADER_FX: FX } = await import('../../core/stings.js');
  // The shipped order, transcribed by hand. If a future edit renumbers an effect, every scene using
  // shader stings renders a DIFFERENT shader with no crash and no visual error, this catches that.
  const SHIPPED = ['flash', 'burn', 'leak', 'grain', 'dissolve', 'ink', 'glitch', 'streak', 'pixel', 'confetti',
    'ripple', 'scan', 'warp', 'bokeh', 'wipe', 'circle', 'blinds', 'squares', 'pinwheel', 'doors',
    'polka', 'swirl', 'crossWarp', 'domainWarp', 'sdfIris', 'vortex', 'ridgedBurn', 'lens', 'thermal', 'whipPan',
    'chromaticSplit', 'dispersion', 'gridPixelateWipe', 'iridescence', 'cinematicZoom'];
  const moved = SHIPPED.filter((n, i) => ID[n] !== i);
  ok(`sting ids: every effect keeps its shipped branch number${moved.length ? ', moved: ' + moved.map((n) => `${n} ${SHIPPED.indexOf(n)}->${ID[n]}`).join(', ') : ''}`,
    moved.length === 0);
  ok('sting ids: no shipped effect was dropped', SHIPPED.every((n) => n in ID));
  ok('sting ids: SHADER_FX is exactly the keys of SHADER_ID', JSON.stringify(FX) === JSON.stringify(Object.keys(ID)));
  const ids = Object.values(ID);
  ok('sting ids: 0..n-1, no gaps, no duplicates',
    new Set(ids).size === ids.length && Math.min(...ids) === 0 && Math.max(...ids) === ids.length - 1);

  const fragSrc = fs.readFileSync(path.join(repoRoot, 'core', 'stings.js'), 'utf8');
  const missing = ids.filter((i) => !fragSrc.includes(`u_fx == ${i}`));
  ok(`sting ids: FRAG branches every id${missing.length ? ', missing ' + missing.join(', ') : ''}`, missing.length === 0);
  ok('sting ids: no FRAG branch past the last id', !fragSrc.includes(`u_fx == ${ids.length}`));

  // An unknown name used to be a silent no-op (draw() returned clear()). A real draw() needs WebGL,
  // so assert on the source: the lookup must throw and name the known effects, never fall back.
  const drawSrc = fragSrc.slice(fragSrc.indexOf('draw(effect,'), fragSrc.indexOf('clear() {'));
  ok('sting ids: draw() throws on an unknown effect instead of silently clearing',
    /throw new Error\(`unknown sting fx/.test(drawSrc) && !/idx < 0/.test(drawSrc));
  ok('sting ids: the throw lists the known effects', /SHADER_FX\.join/.test(drawSrc));
  ok('sting ids: an unknown name has no id at all', ID['nope'] === undefined);
}

// ---- knobErrors: a dial on a preset that does not read it is a REFUSAL, not a warning --------------
// It was a warning printed by `scripts/gates/knobs-audit.mjs` if you remembered to run it, while an
// unknown layer PROP of the same shape has thrown at boot for a long time. These say the two agree now.
{
  const { knobErrors } = await import('../../core/validate.mjs');
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
  // `bindDials` (core/knobs.js) made an unlisted kinetic dial impossible; the `globe` three scene is
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
    const dir = path.join(repoRoot, 'formats', 'scene');
    const guilty = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json').filter((f) => {
      let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return false; }
      return d.module === 'scene' && knobErrors(d).length > 0;
    });
    ok(`knobs: no shipped scene is refused by the new rule${guilty.length ? ': ' + guilty.join(', ') : ''}`, guilty.length === 0);
  }
}

// ---- preloadImages: a repo-local image that 404s THROWS, a remote one does not ---------------------
// `core/layers/html.js` has always thrown when a fragment `src` never loaded; a missing PICTURE
// degraded quietly and the author found out from a preflight or from the frame. These are the same
// class of input and they are graded the same way now. The loader is faked, so no network is touched.
{
  const priorWindow = globalThis.window, priorImage = globalThis.Image, priorDoc = globalThis.document;
  globalThis.window = globalThis;
  globalThis.document = globalThis.document || { createElement: () => ({ style: {} }), querySelector: () => null };
  // Every src fails, which is the interesting direction: what matters is WHICH failures are refused.
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onerror && this.onerror()); } };
  const { preloadImages } = await import('../../core/boot.js');
  const threw = async (scene) => { try { await preloadImages(scene); return ''; } catch (e) { return e.message; } };

  const local = await threw({ layers: [{ type: 'image', src: '/assets/brands/nope/logo.svg' }] });
  ok('images: a repo-local image that never loaded is refused, naming the path', /assets\/brands\/nope\/logo\.svg/.test(local));
  ok('images: the refusal names where it was written', /layers\[0\]\.src/.test(local));

  ok('images: a remote URL stays soft. A dead CDN is not the author\'s mistake',
    (await threw({ layers: [{ type: 'image', src: 'https://cdn.example.com/logo.svg' }] })) === '');
  // One shipped film sets a text layer to the literal string "hero.png"; the walk reads every string in
  // the scene, so a bare filename must never be grounds to refuse a film.
  ok('images: a bare filename in a text layer is not a repo path and is not refused',
    (await threw({ layers: [{ type: 'text', text: 'hero.png' }] })) === '');
  ok('images: every missing repo path is reported in one message, not just the first',
    /a\.png[\s\S]*b\.png/.test(await threw({ layers: [{ src: '/assets/a.png' }, { src: 'assets/b.png' }] })));

  globalThis.window = priorWindow; globalThis.Image = priorImage; globalThis.document = priorDoc;
}

// ---- dollyZoom: the subject holds because `s` does, and the LENS is the whole move ----------------
// The identity being asserted is m(z) = s*L/(L - s*z): at z = 0 that is s with no L in it, so a keyframe
// pair that holds s and ramps p cannot change the subject's size and must change everything at a depth.
{
  const kf = dollyZoom({ dur: 2, from: 2400, to: 800 });
  ok('dollyZoom emits two ascending keys', kf.length === 2 && kf[1].t > kf[0].t);
  ok('dollyZoom holds `s` across both keys: the subject cannot change size',
    kf[0].s === kf[1].s && kf[0].s === 1);
  ok('dollyZoom ramps the lens, which is the only thing it moves',
    kf[0].p === 2400 && kf[1].p === 800);
  ok('dollyZoom leaves x/y at the origin: it reframes nothing',
    kf.every((k) => k.x === 0 && k.y === 0));
  // m(z) at the two ends of the default move, for a layer standing 800px back. The subject's own
  // magnification is s at both; the background's is not, and that difference IS the shot.
  const m = (s, L, z) => s * L / (L - s * z);
  ok('dollyZoom: the picture plane is magnified by s at BOTH ends, whatever the lens says',
    m(1, 2400, 0) === 1 && m(1, 800, 0) === 1);
  ok('dollyZoom: a layer 800px back SHRINKS as the lens opens, the ground gives way',
    m(1, 800, -800) < m(1, 2400, -800));
  ok('dollyZoom refuses a lens ramp that never ramps, a dur that rewinds, and a camera at nowhere', [
    () => dollyZoom({ from: 900, to: 900 }),
    () => dollyZoom({ dur: 0 }),
    () => dollyZoom({ s: 0 }),
    () => dollyZoom({ to: -400 }),
  ].every((f) => { try { f(); return false; } catch { return true; } }));
  ok('CAMERA_MOVE_NAMES picks up dollyZoom', CAMERA_MOVE_NAMES.includes('dollyZoom'));
  ok('buildCameraMove resolves dollyZoom and refuses a param it does not read',
    JSON.stringify(buildCameraMove({ move: 'dollyZoom', dur: 1 })) === JSON.stringify(dollyZoom({ dur: 1 }))
    && (() => { try { buildCameraMove({ move: 'dollyZoom', lens: 900 }); return false; } catch { return true; } })());
}

// ---- followCursor: the camera DERIVED from the pointer -------------------------------------------
// The whole value of this move is that the cursor's `path` stays the only place the target is written.
// So the assertions are about the RELATIONSHIP: where the camera lands against where the pointer is,
// that it is there BEFORE the press and still there ON it, and that many presses are not many zooms.
{
  const path = [{ t: 0, x: 0, y: 0 }, { t: 1, x: 400, y: 200 }, { t: 6, x: 400, y: 200 }];
  const one = followCursor({ path, clicks: [2], base: [100, 100], start: 0 });

  ok('followCursor centres the pointer, read off the cursor\'s own path', (() => {
    const at = one.find((k) => k.s > 1);          // the arrival
    // the pointer is at base + path = (500, 300) by t=1 and holds; centring it is 960-500, 540-300
    return at && Math.abs(at.x - 460) < 1e-6 && Math.abs(at.y - 240) < 1e-6;
  })());
  ok('followCursor ARRIVES BEFORE THE PRESS and is still there on it', (() => {
    const arrive = one.find((k) => k.s > 1), holdEnd = one.filter((k) => k.s > 1).pop();
    return arrive.t < 2 && arrive.t === 2 - 0.18 && holdEnd.t >= 2;
  })());
  ok('followCursor opens wide and returns wide', one[0].s === 1 && one[one.length - 1].s === 1);
  ok('followCursor keyframes ascend in t (a jumbled array deletes the whole move)',
    one.every((k, i) => i === 0 || k.t > one[i - 1].t));
  ok('followCursor is PURE: the same path and clicks give byte-identical keys',
    JSON.stringify(followCursor({ path, clicks: [2], base: [100, 100] }))
    === JSON.stringify(followCursor({ path, clicks: [2], base: [100, 100] })));

  // RESTRAINT. Six presses inside one gesture are ONE push and ONE release, never six crash zooms.
  const six = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 8, x: 1200, y: 0 }], base: [300, 540],
    clicks: [2, 2.4, 2.8, 3.2, 3.6, 4] });
  const pushes = six.filter((k, i) => k.s > 1 && (i === 0 || six[i - 1].s === 1)).length;
  ok('followCursor: six clicks in one run are ONE push, not six', pushes === 1);
  ok('followCursor: that run releases exactly once, at the end',
    six.filter((k, i) => i > 0 && k.s === 1 && six[i - 1].s > 1).length === 1);
  // ...and presses far enough apart in TIME do get their own shot.
  const apart = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 20, x: 1200, y: 0 }], base: [300, 540],
    clicks: [2, 9] });
  ok('followCursor: presses further apart than the settle window get their own push',
    apart.filter((k, i) => k.s > 1 && (i === 0 || apart[i - 1].s === 1)).length === 2);
  // ...and two presses in the same PLACE never reframe, however far apart the camera could travel.
  const same = followCursor({ path: [{ t: 0, x: 0, y: 0 }, { t: 8, x: 0, y: 0 }], base: [700, 400],
    clicks: [2, 3] });
  ok('followCursor: two presses inside `regroup` px share one framing',
    new Set(same.filter((k) => k.s > 1).map((k) => `${k.x},${k.y}`)).size === 1);
  // EVERY track, not just the simple one. The first cut of the writer silently emitted a DESCENDING
  // array when the shot spacing was broken, and this assertion only looked at the one-click case, so
  // it passed. cameraAt reads a jumbled array as "already at the end" and deletes the whole move.
  ok('followCursor: every generated track ascends in t',
    [one, six, apart, same].every((kf) => kf.every((k, i) => i === 0 || k.t > kf[i - 1].t)));
  // A shot never leaves the framing it pushed for until the press it pushed for has happened. This is
  // the SAME failure as arriving late, reached from the other side, and the demo probe hit it: the
  // reframe toward the second card began 0.03s BEFORE the first click fired.
  ok('followCursor holds through every press it framed', (() => {
    const clicks = [2, 2.6], kf = followCursor({ base: [200, 540], clicks,
      path: [{ t: 0, x: 0, y: 0 }, { t: 2, x: 0, y: 0 }, { t: 2.6, x: 700, y: 0 }, { t: 8, x: 700, y: 0 }] });
    return clicks.every((c) => {
      const before = kf.filter((k) => k.t <= c).pop(), after = kf.find((k) => k.t > c);
      return before && after && before.x === after.x && before.y === after.y && before.s === after.s;
    });
  })());

  ok('followCursor refuses a pointer it cannot follow, by name', [
    () => followCursor({ clicks: [1] }),                              // no path
    () => followCursor({ path, clicks: [] }),                         // no press to arrive at
    () => followCursor({ path: [{ t: 0, x: 'center', y: 0 }], clicks: [1] }),  // unresolved coord
    () => followCursor({ path, clicks: [1], to: 0.8 }),               // a zoom that zooms out
    () => followCursor({ path, clicks: [0.05] }),                     // no room to lead the press
    () => followCursor({ path, clicks: [1], dur: 0 }),                // a span that rewinds the clock
  ].every((f) => { try { f(); return false; } catch { return true; } }));

  ok('CAMERA_MOVE_NAMES picks up followCursor', CAMERA_MOVE_NAMES.includes('followCursor'));
  // It centres a point that is never written in the spec, so it must ALWAYS be told the canvas or a
  // portrait film would be mis-centred by 420px per axis in silence.
  ok('buildCameraMove refuses followCursor with no canvas, and honours a portrait one', (() => {
    let refused = false;
    try { buildCameraMove({ move: 'followCursor', path, clicks: [2], base: [100, 100] }); } catch { refused = true; }
    const kf = buildCameraMove({ move: 'followCursor', path, clicks: [2], base: [100, 100] }, [1080, 1920]);
    return refused && kf.find((k) => k.s > 1).x === 1080 / 2 - 500;
  })());

  // THE BINDING. The scene names a cursor LAYER and the move reads that layer's own path: this is the
  // one fact having one owner, which is the whole point of the feature.
  const cursor = { type: 'cursor', id: 'ptr', x: 100, y: 100, start: 0.5, clicks: [2], path };
  const scene = { module: 'scene', layers: [cursor], cameraMove: { move: 'followCursor', cursor: 'ptr' } };
  bakeCameraMove(scene, { W: 1920, H: 1080 });
  ok('bakeCameraMove binds the camera to the named cursor layer, on its own clock',
    !scene.cameraMove && scene.camera.find((k) => k.s > 1).x === 460
    && scene.camera.find((k) => k.s > 1).t === 0.5 + 2 - 0.18);
  ok('the binding refuses every way of naming a pointer it cannot follow', [
    { move: 'followCursor' },                                         // no cursor named
    { move: 'followCursor', cursor: 'nope' },                         // no such layer
    { move: 'followCursor', cursor: 'title' },                        // not a cursor layer
    { move: 'followCursor', cursor: 'bare' },                         // a cursor with no path
    { move: 'followCursor', cursor: 'ptr', start: 3 },                // a second owner for the clock
    { move: 'diveIn', cursor: 'ptr', tx: 0, ty: 0 },                  // a cursor on a move that drops it
  ].every((spec) => {
    const d = { module: 'scene', cameraMove: spec, layers: [{ ...cursor }, { type: 'text', id: 'title' },
      { type: 'cursor', id: 'bare' }] };
    try { bakeCameraMove(d, { W: 1920, H: 1080 }); return false; } catch { return true; }
  }));
  ok('a relative cursor base is refused rather than aimed at NaN', (() => {
    const d = { module: 'scene', cameraMove: { move: 'followCursor', cursor: 'ptr' },
      layers: [{ ...cursor, x: 'center' }] };
    try { bakeCameraMove(d, { W: 1920, H: 1080 }); return false; } catch { return true; }
  })());
}

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

// ---- scripts/lib/census.mjs: ONE definition of "the library" ----
// waiver-drift printed 135 and audio-check printed 150 for the same thing, because each caller wrote
// its own rule. These four assertions are what stops the two from drifting apart again.
{
  const { LIBRARY, LIBRARY_WITH_DERIVATIVES, SCENE_DIR, ROOT } = await import('../lib/census.mjs');
  const abs = (f) => path.join(ROOT, SCENE_DIR, f);
  const names = fs.readdirSync(path.join(ROOT, SCENE_DIR)).filter((f) => f.endsWith('.json')).sort();
  const lib = names.filter((f) => LIBRARY(f, abs(f)));
  const wide = names.filter((f) => LIBRARY_WITH_DERIVATIVES(f, abs(f)));
  ok('census: the library excludes every generated sidecar',
    !lib.some((f) => /\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f)));
  ok('census: the library excludes schema.json and templates',
    !lib.includes('schema.json') && !lib.some((f) => /\.template\.json$/.test(f)));
  ok('census: every member of the library declares module scene',
    lib.every((f) => { try { return JSON.parse(fs.readFileSync(abs(f), 'utf8')).module === 'scene'; } catch { return false; } }));
  // The opt-in is the same rule minus one clause, so it can only ever be a superset. A caller that
  // wanted derivatives and got fewer files would be the original bug pointing the other way.
  ok('census: the derivatives opt-in is a strict superset of the library',
    lib.every((f) => wide.includes(f)) && wide.length >= lib.length);
}

// ---- THE RENDER PIPELINE ORDER (docs/CODEMAPS/ARCHITECTURE.md, "Frame pipeline") ----------------
//
// #463 and #464 were both ordering and neither was arithmetic: a handover resolved before the layout
// measurement, and a box composed before the tracks that move it. The order that governs both was
// written in file headers, where nothing could read it. It is a parsed block in the codemap now, and
// this is what reads it, so the doc is the single statement of the contract AND the thing that fails
// when the code stops matching it.
//
// THE CEILING, stated here because a check nobody knows the limits of is worse than none. This proves
// the ORDER OF CALLS from source text, and the SET of tracks that treat `el.style` as an accumulator.
// It cannot prove that a track read a fresh value rather than a stale one, that is a property of one
// scene at one t, and probe-purity, canvas-purity and snap-scenes are what see it.
{
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'CODEMAPS', 'ARCHITECTURE.md'), 'utf8');
  const block = doc.match(/```pipeline\n([\s\S]*?)```/);
  ok('the codemap still states the pipeline', !!block);
  const rows = (block ? block[1] : '').split('\n')
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(/\s+/));
  const of = (kind) => rows.filter((r) => r[0] === kind).map((r) => r.slice(1));

  const sceneSrc = fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'scene.js'), 'utf8');

  // BUILD. The needle is a literal from the step itself, so a step that moves takes its needle with it
  // and a step that is deleted fails as "not found" rather than passing on a stale index.
  const build = of('build');
  ok('the codemap names the build steps', build.length >= 3);
  let prev = -1, buildOk = true, buildWhy = '';
  for (const [name, ...needleParts] of build) {
    const needle = needleParts.join(' ');
    const at = sceneSrc.indexOf(needle);
    if (at < 0) { buildOk = false; buildWhy = `${name}: "${needle}" is not in scene.js`; break; }
    if (at < prev) { buildOk = false; buildWhy = `${name} now runs earlier than the step before it`; break; }
    prev = at;
  }
  ok(`build-time resolution runs in the stated order (${buildWhy || 'ok'})`, buildOk);
  // #464 in one line: the measurement decides the box `becomes` hands over, so it must precede it.
  ok('the layout measurement precedes the handover (#464)',
    sceneSrc.indexOf('el.offsetWidth') < sceneSrc.indexOf('resolveBecomes(data, (L) =>'));

  // FRAME. Read out of renderFrame's own body, not the whole file, so an unrelated mention of a stage
  // elsewhere cannot satisfy the order.
  const body = (() => {
    const at = sceneSrc.indexOf('function renderFrame(f) {');
    return at < 0 ? '' : sceneSrc.slice(at, sceneSrc.indexOf('\n  }\n', at));
  })();
  ok('renderFrame is still where the codemap says', body.length > 0);
  const frame = of('frame').map((r) => r[0]);
  ok('the codemap names the frame stages', frame.length >= 8);
  let fprev = -1, frameOk = true, frameWhy = '';
  for (const name of frame) {
    const at = body.indexOf(name + '(');
    if (at < 0) { frameOk = false; frameWhy = `${name} is not called in renderFrame`; break; }
    if (at < fprev) { frameOk = false; frameWhy = `${name} now runs before the stage above it`; break; }
    fprev = at;
  }
  ok(`renderFrame composes in the stated order (${frameWhy || 'ok'})`, frameOk);
  // #463 in one line: every box for the frame is composed before any track can move a layer, which is
  // why boxOf reports the settled pose and why `follow` cannot chain.
  ok('every box is resolved before any track runs (#463)',
    body.indexOf('resolveBoxes(t)') < body.indexOf('runTracks('));

  // ACCUMULATE. `el.style` is the pipeline's accumulator: these tracks read the transform back and
  // prepend, so a fifth one appearing, or one of these four quietly becoming a REPLACE, changes what
  // every earlier stage contributed. A set, not an order, the slots already own the order.
  const READBACK = /el\.style\.transform\s*(&&|\|\|)/;
  const trackDir = path.join(repoRoot, 'core', 'tracks');
  const found = fs.readdirSync(trackDir).filter((n) => n.endsWith('.js'))
    .filter((n) => READBACK.test(fs.readFileSync(path.join(trackDir, n), 'utf8')))
    .map((n) => 'core/tracks/' + n).sort();
  const declared = of('accumulate').map((r) => r[0]).sort();
  ok(`exactly the declared tracks accumulate onto el.style (found: ${found.join(', ')})`,
    found.length === declared.length && found.every((f, i) => f === declared[i]));

  // The chaining refusal is a REFUSAL, not a paragraph. #465: following a follower pinned to the
  // middle layer's unpinned position and said nothing.
  const followSrc = fs.readFileSync(path.join(trackDir, 'follow.js'), 'utf8');
  ok('follow refuses a chain by name (#465)',
    /scene\.specOf\(spec\.id\)/.test(followSrc) && /tgt\.follow/.test(followSrc)
      && /throw new Error/.test(followSrc.slice(followSrc.indexOf('tgt.follow'))));

}

// ---- THE GSAP TRIGGER LOCKSTEP (docs/MISTAKES.md #154, #487) ----
// core/preload.js decides whether the tween engine is fetched at all, from the props a scene names. Get
// that set wrong and the render is silent and STILL: no throw, no warning, a figure that simply does not
// move. It shipped that way once, because the set was a hand-typed list beside a comment asking the next
// author to keep it in lockstep with three other files.
//
// This re-derives the set from the code that does the reading and compares. The sweep walks the whole
// engine rather than a named list of files, because #148's sibling failures (#229 · #232 · #242) were all
// a gate whose file list was outrun by a directory move.
{
  const { GSAP_PROPS } = await import('../../core/preload.js');
  const { GSAP_TRIGGER: PARTS_TRIGGER } = await import('../../core/parts.js');
  const { GSAP_TRIGGER: COMP_TRIGGER } = await import('../../core/layers/composition.js');
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

  // The one shape every GSAP hook is written in: a layer prop gating a branch that also tests window.gsap.
  const READ = /\bif\s*\(\s*!?\s*L\.([A-Za-z_$][\w$]*)\b[^)]*?window\.gsap/g;
  const swept = new Set();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'node_modules') walk(f); continue; }
      if (!f.endsWith('.js')) continue;
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(READ)) swept.add(m[1]);
    }
  })(ROOT + '/core');
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!f.endsWith('.js')) continue;
      for (const m of fs.readFileSync(f, 'utf8').matchAll(READ)) swept.add(m[1]);
    }
  })(ROOT + '/formats');

  // composition.js reads L.comp and tests window.gsap on separate lines, so the sweep cannot see it. It
  // says so itself instead, which is the stronger statement of the two.
  const derived = new Set([...swept, PARTS_TRIGGER, COMP_TRIGGER]);
  const missing = [...derived].filter((k) => !GSAP_PROPS.includes(k));
  const stale = GSAP_PROPS.filter((k) => !derived.has(k));
  ok(`the sweep finds the GSAP hooks at all (found ${swept.size})`, swept.size >= 7);
  ok(`every prop read behind window.gsap triggers the preload${missing.length ? ': MISSING ' + missing.join(', ') : ''}`,
    missing.length === 0);
  ok(`every preload trigger has a reader${stale.length ? ': STALE ' + stale.join(', ') : ''}`,
    stale.length === 0);

  // And the decision itself, exercised per prop. Four of these are used by zero or one scene in the
  // library, so no render proves them: a synthetic layer is the only thing that does.
  const { preloadGsap } = await import('../../core/preload.js');
  const priorWin = globalThis.window;
  let touched = false;
  const fakeGsap = { ticker: { sleep() { touched = true; } }, globalTimeline: {}, registerPlugin() {},
    registerEffect() {}, effects: {} };
  globalThis.window = { gsap: fakeGsap, MotionPathPlugin: {}, Physics2DPlugin: {}, SplitText: {} };
  const loads = async (layer) => { touched = false; await preloadGsap({ layers: [layer] }); return touched; };
  const perProp = [];
  for (const k of GSAP_PROPS) if (!(await loads({ type: 'rect', [k]: 'x' }))) perProp.push(k);
  ok(`a scene naming any trigger prop gets GSAP loaded${perProp.length ? ': SILENT ' + perProp.join(', ') : ''}`,
    perProp.length === 0);
  ok('a scene naming none of them does not', (await loads({ type: 'text', text: 'no fx here' })) === false);
  globalThis.window = priorWin;
}

// ---- the render harness: the one path guard 22 scripts used to hand-roll ----
{
  const { insideRoot, MIME, REPO_ROOT } = await import('../lib/render-harness.mjs');
  const root = '/repo';
  ok('a file under the root is served', insideRoot(root, '/repo/core/boot.js'));
  ok('the root itself is inside itself', insideRoot(root, '/repo'));
  ok('a parent is refused', insideRoot(root, '/etc/passwd') === false);
  ok('a climb out is refused', insideRoot(root, path.join(root, '../secrets')) === false);
  // The bug every hand-rolled `p.startsWith(root)` carried: a sibling whose name extends the root's.
  ok('a sibling with the root as a name prefix is refused', insideRoot(root, '/repo-evil/config') === false);
  ok('the mime table covers every type the copies served',
    ['.html', '.mjs', '.json', '.woff2', '.otf', '.mp4', '.webm', '.jpeg'].every((e) => MIME[e]));
  ok('the harness resolves the repo root', fs.existsSync(path.join(REPO_ROOT, 'core/motion.js')));
}

// ---- a fragment's stylesheet stops at its own layer (docs/MISTAKES.md #510) ----
{
  const { scopeStyles } = await import('../../core/sanitize-html.js');
  ok('markup with no stylesheet is handed back unchanged',
    scopeStyles('<div class="g">hi</div>') === '<div class="g">hi</div>');
  ok('a style block is wrapped in a bare @scope',
    scopeStyles('<style>.g{color:red}</style>') === '<style>@scope {.g{color:red}}</style>');
  // The hoist is the half that matters: left inside `<div class="g">`, the scoping root would be that
  // div, and Chrome does not match an ordinary selector against the root itself, so the fragment's own
  // `.g` rule would stop applying. Hoisted, the root is the caller's wrapper and `.g` is a descendant.
  ok('a nested style block is hoisted to the front of the fragment',
    scopeStyles('<div class="g"><style>.g{color:red}</style>x</div>')
      === '<style>@scope {.g{color:red}}</style><div class="g">x</div>');
  ok('two blocks keep their order, so a fragment that overrides itself still cascades',
    scopeStyles('<style>a{}</style><b><style>c{}</style></b>')
      === '<style>@scope {a{}}</style><style>@scope {c{}}</style><b></b>');
  ok('a style attribute is not a style block', scopeStyles('<i style="color:red"></i>') === '<i style="color:red"></i>');
  // A COMMENT IS PROSE, AND EVERY REGEX IN THAT FILE READ IT AS MARKUP (docs/MISTAKES.md #548). The
  // word `<style>` in an author's note made STYLE_BLOCK span from the NOTE to the first real
  // `</style>`, so the fragment's whole stylesheet and the opening tag of its root element were
  // swallowed into one `@scope {…}` block. The panel rendered as unstyled text and nothing said a word.
  const { sanitizeHtml, timeCssUsed, stripComments } = await import('../../core/sanitize-html.js');
  const noted = '<!-- write a <style> block, never a transition: it renders as a dead still -->'
    + '<style>.g{color:red}</style><div class="g">x</div>';
  ok('a comment naming <style> does not swallow the real stylesheet',
    scopeStyles(sanitizeHtml(noted)) === '<style>@scope {.g{color:red}}</style><div class="g">x</div>');
  ok('a comment naming <script> does not swallow the markup after it',
    sanitizeHtml('<!-- no <script> here --><div>x</div>') === '<div>x</div>');
  ok('a comment explaining the transition ban is not a transition',
    timeCssUsed('<!-- never write transition: .3s --><div style="color:red"></div>') === null);
  ok('a real transition is still refused', timeCssUsed('<div style="transition:opacity .3s"></div>') === 'transition');
  ok('stripComments leaves markup carrying no comment alone', stripComments('<b>x</b>') === '<b>x</b>');
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
  const { bakeDepth } = await import('../../core/produce.js');
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
  // THE SUGAR BECOMES THE MODIFIER, or core/boot.js throws. A field written and read by nothing is the
  // failure the whole bake path exists to make impossible (docs/MISTAKES.md #444).
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

// ---------- the three motion-standard changes ----------
// docs/CRAFT/MOTION-STANDARDS.md audits this engine against animations.dev / emilkowal.ski. Three
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
  const { motionAt } = await import('../../core/sequence.js');
  const { INTERP } = await import('../../core/vocab.js');
  const { isEasingName } = await import('../../core/motion.js');
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
  try { (await import('../../core/motion.js')).resolveEasing('through'); } catch (e) { threw = e.message; }
  ok('resolveEasing REFUSES it: a mode is not a curve', threw != null);
  ok('`smooth` is still the feel word it always was',
    Math.abs(vel(0.6, 'smooth') - vel(0.6, undefined)) < 1);

  // ONE INTERPOLATOR, NOT TWO. cameraAt's comment said it "mirrors motionAt" and they had already
  // drifted: `through` was dispatched inside motionAt, so a camera key naming it threw
  // `unknown easing "through"`. Both now go through segmentAt, and this asserts the camera gets the
  // whole segment vocabulary rather than a copy of half of it.
  const { cameraAt, segmentAt } = await import('../../core/sequence.js');
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
  const { cubicBezier, easeInOutCubic } = await import('../../core/motion.js');
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
  const { handleCurve, cubicBezier, HANDLE_REGISTRY, resolveHandle } = await import('../../core/motion.js');
  const { motionAt, keyHandleErrors, velocityAt } = await import('../../core/sequence.js');

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
  const { layerTime } = await import('../../core/time.js');
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
  const { bakeTimeRemap } = await import('../../core/time.js');
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
  const { cameraAt } = await import('../../core/sequence.js');
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

// ---------- CAMERA MOTION BLUR: the velocity that smears is the one RELATIVE TO THE CAMERA ---------
//
// A layer blurred off its own track and stayed razor sharp under a whip pan, which is backwards: a
// shutter exposes the SENSOR. These assert the two halves that make the feature right rather than
// merely present: a still layer smears under a pan, and a layer travelling WITH the camera does not.
{
  const { cameraAt: camAtKf, cameraVelocityAt } = await import('../../core/sequence.js');
  const { frame: motionFrame, resolveCameraBlur } = await import('../../core/tracks/motion.js');
  // linear on purpose, for the reason the velocityAt block above states: an eased segment would make
  // these assert the shape of easeInOutCubic instead of the shape of the read.
  const pan = [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: -600, ease: 'linear' }];
  ok('cameraVelocityAt reports the camera translation in px per SECOND',
    Math.abs(cameraVelocityAt(pan, 0.5, 1 / 30).vx + 600) < 1);
  ok('cameraVelocityAt tapers to zero on the film\'s first frame rather than extrapolating',
    cameraVelocityAt(pan, 0, 1 / 30).speed === 0);
  ok('cameraVelocityAt answers zero for a film with no camera at all',
    cameraVelocityAt([], 0.5, 1 / 30).speed === 0 && cameraVelocityAt(null, 0.5, 1 / 30).speed === 0);
  ok('cameraVelocityAt refuses a window that is not a positive number of seconds', (() => {
    try { cameraVelocityAt(pan, 0.5, 0); return false; } catch (e) { return /positive lookback/.test(e.message); }
  })());
  // A ZOOM IS NOT MODELLED, and that is a decision rather than an oversight: its screen velocity is
  // radial, so it cannot be answered without the layer's stage position, which a track does not have.
  // Asserted so a later author cannot quietly start reading `s` here and produce a uniform, wrong smear.
  ok('a pure camera PUSH contributes no velocity: the zoom is radial and deliberately unmodelled',
    cameraVelocityAt([{ t: 0, s: 1, ease: 'linear' }, { t: 1, s: 3, ease: 'linear' }], 0.5, 1 / 30).speed === 0);

  const camKit = { fps: 30, shutter: 0.5, cameraBlur: true };
  const camOff = { ...camKit, cameraBlur: false };
  const camView = (t) => ({ ...camAtKf(pan, t), vel: cameraVelocityAt(pan, t, 1 / 30) });
  const blurOf = (L, k) => {
    const el = { style: {} };
    motionFrame(k, el, L, null, 0.5, 15, 0, 1, { camera: camView(0.5) });
    const m = /blur\(([\d.]+)px\)/.exec(el.style.filter || '');
    return m ? +m[1] : 0;
  };
  const still = { id: 'still', start: 0, duration: 1 };
  // travels with the camera: the camera's x goes -600px/s, so +600px/s keeps it on the same pixels.
  const locked = { id: 'locked', start: 0, duration: 1,
    motion: [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: 600, ease: 'linear' }] };
  // travels AGAINST it, so its velocity on the sensor is twice the camera's.
  const against = { id: 'against', start: 0, duration: 1,
    motion: [{ t: 0, x: 0, ease: 'linear' }, { t: 1, x: -600, ease: 'linear' }] };

  ok('a layer with NO motion track smears under a pan: standing still on the stage is moving on the sensor',
    blurOf(still, camKit) > 0.4);
  ok('a layer travelling WITH the camera stays sharp, because the two velocities cancel',
    blurOf(locked, camKit) === 0);
  ok('a layer travelling AGAINST the camera smears more than one standing still',
    blurOf(against, camKit) > blurOf(still, camKit));
  // The measured numbers, so a later change to the shutter arithmetic cannot pass by moving both sides.
  // 600px/s over a 1/30s frame is 20px; half-shutter at 0.5 is 5px, and the counter-runner doubles it.
  ok('the camera smear is the same half-shutter arithmetic the layer path uses',
    Math.abs(blurOf(still, camKit) - 5) < 0.1 && Math.abs(blurOf(against, camKit) - 10) < 0.1);

  // DEFAULT OFF, and the whole library depends on it: with the dial down the camera contributes exactly
  // nothing, so a still layer keeps the `filter` it always had and a moving one keeps only its own blur.
  ok('with cameraBlur off a still layer is untouched by the camera',
    blurOf(still, camOff) === 0);
  ok('with cameraBlur off a layer\'s own track still blurs it, unchanged',
    Math.abs(blurOf(locked, camOff) - 5) < 0.1 && Math.abs(blurOf(against, camOff) - 5) < 0.1);
  ok('`motionBlur: false` opts a layer out of the camera\'s blur as well as its own',
    blurOf({ ...still, motionBlur: false }, camKit) === 0);

  // PURE IN THE FRAME: nothing is remembered between frames, so the same frame drawn on a cold element
  // and on one that has already drawn a later frame must agree. This is the branch #507 was logged on.
  ok('camera blur is a pure function of the frame, not of the frames drawn before it', (() => {
    const el = { style: {} };
    motionFrame(camKit, el, still, null, 0.9, 27, 0, 1, { camera: camView(0.9) });
    motionFrame(camKit, el, still, null, 0.5, 15, 0, 1, { camera: camView(0.5) });
    const warm = el.style.filter;
    const e2 = { style: {} };
    motionFrame(camKit, e2, still, null, 0.5, 15, 0, 1, { camera: camView(0.5) });
    return warm === e2.style.filter;
  })());

  ok('`cameraBlur` is a boolean, and a number is refused by name rather than coerced', (() => {
    try { resolveCameraBlur(0.5); return false; } catch (e) { return /BOOLEAN/.test(e.message) && /shutter/.test(e.message); }
  })());
  ok('`cameraBlur` absent or false is off, true is on',
    resolveCameraBlur(undefined) === false && resolveCameraBlur(false) === false && resolveCameraBlur(true) === true);
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
    execFileSync(process.execPath, [new URL('../site/effects-json.mjs', import.meta.url).pathname, '--check'],
      { stdio: 'pipe', cwd: new URL('../..', import.meta.url).pathname });
  } catch (e) { built = false; why = String(e.stderr || e.message).trim().split('\n').slice(0, 6).join(' · '); }
  ok(`the effects catalogue still builds: every family has a usage form and a preview or a reason${built ? '' : ' → ' + why}`, built);
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
  // easeOutCubic; a WRONG name throws rather than substituting, which is core/motion.js's contract.
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

// ---- ARSENAL RECENCY (scripts/author/recency.mjs) ------------------------------------------------
// The census cannot tell "undiscoverable" from "unwanted", and age is what tells them apart. These
// assert the two halves that can be wrong: the tree read, and the join onto the census.
{
  ok('presentIn finds a name in the tree text and does not invent one that is absent',
     (() => { const got = presentIn('const X = { wipe: 1 };', ['wipe', 'matchCut']);
              return got.has('wipe') && !got.has('matchCut') && got.size === 1; })());
  ok('a name in NO registry file is reported new, whatever the window',
     newSince(['zzNotARealArsenalEntry']).has('zzNotARealArsenalEntry'));
  // `wipe` is one of the oldest entries in core/cuts.js. If a fixed window ever calls it new, the
  // derivation is reading diffs, or reading nothing, and both report the whole arsenal as fresh.
  ok('an entry that predates the window is never reported new',
     !newSince(['wipe', 'fade']).has('wipe') && !newSince(['wipe', 'fade']).has('fade'));
  ok('git that cannot answer reports NOTHING new, rather than everything',
     existingAt('', ['wipe'], undefined).size === 0 && newSince([], {}).size === 0);
  ok('the window is a fixed number of days, so a quiet fortnight is allowed to be empty',
     Number.isInteger(WINDOW_DAYS) && WINDOW_DAYS > 0);
  // The join the preflight output rests on: new AND unused is the pair worth surfacing, and each half
  // is measured by a different owner (recency here, the census in scripts/author/arsenal.mjs).
  ok('newness and usage are independent reads, so an old entry with users is neither',
     (() => { const fresh = newSince(['wipe', 'zzNotARealArsenalEntry']);
              return fresh.size === 1 && fresh.has('zzNotARealArsenalEntry'); })());
}

// ---- ARSENAL HONESTY (scripts/author/arsenal.mjs) ------------------------------------------------
// The search an author is told to reach for before inventing anything returned its nearest match even
// when it had none, twice in one day (docs/MISTAKES.md #551). Two things are asserted here and they are
// different failures: RECALL, that it holds what it holds, and CONFIDENCE, that it can say it does not
// know. Fixing only the second would leave it silently missing `beam`; fixing only the first would
// leave it confidently answering questions with no answer.
{
  const corpus = await arsenalCollect();
  const coverage = coverageIn(corpus);
  const best = (q) => {
    const qt = arsenalToks(q);
    return corpus.map((e) => ({ name: e.name, c: coverage(e, qt) })).sort((a, b) => b.c - a.c)[0];
  };
  // Two vocabularies may legitimately share a word (the `globe` LAYER TYPE and the `globe` three.js
  // scene), so this asks the best-covering entry of that name, never the first one collect() emitted.
  const covers = (q, name) => { const qt = arsenalToks(q);
    return Math.max(-1, ...corpus.filter((x) => x.name === name).map((x) => coverage(x, qt))); };

  // RECALL. Layer types are not a `*_REGISTRY`, so the whole family was outside the corpus, and `beam`
  // (blurb: "a light that travels the rounded-rect border") was unfindable by a query naming exactly
  // that. The search offered cardCascade, lightLeak and highlight instead.
  ok('the search holds the LAYER TYPES, the coarsest vocabulary in the engine',
     ['beam', 'component', 'globe', 'adjust'].every((n) => corpus.some((e) => e.name === n && e.kind === 'layer type')));
  ok('every layer type in the corpus carries its blurb, which is the only text a paraphrase can match',
     corpus.filter((e) => e.kind === 'layer type').every((e) => e.blurb.length > 20));
  ok('"a light that travels around the border of a card" FINDS beam, and confidently',
     best('a light that travels around the border of a card').name === 'beam'
     && covers('a light that travels around the border of a card', 'beam') >= CONFIDENT);

  // CONFIDENCE. Two sets, and the threshold sits in the gap between them. Known-present queries must
  // keep answering; known-absent queries must produce nothing above the bar. Loosening the matcher until
  // the first set passes would break the second, which is the point of asserting both.
  const PRESENT = [
    ['a light that travels around the border of a card', 'beam'],
    ['a page scrolling under a static tilt', 'scrollStory'],
    ['count up to a big number', 'count'],
    ['a dotted planet with tapered route arcs', 'globe'],
    ['grade everything beneath this layer', 'adjust'],
    ['thermal blur', 'thermalBlur'],
    ['show the feature set as cards that pop in one after another', 'cardCascade'],
    ['a sheen that sweeps across the box', 'beam'],
    ['capture a real product surface', 'component'],
    ['a full-frame generative webgl field', 'shader'],
    ['a lit implicit surface from a distance field', 'raymarch'],
    // This was in the ABSENT set below, correctly, for about an hour. A sibling agent built `upright`
    // in parallel while this calibration was being written, so the honest answer to it changed under
    // the test. That is the set working: an absent query becomes a present one the day the capability
    // lands, and the assertion has to move with it rather than be relaxed.
    ['keep a carried layer upright while its parent rotates', 'upright'],
  ];
  for (const [q, want] of PRESENT) {
    ok(`arsenal answers "${q}" with ${want}`, covers(q, want) >= CONFIDENT);
  }

  // The engine has none of these. `dollyZoom` was the top hit for the first one, and for the
  // upright query now in PRESENT above, and an author nearly hand-rolled a conic gradient off the
  // back of the same kind of confident wrong answer.
  const ABSENT = [
    'invert a layer against whatever is behind it',
    'render the scene in stereoscopic 3d for a headset',
    'transcribe the voiceover into subtitles automatically',
    'make one layer chase another layer around the frame',
    'attach a physics rigid body to a layer',
  ];
  for (const q of ABSENT) {
    const b = best(q);
    ok(`arsenal says it does not know "${q}" (nearest ${b.name} at ${b.c.toFixed(2)})`, b.c < CONFIDENT);
  }

  // A word in every blurb must not buy confidence, which is the reason the weighting is idf and not a
  // plain count. Unweighted, "chase another layer around the frame" scored the same as a real query.
  ok('a query of nothing but corpus-wide filler is never confident',
     best('the layer in the frame').c < CONFIDENT);
  ok('the threshold sits strictly between the two sets, so neither end is decoration',
     CONFIDENT > Math.max(...ABSENT.map((q) => best(q).c))
     && CONFIDENT <= Math.min(...PRESENT.map(([q, w]) => covers(q, w))));
}

// ---- ARSENAL SNIPPETS: the line an author PASTES ---------------------------------------------------
// Every hit prints the JSON it goes in, and that line was built by one string replace over the slot. It
// was wrong for both key-shaped families: `modifiers[]` printed `"modifiers[]": "upright" }]`, which is
// not JSON at all, and every dotted slot printed a flat `"cameraMove.move": …`, which parses and is not
// what the engine reads. Nobody noticed because the modifier family was unsearchable until the day
// before. So the check is not "one family is fixed", it is that EVERY entry's snippet parses and puts
// the name where its own slot says it goes. The walk below restates the slot grammar deliberately: a
// test that called the renderer's own path builder would agree with it whatever it did.
{
  const corpus = await arsenalCollect();
  const nameAt = (obj, slot, name) => {
    const segs = slot.split('.');
    let node = obj;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const marker = (seg.endsWith('[]') || seg.endsWith('{}')) ? seg.slice(-2) : '';
      const key = marker ? seg.slice(0, -2) : seg;
      if (!node || typeof node !== 'object') return false;
      node = node[key];
      if (marker === '[]') {
        if (!Array.isArray(node) || !node.length) return false;
        node = node[0];
      }
      if (i === segs.length - 1) {
        if (marker) return !!node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, name);
        return node === name;
      }
    }
    return false;
  };

  const pasteable = corpus.filter((e) => e.slot && !e.slot.includes('(') && e.kind !== 'blueprint beat');
  const bad = [];
  for (const e of pasteable) {
    const snip = arsenalSnippet(e);
    let obj = null;
    try { obj = JSON.parse(`{${snip}}`); } catch { bad.push(`${e.kind} · ${e.name}: not JSON · ${snip}`); continue; }
    if (!nameAt(obj, e.slot, e.name)) bad.push(`${e.kind} · ${e.name}: not at \`${e.slot}\` · ${snip}`);
  }
  if (bad.length) console.error('     ' + bad.slice(0, 5).join('\n     '));
  ok(`every arsenal snippet parses as JSON and lands at its own slot (${pasteable.length} entries)`,
     bad.length === 0);

  // Per FAMILY, because the bug was one family being wrong while the other thirty-odd were right, and a
  // total pass count hides that. A family with no pasteable snippet must be one whose slot is prose.
  const families = [...new Set(corpus.map((e) => e.kind))];
  const silent = families.filter((k) => corpus.filter((e) => e.kind === k)
    .every((e) => e.kind === 'blueprint beat' ? false : !arsenalSnippet(e)));
  ok('the only families that print no paste are the ones whose slot is prose, not a path',
     silent.every((k) => corpus.filter((e) => e.kind === k).every((e) => e.slot && e.slot.includes('('))));
  ok('both key-shaped families put the NAME in the key position, not the value',
     (() => { const m = corpus.find((e) => e.kind === 'modifier');
              const d = corpus.find((e) => e.kind === 'effector drive');
              return arsenalSnippet(m) === `"modifiers": [{ "${m.name}": {} }]`
                && arsenalSnippet(d) === `"effector": { "drives": { "${d.name}": 1 } }`; })());
}

// ---------------------------------------------------------------------------------------------------
// SCENE UNITS: which layers the beat wrapper carries through the cut (docs/MISTAKES.md #555).
//
// The wrapper owns the exit slide, so a layer it carries loses its own exit and lives to the end of the
// cut window. Applied to EVERY layer of the beat, a beat that is a whole act paints its entire history
// at once. These assert the membership rule through scene-timing.mjs, which is the ONE model of it
// outside the renderer; formats/scene/scene.js carries the same rule and snap-all's tpot-launch
// baseline is what proves the two still agree in the DOM.
{
  const { sceneTiming } = await import('./scene-timing.mjs');
  const scene = (layers) => ({ module: 'scene', duration: 12, sceneUnits: true,
    cuts: [{ t: 6, style: 'slide', dur: 0.6 }], bg: [{ t: 0, preset: 'plain' }], layers });
  const held = (layers, i) => { const T = sceneTiming(scene(layers)); return T.unitEnd(T.scene.layers[i]); };
  const L = (start, duration, extra = {}) => ({ type: 'text', text: 'x', size: 80, start, duration, ...extra });

  ok('sceneUnits: the beat\'s last state rides the wrapper out, so it lives to the end of the cut window',
    held([L(0, 6)], 0) === 6.6);
  ok('sceneUnits: a layer SUPERSEDED inside its beat keeps its authored window and is not resurrected',
    held([L(0, 3), L(3, 3)], 0) === null && held([L(0, 3), L(3, 3)], 1) === 6.6);
  ok('sceneUnits: three sequential lines in one beat leave only the third on screen at the cut',
    (() => { const ls = [L(0, 2), L(2, 2), L(4, 2)];
      return held(ls, 0) === null && held(ls, 1) === null && held(ls, 2) === 6.6; })());
  // The reason the fix moves ONE scene and not fifteen. A line that lands a beat early and waits for the
  // cut in silence was never replaced, so the wrapper still carries it: a strict on-screen-at-the-cut
  // test would drop it and slide an empty beat out, which is a regression in every showcase scene.
  ok('sceneUnits: a deliberate hold (nothing starts after it ends) still rides the wrapper out',
    held([L(0, 5.5)], 0) === 6.6);
  ok('sceneUnits: supersession is measured against when a layer ENDS, so an overlapping pair both ride out',
    (() => { const ls = [L(0, 6), L(1, 5)]; return held(ls, 0) === 6.6 && held(ls, 1) === 6.6; })());
  // float noise: 17.4 + 2.7 lands on 20.099999999999998, and a cut at 20.1 must not read that as gone.
  ok('sceneUnits: a layer ending ON its cut is current, float noise included',
    held([L(0, 2), L(2, 4.0000000000001)], 1) === 6.6);
  ok('sceneUnits: `acrossBeats` still opts a layer out of the wrapper entirely',
    held([L(0, 2, { acrossBeats: true }), L(2, 4)], 0) === null);
}

// ---------------------------------------------------------------------------------------------------
// THE CHOOSER'S CANDIDATES (scripts/dev/candidates.mjs): what gets offered, and what a choice becomes.
//
// The panel that shows the strip depends on exactly two things: that the patch it is handed applies to
// the key it names, and that the six options are visibly DIFFERENT from each other. Both are pure and
// neither needs a browser, so both are asserted here rather than by looking at six clips.
{
  const { look: bgLook, patchOps, applyPatch, pickForVariety } = await import('../dev/candidates.mjs');

  // ---- the patch ----
  ok('candidates: the patch replaces the preset of the window it names, and nothing else',
    JSON.stringify(patchOps(2, 'liquid')) === '[{"op":"replace","path":"/bg/2/preset","value":"liquid"}]');
  ok('candidates: an `opts` block the new preset has no knob for is removed VISIBLY, as a second op',
    (() => { const ops = patchOps(0, 'paperDots', true);
      return ops.length === 2 && ops[1].op === 'remove' && ops[1].path === '/bg/0/opts'; })());
  ok('candidates: applying a patch changes the preset and leaves the source object untouched',
    (() => {
      const scene = { module: 'scene', bg: [{ preset: 'paper' }, { preset: 'dark', opts: { intensity: 2 } }] };
      const out = applyPatch(scene, patchOps(1, 'liquid', true));
      return out.bg[1].preset === 'liquid' && out.bg[1].opts === undefined
        && scene.bg[1].preset === 'dark' && scene.bg[1].opts.intensity === 2;
    })());

  // ---- what a preset LOOKS like, on this film's palette ----
  ok('candidates: `plain` is flat and `liquid` moves, read off the preset the engine builds',
    bgLook('plain').family === 'flat' && bgLook('plain').moves === false
    && bgLook('liquid').moves === true && bgLook('liquid').family === 'liquid');
  ok('candidates: lightness is MEASURED, so `paper` is light and `deep` is dark on the same palette',
    bgLook('paper').tone === 'light' && bgLook('deep').tone === 'dark');
  // The whole reason lightness is not read off the name: `value:"dark"` makes the same preset a dark
  // window, exactly as formats/scene/scene.js decides it (docs/MISTAKES.md #159 is the drift this avoids).
  ok('candidates: `value:"dark"` makes a light preset a dark window, the engine\'s own rule',
    bgLook('plain').tone === 'light' && bgLook('plain', 'dark').tone === 'dark');

  // ---- the picking ----
  // Six settings of one look are ONE option, so the strip must not fill up with a family it already has
  // even when that family holds the highest-scoring entries.
  const pool = [
    { name: 'a', relevance: 0.9, family: 'aurora', tone: 'dark' },
    { name: 'b', relevance: 0.8, family: 'aurora', tone: 'dark' },
    { name: 'c', relevance: 0.7, family: 'aurora', tone: 'dark' },
    { name: 'd', relevance: 0.6, family: 'flat', tone: 'light' },
    { name: 'e', relevance: 0.5, family: 'liquid', tone: 'dark' },
  ];
  ok('candidates: the strip takes an unseen family over a higher-scoring one it already has',
    pickForVariety(pool, 3).map((c) => c.name).join('') === 'ade');
  ok('candidates: relevance still orders the strip inside that rule, best first',
    pickForVariety(pool, 5)[0].name === 'a');
  ok('candidates: once every family is on the strip the rest fill in by relevance, nothing is lost',
    pickForVariety(pool, 5).map((c) => c.name).join('') === 'adebc');
  ok('candidates: `n` is a ceiling and a short pool is not padded',
    pickForVariety(pool, 2).length === 2 && pickForVariety(pool.slice(0, 1), 6).length === 1);
  // Deterministic, because the panel re-runs this and a strip that reshuffles is a strip nobody trusts.
  ok('candidates: the same pool always yields the same strip, ties broken by name',
    (() => {
      const tied = pool.map((c) => ({ ...c, relevance: 0 }));
      const one = pickForVariety(tied, 4).map((c) => c.name).join('');
      return one === pickForVariety([...tied].reverse(), 4).map((c) => c.name).join('');
    })());
}

// ---- schema-drift --write: a regeneration must be READABLE and must never drop a name -------------
// Both halves of docs/MISTAKES.md #564. The generator emitted each array on one line while
// schema.json is committed one-name-per-line, so every `--write` reflowed a 451-line block into 6 and
// `git diff --stat` reported ~445 deletions for a one-prop change. Nothing was lost, the data
// round-tripped identical, but the diff was unreadable, and an unreadable diff is where a real
// deletion hides. So: the render must reproduce the committed file byte for byte, and a write that
// WOULD lose a prop name must refuse.
//
// The refusal is exercised end to end, against the real file, because the whole point is that it
// happens before the write. A bogus name is spliced into the committed `layerProps.shared`, which no
// module declares, so regenerating would drop it. The original text is restored either way, and the
// test fails loudly if the guard let the write through.
{
  const { execFileSync } = await import('node:child_process');
  const gate = new URL('./schema-drift.mjs', import.meta.url).pathname;
  const file = path.join(repoRoot, 'formats', 'scene', 'schema.json');
  const original = fs.readFileSync(file, 'utf8');
  const run = (args) => {
    try { return { code: 0, out: String(execFileSync(process.execPath, [gate, ...args], { stdio: 'pipe' })) }; }
    catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
  };
  try {
    ok('schema-drift: --write over a current file is byte-identical (no reflow, so the diff is the change)',
      run(['--write']).code === 0 && fs.readFileSync(file, 'utf8') === original);

    const marked = original.replace('"shared": [\n', '"shared": [\n   "zzTestPropNothingDeclares",\n');
    ok('schema-drift: the refusal test could splice its subject in', marked !== original);
    fs.writeFileSync(file, marked);
    const refused = run(['--write']);
    const kept = fs.readFileSync(file, 'utf8') === marked;
    ok('schema-drift: --write REFUSES a regeneration that would drop a prop name, and writes nothing',
      refused.code === 2 && /refusing to write/.test(refused.out) && /zzTestPropNothingDeclares/.test(refused.out) && kept);
    ok('schema-drift: --force is the way past it, and the drop is named on the way',
      run(['--write', '--force']).code === 0 && fs.readFileSync(file, 'utf8') === original);
  } finally {
    if (fs.readFileSync(file, 'utf8') !== original) fs.writeFileSync(file, original);
  }
}


// ---- prop-probe: the exhaustive input to the prop audit (scripts/gates/prop-probe.mjs) ----
//
// The prober's TABLE is produced in a browser and cannot be asserted here. These two things can, and
// they are the two that decide whether the table means anything: that a guarded prop is probed with its
// guard SET, and that `three` is asked once per preset claiming a dial rather than once per prop.
{
  const { watchProps, deadProps, auditedProps } = await import('../../core/prop-audit.js');
  const { probesOf, surfaceOf } = await import('./prop-probe.mjs');

  // deadProps is the ONE copy of the decision: read a key, and only the unread one comes back.
  const L = watchProps({ type: 'text', text: 'x', size: 40 });
  void L.text;
  ok('prop-audit: deadProps reports the prop that was never read',
    deadProps(L, new Set(['text', 'size'])).join() === 'size');
  ok('prop-audit: deadProps says nothing about a prop outside the set it was asked about',
    deadProps(L, new Set(['text'])).length === 0);
  ok('prop-audit: deadProps ignores the author\'s own `_` annotations',
    deadProps(watchProps({ type: 'text', _why: 'a note' }), new Set(['_why'])).length === 0);
  ok('prop-audit: auditedProps scopes a type out of its own declarations',
    auditedProps('text').has('bg') && !auditedProps('text').has('size'));

  // GUARD SATISFACTION. `fitH` is declared `{ when: 'fit' }` (core/layers/text.js:10) and text.js:25
  // reads it only inside `if (L.fit && L.w)`. A probe that set `fitH` alone would report a live prop
  // dead, which is the failure mode that would make this whole gate noise.
  const fitH = probesOf('text').find((p) => p.prop === 'fitH');
  ok('prop-probe: a `when`-guarded prop is probed with its guard set', !!fitH && fitH.layer.fit != null);
  ok('prop-probe: and with the width that guard needs to do anything', !!fitH && fitH.layer.w != null);
  const caretHold = probesOf('text').find((p) => p.prop === 'caretHold');
  ok('prop-probe: the typing family is probed with `typing` set',
    !!caretHold && caretHold.layer.typing != null && caretHold.layer.caretHold != null);

  // PER-PRESET COVERAGE, and this is the acceptance test in assertion form. Five three scenes read
  // `metalness`; the one that ignored it was deviceShowcase (docs/MISTAKES.md #529). Asking one preset
  // per prop would have asked a scene that reads it and passed over the bug.
  const metal = probesOf('three').filter((p) => p.prop === 'metalness');
  ok('prop-probe: `three` asks every preset that claims a dial, not the first',
    metal.length > 1 && metal.every((p) => p.layer.three === p.at));
  ok('prop-probe: including deviceShowcase, the preset that ignored metalness',
    metal.some((p) => p.at === 'deviceShowcase'));
  ok('prop-probe: one probe layer carries exactly one target prop, on a minimal valid layer',
    probesOf('rect').every((p) => p.layer.type === 'rect' && p.layer[p.prop] !== undefined));
  ok('prop-probe: the surface covers what the type declares AND the kit props the audit scopes',
    surfaceOf('three').includes('metalness') && surfaceOf('three').includes('bg'));

  // THE ARITY TRAP, and it bit on the first run of the prober. A builder reads its props off a
  // destructured parameter (propsOf, core/props.js), and a defaulted parameter only takes its default
  // when the caller passes nothing there. So the pattern must sit AFTER every argument the dispatcher
  // passes: core/layers/index.js calls build(kit, el, L) with three and frame(kit, el, L, t, scene)
  // with five. cursor, clip and lottie put the pattern in the fifth slot, destructured `scene`, and
  // read path/clicks/speed/loop as undefined on every frame, with no error and no film to notice.
  // `Function.length` counts the parameters before the first defaulted one, which IS the pattern's
  // index, so one comparison settles it and nothing here can go stale as the engine moves.
  const DISPATCHED = { build: 3, frame: 5 };
  for (const file of fs.readdirSync(new URL('../../core/layers/', import.meta.url))) {
    if (!file.endsWith('.js') || file === 'index.js' || file === 'util.js' || file === 'vocabulary.js') continue;
    const mod = await import(`../../core/layers/${file}`);
    for (const [name, min] of Object.entries(DISPATCHED)) {
      const fn = mod[name];
      if (typeof fn !== 'function' || !/=\s*L\s*\)\s*\{/.test(String(fn))) continue;
      ok(`prop-probe: ${file} ${name}() puts its destructured pattern past all ${min} dispatched arguments`,
        fn.length >= min);
    }
  }
}
// ---- a motion keyframe may not carry a property nothing interpolates -----------------------------
//
// Found by checking a claim rather than by a gate. The research pass said a keyable anchor point was
// declined because "a group does it", and a group gives a DIFFERENT FIXED pivot by nesting, never a
// travelling one. `origin` is a static CSS transform-origin written once at build, so a key carrying it
// was accepted and read by nothing: the author writes a pivot that travels and gets one that does not.
// Every unknown key was in that position, not just origin: {"t":0,"rot":0,"zzNonsense":5} validated clean.
{
  const { resolveKeyedProps, KEYFRAME_PROPS } = await import('../../core/sequence.js');
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
  // `easeIn`/`easeOut` (core/sequence.js SIDES), so three shipped films were refused for writing the
  // CORRECT thing. A second list, written inside the check for second lists. The list is generated from
  // POSE and SIDES now, and these two assertions are what would have caught it.
  ok('keyframe: the real handle names are accepted', refuses({ easeIn: 'easyEase', easeOut: 'hang' }) === null);
  // A layer that declares w/h/track, because keying a BOX the layer never declared is a different and
  // correct refusal (there is nothing to animate from, docs/MISTAKES.md #563).
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
  const { motionAt } = await import('../../core/sequence.js');
  const pivot = motionAt([{ t: 0, rot: 0, ox: 0, oy: 50 }, { t: 1, rot: 45, ox: 100, oy: 50 }], 0.5);
  ok('anchor: the pivot travels between the keys', pivot.ox === 50 && pivot.oy === 50);
  const noPivot = motionAt([{ t: 0, rot: 0 }, { t: 1, rot: 45 }], 0.5);
  ok('anchor: a track that never keys it returns null, so the layer keeps its own origin',
    noPivot.ox === null && noPivot.oy === null);
  // Same rule as w/h: both endpoints state it or neither does. One-sided cannot mean "hold", because
  // that is the second interpretation rule docs/MISTAKES.md #563 exists to refuse.
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
  const { motionAt } = await import('../../core/sequence.js');
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
  // a number for a property the author never animated, which is exactly the class docs/MISTAKES.md #563
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
  const { EASINGS, resolveEasing } = await import('../../core/motion.js');
  const h = EASINGS.hold;
  ok('motion: hold does not travel anywhere inside its segment',
    [0, 0.01, 0.25, 0.5, 0.75, 0.99, 0.999999].every((t) => h(t) === 0));
  ok('motion: hold jumps to 1 exactly at the far key', h(1) === 1);
  ok('motion: hold is reachable by name, like every other easing',
    typeof resolveEasing('hold') === 'function' && resolveEasing('hold')(0.5) === 0);
}

// ---- arsenal --for: the trigger, not the search --------------------------------------------------
//
// The first cut ranked the arsenal against the film's own ON-SCREEN COPY, which states the subject
// ("part of Twitter") and nothing about the vocabulary, so it matched nothing and printed nothing at
// all. Silence read exactly like "you have used everything". The signal has to come from the
// registries, and this asserts that it does: a film naming one cut has decided cuts are in play, so
// the other 26 are a real omission rather than a guess.
{
  const { registries } = await import('../../core/registry.js');
  await import('../author/arsenal.mjs').catch(() => {});
  const cut = registries().find((r) => r.kind === 'cut');
  ok('arsenal --for: the cut vocabulary is reachable from the registry list', !!cut && cut.names.length > 20);
  const { execFileSync } = await import('node:child_process');
  let out = '', ranClean = true;
  try {
    out = execFileSync('node', [path.join(repoRoot, 'scripts/author/arsenal.mjs'), '--for',
      path.join(repoRoot, 'formats/scene/sample.json')], { encoding: 'utf8' });
  } catch { ranClean = false; }
  // sample.json is the reference scene every author reads first, so it is the one file guaranteed to
  // exist in a fresh clone. If it draws from no vocabulary at all the output is legitimately empty.
  ok('arsenal --for: runs against the reference scene without throwing', ranClean);
  ok('arsenal --for: says what a film has NOT reached for, or says nothing at all',
    out === '' || /has not reached for/.test(out));
}

// ---- the judge rubric: the two things a prompt template must not lose --------------------------
//
// A prompt is not code and nothing here asserted anything about it, which is how both of these came to
// be true at once. They are asserted rather than merely fixed because the rubric is prose, and prose
// regresses by being rewritten well.
{
  const { craftRubric, abRubric } = await import('./rubric.mjs');
  const craft = craftRubric({ name: 'probe', frames: 6, landscape: true, dir: '/tmp/judge' });
  const ab = abRubric({ rows: 4, landscape: true, dir: '/tmp/judge', judge: '1' });

  // ABSTENTION. The craft verdict grammar had two values, PASS and FIX, so a judge asked about a
  // dimension a STILL cannot carry had to guess, and the guess came back in the same shape as a real
  // finding. docs/MISTAKES.md #155 is the archetype: a background "matched" on one frame that was 2.5x
  // too fast in motion. scripts/author/arsenal.mjs solved the identical problem with CONFIDENT and a
  // WEAK GUESS heading (#552) and it was never carried to the judge.
  ok('rubric: the craft judge can decline a dimension a still cannot answer',
    craft.includes('CANNOT TELL'));
  ok('rubric: and is told what evidence would settle it instead of guessing',
    /strip|seam frames|rendered mp4/.test(craft));
  // The A/B sheet already had its own abstentions and must keep them: a forced choice with no TIE is
  // an instruction to invent a difference.
  ok('rubric: the blind comparison keeps TIE and NEITHER', ab.includes('TIE') && ab.includes('NEITHER'));

  // LENGTH BIAS. Dimension 6 read "crafted density; not a word-on-empty-space slide", which tells the
  // judge to score density UP, the direction an LLM judge already leans. CLAUDE.md argues the opposite
  // case at length (active versus passive whitespace) and notes no gate sees it; the rubric saw it and
  // scored against it. Asked as a question about whether the space is WORKING, a spare frame can win.
  for (const [label, sheet] of [['craft', craft], ['blind', ab]]) {
    ok(`rubric: the ${label} sheet asks what the empty part is DOING, not how much there is`,
      /doing a job/.test(sheet) && !/crafted density/.test(sheet));
  }
}

// ---- the committed GENERATED artifacts have a check, and a target that runs it ----
// registry/, docs/BLOCKS.md and site/lib/blocks.json are generated, committed, and read by outsiders.
// Each check EXISTED and none was reachable: the registry target documented `CHECK=1` in three places
// and its recipe passed no flag, so `make registry CHECK=1` regenerated and exited 0, which looks
// exactly like a passing check. registry/ and blocks.json were both stale for a week underneath it.
// These asserts hold the wiring, not the freshness: site-check runs the real comparison, and this
// fails the moment somebody drops the flag again, which is the bug that actually happened.
{
  const mk = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../Makefile'), 'utf8');
  for (const gen of ['registry', 'blocks-docs', 'blocks-json']) {
    ok(`generated: make ${gen} passes CHECK=1 through as --check`,
      new RegExp(`node scripts/site/${gen}\\.mjs \\$\\(if \\$\\(CHECK\\),--check,\\)`).test(mk));
    ok(`generated: site-check verifies ${gen}`,
      new RegExp(`node scripts/site/${gen}\\.mjs --check`).test(mk));
    ok(`generated: scripts/site/${gen}.mjs reads --check`,
      /--check/.test(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), `../site/${gen}.mjs`), 'utf8')));
  }
}
// ---- dialsOf + bindDials: one owner for a kinetic default (core/props.js, core/knobs.js) ---------
//
// A kinetic preset used to state its dials TWICE, in its own signature and again in core/knobs.js,
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
  // 2. NULL IS "CANNOT SAY", NEVER "READS NONE" (core/props.js:66-68 writes the rule down). `decode`
  // takes no options bag because animateUnits reads its dials for it, and an empty object here would
  // have deleted its three rows instead of leaving them hand-written.
  ok('dialsOf: a preset with no options bag returns null, not an empty set', dialsOf(PRESETS.decode) === null);
  ok('dialsOf: and so decode keeps its hand-written rows, defaults included',
    KNOBS.kinetic.decode.length === 3 && KNOBS.kinetic.decode[1].default === 48);

  // 3. THE REFUSALS. All three fire at module load, so they are exercised on a fixture.
  const threw = (family, presets) => { try { bindDials(family, presets); return ''; } catch (e) { return e.message; } };
  const fake = (fn) => fn;
  const contradiction = threw({ up: [{ name: 'dist', type: 'number', default: 60, desc: 'rise px' }] },
    { up: fake((u, { dist = 40 } = {}) => u) });
  ok('bindDials: a hand-written default that contradicts the signature throws', !!contradiction);
  ok('bindDials: and the refusal names BOTH numbers, so nobody has to go and look',
    /40/.test(contradiction) && /60/.test(contradiction) && /"dist"/.test(contradiction));
  ok('bindDials: a dial the signature does not read is refused, and it lists what IS read',
    /does not[\s\S]*read/.test(threw({ up: [{ name: 'dsit', type: 'number', desc: 'typo' }] },
      { up: fake((u, { dist = 40 } = {}) => u) })));
  // The half that lost `assemble`'s five dials for its whole life: a real dial with no row is
  // invisible to vawe_capabilities, to `make knobs` and to the dead-knob validator.
  ok('bindDials: a signature dial with no manifest row is refused, and named',
    /"spin"/.test(threw({ up: [] }, { up: fake((u, { spin = 65 } = {}) => u) })));
  ok('bindDials: a matching default is not a contradiction, and the row is bound',
    (() => {
      const fam = { up: [{ name: 'dist', type: 'number', default: 40, desc: 'rise px' }] };
      bindDials(fam, { up: fake((u, { dist = 40 } = {}) => u) });
      return fam.up[0].default === 40;
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

// ---- the MCP tool descriptions carry the inventory --------------------------------------------
//
// A calling model reads a tool's DESCRIPTION before every call and its OUTPUT only when it decides to
// call. So the size of the vocabulary belongs in the description, and this holds that wiring: the
// failure it guards against is silent, because a description that lost its inventory still reads as a
// perfectly good sentence.
{
  const { inventory } = await import('../../mcp/catalog.mjs');
  const inv = inventory();
  ok('mcp: the inventory reads the generated index and reports a real total',
    inv && inv.total > 100 && inv.families > 10 && inv.top.length === 6);
  const src = fs.readFileSync(path.join(repoRoot, 'mcp/server.mjs'), 'utf8');
  ok('mcp: vawe_capabilities and vawe_guide both carry it',
    (src.match(/\+ inventoryLine/g) || []).length >= 2);
  // ABSENCE MUST DEGRADE, NEVER LIE. A fresh clone has no site/lib/effects.json until `make effects`
  // has run, and a description inventing a count would be worse than one that omits it.
  ok('mcp: a missing index yields null rather than a made-up number',
    /catch \{ return null; \}/.test(fs.readFileSync(path.join(repoRoot, 'mcp/catalog.mjs'), 'utf8')));
}

// ---- effects-json `prose`: a colon or an en dash, and nothing else -----------------------------
//
// The class read `[: –]` with a literal SPACE inside it, so it matched every whitespace run and every
// intro reached the site with each word separated by a bullet. The markdown renderer was unaffected,
// which is exactly why it survived: two renderers read one intro and only one of them was ever looked at.
{
  const src = fs.readFileSync(path.join(repoRoot, 'scripts/site/effects-json.mjs'), 'utf8');
  // The DECLARATION, not the file: the comment above this fix quotes the broken class, and a whole-file
  // search would read the explanation as the bug.
  ok('effects-json: `prose` splits on a colon or an en dash, not on whitespace',
    /\[:–\]/.test(src) && !/\[: –\]/.test(src.replace(/^\s*\/\/.*$/gm, '')));
  // COUNTING BULLETS IS THE WRONG SIGNAL and the first cut of this used it: an intro that genuinely
  // uses several colons is correctly bulleted several times, and five real ones failed. The tell of the
  // bug is a segment that is ONE WORD, because it split between words rather than at punctuation.
  const site = JSON.parse(fs.readFileSync(path.join(repoRoot, 'site/lib/effects.json'), 'utf8'));
  const shredded = site.list.filter((f) => {
    const parts = (f.intro || '').split(' · ');
    return parts.length > 4 && parts.filter((p) => p.trim().split(/\s+/).length === 1).length > parts.length / 2;
  });
  ok(`effects-json: no intro is split between its words${shredded.length ? ': ' + shredded.map((f) => f.id).join(', ') : ''}`,
    shredded.length === 0);
}

console.log(`\nlib-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
