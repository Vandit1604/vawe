import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The verb records of out/<film>.runs.jsonl written by one session, from the agent's cwd or this repo. */
export function readRunLog(film, { cwd, session }) {
  for (const dir of [cwd, repoRoot].filter(Boolean)) {
    const file = path.join(dir, 'out', `${film}.runs.jsonl`);
    if (!fs.existsSync(file)) continue;
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    }).filter((r) => r.cmd === 'verb' && r.session === session);
  }
  return [];
}
