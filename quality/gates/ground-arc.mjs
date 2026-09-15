#!/usr/bin/env node
// quality/gates/ground-arc.mjs: does the GROUND flip white/dark on purpose, and does it CARRY across
// a join, or does it flash.
//
//   make ground-arc D=films/scene/<film>.json   ·   node quality/gates/ground-arc.mjs <film> [--json]
//
// WHY THIS AND NOT `make judge`. The judge rubric grades frames one at a time; a ground that whites
// out for one beat and blacks out for the next reads fine on EVERY still it is asked to score, because
// each still is internally consistent. The flip itself, whether it is a planned beat change carried
// deliberately or an accidental flash, only exists between frames, and nothing pre-render reads that
// axis. This is a PRE-RENDER gate: it samples renderFrame(n) through harness/lib/frame-sampler.mjs,
// never a rendered mp4, so it runs inside `make check`.
//
// Known truth this reproduces (the owner's own report on vawe-flow-2's rendered pixels, top-strip
// luma): white 0s, dark 1.5-4.5s, white 5-7s, dark 7.5-9s, white 9.5-11s. Four flips.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleScene, luminanceOf } from '../../harness/lib/frame-sampler.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Hysteresis band, not one threshold: a single cut point would call a mid-crossfade sample a flip on
// its own, one frame after being "light" and one frame before being "dark" again. A sample landing
// between the two bands is genuinely ambiguous (a crossfade in progress) and is skipped rather than
// forced into a side it is not yet on.
export const LIGHT = 150, DARK = 105;
// A flip counts as CARRIED across a join when a declared schedule point (a bg[] boundary, a recipe's
// `at`, or a transition's `t`) sits within this many seconds of it. Adjacent bg windows in this film
// sit 0.05-0.15s apart and its own recipe `at`s land 0.3-0.9s from the measured flip, so 0.75s is
// generous to the plan and still tight enough to catch a flip with nothing declared anywhere near it.
export const JOIN_TOLERANCE = 0.75;

export function classify(lum) { return lum >= LIGHT ? 'light' : lum <= DARK ? 'dark' : null; }

/** findFlips(samples: [{t, lum}]) -> [{t, from, to}]. Pure; no browser, no file, easy to fixture. */
export function findFlips(samples) {
  const flips = [];
  let state = null;
  for (const s of samples) {
    const c = classify(s.lum);
    if (c == null) continue;
    if (state && c !== state.c) flips.push({ t: +((state.t + s.t) / 2).toFixed(2), from: state.c, to: c });
    state = { c, t: s.t };
  }
  return flips;
}

/** The scene's OWN declared schedule points: bg windows, recipe joins, raw transitions. */
export function declaredPoints(cfg) {
  const pts = [];
  for (const b of cfg.bg || []) { if (Number.isFinite(b.from)) pts.push(b.from); if (Number.isFinite(b.to)) pts.push(b.to); }
  for (const r of cfg.recipes || []) if (Number.isFinite(r.at)) pts.push(r.at);
  for (const tr of cfg.transitions || []) if (Number.isFinite(tr.t)) pts.push(tr.t);
  return pts;
}

// EVIDENCE ONLY, never the verdict: a bg[] boundary sits at every scene join by construction, so
// "there is a schedule point nearby" is true of every flip, planned or not, and cannot itself say
// whether the change was carried. It is reported alongside a finding so a reader can see the schedule
// the plan actually wrote, not used to decide light-vs-dark or declared-vs-flash.
export function isDeclared(cfg, t, tolerance = JOIN_TOLERANCE) {
  return declaredPoints(cfg).some((p) => Math.abs(p - t) <= tolerance);
}

// The PLAN saying a ground change happens is a separate fact from a schedule point existing: the
// frontmatter's own craft.color arc states the intent ("crossfades to the theme's white-first ground"),
// and a beat's body (mechanism/picture/eye/becomes, whatever prose it carries) can name the same thing
// locally. Either counts; neither is a bg[] timestamp.
const GROUND_WORDS = /\b(ground|tint|crossfade|chain|carry|carries|carried)\b/i;

export function colorArc(storyboardText) {
  const m = /color:\s*"([^"]*)"/i.exec(storyboardText);
  return m ? m[1] : '';
}

// "crossfades ... over 0.4s" / "crossfade over a set duration" style phrasing: a number of seconds
// named near the word crossfade is the plan's own minimum, held to instead of guessing one.
export function declaredCrossfadeSeconds(text) {
  const m = /crossfade[^.]*?([\d.]+)\s*s\b/i.exec(text);
  return m ? +m[1] : null;
}

