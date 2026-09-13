// core/timeline/relative-time.js: resolveRelativeTimes(data), the ONE resolver for an authored ABSOLUTE
// time field written as a relative reference ("otherId+0.5", "otherId.end-0.2") instead of a plain
// number. Was formats/scene/scene.js's own resolveRelativeStarts, page-only: core/engine/expand.js
// `expandScene` (the loader every Node gate and script calls) left the string untouched, so a gate
// reading an expanded scene saw `"a.end + 0.5"` where it expected a number. Moved here so BOTH
// `expandScene` (before `resolveTempo`, so the resolved number scales like any other authored time) and
// the render page (`formats/scene/scene.js`, for a scene Go did not pre-expand: `internal/render/expand.go`
// only shells out to Node when the file carries block/beat/comp/recipes/voice sugar, so a plain scene
// using nothing but a relative start never reaches expandScene at all) read the SAME grammar and the
// SAME errors. Calling this twice (Go pre-expanded, then the page calls it again) is a no-op: every
// field it touches is already a number by then.
//
// GRAMMAR (unchanged): a target names another layer's `id`; `.end` needs that layer to declare a
// `duration`; an offset ("+0.5"/"-0.2") is optional. Bare id = that layer's start.
//
// FIELDS, taken from core/engine/tempo.js's own time-field table, ABSOLUTE ones only (never a
// duration): `layers[].start` (multi-pass: a target may itself be relative), `transitions[].at`, and
// `cameraMove[].start` (or the single-spec object form). `cameraMove.stations[]` carries no absolute
// time key in that table (only `dur`/`dwell`, both durations), so it is not a target here.
//
// data.bg / layers[].bg window `from`/`to` are deliberately NOT resolved here even though tempo.js
// scales them as absolute times: that string slot already has its OWN grammar, a junction reference
// like `"cut@1"` (core/timeline/junctions.js `bindWindowsToJunctions`), resolved separately at its own
// call sites. Layering a second string grammar onto the same field would make `"cut@1"` ambiguous with
// a (nonexistent) layer named `cut`; this resolver refuses instead of guessing, so a bg window's string
// is simply left to its existing owner.
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
  return (T.start ?? 0) + (m[2] ? T.duration : 0) + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0);
}

/**
 * resolveRelativeTimes(data) -> data, mutated in place and returned. Numbers-only input passes through
 * byte-identical (nothing here is a string, every branch below is a no-op).
 */
export function resolveRelativeTimes(data) {
  if (!data || typeof data !== 'object') return data;
  const byId = {};
  const all = [];
  eachLayerDeep(data.layers, (L) => { all.push(L); if (L.id) byId[L.id] = L; });
  const nameOf = (L) => `${L.id ? `"${L.id}"` : `a ${L.type || 'text'} layer`}`;

  // PASS 1: layer starts. Multi-pass because a target may itself be a relative start; an
  // unresolvable/circular reference fails loud, naming the layer.
  for (let pass = 0; pass < 8; pass++) {
    let pending = 0;
    for (const L of all) {
      if (typeof L.start !== 'string') continue;
      const m = RX.exec(L.start.trim());
      if (!m || !byId[m[1]]) throw new Error(`layer start "${L.start}" on ${nameOf(L)}: unknown reference `
        + `"${m ? m[1] : L.start}". A relative start names another layer's \`id\`. Known ids: ${Object.keys(byId).join(', ') || '(none: no layer in this scene declares an id)'}.`);
      const T = byId[m[1]];
      if (typeof T.start === 'string') { pending++; continue; } // resolve target first
      if (m[2] && T.duration == null) throw new Error(`layer start "${L.start}" on ${nameOf(L)}: `
        + `"${m[1]}" declares no \`duration\`, so it has no end to hang this off. Give "${m[1]}" a duration, `
        + `or hang this off its START instead ("${m[1]}${m[3] || ''}").`);
      L.start = (T.start ?? 0) + (m[2] ? T.duration : 0) + (m[3] ? parseFloat(m[3].replace(/\s+/g, '')) : 0);
    }
    if (!pending) break;
    if (pass === 7) throw new Error('relative starts: circular reference');
  }
  // NOTHING LEAVES HERE AS A STRING. Downstream is `String(L.start ?? 0)` into the dataset and a
  // `parseFloat` back out, and that pair turns an unresolved reference into a layer at t=0 rather than
  // into an error. The pass either resolved it or says which layer it could not.
  for (const L of all) if (typeof L.start === 'string')
    throw new Error(`layer start "${L.start}" on ${nameOf(L)} did not resolve. It would render at t=0 with nothing to say so.`);

  // PASS 2: every other absolute field. None of these can themselves be a relative-time TARGET (nothing
  // names a transition or a camera leg by reference), so one pass, now that every layer start is a number.
  if (Array.isArray(data.transitions)) for (const T of data.transitions)
    if (typeof T.at === 'string') T.at = resolveRef(T.at, byId, 'transition "at"');
  if (data.cameraMove) {
    const specs = Array.isArray(data.cameraMove) ? data.cameraMove : [data.cameraMove];
    for (const s of specs) if (s && typeof s.start === 'string') s.start = resolveRef(s.start, byId, 'cameraMove "start"');
  }
  return data;
}
