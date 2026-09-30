// Pure text and decisions for ship jobs: no I/O, no clock. harness/media/ship-job.mjs feeds it.
import path from 'node:path';
import { tasteLines } from './taste-steps.mjs';

export const LIMITS = { staticSec: 1, worldSec: 2, blankSec: 0.3, blankEdgeSec: 0.5, maxProblems: 3 };
const SAMPLE_FPS = 10;

export const samePage = (a, b) => path.resolve(a) === path.resolve(b);

const clock = (ms) => `${Math.round(ms / 1000)}s`;

/** One colour fills the frame and the luma grid is level. */
export const isFlat = (f) => Math.max(...f.hist) >= 0.99 && Math.max(...f.grid) - Math.min(...f.grid) < 0.03;

/** Sample runs, at least `blankSec` long, where the frame is one flat colour, away from the first and last `blankEdgeSec`. */
export function blankRuns(feats, isFlat, limits = LIMITS) {
  const dur = feats.length / SAMPLE_FPS;
  const runs = [];
  let start = null;
  const close = (end) => {
    if (start !== null && (end - start) / SAMPLE_FPS >= limits.blankSec) runs.push({ a: start / SAMPLE_FPS, b: end / SAMPLE_FPS });
    start = null;
  };
  feats.forEach((f, i) => {
    const t = i / SAMPLE_FPS;
    const inside = t >= limits.blankEdgeSec && t <= dur - limits.blankEdgeSec;
    if (inside && isFlat(f)) { if (start === null) start = i; } else close(i);
  });
  close(feats.length);
  return runs;
}

/** Problems worth a look, worst first, each with its seconds. `stats` is scene-stats summarize(), `blanks` from blankRuns. */
export function problemsOf(stats, blanks, limits = LIMITS) {
  const found = [];
  for (const r of blanks) found.push({ len: r.b - r.a, text: `blank frame ${r.a.toFixed(1)}-${r.b.toFixed(1)} s` });
  for (const r of stats.static) if (r.len > limits.staticSec) found.push({ len: r.len, text: `static window ${r.a}-${r.b} s (${r.len} s)` });
  const edges = [0, ...stats.turns.map((t) => t.t), stats.duration];
  for (let i = 1; i < edges.length; i++) {
    const len = edges[i] - edges[i - 1];
    if (len > limits.worldSec) found.push({ len, text: `world held ${edges[i - 1].toFixed(1)}-${edges[i].toFixed(1)} s (${len.toFixed(1)} s)` });
  }
  return found.sort((x, y) => y.len - x.len).map((p) => p.text);
}

export function doneLines(job) {
  const lines = [`job ${job.id}: done in ${clock(job.endedAt - job.startedAt)}`];
  for (const o of job.outputs || []) lines.push(`output: ${o}`);
  const problems = job.problems || [];
  if (job.checkError) lines.push(`final check skipped: ${job.checkError}`);
  else if (problems.length === 0) lines.push('final check: no problems found');
  else {
    lines.push(`final check: ${problems.length} problem${problems.length > 1 ? 's' : ''}, look at these seconds`);
    for (const p of problems.slice(0, LIMITS.maxProblems)) lines.push(`  ${p}`);
  }
  if (job.outputs?.length) lines.push(...tasteLines('preship'));
  for (const v of job.verdict || []) lines.push(v);
  if (!job.outputs?.length) return lines;
  if (!job.verdict) lines.push(`next: bin/vawe judge ${job.outputs[0]} --fresh`);
  else if (/: PASS/.test(job.verdict[0] || '')) lines.push('next: the judge passed it; show the owner');
  else lines.push(`next: fix what the judge and the final check name, worst first, on drafts (bin/vawe dev, then bin/vawe judge <draft> --fresh), then bin/vawe ship ${job.page} again`);
  return lines;
}
