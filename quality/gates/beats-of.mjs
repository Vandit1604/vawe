// scripts/gates/beats-of.mjs, WHERE ARE THE BEATS, and which frame represents each one.
//
// A scene does not declare its beats. They are inferred from where content layers START: a cluster of
// starts within ~1.6s is one beat. Three things must be excluded or the clustering invents beats that
// aren't there, backgrounds (track 0), persistent chrome (track 1), and near-full-duration layers, any
// of which would spawn a phantom beat on a blank pre-hook frame.
//
// This lived inline in judge.mjs. It is here because the A/B judge needs the identical table: two arms
// sampled by two different beat models are not comparable, and a divergence would look like a quality
// difference. One model, imported, never forked.
import { sceneTiming, num } from './scene-timing.mjs';

const CLUSTER = 1.6;   // starts closer than this are the same beat
const INTO = 0.55;     // sample this far into the beat...
const CAP = 1.6;       // ...but never more than this, so a long beat is still sampled near its entrance

// starts of each beat, in seconds. `dur` overrides the scene's declared duration (judge passes the
// rendered mp4's real duration, which is the clock the frames actually come from).
export function beatStarts(scene, dur) {
  const T = sceneTiming(scene);
  const D = num(dur, 0) || T.duration;
  const content = T.layers.filter((L) => (L.track ?? 9) > 1 && num(L.duration, num(L.dur, 2)) < D * 0.7);
  const starts = [...new Set(content.map((L) => num(L.start, 0)))].sort((a, b) => a - b);
  const beats = [];
  for (const t of starts) {
    const last = beats[beats.length - 1];
    if (last == null || t - last > CLUSTER) beats.push(t);
  }
  return { beats, duration: D };
}

// the representative frame per beat: [{ i, start, t, label }]. `t` is clamped inside the film.
export function beatsOf(scene, dur) {
  const { beats, duration } = beatStarts(scene, dur);
  return beats.map((b, i) => {
    const next = beats[i + 1] ?? duration;
    return {
      i, start: b,
      t: Math.max(0, Math.min(duration - 0.1, b + Math.min(CAP, (next - b) * INTO))),
      label: `beat ${i + 1} @${b.toFixed(1)}s`,
    };
  });
}

// fallback when there is no scene JSON (a bare mp4): n evenly-spaced samples.
export function evenSamples(duration, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const t = (duration * (i + 0.5)) / n;
    return { i, start: t, t, label: `@${t.toFixed(1)}s` };
  });
}
