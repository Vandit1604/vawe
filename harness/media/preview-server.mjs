// harness/media/preview-server.mjs: a small local process that keeps ONE browser open across calls, so
// a fast check (--look/--dom/--probe/--layout in see.mjs, and a windowed draft in render-page.mjs)
// skips Chrome's cold start on every run. Measured cost this exists for: "each fast check reopens the
// browser and page" (see.mjs's own doc comment). It starts itself on the first call that wants it and
// exits on its own after 5 idle minutes, checked against this file's own mtime (bumped on every use, no
// second heartbeat channel). If it is not running, or anything about starting or reaching it fails,
// `openPreview` falls back to a plain serveRepo+launchPage per call, exactly like before this file
// existed: this is an optimization, never a second way to load a page.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scratch } from '../lib/scratch.mjs';
import { serveRepo, launchPage, trackBrowser, insideRoot, REPO_ROOT, RENDER_ARGS, PAGE_ARGS, PROTOCOL_TIMEOUT_MS } from '../lib/render-harness.mjs';

const SELF = fileURLToPath(import.meta.url);
// One daemon per checkout: a shared state file made a worktree render pages from another checkout's root.
const STATE_FILE = scratch('preview-server', `${createHash('sha1').update(REPO_ROOT).digest('hex').slice(0, 10)}.json`);
const IDLE_MS = 5 * 60 * 1000;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return null; }
}
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function touch() {
  try { const now = new Date(); fs.utimesSync(STATE_FILE, now, now); } catch { /* daemon exits on its own next idle check */ }
}

function waitForState(timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    (function tick() {
      const s = readState();
      if (s && s.wsEndpoint) return resolve(s);
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, 100);
    })();
  });
}

async function connectShared() {
  let state = readState();
  if (!state || !pidAlive(state.pid)) {
    try { spawn(process.execPath, [SELF, '--daemon'], { detached: true, stdio: 'ignore' }).unref(); }
    catch { return null; }
    state = await waitForState(5000);
    if (!state) return null;
  }
  try {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.connect({ browserWSEndpoint: state.wsEndpoint, protocolTimeout: PROTOCOL_TIMEOUT_MS });
    touch();
    return { browser, port: state.port };
  } catch { return null; }
}

// A page's `../../core/...` imports and assets resolve against its own checkout, so serve from that
// checkout's top level; only a page in no repo is served from its own folder.
function pageRoot(abs) {
  const dir = path.dirname(abs);
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || dir;
  } catch { return dir; }
}

// Size and mtime of every file under the dirs: any edit to the page folder or to core/ changes it.
export function treeSignature(dirs) {
  const h = createHash('sha1');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else { const st = fs.statSync(p); h.update(`${p}:${st.size}:${st.mtimeMs};`); }
    }
  };
  for (const d of dirs) if (fs.existsSync(d)) walk(d);
  return h.digest('hex');
}

const WARM_TABS = 3;

// A warm tab is one this function left open on a page url, marked with window.__warmSig. A tab whose
// signature is stale reloads; the oldest tabs past WARM_TABS close.
async function takeWarmPage(browser, url, sig) {
  const warm = [];
  for (const p of await browser.pages()) if (await p.evaluate(() => Boolean(window.__warmSig)).catch(() => false)) warm.push(p);
  for (const p of warm.slice(0, Math.max(0, warm.length - WARM_TABS + 1))) if (p.url() !== url) await p.close().catch(() => {});
  const found = warm.find((p) => !p.isClosed() && p.url() === url);
  const reused = Boolean(found) && (await found.evaluate(() => window.__warmSig)) === sig;
  if (found && !reused) await found.close().catch(() => {});
  return { page: reused ? found : await browser.newPage(), reused };
}

/**
 * openPreview(pagePath, { width, height, args }) -> { page, url, persistent, close }.
 * With `warm`, the page stays open after close() and the next call on the same url and unchanged files
 * gets it back with `reused: true`; the caller runs `markWarm()` once the page has loaded.
 * `url` is already the right one to `page.goto()`: relative to the shared daemon's REPO_ROOT server
 * when the shared browser is live and `pagePath` is inside the repo, a fresh per-call server otherwise
 * (a scratch/tmp fixture outside the repo, or the daemon not running). `close()` releases only what
 * THIS call opened: its own page when persistent, the whole server+browser otherwise. `args` (default
 * RENDER_ARGS) only affects the fallback launch: the shared browser is always launched with PAGE_ARGS,
 * the one flag a rapid screenshot loop (render-page.mjs) needs and a single still never does.
 */
export async function openPreview(pagePath, { width = 1920, height = 1080, args = RENDER_ARGS, warm = false } = {}) {
  const abs = path.resolve(pagePath);
  if (insideRoot(REPO_ROOT, abs)) {
    const shared = await connectShared();
    if (shared) {
      const url = `http://127.0.0.1:${shared.port}/${path.relative(REPO_ROOT, abs)}`;
      const sig = warm ? treeSignature([path.dirname(abs), path.join(REPO_ROOT, 'core')]) : '';
      const { page, reused } = warm ? await takeWarmPage(shared.browser, url, sig) : { page: await shared.browser.newPage(), reused: false };
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      if (warm) return { page, url, persistent: true, reused, markWarm: () => page.evaluate((v) => { window.__warmSig = v; }, sig), close: async () => shared.browser.disconnect() };
      // `disconnect()`, never `close()`: this call's own CDP connection to the shared browser, not the
      // browser itself. Closing only the page and never disconnecting left the connection's open socket
      // holding the process alive well past the render finishing (a real hang this file was measured
      // against: a windowed draft's own log line printed, then nothing exited for ~30s).
      return { page, url, persistent: true, close: async () => { await page.close().catch(() => {}); shared.browser.disconnect(); } };
    }
  }
  const root = pageRoot(abs);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width, height, args });
  const url = `http://127.0.0.1:${port}/${path.relative(root, abs).split(path.sep).join('/')}`;
  return { page, url, persistent: false, close: async () => { await closePage(); closeServer(); } };
}

async function daemonMain() {
  const { default: puppeteer } = await import('puppeteer');
  const { close: closeServer, port } = await serveRepo({ root: REPO_ROOT });
  const browser = trackBrowser(await puppeteer.launch({ headless: true, args: PAGE_ARGS, protocolTimeout: PROTOCOL_TIMEOUT_MS }));
  fs.writeFileSync(STATE_FILE, JSON.stringify({ pid: process.pid, port, wsEndpoint: browser.wsEndpoint() }));

  const shutdown = async () => {
    clearInterval(idleTimer);
    try { await browser.close(); } catch { /* already gone */ }
    closeServer();
    try { fs.rmSync(STATE_FILE, { force: true }); } catch { /* a fresher daemon may have replaced it */ }
    process.exit(0);
  };
  const idleTimer = setInterval(() => {
    let mtime = 0;
    try { mtime = fs.statSync(STATE_FILE).mtimeMs; } catch { return shutdown(); }
    if (Date.now() - mtime > IDLE_MS) shutdown();
  }, 30000);
}

if (process.argv.includes('--daemon')) daemonMain();
