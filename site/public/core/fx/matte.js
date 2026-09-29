// core/fx/matte.js: LUMA MATTE. Another layer's brightness becomes this layer's alpha.
//
// The twentieth recipe in engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md, and the general case of the whole wipe
// family: a wipe is a hard edge travelling across a layer, and this is any shape at all, moving however
// the source layer moves. A gradient sweeping across a headline IS a wipe. A logo over a paint field
// puts the field inside the logo. A radial fade over a photograph is a vignette that can travel.
//
//   "modifiers": [{ "matte": "sweep" }]
//   "modifiers": [{ "matte": { "from": "sweep", "mode": "alpha" } }]
//   "modifiers": [{ "matte": { "layer": "sweep", "mode": "luma-inverted" } }]
//
// THE SOURCE LAYER IS FOLLOWED, and that is where the value is. The mask is placed and sized from the
// source's LIVE BOX (scene.boxOf, resolved for the whole frame before any layer's frame() runs), so a
// source with a motion track drags its own shape across this layer. The matte moves; the layer does not.
//
// THE MATTE LAYER ITSELF STAYS HIDDEN THE ORDINARY WAY: `opacity: 0` on the source layer. Nothing here
// reads the source's rendered pixels (a browser cannot, see below), only its JSON `bg`/`src` and its
// live box, so an invisible source mattes exactly like a visible one. No second "hidden" flag: `opacity`
// already means "occupies its box, paints nothing", which is this job.
//
// WHAT COUNTS AS A SOURCE, and why this is narrower than After Effects. A CSS mask takes a CSS <image>,
// and a browser cannot use one live element's pixels as another's alpha: `element()` is Firefox-only,
// and rasterising a canvas to a data URI every frame would cost more than the film. So the source is
// resolved to the image it PAINTS: an `image` or `svg` layer's own file, or the gradient a `rect` /
// `html` layer carries as its `bg`. Anything else is refused BY NAME rather than rendering a layer that
// looks untouched, which is the failure class this repo logs most (#210 #213 #215 #217).
//
// PURE: every number comes from the frozen scene view, and the source is read from the JSON, so the
// mask at t does not depend on which layer the loop reached first.
//
// LUMA IS THE DEFAULT because that is what "luma matte" means: white shows, black hides, grey is
// partial (CSS calls this mode `luminance`; `luma` is accepted as the same word After Effects uses).
// `mode: "alpha"` is the other half of the After Effects pair, for a source whose own transparency is
// the shape. Either takes an `-inverted` suffix (AE's "Invert" checkbox on a track matte): black shows,
// white hides. CSS has no inverted mask keyword, so an inverted mode adds a second, fully-opaque mask
// layer and combines the two with `mask-composite: exclude` (XOR): a single mask XORed with "everywhere"
// is exactly that mask's complement. One property, no canvas, no second code path per mode.

export const MATTE_KEYS = ['from', 'layer', 'mode'];
const BASE_MODES = { luminance: 'luminance', luma: 'luminance', alpha: 'alpha' };

const name = (L) => `"${L.id || L.type || 'layer'}"`;

export function resolve(spec, L) {
  const s = typeof spec === 'string' ? { from: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`matte on ${name(L)}: expected a layer id or an object like { "layer": "sweep", `
      + `"mode": "luma" }, got ${JSON.stringify(spec)}. Keys: ${MATTE_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!MATTE_KEYS.includes(k))
      throw new Error(`matte on ${name(L)}: unknown key "${k}", known: ${MATTE_KEYS.join(', ')}.`);
  if (s.from != null && s.layer != null)
    throw new Error(`matte on ${name(L)}: \`from\` and \`layer\` name the same thing, the source `
      + `layer's id. Give one, not two.`);
  const from = s.from ?? s.layer;
  if (typeof from !== 'string' || !from)
    throw new Error(`matte on ${name(L)}: \`layer\` names the LAYER whose paint is this layer's alpha, `
      + `by id. Got ${JSON.stringify(from)}.`);
  const modeSpec = s.mode ?? 'luma';
  const invert = typeof modeSpec === 'string' && modeSpec.endsWith('-inverted');
  const base = invert ? modeSpec.slice(0, -'-inverted'.length) : modeSpec;
  const mode = BASE_MODES[base];
  if (!mode)
    throw new Error(`matte on ${name(L)}: unknown mode "${modeSpec}", known: luma, luma-inverted, `
      + `alpha, alpha-inverted (also \`luminance\`/\`luminance-inverted\`, the CSS spelling of luma). `
      + `\`luma\` is the luma matte (white shows, black hides); \`alpha\` uses the source's own `
      + `transparency as the shape; \`-inverted\` flips which side shows, After Effects' Invert box.`);
  return { from, mode, invert };
}

