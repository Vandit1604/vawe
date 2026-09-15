// quality/gates/audit-scenes.mjs, run the LAYOUT AUDIT over every shipped scene, not just the open one.
//
// WHY THIS EXISTS. `quality/audit.mjs` is a good check and it was never the problem. It samples the bg
// canvas under a text element's own ink box, computes WCAG against it, and reports `1.0:1 (want 3:1)`
// with the layer named. What it could not do is find a defect that was already in the library: `make
// audit` takes ONE scene, it is a post-render step rather than part of `make author-check`, so it only
// ever grades the file the author has open. `motion-reel` and `motion-reel-v2` rendered dark text on a
// dark backdrop for their entire runtime and stayed that way, because after they shipped nothing asked
// them again (engine-doctrine/MISTAKES.md #387).
//
// A check that only ever runs against the file you are editing is a check against NEW defects. This one
// runs against the library, so it is a check against OLD ones too.
//
//   node quality/gates/audit-scenes.mjs [<name-substring>] [--aspect 16:9,9:16]
//
// Exits 1 if any scene has a HARD issue. Slow on purpose (it renders sampled frames per scene); this is
// an on-demand sweep, never part of the per-edit ladder.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { population } from '../../harness/lib/census.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const argv = process.argv.slice(2);
const aspectAt = argv.indexOf('--aspect');
const aspect = aspectAt >= 0 ? argv[aspectAt + 1] : null;
// `i !== aspectAt + 1` was meant to skip the value that follows `--aspect`. With no `--aspect` present
// indexOf returns -1, so the guard became `i !== 0` and threw away the first positional argument, which
// is the filter itself. `audit-scenes.mjs argus` therefore swept all 110 scenes and never said why.
const filter = argv.find((a, i) => !a.startsWith('--') && !(aspectAt >= 0 && i === aspectAt + 1)) || '';

const DIR = 'formats/scene';
// The same exclusion every library sweep uses: a sidecar is not a film.
const skip = (f) => !f.endsWith('.json') || f === 'schema.json' || f.startsWith('_')
  || /\.(intent|animatic|template)\.json$/.test(f);

const pop = population('audit-scenes', { filter: (f) => !skip(f) });
const scenes = pop.names
  .filter((f) => {
    if (filter && !f.includes(filter)) return false;
    // `block`/`beat`/`comp` sugar expands at LOAD time (core/engine/expand.js), so a source carrying it is
    // renderable directly; only a genuinely malformed file (no `layers` array) is excluded.
    const src = path.join(DIR, f);
    try {
      const d = JSON.parse(fs.readFileSync(src, 'utf8'));
      if (!Array.isArray(d.layers)) return false;
    } catch { return false; }
    return true;
  });

// A FILTER THAT MATCHED NOTHING PRINTED A GREEN TICK. `audit-scenes.mjs formats/scene/thread.json` swept
// 0 scenes and reported `✓ clean: 0 … errored: 0`, exit 0. The filter is a bare-FILENAME substring, so
// any path-shaped argument silently matches none. That is #377 at the scale of one command: the sweep
// reported confidence over a population it never had. Say what the filter did, always, and refuse an
// empty one rather than grading it.
console.log(`  audit-scenes · ${pop.n} candidate(s) in ${DIR}`
  + `${filter ? ` · filter "${filter}" (a substring of the FILENAME) leaves ${scenes.length}` : ` · ${scenes.length} auditable`}`);
if (!scenes.length) {
  console.error(`\n  ✗ audit-scenes: NOTHING TO AUDIT, ${filter
    ? `no filename in ${DIR}/ contains "${filter}". The filter is matched against the bare filename, so a path`
      + ` ("${DIR}/x.json") never matches; pass "x" instead.`
    : `${pop.n} candidate(s) were found and every one was excluded as un-auditable.`}\n`
    + `    Refusing rather than printing a clean sweep over 0 scenes.\n`);
  process.exit(3);
}

const rows = [];
for (const f of scenes) {
  const file = path.join(DIR, f);
  const args = ['quality/audit.mjs', file, ...(aspect ? ['--aspect', aspect] : [])];
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
  // pass/fail rule would drift from the one that printed it (engine-doctrine/MISTAKES.md #165).
  const hard = [...out.matchAll(/·\s*(\d+)\s+hard/g)].reduce((n, m) => n + +m[1], 0);
  // `warn` with nothing alphabetic after it. The audit ends with `· 9 warning(s)`, a restatement of the
  // same nine findings the per-scene row already reported, so an unanchored `warn` counted every warning
  // twice and this sweep printed exactly double. `hard` never had the bug: the closing line says HARD.
  const warn = [...out.matchAll(/·\s*(\d+)\s+warn(?![a-z])/g)].reduce((n, m) => n + +m[1], 0);
  const findings = out.split('\n').filter((l) => /^\s{5}\[/.test(l)).map((l) => l.trim());
  const errored = code !== 0 && hard === 0 && !findings.length;
  rows.push({ f, hard, warn, findings, errored, out });
  process.stdout.write(errored ? '!' : hard ? '✗' : warn ? '·' : '.');
}
process.stdout.write('\n\n');

const bad = rows.filter((r) => r.hard > 0);
const errored = rows.filter((r) => r.errored);

// The whole per-scene report (header line + every finding, never a head, a truncated list reads as
// "that was all of them") is the finding's own text: findings.mjs renders it verbatim, so the report
// prints exactly once whether or not --json is asked for.
const f = gateFindings({ line: (r) => r.summary });
for (const r of bad) {
  f.fail('audit-hard', [`✗ ${r.f}  (${r.hard} hard · ${r.warn} warn)`, ...r.findings.map((line) => `    ${line}`)].join('\n'), { at: r.f });
}
for (const r of errored) {
  f.fail('audit-errored', `! ${r.f}, audit could not run:\n${r.out.split('\n').slice(-4).join('\n')}`, { at: r.f });
}
f.emit();

const clean = rows.length - bad.length - errored.length;
console.log(`\n==== AUDIT-ALL · ${rows.length} scenes ====`);
console.log(`✓ clean: ${clean}   ✗ hard: ${bad.length}   ! errored: ${errored.length}`
  + `   ·warn-only: ${rows.filter((r) => !r.hard && !r.errored && r.warn).length}`);
process.exit(bad.length || errored.length ? 1 : 0);
