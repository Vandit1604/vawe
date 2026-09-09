// scripts/author/lightfield-seeds.mjs: search the seed space for the layout closest to a reference.
//
//   node scripts/author/lightfield-seeds.mjs refs/lightfield-ref.jpg [howMany]
//   EXTRA=2 node scripts/author/lightfield-seeds.mjs        # how many accent stops the palette may use
//
// The seed decides where the light sits, and that is ten numbers at once. Searching it through the
// browser costs about a second a candidate, so a few hundred tries is all you get, and a few hundred
// samples of a ten-dimensional space finds nothing. This scores the colour field ARITHMETICALLY
// instead, off the shared model in lightfield-model.mjs, and does a quarter of a million in a minute.
//
// Each layout is scored wearing the palette SOLVED FOR IT, not a palette borrowed from whichever
// layout happened to be in the preset. That distinction is not academic. The previous version held
// four hand-typed hex values fixed across four million layouts and reported that the incumbent could
// not be beaten and that four stops were the ceiling. Both conclusions were artefacts of the fixed
// palette: every rival was being judged in the incumbent's clothes.
//
// It is a model, so it is approximate: it skips the pattern, the shadow and the blend. It is used
// only to RANK. The winners then go through the real renderer in lightfield-fit.mjs, which is what
// the reported number comes from.

import { pixels } from './lightfield-metrics.mjs';
import { gridPoints, fitPalette, toHex } from './lightfield-model.mjs';
import { PRESETS } from '../../core/lightfield/presets.js';
import { resolve } from '../../core/lightfield/options.js';

const BW = 24, BH = 14;
const refFile = process.argv[2] || 'refs/lightfield-ref.jpg';
const want = Number(process.argv[3] || 250000);

const ref = pixels(refFile, BW, BH);
const target = Float64Array.from(ref);
const pts = gridPoints(BW, BH);

// RESOLVED, not raw. A preset is a PATCH: `PRESETS.ref` carries no `colour.extra` at all, so the
// line below read `.length` of undefined and this tool crashed before its first seed. Every other
// consumer of a preset resolves it, and fieldBlobs() resolves defensively for this exact caller.
const base = resolve(structuredClone(PRESETS.ref));
// EXTRA is how MANY accent stops the palette may use. Their values are solved, so there is nothing
// to type. EXTRA=0 ranks layouts under the four named roles alone.
const nExtra = process.env.EXTRA === undefined ? base.colour.extra.length : Number(process.env.EXTRA);
const nRoles = 4 + nExtra;

// Two stages. One plain solve per layout is the sieve; the shortlist is then re-solved with the
// worst points given a louder vote, because the tail is what decides and the mean is only a filter.
let best = [];
for (let seed = 0; seed < want; seed++) {
  const opts = { ...base, seed, colour: { ...base.colour, extra: Array(nExtra).fill('#000000') } };
  const { mad } = fitPalette(opts, target, nRoles, pts, 1);
  if (best.length < 24 || mad < best[best.length - 1].mad) {
    best.push({ seed, mad, opts });
    best.sort((a, b) => a.mad - b.mad);
    best = best.slice(0, 24);
  }
}
for (const b of best) Object.assign(b, fitPalette(b.opts, target, nRoles, pts, 4));
best.sort((a, b) => a.tail - b.tail);

console.log(`searched ${want} seeds against ${refFile}, ${nRoles} stops, each layout wearing its own solved palette`);
for (const b of best) {
  console.log(`  seed ${String(b.seed).padStart(7)}  modelled mad ${b.mad.toFixed(2)}  tail15 ${b.tail.toFixed(2)}`
    + `  ${b.stops.map(toHex).join(' ')}`);
}
console.log('\nSEEDLIST=' + best.map((b) => b.seed).join(','));
