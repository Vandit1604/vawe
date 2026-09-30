// harness/media/ship-job.mjs: run a final render in the background and report on it.
//
//   node harness/media/ship-job.mjs start <page.html> [render-page args]   detach a final render, print its job id
//   node harness/media/ship-job.mjs status [job]                           progress, or the result (default: newest job)
//
// A job is two files in the scratch folder, <id>.json (state) and <id>.log (the render's own output). The
// detached `run` process owns the state file: it starts render-page.mjs --final, then records how it ended.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scratch } from '../lib/scratch.mjs';
import { defaultOut } from './render-page.mjs';

const SELF = fileURLToPath(import.meta.url);
const RENDER = path.join(path.dirname(SELF), 'render-page.mjs');
const jobsDir = () => scratch('ship-jobs');
const stateFile = (id) => path.join(jobsDir(), `${id}.json`);
const readJob = (id) => JSON.parse(fs.readFileSync(stateFile(id), 'utf8'));
const writeJob = (job) => fs.writeFileSync(stateFile(job.id), JSON.stringify(job));

const die = (msg) => { console.error(`ship: ${msg}`); process.exit(2); };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const clock = (ms) => `${Math.round(ms / 1000)}s`;

function startJob(page, renderArgs) {
  if (!fs.existsSync(page)) die(`no such page: ${page}`);
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
  child.on('close', (code) => writeJob({ ...readJob(id), status: code === 0 ? 'done' : 'failed', exit: code, endedAt: Date.now() }));
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
  const outs = text.split(/[\r\n]+/).filter((l) => l.startsWith('✓ ')).map((l) => l.slice(2).split(':')[0]);
  if (job.status === 'done') return [`job ${job.id}: done in ${clock(job.endedAt - job.startedAt)}`, ...outs.map((o) => `output: ${o}`)];
  const tail = text.split(/[\r\n]+/).filter((l) => l.trim() && !l.includes('capturing ')).slice(-6);
  return [`job ${job.id}: failed (exit ${job.exit}) after ${clock(job.endedAt - job.startedAt)}`, ...tail, `log: ${job.log}`];
}

function statusOf(id) {
  const target = id || newestJob();
  if (!target) die('no ship job yet: start one with vawe ship <page>');
  if (!fs.existsSync(stateFile(target))) die(`no such job: ${target}`);
  const job = readJob(target);
  const text = logText(job);
  if (job.status === 'done' || job.status === 'failed') return finalLines(job, text);
  if (job.status === 'running' && !pidAlive(job.pid)) return [`job ${job.id}: the render process died without a result`, `log: ${job.log}`];
  return [progressLine(job, text), `log: ${job.log}`];
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'start') startJob(rest[0], rest.slice(1));
else if (mode === 'run') runJob(rest[0]);
else if (mode === 'status') console.log(statusOf(rest[0]).join('\n'));
else die('usage: ship-job.mjs start <page> [args] | status [job]');
