// scripts/gates/flicker-check.mjs — READ THE PIXELS THAT SHIPPED. Every other gate in this repo reads
// the scene JSON or the rendered DOM. This one reads the encoded mp4, because the defect it exists for
// lives downstream of both: under enough parallel render workers, raster falls behind the draw and a
// frame comes back with its most expensive region (large text) only partly painted. The DOM for that
// frame is correct, `make probe` passes, `make audit` passes, `seam-check` passes, and the film ships
// with words blinking out. A user found it by eye; nothing in the ladder could see it.
//
// What a corrupt frame looks like, and therefore what this measures: ink present, then gone for ONE
// frame, then back. Real motion does not do that. A cut does not do that (both sides carry ink, and a
// cut is many frames wide). Only a dropped paint does.
//
// KNOW ITS LIMIT, IT IS NOT IN THE LADDER. This measures a one-frame dip in ink or light, and some
// films legitimately do that: a flash sting, a shape crossing, a hard reveal. Swept over the library it
// flagged 39 films, and the first one checked (showcase-aspect) produced the SAME five frames at 4
// workers as at 8, which proves those five are content and not corruption. So it is a DIAGNOSTIC you
// point at a film you already suspect, and the way to confirm a hit is real is to re-render at fewer
// workers and see whether it moves. A blocking gate that cries wolf on a third of the library would
// teach everyone to skip it, which is worse than not having one.
//
//   node scripts/gates/flicker-check.mjs <scene.json|name> [--strict]
//   make flicker-check D=formats/scene/<name>.json
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = process.argv[2];
const strict = process.argv.includes('--strict');
if (!arg) { console.error('usage: node scripts/gates/flicker-check.mjs <scene.json|name> [--strict]'); process.exit(2); }

const name = path.basename(arg).replace(/\.json$/, '');
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);
if (!fs.existsSync(mp4)) {
  console.error(`  ✗ no render at out/${name}.mp4 — this gate reads the encoded video, so render first.`);
  process.exit(2);
}

// The rate comes from the FILE, not from a constant. Finals render at 60 and drafts at 30, so a fixed
// divisor here would report every timestamp at double or half its real value and send whoever reads the
// finding to the wrong second of the film (docs/MISTAKES.md #205).
const FPS_IN = (() => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
      'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
    const m = /^(\d+)(?:\/(\d+))?/.exec(out.trim());
    const v = m ? (+m[1] / (m[2] ? +m[2] : 1)) : 0;
    return v > 0 ? Math.round(v) : 30;
  } catch { return 30; }
})();

// Downscale hard: a dropped paint removes a whole REGION, so it survives any reasonable downsample, and
// working at 160x90 keeps a 20s film to a few megabytes of greyscale instead of gigabytes.
const W = 160, H = 90, FRAME = W * H;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `scale=${W}:${H},format=gray`,
  '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
const n = Math.floor(raw.length / FRAME);
if (n < 5) { console.error(`  ✗ ${name}: only ${n} frame(s) decoded`); process.exit(2); }

// "Ink" is any pixel darker than mid-grey. Scenes here are light-on-dark or dark-on-light, so measure
// BOTH and use whichever channel is livelier: a dark film loses light pixels when a paint drops.
const dark = [], light = [];
for (let i = 0; i < n; i++) {
  let d = 0, l = 0;
  for (let p = i * FRAME; p < (i + 1) * FRAME; p++) { if (raw[p] < 110) d++; else if (raw[p] > 200) l++; }
  dark.push(d); light.push(l);
}
const spread = (a) => Math.max(...a) - Math.min(...a);
const series = spread(dark) >= spread(light) ? dark : light;
const polarity = series === dark ? 'ink' : 'light';

// A dropout: one frame sits far below BOTH neighbours. The bar is set against the film's own typical
// frame-to-frame change, NOT its total range: the first version of this scaled off the range, a film
// whose beats swing between light and dark backgrounds has an enormous range, and the bar landed above
// the defect it was written to catch. A dropped paint is a spike against LOCAL motion.
const diffs = [];
for (let i = 1; i < n; i++) diffs.push(Math.abs(series[i] - series[i - 1]));
diffs.sort((a, b) => a - b);
const med = diffs[Math.floor(diffs.length / 2)] || 1;
const FLOOR = Math.max(40, med * 8);
const hits = [];
for (let i = 1; i < n - 1; i++) {
  const drop = Math.min(series[i - 1], series[i + 1]) - series[i];
  if (drop > FLOOR) hits.push({ f: i, t: i / FPS_IN, drop });
}

console.log(`\n  flicker check · ${name}.mp4 · ${n} frames · measuring ${polarity} (typical frame-to-frame change ${med})`);
if (!hits.length) {
  console.log('  ✓ no single-frame dropouts — every frame carries what its neighbours carry.\n');
  process.exit(0);
}
console.log(`  ${hits.length} frame(s) lose content their neighbours both have:`);
for (const h of hits.slice(0, 12)) console.log(`    ✗ f${h.f} @${h.t.toFixed(2)}s — ${polarity} falls by ${h.drop} vs both sides`);
if (hits.length > 12) console.log(`    … and ${hits.length - 12} more`);
console.log('\n  A frame that drops content its neighbours both carry is a DROPPED PAINT, not motion. The known');
console.log('  cause is too many parallel capture workers starving raster: re-render with fewer');
console.log('  (`./bin/vawe --workers 4 …`) and see whether it clears. docs/MISTAKES.md #190.\n');
process.exit(strict ? 1 : 1);
