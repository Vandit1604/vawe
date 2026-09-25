// tests/gates/no-judge.test.mjs: the one property that matters most, a receipt must not survive the
// render it claims to have looked at. Writes a real receipt via harness/lib/receipt.mjs against a scene
// JSON + a fake mp4, then rewrites the mp4's BYTES with the same NAME and same mtime untouched, and
// asserts `isJudged` flips to false. mtime is left alone on purpose: a hash-based check must catch a
// re-render a timestamp cannot (see the "WAS THIS FILM JUDGED" comment at the top of ledger.mjs, which
// now carries this logic; it used to live in a since-merged no-judge.mjs).
//   node tests/gates/no-judge.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { isJudged, hashFile } from '../../quality/gates/ledger.mjs';

// receipt.mjs keys a receipt by basename alone (not the full path), so writeReceipt for a scoped test
// file still lands in the SHARED quality/baselines/approved/judge/ directory real films use. A name no
// real film would ever pick, cleaned up on the way out, keeps this test from leaving debris there.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-judge-test-'));
const scenePath = path.join(dir, '_no-judge-test-scene.json');
const mp4 = path.join(dir, '_no-judge-test-scene.mp4');
const cleanupReceipt = () => { try { fs.unlinkSync(receiptPath('judge', scenePath)); } catch { /* fine */ } };
cleanupReceipt();
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', layers: [] }));
fs.writeFileSync(mp4, 'first render bytes');

// never judged: not valid
assert.equal(isJudged(scenePath, mp4), false, 'a scene with no receipt at all must not read as judged');

// judged against THIS render's bytes: valid
writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 });
assert.equal(isJudged(scenePath, mp4), true, 'a fresh PASS receipt for the render on disk must read as judged');

// FIX also counts: the ratchet asks whether the eye ran, not whether it liked what it saw
writeReceipt('judge', scenePath, { verdict: 'FIX', renderHash: hashFile(mp4), mp4 });
assert.equal(isJudged(scenePath, mp4), true, 'a FIX verdict still means the eye looked');

// re-render: same path, same size class, new bytes, mtime UNCHANGED (fs.writeFileSync still bumps
// mtime, so set it back explicitly to prove this is a content check, not a disguised mtime check).
const statBefore = fs.statSync(mp4);
fs.writeFileSync(mp4, 'a different render, same file name');
fs.utimesSync(mp4, statBefore.atime, statBefore.mtime);
assert.equal(isJudged(scenePath, mp4), false, 're-rendering the file must invalidate the receipt even with its mtime pinned to the old value');

// editing the scene JSON also invalidates it, via receipt.mjs's own subject hash
fs.writeFileSync(mp4, 'a different render, same file name'); // restore the judged render
writeReceipt('judge', scenePath, { verdict: 'PASS', renderHash: hashFile(mp4), mp4 });
assert.equal(isJudged(scenePath, mp4), true);
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', layers: [{ type: 'text' }] }));
assert.equal(isJudged(scenePath, mp4), false, 'editing the scene the receipt covers must invalidate it too');

cleanupReceipt();
fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ no-judge.test.mjs: never-judged, PASS, FIX, a re-render, and a scene edit all invalidate/validate correctly');
