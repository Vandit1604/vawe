// core/timeline/relative-time.js: resolveRelativeTimes(data), the ONE resolver for an authored ABSOLUTE
// time field written as a relative reference ("otherId+0.5", "otherId.end-0.2") instead of a plain
// number. Was films/scene/scene.js's own resolveRelativeStarts, page-only: core/engine/expand.js
// `expandScene` (the loader every Node gate and script calls) left the string untouched, so a gate
// reading an expanded scene saw `"a.end + 0.5"` where it expected a number. Moved here so BOTH
// `expandScene` (before `resolveTempo`, so the resolved number scales like any other authored time) and
// the render page (`films/scene/scene.js`, for a scene Go did not pre-expand: `internal/render/expand.go`
// only shells out to Node when the file carries block/beat/comp/recipes/voice sugar, so a plain scene
// using nothing but a relative start never reaches expandScene at all) read the SAME grammar and the
// SAME errors. Calling this twice (Go pre-expanded, then the page calls it again) is a no-op: every
// field it touches is already a number by then.
//
// GRAMMAR (unchanged): a target names another layer's `id`; `.end` needs that layer to declare a
// `duration`; an offset ("+0.5"/"-0.2") is optional. Bare id = that layer's start.
//
// FIELDS, taken from core/engine/tempo.js's own time-field table, ABSOLUTE ones only (never a
// duration): `layers[].start` (multi-pass: a target may itself be relative), `transitions[].at`,
// `cameraMove[].start` (or the single-spec object form), and `audio.cues[].t`. `cameraMove.stations[]`
// carries no absolute time key in that table (only `dur`/`dwell`, both durations), so it is not a
// target here.
//
// `audio.cues[].t` used to be the one field in this table an author could only pin by copying a number:
// "when the install line lands" had no name, only whatever second the author computed by hand, and a
// layer moving an inch left it stale with nothing to say so (a cue fired 1.1s early on `vawe-flow-2`
// because the value copied in was a part's `delay`, relative to its parent, not the absolute time that
// delay resolves to). Accepting the SAME reference grammar every other absolute field already accepts
// lets a cue read "installLine.end+0.1" instead, so moving the layer moves the cue with it.
//
// BEAT TARGETS ("beat:<id>.start"/"beat:<id>.end", plus offset), a SEPARATE grammar from the layer-id
// one above, only live where `data.beats` (`{id,start,duration}[]`, item 3) is present. The `beat:`
// prefix is the one thing that lets this share a string slot with the bg window's junction grammar
// (`"cut@1"`, core/timeline/junctions.js `JUNCTION_REF = /^([a-z]+)@(\d+)$/`) without ambiguity: a
// junction ref never carries a colon and a beat ref never carries an `@`, so the two cannot collide
// (proved by a test: "beat:x.start" fails JUNCTION_REF, "cut@1" fails BEAT_RX). Every field the bare
// layer-id grammar already reaches also accepts a `beat:` target (layer start, transitions[].at,
// cameraMove[].start), PLUS the bg window `from`/`to` on `data.bg` and any layer's own `L.bg`, which
// the bare grammar was deliberately refused (see the note it used to carry, now folded into this one:
// a bg window's string is otherwise left entirely to its existing junction owner). A beat's own `start`
// may itself be relative to another beat, resolved in its own multi-pass below, before anything else
// can reference a beat.
//
// TWO OWNERS OF BEAT TIMING is the risk this whole feature carries (the storyboard sidecar also has
// beat spans): `harness/author/assemble.mjs` is the one place that WRITES `data.beats` (from the
// storyboard it already parses), and `quality/gates/plan-vs-render.mjs` reports, never blocks, any beat
// whose scene start/duration disagrees with the storyboard. This resolver only ever READS `data.beats`.
//
// captions[].start is in tempo.js's table too, but no caption ever carries that field (the real shape
// is `{t0,t1}`, schema-checked); it is a dead key in that table, not a live one, so nothing to resolve.

function eachLayerDeep(ls, fn) {
  for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    fn(L);
    eachLayerDeep(L.children, fn);
    eachLayerDeep(L.layers, fn);
  }
}

const RX = /^([\w-]+?)(\.end)?\s*([+-]\s*[\d.]+)?$/;
// Explicit `.start`/`.end` only: a beat has no "bare id = start" shorthand (that shorthand belongs to
// the layer-id grammar above, and the two must stay visually distinct in a scene that uses both).
const BEAT_RX = /^beat:([\w-]+)\.(start|end)\s*([+-]\s*[\d.]+)?$/;