export function beatText(storyboardText, beat) {
  if (!beat) return '';
  const heads = [...storyboardText.matchAll(/^##\s*Beat\s+(\d+)[^\n(]*\(([\d.]+)s-([\d.]+)s\)/gm)];
  const idx = heads.findIndex((h) => +h[1] === beat.n);
  if (idx < 0) return '';
  const start = heads[idx].index;
  const end = idx + 1 < heads.length ? heads[idx + 1].index : storyboardText.length;
  return storyboardText.slice(start, end);
}

/** Does the PLAN (frontmatter arc, or either beat's own body) name a ground change at this join? */
export function planDeclaresGround(storyboardText, before, after) {
  return GROUND_WORDS.test(colorArc(storyboardText))
    || GROUND_WORDS.test(beatText(storyboardText, before))
    || GROUND_WORDS.test(beatText(storyboardText, after));
}

/**
 * measureTransition(samples, flipT) -> {t10, t90, duration, frames} | null
 * `samples` are fine-grained (frame-rate) {t, lum} around one flip. The steady level on each side is
 * the mean of the samples farthest from the flip in this window (least likely to already be mid-
 * transition); duration is the time the signal takes to cross from 10% to 90% of that jump, which is
 * the same definition a scope uses for a rise/fall time and does not depend on picking one threshold.
 */
export function measureTransition(samples, flipT, { fps = 30 } = {}) {
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const before = sorted.filter((s) => s.t <= flipT);
  const after = sorted.filter((s) => s.t > flipT);
  if (before.length < 2 || after.length < 2) return null;
  const avg = (arr) => arr.reduce((s, x) => s + x.lum, 0) / arr.length;
  const from = avg(before.slice(0, Math.min(3, before.length)));
  const to = avg(after.slice(-Math.min(3, after.length)));
  const jump = to - from;
  if (Math.abs(jump) < 1) return null;
  const lo = from + 0.1 * jump, hi = from + 0.9 * jump;
  const crossTime = (target) => {
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      const reached = jump > 0 ? (a.lum <= target && b.lum >= target) : (a.lum >= target && b.lum <= target);
      if (reached) {
        const span = b.lum - a.lum;
        const frac = span !== 0 ? (target - a.lum) / span : 0;
        return a.t + frac * (b.t - a.t);
      }
    }
    return null;
  };
  const t10 = crossTime(lo), t90 = crossTime(hi);
  if (t10 == null || t90 == null) return null;
  const duration = Math.abs(t90 - t10);
  return { t10, t90, duration: +duration.toFixed(3), frames: Math.round(duration * fps) };
}

/** Beat windows from the storyboard sidecar's own `## Beat N: … (t0s-t1s)` headers. */
export function beatWindows(storyboardText) {
  const re = /^##\s*Beat\s+(\d+)[^\n(]*\(([\d.]+)s-([\d.]+)s\)/gm;
  const beats = []; let m;
  while ((m = re.exec(storyboardText))) beats.push({ n: +m[1], t0: +m[2], t1: +m[3] });
  return beats;
}

export function beatsAround(beats, t) {
  const before = beats.filter((b) => b.t1 <= t).sort((a, b) => b.t1 - a.t1)[0] || null;
  const after = beats.filter((b) => b.t0 >= t).sort((a, b) => a.t0 - b.t0)[0] || null;
  return { before, after };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) {
    // The known truth this gate exists to reproduce: vawe-flow-2's real render measures white 0s, dark
    // 1.5-4.5s, white 5-7s, dark 7.5-9s, white 9.5-11s on top-strip luma. Four flips, all real content.
    const knownTruth = [
      { t: 0, lum: 250 }, { t: 0.5, lum: 240 }, { t: 1, lum: 90 }, { t: 1.5, lum: 42 }, { t: 2, lum: 48 },
      { t: 4, lum: 44 }, { t: 4.5, lum: 43 }, { t: 5, lum: 250 }, { t: 6, lum: 250 }, { t: 7, lum: 245 },
      { t: 7.5, lum: 60 }, { t: 8, lum: 55 }, { t: 9, lum: 52 }, { t: 9.5, lum: 250 }, { t: 10.5, lum: 255 },
    ];
    const flips = findFlips(knownTruth);
    if (flips.length !== 4) { console.error(`known-truth fixture must find 4 flips, found ${flips.length}: ${JSON.stringify(flips)}`); process.exit(1); }

    // a fixture with NO flip at all must report none, not a false positive from noise near the band edges
    const steady = [{ t: 0, lum: 250 }, { t: 1, lum: 248 }, { t: 2, lum: 252 }];
    if (findFlips(steady).length !== 0) { console.error('a steady-luma fixture must report zero flips'); process.exit(1); }

    // isDeclared: a flip sitting on a bg[] boundary is declared; one far from every schedule point is not
    const cfg = { bg: [{ from: 0, to: 1.2 }, { from: 1.25, to: 2.75 }], recipes: [{ at: 4.7 }] };
    if (!isDeclared(cfg, 1.3)) { console.error('a flip at a bg boundary must read as declared'); process.exit(1); }
    if (!isDeclared(cfg, 4.9)) { console.error('a flip near a recipe join must read as declared'); process.exit(1); }
    if (isDeclared(cfg, 9.0)) { console.error('a flip with no schedule point nearby must NOT read as declared: this is the real defect this gate exists to catch'); process.exit(1); }

    // beatsAround: a flip between two beats names both
    const beats = [{ n: 1, t0: 0, t1: 1.2 }, { n: 2, t0: 1.25, t1: 2.5 }];
    const { before, after } = beatsAround(beats, 1.22);
    if (before?.n !== 1 || after?.n !== 2) { console.error(`beatsAround must name beat 1 -> beat 2, got ${JSON.stringify({ before, after })}`); process.exit(1); }

    // THE REAL DEFECT THIS FIX EXISTS FOR: a bg[] boundary sits at every join, so "declared" cannot
    // come from schedule proximity alone. A crossfade spread over 0.5s must measure as carried...
    const smooth = []; for (let t = 0; t <= 1; t += 1 / 30) smooth.push({ t: +t.toFixed(4), lum: t < 0.25 ? 250 : t > 0.75 ? 40 : 250 - (t - 0.25) / 0.5 * 210 });
    const smoothTrans = measureTransition(smooth, 0.5, { fps: 30 });
    if (!smoothTrans || smoothTrans.duration < 0.3) { console.error(`a 0.5s crossfade must measure as carried, got ${JSON.stringify(smoothTrans)}`); process.exit(1); }

    // ...but the SAME jump inside 3 frames (0.1s at 30fps) must measure as a flash, even though a bg
    // boundary can sit right on top of it. Schedule proximity is evidence, never the verdict.
    const abrupt = [{ t: 0, lum: 250 }, { t: 0.033, lum: 250 }, { t: 0.066, lum: 145 }, { t: 0.1, lum: 40 }, { t: 0.2, lum: 40 }];
    const abruptTrans = measureTransition(abrupt, 0.066, { fps: 30 });
    if (!abruptTrans || abruptTrans.duration >= 0.3) { console.error(`a 3-frame jump must NOT measure as carried, got ${JSON.stringify(abruptTrans)}`); process.exit(1); }
    const scheduledCfg = { bg: [{ from: 0, to: 0.066 }, { from: 0.066, to: 0.2 }] };
    if (!isDeclared(scheduledCfg, 0.066)) { console.error('the fixture must have a schedule point at the flip (that is the point of this test)'); process.exit(1); }
    // schedule proximity says nothing about whether the plan named ground; an empty storyboard must not.
    if (planDeclaresGround('', null, null)) { console.error('an empty plan must not read as declaring a ground change'); process.exit(1); }

    // a flip with a plan that never mentions ground/tint/crossfade at all is a flash regardless of timing
    const noPlan = 'color: "just a plain white background, nothing changes"';
    if (planDeclaresGround(noPlan, null, null)) { console.error('a plan that never names ground/tint/crossfade must not read as declaring one'); process.exit(1); }
    const withPlan = 'color: "the dark terminal ground crossfades to the white-first ground"';
    if (!planDeclaresGround(withPlan, null, null)) { console.error('a plan that says crossfades must read as declaring a ground change'); process.exit(1); }
    if (declaredCrossfadeSeconds('crossfade over 0.4s') !== 0.4) { console.error('declaredCrossfadeSeconds must read the plan\'s own number'); process.exit(1); }

    console.log('  ✓ ground-arc self-test: the known-truth fixture finds all four flips, a steady fixture');
    console.log('    finds none, beatsAround names the beat on each side of a flip, a 0.5s crossfade');
    console.log('    measures as carried, the SAME jump inside 3 frames measures as a flash even with a');
    console.log('    schedule point sitting on it, and planDeclaresGround reads the plan, not the schedule');
    process.exit(0);
  }

  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make ground-arc D=films/scene/<film>.json'); process.exit(2); }
  const base = String(arg).replace(/\.json$/, '');
  const jsonPath = path.resolve(ROOT, base + '.json');
  const cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sbPath = path.resolve(ROOT, base + '.storyboard.md');
  const storyboard = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf8') : '';
  const beats = beatWindows(storyboard);

  const gf = gateFindings();

  const measure = (img) => luminanceOf(img, { x: 0, y: 0, w: img.width, h: Math.round(img.height * 0.1) });
  const rel = path.relative(ROOT, jsonPath);
  const coarse = await sampleScene(rel, { rate: 0.25, measure });
  const fps = coarse.fps || 30;
  const lumSamples = coarse.samples.map((s) => ({ t: s.t, lum: s.img }));
  const approxFlips = findFlips(lumSamples);

  // A coarse (0.25s) pass finds WHERE a flip roughly is; a MINIMUM crossfade of 0.3s (10 frames at
  // 30fps) cannot be measured at that resolution, so a second frame-rate pass around each approximate
  // flip is needed to answer "how long did it take", not just "did it happen".
  const fineTimes = [...new Set(approxFlips.flatMap((f) => {
    const out = [];
    for (let t = Math.max(0, f.t - 0.6); t <= f.t + 0.6; t += 1 / fps) out.push(+t.toFixed(4));
    return out;
  }))].sort((a, b) => a - b);
  const fine = fineTimes.length ? await sampleScene(rel, { times: fineTimes, measure }) : { samples: [] };
  const fineByFlip = new Map();
  for (const f of approxFlips) {
    fineByFlip.set(f.t, fine.samples.filter((s) => Math.abs(s.t - f.t) <= 0.6).map((s) => ({ t: s.t, lum: s.img })));
  }

  const MIN_CROSSFADE = 0.3;
  for (const f of approxFlips) {
    const { before, after } = beatsAround(beats, f.t);
    const beatNote = before && after ? `beat ${before.n} -> beat ${after.n}` : 'beat unknown (no storyboard match)';
    const evidence = isDeclared(cfg, f.t) ? `a schedule point sits within ${JOIN_TOLERANCE}s (evidence, not the verdict)` : 'no nearby schedule point';
    const trans = measureTransition(fineByFlip.get(f.t) || [], f.t, { fps });
    const declaredMin = declaredCrossfadeSeconds(colorArc(storyboard));
    const minRequired = Math.max(MIN_CROSSFADE, declaredMin || 0);
    const declared = planDeclaresGround(storyboard, before, after);
    const carried = trans && trans.duration >= minRequired;
    const summary = `ground flips ${f.from}->${f.to} at ${f.t}s (${beatNote})`;

    if (declared && carried) {
      gf.note('ground-flip-declared', `${summary}: carried over ${trans.duration}s `
        + `(${trans.frames} frames), ${evidence}.`, { at: f.t });
      continue;
    }
    const durationNote = trans ? `measured change took ${trans.duration}s (${trans.frames} frames)`
      : 'measured change happened between two consecutive samples (could not resolve a duration)';
    const planNote = declared ? 'the plan names a ground change at this join, but the render does not carry it that long'
      : (colorArc(storyboard) ? `the plan's color arc says: "${colorArc(storyboard)}"` : 'nothing in the plan names a ground change here');
    const fix = before && after
      ? `carry beat ${before.n}'s ground across the beat ${before.n} -> beat ${after.n} join, or crossfade it over at least ${minRequired}s`
      : `crossfade this change over at least ${minRequired}s instead of flipping cold`;
    gf.warn('ground-flash', `${summary}: ${durationNote}, needs at least ${minRequired}s. `
      + `${planNote}. ${evidence}. Fix: ${fix}.`, { at: f.t });
  }

  if (process.argv.includes('--json')) { gf.emit(); process.exit(gf.records.some((r) => r.severity === 'error') ? 1 : 0); }
  console.log(`\n  ground-arc · ${path.basename(base)} · ${lumSamples.length} samples · ${approxFlips.length} flip(s)`);
  gf.emit();
  if (!approxFlips.length) console.log('    (no ground flips measured)');
  console.log('');
  process.exit(0);
}
