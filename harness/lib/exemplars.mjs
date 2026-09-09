// scripts/lib/exemplars.mjs: the ONE owner of exemplar retrieval. `examples.json`'s goldSet names the
// full films this repo is proudest of; two callers reach for them and must not drift apart:
//   - preflight prints "EXEMPLARS TO STUDY" (rules tell you what to avoid; an exemplar shows what to reach for).
//   - scaffold composes the first draft to the shape of the nearest one, so the default draft inherits a
//     proven film's backdrop rhythm instead of a generic two-window default.
// Retrieval is token overlap, the same method as arsenal and for the same reason (docs/CRAFT/DISCOVERY.md):
// the corpus is three films, and an embedding model to rank three rows is weight with no payoff.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'with', 'on', 'in', 'is', 'this', 'that', 'it', 'its', 'film', 'video', 'one']);
const words = (s) => ((s || '').toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w));

/** The goldSet full films, or [] if the registry is missing/malformed. */
export function goldFilms() {
  const p = path.join(ROOT, 'formats/scene/examples.json');
  if (!fs.existsSync(p)) return [];
  let ex; try { ex = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
  const films = ex && ex.goldSet && ex.goldSet.fullFilms;
  return Array.isArray(films) ? films : [];
}

/**
 * Rank the goldSet full films by token overlap with `feelText` (a brief, a note, a storyboard).
 * With no feel words, score is 0 across the board and the goldSet's own order is kept, so a caller
 * with nothing to match still gets a stable default rather than nothing.
 */
export function nearestExemplars(feelText, n = 3) {
  const feel = new Set(words(feelText));
  const scored = goldFilms().map((f) => {
    const sbPath = path.join(ROOT, 'formats/scene', String(f.file).replace(/\.json$/, '.storyboard.md'));
    let own = [f.teaches, f.register].filter(Boolean).join(' ');
    if (fs.existsSync(sbPath)) own += ' ' + fs.readFileSync(sbPath, 'utf8').slice(0, 1200);
    const score = feel.size ? words(own).filter((w) => feel.has(w)).length : 0;
    return { ...f, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

/**
 * The portable structural signature of a goldSet film: what a scaffold can imitate without copying
 * layers (copying a structure wholesale re-introduces a template, which the ledger flags). Today that
 * is the backdrop rhythm, CLAUDE.md's strongest single lever: the two proudest launch films turn the
 * world on 6-7 windows while the generic scaffold ships 2. Transitions are deliberately not read: the
 * exemplars carry none (they cut on bg + camera, like brew), so there is nothing to imitate there.
 */
export function exemplarSignature(file) {
  const p = path.join(ROOT, 'formats/scene', file);
  if (!fs.existsSync(p)) return null;
  let s; try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
  const bg = Array.isArray(s.bg) ? s.bg : (s.bg ? [s.bg] : []);
  const bgPresets = bg.map((w) => w && w.preset).filter(Boolean);
  return { file, bgWindows: bg.length, bgPresets, theme: s.theme || null };
}
