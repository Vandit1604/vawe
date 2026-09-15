// harness/media/shot-detect.mjs: the four shot-boundary detectors and the merge that resolves them,
// pulled out of study.mjs so they can be IMPORTED without also running study.mjs's CLI.
//
// study.mjs is a script: importing it for its exported functions used to also run its whole top-level
// body (probe, decode, sheet-write) as a side effect of the import, because none of that was guarded
// behind an `is this the main module` check. harness/media/ingest.mjs needs these detectors without
// study's sheet/grammar output, so they live here, pure and side-effect-free until called; study.mjs
// now imports them back for its own CLI, so there is exactly one copy of each.
//
// All four detection functions are pure: given the frame series (or scene-score hits) a caller already
// decoded, they return the boundaries. `detectCuts` and `frameSeries` are the two that decode a real
// file (via ffmpeg); everything else takes numbers in, returns numbers out.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpegOrDie } from '../lib/scratch.mjs';

/** The frames eligible to BE a cut. The first frame always scores high because nothing precedes it,
 *  so ffmpeg reports the opening of every film as a scene change. One owner for that rule, because
 *  the peak and the near-miss count are both reported as reasons and must describe the same set:
 *  peak was once taken over every hit, so a film whose only high score was its own first frame
 *  printed "peak 0.593, below 0.3" and stated a reason that was not true. */
function cutEligible(h) { return h.t > 0.2; }

/** One cut lands on several consecutive frames, so collapse a run into its highest-scoring frame.
 *  Pure and exported so `--selftest` can assert it without a video file. */
export function clusterCuts(hits, threshold, minShot) {
  const out = [];
  for (const h of hits.filter((x) => x.score > threshold && cutEligible(x)).sort((a, b) => a.t - b.t)) {
    const prev = out[out.length - 1];
    if (prev && h.t - prev.t < minShot) { if (h.score > prev.score) { prev.t = h.t; prev.score = h.score; } continue; }
    out.push({ ...h });
  }
  return out;
}

// ── shot boundaries ──────────────────────────────────────────────────────────────────────────────
// ffmpeg's scene score per frame. A hard cut spikes it; a dissolve does not, which is why the result
// below is reported with its evidence instead of asserted. Detections cluster (a cut lands on several
// consecutive frames), so nearby hits collapse to the highest-scoring one.
export function detectCuts(video, scratchDir, threshold, minShot) {
  const meta = path.join(scratchDir, '.scene-scores.txt');
  ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-an',
    '-vf', `select='gt(scene,0.01)',metadata=print:file=${meta}`, '-f', 'null', '-'], meta, 'scene detect');
  const hits = [];
  let t = null;
  for (const line of fs.readFileSync(meta, 'utf8').split('\n')) {
    const p = /pts_time:([0-9.]+)/.exec(line);
    if (p) { t = +p[1]; continue; }
    const s = /scene_score=([0-9.]+)/.exec(line);
    if (s && t != null) { hits.push({ t, score: +s[1] }); t = null; }
  }
  fs.rmSync(meta, { force: true });
  const eligible = hits.filter(cutEligible);
  const peak = eligible.reduce((m, h) => Math.max(m, h.score), 0);
  const clustered = clusterCuts(hits, threshold, minShot);
  // Near-misses are the hint that the threshold is wrong for THIS film, and the author cannot see
  // them from the sheet. Our own renders cross-dissolve, so half their authored cuts land here.
  const near = eligible.filter((h) => h.score > threshold / 2 && h.score <= threshold).length;
  return { peak, near, cuts: clustered };
}

