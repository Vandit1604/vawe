// Pure text and decisions for ship jobs: no I/O, no clock. harness/media/ship-job.mjs feeds it.
import path from 'node:path';
import LIMITS_JSON from '../../taste/build/limits.json' with { type: 'json' };
import { tasteLines } from './taste-steps.mjs';
import { STILL_SEC, undeclaredStills, stillText, insideHold } from './still-limit.mjs';
import { heldWorlds } from './worlds.mjs';

const WORLD = LIMITS_JSON['world-turns'];
export const LIMITS = { staticSec: STILL_SEC, worldSec: WORLD.turn_seconds_max, blankSec: WORLD.blank_run_s, blankEdgeSec: WORLD.blank_edge_s, maxProblems: 3 };
const SAMPLE_FPS = 10;

export const SHIP_JOBS_DIR = path.join('out', 'ship-jobs');

/** The log of a ship job: out/ship-jobs/<id>.log, where the id is <film>-<time>. */
export const jobLogPath = (id) => path.join(SHIP_JOBS_DIR, `${id}.log`);

export const samePage = (a, b) => path.resolve(a) === path.resolve(b);

/** The line a failed final prints last; the ship job reads it back from the render's log. */
export const finalFailedLine = (pct, reason) => `final failed at ${pct}% (${reason})`;

const FAILED_AT = /final failed at (\d+)% \((.*)\)\s*$/gm;
const CAPTURING = /capturing (\d+)\/(\d+) subframe/g;

/** { pct, reason } of a failed final from its log: its own failed line, else the last progress and the last error line. */
export function finalFailure(text, fallbackReason = 'the render stopped') {
  const own = [...text.matchAll(FAILED_AT)].pop();
  if (own) return { pct: Number(own[1]), reason: own[2] };
  const seen = [...text.matchAll(CAPTURING)].pop();
  const errors = text.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => /^error:|error|failed/i.test(l) && !l.includes('capturing '));
  return { pct: seen ? Math.floor((100 * Number(seen[1])) / Number(seen[2])) : 0, reason: (errors.pop() || fallbackReason).replace(/^error:\s*/, '') };
}

/** The newest `ship` event of a film's runs when it failed, else null. */
export function lastFailedShip(runs) {
  const ship = runs.filter((r) => r.cmd === 'ship').pop();
  return ship && ship.verdict === 'failed' ? ship : null;
}

const RECENT_MS = 3 * 24 * 60 * 60 * 1000;

/** One failed-final line per film whose newest ship failed in the last 3 days (render-page keeps frames that long). `films` is readAllRuns. */
export function recentFailedShipLines(films, now) {
  return films.map(({ film, runs }) => [film, lastFailedShip(runs)])
    .filter(([, ship]) => ship && now - Date.parse(ship.at) < RECENT_MS)
    .map(([film, ship]) => failedShipLine(film, ship));
}

/** The one line that says a film's last final failed and how to resume it. */
export const failedShipLine = (film, ship) => `error: the last final of ${film} failed at ${ship.failedAt ?? '?'}% (${ship.reason ?? 'no reason recorded'}); bin/vawe ship ${ship.page ?? `films/${film}/page.html`} resumes it`;

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

/** Held worlds from the pixel turns of scene-stats: the guess for a page with no data-world element. Pure. */
function heldFromTurns(stats, limits, authoring) {
  const held = insideHold(authoring);
  const edges = [0, ...stats.turns.map((t) => t.t), stats.duration];
  const found = [];
  for (let i = 1; i < edges.length; i++) {
    const len = edges[i] - edges[i - 1];
    if (len > limits.worldSec && !held({ a: edges[i - 1], b: edges[i] })) found.push({ len, text: `world held ${edges[i - 1].toFixed(1)}-${edges[i].toFixed(1)} s (${len.toFixed(1)} s)` });
  }
  return found;
}

/** Problems worth a look, worst first, each with its seconds. `stats` is scene-stats summarize(), `blanks` from blankRuns, `authoring` the page's #authoring waivers, `worlds` the measured data-world spans (null for a page with none, which reads the turns from pixels). */
export function problemsOf(stats, blanks, limits = LIMITS, authoring = {}, worlds = null) {
  const found = [];
  for (const r of blanks) found.push({ len: r.b - r.a, text: `blank frame ${r.a.toFixed(1)}-${r.b.toFixed(1)} s` });
  for (const r of undeclaredStills(stats.static, authoring, limits.staticSec)) found.push({ len: r.len, text: stillText(r, limits.staticSec) });
  found.push(...(worlds?.length ? heldWorlds(worlds, limits.worldSec, authoring) : heldFromTurns(stats, limits, authoring)));
  return found.sort((x, y) => y.len - x.len).map((p) => p.text);
}

/** PASS when the fresh judge passed and no acceptance row missed, FIX when not, null when no judge ran. */
export function shipVerdict(job) {
  if (!job.verdict) return null;
  const judged = /: PASS/.test(job.verdict[0] || '');
  return judged && job.acceptance?.allGreen !== false ? 'PASS' : 'FIX';
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
  if (job.outputs?.length) lines.push(...tasteLines('check'));
  for (const v of job.verdict || []) lines.push(v);
  if (job.acceptanceError) lines.push(`acceptance skipped: ${job.acceptanceError}`);
  else if (job.acceptance) lines.push(...job.acceptance.lines);
  if (!job.outputs?.length) return lines;
  const judged = /: PASS/.test(job.verdict?.[0] || '');
  const missed = job.acceptance?.allGreen === false;
  if (job.verdict) lines.push(`ship verdict: ${shipVerdict(job)} (the judge ${judged ? 'passed' : 'did not pass'}; ${missed ? 'an acceptance row missed' : 'every measured acceptance row is green'})`);
  if (!job.verdict) lines.push(`next: bin/vawe judge ${job.outputs[0]} --fresh`);
  else if (judged && !missed) lines.push('next: show the owner');
  else if (judged) lines.push(`next: fix the acceptance rows above on drafts (bin/vawe dev), then bin/vawe ship ${job.page} again`);
  else lines.push(`next: fix what the judge and the final check name, worst first, on drafts (bin/vawe dev, then bin/vawe judge <draft> --fresh), then bin/vawe ship ${job.page} again`);
  return lines;
}
