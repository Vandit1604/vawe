// A capture step that never resolves is caught by the stall watchdog: the first stall names the worker,
// frame and step and restarts the slice; a second stall on the same slice is an error. Needs Chrome.
//   node --test tests/media/render-stall.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { renderPage, InvariantError } from '../../harness/media/render-page.mjs';

// Each slice opens its own browser for a page outside the repo, so the count of stalls lives in this process:
// the page asks a local counter, and `once` stalls only on the first ask.
const page = (once, port) => `<!doctype html><html><head><meta charset="utf-8"><meta name="duration" content="0.5">
<style>body{margin:0;background:#123}</style></head><body><script>
window.seek = (t) => {
  document.body.style.background = 'rgb(' + Math.round(t * 400) + ',40,90)';
  if (t < 0.2) return;
  const ask = new XMLHttpRequest();
  ask.open('GET', 'http://127.0.0.1:${port}/stall', false);
  ask.send();
  if (${once} && ask.responseText !== '1') return;
  return new Promise(() => {});
};
</script></body></html>`;

async function render(name, once, dir) {
  let asks = 0;
  const counter = http.createServer((req, res) => {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    res.end(String(++asks));
  });
  await new Promise((r) => counter.listen(0, '127.0.0.1', r));
  fs.mkdirSync(path.join(dir, name));
  const pagePath = path.join(dir, name, 'page.html');
  fs.writeFileSync(pagePath, page(once, counter.address().port));
  const logged = [];
  const error = console.error;
  console.error = (line) => logged.push(String(line));
  try {
    return { r: await renderPage(pagePath, path.join(dir, `${name}.mp4`), { fps: 30, workers: 1, stallMs: 1500 }), logged };
  } catch (e) { return { e, logged }; } finally { console.error = error; counter.close(); }
}

test('a stalled seek restarts its slice once and the render finishes', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stall-'));
  try {
    const { r, e, logged } = await render('once', true, dir);
    assert.equal(e, undefined, e && e.message);
    assert.equal(r.frames, 15);
    assert.deepEqual(r.restarted, ['0.00-0.50s']);
    assert.match(logged.join('\n'), /render stalled: worker 1, frame 6 \(0\.20 s\), in seek for \d+ s; restarting slice 0\.00-0\.50s once/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a second stall on the same slice is an error that names the step', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stall-'));
  try {
    const { e } = await render('always', false, dir);
    assert.ok(e instanceof InvariantError, String(e));
    assert.match(e.message, /render stalled: worker 1, frame 6 \(0\.20 s\), in seek .*the second time on slice 0\.00-0\.50s/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a font first shown mid-film whose file never arrives fails at the font wait within its 10 s limit', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-stall-'));
  const hang = http.createServer((req, res) => { res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'font/woff2' }); });
  await new Promise((r) => hang.listen(0, '127.0.0.1', r));
  try {
    const pagePath = path.join(dir, 'page.html');
    fs.writeFileSync(pagePath, `<!doctype html><html><head><meta charset="utf-8"><meta name="duration" content="0.2">
<style>@font-face{font-family:Never;src:url(http://127.0.0.1:${hang.address().port}/never.woff2)}body{margin:0;background:#123;color:#fff}p{display:none;font:80px Never}</style>
</head><body><p>Hi</p><script>window.seek = (t) => { document.querySelector('p').style.display = t > 0.1 ? 'block' : 'none'; };</script></body></html>`);
    const started = Date.now();
    await assert.rejects(renderPage(pagePath, path.join(dir, 'out.mp4'), { fps: 30, workers: 1 }), /font still loading after 10000 ms: Never/);
    assert.ok(Date.now() - started < 30000);
  } finally { hang.closeAllConnections(); hang.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
