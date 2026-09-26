
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

// THE ONE BAR FOR "HAS A REASON" (AGENTS.md: "a waiver with no `_why` blocks"); waiver-drift.mjs used to check `_why` with its own ad hoc logic, so this is the one predicate both author-check.mjs and waiver-drift.mjs call now.
export const MIN_REASON_LEN = 12;

/** Does `why[entry]` (the `authoring._why` map, keyed by the raw allow entry) hold a real reason? */
export function hasReason(why, entry) {
  const v = why && why[entry];
  return typeof v === 'string' && v.trim().length >= MIN_REASON_LEN;
}

/**
 * Group `allow` into the two shapes reporting needs: which codes are waived BARE (film-wide, whatever
 * instance fires), and which codes carry one or more specific instances only.
 * -> { bare: Set<code>, scoped: Map<code, Set<instance>> }
 */
export function groupWaivers(allow) {
  const bare = new Set(), scoped = new Map();
  for (const e of allow || []) {
    const { code, instance } = splitWaiver(e);
    if (instance === null) bare.add(code);
    else { if (!scoped.has(code)) scoped.set(code, new Set()); scoped.get(code).add(instance); }
  }
  return { bare, scoped };
}

/**
 * A BARE waiver for `code` hides every current finding of that code, whatever fired. Given the live
 * finding records this run actually produced (each `{ code, at? }`), say how many it hides and, where
 * the gate names an instance, which ones, so a film-wide waiver never hides its own size silently.
 * Returns null when `code` is not waived bare in `allow` (nothing to report).
 */
export function bareWaiverCoverage(allow, code, records) {
  const { bare } = groupWaivers(allow);
  if (!bare.has(code)) return null;
  const mine = (records || []).filter((r) => r.code === code);
  const instances = mine.map((r) => (r.at !== undefined && r.at !== null ? String(r.at) : null));
  const named = instances.filter((x) => x !== null);
  return { count: mine.length, instances: named, hasInstanceData: named.length === instances.length && instances.length > 0 };
}
