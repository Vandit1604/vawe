// scripts/lib-test.mjs — fast pure-JS asserts for the motion primitives in core/motion.js.
// No browser needed (the primitives are pure). Run: node scripts/lib-test.mjs  (make lib-test)
import { clamp01, lerp, interpolate, spring, springSettle, track, rise, fade, pop, slide, easeOutCubic,
  random, noise, stagger, hashSeed, resolveEasing, EASINGS, motionDefaults, DEFAULT_MOTION,
  sequence, wipe, circleWipe, clockWipe, shake, pulse, accel, decel, speedRamp, trackingFor, springEase } from '../../core/motion.js';
import { unitProgress, PRESETS } from '../../core/type.js';
import { PRESENTATIONS, cutStyle } from '../../core/cuts.js';
import { cameraAt, motionAt } from '../../core/sequence.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeArea, DESTINATION_NAMES, nativeAspect, sceneDims } from '../../core/safe.js';
import { resolveFilter, parseColor, FILTER_PRESETS } from '../../core/filters.js';
import { presetSpec, pulseOpacity, alphaMix, liftWhite, cycleHue, flashEnvelope } from '../../core/layers/glow.js';
import { lerpPoints, pointsToD, bestRotation, rotatePoints, morphD } from '../../core/path-morph.js';
import { beamAngle, shinePos, beamConic } from '../../core/layers/beam.js';
import { typedLen } from '../../core/layers/text.js';
import { slowPush, diveIn, panFollow, orbit, multiPhase, buildCameraMove, CAMERA_MOVE_NAMES } from '../../core/camera-moves.js';
import { capWords, wordU, lineU, CAP_STYLES } from '../../core/captions.js';
import { BLOCKS } from '../../blocks/index.mjs';
import { SHADER_FX } from '../../core/stings.js';
import { AMBIENT_FX } from '../../core/shaders-ambient.js';
import { resolveComposite, LOOKS, LOOK_NAMES, isLook, lookName } from '../../core/looks.js';
import { luma, BAYER4, bayerAt, cellAverage, hash01, canvasFxKey, CANVAS_FX_NAMES, resolveFxSpec, CANVAS_FX_PRESETS } from '../../core/canvas-fx.js';
import { CATALOG } from '../../blocks/catalog.mjs';
import { CUES, renderCue, musicBed, normalize, biquad, SR } from '../../core/audio-kit.mjs';
import { onsetEnvelope, estimateTempo, estimatePhase, beatGrid, snapToBeat, downbeats } from '../../core/beats.js';
import { lift } from '../../core/motion.js';
import { opacityEnvelope, ANIM } from '../../core/clips.js';
import { FX_PARAMS, bgOptKeys, bgOverErrors, bgPreset, applyBgOver } from '../../core/backgrounds.js';
import { bandEnergies, sampleAt, BANDS } from '../../core/spectrum.js';
import { ransomGlyph, ransomSwatches, RANSOM_FACES } from '../../core/ransom.js';
import { boundaryMechanism, lowerScene } from '../../core/transitions-lower.js';
import { SEAM_FX } from '../../core/seams.js';
import { SEAM_CUE } from '../../core/audio-cues.js';
import { RESAMPLE_FX } from '../../core/resample-fx.js';
import { RAYMARCH_FX } from '../../core/raymarch-fx.js';
import { THREE_FX } from '../../core/three-scenes.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let pass = 0, fail = 0;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('✗ ' + name); } };

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

// seeded randomness — deterministic, in-range, seed-sensitive
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
ok('resolveEasing unknown → fallback', resolveEasing('nope') === easeOutCubic);
ok('EASINGS linear', EASINGS.linear(0.42) === 0.42);

// motionDefaults
ok('motionDefaults resolves easing to fn', typeof motionDefaults({ motion: { easing: 'easeOutQuart' } }).easing === 'function');
ok('motionDefaults falls back to DEFAULT', motionDefaults(undefined).bounce === DEFAULT_MOTION.bounce);
ok('motionDefaults keeps overrides', motionDefaults({ motion: { enter: 99 } }).enter === 99);
ok('motionDefaults durationScale default 1', motionDefaults({ motion: {} }).durationScale === 1);

