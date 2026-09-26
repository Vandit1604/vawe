import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPES } from '../../core/motion/shapes.js';
import { patchMotion } from './patch-motion.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r3 = (v) => +Number(v).toFixed(3);
export { SHAPES };

const shift = (keys, by) => keys.map((k) => ({ ...k, t: r3(k.t + by) }));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const shape = argv[0];
  const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
  const num = (n, d) => { const v = flag(n, null); return v == null ? d : Number(v); };

  if (!shape || !SHAPES[shape]) {
    console.error(`usage: node harness/author/track.mjs <${Object.keys(SHAPES).join('|')}> [flags]

    pan    --to -600 --dur 1.25 [--from 0] [--axis x]   the higgsfield scroll rhythm
    blast  --dur 1.5 [--peak 1.5] [--out 1.9]           the brew four-key punctuation
    drift  --dur 3 [--amp 12] [--axis y]                an ambient hold that still moves
    enter  --dur 0.9 [--from 40] [--axis y]             a keyed entrance, not a preset
    exit   --dur 0.55 [--to -260] [--axis y]           a keyed departure: leaves, does not just dim

    --offset 0.12                 shift every key later, to weld a rider onto a subject's track
    --scene <f.json> --layer <n>  write it into that layer, surgically (no reformat)`);
    process.exit(2);
  }

  let keys = SHAPES[shape]({
    dur: num('dur', undefined), to: num('to', undefined), from: num('from', undefined),
    amp: num('amp', undefined), peak: num('peak', undefined), out: num('out', undefined),
    axis: flag('axis', undefined),
  });
  const off = num('offset', 0);
  if (off) keys = shift(keys, off);

  const scene = flag('scene', null);
  const layer = flag('layer', null);
  if (!scene) { console.log(JSON.stringify(keys)); process.exit(0); }

  if (layer == null) { console.error('✗ --scene needs --layer <n>: which layer gets this track.'); process.exit(2); }
  const file = path.resolve(repoRoot, scene);
  if (!fs.existsSync(file)) { console.error(`✗ no such scene: ${scene}`); process.exit(2); }
  const src = fs.readFileSync(file, 'utf8');
  const next = patchMotion(src, Number(layer), keys);
  if (next === src) { console.log(`· layer ${layer} already carries this exact track. Nothing written.`); process.exit(0); }
  fs.writeFileSync(file, next);
  console.log(`✓ ${shape} → ${scene} layers[${layer}]  (${keys.length} keys, ${r3(keys[keys.length - 1].t)}s)`);
  console.log(`  the track is RELATIVE to the layer's rest position, and runs from its own \`start\`.`);
}
