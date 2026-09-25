// harness/lib/frame-sampler.mjs: ONE reusable pre-render sampler.
//
// WHY THIS EXISTS. ground-arc.mjs and motion-floor.mjs's `--pre` mode both need the same thing: load
// a scene the way quality/audit.mjs does (a static server, a puppeteer page, wait for the engine),
// seek it to a set of times with the pure `renderFrame(n)`, and read a picture back, WITHOUT ever
// encoding out/<film>.mp4. render-harness.mjs already owns the server/page/boot half of that; this
// file adds only the part neither gate should reinvent: walk a time axis and hand back one frame per
// tick. Building a second engine loader here would be exactly the drift ENGINE-CHANGES.md warns about.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serveRepo, launchPage, waitForEngine, bootPathFor, REPO_ROOT } from './render-harness.mjs';
import { sceneDims } from '../../core/layout/safe.js';

// A PNG decoder: same shape as quality/audit.mjs's own (this repo ships no image library, and that
// file is owned by someone else, so this is the second correct copy rather than an edit to theirs).
// Chromium emits 8-bit non-interlaced PNG; anything else throws rather than guesses.
function readChunks(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0, palette = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = data;
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  return { w, h, depth, ctype, interlace, palette, idat };
}

// One Paeth/Sub/Up/Average byte, unfiltered against its left/above/above-left neighbours.
function unfilterByte(ft, v, a, b, c) {
  if (ft === 1) return (v + a) & 255;
  if (ft === 2) return (v + b) & 255;
  if (ft === 3) return (v + ((a + b) >> 1)) & 255;
  if (ft === 4) {
    const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
    return (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
  }
  if (ft !== 0) throw new Error(`bad PNG filter ${ft}`);
  return v;
}

function unfilterRow(line, cur, prev, ch, stride, ft) {
  for (let i = 0; i < stride; i++) {
    const a = i >= ch ? cur[i - ch] : 0;
    const b = prev ? prev[i] : 0;
    const c = (prev && i >= ch) ? prev[i - ch] : 0;
    cur[i] = unfilterByte(ft, line[i], a, b, c);
  }
}

export function decodePNG(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const { w, h, depth, ctype, interlace, palette, idat } = readChunks(buf);
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  if (depth !== 8 || interlace !== 0 || !CH[ctype]) throw new Error(`unsupported PNG (depth ${depth}, colour type ${ctype}, interlace ${interlace})`);
  const ch = CH[ctype], stride = w * ch;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    unfilterRow(line, cur, prev, ch, stride, ft);
  }
  return { width: w, height: h, ch, ctype, palette, data: out };
}

const pixelAt = (img, x, y) => {
  const i = (y * img.width + x) * img.ch, d = img.data;
  if (img.ctype === 3) { const k = d[i] * 3; return [img.palette[k], img.palette[k + 1], img.palette[k + 2]]; }
  if (img.ch <= 2) return [d[i], d[i], d[i]];
  return [d[i], d[i + 1], d[i + 2]];
};

/** ITU-R BT.601 luma. `box` in image pixels ({x,y,w,h}); default the whole image. */
export function luminanceOf(img, box) {
  const b = box || { x: 0, y: 0, w: img.width, h: img.height };
  const x0 = Math.max(0, Math.round(b.x)), y0 = Math.max(0, Math.round(b.y));
  const x1 = Math.min(img.width, Math.round(b.x + b.w)), y1 = Math.min(img.height, Math.round(b.y + b.h));
  let sum = 0, n = 0;
  const stepX = Math.max(1, Math.floor((x1 - x0) / 200)), stepY = Math.max(1, Math.floor((y1 - y0) / 120));
  for (let y = y0; y < y1; y += stepY) for (let x = x0; x < x1; x += stepX) {
    const [r, g, bch] = pixelAt(img, x, y);
    sum += r * 0.299 + g * 0.587 + bch * 0.114; n++;
  }
  return n ? sum / n : 0;
}

/** Nearest-neighbour downsample to a flat grayscale grid, the shape motion-floor.mjs's profile() eats. */
export function downsampleGray(img, gw, gh) {
  const out = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const x = Math.min(img.width - 1, Math.floor((gx + 0.5) * img.width / gw));
    const y = Math.min(img.height - 1, Math.floor((gy + 0.5) * img.height / gh));
    const [r, g, b] = pixelAt(img, x, y);
    out[gy * gw + gx] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

/**
 * sampleScene(scenePath, opts) → { meta, fps, total, samples: [{t, frame, img}] }
 *
 * Loads the scene ONCE (server + page + boot), then walks `times` (explicit) or every `rate` seconds
 * (default 0.25s) across the film's own duration, calling the pure `renderFrame(n)` and reading back
 * one screenshot per tick. `measure(img, t, frame)` runs per sample and, if given, REPLACES `img` in
 * the returned row with its result (so a caller that only wants a number never carries a decoded PNG
 * per frame). `aspect` is the same `?aspect=` query the CLI renderer and quality/audit.mjs pass.
 */
export async function sampleScene(scenePath, { rate = 0.25, times, aspect, measure, region } = {}) {
  const abs = path.resolve(REPO_ROOT, scenePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const cfg = JSON.parse(raw);
  const rel = path.relative(REPO_ROOT, abs);
  // AGENTS.md: exactly one module, `scene`; the engine shell that boots it always sits at
  // films/scene/scene.html, whatever directory the scene JSON itself is served from (a real film
  // under films/scene/, or a test fixture elsewhere in the repo).
  const m = 'scene';
  const [vw, vh] = sceneDims(cfg, aspect);

  const { close: closeServer, port } = await serveRepo({});
  const { browser, page, close: closePage } = await launchPage({ width: vw, height: vh });
  try {
    const bootRel = bootPathFor(REPO_ROOT, raw, cfg, rel);
    const q = aspect ? `&aspect=${encodeURIComponent(aspect)}` : '';
    await page.goto(`http://127.0.0.1:${port}/films/${m}/scene.html?data=/${bootRel}&fps=30${q}`, { waitUntil: 'load' });
    const err = await waitForEngine(page, { throwOnTimeout: false });
    if (err) throw new Error(`scene did not load: ${err}`);
    const meta = await page.evaluate(() => window.__engine.meta);
    const fps = meta.fps || 30, total = meta.totalFrames;
    const duration = total / fps;
    const sampleTimes = times && times.length ? times
      : Array.from({ length: Math.floor(duration / rate) + 1 }, (_, i) => +(i * rate).toFixed(3))
        .filter((t) => t < duration);

    const samples = [];
    for (const t of sampleTimes) {
      const frame = Math.min(total - 1, Math.max(0, Math.round(t * fps)));
      await page.evaluate((n) => window.__engine.renderFrame(n), frame);
      const shot = await page.screenshot({ type: 'png', optimizeForSpeed: true, ...(region ? { clip: region } : {}) });
      const img = decodePNG(Buffer.from(shot));
      samples.push({ t, frame, img: measure ? measure(img, t, frame) : img });
    }
    return { meta, fps, total, duration, width: vw, height: vh, samples };
  } finally {
    await closePage();
    closeServer();
  }
}