// The source layer's paint, as a CSS <image>. Two shapes, because a browser has exactly two: a file it
// can fetch, and a gradient it can generate.
function maskImage(src, L) {
  if (typeof src.src === 'string' && src.src) return `url("${src.src}")`;
  if (typeof src.bg === 'string' && /(gradient|url)\(/.test(src.bg)) return src.bg;
  throw new Error(`matte on ${name(L)}: layer "${src.id}" (${src.type}) paints nothing a mask can use. `
    + `A CSS mask takes an IMAGE, and a browser cannot read one live element's pixels as another's `
    + `alpha, so the matte must be an \`image\` or \`svg\` layer's own file, or a \`rect\` / \`html\` `
    + `layer whose \`bg\` is a gradient. A paint, shader or three layer draws into a <canvas> and `
    + `cannot be the source; put its look on a rect with a gradient \`bg\` instead, or reach for `
    + `\`clip\` / \`occlude\`, which cut by geometry rather than by brightness.\n`
    + `A layer TYPE can also opt in by exporting \`maskPaint(L, lt, geom)\` (core/layers/beam.js is the `
    + `worked example), which is how a per-frame paint becomes a matte source without this file `
    + `learning its name.`);
}

export function build(kit, el, L, spec) {
  resolve(spec, L);
  if (!L.id)
    throw new Error(`matte on ${name(L)}: this layer needs an \`id\`. The mask is placed from its own `
      + `box through scene.boxOf, which only knows layers an author named.`);
  // Two owners of one property, refused by name rather than resolved by whichever ran last. Both of
  // these write `mask-image` on the layer element (core/layers/util.js).
  for (const other of ['mask', 'progressiveBlur'])
    if (L[other] != null)
      throw new Error(`matte on ${name(L)}: this layer also sets \`${other}\`, which writes the same `
        + `\`mask-image\` property, so one of the two would silently do nothing. Keep one.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { from, mode, invert } = resolve(spec, L);
  const src = scene.specOf(from);
  if (!src)
    throw new Error(`matte on ${name(L)}: no layer with id "${from}", known ids: ${scene.ids.join(', ')}.`);
  const b = scene.boxOf(from), me = scene.boxOf(L.id);
  if (!b)
    throw new Error(`matte on ${name(L)}: no box for "${from}". A child of a group whose motion track `
      + `keys w/h has no box either, because the group reflows and the measured offset is stale.`);
  if (!me) throw new Error(`matte on ${name(L)}: layer "${L.id}" has no box of its own to place the mask in.`);
  // The source's SCALED extents, and its origin relative to OURS, because a mask is positioned against
  // this element's own padding box. boxOf reports w/h unscaled with `scale` beside them (folding it in
  // would move the top-left corner with nothing on screen moving), so the scale is applied here.
  const w = b.w * b.scale, h = b.h * b.scale;
  const x = (b.cx - w / 2) - (me.cx - me.w / 2), y = (b.cy - h / 2) - (me.cy - me.h / 2);
  // ASK THE TYPE FIRST. A layer that generates its paint per frame (a `beam`'s travelling sheen) knows
  // both its image AND where that image sits, and no box arithmetic here could guess the second: a
  // sheen is 2.6x its own box and slides across it. So the type is handed the geometry this function
  // already computed and returns finished CSS, or null to mean "read me from the JSON as before".
  // The source's own local time, because a live paint travels on its own clock, not the scene's.
  // `kit &&` is not defensive padding: lib-test drives this function with a null kit, because the
  // geometry above is pure arithmetic and testing it needs no renderer. A type that wants a live paint
  // needs the registry, and a caller with no kit has no registry to offer, so it reads the JSON.
  const live = kit && typeof kit.maskPaintOf === 'function'
    ? kit.maskPaintOf(src, t - (src.start ?? 0), { w, h, x, y }) : null;
  const img = live ? live.image : maskImage(src, L);
  const size = live ? live.size : `${w.toFixed(2)}px ${h.toFixed(2)}px`;
  const position = live ? live.position : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  // INVERTED: a second mask layer, fully opaque everywhere on this element's own box, XORed with the
  // first. A single mask XORed against "opaque everywhere" is that mask's exact complement, so this is
  // the real CSS primitive for "invert a mask", not an approximation of one.
  const fullMask = 'linear-gradient(#fff, #fff)';
  // Authoritative writes, every frame, every property: a mask left from another frame is exactly the
  // render-order dependence renderFrame(n) promises it is not (engine-doctrine/MISTAKES.md #41).
  for (const p of ['maskImage', 'webkitMaskImage']) el.style[p] = invert ? `${img}, ${fullMask}` : img;
  for (const p of ['maskSize', 'webkitMaskSize']) el.style[p] = invert ? `${size}, 100% 100%` : size;
  for (const p of ['maskPosition', 'webkitMaskPosition']) el.style[p] = invert ? `${position}, 0 0` : position;
  for (const p of ['maskRepeat', 'webkitMaskRepeat']) el.style[p] = invert ? 'no-repeat, no-repeat' : 'no-repeat';
  el.style.maskComposite = invert ? 'exclude' : '';
  el.style.webkitMaskComposite = invert ? 'xor' : '';
  // `mask-mode` has no -webkit- alias; the prefixed path takes the source's alpha, which is the other
  // mode, so a luminance matte needs the unprefixed property and modern Chrome has it. Unset for an
  // inverted mask's second layer, CSS repeats this same value onto it, but that rect is opaque white,
  // whose luminance and alpha are both 1 everywhere, so which mode it is read as changes nothing.
  el.style.maskMode = mode;
}
