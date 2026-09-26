// harness/lib/scene-check-new-findings.mjs: author-check, but CI fails on NEW findings only.
//
// .github/workflows/scene-check.yml ran `make dev-tool X=author-check` on every touched scene and blocked the
// push the moment ANY blocking finding fired, including one the scene already shipped with. A one-word
// path fix on an already-failing film then failed CI for a defect the touching commit did not cause.
// That is not a gate on the change, it is a gate on the film's whole history landing on whoever edits
// it next.
//
// This runs author-check TWICE: once on the file as it stands now, once on the SAME path read from the
// base commit (a bare worktree, so sibling files a scene relies on, e.g. a storyboard, resolve the same
// way author-check itself would have seen them). A blocking finding is NEW when its (code, summary) key
// did not fire at base. Only a NEW blocking finding exits nonzero; a carried-over one still prints, so
// nothing is hidden, it just does not gate the push that did not introduce it.
//
//   node harness/lib/scene-check-new-findings.mjs <scene.json> <base-sha> [author-check flags...]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFindings } from './findings.mjs';
import { parseBlockedCodes } from './run-author-check.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORKTREE = path.join(repoRoot, '.git-scene-check-base');

// records(cwd, scenePath, flags) -> { status, stdout, blocking: [{code, summary}] }, author-check run
// once, its findings read back the same way run-author-check.mjs does (findingsTmp keyed by its pid).
function run(cwd, scenePath, flags) {
  const r = spawnSync('node', [path.join(repoRoot, 'quality/gates/author-check.mjs'), scenePath, ...flags],
    { cwd, encoding: 'utf8' });
  const blockedCodes = parseBlockedCodes(r.stdout);
  const findingsTmp = path.join('/tmp/.author-check', String(r.pid));
  let records = [];
  try {
    for (const f of fs.readdirSync(findingsTmp)) {
      if (!f.endsWith('.json')) continue;
      const recs = readFindings(path.join(findingsTmp, f));
      if (recs) records = records.concat(recs);
    }
  } catch { /* author-check exited before any gate ran: no findings to read */ }
  const blocking = records.filter((rec) => !rec.waived && blockedCodes.has(rec.code));
  return { status: r.status, stdout: r.stdout, blocking };
}

// baseWorktree(baseSha) -> the path a scene reads the same siblings from at that commit, added once
// and reused for every touched scene in the run (git worktree add is the expensive part, one per job).
function baseWorktree(baseSha) {
  if (!fs.existsSync(WORKTREE)) {
    spawnSync('git', ['worktree', 'add', '--detach', WORKTREE, baseSha], { cwd: repoRoot, stdio: 'inherit' });
    // node_modules is not part of the tree; the worktree needs the SAME install author-check already
    // has, not a second `npm ci`, which is the whole cost this script exists to avoid paying twice.
    try { fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(WORKTREE, 'node_modules')); } catch { /* already there */ }
  }
  return WORKTREE;
}

const [scenePath, baseSha, ...flags] = process.argv.slice(2);
if (!scenePath || !baseSha) {
  console.error('usage: node harness/lib/scene-check-new-findings.mjs <scene.json> <base-sha> [author-check flags...]');
  process.exit(2);
}

const head = run(repoRoot, scenePath, flags);
process.stdout.write(head.stdout);

if (!head.blocking.length) process.exit(head.status ?? 0);

const wt = baseWorktree(baseSha);
const baseHasFile = fs.existsSync(path.join(wt, scenePath));
// A path git never had at base carries no baseline: every blocking finding on it is new by definition,
// which is correct, a scene that did not exist cannot have shipped with a defect already.
const base = baseHasFile ? run(wt, scenePath, flags) : { blocking: [] };

const key = (rec) => `${rec.code}|${rec.summary}`;
const baseKeys = new Set(base.blocking.map(key));
const carried = head.blocking.filter((rec) => baseKeys.has(key(rec)));
const fresh = head.blocking.filter((rec) => !baseKeys.has(key(rec)));

console.log(`\n  scene-check vs ${baseSha.slice(0, 8)}: ${head.blocking.length} blocking finding(s), `
  + `${carried.length} already present at base (report-only), ${fresh.length} new.`);
for (const rec of carried) console.log(`    ○ [${rec.code}] ${rec.summary} (carried from base, not gating this push)`);
for (const rec of fresh) console.log(`    ✗ [${rec.code}] ${rec.summary}`);

if (fresh.length) {
  console.log(`\n  ✗ scene-check: ${fresh.length} finding(s) this push introduced.\n`);
  process.exit(1);
}
console.log(`\n  ✓ scene-check: nothing NEW versus base, the carried finding(s) are this film's existing debt.\n`);
process.exit(0);
