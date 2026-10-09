// harness/media/ship-job.mjs: run a final render in the background and report on it.
//
//   node harness/media/ship-job.mjs start <page.html> [render-page args]   detach a final render, print its job id
//   node harness/media/ship-job.mjs status [job] [--wait]                  progress, or the result (default: newest job);
//                                                                          --wait blocks until the job ends or 9 minutes pass,
//                                                                          one progress line per minute
//
// A job is two files in out/ship-jobs, <id>.json (state) and <id>.log (the render's own output); the id starts with the film name. The
// detached `run` process owns the state file: it starts render-page.mjs --final, then records how it ended and,
// on success, the result of the cheap final check (scene-stats plus a blank-frame scan) and of a fresh
// judge on the final (harness/media/judge-fresh.mjs, about 30 s; VAWE_SHIP_JUDGE=0 skips it). The mp4 is final
// and listed as `rendered` (status judging) before the judge and the acceptance run; `done` adds the verdict. The job writes the
// `ship` event of out/<film>.runs.jsonl when it ends, so the render runs with --job and logs nothing itself.
// A new job for a page cancels the running job for the same page. `status <page>` reports that page's newest job.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultOut } from './render-page.mjs';
import { videoProblems, readVideo } from './draft-check.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { WAIT_WORK } from '../live/stage-say.mjs';
import { samePage, doneLines, shipVerdict, SHIP_JOBS_DIR, jobLogPath, finalFailure, failedShipLine, firstCapture, captureEtaMs } from '../lib/ship-status.mjs';
import { appendRun, filmKeyOf } from '../lib/runlog.mjs';
import { shipEvent } from '../lib/run-events.mjs';
import { finalAcceptance, lastPageFacts } from './acceptance-run.mjs';

// The Bash tool stops a call at 10 minutes: 9 leaves room to print the result.
const WAIT_CAP_MS = Number(process.env.VAWE_SHIP_WAIT_MS) || 540_000;
const PROGRESS_MS = Number(process.env.VAWE_SHIP_PROGRESS_MS) || 60_000;

const SELF = fileURLToPath(import.meta.url);
const RENDER = path.join(path.dirname(SELF), 'render-page.mjs');
const JUDGE = path.join(path.dirname(SELF), 'judge-fresh.mjs');
const jobsDir = () => { fs.mkdirSync(SHIP_JOBS_DIR, { recursive: true }); return path.resolve(SHIP_JOBS_DIR); };
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
  const log = path.resolve(jobLogPath(id));
  writeJob({ id, page, args: renderArgs, log, status: 'starting', startedAt: Date.now(), judge: process.env.VAWE_SHIP_JUDGE !== '0' });
  spawn(process.execPath, [SELF, 'run', id], { detached: true, stdio: 'ignore' }).unref();
  console.log(`job ${id} started: final render of ${page} in the background`);
  console.log(`log: ${log}`);
  console.log(`status: bin/vawe ship --status ${page} --wait`);
  console.log(`work: ${WAIT_WORK}`);
}

function runJob(id) {
  const job = readJob(id);
  const fd = fs.openSync(job.log, 'a');
  const child = spawn(process.execPath, [RENDER, job.page, ...job.args, '--final', '--progress', '--job'], { stdio: ['ignore', 'pipe', 'pipe'] });
  writeJob({ ...job, status: 'running', pid: process.pid });
  let started = false;
  let verdictLater = null;
  const masterReady = () => {
    const checked = { ...readJob(id), renderMs: Date.now() - job.startedAt, ...finalCheck(outputsOf(logText(job)), pageAuthoring(job.page)) };
    if (!checked.outputs.length) return;
    writeJob({ ...checked, status: 'judging' });
    verdictLater = new Promise((resolve) => (checked.judge ? judgeFinal(checked, resolve) : resolve(null)));
  };
  const relay = (chunk) => {
    fs.writeSync(fd, chunk);
    if (!verdictLater && /(^|[\r\n])✓ /.test(String(chunk))) masterReady();
    const first = started ? null : firstCapture(String(chunk));
    if (!first) return;
    started = true;
    writeJob({ ...readJob(id), capture: { first, at: Date.now() } });
  };
  child.stdout.on('data', relay);
  child.stderr.on('data', relay);
  child.on('close', async (code) => {
    if (code !== 0) {
      const failure = { ...finalFailure(logText(job), `exit ${code}`), page: job.page };
      appendRun(job.page, shipEvent({ verdict: 'failed', renderS: (Date.now() - job.startedAt) / 1000, failure }));
      return writeJob({ ...readJob(id), status: 'failed', exit: code, endedAt: Date.now(), failure });
    }
    if (!verdictLater) return finishJob(id, { ...readJob(id), renderMs: Date.now() - job.startedAt, ...finalCheck([], null) });
    const verdict = await verdictLater;
    finishJob(id, { ...readJob(id), ...(verdict ? { verdict } : {}) });
  });
}

async function finishJob(id, job) {
  const acceptance = job.outputs.length ? await finalAcceptance(job).then((a) => ({ acceptance: a }), (e) => ({ acceptanceError: e.message })) : {};
  const done = { ...job, ...acceptance, status: 'done', endedAt: Date.now() };
  appendRun(job.page, shipEvent({ verdict: shipVerdict(done), renderS: job.renderMs / 1000, acceptance: done.acceptance?.counts }));
  writeJob(done);
}

