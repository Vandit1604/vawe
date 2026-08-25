// One SCENE + one poster still per block → site/public/assets/blocks/<name>.{json,png}
// plus site/lib/block-frames.json (the crop rect each one is framed by). Run via `make blocks-scenes`.
//
// The site plays these scenes LIVE, in the real engine, in an iframe. It used to ship a pre-encoded
// mp4 per block, which was a marketing page for a render engine playing baked video of its own
// output — and, because .dockerignore excludes `*.mp4`, video that 404'd in production.
//
// WHY EACH BLOCK GETS ITS OWN SCENE. The stills used to be cropped out of out/_catalog-N.mp4 BY CELL
// INDEX: a 3x2 grid of blocks on a shared 1920x1080 stage, sliced by arithmetic. That coupling caused
// both bugs its own header recorded (a block stranded in the corner of its cell, a neighbour's "80ms"
// bleeding into badge.beta) and it meant adding one block re-cut every later thumbnail. A block alone
// on its own stage has no neighbour to bleed in and no cell to be stranded in, so the cell math, the
// clamping and the dependency on a rendered reel all disappear together.
//
// PARITY IS THE POINT. The poster and the live render must show the same region at the same scale, or
// pressing play makes the block jump. They do here BY CONSTRUCTION: both are this one scene on a
// 1920x1080 canvas, and both are framed by the SAME measured rect. The still is that rect screenshot;
// the live player scales the same 1920x1080 iframe and offsets it by the same rect (see BlockLive).
// So the frame rect is not a rendering detail, it is shared geometry, and it ships as data.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { BLOCKS } from '../../blocks/index.mjs';
import { CATALOG } from '../../blocks/catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(repoRoot, 'site/public/assets/blocks');
const FRAMES = path.join(repoRoot, 'site/lib/block-frames.json');
fs.mkdirSync(OUT, { recursive: true });

const grid = CATALOG.filter((e) => !e.overlay);   // full-frame overlays (captions) have no thumbnail

// The stage. 1920x1080 is the engine's own 16:9 canvas — a scene cannot ask for arbitrary pixel dims
// (core/safe.js sizes every ratio to a 1920 long edge), and it does not need to: the frame rect below
// is what decides what you see, and it is applied identically to the still and to the live iframe.
const W = 1920, H = 1080;
// Top-left of the block, same semantics blocks-catalog.mjs places with. Generous: the largest grid
// block is ~600x490, so nothing reaches an edge and the measured rect is never truncated.
const ORIGIN_X = 160, ORIGIN_Y = 160;
// Identical timing to the catalog sheets, so a block looks here exactly as it does there.
const DURATION = 9, START = 0.2, DUR = 8;

const PAD = 22;                              // breathing room around the block's own ink
// Sampled over TIME, not at one instant. The rect must hold the block for the whole loop or a block
// that moves gets clipped mid-playback, and a single settled time is a guess about a lifetime that is
// not always true: loadingBar's layers last ~3s no matter what `dur` it is passed, so measuring only
// at 4.5s finds nothing — which is why its thumbnail used to ship blank.
const SAMPLES = [1.5, 2.5, 3.5, 4.5, 6.0];
const SETTLED = 4.5;                         // prefer a still from here or earlier: entrances have landed

const safeName = (name) => name.replace(/[^a-z0-9.]/gi, '_');

function sceneFor(entry) {
  const fam = BLOCKS[entry.family];
  if (!fam) return null;
  const layers = fam({ ...(entry.props || {}), x: ORIGIN_X, y: ORIGIN_Y, start: START, dur: DUR });
  return {
    module: 'scene', aspect: '16:9', theme: process.env.THEME || 'vawe', duration: DURATION,
    audio: { silent: true }, bg: [{ preset: 'plain', from: 0, to: DURATION }], layers,
    // NOT A FILM. `produceBaseline` injects direction into any scene that declares none — a gentle slow
    // push so a film's frame stays alive, plus scene-unit transitions (core/produce.js). Correct there,
    // wrong here: a preview exists so you can JUDGE the block, and the push scales about the frame
    // centre, drifting a block placed at x:160,y:160 steadily up and to the left while you read it.
    //
    // `produced: false` is the engine's own opt-out and has been since before this generator existed
    // (core/produce.js:27, asserted at scripts/gates/lib-test.mjs:2690). It turns off the whole injected
    // baseline while still baking an author's explicit `cameraMove` sugar. Reaching for it beats
    // declaring an empty `camera` here, which would be a second way to say one thing — and a preview
    // harness rendering one block is exactly what "not a directed film" means.
    produced: false,
  };
}

