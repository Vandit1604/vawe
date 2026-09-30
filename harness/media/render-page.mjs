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
// Capture is split into fixed 60-frame slices, `--workers` of them at once (default min(4, cpus-1)), each on
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
import { openPreview, treeSignature } from './preview-server.mjs';
import { writeDraftSheet } from './draft-sheet.mjs';
import { sampleText, videoProblems } from './draft-check.mjs';
import { textProblems, soundLine, briefLine, mergeProblems, draftAdvice, draftCheckLines } from '../lib/draft-check.mjs';
import { directionsLines } from '../lib/directions.mjs';
import { referenceFor, motionStampFresh, pageAuthoring } from '../lib/motion-stamp.mjs';
import { isWaivedBy, hasReason } from '../lib/waivers.mjs';
import { draftTasteLines, tasteLines } from '../lib/taste-steps.mjs';
import { runMotionCollector, motionLint, unwaived, lintLines, recordsFromBoxes } from '../lib/motion-lint.mjs';
import { sampleBoxTracks, lintTimes } from '../lib/box-track.mjs';
import { adviceBlock, errorLine } from '../lib/advice.mjs';
import { edgeTravelDeltas } from '../lib/edge-travel.mjs';
import { textCollisionLines } from '../lib/text-collision.mjs';
import { watchPageErrors, pageErrorLines } from '../lib/page-errors.mjs';

const defaultWorkers = () => Math.max(1, Math.min(4, os.cpus().length - 1));

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
  await opened.page.evaluateOnNewDocument(`(${installPageClock})();(${installPageFrame})(${JSON.stringify(frame)});window.__pageFonts = ${awaitFonts};window.__pageSeek = ${seekTo};`);
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

// A page that paints in window.seek or onFrame hooks has no animation records; its element boxes over
// time stand in for them. Call it after runMotionCollector, which must see the animations before any seek.
async function collectPageMotion(page, dur) {
  const motion = await runMotionCollector(page);
  if (!motion.scripted) return motion;
  return { ...motion, boxes: await sampleBoxTracks(page, lintTimes(dur), 'visible') };
}

const PIXEL_W = 64;

