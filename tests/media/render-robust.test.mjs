// A navigation timeout retries once with a longer limit; a draft that fails or is killed writes a failed `dev` line to runs.jsonl.
//   node --test --test-concurrency=1 tests/media/render-robust.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { gotoLoaded } from '../../harness/media/render-page.mjs';

const RENDER = path.resolve('harness/media/render-page.mjs');
const fakePage = (failures) => {
  const calls = [];
  const handlers = {};
  return {
    calls, handlers,
    on: (name, fn) => { handlers[name] = fn; },
    evaluate: async () => true,
    goto: async (url, o) => { calls.push(o.timeout); if (calls.length <= failures) throw Object.assign(new Error('Navigation timeout of 30000 ms exceeded'), { name: 'TimeoutError' }); },
  };
};

test('one navigation timeout retries with a longer limit', async () => {
  const page = fakePage(1);
  await gotoLoaded(page, 'http://x');
  assert.equal(page.calls.length, 2);
  assert.ok(page.calls[1] > page.calls[0]);
});

test('a second timeout fails, and another error is not retried', async () => {
  const twice = fakePage(2);
  await assert.rejects(gotoLoaded(twice, 'http://x'), /Navigation timeout/);
  assert.equal(twice.calls.length, 2);
  const other = { calls: 0, on() {}, goto: async () => { other.calls++; throw new Error('net::ERR_CONNECTION_REFUSED'); } };
  await assert.rejects(gotoLoaded(other, 'http://x'), /ERR_CONNECTION_REFUSED/);
  assert.equal(other.calls, 1);
});

test('a stalled load with an unfinished request fails at once and names the request and the console error', async () => {
  const page = fakePage(1);
  const goto = page.goto;
  page.goto = async (url, o) => {
    page.handlers.request({ resourceType: () => 'media', url: () => 'http://x/assets/sfx/pop1.mp3' });
    page.handlers.console({ type: () => 'error', text: () => 'Failed to decode' });
    return goto(url, o);
  };
  await assert.rejects(gotoLoaded(page, 'http://x', 'films/a/page.html'), (e) => /no load event after 30 s/.test(e.message) && /media http:\/\/x\/assets\/sfx\/pop1\.mp3/.test(e.message) && /console error: Failed to decode/.test(e.message));
  assert.equal(page.calls.length, 1);
});

function runDraft(cwd, page, env, onLine) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RENDER, path.resolve(page), '--w', '160'], { cwd, env: { ...process.env, ...env } });
    let out = '';
    const feed = (d) => { out += d; onLine?.(child, out); };
    child.stdout.on('data', feed);
    child.stderr.on('data', feed);
    child.on('close', (code) => resolve({ code, out }));
  });
}

const devLines = (cwd) => {
  const dir = path.join(cwd, 'out');
  const file = fs.readdirSync(dir).find((n) => n.endsWith('.runs.jsonl'));
  return fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
};

test('a draft killed while it waits for a render slot logs a failed dev line', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-robust-'));
  const slots = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-robust-slots-'));
  fs.writeFileSync(path.join(slots, 'slot-0.json'), JSON.stringify({ pid: process.pid, start: new Date().toISOString(), kind: 'draft', who: 'holder' }));
  try {
    let sent = false;
    const { out } = await runDraft(cwd, 'tests/fixtures/pages/seek-canvas.html', { VAWE_RENDER_SLOT_DIR: slots, VAWE_RENDER_SLOTS: '1' }, (child, text) => {
      if (!sent && text.includes('waiting for a render slot')) { sent = true; child.kill('SIGTERM'); }
    });
    assert.match(out, /waiting for a render slot \(1 in use: holder \(draft, pid \d+, running \d+s\)\)/);
    const [line] = devLines(cwd);
    assert.equal(line.cmd, 'dev');
    assert.equal(line.failed, true);
    assert.equal(line.reason, 'killed by SIGTERM');
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); fs.rmSync(slots, { recursive: true, force: true }); }
});

test('a draft that fails an invariant logs a failed dev line with the error', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-robust-'));
  try {
    const { code } = await runDraft(cwd, 'tests/fixtures/pages/invariants/invariant-throw-bad.html', {});
    assert.notEqual(code, 0);
    const [line] = devLines(cwd);
    assert.equal(line.failed, true);
    assert.ok(line.reason.length > 0);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});

test('a rotate keyframe with a per-keyframe easing renders', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-robust-'));
  try {
    const { code, out } = await runDraft(cwd, 'tests/fixtures/pages/rotate-ease.html', {});
    assert.equal(code, 0, out);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});
