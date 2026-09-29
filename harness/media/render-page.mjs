// harness/media/render-page.mjs: render a bare HTML page (seeked CSS/Web Animations motion) to an
// mp4, with an optional N-subframe motion blur blended into each output frame.
//
//   node harness/media/render-page.mjs <page.html> [out.mp4] [--aspect 16:9|9:16|1:1|4:5|4:3|all] [--fps N]
//     [--from s] [--dur s | --to s] [--blur N] [--w px] [--h px] [--final] [--audio]
//
// Default is a DRAFT: half size, 30 fps, no blur, silent, and --from/--to windows the render to one
// slice instead of the whole page. --final renders the way `vawe ship` does: full size, 60 fps, the
// whole page from 0, blur up to 3, and the page's <audio> elements mixed in (harness/media/page-audio.mjs).
// The canvas is the page's <meta name="aspect"> (else 16:9), overridden by --aspect; `all` renders every
// aspect to its own file. Sizes come from core/layout/aspects.js ASPECTS, halved for a draft.
//
// The page is seeked, never played. Before any page script runs, core/engine/page-clock.js replaces Date,
// performance.now, requestAnimationFrame, setTimeout/setInterval and Math.random with functions of the
// seek time, and the renderer sets <html data-aspect>, --vw/--vh on :root and window.vawe.aspect/width/
// height/fps (fps is the page's authoring <meta name="fps">; the render fps is independent). Each seek
// sets the clock, calls window.seek(t) when the page defines it, then seeks CSS/WAAPI/SMIL animations and
// vawe.onFrame hooks, then waits for fonts, image decode and two real paints before the screenshot.
//
// Capture is split across up to CAPTURE_WORKERS pages on the shared browser (harness/media/
// preview-server.mjs), each seeking+screenshotting a contiguous slice of output frames; every subframe
// is a pure function of its seek time, so which worker captures it never affects the pixels. When
// blur > 1, a per-frame speed pass decides how many subframes that frame actually needs: a still frame
// gets 1, a fast one gets up to `blur`. The pass reads paused-animation bounding-box deltas (no
// screenshots); a page driven by window.seek or onFrame hooks, or with no animations, has no boxes to
// read, so it falls back to a mean pixel difference between downscaled frames.
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
import { installPageClock } from '../../core/engine/page-clock.js';
import { seekTo, installPageFrame } from '../../core/engine/page-seek.js';
import { ASPECTS, aspectDims } from '../../core/layout/aspects.js';
import { appendRun } from '../lib/runlog.mjs';
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

// Page meta the renderer needs before the page loads (its canvas, its authoring rate), read from the
// file so the viewport is right before any page script runs.
export function readPageMeta(pagePath, name) {
  const html = fs.readFileSync(pagePath, 'utf8');
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (new RegExp(`\\bname\\s*=\\s*["']${name}["']`, 'i').test(tag)) {
      const m = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      if (m) return m[1];
    }
  }
  return null;
}

export async function openPage(pagePath, frame) {
  const opened = await openPreview(pagePath, { width: frame.width, height: frame.height, args: PAGE_ARGS });
  await opened.page.evaluateOnNewDocument(`(${installPageClock})();(${installPageFrame})(${JSON.stringify(frame)});window.__pageSeek = ${seekTo};`);
  return opened;
}

// The seek itself is core/engine/page-seek.js seekTo, installed as window.__pageSeek so the studio runs the
// same code. Here it is followed by settle(), which only a screenshot needs.
export async function seekAll(page, ms) {
  await page.evaluate((t) => window.__pageSeek(t / 1000), ms);
  await settle(page);
}

// A screenshot must never catch a half-painted frame: fonts loaded, images decoded, and two real paints
// after the seek. The real rAF is raced against a real timer because a background tab can starve rAF.
export async function settle(page) {
  await page.evaluate(async () => {
    const real = window.__pageClock ? window.__pageClock.real : { raf: requestAnimationFrame.bind(window), setTimeout: setTimeout.bind(window), clearTimeout: clearTimeout.bind(window) };
    const paint = () => new Promise((resolve) => {
      const guard = real.setTimeout(resolve, 250);
      real.raf(() => { real.clearTimeout(guard); resolve(); });
    });
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await paint();
    await paint();
  });
}

