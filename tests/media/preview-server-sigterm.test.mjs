// `kill <pid>` on the preview daemon must close its browser and exit, not spin.
//   node --test tests/media/preview-server-sigterm.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { STATE_FILE } from '../../harness/media/preview-server.mjs';

const DAEMON = 'harness/media/preview-server.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('the preview server exits within 2 s of SIGTERM', async () => {
  const child = spawn(process.execPath, [DAEMON, '--daemon'], { stdio: 'ignore' });
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    try { if (JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).pid === child.pid) break; } catch { /* not started yet */ }
    await sleep(100);
  }
  child.kill('SIGTERM');
  const result = await Promise.race([exited, sleep(2000).then(() => null)]);
  if (!result) child.kill('SIGKILL');
  fs.rmSync(STATE_FILE, { force: true });
  assert.ok(result, 'the server was still running 2 s after SIGTERM');
});
