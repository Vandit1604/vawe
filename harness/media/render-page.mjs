// harness/media/render-page.mjs: render a bare HTML page (seeked CSS/Web Animations motion) to an
// mp4, with an optional N-subframe motion blur blended into each output frame.
//
//   node harness/media/render-page.mjs <page.html> [out.mp4] [--aspect 16:9|9:16|1:1|4:5|4:3|all] [--fps N]
//     [--from s] [--dur s | --to s] [--blur N] [--w px] [--h px] [--final] [--audio] [--profile]
//
// Default is a DRAFT: half size, 30 fps, no blur, silent, and --from/--to windows the render to one
// slice instead of the whole page. --final renders the way `vawe ship` does: full size, 60 fps, the
// whole page from 0, up to 32 subframes of motion blur a frame, and the page's <audio> elements mixed in (harness/media/page-audio.mjs);
// it writes the master and, beside it, a small web copy (<name>.web.mp4). --profile prints the cost table.
// A final logs a `ship` event in out/<film>.runs.jsonl; --job (the ship job, harness/media/ship-job.mjs) leaves that to the job.
// The canvas is the page's <meta name="aspect"> (else 16:9), overridden by --aspect; `all` renders every
// aspect to its own file. The CSS viewport is always the aspect's full size (core/layout/aspects.js ASPECTS),
// so a draft lays out exactly like the final; a draft only captures at device scale 0.5.
//
// The page is seeked, never played. Before any page script runs, core/engine/page-clock.js replaces Date,
// performance.now, requestAnimationFrame, setTimeout/setInterval and Math.random with functions of the
// seek time, and the renderer sets <html data-aspect>, --vw/--vh on :root and window.vawe.aspect/width/
// height/fps (fps is the page's authoring <meta name="fps">; the render fps is independent). Each seek
// sets the clock, calls window.seek(t) when the page defines it, then seeks CSS/WAAPI/SMIL animations and
// vawe.onFrame hooks, then waits for fonts, image decode and two real paints before the screenshot.
//
// Capture is split into fixed 60-frame slices, `--workers` of them at once (default VAWE_WORKERS, else 2 while
// another render runs, else min(4, cpus-1)), each on
// its own page of the shared browser (harness/media/preview-server.mjs); the speed pass below runs the same
// way. Slice boundaries do not depend on the worker count, so the pixels never do either. When
// blur > 1, a per-frame speed pass decides how many subframes that frame actually needs: a still frame
// gets 1, a fast one enough subframes to blend into one streak, at most `blur`. The pass reads paused-animation bounding-box deltas (no
// screenshots); a page driven by window.seek or onFrame hooks, or with no animations, has no boxes to
// read, so it falls back to a mean pixel difference between downscaled frames.
// Counts are powers of two and run-length-encoded before capture, so the ffmpeg filter graph below
// (one trim+tmix+select+concat chain per motion-regime segment, still ONE ffmpeg process) stays at a
// few dozen segments; a pathological frame-by-frame alternation collapses back to a uniform max-blur
// capture (`clampSegments`) rather than building an unbounded graph.
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
import { createHash } from 'node:crypto';
import { PAGE_ARGS, REPO_ROOT } from '../lib/render-harness.mjs';
import { scratch } from '../lib/scratch.mjs';
import { installPageClock } from '../../core/engine/page-clock.js';
import { seekTo, awaitFonts, installPageFrame } from '../../core/engine/page-seek.js';
import { ASPECTS, aspectDims } from '../../core/layout/aspects.js';
import { appendRun } from '../lib/runlog.mjs';
import { devEvent, shipEvent } from '../lib/run-events.mjs';
import { openPreview, treeSignature } from './preview-server.mjs';
import { writeDraftSheet } from './draft-sheet.mjs';
import { sampleText, sampleContrast, sampleSpec, sampleObjects, reviveObjects, readVideo, videoProblems } from './draft-check.mjs';
import { parseBriefTables, readBrief, dropGuesses } from '../lib/brief-tables.mjs';
import { createChecks, timeLine } from '../lib/check-runner.mjs';
import { MODES } from '../lib/draft-tiers.mjs';
import { redLine, summaryLine, fullTable } from '../lib/acceptance.mjs';
import { draftAcceptance, videoMeasures } from './acceptance-run.mjs';
import { textProblems, frameUnitLines, soundLine, briefLine, mergeProblems, draftAdvice, draftCheckLines } from '../lib/draft-check.mjs';
import { directionsLines } from '../lib/directions.mjs';
import { recipeEchoLines } from '../lib/recipe-echo.mjs';
import { referenceFor, motionStampFresh, pageAuthoring } from '../lib/motion-stamp.mjs';
import { isWaivedBy, hasReason, isWaived } from '../lib/waivers.mjs';
import { draftTasteLines, tasteLines } from '../lib/taste-steps.mjs';
import { runMotionCollector, motionLint, unwaived, lintLines, recordsFromBoxes, mergeRecords } from '../lib/motion-lint.mjs';
import { sampleBoxTracks, lintTimes } from '../lib/box-track.mjs';
import { adviceBlock, errorLine } from '../lib/advice.mjs';
import { edgeTravelDeltas } from '../lib/edge-travel.mjs';
import { textCollisionLines } from '../lib/text-collision.mjs';
import { contrastLines } from '../lib/text-contrast.mjs';
import { peakLine } from '../lib/peak-limit.mjs';
import { watchPageErrors, pageErrorLines } from '../lib/page-errors.mjs';

// A laptop running two renders at 4 workers each overheats and throttles; the second render starts cool.
const COOL_WORKERS = 2;

function otherRenderRunning() {
  const ps = spawnSync('ps', ['-Ao', 'pid=,command='], { encoding: 'utf8' });
  return (ps.stdout || '').split('\n').some((line) => {
    const [pid, ...cmd] = line.trim().split(/\s+/);
    return Number(pid) !== process.pid && cmd.join(' ').includes('render-page.mjs');
  });
}

export function defaultWorkers(env = process.env, busy = otherRenderRunning) {
  if (Number(env.VAWE_WORKERS) > 0) return Number(env.VAWE_WORKERS);
  if (busy()) return COOL_WORKERS;
  return Math.max(1, Math.min(4, os.cpus().length - 1));
}

