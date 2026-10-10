// The one wording of the waiver syntax a draft line ends with: `entry` is the allow entry (a code, or code@instance).
export const waiverHint = (entry) => `waive: "allow": ["${entry}"], "_why": {"${entry}": "<reason>"} in <script id="authoring">`;

/** Split one `authoring.allow` entry into { code, instance }. `instance` is null for a bare entry. */
export function splitWaiver(entry) {
  const s = String(entry);
  const i = s.indexOf('@');
  return i === -1 ? { code: s, instance: null } : { code: s.slice(0, i), instance: s.slice(i + 1) };
}

/** Does this one `allow` entry cover a finding of `code` at instance `at`? */
export function waiverCovers(entry, code, at) {
  const w = splitWaiver(entry);
  if (w.code !== code) return false;
  return w.instance === null || (at !== undefined && at !== null && w.instance === String(at));
}

/** Does ANY entry in `allow` (the raw authoring.allow array) cover this finding? */
export function isWaivedBy(allow, code, at) {
  return (allow || []).some((e) => waiverCovers(e, code, at));
}

/** Is a finding of `code` (at instance `at`, optional) waived by a bare or scoped entry that has its _why? */
export function isWaived({ allow = [], _why = {} } = {}, code, at = null) {
  const entry = allow.find((e) => e === code || (at !== null && e === `${code}@${at}`));
  return Boolean(entry && hasReason(_why, entry));
}

// THE ONE BAR FOR "HAS A REASON" (AGENTS.md: "a waiver with no `_why` blocks"); waiver-drift.mjs used to check `_why` with its own ad hoc logic, so this is the one predicate both author-check.mjs and waiver-drift.mjs call now.
export const MIN_REASON_LEN = 12;

/** Does `why[entry]` (the `authoring._why` map, keyed by the raw allow entry) hold a real reason? */
export function hasReason(why, entry) {
  const v = why && why[entry];
  return typeof v === 'string' && v.trim().length >= MIN_REASON_LEN;
}
