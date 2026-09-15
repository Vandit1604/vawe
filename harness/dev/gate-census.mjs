// harness/dev/gate-census.mjs: which checks in quality/gates ever fire?
//
// Nobody has measured this. The owner's complaint ("gates are just problematic for us, not useful,
// they hold us back") and an outside audit (225 make targets, 95 files in quality/gates) both point
// the same way: strip weight that never earns its keep. This script is the measurement, not the
// opinion. It runs every check over every authored film, records what happened, and prints one table.
// Deleting anything is a separate, human-reviewed step (see engine-doctrine/gate-census.md / the plan).
//
// Run: node harness/dev/gate-census.mjs [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATES_DIR = path.join(ROOT, 'quality', 'gates');
const SCENE_DIR = path.join(ROOT, 'formats', 'scene');
const TIMEOUT_MS = Number(process.env.GATE_CENSUS_TIMEOUT_MS || 15_000);

// ---- discover authored films: a formats/scene/<name>.json with a matching <name>.storyboard.md ----
function authoredFilms() {
  const files = fs.readdirSync(SCENE_DIR);
  const storyboards = new Set(files.filter((f) => f.endsWith('.storyboard.md')).map((f) => f.slice(0, -('.storyboard.md'.length))));
  return [...storyboards].filter((name) => fs.existsSync(path.join(SCENE_DIR, `${name}.json`))).sort();
}

// ---- classification: how does this check's CLI take a film, if it does at all? ----
// Derived by reading every usage comment in quality/gates/*.mjs (see the plan's phase B notes) and
// grouping the remainder by whether the source ever touches process.argv, and whether the file is
// wired into any make target. Kept explicit here (not re-derived at run time) because the four kinds
// below need genuinely different handling, and guessing that from source shape is exactly the kind of
// silent-drift heuristic this repo warns against elsewhere (findings.mjs, engine-doctrine/MISTAKES.md #401).
const LIBRARIES = ['beats-of.mjs', 'block-schema.mjs', 'paths.mjs', 'rubric.mjs', 'scene-timing.mjs', 'snap-signature.mjs', 'tile.mjs'];

// film: single positional arg is a formats/scene/<name>.json path (a few need a second literal arg).
const FILM_CHECKS = {
  'asset-check.mjs': (f) => [f],
  'audio-check.mjs': (f) => [f],
  'author-check.mjs': (f) => [f],
  'beat-check.mjs': (f) => [f],
  'copy-check.mjs': (f) => [f],
  'craft-checklist.mjs': (f) => [f],
  'critique.mjs': (f) => [f],
  'designspec-check.mjs': (f) => [f],
  'direction-floor.mjs': (f) => [f],
  'dissolve-check.mjs': (f) => [f],
  'draft-check.mjs': (f) => [f, '--stage', '95'],
  'eye-trace.mjs': (f) => [f],
  'font-audit.mjs': (f) => ['scene', f],
  'frame-check.mjs': (f) => [f],
  'inspect.mjs': (f) => [f],
  'judge.mjs': (f) => [f],
  'motion-floor.mjs': (f) => [f],
  'motion-split.mjs': (f) => [f],
  'pace-check.mjs': (f) => [f],
  'paints-nothing.mjs': (f) => [f],
  'plan-vs-render.mjs': (f) => [f],
  'preflight.mjs': (f) => [f],
  'read-check.mjs': (f) => [f],
  'seam-forensics.mjs': (f) => [f],
  'seam-snap.mjs': (f) => [f],
  'stage.mjs': (f) => [f],
  'study-verify.mjs': (f) => [f],
  'sweep-static.mjs': (f) => [f],
  'waiver-drift.mjs': (f) => [f],
  'next.mjs': (f) => [f],
  'study-check.mjs': (f, name) => [name],
  'storyboard-check.mjs': (_f, name) => [path.join('formats', 'scene', `${name}.storyboard.md`)],
};

