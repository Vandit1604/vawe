// core/three-fx.js — REAL GEOMETRY. Where `raymarch` renders implicit surfaces from a distance field,
// this is a scene graph: meshes, materials, lights, a camera. It exists for the things an SDF
// structurally cannot express — a font outline, a device body, a captured UI plane, a point cloud.
//
// THE DETERMINISM CONTRACT, and why three.js does not break it:
// three.js is only non-deterministic if you let it be. The engine's rule is that renderFrame(n) is a
// pure function of n, and every frame renders on one of 8 workers in arbitrary order. So:
//   · NO THREE.Clock, no performance.now, no Date, no requestAnimationFrame driving anything.
//   · NO AnimationMixer stepping by delta. Every object is POSED ABSOLUTELY from local time:
//     obj.position/rotation/scale = f(t). Never "+= velocity", which would make frame 412 depend on
//     411 frames having run first.
//   · NO Math.random. A seeded PRNG only, so the same seed rebuilds the identical scene.
// This mirrors exactly how core/layers/lottie.js tamed lottie-web: autoplay off, absolute seek per
// frame. Same discipline, same reason. Anything genuinely stateful (physics, particles, fluid) does
// not belong here at all - it belongs in the offline sim baker, which emits a PNG sequence.
//
// Verified by `make probe` (DOM signature across render orders) and `make canvas-purity`, which
// hashes REAL PIXELS because a canvas's contents are invisible to a DOM signature.
// three.js is the GLOBAL window.THREE, loaded by boot's awaited readiness phase, NOT a static
// import. This is the same shape as lottie-web (core/layers/lottie.js) and it is not stylistic: a
// static import of a browser-only path makes this module unloadable in Node, and because
// core/layers/index.js imports every layer, that would take the entire layer registry down with it.
// `make schema-drift` crashed exactly that way before this was changed. Vendored libs are globals here.
import { THREE_FX } from './three-scenes.js';
// The dials a three scene reads OFF THE LAYER (it is handed the whole layer, named `LL` where `L` is
// taken). Declared here because this is where they are read; core/surfaces/three.js merges them.
export const PROPS = { three: {}, seed: {}, count: {}, size: {}, pointSize: {}, bodyColor: {}, dolly: {},
  depth: {}, device: {}, screen: {}, font: {}, fov: {}, metalness: {}, roughness: {}, text: {},
  morphSpeed: {}, pitch: {}, yaw: {}, spin: {}, swing: {}, travel: {}, planes: {} };

export { THREE_FX };
const T = () => {
  if (typeof window === 'undefined' || !window.THREE) {
    throw new Error('three.js is not loaded — boot only imports it when a scene declares a `three` layer, so this means the layer was built outside the normal boot path');
  }
  return window.THREE;
};

// A seeded PRNG. Math.random would make the scene differ between workers, so it is banned outright
// and this is the only source of "randomness" available to a scene.
const rng = (seed) => { let s = (seed | 0) || 1; return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 8) & 0xffffff) / 0xffffff; }; };

const hex = (h, dflt) => new (T().Color)(typeof h === 'string' ? h : dflt);
const ease = (p) => p * p * (3 - 2 * p);          // smoothstep: no linear ramps on visible moves

// A rounded slab, built from a Shape so it bevels properly. three's RoundedBoxGeometry lives in
// examples/, which is not vendored; a rounded rect extruded is the same thing from core classes.
function roundedSlab(w, h, d, r) {
  const s = new (T().Shape)();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new (T().ExtrudeGeometry)(s, { depth: d, bevelEnabled: true, bevelSize: r * 0.28, bevelThickness: d * 0.22, bevelSegments: 3, curveSegments: 16 });
  g.center();
  return g;
}

// A texture from an ALREADY-PRELOADED <img>. boot.js walks the whole scene JSON for image-like
// strings and awaits every one before the engine reports ready, so by the time any frame renders
// this image is decoded. If it somehow is not, THROW: a blank screen where a UI should be is the
// silent-failure class this repo keeps getting bitten by, and a half-loaded texture would also make
// the frame depend on network timing, which is a purity break rather than a cosmetic bug.
function textureFrom(src, what) {
  const img = new Image();
  img.src = src;
  const tex = new (T().Texture)(img);
  tex.colorSpace = T().SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, ensure() {
    if (!img.complete || !img.naturalWidth) throw new Error(`three ${what}: image not decoded at render time (${src}) — boot preloads every image-like string, so this means the path is wrong or unreachable`);
    tex.needsUpdate = true;
  } };
}

