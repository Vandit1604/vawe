// harness/dev/ci-status.mjs: make CI legible at the moment you push, without polling it.
//
//   node harness/dev/ci-status.mjs      ·   runs at the end of .githooks/pre-push
//
// WHY. .github/workflows/gates.yml already runs on every push to main and every PR. The owner's gap
// was never "CI doesn't run", it was that nobody looks: it went red for four runs in a row and no one
// noticed, because checking it means remembering to open a browser tab or type a gh command.
//
// This does the cheapest useful thing: report the PREVIOUS run's result (this push has not reached the
// remote yet, so its own result does not exist) and print the one command that shows the NEXT run once
// it does. It never blocks a push on a remote state and never polls: one API call, printed, done.
//
// DEGRADES HONESTLY. No `gh`, not authenticated, or offline: say so in one line and exit 0. This is
// information, not a gate, so it never fails the push.
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

let slug;
try {
  // git@github.com:Owner/repo.git or https://github.com/Owner/repo(.git)
  const url = run('git', ['remote', 'get-url', 'origin']);
  const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
  if (!m) throw new Error('not a github remote');
  slug = m[1];
} catch {
  process.exit(0); // no origin, or not GitHub: nothing to report
}

const WORKFLOW = 'gates.yml';
try {
  run('gh', ['--version']);
} catch {
  console.log(`· ci: gh CLI not found, skipping. Check manually: https://github.com/${slug}/actions`);
  process.exit(0);
}

let rows;
try {
  const out = run('gh', ['run', 'list', '--repo', slug, '--workflow', WORKFLOW, '--limit', '1',
    '--json', 'conclusion,status,headBranch,url,createdAt']);
  rows = JSON.parse(out);
} catch {
  console.log(`· ci: could not reach GitHub (not authenticated, offline, or no ${WORKFLOW} runs yet). `
    + `Check after pushing: gh run list --repo ${slug} --workflow=${WORKFLOW} --limit 1`);
  process.exit(0);
}

if (!rows.length) {
  console.log(`· ci: no ${WORKFLOW} runs yet for ${slug}`);
  process.exit(0);
}

const [last] = rows;
const glyph = last.conclusion === 'success' ? '✓' : last.status !== 'completed' ? '…' : '✗';
const verdict = last.status !== 'completed' ? last.status : last.conclusion;
console.log(`${glyph} ci: last run on ${last.headBranch} was ${verdict} (${last.createdAt}) ${last.url}`);
if (glyph === '✗') {
  console.log('  CI is red right now. This push does not fix that by itself unless it does.');
}
console.log(`  after this push: gh run list --repo ${slug} --workflow=${WORKFLOW} --limit 1`);
process.exit(0);
