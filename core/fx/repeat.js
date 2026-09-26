// core/fx/repeat.js: AE's REPEATER, a modifier that stamps a layer's own content `copies` times, each
// copy offset a little further than the last: `{ x, y, rot, scale, opacity }` per step, accumulating.
//
//   "modifiers": [{ "repeat": { "copies": 12, "offset": { "rot": 30 }, "stagger": 0.05 } }]
//   // twelve spokes at 30deg apart, arriving one after another 50ms apart (a ring built out of one)
//
// ONE SHAPE, BUILT ONCE FROM THE OWNER: this clones the layer's OWN rendered content (whatever
// `build()` for its type already put in `el`, an `svg`'s path, a `rect`'s box, a `group`'s children),
// so a repeater on any layer type needs no per-type support. `copies - 1` deep clones become sibling
// cells of the original, absolutely positioned over the same box, each carrying its own signed index
// `k` (below) so its transform accumulates FROM the original rather than being computed relative to
// its neighbour, which is what keeps the pattern a pure function of the index and not of render order.
//
// `from` PICKS WHICH COPY IS THE ORIGINAL (AE's own knob, same three words): "start" (index 0, offset
// grows forward, k = i), "end" (the LAST copy is unmoved, k = i - (copies-1)), "center" (the MIDDLE
// copy is unmoved and the rest fan out both ways, k = i - (copies-1)/2). Only `k` changes; the same
// per-copy transform formula runs for all three.
//
// `offset.scale` is the PER-STEP multiplier and copies OUTWARD from the origin compound (scale^|k|,
// AE's own "each copy is scaled again"), never scale*k, which would go negative and flip the shape.
//
// `offset.opacity` is AE's Start/End opacity: the ORIGINAL copy (whichever `from` names) sits at 1 and
// opacity lerps across the ABSOLUTE index 0..copies-1 toward the given end value, not toward the
// signed offset, so "the far end of the ring fades" reads the same regardless of `from`.
//
// `stagger` (seconds) is EACH COPY'S OWN ENTRANCE, composing with the layer's own motion rather than
// replacing it: `el`'s own transform (from the `transform` track slot, run before this modifier's slot
// per core/fx/index.js's composition order) is inherited by every cell as their shared parent, so a
// copy's little `translate/rotate/scale` and fade-in stack ON TOP of whatever the layer itself is
// already doing. A `stagger` of 0 (the default) plays every copy from frame one, same as AE.
//
// WHY THIS IS A MODIFIER AND NOT A TRACK: a track runs for every layer whether asked or not and must
// interleave with the shared pipeline at an exact slot (core/tracks/index.js); a repeater is squarely
// opt-in per layer and changes only how the ALREADY-BUILT layer looks, the modifier contract exactly.
const REPEAT_KEYS = ['copies', 'offset', 'stagger', 'from'];
const OFFSET_KEYS = ['x', 'y', 'rot', 'scale', 'opacity'];
const FROM_VALUES = ['start', 'center', 'end'];
const MAX_COPIES = 64;

const name = (L) => `"${L.id || L.type || 'layer'}"`;

function resolveOffset(s, L) {
  const off = s.offset ?? {};
  if (typeof off !== 'object' || Array.isArray(off))
    throw new Error(`repeat on ${name(L)}: \`offset\` is an object of { x, y, rot, scale, opacity }, `
      + `got ${JSON.stringify(s.offset)}.`);
  for (const k of Object.keys(off))
    if (!OFFSET_KEYS.includes(k))
      throw new Error(`repeat on ${name(L)}: unknown offset key "${k}", known: ${OFFSET_KEYS.join(', ')}.`);
  return { x: off.x ?? 0, y: off.y ?? 0, rot: off.rot ?? 0, scale: off.scale ?? 1, opacity: off.opacity ?? null };
}

function resolveStagger(s, L) {
  const stagger = s.stagger ?? 0;
  if (typeof stagger !== 'number' || stagger < 0)
    throw new Error(`repeat on ${name(L)}: \`stagger\` is a per-copy entrance delay in SECONDS, 0 or `
      + `more. Got ${JSON.stringify(s.stagger)}.`);
  return stagger;
}

