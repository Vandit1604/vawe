// harness/lib/motion-stamp.mjs: the required-motion-match stamp for a bare HTML page (no scene.json to
// carry a receipt). Keyed on the page's own content hash, same idea as verify-batch.sh's
// `.vawe-data/verified/<sha>`: a passing check writes a marker under that hash, so an edit to the page
// (a new hash) invalidates it and a FINAL render can tell "checked" from "checked before this edit".
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STAMP_DIR = path.join(ROOT, '.vawe-data', 'motion-verified');

function pageHash(pagePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(pagePath)).digest('hex');
}

/** A page's folder declares a reference when the recreation starter's sidecar sits beside it. */
export function referenceFor(pagePath) {
  const p = path.join(path.dirname(pagePath), 'reference.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).ref || null; } catch { return null; }
}

export function writeMotionStamp(pagePath) {
  fs.mkdirSync(STAMP_DIR, { recursive: true });
  fs.writeFileSync(path.join(STAMP_DIR, pageHash(pagePath)), new Date().toISOString());
}

export function motionStampFresh(pagePath) {
  return fs.existsSync(path.join(STAMP_DIR, pageHash(pagePath)));
}

/** `<script type="application/json" id="authoring">{"allow":[...],"_why":{...}}</script>`, the same
 *  `authoring.allow` + `_why` shape a scene JSON carries, read out of a bare page's own markup so a
 *  page with no scene.json still has the one waiver mechanism, never a second one. */
export function pageAuthoring(pagePath) {
  try {
    const html = fs.readFileSync(pagePath, 'utf8');
    const m = /<script[^>]*id=["']authoring["'][^>]*>([\s\S]*?)<\/script>/.exec(html);
    return m ? JSON.parse(m[1]) : { allow: [] };
  } catch { return { allow: [] }; }
}
