// harness/lib/run-author-check.mjs: run author-check.mjs, then log which checks ACTUALLY blocked.
//
// Why this wraps rather than edits quality/gates/author-check.mjs: another agent owns waivers in that
// file right now, so it is off limits here. Wrapping means the ladder's exit code and pass/fail
// behaviour are untouched byte-for-byte; this only adds a run-log line after the fact.
//
// FIX 1 (docs: .claude/plans/pre-render-improvement.plan.md, "the run log tells the truth"). This used
// to mark a check `blocked` from `severity === 'error'` alone, which is wrong two ways at once:
//   - a REPORT-tier gate (critique, direct, floor, designspec, ...) can still emit a severity:'error'
//     finding; it only fails the BUILD when TASTE=1 gives it teeth. Marking it blocked lied upward.
//   - author-check's own HARD_CODES escalation (see its "HARD CODES, decided from what already ran"
//     block) makes a handful of REPORT-tier codes (no-preflight, no-transition, off-font, ...) block
//     regardless of tier or TASTE. Marking those report-only would ALSO lie, the other way, and is
//     exactly the miss that cost 4+ identical re-renders of vawe-flow-2: the run log said "reported"
//     for a code that was in fact stopping the ship.
//
// So this reads author-check's own verdict, not a re-derived guess at its rules. author-check already
// prints, per run, exactly which codes it is treating as blocking this time: the per-check table line
// `✗ <name>  BLOCKS (code1, code2)` (tier=blocks, or a report-tier gate promoted by TASTE=1), and the
// separate hard-code escalation block's `[code] (step <name>)` lines. Both are STRUCTURAL prints (the
// same kind of stable, bracketed form harness/lib/finding-codes.mjs already treats as a legitimate
// parse target), computed from author-check's real tier + waiver + TASTE state for this exact run, so
// nothing here re-encodes HARD_CODES, tiers, or the TASTE decision: it reads the one place that already
// combined them. See parseBlockedCodes() below.
//
// HOW THE PER-CHECK BREAKDOWN IS RECOVERED WITHOUT READING author-check's INTERNALS: each gate
// author-check spawns already writes its structured findings to VAWE_FINDINGS_OUT
// (harness/lib/findings.mjs), into /tmp/.author-check/<author-check's own pid>/findings-N.json, and
// nothing deletes those files afterward. This process learns that pid from spawnSync's own result, so
// it can read the same files author-check just wrote and never touches its source. A finding's CODE is
// then routed to the gate file that emits it via codesEmitted() (harness/lib/finding-codes.mjs), which
// already exists for exactly this kind of code -> gate lookup and is reused rather than re-derived.
//
// Usage: node harness/lib/run-author-check.mjs <scene.json> [author-check flags...]
//        RUNLOG_CMD=check|ship (default "author-check") names the run in the log.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFindings } from './findings.mjs';
import { codesEmitted } from './finding-codes.mjs';
import { appendRun } from './runlog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The codes author-check itself is treating as blocking THIS run, read off its own printed verdict.
 * Two structural shapes, both already stable printed forms (see quality/gates/author-check.mjs):
 *   `  ✗ name       BLOCKS (code-a, code-b)`               a check's own tier decided it blocks
 *   `      [code] (step name)`                             the HARD_CODES escalation overrode tier
 */
export function parseBlockedCodes(stdout) {
  const blocked = new Set();
  const CODE = '[a-z][a-z0-9-]*';
  for (const m of String(stdout || '').matchAll(new RegExp(`BLOCKS \\(([^)]*)\\)`, 'g'))) {
    for (const c of m[1].split(',').map((s) => s.trim())) {
      if (new RegExp(`^${CODE}$`).test(c)) blocked.add(c);
    }
  }
  for (const m of String(stdout || '').matchAll(new RegExp(`^\\s*\\[(${CODE})\\] \\(step `, 'gm'))) {
    blocked.add(m[1]);
  }
  return blocked;
}

