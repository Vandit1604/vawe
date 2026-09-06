// core/junctions.js: ONE grammar for naming a moment in a film by its JOINT rather than by its time.
//
// `core/audio-bridges.js` established this and states the reason best: "The junction is NAMED, never
// timed. The film already knows where it turns." A bridge says `at: "cut@1"`, and moving that cut moves
// the sound with it. Nothing to keep in sync, because there is only one copy of the number.
//
// It is extracted here because BACKGROUNDS need the same thing and a second copy of the grammar would
// drift, which is precisely MISTAKES #159, where two hand-kept copies of the snap signature diverged and
// one went blind. `brew-launch-act1` is the case that prompted it: its backdrop cuts per beat, which is
// the film's main structural device, and every boundary was written TWICE, once in `bg`, once in
// `transitions`, with nothing keeping them equal. Move one and the register change silently detaches
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

/** Human list of what this film actually has: every error names it, so a typo is answerable. */
export function describeJunctions(table) {
  return Object.keys(table)
    .filter((k) => table[k].length)
    .map((k) => `${k}@0..${table[k].length - 1} (${table[k].map((t) => t.toFixed(2)).join(', ')})`)
    .join(' · ') || 'none: this film has no cuts, seams or stings to hang anything on';
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
  if (!table[kind]) throw new Error(`${where}: unknown junction kind "${kind}" in "${ref}", known: `
    + `junction, ${JUNCTION_KINDS.join(', ')}. This film has: ${describeJunctions(table)}`);
  const times = table[kind];
  if (+idx >= times.length) throw new Error(`${where}: "${ref}" does not exist, this film has `
    + `${times.length} ${kind}${times.length === 1 ? '' : 's'}. Available: ${describeJunctions(table)}`);
  return times[+idx];
}

/**
 * bindWindowsToJunctions(windows, table) → the same windows with `from`/`to` filled from the film's
 * own joints: window i runs from junction i-1 to junction i, and the last one runs to the end.
 *
 * WHY THIS IS THE DEFAULT AND NOT A FEATURE. `bg` is a required field, so the backdrop is always a
 * decision, and the measured library says the decision is almost never made: 134 of 144 scenes paint
 * ONE window for the whole runtime. The two films this repo is proudest of do the opposite; brew
 * inverts the tone of the world on four of its five cuts. Writing that by hand meant naming the same
 * boundary twice, so the cheap thing to write was the flat backdrop, and the flat backdrop is what
 * got written 134 times. Here the cheap thing to write is the right one: list the windows in order,
 * declare no times, and the cuts you already wrote own the numbers.
 *
 * It applies ONLY when there are 2+ windows and not one of them declares an edge, which is today a
 * SILENT BUG rather than a style: every window defaults to 0..1e9, `bgWinAt` keeps the last match, so
 * all but the final window are accepted and then never drawn. Input taken and discarded is the failure
 * this codebase hates most (docs/MISTAKES.md #213, #369). A single window still means "the whole film",
 * and any window that names an edge still means exactly what it said.
 */
export function bindWindowsToJunctions(windows, table, duration = Infinity) {
  if (!Array.isArray(windows) || windows.length < 2) return windows;
  if (windows.some((b) => b?.from != null || b?.to != null)) return windows;
  // THE JOINTS ARE THE ONES shotWindows NAMES, and this line used to read `table.junction`, the merged
  // list that also holds stings. Twelve lines below, shotWindows argues the case against exactly that:
  // a cut or a seam is a boundary by construction, a sting is punctuation that lands INSIDE a shot at
  // least as often as it ends one. The schema promised the same thing all along ("the engine binds them
  // to the film's CUTS in order"). Three statements of one rule and one contradicting implementation.
  //
  // It was silent and it was not theoretical: declaring a `spectacle` injects a sting, which shifted
  // every backdrop window one joint late. Two agents rewriting different films hit it independently on
  // the same afternoon, and each found it by reading a beats sheet rather than from any error. On one
  // film the payoff beat rendered orange instead of ink. Both worked around it with explicit
  // `from`/`to` on every window, which is the per-call-site opt-out CLAUDE.md calls not a root fix.
  const j = shotWindows(table, duration).slice(1).map((w) => w.start);
  if (j.length < windows.length - 1)
    throw new Error(`bg: ${windows.length} windows declare no times, so each one is bound to the joint `
      + `after it: that needs ${windows.length - 1} cuts or seams and this film has ${j.length}. `
      + `Either cut the film where the backdrop should turn, or give each window its own from/to. `
      + `This film has: ${describeJunctions(table)}`);
  return windows.map((b, i) => ({
    ...b,
    from: i === 0 ? 0 : j[i - 1],
    ...(i === windows.length - 1 ? {} : { to: j[i] }),
  }));
}

/** marks from a LOWERED scene (cuts/seams/stings already normalised by transitions-lower). */
export function marksOf(data) {
  const out = [];
  for (const [key, kind] of [['cuts', 'cut'], ['seams', 'seam'], ['stings', 'sting']])
    for (const m of data?.[key] || []) if (Number.isFinite(+m?.t)) out.push({ t: +m.t, kind });
  return out.sort((a, b) => a.t - b.t);
}
/**
 * shotWindows(table, duration) → [{ start, end }] in seconds: the film cut into SHOTS at its own joints.
 *
 * bindWindowsToJunctions reads the joints to place windows an author declared. This reads the same
 * joints to DERIVE the windows nobody declared, and it is here rather than in the gate that wanted it
 * because a second copy of "where does this film turn" is the drift MISTAKES #159 and #358 both are.
 *
 * STINGS ARE NOT JOINTS HERE, and that is the one judgement in this function. A cut or a seam is a
 * boundary by construction: the picture on one side is not the picture on the other. A sting is a
 * punctuation mark and lands INSIDE a shot at least as often as it ends one, so cutting on stings
 * invents boundaries the film does not have. `junction` (the merged list) is therefore the wrong list
 * to read for this, even though it is the more inclusive one.
 *
 * A film with no cuts and no seams is ONE shot, which is a true answer and not a fallback.
 */
export function shotWindows(table, duration) {
  const joints = [...new Set([...(table?.cut || []), ...(table?.seam || [])])]
    .filter((t) => t > 0 && t < duration)
    .sort((a, b) => a - b);
  const edges = [0, ...joints, duration];
  const out = [];
  for (let i = 0; i + 1 < edges.length; i++) out.push({ start: edges[i], end: edges[i + 1] });
  return out;
}

// `matches`, a top-level array binding two named layers onto a junction (`{ "at": "cut@1", "from",
// "to" }`), used to live here: bindMatchesToJunctions retimed both layers onto the joint and handed
// the handover to `becomes`, so the boundary had one copy of its number instead of three (the cut's
// `t`, the outgoing layer's `duration`, the incoming layer's `start`). It measured exactly ONE use
// across the whole library (formats/scene/showcase-cuts.json) against `becomes`'s dozen-plus, and its
// entire value-add over writing `becomes`/`duration`/`start` by hand was that one convenience, on one
// scene. Removed as a two-owner mechanism: `becomes` is the one way to say "this layer becomes that
// one" now. showcase-cuts.json was rewritten to declare `becomes` directly (docs/MISTAKES.md #364-adjacent).
