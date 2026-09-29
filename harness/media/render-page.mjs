// harness/media/render-page.mjs: render a bare HTML page (seeked CSS/Web Animations motion) to an
// mp4, with an optional N-subframe motion blur blended into each output frame.
//
//   node harness/media/render-page.mjs <page.html> <out.mp4> [--fps 30] [--from s] [--dur s | --to s] [--blur N] [--w 960] [--h 540] [--final]
//
// Default is a DRAFT: 960x540, no blur, and --from/--to windows the render to one slice instead of the
// whole page. --final renders the way `make ship` does: full size (1920x1080 unless overridden), the
// whole page from 0, blur up to 3.
//
// Capture is split across up to CAPTURE_WORKERS pages on the shared browser (harness/media/
// preview-server.mjs), each seeking+screenshotting a contiguous slice of output frames; every subframe
// is a pure function of its seek time, so which worker captures it never affects the pixels. When
// blur > 1, a per-frame speed pass (no screenshots, just paused-animation bounding-box deltas) decides
// how many subframes that frame actually needs: a still frame gets 1, a fast one gets up to `blur`.
// This is bucketed to 3 levels (1, half, full) and run-length-encoded before capture, both so a real
// render stays close to its old subframe count in the common case and so the ffmpeg filter graph below
// (one trim+tmix+select+concat chain per motion-regime segment, still ONE ffmpeg process) never grows
// past a few dozen segments; a pathological frame-by-frame alternation collapses back to a uniform
// max-blur capture (`clampSegments`) rather than building an unbounded graph.
//
// Replaces the scratchpad csskit prototype (render.mjs --blur), which wrote a 0-byte mp4 and exited
// silently under load: it spawned ONE ffmpeg process PER FRAME to blend that frame's subframes
// (spawnSync, exit code never checked, stderr never read) and wrote straight to the final output path,
// so a render killed mid-way left a corrupt or empty file behind with nothing on screen saying why.
// This instead: writes every subframe to one directory, blends+encodes in ONE ffmpeg pass, checks its
// exit code and prints its stderr on failure, and only renames the encode into place once ffmpeg
// succeeds (`writeJsonAtomic`'s same write-then-rename discipline, harness/media/see.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RENDER_ARGS } from '../lib/render-harness.mjs';
import { openPreview } from './preview-server.mjs';
import { referenceFor, motionStampFresh, pageAuthoring } from '../lib/motion-stamp.mjs';
import { isWaivedBy, hasReason } from '../lib/waivers.mjs';

// A run of ~150+ rapid seek+screenshot round trips crashed the GPU-accelerated headless renderer
// outright ("Execution context was destroyed", no page error, no console output) on this machine;
// the same run never crashed once GPU compositing was off. Only this tool adds it (`RENDER_ARGS` is
// shared by every other headless caller in the repo, none of which screenshots in this volume).
//
// `--disable-gpu-compositing`, NOT the broader `--disable-gpu`: the fix this comment names is GPU
// COMPOSITING (Chrome reusing a rasterised tile across rapid seeks, ENGINE-CHANGES.md's own "speed is a
// property you can lose without noticing"), and `--disable-gpu` also tears down the GPU process
// SwiftShader needs, so a bare page's `new THREE.WebGLRenderer(...)` (core/engine/page-api.js) failed
// outright ("Could not create a WebGL context") the moment a page tried to use one, with no scene ever
// having exercised this path before (a `three` scene layer boots via films/scene/scene.html, a
// different launch in preview-server.mjs's own shared daemon, never through here). Measured on this
// machine (harness/dev/_webgl-flags-scratch.mjs, since deleted): `--disable-gpu` fails WebGL context
// creation outright; `--disable-gpu-compositing` creates one same as no GPU flag at all. Narrowing to
// the flag the comment above actually describes fixes both: the crash stays fixed, WebGL starts working.
const PAGE_ARGS = [...RENDER_ARGS, '--disable-gpu-compositing'];

// ponytail: fixed bound rather than a profiled-per-machine number; raise if a faster capture is
// measured to need it.
const CAPTURE_WORKERS = Math.min(4, Math.max(2, os.cpus().length >= 4 ? 4 : 2));

const die = (msg, code = 1) => { console.error(`✗ ${msg}`); process.exit(code); };

// Same adapter interface core/timeline/clips.js's seekAll owns for a scene-module page, by hand for a
// bare authored page: seek every CSS/WAAPI/SMIL animation to `ms`, then call every `vawe.onFrame(fn)`
// hook (core/engine/page-api.js) with film time in SECONDS, awaited, so a hook that decodes a
// texture or builds three.js geometry lazily settles before the screenshot below fires.
async function seekAll(page, ms) {
  await page.evaluate(async (t) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
    document.querySelectorAll('svg').forEach((svg) => {
      if (typeof svg.pauseAnimations === 'function') { try { svg.pauseAnimations(); svg.setCurrentTime(t / 1000); } catch { /* best-effort */ } }
    });
    for (const fn of window.__vaweFrameHooks || []) await fn(t / 1000);
  }, ms);
}

