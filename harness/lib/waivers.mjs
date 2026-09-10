// harness/lib/waivers.mjs: ONE waiver stays one excuse mechanism (author-check.mjs "THE ONE EXCUSE
// MECHANISM"), but a bare code excuses that code for the WHOLE FILM, forever. Measured: a new 1.0:1
// contrast defect on a new beat rode through as "(waived)" under an old excuse written for a different
// beat. This module is the one place that decides whether an `authoring.allow` entry covers a finding,
// so author-check.mjs and waiver-drift.mjs (the only two files that get to make that decision) agree.
//
// SYNTAX, backward compatible. An entry is a bare code ("dead-air", as today) or an instance-scoped one
// ("dead-air@beat:3"). The instance half is never invented here: it is exactly what the finding's own
// `at` field already says (harness/lib/findings.mjs), so a waiver can only ever be as specific as the
// gate that raised the finding already is. A gate that never sets `at` on a code can only be waived
// bare, and that is not a gap in this module, it is a fact about that gate stated honestly.
//
// MATCHING. A bare entry excuses every finding of its code, whatever instance fired (unchanged
// behaviour: no existing film's waivers stop working). A scoped entry excuses only the finding whose
// `at` stringifies to exactly its instance half. `_why` keys the SAME entry string, bare or scoped, so
// "dead-air@beat:3" needs `_why["dead-air@beat:3"]`, never `_why["dead-air"]`.

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
