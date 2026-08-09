// scripts/author/lightfield-fit.mjs: find the option set that best matches a reference.
//
//   SEEDLIST=<from lightfield-seeds.mjs> node scripts/author/lightfield-fit.mjs refs/lightfield-ref.jpg
//   EXTRA='#5c0f42,#141a3c' ... to fit with accent colours, EXTRA= to fit without
//
// Two objectives, and knowing which one a pass is allowed to use is the whole point.
//
//   The SEED and the SHADOW decide where the light sits and what colour it is, so the opening
//   passes are scored on the block grid, which averages the pattern away.
//
//   SEAM, SHEEN and COUNT decide how hard the pattern cuts, and the block grid is deliberately
//   blind to that. Fitting them against it is how a field ends up passing while looking mushy: the
//   first version of this generator scored 7.1% with its striping at 0.77x of the reference and
//   every number said it was fine.
//
// So once the pattern is in play, every pass is scored on ONE combined cost. Alternating two
// objectives lets the later pass spend what the earlier one earned, which is not a hypothetical:
// the run before this comment took the striping to 10.8 and a layout pass handed back 10.2.
//
// It prints an option set. It does not write one: a fit is a proposal, and a human still has to look.

import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { lightfield } from '../../core/lightfield/index.js';
import { PRESETS } from './lightfield-presets.mjs';
import { pixels, striping, blockError, chroma } from './lightfield-metrics.mjs';

const W = 735, H = 420, BW = 24, BH = 14;

const refFile = process.argv[2] || 'refs/lightfield-ref.jpg';
// Log straight to disk. A long search that buffers its progress into a pipe tells you nothing while
// it runs, and nothing at all if it is killed.
const LOG = process.argv[3] || 'out/lightfield-fit.log';
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(LOG, '');
const say = (line) => { console.log(line); fs.appendFileSync(LOG, line + '\n'); };

// Which layouts to try. SEEDLIST is the shortlist lightfield-seeds.mjs prints: that tool ranks
// millions of layouts arithmetically, this one confirms the winners through the real renderer.
const SEEDLIST = process.env.SEEDLIST ? process.env.SEEDLIST.split(',').map(Number)
  : Array.from({ length: Number(process.env.SEEDS || 250) }, (_, i) => i);

const refBlocks = pixels(refFile, BW, BH);
const refFull = pixels(refFile, W, H);
const refStripe = striping(refFull, W, H);
const refChroma = chroma(refFull, W, H);

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
  const full = pixels(png, W, H);
  return {
    mad: blockError(refBlocks, pixels(png, BW, BH)),
    stripe: striping(full, W, H),
    chroma: chroma(full, W, H),
  };
}

const base = structuredClone(PRESETS.ref);
// EXTRA='#5c0f42,#141a3c' overrides colour.extra, so a fit can be run with and without the accent
// colours and the two numbers compared. EXTRA='' means none.
if (process.env.EXTRA !== undefined) base.colour.extra = process.env.EXTRA ? process.env.EXTRA.split(',') : [];

let best = { opts: base, ...(await score(base)) };
const show = (s) => `mad ${s.mad.toFixed(2)}  swing ${s.stripe.swing.toFixed(1)}/${refStripe.swing.toFixed(1)}`
  + `  chroma ${s.chroma.toFixed(0)}/${refChroma.toFixed(0)}`;
say(`reference: edge ${refStripe.edge.toFixed(2)}  swing ${refStripe.swing.toFixed(2)}  chroma ${refChroma.toFixed(1)}`);
say(`start  seed ${base.seed}  ${show(best)}`);

// Pass 1: the layout. Block grid only.
for (const seed of SEEDLIST) {
  const opts = { ...structuredClone(best.opts), seed };
  const s = await score(opts);
  if (s.mad < best.mad) { best = { opts, ...s }; say(`  seed ${seed}  ${show(s)}`); }
}

// Pass 2: the falloff. Block grid only.
for (const depth of [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1]) {
  for (const softness of [0.3, 0.5, 0.7, 0.85, 1]) {
    for (const direction of ['right', 'bottom', 'bottom-right', 'center']) {
      const opts = structuredClone(best.opts);
      Object.assign(opts.shadow, { depth, softness, direction });
      const s = await score(opts);
      if (s.mad < best.mad) { best = { opts, ...s }; say(`  shadow ${direction} d${depth} s${softness}  ${show(s)}`); }
    }
  }
}

// From here on, ONE cost. Passes 1 and 2 could use the block grid alone because they only decide
// colour, but a pass that re-picks the layout while ignoring the striping will happily hand back the
// crispness pass 3 just bought: the first run of this fitter did exactly that, 10.8 down to 10.2.
// Three terms, because the brief named two defects and the block error can see neither. Striping is
// "too soft", chroma is "washed out", and the block error is the tie-break that keeps the light in
// the right place. Leaving chroma out is not neutral: a run without it moved the block error from
// 18.53 to 18.11 by raising mean green from 37.8 to 40.0, and the field visibly paled.
const cost = (s) => Math.abs(s.stripe.swing - refStripe.swing) / refStripe.swing
  + Math.abs(s.stripe.edge - refStripe.edge) / refStripe.edge
  + Math.abs(s.chroma - refChroma) / refChroma
  + s.mad / 255;
let bestCost = cost(best);
const take = (opts, s, label) => {
  const c = cost(s);
  if (c >= bestCost) return;
  bestCost = c;
  best = { opts, ...s };
  say(`  ${label}  ${show(s)}  cost ${c.toFixed(3)}`);
};

// The pattern's contrast and the layout trade against each other, so alternate until they settle.
for (let round = 0; round < 2; round++) {
  say(`round ${round + 1}`);
  for (const seam of [0.35, 0.5, 0.65, 0.8]) {
    for (const sheen of [0.3, 0.45, 0.6, 0.8]) {
      for (const count of [62, 74, 88]) {
        const opts = structuredClone(best.opts);
        Object.assign(opts.shadow, { seam, sheen });
        opts.pattern.count = count;
        take(opts, await score(opts), `seam ${seam} sheen ${sheen} count ${count}`);
      }
    }
  }
  for (const vivid of [1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4]) {
    const opts = structuredClone(best.opts);
    opts.colour.vivid = vivid;
    take(opts, await score(opts), `vivid ${vivid}`);
  }
  for (const seed of SEEDLIST) {
    const opts = { ...structuredClone(best.opts), seed };
    take(opts, await score(opts), `seed ${seed}`);
  }
}

await browser.close();
say(`\nbest  mad ${best.mad.toFixed(2)} / 255 (${((best.mad / 255) * 100).toFixed(1)}%)`
  + `  edge ${best.stripe.edge.toFixed(2)} vs ${refStripe.edge.toFixed(2)}`
  + `  swing ${best.stripe.swing.toFixed(2)} vs ${refStripe.swing.toFixed(2)}`);
say(JSON.stringify(best.opts, null, 2));