// A page with several WebGL canvases slows down over a long run until one CDP call times out; a fresh
// page every 300 subframes keeps it fast, and a seek is a pure function of time so the pixels do not change.
const RECYCLE_SUBFRAMES = 300;

// A page keeps raster state between seeks: the first frame on a fresh page differs from the same frame
// reached by seeking on (a sparse SSIM 0.99997 drift on gradient text). So the slice boundaries are fixed
// by this constant, never by the worker count, and each slice starts on its own fresh page: the pixels
// are then identical for any --workers.
const SLICE_FRAMES = 60;

const die = (msg, code = 1) => { console.error(errorLine(msg)); process.exit(code); };

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

export async function openPage(pagePath, frame, { warm = false } = {}) {
  const opened = await openPreview(pagePath, { width: frame.width, height: frame.height, scale: frame.scale, args: PAGE_ARGS, warm });
  if (opened.reused) return opened;
  // The tab that holds browser focus rasterizes edges differently from the others (sub-pixel text and
  // shape edges, SSIM 0.9994), so which slice was frontmost changed the pixels with --workers.
  await (await opened.page.createCDPSession()).send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await opened.page.evaluateOnNewDocument(`(${installPageClock})();(${installPageFrame})(${JSON.stringify(frame)});window.__pageFonts = ${awaitFonts};window.__pageSeek = ${seekTo};window.__stillKey = ${stillKey};`);
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
    await window.__pageFonts();
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await paint();
    await paint();
  });
}

// Per-output-frame displacement in px, no screenshots: the largest paused-animation target edge travel
// (move, resize, turn or inset clip) between consecutive frame times, over every animated element. A pure function of the page's own
// animation timing, so it is as deterministic as the capture itself. Returns null when the page has
// nothing to measure this way (window.seek, onFrame hooks, or no animations at all).
async function frameSpeedsFromBoxes(page, frames, fps, from) {
  if (await page.evaluate(isScripted) || !(await page.evaluate(() => document.getAnimations().length))) return null;
  const times = Array.from({ length: frames + 1 }, (_, i) => from + i / fps);
  return edgeTravelDeltas((await sampleBoxTracks(page, times, 'animated')).tracks);
}

const isScripted = () => typeof window.seek === 'function' || (window.__vaweFrameHooks || []).length > 0;

const PIXEL_W = 64;

