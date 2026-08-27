// scripts/lib/render-harness.mjs: ONE owner for the three things every browser-side tool in this
// repo needs: a static file server over the repo, a puppeteer page at a known size, and the wait for
// the engine to boot.
//
// WHY THIS EXISTS. The server below was copied into 22 scripts, and each copy carried its OWN
// path-traversal guard. Twenty-two separately maintained answers to one security question is a drift
// hazard: fixing the guard meant finding every copy, so nobody did. The Go renderer already treats the
// server as the wall rather than the curtain (`served` in internal/scene/scene.go, "WHY DEFAULT-DENY"):
// the SERVER, not the caller, decides what may leave. The same principle applies here, one level down.
//
// The scope is deliberately narrower than the Go one. That server renders scenes written by strangers
// and so ships a default-deny prefix allowlist; these scripts are author-side tools run against your
// own checkout, and every one of them needs the whole repo (site/, scripts/, out/, refs/). So the rule
// here stays root containment, with one correct implementation instead of 22 hand-rolled ones.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The union of every table the 22 copies carried. A narrower table served a real file as
// application/octet-stream, which is how a .mp4 or an .otf silently failed to play or load.
export const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// The guard. Every copy wrote `p.startsWith(root)`, which also accepts a SIBLING whose name merely
// begins with the root's (/repo passes for /repo-evil). path.relative answers the question that was
// meant: is p at or below root.
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
  // Reject rather than hang when the port is taken: a caller that asked for a FIXED port (studio) has
  // a better message for EADDRINUSE than an await that never settles.
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return { server, port: server.address().port, close: () => server.close() };
}

// The flags a deterministic capture needs: no sandbox (CI), no scrollbars over the canvas, and a
// device scale the caller owns rather than the host's display.
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
