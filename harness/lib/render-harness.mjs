import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The union of every table the 22 copies carried; a narrower table served a real file as application/octet-stream, which is how a .mp4 or an .otf silently failed to play or load.
export const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// Every copy wrote `p.startsWith(root)`, which also accepts a SIBLING whose name merely begins with the root's (/repo passes for /repo-evil); path.relative answers the question that was meant: is p at or below root.
export function insideRoot(root, p) {
  const rel = path.relative(root, p);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

/**
 * serveRepo({ root, port, route }) → { server, port, close }
 * A static file server over `root`, bound to 127.0.0.1. `port` 0 (the default) takes any free port.
 * `route(req, res)` is the hook for a virtual path a caller serves from memory: return true when it
 * answered the request, anything falsy to fall through to the static handler.
 */
export async function serveRepo({ root = REPO_ROOT, port = 0, route = null } = {}) {
  const server = http.createServer((req, res) => {
    if (route && route(req, res)) return;
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!insideRoot(root, p) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return { server, port: server.address().port, close: () => server.close() };
}

// The flags a deterministic capture needs: no sandbox (CI), no scrollbars over the canvas, and a device scale the caller owns rather than the host's display.
export const RENDER_ARGS = ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'];

// A final keeps GPU compositing off: ~150+ rapid seek+screenshot round trips crashed the GPU compositor
// there, and its pixels must not depend on the GPU. A draft composites on the GPU (1.5x faster at half
// size) and its pixels differ from a final's by about 44 dB PSNR. `--disable-gpu` (broader) would make
// WebGL context creation fail.
export const pageArgs = (final) => (final ? [...RENDER_ARGS, '--disable-gpu-compositing'] : RENDER_ARGS);

// A time-capped scene command (`perl -e 'alarm ...' exec`) SIGTERMs this process and leaves Chrome
// behind, because puppeteer's browser.close() runs on the way out only if something calls it; a killed
// node process never gets there. Tracked here once, so every caller that launches through this file (or
// registers its own puppeteer.launch() with trackBrowser) gets the close for free instead of each one
// re-inventing its own signal handler.
const liveBrowsers = new Set();
let handlersInstalled = false;

// A SIGKILLed node process runs no handler at all, so every launched Chrome is also written to this directory
// (file name = Chrome pid, content = owner pid); the next render to start kills the Chromes whose owner is dead.
const CHROME_DIR = path.join(os.tmpdir(), 'vawe-chrome');
const CLOSE_GRACE_MS = 5000;
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const killGroup = (pid) => { try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ } } };

export function reapOrphanBrowsers(dir = CHROME_DIR) {
  if (!fs.existsSync(dir)) return 0;
  let reaped = 0;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const owner = Number(fs.readFileSync(file, 'utf8'));
    if (pidAlive(owner)) continue;
    const command = spawnSync('ps', ['-p', name, '-o', 'command='], { encoding: 'utf8' }).stdout;
    if (/puppeteer_dev_chrome_profile/.test(command)) { killGroup(Number(name)); reaped++; }
    fs.rmSync(file, { force: true });
  }
  return reaped;
}

function registerBrowser(browser, dir = CHROME_DIR) {
  const pid = browser.process()?.pid;
  if (!pid) return () => {};
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, String(pid));
  fs.writeFileSync(file, String(process.pid));
  return () => fs.rmSync(file, { force: true });
}

function installCleanupHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  const closeAll = async () => {
    const browsers = [...liveBrowsers];
    liveBrowsers.clear();
    for (const b of browsers) {
      const closed = await Promise.race([b.close().then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), CLOSE_GRACE_MS))]);
      if (!closed) { const pid = b.process()?.pid; if (pid) killGroup(pid); }
    }
  };
  process.on('exit', () => { for (const b of liveBrowsers) { const pid = b.process()?.pid; if (pid) killGroup(pid); } });
  reapOrphanBrowsers();
  for (const [sig, code] of [['SIGTERM', 143], ['SIGINT', 130], ['SIGALRM', 143], ['SIGHUP', 129]]) {
    process.on(sig, async () => { await closeAll(); process.exit(code); });
  }
  process.on('uncaughtException', async (e) => { await closeAll(); console.error(e); process.exit(1); });
  process.on('unhandledRejection', async (e) => { await closeAll(); console.error(e); process.exit(1); });
}

/**
 * trackBrowser(browser) → browser, registered so a SIGTERM/SIGINT/SIGALRM or an uncaught error closes
 * it before this process exits. Idempotent to call more than once per process. Use this directly for a
 * puppeteer.launch() call that bypasses launchPage below (scene-snap.mjs, snap-scenes.mjs: both need a
 * fresh, non-default launch() of their own).
 */
export function trackBrowser(browser) {
  installCleanupHandlers();
  liveBrowsers.add(browser);
  const unregister = registerBrowser(browser);
  const origClose = browser.close.bind(browser);
  browser.close = async (...a) => { liveBrowsers.delete(browser); try { return await origClose(...a); } finally { unregister(); } };
  return browser;
}

// Puppeteer's default is 180 s per protocol call; a heavy WebGL frame late in a long render can exceed it.
export const PROTOCOL_TIMEOUT_MS = 30 * 60 * 1000;

/** launchPage({ width, height, scale, args }) → { browser, page, close } */
export async function launchPage({ width, height, scale = 1, args = RENDER_ARGS } = {}) {
  const { default: puppeteer } = await import('puppeteer');
  const browser = trackBrowser(await puppeteer.launch({ headless: true, args, protocolTimeout: PROTOCOL_TIMEOUT_MS }));
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  return { browser, page, close: () => browser.close() };
}