// Mean absolute luma difference (0-255) between consecutive frames downscaled to PIXEL_W wide, one
// low-quality screenshot per frame. An estimate of "how much of the picture moved", enough to tell a
// held frame from a fast one, decoded inside the page so the renderer needs no image library.
async function frameSpeedsFromPixels(pagePath, frame, frames, fps, from, workers, stallMs) {
  const speeds = new Array(frames);
  const lumaAt = async (page, i, mark) => {
    mark('seek');
    await seekAll(page, from * 1000 + (i / fps) * 1000);
    mark('speed screenshot');
    const shot = await page.screenshot({ type: 'jpeg', quality: 40, encoding: 'base64', clip: { x: 0, y: 0, width: frame.width, height: frame.height, scale: PIXEL_W / (frame.width * frame.scale) } });
    return page.evaluate(async (b64, w) => {
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
  };
  await runShards(pagePath, frame, frames, workers, async (page, i, local, mark) => {
    local.prev ??= await lumaAt(page, i, mark);
    const next = await lumaAt(page, i + 1, mark);
    let sum = 0;
    for (let k = 0; k < next.length; k++) sum += Math.abs(next[k] - local.prev[k]);
    speeds[i] = sum / next.length;
    local.prev = next;
    return 2;
  }, { fps, from }, stallMs);
  return speeds;
}

// The pass is a pure function of the page folder, core/ and the render settings, so a second ship of an
// unchanged page reads its answer from the scratch folder.
async function frameSubframes(page, job) {
  const { pagePath, frame, frames, fps, from, blur } = job;
  const files = [path.dirname(path.resolve(pagePath)), path.join(REPO_ROOT, 'core')];
  const key = createHash('sha1').update(JSON.stringify([treeSignature(files), path.resolve(pagePath), frame, frames, fps, from, blur])).digest('hex').slice(0, 16);
  const cacheFile = scratch('render-prepass', `${key}.json`);
  try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* not cached yet */ }
  const kArr = await measureSubframes(page, job);
  fs.writeFileSync(cacheFile, JSON.stringify(kArr));
  return kArr;
}

// Returns bucketed subframe counts per output frame.
export async function measureSubframes(page, { pagePath, frame, frames, fps, from, blur, workers, stallMs }) {
  const boxes = await frameSpeedsFromBoxes(page, frames, fps, from);
  if (boxes) return clampSegments(boxes.map((px) => subframesForTravel(px * frame.scale, blur)));
  return clampSegments(bucketize(await frameSpeedsFromPixels(pagePath, frame, frames, fps, from, workers, stallMs), blur, PIXEL_BANDS));
}

// A fast move blended from too few subframes shows as separate copies of the object (3 ghosts at 3
// subframes); enough subframes that neighbours sit at most STEP_PX apart read as one smooth streak.
// SHUTTER is the share of the frame interval the blur spans (0.5 = a film camera's 180 degree shutter).
// Counts are powers of two so the ffmpeg graph's segment count follows motion regimes, not frames.
export const SHUTTER = 0.5;
const STEP_PX = 3;
export function subframesForTravel(px, cap) {
  let k = 1;
  while (k < cap && (px * SHUTTER) / k > STEP_PX) k = Math.min(cap, k * 2);
  return k;
}

// The pixel estimate cannot measure travel: mean luma difference bands [still below, fast from]. It cannot
// tell a frame that needs 32 subframes from one that needs 16, so its fast band stops at 16 (a measured 5 s
// three.js film: 4,017 subframes at 16, 7,805 at 32).
const PIXEL_BANDS = [0.15, 1.5];
function bucketize(speeds, blur, [still, fast]) {
  const mid = Math.min(blur, 4), top = Math.min(blur, 16);
  return speeds.map((s) => (s < still ? 1 : s < fast ? mid : top));
}

function clampSegments(kArr, cap = 200) {
  let segs = kArr.length ? 1 : 0;
  for (let i = 1; i < kArr.length; i++) if (kArr[i] !== kArr[i - 1]) segs++;
  if (segs <= cap) return kArr;
  const maxK = Math.max(1, ...kArr);
  return kArr.map(() => maxK);
}

// Runs work(page, i, local, mark) for every frame 0..frames-1 in fixed SLICE_FRAMES slices, `workers` slices at
// a time, each slice on its own recycled page. work returns how many seeks it made; `local` is that slice's own state;
// work calls mark('<step>') before each await so a stall can name it.
// A slice whose browser or page dies, or that makes no progress for `stallMs`, is restarted once from its first
// frame (returns the restarted slices as "lo-hi s" strings); a second death exits 2, a second stall throws.
// `clock` is { fps, from } and only names the time range.
const LOST_PAGE = /Connection closed|Target closed|No target with given id|Session closed|Protocol error|timed out|timeout/i;

// Measured slowest step: 0.38 s (a colour-sting draft screenshot); awaitFonts gives up at 10 s. A step at 60 s
// is stuck, and the 30 min CDP protocol timeout would fire far too late.
export const STALL_MS = 60000;

class StallError extends Error {}

async function runShards(pagePath, frame, frames, workers, work, clock, stallMs = STALL_MS) {
  const slices = [];
  for (let lo = 0; lo < frames; lo += SLICE_FRAMES) slices.push([lo, Math.min(frames, lo + SLICE_FRAMES)]);
  const restarted = [];
  let next = 0;
  const range = ([lo, hi]) => `${(clock.from + lo / clock.fps).toFixed(2)}-${(clock.from + hi / clock.fps).toFixed(2)}s`;
  const runSliceOnce = async ([lo, hi], worker) => {
    const at = { frame: lo, step: 'open page', since: Date.now(), stuck: false, opened: null };
    const mark = (step, i = at.frame) => {
      if (at.stuck) throw new StallError('abandoned after a stall');
      Object.assign(at, { step, frame: i, since: Date.now() });
    };
    const loop = (async () => {
      const local = {};
      let sinceOpen = 0;
      try {
        for (let i = lo; i < hi; i++) {
          if (at.opened && sinceOpen >= RECYCLE_SUBFRAMES) { mark('close page', i); await at.opened.close().catch(() => {}); at.opened = null; }
          if (!at.opened) {
            mark('open page', i);
            at.opened = await openPage(pagePath, frame);
            mark('load page', i);
            await at.opened.page.goto(at.opened.url, { waitUntil: 'load' });
            sinceOpen = 0;
          }
          mark('frame', i);
          sinceOpen += await work(at.opened.page, i, local, (step) => mark(step, i));
        }
      } finally { if (at.opened) await at.opened.close().catch(() => {}); }
    })();
    let timer;
    const stalled = new Promise((_, reject) => {
      timer = setInterval(() => {
        const idle = Date.now() - at.since;
        if (idle < stallMs) return;
        at.stuck = true;
        if (at.opened) at.opened.close().catch(() => {});
        const t = (clock.from + at.frame / clock.fps).toFixed(2);
        reject(new StallError(`render stalled: worker ${worker}, frame ${at.frame} (${t} s), in ${at.step} for ${(idle / 1000).toFixed(0)} s`));
      }, Math.min(1000, stallMs / 4));
    });
    loop.catch(() => {});
    try { await Promise.race([loop, stalled]); } finally { clearInterval(timer); }
  };
  const runSlice = async (slice, worker) => {
    try { await runSliceOnce(slice, worker); } catch (e) {
      const stall = e instanceof StallError;
      if (!stall && !LOST_PAGE.test(String(e && e.message))) throw e;
      if (stall) console.error(`${e.message}; restarting slice ${range(slice)} once`);
      restarted.push(range(slice));
      try { await runSliceOnce(slice, worker); } catch (e2) {
        if (e2 instanceof StallError) throw new InvariantError([`${e2.message}, the second time on slice ${range(slice)}: the page never finished that step (a window.seek or onFrame hook that never resolves, a font or image that never loads), or the browser is starved`]);
        if (!LOST_PAGE.test(String(e2 && e2.message))) throw e2;
        die(`slice ${slice[0]}-${slice[1]} (${range(slice)}) lost its page twice: another process closed the shared browser, or the page crashed (${e2.message})`, 2);
      }
    }
  };
  const lane = async (worker) => { while (next < slices.length) await runSlice(slices[next++], worker); };
  await Promise.all(Array.from({ length: Math.min(workers, slices.length) }, (_, w) => lane(w + 1)));
  return restarted;
}

// Runs inside the page after a seek: a key for everything time can change, or null when time can reach
// the pixels some other way (window.seek, onFrame hooks, pending clock callbacks, canvas, video, SMIL).
// Two subframes with the same key paint the same pixels, so the second reuses the first capture.
const stillKey = () => {
  if (typeof window.seek === 'function' || (window.__vaweFrameHooks || []).length || window.__pageClock?.pending?.()) return null;
  if (document.querySelector('canvas, video, iframe, animate, animateTransform, animateMotion, set')) return null;
  return JSON.stringify(document.getAnimations().map((a) => { const c = a.effect.getComputedTiming(); return [c.progress, c.currentIteration]; }));
};

// One round trip: a CDP call costs about as much as the seek itself on a page with a heavy frame hook.
const seekThenKey = async (ms) => { await window.__pageSeek(ms / 1000); return window.__stillKey(); };

// A reused capture is only ever the previous one on the same page, so the pixels stay independent of --workers.
async function captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, workers, onSubframe, stallMs) {
  return runShards(pagePath, frame, frames, workers, async (page, i, local, mark) => {
    const baseMs = from * 1000 + (i / fps) * 1000;
    const k = kArr[i];
    for (let j = 0; j < k; j++) {
      const file = path.join(tmpDir, `f${String(subframeStart[i] + j).padStart(6, '0')}.png`);
      mark('seek');
      const key = await page.evaluate(seekThenKey, baseMs + (j / k) * SHUTTER * (1000 / fps));
      const reused = key !== null && key === local.key;
      if (reused) fs.linkSync(local.file, file);
      else {
        mark('settle (fonts, image decode, two paints)');
        await settle(page);
        mark('screenshot');
        await page.screenshot({ path: file, type: 'png', optimizeForSpeed: true });
      }
      Object.assign(local, { key, file });
      onSubframe(i, reused);
    }
    return k;
  }, { fps, from }, stallMs);
}

