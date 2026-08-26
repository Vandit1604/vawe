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

/**
 * bindWindowsToJunctions(windows, table) → the same windows with `from`/`to` filled from the film's
 * own joints: window i runs from junction i-1 to junction i, and the last one runs to the end.
 *
 * WHY THIS IS THE DEFAULT AND NOT A FEATURE. `bg` is a required field, so the backdrop is always a
 * decision — and the measured library says the decision is almost never made: 134 of 144 scenes paint
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
export function bindWindowsToJunctions(windows, table) {
  if (!Array.isArray(windows) || windows.length < 2) return windows;
  if (windows.some((b) => b?.from != null || b?.to != null)) return windows;
  const j = table.junction;
  if (j.length < windows.length - 1)
    throw new Error(`bg: ${windows.length} windows declare no times, so each one is bound to the joint `
      + `after it — that needs ${windows.length - 1} junctions and this film has ${j.length}. `
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

/**
 * THE MATCH CUT — the joint owns the handover, and the engine PRODUCES the alignment.
 *
 * `becomes` already carries one layer's final pose onto the next layer's opening pose, which is the
 * geometry half of a match cut and the hard half. What it never had was a JOINT. The handover landed
 * wherever the two layers happened to meet, so the boundary was written twice: once as the cut's `t`,
 * once as the outgoing layer's `duration` and the incoming layer's `start`. Nothing kept the three
 * equal, and validate could only notice afterwards that they had drifted more than half a second
 * apart. That is the same two-copies-of-one-number failure bindWindowsToJunctions removed from `bg`
 * (docs/MISTAKES.md #358) and the snap signature before it (#159).
 *
 *   "matches": [{ "at": "cut@1", "from": "token", "to": "card" }]
 *
 * The cut owns the number. Move the cut and the match moves with it, because there is only one copy.
 * The two layers are retimed onto the joint exactly, so the alignment tolerance is ZERO by
 * construction: there is nothing to measure and nothing to drift. The film never asserts a match, it
 * is handed one.
 *
 * `at` takes the junction grammar every other surface here takes, so a match can hang on a seam or a
 * sting as readily as a cut, and it takes a plain number for the rare case with no joint to name.
 *
 * SOUND is the joint's, not the match's. A match cut is not a mechanism of its own — it is two layers
 * agreeing across a boundary the film already has — so it is voiced by whatever CUT_CUE/SEAM_CUE gives
 * the junction it hangs on. A match at a `none` cut is silent on purpose: that is the hard match cut,
 * where the only event is the form changing.
 */

// OURS, and derived from this library rather than borrowed. The handover has to finish well inside the
// incoming shot or the eye reads a move rather than a match. Measured over the 230 shots in
// formats/scene/ (every interval between declared cut/seam joints): the shortest shot is 0.85s, p10 is
// 1.90s, p50 is 3.20s. Measured over the 116 declared cut spans: p50 0.40s, p90 0.46s, max 0.60s. So a
// handover at the default 0.42s costs 22% of a p10 shot. A third leaves that with double the headroom
// and still refuses the case that actually breaks: a handover eating most of the shot it arrives in.
// No published number exists for this. The 2-frame match tolerance quoted around the web is one
// consumer blog with no second source, and it is a tolerance for ASSERTING a match, which this design
// does not need. Re-derive this against your own library before quoting it.
export const MATCH_HANDOVER_SHARE = 0.33;

