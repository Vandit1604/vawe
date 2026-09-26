// quality/gates/tile.mjs: lay PNG tiles into one contact sheet.
//
// The xstack + pad + fill=white graph was written twice (compare.mjs, judge.mjs) with small differences
// that were accidents rather than decisions. One implementation, so a sheet from one tool reads the same
// as a sheet from the next, and so a fix to the ffmpeg graph lands everywhere at once.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });

// ffmpeg drawtext takes a filtergraph argument: `:` splits options and `'` closes the quote.
export const safeLabel = (s) => String(s).replace(/[:']/g, '');

// extract one frame of `src` at `t` seconds, letterboxed to tw×th on white, optionally labelled.
export function frameTile(src, t, out, { tw, th, label } = {}) {
  const vf = [`scale=${tw}:${th}:force_original_aspect_ratio=decrease`,
    `pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:white`];
  if (label) vf.push(`drawtext=text='${safeLabel(label)}':x=10:y=10:fontsize=22:fontcolor=black:box=1:boxcolor=white@0.85:boxborderw=6`);
  // -ss AFTER -i, which is the frame-accurate seek. Before -i, ffmpeg does the fast one: it jumps to
  // the nearest KEYFRAME and decodes from there, and a draft render has sparse keyframes, so a tile
  // labelled 13.4s could be seconds off or come back blank. That is not a cosmetic difference here:
  // every sheet this builds is read BY EYE and treated as what the film does at that moment, so an
  // inaccurate seek makes the judging gate lie about the thing it exists to show. It cost a false
  // reading of two defects that were not in the film. Accurate seeking decodes from the last keyframe
  // and is slower per tile; a sheet is a handful of tiles, so the cost is invisible and the alternative
  // is a gate you cannot trust.
  const at = src.endsWith('.png') ? [] : ['-ss', Number(t).toFixed(2)];
  ff(['-y', '-i', src, ...at, '-frames:v', '1', '-vf', vf.join(','), out]);
  return out;
}

// tile PNGs into a grid. `gap` is the white gutter drawn around every tile.
export function tileGrid(tiles, { cols = 3, tw, th, gap = 2, out }) {
  if (!tiles.length) throw new Error('tileGrid: no tiles');
  const W = tw + gap * 2, H = th + gap * 2;
  const pads = tiles.map((_, i) => `[${i}:v]pad=${W}:${H}:${gap}:${gap}:white[p${i}]`).join(';');
  const chain = tiles.map((_, i) => `[p${i}]`).join('');
  const filter = tiles.length === 1
    ? `${pads};[p0]null`
    : `${pads};${chain}xstack=inputs=${tiles.length}:layout=${tiles.map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join('|')}:fill=white`;
  ff(['-y', ...tiles.flatMap((t) => ['-i', t]), '-filter_complex', filter, out]);
  return out;
}

// blendDiff(a, b, out): ffmpeg's own difference blend between two same-size PNGs, black where they
// agree, lit where they don't. Same "one owner" reasoning as tileGrid: a second hand-rolled
// blend=all_mode=difference call is exactly the kind of duplicate this file exists to prevent.
export function blendDiff(a, b, out) {
  ff(['-y', '-i', a, '-i', b, '-filter_complex', 'blend=all_mode=difference', out]);
  return out;
}

// ssimOf(a, b): mean SSIM (ffmpeg's own "All:" figure) between two same-size PNGs, or null if ffmpeg
// printed no summary line (a size mismatch is the usual cause, and null is a fact worth keeping, not a
// zero to average away).
export function ssimOf(a, b) {
  const r = spawnSync('ffmpeg', ['-i', a, '-i', b, '-filter_complex', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /All:([\d.]+)/.exec(r.stderr || '');
  return m ? Number(m[1]) : null;
}

// tile box for a given video aspect: scrutiny-sized, not thumbnails.
export const tileBox = (landscape) => (landscape ? { tw: 600, th: 338 } : { tw: 340, th: 604 });

export const baseOf = (p) => path.basename(p).replace(/\.[^.]+$/, '');

// renderOf(sceneJson) → the mp4 the RENDERER actually writes for it. `.expanded` is a build artifact
// (harness/author/expand-blocks.mjs), and cmd/render/main.go:188 trims it so a scene never ships as
// "x.expanded.mp4". Two gates kept their own copy of that name and only stripped `.json`, so
// `make judge D=<x>.expanded.json` looked for a file the renderer never writes. Normally that is a
// clean "render first" error; when a stale `x.expanded.mp4` from an earlier film is lying in out/, the
// judge grades THAT and reports a clean run on a video the author never made. Observed exactly once,
// on a rewritten film whose predecessor's render was still on disk. quality/gates/seams.mjs had
// the right rule all along; this is that rule, in one place, for every consumer.
export const renderOf = (scenePath) =>
  path.join('out', `${path.basename(scenePath).replace(/\.(expanded\.)?json$/, '')}.mp4`);

// EXISTS IS NOT FRESH, and the comment above stops one step short of its own lesson. Resolving the
// right NAME was half the bug: the other half is that `out/x.mp4` can be the right name for a film the
// author has since rewritten, and every consumer of this path checks only `existsSync`. So an author
// edits a scene, runs `make judge`, and is handed a verdict about a video that no longer exists. There
// is no error, because nothing is wrong with the file: it is simply the previous answer.
//
// Named `gradeable` rather than folded into `renderOf`, because `renderOf` is also the right function
// for asking where a render WILL go, and a resolver that refuses a path it is about to create would be
// wrong. A grader wants the other question, and it is the one that has bitten.
//
// mtime and not a content hash: the render is minutes of work and the scene is a text file, so the
// question is only ever "was the film written after the frames were made". A hash would be exact,
// slower, and would still need a place to keep the answer, which is a second fact to go stale.
// "10228 minute(s)" is a number a reader has to convert before it means anything, and the whole point
// of the line is that it should land immediately.
const ago = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 90) return `${m} minute(s)`;
  const h = Math.round(m / 60);
  return h < 36 ? `${h} hour(s)` : `${Math.round(h / 24)} day(s)`;
};

export function gradeable(scenePath, mp4 = renderOf(scenePath)) {
  if (!fs.existsSync(mp4)) return { ok: false, why: `no rendered video at ${mp4}`, fix: `make video D=${scenePath}` };
  if (!scenePath.endsWith('.json')) return { ok: true, mp4 };
  const src = fs.statSync(scenePath).mtimeMs, out = fs.statSync(mp4).mtimeMs;
  if (src > out) {
    return { ok: false, mp4,
      why: `${mp4} is ${ago(src - out)} older than ${scenePath}. It is a render of a film you have since edited`,
      fix: `make video D=${scenePath}` };
  }
  return { ok: true, mp4 };
}
