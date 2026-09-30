// core/three/index.js: the three.js helpers a bare HTML page reaches as `vawe.three.studio/extrude/
// material` and that core/surfaces/three-fx.js builds its declarative `three` scenes from: one
// lighting rig, one SVG-path extruder, one material-preset table, two consumers.
// three.js is the GLOBAL window.THREE (vendored), never a static import, so this module loads in Node.
export const T = () => {
  if (typeof window === 'undefined' || !window.THREE) {
    throw new Error('three.js is not loaded: boot only imports it when a scene declares a `three` layer, so this means the layer was built outside the normal boot path');
  }
  return window.THREE;
};

export const hex = (h, dflt) => new (T().Color)(typeof h === 'string' ? h : dflt);

// A STUDIO IS FOUR LIGHTS AND A ROOM, and this had only the four lights. `MeshStandardMaterial` is
// physically based: at high metalness its diffuse term goes to almost nothing and the whole surface is
// REFLECTION, so with punctual lights alone a metal body renders as near black with three specular
// hits. That is what `deviceShowcase`'s 0.86 metalness was doing (engine-doctrine/CRAFT/PARITY-AUDIT.md), and it
// is a property of the MATERIAL, not of that one scene, so the room belongs here with the lights rather
// than in the scene that happened to notice it missing.
//
// PROCEDURAL, not an HDRI file: three's own `RoomEnvironment` lives in the addons and only the core
// bundle is vendored, and a downloaded .hdr is an asset every render would wait for. So this is the
// same idea by hand, a box seen from inside with a bright ceiling panel and one tinted wall, blurred
// into an irradiance map by `PMREMGenerator`.
//
// `fromScene`, NOT `fromEquirectangular`, AND THAT IS THE WHOLE BUG. The first version of this built a
// 32x16 sRGB `DataTexture` ramp and handed it to `fromEquirectangular`. Every API call succeeded, the
// texture came back valid (`isTexture` true, a 336px cubeUV image) and it was BLACK: a body at
// metalness 1 and roughness 0.15 rendered (2,2,2) with `envMapIntensity` at 12. An 8-bit DataTexture
// through that path produces nothing under this renderer, silently. `fromScene` renders real geometry
// and works, which is how three's own RoomEnvironment does it. Measured both ways before choosing.
//
// DETERMINISTIC: the room is fixed geometry built once, and `renderFrame(n)` never touches it.
function environment(renderer, scene, colors) {
  const t = T();
  const room = new (t.Scene)();
  const box = new (t.BoxGeometry)();
  const mats = [];
  const panel = (c, pos, scl) => {
    const m = new (t.MeshBasicMaterial)({ color: hex(c, '#ffffff'), side: t.BackSide });
    mats.push(m);
    const mesh = new (t.Mesh)(box, m);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(scl[0], scl[1], scl[2]);
    room.add(mesh);
  };
  panel('#6e727a', [0, 0, 0], [20, 20, 20]);                 // the room: mid grey, so nothing goes black
  panel('#ffffff', [0, 9.4, 0], [13, 0.2, 13]);              // the softbox overhead, what metal mostly shows
  panel(colors?.[1] || '#9fb6ff', [-8, 1, 3], [0.2, 9, 9]);  // one tinted wall, so the theme lands in the metal
  panel('#2a2d33', [0, -9.4, 0], [16, 0.2, 16]);             // a dark floor: the dark half a reflection needs
  const pmrem = new (t.PMREMGenerator)(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  box.dispose();
  for (const m of mats) m.dispose();
}

// GLASS wants a DIFFERENT room than metal/matte do, per-MATERIAL (`mesh.material.envMap`), not swapped
// into `scene.environment` for everyone: `environment()`'s room is a flat mid-grey lit mostly by one
// wide, bright ceiling panel, tuned so a highly reflective metal body never goes near-black
// (MeshStandardMaterial's own comment above). Transmission reads that same wide-soft light from every
// angle at once, so a smooth convex shape shows almost no facet contrast, no dark side, and a milky
// near-uniform brightness across its whole surface: exactly the "plastic, not glass" symptom. Real
// glass needs the opposite room: mostly DARK, so the body's transmission and clearcoat reflection have
// somewhere to go black, one TIGHT bright patch for a sharp specular hit, and a SMALL saturated patch
// off to one side so the grazing-angle fresnel edge picks up a colour instead of staying colourless.
export function glassEnvironment(renderer, colors) {
  const t = T();
  const room = new (t.Scene)();
  const box = new (t.BoxGeometry)();
  const mats = [];
  const panel = (c, pos, scl) => {
    const m = new (t.MeshBasicMaterial)({ color: hex(c, '#050607'), side: t.BackSide });
    mats.push(m);
    const mesh = new (t.Mesh)(box, m);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(scl[0], scl[1], scl[2]);
    room.add(mesh);
  };
  panel(colors?.[3] || colors?.[2] || '#0b0d10', [0, 0, 0], [20, 20, 20]);      // near-black room
  panel('#ffffff', [0, 9.2, 1], [4, 0.2, 4]);                                  // a TIGHT hot softbox: a sharp hit, not a wash
  panel(colors?.[0] || '#8fdcc8', [7, 0.5, -2], [0.2, 7, 7]);                  // the teal rim, one side only
  panel(colors?.[1] || colors?.[3] || '#0c3f3c', [0, -9.2, 0], [16, 0.2, 16]); // a dark floor bounce, faintly toned
  const pmrem = new (t.PMREMGenerator)(renderer);
  const tex = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  box.dispose();
  for (const m of mats) m.dispose();
  return tex;
}

// `kind` picks the ROOM: 'metal' (the default, `environment()`'s bright softbox, tuned so a highly
// reflective metal body never goes near-black) or 'glass' (`glassEnvironment()`'s mostly-dark room, so
// a transmissive body has somewhere to go dark and one tight hot patch to catch). Both rooms share the
// same four-light rig; only `scene.environment` (the room a punctual light can't fake) differs. Exported
// as `studio` for `vawe.three.studio(renderer, scene, { colors, kind })` or `(renderer, scene, 'glass')` (core/engine/page-api.js), the same
// function `createThreeLayer` below already calls for every declarative `three` layer: one lighting rig,
// two consumers, never a second copy tuned separately and drifting from this one.
export function studio(renderer, scene, opts = {}) {
  const { colors, kind = 'metal' } = typeof opts === 'string' ? { kind: opts } : opts;
  const ambient = new (T().AmbientLight)(0xffffff, 0.55); scene.add(ambient);
  const key = new (T().DirectionalLight)(0xffffff, 2.4); key.position.set(4, 6, 5); scene.add(key);
  const fill = new (T().DirectionalLight)(hex(colors?.[1], '#9fb6ff'), 0.9); fill.position.set(-5, 2, 3); scene.add(fill);
  const rim = new (T().DirectionalLight)(0xffffff, 1.5); rim.position.set(-2, 3, -6); scene.add(rim);
  if (kind === 'glass') scene.environment = glassEnvironment(renderer, colors);
  else environment(renderer, scene, colors);
  return { key, fill, rim, ambient };   // handed back so a scene that needs shadows can ask the RIG,
}                                        // not build a second one; every other scene ignores this.

// `vawe.three.extrude(pathD, {depth, bevel, scale})`: a flat SVG path (`d` attribute) to a solid
// ExtrudeGeometry. Thin wrapper over `svgExtrudeGeometry` below, the same M/L/H/V/C/Q/Z parser the
// declarative `object` scene's `geometry.kind: "svgExtrude"` already uses: one path parser, not a
// second one for hand-written three.js pages to drift from.
export function extrude(pathD, { depth, bevel, scale } = {}) {
  return svgExtrudeGeometry({ path: pathD, depth, bevelSize: bevel, scale });
}

// `vawe.three.material(preset, opts)`: the same tuned preset table `object`'s `material.preset` reads
// (materialFor below), so a hand-written page picks 'chrome'/'iridescent'/'glass'/'frostedGlass'/
// 'metal'/'matte' by name instead of re-deriving PBR dials from scratch.
export function material(preset, opts) { return materialFor({ preset, ...opts }, null); }

// A MINIMAL SVG PATH PARSER, not a general one. Only M/L/H/V/C/Q/Z (absolute and relative), which is
// every command a flattened badge/shield outline needs. A/S/T (arcs and shorthand curves) throw by
// name rather than silently drop the segment, since a dropped curve is a wrong silhouette nobody
// would notice from the error output alone: flatten those in the source tool first (Illustrator's
// "simplify path", or any SVG-to-path flattener) and re-export M/L/C/Q.
const UNSUPPORTED_SVG_CMD = /[AaSsTt]/;
// One handler per command, dispatched off a table rather than an if-chain: each handler mutates the
// shared cursor `st` ({cx,cy,sx,sy}) and draws into `shape`. Splits the parser's own complexity across
// six small functions instead of one branching on every letter.
function svgMoveTo(shape, args, rel, scale, st) {
  const at = (i) => args[i] * scale;
  st.cx = rel ? st.cx + at(0) : at(0); st.cy = rel ? st.cy + at(1) : at(1);
  st.sx = st.cx; st.sy = st.cy; shape.moveTo(st.cx, -st.cy);
  for (let i = 2; i + 1 < args.length; i += 2) {
    st.cx = rel ? st.cx + at(i) : at(i); st.cy = rel ? st.cy + at(i + 1) : at(i + 1);
    shape.lineTo(st.cx, -st.cy);
  }
}
function svgLineTo(shape, args, rel, scale, st) {
  const at = (i) => args[i] * scale;
  for (let i = 0; i + 1 < args.length; i += 2) {
    st.cx = rel ? st.cx + at(i) : at(i); st.cy = rel ? st.cy + at(i + 1) : at(i + 1);
    shape.lineTo(st.cx, -st.cy);
  }
}
function svgHorizontal(shape, args, rel, scale, st) {
  for (const v of args) { st.cx = rel ? st.cx + v * scale : v * scale; shape.lineTo(st.cx, -st.cy); }
}
function svgVertical(shape, args, rel, scale, st) {
  for (const v of args) { st.cy = rel ? st.cy + v * scale : v * scale; shape.lineTo(st.cx, -st.cy); }
}
function svgCubic(shape, args, rel, scale, st) {
  const at = (i) => args[i] * scale;
  for (let i = 0; i + 5 < args.length; i += 6) {
    const x1 = rel ? st.cx + at(i) : at(i), y1 = rel ? st.cy + at(i + 1) : at(i + 1);
    const x2 = rel ? st.cx + at(i + 2) : at(i + 2), y2 = rel ? st.cy + at(i + 3) : at(i + 3);
    const nx = rel ? st.cx + at(i + 4) : at(i + 4), ny = rel ? st.cy + at(i + 5) : at(i + 5);
    shape.bezierCurveTo(x1, -y1, x2, -y2, nx, -ny); st.cx = nx; st.cy = ny;
  }
}
function svgQuadratic(shape, args, rel, scale, st) {
  const at = (i) => args[i] * scale;
  for (let i = 0; i + 3 < args.length; i += 4) {
    const x1 = rel ? st.cx + at(i) : at(i), y1 = rel ? st.cy + at(i + 1) : at(i + 1);
    const nx = rel ? st.cx + at(i + 2) : at(i + 2), ny = rel ? st.cy + at(i + 3) : at(i + 3);
    shape.quadraticCurveTo(x1, -y1, nx, -ny); st.cx = nx; st.cy = ny;
  }
}
function svgClose(shape, args, rel, scale, st) { shape.closePath(); st.cx = st.sx; st.cy = st.sy; }
const SVG_CMD = { M: svgMoveTo, L: svgLineTo, H: svgHorizontal, V: svgVertical, C: svgCubic, Q: svgQuadratic, Z: svgClose };

function shapeFromSvgPath(d, scale) {
  if (UNSUPPORTED_SVG_CMD.test(d)) {
    throw new Error('three object: geometry.kind "svgExtrude" only reads M/L/H/V/C/Q/Z path commands; '
      + 'this path uses an arc or shorthand curve (A/S/T). Flatten it to M/L/C/Q first.');
  }
  const shape = new (T().Shape)();
  const nums = (s) => (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
  const st = { cx: 0, cy: 0, sx: 0, sy: 0 };
  for (const [, cmd, argStr] of d.matchAll(/([MLHVCQZmlhvcqz])([^MLHVCQZmlhvcqz]*)/g)) {
    const args = nums(argStr), rel = cmd === cmd.toLowerCase();
    SVG_CMD[cmd.toUpperCase()](shape, args, rel, scale, st);
  }
  return shape;
}

export function svgExtrudeGeometry(g) {
  if (typeof g.path !== 'string' || !g.path.trim()) {
    throw new Error('three object: geometry.kind "svgExtrude" needs a non-empty `path` (an SVG path `d` string).');
  }
  const shape = shapeFromSvgPath(g.path, g.scale ?? 0.01);
  const geo = new (T().ExtrudeGeometry)(shape, { depth: g.depth ?? 0.4, bevelEnabled: (g.bevelSize ?? 0.04) > 0,
    bevelSize: g.bevelSize ?? 0.04, bevelThickness: g.bevelThickness ?? g.bevelSize ?? 0.04,
    bevelSegments: g.bevelSegments ?? 4, curveSegments: g.curveSegments ?? 12 });
  geo.center();
  return geo;
}

// Material PRESETS, the vocabulary an author picks from rather than hand-tuning a dozen PBR dials.
// `glass`/`frostedGlass` need MeshPhysicalMaterial's `transmission` (a real refraction the renderer
// composites through, not a transparency hack); `metal`/`matte` are plain MeshStandardMaterial at the
// two ends of the roughness range. `studio()`'s room IBL (already built for every three scene, see
// its own header) is what a transmissive or metal surface reflects; nothing extra to wire here.
// One builder per preset, dispatched off a table (the same shape as SVG_CMD above) rather than an
// if-chain, so no single function carries every preset's own complexity.
// `color` on a TRANSMISSIVE MeshPhysicalMaterial is not a highlight tint, three multiplies the
// transmitted light by it directly, so a saturated `color` (the old default: the theme accent, same
// as metal/matte's) paints every ray that passes through solid, and the body reads as opaque tinted
// plastic no matter how high `transmission` is set. Real tinted glass gets its colour from the light's
// own JOURNEY through the body instead: `attenuationColor` + `attenuationDistance` (Beer-Lambert
// absorption over distance), which is why glass keeps `color` itself near white and tints there.
const GLASS_WHITE = '#ffffff';
const OBJECT_MATERIAL_BUILDERS = {
  glass: (t, tint, m) => new t.MeshPhysicalMaterial({ color: hex(m.color, GLASS_WHITE), metalness: 0,
    roughness: m.roughness ?? 0.05, transmission: m.transmission ?? 1, thickness: m.thickness ?? 0.6,
    ior: m.ior ?? 1.5, clearcoat: m.clearcoat ?? 0.4, clearcoatRoughness: 0.08, envMapIntensity: m.envMapIntensity ?? 0.85,
    attenuationColor: hex(m.attenuationColor, `#${tint.getHexString()}`), attenuationDistance: m.attenuationDistance ?? 1.1,
    specularIntensity: m.specularIntensity ?? 1 }),
  frostedGlass: (t, tint, m) => new t.MeshPhysicalMaterial({ color: hex(m.color, GLASS_WHITE), metalness: 0,
    roughness: m.roughness ?? 0.45, transmission: m.transmission ?? 0.9, thickness: m.thickness ?? 0.6,
    ior: m.ior ?? 1.45, envMapIntensity: m.envMapIntensity ?? 1,
    attenuationColor: hex(m.attenuationColor, `#${tint.getHexString()}`), attenuationDistance: m.attenuationDistance ?? 0.9 }),
  metal: (t, tint, m) => new t.MeshStandardMaterial({ color: tint, metalness: m.metalness ?? 0.9, roughness: m.roughness ?? 0.3 }),
  matte: (t, tint, m) => new t.MeshStandardMaterial({ color: tint, metalness: 0, roughness: m.roughness ?? 0.85 }),
  // `chrome`: metal pushed to the edge of the range (near-1 metalness, near-0 roughness), a plain
  // mirror finish rather than the brushed/tinted default `metal` aims for.
  chrome: (t, tint, m) => new t.MeshStandardMaterial({ color: hex(m.color, '#e7ebf2'), metalness: m.metalness ?? 1, roughness: m.roughness ?? 0.05 }),
  // `iridescent`: three's own thin-film `iridescence` layered on a low-roughness metal base, so the
  // hue shifts with viewing angle instead of being a fixed vertex/fragment colour ramp.
  iridescent: (t, tint, m) => new t.MeshPhysicalMaterial({ color: hex(m.color, tint), metalness: m.metalness ?? 0.35, roughness: m.roughness ?? 0.25,
    iridescence: m.iridescence ?? 1, iridescenceIOR: m.iridescenceIOR ?? 1.3,
    iridescenceThicknessRange: m.iridescenceThicknessRange ?? [100, 400] }),
};
const OBJECT_MATERIAL_PRESETS = Object.keys(OBJECT_MATERIAL_BUILDERS);
export const GLASS_PRESETS = ['glass', 'frostedGlass'];
export function materialFor(m, colors) {
  m = m || {};
  const preset = m.preset ?? 'matte';
  const build = OBJECT_MATERIAL_BUILDERS[preset];
  if (!build) throw new Error(`three object: unknown material.preset "${preset}", one of: ${OBJECT_MATERIAL_PRESETS.join(', ')}`);
  return build(T(), hex(m.color ?? m.tint, colors?.[0] ?? '#e8ecf5'), m);
}
