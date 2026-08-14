// scripts/gates/seam-snap.mjs — SAMPLE THE SEAMS, NOT THE CENTERS.
//
// The another engine lesson (and our own docs/MISTAKES.md #138): the highest-value render bugs — a black
// flash on a transition, a morph that reads as a collision — live INSIDE the transition overlap, which
// every center-sampling gate steps right over. `make beats` samples beat midpoints; `make audit` judges
// the settled frame; `make probe` checks purity. None of them look at the 3-frame window where two beats
// cross. This gate does exactly that: for every authored transition boundary (cut · seam · sting · a
// beat's start cluster), it pulls the frames straddling the boundary out of the RENDERED mp4 and flags a
// luminance DIP that is present at the seam but not just outside it — the signature of a flash.
//
//   node scripts/gates/seam-snap.mjs formats/scene/<file>.json     ·     make seam-check D=<file>
//
// It reads the real rendered pixels (not renderFrame) because a seam is composited during the render
// (core/seams.js), so it only exists in the mp4 — which is the whole reason a DOM-signature gate can't
// see it. Requires out/<name>.mp4 (render first). Writes /tmp/seams/<name>.png so the eye gets the seams too.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { flattenLayers } from '../lib/layers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/gates/seam-snap.mjs <scene.json>'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');
const mp4 = path.join(ROOT, 'out', `${name}.mp4`);
if (!fs.existsSync(mp4)) { console.error(`✗ no rendered video at out/${name}.mp4 — render first (make video D=${dataArg})`); process.exit(2); }

// READ the rate from the file rather than assuming it. Finals now render at 60 and drafts at 30, and
// every use of `fps` below converts a TIME into a FRAME NUMBER — so an assumed 30 seeks to half the
// intended timestamp on a 60fps final and checks frames that have nothing to do with the seam. Silent,
// and it would have reported a clean seam by looking at the wrong side of it (docs/MISTAKES.md #205).
const probeFps = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
const fps = (() => {
  const m = /^(\d+)(?:\/(\d+))?/.exec(String(probeFps.stdout).trim());
  const v = m ? (+m[1] / (m[2] ? +m[2] : 1)) : 0;
  return v > 0 ? Math.round(v) : 30;
})();

// mean luminance of one frame, cheaply: scale the frame to 1×1 and read its single RGB pixel. That 1×1
// average IS the frame's mean colour; Rec.601 luma of it is the frame brightness in [0,1].
function lumaAt(frameIdx) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `select=eq(n\\,${frameIdx}),scale=1:1`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
  const b = r.stdout;
  if (!b || b.length < 3) return null;
  return (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]) / 255;
}

// total frame count
const probe = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
  '-show_entries', 'stream=nb_read_frames', '-of', 'default=nk=1:nw=1', mp4]);
const total = parseInt(String(probe.stdout).trim(), 10) || Math.round((data.duration || 10) * fps);

// ── collect transition boundaries (seconds) ──────────────────────────────────────────────────────
const flat = flattenLayers(data.layers);
const bounds = new Set();
for (const c of data.cuts || []) if (typeof c.t === 'number') bounds.add(c.t);
for (const s of data.seams || []) if (typeof s.t === 'number') bounds.add(s.t);
for (const s of data.stings || []) if (typeof s.t === 'number') bounds.add(s.t);
// beat starts: a cluster of layer-starts after a >1.2s gap is a beat boundary (its transition_in)
const starts = [...new Set(flat.filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
let last = -9; for (const t of starts) { if (t - last > 1.2 && t > 0.3) bounds.add(t); last = t; }
const seams = [...bounds].map((t) => Math.round(t * fps)).filter((n) => n > 2 && n < total - 2).sort((a, b) => a - b);

if (!seams.length) { console.log('✓ seam-snap: no transition boundaries to sample (single-beat scene)'); process.exit(0); }

// ── for each boundary, compare the seam window to the frames just outside it ──────────────────────
// A flash is a luminance dip PRESENT at the seam and ABSENT 6 frames to either side. Comparing to the
// local neighbours (not a global threshold) makes this theme-agnostic: an intentionally dark scene has
// dark neighbours too, so it never false-positives; only an anomalous dip at the crossing fires.
const findings = [];
const sheetFrames = [];
for (const nt of seams) {
  const before = lumaAt(Math.max(0, nt - 6));
  const after = lumaAt(Math.min(total - 1, nt + 6));
  const win = [];
  for (let d = -2; d <= 2; d++) { const f = nt + d; const l = lumaAt(f); if (l != null) win.push({ f, l }); }
  sheetFrames.push(nt);
  if (before == null || after == null || !win.length) continue;
  const outside = Math.min(before, after);
  const dip = win.reduce((m, w) => (w.l < m.l ? w : m), win[0]);
  // flag if the darkest seam frame falls to <55% of the darker neighbour AND the neighbours weren't
  // already near-black (so a genuinely dark passage never trips it). 0.06 ≈ a near-black floor.
  if (outside > 0.06 && dip.l < outside * 0.55) {
    findings.push({ t: (nt / fps).toFixed(2), frame: dip.f, dip: dip.l.toFixed(3), outside: outside.toFixed(3) });
  }
}

// ── contact sheet at the seams (the eye is the backstop the numbers can't be) ─────────────────────
// per scene, so two authors running at once cannot read each other's seams (same reason as beats.mjs)
const SLUG = path.basename(dataArg, '.json');
const SHEET = `/tmp/seams/${SLUG}.png`;
const tmp = `/tmp/seams/${SLUG}.frames`; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const tiles = [];
for (const nt of sheetFrames) {
  const raw = path.join(tmp, `s${nt}.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${nt}),scale=300:-1`, '-frames:v', '1', raw]);
  if (!fs.existsSync(raw)) continue;
  const lab = path.join(tmp, `s${nt}_l.png`);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
    `drawtext=text='seam ${(nt / fps).toFixed(1)}s':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65`, lab]);
  tiles.push(lab);
}
if (tiles.length) {
  spawnSync('ffmpeg', ['-v', 'error', '-y', ...tiles.flatMap((t) => ['-i', t]),
    '-filter_complex', `hstack=inputs=${tiles.length}`, '-frames:v', '1', SHEET]);
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`  seam-snap · ${seams.length} transition boundary(ies) sampled · sheet → ${SHEET}`);
if (!findings.length) { console.log(`✓ seam-snap clean — no luminance flash at any transition (read ${SHEET} to confirm the eye agrees)`); process.exit(0); }
for (const f of findings) console.error(`  ✗ flash at ${f.t}s (frame ${f.frame}): luma dips to ${f.dip} vs ${f.outside} just outside — a black/dark flash in the transition overlap (docs/MISTAKES.md #138).`);
console.error(`\n✗ seam-snap: ${findings.length} transition flash(es). The center-sampling gates cannot see these — fix the seam compositing or the clip timing, then re-render.`);
process.exit(1);
