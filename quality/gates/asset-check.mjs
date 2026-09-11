// quality/gates/asset-check.mjs: ASSET-READINESS PREFLIGHT. A scene that names a logo / icon / captured
// UI / photo / VO that isn't on disk renders a BROKEN image or a silent gap, and you find out at render,
// or worse, in the mp4. This walks the scene for every asset REFERENCE (image/component/lottie src, audio
// vo/music/spectrum, any assets|formats path) and confirms the file exists, so you fetch what's missing
// BEFORE authoring around it. Remote http(s)/data: refs are noted, not failed (can't check offline).
//
//   node quality/gates/asset-check.mjs <scene.json> [--strict]   ·   make asset-check D=<file>
// WARN by default (with the command to get each asset); --strict blocks.
//
// DO NOT DELETE THIS AS REDUNDANT. `preloadImages` in core/boot.js now THROWS on a repo-local image
// that 404s, which is the right place for that refusal and does close the "missing picture reaches the
// mp4" hole. It does not replace this file, and the difference is worth stating because the overlap
// looks total:
//   · this runs BEFORE a render, on the shell, in milliseconds. The boot throw costs a browser launch
//     and arrives from inside one of eight workers.
//   · it names the FIX per asset: the `curl` / `make capture` / `make photos` line that fetches the
//     thing, where the engine can only say the file is not there.
//   · it covers what no image preloader ever sees: VO and music (`audio.vo`, `audio.music`), lottie,
//     captured `component` JSON, spectrum sidecars, and `.html` fragment files.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = process.argv[2];
const strict = process.argv.includes('--strict');
// A missing asset / typeface is a WARN by default and only becomes BLOCKING under --strict, which is a
// caller flag rather than a fixed severity, so the finding's severity is computed from it directly.
const sev = () => (strict ? 'error' : 'warn');
const f = gateFindings();
if (!file || !fs.existsSync(file)) { console.error('usage: node quality/gates/asset-check.mjs <scene.json> [--strict]'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const sceneDir = path.dirname(path.resolve(file));

// `.html` is here because a hand-authored fragment can now live in a file (`{"type":"html","src":…}`).
// Without it a fragment path outside assets|formats|themes was not even a candidate, so the one asset
// whose absence STOPS the render was the one asset the preflight did not look for.
const ASSET_EXT = /\.(png|jpe?g|webp|gif|svg|mp4|webm|wav|mp3|m4a|json|html|woff2?)$/i;
const isPathish = (s) => typeof s === 'string' && !/\s/.test(s) && (/^\/?(assets|formats|themes)\//.test(s) || (s.includes('/') && ASSET_EXT.test(s)));
const remote = (s) => /^(https?:)?\/\//.test(s) || s.startsWith('data:');
// a scene resolves an asset path against a few bases (repo root, the scene's own dir); accept any hit.
// Returns the RESOLVED PATH, not a boolean. It used to return a bare true, which is fine for a
// yes/no existence test and useless to any caller that then wants to OPEN the file, the keyframe probe
// below handed `true` to ffprobe and got "true: No such file or directory". Truthy either way, so every
// existing caller is unchanged.
const fileFor = (p) => {
  const bases = [p, path.join(ROOT, p.replace(/^\/+/, '')), path.join(sceneDir, p)];
  for (const b of bases) { try { if (fs.existsSync(b) && fs.statSync(b).isFile()) return b; } catch { /* unreadable */ } }
  return null;
};
const resolvesToFile = (p) => fileFor(p) != null;

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

// audio.music may be a NAMED bed ("lofi") resolved by the mixer, not a path. Don't treat a bare name as missing.
const isNamedBed = (where, v) => /audio\.music$/.test(where) && !v.includes('/') && !ASSET_EXT.test(v);

// A repo-root-relative src (no leading `/`, no scheme) resolves under the page the scene is served
// from (/formats/scene/) and 404s in the browser with no visible error: core/engine/src-url.js is the
// one place that rewrites it to the served-root form, and image/video/icon all now route through it
// (docs/MISTAKES.md, the entry for this fix). This is a WARN, not a hard fail, exactly because the
// runtime already corrects it; the note is here so an author sees the mismatch and can write the
// served-root form directly next time instead of relying on the adaptation.
const isRelative = (v) => !/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith('/');
const adapted = [];

const missing = [], remotes = [], seen = new Set();
for (const [where, v] of refs) {
  if (isNamedBed(where, v)) continue;
  const key = where + '=' + v; if (seen.has(key)) continue; seen.add(key);
  if (remote(v)) { remotes.push([where, v]); continue; }
  if (!resolvesToFile(v)) { missing.push([where, v]); continue; }
  if (isRelative(v) && ASSET_EXT.test(v)) adapted.push([where, v]);
}

// a targeted "how to get it" per missing kind.
const howto = (v) => {
  if (/\.(wav|mp3|m4a)$/i.test(v)) return `narration/music: make tts SCRIPT=… OUT=${v.replace(/\.(wav|mp3|m4a)$/i, '')}, or drop the file in place`;
  if (/assets\/icons\//.test(v)) return `icon/logo: make assets D=${file} WRITE=1 (fills brand logos + UI icons)`;
  if (/\.html$/i.test(v)) return `hand-authored fragment, write the HTML at this path, then preview it: make preview HTML=${v}`;
  if (/\.json$/i.test(v)) return `captured component: make capture URL=… SEL=… OUT=${v}`;
  if (ASSET_EXT.test(v)) return `image: make assets D=${file} WRITE=1, or make capture / make photos`;
  return `add the file at this path`;
};

// THE TYPEFACES, which no scene references and nothing therefore checked.
//
// `assets/fonts/*.woff2` is gitignored, so a fresh worktree has none. `core/tokens.css` declares an
// @font-face against each one, the browser cannot find it, and it falls back. Nothing warns. Four
// render passes were judged for composition, hierarchy and line breaks in a high-contrast serif while
// the theme declared Anybody, and the only clue was that the frames looked wrong in a way nobody could
// name (docs/MISTAKES.md #331). A fallback renders perfectly happily, which is what makes it expensive.
//
// Derived from the stylesheet rather than listed here, so a face added to tokens.css is checked the
// day it is added and a list cannot go stale.
const cssPath = path.join(ROOT, 'core', 'tokens.css');
const fonts = new Map();
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  for (const m of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const fam = /font-family:\s*['"]([^'"]+)['"]/.exec(m[0]);
    const url = /url\(['"]([^'"]+\.woff2?)['"]\)/i.exec(m[0]);
    // One file backs several families (InterVariable is Inter, Inter Variable and Inter Display), so
    // the value is a SET. Keeping the last one seen would name one family and hide the other two.
    if (!fam || !url) continue;
    if (!fonts.has(url[1])) fonts.set(url[1], new Set());
    fonts.get(url[1]).add(fam[1]);
  }
}
const missingFonts = [...fonts].filter(([u]) => !resolvesToFile(u));

// FOOTAGE MUST BE SEEKABLE. `core/layers/video.js` never plays a clip; it seeks to a source time
// computed from the frame number, which is what keeps renderFrame(n) pure. A seek is only as accurate
// as the source's keyframes: Chrome lands on one and decodes forward, so a clip encoded with a sparse
// GOP returns a frame from somewhere BEFORE the time asked for, silently. Measured on a 6s test clip
// with a single keyframe: scene frame 150 rendered source frame 144, a fifth of a second early, with
// no error anywhere. Re-encoded all-intra, the same scene rendered 30/90/150 exactly.
//
// So this is checked, not documented and hoped for. The bar is one keyframe per second: enough that a
// forward decode from the nearest one lands inside a frame at any normal rate.
const videoRefs = refs.filter(([, v]) => /\.(mp4|webm|mov|m4v)$/i.test(v) && resolvesToFile(v));
const sparse = [];
// An unprobed clip and a clean clip printed the same nothing. Record which, so a machine without ffprobe
// cannot pass off "not measured" as "measured and fine".
const unprobed = [];
for (const [where, v] of videoRefs) {
  const f = fileFor(v);
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v',
      '-show_entries', 'packet=flags', '-of', 'csv=p=0', f], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const keys = (out.match(/K_/g) || []).length;
    const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim() || 0;
    if (dur > 0 && keys / dur < 1) sparse.push([where, v, keys, dur]);
  } catch (e) { unprobed.push([v, /ENOENT/.test(String(e && e.message)) ? 'ffprobe is not installed here' : 'ffprobe could not read it']); }
}
for (const [w, v, k, d] of sparse) f.warn('sparse-keyframes',
  `${v}  [${w}]  ${k} keyframe(s) in ${d.toFixed(1)}s, a seek lands early and the wrong frame renders, silently`,
  { at: w, fix: `ffmpeg -i ${v} -c:v libx264 -pix_fmt yuv420p -g 1 -crf 18 <out>.mp4   (all-intra; bigger file, exact seeks)` });

console.log(`\n  asset preflight · ${file}  (${refs.length} reference(s) · ${remotes.length} remote · ${fonts.size} typeface(s)`
  + `${videoRefs.length ? ` · ${videoRefs.length - unprobed.length}/${videoRefs.length} clip(s) keyframe-probed` : ''})`);

for (const [v, why] of unprobed) f.note('unprobed-video', `${v} not checked for sparse keyframes: ${why}`, { at: v });
for (const [u, fam] of missingFonts) f.finding({ severity: sev(), code: 'missing-font',
  summary: `${u} (${[...fam].join(', ')}) has no vendored file, every frame renders in a fallback face and nothing else will say so`,
  at: u, fix: 'make fonts   (about twenty seconds; assets/fonts is gitignored, so a fresh worktree has none)' });
for (const [w, v] of remotes) f.note('remote-asset', `${v}  [${w}]  not checked (remote)`, { at: w });
for (const [w, v] of adapted) f.note('adapted-asset-src',
  `adapted asset-src: ${v} -> /${v.replace(/^\.\//, '')}  [${w}]  (file exists at repo root; relative src resolves under the page)`, { at: w });
for (const [w, v] of missing) f.finding({ severity: sev(), code: 'missing-asset',
  summary: `${v}  [${w}]  the render will show a broken image / silent gap`, at: w, fix: howto(v) });

if (!missing.length && !missingFonts.length) console.log(`  ✓ every local asset reference and every declared typeface resolves to a file on disk.\n`);
else if (!missing.length) console.log(`  ✓ every local asset reference resolves to a file on disk.\n`);
else console.log(strict ? `\n  ✗ asset preflight (strict): fetch these before rendering.\n` : `\n  fetch these before you author around them (make assets D=${file} fills most). Block with --strict.\n`);

f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
