// generators/sim/sims/ink-bloom.mjs: ink dropped into still water.
//
// A real advection sim, which is the case Tier B exists for: frame n's density field is frame n-1's
// field pushed along a velocity field and dissipated. There is no closed form for it and no way to
// pose it from `t`. It has to run in order, once, offline.
//
// The flow is CURL noise: velocity is the perpendicular gradient of a scalar noise field, which makes
// it divergence-free by construction. That is the whole trick behind ink-in-water reading as ink in
// water rather than as a blur. A divergence-free field cannot compress the density, so the blob
// curls and folds instead of dissolving into grey.
//
// Rendered at grid resolution and scaled up with smoothing on: the bilinear interpolation IS the
// softness, and it costs nothing.
import { hash01, clamp01, lerp } from './lib/rng.mjs';

export const dims = { w: 900, h: 900 };
export const fps = 30;
export const frames = 110;
export const seed = 0x0C7A;

const N = 190;             // grid cells per side
const DISSIPATE = 0.9955;  // density retained per frame
const SWIRL = 2.15;        // curl-noise strength
const RISE = -0.34;        // cells per frame; ink is lighter than the water around it
const OCTAVES = 3;

/** smooth value noise in [0,1), bilinear over the seeded integer lattice */
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  // smoothstep the cell fraction, or the lattice shows as a visible grid of creases
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash01(xi, yi, s), b = hash01(xi + 1, yi, s);
  const c = hash01(xi, yi + 1, s), d = hash01(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** fBm potential; the scalar field whose perpendicular gradient becomes the flow */
function potential(x, y, s) {
  let v = 0, amp = 1, f = 1, norm = 0;
  for (let o = 0; o < OCTAVES; o++) {
    v += vnoise(x * f, y * f, s + o * 7919) * amp;
    norm += amp; amp *= 0.5; f *= 2.07;
  }
  return v / norm;
}

const idx = (x, y) => y * N + x;

export function setup(ctx) {
  const dens = new Float32Array(N * N);
  const next = new Float32Array(N * N);
  // the drop: a soft disc a little above centre, plus a seeded ragged edge so it does not start
  // as a perfect circle (a perfect circle stays legible as a circle for far too long)
  const cx = N * 0.5, cy = N * 0.58, R = N * 0.085;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const ragged = R * (0.82 + 0.34 * vnoise(x * 0.16, y * 0.16, ctx.seed + 31));
      dens[idx(x, y)] = clamp01(1 - (d - ragged * 0.55) / (ragged * 0.75));
    }
  }
  // a per-cell velocity sampled once: the flow is steady, the DENSITY is what evolves. A steady
  // divergence-free flow is enough for a bloom, and it keeps the sim to one array read per cell.
  const vx = new Float32Array(N * N), vy = new Float32Array(N * N);
  const e = 1.0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const sx = x * 0.031, sy = y * 0.031;
      // curl of the scalar potential: (dP/dy, -dP/dx)
      const dpdy = (potential(sx, sy + e * 0.031, ctx.seed) - potential(sx, sy - e * 0.031, ctx.seed)) / (2 * e * 0.031);
      const dpdx = (potential(sx + e * 0.031, sy, ctx.seed) - potential(sx - e * 0.031, sy, ctx.seed)) / (2 * e * 0.031);
      // plus a gentle outward push from the drop point, so the bloom spreads as well as curls
      const rx = x - N * 0.5, ry = y - N * 0.58;
      const rl = Math.max(1, Math.sqrt(rx * rx + ry * ry));
      vx[idx(x, y)] = dpdy * SWIRL + (rx / rl) * 0.42;
      vy[idx(x, y)] = -dpdx * SWIRL + (ry / rl) * 0.42 + RISE;
    }
  }
  const buf = new OffscreenCanvas(N, N);
  ctx.state = { dens, next, vx, vy, buf, bg: buf.getContext('2d'), img: buf.getContext('2d').createImageData(N, N) };
}

export function step(ctx) {
  const { dens, next, vx, vy } = ctx.state;
  // semi-Lagrangian advection: for each cell, ask where its contents CAME FROM and sample there.
  // Tracing backwards (rather than scattering forwards) is what keeps it unconditionally stable.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = idx(x, y);
      let px = x - vx[i], py = y - vy[i];
      px = px < 0 ? 0 : px > N - 1.001 ? N - 1.001 : px;
      py = py < 0 ? 0 : py > N - 1.001 ? N - 1.001 : py;
      const x0 = px | 0, y0 = py | 0, fx = px - x0, fy = py - y0;
      const a = dens[idx(x0, y0)], b = dens[idx(x0 + 1, y0)];
      const c = dens[idx(x0, y0 + 1)], d = dens[idx(x0 + 1, y0 + 1)];
      next[i] = lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * DISSIPATE;
    }
  }
  dens.set(next);
}

export function draw(ctx) {
  const { dens, img, bg, buf } = ctx.state;
  const px = img.data;
  for (let i = 0; i < N * N; i++) {
    const d = clamp01(dens[i]);
    const o = i * 4;
    // deep indigo in the dense core, warming toward a violet fringe where the ink is thin. Two
    // hues across the density ramp is what gives a monochrome field the appearance of depth.
    px[o] = 30 + (1 - d) * 110;
    px[o + 1] = 22 + (1 - d) * 34;
    px[o + 2] = 74 + (1 - d) * 86;
    // gamma on the alpha: the thinnest wisps stay visible instead of clipping straight to nothing
    px[o + 3] = Math.min(255, Math.pow(d, 0.72) * 268) | 0;
  }
  bg.putImageData(img, 0, 0);
  ctx.g.imageSmoothingEnabled = true;
  ctx.g.imageSmoothingQuality = 'high';
  ctx.g.drawImage(buf, 0, 0, ctx.W, ctx.H);
}
