// research/lightfield/lightfield-model-check.mjs: is lightfield-model.mjs a model of the field, or just
// plausible arithmetic?
//
//   node research/lightfield/lightfield-model-check.mjs
//
// The model predicts the colour field from geometry alone, and two fitting tools rank layouts by what
// it says. A model that is quietly wrong does not crash: it returns confident numbers and the search
// walks past the right answer. That is the failure this catches.
//
// It renders the COLOUR FIELD ALONE (paintField: no pattern, no shadow, no filter) and compares it to
// what the model predicts for the same options. Anything left is the model's own error, with nothing
// downstream to hide behind.
//
// It also checks that every row of weights sums to 1. That is not cosmetic: the weights are shares of
// one painted pixel, so a row summing to less has lost light and a row summing to more has invented
// it, and either way the palette solved against it is paying for a picture nobody renders.
import puppeteer from 'puppeteer';
import { paintField } from '../../core/lightfield/index.js';
import { resolve } from '../../core/lightfield/options.js';
import { PRESETS } from '../../core/lightfield/presets.js';
import { gridPoints, fieldWeights, W, H, ROLES } from './lightfield-model.mjs';
import { toRgb } from '../../core/lightfield/colour.js';
import { execFileSync } from 'node:child_process';

const BW = 24, BH = 14;
const pts = gridPoints(BW, BH);
// Measured at 0.34 to 0.92 out of 255 when this was written. The limit is set well above that and
// well below anything a person could see, so it catches a broken model rather than drift.
const MEAN_LIMIT = 3;
let fails = 0;
const b = await puppeteer.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await b.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (const name of ['ref', 'ember', 'colonnade']) {
  const opts = resolve(structuredClone(PRESETS[name]));
  await page.setContent(`<style>html,body{margin:0}#f{width:${W}px;height:${H}px;background-image:${paintField(opts)}}</style><div id=f></div>`);
  const png = `out/_model-check-${name}.png`;
  await page.screenshot({ path: png });
  const real = execFileSync('ffmpeg', ['-v','error','-i',png,'-vf',`scale=${BW}:${BH}:flags=area`,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:1<<28});

  const hex = [...ROLES.map(r=>opts.colour[r]), ...opts.colour.extra];
  const n = hex.length;
  const A = fieldWeights(opts, n, pts);
  const stops = hex.map(h=>{const{r,g,b}=toRgb(h);return [r,g,b];});
  let sum=0, worst=0;
  for (let i=0;i<pts.length;i++){
    const row=A.subarray(i*n,(i+1)*n);
    let d=0;
    for(let c=0;c<3;c++){let v=0;for(let j=0;j<n;j++)v+=row[j]*stops[j][c];d+=Math.abs(v-real[i*3+c]);}
    sum+=d/3; worst=Math.max(worst,d/3);
  }
  // A row of weights must sum to 1, or the model is losing or inventing light.
  let sMin=9, sMax=0;
  for(let i=0;i<pts.length;i++){let s=0;const row=A.subarray(i*n,(i+1)*n);for(let j=0;j<n;j++)s+=row[j];sMin=Math.min(sMin,s);sMax=Math.max(sMax,s);}
  const mean = sum / pts.length;
  const bad = mean > MEAN_LIMIT || Math.abs(sMin - 1) > 1e-6 || Math.abs(sMax - 1) > 1e-6;
  if (bad) fails++;
  console.log(`${bad ? 'x' : 'v'} ${name.padEnd(10)} stops ${n}  mean |model - render| ${mean.toFixed(2)}/255`
    + `  worst ${worst.toFixed(1)}  weight-sum ${sMin.toFixed(4)}..${sMax.toFixed(4)}`);
}
await b.close();
if (fails) {
  console.error(`\n${fails} preset(s) the model does not predict. The fitting tools rank layouts by`
    + ' this model, so a wrong model is a search that confidently reports the wrong winner.');
  process.exit(1);
}
console.log(`\nmodel agrees with the renderer on every preset (limit ${MEAN_LIMIT}/255).`);
