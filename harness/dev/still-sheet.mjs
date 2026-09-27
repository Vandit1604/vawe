// harness/dev/still-sheet.mjs: a FULL-RESOLUTION still every RATE seconds (default 0.25s) across the
// whole render, tiled into a handful of labeled contact sheets. `make judge`'s own sheet.png is ONE
// frame per beat, downscaled to a thumbnail box (quality/gates/tile.mjs's tileBox) - built for craft
// review, not for reading a motion claim off. This is the other job: dense enough in TIME that a
// judge or `conform.mjs` can read a position/size/colour change frame-to-frame, and at native
// resolution so nothing is lost to the downscale (JUDGE.md: "motion claims from same-scale stills").
//
//   node harness/dev/still-sheet.mjs D=<film.json> [RATE=0.25]
//
// Reuses frameTile/tileGrid (quality/gates/tile.mjs), the one owner for "extract + label + composite a
// video frame" every other sheet in this repo already goes through. Chunked into groups of 6 so a
// sheet stays a readable size regardless of the film's length; an index lists every sheet's time range.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { frameTile, tileGrid, gradeable, renderOf, baseOf } from '../../quality/gates/tile.mjs';
import { writeReceipt } from '../lib/receipt.mjs';
import { scratch } from '../lib/scratch.mjs';

const PER_SHEET = 6;

function readArg(key) {
  const pref = `${key}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : process.env[key];
}

function ffprobe(args) {
  return execFileSync('ffprobe', args).toString().trim();
}

export function stillSheet(filmArg, rate = 0.25) {
  const filmPath = path.resolve(filmArg);
  if (!fs.existsSync(filmPath)) throw new Error(`no such film: ${filmArg}`);
  const mp4 = renderOf(filmPath);
  const ready = gradeable(filmPath, mp4);
  if (!ready.ok) throw new Error(`${ready.why}. fix: ${ready.fix}`);

  const dur = parseFloat(ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]));
  const [w, h] = ffprobe(['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4])
    .split(',').map(Number);
  const landscape = w >= h;
  const cols = landscape ? 2 : 3;

  const times = [];
  for (let t = 0; t < dur; t += rate) times.push(Math.round(t * 1000) / 1000);

  const dir = scratch('still-sheet', baseOf(mp4));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const sheets = [];
  for (let i = 0; i < times.length; i += PER_SHEET) {
    const chunk = times.slice(i, i + PER_SHEET);
    const tiles = chunk.map((t, j) => frameTile(mp4, t, path.join(dir, `s${i}_f${j}.png`),
      { tw: w, th: h, label: `${t.toFixed(2)}s` }));
    const out = path.join(dir, `sheet_${String(i / PER_SHEET).padStart(2, '0')}.png`);
    tileGrid(tiles, { cols, tw: w, th: h, out });
    for (const t of tiles) fs.rmSync(t, { force: true });
    sheets.push({ path: out, t0: chunk[0], t1: chunk[chunk.length - 1] });
  }

  const indexPath = path.join(dir, 'index.md');
  const lines = [`# still sheet: ${path.basename(mp4)}`, '',
    `${times.length} full-res still(s) at ${rate}s intervals over ${dur.toFixed(1)}s, in ${sheets.length} sheet(s) of up to ${PER_SHEET}.`,
    'Each grid tile is a SEPARATE frame, at native resolution, not the same frame moving: read a motion',
    'claim (a rise, a draw-on, a hold) off the sequence of tiles, or get the exact number from',
    '`node harness/dev/probe-frame.mjs`.', ''];
  for (const s of sheets) lines.push(`- ${path.relative(process.cwd(), s.path)}  (${s.t0.toFixed(2)}s - ${s.t1.toFixed(2)}s)`);
  fs.writeFileSync(indexPath, lines.join('\n') + '\n');

  writeReceipt('still-sheet', filmPath, { sheets: sheets.map((s) => s.path), index: indexPath, at: new Date().toISOString().slice(0, 10) });
  return { sheets, index: indexPath, dur, count: times.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const D = readArg('D') || process.argv.slice(2).find((a) => !a.includes('=') && !a.startsWith('--'));
  const RATE = parseFloat(readArg('RATE') || '0.25');
  if (!D) { console.error('usage: node harness/dev/still-sheet.mjs D=<film.json> [RATE=0.25]'); process.exit(2); }
  let result;
  try { result = stillSheet(D, RATE); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
  console.log(`\n  ${result.count} full-res still(s) over ${result.dur.toFixed(1)}s, in ${result.sheets.length} sheet(s):`);
  for (const s of result.sheets) console.log(`    ${s.path}  (${s.t0.toFixed(2)}s-${s.t1.toFixed(2)}s)`);
  console.log(`  index: ${result.index}\n`);
  process.exit(0);
}
