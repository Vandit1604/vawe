// harness/dev/recreation-new.mjs: the recreation starter, run by `vawe new <name> --ref <ref.mp4>`
// (env TYPE, NAME, REF). Writes films/recreations/<name>/page.html, a SPEC.md of measured numbers for the
// reference (harness/media/ref-spec.mjs) and a `see` pass, so the first file an agent opens points at
// the reference's own cuts, moves, palette and sound hits, never a blank page.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const die = (msg) => { console.error(`\u2717 ${msg}`); process.exit(2); };

function ffprobeDuration(video) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', video], { encoding: 'utf8' });
  const dur = Number(String(p.stdout).trim());
  return dur > 0 ? dur : 10;
}

const PAGE_HTML = (name, refBase, duration, fps) => `<!-- films/recreations/${name}/page.html: recreation starter for ${refBase}.
     Read SPEC.md next to this file first: cuts, per-frame moves, palette, sound hits, KEEP/CHANGE block.
     Own words, own images, own icons only. Keep the reference's timing, cuts, camera and easing; change the brand.
     Numbers live as literals: @keyframes stops, element.animate() keyframes, or a [[frame, value]] table in seek(t).
     Loop: \`vawe critique page.html --ref ${refBase}\` until it passes, then the final render. -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="duration" content="${duration.toFixed(3)}">
<meta name="fps" content="${fps}">
<style>
@font-face { font-family: "Anybody"; src: url("../../../assets/fonts/Anybody.woff2") format("woff2");
             font-weight: 100 900; font-stretch: 50% 150%; font-display: swap; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
body { font-family: "Anybody", sans-serif; color: #f5f5f5; display: flex; align-items: center; justify-content: center; }
.hero { font-size: 5vw; font-weight: 700; letter-spacing: -0.02em; animation: hero-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes hero-in {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
</head>
<body>
<h1 class="hero">recreate me</h1>
</body>
</html>
`;

function main() {
  const env = process.env;
  const type = env.TYPE || 'recreation';
  if (type !== 'recreation') die(`unknown TYPE=${type}. Only TYPE=recreation is built.`);
  const name = env.NAME;
  const ref = env.REF;
  if (!name || !ref) die('usage: vawe new <name> --ref <ref.mp4>');
  const refAbs = path.resolve(ref);
  if (!fs.existsSync(refAbs)) die(`no such reference file: ${ref}`);

  const outDir = path.join(ROOT, 'films/recreations', name);
  if (fs.existsSync(outDir)) die(`${path.relative(ROOT, outDir)} already exists`);
  fs.mkdirSync(outDir, { recursive: true });

  const duration = ffprobeDuration(refAbs);
  const pagePath = path.join(outDir, 'page.html');
  const spec = spawnSync(process.execPath, [path.join(ROOT, 'harness/media/ref-spec.mjs'), refAbs, '--out', outDir],
    { stdio: 'inherit', cwd: ROOT });
  if (spec.status) die(`ref-spec.mjs failed on ${ref}`);
  const fps = JSON.parse(fs.readFileSync(path.join(outDir, 'spec.json'), 'utf8')).fps;
  fs.writeFileSync(pagePath, PAGE_HTML(name, path.basename(ref), duration, fps));
  // reference.json: the folder's own declaration that this page is a recreation of `ref`, read by
  // render-page.mjs to refuse a FINAL render until the required motion check has passed.
  fs.writeFileSync(path.join(outDir, 'reference.json'), JSON.stringify({ ref: path.relative(ROOT, refAbs) }, null, 1) + '\n');

  const seeDir = path.join(outDir, 'see');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'harness/media/see.mjs'), refAbs, seeDir],
    { stdio: 'inherit', cwd: ROOT });
  if (r.status) die(`see.mjs failed on ${ref}`);

  const relPage = path.relative(ROOT, pagePath);
  console.log(`\nSPEC: ${path.relative(ROOT, path.join(outDir, 'SPEC.md'))} (edit its KEEP/CHANGE block)`);
  console.log(`vawe critique ${relPage} --ref ${ref}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
export { ffprobeDuration, PAGE_HTML };
