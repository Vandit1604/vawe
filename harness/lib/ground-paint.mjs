// How much a ground layer really paints, from the computed style the layout reader takes (harness/media/draft-check.mjs layoutBoxes).
// Box area says a layer exists; this says it differs from the ground behind it. Grain, a blend overlay and a faint gradient paint
// almost nothing: they are texture, not a living ground. Pure.
import LIMITS from '../../taste/build/limits.json' with { type: 'json' };

const L = LIMITS['living-ground'];
const COLOUR = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|#([0-9a-f]{6})\b/gi;
const GRAIN = /feTurbulence|noise|grain/i;
const TILE_MAX_PX = 300;
const MID = [128, 128, 128];

const alphaOf = (a) => (a === undefined ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : Number(a));

/** The [r, g, b, a] colour stops written in a computed background-image. */
export function stopsOf(paint) {
  return [...String(paint ?? '').matchAll(COLOUR)].map((m) => (m[5] ? [0, 2, 4].map((i) => parseInt(m[5].slice(i, i + 2), 16)).concat(1) : [Number(m[1]), Number(m[2]), Number(m[3]), alphaOf(m[4])]));
}

const over = (stop, ground) => [0, 1, 2].map((i) => stop[3] * stop[i] + (1 - stop[3]) * ground[i]);
const distance = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i]))) / 255;

/** The ground colour of a sample: the largest opaque background box, else mid grey. */
export function groundOf(boxes) {
  const opaque = boxes.filter((b) => b.bg && b.bg[3] >= 0.95 && b.op >= 0.95);
  const biggest = opaque.reduce((a, b) => (a && a.box[2] * a.box[3] >= b.box[2] * b.box[3] ? a : b), null);
  return biggest ? biggest.bg.slice(0, 3) : MID;
}

/**
 * How far the layer's paint sits from the ground, 0 to 1, times its opacity. 0 for texture: a blend-mode overlay, a tiled noise image,
 * a gradient whose stops stay close to the ground, an empty canvas. A box with no paint string (an image, a video, a canvas the reader
 * could not sample) is unknown and counts in full.
 */
function layerStrength(b, ground) {
  if (b.blend && b.blend !== 'normal') return 0;
  let strength = 1;
  if (b.canvasVaries != null) strength = b.canvasVaries;
  else if (b.paint != null && /gradient\(/.test(b.paint)) {
    const eff = stopsOf(b.paint).map((s) => over(s, ground));
    strength = Math.max(0, ...eff.flatMap((x, i) => eff.slice(i + 1).map((y) => distance(x, y))), ...eff.map((x) => distance(x, ground)));
  } else if (b.paint != null && /url\(/.test(b.paint)) {
    if (GRAIN.test(b.paint) || (b.tilePx > 0 && b.tilePx <= TILE_MAX_PX)) return 0;
  } else if (b.blurred && !b.image && !/^(img|video|canvas)$/.test(b.tag)) {
    strength = b.bg ? b.bg[3] * distance(b.bg.slice(0, 3), ground) : 0;
  }
  return strength * b.op;
}

/** True when the layer paints at least the limit's strength. */
export const paintsGround = (b, ground) => layerStrength(b, ground) >= L.ground_layer_strength_min;
