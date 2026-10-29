// Pure parts of `vawe still`. No I/O and no heavy imports: harness/cli/verbs.mjs loads this file to check the arguments.
import path from 'node:path';
import { isUrl } from '../../lib/url.mjs';
import { atProblem } from './at-problem.mjs';
import { paramsFilm } from '../../lib/page-params.mjs';

const USAGE = 'usage: bin/vawe still <page|mp4> --at <s> [--out file.png]';

/** The first problem in the arguments of still, or null. Pure. */
export function stillProblem({ source, at }) {
  if (!source) return `missing <page|mp4>; ${USAGE}`;
  if (at === undefined) return `missing --at <s>, the second to write; ${USAGE}`;
  return atProblem(at);
}

/** The default PNG path: out/still/<film>[-<params>]-<seconds>s.png. Pure. */
export function stillPath(source, at) {
  const abs = isUrl(source) ? new URL(source).pathname : path.resolve(source);
  const base = path.basename(abs, path.extname(abs));
  const film = base === 'page' ? path.basename(path.dirname(abs)) : base;
  return path.resolve('out', 'still', `${paramsFilm(film)}-${at}s.png`);
}

/** The ffmpeg argv for one frame. A URL seeks on the input so ffmpeg reads one range, not the file up to the second. Pure. */
export function stillArgs(source, seek, out) {
  const ss = ['-ss', seek.toFixed(4)];
  const input = isUrl(source) ? [...ss, '-i', source] : ['-i', source, ...ss];
  return ['-v', 'error', '-y', ...input, '-frames:v', '1', out];
}