// Guarded so tests/gates/lib-test.gates.test.mjs can `import { parseBlockedCodes }` for a pure unit test
// without running the CLI body (which would spawn author-check with no film argument and exit(2)).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
const film = process.argv[2];
const args = process.argv.slice(2);

if (!film) {
  console.error('usage: node harness/lib/run-author-check.mjs <scene.json> [author-check flags...]');
  process.exit(2);
}

// stdout is captured (not inherited) so the verdict can be parsed, then replayed byte-for-byte: spawnSync
// blocks until the child exits, so nothing else writes to stdout in the meantime and the reader sees the
// same transcript, just flushed at the end instead of streamed. stderr stays live.
const t0 = Date.now();
const r = spawnSync('node', [path.join(repoRoot, 'quality/gates/author-check.mjs'), ...args], {
  stdio: ['inherit', 'pipe', 'inherit'], cwd: repoRoot, encoding: 'utf8',
});
const wallMs = Date.now() - t0;
if (r.stdout) process.stdout.write(r.stdout);

const blockedCodes = parseBlockedCodes(r.stdout);

const codeGate = codesEmitted();
function nameForCode(code) {
  const files = codeGate.get(code);
  if (!files || !files.size) return 'unrouted';
  return path.basename([...files][0]).replace(/\.mjs$/, '');
}

const findingsTmp = path.join('/tmp/.author-check', String(r.pid));
let records = [];
// wallMsByName: each findings-N.json belongs to exactly one gate script (spawnGate in
// author-check.mjs runs one script per findings file), so every record it holds shares that gate's
// wall time. Read alongside the matching `.wallms` sidecar (see spawnGate) and keyed by the same
// check name the codes below resolve to, summed if a gate is spawned more than once in a run.
const wallMsByName = new Map();
try {
  for (const f of fs.readdirSync(findingsTmp)) {
    if (!f.endsWith('.json')) continue;
    const recs = readFindings(path.join(findingsTmp, f));
    if (!recs) continue;
    records = records.concat(recs);
    if (recs.length) {
      let gateMs = null;
      try { gateMs = Number(fs.readFileSync(path.join(findingsTmp, `${f}.wallms`), 'utf8')); } catch { /* no timing recorded */ }
      if (Number.isFinite(gateMs)) {
        const name = nameForCode(recs[0].code);
        wallMsByName.set(name, (wallMsByName.get(name) || 0) + gateMs);
      }
    }
  }
} catch { /* author-check exited before spawning any gate (bad usage, bad JSON): no findings to read */ }

const byCheck = new Map();
for (const rec of records) {
  const name = nameForCode(rec.code);
  if (!byCheck.has(name)) byCheck.set(name, { name, ran: true, fired: 0, blocked: false, report: false, codes: [], waived: [] });
  const c = byCheck.get(name);
  c.fired += 1;
  if (!c.codes.includes(rec.code)) c.codes.push(rec.code);
  if (rec.waived) { if (!c.waived.includes(rec.code)) c.waived.push(rec.code); }
  // `blocked` is the real blocking set for THIS run (tier + TASTE + HARD_CODES, all already folded
  // into blockedCodes above). HARD_CODES escalates warn-severity findings too (author-check checks
  // both blockCodes and warnCodes), so this cannot be gated on severity === 'error'. An error-severity
  // finding that is NOT in that set genuinely did not stop the build: it stays `report`, the true state
  // of a report-tier gate's finding.
  else if (blockedCodes.has(rec.code)) c.blocked = true;
  else if (rec.severity === 'error') c.report = true;
}
for (const [name, ms] of wallMsByName) { if (byCheck.has(name)) byCheck.get(name).wallMs = ms; }
// author-check itself always ran, whether or not any gate under it left findings behind (a bad-JSON
// or bad-usage exit spawns no gates at all, and that absence is itself a fact worth one row).
if (!byCheck.size) byCheck.set('author-check', { name: 'author-check', ran: true, fired: 0, blocked: r.status !== 0, report: false, codes: [], waived: [] });

appendRun(film, { cmd: process.env.RUNLOG_CMD || 'author-check', checks: [...byCheck.values()], wallMs });

process.exit(r.status ?? 1);
}
