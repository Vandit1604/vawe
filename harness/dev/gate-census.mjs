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
import { splitWaiver } from '../lib/waivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATES_DIR = path.join(ROOT, 'quality', 'gates');
const SCENE_DIR = path.join(ROOT, 'films', 'scene');
const TIMEOUT_MS = Number(process.env.GATE_CENSUS_TIMEOUT_MS || 15_000);

// ---- discover authored films: a films/scene/<name>.json with a matching <name>.storyboard.md ----
export function authoredFilms() {
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
export const LIBRARIES = ['beats-of.mjs', 'block-schema.mjs', 'edge-reveal.mjs', 'paths.mjs', 'rubric.mjs', 'scene-timing.mjs', 'snap-signature.mjs', 'tile.mjs'];

// film: single positional arg is a films/scene/<name>.json path (a few need a second literal arg).
export const FILM_CHECKS = {
  'asset-check.mjs': (f) => [f],
  'audio-check.mjs': (f) => [f],
  'author-check.mjs': (f) => [f],
  'beat-check.mjs': (f) => [f],
  'copy-check.mjs': (f) => [f],
  'covered-move.mjs': (f) => [f],
  'craft-checklist.mjs': (f) => [f],
  'critique.mjs': (f) => [f],
  'designspec-check.mjs': (f) => [f],
  'direction-floor.mjs': (f) => [f],
  'dissolve-check.mjs': (f) => [f],
  'draft-check.mjs': (f) => [f, '--stage', '95'],
  'edge-check.mjs': (f) => [f],
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
  'study-verify.mjs': (f) => [f],
  'sweep-static.mjs': (f) => [f],
  'waiver-drift.mjs': (f) => [f],
  'next.mjs': (f) => [f],
  'study-check.mjs': (f, name) => [name],
  'storyboard-check.mjs': (_f, name) => [path.join('films', 'scene', `${name}.storyboard.md`)],
};

// repo: no film argument, scans the whole tree once.
export const REPO_CHECKS = [
  'arsenal-check.mjs', 'audit-scenes.mjs', 'blocks-audit.mjs', 'code-quality.mjs', 'conformance.mjs',
  'coverage.mjs', 'craft-coverage.mjs', 'dead-branch.mjs', 'doc-map.mjs', 'doc-refs.mjs',
  'docker-context.mjs', 'docker-context-check.mjs', 'docs-drift.mjs', 'feature-audit.mjs', 'gate-mutation.mjs', 'generated-check.mjs',
  'glyphs-audit.mjs', 'knobs-audit.mjs', 'layer-props.mjs', 'legacy-fold.mjs', 'legacy-unfold.mjs',
  'lint-test.mjs', 'mistakes-dupes.mjs', 'motion-audit.mjs', 'no-judge.mjs', 'output-contract.mjs',
  'prop-probe.mjs', 'rung.mjs', 'schema-drift.mjs', 'sfx-audit.mjs', 'silent-fallback.mjs', 'threshold-provenance.mjs',
  'sim-audit.mjs', 'site-counts.mjs', 'theme-look-spread.mjs', 'transitions-catalog.mjs', 'unused.mjs',
  'discovery.mjs',
];

// other: real CLIs, but their contract is N arbitrary files, a baseline-writer, or a probe harness,
// not "one check over one film" or "one check over the repo". Listed, never run, never deleted for
// firing zero times, because that would penalize a shape this script cannot exercise.
export const OTHER_TOOLS = ['compare.mjs', 'similarity.mjs', 'canvas-purity.mjs', 'ledger.mjs', 'probe-purity.mjs', 'scene-snap.mjs', 'snap-blocks.mjs', 'snap-scenes.mjs'];

// reporter: prints status, never emits a finding or a non-zero exit for a real defect (no gateFindings
// import, no process.exit(1) path). Scoring one by fire-rate always reads as 0 and looks like a dead
// gate; it is not a gate at all. stage.mjs (`make stage`) is the film-pipeline "what stage is this in,
// what's next" status line, and pace.mjs (`make pace`) is the tempo-preview instrument, "every measured
// fact printed as info, no floor, no verdict" per its own header. Both always process.exit(0). pace.mjs
// was previously in no list at all here (unclassified, "add it before trusting this census"), found
// while merging its duplicated event-measurement with pace-check.mjs. Listed here, not deleted and not
// scored, for the same reason OTHER_TOOLS is exempt: the census can't measure a shape it isn't.
export const REPORTERS = ['stage.mjs', 'pace.mjs'];

export function allGateFiles() {
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
  grep(['.github/workflows', '--include=*.yml'], 'ci');
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

// ---- outcome: refused, could-not-run, or passed. NOT the same split as exit code. ----
//
// The old census read "exitCode !== 0" as "blocked", which is why seam-snap, judge, preflight,
// author-check, study-check, study-verify and waiver-drift all read "blocked N of N": none of them
// refused those films, they had no rendered mp4, no prep receipt, or (study-check) were handed a film
// name where their contract wants a STUDIED REFERENCE name. A non-zero exit is what a missing
// precondition and a real defect both look like from outside; only the finding records tell them apart,
// and even those disagree on HOW they record it, read gate by gate below.
//
//   - exit 2 is this repo's own convention for "could not even start": bad usage, a missing/invalid
//     scene file, a missing precondition file named explicitly (`no grammar/<name>.json`, `no such
//     scene`). Every FILM_CHECKS gate uses it this way (grep `process.exit(2)` across quality/gates/).
//     Confirmed on this census: study-check.mjs's census wiring hands it a FILM name where its CLI
//     wants a studied REFERENCE name, so every real run here dies at this exit(2) branch with zero
//     findings recorded, never reaching its own 'incomplete' code at all.
//   - a timeout is an environment fact (the machine, not the film): draft-rendering study-verify.mjs
//     inline routinely runs past this script's own TIMEOUT_MS.
//   - exit 1 is ambiguous, and the two shapes below both occur in gates this census runs today,
//     confirmed by running the unmodified census once as a baseline before writing this function:
//     (a) NO finding recorded at all: seam-snap.mjs's and study-verify.mjs's "no render"/"study wrote
//         nothing" branches call console.error and exit(1) without ever calling `.fail` (read line by
//         line in both files). Baseline evidence: seam-snap.mjs read 20 run / 0 fired / 20 blocked, so
//         all 20 non-zero exits carried zero findings.
//     (b) a PRECONDITION finding recorded WITH error severity: judge.mjs's `judge-not-ready` and
//         preflight.mjs's `no-preflight` both call `.fail(...)` before exit(1), even though the fact
//         being reported is "no render exists yet" / "this scene has never been through the chain",
//         not a content defect. Baseline evidence: judge.mjs read 20 run / 20 fired / 20 blocked with
//         zero authored films rendered anywhere near this run, i.e. every single "finding" was the
//         same missing-precondition notice, not 20 independent judgments.
//   So: PRECONDITION_CODES names the codes known (from reading the gate, not guessed) to report shape
//   (b); anything else with a live (non-waived) error-severity record at exit 1 is shape "a real defect
//   with a code", i.e. REFUSED. No finding at all, or only a PRECONDITION_CODE, is COULD-NOT-RUN. This
//   is not a claim that every future gate's precondition code has been enumerated: a gate this census
//   has not yet been run against, or a new code, needs its own line added here the same way FILM_CHECKS
//   above says a shape must be read from the source, not guessed from exit code alone.
const PRECONDITION_CODES = new Set([
  'judge-not-ready',   // judge.mjs: no render, or a render older than the scene it claims to grade
  'no-preflight',      // preflight.mjs: the decision-chain receipt was never recorded for this version
  'incomplete',        // study-check.mjs: the STUDY (not the film) is missing pages/prose; unreached by
                        // this census today (see exit-2 note above), kept for when it is
]);
function classifyOutcome(run) {
  if (run.timedOut) return 'could-not-run';
  if (run.exitCode === 2) return 'could-not-run';
  if (run.exitCode === 0) return 'passed';
  const liveErrors = (run.findings || []).filter((r) => r.severity === 'error' && !r.waived && !PRECONDITION_CODES.has(r.code));
  return liveErrors.length ? 'refused' : 'could-not-run';
}

// ---- waivers: one author writing "this rule does not fit my film", per code, across every scene ----
// (not just the ones with a matching storyboard: a waiver is a fact about the film regardless of
// whether it was ever put through this specific census).
function waiverCounts() {
  const counts = new Map(); // code -> { total, films: Set }
  const files = fs.readdirSync(SCENE_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    let scene;
    try { scene = JSON.parse(fs.readFileSync(path.join(SCENE_DIR, file), 'utf8')); } catch { continue; }
    const allow = scene?.authoring?.allow;
    if (!Array.isArray(allow)) continue;
    for (const entry of allow) {
      const { code } = splitWaiver(entry);
      if (!counts.has(code)) counts.set(code, { total: 0, films: new Set() });
      const c = counts.get(code);
      c.total++;
      c.films.add(file);
    }
  }
  return [...counts.entries()]
    .map(([code, { total, films }]) => ({ code, total, films: films.size }))
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
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
    if (REPORTERS.includes(file)) { results.push({ file, kind: 'reporter-skip', note: 'status/reporting tool: never fails, so a fire-rate score is meaningless' }); continue; }

    const refs = referencedBy(file);
    process.stderr.write(`censusing ${file}...\n`);

    if (FILM_CHECKS[file]) {
      const runs = [];
      for (const name of films) {
        const filmJson = path.join('films', 'scene', `${name}.json`);
        const args = FILM_CHECKS[file](filmJson, name);
        const r = runOnce(file, args);
        runs.push({ name, ...r });
      }
      const firedRuns = runs.filter((r) => r.findings && r.findings.length > 0);
      const outcomes = runs.map((r) => classifyOutcome(r));
      const refusedRuns = outcomes.filter((o) => o === 'refused').length;
      const couldNotRunRuns = outcomes.filter((o) => o === 'could-not-run').length;
      const sev = { error: 0, warn: 0, info: 0 };
      for (const r of runs) { const c = severityCounts(r.findings); sev.error += c.error; sev.warn += c.warn; sev.info += c.info; }
      results.push({
        file, kind: 'film', filmsRun: runs.length, filmsFired: firedRuns.length,
        filmsRefused: refusedRuns, filmsCouldNotRun: couldNotRunRuns,
        medianMs: median(runs.map((r) => r.ms)), severities: sev, referencedBy: refs, timeouts: runs.filter((r) => r.timedOut).length,
      });
    } else if (REPO_CHECKS.includes(file)) {
      const r = runOnce(file, []);
      const sev = severityCounts(r.findings);
      const outcome = classifyOutcome(r);
      results.push({
        file, kind: 'repo', filmsRun: 1, filmsFired: (r.findings && r.findings.length > 0) ? 1 : 0,
        filmsRefused: outcome === 'refused' ? 1 : 0, filmsCouldNotRun: outcome === 'could-not-run' ? 1 : 0,
        medianMs: r.ms, severities: sev, referencedBy: refs, timeouts: r.timedOut ? 1 : 0,
      });
    } else {
      results.push({ file, kind: 'unclassified', note: 'not in any list above: add it before trusting this census', referencedBy: refs });
    }
  }

  const waivers = waiverCounts();

  if (jsonOut) fs.writeFileSync(path.join(ROOT, jsonOut), JSON.stringify({ generatedAt: new Date().toISOString(), films, results, waivers }, null, 2));

  // ---- print the table, sorted by refusal rate (the number that actually ranks a gate: how often it
  // caught something real, not how often it could not run at all) ----
  const scored = results.filter((r) => r.kind === 'film' || r.kind === 'repo')
    .map((r) => ({ ...r, refuseRate: r.filmsRun ? r.filmsRefused / r.filmsRun : 0 }))
    .sort((a, b) => a.refuseRate - b.refuseRate || a.file.localeCompare(b.file));

  console.log('check                          kind   run  fired  refused  no-run  medianMs  referenced-by');
  for (const r of scored) {
    console.log(
      `${r.file.padEnd(31)} ${r.kind.padEnd(6)} ${String(r.filmsRun).padStart(3)}  ${String(r.filmsFired).padStart(5)}  ${String(r.filmsRefused).padStart(7)}  ${String(r.filmsCouldNotRun).padStart(6)}  ${String(Math.round(r.medianMs ?? 0)).padStart(8)}  ${r.referencedBy.join(',') || '(none)'}`
    );
  }

  const skipped = results.filter((r) => r.kind !== 'film' && r.kind !== 'repo');
  if (skipped.length) {
    console.log('\nskipped (not censused):');
    for (const r of skipped) console.log(`  ${r.file.padEnd(31)} ${r.kind.padEnd(16)} ${r.note || ''}`);
  }

  const zeroFire = scored.filter((r) => r.filmsFired === 0);
  console.log(`\n${zeroFire.length} check(s) fired on zero films/runs: ${zeroFire.map((r) => r.file).join(', ') || '(none)'}`);

  const allCouldNotRun = scored.filter((r) => r.filmsRun > 0 && r.filmsCouldNotRun === r.filmsRun);
  console.log(`${allCouldNotRun.length} check(s) could not run on ANY film (precondition always absent here): ${allCouldNotRun.map((r) => r.file).join(', ') || '(none)'}`);

  console.log(`\nwaivers: ${waivers.reduce((n, w) => n + w.total, 0)} across ${waivers.length} distinct code(s), read from every films/scene/*.json authoring.allow\n`);
  console.log('code                              waived  films');
  for (const w of waivers) console.log(`${w.code.padEnd(33)} ${String(w.total).padStart(6)}  ${w.films}`);
}

// Guarded: quality/gates/gate-classification.mjs imports FILM_CHECKS/REPO_CHECKS/etc. from this module
// to stay the one source of truth for "which gates judge a film". A bare `main()` would re-run the
// whole census (every gate, every local film) as a side effect of that import.
if (import.meta.url === `file://${process.argv[1]}`) main();
