// core/fx/shadow.js — a shadow that knows where the light is. Every drop shadow in this engine before
// now pointed the same way on every layer, because `L.shadow` and `L.elevation` are fixed offsets
// written once at build: down and slightly back, forever, whatever else is in the frame. That reads as
// a style, not as a scene. Two cards on opposite sides of a lamp throw their shadows in OPPOSITE
// directions, and it is that disagreement, more than the softness or the darkness, that makes a flat
// composition look like objects standing on something.
//
//   "lighting": { "x": 540, "y": 120 },                       // scene level, canvas px
//   "modifiers": [{ "shadow": { "dist": 30, "blur": 48 } }]   // per layer
//   "modifiers": [{ "shadow": { "color": "accent" } }]        // a palette ROLE, not a hex
//
// FIRST CONSUMER OF scene.light, which is why `lighting` enters the schema in the same change and not
// before it: a schema that advertises a field nothing reads is the same lie as an engine that accepts
// one and ignores it. The direction is computed per layer from the light to that layer's own centre,
// so ONE scene-level number moves every shadow in the film at once, and a layer travelling across the
// frame on a motion track swings its shadow as it passes the light.
//
// WHY box-shadow AND NOT filter: drop-shadow(). The composition-order contract (core/fx/index.js)
// forbids a modifier from appending to `filter`, and drop-shadow would have to: the motion track
// rewrites filter only for layers that HAVE a motion track, so on every other layer the value read back
// would include this modifier's own output from whichever frame ran last, and the string would grow
// without bound. box-shadow is a property nothing writes per frame, so it can be written in full every
// frame and never read back. The cost is real and worth stating: box-shadow follows the layer's BOX,
// so a shadow under text is a shadow under the text's rectangle, not under its glyphs. Use it on cards,
// panels, images and chips; on a bare headline reach for `L.filter: "drop-shadow(...)"` instead.
//
// REFUSED RATHER THAN MERGED: `elevation`, `shadow` and `glow` on the layer all write box-shadow at
// build (core/layers/util.js chipBox). This modifier would overwrite whichever of them was set and the
// author would see their elevation quietly vanish. It could not merge instead without remembering the
// build-time value across frames, which is exactly the accumulated state renderFrame(n) may not have.
// So it is an error naming both, and the fix is to delete the static one.
//
// ON A GROUP CHILD IT REFUSES, for the reason occlude does: the direction needs the layer's centre in
// canvas space, a group child's position is known only to the group's layout, and scene.boxOf returns
// null for one rather than guessing. Put the modifier on the group and the whole group casts one
// shadow, which is also the physically honest answer for a card made of parts.

