// tests/gates/ship-judge-gate.test.mjs: `make ship`'s last step, single-film mode of `ledger.mjs judged`
// (now `shipReady`, quality/gates/ledger.mjs): a judge receipt, brief conformance and two independent
// structured judges at 7/10+, each waivable only via `authoring.allow` + `_why`. Same fixture shape as
// no-judge.test.mjs (a real receipt via harness/lib/receipt.mjs against a scene JSON + a fake mp4).
//
// The CLI path resolves the mp4 via renderOf(scenePath) = out/<basename>.mp4 (tile.mjs), cwd-relative,
// so unlike no-judge.test.mjs (which only exercises isJudged() with an explicit mp4 and can live
// entirely in a tmpdir) the CLI half of this test needs real repo-relative paths: an underscore-
// prefixed scene under tests/fixtures/films/ (never films/scene/, which is real, gitignored film
// content this suite must not depend on) and its render at the real out/ location. Both are removed
// on the way out.
//   node tests/gates/ship-judge-gate.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { checkOne, hashFile, isJudged, shipReady } from '../../quality/gates/ledger.mjs';
import { renderOf } from '../../quality/gates/tile.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const name = '_ship-judge-gate-test-scene.json';
const scenePath = path.join(ROOT, 'tests/fixtures/films', name);
const mp4 = path.join(ROOT, renderOf(scenePath));
const cleanup = () => {
  try { fs.unlinkSync(receiptPath('judge', scenePath)); } catch { /* fine */ }
  try { fs.unlinkSync(receiptPath('conform', scenePath)); } catch { /* fine */ }
  try { fs.unlinkSync(receiptPath('judge-struct-A', scenePath)); } catch { /* fine */ }
  try { fs.unlinkSync(receiptPath('judge-struct-B', scenePath)); } catch { /* fine */ }
  try { fs.unlinkSync(scenePath); } catch { /* fine */ }
  try { fs.unlinkSync(mp4); } catch { /* fine */ }
};
cleanup();
fs.mkdirSync(path.dirname(mp4), { recursive: true });
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', layers: [] }));
fs.writeFileSync(mp4, 'first render bytes');

const runCli = () => spawnSync(process.execPath, [path.join(here, '../../quality/gates/ledger.mjs'), 'judged', scenePath], { cwd: ROOT });

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

// a valid fresh judge receipt is necessary but no longer sufficient: `checkOne` (unchanged) passes,
// but the CLI (`shipReady`) also asks for brief conformance and two independent structured judges.
{
  writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 });
  assert.equal(checkOne(scenePath, mp4).ok, true, 'a fresh receipt for the render on disk must pass the OLD single-condition question');
  assert.equal(isJudged(scenePath, mp4), true);

  const cli = runCli();
  assert.notEqual(cli.status, 0, 'the CLI must still refuse with no conform/judge-score receipts on file');
  assert.match(cli.stderr.toString(), /no brief conformance/);
}

// a FIX verdict still counts as "the eye ran" for `checkOne` (unchanged): the gate asks whether the eye
// ran, not whether it liked what it saw. shipReady's OTHER two conditions are exercised below.
{
  writeReceipt('judge', scenePath, { verdict: 'FIX', renderHash: hashFile(mp4), mp4 });
  assert.equal(checkOne(scenePath, mp4).ok, true, 'a FIX verdict must still pass the judge-receipt question');
  writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 }); // restore for the rest below
}

// a failed brief claim refuses the ship gate, named by reason
{
  writeReceipt('conform', scenePath, { ok: false, failedCount: 2 });
  assert.equal(shipReady(scenePath, mp4).ok, false, 'a failed conform receipt must refuse ship');
  const cli = runCli();
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr.toString(), /2 brief claim\(s\) failed conform/);
}

// conform passes, but only one of the two structured judges is on record: still refused, named
{
  writeReceipt('conform', scenePath, { ok: true, failedCount: 0 });
  writeReceipt('judge-struct-A', scenePath, { run: 'A', verdict: 'PASS', overall: 8, renderHash: hashFile(mp4), mp4 });
  const r = shipReady(scenePath, mp4);
  assert.equal(r.ok, false, 'ship must be refused with only one of the two judges on record');
  assert.match(r.reason, /run\(s\) B/);
}

// both judges on record, but one scores below 7/10: refused, naming the low score
{
  writeReceipt('judge-struct-B', scenePath, { run: 'B', verdict: 'FIX', overall: 5, renderHash: hashFile(mp4), mp4 });
  const r = shipReady(scenePath, mp4);
  assert.equal(r.ok, false, 'a judge scoring below 7/10 must refuse ship');
  assert.match(r.reason, /B=5\/10/);
  const cli = runCli();
  assert.notEqual(cli.status, 0);
}

// conform passed, both judges at 8/10: ship is allowed
{
  writeReceipt('judge-struct-B', scenePath, { run: 'B', verdict: 'PASS', overall: 8, renderHash: hashFile(mp4), mp4 });
  const r = shipReady(scenePath, mp4);
  assert.equal(r.ok, true, 'brief conformance passed + two judges at 8/10 must allow ship');
  const cli = runCli();
  assert.equal(cli.status, 0, 'the CLI must exit 0 once every condition clears');
}

// waived: a bare authoring.allow entry lets a failed conform ship anyway. Editing the scene's own
// bytes changes hashOf(scenePath) (harness/lib/receipt.mjs), so every receipt keyed to it (judge,
// conform, both judge-struct runs) must be re-stamped AFTER the edit or they read as stale for an
// unrelated reason and the test would prove nothing about the waiver.
{
  const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
  scene.authoring = { allow: ['conform-fail'], _why: { 'conform-fail': 'the flagged claim is a known false positive' } };
  fs.writeFileSync(scenePath, JSON.stringify(scene));
  writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 });
  writeReceipt('conform', scenePath, { ok: false, failedCount: 1 });
  writeReceipt('judge-struct-A', scenePath, { run: 'A', verdict: 'PASS', overall: 8, renderHash: hashFile(mp4), mp4 });
  writeReceipt('judge-struct-B', scenePath, { run: 'B', verdict: 'PASS', overall: 8, renderHash: hashFile(mp4), mp4 });
  assert.equal(shipReady(scenePath, mp4).ok, true, 'a waived conform failure must still allow ship');
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
console.log('✓ ship-judge-gate.test.mjs: no receipt, a judge receipt alone, a failed conform, a missing/low-scoring judge, both judges passing, a waiver, and a stale render all resolve to the right verdict + reason');
