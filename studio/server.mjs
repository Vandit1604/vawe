// studio/server.mjs — Shortwave Studio: a live, in-browser editor + preview for the formats.
// Serves the repo statically (so scene.html, /core, /engine/assets, /formats load), serves the
// studio UI at /, and holds the currently-edited data in memory so the preview iframe can fetch
// it. This is the "online editor" layer: edit content → see it live (no render). Export still
// goes through bin/shortwave (the /__save endpoint writes the JSON + returns the render command).
//
//   node studio/server.mjs            → http://localhost:4321
//   PORT=5000 node studio/server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4321;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4' };

let liveData = '{}'; // the data the preview iframe fetches (updated as you edit)

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)); });

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/') return send(res, 200, 'text/html', fs.readFileSync(path.join(repoRoot, 'studio', 'index.html')));
  if (pathname === '/__live.json') return send(res, 200, 'application/json', liveData);
  if (pathname === '/__data' && req.method === 'POST') { liveData = await readBody(req); return send(res, 200, 'application/json', '{"ok":true}'); }

  if (pathname === '/__formats') {
    const dir = path.join(repoRoot, 'formats');
    const list = fs.readdirSync(dir).filter((f) => fs.existsSync(path.join(dir, f, 'scene.html')));
    return send(res, 200, 'application/json', JSON.stringify(list));
  }

  if (pathname === '/__save' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const rel = String(body.path || '').replace(/^\/+/, '');
      const fp = path.join(repoRoot, rel);
      if (!fp.startsWith(path.join(repoRoot, 'formats') + path.sep) || !fp.endsWith('.json')) {
        return send(res, 400, 'application/json', JSON.stringify({ error: 'path must be formats/<format>/<name>.json' }));
      }
      fs.writeFileSync(fp, JSON.stringify(body.data, null, 2) + '\n');
      return send(res, 200, 'application/json', JSON.stringify({ ok: true, cmd: `./bin/shortwave ${rel}` }));
    } catch (e) { return send(res, 400, 'application/json', JSON.stringify({ error: String(e) })); }
  }

  // static file fallback (repo root)
  const fp = path.join(repoRoot, decodeURIComponent(pathname).replace(/^\/+/, ''));
  if (!fp.startsWith(repoRoot) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

server.listen(PORT, () => console.log(`\n  ◆ Shortwave Studio  →  http://localhost:${PORT}\n  (edit content live; export with the printed bin/shortwave command)\n`));
