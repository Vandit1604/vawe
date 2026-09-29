// tests/gates/post-draft.test.mjs: the post-draft loop (quality/gates/post-draft.mjs), one step per
// call: render -> still-sheet -> conform -> verify -> judges -> ship. `postDraftStep` reads only
// receipts + files on disk (harness/lib/receipt.mjs), the same contract `make stage` already uses, so
// this test drives it by writing exactly those receipts, never by rendering a real video.
//   node tests/gates/post-draft.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { writeReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { postDraftStep } from '../../quality/gates/post-draft.mjs';
import { renderOf } from '../../quality/gates/tile.mjs';

const rh = () => crypto.createHash('sha256').update(fs.readFileSync(mp4)).digest('hex');

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const name = '_post-draft-fixture.json';
const scenePath = path.join(ROOT, 'tests/fixtures/films', name);
const mp4 = path.join(ROOT, renderOf(scenePath));

const cleanup = () => {
  for (const stage of ['conform', 'verify', 'still-sheet', 'judge-struct-A', 'judge-struct-B']) {
    try { fs.unlinkSync(receiptPath(stage, scenePath)); } catch { /* fine */ }
  }
  try { fs.unlinkSync(scenePath); } catch { /* fine */ }
  try { fs.unlinkSync(mp4); } catch { /* fine */ }
};
cleanup();
fs.mkdirSync(path.dirname(mp4), { recursive: true });
fs.writeFileSync(scenePath, JSON.stringify({ module: 'scene', layers: [] }));

// step 1: no render yet
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'render');
  assert.match(r.next, /make dev D=/);
}

fs.writeFileSync(mp4, 'fake rendered bytes');

// step 2: rendered, no still sheet
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'still-sheet');
  assert.match(r.next, /still-sheet\.mjs/);
}

writeReceipt('still-sheet', scenePath, { sheets: ['fake.png'] });

// step 3: still sheet fresh, no conform
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'conform');
  assert.match(r.next, /conform\.mjs/);
}

writeReceipt('conform', scenePath, { ok: false, failedCount: 1 });

// step 3b: conform ran and FAILED - stays at conform, names the failure
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'conform');
  assert.match(r.why, /1 brief claim\(s\) failed/);
}

writeReceipt('conform', scenePath, { ok: true, failedCount: 0 });

// step 4: conform passed, no verify yet
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'verify');
  assert.match(r.next, /verify\.mjs/);
}

writeReceipt('verify', scenePath, { ok: true, hardFail: [] });

// step 5: verify passed, no judges yet
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'judges');
  assert.match(r.next, /make judge D=.*STRUCT=1/);
  assert.ok(r.brief && /VAWE_AGENT=judge-/.test(r.brief), 'the judges step must carry the hand-off brief');
}

writeReceipt('judge-struct-A', scenePath, { run: 'A', verdict: 'PASS', overall: 8, renderHash: rh(), mp4 });

// step 5b: one judge scored, the other missing
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'judges');
  assert.match(r.why, /run\(s\) B/);
}

writeReceipt('judge-struct-B', scenePath, { run: 'B', verdict: 'FIX', overall: 5, renderHash: rh(), mp4 });

// step 5c: both scored, but B is below 7/10
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'judges');
  assert.match(r.why, /B=5\/10/);
}

writeReceipt('judge-struct-B', scenePath, { run: 'B', verdict: 'PASS', overall: 8, renderHash: rh(), mp4 });

// step 6: everything fresh and passing - ready to ship
{
  const r = postDraftStep(scenePath);
  assert.equal(r.step, 'ship');
  assert.equal(r.done, true);
  assert.match(r.next, /make ship D=/);
}

cleanup();
console.log('✓ post-draft.test.mjs: render -> still-sheet -> conform -> verify -> judges -> ship, one step per call, each stall named');

// ── scene.reference: a film that declares one gets a `motion` step between conform and verify ───────
const refName = '_post-draft-reference-fixture.json';
const refScenePath = path.join(ROOT, 'tests/fixtures/films', refName);
const refMp4 = path.join(ROOT, renderOf(refScenePath));
const refCleanup = () => {
  for (const stage of ['conform', 'verify', 'still-sheet', 'motion-compare']) {
    try { fs.unlinkSync(receiptPath(stage, refScenePath)); } catch { /* fine */ }
  }
  try { fs.unlinkSync(refScenePath); } catch { /* fine */ }
  try { fs.unlinkSync(refMp4); } catch { /* fine */ }
};
refCleanup();
fs.mkdirSync(path.dirname(refMp4), { recursive: true });
fs.writeFileSync(refScenePath, JSON.stringify({ module: 'scene', layers: [], reference: 'refs/example.mp4' }));
fs.writeFileSync(refMp4, 'fake rendered bytes');
writeReceipt('still-sheet', refScenePath, { sheets: ['fake.png'] });
writeReceipt('conform', refScenePath, { ok: true, failedCount: 0 });

