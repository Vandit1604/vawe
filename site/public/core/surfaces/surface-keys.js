// core/surfaces/surface-keys.js: ONE canvas layer, several looks, hard swaps on chosen instants.
//
// Shared by `shaderKeys` (core/surfaces/shader.js) and `raymarchKeys` (core/surfaces/raymarch.js),
// which are the same mechanism over two registries. It lives here rather than in either surface
// because the reason it exists is a property of CANVAS LAYERS, not of one family: canvas.js `build`
// calls S.create() unconditionally, so a look that shows for two seconds costs a WebGL context for
// the whole runtime, and browsers cap concurrent contexts near 16. Three panels cycling five looks is
// fifteen contexts for what is really three fields. Duplicating the lookup would have been the second
// place a swap's off-by-one could be got wrong.
//
// PURE IN t BY CONSTRUCTION. A lookup over a sorted list, never a transition carrying state, so frame
// n does not depend on which frames a worker drew before it. There is deliberately no crossfade: a
// blend needs both looks drawn at once, which is the context cost coming back through the other door,
// and two fields dissolved together are mud, which is the look this exists to avoid.

/** Which look is showing, at `at` seconds after the layer's start. A pure function of `at`. */
export function keyAt(base, keys) {
  if (!Array.isArray(keys) || !keys.length) return () => base;
  return (at) => {
    let name = base;
    for (const k of keys) { if (at < k.t) break; name = k.shader; }
    return name;
  };
}

/**
 * Refuse a malformed key list by name, rather than stranding it. `prop` is the authoring key this
 * list arrived under, so the message names what the author wrote; `pick` is the registry's picker,
 * which throws on an unknown look and diagnoses a wrong-slot name.
 */
export function validateKeys(keys, prop, pick, example) {
  if (keys == null) return;
  if (!Array.isArray(keys) || !keys.length)
    throw new Error(`${prop} must be a non-empty array of { t, shader }, e.g. ${example}. Got `
      + `${JSON.stringify(keys)}. Before the first key the layer shows its own look.`);
  let prev = -Infinity;
  keys.forEach((k, i) => {
    if (!k || typeof k !== 'object' || Array.isArray(k))
      throw new Error(`${prop}[${i}] must be an object { t, shader }, got ${JSON.stringify(k)}.`);
    if (!Number.isFinite(k.t))
      throw new Error(`${prop}[${i}].t must be a number: SECONDS FROM THE LAYER'S START, the same `
        + `clock \`start\` is on and unaffected by \`speed\`. Got ${JSON.stringify(k.t)}.`);
    // Out of order is a typo, and a lookup would silently strand every key after the offender.
    if (k.t < prev)
      throw new Error(`${prop} must run forwards in time: key ${i} is at ${k.t}, after ${prev}. `
        + `The list is read in order and a key behind its predecessor could never be reached.`);
    prev = k.t;
    pick(k.shader);
  });
}

/**
 * `lt` arrives already multiplied by `speed` (core/layers/canvas.js), because `speed` is a dial on
 * the LOOK's own clock. A key is a moment in the FILM, so it is divided back out: keying a swap at 2s
 * must mean two seconds of screen time whether the look runs fast or slow. At speed 0 the clock is
 * frozen and `lt` is always 0, so the layer holds whatever look 0 selects.
 */
export function atOf(lt, speed) {
  const sp = speed ?? 1;
  return sp ? lt / sp : 0;
}
