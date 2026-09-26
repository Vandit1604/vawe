import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

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

export const RENDER_ARGS = ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'];

/** launchPage({ width, height, scale, args }) → { browser, page, close } */
export async function launchPage({ width, height, scale = 1, args = RENDER_ARGS } = {}) {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  return { browser, page, close: () => browser.close() };
}

/**
 * waitForEngine(page, { timeout, throwOnTimeout }) → null | string
 * Waits for scene.html to park either __engineReady or __engineError, then reports the error.
 * A single-scene tool wants the timeout to be fatal (the default); a sweep over hundreds of scenes
 * wants it recorded as one scene's failure, so it passes throwOnTimeout: false and reads 'timeout'.
 */
export async function waitForEngine(page, { timeout = 30000, throwOnTimeout = true } = {}) {
  try {
    await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout });
  } catch (e) {
    if (throwOnTimeout) throw e;
    return 'timeout';
  }
  return await page.evaluate(() => (window.__engineError ? String(window.__engineError) : null));
}

const SUGAR_RE = /"type"\s*:\s*"(block|beat|comp)"/;

/**
 * bootPathFor(root, rawText, expandedScene, relFile) -> the repo-relative path to `?data=` for THIS
 * scene: `relFile` unchanged, unless `rawText` (the scene AS AUTHORED, before expansion) carries
 * `block`/`beat`/`comp` sugar, in which case `films/scene/scene.js` (the render page) cannot expand
 * it itself (its own file banner says why: a deliberate server boundary, not a bundler limit), and
 * this writes `expandedScene` (every one of these tools already runs the scene through
 * `loadScene`/`sceneTiming` for its own measurements, so the caller has it on hand already) to a
 * scratch file under `.vawe-data/scenes/` and returns THAT path instead. One function so every
 * browser-side tool that boots a scene resolves sugar the same way `./bin/vawe` does a level down in
 * Go (internal/render/expand.go): expand before the browser ever fetches the JSON, never in it.
 */
export function bootPathFor(root, rawText, expandedScene, relFile) {
  if (!SUGAR_RE.test(rawText)) return relFile;
  const dir = path.join(root, '.vawe-data', 'scenes');
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, `_boot.${process.pid}.${Date.now().toString(36)}.${path.basename(relFile)}`);
  fs.writeFileSync(abs, JSON.stringify(expandedScene));
  return path.relative(root, abs);
}