// sequencing — segments with transition windows (trans=0.4 default)
const segs = [{ name: 's1', dur: 2 }, { name: 's2', dur: 2 }, { name: 's3', dur: 1 }];
ok('sequence picks segment', sequence(30, 30, segs).name === 's1');            // 1s → s1
ok('sequence second segment', sequence(90, 30, segs).name === 's2');           // 3s → s2
ok('sequence enter ramps from 0', approx(sequence(0, 30, segs).enter, 0));     // start of s1
ok('sequence enter completes', sequence(30, 30, segs).enter === 1);            // 1s in → past 0.4 trans
ok('sequence exit 0 mid-segment', sequence(30, 30, segs).exit === 0);          // 1s in, not near end
ok('sequence exit ramps at end', sequence(59, 30, segs).exit > 0);             // ~1.97s into s1 (dur 2)
ok('sequence active in [0,1]', (() => { for (let n = 0; n < 150; n += 3) { const a = sequence(n, 30, segs).active; if (a < 0 || a > 1) return false; } return true; })());
ok('sequence deterministic', sequence(77, 30, segs).active === sequence(77, 30, segs).active);
// holdLast (default): the LAST segment never exits — the ending holds through the final frame
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
// inset(top right bottom left) — the side whose inset SHRINKS is the side the reveal moves toward.
ok('wipe-right grows rightward from the left edge', ANIM['wipe-right'](0.5).clipPath === 'inset(0 50% 0 0)');
ok('wipe-left grows leftward from the right edge', ANIM['wipe-left'](0.5).clipPath === 'inset(0 0 0 50%)');
ok('wipe-down grows downward from the top edge', ANIM['wipe-down'](0.5).clipPath === 'inset(0 0 50% 0)');
ok('wipe-up grows upward from the bottom edge', ANIM['wipe-up'](0.5).clipPath === 'inset(50% 0 0 0)');
ok('plain wipe is the default direction, rightward', ANIM.wipe(0.5).clipPath === ANIM['wipe-right'](0.5).clipPath);
ok('every wipe direction is a distinct reveal', new Set(['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down'].map((n) => ANIM[n](0.5).clipPath)).size === 4);

// ---- background `opts`: a knob a window declares must be READ, or refused by name (MISTAKES #157).
// The accepted set is derived from the fx implementations, so these also pin that the derivation is
// live: rename the property an fx reads and the vocabulary must follow it.
ok('bg opts vocabulary is derived from the fx implementation (liquid)', ['scale', 'speed', 'warp', 'edge0', 'edge1', 'gloss', 'res'].every((k) => FX_PARAMS.liquid.includes(k)));
ok('bg opts vocabulary is per preset (a dots preset has no `scale`)', !bgOptKeys(bgPreset('paperDots')).includes('scale') && bgOptKeys(bgPreset('paperDots')).includes('spacing'));
const bgOver = (preset, over) => { try { return applyBgOver(bgPreset(preset), over); } catch { return null; } };
ok('bg opts reach the fx (liquid scale/speed/edge0)', (() => { const s = bgOver('liquid', { scale: 1.6, speed: 0.3, edge0: 0.4 }); const fx = s && s.fx.find((f) => f.type === 'liquid'); return !!fx && fx.scale === 1.6 && fx.speed === 0.3 && fx.edge0 === 0.4; })());
ok('bg opts meta knobs still scale the baked numbers', (() => { const s = bgOver('paperDots', { dotAlpha: 0.5, grain: 0.2 }); const d = s && s.fx.find((f) => f.type === 'dots'), g = s && s.fx.find((f) => f.type === 'grain'); return !!d && d.peakAlpha === 0.5 && g.alpha === 0.2; })());
ok('a bg opt no fx here reads is REFUSED, not dropped', bgOverErrors(bgPreset('liquid'), { dotAlpha: 0.2 }, 'bg[0]').length === 1 && bgOver('liquid', { dotAlpha: 0.2 }) === null);

