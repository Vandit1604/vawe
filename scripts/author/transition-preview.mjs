// transition-preview.mjs — SEE a transition before you author it. Renders a canned two-beat scene
// (beat A → beat B) through one transition and lays the window out as a filmstrip → /tmp/transition-preview.png,
// so you can read its motion, direction and easing without building a whole video first.
//
//   make transition-preview FX=whipPan                       (a seam, default)
//   make transition-preview FX=slide DIR=up                  (direction reads on the strip)
//   make transition-preview FX=whipPan TIMING=linear         (compare easing side by side)
//   make transition-preview FX=zoom MECH=cut                 (a scene cut instead of a seam)
//   make transition-preview FX=glitch MECH=sting             (a sting overlay)
//
// The strip samples the transition window at even steps and labels each frame with its eased progress,
// so `TIMING=linear` vs `smooth` is visible as WHERE the motion bunches. Two legible beats (a blue "A"
// and an orange "B") make direction and the from→to swap obvious. Deterministic; no video is muxed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { SEAM_FX } from '../../core/seams.js';
import { PRESENTATIONS, TIMINGS } from '../../core/cuts.js';
import { SHADER_FX } from '../../core/stings.js';
import { ANIM_NAMES } from '../../core/clips.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = (k, d) => process.env[k] || d;
const FX = env('FX', '');
const DIR = env('DIR', 'left');
const TIMING = env('TIMING', 'smooth');
const DUR = Math.max(0.2, Math.min(3, +env('DUR', '0.7')));
let MECH = env('MECH', '');

// mechanism registries — a transition belongs to exactly one (docs/CRAFT/TRANSITIONS.md).
const REG = { seam: SEAM_FX, cut: Object.keys(PRESENTATIONS).filter((n) => n !== 'none'), sting: SHADER_FX, anim: [...ANIM_NAMES] };

if (!FX) {
  console.error('usage: make transition-preview FX=<name> [MECH=seam|cut|sting|anim] [DIR=left|right|up|down] [TIMING=smooth|linear|…] [DUR=0.7]');
  console.error(`  seams:  ${REG.seam.join(' ')}`);
  process.exit(2);
}
// infer the mechanism from the name when unambiguous; default seam (the two-scene transitions).
if (!MECH) {
  const owners = Object.keys(REG).filter((m) => REG[m].includes(FX));
  MECH = owners.includes('seam') ? 'seam' : owners[0] || 'seam';
}
if (!REG[MECH]) { console.error(`✗ unknown MECH "${MECH}" — one of: ${Object.keys(REG).join(', ')}`); process.exit(2); }
if (!REG[MECH].includes(FX)) {
  console.error(`✗ "${FX}" is not a ${MECH} transition. ${MECH}s: ${REG[MECH].join(', ')}`);
  const elsewhere = Object.keys(REG).filter((m) => REG[m].includes(FX));
  if (elsewhere.length) console.error(`  (it IS a ${elsewhere.join('/')} transition — pass MECH=${elsewhere[0]})`);
  process.exit(2);
}
if ((MECH === 'seam' || MECH === 'cut') && !TIMINGS[TIMING]) {
  console.error(`✗ unknown TIMING "${TIMING}" — one of: ${Object.keys(TIMINGS).join(', ')}`); process.exit(2);
}

// ---- the canned two-beat scene: solid A (blue) → solid B (orange), swapped by the transition ----
const T = 1.2;                          // beat A holds [0, T)
const END = +(T + DUR + 1.2).toFixed(2); // beat B holds [T+DUR, END)
const W = 1920, H = 1080;
const label = (t, txt, color, extra) => ({ type: 'text', text: txt, x: 0, y: 400, w: W, align: 'center', size: 240, weight: 800, color: '#fff', start: t, ...extra });
const panel = (t, dur, color, extra) => ({ type: 'rect', x: 0, y: 0, w: W, h: H, bg: color, start: t, duration: dur, ...extra });