function studio(scene, colors) {
  scene.add(new (T().AmbientLight)(0xffffff, 0.55));
  const key = new (T().DirectionalLight)(0xffffff, 2.4); key.position.set(4, 6, 5); scene.add(key);
  const fill = new (T().DirectionalLight)(hex(colors?.[1], '#9fb6ff'), 0.9); fill.position.set(-5, 2, 3); scene.add(fill);
  const rim = new (T().DirectionalLight)(0xffffff, 1.5); rim.position.set(-2, 3, -6); scene.add(rim);
}

// ---- scenes -------------------------------------------------------------------------------------
// Each returns { obj, pose(t, L) }. Built ONCE; pose() is called per frame and may only SET absolute
// values from t. A scene that accumulates is a bug, not a style choice.
const SCENES = {
  // A device you can put real captured UI on and orbit. This is the shot a product launch opens with,
  // and the reason it needed geometry: an SDF cannot hold a screenshot.
  deviceShowcase(L, colors) {
    const grp = new (T().Group)();
    const isLaptop = L.device === 'laptop';
    const w = isLaptop ? 3.0 : 1.35, h = isLaptop ? 2.0 : 2.75, d = 0.16;
    const bodyGeo = roundedSlab(w, h, d, isLaptop ? 0.10 : 0.20);
    const body = new (T().Mesh)(bodyGeo,
      new (T().MeshStandardMaterial)({ color: hex(L.bodyColor, '#1b1e26'), roughness: 0.34, metalness: 0.86 }));
    grp.add(body);
    // ExtrudeGeometry adds bevelThickness to BOTH faces, so the slab is deeper than `depth` says.
    // Placing the screen at d/2 buried it inside the body and it rendered solid black. Measure.
    bodyGeo.computeBoundingBox();
    const frontZ = bodyGeo.boundingBox.max.z;
    let ensure = null;
    if (L.screen) {
      const t = textureFrom(L.screen, 'deviceShowcase screen'); ensure = t.ensure;
      const inset = isLaptop ? 0.13 : 0.09;
      const scr = new (T().Mesh)(new (T().PlaneGeometry)(w - inset * 2, h - inset * 2),
        new (T().MeshBasicMaterial)({ map: t.tex }));           // Basic: a screen EMITS, it is not lit
      scr.position.z = frontZ + 0.004;
      grp.add(scr);
    }
    return { obj: grp, pose(t, LL) {
      if (ensure) ensure();
      const spin = LL.spin ?? 1;
      grp.rotation.y = Math.sin(t * 0.45 * spin) * 0.55 + (LL.yaw ?? 0);
      grp.rotation.x = Math.sin(t * 0.31 * spin) * 0.14 + (LL.pitch ?? 0);
      grp.position.y = Math.sin(t * 0.6) * 0.045;               // a slow float, so it never sits dead
    } };
  },

  // Flat UI planes stacked in depth, camera dollying past. Turns captures you ALREADY have into a 3D
  // shot with no new assets, which is why it earns its place next to the heavier scenes.
  uiParallax(L, colors) {
    const grp = new (T().Group)();
    const planes = (Array.isArray(L.planes) ? L.planes : []).slice(0, 6);
    const ensures = [];
    planes.forEach((p, i) => {
      const src = typeof p === 'string' ? p : p.src;
      const z = typeof p === 'object' && p.z != null ? p.z : -i * 0.9;
      const t = textureFrom(src, `uiParallax plane ${i}`); ensures.push(t.ensure);
      const ar = 1.6;
      const m = new (T().Mesh)(new (T().PlaneGeometry)(2.4, 2.4 / ar),
        new (T().MeshBasicMaterial)({ map: t.tex, transparent: true }));
      m.position.set(typeof p === 'object' ? (p.x ?? 0) : 0, typeof p === 'object' ? (p.y ?? 0) : 0, z);
      grp.add(m);
    });
    return { obj: grp, pose(t, LL) {
      for (const e of ensures) e();
      const p = ease(Math.min(1, t / Math.max(0.001, LL.duration ?? 4)));
      grp.position.z = p * (LL.travel ?? 2.2);                  // the dolly IS the reveal
      grp.rotation.y = (LL.swing ?? 0.18) * Math.sin(t * 0.5);
    } };
  },

  // Points sampled on one shape, morphing to another. Abstract/technical brand moments, and the
  // cheapest way to make geometry read as data.
  pointCloud(L, colors) {
    const n = Math.min(20000, Math.max(200, L.count ?? 6000));
    const r = rng(L.seed ?? 1);
    const a = new Float32Array(n * 3), b = new Float32Array(n * 3), cur = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // sphere (uniform by inverse-CDF, not by rejection: rejection loops a variable number of times
      // and the count would depend on the PRNG stream position, which is fragile to reorder)
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      a[i * 3] = s * Math.cos(th) * 1.15; a[i * 3 + 1] = s * Math.sin(th) * 1.15; a[i * 3 + 2] = u * 1.15;
      // torus knot
      const p = r() * Math.PI * 2 * 3, q = p * 2;          // random along the curve, not i/n: an even
      const rr = 0.78 + 0.26 * Math.cos(q);                 // walk reads as a drawn line, not a cloud
      // offset each point into a TUBE around the curve, so the shape has volume. Sampling exactly ON
      // the curve is why the first version rendered as a thin wire loop.
      const ta = r() * Math.PI * 2, tr = 0.16 * Math.sqrt(r());
      const cx = rr * Math.cos(p), cy = rr * Math.sin(p), cz = 0.30 * Math.sin(q);
      b[i * 3] = cx + Math.cos(ta) * tr * Math.cos(p);
      b[i * 3 + 1] = cy + Math.cos(ta) * tr * Math.sin(p);
      b[i * 3 + 2] = cz + Math.sin(ta) * tr;
    }
    const geo = new (T().BufferGeometry)();
    geo.setAttribute('position', new (T().BufferAttribute)(cur, 3));
    const pts = new (T().Points)(geo, new (T().PointsMaterial)({
      color: hex(colors?.[0], '#8ab4ff'), size: L.pointSize ?? 0.018, sizeAttenuation: true, transparent: true, opacity: 0.95 }));
    return { obj: pts, pose(t, LL) {
      // absolute lerp from t. Every point's position is f(t) with no memory of the last frame.
      const k = ease(0.5 + 0.5 * Math.sin(t * (LL.morphSpeed ?? 0.5)));
      for (let i = 0; i < cur.length; i++) cur[i] = a[i] + (b[i] - a[i]) * k;
      geo.attributes.position.needsUpdate = true;
      pts.rotation.y = t * 0.25 * (LL.spin ?? 1);
      pts.rotation.x = Math.sin(t * 0.2) * 0.2;
    } };
  },

  // Extruded 3D type from the REAL brand font. The typeface JSON is generated from the repo's own
  // woff2 by `make glyphs`; substituting a generic face would be the silent-font-substitution failure
  // this repo has already logged once, so a missing font is a LOUD error rather than a fallback.
  extrudeText(L, colors) {
    const data = (typeof window !== 'undefined' && window.__typefaces) ? window.__typefaces[L.font] : null;
    if (!data) throw new Error(`three extrudeText: no typeface loaded for "${L.font}" — run \`make glyphs\` to generate assets/fonts/3d/${L.font}.typeface.json. Refusing to substitute a different face.`);
    const font = new (T().Font)(data);
    const grp = new (T().Group)();
    const shapes = font.generateShapes(String(L.text ?? ''), L.size ?? 1);
    const geo = new (T().ExtrudeGeometry)(shapes, {
      depth: L.depth ?? 0.22, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 8 });
    geo.center();
    grp.add(new (T().Mesh)(geo, new (T().MeshStandardMaterial)({
      color: hex(colors?.[0], '#e8ecf5'), roughness: L.roughness ?? 0.28, metalness: L.metalness ?? 0.72 })));
    return { obj: grp, pose(t, LL) {
      const spin = LL.spin ?? 1;
      grp.rotation.y = Math.sin(t * 0.4 * spin) * 0.42 + (LL.yaw ?? 0);
      grp.rotation.x = Math.sin(t * 0.27 * spin) * 0.10;
    } };
  },
};

export function createThreeLayer(w, h, L, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const renderer = new (T().WebGLRenderer)({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);                       // NEVER devicePixelRatio: it varies by machine
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new (T().Scene)();
  const camera = new (T().PerspectiveCamera)(L.fov ?? 35, w / h, 0.1, 100);
  camera.position.set(0, 0, L.dolly ?? 5.2);
  studio(scene, colors);

  const make = SCENES[L.three];
  if (!make) throw new Error(`unknown three scene "${L.three}" — one of: ${THREE_FX.join(', ')}`);
  const built = make(L, colors);
  scene.add(built.obj);

  return {
    canvas,
    draw(t, LL) { built.pose(t, LL); renderer.render(scene, camera); },
    // off-window must WIPE. Otherwise the buffer holds whichever frame a worker drew last and the
    // canvas is a function of render order rather than of t (core/layers/shader.js, paint.js).
    clear() { renderer.clear(); },
    dispose() { renderer.dispose(); },
  };
}
