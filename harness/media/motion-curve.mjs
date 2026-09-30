#!/usr/bin/env node
// Frame-to-frame motion of a render against a reference or against its own last render.
//   node harness/media/motion-curve.mjs <ours.mp4> [<ref.mp4>]   per-frame change table and the findings
// Frame numbers are frames of ours at FPS. Magnitude is the mean absolute pixel change (0 to 255) of a
// 240x136 gray frame against the frame before it.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export const FPS = 30;
const W = 240, H = 136;
const STILL = 0.05;        // below this the picture did not move
const MOVING = 1;          // above this it clearly moved
const CUT = 20;            // a jump this big is a cut, not a move
const EARLY_RUN = 6;       // frames of stillness while the reference still moves
const FREEZE_MAX = 8;      // a freeze longer than this is a hold, not a glitch
const CHANGED_SSIM = 0.985;

/** Mean absolute change between consecutive frames: item i is frame i+1 against frame i. */
export function frameMotion(video) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`motion-curve: ffmpeg cannot read ${video}: ${String(r.stderr || '').trim()}`);
  const buf = r.stdout, n = W * H, frames = Math.floor(buf.length / n), out = [];
  for (let f = 1; f < frames; f++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(buf[f * n + i] - buf[(f - 1) * n + i]);
    out.push(s / n);
  }
  return out;
}

/** Frames 1 to 3 that move hard while the reference is calm: the film starts with a jump. Pure. */
export function startJumps(a, b) {
  const out = [];
  for (let i = 0; i < Math.min(3, a.length); i++) {
    const ref = b[i] || 0;
    if (a[i] > 3 && a[i] > ref * 3 + 1) { out.push({ frame: i + 1, mag: a[i], ref }); break; }
  }
  return out;
}

/** Runs where ours is still for 6+ frames while the reference keeps moving. Pure. */
export function earlyStops(a, b) {
  const out = [];
  let start = null;
  for (let i = 0; i <= a.length; i++) {
    const on = i < a.length && a[i] < STILL && (b[i] || 0) > 0.5;
    if (on && start === null) start = i;
    if (!on && start !== null) {
      if (i - start >= EARLY_RUN) {
        const ref = b.slice(start, i).reduce((s, v) => s + v, 0) / (i - start);
        out.push({ frame: start + 1, frames: i - start, mag: ref });
      }
      start = null;
    }
  }
  return out;
}

/** One to eight still frames with motion on both sides. With a reference, skip freezes it has too. Pure. */
export function frozenInside(a, b = null) {
  const out = [];
  for (let i = 1; i < a.length; i++) {
    if (a[i] >= STILL || a[i - 1] <= MOVING || a[i - 1] > CUT) continue;
    let j = i;
    while (j < a.length && a[j] < STILL) j++;
    const len = j - i;
    if (j < a.length && len <= FREEZE_MAX && a[j] > MOVING && !(b && b.slice(i, j).some((v) => v < STILL))) {
      out.push({ frame: i + 1, frames: len, mag: a[i - 1] });
    }
    i = j;
  }
  return out;
}

/** Min SSIM per whole second between two videos, at 4 samples a second. -> [{ s, ssim }]. */
export function secondSsim(a, b) {
  const lavfi = `[0:v]fps=4,scale=${W}:${H},format=gray[a];[1:v]fps=4,scale=${W}:${H},format=gray[b];[a][b]ssim=stats_file=-`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', a, '-i', b, '-lavfi', lavfi, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`motion-curve: ffmpeg ssim failed: ${String(r.stderr || '').trim()}`);
  const seconds = [];
  r.stdout.split('\n').filter(Boolean).forEach((l, i) => {
    const s = Math.floor(i / 4);
    seconds[s] = Math.min(seconds[s] ?? 1, Number(/All:([\d.]+)/.exec(l)[1]));
  });
  return seconds.map((ssim, s) => ({ s, ssim }));
}

/**
 * Seconds that differ from the last render, in runs. The run with the lowest SSIM is taken as the edit
 * itself; every other run is a change the edit was not aimed at. Pure.
 * -> { edit: {from, to, ssim} | null, collateral: [{from, to, ssim}] }
 */
export function collateralChange(seconds) {
  const runs = [];
  for (const { s, ssim } of seconds) {
    if (ssim >= CHANGED_SSIM) continue;
    const last = runs[runs.length - 1];
    if (last && last.to === s) { last.to = s + 1; last.ssim = Math.min(last.ssim, ssim); } else runs.push({ from: s, to: s + 1, ssim });
  }
  if (!runs.length) return { edit: null, collateral: [] };
  const edit = runs.reduce((m, r) => (r.ssim < m.ssim ? r : m));
  return { edit, collateral: runs.filter((r) => r !== edit) };
}

async function main() {
  const [oursPath, refPath] = process.argv.slice(2);
  if (!oursPath || ![oursPath, refPath].filter(Boolean).every((f) => fs.existsSync(f))) {
    console.error('usage: node harness/media/motion-curve.mjs <ours.mp4> [<ref.mp4>]');
    process.exit(2);
  }
  const a = frameMotion(oursPath), b = refPath ? frameMotion(refPath) : [];
  const show = (name, list) => list.forEach((x) => console.log(`${name} f${x.frame} ${x.frames ? `${x.frames} frame(s) ` : ''}magnitude ${x.mag.toFixed(2)}${x.ref != null ? ` (reference ${x.ref.toFixed(2)})` : ''}`));
  show('start-jump', startJumps(a, b));
  show('early-stop', earlyStops(a, b));
  show('frozen', frozenInside(a, refPath ? b : null));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(2); });
