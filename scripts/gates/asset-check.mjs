// scripts/gates/asset-check.mjs — ASSET-READINESS PREFLIGHT. A scene that names a logo / icon / captured
// UI / photo / VO that isn't on disk renders a BROKEN image or a silent gap — and you find out at render,
// or worse, in the mp4. This walks the scene for every asset REFERENCE (image/component/lottie src, audio
// vo/music/spectrum, any assets|formats path) and confirms the file exists, so you fetch what's missing
// BEFORE authoring around it. Remote http(s)/data: refs are noted, not failed (can't check offline).
//
//   node scripts/gates/asset-check.mjs <scene.json> [--strict]   ·   make asset-check D=<file>
// WARN by default (with the command to get each asset); --strict blocks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file || !fs.existsSync(file)) { console.error('usage: node scripts/gates/asset-check.mjs <scene.json> [--strict]'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const sceneDir = path.dirname(path.resolve(file));

// `.html` is here because a hand-authored fragment can now live in a file (`{"type":"html","src":…}`).
// Without it a fragment path outside assets|formats|themes was not even a candidate, so the one asset
// whose absence STOPS the render was the one asset the preflight did not look for.
const ASSET_EXT = /\.(png|jpe?g|webp|gif|svg|mp4|webm|wav|mp3|m4a|json|html|woff2?)$/i;
const isPathish = (s) => typeof s === 'string' && !/\s/.test(s) && (/^\/?(assets|formats|themes)\//.test(s) || (s.includes('/') && ASSET_EXT.test(s)));
const remote = (s) => /^(https?:)?\/\//.test(s) || s.startsWith('data:');
// a scene resolves an asset path against a few bases (repo root, the scene's own dir); accept any hit.
const resolvesToFile = (p) => {
  const bases = [p, path.join(ROOT, p.replace(/^\/+/, '')), path.join(sceneDir, p)];
  return bases.some((b) => { try { return fs.existsSync(b) && fs.statSync(b).isFile(); } catch { return false; } });
};

// collect [where, value] for every string in the scene, tagged by a readable location.
const refs = [];
function walk(node, where) {
  if (typeof node === 'string') { if (isPathish(node) || remote(node)) refs.push([where, node]); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${where}[${i}]`)); return; }
  if (node && typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], where ? `${where}.${k}` : k);
}
(data.layers || []).forEach((l, i) => walk(l, `layer[${i}]${l && l.type ? `(${l.type})` : ''}`));
if (data.audio) walk(data.audio, 'audio');
if (data.bg) walk(data.bg, 'bg');

// audio.music may be a NAMED bed ("lofi") resolved by the mixer, not a path — don't treat a bare name as missing.
const isNamedBed = (where, v) => /audio\.music$/.test(where) && !v.includes('/') && !ASSET_EXT.test(v);

const missing = [], remotes = [], seen = new Set();
for (const [where, v] of refs) {
  if (isNamedBed(where, v)) continue;
  const key = where + '=' + v; if (seen.has(key)) continue; seen.add(key);
  if (remote(v)) { remotes.push([where, v]); continue; }
  if (!resolvesToFile(v)) missing.push([where, v]);
}

// a targeted "how to get it" per missing kind.
const howto = (v) => {
  if (/\.(wav|mp3|m4a)$/i.test(v)) return `narration/music — make tts SCRIPT=… OUT=${v.replace(/\.(wav|mp3|m4a)$/i, '')}, or drop the file in place`;
  if (/assets\/icons\//.test(v)) return `icon/logo — make assets D=${file} WRITE=1 (fills brand logos + UI icons)`;
  if (/\.html$/i.test(v)) return `hand-authored fragment — write the HTML at this path, then preview it: make preview HTML=${v}`;
  if (/\.json$/i.test(v)) return `captured component — make capture URL=… SEL=… OUT=${v}`;
  if (ASSET_EXT.test(v)) return `image — make assets D=${file} WRITE=1, or make capture / make photos`;
  return `add the file at this path`;
};

console.log(`\n  asset preflight · ${file}  (${refs.length} reference(s) · ${remotes.length} remote)`);
if (remotes.length) for (const [w, v] of remotes) console.log(`    · remote (not checked): ${v}  [${w}]`);
if (!missing.length) { console.log(`  ✓ every local asset reference resolves to a file on disk.\n`); process.exit(0); }
console.log(`  ${missing.length} MISSING asset(s) — the render will show a broken image / silent gap:`);
for (const [w, v] of missing) console.log(`    ✗ ${v}  [${w}]\n        → ${howto(v)}`);
console.log(strict ? `\n  ✗ asset preflight (strict): fetch these before rendering.\n` : `\n  fetch these before you author around them (make assets D=${file} fills most). Block with --strict.\n`);
process.exit(strict && missing.length ? 1 : 0);
