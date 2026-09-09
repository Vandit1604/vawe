// quality/gates/sweep-static.mjs: does the film's PIXELS ever move, mechanically checked.
//
// Adapted from another engine' `check` sweep_static. Every other gate that touches motion reads the JSON:
// static-bg (beat-check.mjs) asks whether a DECLARED bg window carries `var(--t)`/`var(--p)` so it CAN
// animate. It never looks at the render, so a film that declares a moving preset but whose camera,
// cuts and content all sit frozen for the whole runtime still passes it clean. This gate reads the
// rendered mp4 instead and asks the only question that matters at the end: did the pixels change.
//
//   node quality/gates/sweep-static.mjs formats/scene/<file>.json   ·   make sweep-static D=<file>
//
// Requires out/<name>.mp4 (render first; the pixels only exist after render, same reason seam-snap.mjs
// needs the mp4 and not renderFrame). Missing or stale render: reported, not a crash, exit 0, because
// this is a post-render gate and a caller running it pre-render should not be blocked by it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { gradeable, renderOf } from './tile.mjs';
import { gateFindings } from '../../scripts/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// A film under this length is a title card or a stinger: a single held frame for its whole runtime is
// a legitimate choice there, not a frozen timeline. 3s is where a hold stops reading as a beat and
// starts reading as the whole film.
const MIN_DURATION_FOR_CHECK = 3;

// Consecutive-sample mean pixel change, normalized 0..1, below which a pair counts as "no visible
// change". Measured against a 32x32 grayscale downsample: real motion (a pan, a cut, a text reveal)
// moves this by several percent even between frames a third of a second apart; JPEG-in-mp4 quantization
// noise on a genuinely still frame sits under a tenth of a percent. 0.005 (0.5%) sits well above the
// noise floor and well below the smallest real edit this repo authors.
const CHANGE_THRESHOLD = 0.005;

// Evenly spaced sample count. Enough to catch a mid-film freeze that a first/last/middle check would
// step over, cheap enough to run on every render (under a dozen ffmpeg frame-pulls, each near-instant).
const SAMPLE_COUNT = 10;

// downsample size for the diff. Small enough that decode + read is instant, large enough that a real
// cut or pan (which changes composition, not just brightness) cannot hide inside it.
const TILE = 32;

// mean absolute pixel difference between two same-size grayscale buffers, normalized 0..1. Exported
// for the self-check: it is the whole metric, and it needs no render to test.
export function meanAbsDiff(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length / 255;
}

// FAIL only when the WHOLE film is frozen: every consecutive sampled pair reads as unchanged. One
// still pair is a legitimate held beat; this must not flag it (another engine' persistence rule).
export function verdict(changes, duration) {
  const readable = changes.filter((c) => c != null);
  if (!readable.length) return { fail: false, maxChange: null };
  const maxChange = Math.max(...readable);
  const fail = duration >= MIN_DURATION_FOR_CHECK && maxChange < CHANGE_THRESHOLD;
  return { fail, maxChange };
}

// Everything below touches ffmpeg/ffprobe and a real scene path, so it only runs when this file is the
// entry point, never on `import { meanAbsDiff, verdict } from './sweep-static.mjs'`.
const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isMain) {
  const f = gateFindings();

  const dataArg = process.argv[2];
  if (!dataArg || !fs.existsSync(dataArg)) {
    console.error('usage: node quality/gates/sweep-static.mjs <scene.json>');
    process.exit(2);
  }

  const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');
  const mp4 = path.join(ROOT, renderOf(dataArg));

  const ready = gradeable(dataArg, mp4);
  if (!ready.ok) {
    console.error(`  sweep-static: ${ready.why}. render first: ${ready.fix}`);
    f.emit();
    process.exit(0);
  }

  const requireTool = (bin) => {
    const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
    if (r.error?.code === 'ENOENT' || r.status !== 0) {
      console.error(`✗ sweep-static cannot run: ${bin} is not on PATH or failed to start.`);
      process.exit(2);
    }
  };
  requireTool('ffprobe');
  requireTool('ffmpeg');

  const probeFps = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
  const fps = (() => {
    const m = /^(\d+)(?:\/(\d+))?/.exec(String(probeFps.stdout).trim());
    const v = m ? (+m[1] / (m[2] ? +m[2] : 1)) : 0;
    if (!(v > 0)) {
      console.error(`✗ sweep-static: ffprobe read no frame rate out of ${mp4}.`);
      process.exit(2);
    }
    return v;
  })();

  const probeTotal = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames', '-of', 'default=nk=1:nw=1', mp4]);
  const total = parseInt(String(probeTotal.stdout).trim(), 10) || 0;
  if (!total) {
    console.error(`✗ sweep-static: ffprobe could not count the frames in ${mp4}.`);
    process.exit(2);
  }
  const durationSec = total / fps;

  // pull one frame, downscaled to TILE×TILE grayscale, as raw bytes (one byte per pixel).
  const framePixels = (frameIdx) => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf',
      `select=eq(n\\,${frameIdx}),scale=${TILE}:${TILE},format=gray`,
      '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 20 });
    return r.stdout && r.stdout.length >= TILE * TILE ? r.stdout : null;
  };

  const sampleFrames = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = (i / (SAMPLE_COUNT - 1)) * durationSec;
    sampleFrames.push(Math.min(total - 1, Math.max(0, Math.round(t * fps))));
  }
  const pixels = sampleFrames.map(framePixels);
  const changes = [];
  for (let i = 1; i < pixels.length; i++) changes.push(meanAbsDiff(pixels[i - 1], pixels[i]));

  const unread = changes.filter((c) => c == null).length;
  const { fail, maxChange } = verdict(changes, durationSec);

  if (fail) {
    f.fail('sweep-static',
      `the rendered film shows no geometry change across ${SAMPLE_COUNT} samples over ${durationSec.toFixed(1)}s; ` +
      'a frozen timeline makes every other green verdict unreliable.',
      { at: `out/${name}.mp4`, doc: 'AGENTS.md' });
    console.error(`✗ sweep-static: max change ${(maxChange * 100).toFixed(3)}% across ${SAMPLE_COUNT} samples over ${durationSec.toFixed(1)}s, all below the ${(CHANGE_THRESHOLD * 100).toFixed(1)}% floor.`);
    f.emit();
    process.exit(1);
  }

  if (maxChange == null) {
    console.error(`  sweep-static: ${unread} of ${changes.length} sample pair(s) would not decode, verdict skipped.`);
    f.emit();
    process.exit(0);
  }

  console.log(`✓ sweep-static: max change ${(maxChange * 100).toFixed(3)}% across ${SAMPLE_COUNT} samples over ${durationSec.toFixed(1)}s (floor ${(CHANGE_THRESHOLD * 100).toFixed(1)}%)${unread ? `, ${unread} pair(s) unread` : ''}.`);
  f.emit();
  process.exit(0);
}
