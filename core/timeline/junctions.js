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

// GAP (seconds) that promotes a beat-layer start into an inferred cut. Lifted verbatim from
// scripts/gates/seam-snap.mjs, which shipped this heuristic first (a gate reasoning about a fact the
// engine itself never derived, MISTAKES #159/#358). Tune here if a slow film over-cuts.
export const CUT_INFER_GAP_S = 1.2;
const CUT_INFER_FLOOR_S = 0.3; // a start this close to 0 is the opening beat, not a cut into it

/**
 * inferCuts(layers, duration) → seconds where this film LIKELY turns, derived rather than declared.
 * `layers` is the flat layer list (a caller's own flattenLayers); a layer whose `track !== 0` marks a
 * beat, and a beat whose start lands more than CUT_INFER_GAP_S after the previous one reads as a cut.
 * `duration` bounds the candidates the way shotWindows bounds joints (0 < t < duration); pass Infinity
 * (the default) to skip that bound, which is what the gate that originated this loop always did.
 */
export function inferCuts(layers, duration = Infinity) {
  const starts = [...new Set((layers || [])
    .filter((l) => l && typeof l === 'object' && l.track !== 0)
    .map((l) => l.start ?? 0))]
    .sort((a, b) => a - b);
  const out = [];
  let last = -9;
  for (const t of starts) {
    if (t - last > CUT_INFER_GAP_S && t > CUT_INFER_FLOOR_S && t > 0 && t < duration) out.push(t);
    last = t;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// CONTENT-AWARE CUT STYLE. inferCuts (above) finds WHERE a film likely turns, purely from the GAP
// between beat starts. It knows nothing about what sits on either side of that gap, and the owner's
// objection is correct: a content-blind cut cannot make a good film. This is the other half.
//
// THE DISTINCTION THAT KEEPS THIS HONEST, so it does not repeat MISTAKES #159 (the engine once picked
// the BACKGROUND, and nobody ever designed one again). RULING OUT a style is a structural fact about
// the two beats: a fade over a layer that is still on screen erases it, a dissolve over two boxes that
// occupy the same pixels reads muddy. Those are true or false, not a matter of taste. CHOOSING among
// what survives that narrowing never reaches past the two names the THEME already picked
// (`look.cuts.default`/`look.cuts.accent`) plus the doctrine's own unconditional fallback, the hard
// cut (`docs/CRAFT/TRANSITIONS.md`: "if a seam can't answer with a real relationship or feeling, it is
// a hard cut"). The engine narrows a set someone else supplied; it never invents a name into it.
const RAPID_JOINT_S = 1.6; // joints closer together than this stay in one cut family (rhythm)
const VELOCITY_FLOOR = 200; // px/s; cutVelocityAdvice's own floor for "this is a move, not drift"
const STRADDLE_EPS = 0.02; // seconds; float-safe "at the same instant" for window/start/end compares

const windowOf = (L) => {
  const s = typeof L?.start === 'number' ? L.start : 0;
  return [s, s + (typeof L?.duration === 'number' ? L.duration : 2)];
};

// a picture (a claim the eye reads) vs text vs decoration (a rect/paint/glow/beam/particles field that
// dresses the frame but carries no content of its own). Decoration is excluded from the overlap and
// medium checks below on purpose: a full-bleed backdrop paint trivially "overlaps" everything it sits
// under, and scoring that as muddy would rule out the theme's default cut on nearly every film.
const PICTURE_TYPES = new Set(['image', 'video', 'svg', 'lottie', 'component', 'html', 'three', 'globe', 'clip', 'doc', 'board']);
const mediumOf = (L) => {
  if (!L || typeof L !== 'object') return null;
  if (!L.type || L.type === 'text' || L.type === 'count') return 'text';
  return PICTURE_TYPES.has(L.type) ? 'picture' : null;
};

// a layer's authored box in canvas px. Top-level layers only, resolved by the time this runs
// (produceBaseline is called AFTER resolveCoords, core/engine/boot.js), so x/y/w are already numbers,
// not "50%"/"center". A text layer with no `h` gets the same size*1.2 estimate resolveCoords itself
// uses for the same reason (core/engine/boot.js's own `hEst`): one guess, read from one place.
function layerBox(L) {
  if (!L || typeof L.x !== 'number' || typeof L.y !== 'number' || typeof L.w !== 'number') return null;
  let h = typeof L.h === 'number' ? L.h : null;
  if (h == null && (L.type === 'text' || L.type === 'count' || !L.type) && typeof L.size === 'number') h = L.size * 1.2;
  return h == null ? null : { x: L.x, y: L.y, w: L.w, h };
}
const boxesOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// SURVIVES: does anything stay on screen ACROSS this joint, so the frame it sits in must not be
// wiped or masked out from under it? Three shapes, all listed by the owner: a window that straddles
// `t` outright (on screen before AND after), an `acrossBeats:true` layer whose window covers `t` (the
// mechanism scene.js gives a continuous object to opt out of beat-wrapping), and a `becomes` handover
// landing AT `t` (the outgoing layer ends here and hands its pose to a named layer that starts here,
// the shared-element morph: two layers, one identity, and a fading wrapper would cut the join in half).
function survivesJoint(layers, t) {
  for (const L of layers) {
    if (!L || typeof L !== 'object') continue;
    const [s, e] = windowOf(L);
    if (s < t - STRADDLE_EPS && t < e - STRADDLE_EPS) return true;
    if (L.acrossBeats === true && s <= t && t < e) return true;
  }
  for (const L of layers) {
    if (typeof L?.becomes !== 'string') continue;
    if (Math.abs(windowOf(L)[1] - t) > STRADDLE_EPS) continue;
    const B = layers.find((x) => x && x.id === L.becomes);
    if (B && Math.abs(windowOf(B)[0] - t) <= STRADDLE_EPS) return true;
  }
  return false;
}

// the OUTGOING/INCOMING shot at a joint: not "whatever ends/starts exactly at t" (a film with dead air
// around its own cut, showcase-lumen.json among them, has nothing at that exact instant), but the last
// layers to leave before t and the first to arrive at/after it, whichever instant that turns out to be.
const outgoingAt = (layers, t) => {
  const ends = layers.map((L) => windowOf(L)[1]).filter((e) => e <= t + STRADDLE_EPS);
  if (!ends.length) return [];
  const last = Math.max(...ends);
  return layers.filter((L) => Math.abs(windowOf(L)[1] - last) <= STRADDLE_EPS);
};
const incomingAt = (layers, t) => {
  const starts = layers.map((L) => windowOf(L)[0]).filter((s) => s >= t - STRADDLE_EPS);
  if (!starts.length) return [];
  const first = Math.min(...starts);
  return layers.filter((L) => Math.abs(windowOf(L)[0] - first) <= STRADDLE_EPS);
};

// does the medium change cleanly (all text -> all picture, or back)? A mixed shot on either side (a
// caption over a photo) is not a "medium change", it is two media sharing a beat, so this only fires
// when the two sets of REAL content (decoration excluded, see mediumOf) don't overlap at all.
function mediumChangedAt(outgoing, incoming) {
  const om = new Set(outgoing.map(mediumOf).filter(Boolean));
  const im = new Set(incoming.map(mediumOf).filter(Boolean));
  if (!om.size || !im.size) return false;
  return [...om].every((m) => !im.has(m));
}

// does the backdrop turn at this joint? `bg` windows with no explicit from/to auto-bind to the film's
// own joints IN ORDER (bindWindowsToJunctions above), so every joint is a window boundary in that case.
// Windows that declare their own from/to are on their own clock; read which one is live either side.
function bgChangesAt(bg, t) {
  if (!Array.isArray(bg) || bg.length < 2) return false;
  if (!bg.some((w) => w && (w.from != null || w.to != null))) return true;
  const at = (tt) => bg.find((w) => w && (w.from ?? w.t ?? 0) <= tt && tt < (w.to ?? Infinity)) || null;
  return at(t - STRADDLE_EPS) !== at(t + STRADDLE_EPS);
}

// is a layer's picture still moving through this joint? Reuses velocityAt's own reader
// (core/timeline/velocity-cut.js layerSpeedAt) rather than a second speed computation: one owner of
// "how fast is this layer going", the same rule that file's own header states about `sequence.js`.
function jointHasVelocity(layers, t, layerSpeedAt) {
  return layers.some((L) => layerSpeedAt(L, t) >= VELOCITY_FLOOR);
}

/**
 * classifyJoint(t, layers, opts) → { compatible, chosen, reason }.
 *
 * `compatible` is the SET this joint can honestly use: some of `'none'` (hard cut, always safe),
 * `'default'`, `'accent'` (the theme's two named cuts, `opts.cuts = { default, accent }`, names only,
 * this file never imports the theme). `chosen` is one member of `compatible`; `reason` is a short
 * human sentence, kept on the injected cut (`_why`) so a gate that later disagrees can quote why the
 * engine picked what it picked, the same contract `authoring.allow._why` already gives an author.
 *
 * `opts`: `bg` (the film's raw `bg` array), `layerSpeedAt` (injected so this file needs no DOM/import
 * cycle with velocity-cut.js's own dependencies; pass `layerSpeedAt` from that module), `prevFamily`
 * and `accentUsed` (rhythm + "spend the accent once", threaded by the caller across joints in order).
 */
export function classifyJoint(t, layers, { cuts = {}, bg = null, layerSpeedAt = () => 0, prevT = null, prevFamily = null, accentUsed = false } = {}) {
  const survivor = survivesJoint(layers, t);
  const outgoing = outgoingAt(layers, t).filter((L) => mediumOf(L));
  const incoming = incomingAt(layers, t).filter((L) => mediumOf(L));
  const oBoxes = outgoing.map(layerBox).filter(Boolean);
  const iBoxes = incoming.map(layerBox).filter(Boolean);
  const overlap = oBoxes.length > 0 && iBoxes.length > 0 && oBoxes.some((a) => iBoxes.some((b) => boxesOverlap(a, b)));
  const mediumChange = mediumChangedAt(outgoing, incoming);
  const tonal = bgChangesAt(bg, t);
  const velocity = jointHasVelocity(layers, t, layerSpeedAt);
  const rhythmFast = prevT != null && (t - prevT) < RAPID_JOINT_S && prevFamily != null;

  // 'default'/'accent' are only in play when the caller resolved a real name for them (a raw cut
  // style, not merely a name the theme wrote down: see core/engine/produce.js's own guard against
  // `look.cuts.accent` naming a seam-only fx). Absent is a rule-out, exactly like an overlap or a
  // survivor: the engine still never INVENTS a name to fill the gap.
  let compatible = ['none', ...(['default', 'accent'].filter((f) => cuts && cuts[f]))];
  const why = [];

  // RULE-OUTS: structural facts, never a look. Each removes a name; none of them ever adds one.
  if (survivor) {
    compatible = ['none'];
    why.push('a layer survives this joint (becomes/acrossBeats/a window straddling it): a soft or match cut is the only honest family, and the invisible cut is the softest one there is');
  } else if (overlap) {
    compatible = compatible.filter((f) => f !== 'default');
    why.push('the outgoing and incoming boxes overlap: a dissolve there reads muddy');
  }
  if (!survivor && rhythmFast) {
    compatible = compatible.filter((f) => f === prevFamily || f === 'none');
    why.push(`this joint follows the last one inside ${RAPID_JOINT_S}s: staying in one family (${prevFamily})`);
  }

  // CHOOSE WITHIN WHAT REMAINS. Still only the theme's two names or the doctrine's hard-cut default.
  let chosen;
  if (compatible.length === 1) {
    chosen = compatible[0];
  } else if (tonal && compatible.includes('accent') && !accentUsed) {
    chosen = 'accent';
    why.push('the backdrop turns here: the one loud moment earns the accent, spent once');
  } else if ((velocity || mediumChange) && compatible.includes('default')) {
    chosen = 'default';
    why.push(velocity ? 'a layer is still moving as this joint arrives: worth marking, not hiding'
      : 'the medium changes across this joint (text/picture): worth marking');
  } else {
    chosen = compatible.includes('none') ? 'none' : compatible[0];
  }
  if (!why.length) why.push('no relationship or feeling crosses this joint (docs/CRAFT/TRANSITIONS.md): the doctrine default, a hard cut');

  return { compatible, chosen, reason: why.join('; ') };
}

/**
 * chooseCutStyles(joints, layers, opts) → [{ t, style, family, compatible, reason }], one row per
 * joint IN ORDER. Threads the two things a single joint cannot know on its own: the previous joint's
 * family (rhythm) and whether the accent has already been spent this film (`look.cuts.accent` is the
 * one loud moment, `AGENTS.md` says do not spread it). `opts.cuts = { default, accent }` are the real
 * transition NAMES those two families resolve to; `style: 'none'` is the hard cut, name-free.
 */
export function chooseCutStyles(joints, layers, opts = {}) {
  const out = [];
  let prevT = null, prevFamily = null, accentUsed = false;
  for (const t of joints) {
    const { compatible, chosen, reason } = classifyJoint(t, layers, { ...opts, prevT, prevFamily, accentUsed });
    const style = chosen === 'none' ? 'none' : (opts.cuts && opts.cuts[chosen]) || 'none';
    out.push({ t, style, family: chosen, compatible, reason });
    prevT = t; prevFamily = chosen;
    if (chosen === 'accent') accentUsed = true;
  }
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