export function resolve(spec, L) {
  const s = spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`repeat on ${name(L)}: expected an object like { "copies": 8, "offset": { "x": 40 } }, `
      + `got ${JSON.stringify(spec)}. Keys: ${REPEAT_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!REPEAT_KEYS.includes(k))
      throw new Error(`repeat on ${name(L)}: unknown key "${k}", known: ${REPEAT_KEYS.join(', ')}.`);
  if (!Number.isInteger(s.copies) || s.copies < 1 || s.copies > MAX_COPIES)
    throw new Error(`repeat on ${name(L)}: \`copies\` is how many instances the layer becomes, an `
      + `integer from 1 to ${MAX_COPIES}. Got ${JSON.stringify(s.copies)}.`);
  const from = s.from ?? 'start';
  if (!FROM_VALUES.includes(from))
    throw new Error(`repeat on ${name(L)}: \`from\` is which copy stays unmoved, one of `
      + `${FROM_VALUES.join('/')}. Got ${JSON.stringify(s.from)}.`);
  return { copies: s.copies, from, offset: resolveOffset(s, L), stagger: resolveStagger(s, L) };
}

/** repeaterK(i, copies, from) -> the SIGNED step count copy `i` sits at, 0 for the unmoved original. */
export function repeaterK(i, copies, from) {
  if (from === 'end') return i - (copies - 1);
  if (from === 'center') return i - (copies - 1) / 2;
  return i;
}

/** repeaterCell(k, offset) -> the accumulated translate/rotate/scale for a copy at step `k`. Pure. */
export function repeaterCell(k, offset) {
  return {
    x: offset.x * k, y: offset.y * k, rot: offset.rot * k,
    scale: Math.pow(offset.scale, Math.abs(k)),
  };
}

/** repeaterOpacity(i, copies, endOpacity) -> AE's Start/End opacity across the ABSOLUTE index. */
export function repeaterOpacity(i, copies, endOpacity) {
  if (endOpacity == null || copies <= 1) return 1;
  return 1 + (endOpacity - 1) * (i / (copies - 1));
}

/** repeaterEntrance(lt, i, stagger, dur) -> 0..1, this copy's own fade-in, `dur` seconds after its turn. */
export function repeaterEntrance(lt, i, stagger, dur = 0.3) {
  if (!(stagger > 0)) return 1;
  const u = (lt - i * stagger) / dur;
  return u <= 0 ? 0 : u >= 1 ? 1 : u;
}

const CELL_ATTR = 'data-repeat-cell';

export function build(kit, el, L, spec) {
  const cfg = resolve(spec, L);
  const original = document.createElement('div');
  original.setAttribute(CELL_ATTR, '0');
  original.style.position = 'absolute';
  original.style.inset = '0';
  while (el.firstChild) original.appendChild(el.firstChild);
  el.appendChild(original);
  for (let i = 1; i < cfg.copies; i++) {
    const clone = original.cloneNode(true);
    clone.setAttribute(CELL_ATTR, String(i));
    el.appendChild(clone);
  }
}

export function frame(kit, el, L, t, scene, spec) {
  const cfg = resolve(spec, L);
  const lt = t - (L.start ?? 0);
  const cells = el.querySelectorAll(`[${CELL_ATTR}]`);
  for (const cell of cells) {
    const i = Number(cell.getAttribute(CELL_ATTR));
    const k = repeaterK(i, cfg.copies, cfg.from);
    const { x, y, rot, scale } = repeaterCell(k, cfg.offset);
    const opacity = repeaterOpacity(i, cfg.copies, cfg.offset.opacity) * repeaterEntrance(lt, i, cfg.stagger);
    cell.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
    cell.style.opacity = opacity.toFixed(4);
    // A stamp, same reason svg.js/trim.js carry one: a frame whose only change is this cell's own
    // transform must still change the DOM signature so the renderer's static-frame dedup cannot reuse
    // a neighbour mid-spin.
    cell.dataset.rp = `${k.toFixed(2)}_${opacity.toFixed(3)}`;
  }
}
