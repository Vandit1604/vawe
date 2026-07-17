// Slice the rendered `make catalog` pages (out/_catalog-N.mp4) into one still AND one short clip per
// block → site/public/assets/blocks/<name>.{png,mp4}. Run after `make catalog`, via `make blocks-media`.
//
// The crop rect is MEASURED, not assumed. This used to crop the whole 600x490 cell, which was wrong
// twice over: the block is placed at its cell's TOP-LEFT, so every thumbnail was a small block stranded
// in the corner of a big empty rectangle (no CSS object-position can fix that — the dead space is
// inside the image), and the fixed 600px width overran the cell, so a neighbour's content bled in
// (badge.beta's still carried "80ms" from the kpiRow next to it). So: render the page, measure the
// union of the layers whose centre falls inside each cell, and crop to THAT.
//
// The rect is padded and clamped to the cell (the clamp is what keeps the neighbour out), and that is
// all: the block IS the image, so it is centred by construction. Relative scale is preserved in CSS
// instead, by capping the image rather than stretching it — see the PAD note below.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { CATALOG } from "../../blocks/catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The grid MUST come from the same source blocks-catalog.mjs laid the pages out from, and in the same
// order: this script identifies each block purely by its cell index, so a grid that disagrees with the
// rendered video by one row crops every later block from the wrong cell and writes it under the right
// name. This used to read site/lib/blocks.json, a hand-kept copy that agreed by luck.
const grid = CATALOG.filter((e) => !e.overlay);
const OUT = path.join(repoRoot, "site/public/assets/blocks");
fs.mkdirSync(OUT, { recursive: true });