// Per-output-frame displacement, no screenshots: paused-animation target bounding-box delta between
// consecutive frame times, summed across every animated element. A pure function of the page's own
// animation timing, so it is as deterministic as the capture itself. Returns null when the page has
// nothing to measure this way (window.seek, onFrame hooks, or no animations at all).
async function frameSpeedsFromBoxes(page, frames, fps, from) {
  return page.evaluate((frameCount, fpsArg, fromArg) => {
    if (typeof window.seek === 'function' || (window.__vaweFrameHooks || []).length || !document.getAnimations().length) return null;
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

const PIXEL_W = 64;

// Mean absolute luma difference (0-255) between consecutive frames downscaled to PIXEL_W wide, one
// low-quality screenshot per frame. An estimate of "how much of the picture moved", enough to tell a
// held frame from a fast one, decoded inside the page so the renderer needs no image library.
async function frameSpeedsFromPixels(page, frames, fps, from) {
  const speeds = [];
  let prev = null;
  for (let i = 0; i <= frames; i++) {
    await seekAll(page, from * 1000 + (i / fps) * 1000);
    const shot = await page.screenshot({ type: 'jpeg', quality: 40, encoding: 'base64' });
    const luma = await page.evaluate(async (b64, w) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
      const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0, w, h);
      const px = ctx.getImageData(0, 0, w, h).data;
      const out = [];
      for (let k = 0; k < px.length; k += 4) out.push(0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]);
      return out;
    }, shot, PIXEL_W);
    if (prev) {
      let sum = 0;
      for (let k = 0; k < luma.length; k++) sum += Math.abs(luma[k] - prev[k]);
      speeds.push(sum / luma.length);
    }
    prev = luma;
  }
  return speeds;
}

// Returns bucketed subframe counts per output frame.
async function frameSubframes(page, frames, fps, from, blur) {
  const boxes = await frameSpeedsFromBoxes(page, frames, fps, from);
  if (boxes) return clampSegments(bucketize(boxes, blur, BOX_BANDS));
  return clampSegments(bucketize(await frameSpeedsFromPixels(page, frames, fps, from), blur, PIXEL_BANDS));
}

// 3 levels only (still / half / full blur): keeps the ffmpeg filter graph's segment count bounded by
// the number of times the page's motion changes REGIME, not by frame count. A band is [still below,
// half below]: pixels of box travel per frame, or mean luma difference for the pixel estimate.
const BOX_BANDS = [1, 6];
const PIXEL_BANDS = [0.15, 1.5];
function bucketize(speeds, blur, [still, half]) {
  const mid = Math.max(1, Math.round(blur / 2));
  return speeds.map((s) => (s < still ? 1 : s < half ? mid : blur));
}

function clampSegments(kArr, cap = 200) {
  let segs = kArr.length ? 1 : 0;
  for (let i = 1; i < kArr.length; i++) if (kArr[i] !== kArr[i - 1]) segs++;
  if (segs <= cap) return kArr;
  const maxK = Math.max(1, ...kArr);
  return kArr.map(() => maxK);
}

