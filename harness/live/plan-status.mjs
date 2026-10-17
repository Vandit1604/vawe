// What `vawe dev` says before it renders (the plan status) and after it (the top advice): short, ranked, capped. Pure: the page's
// state in, lines out; dev-warn.mjs and dev-end.mjs read the files. Each stage names the one skill file that covers it.
import { boardFilled } from '../lib/board.mjs';
import { ideasFilled } from '../lib/ideas.mjs';
import { NOTE_LINES } from '../lib/draft-check.mjs';
import { takenFromCount, missingRungs } from './stage-say.mjs';

export const STATUS_MAX_LINES = 8;
export const ITEMS_SHOWN = 2;
export const LINE_MAX = 200;
export const ADVICE_SHOWN = 3;

export const SKILLS = {
  brief: 'skills/vawe-brief/SKILL.md',
  board: 'skills/vawe-transitions/SKILL.md',
  ideas: 'skills/vawe-transitions/SKILL.md',
  study: 'skills/vawe-reference/SKILL.md',
  design: 'skills/vawe-page/SKILL.md',
};

const BAN_IDS = { tells: 'no-tells', slideshow: 'thread' };
const ADVICE_RANK = [/^slideshow: score/, /^attractor:/, /^slideshow:/, /^transitions:/];

/** `line` cut to LINE_MAX characters. */
export const short = (line, max = LINE_MAX) => (line.length > max ? `${line.slice(0, max - 3)}...` : line);

/** The text of the DIGEST line that ends in `(<id>)`, or null. */
export function digestLine(digest, id) {
  const line = String(digest ?? '').split('\n').find((l) => l.endsWith(` (${id})`));
  return line ? line.replace(/^- /, '').replace(` (${id})`, '') : null;
}

const ATTRACTORS_MAX = 150;

/** The "Attractors" paragraph of the digest: the list the hero is never taken from. */
const attractorList = (digest) => /^## Attractors\n\n(.+)$/m.exec(String(digest ?? ''))?.[1] ?? null;

/** The ban lines that apply to every page (no tells, attractors, slideshow tells), from the taste digest. */
export function banLines(digest) {
  const tells = digestLine(digest, BAN_IDS.tells);
  const slideshow = /slideshow tells: [\w/.-]+/.exec(digestLine(digest, BAN_IDS.slideshow) ?? '')?.[0];
  const attractors = attractorList(digest) ? `${short(attractorList(digest), ATTRACTORS_MAX)} ${slideshow ?? ''}`.trim() : slideshow;
  return [tells, attractors].filter(Boolean).map((l) => `ban: ${short(l)}`);
}

/** What is empty or stale for a page, most costly first: [{ what, fix }]. `early` is true until a draft exists. */
export function openItems({ rel, brief, design, early, frames, storyboardRan }) {
  if (brief === null) return [{ what: 'brief.md is missing', fix: SKILLS.brief }];
  const items = [];
  if (boardFilled(brief) === false) items.push({ what: 'the brief Board is empty', fix: SKILLS.board });
  if (ideasFilled(brief) === false) items.push({ what: 'the Ideas ledger is empty', fix: SKILLS.ideas });
  if (early && !storyboardRan) items.push({ what: 'no storyboard run', fix: `bin/vawe storyboard ${rel}` });
  const taken = takenFromCount(brief);
  if (early && taken !== null && taken < 4) items.push({ what: `the reference study names ${taken} of 4 frames`, fix: SKILLS.study });
  const rungs = early && taken !== null ? missingRungs(design ?? '') : [];
  if (rungs.length) items.push({ what: `DESIGN.md has no line for ${rungs.join(', ')}`, fix: SKILLS.design });
  if (early && frames !== 'ok') items.push({ what: frames === 'stale' ? 'the frames are older than the page' : 'no frames run', fix: `bin/vawe frames ${rel}` });
  return items;
}

const itemLine = ({ what, fix }) => `  - ${what}: ${fix}`;

/** The finding lines, attractors first, at most one shown with the count of the rest. */
function findingLine(findings, rel) {
  if (!findings.length) return [];
  const ranked = [...findings].sort((a, b) => Number(b.startsWith('attractor:')) - Number(a.startsWith('attractor:')));
  const more = ranked.length > 1 ? ` (+${ranked.length - 1} more: bin/vawe storyboard ${rel})` : '';
  return [`  plan: ${short(ranked[0])}${more}`];
}

/**
 * The block printed before a draft renders, at most STATUS_MAX_LINES lines, ending in one `next:` line; [] when nothing is open and
 * no finding exists. `findings` are plan finding lines (planLines) and attractor lines; `digest` is taste/build/DIGEST.md; `next` is nextStep's command.
 */
export function planStatusLines({ name, rel, brief, design, early, frames, storyboardRan, findings = [], digest = '', next }) {
  const items = openItems({ rel, brief, design, early, frames, storyboardRan });
  if (!items.length && !findings.length) return [];
  const shown = items.slice(0, ITEMS_SHOWN).map(itemLine);
  const rest = items.slice(ITEMS_SHOWN);
  const more = rest.length ? [`  - +${rest.length} more: ${rest.map((i) => i.what).join('; ')}`] : [];
  const body = [`plan of ${name}: ${items.length + findings.length} open, the draft renders anyway`, ...shown, ...more.map((l) => short(l)), ...findingLine(findings, rel), ...banLines(digest)];
  return [...body.slice(0, STATUS_MAX_LINES - 1), `next: ${next}`];
}

const rankOf = (line) => { const at = ADVICE_RANK.findIndex((re) => re.test(line)); return at < 0 ? ADVICE_RANK.length : at; };

/** The advice lines of out/<film>.dev.md ("advice: ..." under Draft check), without the prefix. */
export function adviceOfDevNotes(text) {
  const section = String(text).split(/^## /m).find((s) => s.startsWith('Draft check')) ?? '';
  return section.split('\n').filter((l) => l.startsWith('advice: ')).map((l) => l.slice('advice: '.length)).filter((l) => !NOTE_LINES.test(l));
}

/** The top ADVICE_SHOWN advice lines of a draft, slideshow score and attractors first, then the count of the rest and where they are. */
export function topAdviceLines(advice, film) {
  const ranked = advice.map((line, i) => ({ line, i })).sort((a, b) => rankOf(a.line) - rankOf(b.line) || a.i - b.i).map((x) => x.line);
  const shown = ranked.slice(0, ADVICE_SHOWN).map((l) => `  advice: ${short(l)}`);
  const rest = ranked.length - shown.length;
  return ranked.length ? [`top advice of ${film}:`, ...shown, ...(rest > 0 ? [`  +${rest} more in out/${film}.dev.md`] : [])] : [];
}
