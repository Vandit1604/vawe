// harness/lib/check-report.mjs: the body of `make check D=<film>`.
//
// FIX 2 + FIX 8 (docs: .claude/plans/pre-render-improvement.plan.md). `make check` used to run only
// author-check, so the page audit (overflow, safe, contrast, buried, tiny/clipped text) never fired
// until `make ship` had already paid for a render, and drift in a generated file (schema enums, the
// catalogue, doc counts) was invisible until something else happened to notice. Neither needs the mp4
// or a write: this runs both, read-only, then prints ONE summary instead of three separate verdicts an
// author has to reconcile by hand.
//
// Shape: author-check -> page audit -> generated-check -> ground arc -> motion floor (pre-render) ->
// ONE summary (fixed / needs a decision / next command). The summary names each finding (code and its
// own detail), never "see above": an agent reading only the summary must know what to change. Adapted
// safeguard lines ("adapted <code>: ...") are collected as fixed. `make ship`'s own author-check and
// audit invocations are untouched; this only adds an earlier, report-only run of the same commands.
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
    cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20,
  });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  auditStatus = r.status ?? 0;
  const lines = String(r.stdout || '').split('\n');
  for (const l of lines) { const a = /^\s*(adapted [a-z-]+:.*)$/.exec(l); if (a) fixed.push(a[1].slice(0, 180)); }
  // --aspect all repeats one finding per canvas, so each distinct code+detail is listed once with the
  // aspects it fired on, read from the result header line above it ("[16:9]").
  const byKey = new Map(); let aspect = '';
  for (const l of lines) {
    const h = /\[(\d+:\d+)\]/.exec(l); if (/^\S/.test(l) && h) { aspect = h[1]; continue; }
    const m = /^\s+\[([a-z-]+)\]\s+(.*)$/.exec(l); if (!m) continue;
    const key = m[1] + ' ' + m[2];
    if (!byKey.has(key)) byKey.set(key, { code: m[1], detail: m[2], aspects: new Set() });
    if (aspect) byKey.get(key).aspects.add(aspect);
  }
  const found = [...byKey.values()];
  for (const { code, detail, aspects } of found.slice(0, 8))
    decisions.push(`page audit [${code}]${aspects.size ? ` (${[...aspects].join(', ')})` : ''}: ${detail.slice(0, 160)}`);
  if (found.length > 8) decisions.push(`page audit: ${found.length - 8} more distinct finding(s) in the output above`);
  if (auditStatus !== 0 && !found.length) decisions.push('page audit failed with no parsed finding line; read its output above');
} else {
  console.log('\n▶ page audit: skipped, no D=<film> given');
}

// ---- 3. generated-check (READ-ONLY: schema enums, catalogue, doc counts, rules-build) -------------
console.log('\n▶ generated-check (read-only; `make regen` writes)');
const gc = spawnSync('node', [path.join(ROOT, 'quality/gates/generated-check.mjs')], { stdio: 'inherit', cwd: ROOT });
if ((gc.status ?? 0) !== 0) decisions.push('generated-check: at least one generated file has drifted. `make regen`' + (film ? ` D=${film}` : '') + ' writes them.');

// ---- 4. ground arc and 5. motion floor, both sampled from renderFrame (no mp4 needed) -------------
// Each gate prints its findings as JSON; the summary names each one with its own fix text.
const jsonGate = (label, args) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 });
  let items = [];
  try { items = JSON.parse(r.stdout || '[]'); } catch { decisions.push(`${label}: could not read its --json output (exit ${r.status})`); return; }
  if (!Array.isArray(items)) items = items.findings || [];
  for (const it of items) {
    const text = String(it.summary || it.message || it.line || '').replace(/\s+/g, ' ');
    if (it.adapted || /^adapted /.test(text)) { fixed.push(text.slice(0, 180)); continue; }
    if (it.severity === 'info' || /-declared$/.test(it.code || '')) continue;
    decisions.push(`${label} [${it.code}]: ${text.slice(0, 200)}`);
  }
  console.log(`  ${items.length} finding(s)`);
};
if (film && fs.existsSync(path.resolve(ROOT, film))) {
  jsonGate('ground arc', [path.join(ROOT, 'quality/gates/ground-arc.mjs'), film, '--json']);
  jsonGate('motion floor (pre-render)', [path.join(ROOT, 'quality/gates/motion-floor.mjs'), film, '--pre', '--json']);
}

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
