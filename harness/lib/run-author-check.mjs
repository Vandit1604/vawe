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

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
const film = process.argv[2];
const args = process.argv.slice(2);

if (!film) {
  console.error('usage: node harness/lib/run-author-check.mjs <scene.json> [author-check flags...]');
  process.exit(2);
}

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
  else if (blockedCodes.has(rec.code)) c.blocked = true;
  else if (rec.severity === 'error') c.report = true;
}
for (const [name, ms] of wallMsByName) { if (byCheck.has(name)) byCheck.get(name).wallMs = ms; }
if (!byCheck.size) byCheck.set('author-check', { name: 'author-check', ran: true, fired: 0, blocked: r.status !== 0, report: false, codes: [], waived: [] });

appendRun(film, { cmd: process.env.RUNLOG_CMD || 'author-check', checks: [...byCheck.values()], wallMs });

process.exit(r.status ?? 1);
}