const beatA = [panel(0, T, '#12233f', { exitDur: 0 }), label(0, 'A', '#fff', { duration: T, exitDur: 0 })];
const beatB = [panel(T, END - T, '#f26b3a', { enterDur: 0 }), label(T, 'B', '#fff', { duration: END - T, enterDur: 0 })];

// author the canned scene through the UNIFIED transition surface (core/transitions-lower.js) — the same
// one an author writes — so the preview dogfoods the API. `mech` is passed explicitly so MECH=cut vs
// MECH=seam previews the same ambiguous fx (slide/fade/wipe) as each mechanism.
const scene = { module: 'scene', aspect: '16:9', duration: END, theme: 'linear', layers: [...beatA, ...beatB] };
if (MECH === 'anim') { // a layer entrance/exit: sugar over anim/out, window = dur
  beatA.forEach((l) => { l.transition = { out: FX, dur: DUR }; l.duration = T + DUR; });
  beatB.forEach((l) => { l.transition = { in: FX, dur: DUR }; l.start = T; });
} else { // a boundary transition: routed to seam/cut/sting by mech
  scene.transitions = [{ at: T, fx: FX, dur: DUR, dir: DIR, timing: TIMING, mech: MECH }];
}

// the scene must be served from UNDER the repo root (scene.html fetches it by URL, and the browser
// normalises any `..` out of an off-root path → 404). out/ is inside the root and gitignored.
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const sceneFile = path.join(ROOT, 'out', `transition-preview-${MECH}.json`);
fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
const dataUrl = '/' + path.relative(ROOT, sceneFile).split(path.sep).join('/');
const tmpDir = process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : '/tmp';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }
const F = 30;

// sample the transition window (plus a beat on each side) at even steps; label each with eased progress.
const N = 7;
const t0 = T - 0.25, t1 = T + DUR + 0.25;
const ease = TIMINGS[TIMING] || TIMINGS.linear;
const frames = Array.from({ length: N }, (_, k) => {
  const t = t0 + ((t1 - t0) * k) / (N - 1);
  const raw = Math.max(0, Math.min(1, (t - T) / DUR));
  return { t, tag: t < T ? 'from' : t >= T + DUR ? 'to' : `${Math.round((MECH === 'seam' || MECH === 'cut' ? ease(raw) : raw) * 100)}%` };
});

const strip = path.join(tmpDir, 'tp_frames'); fs.rmSync(strip, { recursive: true, force: true }); fs.mkdirSync(strip, { recursive: true });
const tileW = 420, tileH = Math.round((tileW * H) / W);
const cells = [];
for (let k = 0; k < frames.length; k++) {
  const { t, tag } = frames[k];
  await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(t * F));
  const raw = path.join(strip, `f${k}.png`);
  await page.screenshot({ path: raw, clip: { x: 0, y: 0, width: W, height: H } });
  const lab = path.join(strip, `f${k}_l.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
    `scale=${tileW}:${tileH},drawtext=text='${tag}':x=10:y=10:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.65`, lab]);
  cells.push(lab);
}
await browser.close(); server.close();

const sheet = '/tmp/transition-preview.png';
spawnSync('ffmpeg', ['-v', 'error', '-y', ...cells.flatMap((c) => ['-i', c]), '-filter_complex', `hstack=inputs=${cells.length}`, '-frames:v', '1', sheet]);
const easeNote = (MECH === 'seam' || MECH === 'cut') ? ` · timing ${TIMING}` : '';
const dirNote = (MECH === 'seam' || MECH === 'cut') ? ` · dir ${DIR}` : '';
console.log(`✓ ${MECH} · ${FX}${dirNote}${easeNote} · ${DUR}s  →  ${sheet}`);
console.log('  Read the strip left→right: the labels are eased progress. Does the motion read, is the');
console.log('  direction right, and does the from→to swap land where you want it? Decision theory: docs/CRAFT/TRANSITIONS.md');
