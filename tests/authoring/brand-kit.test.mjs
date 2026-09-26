// tests/authoring/brand-kit.test.mjs: `make kit` (scripts/brand/kit.mjs) end to end, against a local
// fixture site so it never depends on a real brand's uptime. Proves the three steps land in one
// manifest: sections crawled, palette eyedropped, favicon fetched.
//   node tests/authoring/brand-kit.test.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'tests/fixtures/brand-kit-site');
const NAME = 'kit-fixture-brand';
const KIT_DIR = path.join(ROOT, 'assets/brands', NAME);

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const server = http.createServer((req, res) => {
  const file = req.url === '/' ? '/index.html' : req.url;
  const full = path.join(SITE, file);
  if (!full.startsWith(SITE) || !fs.existsSync(full)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': file.endsWith('.png') ? 'image/png' : 'text/html' });
  res.end(fs.readFileSync(full));
});

fs.rmSync(KIT_DIR, { recursive: true, force: true });

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

try {
  // async exec, not execFileSync: the fixture server runs in this same process, and a sync exec
  // blocks this event loop, so the server could never answer the child's requests.
  await execFileAsync(process.execPath, [path.join(ROOT, 'scripts/brand/kit.mjs'), url, NAME], { cwd: ROOT, encoding: 'utf8' });

  const kit = JSON.parse(fs.readFileSync(path.join(KIT_DIR, 'kit.json'), 'utf8'));
  assert(kit.sections.count === 2, `expected 2 sections, got ${kit.sections.count}`);
  assert(fs.existsSync(path.join(ROOT, kit.sections.manifest)), 'sections.json must exist');
  assert(typeof kit.palette.bg === 'string' && kit.palette.bg.startsWith('#'), 'palette.bg must be a hex string');
  assert(Array.isArray(kit.palette.accents), 'palette.accents must be an array');
  assert(fs.existsSync(path.join(ROOT, kit.palette.swatch)), 'palette swatch must be written');
  assert(kit.favicon === 'assets/brands/kit-fixture-brand/favicon.png', `unexpected favicon path ${kit.favicon}`);
  assert(fs.existsSync(path.join(ROOT, kit.favicon)), 'favicon file must exist');

  console.log('OK: make kit writes sections + palette + favicon into one kit.json');
} finally {
  server.close();
  fs.rmSync(KIT_DIR, { recursive: true, force: true });
}
