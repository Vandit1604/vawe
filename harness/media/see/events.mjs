// The I/O of the in-shot events: what changes in a film's frame around a second. The measure is events-math.mjs changeRegion.
import { spawnSync } from 'node:child_process';
import { changeRegion } from './events-math.mjs';

const W = 96, H = 54;
const FRAMES = 6;

/** The change in the frame from one frame before `t` to four frames after it, as changeRegion, or null when the frames cannot be read. */
export function whatMovesAt(video, t, fps) {
  const from = Math.max(0, t - 1 / fps);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', from.toFixed(3), '-i', video, '-frames:v', String(FRAMES), '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  if (r.status !== 0 || r.stdout.length < W * H * 2) return null;
  const n = Math.floor(r.stdout.length / (W * H));
  const plane = (i) => new Uint8Array(r.stdout.subarray(i * W * H, (i + 1) * W * H));
  return changeRegion(plane(0), plane(n - 1), W, H);
}
