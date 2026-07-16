// scripts/compare.mjs — VARIANT SELECTION. Render/extract a frame from each candidate and tile them
// into one labeled sheet so the author (human or agent) can pick the best. This is how taste gets
// applied without shipping the first draft — another engine' `compare`, adapted.
//
// Usage:
//   node scripts/compare.mjs a.json b.json c.json --at 3 --out /tmp/compare.png
//   node scripts/compare.mjs out/a.mp4 out/b.mp4 --at 5
// Inputs may be .json (rendered first), .mp4, or .png. Prints the tile→label map; open the sheet.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const at = (() => { const i = args.indexOf('--at'); return i >= 0 ? args[i + 1] : '3'; })();
const out = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : '/tmp/compare.png'; })();
const inputs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--at' && args[i - 1] !== '--out');
if (inputs.length < 2) { console.error('need ≥2 inputs. usage: compare.mjs a.json b.json [--at 3] [--out sheet.png]'); process.exit(2); }

const tmp = '/tmp/_cmp'; fs.mkdirSync(tmp, { recursive: true });
const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });
const tiles = [];

inputs.forEach((inp, i) => {
  let src = inp;
  if (inp.endsWith('.json')) {
    console.log(`  rendering ${inp} ...`);
    execFileSync('./bin/vawe', [inp], { stdio: 'inherit' });
    src = path.join('engine/out', path.basename(inp).replace(/\.json$/, '.mp4'));
  }
  const tile = path.join(tmp, `t${i}.png`);
  if (src.endsWith('.png')) ff(['-y', '-i', src, '-vf', 'scale=620:349', tile]);
  else ff(['-y', '-ss', String(at), '-i', src, '-frames:v', '1', '-vf', 'scale=620:349', tile]);
  tiles.push(tile);
  console.log(`  tile ${i + 1}: ${path.basename(inp)}`);
});

// tile into a row (≤3) or a grid (xstack), on a light backdrop with a gap
const n = tiles.length;
const inArgs = tiles.flatMap((t) => ['-i', t]);
let filter;
if (n <= 3) {
  filter = tiles.map((_, i) => `[${i}:v]pad=640:389:10:20:white[p${i}]`).join(';') + ';' +
    tiles.map((_, i) => `[p${i}]`).join('') + `hstack=inputs=${n}`;
} else {
  const cols = Math.ceil(Math.sqrt(n));
  const lay = tiles.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 389}`).join('|');
  filter = tiles.map((_, i) => `[${i}:v]pad=640:389:10:20:white[p${i}]`).join(';') + ';' +
    tiles.map((_, i) => `[p${i}]`).join('') + `xstack=inputs=${n}:layout=${lay}:fill=white`;
}
ff(['-y', ...inArgs, '-filter_complex', filter, out]);
console.log(`\n  sheet → ${out}  (tiles left→right${n > 3 ? ', then top→bottom' : ''}: ${inputs.map((i) => path.basename(i)).join(', ')})`);
console.log('  Read the sheet and pick the strongest variant.\n');
