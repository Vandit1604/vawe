// The whole frame held still for longer than STILL_SEC outside a declared hold. The still runs come from
// scene-stats staticRuns; a hold is declared with the dead-air waiver (AGENTS.md "Waivers"): a bare
// "dead-air" covers the film, "dead-air@2.1-3.4" covers those seconds.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { splitWaiver, hasReason } from './waivers.mjs';

export const STILL_SEC = LIMITS['live-hold'].still_limit_s;

/** The [a, b] second ranges the page declares as holds, each with its _why. Pure. */
export function declaredHolds({ allow = [], _why = {} } = {}) {
  const holds = [];
  for (const entry of allow) {
    const { code, instance } = splitWaiver(entry);
    if (code !== 'dead-air' || !hasReason(_why, entry)) continue;
    const m = instance === null ? ['', '0', 'Infinity'] : instance.match(/^([\d.]+)-([\d.]+)$/);
    if (m) holds.push([Number(m[1]), Number(m[2])]);
  }
  return holds;
}

const outside = (r, holds) => r.len - holds.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, r.b) - Math.max(a, r.a)), 0);

/** Still runs ({ a, b, len } s) whose time outside every declared hold is over `limit`. Pure. */
export function undeclaredStills(runs, authoring = {}, limit = STILL_SEC) {
  const holds = declaredHolds(authoring);
  return runs.filter((r) => outside(r, holds) > limit + 1e-9);
}

/** The problem line for one still run, with the two fixes. Pure. */
export function stillText(r, limit = STILL_SEC) {
  return `static window ${r.a}-${r.b} s (${r.len} s, limit ${limit} s): keep one thing moving (a slow drift on the ground or the hero), or declare the hold with "dead-air@${r.a}-${r.b}" in authoring.allow and a _why`;
}