// must match scripts/site/blocks-catalog.mjs
const PER = 6, COLS = 3, CELL_W = 600, CELL_H = 490, X0 = 70, Y0 = 132, BLOCK_DY = 24;
// Crop TIGHT. The first attempt grew every rect to a 430x300 floor around the block's centre to keep
// relative scale honest, but blocks are placed at their cell's TOP-LEFT: there is no room above a short
// block to centre into, so the clamp just pushed the crop down and left the block pinned to the top
// again. The floor was solving the wrong problem. Crop to the block and the block IS the image, centred
// by construction — and scale stays honest in CSS instead, where the thumb centres the image and caps it
// at 100% without stretching, so a 170px badge renders 170px and a 540px card scales down to fit. That
// is the real relationship between them, and nothing is ever upscaled into blur.
const PAD = 22;                 // breathing room around the block's own ink
// Sampled over TIME, not at one instant, for two reasons. The crop must hold the block across the whole
// CLIP or a block that moves gets clipped mid-playback. And a single settled time is a guess about a
// block's lifetime that is not always true: loadingBar's layers last fillDur+1.2 (~3s) no matter what
// `dur` the catalog passes, so measuring only at 4.5s found nothing — which is exactly why its
// thumbnail has always shipped blank. The still is taken at the last sampled time the block is still
// on screen, so a short block gets a picture of itself rather than of the empty stage after it.
const SAMPLES = [1.5, 2.5, 3.5, 4.5, 6.0];
const SETTLED = 4.5;            // prefer a still from here or earlier: entrances have landed by now
const pages = Math.ceil(grid.length / PER);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".woff2": "font/woff2", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const server = await new Promise((r) => {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
let done = 0, miss = 0, clips = 0;

for (let p = 1; p <= pages; p++) {
  const mp4 = path.join(repoRoot, `out/_catalog-${p}.mp4`);
  const data = `formats/scene/_catalog-${p}.json`;
  if (!fs.existsSync(mp4)) { console.error(`missing out/_catalog-${p}.mp4 — run \`make catalog\` first`); miss += PER; continue; }

  // measure this page's real content, per cell
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/${data}&fps=30&aspect=16:9`, { waitUntil: "load" });
  await page.waitForFunction("window.__engineReady === true || window.__engineError", { timeout: 30000 });
  const measured = await page.evaluate((cfg) => {
    const vis = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.visibility === "hidden" || +s.opacity <= 0.05) return false; } return true; };
    const rects = Array.from({ length: cfg.per }, () => null);   // union of the block over its whole life
    const lastSeen = Array.from({ length: cfg.per }, () => null); // last sampled time it was on screen
    for (const t of cfg.samples) {
      window.__engine.renderFrame(Math.round(t * 30));
      for (const el of document.querySelectorAll(".hs-layer")) {
        if (!vis(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        // A layer belongs to the cell its CENTRE sits in — robust to a block overhanging its cell.
        // The row band is the BLOCK's band, not the cell's: blocks-catalog.mjs prints each block's name
        // label at (cell y - 26), so row 1's caption sits ABOVE row 1's cell line and inside a naive
        // row-0 band. That pulled every row-0 block's measured bounds down to row 1's caption and made
        // card/codeBlock/terminal all crop to an identical full-cell 562x474 with dead space below.
        // Bands built from the block's own top exclude the captions and the page header alike.
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const col = Math.floor((cx - cfg.X0) / cfg.CELL_W);
        if (col < 0 || col >= cfg.COLS) continue;
        let row = -1;
        for (let r = 0; r * cfg.COLS < cfg.per; r++) {
          const top = cfg.Y0 + r * cfg.CELL_H + cfg.BLOCK_DY - 12;
          const bot = cfg.Y0 + (r + 1) * cfg.CELL_H - 40;
          if (cy >= top && cy < bot) { row = r; break; }
        }
        if (row < 0) continue;
        const i = row * cfg.COLS + col;
        if (i < 0 || i >= cfg.per) continue;
        const r = rects[i];
        rects[i] = r
          ? { x0: Math.min(r.x0, b.left), y0: Math.min(r.y0, b.top), x1: Math.max(r.x1, b.right), y1: Math.max(r.y1, b.bottom) }
          : { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom };
        if (lastSeen[i] == null || t > lastSeen[i]) lastSeen[i] = t;
      }
    }
    return { rects, lastSeen };
  }, { samples: SAMPLES, per: PER, COLS, CELL_W, CELL_H, X0, Y0, BLOCK_DY });
  const rects = measured.rects;
  await page.close();

  for (let i = 0; i < PER; i++) {
    const block = grid[(p - 1) * PER + i];
    if (!block) break;
    const col = i % COLS, row = (i / COLS) | 0;
    // the cell is the hard boundary: cropping past it pulls in the neighbouring block
    const cellX = X0 + col * CELL_W, cellY = Y0 + row * CELL_H + BLOCK_DY - 12;
    const cellR = Math.min(1920, cellX + CELL_W - 16), cellB = Math.min(1080, cellY + CELL_H - 16);

    const m = rects[i];
    if (!m) { console.error(`no content measured for ${block.name} — the block renders nothing at ${SAMPLES.join('/')}s`); miss++; continue; }
    // the still comes from the last sample where the block is actually on screen, preferring a settled
    // one: a block that exits early (loadingBar) otherwise gets a picture of the empty stage after it.
    const seen = measured.lastSeen[i] ?? SETTLED;
    const stillT = Math.min(seen, SETTLED) === seen ? seen : SAMPLES.filter((t) => t <= SETTLED).pop() ?? SETTLED;
    const x0 = clamp(Math.round(m.x0 - PAD), cellX, cellR), y0 = clamp(Math.round(m.y0 - PAD), cellY, cellB);
    const x1 = clamp(Math.round(m.x1 + PAD), cellX, cellR), y1 = clamp(Math.round(m.y1 + PAD), cellY, cellB);
    // ffmpeg needs even dimensions for h264
    const w = Math.max(2, (x1 - x0) & ~1), h = Math.max(2, (y1 - y0) & ~1);
    const safe = block.name.replace(/[^a-z0-9.]/gi, "_");
    const crop = `crop=${w}:${h}:${x0}:${y0}`;

    try {
      execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(stillT), "-i", mp4,
        "-vf", crop, "-frames:v", "1", `${OUT}/${safe}.png`], { stdio: "pipe" });
      done++;
    } catch (e) { console.error(`still fail ${block.name}: ${e.message.slice(0, 60)}`); miss++; continue; }

    // the clip: the same rect, the whole page duration, no audio. Fetched only when a card's play
    // control is pressed, so it is never on the critical path — but it must stay small anyway.
    try {
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp4,
        "-vf", `${crop},scale=min(480\\,iw):-2:flags=lanczos`, "-an",
        "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow",
        "-movflags", "+faststart", `${OUT}/${safe}.mp4`], { stdio: "pipe" });
      clips++;
    } catch (e) { console.error(`clip fail ${block.name}: ${e.message.slice(0, 60)}`); }
  }
}
await browser.close(); server.close();
const bytes = fs.readdirSync(OUT).filter((f) => f.endsWith(".mp4")).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`blocks-stills: ${done} stills · ${clips} clips (${(bytes / 1e6).toFixed(1)}MB total) → ${OUT}${miss ? `, ${miss} missing` : ""}`);
