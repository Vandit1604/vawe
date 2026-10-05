// The films the sameness question compares with: the newest ones in out/ that have a judge result and a
// rendered video, a final first and a draft otherwise.
import fs from 'node:fs';
import path from 'node:path';

export const SIBLINGS = 6;

/** [{ name, video }], newest judge result first, never the film `exclude`, at most `limit`. */
export function siblingFilms(outDir, exclude, limit = SIBLINGS) {
  if (!fs.existsSync(outDir)) return [];
  const judged = fs.readdirSync(outDir).filter((f) => f.endsWith('.judge.json')).map((f) => ({ name: f.slice(0, -'.judge.json'.length), at: fs.statSync(path.join(outDir, f)).mtimeMs }));
  const out = [];
  for (const { name } of judged.sort((a, b) => b.at - a.at)) {
    const video = [`${name}.mp4`, `${name}-draft.mp4`].map((f) => path.join(outDir, f)).find((f) => fs.existsSync(f));
    if (name !== exclude && video) out.push({ name, video });
    if (out.length === limit) break;
  }
  return out;
}
