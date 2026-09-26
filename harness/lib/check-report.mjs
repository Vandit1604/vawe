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

console.log('▶ author-check');
const acArgs = [...(film ? [film] : []), ...(taste ? ['--taste'] : []), ...(vs ? ['--vs', vs] : [])];
spawnSync('node', [path.join(ROOT, 'harness/lib/run-author-check.mjs'), ...acArgs], {
  stdio: 'inherit', cwd: ROOT, env: { ...process.env, RUNLOG_CMD: 'check', MODE: 'iterate' },
});
if (film) {
  const runs = readRuns(film);
  const last = runs[runs.length - 1];
  for (const c of (last && last.checks) || []) {
    if (c.blocked) decisions.push(`author-check: ${c.name} BLOCKS (${(c.codes || []).join(', ')})`);
  }
}

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

console.log('\n▶ generated-check (read-only; `make regen` writes)');
const gc = spawnSync('node', [path.join(ROOT, 'quality/gates/generated-check.mjs')], { stdio: 'inherit', cwd: ROOT });
if ((gc.status ?? 0) !== 0) decisions.push('generated-check: at least one generated file has drifted. `make regen`' + (film ? ` D=${film}` : '') + ' writes them.');

// ground-arc and motion-floor used to run here as direct --json calls. Both were TASTE gates
// (engine-doctrine/SAFEGUARDS.md): deleted, not run any more. Ground continuity is now a judge rubric
// dimension (quality/gates/rubric.mjs); the motion floor's dead-window rule is documented in
// engine-doctrine/MOTION-CRAFT.md for a human/agent judge to apply by eye.

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
