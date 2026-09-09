// harness/dev/bar-probe.mjs: PROVE the continuous subject is actually drawn, by counting pixels.
//
// A film whose spine is one travelling mark can pass every static gate while that mark is invisible:
// under the 3D rig painting is by DEPTH, not by layer order, so a tilted 1440px capture happily paints
// in front of a bar that the JSON says is on top (docs/MISTAKES.md #252, and again #246). The eye
// misses it because the frame is busy and the hole is a fifth of a second.
//
// So: recolour the subject layers to a colour that appears nowhere else, render headless, and COUNT.
//
//   node harness/dev/bar-probe.mjs formats/scene/playhead.json --ids playhead,bar --at 0.5,2,3.2,3.4
//
// Headless (this tool) is for iterating. The shipped proof is counted off the ENCODED mp4, because
// that is the artifact that ships and h264 is one more thing between the bar and the viewer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openScene } from '../author/scene-page.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const file = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!file) { console.error('usage: bar-probe.mjs <scene.json> [--ids a,b] [--at 0.5,2,3.2]'); process.exit(1); }

const IDS = flag('--ids', 'playhead,bar').split(',').map((s) => s.trim()).filter(Boolean);
const TIMES = flag('--at', '0.5,2,3.2,3.4,6.3,9.5,12.5,15.5').split(',').map(Number);
const MARK = '#ff00ff';

// Paint the subjects, and strip their glow: a bloom is a box-shadow of the same hue and would be
// counted as the bar, which would turn "the bar is drawn" into "something near the bar is lit".
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let hit = 0;
(function paint(ls) {
  for (const l of ls || []) {
    if (IDS.includes(l.id)) { l.bg = MARK; delete l.glow; delete l.intensity; hit++; }
    if (l.children) paint(l.children);
  }
})(data.layers);
if (hit !== IDS.length) { console.error(`✗ asked for ${IDS.length} id(s), painted ${hit}, check --ids`); process.exit(1); }

const probeFile = path.join(path.dirname(file), `_probe-${path.basename(file)}`);
fs.writeFileSync(probeFile, JSON.stringify(data, null, 1));

const isMark = (r, g, b) => r > 150 && b > 150 && g < 90 && Math.abs(r - b) < 70;

// ffmpeg rather than a PNG library: it is already a hard dependency of every sheet tool here, and the
// shipped proof decodes the mp4 with exactly this call, so both counts come off the same decoder.
function countMark(png) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${png}`);
  const b = r.stdout; let n = 0;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  const W = +(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width', '-of', 'csv=p=0', png], { encoding: 'utf8' }).stdout.trim());
  for (let i = 0; i < b.length; i += 3) {
    if (!isMark(b[i], b[i + 1], b[i + 2])) continue;
    n++; const p = i / 3, x = p % W, y = (p - x) / W;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { n, box: n ? [x0, x1, y0, y1] : null };
}

const page = await openScene(probeFile);
const shot = path.join('/tmp', `_barprobe_${process.pid}.png`);
let zero = 0;
console.log(`  bar probe · ${path.basename(file)} · subjects [${IDS.join(', ')}] painted ${MARK}`);
for (const t of TIMES) {
  await page.grab(t, shot);
  const { n, box } = countMark(shot);
  if (!n) zero++;
  const geo = box ? `x ${box[0]}–${box[1]} (w ${box[1] - box[0] + 1})  y ${box[2]}–${box[3]} (h ${box[3] - box[2] + 1})` : '← NOT DRAWN';
  console.log(`    ${t.toFixed(2).padStart(6)}s  ${String(n).padStart(7)} px  ${geo}`);
}
await page.close();
fs.rmSync(probeFile, { force: true }); fs.rmSync(shot, { force: true });
if (zero) { console.error(`\n✗ the subject is missing from ${zero}/${TIMES.length} sampled frame(s).`); process.exit(1); }
console.log(`\n✓ the subject is drawn at all ${TIMES.length} sampled times.`);
