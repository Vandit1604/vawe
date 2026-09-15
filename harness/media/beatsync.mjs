// beatsync.mjs: align a scene's joints to the music's beat grid, at AUTHOR time.
//
//   make beatsync D=films/scene/x.json MUSIC=assets/music/warm.wav            # report: what would move
//   make beatsync D=films/scene/x.json MUSIC=assets/music/warm.wav WRITE=1    # → x.beatsync.json
//   [GRID=beat|downbeat]  [SNAP=0.12]  [LAYERS=1]
//
// THE SNAP ITSELF IS NOT HERE ANY MORE. `core/beats/index.js` owns which joints move and how far; this
// reads the grid, calls `snapJoints`, and reports. It used to answer the same question separately:
// its own nearest-beat search (so it never appeared as an importer of `snapToBeat` and nothing linked
// the two), its own tolerance (half a beat capped at 0.18s, against beat-bind's 0.12s), and its own
// joint set (transitions and stings as well as cuts and seams). Two owners of one fact, drifting
// quietly, engine-doctrine/MISTAKES.md #477.
//
// A scene that will be beat-matched EVERY render should declare it instead and skip the derivative
// entirely: `"audio": { "music": "warm", "beatSync": true }`. This tool is the preview, and the
// escape hatch for a film that wants the snapped times written down where a human can edit them.
//
// Deterministic: the snap is a pure function of the scene + the (deterministic) beatmap.
// Idempotent: a synced scene re-syncs to itself (its joints already sit on grid points).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { snapToBeat } from '../../core/beats/detect.js';
import { unrollGrid, snapJoints, DEFAULT_MAX_SHIFT } from '../../core/beats/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const has = (n) => argv.includes(n) || process.env[n.replace(/^--/, '').toUpperCase()] === '1';

const D = flag('--data') || flag('-d') || argv.find((a) => a.endsWith('.json'));
const MUSIC = flag('--music') || flag('-m');
if (!D || !fs.existsSync(D)) { console.error('usage: node harness/media/beatsync.mjs <scene.json> --music <track.wav> [--grid beat|downbeat] [--snap 0.12] [--layers] [--write]'); process.exit(2); }
if (!MUSIC || !fs.existsSync(MUSIC)) { console.error(`✗ MUSIC track not found: ${MUSIC || '(none)'}, pass MUSIC=assets/music/<track>.wav`); process.exit(2); }
const GRID = (flag('--grid') || process.env.GRID || 'beat').toLowerCase();
const WRITE = has('--write') || process.env.WRITE === '1';
const SNAP_LAYERS = has('--layers') || process.env.LAYERS === '1';

// ---- beat grid: read the sidecar; generate it once if missing (make beatmap) --------------------
const beatsFile = MUSIC.replace(/\.(wav|mp3|m4a|aac)$/i, '.beats.json');
if (!fs.existsSync(beatsFile)) {
  process.stderr.write(`  no ${path.basename(beatsFile)} yet, running beatmap…\n`);
  const r = spawnSync('node', [path.join(ROOT, 'harness/media/beatmap.mjs'), MUSIC], { stdio: 'inherit' });
  if (r.status !== 0 || !fs.existsSync(beatsFile)) { console.error('✗ beatmap failed, cannot sync'); process.exit(1); }
}
const bm = JSON.parse(fs.readFileSync(beatsFile, 'utf8'));
const pulse = (GRID === 'downbeat' ? bm.downbeats : bm.beats) || [];
if (!pulse.length) { console.error(`✗ beatmap has no ${GRID}s (an ambient pad has no beat). Nothing to snap to`); process.exit(1); }

// LOWER FIRST, for the same reason core/engine/boot.js binds after the lowering pass: a junction written as
// `transitions` is not a cut or a seam until then, so snapping its `at` would snap a seam by its start
// where the engine snaps it by its centre. This is why the CLI no longer knows the word `transitions`.
const data = loadScene(JSON.parse(fs.readFileSync(D, 'utf8')));
let sceneDur = data.duration || 0;
if (!sceneDur) for (const L of data.layers || []) sceneDur = Math.max(sceneDur, (L.start ?? 0) + (L.duration ?? 2));
const grid = unrollGrid(pulse, bm.seconds || 0, sceneDur);
const unrolled = grid.length - pulse.length;

const TOL = Number(flag('--snap') || process.env.SNAP) || DEFAULT_MAX_SHIFT;
const { moved, held } = snapJoints(data, grid, TOL);

// LAYER STARTS are not junctions, so they are not part of the shared policy and stay here: moving a
// start moves that layer's CONTENT, which is a content decision, not an edit. Off by default.
const layersMoved = [];
if (SNAP_LAYERS && Array.isArray(data.layers)) {
  for (const L of data.layers) {
    if (L.track === 0 || typeof L.start !== 'number') continue;
    const to = snapToBeat(L.start, grid, TOL);
    if (to !== L.start) { layersMoved.push({ kind: 'layer', from: L.start, to, drift: +Math.abs(to - L.start).toFixed(3) }); L.start = to; }
  }
}

console.log(`\n  beatsync · ${path.basename(D)}  ×  ${bm.track} (${bm.bpm.toFixed(1)} BPM, ${GRID} grid, conf ${bm.confidence.toFixed(2)})`);
if (unrolled > 0) console.log(`  bed loops every ${bm.seconds}s → unrolled the grid across ${sceneDur.toFixed(1)}s (+${unrolled} beats) so later cuts can snap`);
console.log(`  tolerance ${TOL.toFixed(3)}s · ${moved.length} joint(s) moved onto the beat · ${held.length} left where the author put them`);
for (const m of moved.concat(layersMoved)) console.log(`    ${m.kind.padEnd(5)} ${m.from.toFixed(3)}s → ${m.to.toFixed(3)}s  (${(m.drift * 1000).toFixed(0)}ms)`);
if (held.length) console.log(`  held (already on-beat, further than ${TOL.toFixed(2)}s from any beat, or "snap": false): ${held.join(', ')}`);
console.log('  stings are never snapped: a sting is punctuation hung off a junction and an author offsets one on purpose.');

if (WRITE) {
  const out = D.replace(/\.json$/, '.beatsync.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n  ✓ synced scene → ${out}   (render it; the joints now land on ${bm.track}'s ${GRID}s)`);
  console.log('    Two files now hold one film and nothing keeps their times equal. If this scene is')
  console.log(`    beat-matched every render, delete the derivative and declare it instead:`);
  console.log(`      "audio": { "music": ${JSON.stringify(path.basename(MUSIC).replace(/\.wav$/i, ''))}, "beatSync": true }\n`);
} else {
  console.log('\n  report only. WRITE=1 writes <scene>.beatsync.json; `"audio":{"beatSync":true}` in the scene');
  console.log('  gets the same joints at boot with no second file. engine-doctrine/CRAFT/SOUND.md.\n');
}
