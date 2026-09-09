// research/lightfield/lightfield-fit.mjs: find the option set that best matches a reference.
//
//   SEEDLIST=<from lightfield-seeds.mjs> node research/lightfield/lightfield-fit.mjs refs/lightfield-ref.jpg
//   EXTRA=2 node research/lightfield/lightfield-fit.mjs      # how many accent stops the palette may use
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
// THE COLOUR STOPS ARE FITTED TOO, and until this pass they never were. Every earlier run moved the
// seed, the shadow and the pattern while the four hex values stayed exactly as a human first typed
// them, and the search then reported that four stops were the ceiling. They were not: solving the
// palette for the layout already in the chair took the block error from 17.71 to 16.06 on its own.
// The stops are SOLVED rather than searched, because the field is a weighted average of them and
// that makes it a least-squares problem (lightfield-palette.mjs, lightfield-model.mjs).
//
// It prints an option set. It does not write one: a fit is a proposal, and a human still has to look.

import fs from 'node:fs';
import { PRESETS } from '../../core/lightfield/presets.js';
import { pixels, striping, blockError, tailError, chroma } from './lightfield-metrics.mjs';
import { open, W, H } from './lightfield-render.mjs';
import { gridPoints, fitPalette, toHex } from './lightfield-model.mjs';

const BW = 24, BH = 14;

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
const pts = gridPoints(BW, BH);

const shoot = await open();

async function score(opts) {
  const [full, blocks] = await shoot.at(opts, [[W, H], [BW, BH]]);
  return {
    mad: blockError(refBlocks, blocks),
    tail: tailError(refBlocks, blocks, 0.15),
    stripe: striping(full, W, H),
    chroma: chroma(full, W, H),
    blocks,
  };
}

const base = structuredClone(PRESETS.ref);
// EXTRA is how many accent stops the palette solve may use, not what they are: they are solved.
// Two is what measured best against this reference. EXTRA=0 fits the four named roles alone.
const had = base.colour.extra || [];
const nExtra = process.env.EXTRA === undefined ? had.length : Number(process.env.EXTRA);
base.colour.extra = Array.from({ length: nExtra }, (_, i) => had[i] || '#000000');

// The cost, in one place, with every term the brief named.
//
//   swing, edge   the pattern. The block grid is blind to both by construction.
//   chroma        "washed out". Nothing else here can see it.
//   mad           where the light is, on average.
//   tail          where the light is, in the region that is doing WORST. This term is why the
//                 magenta cannot be traded away again: a pass that abandons one region to shave the
//                 average now pays for it here (docs/MISTAKES.md #272).
const cost = (s) => Math.abs(s.stripe.swing - refStripe.swing) / refStripe.swing
  + Math.abs(s.stripe.edge - refStripe.edge) / refStripe.edge
  + Math.abs(s.chroma - refChroma) / refChroma
  + s.mad / 255
  + s.tail / 255;

let best = { opts: base, ...(await score(base)) };
let bestCost = cost(best);
const show = (s) => `mad ${s.mad.toFixed(2)}  tail ${s.tail.toFixed(2)}`
  + `  swing ${s.stripe.swing.toFixed(1)}/${refStripe.swing.toFixed(1)}`
  + `  chroma ${s.chroma.toFixed(0)}/${refChroma.toFixed(0)}`;
const take = (opts, s, label) => {
  const c = cost(s);
  if (c >= bestCost) return false;
  bestCost = c;
  best = { opts, ...s };
  say(`  ${label}  ${show(s)}  cost ${c.toFixed(3)}`);
  return true;
};

say(`reference: edge ${refStripe.edge.toFixed(2)}  swing ${refStripe.swing.toFixed(2)}  chroma ${refChroma.toFixed(1)}`);
say(`start  seed ${base.seed}  ${show(best)}  cost ${bestCost.toFixed(3)}`);

