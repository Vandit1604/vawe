// quality/gates/ship-judge-gate.test.mjs: `make ship`'s last step, single-film mode of no-judge.mjs.
// Same fixture shape as no-judge.test.mjs (a real receipt via harness/lib/receipt.mjs against a scene
// JSON + a fake mp4), proving the three things the refusal must get right: no receipt at all fails and
// names `make judge D=<file>`, a fresh receipt passes, and a receipt that predates a re-render fails
// with the renderHash reason (not the "no receipt" reason, which would be the wrong diagnosis).
//
// The CLI path resolves the mp4 via renderOf(scenePath) = out/<basename>.mp4 (tile.mjs), cwd-relative,
// so unlike no-judge.test.mjs (which only exercises isJudged() with an explicit mp4 and can live
// entirely in a tmpdir) the CLI half of this test needs real repo-relative paths: an underscore-
// prefixed scene under films/scene/ (the convention every other _-prefixed fixture there already
// uses) and its render at the real out/ location. Both are removed on the way out.
//   node quality/gates/ship-judge-gate.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { checkOne, hashFile, isJudged } from '../../quality/gates/no-judge.mjs';
import { renderOf } from '../../quality/gates/tile.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const name = '_ship-judge-gate-test-scene.json';
const scenePath = path.join(ROOT, 'films/scene', name);
const mp4 = path.join(ROOT, renderOf(scenePath));
const cleanup = () => {
  try { fs.unlinkSync(receiptPath('judge', scenePath)); } catch { /* fine */ }
  try { fs.unlinkSync(scenePath); } catch { /* fine */ }
  try { fs.unlinkSync(mp4); } catch { /* fine */ }
};
cleanup();
fs.mkdirSync(path.dirname(mp4), { recursive: true });
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', layers: [] }));
fs.writeFileSync(mp4, 'first render bytes');

const runCli = () => spawnSync(process.execPath, [path.join(here, '../../quality/gates/no-judge.mjs'), scenePath], { cwd: ROOT });

// no receipt at all: refused, names the reason and the exact command via the CLI
{
  const r = checkOne(scenePath, mp4);
  assert.equal(r.ok, false, 'a scene with no receipt at all must fail the ship gate');
  assert.match(r.reason, /no judge receipt/, 'the reason must say no receipt exists');

  const cli = runCli();
  assert.notEqual(cli.status, 0, 'the CLI must exit non-zero with no receipt');
  const out = cli.stderr.toString();
  assert.match(out, /make judge D=/, 'the refusal must name the exact make judge command');
  assert.match(out, /no judge receipt/, 'the refusal must say which condition failed');
}

// a valid fresh receipt: passes, both the function and the CLI
{
  writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 });
  assert.equal(checkOne(scenePath, mp4).ok, true, 'a fresh receipt for the render on disk must pass the ship gate');
  assert.equal(isJudged(scenePath, mp4), true);

  const cli = runCli();
  assert.equal(cli.status, 0, 'the CLI must exit 0 with a fresh receipt');
}

// a FIX verdict still ships: the gate asks whether the eye ran, not whether it liked what it saw
{
  writeReceipt('judge', scenePath, { verdict: 'FIX', renderHash: hashFile(mp4), mp4 });
  assert.equal(checkOne(scenePath, mp4).ok, true, 'a FIX verdict must still pass the ship gate');
}

// receipt predates a re-render: fails, and the reason names the renderHash mismatch specifically,
// not "no receipt" (a wrong diagnosis teaches people to distrust the gate).
{
  const statBefore = fs.statSync(mp4);
  fs.writeFileSync(mp4, 'a different render, same file name');
  fs.utimesSync(mp4, statBefore.atime, statBefore.mtime);
  const r = checkOne(scenePath, mp4);
  assert.equal(r.ok, false, 're-rendering after the receipt was written must fail the ship gate');
  assert.match(r.reason, /re-rendered without re-judging/, 'the reason must name the render-hash mismatch, not a missing receipt');

  const cli = runCli();
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr.toString(), /re-rendered without re-judging/);
}

cleanup();
console.log('✓ ship-judge-gate.test.mjs: no receipt, a fresh receipt, a FIX verdict, and a stale render all resolve to the right verdict + reason');
