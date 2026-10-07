// harness/media/see-views.mjs: the three views a critique loop LOOKS at, for a rendered film or a page.
//
//   phoneSheet(video, outDir)          the film at 360 px wide, one frame per second, on one sheet
//   stripSheet(video, t, outDir)       12 consecutive frames around t at the film fps (pops, overlaps)
//   loopSeam(video, outDir)            last 0.5 s then first 0.5 s, plus the first-vs-last pixel diff
//
// Wired into `node harness/media/see.mjs <video|page.html> --phone | --strip <t> | --loop`. Every view
// tiles with harness/lib/tile.mjs, the one owner of the sheet graph.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readPageMeta } from './render-page.mjs';
import { sampleFrames, tileGrid, blendDiff, meanColorOf, ssimOf } from '../lib/tile.mjs';

export function probe(video) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,avg_frame_rate', '-show_entries', 'format=duration', '-of', 'json', video], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout || '{}');
  const s = (j.streams || [])[0] || {};
  const [n, d] = String(s.avg_frame_rate || '30/1').split('/').map(Number);
  return { width: s.width, height: s.height, fps: n / (d || 1) || 30, dur: Number(j.format && j.format.duration) };
}

// A page is rendered as a half-size 30 fps draft with its audio mixed (the audio checks read it), and
// the draft is reused while it is newer than the page.
const hasAudioStream = (video) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', video], { encoding: 'utf8' }).stdout.trim() !== '';

export async function videoFor(input, { audio = true } = {}) {
  if (!input.endsWith('.html')) return input;
  const { renderPage, defaultOut } = await import('./render-page.mjs');
  const out = defaultOut(input, { aspect: '16:9', suffixAspect: false, final: false });
  const hasAudio = audio && /<audio\b/i.test(fs.readFileSync(input, 'utf8'));
  const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(input).mtimeMs;
  if (!fresh || (hasAudio && !hasAudioStream(out))) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await renderPage(input, out, { fps: 30, audio: hasAudio || undefined });
  }
  return out;
}

const frameBox = (w, h, long) => (w >= h ? { tw: long, th: Math.round(long * h / w) } : { tw: Math.round(long * w / h), th: long });

/** Contact sheet at phone width: 360 px wide tiles, 1 fps, time burned in. Reads how the film holds up small. */
export function phoneSheet(video, outDir) {
  const { width, height, dur } = probe(video);
  const tw = 360, th = Math.round(360 * height / width);
  const n = Math.max(1, Math.ceil(dur));
  fs.mkdirSync(outDir, { recursive: true });
  const frames = sampleFrames(video, { t0: 0, len: n, n }, path.join(outDir, 'phone'), { tw, th, stamp: '%{eif\\:t\\:d}s' });
  const cols = width >= height ? 4 : 6;
  const out = path.join(outDir, 'phone.png');
  tileGrid(frames, { cols, tw, th, out });
  frames.forEach((f) => fs.rmSync(f, { force: true }));
  return { sheet: out, frames: frames.length };
}

/** 12 consecutive frames centred on `t`, labelled with the frame number, at the film's own fps. */
export function stripSheet(video, t, outDir) {
  const { width, height, fps, dur } = probe(video);
  const n = 12;
  const first = Math.max(0, Math.min(Math.round(t * fps) - n / 2, Math.floor(dur * fps) - n));
  const { tw, th } = frameBox(width, height, width >= height ? 480 : 270);
  fs.mkdirSync(outDir, { recursive: true });
  const prefix = path.join(outDir, `strip-${t}`);
  const frames = sampleFrames(video, { t0: first / fps, len: n / fps, n }, prefix, { tw, th, stamp: `f%{eif\\:n+${first}\\:d}` });
  const out = `${prefix}.png`;
  tileGrid(frames, { cols: 4, tw, th, out });
  frames.forEach((f) => fs.rmSync(f, { force: true }));
  return { sheet: out, firstFrame: first, fps };
}

/**
 * Mean absolute pixel difference between two PNGs as a percent of full scale (0 identical, 100 black vs
 * white), and their SSIM. The diff is ffmpeg's own blend, averaged through meanColorOf.
 */
function pixelDiff(a, b, scratchPng) {
  blendDiff(a, b, scratchPng);
  const rgb = meanColorOf(scratchPng);
  const pct = rgb ? (rgb[0] + rgb[1] + rgb[2]) / 3 / 255 * 100 : null;
  return { pct, ssim: ssimOf(a, b) };
}

/**
 * The loop seam: the last frame flowing into the first should move about as much as any two adjacent
 * frames do. `seamPct` is last-vs-first, `tailPct` is the median diff between adjacent frames of the last
 * half second. A seam far above the tail is a jump; a seam of 0 on a film that moves is a doubled frame.
 */
export function loopSeam(video, outDir) {
  const { width, height, fps, dur } = probe(video);
  const n = Math.max(2, Math.round(fps / 2));
  const { tw, th } = frameBox(width, height, width >= height ? 320 : 180);
  fs.mkdirSync(outDir, { recursive: true });
  const tail = sampleFrames(video, { t0: dur - n / fps, len: n / fps, n }, path.join(outDir, 'loop-tail'), { tw, th, stamp: `end %{eif\\:n-${n - 1}\\:d}f` });
  const head = sampleFrames(video, { t0: 0, len: n / fps, n }, path.join(outDir, 'loop-head'), { tw, th, stamp: 'start +%{eif\\:n\\:d}f' });
  const out = path.join(outDir, 'loop.png');
  tileGrid([...tail, ...head], { cols: 5, tw, th, out });
  const tmp = path.join(outDir, 'loop-diff.png');
  const adjacent = tail.slice(1).map((f, i) => pixelDiff(tail[i], f, tmp).pct).filter((v) => v != null).sort((a, b) => a - b);
  const tailPct = adjacent.length ? adjacent[Math.floor(adjacent.length / 2)] : null;
  const seam = pixelDiff(tail[tail.length - 1], head[0], tmp);
  [...tail, ...head, tmp].forEach((f) => fs.rmSync(f, { force: true }));
  return { sheet: out, seamPct: seam.pct, seamSsim: seam.ssim, tailPct, frames: n };
}

export function describeLoop(r) {
  const fmt = (v) => (v == null ? 'n/a' : `${v.toFixed(2)}%`);
  const ratio = r.tailPct > 0 ? r.seamPct / r.tailPct : null;
  const verdict = r.seamPct == null ? 'unmeasured'
    : r.seamPct < 0.02 && r.tailPct > 0.2 ? 'doubled frame: the last frame equals the first, the loop stalls for one frame'
      : ratio != null && ratio > 3 && r.seamPct > 1 ? `jump: the seam moves ${ratio.toFixed(1)}x more than an ordinary frame step`
        : 'seam reads like an ordinary frame step';
  return `last-vs-first pixel diff ${fmt(r.seamPct)} (ssim ${r.seamSsim == null ? 'n/a' : r.seamSsim.toFixed(3)}); `
    + `typical step in the last 0.5 s ${fmt(r.tailPct)}: ${verdict}`;
}

/** The moment worth a strip when the caller names none: the page's spectacle, else the middle of the film. */
export function autoStripTime(input, video) {
  const spectacle = input.endsWith('.html') ? Number(readPageMeta(input, 'spectacle')) : NaN;
  return Number.isFinite(spectacle) ? spectacle : +(probe(video).dur / 2).toFixed(2);
}
