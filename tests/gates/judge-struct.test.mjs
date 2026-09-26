// tests/gates/judge-struct.test.mjs: the structured judge (--verdict-json/--run/--compare). A single
// vision judge repeats its own rating on the same clip only ~two times in three (Video-Bench), so this
// proves the JSON verdict is refused when a criterion carries no evidence, that two runs record under
// separate receipts (never clobbering each other), and that --compare flags a >2 point disagreement.
//   node --test tests/gates/judge-struct.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReceipt, readReceipt, receiptPath } from '../../harness/lib/receipt.mjs';
import { structuredCriteria } from '../../harness/lib/judge-axes.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const judgeMjs = path.join(repoRoot, 'quality/gates/judge.mjs');
const hashFile = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-struct-test-'));
const mp4 = path.join(dir, '_judge-struct-test.mp4');
fs.writeFileSync(mp4, 'fake rendered bytes');
const sheet = path.join(dir, 'sheet.png');
fs.writeFileSync(sheet, 'fake sheet');
const prepReceipt = () => writeReceipt('judge', mp4, { sheet, renderHash: hashFile(mp4), mp4 });

const fullVerdict = (run, overrides = {}) => {
  const criteria = Object.fromEntries(structuredCriteria().map((c) =>
    [c.code, { score: 3, evidence: `beat 1 @1.0s: ${c.code} looks fine`, t: 1.0 }]));
  Object.assign(criteria, overrides);
  return { run, criteria, verdict: 'FIX' };
};

const writeJson = (name, obj) => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); return p; };

// --- a criterion with no evidence is refused, not recorded ---
prepReceipt();
const incomplete = fullVerdict('A');
incomplete.criteria.value.evidence = '';
const badFile = writeJson('bad.json', incomplete);
try {
  execFileSync(process.execPath, [judgeMjs, mp4, '--verdict-json', badFile, '--run', 'A'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.fail('a criterion missing evidence must be refused');
} catch (e) {
  assert.match(String(e.stderr || ''), /missing \{score, evidence, t\}/);
  assert.match(String(e.stderr || ''), /value/);
}

// --- two complete, independent runs record under separate receipts ---
prepReceipt();
const fileA = writeJson('verdict-A.json', fullVerdict('A'));
const outA = execFileSync(process.execPath, [judgeMjs, mp4, '--verdict-json', fileA, '--run', 'A'], { encoding: 'utf8' });
assert.match(outA, /structured verdict recorded: run A/);

prepReceipt();
const fileB = writeJson('verdict-B.json', fullVerdict('B', { value: { score: 1, evidence: 'beat 1: value is weak', t: 1.0 } }));
const outB = execFileSync(process.execPath, [judgeMjs, mp4, '--verdict-json', fileB, '--run', 'B'], { encoding: 'utf8' });
assert.match(outB, /structured verdict recorded: run B/);

const recA = readReceipt('judge-struct-A', mp4);
const recB = readReceipt('judge-struct-B', mp4);
assert.equal(recA.receipt.run, 'A');
assert.equal(recB.receipt.run, 'B');
assert.notEqual(recA.receipt.criteria.value.score, recB.receipt.criteria.value.score,
  'runs A and B must be recorded separately, neither overwriting the other');

// --- --compare flags a >2 point disagreement and lets a <=2 one through ---
const bigA = writeJson('big-a.json', fullVerdict('A', { value: { score: 5, evidence: 'x', t: 1 } }));
const bigB = writeJson('big-b.json', fullVerdict('B', { value: { score: 1, evidence: 'y', t: 1 } }));
const cmp = execFileSync(process.execPath, [judgeMjs, '--compare', bigA, bigB], { encoding: 'utf8' });
assert.match(cmp, /value: 5 vs 1/, 'a 4-point gap on one criterion must be named');

const closeA = writeJson('close-a.json', fullVerdict('A'));
const closeB = writeJson('close-b.json', fullVerdict('B'));
const cmpClose = execFileSync(process.execPath, [judgeMjs, '--compare', closeA, closeB], { encoding: 'utf8' });
assert.match(cmpClose, /no criterion disagrees by more than 2 points/);

try { fs.unlinkSync(receiptPath('judge', mp4)); } catch { /* fine */ }
try { fs.unlinkSync(receiptPath('judge-struct-A', mp4)); } catch { /* fine */ }
try { fs.unlinkSync(receiptPath('judge-struct-B', mp4)); } catch { /* fine */ }
fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ judge-struct.test.mjs: missing evidence refused, two runs record separately, --compare flags a >2 point gap');
