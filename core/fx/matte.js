// core/fx/matte.js: LUMA MATTE. Another layer's brightness becomes this layer's alpha.
//
// The twentieth recipe in docs/CRAFT/AFTER-EFFECTS-RECIPES.md, and the general case of the whole wipe
// family: a wipe is a hard edge travelling across a layer, and this is any shape at all, moving however
// the source layer moves. A gradient sweeping across a headline IS a wipe. A logo over a paint field
// puts the field inside the logo. A radial fade over a photograph is a vignette that can travel.
//
//   "modifiers": [{ "matte": "sweep" }]
//   "modifiers": [{ "matte": { "from": "sweep", "mode": "alpha" } }]
//
// THE SOURCE LAYER IS FOLLOWED, and that is where the value is. The mask is placed and sized from the
// source's LIVE BOX (scene.boxOf, resolved for the whole frame before any layer's frame() runs), so a
// source with a motion track drags its own shape across this layer. The matte moves; the layer does not.
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
// LUMINANCE IS THE DEFAULT because that is what "luma matte" means: white shows, black hides, grey is
// partial. `mode: "alpha"` is the other half of the After Effects pair, for a source whose own
// transparency is the shape.

export const MATTE_KEYS = ['from', 'mode'];
const MODES = ['luminance', 'alpha'];

const name = (L) => `"${L.id || L.type || 'layer'}"`;

export function resolve(spec, L) {
  const s = typeof spec === 'string' ? { from: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`matte on ${name(L)}: expected a layer id or an object like { "from": "sweep", `
      + `"mode": "luminance" }, got ${JSON.stringify(spec)}. Keys: ${MATTE_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!MATTE_KEYS.includes(k))
      throw new Error(`matte on ${name(L)}: unknown key "${k}", known: ${MATTE_KEYS.join(', ')}.`);
  if (typeof s.from !== 'string' || !s.from)
    throw new Error(`matte on ${name(L)}: \`from\` names the LAYER whose paint is this layer's alpha, `
      + `by id. Got ${JSON.stringify(s.from)}.`);
  const mode = s.mode ?? 'luminance';
  if (!MODES.includes(mode))
    throw new Error(`matte on ${name(L)}: unknown mode "${mode}", known: ${MODES.join(', ')}. `
      + `\`luminance\` is the luma matte (white shows, black hides); \`alpha\` uses the source's own `
      + `transparency as the shape.`);
  return { from: s.from, mode };
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
    + `\`clip\` / \`occlude\`, which cut by geometry rather than by brightness.`);
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
  const { from, mode } = resolve(spec, L);
  const src = scene.specOf(from);
  if (!src)
    throw new Error(`matte on ${name(L)}: no layer with id "${from}", known ids: ${scene.ids.join(', ')}.`);
  const img = maskImage(src, L);
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
  // Authoritative writes, every frame, every property: a mask left from another frame is exactly the
  // render-order dependence renderFrame(n) promises it is not (docs/MISTAKES.md #41).
  for (const p of ['maskImage', 'webkitMaskImage']) el.style[p] = img;
  for (const p of ['maskSize', 'webkitMaskSize']) el.style[p] = `${w.toFixed(2)}px ${h.toFixed(2)}px`;
  for (const p of ['maskPosition', 'webkitMaskPosition']) el.style[p] = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  for (const p of ['maskRepeat', 'webkitMaskRepeat']) el.style[p] = 'no-repeat';
  // `mask-mode` has no -webkit- alias; the prefixed path takes the source's alpha, which is the other
  // mode, so a luminance matte needs the unprefixed property and modern Chrome has it.
  el.style.maskMode = mode;
}
