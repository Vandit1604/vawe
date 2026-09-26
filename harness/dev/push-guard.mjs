#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const range = process.argv[2];
if (!range) { console.error('usage: push-guard.mjs <range>'); process.exit(2); }

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });

const ATTRIBUTION = [
  /co-authored-by:\s*claude/i,
  /generated with \[?claude/i,
  /claude\.ai\/code/i,
  /anthropic\.com/i,
  /\bclaude (code|opus|sonnet|haiku)\b/i,
];

const problems = [];

const shas = git('rev-list', range).split('\n').filter(Boolean);
for (const sha of shas) {
  const msg = git('log', '-1', '--format=%B', sha);
  for (const re of ATTRIBUTION) {
    if (re.test(msg)) {
      const line = msg.split('\n').find((l) => re.test(l)) || '';
      problems.push([`${sha.slice(0, 8)} attributes an assistant in its commit message`,
        `    ${line.trim()}`,
        '    Rewrite the message: git rebase -i, or amend if it is the tip.']);
      break;
    }
  }
}

const added = shas.length
  ? [...new Set(git('diff', '--diff-filter=A', '--name-only', range).split('\n').filter(Boolean))]
  : [];
if (added.length) {
  let ignored = '';
  try {
    ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin'],
      { input: added.join('\n'), encoding: 'utf8' });
  } catch { /* check-ignore exits 1 when nothing matches, which is the good case */ }
  for (const f of ignored.split('\n').filter(Boolean)) {
    problems.push([`${f} is gitignored and was force-added`,
      '    It is ignored on purpose. Keep it in the working tree, not in the repo.',
      '    If it genuinely belongs in git, change .gitignore in the same commit and say why.']);
  }
}

if (!problems.length) process.exit(0);
console.error(`\n✗ push-guard: ${problems.length} house-rule violation(s) in ${range}\n`);
for (const [head, ...rest] of problems) console.error(`  ${head}\n${rest.join('\n')}\n`);
console.error('  These two rules are not style. One publishes an attribution the owner forbids on');
console.error('  anything reaching a remote; the other puts deliberately-ignored bytes in a public repo.\n');
process.exit(1);
