// core/surfaces/globe.js: a dotted planet with routes drawn on it. The `globe` layer type's pixels.
//
// This is cobe (MIT, 12.9 KB, zero dependencies), vendored at /assets/vendor/cobe.module.js and
// loaded lazily by preloadCobe the way three.js is.
//
// WHY A LIBRARY HERE, WHEN core/three-fx.js HAS ITS OWN GLOBE. The three one is honest and it is a
// hundred and fifty lines that draw a worse picture: flat dots, a hard limb, a line for a route. cobe
// is purpose-built and gives an atmospheric glow, a diffuse terminator and a thick tapered arc for a
// tenth of the code. Both stay: the three globe computes a real terminator hemisphere from a sun
// vector, which cobe cannot do, and that is the one thing a specific film needs. This is the one to
// reach for otherwise.
//
// WHY IT IS SAFE, which is the only question that mattered. cobe's published build contains ZERO
// requestAnimationFrame, ZERO performance.now and ZERO Date.now, measured, not assumed. It owns no
// clock at all: `createGlobe(canvas, opts)` then `update(state)`, and the caller decides everything.
// So `phi = f(t)` is the whole integration, and it is deterministic by construction rather than by a
// contract someone has to remember. Proven forwards, backwards and replayed, byte-identical.
//
// `context: { preserveDrawingBuffer: true }` is not optional. The renderer screenshots a frame after
// the draw task ends, and without it the buffer is already cleared: every frame captures blank, which
// looks exactly like a layer that drew nothing.
import { palette } from './palette.js';

export const size = () => [1080, 1080];   // a subject you place, like raymarch, not a field
export const stamp = 4;
export const resamplable = false;

// `globe: true` used to be declared here and was read by nothing: the layer's TYPE is `globe`, and the
// surface is chosen from that (core/layers/canvas.js). One scene carried the marker, and it painted
// exactly the same picture with it deleted. Found by scripts/gates/prop-probe.mjs.
export const PROPS = {
  colors: {}, phi: {}, phiTo: {}, phiDur: {}, theta: {},
  origin: {}, dest: {}, arcHeight: {}, arcWidth: {}, drawStart: {}, drawDur: {},
  mapSamples: {}, mapBrightness: {}, diffuse: {}, dark: {}, scale: {}, markerSize: {},
};

