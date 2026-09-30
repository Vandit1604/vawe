// The judge ledger: every fix a fresh judge asks for gets an id and stays in out/<name>.judge.json. The
// next judge of the film marks each open one fixed, partly or still before it adds new ones, and says
// why when a new fix reverses an old one. Pure: harness/media/judge-fresh.mjs reads and writes the file.

export const MARKS = ['fixed', 'partly', 'still'];

const idNumber = (id) => Number(/^f(\d+)$/.exec(id || '')?.[1] || 0);

/** The items of a previous judge result; a result from before the ledger gives its fixes ids. */
export function previousItems(prev) {
  if (!prev) return [];
  if (Array.isArray(prev.items)) return prev.items;
  return (prev.fixes || []).map((f, i) => ({ id: `f${i + 1}`, axis: f.axis, at: f.at ?? null, fix: f.fix, status: 'new' }));
}

export const openItems = (items) => items.filter((i) => i.status !== 'fixed');

/** The prompt lines for the open items, or '' when there are none. */
export function ledgerPrompt(open) {
  if (!open.length) return '';
  return `Ledger: the last judge of this film asked for these fixes.
${open.map((i) => `- ${i.id} (${i.axis}${i.at != null ? ` at ${i.at}` : ''}): ${i.fix}`).join('\n')}
First mark each one: add "ledger":[{"id":"${open[0].id}","status":"fixed, partly or still"}, ...] to the JSON. Then give fixes only for what is new; for an axis whose item is still open, write "fix":"${open[0].id}" (its id). A fix that undoes an item above needs "reverses":"<id>" and "why":"<one reason>".`;
}

function refersTo(fix, open) {
  const id = /^\s*(f\d+)\b/.exec(fix || '')?.[1];
  return open.find((i) => i.id === id) || null;
}

/**
 * The next ledger. `prev` is the previous items, `raw` the judge's JSON (its ledger marks, its fixes with
 * reverses and why), `fixes` the result's fixes. Returns { items, fixes, counts, reversals }: `fixes` with
 * id references replaced by the old item's text.
 */
export function mergeLedger(prev, raw, fixes) {
  const marks = new Map((raw.ledger || []).map((m) => [m.id, m.status]));
  const counts = { fixed: 0, partly: 0, still: 0, unmarked: 0, new: 0 };
  const open = openItems(prev);
  const carried = prev.map((i) => {
    if (i.status === 'fixed') return i;
    const status = MARKS.includes(marks.get(i.id)) ? marks.get(i.id) : 'unmarked';
    counts[status] += 1;
    return { ...i, status };
  });
  let n = Math.max(0, ...prev.map((i) => idNumber(i.id)));
  const fresh = [];
  const shown = fixes.map((f) => {
    const old = refersTo(f.fix, open);
    if (old) return { ...f, fix: `${old.id}: ${old.fix}` };
    const given = (raw.fixes || []).find((x) => x.axis === f.axis) || {};
    const item = { id: `f${++n}`, axis: f.axis, at: f.at, fix: f.fix, status: 'new' };
    if (given.reverses) Object.assign(item, { reverses: given.reverses, why: given.why || null });
    fresh.push(item);
    return { ...f, fix: `${item.id}: ${f.fix}` };
  });
  counts.new = fresh.length;
  return { items: [...carried, ...fresh], fixes: shown, counts, reversals: fresh.filter((i) => i.reverses) };
}

/** The compact line: "ledger: 3 fixed, 1 partly, 1 still; 2 new", and one line per reversal. */
export function ledgerLines({ counts, reversals }) {
  const unmarked = counts.unmarked ? `, ${counts.unmarked} unmarked` : '';
  return [
    `ledger: ${counts.fixed} fixed, ${counts.partly} partly, ${counts.still} still${unmarked}; ${counts.new} new`,
    ...reversals.map((r) => `reverses ${r.reverses}: ${r.why || 'no reason given; treat the old fix as standing'}`),
  ];
}
