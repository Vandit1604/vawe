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
import { frameTile, tileGrid } from './tile.mjs';

const args = process.argv.slice(2);
const at = (() => { const i = args.indexOf('--at'); return i >= 0 ? args[i + 1] : '3'; })();
const out = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : '/tmp/compare.png'; })();
const inputs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--at' && args[i - 1] !== '--out');
if (inputs.length < 2) { console.error('need ≥2 inputs. usage: compare.mjs a.json b.json [--at 3] [--out sheet.png]'); process.exit(2); }

const tmp = '/tmp/_cmp'; fs.mkdirSync(tmp, { recursive: true });
const TW = 620, TH = 349;
const tiles = [];

inputs.forEach((inp, i) => {
  let src = inp;
  if (inp.endsWith('.json')) {
    console.log(`  rendering ${inp} ...`);
    execFileSync('./bin/vawe', [inp], { stdio: 'inherit' });
    src = path.join('out', path.basename(inp).replace(/\.json$/, '.mp4'));
  }
  tiles.push(frameTile(src, at, path.join(tmp, `t${i}.png`), { tw: TW, th: TH }));
  console.log(`  tile ${i + 1}: ${path.basename(inp)}`);
});

// a row while they still fit side by side, a square-ish grid past that
const n = tiles.length;
tileGrid(tiles, { cols: n <= 3 ? n : Math.ceil(Math.sqrt(n)), tw: TW, th: TH, gap: 10, out });
console.log(`\n  sheet → ${out}  (tiles left→right${n > 3 ? ', then top→bottom' : ''}: ${inputs.map((i) => path.basename(i)).join(', ')})`);
console.log('  Read the sheet and pick the strongest variant.\n');
