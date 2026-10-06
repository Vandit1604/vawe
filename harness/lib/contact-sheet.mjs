// The judge's contact sheet: one PNG grid of time-labelled tiles. The fresh judge builds the sheet of our
// film and the sheet of each reference film with this one function, so the two are laid out the same way.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sheetFps, TILE_W } from './sheet-tiles.mjs';

export const SHEET_COLS = 10;
const FONT = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf'].find(fs.existsSync);

/** The duration of a video in seconds; throws when ffprobe cannot read it. */
export function durationOf(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!(d > 0)) throw new Error(`cannot read the duration of ${file}`);
  return d;
}

/** Builds <dir>/sheet.png (or `name`) for a video of `dur` seconds: { file, fps }. Throws when ffmpeg fails. */
export function contactSheet(video, dur, dir, name = 'sheet.png') {
  const fps = sheetFps(dur);
  const rows = Math.ceil(dur * fps / SHEET_COLS);
  const label = `drawtext=${FONT ? `fontfile=${FONT}:` : ''}text='%{pts\\:flt}s':x=4:y=4:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7`;
  const out = path.join(dir, name);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-i', video, '-vf', `fps=${fps},scale=${TILE_W}:-2,${label},tile=${SHEET_COLS}x${rows}`, '-frames:v', '1', out], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`could not build the sheet: ${String(r.stderr).split('\n').slice(-4).join(' ')}`);
  return { file: out, fps };
}
