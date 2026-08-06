// scripts/lib/receipt.mjs — STAGE APPROVAL, as a content hash.
//
// A studio pipeline works because a person says "proceed" between stages. This engine generates every
// artifact in one pass and then grades its own output, which is the structural difference between our
// ladder and a real one. The mechanism that closes the gap already existed here, invented for one
// stage: `make beats` renders a contact sheet no gate can score, so the only checkable fact is whether
// anyone LOOKED at this version. It writes a receipt carrying the scene's content hash, and a hash
// that no longer matches means the scene moved on without being seen.
//
// That idea is stage-agnostic and was hardcoded three ways: the directory name was a literal in every
// file, the writer was copy-pasted between beats.mjs and reveal.mjs, and the reader lived inside
// beat-check.mjs. This module is the same idea with the stage as a parameter, so any stage — a chosen
// concept, an approved treatment, a draft that cleared a bar — can be signed off and can go stale.
//
// WHY A HASH AND NOT A FLAG. An approval that survives the thing it approved is worse than no
// approval, because it reads as verified. Hashing the subject's bytes means editing the subject
// silently withdraws its own sign-off, which is the property that makes the receipt worth trusting.
//
//   import { writeReceipt, readReceipt } from '../lib/receipt.mjs';
//   writeReceipt('concept', 'formats/scene/x.storyboard.md', { picked: 'technical' });
//   const r = readReceipt('concept', 'formats/scene/x.storyboard.md');
//   if (!r.exists || r.stale) { ... }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// `beats` keeps its original home. Twenty-odd receipts already sit in verify/beats-seen/ and
// beat-check.mjs reads that path; moving them would silently un-approve every scene in the library,
// which is exactly the failure this module exists to prevent.
const LEGACY = { beats: path.join(ROOT, 'verify', 'beats-seen') };
export const dirFor = (stage) => LEGACY[stage] || path.join(ROOT, 'verify', 'approved', stage);

const keyOf = (subject) => path.basename(subject).replace(/\.(json|md|markdown)$/i, '');
export const receiptPath = (stage, subject) => path.join(dirFor(stage), `${keyOf(subject)}.json`);

/** sha256 of the subject's bytes. Null when the file is unreadable, never a thrown error: a missing
 *  subject is the caller's problem to report, not this module's to crash on. */
export function hashOf(subject) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(subject)).digest('hex'); }
  catch { return null; }
}

/** Record that `stage` was completed for `subject`. `meta` is free-form and is what makes a receipt
 *  worth reading later — the sheet that was produced, the option that was picked, the warnings a
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
 *  hash disagrees — absent and stale are different states and callers word them differently: nobody
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
