// node harness/live/test/beat-surfacer.test.mjs
//
// harness/live/beat-surfacer.mjs, fed exactly as Claude Code's PostToolUse feeds it (stdin JSON, stderr
// on exit 2). The two failure modes this hook exists to avoid, from AGENTS.md's own acceptance bar:
// speaking about a beat that already names a move, and speaking about more than two beats at once. A
// scratch fixture is used (not a real film) because the point under test is the RULE, and a real
// storyboard is free to gain a `move:` field tomorrow and silently stop proving it.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const HOOK = join(here, '../../harness/live', 'beat-surfacer.mjs');
const FIXTURE = 'films/scene/zz-beat-surfacer-probe.storyboard.md';

const run = (rel) => {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: path.join(ROOT, rel) } }), encoding: 'utf8',
    env: { ...process.env, VAWE_HOOK_FULL: '1' },   // assert against the full text, not the summary
  });
  return { status: r.status, out: r.stderr };
};

const write = (body) => fs.writeFileSync(path.join(ROOT, FIXTURE), body);
const cleanup = () => fs.rmSync(path.join(ROOT, FIXTURE), { force: true });

test('a beat with a real subject, real duration, and no move/motion speaks', () => {
  write([
    '---', 'duration: 6s', '---', '',
    '## Beat 1: Hold (0s-3s)', '- object: the pricing card, full size, doing nothing',
  ].join('\n'));
  try {
    const { status, out } = run(FIXTURE);
    assert.equal(status, 2);
    assert.match(out, /lands and then nothing changes/);
    assert.match(out, /Ambient motion does\s+not count/);
  } finally { cleanup(); }
});

test('the same beat with move: already set is silent, never told what it already does', () => {
  write([
    '---', 'duration: 6s', '---', '',
    '## Beat 1: Hold (0s-3s)', '- object: the pricing card, full size, doing nothing',
    '- move: pan:gravity',
  ].join('\n'));
  try {
    const { status, out } = run(FIXTURE);
    assert.equal(status, 0, `expected silence, got:\n${out}`);
  } finally { cleanup(); }
});

test('a short beat, or one with no named subject, is silent', () => {
  write([
    '---', 'duration: 6s', '---', '',
    '## Beat 1: Quick (0s-1s)', '- object: a flash of the logo',
    '## Beat 2: Bare (1s-5s)', '- onscreen: "nothing to hold onto"',
  ].join('\n'));
  try {
    const { status, out } = run(FIXTURE);
    assert.equal(status, 0, `expected silence, got:\n${out}`);
  } finally { cleanup(); }
});

test('four qualifying beats still speak about at most two', () => {
  const beats = [1, 2, 3, 4].map((n) =>
    `## Beat ${n}: Hold ${n} (${(n - 1) * 3}s-${n * 3}s)\n- object: card ${n}, static`).join('\n\n');
  write(['---', 'duration: 12s', '---', '', beats].join('\n'));
  try {
    const { status, out } = run(FIXTURE);
    assert.equal(status, 2);
    assert.equal((out.match(/lands and then nothing changes/g) || []).length, 2);
  } finally { cleanup(); }
});

test('the output never prescribes a move: shape or a camera move', () => {
  write([
    '---', 'duration: 6s', '---', '',
    '## Beat 1: Hold (0s-3s)', '- object: the pricing card, full size, doing nothing',
  ].join('\n'));
  try {
    const { status, out } = run(FIXTURE);
    assert.equal(status, 2);
    assert.doesNotMatch(out, /move:/);
    assert.doesNotMatch(out, /camera:/);
  } finally { cleanup(); }
});
