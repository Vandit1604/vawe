// verify/run.js — light, format-agnostic checks (no per-format special-casing).
//   per format: integrity (ffprobe) + safe-zone (critical bboxes ⊂ SAFE) + a contact sheet.
//   node verify/run.js [format ...]      (default: all formats)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { ffprobe } from './extract.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
const OUT = path.join(repoRoot, 'verify', 'out');
fs.mkdirSync(OUT, { recursive: true });
const SAFE = { x0: 60, y0: 240, x1: 900, y1: 1340 };

const modules = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
function startServer() {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}

const results = [];
const add = (check, m, pass, detail) => results.push({ check, m, pass, detail });

// assets: every image path in every data JSON must resolve to a real file (else broken-image placeholder).
// Image extension only — audio refs (assets/music.wav) are resolved separately by the mixer.
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
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json')) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }
    const missing = imgRefs(data)
      .filter((v) => !/^https?:/.test(v))
      .filter((v) => !fs.existsSync(path.join(v.startsWith('/') ? repoRoot : dir, v.replace(/^\/+/, ''))));
    if (missing.length) add('assets', m, false, `${file}: missing ${[...new Set(missing)].join(', ')}`);
  }
}

const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

for (const m of modules) {
  const sample = `formats/${m}/sample.json`;
  if (!fs.existsSync(path.join(repoRoot, sample))) { add('exists', m, false, 'no sample.json'); continue; }
  const out = path.join(OUT, `${m}.mp4`);
  console.log(`\n=== ${m} : render ===`);
  const r = spawnSync('go', ['run', './cmd/render', '--module', m, '--data', sample, '--out', out], { cwd: repoRoot, stdio: 'inherit' });
  if (r.status !== 0) { add('render', m, false, 'render failed'); continue; }

  // live scene for meta + safe-zone bboxes
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/${sample}&fps=30`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames;

  // integrity
  const fp = ffprobe(out);
  const v1 = fp.w === 1080 && fp.h === 1920 && Math.abs(fp.fps - 30) < 0.1 && fp.codec === 'h264'
    && Math.abs(fp.duration - meta.duration) <= 0.3 && !!fp.audioCodec;
  add('integrity', m, v1, `${fp.w}x${fp.h} ${fp.fps}fps ${fp.codec} ${fp.duration}s/${meta.duration.toFixed(2)} audio=${fp.audioCodec}`);

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
