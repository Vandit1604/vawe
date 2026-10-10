// The waiver syntax and its vetting. A page declares a broken rule in <script id="authoring"> as "allow" entries (a check's code, or
// code@instance) with a "_why" reason each. A reason that is generic, names no place or no measure, or repeats across the page does not waive.
// Pure.

/** The one wording of the waiver syntax a draft line ends with: `entry` is the allow entry (a code, or code@instance). */
export const waiverHint = (entry) => `waive: "allow": ["${entry}"], "_why": {"${entry}": "<where: a world id or a second, and what you measured, with its unit>"} in <script id="authoring">`;

/** Codes that waive nothing now, each with what to write instead. */
export const RETIRED_CODES = {
  'dead-air': 'it covered four checks at once: waive the one that fired, "static-window@a-b", "tile-run@a-b", "tail-tiles@a-b" or "world-held@a-b"',
  glow: 'no check emits it, so it waives nothing: remove it',
  'off-colour': 'no check emits it, so it waives nothing: remove it',
};

/** Split one `authoring.allow` entry into { code, instance }. `instance` is null for a bare entry. */
export function splitWaiver(entry) {
  const s = String(entry);
  const i = s.indexOf('@');
  return i === -1 ? { code: s, instance: null } : { code: s.slice(0, i), instance: s.slice(i + 1) };
}

/** Does this one `allow` entry cover a finding of `code` at instance `at`? An instance is a second, or a range "a-b" that holds it. */
export function waiverCovers(entry, code, at) {
  const w = splitWaiver(entry);
  if (w.code !== code) return false;
  if (w.instance === null) return true;
  if (at === undefined || at === null) return false;
  if (w.instance === String(at)) return true;
  if (/^[\d.]+$/.test(w.instance) && Math.abs(Number(w.instance) - Number(at)) < 0.005) return true;
  const range = /^([\d.]+)-([\d.]+)$/.exec(w.instance);
  const t = Number(at);
  return Boolean(range) && Number.isFinite(t) && Number(range[1]) <= t + 1e-9 && t <= Number(range[2]) + 1e-9;
}

/** Does ANY entry in `allow` (the raw authoring.allow array) cover this finding? */
export function isWaivedBy(allow, code, at) {
  return (allow || []).some((e) => waiverCovers(e, code, at));
}

export const MIN_REASON_LEN = 12;
export const REPEAT_MAX = 2;

const STOP_PHRASES = ['intentional', 'intentionally', 'by design', 'deliberate', 'deliberately', 'stylistic', 'stylistic choice', 'fine', 'ok', 'okay', 'as intended', 'on purpose', 'owner approved', 'owner decision'];
const FILLER = new Set(['the', 'a', 'an', 'is', 'it', 'this', 'that', 'are', 'was', 'be', 'and', 'so', 'here', 'just', 'its', 'of', 'to']);
const UNIT = String.raw`(?:%|px|em|db|lufs|:1|x|ms|fps|frames?|words?|s|sec|seconds?|fh)`;
const MEASURED = new RegExp(String.raw`\d+(?:\.\d+)?\s*${UNIT}(?![a-z])`, 'gi');
const SECOND = /\b\d+(?:\.\d+)?\s*(?:s|sec|seconds?)\b(?![a-z])|\bat\s+\d/i;

const normal = (reason) => reason.toLowerCase().replace(/[^a-z0-9.:% ]+/g, ' ').replace(/\s+/g, ' ').trim();

function isGeneric(reason) {
  let rest = ` ${normal(reason)} `;
  for (const p of STOP_PHRASES) rest = rest.replaceAll(` ${p} `, ' ');
  const words = rest.split(' ').filter((w) => w && !FILLER.has(w));
  return words.length < 3;
}

/**
 * Why a reason does not count, or null when it does. `ctx`: { worlds (the page's data-world ids), reasons (every reason on the page, to catch a copy) }.
 * A reason must name where (a world id or a second) and what was measured (a number with its unit); a second is one number, not the measure.
 */
export function reasonProblem(reason, ctx = {}) {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < MIN_REASON_LEN) return `the reason is under ${MIN_REASON_LEN} characters`;
  if (isGeneric(text)) return 'the reason is generic (intentional, by design, deliberate, stylistic, fine, ok, as intended say nothing): name what you saw and measured';
  const lower = text.toLowerCase();
  const world = (ctx.worlds ?? []).find((id) => new RegExp(String.raw`(^|[^a-z0-9-])${id.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9-])`).test(lower));
  const second = SECOND.test(text);
  if (!world && !second) return 'the reason names no place: write a world id of this page or a second (for example "world s3" or "at 2.6 s")';
  const measures = text.match(MEASURED) ?? [];
  if (measures.length < (second && !world ? 2 : 1)) return 'the reason names no measured value: write the number the check printed, with its unit (for example "3.4 s", "2.7:1", "42%")';
  const copies = (ctx.reasons ?? []).filter((r) => normal(String(r)) === normal(text)).length;
  if (copies > REPEAT_MAX) return `the same reason is used for ${copies} waivers on this page: one reason per waiver, about that waiver`;
  return null;
}

/** Does `why[entry]` (the `authoring._why` map, keyed by the raw allow entry) hold a reason that counts? `ctx` as reasonProblem. */
export function hasReason(why, entry, ctx = {}) {
  const v = why && why[entry];
  return reasonProblem(v, { ...ctx, reasons: ctx.reasons ?? Object.values(why ?? {}) }) === null;
}

const ctxOf = (authoring) => ({ worlds: authoring._worlds ?? [], reasons: Object.values(authoring._why ?? {}) });

/** Does the reason the page gives for `entry` count? The one vetting every check uses. */
export const entryHasReason = (authoring, entry) => hasReason(authoring._why, entry, ctxOf(authoring));

/** Is a finding of `code` (at instance `at`, optional) waived by an entry, bare or scoped to a range holding `at`, whose reason counts? */
export function isWaived(authoring = {}, code, at = null) {
  const { allow = [], _why = {} } = authoring;
  return allow.some((e) => waiverCovers(e, code, at) && !RETIRED_CODES[splitWaiver(e).code] && entryHasReason(authoring, e));
}

/** Every allow entry with its reason and why it waives nothing (null when it does): [{ entry, why, problem }]. */
export function waiverVerdicts(authoring = {}) {
  const { allow = [], _why = {} } = authoring;
  return allow.map((entry) => {
    const { code } = splitWaiver(entry);
    const problem = RETIRED_CODES[code] ? `waives nothing: ${RETIRED_CODES[code]}` : reasonProblem(_why[entry], ctxOf(authoring));
    return { entry, why: typeof _why[entry] === 'string' ? _why[entry] : null, problem: problem && !RETIRED_CODES[code] ? `refused: ${problem}` : problem };
  });
}

/** One line per allow entry that waives nothing, with the reason: a retired code, or a reason that does not count. */
export const waiverProblems = (authoring = {}) => waiverVerdicts(authoring).filter((v) => v.problem).map((v) => `waiver "${v.entry}" ${v.problem}`);
