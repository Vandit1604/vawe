// harness/dev/ci-status.mjs: make CI legible at the moment you push, without polling it.
//
//   node harness/dev/ci-status.mjs      ·   runs at the end of .githooks/pre-push
//
// WHY. .github/workflows/*.yml already runs on every push, PR, or schedule. The owner's gap was never
// "CI doesn't run", it was that nobody looks: gates.yml went red for four runs in a row and no one
// noticed, because checking it means remembering to open a browser tab or type a gh command.
//
// EVERY WORKFLOW, NOT ONE NAME. This used to hardcode `WORKFLOW = 'gates.yml'` and asked about nothing
// else, so audit-scenes.yml (a `schedule:` job with no push trigger a developer would ever see fire)
// failed five weeks running into nobody's inbox but GitHub's own default email. The tool existed
// because a CI job went red unnoticed, and it still only asked about the one job everybody already
// watches. The list below is read off `.github/workflows/` itself, so a new workflow file is covered
// the day it is added, with no second place to remember to update.
//
// This does the cheapest useful thing: report each workflow's PREVIOUS run result (this push has not
// reached the remote yet, so its own result does not exist) and print the one command that shows the
// NEXT run once it does. It never blocks a push on a remote state and never polls: one API call for
// the whole list, printed, done.
//
// DEGRADES HONESTLY. No `gh`, not authenticated, or offline: say so in one line and exit 0. This is
// information, not a gate, so it never fails the push.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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

try {
  run('gh', ['--version']);
} catch {
  console.log(`· ci: gh CLI not found, skipping. Check manually: https://github.com/${slug}/actions`);
  process.exit(0);
}

// The workflow FILE names, read off disk rather than typed here, so this list can never fall behind
// the repo the way the single `WORKFLOW` constant did.
const wfDir = path.join(ROOT, '.github/workflows');
const workflowFiles = fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
if (!workflowFiles.length) process.exit(0); // no workflows: nothing to report

// One API call for the whole repo's recent run history, then grouped by workflow client-side, rather
// than one `gh run list --workflow=` call per file: N workflows would otherwise mean N round trips for
// what is still, in spirit, "one API call, printed, done".
let runs;
try {
  const out = run('gh', ['run', 'list', '--repo', slug, '--limit', String(Math.max(50, workflowFiles.length * 5)),
    '--json', 'workflowName,conclusion,status,headBranch,url,createdAt']);
  runs = JSON.parse(out);
} catch {
  console.log(`· ci: could not reach GitHub (not authenticated, offline, or no runs yet). `
    + `Check after pushing: gh run list --repo ${slug} --limit 10`);
  process.exit(0);
}

// `gh run list` reports each run's `name:` field (the workflow's display name), not its filename, so
// match by that name read out of each workflow file, falling back to "no runs seen yet" for a workflow
// this run history never mentions (a brand-new file, or one that has never fired).
const nameOf = (file) => {
  const text = fs.readFileSync(path.join(wfDir, file), 'utf8');
  const m = text.match(/^name:\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : file;
};

let anyRed = false;
for (const file of workflowFiles) {
  const wfName = nameOf(file);
  const last = runs.find((r) => r.workflowName === wfName);
  if (!last) {
    console.log(`… ci: ${file} · no runs seen in the last ${runs.length}, or it has never run`);
    continue;
  }
  const glyph = last.conclusion === 'success' ? '✓' : last.status !== 'completed' ? '…' : '✗';
  const verdict = last.status !== 'completed' ? last.status : last.conclusion;
  console.log(`${glyph} ci: ${file} · last run on ${last.headBranch} was ${verdict} (${last.createdAt}) ${last.url}`);
  if (glyph === '✗') anyRed = true;
}
if (anyRed) {
  console.log('  CI is red on at least one workflow right now. This push does not fix that by itself unless it does.');
}
console.log(`  after this push: gh run list --repo ${slug} --limit 10`);
process.exit(0);
