import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fontState } from '../../quality/gates/snap-signature.mjs';
import { readFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNS_DIR = path.join(repoRoot, 'quality', 'runs', 'e2e');

const known = JSON.parse(fs.readFileSync(path.join(repoRoot, 'quality', 'baselines', 'e2e-known-broken.json'), 'utf8'));
const knownScenes = known.scenes || {};
const trackedScenes = new Set(spawnSync('git', ['ls-files', 'films/scene/*.json'], { cwd: repoRoot, encoding: 'utf8' })
  .stdout.split('\n').filter(Boolean).map((f) => path.basename(f, '.json')));
const isTrackedScene = (n) => trackedScenes.has(n);

const nowStamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(RUNS_DIR, nowStamp);
fs.mkdirSync(runDir, { recursive: true });

let sha = 'unknown';
try { sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(); } catch { /* detached/no-git, still report */ }
const font = fontState(repoRoot);

const results = [];

/** Run one command, never throw: a check that crashes the harness is a check that hides the other five. */
function run(cmd, args, opts = {}) {
  const t0 = Date.now();
  let r;
  try {
    r = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  } catch (e) {
    r = { status: 1, stdout: '', stderr: String(e && e.message || e), error: e };
  }
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status == null ? 1 : r.status, durationMs: Date.now() - t0 };
}

const findingsPath = (name) => path.join(runDir, `${name}.findings.json`);

function record(name, command, res, extra) {
  const entry = { name, command, exitCode: res.exitCode, durationMs: res.durationMs, ...extra };
  results.push(entry);
  console.log(`${entry.pass ? '✓' : '✗'} ${name} (${(res.durationMs / 1000).toFixed(1)}s)`);
  return entry;
}

{
  const filmsDir = path.join(repoRoot, 'films');
  const formats = fs.existsSync(filmsDir)
    ? fs.readdirSync(filmsDir).filter((f) => fs.existsSync(path.join(filmsDir, f, 'scene.html'))).sort()
    : [];
  let sampled = 0, failedFrames = 0, allOk = true;
  const perFormat = [];
  for (const fmt of formats) {
    const out = findingsPath(`probe-${fmt}`);
    const res = run('node', ['quality/gates/probe-purity.mjs', fmt], { env: { ...process.env, VAWE_FINDINGS_OUT: out } });
    const okMatch = res.stdout.match(/purity OK: (\d+) sampled frames/);
    const failMatch = res.stdout.match(/purity FAILED: (\d+)\/(\d+) frames/);
    const ok = res.exitCode === 0;
    allOk = allOk && ok;
    sampled += okMatch ? Number(okMatch[1]) : failMatch ? Number(failMatch[2]) : 0;
    failedFrames += failMatch ? Number(failMatch[1]) : 0;
    perFormat.push({ format: fmt, pass: ok, exitCode: res.exitCode });
    fs.writeFileSync(path.join(runDir, `probe-${fmt}.log`), res.stdout + res.stderr);
  }
  record('probe', 'node quality/gates/probe-purity.mjs <format>  (every films/*/scene.html)',
    { exitCode: allOk ? 0 : 1, durationMs: 0 },
    { pass: allOk && formats.length > 0, counts: { formats: formats.length, framesSampled: sampled, framesFailed: failedFrames }, perFormat });
}

function runSnap(name, script, sceneKeyword) {
  const out = findingsPath(name);
  const res = run('node', [script], { env: { ...process.env, VAWE_FINDINGS_OUT: out } });
  fs.writeFileSync(path.join(runDir, `${name}.log`), res.stdout + res.stderr);
  const m = res.stdout.match(/identical: (\d+)\s+△ changed: (\d+)\s+✗ (?:quarantined|non-deterministic): (\d+)\s+⚠ errored: (\d+)\s+○ no-baseline: (\d+)\s+~ stale-font: (\d+)/);
  const counts = m
    ? { identical: +m[1], changed: +m[2], quarantinedOrNondeterministic: +m[3], errored: +m[4], noBaseline: +m[5], staleFont: +m[6] }
    : { identical: 0, changed: 0, quarantinedOrNondeterministic: 0, errored: 0, noBaseline: 0, staleFont: 0 };
  const records = readFindings(out) || [];
  const namesFor = (code) => records.filter((r) => r.code === code)
    .map((r) => r.at || (r.summary || '').split(':')[0].trim());
  const erroredNames = namesFor('render-error').concat(namesFor('block-error'));
  const changedNames = namesFor('scene-changed').concat(namesFor('block-changed'));
  const quarantinedNames = namesFor('quarantined').concat(namesFor('non-deterministic'));
  const nothingCompared = records.some((r) => r.code === 'nothing-compared');

  const newErrored = erroredNames.filter((n) => !(n in knownScenes) && isTrackedScene(n));
  const untrackedErrored = erroredNames.filter((n) => !isTrackedScene(n));

  const compared = counts.identical + counts.changed;
  const pass = Boolean(m) && compared > 0 && newErrored.length === 0 && changedNames.length === 0
    && quarantinedNames.length === 0 && !nothingCompared;
  return record(name, `node ${script}${sceneKeyword ? '' : ''}`, res, {
    pass, counts,
    compared, erroredNames, newErrored, untrackedErrored, changedNames, quarantinedNames, nothingCompared,
  });
}