// kinetic typography — unitProgress staggering + presets (pure)
ok('unitProgress unit 0 starts at 0', approx(unitProgress(0, 0, 3, { each: 0.5, stagger: 0.06 }), 0));
ok('unitProgress later unit delayed', unitProgress(0.06, 1, 3, { each: 0.5, stagger: 0.06 }) === 0);
ok('unitProgress completes', unitProgress(2, 2, 3, { each: 0.5, stagger: 0.06 }) === 1);
ok('unitProgress clamped [0,1]', (() => { for (let t = -1; t < 3; t += 0.1) { const u = unitProgress(t, 1, 4); if (u < 0 || u > 1) return false; } return true; })());
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
// its mask at u=0. These assert the invariant, not the literal string — the old assertion pinned
// "(0.00px)" and so failed the moment the unit was corrected, which says nothing about identity.
ok('preset riseClip identity at 1', parseFloat(PRESETS.riseClip(1).transform.match(/-?[\d.]+/)[0]) === 0);
ok('preset riseClip travels in % (scales with type size)', PRESETS.riseClip(0).transform.includes('%'));
ok('preset riseClip starts fully behind its mask', parseFloat(PRESETS.riseClip(0).transform.match(/-?[\d.]+/)[0]) >= 110);
ok('presets deterministic (stretch)', JSON.stringify(PRESETS.stretch(0.37)) === JSON.stringify(PRESETS.stretch(0.37)));

// shake / pulse — deterministic, decaying, zero before the hit
ok('shake zero before hit', shake(-0.1).x === 0 && shake(0).y === 0);
ok('shake deterministic', shake(0.2, { seed: 5 }).x === shake(0.2, { seed: 5 }).x);
ok('shake seeds differ', shake(0.2, { seed: 5 }).x !== shake(0.2, { seed: 9 }).x);
ok('shake decays', Math.abs(shake(2).x) < Math.abs(shake(0.05).x) + 1e-9);
ok('pulse centered', approx(pulse(0), 1, 0.05) && pulse(0.6) !== pulse(0.3));

// velocity ramping — monotone, endpoints exact, peak-velocity placement honored
ok('accel endpoints', accel(0) === 0 && accel(1) === 1);
ok('accel slow start', accel(0.3) < 0.3);
ok('decel fast start', decel(0.3) > 0.3);
ok('speedRamp endpoints', speedRamp(0) === 0 && speedRamp(1) === 1);
ok('speedRamp slow at both ends', speedRamp(0.1) < 0.1 && speedRamp(0.9) > 0.9);
ok('speedRamp monotone', (() => { let prev = 0; for (let t = 0; t <= 1.001; t += 0.01) { const v = speedRamp(t); if (v < prev - 1e-9) return false; prev = v; } return true; })());
ok('speedRamp peak shifts', speedRamp(0.3, { peak: 0.2 }) > speedRamp(0.3, { peak: 0.8 }));
ok('EASINGS has ramps', typeof EASINGS.ramp === 'function' && typeof EASINGS.rush === 'function' && typeof EASINGS.brake === 'function');

// optical tracking — em string, monotone tighter as size grows
ok('trackingFor em string', trackingFor(16).endsWith('em'));
ok('trackingFor tightens', parseFloat(trackingFor(120)) < parseFloat(trackingFor(16)));
ok('trackingFor endpoints', Math.abs(parseFloat(trackingFor(14)) - -0.008) < 1e-6 && Math.abs(parseFloat(trackingFor(120)) - -0.022) < 1e-6);

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
}

// timeline evaluators (core/sequence.js) — pure math lifted out of scene.html
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
}

