// verify/review.mjs: one-command system health snapshot. Runs the fast checks and tiles the
// per-format layout overlays into a single sheet you can scan. The heavier render-integrity check
// (make verify) and purity guard (make probe) stay separate; this is the routine "are we good?".
//   node verify/review.mjs        (make review)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (label, cmd, args) => {
  process.stdout.write(`\n▶ ${label}…\n`);
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  return { label, ok: r.status === 0 };
};

const results = [];
results.push(run('motion primitives (lib-test)', 'node', ['quality/gates/lib-test.mjs']));
results.push(run('layout audit (overlap/spacing)', 'node', ['quality/audit.mjs']));
results.push(run('motion audit (animation over time)', 'node', ['quality/gates/motion-audit.mjs', '--stride', '2']));
// Doc-only work runs no authoring gate, so a command or path that rotted out of the docs is invisible
// until an author types it. This is pure file reads and costs about a second.
results.push(run('doc refs (commands + paths the docs name)', 'node', ['quality/gates/doc-refs.mjs']));
// The site boots the engine out of site/public/, and site-engine.mjs has always known how to publish
// it. What was missing is that NOTHING RAN ITS CHECK outside a site build, so between builds the page
// served a frozen engine while saying it was the real one (docs/MISTAKES.md #271).
results.push(run('site engine (published copy matches this repo)', 'node', ['scripts/site/site-engine.mjs', '--check']));
// A path the Dockerfile copies and .dockerignore excludes only ever shows up as a failed deploy: the
// repo has the file and every local check passes (docs/MISTAKES.md #289).
results.push(run('docker context (the image will carry what the build copies)', 'node', ['scripts/site/docker-context-check.mjs']));

// master sheet: tile the per-format audit overlays (safe-zone + critical-box overlays)
const tiles = fs.existsSync('/tmp/audit') ? fs.readdirSync('/tmp/audit').filter((f) => f.endsWith('.png')).sort() : [];
if (tiles.length) {
  const list = path.join('/tmp/audit', '_list.txt');
  fs.writeFileSync(list, tiles.map((t) => `file '${path.join('/tmp/audit', t)}'`).join('\n'));
  const cols = 3, rows = Math.ceil(tiles.length / cols);
  // scale each to a tile then mosaic
  const scaled = [];
  tiles.forEach((t, i) => { const o = `/tmp/audit/.s${i}.png`; spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join('/tmp/audit', t), '-vf', `scale=300:533,drawtext=text='${t.replace('.png', '')}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`, o]); scaled.push(o); });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', '/tmp/audit/.s%d.png', '-vf', `tile=${cols}x${rows}:padding=8:color=0x0a0a0c`, '-frames:v', '1', '/tmp/review.png']);
}

console.log('\n==================== REVIEW ====================');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'}  ${r.label}`);
if (tiles.length) console.log(`\n  system snapshot → /tmp/review.png  (${tiles.length} formats)`);
console.log('\n  deeper checks:  make probe  (render-order purity)   ·   make verify  (render integrity)');
const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? '✗ ' + failed.length + ' check(s) failed' : '✓ all review checks passed'}`);
process.exit(failed.length ? 1 : 0);
