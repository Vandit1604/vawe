// scripts/lib/receipt.mjs: STAGE APPROVAL, as a content hash.
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
// beat-check.mjs. This module is the same idea with the stage as a parameter, so any stage, a chosen
// concept, an approved treatment, a draft that cleared a bar. Can be signed off and can go stale.
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

// `beats` keeps its original home. Twenty-odd receipts already sit in quality/runs/beats-seen/ and
// beat-check.mjs reads that path; moving them would silently un-approve every scene in the library,
// which is exactly the failure this module exists to prevent.
const LEGACY = { beats: path.join(ROOT, 'quality', 'runs', 'beats-seen') };
export const dirFor = (stage) => LEGACY[stage] || path.join(ROOT, 'quality', 'baselines', 'approved', stage);

const keyOf = (subject) => path.basename(subject).replace(/\.(json|md|markdown)$/i, '');
export const receiptPath = (stage, subject) => path.join(dirFor(stage), `${keyOf(subject)}.json`);

// A scene's hand-authored markup can live INSIDE the JSON as an escaped `html` string, or beside it as
// `{"type":"html","src":"formats/scene/x.html"}`. The second form moves the markup out of the subject's
// bytes, so hashing the subject alone would leave every receipt for that scene FRESH while its whole
// backdrop was rewritten. That is precisely the failure this module exists to prevent, reintroduced by
// a feature, and it landed before a single scene used `src`.
//
// So the fragments a scene NAMES are part of what was signed off. Same rule preloadHtml uses (an html
// layer's `src`, or a bg window's), not every path-shaped string: an image changing is a different
// question, and folding assets in here would stale the whole library at once.
//
// The path is folded in beside the bytes, so pointing a layer at a different file with identical
// contents still counts as a change, it is a different scene to read.
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
  // bg windows carry no `type`, exactly as in core/preload.js.
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
