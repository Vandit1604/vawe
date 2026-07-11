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

const SAFE = { x0: 60, y0: 240, x1: 900, y1: 1340 };            // portrait safe box (matches verify/run.js)
const SAFE_LAND = { x0: 90, y0: 60, x1: 1830, y1: 1020 };       // landscape safe box (formats pad ~150px)
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
  const vis = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
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
  // contrast (WCAG-ish) on critical TEXT: effective bg = nearest ancestor solid background-color,
  // else sampled from the bg <canvas> under the element's box, else the body/stage color.
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const parse = (c) => { const m = c && c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const cratio = (a, b) => { const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]; return (hi + 0.05) / (lo + 0.05); };
  const cv = document.querySelector('canvas#cv'); // ONLY the bg canvas convention — grain/fx canvases are decoration, not backdrop
  const cvCtx = cv ? cv.getContext('2d') : null; // webgl canvases return null here — safely skipped
  const bgFor = (el, bx) => {
    for (let p = el; p; p = p.parentElement) {
      if (cv && p.contains(cv)) break; // this ancestor's bg sits BEHIND the bg canvas — not the backdrop
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return [c[0], c[1], c[2]];
    }
    // flat-layer scenes (hyperscene): the visual backdrop may be a SIBLING rect, not an ancestor —
    // probe the actual paint stack under the element's center for the first solid background.
    for (const p of document.elementsFromPoint(bx.x + bx.w / 2, bx.y + bx.h / 2)) {
      if (p === el || el.contains(p) || p.contains(el)) continue;
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return [c[0], c[1], c[2]];
    }
    if (cvCtx) {
      const pts = [[bx.x + bx.w / 2, bx.y + bx.h / 2], [bx.x + 6, bx.y + 6], [bx.x + bx.w - 6, bx.y + 6], [bx.x + 6, bx.y + bx.h - 6], [bx.x + bx.w - 6, bx.y + bx.h - 6]];
      let r = 0, g = 0, b = 0, k = 0;
      for (const [px, py] of pts) {
        const sx = Math.max(0, Math.min(cv.width - 1, px | 0)), sy = Math.max(0, Math.min(cv.height - 1, py | 0));
        const d = cvCtx.getImageData(sx, sy, 1, 1).data;
        if (d[3] > 10) { r += d[0]; g += d[1]; b += d[2]; k++; }
      }
      if (k) return [r / k, g / k, b / k];
    }
    const st = parse(getComputedStyle(document.body).backgroundColor);
    if (st && st[3] > 0.85) return [st[0], st[1], st[2]];
    return null; // gradient/image backdrops: no confident color → don't guess, don't flag
  };
  for (const e of info) {
    if (![...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) continue; // containers: skip
    const fg = parse(getComputedStyle(e.el).color);
    if (!fg || fg[3] < 0.5) continue;
    const bg = bgFor(e.el, { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y });
    if (!bg) continue;
    const rt = cratio([fg[0], fg[1], fg[2]], bg);
    // display type in video: hard-fail only the unreadable (<2.5:1), warn under WCAG large-text 3.5
    if (rt < 3.5) issues.push({ kind: rt < 2.5 ? 'contrast' : 'contrast-soft', a: e.id, t: e.t, detail: `ratio ${rt.toFixed(1)}:1` });
  }
  // HEADLINE DOMINANCE: the largest visible text on a frame is the headline — legibility (4.5:1)
  // is not enough for display type; below 7:1 it reads washed-out ("gray heading" bug class).
  {
    const texts = info.filter((e) => [...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    let top = null, topPx = 0;
    for (const e of texts) { const px = parseFloat(getComputedStyle(e.el).fontSize) || 0; if (px > topPx) { topPx = px; top = e; } }
    if (top && topPx >= 56) {
      const fg = parse(getComputedStyle(top.el).color);
      const bg = fg && bgFor(top.el, { x: top.x, y: top.y, w: top.r - top.x, h: top.btm - top.y });
      if (fg && bg) {
        const rt = cratio([fg[0], fg[1], fg[2]], bg);
        if (rt < 7) issues.push({ kind: rt < 4.5 ? 'weak-headline' : 'weak-headline-soft', a: top.id, t: top.t, detail: `headline ${topPx | 0}px at ${rt.toFixed(1)}:1 (want ≥7:1)` });
      }
    }
  }
  // IMAGE contrast: a critical logo/icon can vanish into a same-hue backdrop (orange-on-orange) —
  // average the image's opaque pixels and hold them to the WCAG non-text bar (3:1; hard < 1.7).
  const imgProbe = document.createElement('canvas'); imgProbe.width = imgProbe.height = 24;
  const ipc = imgProbe.getContext('2d', { willReadFrequently: true });
  for (const e of info) {
    const im = e.el.tagName === 'IMG' ? e.el : ((e.el.children.length === 1 || !e.el.textContent.trim()) ? e.el.querySelector('img') : null);
    if (!im || !im.complete || !im.naturalWidth) continue;
    let avg;
    try {
      ipc.clearRect(0, 0, 24, 24); ipc.drawImage(im, 0, 0, 24, 24);
      const d = ipc.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, k = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; }
      if (k < 20) continue; // nearly empty raster — nothing to judge
      avg = [r / k, g / k, b / k];
    } catch { continue; } // cross-origin taint → skip, never guess
    const bg = bgFor(im === e.el ? e.el : e.el, { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y });
    if (!bg) continue;
    const rt = cratio(avg, bg);
    if (rt < 3) issues.push({ kind: rt < 1.7 ? 'contrast' : 'contrast-soft', a: e.id || 'img', t: (im.getAttribute('src') || '').split('/').pop().slice(0, 18), detail: `image vs bg ${rt.toFixed(1)}:1` });
  }
  return { issues, count: info.length };
}

// re-render the worst frame and draw an overlay (safe box + offending element outlines), for the screenshot.
function overlayFn(n, SAFE) {
  window.__engine.renderFrame(n);
  const o = document.createElement('div');
  o.style.cssText = 'position:absolute;inset:0;z-index:99999;pointer-events:none';
  o.innerHTML = `<div style="position:absolute;left:${SAFE.x0}px;top:${SAFE.y0}px;width:${SAFE.x1 - SAFE.x0}px;height:${SAFE.y1 - SAFE.y0}px;border:2px solid rgba(120,240,60,.6)"></div>`;
  document.body.appendChild(o);
  const seen = new Set();
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue;
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;border:2px solid rgba(255,70,110,.9);box-sizing:border-box`;
    o.appendChild(d); seen.add(el);
  }
}

const HARD = new Set(['overlap', 'overflow', 'safe', 'contrast', 'weak-headline']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];

for (const spec of modules) {
  // a .json arg audits THAT data file (module read from it); a bare name audits the format's sample
  const isData = spec.endsWith('.json');
  const sample = isData ? spec : `formats/${spec}/sample.json`;
  if (!fs.existsSync(path.join(repoRoot, sample))) { rows.push({ m: spec, hard: 1, warn: 0, crit: 0, note: 'file not found' }); continue; }
  const m = isData ? (JSON.parse(fs.readFileSync(path.join(repoRoot, sample), 'utf8')).module || spec) : spec;
  const page = await browser.newPage();
  // landscape-aware: read the sample's orientation so landscape formats are audited at their real dims
  const landscape = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, sample), 'utf8')).orientation === 'landscape'; } catch { return false; } })();
  const safe = landscape ? SAFE_LAND : SAFE;
  await page.setViewport({ width: landscape ? 1920 : 1080, height: landscape ? 1080 : 1920, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/${sample}&fps=30`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames, fps = meta.fps || 30;
  // skip frames inside scene transitions (enter/exit motion is intentionally off-position/faded);
  // meta.segments = the format's declared scene windows (formats without it audit every sample)
  let inTransition = () => false;
  if ((meta.segments || []).length) {
    const cuts = []; let acc = 0;
    meta.segments.forEach((s, i) => { acc += s.dur ?? (s.t1 - s.t0); if (i < meta.segments.length - 1) cuts.push({ t: acc, trans: s.transition ?? 0.4 }); });
    inTransition = (f) => cuts.some((c) => Math.abs(f / fps - c.t) < c.trans + 0.05);
  }
  const frames = [...new Set([...(meta.stings || []).map((t) => Math.round(t * fps)),
    ...Array.from({ length: SAMPLES }, (_, i) => Math.round(((i + 0.5) / SAMPLES) * total))])]
    .filter((f) => f >= 0 && f < total && !inTransition(f)).sort((a, b) => a - b);

  const all = [];
  let critMax = 0, worst = { f: frames[0] || 0, n: -1 };
  for (const f of frames) {
    const { issues, count } = await page.evaluate(auditFrameFn, f, safe, MIN_GAP);
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
  rows.push({ m: isData ? `${m} · ${path.basename(sample)}` : m, hard: hu.length, warn: wu.length, crit: critMax, items: [...hu, ...wu] });

  await page.evaluate(overlayFn, worst.f, safe);
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