// Per-output-frame displacement, no screenshots: paused-animation target bounding-box delta between
// consecutive frame times, summed across every animated element. A pure function of the page's own
// animation timing, so it is as deterministic as the capture itself.
async function frameSpeeds(page, frames, fps, from) {
  return page.evaluate((frameCount, fpsArg, fromArg) => {
    function seek(ms) { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }
    const speeds = [];
    let prev = null;
    for (let i = 0; i <= frameCount; i++) {
      seek(fromArg * 1000 + (i / fpsArg) * 1000);
      const boxes = document.getAnimations().map((a) => {
        const t = a.effect && a.effect.target;
        if (!t || !t.getBoundingClientRect) return null;
        const r = t.getBoundingClientRect();
        return { x: r.x, y: r.y };
      });
      if (prev) {
        let d = 0;
        for (let j = 0; j < boxes.length; j++) {
          if (boxes[j] && prev[j]) d += Math.hypot(boxes[j].x - prev[j].x, boxes[j].y - prev[j].y);
        }
        speeds.push(d);
      }
      prev = boxes;
    }
    return speeds;
  }, frames, fps, from);
}

// 3 levels only (still / half / full blur): keeps the ffmpeg filter graph's segment count bounded by
// the number of times the page's motion changes REGIME, not by frame count.
function bucketize(speeds, blur) {
  const mid = Math.max(1, Math.round(blur / 2));
  return speeds.map((s) => (s < 1 ? 1 : s < 6 ? mid : blur));
}

function clampSegments(kArr, cap = 200) {
  let segs = kArr.length ? 1 : 0;
  for (let i = 1; i < kArr.length; i++) if (kArr[i] !== kArr[i - 1]) segs++;
  if (segs <= cap) return kArr;
  const maxK = Math.max(1, ...kArr);
  return kArr.map(() => maxK);
}

async function captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, w, h, onSubframe) {
  const shardCount = Math.min(CAPTURE_WORKERS, Math.max(1, frames));
  const shardSize = Math.ceil(frames / shardCount);
  const shards = [];
  for (let s = 0; s < shardCount; s++) {
    const lo = s * shardSize, hi = Math.min(frames, lo + shardSize);
    if (lo < hi) shards.push([lo, hi]);
  }
  await Promise.all(shards.map(async ([lo, hi]) => {
    const { page, url, close } = await openPreview(pagePath, { width: w, height: h, args: PAGE_ARGS });
    try {
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (let i = lo; i < hi; i++) {
        const baseMs = from * 1000 + (i / fps) * 1000;
        const k = kArr[i];
        for (let j = 0; j < k; j++) {
          await seekAll(page, baseMs + (j / k) * (1000 / fps));
          const idx = subframeStart[i] + j;
          await page.screenshot({ path: path.join(tmpDir, `f${String(idx).padStart(6, '0')}.png`) });
          onSubframe();
        }
      }
    } finally { await close(); }
  }));
}

function ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut) {
  const seq = path.join(tmpDir, 'f%06d.png');
  const uniform = new Set(kArr).size <= 1;
  const blur = kArr[0] || 1;
  if (uniform) {
    const args = blur > 1
      ? ['-y', '-v', 'error', '-framerate', String(fps * blur), '-i', seq,
        '-vf', `tmix=frames=${blur}:weights='${Array(blur).fill('1').join(' ')}',`
          + `select='not(mod(n+1\\,${blur}))',setpts=N/${fps}/TB`,
        '-r', String(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', tmpOut]
      : ['-y', '-v', 'error', '-framerate', String(fps), '-i', seq,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', tmpOut];
    return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
  }

  const segments = [];
  let segStart = 0;
  for (let i = 1; i <= kArr.length; i++) {
    if (i === kArr.length || kArr[i] !== kArr[segStart]) { segments.push({ start: segStart, end: i, k: kArr[segStart] }); segStart = i; }
  }
  const filters = segments.map((seg, idx) => {
    const s = subframeStart[seg.start], e = subframeStart[seg.end];
    const label = `s${idx}`;
    if (seg.k === 1) return `[0:v]trim=start_frame=${s}:end_frame=${e},setpts=N/${fps}/TB[${label}]`;
    const weights = Array(seg.k).fill('1').join(' ');
    return `[0:v]trim=start_frame=${s}:end_frame=${e},tmix=frames=${seg.k}:weights='${weights}',`
      + `select='not(mod(n+1\\,${seg.k}))',setpts=N/${fps}/TB[${label}]`;
  });
  const joins = segments.map((_, idx) => `[s${idx}]`).join('');
  const filterComplex = `${filters.join(';')};${joins}concat=n=${segments.length}:v=1:a=0[outv]`;
  const args = ['-y', '-v', 'error', '-framerate', String(fps), '-i', seq,
    '-filter_complex', filterComplex, '-map', '[outv]',
    '-r', String(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', tmpOut];
  return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
}

/**
 * renderPage(pagePath, outPath, opts) -> { frames, subframes, captureMs, encodeMs, dur }.
 * opts: fps (30), w (960), h (540), blur (1, the MAX subframes blended per output frame; a still
 * frame always gets 1 regardless of this setting), from (0, seconds into the page's own timeline the
 * render starts at), durArg (seconds rendered from `from`; defaults to the page's own <meta
 * name="duration"> minus `from`), progress (false; prints a single overwriting capture-progress line).
 */
export async function renderPage(pagePath, outPath, opts = {}) {
  const { fps = 30, w = 960, h = 540, blur = 1, durArg = null, from = 0, progress = false } = opts;
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const { page, url, close } = await openPreview(pagePath, { width: w, height: h, args: PAGE_ARGS });
  const tmpDir = `${outPath}.frames-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const totalDur = await page.evaluate(() => {
      const m = document.querySelector('meta[name="duration"]');
      if (m) return Number(m.content);
      return Math.max(0, ...document.getAnimations().map((a) => (a.effect.getComputedTiming().endTime || 0) / 1000));
    });
    const dur = durArg != null ? durArg : Math.max(0, totalDur - from);
    if (!(dur > 0)) die(`${pagePath}: no duration (add <meta name="duration" content="<seconds>"> or pass --dur/--to)`);

    const frames = Math.round(dur * fps);
    if (!(frames > 0)) die(`${pagePath}: ${dur}s at ${fps}fps rounds to 0 frames`);

    const kArr = blur > 1 ? clampSegments(bucketize(await frameSpeeds(page, frames, fps, from), blur)) : Array(frames).fill(1);
    const subframeStart = new Array(frames + 1);
    subframeStart[0] = 0;
    for (let i = 0; i < frames; i++) subframeStart[i + 1] = subframeStart[i] + kArr[i];
    const totalSub = subframeStart[frames];

    const t0 = Date.now();
    let doneSub = 0;
    const tick = progress ? setInterval(() => {
      process.stdout.write(`\r  capturing ${doneSub}/${totalSub} subframe(s)...`);
    }, 1000) : null;
    await captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, w, h, () => { doneSub++; });
    if (tick) { clearInterval(tick); process.stdout.write(`\r${' '.repeat(40)}\r`); }
    const captureMs = Date.now() - t0;

    const tmpOut = `${outPath}.tmp-${process.pid}.mp4`;
    const t1 = Date.now();
    const res = ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut);
    const encodeMs = Date.now() - t1;
    if (res.status !== 0 || res.error) {
      fs.rmSync(tmpOut, { force: true });
      die(`ffmpeg encode failed (${res.error ? res.error.message : `exit ${res.status}`}):\n`
        + `${(res.stderr || '').trim().split('\n').slice(-15).join('\n')}`);
    }
    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      die(`ffmpeg reported success but wrote no bytes to ${tmpOut}; stderr:\n${(res.stderr || '').trim()}`);
    }
    fs.renameSync(tmpOut, outPath);
    return { frames, subframes: totalSub, captureMs, encodeMs, dur };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await close();
  }
}

// A page whose folder declares a reference (the recreation starter writes `reference.json`) refuses a
// FINAL render until the required-motion-match has passed for this page's CURRENT content (a stamp
// keyed on the page's own hash, harness/lib/motion-stamp.mjs: an edit invalidates the old pass). A
// bare page with no declared reference is untouched. The one way out is the existing `authoring.allow`
// + `_why` mechanism, read out of the page's own `#authoring` script tag, never a second waiver path.
export function assertFinalReady(pagePath) {
  const ref = referenceFor(pagePath);
  if (!ref) return;
  if (motionStampFresh(pagePath)) return;
  const { allow = [], _why = {} } = pageAuthoring(pagePath);
  const code = 'unverified-final';
  if (isWaivedBy(allow, code) && hasReason(_why, code)) return;
  die(`${pagePath}: FINAL render refused, no passing required-motion-match for this page's current `
    + `content. Run: make next PAGE=${pagePath} REF=${ref}\n`
    + `Waivable only via <script type="application/json" id="authoring">{"allow":["${code}"],`
    + `"_why":{"${code}":"…"}}</script> in the page.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  const [pagePath, outPath] = positional;
  if (!pagePath || !outPath) {
    die('usage: node harness/media/render-page.mjs <page.html> <out.mp4> [--fps 30] [--from s] [--dur s | --to s] '
      + '[--blur N] [--w 960] [--h 540] [--final]', 2);
  }
  const final = argv.includes('--final');
  if (final) assertFinalReady(pagePath);
  const from = final ? 0 : Number(flag('--from', 0));
  const toFlag = flag('--to', null);
  const durFlag = flag('--dur', null);
  const durArg = final ? null : (toFlag != null ? Number(toFlag) - from : (durFlag != null ? Number(durFlag) : null));
  const opts = {
    fps: Number(flag('--fps', 30)),
    w: Number(flag('--w', final ? 1920 : 960)), h: Number(flag('--h', final ? 1080 : 540)),
    blur: Number(flag('--blur', final ? 3 : 1)), from, durArg, progress: final,
  };
  const r = await renderPage(pagePath, outPath, opts);
  console.log(`✓ ${outPath}: ${r.frames} frame(s) at ${opts.fps}fps, ${opts.w}x${opts.h}, ${from}s-${(from + r.dur).toFixed(2)}s`
    + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}, `
    + `capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
