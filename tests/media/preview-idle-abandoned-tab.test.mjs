// A preview daemon quits after its idle limit even when a dead client left a tab open, and at once when its checkout is gone.
//   node --test tests/media/preview-idle-abandoned-tab.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import { shouldExit, stateFile } from '../../harness/media/preview-server.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('shouldExit: idle past the limit, or a missing checkout', () => {
  const base = { touchedMs: 1000, nowMs: 1500, idleMs: 1000, rootExists: true };
  assert.equal(shouldExit(base), false);
  assert.equal(shouldExit({ ...base, nowMs: 2500 }), true);
  assert.equal(shouldExit({ ...base, rootExists: false }), true);
});

test('a daemon with an abandoned tab exits after its idle limit', async () => {
  const child = spawn(process.execPath, ['harness/media/preview-server.mjs', '--daemon', '--draft'], { stdio: 'ignore', env: { ...process.env, VAWE_PREVIEW_IDLE_MS: '1500' } });
  const exited = new Promise((resolve) => child.once('exit', () => resolve(true)));
  try {
    let state = null;
    for (const until = Date.now() + 15000; Date.now() < until && !state; await sleep(100)) {
      try { const s = JSON.parse(fs.readFileSync(stateFile(false), 'utf8')); if (s.pid === child.pid) state = s; } catch { /* not started yet */ }
    }
    assert.ok(state, 'the daemon did not start');
    const browser = await puppeteer.connect({ browserWSEndpoint: state.wsEndpoint });
    await browser.newPage();
    browser.disconnect();
    assert.ok(await Promise.race([exited, sleep(8000).then(() => false)]), 'the daemon is still running 8 s after its last use');
  } finally {
    if (alive(child.pid)) child.kill('SIGTERM');
  }
});