// Same libx264 settings the Go renderer uses for its final and draft encodes (renderer/internal/encode/
// encode.go), except CRF 16 where encode.go uses 20: a page is captured lossless and CRF 16 keeps thin
// type and gradients clean. Draft is ultrafast. aq-mode=3 spends bits on dark flat areas, where 8-bit bands.
function x264Args(final) {
  return final
    ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-preset', 'medium', '-crf', '16', '-x264-params', 'aq-mode=3', '-movflags', '+faststart']
    : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '20', '-movflags', '+faststart'];
}

// The web copy: AV1 10-bit needs no dither, since 10 bits do not band. Measured on a 1080p dark ramp and
// two 5 s films: 1.7 and 3.6 MB, and the ramp's longest flat run 20 px (lossless 14, undithered 8-bit 98).
// An 8-bit x264 copy at that size bands (CRF 22: 121 px).
const WEB_ARGS = ['-c:v', 'libsvtav1', '-pix_fmt', 'yuv420p10le', '-crf', '30', '-preset', '8', '-svtav1-params', 'lp=2', '-movflags', '+faststart'];

// 8-bit yuv420p bands a dark gradient into visible rings; a faint fixed-seed temporal noise before the
// master encode dithers them away (the final only, so draft pixels stay comparable). Measured on a dark
// ramp: strength 3 with aq-mode=3 leaves a 20 px longest flat run at half the size of strength 4 with -tune film.
// Chromium saves some frames as RGBA (mix-blend-mode, for one); a pixel-format change mid-sequence makes
// ffmpeg rebuild the filter graph, which resets the trims and drops frames. Keep one graph, one format.
const ONE_FORMAT_IN = ['-reinit_filter', '0'];

const DITHER = 'noise=alls=3:allf=t:all_seed=7';

// One trim+tmix+select chain per run of equal subframe counts, concatenated to [blend].
function blendGraph(kArr, subframeStart, fps) {
  const segments = [];
  let segStart = 0;
  for (let i = 1; i <= kArr.length; i++) {
    if (i === kArr.length || kArr[i] !== kArr[segStart]) { segments.push({ start: segStart, end: i, k: kArr[segStart] }); segStart = i; }
  }
  const filters = segments.map((seg, idx) => {
    const s = subframeStart[seg.start], e = subframeStart[seg.end];
    const label = `s${idx}`;
    if (seg.k === 1) return `[in${idx}]trim=start_frame=${s}:end_frame=${e},setpts=N/${fps}/TB[${label}]`;
    const weights = Array(seg.k).fill('1').join(' ');
    return `[in${idx}]trim=start_frame=${s}:end_frame=${e},tmix=frames=${seg.k}:weights='${weights}',`
      + `select='not(mod(n+1\\,${seg.k}))',setpts=N/${fps}/TB[${label}]`;
  });
  const joins = segments.map((_, idx) => `[s${idx}]`).join('');
  // Each segment restarts its pts, so a 1-frame segment carries no duration and the next one overlaps
  // it; re-stamp after the concat and never let -r rate-convert, or ffmpeg drops the overlapped frames.
  const split = `[0:v]format=rgb24,split=${segments.length}${segments.map((_, idx) => `[in${idx}]`).join('')}`;
  return `${split};${filters.join(';')};${joins}concat=n=${segments.length}:v=1:a=0,setpts=N/${fps}/TB[blend]`;
}

// One ffmpeg pass: the master to tmpOut and, when webOut is given, the web copy from the same blend.
export function ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut, final, webOut = null) {
  const seq = path.join(tmpDir, 'f%06d.png');
  const master = final ? `,${DITHER}` : '';
  const outputs = webOut
    ? `;[blend]split=2[m][w];[m]null${master}[outv];[w]format=yuv420p10le[web]`
    : `;[blend]null${master}[outv]`;
  const args = ['-y', '-v', 'error', ...ONE_FORMAT_IN, '-framerate', String(fps), '-i', seq,
    '-filter_complex', blendGraph(kArr, subframeStart, fps) + outputs,
    '-map', '[outv]', '-fps_mode', 'passthrough', ...x264Args(final), tmpOut,
    ...(webOut ? ['-map', '[web]', '-fps_mode', 'passthrough', ...WEB_ARGS, webOut] : [])];
  return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
}

// The cost table `--profile` prints. Subframes and screenshots per film second are a pure function of the
// page and the settings; capture seconds are the measured total shared out by screenshots.
export function costLines({ kArr, reused, fps, from, prepassMs, captureMs, encodeMs }) {
  const shots = kArr.map((k, i) => k - reused[i]);
  const allShots = shots.reduce((a, b) => a + b, 0);
  const seconds = [];
  kArr.forEach((k, i) => {
    const s = Math.floor(from + i / fps);
    seconds[s] ??= { s, frames: 0, subframes: 0, shots: 0 };
    seconds[s].frames++; seconds[s].subframes += k; seconds[s].shots += shots[i];
  });
  const cost = (row) => (allShots ? (captureMs / 1000) * (row.shots / allShots) : 0).toFixed(1);
  const top = seconds.filter(Boolean).sort((a, b) => b.shots - a.shots || a.s - b.s).slice(0, 5);
  const sub = kArr.reduce((a, b) => a + b, 0);
  return [
    `cost: ${kArr.length} frames, ${sub} subframes, ${allShots} screenshots (${sub - allShots} reused), max ${Math.max(1, ...kArr)} subframes a frame`,
    `      prepass ${(prepassMs / 1000).toFixed(1)} s, capture ${(captureMs / 1000).toFixed(1)} s (${allShots ? (captureMs / allShots).toFixed(0) : 0} ms a screenshot), encode ${(encodeMs / 1000).toFixed(1)} s`,
    '  second  frames  subframes  screenshots  capture s',
    ...top.map((r) => `  ${`${r.s}-${r.s + 1}`.padEnd(6)}  ${String(r.frames).padStart(6)}  ${String(r.subframes).padStart(9)}  ${String(r.shots).padStart(11)}  ${cost(r).padStart(9)}`),
  ];
}