// Solve the palette for whatever layout is currently in the chair.
//
// The solve models the colour field and cannot see the pattern over it or the saturate() filter, so
// it is run as a correction loop: render, measure what the model failed to predict, fold that
// residual into the target, solve again. Two rounds is where it stops moving.
async function solvePalette(from, label) {
  // Round 0 solves against the reference itself. The correction is only meaningful once it is the
  // residual of THIS palette's own render: correcting first, off whatever palette the layout
  // happened to inherit, feeds the solve someone else's error. That is not a subtle loss. It sent
  // the best layout in the shortlist from a reachable 14.58 to 17.50 and the pass walked past it.
  const corrected = Float64Array.from(refBlocks);
  let opts = structuredClone(from.opts);
  let out = from;
  for (let round = 0; round < 3; round++) {
    const hex = fitPalette(opts, corrected, 4 + nExtra, pts, 4).stops.map(toHex);
    opts = structuredClone(opts);
    Object.assign(opts.colour, { bloom: hex[0], mid: hex[1], deep: hex[2], ground: hex[3], extra: hex.slice(4) });
    const s = await score(opts);
    out = { opts, ...s };
    take(opts, s, `${label} palette r${round}`);
    for (let i = 0; i < corrected.length; i++) corrected[i] += refBlocks[i] - s.blocks[i];
  }
  return out;
}

// Pass 1: the layout, each candidate wearing the palette solved FOR it. Ranking layouts on one
// fixed palette is what made the incumbent look unbeatable, because it was the palette the
// incumbent had been chosen with.
say('pass 1: layout + solved palette');
for (const seed of SEEDLIST) {
  const opts = { ...structuredClone(best.opts), seed };
  const s = await score(opts);
  take(opts, s, `seed ${seed}`);
  // A layout that loses on the palette it INHERITED may still win on the palette solved for it,
  // and that difference is the whole finding of this pass. Solve before judging.
  await solvePalette({ opts, ...s }, `seed ${seed}`);
}

// Pass 2: the falloff.
say('pass 2: falloff');
for (const depth of [0, 0.2, 0.4, 0.55, 0.7]) {
  for (const softness of [0.3, 0.6, 0.85, 1]) {
    for (const direction of ['right', 'bottom', 'bottom-right', 'center']) {
      const opts = structuredClone(best.opts);
      Object.assign(opts.shadow, { depth, softness, direction });
      take(opts, await score(opts), `shadow ${direction} d${depth} s${softness}`);
    }
  }
}

// Pass 3: the pattern's contrast, then the palette again, alternating until they settle. They trade
// against each other: a harder seam darkens the field, and the palette solve answers by lifting the
// stops, so neither can be fitted once and left.
for (let round = 0; round < 3; round++) {
  say(`round ${round + 1}`);
  for (const seam of [0.35, 0.5, 0.65, 0.8, 0.95]) {
    for (const sheen of [0.3, 0.45, 0.6, 0.8, 1]) {
      for (const count of [50, 62, 74, 88]) {
        const opts = structuredClone(best.opts);
        Object.assign(opts.shadow, { seam, sheen });
        opts.pattern.count = count;
        take(opts, await score(opts), `seam ${seam} sheen ${sheen} count ${count}`);
      }
    }
  }
  for (const jitter of [0.25, 0.4, 0.55, 0.7, 0.85]) {
    const opts = structuredClone(best.opts);
    opts.pattern.jitter = jitter;
    take(opts, await score(opts), `jitter ${jitter}`);
  }
  for (const vivid of [1, 1.1, 1.15, 1.25, 1.35, 1.5]) {
    const opts = structuredClone(best.opts);
    opts.colour.vivid = vivid;
    take(opts, await score(opts), `vivid ${vivid}`);
  }
  await solvePalette(best, `round ${round + 1}`);
}

await shoot.close();
say(`\nbest  mad ${best.mad.toFixed(2)} / 255 (${((best.mad / 255) * 100).toFixed(1)}%)`
  + `  tail ${best.tail.toFixed(2)}`
  + `  edge ${best.stripe.edge.toFixed(2)} vs ${refStripe.edge.toFixed(2)}`
  + `  swing ${best.stripe.swing.toFixed(2)} vs ${refStripe.swing.toFixed(2)}`
  + `  chroma ${best.chroma.toFixed(1)} vs ${refChroma.toFixed(1)}`);
const { blocks, ...clean } = best;
say(JSON.stringify(clean.opts, null, 2));