// repo: no film argument, scans the whole tree once.
const REPO_CHECKS = [
  'arsenal-check.mjs', 'audit-scenes.mjs', 'blocks-audit.mjs', 'code-quality.mjs', 'conformance.mjs',
  'coverage.mjs', 'craft-coverage.mjs', 'dead-branch.mjs', 'doc-map.mjs', 'doc-refs.mjs',
  'docker-context.mjs', 'docs-drift.mjs', 'feature-audit.mjs', 'gate-mutation.mjs', 'generated-check.mjs',
  'glyphs-audit.mjs', 'knobs-audit.mjs', 'layer-props.mjs', 'legacy-fold.mjs', 'legacy-unfold.mjs',
  'lint-test.mjs', 'mistakes-dupes.mjs', 'motion-audit.mjs', 'no-judge.mjs', 'output-contract.mjs',
  'prop-probe.mjs', 'rung.mjs', 'schema-drift.mjs', 'sfx-audit.mjs', 'silent-fallback.mjs',
  'sim-audit.mjs', 'site-counts.mjs', 'theme-look-spread.mjs', 'transitions-catalog.mjs', 'unused.mjs',
  'discovery.mjs',
];

// other: real CLIs, but their contract is N arbitrary files, a baseline-writer, or a probe harness,
// not "one check over one film" or "one check over the repo". Listed, never run, never deleted for
// firing zero times, because that would penalize a shape this script cannot exercise.
const OTHER_TOOLS = ['compare.mjs', 'similarity.mjs', 'canvas-purity.mjs', 'ledger.mjs', 'probe-purity.mjs', 'scene-snap.mjs', 'snap-blocks.mjs', 'snap-scenes.mjs'];

function allGateFiles() {
  return fs.readdirSync(GATES_DIR).filter((f) => f.endsWith('.mjs')).sort();
}

