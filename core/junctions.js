// core/junctions.js — ONE grammar for naming a moment in a film by its JOINT rather than by its time.
//
// `core/audio-bridges.js` established this and states the reason best: "The junction is NAMED, never
// timed. The film already knows where it turns." A bridge says `at: "cut@1"`, and moving that cut moves
// the sound with it. Nothing to keep in sync, because there is only one copy of the number.
//
// It is extracted here because BACKGROUNDS need the same thing and a second copy of the grammar would
// drift — which is precisely MISTAKES #159, where two hand-kept copies of the snap signature diverged and
// one went blind. `brew-launch-act1` is the case that prompted it: its backdrop cuts per beat, which is
// the film's main structural device, and every boundary was written TWICE — once in `bg`, once in
// `transitions` — with nothing keeping them equal. Move one and the register change silently detaches
// from the junction that was punctuating it. docs/MISTAKES.md #358.
//
//   "cut@0" · "seam@2" · "sting@1" · "junction@3"   (junction = all kinds, merged and time-ordered)

export const JUNCTION_KINDS = ['cut', 'seam', 'sting'];
export const JUNCTION_REF = /^([a-z]+)@(\d+)$/;

/** marks ([{t, kind}]) → per-kind time-ordered lists plus the merged `junction` list. */
export function junctionTable(marks) {
  const table = { junction: [] };
  for (const k of JUNCTION_KINDS) table[k] = [];
  for (const m of marks || []) {
    if (!Number.isFinite(m?.t)) continue;
    if (table[m.kind]) table[m.kind].push(+m.t);
    table.junction.push(+m.t);
  }
  for (const k of Object.keys(table)) table[k].sort((a, b) => a - b);
  return table;
}

/** Human list of what this film actually has — every error names it, so a typo is answerable. */
export function describeJunctions(table) {
  return Object.keys(table)
    .filter((k) => table[k].length)
    .map((k) => `${k}@0..${table[k].length - 1} (${table[k].map((t) => t.toFixed(2)).join(', ')})`)
    .join(' · ') || 'none — this film has no cuts, seams or stings to hang anything on';
}

/** Is this value a junction reference rather than a time? Lets a caller accept either. */
export const isJunctionRef = (v) => typeof v === 'string' && JUNCTION_REF.test(v);

/**
 * resolveJunction(ref, table, where) → seconds.
 * Nothing is guessed: an unknown kind or an index past the end throws and names every junction the film
 * has, because "cut@3" on a two-cut film is a typo, not a hint.
 */
export function resolveJunction(ref, table, where = 'junction reference') {
  const m = JUNCTION_REF.exec(String(ref ?? ''));
  if (!m) throw new Error(`${where}: must be "<kind>@<index>" (e.g. "cut@1", "seam@0", "sting@2", `
    + `"junction@3"), got ${JSON.stringify(ref)}. This film has: ${describeJunctions(table)}`);
  const [, kind, idx] = m;
  if (!table[kind]) throw new Error(`${where}: unknown junction kind "${kind}" in "${ref}" — known: `
    + `junction, ${JUNCTION_KINDS.join(', ')}. This film has: ${describeJunctions(table)}`);
  const times = table[kind];
  if (+idx >= times.length) throw new Error(`${where}: "${ref}" does not exist — this film has `
    + `${times.length} ${kind}${times.length === 1 ? '' : 's'}. Available: ${describeJunctions(table)}`);
  return times[+idx];
}

/** marks from a LOWERED scene (cuts/seams/stings already normalised by transitions-lower). */
export function marksOf(data) {
  const out = [];
  for (const [key, kind] of [['cuts', 'cut'], ['seams', 'seam'], ['stings', 'sting']])
    for (const m of data?.[key] || []) if (Number.isFinite(+m?.t)) out.push({ t: +m.t, kind });
  return out.sort((a, b) => a.t - b.t);
}
