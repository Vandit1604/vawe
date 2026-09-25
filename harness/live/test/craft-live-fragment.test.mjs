// node harness/live/test/craft-live-fragment.test.mjs
//
// The fragment branch of harness/live/craft-live.mjs, fed exactly as Claude Code's PostToolUse feeds
// it (stdin JSON, stderr on exit 2). Both cases are REAL files in films/scene/, because a fixture
// that drifts from the fragments in the repo would pass while the hook stops working.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const HOOK = join(here, '..', 'craft-live.mjs');

const run = (rel) => {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { file_path: path.join(ROOT, rel) } }), encoding: 'utf8',
    env: { ...process.env, VAWE_HOOK_FULL: '1' },   // assert against the full text, not the summary
  });
  return { status: r.status, out: r.stderr };
};

test('a fragment on the kit ramps is silent', () => {
  const { status, out } = run('films/scene/_vawe-oblique.hook.html');
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('the pasted stage kit is never counted as the author\'s own CSS', () => {
  // The regression that made this test worth writing: seven fragments pasted the kit WITHOUT its
  // STAGEKIT markers, extractKitBlock returned null, and .kit-card's own box-shadow was reported as
  // two hand-written shadows on a fragment that has none (engine-doctrine/MISTAKES.md #594).
  const src = fs.readFileSync(path.join(ROOT, 'films/scene/_vawe-oblique.frame.html'), 'utf8');
  assert.match(src, /STAGEKIT:start/, 'the fragment must carry the kit block with its markers');
  assert.equal(run('films/scene/_vawe-oblique.frame.html').status, 0);
});