// resolveRef(str, byId, label) -> number. `label` names the field in the error, e.g. `transition "at"`.
// Used once every layer start (the only field a reference can itself target) is already a number.
function resolveRef(str, byId, label) {
  const m = RX.exec(str.trim());
  if (!m || !byId[m[1]]) throw new Error(`${label} "${str}": unknown reference "${m ? m[1] : str}". `
    + `A relative time names another layer's \`id\`. Known ids: ${Object.keys(byId).join(', ') || '(none: no layer in this scene declares an id)'}.`);
  const T = byId[m[1]];
  if (m[2] && T.duration == null) throw new Error(`${label} "${str}": "${m[1]}" declares no \`duration\`, `
    + `so it has no end to hang this off. Give "${m[1]}" a duration, or hang this off its START instead `
    + `("${m[1]}${m[3] || ''}").`);
  return roundTime((T.start ?? 0) + (m[2] ? T.duration : 0) + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0));
}

// A resolved time is authored seconds plus an authored offset, so float noise (26.400000000000002) is
// never meaningful: round to a micro-second, far below any frame, so published scenes read as written.
const roundTime = (x) => Math.round(x * 1e6) / 1e6;

const isBeatTarget = (v) => typeof v === 'string' && v.trim().startsWith('beat:');

// resolveBeatRef(str, label) -> number, or null if the beat it names is not resolved YET (its own
// `start` is still a string, mid multi-pass below). Throws on an unknown beat id, the same shape
// resolveRef throws for an unknown layer id.
function resolveBeatRef(str, label, beatById, beatResolutions) {
  const m = BEAT_RX.exec(str.trim());
  if (!m || !beatById[m[1]]) throw new Error(`${label} "${str}": unknown beat reference "${m ? m[1] : str}". `
    + `A beat-relative time names another beat's \`id\` as "beat:<id>.start" or "beat:<id>.end". `
    + `Known beats: ${Object.keys(beatById).join(', ') || '(none: this scene declares no beats[])'}.`);
  const B = beatById[m[1]];
  if (typeof B.start !== 'string') {
    const v = roundTime((B.start ?? 0) + (m[2] === 'end' ? (B.duration ?? 0) : 0)
      + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0));
    beatResolutions.push(`${label} "${str}" -> ${v}s`);
    return v;
  }
  return null; // B's own start is still unresolved; caller retries next pass
}

// PASS 0: beats[] own starts. A beat's start may itself be relative to another beat
// ("beat:b1.end + 0.2"); multi-pass for the same reason layer starts are, and RISK 3 (circular
// references) reuses the exact same "N passes then give up" mechanism, one shared shape for both
// beats and layers rather than two.
function resolveBeatStarts(data, beatById, beatResolutions) {
  if (!(Array.isArray(data.beats) && data.beats.length)) return;
  for (let pass = 0; pass < 8; pass++) {
    let pending = 0;
    for (const b of data.beats) {
      if (typeof b.start !== 'string') continue;
      if (!isBeatTarget(b.start)) throw new Error(`beat "${b.id}" start "${b.start}": a beat's start `
        + `must be a number or "beat:<id>.start"/"beat:<id>.end" (plus an optional offset).`);
      const v = resolveBeatRef(b.start, `beat "${b.id}" start`, beatById, beatResolutions);
      if (v == null) { pending++; continue; }
      b.start = v;
    }
    if (!pending) break;
    if (pass === 7) throw new Error('relative beat starts: circular reference');
  }
  for (const b of data.beats) if (typeof b.start === 'string')
    throw new Error(`beat "${b.id}" start "${b.start}" did not resolve.`);
}

