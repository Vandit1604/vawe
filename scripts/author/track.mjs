// track.mjs: emit a hand-keyed `motion` track from a MEASURED shape, and optionally patch it in.
//
//   node scripts/author/track.mjs pan   --to -600 --dur 1.25
//   node scripts/author/track.mjs blast --dur 1.5
//   node scripts/author/track.mjs drift --dur 3 --amp 12
//   node scripts/author/track.mjs enter --from 40 --dur 0.9
//   node scripts/author/track.mjs pan --to -600 --dur 1.25 --offset 0.12   # weld a rider to the same pan
//   … --scene formats/scene/x.json --layer 4                               # write it, surgically
//
// WHY THIS EXISTS, and why studio's keyframe mode is not it. `docs/CRAFT/KEYED-MOTION.md` says the
// thing that stopped anyone placing dense keys was the cost of placing them, and it fixed that by
// letting a person DRAG a layer on the stage. An agent cannot drag. So the cheap path stayed cheap for
// a human and stayed absent for the author who writes most of the scenes in this repo, and the result
// is measurable: `higgsfield-recreation` carries a keyed track on 6 of its 8 layers, `brew-launch-act1`
// on 4, and the library median is 0. A launch film written for vawe.dev shipped with sixteen layers and
// not one track, because `"preset": "up"` is one word and a track is seven lines. This closes that gap
// on the side the gap was actually on.
//
// NOTHING HERE IS INVENTED. Every shape is the normalised measurement of a real film in this repo,
// taken from blueprints/beats-track.mjs and docs/CRAFT/KEYED-MOTION.md. `pan` is the scroll rhythm of
// higgsfield beat 2, whose per-segment speed runs 1.03, 1.35, 1.29, 0.75, 0.59 of the average: the page
// surges and then gives up, which is what makes it read as somebody's hand rather than as an animation
// of a page. `blast` is brew's four-key punctuation. Both would be wrong if smoothed.
//
// The interior keys are deliberately `linear`. core/sequence.js interpolates a segment shorter than
// DENSE_KEY_SEC (0.14s) linearly anyway, so naming it is documentation rather than instruction, and it
// keeps the file honest about which segments are mechanical.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCROLL_RHYTHM } from '../../blueprints/beats-track.mjs';
import { patchMotion } from './patch-motion.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r3 = (v) => +Number(v).toFixed(3);

// Nothing lands on a round number (KEYED-MOTION.md §4): a track whose keys sit on 0.5 and 1.0 reads as
// a preset with extra steps. The jitter is a pure function of the key's index, never Math.random, or
// the same command would emit a different file twice and renderFrame(n) would stop being reproducible.
const nudge = (i, amp = 0.012) => amp * (((i * 2654435761) % 1000) / 1000 - 0.5) * 2;

const SHAPES = {
  // higgsfield beat 2: irregular gaps, linear interior, everything relative to a single travel.
  pan: ({ dur = 1.25, to = -600, from = 0, axis = 'x' }) => {
    const keys = [{ t: 0, [axis]: r3(from) }];
    SCROLL_RHYTHM.forEach(([ft, fd], i) => {
      const last = i === SCROLL_RHYTHM.length - 1;
      keys.push({
        t: r3(dur * ft + (last ? 0 : nudge(i) * dur)),
        [axis]: r3(from + (to - from) * fd),
        ease: last ? 'easeOutCubic' : 'linear',
      });
    });
    return keys;
  },
  // brew's punctuation: arrive over-size, settle, drift, then leave THROUGH the frame rather than fade.
  blast: ({ dur = 1.5, peak = 1.5, out = 1.9 }) => ([
    { t: 0, scale: r3(peak), opacity: 0, ease: 'easeOutCubic' },
    { t: r3(dur * 0.28), scale: 1, opacity: 1, ease: 'easeOutCubic' },
    { t: r3(dur * 0.8), scale: 1.04, ease: 'linear' },
    { t: r3(dur), scale: r3(out), opacity: 0, ease: 'easeInCubic' },
  ]),
  // an ambient hold that is not a still: small, slow, and never returning to exactly where it began.
  drift: ({ dur = 3, amp = 12, axis = 'y' }) => ([
    { t: 0, [axis]: 0 },
    { t: r3(dur * 0.38), [axis]: r3(amp), ease: 'easeInOutSine' },
    { t: r3(dur * 0.71), [axis]: r3(-amp * 0.55), ease: 'easeInOutSine' },
    { t: r3(dur), [axis]: r3(amp * 0.22), ease: 'easeInOutSine' },
  ]),
  // A KEYED DEPARTURE. `EXIT_FX` ships eleven named exits and 153 scenes use none of them, while the
  // engine's default exit is a fade in place, so almost every layer in this library leaves the same way.
  // The exemplars do not: brew's punctuation leaves by growing THROUGH the frame, and higgsfield's
  // leave diegetically, carried off by the pan they arrived on. This is the cheap middle: accelerate
  // out of the frame on one axis, opacity trailing the move rather than leading it, so the layer is
  // gone because it LEFT and not because it dimmed.
  exit: ({ dur = 0.55, to = -260, axis = 'y' }) => ([
    { t: 0, [axis]: 0, opacity: 1 },
    { t: r3(dur * 0.34), [axis]: r3(to * 0.12), opacity: 1, ease: 'easeInCubic' },
    { t: r3(dur), [axis]: r3(to), opacity: 0, ease: 'easeInCubic' },
  ]),
  // a keyed entrance, so a beat can open on choreography instead of on a preset name.
  enter: ({ dur = 0.9, from = 40, axis = 'y' }) => ([
    { t: 0, [axis]: r3(from), opacity: 0 },
    { t: r3(dur * 0.62), [axis]: r3(-from * 0.06), opacity: 1, ease: 'easeOutCubic' },
    { t: r3(dur), [axis]: 0, ease: 'easeOutCubic' },
  ]),
};

// Welding a rider to a subject's track is how higgsfield keeps six layers on one pan. The offset is a
// TIME shift, not a copy with different numbers: the rider is late, it is not doing something else.
const shift = (keys, by) => keys.map((k) => ({ ...k, t: r3(k.t + by) }));

const argv = process.argv.slice(2);
const shape = argv[0];
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const num = (n, d) => { const v = flag(n, null); return v == null ? d : Number(v); };

if (!shape || !SHAPES[shape]) {
  console.error(`usage: node scripts/author/track.mjs <${Object.keys(SHAPES).join('|')}> [flags]

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