const rgb = (hex, dflt) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return dflt;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function validate(L) {
  for (const k of ['origin', 'dest']) {
    const v = L[k];
    if (v !== undefined && !(Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number'))) {
      throw new Error(`globe ${k} must be [lon, lat]: got ${JSON.stringify(v)}`);
    }
  }
}

const ease = (p) => p * p * (3 - 2 * p);

// A point p of the way along the great circle from a to b, in [lon, lat] degrees.
//
// cobe's arcs are STATIC: it draws the whole path or none of it, and there is no progress dial. But
// `update()` takes a fresh `arcs` array, so a route that draws on is just an arc whose far end is
// f(t), and the same point is where the aircraft is. One expression, so the line and the marker
// cannot disagree, which is the mistake the flat film made with countDur.
const D = Math.PI / 180;
function along(a, b, p) {
  const [lo1, la1] = [a[0] * D, a[1] * D], [lo2, la2] = [b[0] * D, b[1] * D];
  const v1 = [Math.cos(la1) * Math.cos(lo1), Math.cos(la1) * Math.sin(lo1), Math.sin(la1)];
  const v2 = [Math.cos(la2) * Math.cos(lo2), Math.cos(la2) * Math.sin(lo2), Math.sin(la2)];
  const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const w = Math.acos(dot);
  // Two points on top of each other have no arc between them and sin(0) divides by zero.
  if (w < 1e-6) return [a[0], a[1]];
  const s1 = Math.sin((1 - p) * w) / Math.sin(w), s2 = Math.sin(p * w) / Math.sin(w);
  const x = s1 * v1[0] + s2 * v2[0], y = s1 * v1[1] + s2 * v2[1], z = s1 * v1[2] + s2 * v2[2];
  return [Math.atan2(y, x) / D, Math.atan2(z, Math.hypot(x, y)) / D];
}

export function create(kit, L, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const make = typeof window !== 'undefined' && window.__cobe;
  if (!make) {
    // Loud, not blank. A globe layer that silently draws nothing is indistinguishable from one whose
    // rotation happens to point at empty ocean, which is a whole afternoon nobody should spend.
    throw new Error('globe: cobe is not loaded, preloadCobe only runs when the scene declares a `globe` layer, so this layer was built outside the normal boot path');
  }

  const pal = palette(L) || [];
  const hex = Array.isArray(L.colors) ? L.colors : [];
  // cobe takes [lat, lon]; every other coordinate in this engine is [lon, lat], and the scene JSON
  // stays consistent with itself rather than with the library.
  const o = L.origin || [-73.78, 40.64];
  const d = L.dest || [2.55, 49.01];
  const ll = (p) => [p[1], p[0]];

  const globe = make(canvas, {
    width: w, height: h, devicePixelRatio: 1,
    phi: L.phi ?? 4.8, theta: L.theta ?? 0.28,
    dark: L.dark ?? 1, diffuse: L.diffuse ?? 1.2,
    mapSamples: L.mapSamples ?? 16000, mapBrightness: L.mapBrightness ?? 6,
    baseColor: rgb(hex[0], [0.12, 0.28, 0.45]),
    markerColor: rgb(hex[1], [0.56, 1, 0.85]),
    glowColor: rgb(hex[2], [0.15, 0.35, 0.55]),
    arcColor: rgb(hex[3], [0.56, 0.86, 1]),
    arcWidth: L.arcWidth ?? 2.2,
    arcHeight: L.arcHeight ?? 0.2,
    markers: [{ location: ll(o), size: L.markerSize ?? 0.05 }, { location: ll(d), size: L.markerSize ?? 0.05 }],
    arcs: [{ from: ll(o), to: ll(d) }],
    scale: L.scale ?? 1,
    context: { preserveDrawingBuffer: true },
  });

  return {
    canvas,
    draw(lt, LL) {
      // The ONLY per-frame state, and it is a pure function of the local time. A settle rather than a
      // spin: a constant rotation turns the subject out of frame, and the route is the subject.
      const p0 = LL.phi ?? 4.8, p1 = LL.phiTo ?? p0, pd = LL.phiDur ?? 1;
      const u = Math.max(0, Math.min(1, lt / Math.max(pd, 1e-6)));

      // The route draws on and the aircraft rides the SAME parameter.
      const d0 = LL.drawStart ?? 0, dd = LL.drawDur ?? 6;
      const g = Math.max(0, Math.min(1, (lt - d0) / Math.max(dd, 1e-6)));
      const q = ease(g);
      const tip = along(o, d, Math.max(q, 1e-4));
      const marks = [{ location: ll(o), size: LL.markerSize ?? 0.05 }];
      if (q > 0.995) marks.push({ location: ll(d), size: LL.markerSize ?? 0.05 });
      // The aircraft: a small bright marker at the head of the line. Hidden before the route starts
      // and once it lands, so it never sits on top of the destination it just reached.
      else if (q > 0.001) marks.push({ location: ll(tip), size: (LL.markerSize ?? 0.05) * 0.72 });

      globe.update({
        phi: p0 + (p1 - p0) * ease(u), theta: LL.theta ?? 0.28,
        markers: marks,
        arcs: q > 0.001 ? [{ from: ll(o), to: ll(tip) }] : [],
      });
    },
    // OFF-WINDOW MUST CLEAR, and this surface was the one that could not. core/layers/canvas.js calls
    // `clear()` on every frame outside the layer's window, and globe was the only surface of the five
    // that never defined it, so ANY globe layer with a start time threw `s.clear is not a function` on
    // every frame before it began. Same shape as raymarch-fx.js:283: cobe owns the context, and asking
    // the canvas for it again hands back that same one rather than a second.
    clear() {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (!gl) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() { globe.destroy(); },
  };
}