// ---- easing registry contract ----------------------------------------------------------------
// Every named easing must be a real 0->1 curve. Asserted across the WHOLE registry, not just the
// new ones: a curve that does not land on 1 silently leaves elements short of their final position.
{
  const { EASINGS } = await import('../../core/motion.js');
  // These curves leave [0,1] BY DESIGN: `back` dips below 0 to anticipate, `elastic`/`spring` ring
  // past 1 before settling. The f(0)=0 / f(1)=1 checks below still apply to them — overshooting is
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
  ok(`easings: all ${Object.keys(EASINGS).length} land 0->1${bad.length ? ' — ' + bad.slice(0, 4).join(', ') : ''}`, bad.length === 0);
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
  // phone feed's caption strip just for being taller than it is wide — the bug this module exists for.
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

  // tiktok must still reproduce the repo's existing portrait box — those are the only platform numbers
  // with provenance, so carrying them over as fractions must not quietly change them.
  const tt = safeArea(1080, 1920, 'tiktok');
  ok(`safe: tiktok 9:16 keeps the historic chrome (y0=${tt.y0} y1=${tt.y1} x1=${tt.x1})`,
    tt.y0 === 240 && tt.y1 === 1340 && tt.x1 === 900);
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
  ok(`safe: all ${DESTINATION_NAMES.length} destinations yield a valid box${bad.length ? ' — ' + bad.join(', ') : ''}`, bad.length === 0);
  ok('safe: nativeAspect is null for the canvas-agnostic ones',
    nativeAspect('web') === null && nativeAspect('feed') === null && nativeAspect('tiktok') === '9:16');
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
  // (captions with no lines is correctly []) — that is the registry working, not a bug to assert on.
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
  ok(`registry: all ${CATALOG.length} manifest rows resolve + build${bad.length ? ' — ' + bad.slice(0, 3).join(' · ') : ''}`, bad.length === 0);

  // determinism is the product; a block that reads a clock or Math.random breaks every render.
  const drift = CATALOG.filter((e) => BLOCKS[e.family]).filter((e) => {
    try { return JSON.stringify(build(e, { x: 10, start: 1 })) !== JSON.stringify(build(e, { x: 10, start: 1 })); }
    catch { return false; }
  });
  ok(`registry: every block is deterministic${drift.length ? ' — ' + drift.map((e) => e.name).join(', ') : ''}`, drift.length === 0);

  // The site's media is DERIVED but COMMITTED, which is a deliberate trade: generating it at deploy
  // would mean Chromium inside a node:22-alpine image to buy only what this assert buys for free.
  // The cost of committing derived output is that it can go stale silently — add a block, forget
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
    ok(`registry: all ${gridRows.length} grid blocks have a poster + scene${noMedia.length ? ` — run \`make blocks-scenes\` for: ${noMedia.slice(0, 4).join(', ')}` : ''}`,
      noMedia.length === 0);
    // The frame rect is what keeps the poster and the live render framed identically. A block with a
    // scene but no rect renders nothing on the card at all, which is a silent, invisible failure.
    const framesPath = path.join(repoRoot, 'site/lib/block-frames.json');
    const framesOk = fs.existsSync(framesPath) ? JSON.parse(fs.readFileSync(framesPath, 'utf8')) : {};
    const noFrame = gridRows.filter((e) => !framesOk[e.name]).map((e) => e.name);
    ok(`registry: all ${gridRows.length} grid blocks have a poster frame rect${noFrame.length ? ` — run \`make blocks-scenes\` for: ${noFrame.slice(0, 4).join(', ')}` : ''}`,
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
  ok('filter: null safe', JSON.stringify(resolveFilter(null)) === JSON.stringify({ filter: '', overlay: null }));
  ok('filter: parseColor hex3 + rgb + junk', JSON.stringify(parseColor('#7cf')) === '[119,204,255]' && JSON.stringify(parseColor('rgb(1, 2, 3)')) === '[1,2,3]' && parseColor('nope') === null);
  ok('filter: all six presets exist', ['duotone','tritone','gradientMap','posterize','sepia','vignette'].every((k) => FILTER_PRESETS[k]));
  // chromaGlow: soft neon bloom in the glyph shape (pure CSS drop-shadow stack, no SVG)
  ok('filter: chromaGlow is a pure-css glow preset', FILTER_PRESETS.chromaGlow && FILTER_PRESETS.chromaGlow.kind === 'css' && FILTER_PRESETS.chromaGlow.mode === 'glow');
  ok('filter: chromaGlow is a smooth white drop-shadow bloom (no hard fringe)', (() => { const f = resolveFilter('chromaGlow').filter; return f.startsWith('drop-shadow(') && (f.match(/drop-shadow/g) || []).length >= 4 && f.includes('255,255,255') && !/drop-shadow\(0 -?\d+px/.test(f); })());
  ok('filter: chromaGlow size scales the bloom radii', (() => { const big = resolveFilter('chromaGlow:2').filter; return big.includes('80.0px') && !resolveFilter('chromaGlow:1').filter.includes('80.0px'); })());
  ok('filter: chromaGlow deterministic + no SVG url', resolveFilter('chromaGlow:1.5').filter === resolveFilter('chromaGlow:1.5').filter && !resolveFilter('chromaGlow').filter.includes('url('));

  // glow presets (core/layers/glow.js)
  ok('glow: five presets yield backgrounds', ['bloom','halation','diffusion','rimLight','spotlight'].every((n) => typeof presetSpec(n, {}).background === 'string'));
  ok('glow: unknown preset -> null (classic glow fallback)', presetSpec('nope') === null);
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
}

// ---- shader stings ----
// The overlay itself is GL, so JS asserts the contract around it: one name list, one shader branch
// per name, and the schema exposing exactly that vocabulary — the three surfaces that can drift.
{
  const src = fs.readFileSync(path.join(repoRoot, 'core', 'stings.js'), 'utf8');
  ok(`stings: ${SHADER_FX.length} effects, all unique`, SHADER_FX.length > 0 && new Set(SHADER_FX).size === SHADER_FX.length);
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('const VERT'));
  const noBranch = SHADER_FX.map((_, i) => i).filter((i) => !frag.includes(`u_fx == ${i}`));
  ok(`stings: FRAG has a branch for every effect${noBranch.length ? ' — missing ' + noBranch.map((i) => SHADER_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok('stings: no shader branch past the end of the list', !frag.includes(`u_fx == ${SHADER_FX.length}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  const en = schema.fields.stings.item.fx.enum;
  ok('stings: schema fx enum is exactly SHADER_FX, in order', JSON.stringify(en) === JSON.stringify(SHADER_FX));
  // EVERY branch keys off pp/bell (progress) — a sting that ignores progress freezes mid-cut, which
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
  ok(`stings: all ${SHADER_FX.length} branches depend on progress${frozen.length ? ' — frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
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
  ok(`three: every name in THREE_FX has a SCENES implementation${missing.length ? ' — missing: ' + missing.join(', ') : ''}${extra.length ? ' — orphaned: ' + extra.join(', ') : ''}`,
     missing.length === 0 && extra.length === 0);
  const BANNED = ['THREE.Clock', 'T().Clock', 'performance.now', 'Date.now', 'new Date', 'Math.random', 'requestAnimationFrame', 'AnimationMixer'];
  const used = BANNED.filter((b) => code.includes(b));
  ok(`three: no wall-clock or unseeded randomness${used.length ? ' — found: ' + used.join(', ') : ''}`, used.length === 0);
  // A scene that never reads t is a still image rendered the most expensive way available.
  const frozen = THREE_FX.filter((n) => {
    const i = code.indexOf(`  ${n}(L, colors) {`);
    if (i < 0) return true;
    const body = code.slice(i, code.indexOf('\n  },', i));
    return !/pose\(t\b/.test(body);
  });
  ok(`three: every scene poses from t${frozen.length ? ' — frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
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
  ok(`raymarch: map() dispatches every scene 0..${RAYMARCH_FX.length - 2}${noMap.length ? ' — missing ' + noMap.map((i) => RAYMARCH_FX[i]).join(', ') : ''}`, noMap.length === 0);
  // every scene needs its own distance function, named for it, and every one must MOVE: a raymarched
  // subject that ignores time is a still image rendered the most expensive way available.
  const frozen = RAYMARCH_FX.filter((n) => {
    const fn = 'map' + n.charAt(0).toUpperCase() + n.slice(1);
    const i = frag.indexOf('float ' + fn);
    if (i < 0) return true;
    const body = frag.slice(i, frag.indexOf('\n}', i));
    return !body.includes('u_time');
  });
  ok(`raymarch: every scene has a named distance field that depends on time${frozen.length ? ' — missing/frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('raymarch: schema enum is exactly RAYMARCH_FX, in order', JSON.stringify(schema.fields.layers.item.raymarch.enum) === JSON.stringify(RAYMARCH_FX));
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
  ok(`resample: FRAG has a branch for effects 0..${RESAMPLE_FX.length - 2}${noBranch.length ? ' — missing ' + noBranch.map((i) => RESAMPLE_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok(`resample: last effect (${RESAMPLE_FX[RESAMPLE_FX.length - 1]}) is the trailing else`, !frag.includes(`u_fx == ${RESAMPLE_FX.length - 1}`));
  const branchAt = (i) => {
    const start = i === RESAMPLE_FX.length - 1 ? frag.lastIndexOf('} else {') : frag.indexOf(`u_fx == ${i}`);
    const next = i === RESAMPLE_FX.length - 1 ? frag.length : frag.indexOf('} else', start + 4);
    return frag.slice(start, next > start ? next : frag.length);
  };
  const blind = RESAMPLE_FX.filter((_, i) => !branchAt(i).includes('texture2D'));
  ok(`resample: every effect samples the source texture${blind.length ? ' — blind: ' + blind.join(', ') : ''}`, blind.length === 0);
  // amount is the one dial every effect exposes; a branch that ignores it cannot be animated,
  // which is what `amount: [from, to]` exists for.
  const deaf = RESAMPLE_FX.filter((_, i) => !branchAt(i).includes('u_amt'));
  ok(`resample: every effect responds to amount${deaf.length ? ' — deaf: ' + deaf.join(', ') : ''}`, deaf.length === 0);
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
  ok(`ambient: FRAG has a branch for effects 0..${AMBIENT_FX.length - 2}${noBranch.length ? ' — missing ' + noBranch.map((i) => AMBIENT_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok(`ambient: last effect (${AMBIENT_FX[AMBIENT_FX.length - 1]}) is the trailing else, no branch past it`, !frag.includes(`u_fx==${AMBIENT_FX.length - 1}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  ok('ambient: schema shader enum is exactly AMBIENT_FX, in order', JSON.stringify(schema.fields.layers.item.shader.enum) === JSON.stringify(AMBIENT_FX));
  // EVERY ambient look must animate — one that ignores t is a frozen still on a layer whose entire
  // contract is "loops smoothly". Derived from AMBIENT_FX with a NAMED exemption set, because the
  // hand-typed wave list covered 8 of 17 and every appended effect landed outside it uncovered.
  const AMBIENT_EXEMPT = new Set(['barrel']);   // a static lens vignette, motionless by design
  const still = AMBIENT_FX.filter((name) => {
    const i = AMBIENT_FX.indexOf(name);
    const start = i === AMBIENT_FX.length - 1 ? frag.lastIndexOf('} else {') : frag.indexOf(`u_fx==${i}`);
    const nextI = frag.indexOf(`u_fx==${i + 1}`);
    const body = frag.slice(start, nextI > start ? nextI : start + 600);
    return !/\bt\b/.test(body);
  });
  const stillReal = still.filter((n) => !AMBIENT_EXEMPT.has(n));
  ok(`ambient: all ${AMBIENT_FX.length} looks animate (exempt: ${[...AMBIENT_EXEMPT].join(', ')})${stillReal.length ? ' — frozen: ' + stillReal.join(', ') : ''}`, stillReal.length === 0);
  // matrixDecode (wave 4, the trailing else) is digital rain — its heads must fall with t
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
  // default the glow keeps the SOURCE's own colours (id `f-bloom-src`) — a real neon bleeds the image's
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
  ok('looks: pipeline order — grade before glow in neon', neon.filter.indexOf('saturate(') < neon.filter.indexOf('url(#f-bloom'));
  ok('looks: every look resolves to a filter or overlays', LOOK_NAMES.every((n) => { const r = resolveComposite(n); return r && (r.filter.length > 0 || r.overlays.length > 0); }));
  ok('looks: deterministic', resolveComposite('vhs', {}, 0.6).filter === resolveComposite('vhs', {}, 0.6).filter);
}

// ---- canvas FX (core/canvas-fx.js) — pure pixel math (the DOM passes bake in the browser) ----
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

// ---- audio kit (core/audio-kit.mjs) — synthesized cues must be deterministic + audible ----
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

// ---- beat detection (core/beats.js) — the grid a beat-matched edit is built on ----
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
  // silence has no pulse — the detector must say so rather than invent a grid to snap cuts to
  const { env: envQ, hopSeconds: hq } = onsetEnvelope(new Float32Array(SR * 4), SR);
  ok('beats: silence yields no confident tempo', estimateTempo(envQ, hq).confidence < 1.6);
  // snapping must respect the author's intent
  const bts = [0, 0.5, 1, 1.5, 2];
  ok('beats: snapToBeat pulls a near miss onto the beat', snapToBeat(1.04, bts, 0.12) === 1);
  ok('beats: snapToBeat REFUSES to drag a far cut', snapToBeat(1.28, bts, 0.12) === 1.28);
  ok('beats: snapToBeat is a no-op with no grid', snapToBeat(3.3, [], 0.12) === 3.3);
  ok('beats: downbeats take every 4th beat', downbeats([0, 1, 2, 3, 4, 5, 6, 7, 8], 4).join() === '0,4,8');
  // the `lift` entrance must actually travel — pop only scaled 14%, which read as flat
  ok('motion: lift travels further than pop at t=0', parseFloat(String(lift(0).transform).match(/scale\(([\d.]+)/)[1]) < 0.75);
  ok('motion: lift settles to identity', lift(1).transform.includes('scale(1.0000)'));
}

// ---- opacity envelope (core/clips.js) — eased, and safe to cross-dissolve with ----
{
  ok('envelope: not linear (an entrance decelerates)', opacityEnvelope(0.25, 0) > 0.4);
  ok('envelope: 0 at the start, 1 when settled', opacityEnvelope(0, 0) === 0 && opacityEnvelope(1, 0) === 1);
  ok('envelope: gone at the end of an exit', opacityEnvelope(1, 1) === 0);
  ok('envelope: monotonic in', (() => { let p = -1; for (let t = 0; t <= 1.001; t += 0.05) { const v = opacityEnvelope(t, 0); if (v < p - 1e-9) return false; p = v; } return true; })());
  // THE invariant: a handoff (A exiting while B enters, matched windows) holds constant density.
  // Without it the blend brightens in the middle and reads as muddy — measured 1.71 before the fix.
  ok('envelope: a matched handoff sums to exactly 1', (() => {
    for (let t = 0; t <= 1.001; t += 0.05) {
      const leaving = opacityEnvelope(1, t), arriving = opacityEnvelope(t, 0);
      if (Math.abs(leaving + arriving - 1) > 1e-9) return false;
    } return true; })());
}

// ---- sceneDims (core/safe.js) — how big is the frame, asked once ----
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

// ---- spectrum (core/spectrum.js) — the audio-reactive bake is a pure transform ----
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
  // Math.random or the clock the note would flicker frame to frame — this is the guard for that.
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
  // Auto sound-design must cue EVERY seam fx — a seam with no mapping falls back to a bare whoosh and
  // reads wrong (a bloom-iris should not swoosh). This gate is why `data.seams` stopped rendering silent
  // (audio derived cuts+stings only). If a new SEAM_FX ships without a SEAM_CUE row, this fails loudly.
  ok('audio: SEAM_CUE covers every SEAM_FX (no silent seam)', SEAM_FX.every((fx) => typeof SEAM_CUE[fx] === 'string'));
  ok('audio: every SEAM_CUE voicing resolves to a baked wav', Object.values(SEAM_CUE).every((c) => c === 'whoosh' || c === 'reveal' || c in CUES));
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
// ---- path-morph (true shape morph) — pure maths, no DOM ------------------------------------------
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
  ok('buildCameraMove resolves by name', buildCameraMove({ move: 'slowPush', start: 0, dur: 2 }).length === 2);
  ok('buildCameraMove throws on unknown', (() => { try { buildCameraMove({ move: 'nope' }); return false; } catch { return true; } })());
  ok('CAMERA_MOVE_NAMES lists the generators', CAMERA_MOVE_NAMES.includes('diveIn') && CAMERA_MOVE_NAMES.includes('panFollow'));
}

console.log(`\nlib-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