async function captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, onSubframe) {
  const shardCount = Math.min(CAPTURE_WORKERS, Math.max(1, frames));
  const shardSize = Math.ceil(frames / shardCount);
  const shards = [];
  for (let s = 0; s < shardCount; s++) {
    const lo = s * shardSize, hi = Math.min(frames, lo + shardSize);
    if (lo < hi) shards.push([lo, hi]);
  }
  await Promise.all(shards.map(async ([lo, hi]) => {
    const { page, url, close } = await openPage(pagePath, frame);
    try {
      await page.goto(url, { waitUntil: 'load' });
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

// Same libx264 settings the Go renderer uses for its final and draft encodes (renderer/internal/encode/
// encode.go), except CRF 16 where encode.go uses 20: a page is captured lossless and CRF 16 keeps thin
// type and gradients clean. Draft is ultrafast.
function x264Args(final) {
  return final
    ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-preset', 'medium', '-crf', '16', '-movflags', '+faststart']
    : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '20', '-movflags', '+faststart'];
}

function ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut, final) {
  const seq = path.join(tmpDir, 'f%06d.png');
  const uniform = new Set(kArr).size <= 1;
  const blur = kArr[0] || 1;
  if (uniform) {
    const args = blur > 1
      ? ['-y', '-v', 'error', '-framerate', String(fps * blur), '-i', seq,
        '-vf', `tmix=frames=${blur}:weights='${Array(blur).fill('1').join(' ')}',`
          + `select='not(mod(n+1\\,${blur}))',setpts=N/${fps}/TB`,
        '-r', String(fps), ...x264Args(final), tmpOut]
      : ['-y', '-v', 'error', '-framerate', String(fps), '-i', seq,
        ...x264Args(final), tmpOut];
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
  // Each segment restarts its pts, so a 1-frame segment carries no duration and the next one overlaps
  // it; re-stamp after the concat and never let -r rate-convert, or ffmpeg drops the overlapped frames.
  const filterComplex = `${filters.join(';')};${joins}concat=n=${segments.length}:v=1:a=0,setpts=N/${fps}/TB[outv]`;
  const args = ['-y', '-v', 'error', '-framerate', String(fps), '-i', seq,
    '-filter_complex', filterComplex, '-map', '[outv]',
    '-fps_mode', 'passthrough', ...x264Args(final), tmpOut];
  return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
}

// The canvas a page renders at: --aspect, else the page's own <meta name="aspect">, else 16:9. Pixel
// sizes come from core/layout/aspects.js (long edge 1920 where the table says so), halved for a draft;
// explicit w/h win. Returns { aspect, width, height }.
export function resolveFrame(pagePath, { aspect, w, h, final = false } = {}) {
  const name = aspect || readPageMeta(pagePath, 'aspect') || '16:9';
  if (!ASPECTS[name] && !/^\d+:\d+$/.test(name)) die(`${pagePath}: unknown aspect "${name}" (use ${Object.keys(ASPECTS).join(' ')} or a W:H ratio)`);
  const [fw, fh] = aspectDims(name);
  const k = final ? 1 : 0.5;
  return { aspect: name, width: w || Math.round(fw * k), height: h || Math.round(fh * k) };
}

// The page's <audio> elements are read from the live page and mixed offline, never played
// (harness/media/page-audio.mjs). Returns false when the page has no <audio> and none was demanded.
async function muxPageAudio(page, pagePath, { video, out, duration, explicit }) {
  if (!(await page.evaluate(() => document.querySelector('audio') !== null))) {
    if (explicit) die(`${pagePath}: --audio given but the page has no <audio> element`);
    return false;
  }
  let audio;
  try { audio = await import('./page-audio.mjs'); } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') die(`${pagePath} has <audio> elements but harness/media/page-audio.mjs is missing: ${e.message}`);
    throw e;
  }
  const { specs, loudness } = await audio.readPageAudio(page, { pagePath });
  const muxed = `${out}.mux-${process.pid}.mp4`;
  await audio.mixAndMux({ specs, duration, video, out: muxed, loudness });
  fs.renameSync(muxed, out);
  return true;
}

/**
 * renderPage(pagePath, outPath, opts) -> { frames, subframes, captureMs, encodeMs, dur }.
 * opts: aspect (the page's <meta name="aspect">, else 16:9), w/h (override the aspect's pixel size),
 * final (false: half size, ultrafast x264), audio (final: mix the page's <audio> elements in; a draft
 * or a windowed render stays silent unless true), fps (30), blur (1, the MAX subframes blended per output frame; a still
 * frame always gets 1 regardless of this setting), from (0, seconds into the page's own timeline the
 * render starts at), durArg (seconds rendered from `from`; defaults to the page's own <meta
 * name="duration"> minus `from`), progress (false; prints a single overwriting capture-progress line).
 */
export async function renderPage(pagePath, outPath, opts = {}) {
  const { fps = 30, blur = 1, durArg = null, from = 0, progress = false, final = false } = opts;
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const frame = resolveFrame(pagePath, opts);
  const wantAudio = opts.audio ?? (final && from === 0 && durArg == null);
  if (opts.audio && from > 0) die('--audio needs a render from 0: the mix has no offset');
  const { page, url, close } = await openPage(pagePath, frame);
  const tmpDir = `${outPath}.frames-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await settle(page);

    const totalDur = await page.evaluate(() => {
      const m = document.querySelector('meta[name="duration"]');
      if (m) return Number(m.content);
      return Math.max(0, ...document.getAnimations().map((a) => (a.effect.getComputedTiming().endTime || 0) / 1000));
    });
    const dur = durArg != null ? durArg : Math.max(0, totalDur - from);
    if (!(dur > 0)) die(`${pagePath}: no duration (add <meta name="duration" content="<seconds>"> or pass --dur/--to)`);

    const frames = Math.round(dur * fps);
    if (!(frames > 0)) die(`${pagePath}: ${dur}s at ${fps}fps rounds to 0 frames`);

    const kArr = blur > 1 ? await frameSubframes(page, frames, fps, from, blur) : Array(frames).fill(1);
    const subframeStart = new Array(frames + 1);
    subframeStart[0] = 0;
    for (let i = 0; i < frames; i++) subframeStart[i + 1] = subframeStart[i] + kArr[i];
    const totalSub = subframeStart[frames];

    const t0 = Date.now();
    let doneSub = 0;
    const tick = progress ? setInterval(() => {
      process.stdout.write(`\r  capturing ${doneSub}/${totalSub} subframe(s)...`);
    }, 1000) : null;
    await captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, () => { doneSub++; });
    if (tick) { clearInterval(tick); process.stdout.write(`\r${' '.repeat(40)}\r`); }
    const captureMs = Date.now() - t0;

    const tmpOut = `${outPath}.tmp-${process.pid}.mp4`;
    const t1 = Date.now();
    const res = ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut, final);
    const encodeMs = Date.now() - t1;
    if (res.status !== 0 || res.error) {
      fs.rmSync(tmpOut, { force: true });
      die(`ffmpeg encode failed (${res.error ? res.error.message : `exit ${res.status}`}):\n`
        + `${(res.stderr || '').trim().split('\n').slice(-15).join('\n')}`);
    }
    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      die(`ffmpeg reported success but wrote no bytes to ${tmpOut}; stderr:\n${(res.stderr || '').trim()}`);
    }
    const mixed = wantAudio && await muxPageAudio(page, pagePath, { video: tmpOut, out: outPath, duration: dur, explicit: opts.audio === true });
    if (mixed) fs.rmSync(tmpOut, { force: true });
    else fs.renameSync(tmpOut, outPath);
    appendRun(pagePath, { cmd: 'render-page', render: { file: outPath, frames, fps, ms: captureMs + encodeMs } });
    return { frames, subframes: totalSub, captureMs, encodeMs, dur, audio: Boolean(mixed) };
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
    + `content. Run: vawe critique ${pagePath} --ref ${ref}\n`
    + `Waivable only via <script type="application/json" id="authoring">{"allow":["${code}"],`
    + `"_why":{"${code}":"…"}}</script> in the page.`);
}

export function defaultOut(pagePath, { aspect, suffixAspect, final, from = 0, to = null }) {
  const abs = path.resolve(pagePath);
  const base = path.basename(abs, '.html');
  const name = base === 'page' ? path.basename(path.dirname(abs)) : base;
  const range = !final && (from > 0 || to != null) ? `-${from}-${to ?? 'end'}` : '';
  return path.join('out', `${name}${suffixAspect ? `-${aspect.replace(':', 'x')}` : ''}${final ? '' : '-draft'}${range}.mp4`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const valueFlags = new Set(['--aspect', '--fps', '--from', '--dur', '--to', '--blur', '--w', '--h']);
  const positional = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
  const [pagePath, outArg] = positional;
  if (!pagePath) {
    die('usage: node harness/media/render-page.mjs <page.html> [out.mp4] [--aspect 16:9|9:16|1:1|4:5|4:3|all] [--fps N] '
      + '[--from s] [--dur s | --to s] [--blur N] [--w px] [--h px] [--final] [--audio]', 2);
  }
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const final = argv.includes('--final');
  if (final) assertFinalReady(pagePath);
  const from = final ? 0 : Number(flag('--from', 0));
  const toFlag = flag('--to', null);
  const durFlag = flag('--dur', null);
  const durArg = final ? null : (toFlag != null ? Number(toFlag) - from : (durFlag != null ? Number(durFlag) : null));
  const aspectFlag = flag('--aspect', null);
  const all = aspectFlag === 'all';
  const aspects = all ? Object.keys(ASPECTS) : [aspectFlag || readPageMeta(pagePath, 'aspect') || '16:9'];
  if (all && outArg) die('--aspect all writes one file per aspect: leave out the output path', 2);
  for (const aspect of aspects) {
    const opts = {
      aspect, final,
      fps: Number(flag('--fps', final ? 60 : 30)),
      w: flag('--w', null) && Number(flag('--w', null)), h: flag('--h', null) && Number(flag('--h', null)),
      blur: Number(flag('--blur', final ? 3 : 1)), from, durArg, progress: final,
      audio: argv.includes('--audio') ? true : undefined,
    };
    const frame = resolveFrame(pagePath, opts);
    const outPath = outArg || defaultOut(pagePath, { aspect, suffixAspect: all, final, from, to: durArg != null ? from + durArg : null });
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const r = await renderPage(pagePath, outPath, opts);
    console.log(`✓ ${outPath}: ${r.frames} frame(s) at ${opts.fps}fps, ${frame.width}x${frame.height} (${aspect}), ${from}s-${(from + r.dur).toFixed(2)}s`
      + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}${r.audio ? ', audio mixed' : ''}, `
      + `capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
