// harness/lib/page-stage.mjs: WHERE IS THIS PAGE FILM (films/<name>/page.html), and the one next
// command. State is derived from artifacts on disk, never stored: the page's mtime against its draft
// and final renders (harness/media/render-page.mjs's own output names), the reference sidecar and
// the required-motion-match stamp (harness/lib/motion-stamp.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { referenceFor, motionStampFresh } from './motion-stamp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DAY = 24 * 60 * 60 * 1000;

const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

/** The films/<name>/page.html touched within a day with the newest mtime, or null. */
export function newestPageFilm({ root = ROOT, pagesDir = process.env.VAWE_PAGES_DIR || 'films', maxAgeMs = DAY } = {}) {
  const dir = path.join(root, pagesDir);
  let best = null;
  for (const name of (fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
    if (name.startsWith('_')) continue;
    const page = path.join(dir, name, 'page.html');
    const m = mtime(page);
    if (!m || Date.now() - m > maxAgeMs) continue;
    if (!best || m > best.m) best = { m, name, page: path.relative(root, page) };
  }
  return best;
}

/** pageStageOf('films/x/page.html') -> {name, page, stage, order, why, next, skills}. */
export function pageStageOf(pageRel, { root = ROOT } = {}) {
  const page = path.join(root, pageRel);
  const name = path.basename(path.dirname(page));
  const pageM = mtime(page);
  const draftM = mtime(path.join(root, 'out', `${name}-draft.mp4`));
  const finalM = mtime(path.join(root, 'out', `${name}.mp4`));
  const ref = referenceFor(page);

  const S = [
    { id: 'draft', done: draftM > pageM,
      why: draftM ? 'the page changed since its last draft render.' : 'the page has never been rendered.',
      next: `make dev PAGE=${pageRel}   (FROM= TO= for the seconds you changed)`, skills: ['vawe-page'] },
    ...(ref ? [{ id: 'match', done: motionStampFresh(page),
      why: `the page declares a reference (${ref}) and its current content has no passing match.`,
      next: `make next PAGE=${pageRel} REF=${ref}`, skills: ['vawe-reference'] }] : []),
    { id: 'critique', done: finalM > pageM,
      why: 'a draft exists. A fresh session looks at it before any final render; the author never grades its own film.',
      next: `make critique PAGE=${pageRel}${ref ? ` REF=${ref}` : ''}   (in a session that did not write the page), fix the seconds it names, then make ship PAGE=${pageRel}`,
      skills: ['vawe-critique'] },
    { id: 'judge', done: false,
      why: 'the final render exists. The eye is the only step that SEES, and it is not optional.',
      next: `make critique PAGE=${pageRel}${ref ? ` REF=${ref}` : ''} on the final, two fresh runs; vawe-audit composes the verdict`,
      skills: ['vawe-critique', 'vawe-audit'] },
  ];
  const at = S.find((s) => !s.done) || S[S.length - 1];
  return { name, page: pageRel, stage: at.id, order: S.map((s) => s.id), why: at.why, next: at.next, skills: at.skills };
}