function judgeFinal(job, done) {
  const brief = path.join(path.dirname(job.page), 'brief.md');
  const args = [JUDGE, job.outputs[0], '--stage', 'final', ...(fs.existsSync(brief) ? ['--brief', brief] : [])];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => done(verdictLines(out, code)));
}

const verdictLines = (text, code) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !/^(next:|PASS$|FIX$)/.test(l.trim()));
  return code === 0 ? lines : [`judge failed (exit ${code})`, ...lines.slice(-3)];
};

const outputsOf = (text) => text.split(/[\r\n]+/).filter((l) => l.startsWith('✓ ')).map((l) => l.slice(2).split(':')[0]);

const filmName = (mp4) => path.basename(mp4).replace(/\.(web\.)?mp4$/, '').replace(/-draft$/, '');

function finalCheck(outputs, authoring) {
  try {
    const problems = outputs.flatMap((mp4) => videoProblems(readVideo(mp4), authoring, lastPageFacts(filmName(mp4))).map((p) => (outputs.length > 1 ? `${path.basename(mp4)}: ${p}` : p)));
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
  const etaMs = job.capture ? captureEtaMs({ first: job.capture.first, firstAt: job.capture.at, done, total, now: Date.now() }) : null;
  const eta = etaMs === null ? 'not known yet' : `about ${clock(etaMs)}`;
  return `job ${job.id}: running, ${done}/${total} subframes (${Math.round((100 * done) / total)}%), ${clock(elapsed)} in, ${eta} left, then encode`;
}

const LINE_CAP = 240;

function errorLines(text) {
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter((l) => l && !l.includes('capturing '));
  const errors = lines.filter((l) => /^✗|error|failed/i.test(l));
  return (errors.length ? errors : lines).slice(-4).map((l) => (l.length > LINE_CAP ? `${l.slice(0, LINE_CAP)}...` : l));
}

function finalLines(job, text) {
  if (job.status === 'done') return doneLines(job);
  if (job.status === 'cancelled') return [`job ${job.id}: cancelled, a newer job for the same page replaced it`];
  return [failedLine(job, text, `exit ${job.exit}`), `job ${job.id}: failed (exit ${job.exit}) after ${clock(job.endedAt - job.startedAt)}`, ...errorLines(text), `full log: ${job.log}`];
}

function failedLine(job, text, fallback) {
  const { pct, reason } = job.failure ?? finalFailure(text, fallback);
  return failedShipLine(filmKeyOf(job.page), { failedAt: pct, reason, page: job.page });
}

function newestJobFor(page) {
  const jobs = allJobs().filter((j) => samePage(j.page, page)).sort((a, b) => b.startedAt - a.startedAt);
  return jobs[0]?.id;
}

const resolveTarget = (arg) => (arg && fs.existsSync(arg) && arg.endsWith('.html') ? newestJobFor(arg) : arg) || newestJob();

function statusOf(id) {
  const target = resolveTarget(id);
  if (!target) die('no ship job yet: start one with vawe ship <page>');
  if (!fs.existsSync(stateFile(target))) die(`no such job: ${target}`);
  const job = readJob(target);
  const text = logText(job);
  if (['done', 'failed', 'cancelled'].includes(job.status)) return finalLines(job, text);
  if (job.status === 'running' && !pidAlive(job.pid)) return [failedLine(job, text, 'the render process died without a result'), `job ${job.id}: the render process died without a result`, `log: ${job.log}`];
  if (job.status === 'judging') return renderedLines(job);
  return [progressLine(job, text), `work: ${WAIT_WORK}`, `log: ${job.log}`];
}

const renderedLines = (job) => [
  `job ${job.id}: RENDERED in ${clock(job.renderMs)}, the mp4 is ready; NOT JUDGED yet (a fresh judge and the acceptance rows run now, about 70 s)`,
  ...job.outputs.map((o) => `output: ${o}`),
];

const isOver = (id) => ['done', 'failed', 'cancelled'].includes(readJob(id).status) || (readJob(id).status === 'running' && !pidAlive(readJob(id).pid));

async function waitThenStatus(id) {
  const target = resolveTarget(id);
  const until = Date.now() + WAIT_CAP_MS;
  let announced = false;
  let nextProgress = Date.now() + PROGRESS_MS;
  while (target && fs.existsSync(stateFile(target)) && !isOver(target) && Date.now() < until) {
    if (!announced && readJob(target).status === 'judging') { announced = true; console.log(renderedLines(readJob(target)).join('\n')); }
    if (Date.now() >= nextProgress) { nextProgress += PROGRESS_MS; console.log(statusOf(target)[0]); }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(statusOf(target).join('\n'));
  if (target && fs.existsSync(stateFile(target)) && !isOver(target)) console.log(`not done after ${clock(WAIT_CAP_MS)}: run the same command once more`);
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'start') startJob(rest[0], rest.slice(1));
else if (mode === 'run') runJob(rest[0]);
else if (mode === 'status') {
  const [id] = rest.filter((a) => a !== '--wait');
  if (rest.includes('--wait')) await waitThenStatus(id);
  else console.log(statusOf(id).join('\n'));
} else die('usage: ship-job.mjs start <page> [args] | status [job] [--wait]');
