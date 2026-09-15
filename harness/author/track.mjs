// track.mjs: emit a hand-keyed `motion` track from a MEASURED shape, and optionally patch it in.
//
//   node harness/author/track.mjs pan   --to -600 --dur 1.25
//   node harness/author/track.mjs blast --dur 1.5
//   node harness/author/track.mjs drift --dur 3 --amp 12
//   node harness/author/track.mjs enter --from 40 --dur 0.9
//   node harness/author/track.mjs pan --to -600 --dur 1.25 --offset 0.12   # weld a rider to the same pan
//   … --scene films/scene/x.json --layer 4                               # write it, surgically
//
// WHY THIS EXISTS, and why studio's keyframe mode is not it. `engine-doctrine/CRAFT/KEYED-MOTION.md` says the
// thing that stopped anyone placing dense keys was the cost of placing them, and it fixed that by
// letting a person DRAG a layer on the stage. An agent cannot drag. So the cheap path stayed cheap for
// a human and stayed absent for the author who writes most of the scenes in this repo, and the result
// is measurable: `higgsfield-recreation` carries a keyed track on 6 of its 8 layers, `brew-launch-act1`
// on 4, and the library median is 0. A launch film written for vawe.dev shipped with sixteen layers and
// not one track, because `"preset": "up"` is one word and a track is seven lines. This closes that gap
// on the side the gap was actually on.
//
// THE SHAPES THEMSELVES NOW LIVE IN core/motion/shapes.js, registered through `defineRegistry` so an
// unknown shape is refused at load with a hint, the way every other engine vocabulary is. They moved
// out of this file (a tooling file, outside core/) because a storyboard verb (`move:`,
// harness/lib/contract.mjs) that depends on tooling to build a JSON value makes authoring load-bearing
// on something core/ should own outright. This file keeps the CLI; nothing about its flags changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPES } from '../../core/motion/shapes.js';
import { patchMotion } from './patch-motion.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r3 = (v) => +Number(v).toFixed(3);
export { SHAPES };

// Welding a rider to a subject's track is how higgsfield keeps six layers on one pan. The offset is a
// TIME shift, not a copy with different numbers: the rider is late, it is not doing something else.
const shift = (keys, by) => keys.map((k) => ({ ...k, t: r3(k.t + by) }));

// RUN AS A COMMAND, IMPORTABLE AS A MODULE. The CLI used to be straight-line at the top level, so
// `import { SHAPES }` printed the usage text and exited 2, and the shapes could therefore be asserted
// by nothing. A generator no gate can read is a generator that drifts (quality/gates/lib-test.mjs now
// measures the velocity of what `exit` emits).
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
