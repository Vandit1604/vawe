import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { splitWaiver } from '../lib/waivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATES_DIR = path.join(ROOT, 'quality', 'gates');
const SCENE_DIR = path.join(ROOT, 'films', 'scene');
const TIMEOUT_MS = Number(process.env.GATE_CENSUS_TIMEOUT_MS || 15_000);

export function authoredFilms() {
  const files = fs.readdirSync(SCENE_DIR);
  const storyboards = new Set(files.filter((f) => f.endsWith('.storyboard.md')).map((f) => f.slice(0, -('.storyboard.md'.length))));
  return [...storyboards].filter((name) => fs.existsSync(path.join(SCENE_DIR, `${name}.json`))).sort();
}

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
  'draft-check.mjs': (f) => [f, '--stage', '95'],
  'edge-check.mjs': (f) => [f],
  'font-audit.mjs': (f) => ['scene', f],
  'frame-check.mjs': (f) => [f],
  'inspect.mjs': (f) => [f],
  'judge.mjs': (f) => [f],
  'motion-split.mjs': (f) => [f],
  'paints-nothing.mjs': (f) => [f],
  'plan-vs-render.mjs': (f) => [f],
  'preflight.mjs': (f) => [f],
  'read-check.mjs': (f) => [f],
  'seams.mjs': (f) => [f],
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
  'lint-test.mjs', 'mistakes-dupes.mjs', 'motion-audit.mjs', 'output-contract.mjs',
  'prop-probe.mjs', 'rung.mjs', 'schema-drift.mjs', 'sfx-audit.mjs', 'silent-fallback.mjs', 'threshold-provenance.mjs',
  'sim-audit.mjs', 'site-counts.mjs', 'theme-look-spread.mjs', 'transitions-catalog.mjs', 'unused.mjs',
  'discovery.mjs',
];

// other: real CLIs, but their contract is N arbitrary files, a baseline-writer, or a probe harness, not "one check over one film" or "one check over the repo"; listed, never run, never deleted for firing zero times.
export const OTHER_TOOLS = ['compare.mjs', 'similarity.mjs', 'canvas-purity.mjs', 'ledger.mjs', 'probe-purity.mjs', 'scene-snap.mjs', 'snap-blocks.mjs', 'snap-scenes.mjs'];

// reporter: always exits 0, never emits a finding; stage.mjs is the pipeline status line, pace.mjs the tempo-preview instrument (no floor, no verdict, per its own header).
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
  // exclude the file's own gate-dir self-hit from "other-gate" (it always contains its own name in its usage comment)
  grep(['quality/gates', '--include=*.mjs'], 'other-gate');
  grep(['harness', '--include=*.mjs'], 'harness');
  grep(['engine-doctrine', '--include=*.md'], 'docs');
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

const PRECONDITION_CODES = new Set([
  'judge-not-ready',   // judge.mjs: no render, or a render older than the scene it claims to grade
  'no-preflight',      // preflight.mjs: the decision-chain receipt was never recorded for this version
  'incomplete',        // study-check.mjs: the STUDY (not the film) is missing pages/prose; unreached by
]);
function classifyOutcome(run) {
  if (run.timedOut) return 'could-not-run';
  if (run.exitCode === 2) return 'could-not-run';
  if (run.exitCode === 0) return 'passed';
  const liveErrors = (run.findings || []).filter((r) => r.severity === 'error' && !r.waived && !PRECONDITION_CODES.has(r.code));
  return liveErrors.length ? 'refused' : 'could-not-run';
}

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

// Guarded: quality/gates/gate-classification.mjs imports FILM_CHECKS/REPO_CHECKS/etc. from this module; a bare main() would re-run the whole census as a side effect of that import.
if (import.meta.url === `file://${process.argv[1]}`) main();