// ── ground seams: joints a luma-delta cut can't see ─────────────────────────────────────────────
// `edgedetect` marks every pixel that belongs to an edge; its per-frame YAVG (the same signalstats
// reading LUMA/DELTA use, just on the edge map instead of the picture) is near zero exactly when the
// frame is empty ground and rises with every letterform, icon or UI edge on screen. A run of
// consecutive frames at or under `threshold` is a beat of empty ground, with no cut in it for
// detectCuts() to find.
//
// A THRESHOLD RUN IS THE PENUMBRA, NOT THE GAP: the frames either side of true zero are the outgoing
// shot fading OUT and the incoming shot fading IN. So the reported joint is the CORE's (the run's own
// minimum) midpoint, and the reported gap is the CORE's span, not the outer run's.
export function detectSeams(edge, threshold, dur) {
  const runs = [];
  let cur = null;
  for (const p of edge) {
    if (p.v <= threshold) { if (cur) { cur.t1 = p.t; cur.pts.push(p); } else cur = { t0: p.t, t1: p.t, pts: [p] }; }
    else { if (cur) runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.t0 > 0.05 && r.t1 < dur - 0.05).map((r) => {
    const minv = Math.min(...r.pts.map((p) => p.v));
    // 0.02 tolerance, not exact equality: ffmpeg's YAVG lands on a clean 0.000 for several consecutive
    // frames on a clean source, but a noisier clip could sit at 0.01 vs 0.02 without a true tie.
    const core = r.pts.filter((p) => p.v <= minv + 0.02);
    return { t0: r.t0, t1: r.t1, core0: core[0].t, core1: core[core.length - 1].t,
      t: (core[0].t + core[core.length - 1].t) / 2, frames: core.map((p) => p.v) };
  });
}

/** A run of DELTA frames inside [lo, hi], held for at least minRun seconds and FLAT (peak/mean under
 *  flatRatio): a sustained, roughly constant-speed change, which is what a whip/push or a crossfade
 *  looks like on this series and an ordinary shot's motion (bursts, then settles) does not. One shared
 *  shape, exported so `--selftest` can assert both callers (detectPans, detectCrossfades) on synthetic
 *  numbers without decoding a video. */
function sustainedRun(delta, lo, hi, minRun, flatRatio) {
  const runs = [];
  let cur = null;
  for (const p of delta) {
    if (p.v >= lo && p.v <= hi) { if (cur) { cur.t1 = p.t; cur.pts.push(p); } else cur = { t0: p.t, t1: p.t, pts: [p] }; }
    else { if (cur) runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.t1 - r.t0 >= minRun).map((r) => {
    const vals = r.pts.map((p) => p.v);
    const meanV = vals.reduce((a, b) => a + b, 0) / vals.length;
    const peak = Math.max(...vals);
    return { t0: r.t0, t1: r.t1, t: (r.t0 + r.t1) / 2, mean: Number(meanV.toFixed(2)),
      peak: Number(peak.toFixed(2)), flatness: Number((peak / meanV).toFixed(2)), frames: vals.length };
  }).filter((r) => r.flatness <= flatRatio);
}

// 1.6 is study.mjs's own default (checked, not tuned, against two real clips: see study.mjs's header).
export function detectPans(delta, floor, minRun, flatRatio = 1.6) {
  return sustainedRun(delta, floor, Infinity, minRun, flatRatio);
}

export function detectCrossfades(delta, lo, hi, minRun, flatRatio = 1.6) {
  return sustainedRun(delta, lo, hi, minRun, flatRatio);
}

// ── one per-frame series, one decode ────────────────────────────────────────────────────────────
// Reads a whole file once at its own frame rate, printing one signalstats value per frame. Callers
// build LUMA/DELTA/EDGE series by choosing the filter `chain` (see study.mjs's own callers). `video` is
// a parameter, never a module-level constant, so this decode is reusable for whatever file the caller
// is studying.
export function frameSeries(video, chain) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-an', '-vf',
    `${chain},metadata=mode=print:key=lavfi.signalstats.YAVG`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = [];
  let t = null;
  for (const line of String(r.stderr).split('\n')) {
    const p = /pts_time:\s*([0-9.]+)/.exec(line);
    if (p) { t = +p[1]; continue; }
    const v = /lavfi\.signalstats\.YAVG=([\d.]+)/.exec(line);
    if (v && t != null) { out.push({ t, v: +v[1] }); t = null; }
  }
  return out;
}

// ── four kinds of joint, one boundary list ──────────────────────────────────────────────────────
// Two joints found within `minShot` of each other are the same moment measured two ways, and the more
// EXACT measurement wins: a cut is an exact scene-score peak, a seam a run of low-edge frames, a
// pan/crossfade a run of DELTA frames, in that order of precision. The disagreement is still RECORDED,
// never silently dropped: a caller can see that two measurements pointed at the same moment and named
// it differently (study.mjs's own `conflicts` reporting).
export const JOINT_PRIORITY = { cut: 0, seam: 1, pan: 2, crossfade: 3 };
export function mergeJoints(kindLists, minShot) {
  const items = kindLists.flatMap(({ kind, items: hits }) => hits.map((h) => ({ t: h.t, kind, evidence: h })))
    .sort((a, b) => a.t - b.t);
  const out = [];
  const conflicts = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (prev && it.t - prev.t < minShot) {
      if (it.kind !== prev.kind)
        conflicts.push({ t: Number(prev.t.toFixed(2)), kinds: [prev.kind, it.kind],
          detail: `${prev.kind}@${prev.t.toFixed(2)}s vs ${it.kind}@${it.t.toFixed(2)}s, ${(it.t - prev.t).toFixed(2)}s apart` });
      if (JOINT_PRIORITY[it.kind] < JOINT_PRIORITY[prev.kind]) out[out.length - 1] = it;
      continue;   // one joint, the higher-priority kind's own time; the loser is still in `conflicts`
    }
    out.push(it);
  }
  return { joints: out, conflicts };
}