function referencedBy(basename) {
  const refs = [];
  const grep = (args, label) => {
    try {
      const out = execFileSync('grep', ['-rl', basename, ...args], { cwd: ROOT, encoding: 'utf8' });
      if (out.trim()) refs.push(label);
    } catch { /* grep exits 1 on no match */ }
  };
  grep(['Makefile'], 'Makefile');
  grep(['.githooks'], '.githooks');
  grep(['quality/gates', '--include=*.mjs'], 'other-gate');
  grep(['harness', '--include=*.mjs'], 'harness');
  grep(['engine-doctrine', '--include=*.md'], 'docs');
  // exclude the file's own gate-dir self-hit from "other-gate" (it always contains its own name in its usage comment)
  return refs.filter((r) => !(r === 'other-gate' && refs.length === 1));
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function runOnce(file, args) {
  const tmpOut = path.join(ROOT, 'out', `.gate-census-findings-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const start = Date.now();
  let exitCode = 0;
  let timedOut = false;
  try {
    execFileSync('node', [path.join('quality', 'gates', file), ...args], {
      cwd: ROOT,
      timeout: TIMEOUT_MS,
      env: { ...process.env, VAWE_FINDINGS_OUT: tmpOut },
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch (err) {
    if (err.signal === 'SIGTERM' || err.code === 'ETIMEDOUT') timedOut = true;
    exitCode = typeof err.status === 'number' ? err.status : 1;
  }
  const ms = Date.now() - start;
  let findings = null;
  if (fs.existsSync(tmpOut)) {
    try { findings = JSON.parse(fs.readFileSync(tmpOut, 'utf8')); } catch { /* not our contract to fix */ }
    fs.unlinkSync(tmpOut);
  }
  return { exitCode, ms, timedOut, findings };
}

function severityCounts(findings) {
  const c = { error: 0, warn: 0, info: 0 };
  if (Array.isArray(findings)) for (const r of findings) if (c[r.severity] !== undefined) c[r.severity]++;
  return c;
}

function main() {
  const films = authoredFilms();
  const files = allGateFiles();
  const jsonFlagIdx = process.argv.indexOf('--json');
  const jsonOut = jsonFlagIdx >= 0 ? process.argv[jsonFlagIdx + 1] : null;

  const results = [];

  for (const file of files) {
    if (file.endsWith('.test.mjs')) { results.push({ file, kind: 'test-skip', note: 'run via lib-test.mjs, not censused directly' }); continue; }
    if (LIBRARIES.includes(file)) { results.push({ file, kind: 'library-skip', note: 'no CLI: exports only, not wired to any make target' }); continue; }
    if (OTHER_TOOLS.includes(file)) { results.push({ file, kind: 'other-skip', note: 'multi-file/baseline/probe CLI, not a per-film or repo check' }); continue; }

    const refs = referencedBy(file);
    process.stderr.write(`censusing ${file}...\n`);

    if (FILM_CHECKS[file]) {
      const runs = [];
      for (const name of films) {
        const filmJson = path.join('formats', 'scene', `${name}.json`);
        const args = FILM_CHECKS[file](filmJson, name);
        const r = runOnce(file, args);
        runs.push({ name, ...r });
      }
      const firedRuns = runs.filter((r) => r.findings && r.findings.length > 0);
      const blockedRuns = runs.filter((r) => r.exitCode !== 0);
      const sev = { error: 0, warn: 0, info: 0 };
      for (const r of runs) { const c = severityCounts(r.findings); sev.error += c.error; sev.warn += c.warn; sev.info += c.info; }
      results.push({
        file, kind: 'film', filmsRun: runs.length, filmsFired: firedRuns.length, filmsBlocked: blockedRuns.length,
        medianMs: median(runs.map((r) => r.ms)), severities: sev, referencedBy: refs, timeouts: runs.filter((r) => r.timedOut).length,
      });
    } else if (REPO_CHECKS.includes(file)) {
      const r = runOnce(file, []);
      const sev = severityCounts(r.findings);
      results.push({
        file, kind: 'repo', filmsRun: 1, filmsFired: (r.findings && r.findings.length > 0) ? 1 : 0,
        filmsBlocked: r.exitCode !== 0 ? 1 : 0, medianMs: r.ms, severities: sev, referencedBy: refs, timeouts: r.timedOut ? 1 : 0,
      });
    } else {
      results.push({ file, kind: 'unclassified', note: 'not in any list above: add it before trusting this census', referencedBy: refs });
    }
  }

  if (jsonOut) fs.writeFileSync(path.join(ROOT, jsonOut), JSON.stringify({ generatedAt: new Date().toISOString(), films, results }, null, 2));

  // ---- print the table, sorted by fire rate ----
  const scored = results.filter((r) => r.kind === 'film' || r.kind === 'repo')
    .map((r) => ({ ...r, fireRate: r.filmsRun ? r.filmsFired / r.filmsRun : 0 }))
    .sort((a, b) => a.fireRate - b.fireRate || a.file.localeCompare(b.file));

  console.log('check                          kind   run  fired  blocked  medianMs  referenced-by');
  for (const r of scored) {
    console.log(
      `${r.file.padEnd(31)} ${r.kind.padEnd(6)} ${String(r.filmsRun).padStart(3)}  ${String(r.filmsFired).padStart(5)}  ${String(r.filmsBlocked).padStart(7)}  ${String(Math.round(r.medianMs ?? 0)).padStart(8)}  ${r.referencedBy.join(',') || '(none)'}`
    );
  }

  const skipped = results.filter((r) => r.kind !== 'film' && r.kind !== 'repo');
  if (skipped.length) {
    console.log('\nskipped (not censused):');
    for (const r of skipped) console.log(`  ${r.file.padEnd(31)} ${r.kind.padEnd(16)} ${r.note || ''}`);
  }

  const zeroFire = scored.filter((r) => r.fireRate === 0);
  console.log(`\n${zeroFire.length} check(s) fired on zero films/runs: ${zeroFire.map((r) => r.file).join(', ') || '(none)'}`);
}

main();