// Render invariants. Each check returns one line per problem; renderPage throws them together as an
// InvariantError and the CLI prints `error: <line>` for each and exits 2. An intended exception is declared
// on the page: <meta name="blank" content="0-0.4, 4.8-5"> (or data-blank on <html>) for empty frames.
export class InvariantError extends Error {
  constructor(problems) { super(problems.join('\n')); this.problems = problems; }
}

const BLANK_RANGE_MAX = 6;
const BLANK_PROBE_WIDTH = 480;

async function fontProblems(page) {
  const bad = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'error').map((f) => f.family))]);
  return bad.map((family) => `font ${family} failed to load: fix its src or remove the @font-face`);
}

async function audioProblems(page, pagePath) {
  if (!(await page.evaluate(() => document.querySelector('audio') !== null))) return [];
  const { readPageAudio } = await import('./page-audio.mjs');
  try { await readPageAudio(page, { pagePath }); } catch (e) { return String(e.message).split('\n'); }
  return [];
}

// Null when the page has no <audio> or sets <meta name="loudness"> (the delivery is then normalised, so
// the as-written level is not the result).
async function mixLevel(page, pagePath, duration) {
  if (!(await page.evaluate(() => document.querySelector('audio') !== null))) return null;
  const { readPageAudio, measureMixLevel } = await import('./page-audio.mjs');
  const { specs, loudness } = await readPageAudio(page, { pagePath });
  return loudness === null ? measureMixLevel({ specs, duration }) : null;
}

async function assertProblems(page) {
  const count = await page.evaluate(() => (window.__vaweAsserts || []).length);
  const problems = [];
  for (let i = 0; i < count; i++) {
    const r = await page.evaluate(async (k) => {
      const a = window.__vaweAsserts[k];
      await window.__pageSeek(a.t);
      try { return (await a.fn()) ? null : `assert at ${a.t} s failed: ${a.message}`; } catch (e) { return `assert at ${a.t} s threw (${e.message}): ${a.message}`; }
    }, i);
    if (r) problems.push(r);
  }
  return problems;
}

