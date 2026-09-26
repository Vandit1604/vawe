// image that was never written (engine-doctrine/MISTAKES.md #254).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** The base every review artifact lives under. CLAUDE_JOB_DIR keeps concurrent agents from reading
 *  each other's sheets; without it this is plain /tmp, which is what the docs and Makefile promise. */
export const scratchBase = () =>
  process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : '/tmp';

/** Resolve a path under the scratch base and guarantee its parent directory exists. Callers pass path
 *  segments; the last one may be a file. Returns the absolute path. */
export function scratch(...parts) {
  const p = path.join(scratchBase(), ...parts);
  fs.mkdirSync(path.extname(p) ? path.dirname(p) : p, { recursive: true });
  return p;
}

/** Run ffmpeg and refuse to continue quietly. `out` is the file ffmpeg was told to produce: a zero
 *  status with no file is still a failure, and is the shape that hid here for as long as it did. */
export function ffmpegOrDie(args, out, what = 'ffmpeg') {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.error) throw new Error(`${what}: could not run ffmpeg (${r.error.message})`);
  if (r.status !== 0) throw new Error(`${what}: ffmpeg exited ${r.status}\n${(r.stderr || '').trim().slice(0, 600)}`);
  if (out && !fs.existsSync(out)) throw new Error(`${what}: ffmpeg reported success but wrote no ${out}`);
  return r;
}
