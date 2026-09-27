// harness/media/render-page.mjs: render a bare HTML page (seeked CSS/Web Animations motion) to an
// mp4, with an optional N-subframe motion blur blended into each output frame.
//
//   node harness/media/render-page.mjs <page.html> <out.mp4> [--fps 30] [--from s] [--dur s | --to s] [--blur N] [--w 960] [--h 540] [--final]
//
// Default is a DRAFT: 960x540, no blur, and --from/--to windows the render to one slice instead of the
// whole page (a 5s window at full size with blur measured ~57s; a windowed draft is the one that gets
// re-run every iteration, so it, not the final, owns the cheap defaults). --final renders the way `make
// ship` does: full size (1920x1080 unless overridden), the whole page from 0, blur=3.
//
// Replaces the scratchpad csskit prototype (render.mjs --blur), which wrote a 0-byte mp4 and exited
// silently under load: it spawned ONE ffmpeg process PER FRAME to blend that frame's subframes
// (spawnSync, exit code never checked, stderr never read) and wrote straight to the final output path,
// so a render killed mid-way (blur capture is slow: see the timing this file prints) left a corrupt or
// empty file behind with nothing on screen saying why. This instead: writes every subframe of the
// WHOLE render to one directory, blends+encodes in ONE ffmpeg pass over that image sequence (`tmix`
// averages each block of `blur` frames, `select` keeps only the block-final one), checks its exit code
// and prints its stderr on failure, and only renames the encode into place once ffmpeg succeeds
// (`writeJsonAtomic`'s same write-then-rename discipline, harness/media/see.mjs).
import fs from 'node:fs';
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
const PAGE_ARGS = [...RENDER_ARGS, '--disable-gpu'];

const die = (msg, code = 1) => { console.error(`✗ ${msg}`); process.exit(code); };

async function seekAll(page, ms) {
  await page.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, ms);
}

function ffmpegEncode(tmpDir, fps, blur, tmpOut) {
  const seq = path.join(tmpDir, 'f%06d.png');
  const args = blur > 1
    ? ['-y', '-v', 'error', '-framerate', String(fps * blur), '-i', seq,
      '-vf', `tmix=frames=${blur}:weights='${Array(blur).fill('1').join(' ')}',`
        + `select='not(mod(n+1\\,${blur}))',setpts=N/${fps}/TB`,
      '-r', String(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', tmpOut]
    : ['-y', '-v', 'error', '-framerate', String(fps), '-i', seq,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', tmpOut];
  return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
}

/**
 * renderPage(pagePath, outPath, opts) -> { frames, subframes, captureMs, encodeMs, dur }.
 * opts: fps (30), w (960), h (540), blur (1, subframes blended per output frame), from (0, seconds into
 * the page's own timeline the render starts at), durArg (seconds rendered from `from`; defaults to the
 * page's own <meta name="duration"> minus `from`).
 */
export async function renderPage(pagePath, outPath, opts = {}) {
  const { fps = 30, w = 960, h = 540, blur = 1, durArg = null, from = 0 } = opts;
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

    const t0 = Date.now();
    let n = 0;
    for (let i = 0; i < frames; i++) {
      const baseMs = from * 1000 + (i / fps) * 1000;
      for (let k = 0; k < blur; k++) {
        await seekAll(page, baseMs + (k / blur) * (1000 / fps));
        await page.screenshot({ path: path.join(tmpDir, `f${String(n).padStart(6, '0')}.png`) });
        n++;
      }
    }
    const captureMs = Date.now() - t0;

    const tmpOut = `${outPath}.tmp-${process.pid}.mp4`;
    const t1 = Date.now();
    const res = ffmpegEncode(tmpDir, fps, blur, tmpOut);
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
    return { frames, subframes: n, captureMs, encodeMs, dur };
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
    blur: Number(flag('--blur', final ? 3 : 1)), from, durArg,
  };
  const r = await renderPage(pagePath, outPath, opts);
  console.log(`✓ ${outPath}: ${r.frames} frame(s) at ${opts.fps}fps, ${opts.w}x${opts.h}, ${from}s-${(from + r.dur).toFixed(2)}s`
    + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}, `
    + `capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
