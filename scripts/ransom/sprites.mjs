// scripts/ransom/sprites.mjs — turn a pack of real cut-out letter images into a sprite set the
// engine can compose notes from.  make ransom-sprites  [SRC=assets/ransom-src] [H=220]
//
// IN:  assets/ransom-src/<CHAR>/<anything>.png    (a folder per character — preferred)
//      assets/ransom-src/<CHAR>.png               (or flat: A.png, A-2.png, a3.png …)
// OUT: assets/ransom/<CHAR>/<n>.png  +  assets/ransom/manifest.json
//
// Each source is trimmed to its ALPHA BOUNDING BOX (packs ship letters floating in a big
// transparent frame; untrimmed, every glyph would carry invisible padding and the line would space
// itself wrong) and scaled to a common cap height so one `lineH` drives the whole line — a letter's
// width then follows its own aspect, which is what makes a real cutout set look hand-assembled.
//
// The trim/scale runs in the SAME headless Chrome the renderer uses (canvas + getImageData), so it
// needs no image dependency, and it runs OFFLINE: the render only ever reads finished PNGs, which is
// how this stays pure in the frame number.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(repoRoot, process.env.SRC || 'assets/ransom-src');
const OUT = path.join(repoRoot, 'assets/ransom');
const CAP_H = Number(process.env.H || 220);   // target cap height in px
const ALPHA = 12;                              // alpha above this counts as ink (kills JPEG-ish fringe)

if (!fs.existsSync(SRC)) {
  console.error(`ransom-sprites: no source dir at ${path.relative(repoRoot, SRC)}`);
  console.error('  Unzip your cut-out letter pack there — a folder per character is ideal:');
  console.error('    assets/ransom-src/A/a1.png  assets/ransom-src/A/a2.png  assets/ransom-src/B/…');
  console.error('  Flat files (A.png, A-2.png) also work. Then re-run: make ransom-sprites');
  process.exit(1);
}

const IMG = /\.(png|webp|jpe?g)$/i;
/** char key -> [absolute source paths], from either layout. Sorted, so the bake is reproducible. */
function collect() {
  const out = new Map();
  const add = (key, file) => { if (!out.has(key)) out.set(key, []); out.get(key).push(file); };
  for (const entry of fs.readdirSync(SRC, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(SRC, entry.name);
    if (entry.isDirectory()) {
      // A folder name IS the character. Packs also ship grouped extras (_Shapes, _Words,
      // _Special Characters) whose folder name is a category, not a glyph — skip those rather than
      // bake a bogus "_SHAPES" key that no text could ever reference.
      if (entry.name.startsWith('_') || entry.name.length !== 1) continue;
      const key = entry.name.toUpperCase();
      for (const f of fs.readdirSync(p).sort()) if (IMG.test(f)) add(key, path.join(p, f));
    } else if (IMG.test(entry.name)) {
      // flat: leading run of non-separator chars is the character — "A.png", "A-2.png", "a_3.png"
      const m = /^([^\W_]|[!?&$@#%'".,()])/.exec(entry.name);
      if (m) add(m[1].toUpperCase(), p);
    }
  }
  return out;
}

const groups = collect();
if (!groups.size) { console.error(`ransom-sprites: found no images under ${path.relative(repoRoot, SRC)}`); process.exit(1); }

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');

/** Trim to alpha bbox + scale to CAP_H, in-page. Returns { dataUrl, w, h } or null if fully blank. */
async function bake(file) {
  const buf = fs.readFileSync(file);
  const mime = /\.png$/i.test(file) ? 'image/png' : /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg';
  const src = `data:${mime};base64,${buf.toString('base64')}`;
  return page.evaluate(async (src, capH, alphaMin) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    // alpha bbox
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > alphaMin) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null; // fully transparent
    const sw = x1 - x0 + 1, sh = y1 - y0 + 1;
    const scale = capH / sh;
    const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
    const o = document.createElement('canvas');
    o.width = dw; o.height = dh;
    const octx = o.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(c, x0, y0, sw, sh, 0, 0, dw, dh);
    return { dataUrl: o.toDataURL('image/png'), w: dw, h: dh };
  }, src, CAP_H, ALPHA);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const manifest = {};
let made = 0, blank = 0;
for (const [key, files] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
  const dir = path.join(OUT, key === '/' ? '_slash' : key);
  const variants = [];
  for (const file of files) {
    const r = await bake(file);
    if (!r) { blank++; continue; }
    fs.mkdirSync(dir, { recursive: true });
    const name = `${variants.length + 1}.png`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(r.dataUrl.split(',')[1], 'base64'));
    variants.push({ file: `${path.basename(dir)}/${name}`, w: r.w, h: r.h });
    made++;
  }
  if (variants.length) manifest[key] = variants;
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const keys = Object.keys(manifest);
console.log(`ransom-sprites: ${made} sprites across ${keys.length} characters → assets/ransom/`);
console.log(`  cap height ${CAP_H}px · characters: ${keys.join(' ')}`);
if (blank) console.log(`  skipped ${blank} fully-transparent source image(s)`);
const missing = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((c) => !manifest[c]);
if (missing.length) console.log(`  NOTE: no sprite for ${missing.join('')} — those characters will fail loudly at render`);
