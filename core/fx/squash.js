// core/fx/squash.js: SQUASH AND STRETCH, driven by the layer's own velocity.
//
// The eleventh recipe in docs/CRAFT/AFTER-EFFECTS-RECIPES.md, and the engine already had three baked
// shapes of it (the `stretch` text preset, the `fall` entrance's landing squash, the `squeeze` cut) and
// no way to make a layer deform BECAUSE it is moving. That is the whole difference between physics and
// a preset: the amount has to come from the speed, or it reads as an effect somebody switched on.
//
//   "modifiers": [{ "squash": true }]
//   "modifiers": [{ "squash": { "amount": 0.22, "at": 1600 } }]
//
// VOLUME IS CONSERVED, and that is the point rather than a detail. The travel axis is scaled by `s` and
// the perpendicular one by exactly `1/s`, so the area holds: scale both and it is a zoom, not a squash.
//
// THE VELOCITY IS READ THROUGH core/sequence.js `velocityAt`, the same sampler the automatic motion
// blur and the ghost trail use. One fact, one owner: three copies of "evaluate the track twice and
// subtract" is three chances to disagree about the window and the clamp (docs/MISTAKES.md #423).
//
// PURE, for that reason: the earlier pose is COMPUTED from the keyframes, never remembered, so frame n
// is a function of n whichever order the workers reach it in.
//
// THE AXIS IS THE DOMINANT ONE, and that is a stated limit rather than a hidden approximation. A
// non-uniform scale along an ARBITRARY axis is rotate(t) scale(sx,sy) rotate(-t), a three-function
// transform list, and core/fx/index.js forbids a modifier from writing `transform`: the tracks own it,
// and a modifier that appended would be appending to its own value from whichever frame ran last. The
// `scale` LONGHAND (Transforms Level 2) is a separate property the tracks never touch, exactly as
// `rotate` is for tilt, and it deforms in the element's own axes. So a layer travelling mostly sideways
// stretches horizontally and one falling stretches vertically, and a layer moving at 45 degrees gets
// the nearer of the two rather than a diagonal deform. Every move in this library is one or the other.
//
// WRONG ON: a logo (a squashed mark is a damaged mark) and usually on type, whose letterforms carry the
// deformation and read as a bad font. Right on a chip, a token, a ball, anything with implied mass.
import { velocityAt } from '../sequence.js';
import { FPS } from '../motion.js';

export const SQUASH_KEYS = ['amount', 'at'];

// 110 to 125% on the travel axis at full speed is the band practitioners quote; 0.18 sits in it.
// `at` is the speed that earns the whole of `amount`, in px per SECOND for the same reason the blur
// floor is (docs/MISTAKES.md #204): px per frame means two different speeds at two frame rates.
const DEFAULTS = { amount: 0.18, at: 1600 };
const MAX_AMOUNT = 0.6;

const name = (L) => `"${L.id || L.type || 'layer'}"`;

export function resolve(spec, L) {
  const s = spec === true ? {} : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`squash on ${name(L)}: expected true or an object like { "amount": 0.2, "at": 1600 }, `
      + `got ${JSON.stringify(spec)}. Keys: ${SQUASH_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!SQUASH_KEYS.includes(k))
      throw new Error(`squash on ${name(L)}: unknown key "${k}", known: ${SQUASH_KEYS.join(', ')}.`);
  const out = { ...DEFAULTS, ...s };
  if (typeof out.amount !== 'number' || !(out.amount > 0 && out.amount <= MAX_AMOUNT))
    throw new Error(`squash on ${name(L)}: \`amount\` is how far the travel axis stretches at full `
      + `speed, a fraction above 0 and at most ${MAX_AMOUNT} (0.1 to 0.25 is the band motion designers `
      + `quote). Got ${JSON.stringify(out.amount)}.`);
  if (typeof out.at !== 'number' || !(out.at > 0))
    throw new Error(`squash on ${name(L)}: \`at\` is the speed in PX PER SECOND that earns the whole of `
      + `\`amount\`, a positive number. Got ${JSON.stringify(out.at)}.`);
  return out;
}

export function build(kit, el, L, spec) {
  resolve(spec, L);
  if (!Array.isArray(L.motion) || !L.motion.length)
    throw new Error(`squash on ${name(L)}: this layer has no \`motion\` track, so it has no velocity to `
      + `deform from and the modifier would render nothing. Give it keyed motion, or reach for the `
      + `\`stretch\` text preset / the \`squeeze\` cut, which are baked shapes and need no velocity.`);
  // Two owners of one CSS longhand, refused by name rather than resolved by array order. `kick` writes
  // a uniform `scale` on the layer element for the same reason this does, so whichever ran second
  // would win and the other would silently stop happening.
  if ((L.modifiers || []).some((m) => m && typeof m === 'object' && 'kick' in m))
    throw new Error(`squash on ${name(L)}: this layer also carries \`kick\`, and both write the CSS `
      + `\`scale\` longhand, so one of them would silently do nothing. Put the kick on a different `
      + `layer, or drop one of the two.`);
}

export function frame(kit, el, L, t, scene, spec) {
  const { amount, at } = resolve(spec, L);
  const fps = (scene.clock && scene.clock.fps) || FPS;
  const { vx, vy } = velocityAt(L.motion, Math.max(0, t - (L.start ?? 0)), 1 / fps);
  const horizontal = Math.abs(vx) >= Math.abs(vy);
  const speed = horizontal ? Math.abs(vx) : Math.abs(vy);
  // Linear in speed up to `at`, then held: past the point where the deform is already at its stated
  // maximum, a faster move should not keep growing into a smear the author never asked for.
  const s = 1 + amount * Math.min(1, speed / at);
  // Identity is written as the keyword, never as `1 1`. A resting layer must render byte-identical to
  // one carrying no modifier at all, and a `scale` of exactly 1 still promotes the element onto its own
  // compositor layer.
  el.style.scale = s <= 1.0001 ? 'none'
    : horizontal ? `${s.toFixed(5)} ${(1 / s).toFixed(5)}` : `${(1 / s).toFixed(5)} ${s.toFixed(5)}`;
}
