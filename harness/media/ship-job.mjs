// harness/media/ship-job.mjs: run a final render in the background and report on it.
//
//   node harness/media/ship-job.mjs start <page.html> [render-page args]   detach a final render, print its job id
//   node harness/media/ship-job.mjs status [job] [--wait]                  progress, or the result (default: newest job);
//                                                                          --wait blocks until the job ends or 100 s pass
//
// A job is two files in the scratch folder, <id>.json (state) and <id>.log (the render's own output). The
// detached `run` process owns the state file: it starts render-page.mjs --final, then records how it ended and,
// on success, the result of the cheap final check (scene-stats plus a blank-frame scan).
// A new job for a page cancels the running job for the same page.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scratch } from '../lib/scratch.mjs';
import { defaultOut } from './render-page.mjs';
import { readFeatures, summarize } from './scene-stats.mjs';
import { samePage, blankRuns, isFlat, problemsOf, doneLines } from '../lib/ship-status.mjs';

const WAIT_CAP_MS = 100_000;

const SELF = fileURLToPath(import.meta.url);
const RENDER = path.join(path.dirname(SELF), 'render-page.mjs');
const jobsDir = () => scratch('ship-jobs');
const stateFile = (id) => path.join(jobsDir(), `${id}.json`);
const readJob = (id) => JSON.parse(fs.readFileSync(stateFile(id), 'utf8'));
const writeJob = (job) => fs.writeFileSync(stateFile(job.id), JSON.stringify(job));

const die = (msg) => { console.error(`ship: ${msg}`); process.exit(2); };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const clock = (ms) => `${Math.round(ms / 1000)}s`;

function allJobs() {
  return fs.readdirSync(jobsDir()).filter((f) => f.endsWith('.json')).map((f) => readJob(f.slice(0, -5)));
}

function cancelRunning(page) {
  for (const old of allJobs()) {
    if (!['starting', 'running'].includes(old.status) || !samePage(old.page, page)) continue;
    if (old.pid && pidAlive(old.pid)) process.kill(-old.pid, 'SIGTERM');
    writeJob({ ...old, status: 'cancelled', endedAt: Date.now() });
    console.log(`cancelled the running job ${old.id} for the same page`);
  }
}

function startJob(page, renderArgs) {
  if (!fs.existsSync(page)) die(`no such page: ${page}`);
  cancelRunning(page);
  const name = path.basename(defaultOut(page, { aspect: '16:9', final: true }), '.mp4');
  const id = `${name}-${Date.now().toString(36)}`;
  const log = path.join(jobsDir(), `${id}.log`);
  writeJob({ id, page, args: renderArgs, log, status: 'starting', startedAt: Date.now() });
  spawn(process.execPath, [SELF, 'run', id], { detached: true, stdio: 'ignore' }).unref();
  console.log(`job ${id} started: final render of ${page} in the background`);
  console.log(`log: ${log}`);
}

function runJob(id) {
  const job = readJob(id);
  const fd = fs.openSync(job.log, 'a');
  const child = spawn(process.execPath, [RENDER, job.page, ...job.args, '--final'], { stdio: ['ignore', fd, fd] });
  writeJob({ ...job, status: 'running', pid: process.pid });
  child.on('close', (code) => {
    const ended = { ...readJob(id), status: code === 0 ? 'done' : 'failed', exit: code, endedAt: Date.now() };
    writeJob(code === 0 ? { ...ended, ...finalCheck(outputsOf(logText(job))) } : ended);
  });
}

const outputsOf = (text) => text.split(/[\r\n]+/).filter((l) => l.startsWith('✓ ')).map((l) => l.slice(2).split(':')[0]);

function finalCheck(outputs) {
  try {
    const problems = outputs.flatMap((mp4) => {
      const feats = readFeatures(mp4);
      return problemsOf(summarize(feats), blankRuns(feats, isFlat)).map((p) => (outputs.length > 1 ? `${path.basename(mp4)}: ${p}` : p));
    });
    return { outputs, problems };
  } catch (e) {
    return { outputs, problems: [], checkError: e.message };
  }
}

function newestJob() {
  const ids = fs.readdirSync(jobsDir()).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  ids.sort((a, b) => fs.statSync(stateFile(b)).mtimeMs - fs.statSync(stateFile(a)).mtimeMs);
  return ids[0];
}

function logText(job) {
  try { return fs.readFileSync(job.log, 'utf8'); } catch { return ''; }
}

function progressLine(job, text) {
  const seen = [...text.matchAll(/capturing (\d+)\/(\d+) subframe/g)].pop();
  const elapsed = Date.now() - job.startedAt;
  if (!seen) return `job ${job.id}: running, ${clock(elapsed)} in, before capture (page load, checks, speed pass)`;
  const [done, total] = [Number(seen[1]), Number(seen[2])];
  const eta = done > 0 ? clock((elapsed * (total - done)) / done) : 'unknown';
  return `job ${job.id}: running, ${done}/${total} subframes (${Math.round((100 * done) / total)}%), ${clock(elapsed)} in, about ${eta} left, then encode`;
}

function finalLines(job, text) {
  if (job.status === 'done') return doneLines(job);
  if (job.status === 'cancelled') return [`job ${job.id}: cancelled, a newer job for the same page replaced it`];
  const tail = text.split(/[\r\n]+/).filter((l) => l.trim() && !l.includes('capturing ')).slice(-6);
  return [`job ${job.id}: failed (exit ${job.exit}) after ${clock(job.endedAt - job.startedAt)}`, ...tail, `log: ${job.log}`];
}

function statusOf(id) {
  const target = id || newestJob();
  if (!target) die('no ship job yet: start one with vawe ship <page>');
  if (!fs.existsSync(stateFile(target))) die(`no such job: ${target}`);
  const job = readJob(target);
  const text = logText(job);
  if (['done', 'failed', 'cancelled'].includes(job.status)) return finalLines(job, text);
  if (job.status === 'running' && !pidAlive(job.pid)) return [`job ${job.id}: the render process died without a result`, `log: ${job.log}`];
  return [progressLine(job, text), `log: ${job.log}`];
}

const isOver = (id) => ['done', 'failed', 'cancelled'].includes(readJob(id).status) || (readJob(id).status === 'running' && !pidAlive(readJob(id).pid));

async function waitThenStatus(id) {
  const target = id || newestJob();
  const until = Date.now() + WAIT_CAP_MS;
  while (target && fs.existsSync(stateFile(target)) && !isOver(target) && Date.now() < until) await new Promise((r) => setTimeout(r, 2000));
  console.log(statusOf(target).join('\n'));
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'start') startJob(rest[0], rest.slice(1));
else if (mode === 'run') runJob(rest[0]);
else if (mode === 'status') {
  const [id] = rest.filter((a) => a !== '--wait');
  if (rest.includes('--wait')) await waitThenStatus(id);
  else console.log(statusOf(id).join('\n'));
} else die('usage: ship-job.mjs start <page> [args] | status [job] [--wait]');