// ---- a static file server over the repo, so scene.html resolves /core, /themes, /assets as usual ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => r(s));
});
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const frames = {};
let wrote = 0, shot = 0, miss = 0;

for (const entry of grid) {
  const safe = safeName(entry.name);
  const scene = sceneFor(entry);
  if (!scene) { console.error(`no factory for ${entry.name} (family ${entry.family})`); miss++; continue; }

  // Write-on-change: these are committed, so an unchanged block must not churn git on every run.
  const jsonPath = path.join(OUT, `${safe}.json`);
  const body = JSON.stringify(scene, null, 2) + '\n';
  if (!fs.existsSync(jsonPath) || fs.readFileSync(jsonPath, 'utf8') !== body) { fs.writeFileSync(jsonPath, body); wrote++; }

  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/site/public/assets/blocks/${encodeURIComponent(safe)}.json&fps=30&aspect=16:9`,
    { waitUntil: 'load' });
  const boot = await page.evaluate(() => new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      if (window.__engineError) return res(String(window.__engineError));
      if (window.__engineReady) return res(null);
      if (Date.now() - t0 > 30000) return res('timeout');
      requestAnimationFrame(tick);
    };
    tick();
  }));
  if (boot) { console.error(`boot fail ${entry.name}: ${boot}`); miss++; continue; }

  const m = await page.evaluate((cfg) => {
    const vis = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
    let r = null, lastSeen = null;
    for (const t of cfg.samples) {
      window.__engine.renderFrame(Math.round(t * 30));
      for (const el of document.querySelectorAll('.hs-layer')) {
        if (!vis(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        r = r ? { x0: Math.min(r.x0, b.left), y0: Math.min(r.y0, b.top), x1: Math.max(r.x1, b.right), y1: Math.max(r.y1, b.bottom) }
              : { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom };
        lastSeen = lastSeen == null || t > lastSeen ? t : lastSeen;
      }
    }
    return r && { ...r, lastSeen };
  }, { samples: SAMPLES });

  if (!m) { console.error(`no content measured for ${entry.name} — renders nothing at ${SAMPLES.join('/')}s`); miss++; continue; }

  const x0 = clamp(Math.round(m.x0 - PAD), 0, W), y0 = clamp(Math.round(m.y0 - PAD), 0, H);
  const x1 = clamp(Math.round(m.x1 + PAD), 0, W), y1 = clamp(Math.round(m.y1 + PAD), 0, H);
  const w = Math.max(2, x1 - x0), h = Math.max(2, y1 - y0);
  frames[entry.name] = { x: x0, y: y0, w, h };

  // The still comes from the last sample where the block is actually on screen, preferring a settled
  // one, so a block that exits early gets a picture of itself rather than of the empty stage after it.
  const stillT = Math.min(m.lastSeen ?? SETTLED, SETTLED);
  try {
    await page.evaluate((t) => window.__engine.renderFrame(Math.round(t * 30)), stillT);
    await page.screenshot({ path: path.join(OUT, `${safe}.png`), clip: { x: x0, y: y0, width: w, height: h } });
    shot++;
  } catch (e) { console.error(`still fail ${entry.name}: ${e.message.slice(0, 80)}`); miss++; }
}

await page.close(); await browser.close(); server.close();

// The frame rects are the contract between the poster and the live player. They ship as one file the
// site imports, rather than being re-derived on either side, because two derivations is how the still
// and the clip drifted apart in the first place.
fs.writeFileSync(FRAMES, JSON.stringify(frames, null, 2) + '\n');

// Sweep block media whose entry left the registry: nothing points at it and it is pure weight.
const keep = new Set(grid.flatMap((e) => [`${safeName(e.name)}.json`, `${safeName(e.name)}.png`]));
const stale = fs.readdirSync(OUT).filter((f) => !keep.has(f));
for (const f of stale) fs.rmSync(path.join(OUT, f));

const bytes = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`blocks-scenes: ${grid.length} blocks · ${wrote} scene(s) written · ${shot} still(s) (${(bytes / 1e6).toFixed(1)}MB total) → ${path.relative(repoRoot, OUT)}`
  + `\n  frames → ${path.relative(repoRoot, FRAMES)}`
  + (stale.length ? `\n  removed ${stale.length} stale file(s)` : '')
  + (miss ? `\n  ${miss} MISSING` : ''));
