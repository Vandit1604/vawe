// beatsync.mjs — align a scene's cuts to the music's beat grid, so the edit lands ON the beat.
//
//   make beatsync D=formats/scene/x.json MUSIC=assets/music/warm.wav            # report: what it would snap
//   make beatsync D=formats/scene/x.json MUSIC=assets/music/warm.wav WRITE=1    # → x.beatsync.json
//   [GRID=beat|downbeat]  [SNAP=0.18]  [LAYERS=1]
//
// A cut that lands a few frames off the beat reads as sloppy; on the beat it reads as directed. This is
// the last mile the reference does that our default doesn't — the edit is cut TO the track. `make beatmap`
// already detects the grid (bpm + beats[] + downbeats[]); this snaps each structural edit time to the
// nearest beat within a tolerance, reports the drift, and (WRITE) writes the synced scene.
//
// What it snaps: data.cuts[].t · data.transitions[].at · data.seams[].t · data.stings[].t. With LAYERS=1
// it also snaps layer start times (the entrance hits the beat) — off by default because moving a start
// also moves that layer's content, which is a content decision, not a pure edit.
//
// Deterministic: the snap is a pure function of the scene + the (deterministic) beatmap. No Date/random.
// Idempotent: a synced scene re-syncs to itself (its edits already sit on grid points).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const has = (n) => argv.includes(n) || process.env[n.replace(/^--/, '').toUpperCase()] === '1';

const D = flag('--data') || flag('-d') || argv.find((a) => a.endsWith('.json'));
const MUSIC = flag('--music') || flag('-m');
if (!D || !fs.existsSync(D)) { console.error('usage: node scripts/media/beatsync.mjs <scene.json> --music <track.wav> [--grid beat|downbeat] [--snap 0.18] [--layers] [--write]'); process.exit(2); }
if (!MUSIC || !fs.existsSync(MUSIC)) { console.error(`✗ MUSIC track not found: ${MUSIC || '(none)'} — pass MUSIC=assets/music/<track>.wav`); process.exit(2); }
const GRID = (flag('--grid') || process.env.GRID || 'beat').toLowerCase();
const WRITE = has('--write') || process.env.WRITE === '1';
const SNAP_LAYERS = has('--layers') || process.env.LAYERS === '1';

// ---- beat grid: read the sidecar; generate it once if missing (make beatmap) --------------------
const beatsFile = MUSIC.replace(/\.(wav|mp3|m4a|aac)$/i, '.beats.json');
if (!fs.existsSync(beatsFile)) {
  process.stderr.write(`  no ${path.basename(beatsFile)} yet — running beatmap…\n`);
  const r = spawnSync('node', [path.join(ROOT, 'scripts/media/beatmap.mjs'), MUSIC], { stdio: 'inherit' });
  if (r.status !== 0 || !fs.existsSync(beatsFile)) { console.error('✗ beatmap failed — cannot sync'); process.exit(1); }
}
const bm = JSON.parse(fs.readFileSync(beatsFile, 'utf8'));
const data = JSON.parse(fs.readFileSync(D, 'utf8'));
let grid = (GRID === 'downbeat' ? bm.downbeats : bm.beats) || [];
if (!grid.length) { console.error(`✗ beatmap has no ${GRID}s (an ambient pad has no beat) — nothing to snap to`); process.exit(1); }
const beatInt = 60 / (bm.bpm || 120);

// A short bed LOOPS to fill the film (the Go mixer repeats music.wav), but the beatmap only covers the
// track file — so beats past the loop length don't exist and later cuts had nothing to snap to. Unroll
// the grid across the scene: a seamless bed keeps its beat phase, so beat b recurs at b + k·period.
let sceneDur = data.duration || 0;
if (!sceneDur) for (const L of data.layers || []) sceneDur = Math.max(sceneDur, (L.start ?? 0) + (L.duration ?? 2));
const period = bm.seconds || 0;
let unrolled = 0;
if (period > 0.5 && sceneDur > period + 0.1) {
  const base = grid.slice();
  for (let k = 1; k * period < sceneDur; k++) for (const b of base) { const t = +(b + k * period).toFixed(4); if (t <= sceneDur) { grid.push(t); unrolled++; } }
  grid.sort((a, b) => a - b);
}
// default tolerance = half a beat, capped so a snap never drags an edit implausibly far
const TOL = +(flag('--snap') || process.env.SNAP || Math.min(0.18, beatInt * 0.5));

const snap = (t) => {
  let best = null, bd = Infinity;
  for (const b of grid) { const d = Math.abs(b - t); if (d < bd) { bd = d; best = b; } }
  return bd <= TOL ? { to: +best.toFixed(3), drift: +bd.toFixed(3) } : null;
};

const moves = [];
// each edit kind: [array, key, label]
const kinds = [
  [data.cuts, 't', 'cut'],
  [data.transitions, 'at', 'transition'],
  [data.seams, 't', 'seam'],
  [data.stings, 't', 'sting'],
];
for (const [arr, key, label] of kinds) {
  if (!Array.isArray(arr)) continue;
  for (const e of arr) {
    const t = e[key] ?? e.t ?? e.at;
    if (typeof t !== 'number') continue;
    const s = snap(t);
    if (s && s.drift > 0.0005) { moves.push({ label, from: +t.toFixed(3), to: s.to, drift: s.drift }); e[key] = s.to; }
    else if (s) moves.push({ label, from: +t.toFixed(3), to: s.to, drift: 0, onbeat: true });
  }
}
if (SNAP_LAYERS && Array.isArray(data.layers)) {
  for (const L of data.layers) {
    if (L.track === 0 || typeof L.start !== 'number') continue;
    const s = snap(L.start);
    if (s && s.drift > 0.0005) { moves.push({ label: 'layer', from: +L.start.toFixed(3), to: s.to, drift: s.drift }); L.start = s.to; }
  }
}

const snapped = moves.filter((m) => !m.onbeat && m.drift > 0.0005);
const already = moves.filter((m) => m.onbeat);
console.log(`\n  beatsync · ${path.basename(D)}  ×  ${bm.track} (${bm.bpm.toFixed(1)} BPM, ${GRID} grid, conf ${bm.confidence.toFixed(2)})`);
if (unrolled) console.log(`  bed loops every ${period}s → unrolled the grid across ${sceneDur.toFixed(1)}s (+${unrolled} beats) so later cuts can snap`);
console.log(`  tolerance ${TOL.toFixed(3)}s (half-beat ${(beatInt / 2).toFixed(3)}s) · ${snapped.length} edit(s) moved onto the beat · ${already.length} already on-beat`);
for (const m of snapped) console.log(`    ${m.label.padEnd(11)} ${m.from.toFixed(3)}s → ${m.to.toFixed(3)}s  (${(m.drift * 1000).toFixed(0)}ms)`);
const offgrid = [];
for (const [arr, key] of kinds) if (Array.isArray(arr)) for (const e of arr) { const t = e[key]; if (typeof t === 'number' && !snap(t)) offgrid.push(+t.toFixed(3)); }
if (offgrid.length) console.log(`  ${offgrid.length} edit(s) left as-is (nearest beat > ${TOL.toFixed(2)}s away — off-grid on purpose, or the wrong track): ${offgrid.join(', ')}`);

if (WRITE) {
  const out = D.replace(/\.json$/, '.beatsync.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n  ✓ synced scene → ${out}   (render it; the cuts now land on ${bm.track}'s ${GRID}s)\n`);
} else {
  console.log('\n  report only. Re-run with WRITE=1 to write <scene>.beatsync.json (then set audio.music to this track).\n');
}