// Mean absolute luma difference (0-255) between consecutive frames downscaled to PIXEL_W wide, one
// low-quality screenshot per frame. An estimate of "how much of the picture moved", enough to tell a
// held frame from a fast one, decoded inside the page so the renderer needs no image library.
async function frameSpeedsFromPixels(pagePath, frame, frames, fps, from, workers) {
  const speeds = new Array(frames);
  const lumaAt = async (page, i) => {
    await seekAll(page, from * 1000 + (i / fps) * 1000);
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
  await runShards(pagePath, frame, frames, workers, async (page, i, local) => {
    local.prev ??= await lumaAt(page, i);
    const next = await lumaAt(page, i + 1);
    let sum = 0;
    for (let k = 0; k < next.length; k++) sum += Math.abs(next[k] - local.prev[k]);
    speeds[i] = sum / next.length;
    local.prev = next;
    return 2;
  }, { fps, from });
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
async function measureSubframes(page, { pagePath, frame, frames, fps, from, blur, workers }) {
  const boxes = await frameSpeedsFromBoxes(page, frames, fps, from);
  if (boxes) return clampSegments(boxes.map((px) => subframesForTravel(px * frame.scale, blur)));
  return clampSegments(bucketize(await frameSpeedsFromPixels(pagePath, frame, frames, fps, from, workers), blur, PIXEL_BANDS));
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

// The pixel estimate cannot measure travel: mean luma difference bands [still below, fast from].
const PIXEL_BANDS = [0.15, 1.5];
function bucketize(speeds, blur, [still, fast]) {
  const mid = Math.min(blur, 4);
  return speeds.map((s) => (s < still ? 1 : s < fast ? mid : blur));
}

function clampSegments(kArr, cap = 200) {
  let segs = kArr.length ? 1 : 0;
  for (let i = 1; i < kArr.length; i++) if (kArr[i] !== kArr[i - 1]) segs++;
  if (segs <= cap) return kArr;
  const maxK = Math.max(1, ...kArr);
  return kArr.map(() => maxK);
}

// Runs work(page, i, local) for every frame 0..frames-1 in fixed SLICE_FRAMES slices, `workers` slices at
// a time, each slice on its own recycled page. work returns how many seeks it made; `local` is that slice's own state.
// A slice whose browser or page dies is restarted once from its first frame (returns the restarted
// slices as "lo-hi s" strings); a second death exits 2. `clock` is { fps, from } and only names the time range.
const LOST_PAGE = /Connection closed|Target closed|No target with given id|Session closed|Protocol error|timed out|timeout/i;

async function runShards(pagePath, frame, frames, workers, work, clock) {
  const slices = [];
  for (let lo = 0; lo < frames; lo += SLICE_FRAMES) slices.push([lo, Math.min(frames, lo + SLICE_FRAMES)]);
  const restarted = [];
  let next = 0;
  const range = ([lo, hi]) => `${(clock.from + lo / clock.fps).toFixed(2)}-${(clock.from + hi / clock.fps).toFixed(2)}s`;
  const runSliceOnce = async ([lo, hi]) => {
    const local = {};
    let opened = null;
    let sinceOpen = 0;
    try {
      for (let i = lo; i < hi; i++) {
        if (opened && sinceOpen >= RECYCLE_SUBFRAMES) { await opened.close().catch(() => {}); opened = null; }
        if (!opened) {
          opened = await openPage(pagePath, frame);
          await opened.page.goto(opened.url, { waitUntil: 'load' });
          sinceOpen = 0;
        }
        sinceOpen += await work(opened.page, i, local);
      }
    } finally { if (opened) await opened.close().catch(() => {}); }
  };
  const runSlice = async (slice) => {
    try { await runSliceOnce(slice); } catch (e) {
      if (!LOST_PAGE.test(String(e && e.message))) throw e;
      restarted.push(range(slice));
      try { await runSliceOnce(slice); } catch (e2) {
        if (!LOST_PAGE.test(String(e2 && e2.message))) throw e2;
        die(`slice ${slice[0]}-${slice[1]} (${range(slice)}) lost its page twice: another process closed the shared browser, or the page crashed (${e2.message})`, 2);
      }
    }
  };
  const lane = async () => { while (next < slices.length) await runSlice(slices[next++]); };
  await Promise.all(Array.from({ length: Math.min(workers, slices.length) }, lane));
  return restarted;
}

async function captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, workers, onSubframe) {
  return runShards(pagePath, frame, frames, workers, async (page, i) => {
    const baseMs = from * 1000 + (i / fps) * 1000;
    const k = kArr[i];
    for (let j = 0; j < k; j++) {
      await seekAll(page, baseMs + (j / k) * SHUTTER * (1000 / fps));
      const idx = subframeStart[i] + j;
      await page.screenshot({ path: path.join(tmpDir, `f${String(idx).padStart(6, '0')}.png`), type: 'png', optimizeForSpeed: true });
      onSubframe();
    }
    return k;
  }, { fps, from });
}

// Same libx264 settings the Go renderer uses for its final and draft encodes (renderer/internal/encode/
// encode.go), except CRF 16 where encode.go uses 20: a page is captured lossless and CRF 16 keeps thin
// type and gradients clean. Draft is ultrafast.
function x264Args(final) {
  return final
    ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-preset', 'medium', '-crf', '16', '-tune', 'film', '-movflags', '+faststart']
    : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '20', '-movflags', '+faststart'];
}

// 8-bit yuv420p bands a dark gradient into visible rings; a faint fixed-seed temporal noise before the
// encode dithers them away (the final only, so draft pixels stay comparable). Strength 2 did not survive
// x264's smoothing on a test gradient; 4 with -tune film did.
// Chromium saves some frames as RGBA (mix-blend-mode, for one); a pixel-format change mid-sequence makes
// ffmpeg rebuild the filter graph, which resets the trims and drops frames. Keep one graph, one format.
const ONE_FORMAT_IN = ['-reinit_filter', '0'];

const DITHER = 'noise=alls=4:allf=t:all_seed=7';

export function ffmpegEncode(tmpDir, fps, kArr, subframeStart, tmpOut, final) {
  const seq = path.join(tmpDir, 'f%06d.png');
  const uniform = new Set(kArr).size <= 1;
  const blur = kArr[0] || 1;
  if (uniform) {
    const args = blur > 1
      ? ['-y', '-v', 'error', ...ONE_FORMAT_IN, '-framerate', String(fps * blur), '-i', seq,
        '-vf', `format=rgb24,tmix=frames=${blur}:weights='${Array(blur).fill('1').join(' ')}',`
          + `select='not(mod(n+1\\,${blur}))',setpts=N/${fps}/TB${final ? `,${DITHER}` : ''}`,
        '-r', String(fps), ...x264Args(final), tmpOut]
      : ['-y', '-v', 'error', ...ONE_FORMAT_IN, '-framerate', String(fps), '-i', seq,
        '-vf', final ? `format=rgb24,${DITHER}` : 'format=rgb24', ...x264Args(final), tmpOut];
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
    if (seg.k === 1) return `[in${idx}]trim=start_frame=${s}:end_frame=${e},setpts=N/${fps}/TB[${label}]`;
    const weights = Array(seg.k).fill('1').join(' ');
    return `[in${idx}]trim=start_frame=${s}:end_frame=${e},tmix=frames=${seg.k}:weights='${weights}',`
      + `select='not(mod(n+1\\,${seg.k}))',setpts=N/${fps}/TB[${label}]`;
  });
  const joins = segments.map((_, idx) => `[s${idx}]`).join('');
  // Each segment restarts its pts, so a 1-frame segment carries no duration and the next one overlaps
  // it; re-stamp after the concat and never let -r rate-convert, or ffmpeg drops the overlapped frames.
  const split = `[0:v]format=rgb24,split=${segments.length}${segments.map((_, idx) => `[in${idx}]`).join('')}`;
  const filterComplex = `${split};${filters.join(';')};${joins}concat=n=${segments.length}:v=1:a=0,setpts=N/${fps}/TB${final ? `,${DITHER}` : ''}[outv]`;
  const args = ['-y', '-v', 'error', ...ONE_FORMAT_IN, '-framerate', String(fps), '-i', seq,
    '-filter_complex', filterComplex, '-map', '[outv]',
    '-fps_mode', 'passthrough', ...x264Args(final), tmpOut];
  return spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
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
 * name="duration"> minus `from`), progress (false; prints a single overwriting capture-progress line).
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

    const motion = opts.probe ? await collectPageMotion(page, dur) : null;
    const probe = opts.probe ? await sampleText(page, dur, (ms) => seekAll(page, ms)) : null;
    const frames = Math.round(dur * fps);
    if (!(frames > 0)) die(`${pagePath}: ${dur}s at ${fps}fps rounds to 0 frames`);

    const workers = opts.workers || defaultWorkers();
    const tPre = Date.now();
    const kArr = blur > 1 ? await frameSubframes(page, { pagePath, frame, frames, fps, from, blur, workers }) : Array(frames).fill(1);
    const subframeStart = new Array(frames + 1);
    subframeStart[0] = 0;
    for (let i = 0; i < frames; i++) subframeStart[i + 1] = subframeStart[i] + kArr[i];
    const totalSub = subframeStart[frames];

    const t0 = Date.now();
    const prepassMs = t0 - tPre;
    let doneSub = 0;
    const tick = progress ? setInterval(() => {
      process.stdout.write(`\r  capturing ${doneSub}/${totalSub} subframe(s)...`);
    }, 1000) : null;
    const restarted = await captureFrames(pagePath, tmpDir, frames, kArr, subframeStart, fps, from, frame, workers, () => { doneSub++; });
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
    const late = frameProblems(probeFrames(tmpOut), { frames, fps, from, declared: parseBlankRanges(fs.readFileSync(pagePath, 'utf8')) });
    // A missing frame is a broken encode; a flat frame may be a colour block or a flash, so it only advises.
    const broken = late.filter((l) => !l.includes(' blank;'));
    if (broken.length) { fs.rmSync(tmpOut, { force: true }); throw new InvariantError(broken); }
    const advice = late.filter((l) => l.includes(' blank;'));
    const mixed = wantAudio && await muxPageAudio(page, pagePath, { video: tmpOut, out: outPath, duration: dur, explicit: opts.audio === true });
    if (mixed) fs.rmSync(tmpOut, { force: true });
    else fs.renameSync(tmpOut, outPath);
    appendRun(pagePath, { cmd: 'render-page', render: { file: outPath, frames, fps, ms: captureMs + encodeMs } });
    const level = opts.probe && !mixed ? await mixLevel(page, pagePath, dur) : null;
    return { frames, subframes: totalSub, prepassMs, captureMs, encodeMs, dur, audio: Boolean(mixed), restarted, probe, level, motion, advice };
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

