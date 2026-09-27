// harness/media/render-page.mjs: render a bare HTML page (seeked CSS/Web Animations motion) to an
// mp4, with an optional N-subframe motion blur blended into each output frame.
//
//   node harness/media/render-page.mjs <page.html> <out.mp4> [--fps 30] [--dur s] [--blur N] [--w 1920] [--h 1080]
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
import { serveRepo, launchPage, RENDER_ARGS } from '../lib/render-harness.mjs';

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
 * opts: fps (30), w (1920), h (1080), blur (1, subframes blended per output frame), durArg (seconds,
 * overrides the page's own <meta name="duration">).
 */
export async function renderPage(pagePath, outPath, opts = {}) {
  const { fps = 30, w = 1920, h = 1080, blur = 1, durArg = null } = opts;
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const root = path.resolve(pagePath, '..');
  const rel = path.basename(pagePath);
  const { close: closeServer, port } = await serveRepo({ root });
  const { page, close: closePage } = await launchPage({ width: w, height: h, args: PAGE_ARGS });
  const tmpDir = `${outPath}.frames-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const dur = durArg || await page.evaluate(() => {
      const m = document.querySelector('meta[name="duration"]');
      if (m) return Number(m.content);
      return Math.max(0, ...document.getAnimations().map((a) => (a.effect.getComputedTiming().endTime || 0) / 1000));
    });
    if (!(dur > 0)) die(`${pagePath}: no duration (add <meta name="duration" content="<seconds>"> or pass --dur)`);

    const frames = Math.round(dur * fps);
    if (!(frames > 0)) die(`${pagePath}: ${dur}s at ${fps}fps rounds to 0 frames`);

    const t0 = Date.now();
    let n = 0;
    for (let i = 0; i < frames; i++) {
      const baseMs = (i / fps) * 1000;
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
    await closePage();
    closeServer();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const positional = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  const [pagePath, outPath] = positional;
  if (!pagePath || !outPath) {
    die('usage: node harness/media/render-page.mjs <page.html> <out.mp4> [--fps 30] [--dur s] [--blur N] [--w 1920] [--h 1080]', 2);
  }
  const durFlag = flag('--dur', null);
  const opts = {
    fps: Number(flag('--fps', 30)), w: Number(flag('--w', 1920)), h: Number(flag('--h', 1080)),
    blur: Number(flag('--blur', 1)), durArg: durFlag != null ? Number(durFlag) : null,
  };
  const r = await renderPage(pagePath, outPath, opts);
  console.log(`✓ ${outPath}: ${r.frames} frame(s) at ${opts.fps}fps, ${r.dur}s`
    + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}, `
    + `capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
