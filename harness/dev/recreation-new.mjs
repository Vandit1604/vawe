// harness/dev/recreation-new.mjs: the recreation starter. `make dev-tool X=new TYPE=recreation
// NAME=<name> REF=<ref.mp4>` writes films/recreations/<name>/page.html (a real page, not a scene JSON:
// see engine-doctrine/CRAFT/RECREATION.md for that other loop) plus a `see` pass on the reference, so
// the very first file an agent opens already carries the reference's own dense shots and motion
// budget, never a blank page. Reuses see.mjs's own CLI (no second reference-reading path) and
// core/motion/timeline.js's timeline sheet (no second motion mechanism).
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

const PAGE_HTML = (name, refBase, duration) => `<!-- films/recreations/${name}/page.html: recreation starter for ${refBase}.
     Own words, own images, own icons only. Match only the reference's motion, timing, layout and light.
     Loop: \`make next PAGE=page.html REF=${refBase}\` until it passes, then the final render. -->
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="duration" content="${duration.toFixed(2)}">
<style>
@font-face { font-family: "Inter"; src: url("../../../assets/fonts/Inter.woff2") format("woff2");
             font-weight: 100 900; font-display: swap; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0a0a0a; }
body { font-family: "Inter", sans-serif; color: #f5f5f5; display: flex; align-items: center; justify-content: center; }
.hero { font-size: 96px; font-weight: 700; letter-spacing: -0.02em; opacity: 0; }
.hero .letter { display: inline-block; opacity: 0; transform: translateY(24px); }
</style>
</head>
<body>
<h1 class="hero" id="hero">recreate me</h1>

<script type="application/json" id="timing">
[
  { "el": "#hero", "from": { "opacity": 0 }, "to": { "opacity": 1 }, "at": 0, "dur": 0.01 },
  { "el": "#hero .letter", "from": { "opacity": 0, "transform": "translateY(24px)" },
    "to": { "opacity": 1, "transform": "translateY(0px)" }, "at": 0.1, "dur": 0.4, "stagger": 0.03 }
]
</script>

<script type="module">
import { timelineFromScript } from "/core/motion/timeline.js";
const hero = document.getElementById("hero");
hero.innerHTML = [...hero.textContent].map((ch, i) =>
  \`<span class="letter" style="--i:\${i}">\${ch === " " ? "&nbsp;" : ch}</span>\`).join("");
timelineFromScript(document);
</script>
</body>
</html>
`;

function main() {
  const env = process.env;
  const type = env.TYPE || 'recreation';
  if (type !== 'recreation') die(`unknown TYPE=${type}. Only TYPE=recreation is built.`);
  const name = env.NAME;
  const ref = env.REF;
  if (!name || !ref) die('usage: make dev-tool X=new TYPE=recreation NAME=<name> REF=<ref.mp4>');
  const refAbs = path.resolve(ref);
  if (!fs.existsSync(refAbs)) die(`no such reference file: ${ref}`);

  const outDir = path.join(ROOT, 'films/recreations', name);
  if (fs.existsSync(outDir)) die(`${path.relative(ROOT, outDir)} already exists`);
  fs.mkdirSync(outDir, { recursive: true });

  const duration = ffprobeDuration(refAbs);
  const pagePath = path.join(outDir, 'page.html');
  fs.writeFileSync(pagePath, PAGE_HTML(name, path.basename(ref), duration));

  const seeDir = path.join(outDir, 'see');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'harness/media/see.mjs'), refAbs, seeDir],
    { stdio: 'inherit', cwd: ROOT });
  if (r.status) die(`see.mjs failed on ${ref}`);

  const relPage = path.relative(ROOT, pagePath);
  console.log(`\nmake next PAGE=${relPage} REF=${ref}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
export { ffprobeDuration, PAGE_HTML };
