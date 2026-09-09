// harness/author/pitch.test.mjs: does the pitch receipt round-trip, and does it go stale?
//   node harness/author/pitch.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeReceipt, readReceipt } from '../lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGE = 'pitch';
// The subject lives OUTSIDE quality/baselines/approved/pitch/ on purpose: the receipt for a subject named
// "x" is written to quality/baselines/approved/pitch/x.json, so a subject placed in that same directory would
// collide with its own receipt.
const subject = path.join(ROOT, 'formats/scene/_pitch-selfcheck.json');
const receiptFile = path.join(ROOT, 'quality/baselines/approved/pitch/_pitch-selfcheck.json');

fs.mkdirSync(path.dirname(subject), { recursive: true });
fs.writeFileSync(subject, JSON.stringify({ module: 'scene', duration: 5 }, null, 1) + '\n');

try {
  // a fresh subject has no receipt yet
  const before = readReceipt(STAGE, subject);
  assert.equal(before.exists, false, 'a subject nobody pitched should have no receipt');

  // recording a decision round-trips the chosen angle
  const rec = writeReceipt(STAGE, subject, { chose: 'the countdown format', left: 'the serif statement + two photos' });
  assert.ok(rec, 'writeReceipt should succeed against a real file');
  const after = readReceipt(STAGE, subject);
  assert.equal(after.exists, true, 'the receipt should now exist');
  assert.equal(after.stale, false, 'an unchanged subject should read back fresh');
  assert.equal(after.receipt.chose, 'the countdown format', 'the chosen angle should round-trip');
  assert.equal(after.receipt.left, 'the serif statement + two photos', 'the left-behind median should round-trip');

  // editing the subject after the pitch was recorded must stale the receipt: that is the whole point
  fs.writeFileSync(subject, JSON.stringify({ module: 'scene', duration: 9 }, null, 1) + '\n');
  const staled = readReceipt(STAGE, subject);
  assert.equal(staled.exists, true, 'the receipt file itself still exists');
  assert.equal(staled.stale, true, 'a changed subject should read back stale');

  console.log('✓ pitch.test.mjs: receipt round-trips and staleness works');
} finally {
  fs.rmSync(subject, { force: true });
  fs.rmSync(receiptFile, { force: true });
}
