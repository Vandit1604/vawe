// scripts/gates/tile.mjs: lay PNG tiles into one contact sheet.
//
// The xstack + pad + fill=white graph was written twice (compare.mjs, judge.mjs) with small differences
// that were accidents rather than decisions. One implementation, so a sheet from one tool reads the same
// as a sheet from the next, and so a fix to the ffmpeg graph lands everywhere at once.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ff = (a) => execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });

// ffmpeg drawtext takes a filtergraph argument: `:` splits options and `'` closes the quote.
export const safeLabel = (s) => String(s).replace(/[:']/g, '');

// extract one frame of `src` at `t` seconds, letterboxed to tw×th on white, optionally labelled.
export function frameTile(src, t, out, { tw, th, label } = {}) {
  const vf = [`scale=${tw}:${th}:force_original_aspect_ratio=decrease`,
    `pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:white`];
  if (label) vf.push(`drawtext=text='${safeLabel(label)}':x=10:y=10:fontsize=22:fontcolor=black:box=1:boxcolor=white@0.85:boxborderw=6`);
  const at = src.endsWith('.png') ? [] : ['-ss', Number(t).toFixed(2)];
  ff(['-y', ...at, '-i', src, '-frames:v', '1', '-vf', vf.join(','), out]);
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

// tile box for a given video aspect: scrutiny-sized, not thumbnails.
export const tileBox = (landscape) => (landscape ? { tw: 600, th: 338 } : { tw: 340, th: 604 });

export const baseOf = (p) => path.basename(p).replace(/\.[^.]+$/, '');

// renderOf(sceneJson) → the mp4 the RENDERER actually writes for it. `.expanded` is a build artifact
// (scripts/author/expand-blocks.mjs), and cmd/render/main.go:188 trims it so a scene never ships as
// "x.expanded.mp4". Two gates kept their own copy of that name and only stripped `.json`, so
// `make judge D=<x>.expanded.json` looked for a file the renderer never writes. Normally that is a
// clean "render first" error; when a stale `x.expanded.mp4` from an earlier film is lying in out/, the
// judge grades THAT and reports a clean run on a video the author never made. Observed exactly once,
// on a rewritten film whose predecessor's render was still on disk. scripts/gates/seam-snap.mjs had
// the right rule all along; this is that rule, in one place, for every consumer.
export const renderOf = (scenePath) =>
  path.join('out', `${path.basename(scenePath).replace(/\.(expanded\.)?json$/, '')}.mp4`);
