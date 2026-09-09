// verify/run.js: light, format-agnostic checks (no per-format special-casing).
//   per format: integrity (ffprobe) + safe-zone (critical bboxes ⊂ SAFE) + a contact sheet.
//   node verify/run.js [format ...]      (default: all formats)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { ffprobe } from './extract.js';
import { safeArea, ASPECTS, sceneDims } from '../core/layout/safe.js';
import { population } from '../scripts/lib/census.mjs';
import { serveRepo, waitForEngine } from '../scripts/lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
const OUT = path.join(repoRoot, 'quality', 'runs', 'out');
fs.mkdirSync(OUT, { recursive: true });
// The canvas and the safe box come from the SAMPLE, via core/safe.js, the same function boot.js
// places against and quality/audit.mjs checks with. This file used to hardcode a portrait 1080x1920
// viewport, a portrait safe box, and a 1080x1920 integrity assert, so it could only ever be right for
// one of the five aspects the engine renders, and it was a fourth independent opinion on "safe".
const dimsFor = (cfg) => sceneDims(cfg);

const modules = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));


const results = [];
const add = (check, m, pass, detail) => results.push({ check, m, pass, detail });

// assets: every image path in every data JSON must resolve to a real file (else broken-image placeholder).
// Image extension only: audio refs (assets/music.wav) are resolved separately by the mixer.
const isImg = (v) => typeof v === 'string' && /\.(svg|png|jpe?g|webp|gif)$/i.test(v);
function imgRefs(o, acc = []) {
  if (!o || typeof o !== 'object') return acc;
  for (const v of Object.values(o)) {
    if (isImg(v)) acc.push(v);
    else if (typeof v === 'object') imgRefs(v, acc);
  }
  return acc;
}
for (const m of modules) {
  const dir = path.join(formatsDir, m);
  if (!fs.existsSync(dir)) continue;
  // The asset sweep is the purest form of "absence read as a pass": a checkout that cannot see the
  // library finds no missing image and reports assets green. population() states N and refuses instead.
  for (const file of population(`assets · ${m}`, { dir: `formats/${m}`, filter: (f) => f !== 'schema.json' }).names) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }
    const missing = imgRefs(data)
      .filter((v) => !/^https?:/.test(v))
      .filter((v) => !fs.existsSync(path.join(v.startsWith('/') ? repoRoot : dir, v.replace(/^\/+/, ''))));
    if (missing.length) add('assets', m, false, `${file}: missing ${[...new Set(missing)].join(', ')}`);
  }
}

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

for (const m of modules) {
  const sample = `formats/${m}/sample.json`;
  if (!fs.existsSync(path.join(repoRoot, sample))) { add('exists', m, false, 'no sample.json'); continue; }
  const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, sample), 'utf8')); } catch { return {}; } })();
  const [VW, VH] = dimsFor(cfg);
  const SAFE = safeArea(VW, VH, cfg.destination || 'web');
  const out = path.join(OUT, `${m}.mp4`);
  console.log(`\n=== ${m} : render ===`);
  const r = spawnSync('go', ['run', './cmd/render', '--module', m, '--data', sample, '--out', out], { cwd: repoRoot, stdio: 'inherit' });
  if (r.status !== 0) { add('render', m, false, 'render failed'); continue; }

  // live scene for meta + safe-zone bboxes
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/${sample}&fps=30`, { waitUntil: 'load' });
  await waitForEngine(page);
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames;

  // integrity
  const fp = ffprobe(out);
  const v1 = fp.w === VW && fp.h === VH && Math.abs(fp.fps - 30) < 0.1 && fp.codec === 'h264'
    && Math.abs(fp.duration - meta.duration) <= 0.3 && !!fp.audioCodec;
  add('integrity', m, v1, `${fp.w}x${fp.h} (want ${VW}x${VH}) ${fp.fps}fps ${fp.codec} ${fp.duration}s/${meta.duration.toFixed(2)} audio=${fp.audioCodec}`);

  // safe-zone: every [data-layer=critical] bbox inside SAFE across 5 frames
  let safe = true; const bad = [];
  for (let i = 1; i <= 5; i++) {
    const f = Math.round((i / 6) * total);
    const boxes = await page.evaluate((n) => {
      window.__engine.renderFrame(n);
      return [...document.querySelectorAll('[data-layer="critical"]')].map((el) => {
        const b = el.getBoundingClientRect();
        return { id: el.id || el.className, x: b.left, y: b.top, r: b.right, btm: b.bottom, t: (el.textContent || '').slice(0, 12) };
      }).filter((b) => b.r - b.x > 1 && b.btm - b.y > 1);
    }, f);
    for (const b of boxes) if (b.x < SAFE.x0 - 1 || b.r > SAFE.x1 + 1 || b.y < SAFE.y0 - 1 || b.btm > SAFE.y1 + 1) {
      safe = false; bad.push(`f${f} ${b.id}[${b.t}] (${b.x | 0},${b.y | 0},${b.r | 0},${b.btm | 0})`);
    }
  }
  add('safe-zone', m, safe, safe ? 'all critical ⊂ SAFE' : bad.slice(0, 4).join(' ; '));
  await page.close();

  // contact sheet (key frames)
  const ts = [0.2, ...(meta.stings || []), meta.duration - 0.3].filter((t, i, a) => t >= 0 && t < meta.duration && a.indexOf(t) === i).slice(0, 12);
  const cs = path.join(repoRoot, 'verify', `.${m}_cs`); fs.rmSync(cs, { recursive: true, force: true }); fs.mkdirSync(cs, { recursive: true });
  ts.forEach((t, i) => spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', out, '-vf',
    `scale=270:480,drawtext=text='${t.toFixed(1)}s':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`,
    '-frames:v', '1', path.join(cs, `${String(i).padStart(2, '0')}.png`)]));
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(cs, '%02d.png'), '-vf', 'tile=4x3:padding=8:color=0x0a0a0c', '-frames:v', '1', path.join(repoRoot, 'verify', `${m}_contactsheet.png`)]);
  fs.rmSync(cs, { recursive: true, force: true });
  add('contact-sheet', m, true, `verify/${m}_contactsheet.png`);
}
await browser.close(); server.close();

console.log('\n==================== VERIFY ====================');
console.log('| check         | format       | result | detail');
for (const x of results) console.log(`| ${x.check.padEnd(13)} | ${x.m.padEnd(12)} | ${(x.pass ? 'PASS' : 'FAIL').padEnd(6)} | ${x.detail}`);
const fails = results.filter((x) => !x.pass);
console.log(`\n${fails.length ? '✗ ' + fails.length + ' FAIL' : '✓ ALL PASS'}  (${results.length} checks)`);
process.exit(fails.length ? 1 : 0);