export function parseBlankRanges(html) {
  const tag = (html.match(/<meta\b[^>]*\bname\s*=\s*["']blank["'][^>]*>/i) || [''])[0];
  const raw = [tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1], html.match(/<html\b[^>]*\bdata-blank\s*=\s*["']([^"']*)["']/i)?.[1]].filter(Boolean).join(',');
  return raw.split(',').map((r) => r.trim().match(/^([\d.]+)\s*-\s*([\d.]+)$/)).filter(Boolean).map((m) => [Number(m[1]), Number(m[2])]);
}

// One ffmpeg pass over the encode: per frame, whether its luma and chroma are near-uniform.
export function probeFrames(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${BLANK_PROBE_WIDTH}:-2:flags=area,signalstats,metadata=print:file=-`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 });
  const stats = [];
  for (const line of (r.stdout || '').split('\n')) {
    if (line.startsWith('frame:')) stats.push({});
    const m = line.match(/^lavfi\.signalstats\.([YUV](?:MIN|MAX))=(\d+)/);
    if (m && stats.length) stats[stats.length - 1][m[1]] = Number(m[2]);
  }
  return stats.map((f) => Math.max(f.YMAX - f.YMIN, f.UMAX - f.UMIN, f.VMAX - f.VMIN) <= BLANK_RANGE_MAX);
}

const secs = (t) => String(+t.toFixed(2));

// An entrance from opacity 0, or an exit to the ground, leaves a few empty frames at the ends; that is motion, not a bug.
const EDGE_BLANK_SEC = 0.25;

export function frameProblems(blank, { frames, fps, from, declared }) {
  const problems = [];
  if (blank.length !== frames) problems.push(`the encode has ${blank.length} frame(s), expected ${frames} (round(duration x fps))`);
  const half = 0.5 / fps;
  const declaredAt = (i) => { const t = from + i / fps; return declared.some(([a, b]) => t >= a - half && t <= b + half); };
  for (let i = 0; i < blank.length; i++) {
    if (!blank[i] || declaredAt(i)) continue;
    let j = i;
    while (j + 1 < blank.length && blank[j + 1] && !declaredAt(j + 1)) j++;
    const t0 = from + i / fps, t1 = from + j / fps;
    const atEdge = i === 0 || j === blank.length - 1;
    if (atEdge && (j - i + 1) / fps <= EDGE_BLANK_SEC) { i = j; continue; }
    const what = i === j ? `frame ${i} (${secs(t0)} s)` : `frames ${i}-${j} (${secs(t0)}-${secs(t1)} s)`;
    problems.push(`${what} blank; declare it with <meta name="blank" content="${secs(t0)}-${secs(t1 + 1 / fps)}"> if intended`);
    i = j;
  }
  return problems;
}

// The brief.md next to a page states the length and aspect the film was asked for; a page that drifted
// from them fails before any frame is drawn. Only answered lines count (`- length: 5 s`, `- aspect: 16:9`).
export function briefProblems(pagePath) {
  const briefPath = path.join(path.dirname(path.resolve(pagePath)), 'brief.md');
  if (!fs.existsSync(briefPath)) return [];
  const brief = fs.readFileSync(briefPath, 'utf8');
  const answered = (key) => brief.match(new RegExp(`^- ${key}:\\s*([^\\n]*)$`, 'im'))?.[1];
  const line = (key) => { const v = answered(key); return v && !v.includes('[unanswered') ? v : null; };
  const wantLength = Number(line('length')?.match(/^([\d.]+)\s*s\b/)?.[1]);
  const wantAspect = line('aspect')?.match(/^\d+:\d+/)?.[0];
  const haveLength = Number(readPageMeta(pagePath, 'duration'));
  const haveAspect = readPageMeta(pagePath, 'aspect') || '16:9';
  const lengthDrift = wantLength > 0 && haveLength !== wantLength;
  const aspectDrift = wantAspect && haveAspect !== wantAspect;
  if (!lengthDrift && !aspectDrift) return [];
  return [`brief: ${wantLength > 0 ? wantLength : haveLength} s ${wantAspect || haveAspect}; page: ${haveLength} s ${haveAspect}`];
}

// The canvas a page renders at: --aspect, else the page's own <meta name="aspect">, else 16:9. width and
// height are the CSS viewport, always the aspect's full size from core/layout/aspects.js, so px values lay
// out the same in a draft and a final; scale is the device scale of the capture (0.5 draft, 1 final).
// w/h set the output size: scale = w / full width (else h / full height), CSS size = output / scale.
// Returns { aspect, width, height, scale }; the output is width x height times scale.
export function resolveFrame(pagePath, { aspect, w, h, final = false } = {}) {
  const name = aspect || readPageMeta(pagePath, 'aspect') || '16:9';
  if (!ASPECTS[name] && !/^\d+:\d+$/.test(name)) die(`${pagePath}: unknown aspect "${name}" (use ${Object.keys(ASPECTS).join(' ')} or a W:H ratio)`);
  const [fw, fh] = aspectDims(name);
  const scale = w ? w / fw : h ? h / fh : final ? 1 : 0.5;
  const outW = w || Math.round(fw * scale), outH = h || Math.round(fh * scale);
  return { aspect: name, width: Math.round(outW / scale), height: Math.round(outH / scale), scale };
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
 * opts: aspect (the page's <meta name="aspect">, else 16:9), w/h (the output pixel size; see resolveFrame),
 * final (false: half-size capture of the same layout, ultrafast x264), audio (final: mix the page's <audio> elements in; a draft
 * or a windowed render stays silent unless true), fps (30), blur (1, the MAX subframes blended per output frame; each
 * frame gets what its fastest move needs, a still frame 1), from (0, seconds into the page's own timeline the
 * render starts at), durArg (seconds rendered from `from`; defaults to the page's own <meta
 * name="duration"> minus `from`), progress (false; prints a single overwriting capture-progress line), stallMs (STALL_MS; no progress this long restarts a slice).
 */
export async function renderPage(pagePath, outPath, opts = {}) {
  const { fps = 30, blur = 1, durArg = null, from = 0, progress = false, final = false } = opts;
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const frame = resolveFrame(pagePath, opts);
  const wantAudio = opts.audio ?? (final && from === 0 && durArg == null);
  if (opts.audio && from > 0) die('--audio needs a render from 0: the mix has no offset');
  const { page, url, close } = await openPage(pagePath, frame);
  const scriptErrors = watchPageErrors(page);
  const tmpDir = `${outPath}.frames-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    await page.goto(url, { waitUntil: 'load' });
    try { await settle(page); } catch (e) {
      const msg = String(e.message).replace(/^.*?Error: /, '');
      if (/^font (still loading|failed)/.test(msg)) throw new InvariantError([msg]);
      throw e;
    }
    const early = [...pageErrorLines(scriptErrors, pagePath), ...await fontProblems(page), ...await audioProblems(page, pagePath), ...await assertProblems(page)];
    if (early.length) throw new InvariantError(early);

    const totalDur = await page.evaluate(() => {
      const m = document.querySelector('meta[name="duration"]');
      if (m) return Number(m.content);
      return Math.max(0, ...document.getAnimations().map((a) => (a.effect.getComputedTiming().endTime || 0) / 1000));
    });
    const dur = durArg != null ? durArg : Math.max(0, totalDur - from);
    if (!(dur > 0)) die(`${pagePath}: no duration (add <meta name="duration" content="<seconds>"> or pass --dur/--to)`);

    const { motion = null, probe = null } = opts.checks ? await probePage(page, dur, pagePath, { checks: opts.checks, from, whole: from === 0 && durArg == null }) : {};
    const frames = Math.round(dur * fps);
    if (!(frames > 0)) die(`${pagePath}: ${dur}s at ${fps}fps rounds to 0 frames`);

    const workers = opts.workers || defaultWorkers();
    const tPre = Date.now();
    const kArr = blur > 1 ? await frameSubframes(page, { pagePath, frame, frames, fps, from, blur, workers, stallMs: opts.stallMs }) : Array(frames).fill(1);
    const subframeStart = new Array(frames + 1);
    subframeStart[0] = 0;
    for (let i = 0; i < frames; i++) subframeStart[i + 1] = subframeStart[i] + kArr[i];
    const totalSub = subframeStart[frames];

    const t0 = Date.now();
    const prepassMs = t0 - tPre;
    let doneSub = 0;
    const reused = new Array(frames).fill(0);
    const tick = progress ? setInterval(() => {
      process.stdout.write(`\r  capturing ${doneSub}/${totalSub} subframe(s)...`);
    }, 1000) : null;
    const restarted = await captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, workers, (i, again) => { doneSub++; if (again) reused[i]++; }, opts.stallMs);
    if (tick) { clearInterval(tick); process.stdout.write(`\r${' '.repeat(40)}\r`); }
    const captureMs = Date.now() - t0;

    const tmpOut = `${outPath}.tmp-${process.pid}.mp4`;
    const webPath = final ? webOut(outPath) : null;
    const tmpWeb = webPath && `${webPath}.tmp-${process.pid}.mp4`;
    const t1 = Date.now();
    const res = ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut, final, tmpWeb);
    const encodeMs = Date.now() - t1;
    if (res.status !== 0 || res.error) {
      fs.rmSync(tmpOut, { force: true });
      if (tmpWeb) fs.rmSync(tmpWeb, { force: true });
      die(`ffmpeg encode failed (${res.error ? res.error.message : `exit ${res.status}`}):\n`
        + `${(res.stderr || '').trim().split('\n').slice(-15).join('\n')}`);
    }
    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      die(`ffmpeg reported success but wrote no bytes to ${tmpOut}; stderr:\n${(res.stderr || '').trim()}`);
    }
    const late = frameProblems(probeFrames(tmpOut), { frames, fps, from, declared: parseBlankRanges(fs.readFileSync(pagePath, 'utf8')) });
    // A missing frame is a broken encode; a flat frame may be a colour block or a flash, so it only advises.
    const broken = late.filter((l) => !l.includes(' blank;'));
    if (broken.length) { for (const f of [tmpOut, tmpWeb].filter(Boolean)) fs.rmSync(f, { force: true }); throw new InvariantError(broken); }
    const advice = late.filter((l) => l.includes(' blank;'));
    const place = async (video, out) => {
      const mixed = wantAudio && await muxPageAudio(page, pagePath, { video, out, duration: dur, explicit: opts.audio === true });
      if (mixed) fs.rmSync(video, { force: true });
      else fs.renameSync(video, out);
      return mixed;
    };
    const mixed = await place(tmpOut, outPath);
    if (tmpWeb) await place(tmpWeb, webPath);
    const level = opts.checks && !mixed && from === 0 && durArg == null ? await opts.checks.run('sound', () => mixLevel(page, pagePath, dur)) : null;
    const profile = costLines({ kArr, reused, fps, from, prepassMs, captureMs, encodeMs });
    return { frames, subframes: totalSub, reused: reused.reduce((a, b) => a + b, 0), prepassMs, captureMs, encodeMs, dur, audio: Boolean(mixed), restarted, probe, level, motion, advice, profile, web: webPath };
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