// PASS 1: layer starts. Multi-pass because a target may itself be a relative start; an
// unresolvable/circular reference fails loud, naming the layer. A `beat:` target resolves in one
// step (every beats[] entry is already a plain number by now, from PASS 0 above).
function resolveLayerStarts(all, byId, beatById, beatResolutions, nameOf) {
  for (let pass = 0; pass < 8; pass++) {
    let pending = 0;
    for (const L of all) {
      if (typeof L.start !== 'string') continue;
      if (isBeatTarget(L.start)) { L.start = resolveBeatRef(L.start, `layer start "${L.start}" on ${nameOf(L)}`, beatById, beatResolutions); continue; }
      const m = RX.exec(L.start.trim());
      if (!m || !byId[m[1]]) throw new Error(`layer start "${L.start}" on ${nameOf(L)}: unknown reference `
        + `"${m ? m[1] : L.start}". A relative start names another layer's \`id\`. Known ids: ${Object.keys(byId).join(', ') || '(none: no layer in this scene declares an id)'}.`);
      const T = byId[m[1]];
      if (typeof T.start === 'string') { pending++; continue; } // resolve target first
      if (m[2] && T.duration == null) throw new Error(`layer start "${L.start}" on ${nameOf(L)}: `
        + `"${m[1]}" declares no \`duration\`, so it has no end to hang this off. Give "${m[1]}" a duration, `
        + `or hang this off its START instead ("${m[1]}${m[3] || ''}").`);
      L.start = roundTime((T.start ?? 0) + (m[2] ? T.duration : 0) + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0));
    }
    if (!pending) break;
    if (pass === 7) throw new Error('relative starts: circular reference');
  }
  // NOTHING LEAVES HERE AS A STRING. Downstream is `String(L.start ?? 0)` into the dataset and a
  // `parseFloat` back out, and that pair turns an unresolved reference into a layer at t=0 rather than
  // into an error.
  for (const L of all) if (typeof L.start === 'string')
    throw new Error(`layer start "${L.start}" on ${nameOf(L)} did not resolve. It would render at t=0 with nothing to say so.`);
}

// PASS 2: every other absolute field. None of these can themselves be a relative-time TARGET, so one
// pass, now that every layer start and every beat is a number.
function resolveOtherFields(data, byId, beatById, beatResolutions) {
  const ref = (str, label) => (isBeatTarget(str) ? resolveBeatRef(str, label, beatById, beatResolutions) : resolveRef(str, byId, label));
  if (Array.isArray(data.transitions)) for (const T of data.transitions)
    if (typeof T.at === 'string') T.at = ref(T.at, 'transition "at"');
  if (data.cameraMove) {
    const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
    for (const s of specs) if (s && typeof s.start === 'string') s.start = ref(s.start, 'cameraMove "start"');
  }
  if (data.audio && Array.isArray(data.audio.cues)) for (const c of data.audio.cues)
    if (c && typeof c.t === 'string') c.t = ref(c.t, 'audio cue "t"');
}

// BG WINDOWS: `beat:` ONLY. A bare id/`cut@1` string stays untouched, still owned entirely by
// core/timeline/junctions.js `bindWindowsToJunctions`; only the `beat:`-prefixed form is this
// resolver's to read, since that prefix is what makes it unambiguous.
function resolveBgWindows(data, all, beatById, beatResolutions, nameOf) {
  const resolveOne = (w, label) => {
    if (!w || typeof w !== 'object') return;
    if (isBeatTarget(w.from)) w.from = resolveBeatRef(w.from, `${label} "from"`, beatById, beatResolutions);
    if (isBeatTarget(w.to)) w.to = resolveBeatRef(w.to, `${label} "to"`, beatById, beatResolutions);
  };
  if (Array.isArray(data.bg)) for (const w of data.bg) resolveOne(w, 'bg window');
  for (const L of all) if (Array.isArray(L.bg)) for (const w of L.bg) resolveOne(w, `layer ${nameOf(L)} bg window`);
}

/**
 * resolveRelativeTimes(data) -> data, mutated in place and returned. Numbers-only input passes through
 * byte-identical (nothing here is a string, every branch below is a no-op). A film with no `data.beats`
 * never sees the `beat:` grammar at all: `isBeatTarget` is false for every string, so it behaves exactly
 * as it did before item 3.
 */
export function resolveRelativeTimes(data) {
  if (!data || typeof data !== 'object') return data;
  const byId = {};
  const all = [];
  eachLayerDeep(data.layers, (L) => { all.push(L); if (L.id) byId[L.id] = L; });
  const nameOf = (L) => `${L.id ? `"${L.id}"` : `a ${L.type || 'text'} layer`}`;

  const beatById = {};
  if (Array.isArray(data.beats)) for (const b of data.beats) if (b && b.id) beatById[b.id] = b;
  // RISK 2, SURPRISE SHIFTS: only a string that NAMES a beat moves when the beat moves; a plain number
  // never does. This list is what makes a shift visible rather than silent: every `beat:` string this
  // run actually resolved, printed once at the end.
  const beatResolutions = [];

  resolveBeatStarts(data, beatById, beatResolutions);
  resolveLayerStarts(all, byId, beatById, beatResolutions, nameOf);
  resolveOtherFields(data, byId, beatById, beatResolutions);
  resolveBgWindows(data, all, beatById, beatResolutions, nameOf);

  if (beatResolutions.length) console.log(`  beat-relative: ${beatResolutions.join(', ')}`);
  return data;
}
