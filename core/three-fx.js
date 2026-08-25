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
import { LONLAT } from './globe-dots.js';
// The dials a three scene reads OFF THE LAYER (it is handed the whole layer, named `LL` where `L` is
// taken). Declared here because this is where they are read; core/surfaces/three.js merges them.
export const PROPS = { three: {}, seed: {}, count: {}, size: {}, pointSize: {}, bodyColor: {}, dolly: {},
  depth: {}, device: {}, screen: {}, font: {}, fov: {}, metalness: {}, roughness: {}, text: {},
  morphSpeed: {}, pitch: {}, yaw: {}, spin: {}, swing: {}, travel: {}, planes: {},
  // shatter · magnetic · liquidBackground
  breakAt: {}, breakDur: {}, poles: {}, amp: {},
  // globe
  origin: {}, dest: {}, arcHeight: {}, drawStart: {}, drawDur: {},
  spinFrom: {}, spinTo: {}, spinDur: {}, sunFrom: {}, sunTo: {}, sunLat: {}, dawnWidth: {} };

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

// THE THEME'S OWN PALETTE, so a new scene's defaults reskin instead of being four hexes somebody liked.
// Read ONCE at build, never per frame: core/boot.js applies the theme before any layer is built, and
// core/filters.js resolves its duotone defaults the same way for the same reason. `--accent-dim` is
// deliberately not read — every theme ships it as an rgba(), which three's Color parses as a colour
// with the alpha thrown away, i.e. a wash silently rendered at full strength.
// Author-supplied `colors` always wins; this only fills the holes.
// The literals are the DOM-less fallback (a node test, a standalone view), matching filters.js's
// "honest fallbacks" rather than pretending a theme was found.
const THEME_FALLBACK = ['#2563eb', '#8fc0ff', '#101418', '#0b0d10'];
let paletteCache = null;
function themePalette() {
  if (paletteCache) return paletteCache;
  paletteCache = THEME_FALLBACK.slice();
  if (typeof document !== 'undefined' && typeof getComputedStyle !== 'undefined') {
    const cs = getComputedStyle(document.documentElement);
    const v = (k) => (cs.getPropertyValue(k) || '').trim();
    const accent = v('--accent') || paletteCache[0];
    paletteCache = [accent, v('--accent-2') || accent, v('--text') || paletteCache[2], v('--ink') || paletteCache[3]];
  }
  return paletteCache;
}
// The palette a scene actually paints with: what the author wrote, then the theme.
const paletteOf = (colors) => {
  const th = themePalette();
  return th.map((c, i) => (typeof colors?.[i] === 'string' ? colors[i] : c));
};
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
  // THE GLOBE. Land as points, a great-circle route, and a marker flying it.
  //
  // Every dot is a real coordinate: core/globe-dots.js is baked from Natural Earth by
  // `make globe-dots`, so the continents are SAMPLED rather than drawn, and a texture is deliberately
  // not used. That is not only taste — a photographic earth would make the film that carries this
  // prettier and its claim ("computed, not drawn") false.
  //
  // Nothing here accumulates. The rotation, the route's draw-on and the aircraft's position are all
  // f(t), which is what lets frame 900 render on a different worker to frame 899.
  globe(L, colors) {
    const R = 1;
    const grp = new (T().Group)();
    // lon/lat -> cartesian, once. The Y axis is the spin axis, so latitude is the polar angle.
    const at = (lon, lat, r = R) => {
      const p = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
      return [-r * Math.sin(p) * Math.cos(th), r * Math.cos(p), r * Math.sin(p) * Math.sin(th)];
    };

    const n = LONLAT.length / 2;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = at(LONLAT[i * 2], LONLAT[i * 2 + 1]);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    const dg = new (T().BufferGeometry)();
    dg.setAttribute('position', new (T().BufferAttribute)(pos, 3));
    // PER-DOT COLOUR, because the terminator is the point. A single material colour can only make a
    // globe that is lit everywhere or nowhere, and day and night on a sphere is a hemisphere, not a
    // gradient someone paints on. Each dot asks where the sun is and answers for itself.
    const dcol = new Float32Array(n * 3);
    dg.setAttribute('color', new (T().BufferAttribute)(dcol, 3));
    grp.add(new (T().Points)(dg, new (T().PointsMaterial)({
      vertexColors: true, size: L.pointSize ?? 0.011, sizeAttenuation: true,
      transparent: true, opacity: 0.95 })));

    // The ocean: a sphere just inside the dots so the far side is occluded. Without it every dot on the
    // back of the world shows through and the globe reads as a wire ball rather than a planet.
    const og = new (T().SphereGeometry)(R * 0.985, 64, 40);
    const opos = og.attributes.position;
    const ocol = new Float32Array(opos.count * 3);
    og.setAttribute('color', new (T().BufferAttribute)(ocol, 3));
    const ocean = new (T().Mesh)(og, new (T().MeshBasicMaterial)({ vertexColors: true }));
    grp.add(ocean);

    // THE ROUTE, as a real great circle: slerp between the two endpoints, lifted off the surface. A
    // quadratic through a midpoint would be the flat map's approximation and is simply wrong on a
    // sphere, where the shortest path between two points IS this curve.
    // `origin`/`dest`, NOT `from`/`to`. Those are already shared props and already numbers: `count`
    // reads them as the start and end of a tally. Reusing the name for a lon/lat pair would have been a
    // second meaning on one label, which is the thing schema-drift exists to prevent and which the
    // validator caught here on the first run.
    const from = L.origin ?? [-73.78, 40.64];           // JFK
    const to = L.dest ?? [2.55, 49.01];                 // CDG
    const a = new (T().Vector3)(...at(from[0], from[1]));
    const b = new (T().Vector3)(...at(to[0], to[1]));
    const arcH = L.arcHeight ?? 0.18;
    const SEG = 220;
    const arc = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const v = new (T().Vector3)().copy(a).lerp(b, u).normalize();
      arc.push(v.multiplyScalar(R * (1 + arcH * Math.sin(Math.PI * u))));
    }
    const rg = new (T().BufferGeometry)().setFromPoints(arc);
    const route = new (T().Line)(rg, new (T().LineBasicMaterial)({
      color: hex(colors?.[2], '#8fdcff'), transparent: true }));
    grp.add(route);

    // The aircraft. A cone rather than a sphere so its heading is visible, and it is ORIENTED by
    // looking at the next point on the arc, never by integrating a turn rate.
    const plane = new (T().Mesh)(new (T().ConeGeometry)(0.018, 0.055, 12),
      new (T().MeshBasicMaterial)({ color: hex(colors?.[3], '#ffffff') }));
    grp.add(plane);

    // Colours resolved once. hex() allocates, and doing it per dot per frame would be 2438 allocations
    // a frame for four values that never change.
    const cDay = hex(colors?.[0], '#8affd8'), cNight = hex(colors?.[4] ?? colors?.[0], '#1d4a5e');
    const oDay = hex(colors?.[1], '#123c63'), oNight = hex(colors?.[5] ?? colors?.[1], '#050f1e');
    const tmp = new (T().Vector3)();

    // How lit a point is: the cosine between its normal and the sun, softened across the terminator so
    // the edge is a band of dawn rather than a hard line. `k` is that softness in cosine units.
    const litness = (x, y, z, sx, sy, sz, k) => {
      const d = x * sx + y * sy + z * sz;
      return Math.max(0, Math.min(1, (d + k) / (2 * k)));
    };

    return { obj: grp, pose(t, LL) {
      // THE GLOBE SETTLES. A constant spin turns the subject out of frame: over twelve seconds at 0.16
      // the North Atlantic leaves and the film is watching the Pacific. This eases from an opening turn
      // to a stop, so the route arrives facing the camera and stays there.
      const s0 = LL.spinFrom ?? 0, s1 = LL.spinTo ?? 0, sd = LL.spinDur ?? 1;
      const sp = Math.max(0, Math.min(1, t / Math.max(sd, 1e-6)));
      grp.rotation.y = s0 + (s1 - s0) * ease(sp);       // absolute, never +=
      grp.rotation.x = (LL.pitch ?? 0.32);

      // THE SUN, as a direction rather than a picture. sunLon travels west across the film, which is
      // the direction the terminator actually moves, and every dot and every ocean vertex reads the
      // same vector. One source, so the lit land and the lit sea cannot disagree.
      const sunA = ((LL.sunFrom ?? 40) + ((LL.sunTo ?? -60) - (LL.sunFrom ?? 40)) * Math.min(1, t / Math.max(LL.duration ?? 20, 1e-6))) * Math.PI / 180;
      const sunTilt = (LL.sunLat ?? 12) * Math.PI / 180;
      const sx = Math.cos(sunTilt) * Math.cos(sunA), sy = Math.sin(sunTilt), sz = Math.cos(sunTilt) * Math.sin(sunA);
      const k = LL.dawnWidth ?? 0.22;
      for (let i = 0; i < n; i++) {
        const l = litness(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], sx, sy, sz, k);
        dcol[i * 3] = cNight.r + (cDay.r - cNight.r) * l;
        dcol[i * 3 + 1] = cNight.g + (cDay.g - cNight.g) * l;
        dcol[i * 3 + 2] = cNight.b + (cDay.b - cNight.b) * l;
      }
      dg.attributes.color.needsUpdate = true;
      for (let i = 0; i < opos.count; i++) {
        tmp.fromBufferAttribute(opos, i).normalize();
        const l = litness(tmp.x, tmp.y, tmp.z, sx, sy, sz, k);
        ocol[i * 3] = oNight.r + (oDay.r - oNight.r) * l;
        ocol[i * 3 + 1] = oNight.g + (oDay.g - oNight.g) * l;
        ocol[i * 3 + 2] = oNight.b + (oDay.b - oNight.b) * l;
      }
      og.attributes.color.needsUpdate = true;
      // The route draws on across its own window, and the aircraft sits at the same parameter, so the
      // line and the marker are one event rather than two clocks that can disagree.
      const d0 = LL.drawStart ?? 0, dd = LL.drawDur ?? 4;
      const u = Math.max(0, Math.min(1, (t - d0) / Math.max(dd, 1e-6)));
      const p = ease(u);
      rg.setDrawRange(0, Math.max(2, Math.round(p * (SEG + 1))));
      const i = Math.min(SEG, Math.max(0, Math.round(p * SEG)));
      plane.position.copy(arc[i]);
      plane.lookAt(arc[Math.min(SEG, i + 1)]);
      plane.rotateX(Math.PI / 2);                       // a cone points +Y; aim it along the path
      plane.visible = p > 0.001 && p < 0.999;
      route.material.opacity = Math.min(1, u * 6);
    } };
  },

  // A SURFACE THAT BREAKS. One slab, cut into a grid of shards, each flying out with its own tumble.
  // Reach for it when the beat is "this comes apart": a captured UI (`screen`) shattering reads as the
  // product being taken to pieces, and the same scene with no texture is a solid plate breaking.
  //
  // PURE IN t. The break is a single parameter p = (t - breakAt)/breakDur, and every shard's offset and
  // rotation angle is a function of p times ITS OWN seeded constants, baked once at build. Nothing is
  // integrated, so frame 300 does not care whether frame 299 ran. The pattern is seeded (`seed`), which
  // is what makes the same JSON give the same shards on all 8 workers.
  shatter(L, colors) {
    const pal = paletteOf(colors);
    const grid = Math.max(2, Math.min(48, Math.round(Math.sqrt(Math.max(4, L.count ?? 144)))));
    const W = 3.2, H = 2.0, cw = W / grid, ch = H / grid;
    const r = rng(L.seed ?? 7);
    const cells = grid * grid, verts = cells * 6;
    const pos = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const local = new Float32Array(verts * 3);      // each vertex relative to its own shard's centre
    const mid = new Float32Array(cells * 3);
    const dir = new Float32Array(cells * 3);
    const axis = new Float32Array(cells * 3);
    const rate = new Float32Array(cells);
    const CORNER = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    for (let gy = 0; gy < grid; gy++) for (let gx = 0; gx < grid; gx++) {
      const c = gy * grid + gx;
      const mx = -W / 2 + (gx + 0.5) * cw, my = -H / 2 + (gy + 0.5) * ch;
      mid[c * 3] = mx; mid[c * 3 + 1] = my; mid[c * 3 + 2] = 0;
      // OUTWARD, plus a seeded wobble. A purely radial burst reads as a mechanism; the jitter is what
      // makes it read as a break.
      const jx = (r() - 0.5) * 0.8, jy = (r() - 0.5) * 0.8;
      const dx = mx / (W / 2) + jx, dy = my / (H / 2) + jy, dz = 0.35 + r() * 1.15;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dir[c * 3] = dx / dl; dir[c * 3 + 1] = dy / dl; dir[c * 3 + 2] = dz / dl;
      const ax = r() - 0.5, ay = r() - 0.5, az = r() - 0.5;
      const al = Math.hypot(ax, ay, az) || 1;
      axis[c * 3] = ax / al; axis[c * 3 + 1] = ay / al; axis[c * 3 + 2] = az / al;
      rate[c] = 0.5 + r() * 1.9;
      for (let k = 0; k < 6; k++) {
        const v = c * 6 + k;
        local[v * 3] = CORNER[k][0] * cw; local[v * 3 + 1] = CORNER[k][1] * ch; local[v * 3 + 2] = 0;
        uv[v * 2] = (gx + CORNER[k][0] + 0.5) / grid;
        uv[v * 2 + 1] = (gy + CORNER[k][1] + 0.5) / grid;
      }
    }
    const geo = new (T().BufferGeometry)();
    geo.setAttribute('position', new (T().BufferAttribute)(pos, 3));
    geo.setAttribute('uv', new (T().BufferAttribute)(uv, 2));
    let ensure = null, mat;
    if (L.screen) {
      const tx = textureFrom(L.screen, 'shatter screen'); ensure = tx.ensure;
      mat = new (T().MeshBasicMaterial)({ map: tx.tex, side: T().DoubleSide });   // a screen EMITS
    } else {
      mat = new (T().MeshStandardMaterial)({ color: hex(pal[0]),
        roughness: L.roughness ?? 0.32, metalness: L.metalness ?? 0.55, side: T().DoubleSide, flatShading: true });
    }
    const mesh = new (T().Mesh)(geo, mat);
    const m4 = new (T().Matrix4)(), v3 = new (T().Vector3)(), ax3 = new (T().Vector3)();
    return { obj: mesh, pose(t, LL) {
      if (ensure) ensure();
      const at = LL.breakAt ?? 0.6, dur = Math.max(1e-6, LL.breakDur ?? 2.4);
      const p = Math.max(0, Math.min(1, (t - at) / dur));
      const fly = p * p * (LL.travel ?? 2.6);                 // accelerating: a break does not ease out
      const zsp = p * p * (LL.depth ?? 1.6);
      const turn = p * (LL.spin ?? 1) * Math.PI * 1.4;
      for (let c = 0; c < cells; c++) {
        ax3.set(axis[c * 3], axis[c * 3 + 1], axis[c * 3 + 2]);
        m4.makeRotationAxis(ax3, turn * rate[c]);
        const ox = mid[c * 3] + dir[c * 3] * fly;
        const oy = mid[c * 3 + 1] + dir[c * 3 + 1] * fly;
        const oz = dir[c * 3 + 2] * zsp;
        for (let k = 0; k < 6; k++) {
          const v = c * 6 + k;
          v3.set(local[v * 3], local[v * 3 + 1], local[v * 3 + 2]).applyMatrix4(m4);
          pos[v * 3] = ox + v3.x; pos[v * 3 + 1] = oy + v3.y; pos[v * 3 + 2] = oz + v3.z;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();                             // shards tumble, so the lighting must too
      mesh.rotation.y = (LL.yaw ?? 0) + Math.sin(t * 0.28) * 0.12;
      mesh.rotation.x = (LL.pitch ?? 0);
    } };
  },

  // FIELD LINES. A dipole (`poles: 2`) or a single source (`poles: 1`), with the lines TRACED rather
  // than drawn: each one is integrated along the real field direction at build time, so the curvature
  // is the physics and not a bezier somebody eyeballed. Charges travel the traced paths.
  //
  // PURE IN t. The trace happens ONCE, in the builder, with a fixed step count — the geometry is frozen
  // by the time a frame renders. Per frame only the travellers move, and each one's position is
  // frac(t * its own rate + its own phase) indexed into its line. No integration per frame, so seeking
  // backwards lands on the identical sample.
  magnetic(L, colors) {
    const poles = L.poles ?? 2;
    if (poles !== 1 && poles !== 2) {
      throw new Error(`three magnetic: \`poles\` must be 1 or 2, got ${JSON.stringify(L.poles)} — 2 is a dipole (field lines arc from one pole to the other), 1 is a single source (they run straight out).`);
    }
    const pal = paletteOf(colors);
    const lines = Math.max(3, Math.min(120, Math.round(L.count ?? 18)));
    const STEP = 200, H = 0.022, D = 0.42;
    const r = rng(L.seed ?? 3);
    const grp = new (T().Group)();
    // The field, summed over the charges. Normalised, so the step is arc length rather than strength:
    // an un-normalised step stalls to nothing far from the poles and the line never reaches anywhere.
    const CH = poles === 2 ? [[0, D, 0, 1], [0, -D, 0, -1]] : [[0, 0, 0, 1]];
    const field = (x, y, z, o) => {
      let fx = 0, fy = 0, fz = 0;
      for (const [cx, cy, cz, q] of CH) {
        const dx = x - cx, dy = y - cy, dz = z - cz;
        const d2 = dx * dx + dy * dy + dz * dz + 1e-4;
        const k = q / (d2 * Math.sqrt(d2));
        fx += dx * k; fy += dy * k; fz += dz * k;
      }
      const l = Math.hypot(fx, fy, fz) || 1;
      o[0] = fx / l; o[1] = fy / l; o[2] = fz / l;
    };
    const paths = [];
    const f = [0, 0, 0];
    for (let i = 0; i < lines; i++) {
      // Seeded launch angles around the source. Evenly spaced rings would read as a wireframe ball.
      const th = (i / lines) * Math.PI * 2 + (r() - 0.5) * 0.25;
      const el = 0.18 + r() * 1.5;                          // how far off the axis it leaves
      const s = 0.16;
      const src = CH[0];
      let x = src[0] + s * Math.sin(el) * Math.cos(th);
      let y = src[1] + s * Math.cos(el);
      let z = src[2] + s * Math.sin(el) * Math.sin(th);
      const pts = new Float32Array((STEP + 1) * 3);
      for (let k = 0; k <= STEP; k++) {
        pts[k * 3] = x; pts[k * 3 + 1] = y; pts[k * 3 + 2] = z;
        field(x, y, z, f);
        // Past the far edge the line has said everything it has to say: hold it, so the buffer stays a
        // fixed size and the geometry cannot depend on how many steps a particular seed survived.
        if (Math.hypot(x, y, z) < 3.2) { x += f[0] * H; y += f[1] * H; z += f[2] * H; }
      }
      const g = new (T().BufferGeometry)();
      g.setAttribute('position', new (T().BufferAttribute)(pts, 3));
      grp.add(new (T().Line)(g, new (T().LineBasicMaterial)({
        color: hex(pal[1]), transparent: true, opacity: 0.55 })));
      paths.push(pts);
    }
    // The poles themselves, so the lines have something to come from and go to.
    for (const [cx, cy, cz, q] of CH) {
      const b = new (T().Mesh)(new (T().SphereGeometry)(0.13, 24, 16),
        new (T().MeshStandardMaterial)({ color: hex(q > 0 ? pal[0] : pal[1]), roughness: 0.3, metalness: 0.7 }));
      b.position.set(cx, cy, cz);
      grp.add(b);
    }
    // The travellers: three per line, each with its own rate and phase so the flow never pulses in unison.
    const N = lines * 3;
    const tp = new Float32Array(N * 3);
    const tRate = new Float32Array(N), tPhase = new Float32Array(N);
    for (let i = 0; i < N; i++) { tRate[i] = 0.10 + r() * 0.12; tPhase[i] = r(); }
    const tg = new (T().BufferGeometry)();
    tg.setAttribute('position', new (T().BufferAttribute)(tp, 3));
    grp.add(new (T().Points)(tg, new (T().PointsMaterial)({
      color: hex(pal[2]), size: L.pointSize ?? 0.05, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
    return { obj: grp, pose(t, LL) {
      for (let i = 0; i < N; i++) {
        const line = paths[i % lines];
        const u = ((t * tRate[i] + tPhase[i]) % 1 + 1) % 1;   // absolute from t, never advanced
        const k = Math.min(STEP, Math.max(0, Math.round(u * STEP)));
        tp[i * 3] = line[k * 3]; tp[i * 3 + 1] = line[k * 3 + 1]; tp[i * 3 + 2] = line[k * 3 + 2];
      }
      tg.attributes.position.needsUpdate = true;
      grp.rotation.y = t * 0.16 * (LL.spin ?? 1) + (LL.yaw ?? 0);
      grp.rotation.x = (LL.pitch ?? 0.18) + Math.sin(t * 0.23) * 0.06;
    } };
  },

  // A CHURNING SURFACE for HTML to sit above. A subdivided plane displaced by summed sine waves, lit so
  // the swell reads as volume rather than as a gradient. Deliberately slow: this is a backdrop, and a
  // backdrop that competes with the copy is a mistake this repo has already made.
  //
  // PURE IN t. Every vertex height is amp * sum(sin(k·x + w·t + phase)), evaluated fresh each frame from
  // the frame's own t. The wave set is seeded once, so the surface is reproducible and never drifts.
  liquidBackground(L, colors) {
    const pal = paletteOf(colors);
    const seg = Math.max(8, Math.min(160, Math.round(L.count ?? 96)));
    // DELIBERATELY OVERSIZED. This is a backdrop and the author owns `dolly` and `pitch`, so a plane cut
    // to one framing shows its own edge at the next one — which it did, as a white band down the right.
    // Off-screen quads are cheap; a visible seam is not.
    const geo = new (T().PlaneGeometry)(22, 16, seg, seg);
    const attr = geo.attributes.position;
    const base = Float32Array.from(attr.array);
    const r = rng(L.seed ?? 11);
    // Four waves, seeded: two long swells that carry the shape, two short ones that give it a skin.
    const waves = [];
    for (let i = 0; i < 4; i++) {
      const th = r() * Math.PI * 2;
      const k = (i < 2 ? 0.55 + r() * 0.5 : 1.6 + r() * 1.8);
      waves.push({ kx: Math.cos(th) * k, ky: Math.sin(th) * k,
        w: (i < 2 ? 0.30 + r() * 0.22 : 0.55 + r() * 0.5), ph: r() * Math.PI * 2,
        a: (i < 2 ? 1 : 0.34) });
    }
    const mesh = new (T().Mesh)(geo, new (T().MeshStandardMaterial)({
      color: hex(pal[0]), roughness: L.roughness ?? 0.22, metalness: L.metalness ?? 0.62,
      side: T().DoubleSide, flatShading: false }));
    return { obj: mesh, pose(t, LL) {
      const amp = LL.amp ?? 0.34, sp = LL.morphSpeed ?? 1;
      const arr = attr.array;
      for (let i = 0; i < attr.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        let z = 0;
        for (const wv of waves) z += wv.a * Math.sin(wv.kx * x + wv.ky * y + wv.w * sp * t + wv.ph);
        arr[i * 3 + 2] = z * amp;
      }
      attr.needsUpdate = true;
      geo.computeVertexNormals();                            // the swell is only visible in the lighting
      mesh.rotation.x = -(LL.pitch ?? 0.62);
      mesh.rotation.z = (LL.yaw ?? 0);
      mesh.position.y = -0.35 + Math.sin(t * 0.18) * 0.05;
    } };
  },

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
