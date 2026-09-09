// node harness/live/test/no-blanket-git.test.mjs
//
// Feeds each case through the real hook as a child process, exactly as Claude Code does.
//
// The cases live in a JSON FILE rather than in this source, and this file names no banned command
// literally. Both are deliberate: the first two versions of the hook blocked their own test run,
// because the cases sat in the shell command that launched it.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = join(here, '..', 'no-blanket-git.mjs');
const cases = JSON.parse(readFileSync(join(here, 'no-blanket-git.cases.json'), 'utf8'));

let bad = 0;
for (const [command, shouldBlock, why] of cases) {
  const r = spawnSync('node', [HOOK], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8' });
  const blocked = r.status === 2;
  const ok = blocked === shouldBlock;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${blocked ? 'block' : 'allow'}  ${why}`);
}
console.log(bad === 0 ? `\nall ${cases.length} cases correct` : `\n${bad} of ${cases.length} WRONG`);
process.exit(bad === 0 ? 0 : 1);