// no motion-compare receipt yet: stalls at `motion`, names the reference, before verify ever runs
{
  const r = postDraftStep(refScenePath);
  assert.equal(r.step, 'motion');
  assert.match(r.why, /declares a reference \(refs\/example\.mp4\)/);
  assert.match(r.next, /make study REF=refs\/example\.mp4 COMPARE=/);
}

writeReceipt('motion-compare', refScenePath, { ok: false, tooStillCount: 2, tooStillWindows: [{ t0: 1, t1: 1.5 }, { t0: 1.5, t1: 2 }] });

// motion-compare ran and failed: stays at `motion`, names the failing windows, offers the waiver
{
  const r = postDraftStep(refScenePath);
  assert.equal(r.step, 'motion');
  assert.match(r.why, /2 window\(s\) read "too still"/);
  assert.match(r.why, /motion-still/);
}

writeReceipt('motion-compare', refScenePath, { ok: true, tooStillCount: 0, tooStillWindows: [] });

// motion-compare passed: falls through to the un-run verify step, same as a film with no reference
{
  const r = postDraftStep(refScenePath);
  assert.equal(r.step, 'verify');
}

refCleanup();
console.log('✓ post-draft.test.mjs: scene.reference gates a `motion` step (unchecked -> too-still -> passed -> verify)');

// ── html fragment: a film that names one gets a `layout` step BEFORE conform/motion ──────────────────
const fragName = '_post-draft-fragment-fixture.html';
const fragPath = path.join(ROOT, 'tests/fixtures/films', fragName);
const lName = '_post-draft-layout-fixture.json';
const lScenePath = path.join(ROOT, 'tests/fixtures/films', lName);
const lMp4 = path.join(ROOT, renderOf(lScenePath));
const lCleanup = () => {
  for (const stage of ['conform', 'verify', 'still-sheet', 'layout']) {
    try { fs.unlinkSync(receiptPath(stage, lScenePath)); } catch { /* fine */ }
  }
  try { fs.unlinkSync(lScenePath); } catch { /* fine */ }
  try { fs.unlinkSync(lMp4); } catch { /* fine */ }
  try { fs.unlinkSync(fragPath); } catch { /* fine */ }
};
lCleanup();
fs.mkdirSync(path.dirname(lMp4), { recursive: true });
fs.writeFileSync(fragPath, '<div>hi</div>');
fs.writeFileSync(lScenePath, JSON.stringify({
  module: 'scene', layers: [{ type: 'html', src: 'tests/fixtures/films/_post-draft-fragment-fixture.html', start: 0, duration: 2 }],
}));
fs.writeFileSync(lMp4, 'fake rendered bytes');
writeReceipt('still-sheet', lScenePath, { sheets: ['fake.png'] });
writeReceipt('conform', lScenePath, { ok: true, failedCount: 0 });

// conform passed: stalls at `layout` next, before motion/verify ever runs, naming the fragment
{
  const r = postDraftStep(lScenePath);
  assert.equal(r.step, 'layout');
  assert.match(r.next, /see\.mjs .*_post-draft-fragment-fixture\.html --layout/);
  assert.match(r.why, /1 html fragment\(s\)/);
}

writeReceipt('layout', lScenePath, { ok: false, faultCount: 2 });

// layout ran and found faults: stays at `layout`, names the count, offers the waiver
{
  const r = postDraftStep(lScenePath);
  assert.equal(r.step, 'layout');
  assert.match(r.why, /2 layout fault\(s\)/);
  assert.match(r.why, /layout-fault/);
}

writeReceipt('layout', lScenePath, { ok: true, faultCount: 0 });

// layout passed: falls through to the un-run verify step (no `reference`, so `motion` is skipped too)
{
  const r = postDraftStep(lScenePath);
  assert.equal(r.step, 'verify');
}

lCleanup();
console.log('✓ post-draft.test.mjs: a film with an html fragment gates a `layout` step before motion/verify (unchecked -> faults -> passed -> verify)');
