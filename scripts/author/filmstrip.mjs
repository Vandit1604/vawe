// filmstrip.mjs — SEE a whole video efficiently: extract frames and pack them into a few dense,
// timestamped contact sheets so the entire piece fits in a small token budget (vs. reading 2000+ raw
// frames one by one, which is ~millions of tokens and mostly duplicate hold frames).
//
//   make filmstrip VIDEO=twitter.mp4                 # whole video, 2 fps, ~8-wide sheets
//   make filmstrip VIDEO=ref.mp4 FPS=4 COLS=10       # denser (catches faster beats)
//   make filmstrip VIDEO=ref.mp4 DEDUP=1             # drop near-identical holds (scene-change keyframes)
//   make filmstrip VIDEO=ref.mp4 FROM=6 TO=9 FPS=12  # a window at high fps (enter/exit detail)
//
// Two sampling modes:
//   • uniform (default): every 1/FPS s — full, even coverage of the whole timeline.
//   • DEDUP=1: only frames where the picture CHANGES (ffmpeg scene score) + one per ~1s so long holds
//     still show — fewer tiles, each meaningful (the whole story in the fewest images).
// Each tile is timestamp-labelled. Prints how many sheets + a rough token estimate so the cost is known.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = (k, d) => (process.env[k] != null && process.env[k] !== '' ? process.env[k] : d);
const VIDEO = env('VIDEO', process.argv[2]);
if (!VIDEO || !fs.existsSync(VIDEO)) { console.error('usage: make filmstrip VIDEO=<file> [FPS=2] [COLS=8] [DEDUP=1] [FROM= TO=]'); process.exit(2); }
const FPS = +env('FPS', '2');
const COLS = +env('COLS', '8');
const PER_SHEET = +env('PER_SHEET', '80');          // tiles per sheet (keeps each sheet readable)
const TILEW = +env('TILEW', '240');
const DEDUP = env('DEDUP', '') === '1';
const FROM = env('FROM', null), TO = env('TO', null);

const dims = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', VIDEO], { encoding: 'utf8' }).stdout.trim().split(',');
const TILEH = Math.round((TILEW * (+dims[1] || 720)) / (+dims[0] || 1280) / 2) * 2;

const out = path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : '/tmp', 'filmstrip');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const frames = path.join(out, 'f'); fs.mkdirSync(frames, { recursive: true });

// select filter: dedup = scene-change OR ~1/s heartbeat; uniform = fixed fps.
const clip = FROM != null && TO != null ? ['-ss', String(FROM), '-t', String(+TO - +FROM)] : [];
const label = FROM != null ? `%{eif\\:${FROM}+t\\:f\\:2}s` : `%{pts\\:hms}`;
const vf = DEDUP
  ? `select='gt(scene,0.18)+not(mod(n,${Math.round((+dims[0] ? 30 : 30))}))',scale=${TILEW}:${TILEH},drawtext=text='${label}':x=3:y=3:fontsize=13:fontcolor=yellow:box=1:boxcolor=black@0.7`
  : `fps=${FPS},scale=${TILEW}:${TILEH},drawtext=text='${label}':x=3:y=3:fontsize=13:fontcolor=yellow:box=1:boxcolor=black@0.7`;
const ex = spawnSync('ffmpeg', ['-v', 'error', '-y', ...clip, '-i', VIDEO, '-vsync', 'vfr', '-vf', vf, path.join(frames, 'f%04d.png')]);
if (ex.status !== 0) { console.error('ffmpeg failed:', (ex.stderr || '').toString().slice(0, 300)); process.exit(1); }

const files = fs.readdirSync(frames).filter((f) => f.endsWith('.png')).sort();
if (!files.length) { console.error('no frames extracted'); process.exit(1); }

// tile into sheets of PER_SHEET, COLS wide
const sheets = [];
for (let i = 0; i < files.length; i += PER_SHEET) {
  const batch = files.slice(i, i + PER_SHEET);
  const rows = Math.ceil(batch.length / COLS);
  const sheet = path.join(out, `sheet-${String(sheets.length + 1).padStart(2, '0')}.png`);
  buildSheetTile(batch, frames, COLS, rows, sheet);
  sheets.push(sheet);
}

const estTokensPerSheet = 1200; // ~a 1900px-wide contact sheet
console.log(`\n  FILMSTRIP · ${VIDEO}${FROM != null ? ` [${FROM}-${TO}s]` : ''} · ${DEDUP ? 'dedup keyframes' : FPS + 'fps'} · ${files.length} frames → ${sheets.length} sheet(s)`);
for (const s of sheets) console.log(`    ${s}`);
console.log(`  ≈ ${(sheets.length * estTokensPerSheet / 1000).toFixed(0)}k tokens to read all sheets (vs ~${(files.length * 1.2).toFixed(0)}k reading each frame raw, ~${(2205 * 1.2 / 1000).toFixed(1)}M for every source frame).`);
console.log(`  Read the sheets in order. For transition detail, re-run with FROM/TO + FPS=12, or crop with make measure.\n`);

// tile a batch of frames into one sheet with ffmpeg's tile filter (concat demuxer feeds them in order)
function buildSheetTile(batch, dir, cols, rows, outPath) {
  const listFile = path.join(dir, 'list.txt');
  fs.writeFileSync(listFile, batch.map((f) => `file '${path.join(dir, f)}'\nduration 1`).join('\n') + `\nfile '${path.join(dir, batch[batch.length - 1])}'\n`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', `tile=${cols}x${rows}:margin=2:padding=2:color=0x101010`, '-frames:v', '1', outPath]);
  if (r.status !== 0) console.error('  tile warn:', (r.stderr || '').toString().slice(0, 160));
}
