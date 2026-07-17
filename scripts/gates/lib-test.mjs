// scripts/lib-test.mjs — fast pure-JS asserts for the motion primitives in core/motion.js.
// No browser needed (the primitives are pure). Run: node scripts/lib-test.mjs  (make lib-test)
import { clamp01, lerp, interpolate, spring, springSettle, track, rise, fade, pop, slide, easeOutCubic,
  random, noise, stagger, hashSeed, resolveEasing, EASINGS, motionDefaults, DEFAULT_MOTION,
  sequence, wipe, circleWipe, clockWipe, shake, pulse, accel, decel, speedRamp, trackingFor } from '../../core/motion.js';
import { unitProgress, PRESETS } from '../../core/type.js';
import { PRESENTATIONS, cutStyle } from '../../core/cuts.js';
import { cameraAt, motionAt } from '../../core/sequence.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeArea, DESTINATION_NAMES, nativeAspect } from '../../core/safe.js';
import { resolveFilter, parseColor, FILTER_PRESETS } from '../../core/filters.js';
import { presetSpec, pulseOpacity, alphaMix, liftWhite } from '../../core/layers/glow.js';
import { capWords, wordU, lineU, CAP_STYLES } from '../../core/captions.js';
import { BLOCKS } from '../../blocks/index.mjs';
import { SHADER_FX } from '../../core/stings.js';
import { CATALOG } from '../../blocks/catalog.mjs';

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
ok('preset riseClip identity at 1', PRESETS.riseClip(1).transform.includes('(0.00px)'));
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
    'easeInOutElastic', 'spring', 'springStiff', 'spring-bouncy', 'spring-stiff', 'settle']);
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
  // would mean ~4 minutes of rendering plus Chromium, ffmpeg and Go inside a node:22-alpine image, to
  // buy only what this assert buys for free. The cost of committing derived output is that it can go
  // stale silently — add a block, forget `make blocks-media`, ship a card with a broken image. So the
  // gate stands in for the build step: every registry entry must have both its still and its clip.
  // This runs in lib-test because lib-test runs on pre-push, which is the last moment drift is cheap.
  {
    const mediaDir = path.join(repoRoot, 'site/public/assets/blocks');
    const gridRows = CATALOG.filter((e) => !e.overlay);
    const noMedia = gridRows.filter((e) => {
      const safe = e.name.replace(/[^a-z0-9.]/gi, '_');
      return !fs.existsSync(path.join(mediaDir, `${safe}.png`)) || !fs.existsSync(path.join(mediaDir, `${safe}.mp4`));
    }).map((e) => e.name);
    ok(`registry: all ${gridRows.length} grid blocks have a still + clip${noMedia.length ? ` — run \`make catalog && make blocks-media\` for: ${noMedia.slice(0, 4).join(', ')}` : ''}`,
      noMedia.length === 0);
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

  // glow presets (core/layers/glow.js)
  ok('glow: five presets yield backgrounds', ['bloom','halation','diffusion','rimLight','spotlight'].every((n) => typeof presetSpec(n, {}).background === 'string'));
  ok('glow: unknown preset -> null (classic glow fallback)', presetSpec('nope') === null);
  ok('glow: theme-adaptive by default', presetSpec('bloom', {}).background.includes('var(--accent)'));
  ok('glow: explicit tint threads through', presetSpec('bloom', { color: '#123456' }).background.includes('#123456'));
  ok('glow: cx/cy move the light centre', presetSpec('bloom', { cx: 0.25, cy: 0.75 }).background.includes('at 25.0% 75.0%'));
  ok('glow: pulse pure in t + amplitude clamped', pulseOpacity(1.3, 2) === pulseOpacity(1.3, 2)
    && (() => { for (let t = 0; t < 4; t += 0.05) { const o = pulseOpacity(t, 2, 9); if (o < 0.7 || o > 1) return false; } return true; })());
  ok('glow: helpers', alphaMix('red', 0.5) === 'color-mix(in srgb, red 50%, transparent)' && liftWhite('red', 70) === 'color-mix(in srgb, red 30%, white)');

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
  ok(`stings: ${SHADER_FX.length} effects, all unique`, SHADER_FX.length === 32 && new Set(SHADER_FX).size === SHADER_FX.length);
  const frag = src.slice(src.indexOf('const FRAG'), src.indexOf('const VERT'));
  const noBranch = SHADER_FX.map((_, i) => i).filter((i) => !frag.includes(`u_fx == ${i}`));
  ok(`stings: FRAG has a branch for every effect${noBranch.length ? ' — missing ' + noBranch.map((i) => SHADER_FX[i]).join(', ') : ''}`, noBranch.length === 0);
  ok('stings: no shader branch past the end of the list', !frag.includes(`u_fx == ${SHADER_FX.length}`));
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'formats', 'scene', 'schema.json'), 'utf8'));
  const en = schema.fields.stings.item.fx.enum;
  ok('stings: schema fx enum is exactly SHADER_FX, in order', JSON.stringify(en) === JSON.stringify(SHADER_FX));
  // every branch keys off pp/bell (progress) — a branch that ignores progress would freeze mid-cut
  const wave2 = ['crossWarp', 'domainWarp', 'sdfIris', 'vortex', 'ridgedBurn', 'lens', 'thermal', 'whipPan', 'chromaticSplit', 'dispersion'];
  const frozen = wave2.filter((name) => {
    const i = SHADER_FX.indexOf(name);
    const next = SHADER_FX[i + 1] ? frag.indexOf(`u_fx == ${i + 1}`) : frag.length;
    const body = frag.slice(frag.indexOf(`u_fx == ${i}`), next);
    return !(body.includes('pp') || body.includes('bell'));
  });
  ok(`stings: wave-2 branches all depend on progress${frozen.length ? ' — frozen: ' + frozen.join(', ') : ''}`, frozen.length === 0);
}

console.log(`\nlib-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
