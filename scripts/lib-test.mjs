// scripts/lib-test.mjs — fast pure-JS asserts for the motion primitives in core/lib.js.
// No browser needed (the primitives are pure). Run: node scripts/lib-test.mjs  (make lib-test)
import { clamp01, lerp, interpolate, spring, springSettle, track, rise, fade, pop, slide, easeOutCubic,
  random, noise, stagger, hashSeed, resolveEasing, EASINGS, motionDefaults, DEFAULT_MOTION,
  sequence, wipe, circleWipe, clockWipe, shake, pulse, accel, decel, speedRamp, trackingFor } from '../core/lib.js';
import { unitProgress, PRESETS } from '../core/kinetic.js';
import { PRESENTATIONS, cutStyle } from '../core/transitions.js';
import { cameraAt, motionAt } from '../core/timeline.js';

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

// timeline evaluators (core/timeline.js) — pure math lifted out of scene.html
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

console.log(`\nlib-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