export const SHADOW_KEYS = ['dist', 'blur', 'spread', 'color', 'opacity'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

function resolve(spec) {
  const s = typeof spec === 'number' ? { dist: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`shadow: expected a distance in px or an object like { "dist": 30, "blur": 48 } — `
      + `got ${JSON.stringify(spec)}. Keys: ${SHADOW_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!SHADOW_KEYS.includes(k))
      throw new Error(`shadow: unknown key "${k}" — known: ${SHADOW_KEYS.join(', ')}. `
        + `The DIRECTION is not a key: it comes from the scene's \`lighting\`.`);
  const dist = s.dist == null ? 26 : s.dist;
  if (!num(dist) || dist < 0)
    throw new Error(`shadow: dist must be a distance in px, 0 or more — got ${JSON.stringify(s.dist)}. `
      + `It is how far the shadow falls, directly away from the light.`);
  const blur = s.blur == null ? dist * 1.6 : s.blur;
  if (!num(blur) || blur < 0) throw new Error(`shadow: blur must be px, 0 or more — got ${JSON.stringify(s.blur)}.`);
  const spread = s.spread == null ? 0 : s.spread;
  if (!num(spread)) throw new Error(`shadow: spread must be a number of px — got ${JSON.stringify(s.spread)}.`);
  const color = s.color == null ? 'auto' : s.color;
  if (typeof color !== 'string' || !color)
    throw new Error(`shadow: color must be "auto", a palette role, or a CSS colour — got ${JSON.stringify(s.color)}.`);
  const opacity = s.opacity == null ? 0.3 : s.opacity;
  if (!num(opacity) || opacity < 0 || opacity > 1)
    throw new Error(`shadow: opacity must be 0..1 — got ${JSON.stringify(s.opacity)}. `
      + `The scene's \`lighting.intensity\` scales it, so a dimmer light dims every shadow at once.`);
  return { dist, blur, spread, color, opacity };
}

export function build(kit, el, L, spec) {
  resolve(spec);
  const clash = ['elevation', 'shadow', 'glow'].filter((k) => L[k] != null && L[k] !== false);
  if (clash.length)
    throw new Error(`shadow: this layer also sets \`${clash.join('`, `')}\`, which ${clash.length > 1 ? 'write' : 'writes'} `
      + `box-shadow at build — the modifier would overwrite ${clash.length > 1 ? 'them' : 'it'} and the `
      + `${clash[0]} would silently stop being there. `
      + `Drop the static one; the modifier's own \`spread\` and \`color\` cover the same ground and its `
      + `direction comes from the light.`);
  if (!L.id)
    throw new Error(`shadow: this layer needs an \`id\` — the light's direction is measured to the `
      + `layer's own centre, which is looked up through scene.boxOf. A group CHILD is refused whatever `
      + `it is called: put the modifier on the group.`);
}

// The colour a shadow should be is a fact about the SURFACE IT FALLS ON and about the film's locked
// palette, and neither was reachable from a modifier until the scene view carried them. Three ways in,
// in order of how specific the author is being:
//
//   "auto" (the default) — read the backdrop at t. Over a light field the shadow is the theme's own
//        ink, which is the darkest colour the film is allowed to use and always the right neutral for
//        it; over a dark field ink IS the field, so it falls back to black, which still darkens. Over
//        an ACCENT field a neutral shadow goes muddy, so it takes the accent's own hue.
//   a PALETTE ROLE ("accent", "ink", "line") — resolved through the theme, so the shadow moves with
//        the brand instead of pinning a hex the theme already owns into a second place.
//   any other string — a CSS colour, passed through untouched.
//
// A theme with no palette at all leaves ROLE lookups impossible; that is an error naming the theme
// rather than a silent pass-through, because "accent" as a CSS colour is not a colour and the browser
// would discard the whole box-shadow.
function resolveColor(color, scene) {
  const pal = scene.theme.palette;
  if (color !== 'auto') {
    if (!Object.prototype.hasOwnProperty.call(pal, color)) return color;   // a CSS colour
    return pal[color];
  }
  const bg = scene.bg;
  if (!bg) return pal.ink || '#0b0b12';   // no bg windows: the theme's own stage gradient
  if (bg.light === null)
    throw new Error(`shadow: color "auto" reads the backdrop's lightness, and the window at t=${scene.clock.t.toFixed(2)} `
      + `is a hand-authored \`html\` backdrop with no \`tone\`. The engine cannot read lightness out of `
      + `CSS and a guess here is invisible until the shadow vanishes into the field. Declare `
      + `"tone": "light" | "dark" on that bg window, or name a colour on the modifier.`);
  if (bg.accent) return pal.accent || pal.ink || '#0b0b12';
  return bg.light ? (pal.ink || '#0b0b12') : '#000000';
}

export function frame(kit, el, L, t, scene, spec) {
  const { dist, blur, spread, color: rawColor, opacity } = resolve(spec);
  if (!scene.light)
    throw new Error(`shadow: the scene declares no \`lighting\`, so there is no direction to cast away `
      + `from. Add "lighting": { "x": <px>, "y": <px> } at the top level — it is the whole point of this `
      + `modifier that one light aims every shadow in the film.`);
  if (!el.classList.contains('hs-layer'))
    throw new Error(`shadow: layer "${L.id}" is a GROUP CHILD, whose centre in the canvas only the `
      + `group's layout knows — scene.boxOf returns null for one on purpose. Put the modifier on the `
      + `group layer; the group then casts one shadow, which is what a card made of parts should do.`);
  const b = scene.boxOf(L.id);
  if (!b) throw new Error(`shadow: no box for this layer's own id "${L.id}" — boxOf knows only top-level layers that declare an id.`);
  const color = resolveColor(rawColor, scene);
  let dx = b.cx - scene.light.x, dy = b.cy - scene.light.y;
  const len = Math.hypot(dx, dy);
  // Directly under the light there is no direction to point in, and the physical answer is that the
  // shadow is beneath the object. Straight down, stated rather than stumbled into.
  if (len < 1e-6) { dx = 0; dy = 1; } else { dx /= len; dy /= len; }
  const a = Math.max(0, Math.min(1, opacity * scene.light.intensity));
  // color-mix rather than an rgba() built by hand, so `color` may be any CSS colour the theme uses
  // (var(--ink), a hex, a named colour) and still respond to the light's intensity.
  const tint = `color-mix(in srgb, ${color} ${(a * 100).toFixed(2)}%, transparent)`;
  // Written in full every frame and never read back: pure in t, and independent of render order.
  el.style.boxShadow = `${(dx * dist).toFixed(2)}px ${(dy * dist).toFixed(2)}px ${blur.toFixed(2)}px ${spread.toFixed(2)}px ${tint}`;
}
