// The "Board" section of a brief.md (written by harness/cli/new.mjs boardText) as data, and the advice a filled board earns.
// Pure: brief text in, lines out. Advice only: a board is a plan, so no check here refuses.
import { cellsOf, numberOf } from './brief-tables.mjs';
import { metaOf } from './page-meta.mjs';

export const CUT_SHORT_S = 0.4;
export const CUT_LONG_S = 0.9;
export const SPECTACLE_TOLERANCE_S = 0.25;

/** The text of the `## <title>` section of a brief, or undefined when it has none. */
export const sectionOf = (brief, title) => brief.split(/^## /m).find((s) => s.startsWith(title));

/** The table rows of a section text that hold an answer: no separator row and no bracketed placeholder in the first cell. */
export const filledRows = (section) => section.split('\n').filter((l) => l.startsWith('|') && !/^\|[-| ]+\|$/.test(l) && !l.split('|')[1].trim().startsWith('['));

/** False while the Board section still holds a bracketed placeholder row; null when the brief has no Board section. */
export function boardFilled(brief) {
  const section = sectionOf(brief, 'Board');
  if (section === undefined) return null;
  return !section.split('\n').some((l) => l.startsWith('| ['));
}

// The answer rows of the table whose header row starts with `head` (a first-cell label), as arrays of cells.
function rowsOf(section, head) {
  const lines = section.split('\n');
  const at = lines.findIndex((l) => l.startsWith('|') && cellsOf(l)[0] === head);
  if (at < 0) return [];
  const rows = [];
  for (let i = at + 1; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
  return filledRows(rows.join('\n')).map(cellsOf);
}

/** { cuts (seconds), moves (cells), sound (cells), spectacle (seconds or null) } of the Board section, or null when the brief has none. */
export function parseBoard(brief) {
  const section = brief ? sectionOf(brief, 'Board') : undefined;
  if (section === undefined) return null;
  const spectacle = /Spectacle:[^\n]*?\bat\s+(\d+(?:\.\d+)?)/.exec(section);
  return {
    cuts: rowsOf(section, 'beat').map((c) => numberOf(c[3] ?? '')).filter((v) => v !== null),
    moves: rowsOf(section, 'cut').map((c) => c[1] ?? ''),
    sound: rowsOf(section, 'at s'),
    spectacle: spectacle ? Number(spectacle[1]) : null,
  };
}

/** The second in `<meta name="spectacle">` of page html, or null when the page has none or it is not a number. */
export function spectacleOf(html) {
  const s = metaOf(html, 'spectacle');
  return s !== null && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null;
}

const s1 =(x) => `${Math.round(x * 100) / 100}`;

/** Advice lines for a filled board: rhythm, spectacle, sound, moves. `pageSpectacle` is the page's `<meta name="spectacle">` in seconds, or null. [] for a brief with no filled board. */
export function boardChecks(brief, pageSpectacle = null) {
  if (boardFilled(brief ?? '') !== true) return [];
  const { cuts, moves, sound, spectacle } = parseBoard(brief);
  const lines = [];
  if (cuts.length >= 2) {
    if (cuts.every((c) => c === cuts[0])) lines.push(`board: all ${cuts.length} cuts last ${s1(cuts[0])} s; vary them`);
    if (cuts.every((c) => c >= CUT_SHORT_S)) lines.push(`board: no cut under ${CUT_SHORT_S} s; add one quick cut`);
    if (cuts.every((c) => c <= CUT_LONG_S)) lines.push(`board: no cut over ${CUT_LONG_S} s; add one slow cut`);
  }
  if (spectacle === null) lines.push('board: the Spectacle line names no second ("at 7.2"); name the one big moment');
  else if (pageSpectacle !== null && Math.abs(spectacle - pageSpectacle) > SPECTACLE_TOLERANCE_S) {
    lines.push(`board: the Spectacle is at ${s1(spectacle)} s but <meta name="spectacle"> says ${s1(pageSpectacle)} s; make them one second`);
  }
  if (!sound.length) lines.push('board: no sound rows; add a bed and one voice per cut');
  else if (!sound.some((r) => /bed|loop/i.test(r[1] ?? ''))) lines.push('board: the sound rows have no bed; add a looped bed for the whole film');
  moves.forEach((m, i) => { if (!m || /\bfade\b/i.test(m)) lines.push(`board: cut ${i + 1} names ${m ? `"${m}"` : 'no move'}; name a move from prompts/moves`); });
  return lines;
}
