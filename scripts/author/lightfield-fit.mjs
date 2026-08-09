// scripts/author/lightfield-fit.mjs: find the option set that best matches a reference.
//
//   node scripts/author/lightfield-fit.mjs refs/lightfield-ref.jpg
//
// The seed is not decoration, it is the search space. This walks a range of seeds, and then a small
// grid of shadow and pattern values, scoring each render against the reference on the same block
// metric lightfield-compare.mjs prints. It keeps one browser open, so a few hundred candidates cost
// about a minute.
//
// It prints an option set. It does not write one: a fit is a proposal, and a human still has to look.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';
import { lightfield } from '../../core/lightfield/index.js';
import { PRESETS } from './lightfield-presets.mjs';

const W = 735, H = 420, BW = 24, BH = 14;

function pixels(fileOrBuf, w, h) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', typeof fileOrBuf === 'string' ? fileOrBuf : 'pipe:0', '-vf', `scale=${w}:${h}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28, input: typeof fileOrBuf === 'string' ? undefined : fileOrBuf });
  return buf;
}

const refFile = process.argv[2] || 'refs/lightfield-ref.jpg';
// Log straight to disk. A long search that buffers its progress into a pipe tells you nothing while
// it runs, and nothing at all if it is killed.
const LOG = process.argv[3] || 'out/lightfield-fit.log';
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(LOG, '');
// Which layouts to try. SEEDLIST is the shortlist lightfield-seeds.mjs prints: that tool ranks
// millions of layouts arithmetically, this one confirms the winners through the real renderer.
const SEEDLIST = process.env.SEEDLIST ? process.env.SEEDLIST.split(',').map(Number)
  : Array.from({ length: Number(process.env.SEEDS || 250) }, (_, i) => i);
const say = (line) => { console.log(line); fs.appendFileSync(LOG, line + '\n'); };
const refBlocks = pixels(refFile, BW, BH);

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

async function score(opts) {
  const frag = lightfield(opts);
  await page.setContent(`<!doctype html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}
    #stage{position:relative;width:${W}px;height:${H}px;--t:0;--p:0}</style></head>
    <body><div id="stage">${frag}</div></body></html>`, { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png' });
  const got = pixels(png, BW, BH);
  let mad = 0;
  for (let i = 0; i < BW * BH * 3; i++) mad += Math.abs(refBlocks[i] - got[i]);
  return mad / (BW * BH * 3);
}

const base = structuredClone(PRESETS.ref);
let best = { opts: base, mad: await score(base) };
say(`start  seed ${base.seed}  mad ${best.mad.toFixed(2)}`);

// Pass 1: the seed. Everything about where the light sits comes from here.
for (const seed of SEEDLIST) {
  const opts = { ...structuredClone(best.opts), seed };
  const mad = await score(opts);
  if (mad < best.mad) { best = { opts, mad }; say(`  seed ${seed}  mad ${mad.toFixed(2)}`); }
}

// Pass 2: the shadow and the pattern relief, on a coarse grid. These set how much of the colour
// field survives, so they are fitted after the field is placed, not with it.
for (const depth of [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1]) {
  for (const softness of [0.3, 0.5, 0.7, 0.85, 1]) {
    for (const direction of ['right', 'bottom', 'bottom-right', 'center']) {
      const opts = structuredClone(best.opts);
      Object.assign(opts.shadow, { depth, softness, direction });
      const mad = await score(opts);
      if (mad < best.mad) { best = { opts, mad }; say(`  shadow ${direction} d${depth} s${softness}  mad ${mad.toFixed(2)}`); }
    }
  }
}
for (const relief of [0.1, 0.2, 0.3, 0.4, 0.5, 0.62, 0.75, 0.9]) {
  for (const count of [40, 50, 62, 74, 88]) {
    const opts = structuredClone(best.opts);
    opts.shadow.relief = relief;
    opts.pattern.count = count;
    const mad = await score(opts);
    if (mad < best.mad) { best = { opts, mad }; say(`  relief ${relief} count ${count}  mad ${mad.toFixed(2)}`); }
  }
}
// Pass 3: the seed again, now that the shadow no longer hides half the field.
for (const seed of SEEDLIST) {
  const opts = { ...structuredClone(best.opts), seed };
  const mad = await score(opts);
  if (mad < best.mad) { best = { opts, mad }; say(`  seed ${seed}  mad ${mad.toFixed(2)}`); }
}

await browser.close();
say(`\nbest mad ${best.mad.toFixed(2)} / 255  (${((best.mad / 255) * 100).toFixed(1)}%)`);
say(JSON.stringify(best.opts, null, 2));
