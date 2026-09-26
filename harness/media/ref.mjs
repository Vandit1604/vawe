//   make ref URL=https://…/pin/123/ NAME=some-name
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REFS = path.join(ROOT, 'refs');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const NAME_ARG = flag('name', null);
const urls = argv.filter((a) => /^https?:\/\//.test(a));
if (!urls.length) { console.error('usage: node harness/media/ref.mjs <url> [--name x] [more urls…]'); process.exit(2); }
if (NAME_ARG && urls.length > 1) { console.error('✗ --name with more than one url: they cannot all have it. Run them one at a time.'); process.exit(2); }
fs.mkdirSync(REFS, { recursive: true });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

const known = () => {
  const map = new Map();
  for (const f of fs.readdirSync(REFS).filter((x) => x.endsWith('.mp4'))) {
    try { map.set(sha(path.join(REFS, f)), f.replace(/\.mp4$/, '')); } catch { /* unreadable */ }
  }
  return map;
};

for (const url of urls) {
  console.log(`\n  ${url}`);
  const page = spawnSync('curl', ['-sL', '-A', UA, url], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '';
  const mp4s = [...new Set([...page.matchAll(/https:\/\/[\w.-]*pinimg\.com\/[^"'\\ ]+?\.mp4/g)].map((m) => m[0]))];
  if (!mp4s.length) {
    console.log(`  ✗ no mp4 on that page. It may be an image pin, or the markup changed.`);
    continue;
  }
  const best = mp4s.sort((a, b) => (+(/_(\d+)w\./.exec(b) || [0, 0])[1]) - (+(/_(\d+)w\./.exec(a) || [0, 0])[1]))[0];
  const id = (/\/pin\/(\d+)/.exec(url) || [])[1] || String(Date.now());
  const name = NAME_ARG || `pin-${id}`;
  const dest = path.join(REFS, `${name}.mp4`);
  spawnSync('curl', ['-sL', '-o', dest, best], { encoding: 'utf8' });
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 1024) { console.log(`  ✗ download produced nothing usable`); fs.rmSync(dest, { force: true }); continue; }

  const h = sha(dest);
  const twin = [...known()].find(([hash, n]) => hash === h && n !== name);
  if (twin) {
    console.log(`  · already here as "${twin[1]}" (identical bytes). Removed the duplicate download.`);
    fs.rmSync(dest, { force: true });
    continue;
  }
  console.log(`  → refs/${name}.mp4  (${(fs.statSync(dest).size / 1e6).toFixed(1)}MB)`);
  const r = spawnSync('node', [path.join(ROOT, 'harness/media/study.mjs'), path.relative(ROOT, dest), name],
    { cwd: ROOT, encoding: 'utf8' });
  const line = String(r.stdout).split('\n').find((l) => l.startsWith('✓')) || String(r.stderr).slice(0, 200);
  console.log(`  ${line.trim()}`);
}
console.log(`\n  Then: make study-tool X=grammar   ·   fill the reading in grammar/<name>.json   ·   make study-tool X=claims\n`);