function readBrief(pagePath) {
  try { return fs.readFileSync(path.join(path.dirname(path.resolve(pagePath)), 'brief.md'), 'utf8'); } catch { return null; }
}

function motionAdvice(pagePath, motion) {
  const boxes = motion.boxes;
  const records = boxes ? [...motion.records, ...recordsFromBoxes(boxes)] : motion.records;
  const lines = lintLines(unwaived(motionLint({ records, scripted: motion.scripted && !boxes }), pageAuthoring(pagePath)));
  const out = lines.length ? [...lines, 'waive a rule line with its code in authoring.allow and a _why'] : [];
  if (boxes?.canvas) out.push(`motion lint read element boxes over time; the motion inside ${boxes.canvas} canvas (2D or WebGL) is out of its scope`);
  return out;
}

function printDraftCheck(mp4, pagePath, { probe, level, motion, advice: blanks }) {
  let video = [];
  try { video = videoProblems(mp4); } catch (e) { console.error(`  no draft check on the video: ${e.message}`); }
  const problems = mergeProblems(video, textProblems(probe.samples, probe));
  const brief = readBrief(pagePath);
  const sound = soundLine(level);
  const dir = path.relative(process.cwd(), path.dirname(path.resolve(pagePath)));
  const advice = [...blanks, ...draftAdvice(problems, sound, briefLine(brief)), ...textCollisionLines(probe.samples), ...motionAdvice(pagePath, motion), ...directionsLines(brief, dir)];
  console.log(draftCheckLines(advice).join('\n'));
  const taste = ['', ...draftTasteLines([...problems, sound].filter(Boolean))];
  if (/<audio/i.test(fs.readFileSync(pagePath, 'utf8'))) taste.push('', ...tasteLines('sound'));
  console.log(taste.join('\n'));
}

