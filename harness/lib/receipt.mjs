import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { filmKeyOf } from './runlog.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const LEGACY = { beats: path.join(ROOT, 'quality', 'runs', 'beats-seen') };
export const dirFor = (stage) => LEGACY[stage] || path.join(ROOT, 'quality', 'baselines', 'approved', stage);

const keyOf = (subject) => filmKeyOf(subject).replace(/\.(md|markdown)$/i, '');
export const receiptPath = (stage, subject) => path.join(dirFor(stage), `${keyOf(subject)}.json`);

/** sha256 of the subject's bytes. Null when it is unreadable, never a thrown error: a missing
 *  subject is the caller's problem to report, not this module's to crash on. */
export function hashOf(subject) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(subject)).digest('hex');
  } catch { return null; }
}

/** Record that `stage` was completed for `subject`. `meta` is free-form and is what makes a receipt
 *  worth reading later: the sheet that was produced, the option that was picked, the warnings a
 *  draft was allowed to carry. Never throws: failing to write a receipt must not fail a render. */
export function writeReceipt(stage, subject, meta = {}) {
  const hash = hashOf(subject);
  if (!hash) return null;
  const rec = { stage, hash, at: new Date().toISOString(), ...meta };
  try {
    fs.mkdirSync(dirFor(stage), { recursive: true });
    fs.writeFileSync(receiptPath(stage, subject), JSON.stringify(rec, null, 2) + '\n');
  } catch (e) {
    console.warn(`  (could not write the ${stage} receipt: ${e.message})`);
    return null;
  }
  return rec;
}

/** `{ exists, stale, hash, path, rel, receipt }`. `stale` is true only when a receipt EXISTS and its
 *  hash disagrees: absent and stale are different states and callers word them differently: nobody
 *  has looked at all, versus somebody looked at an older version. */
export function readReceipt(stage, subject) {
  const hash = hashOf(subject);
  const p = receiptPath(stage, subject);
  let receipt = null;
  try { receipt = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* absent is the common case */ }
  return {
    exists: !!receipt,
    stale: !!receipt && receipt.hash !== hash,
    hash, receipt, path: p, rel: path.relative(ROOT, p),
  };
}
