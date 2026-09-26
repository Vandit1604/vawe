// tests/authoring/review-server-bind.test.mjs: harness/author/review-server.mjs used to `server.listen(PORT)`
// with no host, which node defaults to 0.0.0.0, exposing the review page to the whole network. It now
// binds to 127.0.0.1, like harness/lib/render-harness.mjs's serveRepo() does.
//
// Real integration test: spins the script up as a child process against tests/fixtures/review-server-
// bind.fixture.json (a synthetic mp4 stands in for a real render, since gradeable()/frameTile() only
// need a valid mp4 on disk, not one the Go renderer produced) and confirms the port answers on the
// loopback address but refuses a connection aimed at the machine's real LAN address.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = path.join(ROOT, 'tests/fixtures/review-server-bind.fixture.json');

function lanAddress() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return null;
}

function tryConnect(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: 1500 });
    sock.on('connect', () => { sock.destroy(); resolve('connected'); });
    sock.on('timeout', () => { sock.destroy(); resolve('timeout'); });
    sock.on('error', () => resolve('refused'));
  });
}

test('review-server binds to 127.0.0.1, not every interface', async () => {
  const lan = lanAddress();
  if (!lan) { console.log('no non-loopback interface on this machine, skipping the cross-interface check'); }

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'review-server-bind-'));
  const outDir = path.join(cwd, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const mp4 = path.join(outDir, 'review-server-bind.fixture.mp4');
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=4:size=1920x1080:rate=10', mp4],
    { stdio: 'ignore' });

  const port = 8000 + (process.pid % 1000);
  const child = spawn(process.execPath, [path.join(ROOT, 'harness/author/review-server.mjs'),
    `D=${FIXTURE}`, `PORT=${port}`], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });

  try {
    await new Promise((resolve, reject) => {
      let out = '';
      const onData = (d) => { out += d; if (out.includes('http://127.0.0.1')) resolve(); };
      child.stdout.on('data', onData);
      child.on('exit', (code) => reject(new Error(`review-server exited early (${code}): ${stderr}`)));
      setTimeout(() => reject(new Error(`review-server never printed its listen line: ${stderr}`)), 15000);
    });

    assert.equal(await tryConnect('127.0.0.1', port), 'connected', 'the loopback address must still work');
    if (lan) {
      const result = await tryConnect(lan, port);
      assert.notEqual(result, 'connected', `binding to 127.0.0.1 must refuse a connection aimed at ${lan}, got ${result}`);
    }
  } finally {
    child.kill();
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
