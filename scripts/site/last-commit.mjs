import path from 'node:path';
import { execFileSync } from 'node:child_process';

// The date (YYYY-MM-DD) of the last commit that touched the file, in whichever repo holds it, or null.
export function lastCommitDate(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', path.basename(file)], { cwd: path.dirname(file), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().slice(0, 10) || null;
  } catch {
    return null;
  }
}
