// capture-motion.mjs — WATCH a real element animate and emit a motion track our engine can replay.
// It samples the element's transform + opacity every frame as it reveals (scroll-triggered by default,
// or on-load), decomposes the CSS matrix into translate/scale/rotate, normalises to REST at the end
// (a motion track composes on top of the layer's final position), and reduces to keyframes. Same
// "measure, don't guess" idea as brandspec — reproduce the site's actual move, not an invented one.
//
//   node scripts/author/capture-motion.mjs https://example.com/home 'main section:nth-of-type(3)'   [--onload] [--dur 2.5]
import puppeteer from 'puppeteer';

const [url, sel, ...rest] = process.argv.slice(2);
if (!url || !sel) { console.error("usage: node scripts/author/capture-motion.mjs <url> '<selector>' [--onload] [--dur 2.5]"); process.exit(1); }
const onload = rest.includes('--onload');
const dur = Number((rest[rest.indexOf('--dur') + 1]) || 2.5);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1512, height: 900, deviceScaleFactor: 1 });
// install the recorder BEFORE the page's own scripts, so on-load animations aren't missed
await page.evaluateOnNewDocument((sel, durMs, onload) => {
  window.__rec = { samples: [], sel, durMs, running: false };
  const decompose = (tf) => {
    if (!tf || tf === 'none') return { x: 0, y: 0, scale: 1, rot: 0 };
    const m = tf.match(/matrix\(([^)]+)\)/); if (!m) { const m3 = tf.match(/matrix3d\(([^)]+)\)/); if (!m3) return { x: 0, y: 0, scale: 1, rot: 0 };
      const v = m3[1].split(',').map(Number); return { x: v[12], y: v[13], scale: Math.hypot(v[0], v[1]), rot: Math.atan2(v[1], v[0]) * 180 / Math.PI }; }
    const [a, b, c, d, e, f] = m[1].split(',').map(Number);
    return { x: e, y: f, scale: Math.hypot(a, b), rot: Math.atan2(b, a) * 180 / Math.PI };
  };
  window.__startRec = () => {
    if (window.__rec.running) return; window.__rec.running = true;
    const el = document.querySelector(sel); if (!el) return;
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0; const cs = getComputedStyle(el);
      window.__rec.samples.push({ t, ...decompose(cs.transform), opacity: +cs.opacity, blur: (cs.filter.match(/blur\(([\d.]+)px\)/) || [])[1] | 0 });
      if (t < durMs) requestAnimationFrame(tick); else window.__rec.done = true;
    };
    requestAnimationFrame(tick);
  };
  if (onload) addEventListener('DOMContentLoaded', () => window.__startRec());
}, sel, dur * 1000, onload);

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
if (!onload) { // scroll the element into view to trigger its reveal, then record
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'center' }); }, sel);
  await page.evaluate(() => window.__startRec());
}
await page.waitForFunction('window.__rec && (window.__rec.done || window.__rec.samples.length > 20)', { timeout: (dur + 2) * 1000 }).catch(() => {});
await new Promise((r) => setTimeout(r, dur * 1000));
const rec = await page.evaluate(() => window.__rec);
await browser.close();

const s = (rec && rec.samples) || [];
if (s.length < 3) { console.error(`captured only ${s.length} samples — the element may not animate on ${onload ? 'load' : 'scroll'}; try the other mode or a child selector.`); process.exit(1); }
// normalise to REST (final settled sample) so the track is an entrance offset ending at 0/1
const fin = s[s.length - 1];
const norm = s.map((k) => ({ t: +(k.t / 1000).toFixed(3), x: +(k.x - fin.x).toFixed(1), y: +(k.y - fin.y).toFixed(1), scale: +(k.scale / (fin.scale || 1)).toFixed(3), rot: +(k.rot - fin.rot).toFixed(1), opacity: +(k.opacity).toFixed(2), blur: k.blur }));
// trim leading identical frames (before the anim starts) and find when it settles
const moved = (k) => Math.abs(k.x) > 1 || Math.abs(k.y) > 1 || Math.abs(k.scale - 1) > 0.01 || Math.abs(k.rot) > 0.5 || k.opacity < 0.98;
let start = norm.findIndex(moved); if (start < 0) start = 0;
let end = norm.length - 1; while (end > start && !moved(norm[end - 1])) end--;
const win = norm.slice(Math.max(0, start - 1), end + 1);
const t0 = win[0].t; const dr = (win[win.length - 1].t - t0) || 0.6;
// reduce to ~6 keyframes evenly across the move
const K = 6, kf = [];
for (let i = 0; i < K; i++) { const src = win[Math.round(i * (win.length - 1) / (K - 1))]; kf.push({ t: +((src.t - t0)).toFixed(2), x: src.x, y: src.y, scale: src.scale, rot: src.rot, opacity: src.opacity }); }
kf[kf.length - 1] = { t: kf[kf.length - 1].t, x: 0, y: 0, scale: 1, rot: 0, opacity: 1 }; // snap to exact rest

console.log(`\nCAPTURE-MOTION · ${sel}\n${'='.repeat(56)}`);
console.log(`samples ${s.length} · move ${dr.toFixed(2)}s · from {x:${win[0].x}, y:${win[0].y}, scale:${win[0].scale}, opacity:${win[0].opacity}} → rest`);
console.log(`\nmotion track (paste into a layer's "motion", set enterDur ~= ${dr.toFixed(2)}):\n`);
console.log('  "motion": ' + JSON.stringify(kf));
console.log(`\n  (x/y in px at 1512-wide; scale relative; opacity 0-1. The engine eases each segment;`);
console.log(`   the dominant move here is ${Math.abs(win[0].y) > Math.abs(win[0].x) ? 'vertical rise' : Math.abs(win[0].x) > 5 ? 'horizontal slide' : win[0].scale < 0.98 ? 'scale-in' : 'fade'}.)\n`);
