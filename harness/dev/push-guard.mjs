#!/usr/bin/env node
// harness/dev/push-guard.mjs: two house rules that a PROMPT cannot enforce.
//
// WHY THIS EXISTS, and it is a real incident rather than a precaution. An agent was told, in its
// brief, in plain words, not to add an AI attribution trailer and not to force-add gitignored files.
// It did both: a `Co-Authored-By` trailer on the commit, plus the film JSON and 30MB of mp4 binaries
// force-added into a repo that had just gone public. Both are gitignored ON PURPOSE. The lead caught
// it by reading the diff before merging, which is exactly the kind of catch that works until the one
// time nobody looks.
//
// A rule that lives only in a brief is a rule that depends on the reader. Every agent, every session
// and every human passes through git, so the rule belongs here. `core.hooksPath` is repo-wide, so this
// covers every worktree an agent is given.
//
// IT CHECKS THE PUSHED RANGE, not the working tree. That matters: the bad commit was authored in an
// agent's own worktree and reached the lead by a MERGE, so a check that only ran at commit time in the
// authoring worktree would have seen nothing at push time. Scanning the range catches inherited work.
//
// usage: node harness/dev/push-guard.mjs <range>     (e.g. origin/main..HEAD)
import { execFileSync } from 'node:child_process';

const range = process.argv[2];
if (!range) { console.error('usage: push-guard.mjs <range>'); process.exit(2); }

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });

// The attribution the owner forbids on anything that reaches a remote. Matched case-insensitively and
// loosely on purpose: the failure is a default trailer some tool appends, and its exact wording moves.
const ATTRIBUTION = [
  /co-authored-by:\s*claude/i,
  /generated with \[?claude/i,
  /claude\.ai\/code/i,
  /anthropic\.com/i,
  /\bclaude (code|opus|sonnet|haiku)\b/i,
];

const problems = [];

// 1. Commit messages in the range.
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

// 2. Files ADDED in the range that git's own ignore rules say should not be tracked. A file can only
// be both added and ignored if somebody passed --force, which is the fingerprint of the incident.
// Only ADDED files are checked, so existing history (and anything legitimately tracked before an
// ignore rule was written) is never re-litigated.
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
