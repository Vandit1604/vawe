// harness/author/lightfield-shot.mjs: screenshot a generated field at a fixed frame.
//
// `make preview` centres a fragment in a 1400px box, which is the wrong page for a full-bleed field:
// the field is `position:absolute;inset:0` and needs a sized parent. This gives it one, sets
// `--t` explicitly (the field must look the same on every run), and writes a PNG.
//
// Moved here from the deleted research/lightfield/ fitting rig: this file only screenshots a field,
// it does not compare one against a reference photograph, so it survives the removal of refs/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The measuring size, in one place, so a shot is always comparable to another shot.
export const W = 735, H = 420;

export const LAUNCH = { args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'] };

/**
 * The page a field is shot on.
 *
 * Chrome wraps the last device pixel of a gradient background when the element is an ODD number of
 * pixels wide: at 735 the right-hand column repeats the left edge, at 734 and 736 it does not. The
 * engine's canvases are 1080 and 1920, so a real render never sees it. A shot can be any size, so lay
 * the page out even and clip back to what was asked for.
 */
export const stage = (fragment, w, h, t = 0) => `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w + (w % 2)}px;height:${h + (h % 2)}px;overflow:hidden;background:#000}
    #stage{position:relative;width:${w + (w % 2)}px;height:${h + (h % 2)}px;--t:${t};--p:0}
  </style></head><body><div id="stage">${fragment}</div></body></html>`;

const FRAME = 90;   // ms between attempts. Two rAFs plus raster, with room to spare.
const TRIES = 12;   // ~1.1s worst case. Past this something is genuinely wrong and silence would hide it.

// Puppeteer returns a Uint8Array on current versions and a Buffer on older ones, and only one of those
// has .equals(). Compare through Buffer.from, which accepts either and copies nothing meaningful here.
const sameBytes = (a, b) => Buffer.from(a).equals(Buffer.from(b));

/**
 * stableShot(page, clip) -> Buffer
 * Screenshots `clip` repeatedly until two in a row match, and throws if that never happens.
 */
export async function stableShot(page, clip) {
  // Two rAFs first: the first schedules the commit, the second runs after it. This is the cheap part
  // and it is right most of the time; the loop below is what makes it reliable.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  let prev = await page.screenshot({ clip });
  for (let i = 0; i < TRIES; i++) {
    await new Promise((r) => setTimeout(r, FRAME));
    const next = await page.screenshot({ clip });
    if (sameBytes(next, prev)) return Buffer.from(next);
    prev = next;
  }
  // Loud, because the alternative is a shot nobody can trust. A caller that genuinely wants a moving
  // subject should pin its clock instead of catching this.
  throw new Error(`lightfield-shot: the frame never settled after ${TRIES} attempts `
    + `(${(TRIES * FRAME) / 1000}s). Two consecutive screenshots were still different, so something is `
    + `animating or still rastering. If the fragment has motion, pin its clock before shooting it.`);
}

export async function shoot(htmlFile, outPng, { w = W, h = H, t = 0 } = {}) {
  const frag = fs.readFileSync(htmlFile, 'utf8');
  const pw = w + (w % 2), ph = h + (h % 2);
  const page$ = stage(frag, w, h, t);

  const browser = await puppeteer.launch(LAUNCH);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: pw, height: ph, deviceScaleFactor: 1 });
    await page.setContent(page$, { waitUntil: 'load' });
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    // Never `page.screenshot` a field straight after `load`. A blended, masked field is sometimes
    // not rastered yet and the shot comes back valid and almost black, which is how `tide` spent a
    // day looking broken when only its portrait was. stableShot waits for two identical frames.
    fs.writeFileSync(outPng, await stableShot(page, { x: 0, y: 0, width: w, height: h }));
  } finally {
    await browser.close();
  }
  return outPng;
}

// Run directly: node harness/author/lightfield-shot.mjs <fragment.html> [out.png]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = process.argv[2];
  if (!src) { console.error('usage: node harness/author/lightfield-shot.mjs <fragment.html> [out.png]'); process.exit(1); }
  const out = process.argv[3] || path.join(ROOT, 'out', path.basename(src).replace(/\.html$/, '.png'));
  console.log(await shoot(src, out));
}