// A final writes two files: the master (x264, dithered) and next to it a small web copy (AV1 10-bit).
export const webOut = (outPath) => outPath.replace(/(\.mp4)?$/, '.web.mp4');

export function defaultOut(pagePath, { aspect, suffixAspect, final, from = 0, to = null }) {
  const abs = path.resolve(pagePath);
  const base = path.basename(abs, '.html');
  const name = base === 'page' ? path.basename(path.dirname(abs)) : base;
  const range = !final && (from > 0 || to != null) ? `-${from}-${to ?? 'end'}` : '';
  return path.join('out', `${name}${suffixAspect ? `-${aspect.replace(':', 'x')}` : ''}${final ? '' : '-draft'}${range}.mp4`);
}

function motionFindings(pagePath, motion) {
  const boxes = motion.boxes;
  const records = boxes ? mergeRecords(motion.records, recordsFromBoxes(boxes)) : motion.records;
  return unwaived(motionLint({ records, scripted: motion.scripted && !boxes }), pageAuthoring(pagePath));
}

function motionAdvice(pagePath, motion) {
  const lines = lintLines(motionFindings(pagePath, motion));
  if (!lines.length) return [];
  const out = [...lines, 'waive a rule line with its code in authoring.allow and a _why'];
  if (motion.boxes?.canvas) out.push(`motion lint read element boxes over time; the motion inside ${motion.boxes.canvas} canvas (2D or WebGL) is out of its scope`);
  return out;
}

// Text and spec probes read layout only, so their seeks skip the paint barrier that a screenshot needs.
const seekLayout = (page) => (ms) => page.evaluate((t) => window.__pageSeek(t / 1000), ms);

/**
 * The live page's motion records and text samples: what the draft check reads besides the video. `checks` (harness/lib/check-runner.mjs)
 * gates each probe by tier and caches it; the default runs every tier with no cache. `from` is the film second the
 * samples start at, and `whole` is false for a window, where the brief's spec rows (film-long times) are not read.
 */
export async function probePage(page, dur, pagePath, { checks = createChecks({ pagePath, mode: 'full', cache: false }), from = 0, whole = true } = {}) {
  const window = { from, dur };
  const tables = dropGuesses(parseBriefTables(readBrief(pagePath))).set;
  const found = await checks.run('motion', () => runMotionCollector(page), window);
  const boxes = found?.scripted ? await checks.run('box-motion', () => sampleBoxTracks(page, lintTimes(dur), 'visible'), window) : undefined;
  const text = await checks.run('text', () => sampleText(page, dur, seekLayout(page), from), window);
  const contrast = await checks.run('contrast', () => sampleContrast(page, text.samples, (ms) => seekAll(page, ms)), window);
  const specKey = { tables, dur };
  const spec = whole ? await checks.run('spec', () => sampleSpec(page, tables, seekLayout(page), dur, { objects: false }), specKey) : null;
  const objects = spec && tables.objects.length ? reviveObjects(await checks.run('objects', () => sampleObjects(page, tables, spec, dur), specKey)) : undefined;
  return { motion: { ...found, ...(boxes ? { boxes } : {}) }, probe: { ...text, contrast, spec: spec && { ...spec, objects: objects ?? null } } };
}

/** The draft-check advice that needs the live page but no video: { text, brief, lines }, waivers applied. */
export function pageAdvice(pagePath, { probe, motion }) {
  const authoring = pageAuthoring(pagePath);
  const brief = readBrief(pagePath);
  const dir = path.relative(process.cwd(), path.dirname(path.resolve(pagePath)));
  const contrast = isWaived(authoring, 'text-low-contrast') ? [] : contrastLines(probe.contrast);
  const directions = directionsLines(brief, dir).filter((l) => !(l.startsWith('attractor:') && isWaived(authoring, 'attractor')));
  return {
    text: textProblems(probe.samples, probe),
    brief: isWaived(authoring, 'no-brief') ? null : briefLine(brief),
    lines: [...frameUnitLines(probe.samples, probe), ...textCollisionLines(probe.samples), ...contrast, ...motionAdvice(pagePath, motion), ...directions, ...recipeEchoLines(brief)],
  };
}

/** { problems, measures } of the draft video from one read (stills, held worlds, blank runs, tail tiles, smoothness), or null when ffmpeg fails. */
export async function videoChecks(mp4, pagePath, checks) {
  const authoring = pageAuthoring(pagePath);
  const shots = dropGuesses(parseBriefTables(readBrief(pagePath))).set.shots;
  try {
    return await checks.run('video', () => { const read = readVideo(mp4); return { problems: videoProblems(read, authoring), measures: videoMeasures(read, authoring, shots) }; }, { authoring, shots });
  } catch (e) { console.error(`  video not read: ${e.message}`); return null; }
}

const NOTE_LINES = /^(waive a rule line|motion lint read element boxes)/;

/**
 * What a draft says about itself: { red, notes, rows, was, sync }. `red` is what the terminal shows (the red acceptance
 * rows, then the advice that no row covers); `notes` is every line, for out/<film>.dev.md. A window has no acceptance
 * table and no video checks: its text and motion advice is all red.
 */
