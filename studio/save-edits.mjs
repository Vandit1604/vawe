// Writes studio edits to the page file, and keeps them only when `check` (reading the edited page back) accepts the result.
import fs from 'node:fs';
import { applyEdits } from './page-source.mjs';

/** The result of check() on the edited page. A page the check rejects is restored and the error rethrown, so a rejected edit leaves no file change and no undo step. */
export async function saveEdits(file, edits, undoStack, check) {
  const src = fs.readFileSync(file, 'utf8');
  const out = applyEdits(src, edits);
  if (out === src) return check();
  fs.writeFileSync(file, out);
  try {
    const result = await check();
    undoStack.push(src);
    return result;
  } catch (e) {
    fs.writeFileSync(file, src);
    throw e;
  }
}
