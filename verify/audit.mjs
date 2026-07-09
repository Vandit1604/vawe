// verify/audit.mjs — layout audit: catches what eyes catch but checklists miss.
// Renders each format's sample headless across sampled frames and flags, on [data-layer="critical"]:
//   • overlap   — two critical boxes intersect            (HARD fail)
//   • overflow  — text clipped (scrollW/H > clientW/H)    (HARD fail)
//   • safe-zone — element outside the SAFE box            (HARD fail)
//   • tight     — sibling boxes closer than MIN_GAP px    (warn)
// Writes an annotated screenshot of the worst frame per format to /tmp/audit/<format>.png.
//   node verify/audit.mjs [format ...]      (default: all)   ·   make audit
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
const OUT = '/tmp/audit';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const SAFE = { x0: 60, y0: 240, x1: 900, y1: 1340 };  // portrait safe box (matches verify/run.js)
const MIN_GAP = 8;                                     // px; tighter than this between siblings = warn (cramped)
const SAMPLES = 14;                                    // frames sampled across the timeline

const modules = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
function startServer() {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}

// runs in-page: render frame n, measure every visible [data-layer=critical] box, return issues.
function auditFrameFn(n, SAFE, MIN_GAP) {
  window.__engine.renderFrame(n);
  const vis = (el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && +s.opacity > 0.05; };
  const els = [...document.querySelectorAll('[data-layer="critical"]')].filter((el) => {
    const b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1 && vis(el);
  });
  const info = els.map((el) => {
    const b = el.getBoundingClientRect(), s = getComputedStyle(el);
    // overflow only CLIPS (a real bug) when overflow isn't 'visible'; tight line-heights spill
    // visibly and harmlessly, so don't flag those.
    const clipX = s.overflowX !== 'visible', clipY = s.overflowY !== 'visible';
    return { el, id: el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName), t: (el.textContent || '').trim().slice(0, 18),
      x: b.left, y: b.top, r: b.right, btm: b.bottom, clip: (clipX && el.scrollWidth > el.clientWidth + 1) || (clipY && el.scrollHeight > el.clientHeight + 1),
      sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight };
  });
  const issues = [];
  for (const e of info) {
    if (e.clip) issues.push({ kind: 'overflow', a: e.id, t: e.t, detail: `content ${e.sw}x${e.sh} clipped to ${e.cw}x${e.ch}` });
    if (e.x < SAFE.x0 - 1 || e.r > SAFE.x1 + 1 || e.y < SAFE.y0 - 1 || e.btm > SAFE.y1 + 1) issues.push({ kind: 'safe', a: e.id, t: e.t, detail: `(${e.x | 0},${e.y | 0},${e.r | 0},${e.btm | 0})` });
  }
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    const A = info[i], B = info[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;          // skip nested pairs
    const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x);                // >0 → overlap on X
    const oy = Math.min(A.btm, B.btm) - Math.max(A.y, B.y);            // >0 → overlap on Y
    if (ox > 2 && oy > 2) { issues.push({ kind: 'overlap', a: A.id, b: B.id, detail: `${ox | 0}x${oy | 0}px` }); continue; }
    let gap = Infinity;                                                // gap only meaningful when they share one axis
    if (ox > 0) gap = Math.min(gap, -oy);
    if (oy > 0) gap = Math.min(gap, -ox);
    if (gap !== Infinity && gap >= 0 && gap < MIN_GAP) issues.push({ kind: 'tight', a: A.id, b: B.id, detail: `${gap | 0}px` });
  }
  return { issues, count: info.length };
}

// re-render the worst frame and draw an overlay (safe box + offending element outlines), for the screenshot.
function overlayFn(n) {
  window.__engine.renderFrame(n);
  const o = document.createElement('div');
  o.style.cssText = 'position:absolute;inset:0;z-index:99999;pointer-events:none';
  o.innerHTML = `<div style="position:absolute;left:60px;top:240px;width:840px;height:1100px;border:2px solid rgba(120,240,60,.6)"></div>`;
  document.body.appendChild(o);
  const seen = new Set();
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue;
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;border:2px solid rgba(255,70,110,.9);box-sizing:border-box`;
    o.appendChild(d); seen.add(el);
  }
}

const HARD = new Set(['overlap', 'overflow', 'safe']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];

for (const m of modules) {
  const sample = `formats/${m}/sample.json`;
  if (!fs.existsSync(path.join(repoRoot, sample))) { rows.push({ m, hard: 1, warn: 0, crit: 0, note: 'no sample.json' }); continue; }
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/${sample}&fps=30`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames, fps = meta.fps || 30;
  const frames = [...new Set([...(meta.stings || []).map((t) => Math.round(t * fps)),
    ...Array.from({ length: SAMPLES }, (_, i) => Math.round(((i + 0.5) / SAMPLES) * total))])]
    .filter((f) => f >= 0 && f < total).sort((a, b) => a - b);

  const all = [];
  let critMax = 0, worst = { f: frames[0] || 0, n: -1 };
  for (const f of frames) {
    const { issues, count } = await page.evaluate(auditFrameFn, f, SAFE, MIN_GAP);
    critMax = Math.max(critMax, count);
    const hard = issues.filter((i) => HARD.has(i.kind)).length;
    if (hard > worst.n) worst = { f, n: hard };
    for (const i of issues) all.push({ f, ...i });
  }
  const hard = all.filter((i) => HARD.has(i.kind));
  const warn = all.filter((i) => !HARD.has(i.kind));
  // de-dup repeated issues (same kind+elements) to the first frame they appear on
  const uniq = (list) => { const seen = new Set(), out = []; for (const i of list) { const k = `${i.kind}|${i.a}|${i.b || ''}`; if (!seen.has(k)) { seen.add(k); out.push(i); } } return out; };
  const hu = uniq(hard), wu = uniq(warn);
  rows.push({ m, hard: hu.length, warn: wu.length, crit: critMax, items: [...hu, ...wu] });

  await page.evaluate(overlayFn, worst.f);
  await page.screenshot({ path: path.join(OUT, `${m}.png`) });
  await page.close();
}
await browser.close(); server.close();

console.log('\n==================== LAYOUT AUDIT ====================');
let hardTotal = 0, warnTotal = 0;
for (const r of rows) {
  hardTotal += r.hard; warnTotal += r.warn || 0;
  const tag = r.hard ? '✗ FAIL' : r.warn ? '~ warn' : '✓ ok';
  console.log(`\n${tag}  ${r.m}  (${r.crit ?? 0} critical elems · ${r.hard} hard · ${r.warn || 0} warn)`);
  if (r.note) console.log(`    ${r.note}`);
  for (const i of (r.items || [])) {
    const who = i.b ? `${i.a} ✕ ${i.b}` : `${i.a}${i.t ? ` "${i.t}"` : ''}`;
    console.log(`    [${i.kind}] f${i.f} ${who} — ${i.detail}`);
  }
}
console.log(`\noverlays: ${OUT}/<format>.png`);
console.log(`${hardTotal ? '✗ ' + hardTotal + ' HARD issue(s)' : '✓ no hard issues'}${warnTotal ? ` · ${warnTotal} warning(s)` : ''}`);
process.exit(hardTotal ? 1 : 0);
