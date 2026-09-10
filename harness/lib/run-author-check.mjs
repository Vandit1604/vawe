// harness/lib/run-author-check.mjs: run author-check.mjs, then log which checks fired.
//
// Why this wraps rather than edits quality/gates/author-check.mjs: another agent owns waivers in that
// file right now, so it is off limits here. Wrapping means the ladder's own stdout, exit code, and
// pass/fail behaviour are untouched byte-for-byte (spawned with stdio: 'inherit'); this only adds a
// run-log line after the fact.
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
const film = process.argv[2];
const args = process.argv.slice(2);

if (!film) {
  console.error('usage: node harness/lib/run-author-check.mjs <scene.json> [author-check flags...]');
  process.exit(2);
}

const r = spawnSync('node', [path.join(repoRoot, 'quality/gates/author-check.mjs'), ...args], {
  stdio: 'inherit', cwd: repoRoot,
});

const findingsTmp = path.join('/tmp/.author-check', String(r.pid));
let records = [];
try {
  for (const f of fs.readdirSync(findingsTmp)) {
    const recs = readFindings(path.join(findingsTmp, f));
    if (recs) records = records.concat(recs);
  }
} catch { /* author-check exited before spawning any gate (bad usage, bad JSON): no findings to read */ }

const codeGate = codesEmitted();
const nameForCode = (code) => {
  const files = codeGate.get(code);
  if (!files || !files.size) return 'unrouted';
  return path.basename([...files][0]).replace(/\.mjs$/, '');
};

const byCheck = new Map();
for (const rec of records) {
  const name = nameForCode(rec.code);
  if (!byCheck.has(name)) byCheck.set(name, { name, ran: true, fired: 0, blocked: false, codes: [], waived: [] });
  const c = byCheck.get(name);
  c.fired += 1;
  if (!c.codes.includes(rec.code)) c.codes.push(rec.code);
  if (rec.waived) { if (!c.waived.includes(rec.code)) c.waived.push(rec.code); }
  else if (rec.severity === 'error') c.blocked = true;
}
// author-check itself always ran, whether or not any gate under it left findings behind (a bad-JSON
// or bad-usage exit spawns no gates at all, and that absence is itself a fact worth one row).
if (!byCheck.size) byCheck.set('author-check', { name: 'author-check', ran: true, fired: 0, blocked: r.status !== 0, codes: [], waived: [] });

appendRun(film, { cmd: process.env.RUNLOG_CMD || 'author-check', checks: [...byCheck.values()] });

process.exit(r.status ?? 1);
