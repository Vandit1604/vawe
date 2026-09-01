// scripts/lib/scratch.mjs: ONE answer to "where does a review artifact go", and one that fails loudly.
//
// The tools that write contact sheets each decided this for themselves, and two of them decided it
// twice in the same file: the frames directory honoured CLAUDE_JOB_DIR while the sheet path stayed a
// `/tmp/...` literal. When the job dir is set, the parent of that literal is never created, ffmpeg
// cannot open its output, and nothing notices. SpawnSync's status was dropped on the floor, so
// `make reveal` printed the sheet's path and exited 0 with no sheet anywhere on disk. Worse, it then
// stamped a review receipt, so the gate that exists to prove somebody LOOKED was satisfied by an
// image that was never written (docs/MISTAKES.md #254).
//
// Both halves of that failure are addressed here rather than at the call site, because the call site
// is where it was got wrong twice already:
//   scratch('reveal', `${slug}.png`)  → an absolute path whose PARENT EXISTS, under one base
//   ffmpegOrDie(args, out, what)      → non-zero status or a missing output file is a thrown error
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
