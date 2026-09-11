// node harness/live/test/no-emdash-live.test.mjs
//
// harness/live/no-emdash-live.mjs, fed exactly as Claude Code's PostToolUse feeds a Write or Edit
// (stdin JSON carrying tool_input, stderr on exit 2). Two cases: a real em dash in the written content
// is reported with its line, and the same character inside an allowlisted vendored path is silent.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const HOOK = join(here, '..', 'no-emdash-live.mjs');
const EM = String.fromCharCode(0x2014);

const run = (payload) => {
  const r = spawnSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { status: r.status, err: r.stderr };
};

const write = (rel, body) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
};
const cleanup = (rel) => fs.rmSync(path.join(ROOT, rel), { force: true });

test('a Write that lands an em dash is reported with its file and line', () => {
  const rel = 'harness/live/test/.zz-emdash-write-probe.mjs';
  const body = `const a = 1;\nconst b = 'note${EM}here';\n`;
  write(rel, body);
  try {
    const { status, err } = run({ tool_input: { file_path: path.join(ROOT, rel), content: body } });
    assert.equal(status, 2);
    assert.match(err, /em dash/);
    assert.match(err, new RegExp(`${rel}:2`));
  } finally { cleanup(rel); }
});

test('an Edit whose new_string has no em dash is silent, even if the file has one elsewhere', () => {
  const rel = 'harness/live/test/.zz-emdash-edit-probe.mjs';
  const before = `const stale = 'old${EM}note';\n`;
  write(rel, before);
  const newString = `const fresh = 'clean line';\n`;
  const after = before + newString;
  write(rel, after);
  try {
    const { status, err } = run({ tool_input: { file_path: path.join(ROOT, rel), new_string: newString } });
    assert.equal(status, 0, `expected silence, got:\n${err}`);
  } finally { cleanup(rel); }
});

test('an em dash inside an allowlisted vendored path is silent', () => {
  const rel = 'assets/vendor/.zz-emdash-vendor-probe.mjs';
  const body = `const v = 'vendored${EM}text';\n`;
  write(rel, body);
  try {
    const { status, err } = run({ tool_input: { file_path: path.join(ROOT, rel), content: body } });
    assert.equal(status, 0, `expected silence, got:\n${err}`);
  } finally { cleanup(rel); }
});