async function draftReport(mp4, pagePath, { probe, level, motion, advice: blanks, whole, checks }) {
  const authoring = pageAuthoring(pagePath);
  const page = pageAdvice(pagePath, { probe, motion });
  const video = whole ? await videoChecks(mp4, pagePath, checks) : null;
  const problems = mergeProblems(video?.problems ?? [], page.text);
  const sound = soundLine(level?.I ?? null);
  const peak = peakLine(level?.TP ?? null);
  const advice = [...blanks, ...draftAdvice(problems, sound, page.brief), ...[peak].filter(Boolean), ...page.lines];
  const table = whole ? await checks.time('acceptance', async () => draftAcceptance({ mp4, pagePath, probe, level, findings: motionFindings(pagePath, motion), video: video?.measures, mode: checks.mode })) : null;
  const inRows = new Set(whole ? [...problems, sound, peak, ...textCollisionLines(probe.samples), ...contrastLines(probe.contrast)] : []);
  const loose = advice.filter((l) => !inRows.has(l) && !NOTE_LINES.test(l)).map((l) => `advice: ${l}`);
  const taste = [...draftTasteLines([...problems, sound, peak].filter(Boolean)), ...(/<audio/i.test(fs.readFileSync(pagePath, 'utf8')) ? ['', ...tasteLines('sound')] : [])];
  return { red: [...(table ? table.rows.filter((r) => r.status === 'advice').map(redLine) : []), ...loose], notes: { advice, taste, rows: table?.rows ?? [] }, rows: table?.rows ?? null, was: table?.was ?? null, sync: table?.sync ?? null };
}

function writeDevNotes(mp4, { timing, advice, taste, rows }) {
  const file = path.resolve('out', `${nameOfFilm(mp4)}.dev.md`);
  const body = [`# ${nameOfFilm(mp4)} draft`, '', timing, '', '## Draft check', '', ...draftCheckLines(advice), '', '## Acceptance', '', ...(rows.length ? fullTable(rows) : ['not measured in this draft']), '', '## Taste', '', ...taste, ''];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body.join('\n'));
  return path.relative(process.cwd(), file);
}

const nameOfFilm = (mp4) => path.basename(mp4, '.mp4').replace(/-draft.*$/, '');

async function printDraft(mp4, pagePath, r, { checks, taste, next, opts, from }) {
  let look = '';
  try { await checks.time('sheet', async () => { const { out, frames, fastest } = writeDraftSheet({ video: mp4, out: mp4.replace(/\.mp4$/, '.png'), fps: opts.fps, from }); look = `  look: ${out} (frames at ${frames.join(', ')} s; fastest motion at ${fastest} s)`; }); } catch (e) { console.error(`  no key-frame sheet: ${e.message}`); }
  const report = await draftReport(mp4, pagePath, { ...r, whole: from === 0 && opts.durArg == null, checks });
  checks.save();
  const timing = timeLine({ captureMs: r.captureMs, encodeMs: r.encodeMs, checks: checks.seconds() });
  const notes = writeDevNotes(mp4, { timing, ...report.notes });
  const checkSeconds = checks.seconds().reduce((a, [, s]) => a + s, 0).toFixed(1);
  appendRun(pagePath, devEvent({ tier: checks.mode, wallS: process.uptime(), captureS: r.captureMs / 1000, checks: checks.seconds(), cache: checks.cache(), rows: report.rows }));
  const head = report.rows ? summaryLine(report.rows, report.was) : `checks on this window: ${report.red.length} red`;
  console.log([timing, look, ...report.red, ...(taste ? ['', ...report.notes.taste] : []), report.sync, `${head} · checks ${checkSeconds} s · details ${notes}${next ? ` · next: ${next}` : ''}`].filter((l) => l !== null && l !== '').join('\n'));
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const valueFlags = new Set(['--aspect', '--fps', '--from', '--dur', '--to', '--blur', '--w', '--h', '--workers', '--next']);
  const positional = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
  const [pagePath, outArg] = positional;
  if (!pagePath) {
    die('usage: node harness/media/render-page.mjs <page.html> [out.mp4] [--aspect 16:9|9:16|1:1|4:5|4:3|all] [--fps N] '
      + '[--from s] [--dur s | --to s] [--blur N] [--w px] [--h px] [--workers N] [--final] [--audio] [--profile] [--fast | --full] [--taste] [--next cmd]', 2);
  }
  if (!fs.existsSync(pagePath)) die(`no such file: ${pagePath}`);
  const drift = briefProblems(pagePath);
  if (drift.length) { for (const p of drift) console.error(errorLine(p)); process.exit(2); }
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
      blur: Number(flag('--blur', final ? 32 : 1)), from, durArg, progress: argv.includes('--progress') || (final && Boolean(process.stdout.isTTY)),
      workers: flag('--workers', null) && Number(flag('--workers', null)),
      audio: argv.includes('--audio') ? true : undefined,
      checks: final ? undefined : createChecks({ pagePath, mode: argv.includes('--full') ? 'full' : argv.includes('--fast') ? 'fast' : 'draft' }),
    };
    const frame = resolveFrame(pagePath, opts);
    const outPath = outArg || defaultOut(pagePath, { aspect, suffixAspect: all, final, from, to: durArg != null ? from + durArg : null });
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const r = await renderPage(pagePath, outPath, opts).catch((e) => {
      if (!(e instanceof InvariantError)) throw e;
      for (const p of e.problems) console.error(errorLine(p));
      process.exit(2);
    });
    console.log(`✓ ${outPath}: ${r.frames} frame(s) at ${opts.fps}fps, ${Math.round(frame.width * frame.scale)}x${Math.round(frame.height * frame.scale)} (${aspect}), ${from}s-${(from + r.dur).toFixed(2)}s`
      + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}${r.audio ? ', audio mixed' : ''}${r.restarted.length ? `, restarted slice(s) ${r.restarted.join(' ')}` : ''}`
      + `${final ? `, prepass ${(r.prepassMs / 1000).toFixed(1)}s, capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s` : ''}`);
    if (r.web) console.log(`  web copy: ${r.web} (${(fs.statSync(r.web).size / 1e6).toFixed(1)} MB; master ${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
    if (!final) await printDraft(outPath, pagePath, r, { checks: opts.checks, taste: argv.includes('--taste'), next: flag('--next', null), opts, from });
    else {
      if (!argv.includes('--job')) appendRun(pagePath, shipEvent({ verdict: null, renderS: (r.prepassMs + r.captureMs + r.encodeMs) / 1000 }));
      if (r.advice.length) console.log(adviceBlock(r.advice).join('\n'));
    }
    if (argv.includes('--profile')) console.log(r.profile.join('\n'));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
