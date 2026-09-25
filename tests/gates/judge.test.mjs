// quality/gates/judge.test.mjs: the verdict gets a shape. A judge finding used to be a free-text
// `--fixes` string nothing parsed (see the header of judge.mjs and engine-doctrine/JUDGE.md); this
// proves the `--fix <code>@<beat>` replacement actually lands as records, in the receipt AND through
// the shared findings channel, that an unknown code is refused by name, and that the old `--fixes`
// prose still works with a printed notice.
//   node quality/gates/judge.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReceipt, readReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { readFindings } from '../../harness/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const judgeMjs = path.join(repoRoot, 'quality/gates/judge.mjs');
const hashFile = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// A bare mp4 (no scene JSON beside it) skips gradeable's mtime check entirely (tile.mjs:84), so the
// verdict path is reachable without staging a whole scene + storyboard just to satisfy an unrelated gate.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-test-'));
const mp4 = path.join(dir, '_judge-test.mp4');
fs.writeFileSync(mp4, 'fake rendered bytes');
const sheet = path.join(dir, 'sheet.png');
fs.writeFileSync(sheet, 'fake sheet');
const cleanupReceipt = () => { try { fs.unlinkSync(receiptPath('judge', mp4)); } catch { /* fine */ } };
cleanupReceipt();

const runVerdict = (args, envExtra = {}) => execFileSync(
  process.execPath, [judgeMjs, mp4, '--verdict', 'FIX', ...args],
  { encoding: 'utf8', env: { ...process.env, ...envExtra }, stdio: ['ignore', 'pipe', 'pipe'] },
);

// a prep receipt (what the earlier part of this script writes for THIS render's bytes) must exist
// before --verdict is accepted at all; this mirrors what a real `make judge` run leaves behind.
const prepReceipt = () => writeReceipt('judge', mp4, { sheet, renderHash: hashFile(mp4), mp4 });

// --- valid codes: two --fix flags become two records, in the receipt and through gateFindings ---
prepReceipt();
const findingsOut = path.join(dir, 'findings.json');
const out1 = runVerdict(['--fix', 'hierarchy@2', '--fix', 'value@5'], { VAWE_FINDINGS_OUT: findingsOut });
assert.match(out1, /judge verdict recorded: FIX/, 'a valid --fix pair must record a FIX verdict');
assert.match(out1, /hierarchy@2, value@5/, 'the printed summary must name both codes and their beats');

const receiptAfter = readReceipt('judge', mp4);
assert.equal(receiptAfter.receipt.verdict, 'FIX');
assert.deepEqual(receiptAfter.receipt.fixes, [{ code: 'hierarchy', beat: '2' }, { code: 'value', beat: '5' }],
  'the receipt must carry two {code, beat} records, not a prose string');

const records = readFindings(findingsOut);
assert.equal(records.length, 2, 'both fixes must reach the shared findings channel');
assert.deepEqual(records.map((r) => [r.code, r.beat]).sort(), [['hierarchy', '2'], ['value', '5']].sort(),
  'gateFindings must carry the same code + beat as the receipt');

// --- unknown code: refused, and the message names all seven ---
prepReceipt();
try {
  runVerdict(['--fix', 'nonsense@1']);
  assert.fail('an unrecognised fix code must be refused');
} catch (e) {
  const msg = String(e.stderr || e.stdout || '');
  assert.match(msg, /not a judge fix code/);
  for (const code of ['readability', 'hierarchy', 'composition', 'brand-fidelity', 'asset-fidelity', 'produced-not-generated', 'value']) {
    assert.match(msg, new RegExp(code), `refusal message must name "${code}" so the caller does not have to guess`);
  }
}

// --- backward compatibility: --fixes prose still records, and prints its replacement ---
prepReceipt();
const proc = execFileSync(process.execPath, [judgeMjs, mp4, '--verdict', 'FIX', '--fixes', 'tighten the headline on beat 1'],
  { encoding: 'utf8' });
assert.match(proc, /judge verdict recorded: FIX \(tighten the headline on beat 1\)/, 'old prose must still be recorded and echoed');
const receiptProse = readReceipt('judge', mp4);
assert.equal(receiptProse.receipt.fixes, 'tighten the headline on beat 1', 'prose fixes must still land in the receipt as-is');

cleanupReceipt();
fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ judge.test.mjs: --fix <code>@<beat> records structured findings, an unknown code is refused by name, and --fixes prose still works');
