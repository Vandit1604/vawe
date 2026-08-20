// scripts/gates/audit-scenes.mjs — run the LAYOUT AUDIT over every shipped scene, not just the open one.
//
// WHY THIS EXISTS. `verify/audit.mjs` is a good check and it was never the problem. It samples the bg
// canvas under a text element's own ink box, computes WCAG against it, and reports `1.0:1 (want 3:1)`
// with the layer named. What it could not do is find a defect that was already in the library: `make
// audit` takes ONE scene, it is a post-render step rather than part of `make author-check`, so it only
// ever grades the file the author has open. `motion-reel` and `motion-reel-v2` rendered dark text on a
// dark backdrop for their entire runtime and stayed that way, because after they shipped nothing asked
// them again (docs/MISTAKES.md #373).
//
// A check that only ever runs against the file you are editing is a check against NEW defects. This one
// runs against the library, so it is a check against OLD ones too.
//
//   node scripts/gates/audit-scenes.mjs [<name-substring>] [--aspect 16:9,9:16]
//
// Exits 1 if any scene has a HARD issue. Slow on purpose (it renders sampled frames per scene); this is
// an on-demand sweep, never part of the per-edit ladder.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const aspectAt = argv.indexOf('--aspect');
const aspect = aspectAt >= 0 ? argv[aspectAt + 1] : null;
const filter = argv.find((a, i) => !a.startsWith('--') && i !== aspectAt + 1) || '';

const DIR = 'formats/scene';
// The same exclusions the other library sweeps use: a sidecar is not a film, and an un-expanded source
// is audited through its .expanded.json sibling rather than twice.
const skip = (f) => !f.endsWith('.json') || f === 'schema.json' || f.startsWith('_')
  || /\.(intent|animatic|template)\.json$/.test(f);

const scenes = fs.readdirSync(DIR).filter((f) => !skip(f)).sort()
  .filter((f) => {
    if (filter && !f.includes(filter)) return false;
    // an un-expanded source cannot be audited; its expanded sibling is in the list already
    const src = path.join(DIR, f);
    try {
      const d = JSON.parse(fs.readFileSync(src, 'utf8'));
      if (!Array.isArray(d.layers)) return false;
      if (f.endsWith('.expanded.json')) return true;
      const hasBlock = (L) => L && (L.type === 'block' || L.type === 'beat');
      if (d.layers.some(hasBlock) && fs.existsSync(src.replace(/\.json$/, '.expanded.json'))) return false;
    } catch { return false; }
    return true;
  });

const rows = [];
for (const f of scenes) {
  const file = path.join(DIR, f);
  const args = ['verify/audit.mjs', file, ...(aspect ? ['--aspect', aspect] : [])];
  let out = '', code = 0;
  try {
    out = execFileSync('node', args, { encoding: 'utf8', maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // A non-zero exit is the audit REPORTING, not the audit breaking. Both stdout and the exit code
    // matter, and swallowing either is how a sweep reports a clean library it never looked at.
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status ?? 1;
  }
  // Count from the audit's own summary lines rather than re-deriving them here: a second copy of the
  // pass/fail rule would drift from the one that printed it (docs/MISTAKES.md #159).
  const hard = [...out.matchAll(/·\s*(\d+)\s+hard/g)].reduce((n, m) => n + +m[1], 0);
  const warn = [...out.matchAll(/·\s*(\d+)\s+warn/g)].reduce((n, m) => n + +m[1], 0);
  const findings = out.split('\n').filter((l) => /^\s{5}\[/.test(l)).map((l) => l.trim());
  const errored = code !== 0 && hard === 0 && !findings.length;
  rows.push({ f, hard, warn, findings, errored, out });
  process.stdout.write(errored ? '!' : hard ? '✗' : warn ? '·' : '.');
}
process.stdout.write('\n\n');

const bad = rows.filter((r) => r.hard > 0);
const errored = rows.filter((r) => r.errored);
for (const r of bad) {
  console.log(`✗ ${r.f}  (${r.hard} hard · ${r.warn} warn)`);
  // every finding, never a head: a truncated list reads as "that was all of them"
  for (const line of r.findings) console.log(`    ${line}`);
}
for (const r of errored) console.log(`! ${r.f} — audit could not run:\n${r.out.split('\n').slice(-4).join('\n')}`);

const clean = rows.length - bad.length - errored.length;
console.log(`\n==== AUDIT-ALL · ${rows.length} scenes ====`);
console.log(`✓ clean: ${clean}   ✗ hard: ${bad.length}   ! errored: ${errored.length}`
  + `   ·warn-only: ${rows.filter((r) => !r.hard && !r.errored && r.warn).length}`);
process.exit(bad.length || errored.length ? 1 : 0);
