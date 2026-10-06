// The side-by-side half of the fresh judge: the parse of its answers and the score caps that follow from
// it. A judge that answers "which is better" agrees with people more often than one that scores alone,
// so the scores follow the answers. Pure; harness/media/judge-fresh.mjs feeds it. The question itself is
// barLines in judge-prompt.mjs.

export const DIALS = ['text', 'colour', 'motion'];
export const OURS = 'ours';
export const CAP_LOST_ONE = 7;
export const CAP_LOST_BOTH = 6;

// The fresh axes (quality/gates/rubric.mjs FRESH_AXES) that each dial caps; the other axes have no dial.
export const AXIS_DIAL = { type: 'text', colour: 'colour', motion: 'motion', pace: 'motion' };

/** The answers as [{ ref, dial, winner, why }], one per reference and dial in that order. `winner` is OURS or the ref id. A missing answer is a loss: the judge gave no reason to rank ours first. */
export function barResult(raw, refs) {
  const given = Array.isArray(raw) ? raw.filter((a) => a && typeof a === 'object') : [];
  return refs.flatMap((r) => DIALS.map((dial) => {
    const a = given.find((x) => String(x.ref).trim() === r.id && String(x.dial).toLowerCase().trim() === dial);
    if (!a) return { ref: r.id, dial, winner: r.id, why: 'the judge gave no answer' };
    return { ref: r.id, dial, winner: /^ours$/i.test(String(a.winner).trim()) ? OURS : r.id, why: String(a.why ?? '') };
  }));
}

/** How many references beat ours on each dial: { text: { lost, of }, ... }. */
export function dialLosses(bar) {
  return Object.fromEntries(DIALS.map((d) => {
    const rows = bar.filter((b) => b.dial === d);
    return [d, { lost: rows.filter((b) => b.winner !== OURS).length, of: rows.length }];
  }));
}

/** The dials on which ours loses to every reference, when there are at least two. */
export const lostBoth = (bar) => DIALS.filter((d) => { const { lost, of } = dialLosses(bar)[d]; return of >= 2 && lost === of; });

/** The scores with each dial's axes capped: 6 when ours loses to both references on the dial, 7 when it loses to one. Returns { scores, capped: [{ axis, from, to }] }. */
export function capScores(scores, bar) {
  const losses = dialLosses(bar);
  const both = lostBoth(bar);
  const out = { ...scores };
  const capped = [];
  for (const [axis, dial] of Object.entries(AXIS_DIAL)) {
    const cap = both.includes(dial) ? CAP_LOST_BOTH : losses[dial].lost > 0 ? CAP_LOST_ONE : null;
    if (cap !== null && out[axis] > cap) { capped.push({ axis, from: out[axis], to: cap }); out[axis] = cap; }
  }
  return { scores: out, capped };
}

/** The reason a capped axis gives when the judge named no fix: the first answer that lost on its dial. */
export function barFix(axis, bar) {
  const lost = bar.find((b) => b.dial === AXIS_DIAL[axis] && b.winner !== OURS);
  return lost ? `ours loses to ${lost.ref} on ${lost.dial}: ${lost.why}` : null;
}

/** What the run log keeps: [{ ref, dial, winner }]. */
export const barEvent = (bar) => bar.map(({ ref, dial, winner }) => ({ ref, dial, winner }));

/** The report lines: wins per dial, then each loss with its reason. */
export function barReport(bar, shown = 3) {
  const losses = dialLosses(bar);
  const lost = bar.filter((b) => b.winner !== OURS);
  return [
    `bar: ${DIALS.map((d) => `${d} won ${losses[d].of - losses[d].lost} of ${losses[d].of}`).join(', ')}`,
    ...lost.slice(0, shown).map((b) => `- ${b.dial}: REF ${b.ref} is better, ${b.why}`),
  ];
}
