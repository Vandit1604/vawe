// node harness/live/test/code-quality-head.test.mjs
//
// harness/live/code-quality.mjs falls back to a file's content at git HEAD when
// quality/baselines/code-quality-baseline.json has no entry for it. Reported today: files with real,
// long-standing SHAPE findings that the baseline never recorded (it was compiled once and not kept in
// sync with every rename), tripping the hook on every touch, even a no-op. harness/author/screen.mjs
// is a real, live example (complexity/max-lines-per-function/max-depth findings, no baseline entry),
// used directly here rather than a synthetic fixture so the test cannot pass by accident against a
// baseline entry that happens to exist.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const HOOK = join(here, '../../harness/live', 'code-quality.mjs');
const BASELINE = path.join(ROOT, 'quality/baselines/code-quality-baseline.json');
const REL = 'harness/author/screen.mjs';
const ABS = path.join(ROOT, REL);

test.before(() => {
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const own = Object.keys(base).some((k) => k.startsWith(`${REL}::`));
  assert.equal(own, false, `${REL} must not have a baseline entry for this test to prove the HEAD fallback`);
  const head = spawnSync('git', ['show', `HEAD:${REL}`], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(head.status, 0, `${REL} must be tracked at HEAD`);
});

const run = () => {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: ABS } }), encoding: 'utf8',
    env: { ...process.env, VAWE_HOOK_FULL: '1' },   // assert against the full text, not the summary
  });
  return { status: r.status, err: r.stderr };
};

let original;
test.beforeEach(() => { original = fs.readFileSync(ABS, 'utf8'); });
test.afterEach(() => { fs.writeFileSync(ABS, original); });

test('a no-op touch of a file whose pre-existing debt is untracked by the baseline reports nothing', () => {
  fs.writeFileSync(ABS, original);   // no-op write, same bytes
  const { status, err } = run();
  assert.equal(status, 0, `expected silence, got:\n${err}`);
});

test('adding a long, deeply-branching function to that same file is reported', () => {
  const branches = Array.from({ length: 20 }, (_, i) => `  if (n === ${i}) return ${i};`).join('\n');
  const worsened = `${original}\nexport function zzTangledProbe(n) {\n${branches}\n  return n;\n}\n`;
  fs.writeFileSync(ABS, worsened);
  const { status, err } = run();
  assert.equal(status, 2, `expected a report, got exit ${status}:\n${err}`);
  assert.match(err, /complexity/);
});