function printDraftSheet(mp4, { fps, from }) {
  try {
    const { out, frames, fastest } = writeDraftSheet({ video: mp4, out: mp4.replace(/\.mp4$/, '.png'), fps, from });
    console.log(`  look: ${out} (frames at ${frames.join(', ')} s; fastest motion at ${fastest} s)`);
  } catch (e) { console.error(`  no key-frame sheet: ${e.message}`); }
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name, d) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
  const valueFlags = new Set(['--aspect', '--fps', '--from', '--dur', '--to', '--blur', '--w', '--h', '--workers']);
  const positional = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
  const [pagePath, outArg] = positional;
  if (!pagePath) {
    die('usage: node harness/media/render-page.mjs <page.html> [out.mp4] [--aspect 16:9|9:16|1:1|4:5|4:3|all] [--fps N] '
      + '[--from s] [--dur s | --to s] [--blur N] [--w px] [--h px] [--workers N] [--final] [--audio]', 2);
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
      blur: Number(flag('--blur', final ? 16 : 1)), from, durArg, progress: argv.includes('--progress') || (final && Boolean(process.stdout.isTTY)),
      workers: flag('--workers', null) && Number(flag('--workers', null)),
      audio: argv.includes('--audio') ? true : undefined,
      probe: !final && from === 0 && durArg == null,
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
      + `${opts.blur > 1 ? `, blur=${opts.blur} (${r.subframes} subframe(s))` : ''}${r.audio ? ', audio mixed' : ''}${r.restarted.length ? `, restarted slice(s) ${r.restarted.join(' ')}` : ''}, `
      + `prepass ${(r.prepassMs / 1000).toFixed(1)}s, capture ${(r.captureMs / 1000).toFixed(1)}s, encode ${(r.encodeMs / 1000).toFixed(1)}s`);
    if (!final) printDraftSheet(outPath, opts);
    if (r.probe) printDraftCheck(outPath, pagePath, r);
    else if (r.advice.length) console.log(adviceBlock(r.advice).join('\n'));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => die(e.stack || String(e)));
