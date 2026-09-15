// harness/author/scrub.mjs: the PREVIEW LOOP. Extract N frames evenly across a rendered video into one
// contact sheet, so the author (or agent) sees the WHOLE film at a glance and can spot dead/weak
// beats without scrubbing a timeline. This automates what would otherwise be a manual timeline scrub.
//
// Usage: node harness/author/scrub.mjs <mp4> [--n 24] [--cols 6] [--out /tmp/scrub.png]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const mp4 = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
if (!mp4) { console.error('usage: node harness/author/scrub.mjs <mp4> [--n 24] [--cols 6] [--out sheet.png]'); process.exit(2); }
const n = parseInt(arg('--n', '24'), 10);
const cols = parseInt(arg('--cols', '6'), 10);
const out = arg('--out', '/tmp/scrub.png');

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]).toString().trim());
const tmp = '/tmp/_scrub'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });

const tiles = [];
for (let i = 0; i < n; i++) {
  const t = (dur * (i + 0.5)) / n;
  const tile = path.join(tmp, `f${String(i).padStart(2, '0')}.png`);
  ff(['-y', '-ss', t.toFixed(2), '-i', mp4, '-frames:v', '1', '-vf', 'scale=380:214', tile]);
  tiles.push(tile);
}
const rows = Math.ceil(n / cols);
const inArgs = tiles.flatMap((t) => ['-i', t]);
const lay = tiles.map((_, i) => `${(i % cols) * 384}_${Math.floor(i / cols) * 218}`).join('|');
const filter = tiles.map((_, i) => `[${i}:v]pad=384:218:2:2:white[p${i}]`).join(';') + ';' +
  tiles.map((_, i) => `[p${i}]`).join('') + `xstack=inputs=${n}:layout=${lay}:fill=white`;
ff(['-y', ...inArgs, '-filter_complex', filter, out]);
console.log(`  scrub sheet → ${out}  (${n} frames · ${cols}×${rows} · ${dur.toFixed(1)}s film)`);
console.log('  Read it: every beat visible at once. Any dead/weak/empty tile = a beat to fix.');
