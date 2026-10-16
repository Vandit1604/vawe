// Pure parts of `vawe still`. No I/O and no heavy imports: harness/cli/verbs.mjs loads this file to check the arguments.
import path from 'node:path';

const USAGE = 'usage: bin/vawe still <page|mp4> --at <s> [--out file.png]';

/** The first problem in the arguments of still, or null. Pure. */
export function stillProblem({ source, at }) {
  if (!source) return `missing <page|mp4>; ${USAGE}`;
  if (at === undefined) return `missing --at <s>, the second to write; ${USAGE}`;
  if (!(at !== '' && Number.isFinite(Number(at)) && Number(at) >= 0)) return `--at is not a number of seconds: "${at}"`;
  return null;
}

/** The default PNG path: out/still/<film>-<seconds>s.png. Pure. */
export function stillPath(source, at) {
  const abs = path.resolve(source);
  const base = path.basename(abs, path.extname(abs));
  const film = base === 'page' ? path.basename(path.dirname(abs)) : base;
  return path.resolve('out', 'still', `${film}-${at}s.png`);
}
