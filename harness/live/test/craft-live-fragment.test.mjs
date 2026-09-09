// node harness/live/test/craft-live-fragment.test.mjs
//
// The fragment branch of harness/live/craft-live.mjs, fed exactly as Claude Code's PostToolUse feeds
// it (stdin JSON, stderr on exit 2). Two of the three cases are REAL files in formats/scene/, because
// a fixture that drifts from the fragments in the repo would pass while the hook stops working. The
// third is written to disk for the length of the test, since the repo deliberately holds no fragment
// that breaks these rules.
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
  });
  return { status: r.status, out: r.stderr };
};

test('a fragment on the kit ramps is silent', () => {
  const { status, out } = run('formats/scene/_vawe-oblique.hook.html');
  assert.equal(status, 0, `expected silence, got:\n${out}`);
});

test('literal type sizes with no kit role, and a hand-written shadow, both speak', () => {
  // Deliberately what the rules forbid: three literal sizes, no .kit- role, one raw box-shadow.
  const rel = 'formats/scene/_craft-live-probe.html';
  fs.writeFileSync(path.join(ROOT, rel), [
    '<style>', '.a{font: 700 236px var(--font-sans)}', '.b{font-size: 104px}',
    '.c{font-size: 34px}', '.d{box-shadow: 0 2px 8px rgba(15,22,32,.1)}', '</style>',
    '<div class="a">x</div>',
  ].join('\n'));
  try {
    const { status, out } = run(rel);
    assert.equal(status, 2);
    assert.match(out, /literal type size/);
    assert.match(out, /name no kit elevation/);
    // The advice must name the roles, or it is a complaint rather than a fix.
    assert.match(out, /\.kit-display/);
    assert.match(out, /--kit-elev-1/);
  } finally { fs.rmSync(path.join(ROOT, rel), { force: true }); }
});

test('the pasted stage kit is never counted as the author\'s own CSS', () => {
  // The regression that made this test worth writing: seven fragments pasted the kit WITHOUT its
  // STAGEKIT markers, extractKitBlock returned null, and .kit-card's own box-shadow was reported as
  // two hand-written shadows on a fragment that has none (docs/MISTAKES.md #594).
  const src = fs.readFileSync(path.join(ROOT, 'formats/scene/_vawe-oblique.frame.html'), 'utf8');
  assert.match(src, /STAGEKIT:start/, 'the fragment must carry the kit block with its markers');
  assert.equal(run('formats/scene/_vawe-oblique.frame.html').status, 0);
});