runSnap('snap-all', 'quality/gates/snap-scenes.mjs');

runSnap('snap-blocks', 'quality/gates/snap-blocks.mjs');

{
  const res = run('node', ['mcp/smoke.mjs', '--no-render']);
  fs.writeFileSync(path.join(runDir, 'mcp-smoke.log'), res.stdout + res.stderr);
  const toolsMatch = res.stdout.match(/tools: (.+)/);
  record('mcp-smoke', 'node mcp/smoke.mjs --no-render', res, {
    pass: res.exitCode === 0,
    counts: { tools: toolsMatch ? toolsMatch[1].split(',').length : 0 },
  });
}

{
  const siteDir = path.join(repoRoot, 'site');
  const testDir = path.join(siteDir, 'test');
  const tapOut = path.join(runDir, 'site-test.tap');
  if (!fs.existsSync(path.join(siteDir, 'node_modules'))) {
    record('site-test', 'cd site && npm test', { exitCode: 1, durationMs: 0 }, {
      pass: false, counts: {}, notes: ['site/node_modules missing, run `npm ci` in site/'],
    });
  } else {
    const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.mjs'));
    const res = run('node', ['--test', '--test-concurrency=1', '--test-reporter=tap',
      `--test-reporter-destination=${tapOut}`, ...files.map((f) => path.join('test', f))], { cwd: siteDir });
    fs.writeFileSync(path.join(runDir, 'site-test.log'), res.stdout + res.stderr);
    let tap = '';
    try { tap = fs.readFileSync(tapOut, 'utf8'); } catch { /* reporter failed to write, counts stay 0 */ }
    const num = (re) => { const m = tap.match(re); return m ? Number(m[1]) : 0; };
    const counts = { tests: num(/# tests (\d+)/), pass: num(/# pass (\d+)/), fail: num(/# fail (\d+)/) };
    record('site-test', 'cd site && npm test', res, {
      pass: res.exitCode === 0 && counts.fail === 0 && counts.tests > 0, counts,
    });
  }
}

{
  const out = findingsPath('author-check');
  const target = 'films/scene/preface-launch.json';
  const res = run('node', ['quality/gates/author-check.mjs', target], { env: { ...process.env, VAWE_FINDINGS_OUT: out } });
  fs.writeFileSync(path.join(runDir, 'author-check.log'), res.stdout + res.stderr);
  const records = readFindings(out) || [];
  const hardCodes = records.filter((r) => r.severity === 'error').map((r) => r.code);
  record('author-check', `node quality/gates/author-check.mjs ${target}`, res, {
    pass: res.exitCode === 0, counts: { findings: records.length, hard: hardCodes.length }, hardCodes,
  });
}

const overallPass = results.every((r) => r.pass);
const report = { timestamp: new Date().toISOString(), sha, fontState: font, pass: overallPass, checks: results };

fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(RUNS_DIR, 'latest.json'), JSON.stringify(report, null, 2) + '\n');

const md = [
  `# e2e run · ${report.timestamp}`,
  '',
  `sha \`${sha}\` · font-state \`${font.hash}\` (${font.n} locked face(s)) · verdict **${overallPass ? 'PASS' : 'FAIL'}**`,
  '',
  '| check | pass | exit | duration | counts |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.name} | ${r.pass ? '✓' : '✗'} | ${r.exitCode} | ${(r.durationMs / 1000).toFixed(1)}s | ${JSON.stringify(r.counts || {})} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(runDir, 'report.md'), md);

console.log(`\n==== e2e: ${overallPass ? 'PASS' : 'FAIL'} · ${results.filter((r) => r.pass).length}/${results.length} checks ====`);
for (const r of results) if (!r.pass) console.log(`  ✗ ${r.name}`);
console.log(`report: quality/runs/e2e/${nowStamp}/report.json (also quality/runs/e2e/latest.json)`);
process.exit(overallPass ? 0 : 1);
