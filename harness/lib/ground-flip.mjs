// harness/lib/ground-flip.mjs: measures a real light/dark flip in the built film's ground, and
// whether it sits on a declared schedule point. Split out of the retired quality/gates/ground-arc.mjs
// (a TASTE gate: engine-doctrine/SAFEGUARDS.md), because this measurement is load-bearing for an
// OBJECTIVE check, `quality/gates/plan-vs-render.mjs`'s `ground-value-mismatch`: does the beat's
// declared `transition_value:` (harness/lib/contract.mjs) match what actually rendered. The taste
// verdict ("does it flash") is gone; the measurement it was built on is not, and the judge rubric's
// own "Ground continuity" dimension (quality/gates/rubric.mjs) now carries the taste half by eye.
import fs from 'node:fs';
import path from 'node:path';
import { sampleScene, luminanceOf } from './frame-sampler.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

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
// A carried change is one whose 10%-90% crossing takes at least this long; a 3-frame jump at 30fps
// measures well under it even with a schedule point sitting right on top of it.
export const MIN_CROSSFADE = 0.3;

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
// whether the change was carried.
export function isDeclared(cfg, t, tolerance = JOIN_TOLERANCE) {
  return declaredPoints(cfg).some((p) => Math.abs(p - t) <= tolerance);
}

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
 * the mean of the samples farthest from the flip in this window; duration is the time the signal takes
 * to cross from 10% to 90% of that jump, the same definition a scope uses for a rise/fall time.
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

/**
 * measureGroundFlips(jsonPath) -> Promise<[{t, from, to, before, after, transition}]>
 *
 * Samples the built film's ground and returns every real flip, WHO it happens between (the storyboard
 * beats either side, if the sidecar exists), never a verdict. `quality/gates/plan-vs-render.mjs` calls
 * this to compare a beat's declared `transition_value:` against what actually rendered.
 */
export async function measureGroundFlips(jsonPath) {
  const base = jsonPath.replace(/\.json$/, '');
  const sbPath = `${base}.storyboard.md`;
  const storyboard = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf8') : '';
  const beats = beatWindows(storyboard);

  const measure = (img) => luminanceOf(img, { x: 0, y: 0, w: img.width, h: Math.round(img.height * 0.1) });
  const rel = path.relative(ROOT, jsonPath);
  const coarse = await sampleScene(rel, { rate: 0.25, measure });
  const fps = coarse.fps || 30;
  const lumSamples = coarse.samples.map((s) => ({ t: s.t, lum: s.img }));
  const approxFlips = findFlips(lumSamples);

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

  return approxFlips.map((f) => {
    const { before, after } = beatsAround(beats, f.t);
    const trans = measureTransition(fineByFlip.get(f.t) || [], f.t, { fps });
    return { ...f, before, after, transition: trans };
  });
}
