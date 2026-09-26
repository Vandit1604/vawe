import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const LEGACY = { beats: path.join(ROOT, 'quality', 'runs', 'beats-seen') };
export const dirFor = (stage) => LEGACY[stage] || path.join(ROOT, 'quality', 'baselines', 'approved', stage);

const keyOf = (subject) => path.basename(subject).replace(/\.(json|md|markdown)$/i, '');
export const receiptPath = (stage, subject) => path.join(dirFor(stage), `${keyOf(subject)}.json`);

function fragmentsOf(subject) {
  if (!/\.json$/i.test(subject)) return [];
  let data;
  try { data = JSON.parse(fs.readFileSync(subject, 'utf8')); } catch { return []; }
  const out = new Set();
  const walk = (a) => { if (Array.isArray(a)) for (const l of a) {
    if (!l || typeof l !== 'object') continue;
    if (l.type === 'html' && typeof l.src === 'string') out.add(l.src);
    if (l.children) walk(l.children);
  } };
  walk(data.layers);
  for (const b of Array.isArray(data.bg) ? data.bg : []) if (b && typeof b === 'object' && typeof b.src === 'string') out.add(b.src);
  return [...out].sort();
}

/** sha256 of the subject's bytes, plus the bytes of any html fragment it names. Null when anything it
 *  covers is unreadable, never a thrown error: a missing subject is the caller's problem to report,
 *  not this module's to crash on. A subject that names no fragment hashes exactly as it always has,
 *  which is what keeps this change from un-approving the whole library in one commit. */
export function hashOf(subject) {
  try {
    const h = crypto.createHash('sha256').update(fs.readFileSync(subject));
    for (const rel of fragmentsOf(subject)) h.update('\0').update(rel).update('\0').update(fs.readFileSync(path.join(ROOT, rel)));
    return h.digest('hex');
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
