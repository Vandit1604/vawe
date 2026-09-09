// scripts/media/ref.mjs: fetch a reference film from a link, and study it.
//
//   node scripts/media/ref.mjs <url> [name] [more urls…]
//   make ref URL=https://…/pin/123/ NAME=some-name
//
// WHY THIS IS A SCRIPT. The technique is three lines of curl and it has now been re-derived from
// scratch three times, once by me an hour after reading a doc that already documented it
// (docs/CRAFT/REF-together-chat.md: "yt-dlp is not installed here, so the pin page was fetched with
// curl and the v1.pinimg.com mp4 pulled out of its metadata"). A procedure that lives only in prose is
// a procedure everyone re-invents, which is the same evaporation `grammar/` exists to stop, one step
// earlier in the pipeline.
//
// A PIN PAGE LIES ABOUT ITSELF, so the metadata is used for the FILE and never for the reading.
// `og:description` on the first pin studied here described a different pin entirely, and `og:url`
// pointed at a third. The mp4 is the only honest thing on the page.
//
// Nothing here enters the repo. `refs/` is gitignored; what gets committed is `grammar/<name>.json`,
// which holds measurements and sentences and no pixels.
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
if (!urls.length) { console.error('usage: node scripts/media/ref.mjs <url> [--name x] [more urls…]'); process.exit(2); }
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
  // The highest rendition the page names. Pinterest serves a ladder and the widths are in the filename,
  // so preferring the largest number is preferring the best copy without parsing their JSON blob.
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

  // Deduped BEFORE studying, because a study of a twin costs a minute and produces a second row for one
  // film that then doubles it in every comparison the corpus makes.
  const h = sha(dest);
  const twin = [...known()].find(([hash, n]) => hash === h && n !== name);
  if (twin) {
    console.log(`  · already here as "${twin[1]}" (identical bytes). Removed the duplicate download.`);
    fs.rmSync(dest, { force: true });
    continue;
  }
  console.log(`  → refs/${name}.mp4  (${(fs.statSync(dest).size / 1e6).toFixed(1)}MB)`);
  const r = spawnSync('node', [path.join(ROOT, 'scripts/media/study.mjs'), path.relative(ROOT, dest), name],
    { cwd: ROOT, encoding: 'utf8' });
  const line = String(r.stdout).split('\n').find((l) => l.startsWith('✓')) || String(r.stderr).slice(0, 200);
  console.log(`  ${line.trim()}`);
}
console.log(`\n  Then: make grammar   ·   fill the reading in grammar/<name>.json   ·   make claims\n`);
