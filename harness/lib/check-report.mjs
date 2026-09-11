// harness/lib/check-report.mjs: the body of `make check D=<film>`.
//
// FIX 2 + FIX 8 (docs: .claude/plans/pre-render-improvement.plan.md). `make check` used to run only
// author-check, so the page audit (overflow, safe, contrast, buried, tiny/clipped text) never fired
// until `make ship` had already paid for a render, and drift in a generated file (schema enums, the
// catalogue, doc counts) was invisible until something else happened to notice. Neither needs the mp4
// or a write: this runs both, read-only, then prints ONE summary instead of three separate verdicts an
// author has to reconcile by hand.
//
// Shape: author-check -> page audit -> generated-check -> ONE summary (fixed / needs a decision / next
// command). `make ship`'s own author-check and audit invocations are untouched; this only adds an
// earlier, report-only run of the same commands.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRuns } from './runlog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const film = process.argv[2] || process.env.D || null;
const taste = process.argv.includes('--taste') || process.env.TASTE === '1';
const vs = process.env.VS || null;

const decisions = [];
const fixed = [];

// ---- 1. author-check (iterate mode: reports everything, blocks nothing here) --------------------
console.log('▶ author-check');
const acArgs = [...(film ? [film] : []), ...(taste ? ['--taste'] : []), ...(vs ? ['--vs', vs] : [])];
spawnSync('node', [path.join(ROOT, 'harness/lib/run-author-check.mjs'), ...acArgs], {
  stdio: 'inherit', cwd: ROOT, env: { ...process.env, RUNLOG_CMD: 'check', MODE: 'iterate' },
});
if (film) {
  const runs = readRuns(film);
  const last = runs[runs.length - 1];
  // Fix 1 put the true answer on each check's own record: `blocked` (would stop `make ship`) vs
  // `report` (fired, does not). Reading it back here means this summary cannot drift from that fix.
  for (const c of (last && last.checks) || []) {
    if (c.blocked) decisions.push(`author-check: ${c.name} BLOCKS (${(c.codes || []).join(', ')})`);
  }
}

// ---- 2. page audit (no render needed; quality/audit.mjs loads the scene directly) ----------------
let auditStatus = 0;
if (film && fs.existsSync(path.resolve(ROOT, film))) {
  console.log('\n▶ page audit (pre-render)');
  const r = spawnSync('node', [path.join(ROOT, 'quality/audit.mjs'), film, '--aspect', 'all'], {
    stdio: 'inherit', cwd: ROOT,
  });
  auditStatus = r.status ?? 0;
  if (auditStatus !== 0) decisions.push('page audit: hard finding(s) above (overflow, safe-zone, contrast, or buried text)');
} else {
  console.log('\n▶ page audit: skipped, no D=<film> given');
}

// ---- 3. generated-check (READ-ONLY: schema enums, catalogue, doc counts, rules-build) -------------
console.log('\n▶ generated-check (read-only; `make regen` writes)');
const gc = spawnSync('node', [path.join(ROOT, 'quality/gates/generated-check.mjs')], { stdio: 'inherit', cwd: ROOT });
if ((gc.status ?? 0) !== 0) decisions.push('generated-check: at least one generated file has drifted. `make regen`' + (film ? ` D=${film}` : '') + ' writes them.');

// ---- INSERTION POINT for the lead to wire later: motion floor pre-render, ground arc, safeguards --
// report. Each is a renderFrame-sampling pass like the page audit above (no mp4 needed) and belongs
// here, between the audit and the summary, once it exists. Owned by another agent; do not fill this in.

// ---- ONE summary -----------------------------------------------------------------------------------
console.log(`\n════════ check summary${film ? ` · ${path.basename(film)}` : ''} ════════`);
console.log(`  fixed automatically: ${fixed.length ? fixed.join('; ') : 'none (make check only reports; make regen writes generated files)'}`);
if (decisions.length) {
  console.log(`  needs a decision:`);
  for (const d of decisions) console.log(`    - ${d}`);
} else {
  console.log(`  needs a decision: none`);
}
const next = decisions.some((d) => d.startsWith('generated-check')) ? `make regen${film ? ` D=${film}` : ''}`
  : decisions.length ? (film ? `fix the above, then make check D=${film}` : 'fix the above, then make check')
  : film ? `make ship D=${film}` : 'make ship D=<file>';
console.log(`  next command: ${next}`);
process.exit(0); // make check is ZERO consequence by design; `make ship` is where teeth live
