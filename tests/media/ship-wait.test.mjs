// `ship-job.mjs status --wait` blocks until the job ends or the cap passes and prints one progress line per interval.
//   node --test --test-concurrency=1 tests/media/ship-wait.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SHIP_JOB = path.resolve('harness/media/ship-job.mjs');

function runWait(cwd, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SHIP_JOB, 'status', 'demo-1', '--wait'], { cwd, env: { ...process.env, ...env } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', () => resolve(out));
  });
}

function jobDir(job) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-shipwait-'));
  fs.mkdirSync(path.join(cwd, 'out', 'ship-jobs'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'out', 'ship-jobs', 'demo-1.json'), JSON.stringify({ id: 'demo-1', page: 'films/demo/page.html', args: [], log: path.join(cwd, 'out', 'ship-jobs', 'demo-1.log'), startedAt: Date.now(), ...job }));
  return cwd;
}

test('a running job prints a progress line each interval, then says to run the wait once more at the cap', async () => {
  const cwd = jobDir({ status: 'running', pid: process.pid });
  try {
    const out = await runWait(cwd, { VAWE_SHIP_WAIT_MS: '5500', VAWE_SHIP_PROGRESS_MS: '2000' });
    const progress = out.split('\n').filter((l) => l.startsWith('job demo-1: running'));
    assert.ok(progress.length >= 3, out);
    assert.match(out, /not done after 6s: run the same command once more/);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});

test('a finished job returns at once without a progress line', async () => {
  const cwd = jobDir({ status: 'failed', exit: 2, endedAt: Date.now(), failure: { pct: 40, reason: 'x' } });
  try {
    const t0 = Date.now();
    const out = await runWait(cwd, { VAWE_SHIP_WAIT_MS: '5000', VAWE_SHIP_PROGRESS_MS: '2000' });
    assert.ok(Date.now() - t0 < 4000);
    assert.match(out, /job demo-1: failed/);
    assert.doesNotMatch(out, /not done/);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});
