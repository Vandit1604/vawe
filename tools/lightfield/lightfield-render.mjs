// scripts/author/lightfield-render.mjs, take a screenshot that is the same picture every time.
//
// `page.screenshot()` right after `load` is a lie waiting to happen. A lightfield is dozens of blended,
// masked elements, and the compositor is free to hand back a frame before they have all rastered: the
// PNG is valid, the right size, and almost black. `tide` spent a day looking broken when only its
// portrait was, and every fidelity number measured off such a shot is measuring the browser's timing
// rather than the generator.
//
// The fix is not "wait longer", which only moves the odds. It is to shoot until two CONSECUTIVE frames
// are byte-identical: the picture has stopped changing, so nothing is still arriving. The same argument
// as the deferred-decode finding in docs/MISTAKES.md #279, where waiting longer turned "always wrong"
// into "sometimes wrong" and settled nothing.
//
// A lightfield with motion never settles, because `--t` drives it. The caller pins the clock (the shot
// page writes a fixed `--t`), so "settled" here means rastered, not motionless.

import puppeteer from 'puppeteer';
import { lightfield } from '../../core/lightfield/index.js';
import { pixels } from './lightfield-metrics.mjs';
import { W, H } from './lightfield-model.mjs';

// The measuring size, in one place. A fidelity number is only comparable to another one taken at the
// same size, and this used to live in three files.
// The shot size IS the box the model evaluates in, so it is defined once, in lightfield-model.mjs,
// and re-exported here for every caller that already reaches for it.
// `export … from` forwards the names to importers but never BINDS them in this module's scope, and
// this file reads W and H itself. Import, then re-export.
export { W, H };

/**
 * The page a field is measured on, defined ONCE.
 *
 * Both the shot tool and the fit tool put a fragment on a page, and for a while they each wrote
 * their own. Two pages is two pictures: a different stage size, a different `--t` or a different
 * body background and the number one tool prints is not about the field the other tool rendered.
 *
 * Chrome wraps the last device pixel of a gradient background when the element is an ODD number of
 * pixels wide: at 735 the right-hand column repeats the left edge, at 734 and 736 it does not. The
 * engine's canvases are 1080 and 1920, so a real render never sees it. A reference shot can be any
 * size, so lay the page out even and clip back to what was asked for.
 */
export const stage = (fragment, w, h, t = 0) => `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w + (w % 2)}px;height:${h + (h % 2)}px;overflow:hidden;background:#000}
    #stage{position:relative;width:${w + (w % 2)}px;height:${h + (h % 2)}px;--t:${t};--p:0}
  </style></head><body><div id="stage">${fragment}</div></body></html>`;

export const LAUNCH = { args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'] };

/**
 * open() -> { at(opts, sizes) -> Buffer[], close() }
 *
 * One browser, many option sets. A search that launches Chrome per candidate spends more time
 * starting browsers than measuring fields, and the tool that needed this imported it for months
 * while nothing exported it, so `lightfield-fit.mjs` could not run at all.
 *
 * `at` returns one raw RGB buffer per requested size, off ONE screenshot, so the full-resolution
 * pass and the block pass can never be measurements of two different renders.
 */
export async function open({ w = W, h = H, t = 0 } = {}) {
  const browser = await puppeteer.launch(LAUNCH);
  const page = await browser.newPage();
  await page.setViewport({ width: w + (w % 2), height: h + (h % 2), deviceScaleFactor: 1 });
  return {
    async at(opts, sizes = [[w, h]]) {
      await page.setContent(stage(lightfield(opts), w, h, t), { waitUntil: 'load' });
      const png = await stableShot(page, { x: 0, y: 0, width: w, height: h });
      return sizes.map(([sw, sh]) => pixels(png, sw, sh));
    },
    png(opts) {
      return page.setContent(stage(lightfield(opts), w, h, t), { waitUntil: 'load' })
        .then(() => stableShot(page, { x: 0, y: 0, width: w, height: h }));
    },
    close: () => browser.close(),
  };
}

const FRAME = 90;   // ms between attempts. Two rAFs plus raster, with room to spare.
const TRIES = 12;   // ~1.1s worst case. Past this something is genuinely wrong and silence would hide it.

/**
 * stableShot(page, clip) -> Buffer
 * Screenshots `clip` repeatedly until two in a row match, and throws if that never happens.
 */
// Puppeteer returns a Uint8Array on current versions and a Buffer on older ones, and only one of those
// has .equals(). Compare through Buffer.from, which accepts either and copies nothing meaningful here.
const sameBytes = (a, b) => Buffer.from(a).equals(Buffer.from(b));

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
  // Loud, because the alternative is a fidelity number nobody can trust. A caller that genuinely wants
  // a moving subject should pin its clock instead of catching this.
  throw new Error(`lightfield-render: the frame never settled after ${TRIES} attempts `
    + `(${(TRIES * FRAME) / 1000}s). Two consecutive screenshots were still different, so something is `
    + `animating or still rastering. If the fragment has motion, pin its clock before shooting it.`);
}
