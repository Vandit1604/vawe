// Clients that find no preview daemon each start one at once. Only one may stay: the others each held a Chrome that nothing
// stopped, 69 of them after a loop of test runs. Launches Chrome in its own job dir.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SERVER = path.resolve(import.meta.dirname, '../../harness/media/preview-server.mjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('six daemons started together leave exactly one running', async () => {
  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-daemons-'));
  process.env.CLAUDE_JOB_DIR = jobDir;
  const { stateFile } = await import(SERVER);
  const children = Array.from({ length: 6 }, () => spawn(process.execPath, [SERVER, '--daemon', '--draft'], { env: process.env, stdio: 'ignore' }));
  try {
    const until = Date.now() + 20000;
    while (Date.now() < until && !fs.existsSync(stateFile(false))) await sleep(100);
    await sleep(3000);
    const running = children.filter((c) => alive(c.pid)).map((c) => c.pid);
    assert.deepEqual(running, [JSON.parse(fs.readFileSync(stateFile(false), 'utf8')).pid]);
  } finally {
    for (const c of children) c.kill('SIGTERM');
    await sleep(1500);
    delete process.env.CLAUDE_JOB_DIR;
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
});