export function bindMatchesToJunctions(data, table) {
  const matches = Array.isArray(data?.matches) ? data.matches : [];
  if (!matches.length) return data;
  const layers = Array.isArray(data.layers) ? data.layers : [];
  const byId = {};
  for (const L of layers) if (L && L.id) byId[L.id] = L;
  const known = () => Object.keys(byId).join(', ') || '(no layer in this scene declares an id)';
  const cutAt = (t) => (data.cuts || []).find((c) => c && Math.abs(+c.t - t) < 1e-6);

  matches.forEach((M, i) => {
    const where = `matches[${i}]`;
    if (!M || typeof M !== 'object') throw new Error(`${where}: must be {at, from, to}`);
    const t = isJunctionRef(M.at) ? resolveJunction(M.at, table, `${where}.at`) : +M.at;
    if (!Number.isFinite(t)) throw new Error(`${where}.at: must be a junction reference or a time in `
      + `seconds, got ${JSON.stringify(M.at)}. This film has: ${describeJunctions(table)}`);
    const A = byId[M.from], B = byId[M.to];
    if (!A) throw new Error(`${where}: from "${M.from}" is not the id of any layer. Known ids: ${known()}`);
    if (!B) throw new Error(`${where}: to "${M.to}" is not the id of any layer. Known ids: ${known()}`);
    if (A === B) throw new Error(`${where}: "${M.from}" matches itself, so nothing changes at the joint`);

    // Each beat gets its own wrapper under sceneUnits, and a cut that MOVES then carries the outgoing
    // wrapper away from the incoming one. The two forms would be aligned inside wrappers travelling in
    // opposite directions, which is exactly the match pulled apart. `none` leaves both wrappers at
    // identity, so it is the one style the combination survives.
    // MOST FILMS NEVER WRITE THE FLAG. `produced: true` is the house baseline and core/produce.js sets
    // sceneUnits on any scene that has cuts and did not decide for itself, so this fires on a film whose
    // JSON says nothing about units. The message therefore names the field to write, not the one to delete.
    const cut = cutAt(t);
    if (data.sceneUnits === true && cut && cut.style && cut.style !== 'none')
      throw new Error(`${where}: this film sets "sceneUnits": true and the cut at ${t}s presents as `
        + `"${cut.style}", which travels each beat away as a whole unit — "${M.from}" and "${M.to}" would `
        + `be carried apart at the very frame they are meant to coincide. Write "sceneUnits": false at the `
        + `top level (a whole-frame cut transforms both forms together, so the match survives it), or set `
        + `that cut's style to "none" — a match cut is a HARD cut, the form changing IS the transition. `
        + `If this scene never declared sceneUnits, "produced": true injected it (core/produce.js).`);

    const aStart = Number.isFinite(+A.start) ? +A.start : 0;
    if (t <= aStart) throw new Error(`${where}: the joint is at ${t}s and "${M.from}" starts at ${aStart}s, `
      + `so the outgoing form is never on screen before the match. Move the joint, or start "${M.from}" earlier.`);

    const dur = Math.max(0.05, Number.isFinite(+M.dur) ? +M.dur : (Number.isFinite(+A.becomesDur) ? +A.becomesDur : 0.42));
    const next = table.junction.find((j) => j > t + 1e-6);
    const shot = (next != null ? next : (+data.duration || t + dur)) - t;
    if (shot > 0 && dur > shot * MATCH_HANDOVER_SHARE)
      throw new Error(`${where}: the handover takes ${dur}s and the shot it lands in is only ${shot.toFixed(2)}s, `
        + `so "${M.to}" spends ${Math.round((dur / shot) * 100)}% of its own shot still arriving — the eye reads `
        + `a move, not a match. Keep it under ${(shot * MATCH_HANDOVER_SHARE).toFixed(2)}s (a third of the shot), `
        + `or give "${M.to}" more room before the next joint.`);

    if (typeof A.becomes === 'string' && A.becomes !== M.to)
      throw new Error(`${where}: "${M.from}" already declares becomes "${A.becomes}". One form continues as `
        + `one other form; say it once, here or there.`);

    // THE RAMPS ARE PART OF WHAT A MATCH PRODUCES, and leaving them to the author is how the device
    // ships broken. Every layer carries an entrance and an exit ramp by default, so the outgoing form
    // fades out over the ~0.3s BEFORE the joint and the incoming one fades up over the ~0.3s after it.
    // Both ramps sit exactly where the two forms are meant to coincide, so the frame at the cut holds
    // neither of them and the eye reads a dissolve between two absences. The first render of this
    // feature did precisely that: the dot was already gone four frames before the card arrived.
    // A match cut has no ramp by definition. The outgoing form is whole on the cut frame and is
    // REPLACED; the incoming form is not arriving, it is already there wearing the other one's pose.
    const clash = [];
    if (A.out != null && A.out !== 'none') clash.push(`"${M.from}" declares out:"${A.out}"`);
    if (A.exitDur != null && +A.exitDur !== 0) clash.push(`"${M.from}" declares exitDur:${A.exitDur}`);
    if (B.anim != null && B.anim !== 'none') clash.push(`"${M.to}" declares anim:"${B.anim}"`);
    if (B.enterDur != null && +B.enterDur !== 0) clash.push(`"${M.to}" declares enterDur:${B.enterDur}`);
    if (clash.length) throw new Error(`${where}: a match cut has no entrance and no exit — the outgoing `
      + `form is whole on the cut frame and the incoming one opens already wearing its pose. `
      + `${clash.join(' and ')}, which would fade the two forms out and back in across the very joint `
      + `they coincide on. Drop ${clash.length === 1 ? 'it' : 'them'}, or drop the match and cut normally.`);
    A.out = 'none'; A.exitDur = 0;
    B.anim = 'none'; B.enterDur = 0;

    // The joint is now the only copy of the number: the outgoing form ends on it and the incoming form
    // opens on it, so the handover can no longer drift away from the cut that punctuates it.
    A.becomes = M.to;
    A.becomesDur = dur;
    if (M.ease != null) A.becomesEase = M.ease;
    A.duration = +(t - aStart).toFixed(3);
    B.start = +t.toFixed(3);
  });
  return data;
}
